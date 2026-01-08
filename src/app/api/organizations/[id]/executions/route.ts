import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, ApiError } from "@/lib/auth";

async function requireMembership(userId: string, organizationId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId },
  });
  if (!membership) {
    throw new ApiError(403, "forbidden: not a member of organization", "FORBIDDEN_ORG");
  }
  return membership;
}

/**
 * GET /api/organizations/[id]/executions
 * 組織の実行履歴一覧を取得
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuth();
    const { id: organizationId } = await params;
    await requireMembership(user.id, organizationId);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const workflowId = searchParams.get("workflowId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { organizationId };
    if (workflowId) where.workflowId = workflowId;
    if (status === "success" || status === "error") where.status = status;

    const [executions, total] = await Promise.all([
      prisma.executionLog.findMany({
        where,
        select: {
          id: true,
          workflowId: true,
          billingType: true,
          inputSummary: true,
          outputSummary: true,
          halt: true,
          tokenUsage: true,
          durationMs: true,
          status: true,
          errorMessage: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          apiKey: {
            select: {
              id: true,
              label: true,
              provider: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.executionLog.count({ where }),
    ]);

    return NextResponse.json({
      data: executions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + executions.length < total,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("GET /api/organizations/[id]/executions failed", error);
    return NextResponse.json(
      { error: "internal_server_error", code: "FETCH_FAILED" },
      { status: 500 },
    );
  }
}

