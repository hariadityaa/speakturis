import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// Project pages live at /<repo>/. Override with BASE_PATH for a custom domain ("/").
const base = process.env.BASE_PATH ?? '/turisfasih/';

export default defineConfig({
  base,
  build: { target: 'es2022' },
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt', // we show "Update available" and apply on tap
      injectRegister: false, // registered manually in src/platform/pwa.ts
      manifest: {
        name: 'Speakturis',
        short_name: 'Speakturis',
        description: 'Travel phrases for your trip. Works offline.',
        start_url: `${base}index.html`,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        // Content JSON is bundled into JS chunks by import.meta.glob, so js covers all packs.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,mp3,m4a,ogg}'],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] },
});
