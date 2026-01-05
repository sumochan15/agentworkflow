import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // For file uploads
    },
  },
  // Force Node.js runtime (not Edge) for FFmpeg compatibility
  // Vercel will use Node.js runtime by default for API routes

  // Enable Turbopack explicitly (Next.js 15 default)
  turbopack: {},
};

export default config;
