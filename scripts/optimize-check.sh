#!/bin/sh
# 诗路行者 · 优化检查脚本
# 用法: sh scripts/optimize-check.sh
# 每轮迭代后运行，全部通过才算本轮完成

cd "$(dirname "$0")/.." || exit 1
export ESBUILD_BINARY_PATH="$PWD/node_modules/@esbuild/linux-x64/bin/esbuild"

PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "  [PASS] $1"; }
bad() { FAIL=$((FAIL+1)); echo "  [FAIL] $1"; }

echo "== 1. TypeScript 类型检查 =="
if node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json; then ok "tsc"; else bad "tsc"; fi

echo "== 2. 前端构建 =="
rm -f dist/public/assets/* 2>/dev/null
if node node_modules/vite/bin/vite.js build --logLevel error > /tmp/vite-build.log 2>&1; then
  ok "vite build"
  JS=$(ls -S dist/public/assets/*.js 2>/dev/null | head -1)
  if [ -n "$JS" ]; then
    KB=$(du -k "$JS" | cut -f1)
    echo "       主包: ${KB} KB"
  fi
else
  bad "vite build"; tail -5 /tmp/vite-build.log
fi

echo "== 3. 服务端打包 =="
if node_modules/@esbuild/linux-x64/bin/esbuild api/boot.ts --bundle --platform=node \
     --format=esm --packages=external --outfile=dist/boot.js > /dev/null 2>&1; then
  ok "esbuild server"
else
  bad "esbuild server"
fi

echo "== 4. 冒烟测试 =="
PORT=3999
pkill -f "PORT=$PORT" 2>/dev/null
NODE_ENV=production PORT=$PORT node dist/boot.js > /tmp/smoke-opt.log 2>&1 &
SRV=$!
sleep 4
check() {
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: text/html" "http://localhost:$PORT$1")
  if [ "$CODE" = "200" ]; then ok "GET $1"; else bad "GET $1 -> $CODE"; fi
}
check "/"
check "/map"
check "/map-admin"
API=$(curl -s "http://localhost:$PORT/api/trpc/kb.all?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D")
echo "$API" | grep -q '"nodes"' && ok "api kb.all" || bad "api kb.all"
kill $SRV 2>/dev/null

echo ""
echo "== 结果: $PASS 通过, $FAIL 失败 =="
[ "$FAIL" -eq 0 ] && echo "本轮迭代验收通过" || echo "存在未通过项，需先修复"
exit $FAIL
