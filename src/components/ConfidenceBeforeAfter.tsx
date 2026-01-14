"use client";

import { useMemo } from "react";
import type { ConfidenceResult } from "@/lib/confidence-level-client";

type Props = {
  before: ConfidenceResult | null;
  after: ConfidenceResult | null;
};

const LEVEL_META: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Level 1", color: "text-red-500", bg: "bg-red-500" },
  2: { label: "Level 2", color: "text-amber-500", bg: "bg-amber-400" },
  3: { label: "Level 3", color: "text-green-500", bg: "bg-green-500" },
};

const percent = (lvl?: number | null) => {
  if (lvl === 1) return 32;
  if (lvl === 2) return 66;
  if (lvl === 3) return 100;
  return 0;
};

function DetailChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
        active
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-zinc-100 text-zinc-500 border border-zinc-200"
      }`}
    >
      {active ? "✓" : "・"} {label}
    </span>
  );
}

export function ConfidenceBeforeAfter({ before, after }: Props) {
  const delta = useMemo(() => {
    if (!before?.level && !after?.level) return null;
    const from = before?.level ?? "-";
    const to = after?.level ?? "-";
    if (typeof from === "number" && typeof to === "number") {
      return `Level ${from} → Level ${to} (${to - from >= 0 ? "+" : ""}${to - from})`;
    }
    return `Level ${from} → Level ${to}`;
  }, [before?.level, after?.level]);

  const beforeMeta = LEVEL_META[before?.level ?? 0];
  const afterMeta = LEVEL_META[after?.level ?? 0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-zinc-900">確信レベル Before / After</h4>
        <span className="text-sm text-zinc-600">{delta ?? "データなし"}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { label: "Before", data: before, meta: beforeMeta },
          { label: "After", data: after, meta: afterMeta },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{item.label}</p>
              <span className={`text-sm font-semibold ${item.meta?.color ?? "text-zinc-400"}`}>
                {item.data ? item.meta?.label ?? `Level ${item.data.level}` : "-"}
              </span>
            </div>
            <div className="mt-3 h-3 w-full rounded-full bg-zinc-100">
              <div
                className={`h-3 rounded-full ${item.meta?.bg ?? "bg-zinc-300"} transition-all duration-500 ease-out`}
                style={{ width: `${percent(item.data?.level)}%` }}
              />
            </div>
            <div className="mt-3 text-xs text-zinc-600">
              {item.data?.hints?.length ? (
                <ul className="list-disc space-y-1 pl-4">
                  {item.data.hints.slice(0, 3).map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-400">ヒントはありません。</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">改善項目</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {["hasSSOTReference", "hasObjective", "hasConstraints", "hasEdgeCases"].map((key) => (
            <DetailChip
              key={key}
              label={
                {
                  hasSSOTReference: "SSOT参照",
                  hasObjective: "目的の明確化",
                  hasConstraints: "制約条件",
                  hasEdgeCases: "エッジケース",
                }[key as keyof ConfidenceResult["details"]]
              }
              active={Boolean(after?.details?.[key as keyof ConfidenceResult["details"]])}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
