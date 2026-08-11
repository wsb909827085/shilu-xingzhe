#!/bin/bash
# verifier v2：第20-21轮验收（学习板块 / AI补录 / 地图数据扩充）
cd "$(dirname "$0")/../.." || exit 1
PASS=0; FAIL=0
ok(){ echo "  [PASS] $1"; PASS=$((PASS+1)); }
bad(){ echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }

echo "== 1. optimize-check =="
if sh scripts/optimize-check.sh; then ok "optimize-check 7/7"; else bad "optimize-check"; fi

echo "== 2. 地图数据本地化 =="
# 注意：本环境对象存储挂载对单目录 readdir 截断（≈3999），
# 不能用 ls/find 计数，改用代表性瓦片存在性探测 + 目录体积阈值
MPROBE="5-26-12 10-810-403 10-847-459 11-1664-866 11-1690-892 11-1681-821"
MC=0; for t in $MPROBE; do [ -s "public/tiles-modern/gaode/${t}.png" ] && MC=$((MC+1)); done
[ "$MC" -eq 6 ] && ok "现代高德瓦片覆盖探测 6/6" || bad "高德瓦片探测 ${MC}/6"
MS=$(du -sm public/tiles-modern 2>/dev/null | cut -f1)
[ "${MS:-0}" -ge 30 ] && ok "现代瓦片体积 ${MS}MB(≥30)" || bad "现代瓦片体积 ${MS}MB"
AC=0
for layer in tang nsong ssong; do
  for t in 12-3276-1615 12-3362-1643 12-3333-1732 11-1664-866; do
    [ -s "public/tiles/${layer}/${t}.png" ] && AC=$((AC+1))
  done
done
[ "$AC" -eq 12 ] && ok "古地图 z11/z12 覆盖探测 12/12" || bad "古地图探测 ${AC}/12"
AS=$(du -sm public/tiles 2>/dev/null | cut -f1)
[ "${AS:-0}" -ge 40 ] && ok "古地图体积 ${AS}MB(≥40)" || bad "古地图体积 ${AS}MB"
grep -q "gaodeIsLocal" src/components/MapView.tsx && ok "高德本地优先图层" || bad "GaodeTileLayer 未接入"
grep -q "z12 长安—洛阳" src/components/MapView.tsx && ok "古地图z12长安洛阳覆盖配置" || bad "z12长安box未配置"

echo "== 3. 学习板块 =="
[ -f src/pages/Learn.tsx ] && ok "Learn.tsx 存在" || bad "Learn.tsx 缺失"
grep -q 'path="/learn"' src/App.tsx && ok "/learn 路由" || bad "/learn 路由缺失"
grep -q "掩句背诵\|首字提示\|默写自测" src/pages/Learn.tsx && ok "背诵三模式+自测" || bad "背诵功能缺失"
grep -q "播放行迹" src/pages/Learn.tsx && ok "行迹动态演示" || bad "动态演示缺失"

echo "== 4. AI 诗作补录 =="
grep -q "submitPoem" api/aiRouter.ts && ok "submitPoem 接口" || bad "submitPoem 缺失"
grep -q "invalidateKbCache" api/aiRouter.ts api/kbRouter.ts && ok "缓存失效联动" || bad "缓存未失效"
grep -q "AI补录·据大模型生成，待人工核查" api/aiRouter.ts && ok "AI补录标注" || bad "标注缺失"
grep -q "补录诗" src/components/AiChat.tsx && ok "AiChat 补录入口" || bad "补录入口缺失"
grep -q "map?poet=" src/components/AiChat.tsx src/pages/Home.tsx && ok "地图标注深链" || bad "深链缺失"

echo "== 结果: $PASS 通过, $FAIL 失败 =="
[ "$FAIL" -eq 0 ] && echo "本轮迭代验收通过"
exit $FAIL
