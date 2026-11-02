"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UserRow = {
  id: string;
  username: string;
  isAdmin: boolean;
  banned: boolean;
  createdAt: string;
  activationCount: number;
  activations: { game: { title: string } }[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [err, setErr] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [onceShown, setOnceShown] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "加载失败");
      return;
    }
    setUsers(data.users || []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function setBanned(id: string, banned: boolean) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned }),
    });
    refresh();
  }

  async function doReset(id: string) {
    if (resetPwd.length < 6) {
      setErr("新密码至少 6 位");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "重置失败");
        return;
      }
      const u = users.find((x) => x.id === id);
      setOnceShown({
        username: u?.username || "",
        password: data.temporaryPassword || resetPwd,
      });
      setResetId(null);
      setResetPwd("");
    } finally {
      setBusy(false);
    }
  }

  function formatTime(iso: string) {
    try {
      return new Date(iso).toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-sm text-stone-500 hover:text-amber-300">
          ← 后台
        </Link>
        <h1 className="text-2xl font-bold text-amber-100">用户管理</h1>
      </div>
      <p className="mb-4 text-sm text-stone-500">
        密码以加密哈希存储，无法查看明文。可为玩家「重置密码」（新密码仅显示一次）。
      </p>
      {err && <p className="mb-3 text-red-400">{err}</p>}
      {onceShown && (
        <div className="mb-4 rounded-xl border border-amber-700/50 bg-amber-950/40 p-4 text-sm">
          <p className="font-medium text-amber-200">临时密码（仅此一次）</p>
          <p className="mt-1 text-stone-300">
            用户 <span className="font-mono text-amber-100">{onceShown.username}</span>{" "}
            的新密码：{" "}
            <span className="font-mono text-emerald-300">{onceShown.password}</span>
          </p>
          <button
            className="mt-2 text-xs text-stone-400 hover:underline"
            onClick={() => setOnceShown(null)}
          >
            已记下，关闭
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-stone-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-950 text-stone-400">
            <tr>
              <th className="px-3 py-2">用户 ID</th>
              <th className="px-3 py-2">角色</th>
              <th className="px-3 py-2">注册时间</th>
              <th className="px-3 py-2">激活数</th>
              <th className="px-3 py-2">已激活作品</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-stone-800 align-top">
                <td className="px-3 py-2 font-mono">{u.username}</td>
                <td className="px-3 py-2">
                  {u.isAdmin ? "管理员" : "玩家"}
                </td>
                <td className="px-3 py-2 text-stone-400 text-xs whitespace-nowrap">
                  {formatTime(u.createdAt)}
                </td>
                <td className="px-3 py-2">{u.activationCount ?? u.activations.length}</td>
                <td className="px-3 py-2 text-stone-400 max-w-[12rem]">
                  {u.activations.map((a) => a.game.title).join("、") || "—"}
                </td>
                <td className="px-3 py-2">
                  {u.banned ? (
                    <span className="text-rose-400">已封禁</span>
                  ) : (
                    <span className="text-emerald-400">正常</span>
                  )}
                </td>
                <td className="px-3 py-2 space-y-1">
                  {!u.isAdmin && (
                    <>
                      <button
                        onClick={() => setBanned(u.id, !u.banned)}
                        className="block text-xs text-amber-300 hover:underline"
                      >
                        {u.banned ? "解封" : "永久封禁"}
                      </button>
                      {resetId === u.id ? (
                        <div className="mt-1 flex flex-col gap-1">
                          <input
                            type="text"
                            className="rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs"
                            placeholder="新临时密码"
                            value={resetPwd}
                            onChange={(e) => setResetPwd(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              disabled={busy}
                              onClick={() => doReset(u.id)}
                              className="text-xs text-emerald-400 hover:underline"
                            >
                              确认重置
                            </button>
                            <button
                              onClick={() => {
                                setResetId(null);
                                setResetPwd("");
                              }}
                              className="text-xs text-stone-500 hover:underline"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setResetId(u.id);
                            setResetPwd("");
                            setErr("");
                          }}
                          className="block text-xs text-sky-300 hover:underline"
                        >
                          重置密码
                        </button>
                      )}
                    </>
                  )}
                  {u.isAdmin && (
                    <Link
                      href="/admin/password"
                      className="text-xs text-stone-500 hover:underline"
                    >
                      改自己的密码 →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
