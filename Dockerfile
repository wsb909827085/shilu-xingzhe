# ---- 构建阶段 ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# 前端构建 + 服务端打包（与本地构建命令一致）
RUN node node_modules/vite/bin/vite.js build \
 && node node_modules/@esbuild/linux-x64/bin/esbuild api/boot.ts \
      --bundle --platform=node --format=esm --packages=external \
      --outfile=dist/boot.js

# ---- 运行阶段 ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 构建产物与运行时必需文件
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/db ./db
COPY --from=build /app/contracts ./contracts

EXPOSE 3000
CMD ["node", "dist/boot.js"]
