import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ['pdf-parse'],
  experimental: {
    lockDistDir: false,
  },
};

export default nextConfig;
