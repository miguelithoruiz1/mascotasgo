import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio environment
      hmr: false,
      watch: null,
      // Permitir los nombres MagicDNS del tailnet del dueño (*.ts.net),
      // p. ej. tatis.tailfc9963.ts.net, para poder servir la app en
      // desarrollo detrás de Tailscale Serve sin abrir a cualquier host.
      allowedHosts: ['.ts.net'],
    },
  };
});
