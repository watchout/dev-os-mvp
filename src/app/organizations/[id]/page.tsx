import Link from "next/link";
import { cookies } from "next/headers";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { MemberManager } from "@/components/MemberManager";

type OrganizationResponse = {
  data: {
    id: string;
    name: string;
    slug: string;
    planId: string;
    billingEmail: string | null;
    role: string;
  };
};

type ProjectsResponse = {
  data: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
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

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await fetchWithCookies<OrganizationResponse>(`/api/organizations/${id}`);
  const projects = await fetchWithCookies<ProjectsResponse>(
    `/api/organizations/${id}/projects`,
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Organization</p>
            <h1 className="text-2xl font-semibold text-zinc-900">{org.data.name}</h1>
            <p className="text-sm text-zinc-600">
              slug: {org.data.slug} / plan: {org.data.planId} / role: {org.data.role}
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            ダッシュボードへ戻る
          </Link>
        </div>

        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">組織情報</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-zinc-700 sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">名前</dt>
              <dd className="font-medium text-zinc-900">{org.data.name}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">スラッグ</dt>
              <dd className="font-medium text-zinc-900">{org.data.slug}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">プラン</dt>
              <dd className="font-medium text-zinc-900">{org.data.planId}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">請求用メール</dt>
              <dd className="font-medium text-zinc-900">
                {org.data.billingEmail ?? "未設定"}
              </dd>
            </div>
          </dl>
        </section>

        {/* メンバー管理セクション */}
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">メンバー</h2>
              <p className="mt-1 text-sm text-zinc-600">組織のメンバーを管理・招待</p>
            </div>
          </div>
          <div className="mt-4">
            <MemberManager organizationId={org.data.id} currentUserRole={org.data.role} />
          </div>
        </section>

        {/* APIキー管理へのリンク（owner/adminのみ表示） */}
        {(org.data.role === "owner" || org.data.role === "admin") && (
          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">APIキー管理</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  LLMプロバイダー（OpenAI, Anthropic等）のAPIキーを管理
                </p>
              </div>
              <Link
                href={`/organizations/${org.data.id}/keys`}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                APIキーを管理
              </Link>
            </div>
          </section>
        )}

        {/* 実行履歴へのリンク */}
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">実行履歴</h2>
              <p className="mt-1 text-sm text-zinc-600">
                ワークフロー実行のログを確認・トークン使用量を把握
              </p>
            </div>
            <Link
              href={`/organizations/${org.data.id}/executions`}
              className="inline-flex items-center rounded-md bg-zinc-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700"
            >
              実行履歴を見る
            </Link>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">プロジェクト</h2>
            <CreateProjectModal organizationId={org.data.id} />
          </div>

          {projects.data.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">
              プロジェクトがありません。作成しましょう。
            </p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {projects.data.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/organizations/${org.data.id}/projects/${project.id}`}
                    className="block rounded-lg border p-4 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <p className="text-sm font-semibold text-zinc-900">{project.name}</p>
                    <p className="text-xs text-zinc-500">slug: {project.slug}</p>
                    {project.description && (
                      <p className="mt-2 text-sm text-zinc-700 line-clamp-3">
                        {project.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs font-medium text-indigo-600">
                      コクピットを開く →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

