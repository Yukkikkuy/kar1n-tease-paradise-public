"use client";

import { useState } from "react";
import Link from "next/link";

export default function ActivatePage() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setGameId(null);
    setLoading(true);
    try {
      const res = await fetch("/api/keys/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "激活失败");
        return;
      }
      setMsg(data.message + (data.game ? `：${data.game.title}` : ""));
      if (data.game?.id) setGameId(data.game.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-stone-700 bg-stone-950/70 p-8">
      <h1 className="mb-2 text-2xl font-bold text-amber-100">激活秘钥</h1>
      <p className="mb-6 text-sm text-stone-500">
        输入管理员发给你的专属秘钥。一次性秘钥用完即失效；永久秘钥绑定本账号。
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-stone-400">秘钥</span>
          <input
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-3 py-2 font-mono tracking-wider uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            required
          />
        </label>
        {err && <p className="text-sm text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-amber-700 py-2 font-medium text-amber-50 hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "验证中…" : "激活"}
        </button>
      </form>
      {gameId && (
        <Link
          href={`/play/${gameId}`}
          className="mt-4 block text-center text-amber-300 hover:underline"
        >
          前往游玩 →
        </Link>
      )}
      <p className="mt-6 text-xs text-stone-600">
        演示秘钥（付费作品）：DEMO-ONCE-0001-TEST（一次性）/
        DEMO-PERM-0001-TEST（永久）
      </p>
    </div>
  );
}
