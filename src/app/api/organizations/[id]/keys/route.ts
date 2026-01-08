/**
 * APIキー管理 API
 * GET  /api/organizations/[id]/keys - 一覧取得
 * POST /api/organizations/[id]/keys - 新規登録
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, ApiError } from "@/lib/auth";
import { encrypt, extractKeyPrefix } from "@/lib/encryption";
import type { LlmProvider } from "@/generated/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
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
 * GET: 組織のAPIキー一覧取得（マスク表示）
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();
    const { id: organizationId } = await context.params;

    // 権限チェック
    await requireOrgAdminOrOwner(organizationId, auth.user.id);

    // APIキー一覧取得（encryptedKeyは返さない）
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        label: true,
        keyPrefix: true,
        isDefault: true,
        lastUsedAt: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: apiKeys });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("[API Keys GET Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

/**
 * POST: 新規APIキー登録
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();
    const { id: organizationId } = await context.params;

    // 権限チェック
    await requireOrgAdminOrOwner(organizationId, auth.user.id);

    // リクエストボディ
    const body = await request.json();
    const { provider, label, apiKey } = body as {
      provider: string;
      label: string;
      apiKey: string;
    };

    // バリデーション
    if (!provider || !label || !apiKey) {
      throw new ApiError(400, "provider, label, and apiKey are required", "VALIDATION_ERROR");
    }

    // プロバイダー検証
    const validProviders: LlmProvider[] = ["openai", "anthropic", "google", "custom"];
    if (!validProviders.includes(provider as LlmProvider)) {
      throw new ApiError(400, `Invalid provider. Must be one of: ${validProviders.join(", ")}`, "VALIDATION_ERROR");
    }

    // APIキーのフォーマット検証（最低限）
    if (apiKey.length < 10) {
      throw new ApiError(400, "API key is too short", "VALIDATION_ERROR");
    }

    // 組織の存在確認
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new ApiError(404, "Organization not found", "NOT_FOUND");
    }

    // 暗号化
    const encryptedKey = encrypt(apiKey);
    const keyPrefix = extractKeyPrefix(apiKey);

    // 保存
    const created = await prisma.apiKey.create({
      data: {
        organizationId,
        provider: provider as LlmProvider,
        label,
        encryptedKey,
        keyPrefix,
        createdById: auth.user.id,
      },
      select: {
        id: true,
        provider: true,
        label: true,
        keyPrefix: true,
        isDefault: true,
        createdAt: true,
      },
    });

    // 注意: encryptedKey は返さない
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("[API Keys POST Error]", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

