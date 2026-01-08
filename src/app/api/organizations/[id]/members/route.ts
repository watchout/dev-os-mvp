import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireMembership, ensureAdminOrOwner, ApiError } from "@/lib/auth";
import { MemberRole } from "@/generated/prisma";

type InviteRequest = {
  email?: string;
  role?: MemberRole | string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuth();
    const { id: organizationId } = await params;
    await requireMembership(user.id, organizationId);

    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: { invitedAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    const data = members.map((m) => ({
      id: m.id,
      organizationId: m.organizationId,
      userId: m.userId,
      role: m.role,
      invitedAt: m.invitedAt,
      joinedAt: m.joinedAt,
      user: m.user,
    }));

    return NextResponse.json({ data, currentUserId: user.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch members", code: error?.code },
      { status: error?.statusCode || 500 },
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth();
    const { id: organizationId } = await params;
    const membership = await requireMembership(user.id, organizationId);
    ensureAdminOrOwner(membership.role);

    const body = (await request.json()) as InviteRequest;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const roleInput = typeof body.role === "string" ? body.role : "";

    if (!email) {
      throw new ApiError(400, "Email is required", "INVALID_INPUT");
    }

    const allowedRoles: MemberRole[] = [MemberRole.admin, MemberRole.member, MemberRole.viewer];
    const role = roleInput.toLowerCase() as MemberRole;
    if (!allowedRoles.includes(role)) {
      throw new ApiError(400, "Role must be admin, member, or viewer", "INVALID_ROLE");
    }

    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) {
      throw new ApiError(400, "User not found. They must register first.", "USER_NOT_FOUND");
    }

    const existing = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: invitee.id,
        },
      },
    });
    if (existing) {
      throw new ApiError(409, "User is already a member of this organization", "ALREADY_MEMBER");
    }

    const member = await prisma.organizationMember.create({
      data: {
        organizationId,
        userId: invitee.id,
        role,
        invitedAt: new Date(),
        joinedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(
      {
        data: {
          id: member.id,
          organizationId: member.organizationId,
          userId: member.userId,
          role: member.role,
          invitedAt: member.invitedAt,
          joinedAt: member.joinedAt,
          user: member.user,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to invite member", code: error?.code },
      { status: error?.statusCode || 500 },
    );
  }
}

