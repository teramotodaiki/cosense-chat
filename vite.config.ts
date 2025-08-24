import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // sourcemap not required
    sourcemap: false,
    lib: {
      entry: 'src/index.ts',
      name: 'CosenseAgent',
      formats: ['iife'],
      fileName: () => 'script.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
})
