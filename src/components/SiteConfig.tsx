"use client";

import { createContext, useContext } from "react";
import type { SiteRole } from "@/lib/site-role";

export type SiteConfigValue = {
  siteRole: SiteRole;
  playerSiteUrl: string;
  adminSiteUrl: string;
};

const SiteConfigContext = createContext<SiteConfigValue>({
  siteRole: "player",
  playerSiteUrl: "http://www.kar1nteaseparadise.com",
  adminSiteUrl: "http://127.0.0.1:3001",
});

export function SiteConfigProvider({
  value,
  children,
}: {
  value: SiteConfigValue;
  children: React.ReactNode;
}) {
  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
