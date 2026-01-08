"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { WorkflowRunModal } from "@/components/WorkflowRunModal";
import { format } from "date-fns";

type Props = {
  organizationId: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  projectDescription: string | null;
  githubRepoUrl: string | null;
};

type SSOTFile = {
  name: string;
  size: number;
  modifiedAt: string;
};

type WorkflowSummary = {
  id: string;
  name: string;
  description?: string;
  modes: string[];
  stepsCount: number;
};

type ExecutionLog = {
  id: string;
  workflowId: string;
  status: "success" | "error";
  halt: boolean;
  createdAt: string;
};

export function WorkspaceCockpit({
  organizationId,
  projectId,
  projectName,
  projectSlug,
  projectDescription,
  githubRepoUrl,
}: Props) {
  // SSOT State
  const [ssotFiles, setSsotFiles] = useState<SSOTFile[]>([]);
  const [selectedSsotFile, setSelectedSsotFile] = useState<string | null>(null);
  const [ssotPreview, setSsotPreview] = useState<string>("");
  const [ssotLoading, setSsotLoading] = useState(false);

  // Workflows State
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);

  // Executions State
  const [recentExecutions, setRecentExecutions] = useState<ExecutionLog[]>([]);
  const [executionsLoading, setExecutionsLoading] = useState(true);

  // Fetch SSOT files
  useEffect(() => {
    async function fetchSsotFiles() {
      try {
        const res = await fetch("/api/ssot", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setSsotFiles(json.data?.files || []);
          if (json.data?.files?.length > 0) {
            setSelectedSsotFile(json.data.files[0].name);
          }
        }
      } catch (e) {
        console.error("Failed to fetch SSOT files", e);
      }
    }
    fetchSsotFiles();
  }, []);

  // Fetch SSOT file content
  useEffect(() => {
    if (!selectedSsotFile) return;

    async function fetchSsotContent() {
      setSsotLoading(true);
      try {
        const res = await fetch(`/api/ssot/${encodeURIComponent(selectedSsotFile as string)}`, {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setSsotPreview(json.data?.content || "");
        }
      } catch (e) {
        console.error("Failed to fetch SSOT content", e);
      } finally {
        setSsotLoading(false);
      }
    }
    fetchSsotContent();
  }, [selectedSsotFile]);

  // Fetch workflows
  useEffect(() => {
    async function fetchWorkflows() {
      setWorkflowsLoading(true);
      try {
        const res = await fetch("/api/workflows", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setWorkflows(json.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch workflows", e);
      } finally {
        setWorkflowsLoading(false);
      }
    }
    fetchWorkflows();
  }, []);

  // Fetch recent executions
  const fetchRecentExecutions = useCallback(async () => {
    setExecutionsLoading(true);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/executions?limit=5`,
        { credentials: "include" },
      );
      if (res.ok) {
        const json = await res.json();
        setRecentExecutions(json.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch executions", e);
    } finally {
      setExecutionsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchRecentExecutions();
  }, [fetchRecentExecutions]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Section 1: Project Overview */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <span className="text-xl">📋</span> プロジェクト概要
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">プロジェクト名</dt>
            <dd className="font-medium text-zinc-900">{projectName}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">スラッグ</dt>
            <dd className="font-mono text-zinc-700">{projectSlug}</dd>
          </div>
          {projectDescription && (
            <div>
              <dt className="text-zinc-500">説明</dt>
              <dd className="text-zinc-700">{projectDescription}</dd>
            </div>
          )}
          <div>
            <dt className="text-zinc-500">GitHub連携</dt>
            <dd className="text-zinc-700">
              {githubRepoUrl ? (
                <a
                  href={githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  {githubRepoUrl}
                </a>
              ) : (
                <span className="text-zinc-400">未連携（Phase 2）</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* Section 2: SSOT Quick View */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <span className="text-xl">📁</span> SSOT クイックビュー
          </h2>
          <Link
            href="/ssot"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            SSOT管理へ →
          </Link>
        </div>

        {/* File tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {ssotFiles.map((file) => (
            <button
              key={file.name}
              type="button"
              onClick={() => setSelectedSsotFile(file.name)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                selectedSsotFile === file.name
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {file.name}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="mt-4 max-h-48 overflow-auto rounded-md bg-zinc-900 p-3">
          {ssotLoading ? (
            <p className="text-sm text-zinc-400">読み込み中...</p>
          ) : (
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
              {ssotPreview.slice(0, 1500)}
              {ssotPreview.length > 1500 && (
                <span className="text-zinc-500">... (続きはSSO管理で確認)</span>
              )}
            </pre>
          )}
        </div>
      </section>

      {/* Section 3: Workflow Execution */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <span className="text-xl">⚡</span> ワークフロー実行
          </h2>
          <Link
            href="/workflows"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            すべて見る →
          </Link>
        </div>

        {workflowsLoading ? (
          <p className="mt-4 text-sm text-zinc-500">読み込み中...</p>
        ) : workflows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">ワークフローがありません</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {workflows.slice(0, 4).map((wf) => (
              <div
                key={wf.id}
                className="flex items-center justify-between rounded-lg border bg-zinc-50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{wf.name}</p>
                  <p className="text-xs text-zinc-500">
                    {wf.stepsCount} steps
                  </p>
                </div>
                <WorkflowRunModal workflow={wf} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 4: Recent Executions */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <span className="text-xl">📊</span> 最近の実行履歴
          </h2>
          <Link
            href={`/organizations/${organizationId}/executions`}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            すべて見る →
          </Link>
        </div>

        {executionsLoading ? (
          <p className="mt-4 text-sm text-zinc-500">読み込み中...</p>
        ) : recentExecutions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            実行履歴がありません。ワークフローを実行してください。
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {recentExecutions.map((exec) => (
              <li
                key={exec.id}
                className="flex items-center justify-between rounded-md border bg-zinc-50 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      exec.status === "success"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {exec.status === "success" ? "✓" : "✗"}
                  </span>
                  <span className="text-sm font-medium text-zinc-900">
                    {exec.workflowId}
                  </span>
                  {exec.halt && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      ⚠️ Halt
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">
                  {format(new Date(exec.createdAt), "MM/dd HH:mm")}
                </span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={fetchRecentExecutions}
          className="mt-4 text-xs text-zinc-500 hover:text-zinc-700"
        >
          ↻ 更新
        </button>
      </section>
    </div>
  );
}

