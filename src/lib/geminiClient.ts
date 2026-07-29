import { z } from "zod";
import type { AiTaskOperationDraft, Task } from "../types";

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

# 出力に関する絶対厳守のルール
- 出力するのは指定されたJSONスキーマに従う配列のみです。前置きの説明、要約、内部の検討過程や理由づけの長文などを、JSON以外は一切出力しないでください。
- 依頼文に複数の操作指示（例:「AとBを追加して」「Aを追加してBを削除して」）が含まれる場合は、それぞれを別々の配列要素として、省略せずすべて出力してください。1件の依頼にまとめたり、複数の指示を1つのtitleに連結したりしないでください。
- title・reason などの各フィールドには、そのフィールドの意味に沿った短い値だけを入れてください。検討の経緯や「〜と考えられるため」といった思考過程の文章をtitleに書かないでください。

# 出力する各項目のルール
共通:
- operation: "create"（新規作成）/ "update"（既存タスクの編集）/ "delete"（既存タスクの削除）のいずれか。
- reason: なぜその操作を提案したかの短い日本語の説明（例:「明日までの新しい宿題」「期限の変更依頼のため」「不要になったため削除」）。プレビュー画面に表示するので必ず入れてください。1文以内の簡潔な文にしてください。
- taskRef: update / delete の場合は、上記の既存タスク一覧にあるキー（例: "T1"）を必ず指定してください。どのタスクか特定できない場合はその操作を出力しないでください。create の場合は null にしてください。
- 依頼文の中に既存タスクとの対応が曖昧な編集・削除依頼がある場合は、無理に出力せず省略してください（誤操作を避けるため）。
- 「終わった」「完了した」のようなタスク完了報告は、この機能の対象外（別のボタンで完了させる仕組みがあるため）です。operationとして出力しないでください。

operation = "create" の場合:
- title: タスク名のみ。学習者が読んで何をすればよいか分かる簡潔な日本語（20文字以内厳守）。必須。
- categoryName: 分類名。既存カテゴリと意味が近ければ表記を変えずにそのまま使う。適切な既存が無く新しい分類名を提案できる場合はその名前を入れる。不要なら null。
- rewardPoints: 完了時にもらえる「いちご」の数（0以上の整数）。文中に明示があればそれに従い、無ければ作業内容から5〜20程度で妥当な値を推測する。
- scheduledAt: 予定日。"YYYY-MM-DD"形式。今日は${todayStr}（日本時間）。相対表現はこれを基準に解決する。言及が無ければ null。
- clearCategory, clearScheduledAt は使用しない（false のままでよい）。

operation = "update" の場合:
- 変更したいフィールドのみ値を入れ、変更しないフィールドは null のままにしてください（nullは「変更なし」を意味します）。
- title: 変更後のタイトルのみ（20文字以内厳守）。変更しないなら null。
- categoryName: 変更後のカテゴリ名。変更しないなら null。カテゴリを明示的に「未分類」に戻したい場合は categoryName を null のままにし、clearCategory を true にしてください。
- rewardPoints: 変更後のいちご数。変更しないなら null。
- scheduledAt: 変更後の予定日 "YYYY-MM-DD"。変更しないなら null。予定日を明示的に削除したい場合は scheduledAt を null のままにし、clearScheduledAt を true にしてください。

operation = "delete" の場合:
- title, categoryName, rewardPoints, scheduledAt, clearCategory, clearScheduledAt はすべて使用しません（null/falseのままでよい）。

- 依頼内容から操作が1件も抽出できない場合は、空配列 [] を返してください。
- 出力は指定されたスキーマのJSON配列のみとし、前後に説明文やコードブロックの記号（\`\`\`）を含めないでください。`;
};

// === 操作スキーマ（Zod） ===
// Gemini へ渡すJSONスキーマと、レスポンスの検証を同じZod定義から生成することで、
// 「APIに指定したスキーマ」と「アプリ側が期待する形」がズレるのを防ぐ。
// nullable() のみで optional() にはしていないため、モデルは全フィールドを
// 必ず明示的に出力する必要がある（値が無い場合は null）。フィールドの省略を
// 許してしまうと、モデルが必要なフィールドを書き忘れたり、逆に本来 title に
// 入れるべきでない説明文を紛れ込ませたりする余地が生まれるため。
const aiOperationItemSchema = z.object({
  operation: z.enum(["create", "update", "delete"]),
  taskRef: z.string().nullable(),
  reason: z.string().nullable(),
  title: z.string().nullable(),
  categoryName: z.string().nullable(),
  clearCategory: z.boolean().nullable(),
  rewardPoints: z.number().int().nullable(),
  scheduledAt: z.string().nullable(),
  clearScheduledAt: z.boolean().nullable(),
});

const aiOperationsResponseSchema = z.array(aiOperationItemSchema);

type JsonSchemaNode = Record<string, unknown>;

// v1beta generateContent の generationConfig.responseSchema は、標準的なJSON Schemaではなく
// Google独自の Schema プロト形式（type が "STRING"/"OBJECT" などの大文字enum、
// nullableは真偽値の "nullable" フィールドで表現）を要求する。
// （"responseFormat.text.schema" 形式のドキュメント通りの書き方は、実際のAPIでは
// 「Invalid value ... TextResponseFormat.MimeType」で拒否されることを確認済み）
const GEMINI_TYPE_MAP: Record<string, string> = {
  string: "STRING",
  number: "NUMBER",
  integer: "INTEGER",
  boolean: "BOOLEAN",
  object: "OBJECT",
  array: "ARRAY",
  null: "NULL",
};

/**
 * z.toJSONSchema() が出力する標準的なJSON Schema（小文字type、nullableは
 * `anyOf: [<本体>, {type:"null"}]` や `type: ["string","null"]` で表現）を、
 * Gemini の独自Schema形式（大文字TYPE enum + `nullable: true`）へ変換する。
 */
const toGeminiSchema = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node === null || typeof node !== "object") return node;

  const obj = node as JsonSchemaNode;

  // nullable() は "anyOf": [<本体>, {type:"null"}] という形で出力されるため、
  // それを検出して {..本体, nullable: true} に畳み込む。
  if (Array.isArray(obj.anyOf) && obj.anyOf.length === 2) {
    const branches = obj.anyOf as JsonSchemaNode[];
    const nullBranch = branches.find(
      (b) => b && typeof b === "object" && b.type === "null",
    );
    const otherBranch = branches.find((b) => b !== nullBranch);
    if (nullBranch && otherBranch) {
      const converted = toGeminiSchema(otherBranch) as JsonSchemaNode;
      return { ...converted, nullable: true };
    }
  }

  // type: ["string", "null"] のような配列表現にも対応しておく
  if (Array.isArray(obj.type)) {
    const types = (obj.type as string[]).filter(
      (t): t is string => typeof t === "string",
    );
    const nonNullTypes = types.filter((t) => t !== "null");
    const isNullable = nonNullTypes.length !== types.length;
    const { type: _omit, ...rest } = obj;
    const converted = toGeminiSchema(rest) as JsonSchemaNode;
    const primaryType = nonNullTypes[0];
    return {
      ...converted,
      type: primaryType
        ? (GEMINI_TYPE_MAP[primaryType] ?? primaryType.toUpperCase())
        : undefined,
      ...(isNullable ? { nullable: true } : {}),
    };
  }

  const result: JsonSchemaNode = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "$schema" || key === "$id") continue;
    // v1beta の generationConfig.responseSchema はドキュメント上は additionalProperties
    // をサポートすると書かれているが、実際には未知のフィールドとして 400 になるため除去する。
    if (key === "additionalProperties") continue;
    if (key === "type" && typeof value === "string") {
      result.type = GEMINI_TYPE_MAP[value] ?? value.toUpperCase();
      continue;
    }
    if (key === "properties" && value && typeof value === "object") {
      const props: JsonSchemaNode = {};
      for (const [propKey, propValue] of Object.entries(
        value as JsonSchemaNode,
      )) {
        props[propKey] = toGeminiSchema(propValue);
      }
      result.properties = props;
      continue;
    }
    result[key] = toGeminiSchema(value);
  }
  return result;
};

/**
 * Zodスキーマから Gemini の構造化出力(generationConfig.responseSchema)用の
 * スキーマオブジェクトを組み立てる。
 * 外部パッケージの zod-to-json-schema は Zod v3 系の内部型を前提にしており、
 * Zod v4（現行の zod パッケージ）とは型定義が非互換なうえ、依存が増える分だけ
 * 監査対象の脆弱性も増える。Zod v4 標準搭載の `z.toJSONSchema()` で一旦
 * 標準的なJSON Schemaへ変換したうえで、Gemini独自形式へ変換する。
 */
const buildOperationsJsonSchema = () => {
  const standardSchema = z.toJSONSchema(aiOperationsResponseSchema, {
    target: "draft-7",
    // $ref を使わずすべてインライン展開する（Geminiは$ref/definitionsを解釈しない）。
    reused: "inline",
  });
  return toGeminiSchema(standardSchema) as Record<string, unknown>;
};

const OPERATIONS_JSON_SCHEMA = buildOperationsJsonSchema();

/**
 * 候補の中から、Thinking（内部思考）パートを除いた本文テキストのみを連結して取り出す。
 * responseMimeType: application/json 指定時、モデルの思考過程が parts[0] 等に
 * thought:true として混入するケースがあり、それをそのまま使うと「思考過程のような
 * テキストがタスク名として出力される」不具合の原因になるため、明示的に除外する。
 */
const extractResponseText = (json: unknown): string | null => {
  const candidates = (json as { candidates?: unknown[] })?.candidates;
  const first = Array.isArray(candidates) ? candidates[0] : undefined;
  const parts = (
    first as
      | { content?: { parts?: { text?: string; thought?: boolean }[] } }
      | undefined
  )?.content?.parts;

  if (!Array.isArray(parts) || parts.length === 0) return null;

  const answerText = parts
    .filter((part) => part?.thought !== true && typeof part?.text === "string")
    .map((part) => part.text as string)
    .join("");

  if (answerText.length > 0) return answerText;

  // 万一すべてのパートがthought扱いだった場合のフォールバック
  // （通常はここに到達しない想定だが、空文字での誤判定を避けるための保険）
  const fallback = parts.find((part) => typeof part?.text === "string");
  return fallback?.text && fallback.text.length > 0 ? fallback.text : null;
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
  item: z.infer<typeof aiOperationItemSchema>,
  refToTask: Map<string, Task>,
): AiTaskOperationDraft | null => {
  const operation = item.operation;

  const reason = asOptionalString(item.reason);
  const taskRef = asOptionalString(item.taskRef);
  const matchedTask = taskRef ? (refToTask.get(taskRef) ?? null) : null;

  if (operation === "create") {
    const title = asOptionalString(item.title);
    if (!title) return null;
    return {
      operation,
      taskId: null,
      matchedTask: null,
      reason,
      title,
      categoryName: asOptionalString(item.categoryName),
      clearCategory: false,
      rewardPoints: asOptionalInt(item.rewardPoints) ?? 10,
      scheduledAt: asOptionalDate(item.scheduledAt),
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
    title: asOptionalString(item.title),
    categoryName: asOptionalString(item.categoryName),
    clearCategory: item.clearCategory === true,
    rewardPoints: asOptionalInt(item.rewardPoints),
    scheduledAt: asOptionalDate(item.scheduledAt),
    clearScheduledAt: item.clearScheduledAt === true,
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

  // Cloudflare等のダッシュボードに貼り付ける際、末尾に改行や空白が
  // 混入して分かりにくい不具合になるケースがあるため trim してから判定する。
  const apiKey = (
    import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  )?.trim();
  if (!apiKey) {
    throw new Error("Gemini APIキーが設定されていません。");
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
      // 注意: ai.google.dev のドキュメントには新しい `responseFormat.text.mimeType`
      // という書き方が案内されているが、実際の v1beta generateContent エンドポイントでは
      // mimeType が列挙型として実装されており、文字列 "application/json" を渡すと
      // 400 (Invalid value ... TextResponseFormat.MimeType) になる。
      // そのため、実際に動作が確認できている旧来の responseMimeType / responseSchema を使う。
      responseMimeType: "application/json",
      responseSchema: OPERATIONS_JSON_SCHEMA,
      temperature: 0.4,
      // 複数件のタスク操作をまとめて出力させても打ち切られないよう、
      // 十分な出力トークン数を確保する。
      maxOutputTokens: 8192,
      // 推論(Thinking)にトークンを使いすぎて肝心のJSON出力が
      // 途中で切られる（＝複数指示のうち一部が無視される）事態を防ぐため、
      // 内部思考の予算を抑え、思考の中間出力はレスポンスに含めない。
      thinkingConfig: {
        thinkingBudget: 1024,
        includeThoughts: false,
      },
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
  const finishReason = getFinishReason(json);

  if (!rawText) {
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
    // 出力トークン上限で打ち切られると不完全なJSONになり得るため、
    // 原因を判別できるメッセージを出す。
    if (finishReason === "MAX_TOKENS") {
      throw new Error(
        "依頼内容が多すぎたため、AIの応答が途中で打ち切られました。依頼を分けてもう一度お試しください。",
      );
    }
    throw new Error("AIの応答を解析できませんでした。もう一度お試しください。");
  }

  // Zodスキーマでレスポンス形状を検証する。ここで弾かれる場合は、
  // モデルがスキーマに沿わない出力をした（型不一致・余分なプロパティ混入等）ことを意味する。
  const validation = aiOperationsResponseSchema.safeParse(parsed);
  if (!validation.success) {
    if (finishReason === "MAX_TOKENS") {
      throw new Error(
        "依頼内容が多すぎたため、AIの応答が途中で打ち切られました。依頼を分けてもう一度お試しください。",
      );
    }
    throw new Error("AIの応答形式が正しくありませんでした。");
  }

  const operations = validation.data
    .map((item) => normalizeOperation(item, refToTask))
    .filter((d): d is AiTaskOperationDraft => d !== null);

  if (operations.length === 0) {
    throw new Error(
      "実行できそうな操作を見つけられませんでした。もう少し具体的に書いてみてください。",
    );
  }

  return operations;
}
