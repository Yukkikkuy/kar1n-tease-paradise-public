/** @type {import('next').NextConfig} */
const siteRole = (
  process.env.SITE_ROLE ||
  process.env.NEXT_PUBLIC_SITE_ROLE ||
  (process.env.NODE_ENV === "production" ? "all" : "player")
).toLowerCase();

// Local dual-process uses separate dist dirs; production / all uses .next
const distDir =
  siteRole === "admin"
    ? ".next-admin"
    : siteRole === "player"
      ? ".next-player"
      : ".next";

const nextConfig = {
  distDir,
  experimental: {
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/media/:path*",
      },
    ];
  },
};

export default nextConfig;
