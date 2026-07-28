// ごほうび交換を支援者に共有するための画像生成 & 共有シート起動ユーティリティ
// iPhone (Safari / PWA) の Web Share API (navigator.share) を利用して、
// LINEなどのアプリを共有シートから選んで送信できるようにする。

export interface RedemptionShareParams {
  learnerName: string;
  rewardTitle: string;
  requiredPoints: number;
  imageUrl: string | null;
  // 交換日時（省略時は生成時点の現在時刻を使用）
  redeemedAt?: Date;
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
// 外枠の余白（上下左右で共通）
const OUTER_MARGIN = 60;

// <img crossorigin="anonymous"> はサーバー側のCORS設定に依存して
// 読み込みに失敗することがあるため、まず fetch でバイト列を取得して
// blob URL化する方式を優先し、失敗時のみ従来のImage直読みにフォールバックする。
const loadImage = async (url: string): Promise<HTMLImageElement | null> => {
  // 1) fetch → blob URL（同一originのblobになるためcanvasも汚染されない）
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const img = await new Promise<HTMLImageElement | null>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => resolve(null);
          image.src = objectUrl;
        });
        if (img) return img;
      } finally {
        // 画像はcanvasに描画済み/描画不可のいずれかなので即座に解放してよい
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      }
    }
  } catch {
    // fetchが失敗（CORSでブロック等）した場合は下のフォールバックへ
  }

  // 2) 従来方式（crossOrigin="anonymous"でのImage直読み）
  const viaImgTag = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  return viaImgTag;
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

const formatRedeemedAt = (date: Date): string => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}年${m}月${d}日 ${hh}:${mm} 交換`;
};

const HEADING_FONT =
  "bold 56px 'M PLUS Rounded 1c', 'Hiragino Sans', sans-serif";
const TITLE_FONT = "bold 46px 'M PLUS Rounded 1c', 'Hiragino Sans', sans-serif";
const BADGE_FONT = "bold 38px sans-serif";
const DATE_FONT = "bold 32px 'M PLUS Rounded 1c', 'Hiragino Sans', sans-serif";
const MESSAGE_FONT =
  "bold 40px 'M PLUS Rounded 1c', 'Hiragino Sans', sans-serif";

const PHOTO_SIZE = 460;

// 上から下へ積み上げる各要素の「高さ」と「次の要素との間隔」。
// 間隔は0にはせず、詰まりすぎない程度の小さな余白を持たせる。
const HEADING_TOP = 96; // カード上端 → 見出しベースラインまでの距離
const HEADING_TO_PHOTO_GAP = 36;
const PHOTO_TO_TITLE_GAP = 44;
const TITLE_LINE_HEIGHT = 58;
const TITLE_TO_BADGE_GAP = 30;
const BADGE_H = 66;
const BADGE_TO_DATE_GAP = 28;
const DATE_LINE_HEIGHT = 44;
const DATE_TO_MESSAGE_GAP = 24;
const MESSAGE_LINE_HEIGHT = 50;
const CARD_BOTTOM_PADDING = 32;

interface Layout {
  cardW: number;
  cardH: number;
  headingY: number;
  photoX: number;
  photoY: number;
  titleStartY: number;
  titleLines: string[];
  badgeY: number;
  dateY: number;
  messageStartY: number;
  messageLines: string[];
}

// タイトル・メッセージの折り返し行数はコンテンツ次第で変わるため、
// 計測結果をもとにカード全体の高さ・各要素のY座標を一括で確定させる。
const computeLayout = (
  ctx: CanvasRenderingContext2D,
  rewardTitle: string,
  learnerName: string,
): Layout => {
  const cardW = CANVAS_WIDTH - OUTER_MARGIN * 2;

  ctx.textAlign = "center";

  ctx.font = TITLE_FONT;
  const titleLines = wrapText(ctx, rewardTitle, cardW - 100).slice(0, 2);

  ctx.font = MESSAGE_FONT;
  const message = `${learnerName}さんが${rewardTitle}を交換しました！`;
  const messageLines = wrapText(ctx, message, cardW - 100);

  const headingY = HEADING_TOP;
  const photoY = headingY + HEADING_TO_PHOTO_GAP;

  // 修正箇所：GAPに加えて、テキスト自身の高さ（行高）を加算してベースラインを求める
  const titleStartY =
    photoY + PHOTO_SIZE + PHOTO_TO_TITLE_GAP + TITLE_LINE_HEIGHT;
  const titleEndY = titleStartY + (titleLines.length - 1) * TITLE_LINE_HEIGHT;

  const badgeY = titleEndY + TITLE_TO_BADGE_GAP;

  // 修正箇所：バッジの下端からGAP分下げ、さらに日付テキストの行高を加算してベースラインを求める
  const dateY = badgeY + BADGE_H + BADGE_TO_DATE_GAP + DATE_LINE_HEIGHT;

  // 修正箇所：直前の日付テキストのベースラインから行高分を確保し、GAPを加えて次のベースラインを求める
  const messageStartY = dateY + DATE_LINE_HEIGHT + DATE_TO_MESSAGE_GAP;
  const messageEndY =
    messageStartY + (messageLines.length - 1) * MESSAGE_LINE_HEIGHT;

  const cardH = messageEndY + CARD_BOTTOM_PADDING;

  return {
    cardW,
    cardH,
    headingY,
    photoX: (CANVAS_WIDTH - PHOTO_SIZE) / 2,
    photoY,
    titleStartY,
    titleLines,
    badgeY,
    dateY,
    messageStartY,
    messageLines,
  };
};

// ごほうび画像・名前・ポイント・お知らせメッセージを1枚のカード画像に合成する
export const createRedemptionShareImage = async (
  params: RedemptionShareParams,
): Promise<Blob | null> => {
  const { learnerName, rewardTitle, requiredPoints, imageUrl } = params;
  const redeemedAt = params.redeemedAt ?? new Date();

  // レイアウト計算専用の一時canvas（実寸のcanvasサイズを内容に合わせて
  // 決めるため、先にテキストの折り返し・行数を測定しておく）
  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  if (!mctx) return null;

  const layout = computeLayout(mctx, rewardTitle, learnerName);
  const CANVAS_HEIGHT = layout.cardH + OUTER_MARGIN * 2;

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
  const cardX = OUTER_MARGIN;
  const cardY = OUTER_MARGIN;
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.15)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, layout.cardW, layout.cardH, 40);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = "center";

  // 見出し
  ctx.fillStyle = "#f59e0b";
  ctx.font = HEADING_FONT;
  ctx.fillText("がんばりました！", CANVAS_WIDTH / 2, cardY + layout.headingY);

  // ごほうび画像（一覧と同様に、切れないよう正方形の枠内に収める = contain）
  const photoX = layout.photoX;
  const photoY = cardY + layout.photoY;

  ctx.save();
  roundRect(ctx, photoX, photoY, PHOTO_SIZE, PHOTO_SIZE, 32);
  ctx.clip();

  const img = imageUrl ? await loadImage(imageUrl) : null;
  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    // 一覧のサムネイル（object-contain）に合わせ、はみ出さないよう
    // 縮小率はwidth/height双方に収まる小さい方を採用する
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(photoX, photoY, PHOTO_SIZE, PHOTO_SIZE);
    const scale = Math.min(
      PHOTO_SIZE / img.naturalWidth,
      PHOTO_SIZE / img.naturalHeight,
    );
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const dx = photoX + (PHOTO_SIZE - drawW) / 2;
    const dy = photoY + (PHOTO_SIZE - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  } else {
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(photoX, photoY, PHOTO_SIZE, PHOTO_SIZE);
    ctx.textBaseline = "middle";
    ctx.font = "220px sans-serif";
    ctx.fillText("🎁", photoX + PHOTO_SIZE / 2, photoY + PHOTO_SIZE / 2 + 15);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  // ごほうび名
  ctx.fillStyle = "#334155";
  ctx.font = TITLE_FONT;
  layout.titleLines.forEach((line, i) => {
    ctx.fillText(
      line,
      CANVAS_WIDTH / 2,
      cardY + layout.titleStartY + i * TITLE_LINE_HEIGHT,
    );
  });

  // ポイントバッジ
  const badgeText = `${requiredPoints}コ`;
  ctx.font = BADGE_FONT;
  const badgeTextWidth = ctx.measureText(badgeText).width;
  const badgeW = badgeTextWidth + 80;
  const badgeX = CANVAS_WIDTH / 2 - badgeW / 2;
  const badgeY = cardY + layout.badgeY;
  ctx.fillStyle = "#fbbf24";
  roundRect(ctx, badgeX, badgeY, badgeW, BADGE_H, BADGE_H / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, CANVAS_WIDTH / 2, badgeY + BADGE_H / 2 + 2);
  ctx.textBaseline = "alphabetic";

  // 交換日時
  ctx.fillStyle = "#94a3b8";
  ctx.font = DATE_FONT;
  ctx.fillText(
    formatRedeemedAt(redeemedAt),
    CANVAS_WIDTH / 2,
    cardY + layout.dateY,
  );

  // お知らせメッセージ
  ctx.fillStyle = "#475569";
  ctx.font = MESSAGE_FONT;
  layout.messageLines.forEach((line, i) => {
    ctx.fillText(
      line,
      CANVAS_WIDTH / 2,
      cardY + layout.messageStartY + i * MESSAGE_LINE_HEIGHT,
    );
  });

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
