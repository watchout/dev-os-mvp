import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma';
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
  }

  console.error('[/api/organizations] unexpected error', error);
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
            billingEmail: true,
          },
        },
      },
    });

    const data = memberships.map((member) => ({
      id: member.organization.id,
      name: member.organization.name,
      slug: member.organization.slug,
      planId: member.organization.planId,
      billingEmail: member.organization.billingEmail,
      role: member.role,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();
    let body: any;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'invalid json body', 'INVALID_JSON');
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    const billingEmail =
      typeof body?.billingEmail === 'string' ? body.billingEmail.trim() : null;

    if (!name || !slug) {
      throw new ApiError(400, 'name and slug are required', 'VALIDATION_ERROR');
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        billingEmail,
        members: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
    });

    return NextResponse.json({
      data: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        planId: organization.planId,
        billingEmail: organization.billingEmail,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}



