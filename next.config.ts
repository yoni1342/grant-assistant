import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Explicitly declare server-side environment variables
  // Required for Next.js standalone mode to include them at runtime
  env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
    AWS_SES_REGION: process.env.AWS_SES_REGION,
    AWS_SES_FROM_EMAIL: process.env.AWS_SES_FROM_EMAIL,
    AWS_SES_FROM_NAME: process.env.AWS_SES_FROM_NAME,
    AWS_SES_REPLY_TO_EMAIL: process.env.AWS_SES_REPLY_TO_EMAIL,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
