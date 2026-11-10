import path from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    server: {
        cors: true,
        strictPort: true,
        port: 5173,
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        manifest: true,
        rollupOptions: {
            input: {
                main: path.resolve(import.meta.dirname, 'index.html'), // Vite nutzt das HTML als Einstiegspunkt!
            },
        },
    },
    plugins: [
        VitePWA({
            registerType: 'prompt', // Wir übernehmen die Kontrolle über das Update (Button)
            manifest: {
                name: 'Kuno Beller Entwicklungstabelle',
                short_name: 'Kuno Beller',
                description: 'Digitale, datenschutzkonforme Kuno Beller Entwicklungstabelle by Felix Maywald',
                theme_color: '#ffffff',
                background_color: '#f9f9fa',
                display: 'standalone', // Sorgt dafür, dass die URL-Leiste in der App verschwindet!
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ]
});
