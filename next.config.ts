// next.config.ts
import { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable PWA in development
});

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disabled to prevent double API calls in development

  // Skip ESLint during production builds to allow deployment
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript errors during production builds
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
        port: "",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "bjmvgwhydnluoalhatqq.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "api.myqurani.com",
      },
      {
        protocol: "https",
        hostname: "supabase-qurani.ubig.web.id",
      },
    ],
    domains: [
      "lh3.googleusercontent.com",
      "api.myqurani.com",
      "supabase-qurani.ubig.web.id"
    ],
  },

  trailingSlash: false,
};

export default withPWA(nextConfig);
