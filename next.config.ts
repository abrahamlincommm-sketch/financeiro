import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow standalone output for Docker/Netlify
  output: 'standalone',
  // Disable trailing slash to keep URLs consistent
  trailingSlash: false,
}

export default nextConfig
