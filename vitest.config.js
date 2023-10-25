import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
export default defineConfig({
  plugins: [solidPlugin()],
  build: { target: 'esnext', polyfillDynamicImport: false },
  test: {
    exclude: ['e2e', 'node_modules'],
    environment: 'jsdom',
    globals: true,
    deps: {
      inline: [/solid-js/],
    },
    testTransformMode: { web: ['/.[jt]sx?$/'] },
    transformMode:
      process.env.TEST_ENV === 'server'
        ? {
            ssr: [/.[tj]sx?$/],
          }
        : {
            web: [/.[tj]sx?$/],
          },
    coverage: {
      provider: 'istanbul', // or 'v8'
    },
  },
  resolve: {
    conditions:
      process.env.TEST_ENV === 'server' ? [] : ['development', 'browser'],
  },
});
