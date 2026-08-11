import devServer from "@hono/vite-dev-server"
import path from "path"
const __dirname = import.meta.dirname
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }),
    react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    /* 挂载存储删除大目录（tiles 数千瓦片）不稳定，改为构建前脚本清理 assets，不做整目录清空 */
    emptyOutDir: false,
    rollupOptions: {
      output: {
        /* 主包瘦身：框架/动效库拆为独立 vendor chunk（可长期缓存），
           index 入口只留业务代码 */
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router"],
          "motion-vendor": ["framer-motion"],
          "gsap-vendor": ["gsap", "@gsap/react"],
        },
      },
    },
  },
  server: {
    port: 3000,
    allowedHosts: true,
  },
});
