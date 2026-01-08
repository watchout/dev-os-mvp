"use client";

import { useState, useEffect, useCallback } from "react";

type ApiKeyData = {
  id: string;
  provider: string;
  label: string;
  keyPrefix: string;
  isDefault: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
};

type Props = {
  organizationId: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  custom: "Custom",
};

export function ApiKeyManager({ organizationId }: Props) {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // モーダル状態
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyData | null>(null);

  // フォーム状態
  const [formProvider, setFormProvider] = useState("openai");
  const [formLabel, setFormLabel] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 一覧取得
  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/keys`, {
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to fetch");
      }
      const json = await res.json();
      setKeys(json.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  // 追加
  const handleAdd = async () => {
    setFormError(null);
    setFormSubmitting(true);

    try {
      const res = await fetch(`/api/organizations/${organizationId}/keys`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: formProvider,
          label: formLabel,
          apiKey: formApiKey,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add");
      }

      // 成功 → 一覧再取得 & モーダル閉じる
      await fetchKeys();
      setShowAddModal(false);
      setFormProvider("openai");
      setFormLabel("");
      setFormApiKey("");
    } catch (e: any) {
      setFormError(e?.message || "Failed to add API key");
    } finally {
      setFormSubmitting(false);
    }
  };

  // 削除
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/keys/${deleteTarget.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete");
      }

      // 成功 → 一覧再取得 & モーダル閉じる
      await fetchKeys();
      setDeleteTarget(null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete API key");
    }
  };

  // 日時フォーマット
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="text-zinc-400">読み込み中...</div>;
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">APIキー一覧</h2>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + APIキーを追加
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* 一覧 */}
      {keys.length === 0 ? (
        <div className="rounded border border-zinc-700 bg-zinc-800 p-6 text-center text-zinc-400">
          APIキーがまだ登録されていません
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-zinc-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-800 text-zinc-400">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">名前</th>
                <th className="px-4 py-3">キー</th>
                <th className="px-4 py-3">作成日時</th>
                <th className="px-4 py-3">作成者</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700 bg-zinc-900">
              {keys.map((key) => (
                <tr key={key.id}>
                  <td className="px-4 py-3">
                    <span className="rounded bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300">
                      {PROVIDER_LABELS[key.provider] || key.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-200">{key.label}</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">
                    {key.keyPrefix}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatDate(key.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {key.createdBy?.name || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(key)}
                      className="text-red-400 hover:text-red-300"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 p-6">
            <h3 className="mb-4 text-lg font-semibold text-zinc-100">
              APIキーを追加
            </h3>

            {formError && (
              <div className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-300">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300">
                  Provider
                </label>
                <select
                  value={formProvider}
                  onChange={(e) => setFormProvider(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">
                  名前（表示用ラベル）
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="例: 本番用 OpenAI"
                  className="mt-1 w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">
                  APIキー
                </label>
                <input
                  type="password"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="mt-1 w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 font-mono text-zinc-100 placeholder:text-zinc-500"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  キーは暗号化して保存されます
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setFormError(null);
                }}
                className="rounded px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={formSubmitting || !formLabel || !formApiKey}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-600"
              >
                {formSubmitting ? "追加中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-800 p-6">
            <h3 className="mb-2 text-lg font-semibold text-zinc-100">
              APIキーを削除
            </h3>
            <p className="mb-4 text-sm text-zinc-400">
              「{deleteTarget.label}」を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

