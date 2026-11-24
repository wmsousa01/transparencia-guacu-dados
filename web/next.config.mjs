import path from "node:path";

const bootstrapScss = path.join(process.cwd(), "node_modules", "bootstrap", "scss");

/** Exportação estática: a Vercel serve web/out sem servidor. */
const nextConfig = {
  output: "export",
  turbopack: { root: process.cwd() },
  reactStrictMode: true,
  images: { unoptimized: true },
  sassOptions: {
    // Os parciais do Bootstrap se importam entre si por nome curto ("variables-dark").
    loadPaths: [bootstrapScss],
    includePaths: [bootstrapScss],
    // O tema do Dash UI usa a sintaxe @import do Sass; silencia os avisos de depreciação dele.
    silenceDeprecations: ["import", "global-builtin", "color-functions", "legacy-js-api", "if-function"],
    quietDeps: true,
  },
};
export default nextConfig;
