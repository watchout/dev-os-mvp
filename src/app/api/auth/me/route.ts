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

  console.error('GET /api/auth/me unexpected error', error);
  return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
}

export async function GET() {
  try {
    const { user } = await requireAuth();

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            planId: true,
          },
        },
      },
    });

    const data = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      memberships: memberships.map((member) => ({
        organizationId: member.organizationId,
        role: member.role,
        organization: member.organization,
      })),
    };

    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}



