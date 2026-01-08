import { NextResponse } from 'next/server';
import { PlanType, Prisma } from '@/generated/prisma';
import prisma from '@/lib/prisma';
import { ApiError, requireAuth } from '@/lib/auth';

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'duplicate record', code: 'DUPLICATE' },
        { status: 409 },
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'organization not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
  }

  console.error('[/api/organizations/[id]] unexpected error', error);
  return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
}

async function requireMembership(userId: string, organizationId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId },
  });
  if (!membership) {
    throw new ApiError(403, 'forbidden: not a member of organization', 'FORBIDDEN_ORG');
  }
  return membership;
}

function ensureAdminOrOwner(role: string) {
  if (role !== 'owner' && role !== 'admin') {
    throw new ApiError(403, 'forbidden: admin or owner only', 'FORBIDDEN_ROLE');
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuth();
    const { id: organizationId } = await params;

    const membership = await requireMembership(user.id, organizationId);

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        planId: true,
        billingEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!organization) {
      throw new ApiError(404, 'organization not found', 'NOT_FOUND');
    }

    return NextResponse.json({
      data: {
        ...organization,
        role: membership.role,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuth();
    const { id: organizationId } = await params;

    const membership = await requireMembership(user.id, organizationId);
    ensureAdminOrOwner(membership.role);

    let body: any;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'invalid json body', 'INVALID_JSON');
    }

    const updates: Record<string, any> = {};

    if (typeof body?.name === 'string') {
      const name = body.name.trim();
      if (name) updates.name = name;
    }

    if (typeof body?.billingEmail === 'string') {
      updates.billingEmail = body.billingEmail.trim() || null;
    }

    if (typeof body?.planId === 'string') {
      const planId = body.planId as PlanType;
      if (Object.values(PlanType).includes(planId)) {
        updates.planId = planId;
      } else {
        throw new ApiError(400, 'invalid planId', 'VALIDATION_ERROR');
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'no updatable fields provided', 'VALIDATION_ERROR');
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: updates,
      select: {
        id: true,
        name: true,
        slug: true,
        planId: true,
        billingEmail: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      data: {
        ...updated,
        role: membership.role,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuth();
    const { id: organizationId } = await params;

    const membership = await requireMembership(user.id, organizationId);
    if (membership.role !== 'owner') {
      throw new ApiError(403, 'forbidden: owner only', 'FORBIDDEN_ROLE');
    }

    const deleted = await prisma.organization.delete({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({ data: deleted });
  } catch (error) {
    return handleError(error);
  }
}

