import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/overview", permanent: false },
      { source: "/dashboard/submissions", destination: "/submissions", permanent: false },
      { source: "/dashboard/submissions/:id", destination: "/submissions/:id", permanent: false },
      { source: "/dashboard/templates", destination: "/templates", permanent: false },
      { source: "/dashboard/templates/:id", destination: "/templates/:id", permanent: false },
      { source: "/dashboard/templates/:id/edit", destination: "/templates/:id/edit", permanent: false },
      { source: "/dashboard/mappings", destination: "/mappings", permanent: false },
      { source: "/dashboard/webhooks", destination: "/webhooks", permanent: false },
      { source: "/dashboard/audit", destination: "/audit", permanent: false },
      { source: "/dashboard/users", destination: "/users", permanent: false },
      { source: "/dashboard/settings", destination: "/settings", permanent: false },
      { source: "/dashboard/styleguide", destination: "/styleguide", permanent: false },
    ];
  },
};

export default nextConfig;
