import type { AiTaskOperationDraft, Task } from "../types";

// Gemini API (Generative Language API) を直接 REST 呼び出しする軽量クライアント。
// SDKを追加せず fetch のみで完結させることで、依存関係の増加を避けている。
const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];
const getGeminiEndpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TASK_REF_PREFIX = "T";

/** 日本時間(JST)基準の「今日」を YYYY-MM-DD で返す。相対日付("明日"等)の解決に使う。 */
const getTodayJst = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    new Date(),
  );

const formatDateJst = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d);
};

/** 既存タスクにAI参照用の短いキー(T1, T2, ...)を割り当てたマップを作る */
const buildTaskRefMap = (tasks: Task[]) => {
  const refToTask = new Map<string, Task>();
  tasks.forEach((task, i) => {
    refToTask.set(`${TASK_REF_PREFIX}${i + 1}`, task);
  });
  return refToTask;
};

const buildExistingTasksBlock = (
  refToTask: Map<string, Task>,
  categoryNameById: Map<string, string>,
) => {
  if (refToTask.size === 0) return "（現在登録されているタスクはありません）";

  const lines: string[] = [];
  for (const [ref, task] of refToTask.entries()) {
    const categoryName = task.category_id
      ? (categoryNameById.get(task.category_id) ?? null)
      : null;
    const scheduled = formatDateJst(task.scheduled_at);
    const status = task.is_completed ? "完了済み" : "未完了";
    lines.push(
      `- ${ref}: 「${task.title}」` +
        ` / カテゴリ:${categoryName ?? "なし"}` +
        ` / いちご:${task.reward_points}` +
        ` / 予定日:${scheduled ?? "なし"}` +
        ` / 状態:${status}`,
    );
  }
  return lines.join("\n");
};

const buildSystemInstruction = (
  existingCategoryNames: string[],
  existingTasksBlock: string,
) => {
  const todayStr = getTodayJst();
  const categoryList =
    existingCategoryNames.length > 0
      ? existingCategoryNames.join("、")
      : "（まだ登録されていません）";

  return `あなたは、支援者（保護者や先生など）が学習者を応援するためのタスク管理アプリのエージェントです。
支援者が自由な文章で書いた依頼内容から、行うべき操作（新規作成 / 編集 / 削除）を推測し、JSON配列として出力してください。

# 現在登録されている既存タスク一覧（参照キー付き）
${existingTasksBlock}

# 既存カテゴリ一覧
${categoryList}

# 出力する各項目のルール
共通:
- operation: "create"（新規作成）/ "update"（既存タスクの編集）/ "delete"（既存タスクの削除）のいずれか。
- reason: なぜその操作を提案したかの短い日本語の説明（例:「明日までの新しい宿題」「期限の変更依頼のため」「不要になったため削除」）。プレビュー画面に表示するので必ず入れてください。
- taskRef: update / delete の場合は、上記の既存タスク一覧にあるキー（例: "T1"）を必ず指定してください。どのタスクか特定できない場合はその操作を出力しないでください。create の場合は null にしてください。
- 依頼文の中に既存タスクとの対応が曖昧な編集・削除依頼がある場合は、無理に出力せず省略してください（誤操作を避けるため）。
- 「終わった」「完了した」のようなタスク完了報告は、この機能の対象外（別のボタンで完了させる仕組みがあるため）です。operationとして出力しないでください。

operation = "create" の場合:
- title: タスク名。学習者が読んで何をすればよいか分かる簡潔な日本語（目安20文字以内）。必須。
- categoryName: 分類名。既存カテゴリと意味が近ければ表記を変えずにそのまま使う。適切な既存が無く新しい分類名を提案できる場合はその名前を入れる。不要なら null。
- rewardPoints: 完了時にもらえる「いちご」の数（0以上の整数）。文中に明示があればそれに従い、無ければ作業内容から5〜20程度で妥当な値を推測する。
- scheduledAt: 予定日。"YYYY-MM-DD"形式。今日は${todayStr}（日本時間）。相対表現はこれを基準に解決する。言及が無ければ null。
- clearCategory, clearScheduledAt は使用しない（false のままでよい）。

operation = "update" の場合:
- 変更したいフィールドのみ値を入れ、変更しないフィールドは null のままにしてください（nullは「変更なし」を意味します）。
- title: 変更後のタイトル。変更しないなら null。
- categoryName: 変更後のカテゴリ名。変更しないなら null。カテゴリを明示的に「未分類」に戻したい場合は categoryName を null のままにし、clearCategory を true にしてください。
- rewardPoints: 変更後のいちご数。変更しないなら null。
- scheduledAt: 変更後の予定日 "YYYY-MM-DD"。変更しないなら null。予定日を明示的に削除したい場合は scheduledAt を null のままにし、clearScheduledAt を true にしてください。

operation = "delete" の場合:
- title, categoryName, rewardPoints, scheduledAt, clearCategory, clearScheduledAt はすべて使用しません（null/falseのままでよい）。

- 依頼内容から操作が1件も抽出できない場合は、空配列 [] を返してください。
- 出力は指定されたスキーマのJSON配列のみとし、前後に説明文やコードブロックの記号（\`\`\`）を含めないでください。`;
};

const OPERATION_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      operation: { type: "STRING", enum: ["create", "update", "delete"] },
      taskRef: { type: "STRING", nullable: true },
      reason: { type: "STRING", nullable: true },
      title: { type: "STRING", nullable: true },
      categoryName: { type: "STRING", nullable: true },
      clearCategory: { type: "BOOLEAN", nullable: true },
      rewardPoints: { type: "INTEGER", nullable: true },
      scheduledAt: { type: "STRING", nullable: true },
      clearScheduledAt: { type: "BOOLEAN", nullable: true },
    },
    required: ["operation"],
  },
};

const extractResponseText = (json: unknown): string | null => {
  const candidates = (json as { candidates?: unknown[] })?.candidates;
  const first = Array.isArray(candidates) ? candidates[0] : undefined;
  const parts = (
    first as { content?: { parts?: { text?: string }[] } } | undefined
  )?.content?.parts;
  const text = Array.isArray(parts) ? parts[0]?.text : undefined;
  return typeof text === "string" && text.length > 0 ? text : null;
};

const getFinishReason = (json: unknown): string | undefined => {
  const candidates = (json as { candidates?: unknown[] })?.candidates;
  const first = Array.isArray(candidates) ? candidates[0] : undefined;
  return (first as { finishReason?: string } | undefined)?.finishReason;
};

const asOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const asOptionalDate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  return DATE_ONLY_PATTERN.test(value) ? value : null;
};

const asOptionalInt = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
};

const normalizeOperation = (
  item: unknown,
  refToTask: Map<string, Task>,
): AiTaskOperationDraft | null => {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;

  const operation = record.operation;
  if (
    operation !== "create" &&
    operation !== "update" &&
    operation !== "delete"
  ) {
    return null;
  }

  const reason = asOptionalString(record.reason);
  const taskRef = asOptionalString(record.taskRef);
  const matchedTask = taskRef ? (refToTask.get(taskRef) ?? null) : null;

  if (operation === "create") {
    const title = asOptionalString(record.title);
    if (!title) return null;
    return {
      operation,
      taskId: null,
      matchedTask: null,
      reason,
      title,
      categoryName: asOptionalString(record.categoryName),
      clearCategory: false,
      rewardPoints: asOptionalInt(record.rewardPoints) ?? 10,
      scheduledAt: asOptionalDate(record.scheduledAt),
      clearScheduledAt: false,
    };
  }

  // update / delete は対象タスクを特定できなければ無効な操作として扱う
  if (!matchedTask) return null;

  if (operation === "delete") {
    return {
      operation,
      taskId: matchedTask.id,
      matchedTask,
      reason,
      title: null,
      categoryName: null,
      clearCategory: false,
      rewardPoints: null,
      scheduledAt: null,
      clearScheduledAt: false,
    };
  }

  // update
  return {
    operation,
    taskId: matchedTask.id,
    matchedTask,
    reason,
    title: asOptionalString(record.title),
    categoryName: asOptionalString(record.categoryName),
    clearCategory: record.clearCategory === true,
    rewardPoints: asOptionalInt(record.rewardPoints),
    scheduledAt: asOptionalDate(record.scheduledAt),
    clearScheduledAt: record.clearScheduledAt === true,
  };
};

/**
 * 支援者が入力した自由文から、Gemini APIを使ってタスクの
 * 新規作成/編集/削除の操作案を推測して抽出する。
 * @param text 支援者が入力した自然文
 * @param existingCategories 既存カテゴリ一覧（AIが流用・重複回避の参考にする）
 * @param existingTasks 既存タスク一覧（編集・削除対象の特定に使う）
 */
export async function generateTaskOperations(
  text: string,
  existingCategories: { id: string; name: string }[],
  existingTasks: Task[],
): Promise<AiTaskOperationDraft[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("お願いしたい内容を入力してください。");
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "Gemini APIキーが設定されていません（環境変数 VITE_GEMINI_API_KEY を設定してください）。",
    );
  }

  const refToTask = buildTaskRefMap(existingTasks);
  const categoryNameById = new Map(
    existingCategories.map((c) => [c.id, c.name] as const),
  );
  const existingTasksBlock = buildExistingTasksBlock(
    refToTask,
    categoryNameById,
  );

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: trimmed }],
      },
    ],
    systemInstruction: {
      role: "system",
      parts: [
        {
          text: buildSystemInstruction(
            existingCategories.map((c) => c.name),
            existingTasksBlock,
          ),
        },
      ],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: OPERATION_SCHEMA,
      temperature: 0.4,
    },
  };

  let response: Response | undefined;
  let lastDetail = "";
  for (const model of GEMINI_MODELS) {
    try {
      response = await fetch(`${getGeminiEndpoint(model)}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch {
      response = undefined;
      continue;
    }

    if (response.ok) break;

    try {
      const errJson = await response.json();
      lastDetail =
        (errJson as { error?: { message?: string } })?.error?.message ?? "";
    } catch {
      // ignore parse failure, use generic message
    }
    response = undefined;
  }

  if (!response) {
    throw new Error(
      lastDetail
        ? `AIによる操作の推測に失敗しました（${lastDetail}）。`
        : "Gemini APIへの通信に失敗しました。ネットワーク状況を確認してください。",
    );
  }

  const json = await response.json();
  const rawText = extractResponseText(json);

  if (!rawText) {
    const finishReason = getFinishReason(json);
    if (finishReason === "SAFETY") {
      throw new Error(
        "入力内容がポリシーに抵触したため、操作を推測できませんでした。",
      );
    }
    throw new Error(
      "操作を推測できませんでした。文章を変えてもう一度お試しください。",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("AIの応答を解析できませんでした。もう一度お試しください。");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("AIの応答形式が正しくありませんでした。");
  }

  const operations = parsed
    .map((item) => normalizeOperation(item, refToTask))
    .filter((d): d is AiTaskOperationDraft => d !== null);

  if (operations.length === 0) {
    throw new Error(
      "実行できそうな操作を見つけられませんでした。もう少し具体的に書いてみてください。",
    );
  }

  return operations;
}
