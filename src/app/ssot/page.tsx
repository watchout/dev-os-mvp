"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SSOTEditor } from "@/components/SSOTEditor";

type SSOTFile = {
  name: string;
  size: number;
  modifiedAt: string;
};

export default function SSOTPage() {
  const [files, setFiles] = useState<SSOTFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ファイル一覧取得
  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch("/api/ssot", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch files");
        const json = await res.json();
        setFiles(json.data?.files || []);
        
        // 最初のファイルを自動選択
        if (json.data?.files?.length > 0 && !selectedFile) {
          setSelectedFile(json.data.files[0].name);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load files");
      } finally {
        setLoading(false);
      }
    }
    fetchFiles();
  }, [selectedFile]);

  // ファイル内容取得
  useEffect(() => {
    if (!selectedFile) return;

    async function fetchFileContent() {
      setLoadingFile(true);
      try {
        const res = await fetch(`/api/ssot/${encodeURIComponent(selectedFile as string)}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch file");
        const json = await res.json();
        setFileContent(json.data?.content || "");
      } catch (e: any) {
        setError(e?.message || "Failed to load file");
      } finally {
        setLoadingFile(false);
      }
    }
    fetchFileContent();
  }, [selectedFile]);

  // 保存処理
  const handleSave = useCallback(
    async (content: string) => {
      if (!selectedFile) return;

      const res = await fetch(`/api/ssot/${encodeURIComponent(selectedFile)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save file");
      }

      // ファイル一覧を更新（modifiedAtが変わるため）
      const filesRes = await fetch("/api/ssot", { credentials: "include" });
      if (filesRes.ok) {
        const json = await filesRes.json();
        setFiles(json.data?.files || []);
      }
    },
    [selectedFile]
  );

  // ファイルサイズフォーマット
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 日時フォーマット
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900 text-zinc-300">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-900">
      {/* ヘッダー */}
      <header className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">SSOT</p>
          <h1 className="text-lg font-semibold text-zinc-100">SSOT 管理</h1>
        </div>
        <Link
          href="/"
          className="text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          ダッシュボードへ戻る
        </Link>
      </header>

      {error && (
        <div className="border-b border-red-700 bg-red-900/50 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー：ファイル一覧 */}
        <aside className="w-64 overflow-y-auto border-r border-zinc-700 bg-zinc-800">
          <div className="p-3">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              ファイル一覧
            </h2>
            {files.length === 0 ? (
              <p className="text-sm text-zinc-500">ファイルがありません</p>
            ) : (
              <ul className="space-y-1">
                {files.map((file) => (
                  <li key={file.name}>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(file.name)}
                      className={`w-full rounded px-3 py-2 text-left transition ${
                        selectedFile === file.name
                          ? "bg-indigo-600 text-white"
                          : "text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      <div className="font-mono text-sm">{file.name}</div>
                      <div className="mt-0.5 flex justify-between text-xs text-zinc-400">
                        <span>{formatSize(file.size)}</span>
                        <span>{formatDate(file.modifiedAt)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* メイン：エディタ */}
        <main className="flex-1 overflow-hidden">
          {loadingFile ? (
            <div className="flex h-full items-center justify-center text-zinc-400">
              ファイルを読み込み中...
            </div>
          ) : selectedFile ? (
            <SSOTEditor
              key={selectedFile}
              filename={selectedFile}
              initialContent={fileContent}
              onSave={handleSave}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500">
              ファイルを選択してください
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

