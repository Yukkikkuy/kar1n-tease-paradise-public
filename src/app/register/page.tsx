"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "注册失败");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-stone-700 bg-stone-950/70 p-8">
      <h1 className="mb-2 text-2xl font-bold text-amber-100">注册账号</h1>
      <p className="mb-6 text-sm text-stone-500">
        自行设置用户 ID 与密码，无需邮箱验证。
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-stone-400">用户 ID</span>
          <input
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="2–24 位，可用中文"
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
            placeholder="至少 4 位"
            required
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-amber-700 py-2 font-medium text-amber-50 hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "注册中…" : "注册并登录"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-500">
        已有账号？{" "}
        <Link href="/login" className="text-amber-300 hover:underline">
          登录
        </Link>
      </p>
    </div>
  );
}
