import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security/headers";

const securityHeaders = Object.entries(SECURITY_HEADERS).map(
  ([key, value]) => ({ key, value })
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
        ],
      },
    ];
  },
};

export default nextConfig;
