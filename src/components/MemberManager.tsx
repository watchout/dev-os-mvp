"use client";

import { useEffect, useMemo, useState } from "react";
import { MemberRole } from "@/generated/prisma";

type MemberInfo = {
  id: string;
  organizationId: string;
  userId: string;
  role: MemberRole;
  invitedAt: string;
  joinedAt: string | null;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
};

type Props = {
  organizationId: string;
  currentUserRole: MemberRole | string;
};

function roleLabel(role: MemberRole) {
  switch (role) {
    case MemberRole.owner:
      return "Owner";
    case MemberRole.admin:
      return "Admin";
    case MemberRole.member:
      return "Member";
    default:
      return "Viewer";
  }
}

function roleBadgeClass(role: MemberRole) {
  switch (role) {
    case MemberRole.owner:
      return "bg-purple-100 text-purple-700";
    case MemberRole.admin:
      return "bg-blue-100 text-blue-700";
    case MemberRole.member:
      return "bg-green-100 text-green-700";
    default:
      return "bg-zinc-200 text-zinc-700";
  }
}

const editableRoles: MemberRole[] = [MemberRole.admin, MemberRole.member, MemberRole.viewer];

export function MemberManager({ organizationId, currentUserRole }: Props) {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>(MemberRole.member);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const canManage = useMemo(
    () => currentUserRole === MemberRole.owner || currentUserRole === MemberRole.admin,
    [currentUserRole],
  );

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/members`, {
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "メンバー取得に失敗しました");
      }
      const data = await res.json();
      setMembers(data?.data ?? []);
      setCurrentUserId(data?.currentUserId ?? null);
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const handleInvite = async () => {
    setInviteError(null);
    if (!inviteEmail.trim()) {
      setInviteError("メールアドレスを入力してください");
      return;
    }
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/members`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "招待に失敗しました");
      }
      await fetchMembers();
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole(MemberRole.member);
    } catch (err: any) {
      setInviteError(err.message || "招待に失敗しました");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, nextRole: MemberRole) => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "ロール変更に失敗しました");
      }
      await fetchMembers();
    } catch (err: any) {
      alert(err.message || "ロール変更に失敗しました");
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("本当に削除しますか？")) return;
    try {
      const res = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "削除に失敗しました");
      }
      await fetchMembers();
    } catch (err: any) {
      alert(err.message || "削除に失敗しました");
    }
  };

  const canEditMember = (m: MemberInfo) => {
    if (!canManage) return false;
    if (m.role === MemberRole.owner) return false;
    if (m.userId === currentUserId) return false;
    return true;
  };

  const canRemoveMember = (m: MemberInfo) => {
    // owner は削除不可
    if (m.role === MemberRole.owner) return false;
    // 自分は退会可（owner以外 - 上で除外済み）
    if (m.userId === currentUserId) {
      return true;
    }
    if (!canManage) return false;
    // admin は他の admin を削除不可
    if (currentUserRole === MemberRole.admin && m.role === MemberRole.admin) {
      return false;
    }
    return true;
  };

  if (loading) {
    return <p className="text-sm text-zinc-600">読み込み中...</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">エラー: {error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600">メンバー一覧とロール管理</p>
        {canManage && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            メンバーを招待
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">名前</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">メール</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">ロール</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">参加日</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {members.map((m) => {
              const isSelf = m.userId === currentUserId;
              return (
                <tr key={m.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs text-zinc-700">
                        {m.user.name.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span>{m.user.name}</span>
                          {isSelf && <span className="text-xs text-zinc-500">(あなた)</span>}
                        </div>
                        <p className="text-xs text-zinc-500">{m.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{m.user.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${roleBadgeClass(m.role)}`}>
                      {roleLabel(m.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-600">
                    <div className="flex items-center justify-end gap-2">
                      {canEditMember(m) && (
                        <select
                          className="rounded border px-2 py-1 text-xs text-zinc-700"
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as MemberRole)}
                        >
                          {editableRoles.map((r) => (
                            <option key={r} value={r} disabled={r === MemberRole.owner}>
                              {roleLabel(r)}
                            </option>
                          ))}
                        </select>
                      )}
                      {canRemoveMember(m) && (
                        <button
                          type="button"
                          onClick={() => handleRemove(m.id)}
                          className="rounded border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          {isSelf ? "退会" : "削除"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {inviteOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
          <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">メンバーを招待</h3>
              <button
                type="button"
                onClick={() => {
                  setInviteOpen(false);
                  setInviteError(null);
                }}
                className="text-sm text-zinc-500 hover:text-zinc-700"
              >
                閉じる
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700">メールアドレス</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">ロール</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={MemberRole.admin}>Admin</option>
                  <option value={MemberRole.member}>Member</option>
                  <option value={MemberRole.viewer}>Viewer</option>
                </select>
              </div>
              {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInviteOpen(false);
                    setInviteError(null);
                  }}
                  className="text-sm text-zinc-600 hover:text-zinc-800"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={inviteLoading}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {inviteLoading ? "招待中..." : "招待する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

