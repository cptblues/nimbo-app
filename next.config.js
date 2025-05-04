/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Configuration pour Next.js 15 */

  // Désactiver temporairement le linting à la construction (optionnel, si besoin de déployer rapidement)
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },

  // Partial Prerendering (nouvelle fonctionnalité de Next.js 15)
  experimental: {
    // Décommenter pour activer le Partial Prerendering (améliore les performances)
    // ppr: true,

    // Optimisation des images WebP
    webpackBuildWorker: true,
  },

  // Configuration des images
  images: {
    formats: ['image/avif', 'image/webp'],
    // Ajouter les domaines autorisés pour les images externes
    // domains: ['exemple.com'],
  },

  // Redirections et rewrite (à ajuster selon tes besoins)
  async redirects() {
    return [];
  },

  // Headers personnalisés (par exemple pour la sécurité)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
