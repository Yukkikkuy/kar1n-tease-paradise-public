"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Game = {
  id: string;
  title: string;
  description: string;
  isFree: boolean;
  published: boolean;
};

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");

  async function refresh() {
    const res = await fetch("/api/games");
    const data = await res.json();
    if (data.error) setErr(data.error);
    setGames(data.games || []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createGame(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "未命名作品" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "创建失败");
      return;
    }
    setTitle("");
    refresh();
    if (data.game?.id) {
      window.location.href = `/editor/${data.game.id}`;
    }
  }

  async function togglePublish(g: Game) {
    await fetch(`/api/games/${g.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !g.published }),
    });
    refresh();
  }

  async function toggleFree(g: Game) {
    await fetch(`/api/games/${g.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFree: !g.isFree }),
    });
    refresh();
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-sm text-stone-500 hover:text-amber-300">
          ← 后台
        </Link>
        <h1 className="text-2xl font-bold text-amber-100">作品管理</h1>
      </div>

      <form onSubmit={createGame} className="mb-6 flex gap-2">
        <input
          className="flex-1 rounded border border-stone-600 bg-stone-900 px-3 py-2"
          placeholder="新作品标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="submit"
          className="rounded bg-amber-700 px-4 py-2 text-sm text-amber-50 hover:bg-amber-600"
        >
          创建并编辑
        </button>
      </form>
      {err && <p className="mb-4 text-red-400">{err}</p>}

      <ul className="space-y-3">
        {games.map((g) => (
          <li
            key={g.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-700 bg-stone-950/50 p-4"
          >
            <div>
              <div className="font-medium text-stone-100">{g.title}</div>
              <div className="text-xs text-stone-500">
                {g.published ? "已发布" : "草稿"} · {g.isFree ? "免费" : "需秘钥"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href={`/editor/${g.id}`}
                className="rounded border border-amber-700/50 px-3 py-1 text-amber-200"
              >
                编辑剧情
              </Link>
              <button
                onClick={() => togglePublish(g)}
                className="rounded border border-stone-600 px-3 py-1"
              >
                {g.published ? "下架" : "发布"}
              </button>
              <button
                onClick={() => toggleFree(g)}
                className="rounded border border-stone-600 px-3 py-1"
              >
                {g.isFree ? "改为付费" : "改为免费"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
