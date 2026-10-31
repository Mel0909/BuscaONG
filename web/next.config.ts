import path from 'node:path';
import { type NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    // raiz do monorepo; evita o Next adivinhar a raiz por lockfiles fora do repo
    root: path.join(__dirname, '..'),
    rules: {
      '*.svg': {
        as: '*.js',
        loaders: ['@svgr/webpack'],
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

export default nextConfig;
