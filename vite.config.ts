import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base: './' -- rutas relativas en el build, para que el mismo `dist/`
// funcione dentro de Electron (Windows) y Capacitor (Android), no solo
// servido desde la raíz de un dominio.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    port: 5175, // 5173 es SudoCam y 5174 TaskCam: así los tres pueden correr a la vez
    strictPort: true, // si está ocupado, falla en vez de irse a otro puerto
  },
  build: {
    // Phaser solo ya pesa más de 1 MB; no es un problema para un juego
    // que se carga una vez desde el disco.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
