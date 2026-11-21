import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

const generatedFiles = ["src/routeTree.gen.ts", "dist/**", ".wrangler/**", ".tanstack/**"];

export default defineConfig({
  fmt: {
    ignorePatterns: [...generatedFiles, "bun.lock"],
    sortImports: true,
    sortPackageJson: true,
    // Tailwind のクラスの並べ替え。`cn` などの関数の引数も対象にする。
    sortTailwindcss: {
      stylesheet: "./src/styles.css",
      functions: ["cn", "clsx", "cva"],
    },
  },
  lint: {
    ignorePatterns: generatedFiles,
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      {
        name: "better-tailwindcss",
        specifier: "eslint-plugin-better-tailwindcss",
      },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      // Tailwind CSS IntelliSense の `suggestCanonicalClasses` と同じ提案を警告として出す。
      "better-tailwindcss/enforce-canonical-classes": "warn",
    },
    settings: {
      "better-tailwindcss": { entryPoint: "src/styles.css" },
    },
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        // bun:test の型では `await expect(...).rejects` が待てない値に見えるが、実行時には必要。
        files: ["tests/**"],
        rules: { "typescript/await-thenable": "off" },
      },
    ],
  },
  resolve: { tsconfigPaths: true },
  server: { host: true },
  preview: { host: true },
  plugins: lazyPlugins(() => [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ]),
});
