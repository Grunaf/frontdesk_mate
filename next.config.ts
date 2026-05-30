import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb', // Снимаем ограничение в 1МБ
    },
  },
};

export default nextConfig;
