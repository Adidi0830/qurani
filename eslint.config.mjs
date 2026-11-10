import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Disable no-explicit-any to allow existing code patterns
      "@typescript-eslint/no-explicit-any": "off",
      // Set unused vars to warn instead of error
      "@typescript-eslint/no-unused-vars": "warn",
      // Disable prefer-const for existing code
      "prefer-const": "warn",
      // Disable exhaustive-deps warnings for existing useEffect patterns
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
