import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/auth';

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error('POST /api/auth/logout unexpected error', error);
  return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json(
        { error: error.message, code: 'SIGN_OUT_FAILED' },
        { status: 400 },
      );
    }
    return NextResponse.json({ data: 'ok' });
  } catch (error) {
    return handleError(error);
  }
}



