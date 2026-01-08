import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireMembership, ApiError } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; projectId: string }> },
) {
  try {
    const { user } = await requireAuth();
    const { id: organizationId, projectId } = await params;
    await requireMembership(user.id, organizationId);

    const project = await prisma.workspace.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        githubRepoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!project) {
      throw new ApiError(404, "Project not found", "NOT_FOUND");
    }

    return NextResponse.json({ data: project });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("[GET /api/organizations/[id]/projects/[projectId]]", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}

