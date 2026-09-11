import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "standalone-dist/**",
    "functions/node_modules/**",
    "next-env.d.ts",
  ]),
  {
    files: ["functions/**/*.js"],
    rules: {
      // Firebase Functions is a separate CommonJS package (see its package.json).
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
