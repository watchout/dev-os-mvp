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
  console.error('GET /api/organizations/check-slug unexpected error', error);
  return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.trim() ?? '';

    if (!slug) {
      throw new ApiError(400, 'slug is required', 'VALIDATION_ERROR');
    }

    const exists = await prisma.organization.findFirst({
      where: { slug },
      select: { id: true },
    });

    return NextResponse.json({
      data: { available: !exists },
    });
  } catch (error) {
    return handleError(error);
  }
}



