import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WorkspaceCockpit } from "@/components/WorkspaceCockpit";

type OrganizationResponse = {
  data: {
    id: string;
    name: string;
    slug: string;
    role: string;
  };
};

type ProjectResponse = {
  data: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    githubRepoUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

async function fetchWithCookies<T>(path: string): Promise<T | null> {
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
    if (res.status === 401) {
      redirect("/login");
    }
    if (res.status === 404 || res.status === 403) {
      return null;
    }
    throw new Error(`Failed to fetch ${path}`);
  }

  return res.json() as Promise<T>;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id: organizationId, projectId } = await params;

  const [orgRes, projectRes] = await Promise.all([
    fetchWithCookies<OrganizationResponse>(`/api/organizations/${organizationId}`),
    fetchWithCookies<ProjectResponse>(`/api/organizations/${organizationId}/projects/${projectId}`),
  ]);

  if (!orgRes || !projectRes) {
    redirect(`/organizations/${organizationId}`);
  }

  const org = orgRes.data;
  const project = projectRes.data;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-700">
            ダッシュボード
          </Link>
          <span>/</span>
          <Link
            href={`/organizations/${organizationId}`}
            className="hover:text-zinc-700"
          >
            {org.name}
          </Link>
          <span>/</span>
          <span className="font-medium text-zinc-900">{project.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              {project.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              ワークスペースコクピット - SSOT参照・ワークフロー実行
            </p>
          </div>
          <Link
            href={`/organizations/${organizationId}`}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            ← 組織に戻る
          </Link>
        </div>

        {/* Cockpit */}
        <WorkspaceCockpit
          organizationId={organizationId}
          projectId={projectId}
          projectName={project.name}
          projectSlug={project.slug}
          projectDescription={project.description}
          githubRepoUrl={project.githubRepoUrl}
        />
      </div>
    </div>
  );
}

