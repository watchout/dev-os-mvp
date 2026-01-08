import Link from "next/link";
import { cookies } from "next/headers";
import { DiscoverySession } from "@/components/DiscoverySession";

type OrganizationResponse = {
  data: {
    id: string;
    name: string;
    slug: string;
    planId: string;
    role: string;
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

export default async function DiscoveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await fetchWithCookies<OrganizationResponse>(`/api/organizations/${id}`);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {org.data.name} / Discovery
            </p>
            <h1 className="text-2xl font-bold text-zinc-900">知恵の深掘り</h1>
          </div>
          <Link
            href={`/organizations/${org.data.id}`}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            組織トップへ戻る
          </Link>
        </div>

        <DiscoverySession />
      </div>
    </div>
  );
}

