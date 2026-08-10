import { getDb } from "../api/queries/connection";
import { nodes, poets, poems } from "./schema";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  const existing = await db.select().from(poets).limit(1);
  if (existing.length > 0) {
    console.log("Data already exists, skip seeding.");
    process.exit(0);
  }

  /* ---------- 节点 ---------- */
  await db.insert(nodes).values([
    { slug: "daidu", name: "大都（今北京）", lon: 116.4, lat: 39.9, sortOrder: 1 },
    { slug: "changan", name: "长安（今西安）", lon: 108.94, lat: 34.34, sortOrder: 2 },
    { slug: "luoyang", name: "洛阳", lon: 112.45, lat: 34.62, sortOrder: 3 },
    { slug: "kaifeng", name: "开封（汴京）", lon: 114.35, lat: 34.79, sortOrder: 4 },
    { slug: "jinling", name: "金陵（今南京）", lon: 118.8, lat: 32.06, sortOrder: 5 },
    { slug: "yangzhou", name: "扬州", lon: 119.42, lat: 32.39, sortOrder: 6 },
    { slug: "jiujiang", name: "江州（今九江）", lon: 116.0, lat: 29.71, sortOrder: 7 },
    { slug: "nanchang", name: "洪州（今南昌）", lon: 115.86, lat: 28.68, sortOrder: 8 },
    { slug: "jian", name: "吉州（今吉安）", lon: 114.99, lat: 27.11, sortOrder: 9 },
    { slug: "ganzhou", name: "赣州", lon: 114.94, lat: 25.83, sortOrder: 10 },
    {
      slug: "meiguan",
      name: "大庾岭 · 梅关",
      lon: 114.34,
      lat: 25.37,
      highlight: true,
      note: "全线咽喉。唐开元四年（716）张九龄奉诏开凿新路，现存梅关关楼和古驿道约 8 公里，全国重点文物保护单位。岭北属江西大余，岭南属广东南雄。",
      sortOrder: 11,
    },
    { slug: "nanxiong", name: "南雄", lon: 114.31, lat: 25.12, sortOrder: 12 },
    { slug: "shaozhou", name: "韶州（今韶关）", lon: 113.59, lat: 24.81, sortOrder: 13 },
    { slug: "guangzhou", name: "广州", lon: 113.26, lat: 23.13, sortOrder: 14 },
    { slug: "luoding", name: "泷州（今罗定）", lon: 111.57, lat: 22.77, sortOrder: 15 },
    { slug: "huizhou", name: "惠州", lon: 114.42, lat: 23.11, sortOrder: 16 },
    { slug: "leizhou", name: "雷州", lon: 110.1, lat: 20.91, sortOrder: 17 },
    { slug: "danzhou", name: "儋州（今海南儋州）", lon: 109.58, lat: 19.52, sortOrder: 18 },
    { slug: "chaoyang", name: "潮阳（今汕头潮阳）", lon: 116.6, lat: 23.26, sortOrder: 19 },
  ]);

  /* ---------- 诗人 ---------- */
  const poetRows = await db
    .insert(poets)
    .values([
      {
        slug: "zhangjiuling",
        name: "张九龄",
        dynasty: "唐",
        years: "678—740",
        era: "开元四年（716）· 奉诏开凿梅岭新路",
        color: "#d4a24e",
        summary:
          "韶州曲江人，开元名相。开元四年（716）奉诏开凿大庾岭新路，「缘磴道，披灌丛，相其山谷之宜，革其坂险之故」，自此南北商旅「转输以之不绝」。岭路既通，长江与珠江水系之间有了最繁忙的陆路通道。他也是这条诗路的第一位书写者——古道与诗路，自他而始。",
        route: JSON.stringify(["changan", "luoyang", "yangzhou", "jiujiang", "nanchang", "jian", "ganzhou", "meiguan", "shaozhou"]),
        startYear: 716,
        image: "images/poster-zhang.png",
        sortOrder: 1,
      },
      {
        slug: "songzhiwen",
        name: "宋之问",
        dynasty: "唐",
        years: "约 656—712",
        era: "神龙元年（705）· 贬泷州参军",
        color: "#c25b41",
        summary:
          "神龙元年（705）因谄附张易之贬泷州（今广东罗定）参军。南行过大庾岭，写下千古传诵的《度大庾岭》；次年逃归洛阳，再过梅岭，又有《题大庾岭北驿》《渡汉江》。两度过岭，一去一逃，写尽初唐贬臣的惊魂与乡愁——「停轺一望家」成为后世所有过岭者的共同姿态。",
        route: JSON.stringify(["luoyang", "yangzhou", "jiujiang", "nanchang", "jian", "ganzhou", "meiguan", "nanxiong", "shaozhou", "guangzhou", "luoding"]),
        startYear: 705,
        image: "images/tier-01.png",
        sortOrder: 2,
      },
      {
        slug: "kouzhun",
        name: "寇准",
        dynasty: "北宋",
        years: "961—1023",
        era: "乾兴元年（1022）· 再贬雷州司户参军",
        color: "#7a8c5c",
        summary:
          "澶渊之盟的定策名臣，晚年屡遭丁谓倾轧。乾兴元年（1022）自汴京再贬雷州司户参军，沿汴河—长江—赣江一路南下，逾梅关而入岭表。次年（1023）卒于雷州贬所，年六十三，一代名相长眠天涯。其南贬诗作多已散佚，行迹据《宋史》本传与年谱勾勒。",
        route: JSON.stringify(["kaifeng", "yangzhou", "jiujiang", "nanchang", "jian", "ganzhou", "meiguan", "shaozhou", "guangzhou", "leizhou"]),
        startYear: 1022,
        image: "images/poster-kou.png",
        sortOrder: 3,
      },
      {
        slug: "sushi",
        name: "苏轼",
        dynasty: "北宋",
        years: "1037—1101",
        era: "绍圣元年（1094）贬惠州 · 元符三年（1100）北归",
        color: "#4f7fa0",
        summary:
          "绍圣元年（1094）贬宁远军节度副使、惠州安置，十月过岭，作《过大庾岭》，气象清旷；后再贬儋州。元符三年（1100）遇赦北归，重过梅关，作《过岭二首》《赠岭上老人》。「问翁大庾岭头住，曾见南迁几个回」——七年间两度往来，一南一北，他是梅关诗路上最从容的身影。",
        route: JSON.stringify(["kaifeng", "jinling", "jiujiang", "nanchang", "jian", "ganzhou", "meiguan", "nanxiong", "shaozhou", "guangzhou", "huizhou"]),
        startYear: 1094,
        image: "images/tier-02.png",
        sortOrder: 4,
      },
      {
        slug: "suzhe",
        name: "苏辙",
        dynasty: "北宋",
        years: "1039—1112",
        era: "绍圣四年（1097）· 责授化州别驾、雷州安置",
        color: "#8a6fa8",
        summary:
          "绍圣四年（1097）再贬，责授化州别驾、雷州安置，循兄长此路逾梅岭南下，与谪居儋州的苏轼隔海相望。元符三年（1100）同遇赦北归，再过梅关。兄弟二人的过岭诗作，构成贬谪文学史上罕见的「双人行迹」，其过岭诸作见于《栾城后集》，行迹据年谱勾勒。",
        route: JSON.stringify(["kaifeng", "jiujiang", "nanchang", "jian", "ganzhou", "meiguan", "shaozhou", "guangzhou", "leizhou"]),
        startYear: 1097,
        sortOrder: 5,
      },
      {
        slug: "wentianxiang",
        name: "文天祥",
        dynasty: "南宋",
        years: "1236—1283",
        era: "祥兴二年（1279）· 兵败被俘，囚途经南安军",
        color: "#9e3b3b",
        summary:
          "祥兴二年（1279）于潮阳五坡岭被俘，押解北上大都，途经南安军（今江西大余）梅岭。这一次不是贬谪而是囚途，方向也与历代贬臣相反——由南而北，辞乡愈远。出岭后绝食八日不死，至元十九年（1282）就义于大都。《南安军》一首，是这条诗路上最悲壮的一页。",
        route: JSON.stringify(["chaoyang", "guangzhou", "shaozhou", "nanxiong", "meiguan", "ganzhou", "jian", "nanchang", "jiujiang", "jinling", "daidu"]),
        startYear: 1279,
        image: "images/tier-03.png",
        sortOrder: 6,
      },
    ])
    .$returningId();

  const poetIdBySlug: Record<string, number> = {};
  const slugs = ["zhangjiuling", "songzhiwen", "kouzhun", "sushi", "suzhe", "wentianxiang"];
  poetRows.forEach((row, i) => {
    poetIdBySlug[slugs[i]] = row.id;
  });

  /* ---------- 诗作 ---------- */
  await db.insert(poems).values([
    {
      poetId: poetIdBySlug.zhangjiuling,
      nodeSlug: "meiguan",
      title: "《开凿大庾岭路序》（节录）",
      source: "《唐丞相曲江张先生文集》",
      lines: "缘磴道，披灌丛，相其山谷之宜，革其坂险之故。",
      note: "开元四年（716）督修梅岭新路后所作，记开岭之始末，全文收入《唐丞相曲江张先生文集》。",
      year: 716,
      sortOrder: 1,
    },
    {
      poetId: poetIdBySlug.zhangjiuling,
      nodeSlug: "nanxiong",
      title: "《自始兴溪夜上赴岭》（节录）",
      lines: "尝蓄名山意，兹为世网牵。征途屡及此，初服已非然。",
      note: "始兴溪在大庾岭下，张九龄家乡所在。「征途屡及此」——岭路是他一生来去的乡关。",
      sortOrder: 2,
    },
    {
      poetId: poetIdBySlug.songzhiwen,
      nodeSlug: "meiguan",
      title: "《度大庾岭》",
      source: "《全唐诗》卷五十二",
      lines: "度岭方辞国，停轺一望家。魂随南翥鸟，泪尽北枝花。山雨初含霁，江云欲变霞。但令归有日，不敢恨长沙。",
      note: "神龙元年（705）南贬泷州途经大庾岭作。「停轺一望家」成为过岭诗的标志性瞬间。",
      year: 705,
      sortOrder: 1,
    },
    {
      poetId: poetIdBySlug.songzhiwen,
      nodeSlug: "meiguan",
      title: "《题大庾岭北驿》",
      source: "《全唐诗》卷五十二",
      lines: "阳月南飞雁，传闻至此回。我行殊未已，何日复归来。江静潮初落，林昏瘴不开。明朝望乡处，应见陇头梅。",
      note: "706 年逃归北还再过梅岭，作于岭北驿站。传说雁至大庾岭即回，人却要继续南行。",
      year: 706,
      sortOrder: 2,
    },
    {
      poetId: poetIdBySlug.songzhiwen,
      nodeSlug: "meiguan",
      title: "《早发大庾岭》（节录）",
      lines: "晨跻大庾险，驿鞍驰复息。雾露昼未开，浩途不可测。",
      note: "清晨攀岭的实录：雾锁古道，前程茫茫，恰是贬臣心境。",
      year: 705,
      sortOrder: 3,
    },
    {
      poetId: poetIdBySlug.songzhiwen,
      title: "《渡汉江》",
      source: "《全唐诗》卷五十三",
      lines: "岭外音书断，经冬复历春。近乡情更怯，不敢问来人。",
      note: "706 年逃归途中渡汉江作。岭外经年，音书不通，近乡反怯——千古传诵的归人心态。",
      year: 706,
      sortOrder: 4,
    },
    {
      poetId: poetIdBySlug.kouzhun,
      title: "南贬纪事",
      lines: "自汴京而扬州、而江州、而赣水，逾梅岭以达雷阳。",
      note: "寇准南贬诗作多散佚，行迹据《宋史》本传及《忠愍公年谱》勾勒。",
      year: 1022,
      sortOrder: 1,
    },
    {
      poetId: poetIdBySlug.kouzhun,
      nodeSlug: "leizhou",
      title: "雷州遗事",
      source: "《宋史·寇准传》",
      lines: "乾兴二年（1023）闰四月，卒于雷州贬所，年六十三。归葬洛阳，道公安，县人设祭哭于路，折竹植地，挂纸钱，逾月视之，枯竹尽生笋。",
      note: "事见《宋史·寇准传》。「寇竹」传说流传至今，足见过岭者的身后哀荣。",
      year: 1023,
      sortOrder: 2,
    },
    {
      poetId: poetIdBySlug.sushi,
      nodeSlug: "meiguan",
      title: "《过大庾岭》（节录）",
      lines: "一念失垢污，身心洞清净。浩然天地间，惟我独也正。今日岭上行，身世永相忘。仙人拊我顶，结发受长生。",
      note: "绍圣元年（1094）南贬惠州途经大庾岭作，全无迁客戚戚之态。",
      year: 1094,
      sortOrder: 1,
    },
    {
      poetId: poetIdBySlug.sushi,
      nodeSlug: "meiguan",
      title: "《过岭二首》其一",
      lines: "暂著南冠不到头，却随北雁与归休。平生不作兔三窟，今古何殊貉一丘。",
      note: "元符三年（1100）北归再过梅关作。南冠楚囚、北雁归休，七年的谪居到头了。",
      year: 1100,
      sortOrder: 2,
    },
    {
      poetId: poetIdBySlug.sushi,
      nodeSlug: "meiguan",
      title: "《过岭二首》其二（节录）",
      lines: "七年来往我何堪，又试曹溪一勺甘。梦里似曾迁海外，醉中不觉到江南。",
      note: "1100 年北归作。曹溪在岭下南华寺，一勺甘泉，洗尽七年瘴海之尘。",
      year: 1100,
      sortOrder: 3,
    },
    {
      poetId: poetIdBySlug.sushi,
      nodeSlug: "meiguan",
      title: "《赠岭上老人》",
      lines: "鹤骨霜髯心已灰，青松合抱手亲栽。问翁大庾岭头住，曾见南迁几个回？",
      note: "北归过岭赠岭上老人。「曾见南迁几个回」——本系列 AI 短视频「南迁几个回」即由此得名。",
      year: 1100,
      sortOrder: 4,
    },
    {
      poetId: poetIdBySlug.suzhe,
      title: "南贬纪事",
      lines: "绍圣丁丑，辙自筠州再徙雷州，道出大庾。",
      note: "绍圣四年（1097）责授化州别驾、雷州安置。其过岭诸作见于《栾城后集》，行迹据《苏颍滨年表》勾勒。",
      year: 1097,
      sortOrder: 1,
    },
    {
      poetId: poetIdBySlug.suzhe,
      nodeSlug: "leizhou",
      title: "雷州居停纪事",
      lines: "与兄子瞻隔海相望，月一会于徐闻。居雷二年，日与樵叟渔父杂处。",
      note: "在雷期间与儋州苏轼隔海唱和，元符三年（1100）同赦北归，再过梅关。",
      sortOrder: 2,
    },
    {
      poetId: poetIdBySlug.wentianxiang,
      nodeSlug: "chaoyang",
      title: "《过零丁洋》（节录）",
      lines: "辛苦遭逢起一经，干戈寥落四周星。山河破碎风飘絮，身世浮沉雨打萍。……人生自古谁无死？留取丹心照汗青。",
      note: "祥兴二年（1279）正月囚船过零丁洋，拒张弘范劝降时出示此诗明志。",
      year: 1279,
      sortOrder: 1,
    },
    {
      poetId: poetIdBySlug.wentianxiang,
      nodeSlug: "meiguan",
      title: "《南安军》",
      source: "《文山先生文集》",
      lines: "梅花南北路，风雨湿征衣。出岭同谁出？归乡如此归！山河千古在，城郭一时非。饿死真吾志，梦中行采薇。",
      note: "1279 年囚途过梅岭作。出岭之后曾绝食八日明志，不死，乃复食。",
      year: 1279,
      sortOrder: 2,
    },
    {
      poetId: poetIdBySlug.wentianxiang,
      nodeSlug: "daidu",
      title: "《正气歌》（节录）",
      source: "《文山先生文集》",
      lines: "天地有正气，杂然赋流形。下则为河岳，上则为日星。于人曰浩然，沛乎塞苍冥。……时穷节乃见，一一垂丹青。",
      note: "至元十八年（1281）大都狱中作。1282 年就义，衣带中有赞曰：「孔曰成仁，孟曰取义。」",
      year: 1281,
      sortOrder: 3,
    },
  ]);

  console.log("Done. Seeded 19 nodes, 6 poets, 18 poems.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
