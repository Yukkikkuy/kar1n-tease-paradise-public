"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Game = { id: string; title: string };
type Key = {
  id: string;
  code: string;
  mode: string;
  note: string;
  revoked: boolean;
  used: boolean;
  createdAt: string;
  game: Game;
  activations: { user: { username: string } }[];
};

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState("");
  const [mode, setMode] = useState<"onetime" | "permanent">("onetime");
  const [note, setNote] = useState("");
  const [count, setCount] = useState(1);
  const [created, setCreated] = useState<string[]>([]);
  const [err, setErr] = useState("");

  async function refresh() {
    const [k, g] = await Promise.all([
      fetch("/api/admin/keys").then((r) => r.json()),
      fetch("/api/games").then((r) => r.json()),
    ]);
    if (k.error) {
      setErr(k.error);
      return;
    }
    setKeys(k.keys || []);
    const list = (g.games || []).map((x: Game) => ({ id: x.id, title: x.title }));
    setGames(list);
    if (!gameId && list[0]) setGameId(list[0].id);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setCreated([]);
    setErr("");
    const res = await fetch("/api/admin/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, mode, note, count }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "生成失败");
      return;
    }
    setCreated(data.codes || []);
    refresh();
  }

  async function revoke(id: string, revoked: boolean) {
    await fetch(`/api/admin/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoked }),
    });
    refresh();
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-sm text-stone-500 hover:text-amber-300">
          ← 后台
        </Link>
        <h1 className="text-2xl font-bold text-amber-100">秘钥管理</h1>
      </div>

      <form
        onSubmit={generate}
        className="mb-8 rounded-xl border border-stone-700 bg-stone-950/60 p-5 space-y-3"
      >
        <h2 className="font-semibold text-stone-200">手动生成秘钥</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-stone-500">作品</span>
            <select
              className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-2"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-stone-500">类型</span>
            <select
              className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-2"
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "onetime" | "permanent")
              }
            >
              <option value="onetime">一次性（用完失效）</option>
              <option value="permanent">永久激活（绑定账号）</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-stone-500">备注（买家备注等）</span>
            <input
              className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="text-stone-500">数量（1–50）</span>
            <input
              type="number"
              min={1}
              max={50}
              className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-2"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          type="submit"
          className="rounded bg-amber-700 px-4 py-2 text-sm text-amber-50 hover:bg-amber-600"
        >
          生成
        </button>
        {created.length > 0 && (
          <div className="rounded border border-emerald-900/50 bg-emerald-950/30 p-3">
            <p className="mb-2 text-sm text-emerald-300">已生成（请复制发给买家）：</p>
            <ul className="font-mono text-sm text-emerald-100 space-y-1">
              {created.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-stone-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-950 text-stone-400">
            <tr>
              <th className="px-3 py-2">秘钥</th>
              <th className="px-3 py-2">类型</th>
              <th className="px-3 py-2">作品</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">激活者</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-stone-800">
                <td className="px-3 py-2 font-mono text-xs">{k.code}</td>
                <td className="px-3 py-2">
                  {k.mode === "permanent" ? "永久" : "一次性"}
                </td>
                <td className="px-3 py-2">{k.game.title}</td>
                <td className="px-3 py-2">
                  {k.revoked ? (
                    <span className="text-rose-400">已作废</span>
                  ) : k.used ? (
                    <span className="text-amber-400">已使用</span>
                  ) : (
                    <span className="text-emerald-400">未使用</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {k.activations.map((a) => a.user.username).join(", ") || "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => revoke(k.id, !k.revoked)}
                    className="text-xs text-amber-300 hover:underline"
                  >
                    {k.revoked ? "恢复" : "作废"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
