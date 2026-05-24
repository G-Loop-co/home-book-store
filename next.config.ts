import type { NextConfig } from "next";

const generatedOutputExcludes = [
  "./.data/**/*",
  "./coverage/**/*",
  "./dist/**/*",
  "./docs/**/*",
  "./public/uploads/**/*",
  "./test-results/**/*",
  "./tsconfig.tsbuildinfo"
];

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/*": generatedOutputExcludes,
    "/app/api/uploads/**": [
      ...generatedOutputExcludes,
      "./*.config.*",
      "./LICENSE",
      "./README.md",
      "./README.zh-TW.md",
      "./electron/**/*",
      "./package-lock.json",
      "./src/**/*",
      "./tsconfig.json"
    ]
  }
};

export default nextConfig;
