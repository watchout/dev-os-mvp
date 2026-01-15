"use client";

import { useState } from "react";

type Props = {
  organizationId: string;
  currentPlanId: "free" | "pro" | "team" | "enterprise";
  currentRole: "owner" | "admin" | "member" | "viewer";
};

type BillingInterval = "monthly" | "annual";

const PLAN_LABEL: Record<Props["currentPlanId"], string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
  enterprise: "Enterprise",
};

const PLAN_SUMMARY = {
  pro: {
    name: "Pro",
    monthly: "¥4,980 / 月",
    annual: "¥49,800 / 年",
    features: ["無制限ワークフロー実行", "Reviewer / Refiner", "BYO APIキー（3つ）"],
  },
  team: {
    name: "Team",
    monthly: "¥29,800 / 月",
    annual: "¥298,000 / 年",
    features: ["チームメンバー管理", "ロール・権限管理", "Linear / Plane連携"],
  },
};

export function UpgradePlanModal({ organizationId, currentPlanId, currentRole }: Props) {
  const [open, setOpen] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState<null | "pro" | "team">(null);
  const [error, setError] = useState<string | null>(null);

  const canUpgrade = currentRole === "owner" || currentRole === "admin";
  const isProOrAbove = currentPlanId === "pro" || currentPlanId === "team" || currentPlanId === "enterprise";
  const isTeamOrAbove = currentPlanId === "team" || currentPlanId === "enterprise";

  const handleCheckout = async (planId: "pro" | "team") => {
    if (!canUpgrade) return;
    setError(null);
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, planId, billingInterval }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Checkout セッションの作成に失敗しました");
      }
      const data = await res.json();
      if (!data?.sessionUrl) {
        throw new Error("Checkout セッションURLが取得できませんでした");
      }
      window.location.href = data.sessionUrl;
    } catch (err: any) {
      setError(err?.message ?? "エラーが発生しました");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        disabled={!canUpgrade}
      >
        プランをアップグレード
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Plan</p>
                <h3 className="text-lg font-semibold text-zinc-900">プランをアップグレード</h3>
                <p className="text-sm text-zinc-600">
                  現在のプラン: <span className="font-semibold">{PLAN_LABEL[currentPlanId]}</span>
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500 hover:text-zinc-700">
                閉じる
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 text-sm">
              <span className="text-zinc-600">請求サイクル</span>
              <div className="inline-flex rounded-full bg-zinc-100 p-1">
                {(["monthly", "annual"] as BillingInterval[]).map((interval) => (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => setBillingInterval(interval)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      billingInterval === interval ? "bg-white text-zinc-900 shadow" : "text-zinc-500"
                    }`}
                  >
                    {interval === "monthly" ? "月額" : "年額"}
                  </button>
                ))}
              </div>
              <span className="text-xs text-zinc-500">年額は2ヶ月分お得</span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {(["pro", "team"] as const).map((planId) => {
                const plan = PLAN_SUMMARY[planId];
                const price = billingInterval === "monthly" ? plan.monthly : plan.annual;
                const disabled =
                  !canUpgrade ||
                  (planId === "pro" && isProOrAbove) ||
                  (planId === "team" && isTeamOrAbove);
                return (
                  <div key={planId} className="rounded-lg border border-zinc-200 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-zinc-900">{plan.name}</h4>
                      {planId === "team" && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                          おすすめ
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-lg font-semibold text-zinc-900">{price}</p>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600">
                      {plan.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => handleCheckout(planId)}
                      disabled={disabled || loading === planId}
                      className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                    >
                      {loading === planId ? "作成中..." : `${plan.name}にアップグレード`}
                    </button>
                  </div>
                );
              })}
            </div>

            {!canUpgrade && (
              <p className="mt-4 text-xs text-amber-600">
                プラン変更は owner / admin のみ実行できます。
              </p>
            )}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
              Enterprise プランは「お問い合わせ」からご相談ください。
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function StripePortalButton({
  organizationId,
  currentRole,
}: {
  organizationId: string;
  currentRole: Props["currentRole"];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = currentRole === "owner" || currentRole === "admin";

  const openPortal = async () => {
    if (!canManage) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "ポータルの作成に失敗しました");
      }
      const data = await res.json();
      if (!data?.url) {
        throw new Error("ポータルURLが取得できませんでした");
      }
      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message ?? "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={openPortal}
        disabled={!canManage || loading}
        className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100"
      >
        {loading ? "ポータルを開いています..." : "請求ポータルを開く"}
      </button>
      {!canManage && (
        <p className="text-xs text-amber-600">プラン管理は owner / admin のみ実行できます。</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
