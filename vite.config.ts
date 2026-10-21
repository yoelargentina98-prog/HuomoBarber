import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Evita transformar un archivo momentáneamente vacío durante su guardado.
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 20 },
    },
  },
});
