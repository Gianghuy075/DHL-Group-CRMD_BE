// Vercel serverless entry. Kept as plain JS on purpose: it only re-exports the
// tsc-compiled Nest handler from dist/ (produced by `npm run build`). tsc keeps
// the decorator metadata that Vercel's esbuild would strip — stripping it would
// break Nest dependency injection and TypeORM. Never import ../src here.
module.exports = require('../dist/serverless').default;
