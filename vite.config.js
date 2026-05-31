import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static SPA. `base: "./"` makes the built asset paths relative, so it works on
// GitHub Pages under /<repo>/ (or any subpath) without further config.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
});
