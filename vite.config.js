import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  base: "/gpt_webapp_test/",
  publicDir: false,
  build: { target: "es2022" },
  server: {
    host: "0.0.0.0",
    fs: {
      strict: true,
      allow: [fileURLToPath(new URL(".", import.meta.url))],
      deny: [
        "**/*.xlsx",
        "**/*.json.backup",
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
      ],
    },
  },
});
