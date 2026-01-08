"use client";

import { useEffect, useMemo, useState } from "react";

type Status =
  | { type: "idle" }
  | { type: "checking" }
  | { type: "available" }
  | { type: "unavailable" }
  | { type: "invalid"; message: string }
  | { type: "error"; message: string };

type SlugInputProps = {
  label?: string;
  name?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  source?: string;
  checkEndpoint?: string;
  debounceMs?: number;
  onStatusChange?: (status: Status) => void;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function isValidSlug(value: string) {
  if (!value) return false;
  if (value.length < 3 || value.length > 50) return false;
  return /^[a-z0-9-]+$/.test(value);
}

export function SlugInput({
  label = "スラッグ",
  name,
  placeholder = "my-slug",
  value,
  onChange,
  source,
  checkEndpoint,
  debounceMs = 300,
  onStatusChange,
}: SlugInputProps) {
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  // source 変更時の自動生成（未編集のみ）
  useEffect(() => {
    if (!touched && source) {
      onChange(slugify(source));
    }
    // intentionally exclude onChange from deps to avoid unwanted triggers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, touched]);

  // 入力時のフォーマット正規化
  const handleChange = (input: string) => {
    setTouched(true);
    const next = slugify(input);
    onChange(next);
  };

  // チェック用のデバウンス
  useEffect(() => {
    if (!checkEndpoint) return;

    if (!value) {
      setStatus({ type: "idle" });
      return;
    }

    if (!isValidSlug(value)) {
      setStatus({
        type: "invalid",
        message: "英小文字・数字・ハイフンで3〜50文字にしてください。",
      });
      return;
    }

    setStatus({ type: "checking" });
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`${checkEndpoint}?slug=${encodeURIComponent(value)}`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) {
          const text = await res.text();
          setStatus({ type: "error", message: text || "チェックに失敗しました。" });
          return;
        }
        const data = await res.json().catch(() => null);
        const available = data?.data?.available === true;
        setStatus(available ? { type: "available" } : { type: "unavailable" });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setStatus({ type: "error", message: "チェックに失敗しました。" });
      }
    }, debounceMs);

    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [value, checkEndpoint, debounceMs]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const helper = useMemo(() => {
    switch (status.type) {
      case "checking":
        return { text: "⏳ チェック中...", color: "text-zinc-500" };
      case "available":
        return { text: "✅ 利用可能です", color: "text-green-600" };
      case "unavailable":
        return { text: "❌ このスラッグは既に使用されています", color: "text-red-600" };
      case "invalid":
        return { text: `⚠️ ${status.message}`, color: "text-red-600" };
      case "error":
        return { text: `⚠️ ${status.message}`, color: "text-red-600" };
      default:
        return { text: "英小文字・数字・ハイフンのみ使用できます。", color: "text-zinc-500" };
    }
  }, [status]);

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        pattern="[a-z0-9-]+"
        required
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <p className={`mt-1 text-xs ${helper.color}`}>{helper.text}</p>
    </div>
  );
}

