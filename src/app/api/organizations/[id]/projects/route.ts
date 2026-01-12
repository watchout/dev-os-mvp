import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma';
import { ApiError, requireAuth, requireMembership, ensureAdminOrOwner } from '@/lib/auth';
import { createOrgScopedDb } from '@/lib/orgScopedDb';

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

  console.error('[/api/organizations/[id]/projects] unexpected error', error);
  return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuth();
    const { id: organizationId } = await params;

    await requireMembership(user.id, organizationId);

    // SEC-01: organization_id scoped DB access
    const db = createOrgScopedDb(organizationId);

    const projects = await db.workspace.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: projects });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
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

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    const description =
      typeof body?.description === 'string' ? body.description.trim() : null;

    if (!name || !slug) {
      throw new ApiError(400, 'name and slug are required', 'VALIDATION_ERROR');
    }

    const db = createOrgScopedDb(organizationId);

    const project = await db.workspace.create({
      data: {
        organizationId,
        name,
        slug,
        description,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: project });
  } catch (error) {
    return handleError(error);
  }
}

