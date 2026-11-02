"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "修改失败");
        return;
      }
      setMsg("密码已更新，请牢记新密码。");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-sm text-stone-500 hover:text-amber-300">
          ← 后台
        </Link>
        <h1 className="text-2xl font-bold text-amber-100">修改管理员密码</h1>
      </div>
      <p className="mb-4 text-sm text-stone-500">
        系统不会显示或存储明文密码。修改后请妥善保管新密码。
      </p>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-stone-700 bg-stone-950/60 p-6"
      >
        <label className="block text-sm">
          <span className="text-stone-400">当前密码</span>
          <input
            type="password"
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-3 py-2"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-400">新密码（至少 6 位）</span>
          <input
            type="password"
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-3 py-2"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-400">确认新密码</span>
          <input
            type="password"
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-3 py-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </label>
        {err && <p className="text-sm text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-amber-700 py-2 font-medium text-amber-50 hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "提交中…" : "更新密码"}
        </button>
      </form>
    </div>
  );
}
