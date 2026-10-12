import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    qualities: [75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "menu-img.mcd.cn",
        port: "",
        pathname: "/pcm/prod/menu/**",
      },
    ],
  },
};

export default nextConfig;
