"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";

type ExecutionLog = {
  id: string;
  workflowId: string;
  billingType: "platform_credit" | "byo_key";
  inputSummary: string | null;
  outputSummary: string | null;
  halt: boolean;
  haltTriggerIds: string[] | null;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  durationMs: number;
  status: "success" | "error";
  errorMessage: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  apiKey: { id: string; label: string; provider: string } | null;
};

type Pagination = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

type Props = {
  organizationId: string;
};

export function ExecutionLogList({ organizationId }: Props) {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });

  const fetchLogs = useCallback(
    async (offset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/organizations/${organizationId}/executions?limit=${pagination.limit}&offset=${offset}`,
          { credentials: "include" },
        );
        if (!res.ok) {
          throw new Error("実行履歴の取得に失敗しました");
        }
        const data = await res.json();
        setLogs(data?.data ?? []);
        setPagination(
          data?.pagination ?? {
            total: data?.data?.length ?? 0,
            limit: pagination.limit,
            offset,
            hasMore: false,
          },
        );
      } catch (err: any) {
        setError(err.message || "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    },
    [organizationId, pagination.limit],
  );

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  if (loading) {
    return <div className="py-8 text-center text-zinc-400">読み込み中...</div>;
  }

  if (error) {
    return <div className="py-8 text-center text-red-400">エラー: {error}</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-zinc-500">
        実行履歴がありません。ワークフローを実行すると記録されます。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-zinc-700">
        <table className="min-w-full divide-y divide-zinc-700">
          <thead className="bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">ワークフロー</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">ステータス</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">Halt</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">課金タイプ</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">トークン</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">実行時間</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">実行者</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">日時</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700 bg-zinc-900">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-zinc-800/50">
                <td className="px-4 py-3 text-sm font-medium text-zinc-200">{log.workflowId}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      log.status === "success"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-red-900/50 text-red-400"
                    }`}
                  >
                    {log.status === "success" ? "✓ 成功" : "✗ 失敗"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {log.halt ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-amber-900/50 px-2 py-1 text-xs font-medium text-amber-400 cursor-help"
                      title={log.haltTriggerIds?.join(", ") || "halt triggered"}
                    >
                      ⚠️ Halt
                    </span>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">
                  {log.billingType === "byo_key" ? (
                    <span className="text-blue-400">🔑 BYO Key</span>
                  ) : (
                    <span className="text-zinc-400">💳 Platform</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">
                  {log.tokenUsage?.totalTokens !== undefined && log.tokenUsage?.totalTokens !== null
                    ? log.tokenUsage.totalTokens.toLocaleString()
                    : "-"}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">
                  {log.durationMs !== null && log.durationMs !== undefined
                    ? `${(log.durationMs / 1000).toFixed(1)}s`
                    : "-"}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">{log.user?.name ?? "-"}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">
                  {log.createdAt ? format(new Date(log.createdAt), "MM/dd HH:mm") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>
          {pagination.offset + 1} - {pagination.offset + logs.length} / {pagination.total} 件
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => fetchLogs(pagination.offset - pagination.limit)}
            disabled={pagination.offset === 0}
            className="rounded bg-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← 前へ
          </button>
          <button
            onClick={() => fetchLogs(pagination.offset + pagination.limit)}
            disabled={!pagination.hasMore}
            className="rounded bg-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            次へ →
          </button>
        </div>
      </div>
    </div>
  );
}

