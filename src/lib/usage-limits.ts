import prisma from "@/lib/prisma";
import { ExecutionStatus, PlanType } from "@/generated/prisma";

/**
 * 組織の今月のワークフロー実行数を取得し、制限に達しているか判定する
 */
export async function checkUsageLimit(organizationId: string): Promise<{
  isLimited: boolean;
  currentCount: number;
  limit: number;
  planId: PlanType;
}> {
  // 1. 組織のプランを取得
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { planId: true }
  });

  if (!org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  // 2. Free プラン以外は制限なし（現在は一律無限とするが、将来的にプランごとの制限を設ける可能性あり）
  if (org.planId !== PlanType.free) {
    return {
      isLimited: false,
      currentCount: 0,
      limit: Infinity,
      planId: org.planId
    };
  }

  // 3. 今月の実行数をカウント（success または halted）
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.executionLog.count({
    where: {
      organizationId,
      createdAt: { gte: startOfMonth },
      status: { in: [ExecutionStatus.success, ExecutionStatus.halted] },
    },
  });

  const LIMIT = 10; // Free プランの制限数
  return {
    isLimited: count >= LIMIT,
    currentCount: count,
    limit: LIMIT,
    planId: org.planId
  };
}

