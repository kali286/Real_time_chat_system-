import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    build: {
        sourcemap: command === 'serve' ? 'inline' : true,
        manifest: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor': [
                        'react',
                        'react-dom',
                        '@inertiajs/react',
                        'axios',
                    ],
                },
            },
        },
    },
    optimizeDeps: {
        include: ['@inertiajs/react', 'axios'],
    },
    server: {
        hmr: {
            overlay: false
        },
        watch: {
            usePolling: true,
        },
    },
    resolve: {
        alias: {
            '@': '/resources/js'
        }
    },
}));
