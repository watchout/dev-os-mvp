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

// Organization ID のブランド型（型安全性を高める）
export type OrganizationId = string & { readonly __brand: 'OrganizationId' };

// organization_id を持つテーブルのリスト
type OrgScopedModels = 'workspace' | 'executionLog' | 'apiKey' | 'auditLog' | 'organizationMember';

/**
 * Organization-scoped な読み取りクエリビルダー
 *
 * Read/Write メソッドを提供
 * include オプションをサポートするため、戻り値型は Promise<any> に緩和
 */
export interface OrgScopedReader<T extends OrgScopedModels> {
  /**
   * findMany with automatic organization_id scoping
   * Supports include option for relations
   */
  findMany(args?: {
    where?: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
    take?: number;
    skip?: number;
  }): Promise<any[]>;

  /**
   * findFirst with automatic organization_id scoping
   * Supports include option for relations
   */
  findFirst(args?: {
    where?: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
  }): Promise<any | null>;

  /**
   * findUnique - requires id + organizationId scope
   * Supports include option for relations
   */
  findUnique(args: {
    where: { id: string };
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<any | null>;

  /**
   * count with automatic organization_id scoping
   */
  count(args?: {
    where?: Record<string, unknown>;
  }): Promise<number>;
}

/**
 * Organization-scoped な書き込みクエリビルダー
 */
export interface OrgScopedWriter<T extends OrgScopedModels> {
  /**
   * create with automatic organization_id injection
   * Supports select/include options
   */
  create(args: {
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<any>;

  /**
   * update with organization_id scoping (AND)
   * Supports select/include options
   */
  update(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<any>;

  /**
   * delete with organization_id scoping (AND)
   * Supports select/include options
   */
  delete(args: {
    where: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<any>;
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
  readonly organizationMember: OrgScopedAccessor<'organizationMember'>;
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
    organizationMember: createAccessor('organizationMember'),
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
