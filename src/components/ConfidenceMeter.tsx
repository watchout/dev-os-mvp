"use client";

import { ConfidenceResult } from "@/lib/confidence-level-client";

type Props = {
  result: ConfidenceResult | null;
  loading?: boolean;
  onImproveClick?: () => void;
};

function levelColor(level: number) {
  if (level === 1) return "bg-red-500";
  if (level === 2) return "bg-amber-400";
  return "bg-green-500";
}

function levelPercent(level: number) {
  if (level === 1) return 32;
  if (level === 2) return 66;
  return 100;
}

export function ConfidenceMeter({ result, loading, onImproveClick }: Props) {
  const percent = result ? levelPercent(result.level) : 0;
  const color = result ? levelColor(result.level) : "bg-zinc-300";
  const label = result ? result.label : "未評価";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-zinc-500">確信レベル</p>
          <p className="text-lg font-semibold text-zinc-900">
            {loading ? "計算中..." : `${percent}% (${label})`}
          </p>
        </div>
        {result?.action === "halt" && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            実行不可（要改善）
          </span>
        )}
        {result?.action === "warn" && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            警告（改善推奨）
          </span>
        )}
        {result?.action === "allow" && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            実行可能
          </span>
        )}
      </div>

      <div className="mt-3 h-3 w-full rounded-full bg-zinc-100">
        <div
          className={`h-3 rounded-full ${color} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-3 text-sm text-zinc-700">
        <p className="font-semibold">改善のヒント</p>
        {result?.hints?.length ? (
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-zinc-700">
            {result.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500">ヒントはありません。</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-indigo-600">
        <a href="/ssot" className="font-semibold hover:underline">
          SSOTを整えて確信レベルを上げる →
        </a>
        {onImproveClick && (
          <button
            type="button"
            onClick={onImproveClick}
            className="text-indigo-600 underline hover:text-indigo-500"
          >
            Before/After を確認
          </button>
        )}
      </div>
    </div>
  );
}

