import { NextResponse } from 'next/server';
import { runWorkflow } from '@/lib/workflow-engine';
import { requireAuth, ApiError } from '@/lib/auth';
import { checkUsageLimit } from '@/lib/usage-limits';

type RunRequest = {
  workflowId: string;
  mode?: string;
  payload?: Record<string, any>;
  dryRun?: boolean;
  organizationId?: string;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message, code: 'INVALID_REQUEST' }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    // 認証必須
    const auth = await requireAuth();
    const userId = auth.user.id;

    const body = (await request.json()) as RunRequest;
    if (!body?.workflowId) {
      return badRequest('workflowId is required');
    }

    // 組織IDの確認（リクエストに含まれない場合はデフォルト、あるいはエラー）
    const organizationId = body.organizationId;
    if (!organizationId) {
      return badRequest('organizationId is required');
    }

    // 利用制限のチェック
    const usage = await checkUsageLimit(organizationId);
    if (usage.isLimited) {
      return NextResponse.json(
        {
          error: {
            code: "limit_reached",
            message: "月間実行制限（10回）に達しました。さらなる弥栄のために、Proプランへのアップグレードをご検討ください。",
            details: usage
          }
        },
        { status: 403 }
      );
    }

    const mode = body.mode ?? 'fast';
    const payload = body.payload ?? {};

    const result = await runWorkflow(body.workflowId, mode, payload, {
      dryRun: body.dryRun ?? false,
      organizationId: organizationId,
      userId,
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error('POST /api/workflows/run failed', error);
    return NextResponse.json(
      { error: error?.message ?? 'internal_server_error', code: 'RUN_FAILED' },
      { status: 500 },
    );
  }
}



