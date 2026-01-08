"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlugInput } from "./SlugInput";

type Props = {
  organizationId: string;
  onCreated?: () => void;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export function CreateProjectModal({ organizationId, onCreated }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "available" | "unavailable" | "invalid" | "checking" | "idle" | "error"
  >("idle");

  const reset = () => {
    setName("");
    setSlug("");
    setDescription("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedSlug = slugify(slug || name);

    if (!trimmedName || !trimmedSlug) {
      setError("名前とスラッグは必須です。");
      return;
    }

    if (trimmedName.length < 1 || trimmedName.length > 100) {
      setError("名前は1〜100文字で入力してください。");
      return;
    }

    if (trimmedSlug.length < 3 || trimmedSlug.length > 50) {
      setError("スラッグは3〜50文字で入力してください。");
      return;
    }

    if (["unavailable", "invalid", "checking", "error"].includes(slugStatus)) {
      setError("スラッグを修正してください。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "作成に失敗しました。");
        return;
      }

      reset();
      setOpen(false);
      onCreated?.();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        プロジェクトを作成
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
          <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">プロジェクト作成</h3>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="text-sm text-zinc-500 hover:text-zinc-700"
              >
                閉じる
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-zinc-700">プロジェクト名</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(slugify(e.target.value));
                    }
                  }}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="プロジェクト名を入力"
                />
              </div>

              <SlugInput
                label="スラッグ"
                value={slug}
                onChange={setSlug}
                source={name}
                placeholder="my-project"
                checkEndpoint={`/api/organizations/${organizationId}/projects/check-slug`}
                debounceMs={300}
                onStatusChange={(s) => setSlugStatus(s.type)}
              />

              <div>
                <label className="block text-sm font-medium text-zinc-700">説明 (任意)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                  placeholder="プロジェクトの概要を入力"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !name.trim() ||
                    !slug.trim() ||
                    name.trim().length < 1 ||
                    name.trim().length > 100 ||
                    slug.trim().length < 3 ||
                    slug.trim().length > 50 ||
                    ["unavailable", "invalid", "checking", "error"].includes(slugStatus)
                  }
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {loading ? "作成中..." : "作成する"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  className="text-sm text-zinc-600 hover:text-zinc-800"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

