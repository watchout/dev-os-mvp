/**
 * SEC-01: Organization-scoped Database Access Layer
 *
 * すべての DB アクセスを organization_id スコープで強制するラッパー。
 * - organization_id は必須引数（省略不可・fallback禁止）
 * - Prisma 直叩きを禁止し、このラッパー経由でのみアクセス
 * - 型で強制し、未指定はコンパイルエラー
 *
 * Usage:
 *   const db = createOrgScopedDb(organizationId);
 *   const workspaces = await db.workspace.findMany();
 *   // ↑ 自動的に { where: { organizationId } } が適用される
 */

import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';

// Organization ID のブランド型（型安全性を高める）
export type OrganizationId = string & { readonly __brand: 'OrganizationId' };

// organization_id を持つテーブルのリスト
type OrgScopedModels = 'workspace' | 'executionLog' | 'apiKey' | 'auditLog';

/**
 * Organization-scoped な読み取りクエリビルダー
 *
 * Read 系メソッドのみを提供（Phase 1: Read only）
 * Write 系は SEC-02 で追加予定
 */
export interface OrgScopedReader<T extends OrgScopedModels> {
  /**
   * findMany with automatic organization_id scoping
   */
  findMany<Args extends Omit<Parameters<typeof prisma[T]['findMany']>[0], 'where'> & {
    where?: Omit<NonNullable<Parameters<typeof prisma[T]['findMany']>[0]>['where'], 'organizationId'>;
  }>(
    args?: Args
  ): ReturnType<typeof prisma[T]['findMany']>;

  /**
   * findFirst with automatic organization_id scoping
   */
  findFirst<Args extends Omit<Parameters<typeof prisma[T]['findFirst']>[0], 'where'> & {
    where?: Omit<NonNullable<Parameters<typeof prisma[T]['findFirst']>[0]>['where'], 'organizationId'>;
  }>(
    args?: Args
  ): ReturnType<typeof prisma[T]['findFirst']>;

  /**
   * findUnique - requires id + organizationId scope
   */
  findUnique<Args extends Omit<Parameters<typeof prisma[T]['findUnique']>[0], 'where'>>(
    args: Args & { where: { id: string } }
  ): ReturnType<typeof prisma[T]['findUnique']>;

  /**
   * count with automatic organization_id scoping
   */
  count<Args extends Omit<Parameters<typeof prisma[T]['count']>[0], 'where'> & {
    where?: Omit<NonNullable<Parameters<typeof prisma[T]['count']>[0]>['where'], 'organizationId'>;
  }>(
    args?: Args
  ): ReturnType<typeof prisma[T]['count']>;
}

/**
 * Organization-scoped な書き込みクエリビルダー
 */
export interface OrgScopedWriter<T extends OrgScopedModels> {
  /**
   * create with automatic organization_id injection
   */
  create<Args extends Omit<Parameters<typeof prisma[T]['create']>[0], 'data'> & {
    data: Omit<NonNullable<Parameters<typeof prisma[T]['create']>[0]>['data'], 'organizationId'> & {
      organizationId?: string;
    };
  }>(
    args: Args
  ): ReturnType<typeof prisma[T]['create']>;

  /**
   * update with organization_id scoping (AND)
   */
  update<Args extends Omit<Parameters<typeof prisma[T]['update']>[0], 'where' | 'data'> & {
    where: Omit<NonNullable<Parameters<typeof prisma[T]['update']>[0]>['where'], 'organizationId'>;
    data: Omit<NonNullable<Parameters<typeof prisma[T]['update']>[0]>['data'], 'organizationId'>;
  }>(
    args: Args
  ): ReturnType<typeof prisma[T]['update']>;

  /**
   * delete with organization_id scoping (AND)
   */
  delete<Args extends Omit<Parameters<typeof prisma[T]['delete']>[0], 'where'> & {
    where: Omit<NonNullable<Parameters<typeof prisma[T]['delete']>[0]>['where'], 'organizationId'>;
  }>(
    args: Args
  ): ReturnType<typeof prisma[T]['delete']>;
}

/**
 * Organization-scoped Accessor (Read + Write)
 */
export interface OrgScopedAccessor<T extends OrgScopedModels>
  extends OrgScopedReader<T>, OrgScopedWriter<T> {}

/**
 * Organization-scoped Database Client
 *
 * organization_id が必須で、すべてのクエリに自動適用される
 */
export interface OrgScopedDb {
  readonly organizationId: OrganizationId;

  // Accessors (Read + Write)
  readonly workspace: OrgScopedAccessor<'workspace'>;
  readonly executionLog: OrgScopedAccessor<'executionLog'>;
  readonly apiKey: OrgScopedAccessor<'apiKey'>;
  readonly auditLog: OrgScopedAccessor<'auditLog'>;
}

/**
 * organization_id スコープ付きの Prisma ラッパーを生成
 *
 * @param organizationId - 必須。省略・undefined・空文字は禁止
 * @throws Error - organizationId が空の場合
 */
export function createOrgScopedDb(organizationId: string): OrgScopedDb {
  // Runtime validation: organization_id は必須
  if (!organizationId || typeof organizationId !== 'string' || organizationId.trim() === '') {
    throw new Error(
      '[SEC-01] organization_id is required for all database access. ' +
      'This is a security boundary violation. Halt triggered: tenant-isolation-risk'
    );
  }

  const orgId = organizationId as OrganizationId;

  // Generic reader factory
  function createReader<T extends OrgScopedModels>(modelName: T): OrgScopedReader<T> {
    const model = prisma[modelName] as any;

    return {
      findMany(args?: any) {
        const where = { ...args?.where, organizationId: orgId };
        return model.findMany({ ...args, where });
      },

      findFirst(args?: any) {
        const where = { ...args?.where, organizationId: orgId };
        return model.findFirst({ ...args, where });
      },

      findUnique(args: any) {
        // findUnique は id + organizationId の複合条件
        // 他テナントのデータにアクセスさせない
        const where = { ...args.where, organizationId: orgId };
        return model.findFirst({ ...args, where });
      },

      count(args?: any) {
        const where = { ...args?.where, organizationId: orgId };
        return model.count({ ...args, where });
      },
    };
  }

  // Generic writer factory
  function createWriter<T extends OrgScopedModels>(modelName: T): OrgScopedWriter<T> {
    const model = prisma[modelName] as any;

    return {
      create(args: any) {
        const incomingOrgId = args?.data?.organizationId;
        if (incomingOrgId && incomingOrgId !== orgId) {
          throw new Error(
            '[SEC-02] organization_id mismatch on create. Halt: tenant-isolation-risk',
          );
        }
        const data = { ...args.data, organizationId: orgId };
        return model.create({ ...args, data });
      },

      update(args: any) {
        const where = args?.where
          ? { AND: [args.where, { organizationId: orgId }] }
          : { organizationId: orgId };
        const data = { ...args.data };
        return model.update({ ...args, where, data });
      },

      delete(args: any) {
        const where = args?.where
          ? { AND: [args.where, { organizationId: orgId }] }
          : { organizationId: orgId };
        return model.delete({ ...args, where });
      },
    };
  }

  function createAccessor<T extends OrgScopedModels>(modelName: T): OrgScopedAccessor<T> {
    return {
      ...createReader(modelName),
      ...createWriter(modelName),
    };
  }

  return {
    organizationId: orgId,
    workspace: createAccessor('workspace'),
    executionLog: createAccessor('executionLog'),
    apiKey: createAccessor('apiKey'),
    auditLog: createAccessor('auditLog'),
  };
}

/**
 * 型チェック用: organization_id なしの呼び出しを検出するためのダミー関数
 *
 * 使用例（コンパイルエラーになることを確認）:
 *   assertOrgScopedAccess(); // Error: Expected 1 arguments, but got 0
 */
export function assertOrgScopedAccess(_db: OrgScopedDb): void {
  // This function exists only for type checking
  // If you can call this without an OrgScopedDb, something is wrong
}
