import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Supabase Auth Webhook
 * auth.users への INSERT を検知して users テーブルと同期する
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // TODO: Webhook 署名の検証 (SUPABASE_WEBHOOK_SECRET が設定されている場合)
    // 現時点では簡易的な実装とする
    
    const { id, email, raw_user_meta_data } = payload.record || payload;

    if (!id || !email) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // ユーザーの作成または更新
    await prisma.user.upsert({
      where: { id },
      update: {
        email,
        name: raw_user_meta_data?.full_name || raw_user_meta_data?.name || email.split("@")[0],
        avatarUrl: raw_user_meta_data?.avatar_url || null,
      },
      create: {
        id,
        authProviderId: id,
        email,
        name: raw_user_meta_data?.full_name || raw_user_meta_data?.name || email.split("@")[0],
        avatarUrl: raw_user_meta_data?.avatar_url || null,
      },
    });

    console.log(`[AuthWebhook] Synced user: ${id} (${email})`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[AuthWebhook] Failed to sync user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

