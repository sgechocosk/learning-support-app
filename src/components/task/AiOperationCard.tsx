import { Icon, Trash2, Plus, Pencil, Sparkles } from "lucide-react";
import { strawberry } from "@lucide/lab";
import { NumberStepper } from "../ui/NumberStepper";
import type { Category } from "../../types";
import type { EditableOperation } from "../../hooks/useAiTaskAgent";
import { NEW_CATEGORY_PREFIX } from "../../hooks/useAiTaskAgent";

interface AiOperationCardProps {
  operation: EditableOperation;
  categories: Category[];
  onChange: (updates: Partial<EditableOperation>) => void;
  onRemove: () => void;
}

// タスク一覧の中に、既存タスクと同じ並び順で差し込まれるAI提案カード。
// 新規作成/編集/削除のいずれの提案かによって見た目（色・アイコン）を変える。
export const AiOperationCard = ({
  operation: o,
  categories,
  onChange,
  onRemove,
}: AiOperationCardProps) => {
  const theme =
    o.kind === "create"
      ? {
          border: "border-sky-200",
          bg: o.included ? "bg-sky-50" : "bg-slate-50",
          badgeBg: "bg-sky-400",
          label: "新規作成",
          Icon: Plus,
          accent: "accent-sky-400",
        }
      : o.kind === "update"
        ? {
            border: "border-amber-200",
            bg: o.included ? "bg-amber-50" : "bg-slate-50",
            badgeBg: "bg-amber-400",
            label: "編集の提案",
            Icon: Pencil,
            accent: "accent-amber-400",
          }
        : {
            border: "border-red-200",
            bg: o.included ? "bg-red-50" : "bg-slate-50",
            badgeBg: "bg-red-400",
            label: "削除の提案",
            Icon: Trash2,
            accent: "accent-red-400",
          };

  return (
    <div
      className={`flex flex-col gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed ${theme.border} ${theme.bg} ${
        o.included ? "" : "opacity-60"
      } transition-colors`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-black text-white ${theme.badgeBg} px-2 py-0.5 rounded-full shrink-0`}
        >
          <Sparkles size={10} />
          AI提案・{theme.label}
        </span>
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 shrink-0">
          <input
            type="checkbox"
            checked={o.included}
            onChange={(e) => onChange({ included: e.target.checked })}
            className={`w-4 h-4 ${theme.accent}`}
          />
          反映する
        </label>
      </div>

      {o.kind === "delete" ? (
        <div className="flex items-start gap-2">
          <theme.Icon size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-black text-slate-800">
              「{o.originalTitle}」を削除する
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              一度削除すると元に戻せません。
            </p>
          </div>
        </div>
      ) : (
        <>
          {o.kind === "update" &&
            o.originalTitle &&
            o.originalTitle !== o.title && (
              <p className="text-[11px] text-slate-400 line-through">
                {o.originalTitle}
              </p>
            )}
          <input
            type="text"
            value={o.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="タスク名"
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={o.categorySelection}
              onChange={(e) => onChange({ categorySelection: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              <option value="">カテゴリなし</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {o.suggestedNewCategoryName && (
                <option
                  value={`${NEW_CATEGORY_PREFIX}${o.suggestedNewCategoryName}`}
                >
                  新規作成:「{o.suggestedNewCategoryName}」
                </option>
              )}
            </select>

            <input
              type="date"
              value={o.scheduledAt}
              onChange={(e) => onChange({ scheduledAt: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 text-slate-700"
            />

            <div className="flex items-center gap-1">
              <Icon
                iconNode={strawberry}
                className="text-sky-400 shrink-0"
                size={16}
              />
              <NumberStepper
                value={o.rewardPoints}
                onChange={(v) => onChange({ rewardPoints: v })}
                min={0}
                size="sm"
              />
            </div>
          </div>
        </>
      )}

      {o.reason && (
        <p className="text-[11px] text-slate-500 flex items-start gap-1">
          <span className="shrink-0">理由:</span>
          <span>{o.reason}</span>
        </p>
      )}

      {o.kind === "create" && (
        <button
          type="button"
          onClick={onRemove}
          className="self-end text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-0.5"
        >
          <Trash2 size={12} />
          この候補を消す
        </button>
      )}
    </div>
  );
};
