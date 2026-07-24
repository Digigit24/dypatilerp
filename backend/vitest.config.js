import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Backend is a pure Node API with no CSS. Providing an explicit inline
  // PostCSS config stops Vitest's Vite pipeline from searching PARENT
  // directories for one — otherwise the search reaches the root frontend's
  // Tailwind PostCSS config and fails in a fresh clone where the root
  // devDependencies (@tailwindcss/postcss) are not installed.
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.{test,spec}.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/modules/**', 'src/middleware/**', 'src/utils/**'],
    },
  },
});
