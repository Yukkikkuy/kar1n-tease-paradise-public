"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminHome() {
  const [ok, setOk] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user?.isAdmin) {
          router.replace("/admin/login");
        } else {
          setOk(true);
          setUsername(d.user.username);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <p className="text-stone-500">验证权限…</p>;
  if (!ok) return null;

  const cards = [
    {
      href: "/admin/site",
      title: "站点首页文案",
      desc: "修改玩家站大标题、副标题、说明段与导航品牌名",
    },
    { href: "/admin/keys", title: "秘钥管理", desc: "手动生成、作废秘钥" },
    {
      href: "/admin/activations",
      title: "激活记录",
      desc: "查看所有验证过的用户与秘钥",
    },
    {
      href: "/admin/users",
      title: "用户管理",
      desc: "查看账号、重置玩家密码、永久封禁",
    },
    { href: "/admin/games", title: "作品管理", desc: "发布草稿、创建作品、打开编辑器" },
    {
      href: "/admin/password",
      title: "修改密码",
      desc: "更改当前管理员登录密码（不显示明文）",
    },
  ];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-amber-100">管理后台</h1>
      <p className="mb-6 text-sm text-stone-500">
        当前管理员：<span className="text-stone-300">{username}</span>
        。密码不会在页面上显示。如需修改请打开「修改密码」。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-stone-700 bg-stone-950/60 p-5 hover:border-amber-700"
          >
            <h2 className="font-semibold text-amber-200">{c.title}</h2>
            <p className="mt-1 text-sm text-stone-500">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
