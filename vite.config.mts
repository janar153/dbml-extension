/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

// Copy the codicon font + stylesheet into the webview dist root after each bundle.
// They must live under dist/webview because that is the panel's only localResourceRoot
// (see panel.ts), and emptyOutDir wipes the dir every build — so copy on closeBundle,
// which fires in both `vite build` and `vite build --watch`.
function copyCodicons(): Plugin {
  const src = resolve(import.meta.dirname, 'node_modules/@vscode/codicons/dist');
  const out = resolve(import.meta.dirname, 'dist/webview');
  return {
    name: 'copy-codicons',
    closeBundle() {
      copyFileSync(resolve(src, 'codicon.css'), resolve(out, 'codicon.css'));
      copyFileSync(resolve(src, 'codicon.ttf'), resolve(out, 'codicon.ttf'));
    },
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname, 'src/webview'),
  plugins: [tailwindcss(), copyCodicons()],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  oxc: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  build: {
    outDir: resolve(import.meta.dirname, 'dist/webview'),
    emptyOutDir: true,
    rolldownOptions: {
      input: resolve(import.meta.dirname, 'src/webview/main.tsx'),
      output: {
        entryFileNames: 'webview.js',
        assetFileNames: 'webview[extname]',
        format: 'iife',
        codeSplitting: false,
      },
    },
    sourcemap: false,
    target: 'es2022',
    minify: false,
  },
  test: {
    // Tests live across src/{webview,extension,shared}; webview-only root would skip extension specs.
    dir: resolve(import.meta.dirname, 'src'),
    include: ['**/*.test.ts'],
    setupFiles: [resolve(import.meta.dirname, 'src/extension/testing/parseSetup.ts')],
  },
});
