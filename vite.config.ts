
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Načte env proměnné (např. GEMINI_API_KEY z .env.local)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    // Base './' zajistí, že cesty k souborům budou relativní (funguje lépe na FTP)
    base: './',
    define: {
      // Zpřístupní klíč v aplikaci pod process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
