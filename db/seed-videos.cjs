const mysql = require("mysql2/promise");
require("dotenv").config();
const rows = [
  ["第一集 · 开山", "张九龄", "开元四年（716），张九龄奉诏开凿大庾岭新路。缘磴道、披灌丛，一条贯通长江与珠江水系的南北动脉自此诞生——本集重现这条诗路的起点。", "images/poster-zhang.png", "约 3 分钟", 1],
  ["第二集 · 辞国", "宋之问", "神龙元年（705），宋之问南贬泷州。「度岭方辞国，停轺一望家」——本集聚焦他在梅岭之巅回望故国的那个瞬间，这是过岭诗的第一声叹息。", "images/tier-01.png", "约 3 分钟", 2],
  ["第三集 · 北望", "寇准", "乾兴元年（1022），澶渊定策的一代名相寇准再贬雷州。从汴京到雷阳，逾梅岭而入岭表，次年卒于贬所——本集讲述名臣的天涯末路。", "images/poster-kou.png", "约 3 分钟", 3],
  ["第四集 · 两过", "苏轼", "绍圣元年（1094）南贬，元符三年（1100）北归，苏轼七年间两度往来大庾岭。「问翁大庾岭头住，曾见南迁几个回」——本集呈现诗路上最从容的身影。", "images/tier-02.png", "约 3 分钟", 4],
  ["第五集 · 南安", "文天祥", "祥兴二年（1279），文天祥兵败被俘，囚途北上过梅岭。「出岭同谁出？归乡如此归」——本集是这条诗路上最悲壮的一页。", "images/tier-03.png", "约 3 分钟", 5],
];
(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  const [[{ n }]] = await c.query("SELECT COUNT(*) n FROM videos");
  if (n > 0) { console.log("already seeded:", n); await c.end(); return; }
  for (const r of rows) {
    await c.query("INSERT INTO videos (title,poetName,description,posterUrl,duration,status,sortOrder) VALUES (?,?,?,?,?,'coming_soon',?)", r);
  }
  console.log("seeded 5 videos");
  await c.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
