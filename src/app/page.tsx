import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

type ProfileData = {
  data: {
    user: { id: string; email: string; name: string; avatarUrl: string | null };
    memberships: Array<{
      organizationId: string;
      role: string;
      organization: { id: string; name: string; slug: string; planId: string };
    }>;
  };
};

async function fetchProfile(): Promise<ProfileData | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.trim().length > 0
      ? process.env.NEXT_PUBLIC_BASE_URL
      : "http://localhost:5100";

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!res.ok) {
    return null;
  }

  return res.json() as Promise<ProfileData>;
}

export default async function DashboardPage() {
  const profile = await fetchProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Dashboard
            </p>
            <h1 className="text-xl font-semibold text-zinc-900">
              ようこそ、{profile.data.user.name} さん
            </h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">ユーザー情報</h2>
          <p className="mt-2 text-sm text-zinc-600">メール: {profile.data.user.email}</p>
          <p className="text-sm text-zinc-600">ユーザーID: {profile.data.user.id}</p>
        </section>

        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">所属組織</h2>
            <Link
              href="/organizations/new"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              新規作成 →
            </Link>
          </div>
          {profile.data.memberships.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">
              所属している組織がありません。
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {profile.data.memberships.map((member) => (
                <li key={member.organizationId} className="py-3">
                  <Link
                    href={`/organizations/${member.organizationId}`}
                    className="flex items-center justify-between rounded-md p-2 -m-2 hover:bg-zinc-50 transition"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {member.organization.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        slug: {member.organization.slug} / plan: {member.organization.planId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                        {member.role}
                      </span>
                      <span className="text-zinc-400">→</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
