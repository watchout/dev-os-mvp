import Link from "next/link";
import { cookies } from "next/headers";
import { UpgradePlanModal, StripePortalButton } from "@/components/UpgradePlanModal";

type OrganizationResponse = {
  data: {
    id: string;
    name: string;
    slug: string;
    planId: "free" | "pro" | "team" | "enterprise";
    billingEmail: string | null;
    role: "owner" | "admin" | "member" | "viewer";
  };
};

async function fetchWithCookies<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.trim().length > 0
      ? process.env.NEXT_PUBLIC_BASE_URL
      : "http://localhost:5100";

  const res = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load ${path}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await fetchWithCookies<OrganizationResponse>(`/api/organizations/${id}`);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Organization Settings</p>
            <h1 className="text-2xl font-semibold text-zinc-900">{org.data.name}</h1>
            <p className="text-sm text-zinc-600">slug: {org.data.slug}</p>
          </div>
          <Link href={`/organizations/${org.data.id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            組織トップへ戻る
          </Link>
        </div>

        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">プラン管理</h2>
          <p className="mt-1 text-sm text-zinc-600">
            現在のプラン: <span className="font-semibold">{org.data.planId}</span>
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            請求用メール: <span className="font-semibold">{org.data.billingEmail ?? "未設定"}</span>
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <UpgradePlanModal
              organizationId={org.data.id}
              currentPlanId={org.data.planId}
              currentRole={org.data.role}
            />
            <StripePortalButton organizationId={org.data.id} currentRole={org.data.role} />
          </div>

          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            ダウングレードや請求情報の変更は Stripe のポータルから行えます。
          </div>
        </section>
      </div>
    </div>
  );
}
