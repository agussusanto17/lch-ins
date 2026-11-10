import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Menu Placement pindah dari /underwriting ke /placement (Agus, 10 November
  // 2026). Alamat lama dialihkan supaya bookmark dan tautan lama tetap jalan.
  async redirects() {
    return [
      { source: "/underwriting", destination: "/placement", permanent: true },
      {
        source: "/underwriting/:path*",
        destination: "/placement/:path*",
        permanent: true,
      },
    ]
  },
  experimental: {
    serverActions: {
      // Default 1 MB terlalu kecil untuk berkas KYC (batas berkas 4 MB di
      // lib/uploads.ts). Sisanya untuk pembungkus multipart.
      bodySizeLimit: "5mb",
    },
  },
}

export default nextConfig
