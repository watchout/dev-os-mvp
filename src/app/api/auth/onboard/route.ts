import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MemberRole, PlanType } from "@/generated/prisma";

/**
 * 初回オンボーディング
 * ユーザーの初期組織（Personal）と初期ワークスペースを作成する
 */
export async function POST(_request: Request) {
  try {
    const auth = await requireAuth();
    const userId = auth.user.id;
    // Supabase Auth のユーザー情報から名前を取得
    const supabaseUser = auth.supabaseUser;
    const userName = supabaseUser?.user_metadata?.full_name || supabaseUser?.email?.split("@")[0] || auth.user.name || "User";

    // すでに組織に所属しているかチェック
    const existingMembership = await prisma.organizationMember.findFirst({
      where: { userId },
    });

    if (existingMembership) {
      return NextResponse.json({ 
        message: "User already has an organization",
        organizationId: existingMembership.organizationId 
      });
    }

    // 初期組織とワークスペースの作成（トランザクション）
    const result = await prisma.$transaction(async (tx) => {
      // 1. 組織の作成
      const orgSlug = await generateUniqueOrgSlug(userName);
      const organization = await tx.organization.create({
        data: {
          name: `${userName} の弥栄`, // ブランド感を出す
          slug: orgSlug,
          planId: PlanType.free,
        },
      });

      // 2. メンバーシップ（Owner）の作成
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          role: MemberRole.owner,
          joinedAt: new Date(),
        },
      });

      // 3. 初期ワークスペースの作成
      await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: "最初の知恵の場", // ブランド感を出す
          slug: "default",
          description: "dev-OS で最初の一歩を踏み出すためのワークスペースです。",
        },
      });

      // 4. 監査ログの記録
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId,
          action: "organization.onboarded",
          resourceType: "organization",
          resourceId: organization.id,
          metadata: { name: organization.name, slug: organization.slug },
        },
      });

      return organization;
    });

    console.log(`[Onboarding] Created organization for user: ${userId} (${result.slug})`);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("[Onboarding] Failed to onboard user:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * ユーザー名からユニークな組織スラグを生成する
 */
async function generateUniqueOrgSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  
  const slug = baseSlug || "org";
  let count = 0;
  
  while (true) {
    const currentSlug = count === 0 ? slug : `${slug}-${count}`;
    const existing = await prisma.organization.findUnique({
      where: { slug: currentSlug },
    });
    if (!existing) return currentSlug;
    count++;
    if (count > 100) return `${slug}-${Math.random().toString(36).slice(2, 7)}`;
  }
}

