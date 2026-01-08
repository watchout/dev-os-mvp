import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiError, requireAuth } from '@/lib/auth';

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error('GET /api/organizations/[id]/projects/check-slug unexpected error', error);
  return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
}

async function requireMembership(userId: string, organizationId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId },
    select: { id: true },
  });
  if (!membership) {
    throw new ApiError(403, 'forbidden: not a member of organization', 'FORBIDDEN_ORG');
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuth();
    const { id: organizationId } = await params;

    await requireMembership(user.id, organizationId);

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.trim() ?? '';

    if (!slug) {
      throw new ApiError(400, 'slug is required', 'VALIDATION_ERROR');
    }

    const exists = await prisma.workspace.findFirst({
      where: { organizationId, slug },
      select: { id: true },
    });

    return NextResponse.json({
      data: { available: !exists },
    });
  } catch (error) {
    return handleError(error);
  }
}

