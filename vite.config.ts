import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: './',
  build: mode === 'artifact' ? { outDir: 'dist-artifact', rollupOptions: { output: { inlineDynamicImports: true } } } : undefined,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Carteira PT — Gestor de Despesas',
        short_name: 'Carteira PT',
        description: 'Controla as tuas despesas e poupa com dicas para Portugal.',
        lang: 'pt-PT',
        theme_color: '#0f766e',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  test: { environment: 'node' }
}) as any);
