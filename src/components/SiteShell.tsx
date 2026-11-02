"use client";

import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import {
  SiteConfigProvider,
  type SiteConfigValue,
} from "@/components/SiteConfig";

export default function SiteShell({
  children,
  siteConfig,
}: {
  children: React.ReactNode;
  siteConfig: SiteConfigValue;
}) {
  const pathname = usePathname() || "";
  const isPlay = pathname.startsWith("/play/");

  return (
    <SiteConfigProvider value={siteConfig}>
      {isPlay ? (
        <>{children}</>
      ) : (
        <>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </>
      )}
    </SiteConfigProvider>
  );
}
