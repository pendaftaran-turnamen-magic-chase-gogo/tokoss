import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

// Fix untuk __dirname di environment ES Module (Vite)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  // Hapus define process.env untuk keamanan. 
  // Frontend tidak butuh API Key, karena frontend memanggil /api/gemini (Backend)
});