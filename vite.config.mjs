import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: here('./index.html'),
        card: here('./20_10.html')
      }
    }
  }
});
