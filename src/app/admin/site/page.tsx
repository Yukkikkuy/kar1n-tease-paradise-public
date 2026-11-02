"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Settings = {
  heroTitle: string;
  heroSubtitle: string;
  heroBody: string;
  navBrand: string;
};

const EMPTY: Settings = {
  heroTitle: "",
  heroSubtitle: "",
  heroBody: "",
  navBrand: "",
};

export default function AdminSitePage() {
  const router = useRouter();
  const [form, setForm] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user?.isAdmin) {
          router.replace("/admin/login");
          return;
        }
        return fetch("/api/admin/site-settings")
          .then((r) => r.json())
          .then((data) => {
            if (data.error) {
              setErr(data.error);
              return;
            }
            if (data.settings) setForm(data.settings);
          });
      })
      .catch(() => setErr("加载失败"))
      .finally(() => setLoading(false));
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "保存失败");
        return;
      }
      if (data.settings) setForm(data.settings);
      setMsg("已保存。玩家站刷新后即可看到新文案。");
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof Settings>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <p className="text-stone-500">加载中…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-sm text-stone-500 hover:text-amber-300">
          ← 后台
        </Link>
        <h1 className="text-2xl font-bold text-amber-100">站点首页文案</h1>
      </div>
      <p className="mb-4 text-sm text-stone-500">
        修改玩家站首页顶部大标题、副标题与说明段。导航品牌名可单独设置；留空则保存时与大标题相同。
      </p>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-stone-700 bg-stone-950/60 p-6"
      >
        <label className="block text-sm">
          <span className="text-stone-400">大标题</span>
          <input
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-3 py-2"
            value={form.heroTitle}
            onChange={(e) => setField("heroTitle", e.target.value)}
            required
            maxLength={120}
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-400">副标题</span>
          <input
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-3 py-2"
            value={form.heroSubtitle}
            onChange={(e) => setField("heroSubtitle", e.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-400">说明段</span>
          <textarea
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-3 py-2"
            rows={4}
            value={form.heroBody}
            onChange={(e) => setField("heroBody", e.target.value)}
            required
            maxLength={1000}
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-400">导航品牌短名（可选）</span>
          <input
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-3 py-2"
            value={form.navBrand}
            onChange={(e) => setField("navBrand", e.target.value)}
            placeholder="留空则与大标题相同"
            maxLength={80}
          />
        </label>

        <div className="rounded-lg border border-amber-900/40 bg-stone-900/80 p-4">
          <p className="mb-2 text-xs text-stone-500">预览</p>
          <h2 className="mb-1 text-2xl font-bold text-amber-100">
            {form.heroTitle || "（大标题）"}
          </h2>
          <p className="mb-2 text-sm tracking-wide text-amber-200/70">
            {form.heroSubtitle || "（副标题）"}
          </p>
          <p className="text-stone-400">{form.heroBody || "（说明段）"}</p>
          <p className="mt-3 text-xs text-stone-600">
            导航显示：{form.navBrand || form.heroTitle || "（品牌名）"}
          </p>
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded bg-amber-700 py-2 font-medium text-amber-50 hover:bg-amber-600 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </form>
    </div>
  );
}
