/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Lets a production build live in its own folder (NEXT_DIST_DIR=.next-prod)
  // so `npm run dev` can never clobber a running production server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
