import Link from "next/link";
import { headers } from "next/headers";
import { getAdminSiteUrl, getPlayerSiteUrl, getSiteRole } from "@/lib/site-role";

export default function WrongSitePage() {
  const role = getSiteRole(headers().get("host"));
  const playerUrl = getPlayerSiteUrl();
  const adminUrl = getAdminSiteUrl();

  if (role === "player") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-700 bg-stone-950/80 p-8 text-center">
        <h1 className="mb-3 text-2xl font-bold text-amber-100">此为玩家站</h1>
        <p className="mb-6 text-sm text-stone-400">
          管理后台不在本进程。本地请打开本机管理端；公网单实例请使用{" "}
          <code className="text-amber-200/90">/admin</code>（需管理员账号）。
        </p>
        <p className="mb-4 break-all font-mono text-sm text-amber-200/80">
          本地管理端：{adminUrl}
        </p>
        <Link href="/" className="text-amber-300 hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-900/40 bg-stone-950/80 p-8 text-center">
      <h1 className="mb-3 text-2xl font-bold text-amber-100">此为管理端</h1>
      <p className="mb-6 text-sm text-stone-400">
        玩家请使用玩家站浏览与游玩；本站仅供管理员登录与编辑。
      </p>
      <p className="mb-4 break-all font-mono text-sm text-amber-200/80">
        玩家站：{playerUrl}
      </p>
      <div className="flex justify-center gap-4 text-sm">
        <Link href="/admin" className="text-amber-300 hover:underline">
          进入后台
        </Link>
        <a href={playerUrl} className="text-stone-400 hover:underline">
          打开玩家站
        </a>
      </div>
    </div>
  );
}
