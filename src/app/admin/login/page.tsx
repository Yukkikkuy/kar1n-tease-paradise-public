"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useSiteConfig } from "@/components/SiteConfig";

function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/admin";
  const { playerSiteUrl } = useSiteConfig();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, adminOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }
      router.push(from.startsWith("/admin") || from.startsWith("/editor") ? from : "/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-amber-900/40 bg-stone-950/80 p-8">
      <h1 className="mb-2 text-2xl font-bold text-amber-100">管理后台登录</h1>
      <p className="mb-6 text-sm text-stone-500">
        仅管理员账号可进入。玩家请打开独立的玩家站。
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-stone-400">管理员 ID</span>
          <input
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-400">密码</span>
          <input
            type="password"
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-amber-700 py-2 font-medium text-amber-50 hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "登录中…" : "进入后台"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-500">
        <a href={playerSiteUrl} className="text-amber-300 hover:underline">
          打开玩家站
        </a>
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<p className="text-stone-500">加载…</p>}>
      <AdminLoginForm />
    </Suspense>
  );
}
