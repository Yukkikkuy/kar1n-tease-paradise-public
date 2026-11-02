"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  createdAt: string;
  user: { username: string; banned: boolean };
  game: { title: string };
  key: { code: string; mode: string };
};

export default function ActivationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/admin/activations")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setErr(d.error);
        else setRows(d.activations || []);
      });
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-sm text-stone-500 hover:text-amber-300">
          ← 后台
        </Link>
        <h1 className="text-2xl font-bold text-amber-100">激活记录</h1>
      </div>
      {err && <p className="text-red-400">{err}</p>}
      <div className="overflow-x-auto rounded-xl border border-stone-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-950 text-stone-400">
            <tr>
              <th className="px-3 py-2">时间</th>
              <th className="px-3 py-2">用户</th>
              <th className="px-3 py-2">作品</th>
              <th className="px-3 py-2">秘钥</th>
              <th className="px-3 py-2">类型</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-stone-800">
                <td className="px-3 py-2 text-stone-400">
                  {new Date(r.createdAt).toLocaleString("zh-CN", {
                    timeZone: "Asia/Shanghai",
                  })}
                </td>
                <td className="px-3 py-2">
                  {r.user.username}
                  {r.user.banned && (
                    <span className="ml-1 text-xs text-rose-400">(已封)</span>
                  )}
                </td>
                <td className="px-3 py-2">{r.game.title}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.key.code}</td>
                <td className="px-3 py-2">
                  {r.key.mode === "permanent" ? "永久" : "一次性"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-stone-500">
                  暂无激活记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
