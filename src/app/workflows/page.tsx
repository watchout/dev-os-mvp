"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WorkflowRunModal } from "@/components/WorkflowRunModal";

type WorkflowSummary = {
  id: string;
  name: string;
  description?: string;
  modes: string[];
  stepsCount: number;
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/workflows", { credentials: "include" });
        if (!res.ok) {
          const text = await res.text();
          setError(text || "取得に失敗しました。");
          return;
        }
        const data = await res.json();
        setWorkflows(data?.data ?? []);
      } catch (e) {
        setError("ネットワークエラーが発生しました。");
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflows();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Workflows</p>
            <h1 className="text-2xl font-semibold text-zinc-900">ワークフロー実行</h1>
          </div>
          <Link
            href="/"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            ダッシュボードへ戻る
          </Link>
        </div>

        {loading && <p className="text-sm text-zinc-600">読み込み中...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          {workflows.map((wf) => (
            <div key={wf.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">{wf.id}</p>
                  <h2 className="text-lg font-semibold text-zinc-900">{wf.name}</h2>
                  {wf.description && (
                    <p className="text-sm text-zinc-600 line-clamp-2">{wf.description}</p>
                  )}
                </div>
                <WorkflowRunModal workflow={wf} />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                モード: {wf.modes.join(", ")} / ステップ数: {wf.stepsCount}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



