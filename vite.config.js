import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        cors: true,
        strictPort: true,
        port: 5173,
    },
    build: {
        outDir: 'public/dist',
        emptyOutDir: true,
        manifest: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'), // Vite nutzt das HTML als Einstiegspunkt!
            },
        },
    },
});
