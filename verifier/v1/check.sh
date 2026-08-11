#!/bin/bash
# verifier v1：古地图/数据/功能存在性快速检查（在仓库根运行）
cd "$(dirname "$0")/../.." || exit 1
fail=0

echo "[1] optimize-check"
sh scripts/optimize-check.sh >/tmp/oc.log 2>&1 && echo "  PASS" || { echo "  FAIL"; tail -20 /tmp/oc.log; fail=1; }

echo "[2] 古地图瓦片"
n=$(find public/tiles -type f 2>/dev/null | wc -l)
echo "  tiles=$n"
[ "$n" -gt 4000 ] && echo "  PASS(>4000)" || { echo "  WARN 瓦片偏少"; }
grep -q "maxNativeZoom" src/components/MapView.tsx && echo "  maxNativeZoom 配置存在 PASS" || { echo "  FAIL 缺 maxNativeZoom"; fail=1; }

echo "[3] 数据快照（需 .env）"
node -e '
const fs=require("fs");
const env=fs.readFileSync(".env","utf8");
const url=(env.match(/DATABASE_URL=(\S+)/)||[])[1];
if(!url){console.log("  SKIP 无 DATABASE_URL");process.exit(0);}
const m=url.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/(\S+)/);
const mysql=require("mysql2/promise");
(async()=>{
 const c=await mysql.createConnection({host:m[3],port:+m[4],user:m[1],password:m[2],database:m[5],connectTimeout:15000});
 const [[p]]=await c.query("select count(*) c, sum(source is null or source=\"\") nosrc from poets");
 const [[n]]=await c.query("select count(*) c from nodes");
 const [[pm]]=await c.query("select count(*) c, sum(source is null or source=\"\") nosrc from poems");
 console.log(`  poets=${p.c}(缺来源${p.nosrc}) nodes=${n.c} poems=${pm.c}(缺来源${pm.nosrc})`);
 await c.end();
})().catch(e=>{console.log("  DB ERR",e.message);process.exit(2);});
' || fail=1

echo "[4] 功能存在性"
grep -rq "GuideTour\|新手\|引导" src/components/ 2>/dev/null && echo "  新手引导 PASS" || echo "  新手引导 MISSING(待做)"
grep -rq "EmotionSection" src/sections/ 2>/dev/null && echo "  情感曲线 PASS" || { echo "  FAIL"; fail=1; }

exit $fail
