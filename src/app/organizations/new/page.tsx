"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { SlugInput } from "@/components/SlugInput";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "available" | "unavailable" | "invalid" | "checking" | "idle" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedSlug = slugify(slug || name);
    const trimmedBilling = billingEmail.trim();

    if (!trimmedName || !trimmedSlug) {
      setError("組織名とスラッグは必須です。");
      return;
    }

    if (trimmedName.length < 1 || trimmedName.length > 100) {
      setError("組織名は1〜100文字で入力してください。");
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
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          slug: trimmedSlug,
          billingEmail: trimmedBilling || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "作成に失敗しました。");
        return;
      }

      const data = await res.json();
      if (data?.data?.id) {
        router.push(`/organizations/${data.data.id}`);
      } else {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Organizations</p>
            <h1 className="text-2xl font-semibold text-zinc-900">新しい組織を作成</h1>
          </div>
          <Link
            href="/"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            ダッシュボードへ戻る
          </Link>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-zinc-700">組織名</label>
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
                placeholder="例: 株式会社デブオス"
              />
            </div>

            <SlugInput
              label="スラッグ"
              value={slug}
              onChange={setSlug}
              source={name}
              placeholder="my-org"
              checkEndpoint="/api/organizations/check-slug"
              debounceMs={300}
              onStatusChange={(s) => setSlugStatus(s.type)}
            />

            <div>
              <label className="block text-sm font-medium text-zinc-700">
                請求用メールアドレス（任意）
              </label>
              <input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="billing@example.com"
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
              <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-800">
                キャンセル
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

