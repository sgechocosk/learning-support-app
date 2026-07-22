// ごほうび交換を支援者に共有するための画像生成 & 共有シート起動ユーティリティ
// iPhone (Safari / PWA) の Web Share API (navigator.share) を利用して、
// LINEなどのアプリを共有シートから選んで送信できるようにする。

export interface RedemptionShareParams {
  learnerName: string;
  rewardTitle: string;
  requiredPoints: number;
  imageUrl: string | null;
}

export type ShareRedemptionStatus =
  | "shared"
  | "downloaded"
  | "cancelled"
  | "error";

export interface ShareRedemptionResult {
  status: ShareRedemptionStatus;
  error?: string;
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1200;

// ごほうび画像は外部(Supabase Storage等)から読み込むため、
// canvasが汚染されないよう anonymous でCORSを試みる。
// 失敗した場合は画像なし（アイコン代替）で生成を続行する。
const loadImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

// 日本語混じりの長いテキストを指定幅で折り返す（文字単位の簡易実装）
const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    const test = current + char;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
};

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// ごほうび画像・名前・ポイント・お知らせメッセージを1枚のカード画像に合成する
export const createRedemptionShareImage = async (
  params: RedemptionShareParams,
): Promise<Blob | null> => {
  const { learnerName, rewardTitle, requiredPoints, imageUrl } = params;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 背景（アプリのトーンに合わせたグラデーション）
  const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  bgGradient.addColorStop(0, "#fff7ed");
  bgGradient.addColorStop(1, "#eff6ff");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // カード
  const cardX = 60;
  const cardY = 60;
  const cardW = CANVAS_WIDTH - cardX * 2;
  const cardH = CANVAS_HEIGHT - cardY * 2;
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.15)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 40);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = "center";

  // 見出し
  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 56px 'M PLUS Rounded 1c', 'Hiragino Sans', sans-serif";
  ctx.fillText("がんばりました！", CANVAS_WIDTH / 2, cardY + 100);

  // ごほうび画像
  const photoSize = 460;
  const photoX = (CANVAS_WIDTH - photoSize) / 2;
  const photoY = cardY + 140;

  ctx.save();
  roundRect(ctx, photoX, photoY, photoSize, photoSize, 32);
  ctx.clip();
  ctx.fillStyle = "#fef3c7";
  ctx.fillRect(photoX, photoY, photoSize, photoSize);

  const img = imageUrl ? await loadImage(imageUrl) : null;
  if (img && img.width > 0 && img.height > 0) {
    const scale = Math.max(photoSize / img.width, photoSize / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const dx = photoX + (photoSize - drawW) / 2;
    const dy = photoY + (photoSize - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  } else {
    ctx.textBaseline = "middle";
    ctx.font = "220px sans-serif";
    ctx.fillText("🎁", photoX + photoSize / 2, photoY + photoSize / 2 + 15);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  // ごほうび名
  ctx.fillStyle = "#334155";
  ctx.font = "bold 46px 'M PLUS Rounded 1c', 'Hiragino Sans', sans-serif";
  const titleLines = wrapText(ctx, rewardTitle, cardW - 100).slice(0, 2);
  let cursorY = photoY + photoSize + 78;
  for (const line of titleLines) {
    ctx.fillText(line, CANVAS_WIDTH / 2, cursorY);
    cursorY += 58;
  }

  // ポイントバッジ
  cursorY += 6;
  const badgeText = `${requiredPoints}コ`;
  ctx.font = "bold 38px sans-serif";
  const badgeTextWidth = ctx.measureText(badgeText).width;
  const badgeW = badgeTextWidth + 80;
  const badgeH = 66;
  const badgeX = CANVAS_WIDTH / 2 - badgeW / 2;
  ctx.fillStyle = "#fbbf24";
  roundRect(ctx, badgeX, cursorY, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, CANVAS_WIDTH / 2, cursorY + badgeH / 2 + 2);
  ctx.textBaseline = "alphabetic";
  cursorY += badgeH;

  // お知らせメッセージ（画面下部）
  ctx.fillStyle = "#475569";
  ctx.font = "bold 40px 'M PLUS Rounded 1c', 'Hiragino Sans', sans-serif";
  const message = `${learnerName}さんが${rewardTitle}を交換しました！`;
  const messageLines = wrapText(ctx, message, cardW - 100);
  const messageBottom = cardY + cardH - 60;
  let messageY = messageBottom - (messageLines.length - 1) * 50;
  // メッセージがごほうび名/バッジと重ならないよう下寄せしつつ最低限の余白を確保
  messageY = Math.max(messageY, cursorY + 70);
  for (const line of messageLines) {
    ctx.fillText(line, CANVAS_WIDTH / 2, messageY);
    messageY += 50;
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
  });
};

// ごほうび交換のお知らせ画像を作成し、共有シート（iPhoneならLINE等を選択可）を開く。
// Web Share API (files) に対応していない環境ではファイルをダウンロードさせ、
// 手動で共有してもらうフォールバックを行う。
export const shareRedemptionImage = async (
  params: RedemptionShareParams,
): Promise<ShareRedemptionResult> => {
  try {
    const blob = await createRedemptionShareImage(params);
    if (!blob) {
      return { status: "error", error: "画像の作成に失敗しました" };
    }

    const fileName = `${params.rewardTitle}_交換.png`;
    const file = new File([blob], fileName, { type: "image/png" });
    const shareText = `${params.learnerName}さんが${params.rewardTitle}を交換しました！`;

    const nav = typeof navigator !== "undefined" ? navigator : null;
    const canUseShareSheet =
      !!nav &&
      typeof nav.share === "function" &&
      typeof nav.canShare === "function" &&
      nav.canShare({ files: [file] });

    if (canUseShareSheet && nav) {
      try {
        await nav.share({
          files: [file],
          title: "ごほうび交換のお知らせ",
          text: shareText,
        });
        return { status: "shared" };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // ユーザーが共有シートをキャンセルした場合はエラー扱いしない
          return { status: "cancelled" };
        }
        throw err;
      }
    }

    // 共有シートが使えない環境（非対応ブラウザ等）向けのフォールバック
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { status: "downloaded" };
  } catch (err) {
    return {
      status: "error",
      error:
        err instanceof Error ? err.message : "共有中にエラーが発生しました",
    };
  }
};
