import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireMembership, ensureAdminOrOwner, ApiError } from "@/lib/auth";
import { MemberRole } from "@/generated/prisma";

type UpdateRequest = {
  role?: MemberRole | string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const { user } = await requireAuth();
    const { id: organizationId, memberId } = await params;
    const callerMembership = await requireMembership(user.id, organizationId);
    ensureAdminOrOwner(callerMembership.role);

    const body = (await request.json()) as UpdateRequest;
    const roleInput = typeof body.role === "string" ? body.role.toLowerCase() : "";
    const allowedRoles: MemberRole[] = [MemberRole.admin, MemberRole.member, MemberRole.viewer];
    if (!allowedRoles.includes(roleInput as MemberRole)) {
      throw new ApiError(400, "Role must be admin, member, or viewer", "INVALID_ROLE");
    }

    // 対象メンバー取得
    const target = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });
    if (!target || target.organizationId !== organizationId) {
      throw new ApiError(404, "Member not found", "NOT_FOUND");
    }

    // 自分自身のロール変更は禁止
    if (target.userId === user.id) {
      throw new ApiError(403, "You cannot change your own role", "FORBIDDEN");
    }
    // owner への昇格禁止
    if (roleInput === MemberRole.owner) {
      throw new ApiError(403, "Cannot promote to owner", "FORBIDDEN");
    }
    // owner を変更する場合はownerのみ許可
    if (target.role === MemberRole.owner) {
      if (callerMembership.role !== MemberRole.owner) {
        throw new ApiError(403, "Only owner can change owner role", "FORBIDDEN");
      }
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: roleInput as MemberRole },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        organizationId: updated.organizationId,
        userId: updated.userId,
        role: updated.role,
        invitedAt: updated.invitedAt,
        joinedAt: updated.joinedAt,
        user: updated.user,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update member role", code: error?.code },
      { status: error?.statusCode || 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const { user } = await requireAuth();
    const { id: organizationId, memberId } = await params;
    const callerMembership = await requireMembership(user.id, organizationId);

    const target = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });
    if (!target || target.organizationId !== organizationId) {
      throw new ApiError(404, "Member not found", "NOT_FOUND");
    }

    const isSelf = target.userId === user.id;
    const callerRole = callerMembership.role;
    const targetRole = target.role;

    // ownerの削除は禁止
    if (targetRole === MemberRole.owner) {
      throw new ApiError(400, "Cannot remove the owner", "FORBIDDEN");
    }

    // 自分以外を削除する場合の権限
    if (!isSelf) {
      if (callerRole === MemberRole.owner) {
        // ownerは削除可（ただしowner削除は禁止済み）
      } else if (callerRole === MemberRole.admin) {
        // admin は他の admin を削除不可（owner は上で除外済み）
        if (targetRole === MemberRole.admin) {
          throw new ApiError(403, "Admin cannot remove other admin", "FORBIDDEN");
        }
      } else {
        throw new ApiError(403, "Not allowed to remove other members", "FORBIDDEN");
      }
    } else {
      // 自分の退会はowner以外のみ許可
      if (callerRole === MemberRole.owner) {
        throw new ApiError(400, "Owner cannot leave the organization", "FORBIDDEN");
      }
    }

    await prisma.organizationMember.delete({ where: { id: memberId } });
    return NextResponse.json({ data: { message: "Member removed" } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to remove member", code: error?.code },
      { status: error?.statusCode || 500 },
    );
  }
}

