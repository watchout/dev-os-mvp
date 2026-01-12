/**
 * APIキー個別操作 API
 * DELETE /api/organizations/[id]/keys/[keyId] - 削除
 */

import { NextResponse } from "next/server";
import { requireAuth, ApiError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createOrgScopedDb } from "@/lib/orgScopedDb";

type RouteContext = {
  params: Promise<{ id: string; keyId: string }>;
};

// 組織メンバーシップと権限チェック
async function requireOrgAdminOrOwner(organizationId: string, userId: string) {
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId,
      role: { in: ["owner", "admin"] },
    },
  });

  if (!member) {
    throw new ApiError(403, "Admin or owner access required", "FORBIDDEN");
  }

  return member;
}

/**
 * DELETE: APIキー削除（物理削除）
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();
    const { id: organizationId, keyId } = await context.params;

    // 権限チェック
    await requireOrgAdminOrOwner(organizationId, auth.user.id);

    const db = createOrgScopedDb(organizationId);

    // APIキーの存在確認と所有権確認
    const apiKey = await db.apiKey.findFirst({
      where: { id: keyId },
    });

    if (!apiKey) {
      throw new ApiError(404, "API key not found", "NOT_FOUND");
    }

    // 物理削除
    await db.apiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({ data: { deleted: true, id: keyId } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("[API Keys DELETE Error]", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}

