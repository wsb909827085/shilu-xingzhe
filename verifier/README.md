# verifier 索引（append-only）

## v1（2026-08-10 22:25 创建）
- 测量项：
  1. `sh scripts/optimize-check.sh` 7/7（tsc / vite build / esbuild server / 4 冒烟）
  2. 古地图可用性：统计 public/tiles 瓦片数与 z 级覆盖；模拟 z>10 请求不再回源外部（检查 MapView 中古图层 maxNativeZoom 配置）
  3. 数据可靠性：db 内 poets/nodes/poems 计数快照与来源字段非空率
  4. 交付物存在性：新手引导组件、情感曲线图表组件存在且被引用
- 与上版差异：首版

## v2（2026-08-11 创建）
- 测量项：
  1. optimize-check 7/7（沿用 v1）
  2. 地图数据本地化：现代高德瓦片存在性探测(6点)+体积(≥30MB)、古地图 z11/z12 探测(12点)+体积(≥40MB)、GaodeTileLayer 本地优先接入、古地图 z12 长安—洛阳覆盖
     （注：本环境对象存储挂载对单目录 readdir 截断至 ≈3999 条，不能用 ls/find 计数，须用探测+du）
  3. 学习板块：/learn 路由、背诵三模式（全文/掩句/首字提示）+ 默写自测、行迹动态演示
  4. AI 诗作补录：submitPoem 接口、知识库缓存失效联动、「AI补录·待核查」标注、AiChat 补录入口、地图标注深链
- 与 v1 差异：新增学习板块与 AI 补录验收项；瓦片统计加入现代高德层

## v3（2026-08-11 创建）
- 测量项：在 v2 基础上更新瓦片探测为分片布局（tiles/{layer}/z{z}/、z12 按 x 奇偶再分 s0/s1；
  tiles-modern/gaode/z{z}/），新增「本地缺失自动回源自愈（shiluFb）」与「瓦片移出 git」两项；
  古地图体积阈值随低缩放层重下中调整为 ≥30MB
- 与 v2 差异：适配对象存储单目录 ≈3999 文件容量限制的分片重构
