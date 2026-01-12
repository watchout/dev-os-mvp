import { NextResponse } from "next/server";
import { requireAuth, requireMembership, ApiError } from "@/lib/auth";
import { createOrgScopedDb } from "@/lib/orgScopedDb";

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

    // SEC-01: organization_id scoped DB access
    const db = createOrgScopedDb(organizationId);

    // Build additional filters (organizationId is already enforced by db wrapper)
    const additionalWhere: Record<string, unknown> = {};
    if (workflowId) additionalWhere.workflowId = workflowId;
    if (status === "success" || status === "error") additionalWhere.status = status;

    const [executions, total] = await Promise.all([
      db.executionLog.findMany({
        where: additionalWhere,
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
      db.executionLog.count({ where: additionalWhere }),
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

