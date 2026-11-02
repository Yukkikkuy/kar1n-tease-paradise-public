"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Game = {
  id: string;
  title: string;
  description: string;
  isFree: boolean;
  published: boolean;
  unlocked: boolean;
};

type SiteSettings = {
  heroTitle: string;
  heroSubtitle: string;
  heroBody: string;
  navBrand: string;
};

const FALLBACK_SETTINGS: SiteSettings = {
  heroTitle: "Kar1n Tease Paradise",
  heroSubtitle: "Kar1n 调教乐园 · 分支剧情文字冒险",
  heroBody: "注册账号后可游玩免费作品；付费作品需使用专属秘钥激活解锁。",
  navBrand: "Kar1n Tease Paradise",
};

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [user, setUser] = useState<{ username: string; isAdmin: boolean } | null>(
    null
  );
  const [settings, setSettings] = useState<SiteSettings>(FALLBACK_SETTINGS);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((d) => {
        setGames(d.games || []);
        setUser(d.user);
      })
      .catch(() => setErr("加载失败"));

    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  return (
    <div>
      <section className="mb-10 rounded-2xl border border-amber-900/40 bg-stone-950/60 p-8">
        <h1 className="mb-1 text-3xl font-bold text-amber-100">
          {settings.heroTitle}
        </h1>
        <p className="mb-2 text-sm tracking-wide text-amber-200/70">
          {settings.heroSubtitle}
        </p>
        <p className="max-w-2xl text-stone-400">{settings.heroBody}</p>
      </section>

      {err && <p className="text-red-400">{err}</p>}

      <h2 className="mb-4 text-xl font-semibold text-amber-200">作品列表</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {games.map((g) => (
          <article
            key={g.id}
            className="rounded-xl border border-stone-700 bg-stone-950/50 p-5"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-stone-100">{g.title}</h3>
              {g.isFree ? (
                <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-300">
                  免费
                </span>
              ) : g.unlocked ? (
                <span className="rounded bg-amber-900/60 px-2 py-0.5 text-xs text-amber-300">
                  已解锁
                </span>
              ) : (
                <span className="rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-400">
                  需秘钥
                </span>
              )}
              {!g.published && (
                <span className="rounded bg-rose-900/50 px-2 py-0.5 text-xs text-rose-300">
                  草稿
                </span>
              )}
            </div>
            <p className="mb-4 line-clamp-3 text-sm text-stone-400">
              {g.description || "暂无简介"}
            </p>
            <div className="flex gap-2">
              {g.unlocked ? (
                <Link
                  href={`/play/${g.id}`}
                  className="rounded bg-amber-700 px-3 py-1.5 text-sm text-amber-50 hover:bg-amber-600"
                >
                  开始游玩
                </Link>
              ) : (
                <Link
                  href="/activate"
                  className="rounded border border-amber-700/60 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-900/30"
                >
                  去激活秘钥
                </Link>
              )}
              {user?.isAdmin && (
                <Link
                  href={`/editor/${g.id}`}
                  className="rounded border border-stone-600 px-3 py-1.5 text-sm hover:border-amber-600"
                >
                  编辑
                </Link>
              )}
            </div>
          </article>
        ))}
        {games.length === 0 && (
          <p className="text-stone-500">暂无作品。管理员可在后台创建。</p>
        )}
      </div>
    </div>
  );
}
