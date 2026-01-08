import type { User as SupabaseUser } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type AuthContext = {
  supabaseUser: SupabaseUser;
  user: Awaited<ReturnType<typeof prisma.user.upsert>>;
};

function normalizeName(user: SupabaseUser): string {
  const meta = user.user_metadata || {};
  return (
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    user.email ||
    'User'
  );
}

function normalizeAvatar(user: SupabaseUser): string | null {
  const meta = user.user_metadata || {};
  if (typeof meta.avatar_url === 'string' && meta.avatar_url.length > 0) {
    return meta.avatar_url;
  }
  return null;
}

export async function getCurrentUser(): Promise<AuthContext | null> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return null;
  }

  const supaUser = data.user;
  const email = supaUser.email ?? '';
  const name = normalizeName(supaUser);
  const avatarUrl = normalizeAvatar(supaUser);
  const authProviderId = supaUser.id;

  const user = await prisma.user.upsert({
    where: { authProviderId },
    update: {
      email,
      name,
      avatarUrl,
    },
    create: {
      id: supaUser.id, // SSOT: auth.users.id と 1:1
      authProviderId,
      email,
      name,
      avatarUrl,
    },
  });

  return { supabaseUser: supaUser, user };
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getCurrentUser();
  if (!auth) {
    throw new ApiError(401, 'authentication required', 'UNAUTHORIZED');
  }
  return auth;
}

/**
 * ユーザーが組織のメンバーであることを確認
 */
export async function requireMembership(userId: string, organizationId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId },
  });
  if (!membership) {
    throw new ApiError(403, 'forbidden: not a member of organization', 'FORBIDDEN_ORG');
  }
  return membership;
}

/**
 * ロールが admin または owner であることを確認
 */
export function ensureAdminOrOwner(role: string) {
  if (role !== 'owner' && role !== 'admin') {
    throw new ApiError(403, 'forbidden: admin or owner only', 'FORBIDDEN_ROLE');
  }
}
