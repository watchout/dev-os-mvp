import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExecutionLogList } from "@/components/ExecutionLogList";

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchWithCookies(url: string) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(url, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });

  return res;
}

export default async function ExecutionsPage({ params }: Props) {
  const { id: organizationId } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:5100";
  const orgRes = await fetchWithCookies(`${baseUrl}/api/organizations/${organizationId}`);

  if (!orgRes.ok) {
    if (orgRes.status === 401) {
      redirect("/login");
    }
    if (orgRes.status === 403 || orgRes.status === 404) {
      redirect("/");
    }
    throw new Error("Failed to fetch organization");
  }

  const orgData = await orgRes.json();
  const organization = orgData.data;

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="border-b border-zinc-700 bg-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="mb-1 text-sm text-zinc-500">
              <Link href="/" className="hover:text-zinc-300">
                ダッシュボード
              </Link>
              <span className="mx-2">/</span>
              <Link href={`/organizations/${organizationId}`} className="hover:text-zinc-300">
                {organization.name}
              </Link>
              <span className="mx-2">/</span>
              <span className="text-zinc-300">実行履歴</span>
            </nav>
            <h1 className="text-xl font-semibold">実行履歴</h1>
          </div>
          <Link
            href={`/organizations/${organizationId}`}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            ← 組織に戻る
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <p className="text-sm text-zinc-400">
            ワークフロー実行の履歴を確認できます。トークン使用量や実行時間、課金タイプを把握してコスト管理に活用してください。
          </p>
        </div>

        <ExecutionLogList organizationId={organizationId} />
      </main>
    </div>
  );
}

