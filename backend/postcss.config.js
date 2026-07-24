// Vitest resolves its Vite pipeline by searching for a PostCSS config
// starting at this directory and climbing up through parent directories
// (cosmiconfig's default behavior) until one is found. Without a config
// here, that search reaches the repo root's postcss.config.js (used only by
// the frontend's Tailwind build) and crashes `npm test` in a fresh clone
// where the root node_modules isn't installed. This backend has no CSS to
// process, so an empty config here stops the upward search safely.
export default {
  plugins: {},
}
