import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow up to 26 MB so the 25 MB document upload limit
      // enforced in `uploadDriveDocumentAction` actually fits inside
      // the action body envelope (headers + multipart boundaries add a
      // small overhead on top of the raw file size).
      bodySizeLimit: "26mb",
    },
  },
  async redirects() {
    return [
      { source: "/quotes", destination: "/bids", permanent: false },
      { source: "/quotes/:path*", destination: "/bids/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
