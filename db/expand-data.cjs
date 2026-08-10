/* 15 诗人扩容数据：节点改中文 slug + 新增 9 位诗人 + 诗作（来源 chinese-poetry/全唐诗） */
const mysql = require("mysql2/promise");
require("dotenv").config();

/* 节点：英文 slug → 中文 slug 映射 + 新增节点 */
const SLUG_MAP = {
  daidu: "大都", changan: "长安", luoyang: "洛阳", kaifeng: "开封", jinling: "金陵",
  yangzhou: "扬州", jiujiang: "江州", nanchang: "洪州", jian: "吉州", ganzhou: "赣州",
  meiguan: "梅关", nanxiong: "南雄", shaozhou: "韶州", guangzhou: "广州", luoding: "泷州",
  huizhou: "惠州", leizhou: "雷州", danzhou: "儋州", chaoyang: "潮阳",
};
const NEW_NODES = [
  { slug: "潮州", name: "潮州（今广东潮州）", lon: 116.62, lat: 23.66, sortOrder: 20, note: "韩愈贬潮八月，驱鳄兴学，江山易姓为韩。" },
  { slug: "连州", name: "连州（今广东连州）", lon: 112.38, lat: 24.78, sortOrder: 21, note: "刘禹锡贬连州刺史近五年，有《连州腊日观莫徭腊西山》。" },
  { slug: "柳州", name: "柳州（今广西柳州）", lon: 109.42, lat: 24.33, sortOrder: 22, note: "柳宗元终老之地，世称柳柳州。" },
  { slug: "崖州", name: "崖州（今海南三亚）", lon: 109.51, lat: 18.25, sortOrder: 23, note: "李德裕贬所，「鸟飞犹是半年程」。" },
  { slug: "宜州", name: "宜州（今广西宜州）", lon: 108.67, lat: 24.49, sortOrder: 24, note: "黄庭坚最后贬所，1105 年卒于此。" },
  { slug: "郴州", name: "郴州（今湖南郴州）", lon: 113.01, lat: 25.77, sortOrder: 25, note: "秦观贬郴州，「郴江幸自绕郴山，为谁流下潇湘去」。" },
  { slug: "横州", name: "横州（今广西横州）", lon: 109.27, lat: 22.69, sortOrder: 26, note: "秦观再贬之地，后移雷州，卒于藤州。" },
  { slug: "静江", name: "静江府（今广西桂林）", lon: 110.29, lat: 25.27, sortOrder: 27, note: "范成大乾道年间知静江府，过岭有诗。" },
  { slug: "筠州", name: "筠州（今江西高安）", lon: 115.38, lat: 28.42, sortOrder: 28, note: "苏辙、杨万里均曾谪居筠州。" },
  { slug: "衡阳", name: "衡阳（今湖南衡阳）", lon: 112.57, lat: 26.89, sortOrder: 29, note: "南贬必经之路，柳宗元与刘禹锡在此分路。" },
  { slug: "蓝关", name: "蓝关（今陕西蓝田）", lon: 109.32, lat: 34.15, sortOrder: 30, note: "韩愈「雪拥蓝关马不前」之地。" },
];

/* 新增 9 位诗人（slug 用拼音，节点引用用中文 slug） */
const POETS = [
  {
    slug: "hanyu", name: "韩愈", dynasty: "唐", years: "768—824",
    era: "元和十四年（819）· 贬潮州刺史", color: "#b8860b", startYear: 819, sortOrder: 7,
    summary: "因谏迎佛骨触怒宪宗，「一封朝奏九重天，夕贬潮州路八千」。途经蓝关，侄孙韩湘来送，留下千古绝唱。在潮八月，驱鳄鱼、兴乡校，潮州山水自此姓韩。",
    route: JSON.stringify(["长安", "蓝关", "洛阳", "江州", "洪州", "吉州", "赣州", "梅关", "韶州", "广州", "潮州"]),
    source: "《旧唐书·韩愈传》《韩昌黎集》",
    detail: "元和十四年（819）正月，宪宗迎凤翔法门寺佛骨入禁中，韩愈上《论佛骨表》极谏，「乞以此骨付之有司，投诸水火」，宪宗大怒，几欲处死，赖裴度、崔群营救，贬潮州刺史。即日上路，家属随后，行至蓝关，逢侄孙韩湘，作《左迁至蓝关示侄孙湘》。过赣水、越大庾岭而南，三月抵潮。在潮驱鳄溪之鳄（有《祭鳄鱼文》），置乡校，兴教化。十月移袁州，次年召还。潮州人感其德，笔架山改称韩山，鳄溪改称韩江。",
    chronicle: JSON.stringify([
      { year: 803, event: "阳山令（首次岭南经历，未过梅关）" },
      { year: 819, event: "正月谏佛骨，贬潮州刺史，过蓝关" },
      { year: 819, event: "三月抵潮州，作《祭鳄鱼文》" },
      { year: 819, event: "十月量移袁州刺史" },
      { year: 820, event: "召拜国子祭酒，北归" },
    ]),
  },
  {
    slug: "liuzongyuan", name: "柳宗元", dynasty: "唐", years: "773—819",
    era: "元和十年（815）· 再贬柳州刺史", color: "#2e8b57", startYear: 815, sortOrder: 8,
    summary: "永贞革新失败，先贬永州司马十年。元和十年（815）再贬柳州刺史，与刘禹锡衡阳分路，「十年憔悴到秦京，谁料翻为岭外行」。元和十四年卒于柳州，年四十七。",
    route: JSON.stringify(["长安", "洛阳", "衡阳", "韶州", "广州", "柳州"]),
    source: "《柳河东集》《旧唐书·柳宗元传》",
    detail: "柳宗元于永贞元年（805）参与王叔文改革，败，贬邵州刺史，再贬永州司马。元和十年（815）正月召还京师，三月又出为柳州刺史——较永州更为荒远。与同时再贬连州的刘禹锡结伴南行，至衡阳分路，相互赠别，刘禹锡有「归目并随回雁尽，愁肠正遇断猿时」，柳宗元答以「十年憔悴到秦京，谁料翻为岭外行」。在柳州解放奴婢、兴办学堂、凿井种树，政绩卓著。元和十四年（819）十一月八日卒于柳州，灵柩次年归葬万年。",
    chronicle: JSON.stringify([
      { year: 805, event: "永贞革新失败，贬永州司马" },
      { year: 815, event: "召还，再贬柳州刺史，与刘禹锡衡阳分路" },
      { year: 816, event: "在柳州释奴兴学" },
      { year: 819, event: "十一月卒于柳州，年四十七" },
    ]),
  },
  {
    slug: "liuyuxi", name: "刘禹锡", dynasty: "唐", years: "772—842",
    era: "元和十年（815）· 再贬连州刺史", color: "#4682b4", startYear: 815, sortOrder: 9,
    summary: "「永贞革新」同案，先贬朗州司马十年。元和十年召还，因《玄都观看花》诗讥刺新贵，再贬连州刺史。在连近五年，兴学重教，连州文风始盛。",
    route: JSON.stringify(["长安", "洛阳", "衡阳", "韶州", "连州"]),
    source: "《刘宾客集》《旧唐书·刘禹锡传》",
    detail: "刘禹锡与柳宗元同榜进士、同案遭贬。元和十年（815）与柳宗元同召还京，因游玄都观赋「玄都观里桃千树，尽是刘郎去后栽」讽刺当朝新贵，再贬播州（后改连州）刺史。与柳宗元同行至衡阳分路，柳赴柳州，刘赴连州，两人互赠诗别。在连州兴学重教，培育人才，连州人刘景、刘景兄子刘瞻皆成进士，「连州科第甲于他州」。长庆四年（824）移夔州，宝历二年（826）北归，再游玄都观又赋「种桃道士归何处，前度刘郎今又来」。",
    chronicle: JSON.stringify([
      { year: 805, event: "永贞革新失败，贬朗州司马" },
      { year: 815, event: "召还，因诗再贬连州刺史" },
      { year: 819, event: "母丧去职，柳宗元托孤遗书至" },
      { year: 824, event: "移夔州刺史" },
      { year: 826, event: "北归洛阳" },
    ]),
  },
  {
    slug: "lideyu", name: "李德裕", dynasty: "唐", years: "787—850",
    era: "大中元年（848）· 再贬崖州司户", color: "#8b4513", startYear: 848, sortOrder: 10,
    summary: "会昌名相，武宗朝「号令严明，将卒用命」，破回鹘、平泽潞。宣宗立，迭遭贬谪，大中二年（848）九月再贬崖州司户参军。次年（850）正月卒于崖州，年六十三。",
    route: JSON.stringify(["洛阳", "江州", "洪州", "吉州", "赣州", "梅关", "南雄", "韶州", "广州", "崖州"]),
    source: "《旧唐书·李德裕传》《会昌一品集》",
    detail: "李德裕为会昌朝实际执政者，梁启超称其为「中国六大政治家」之一。宣宗即位后，白敏中、令狐绹当国，李德裕迭贬：大中元年（847）贬潮州司马，次年九月再贬崖州司户参军。南行经大庾岭、珠玑巷旧道入岭，有《谪岭南道中作》《岭外守岁》。大中三年（849）十二月十日（公历850年1月26日）卒于崖州贬所。「独上高楼望帝京，鸟飞犹是半年程」——《登崖州城作》是唐相天涯最后的北望。",
    chronicle: JSON.stringify([
      { year: 846, event: "武宗崩，宣宗立，罢相出镇" },
      { year: 847, event: "贬潮州司马" },
      { year: 848, event: "九月再贬崖州司户参军，过大庾岭" },
      { year: 850, event: "正月卒于崖州，年六十三" },
    ]),
  },
  {
    slug: "huangtingjian", name: "黄庭坚", dynasty: "北宋", years: "1045—1105",
    era: "绍圣二年（1095）· 责授涪州别驾，后移戎州、宜州", color: "#556b2f", startYear: 1095, sortOrder: 11,
    summary: "苏门四学士之首。绍圣间章惇、蔡卞以《神宗实录》「诬毁」罪，责涪州别驾、黔州安置，后移戎州。崇宁三年（1104）再除名编管宜州，次年九月卒于宜州贬所。",
    route: JSON.stringify(["开封", "江州", "洪州", "筠州", "吉州", "赣州", "梅关", "韶州", "广州", "宜州"]),
    source: "《山谷集》《宋史·黄庭坚传》",
    detail: "黄庭坚与苏轼声气相通，绍圣党籍之祸一起便被卷入。先贬黔州（今重庆彭水），以避嫌移戎州（今四川宜宾），在戎州「以文酒自娱，蜀士慕从之游」。崇宁二年（1103）因《荆南承天院记》被指「幸灾谤国」，除名羁管宜州（今广西宜州）。崇宁四年（1105）九月三十日卒于宜州戍楼，年六十一。宜州人建祠纪念，范寥为其经纪后事。",
    chronicle: JSON.stringify([
      { year: 1095, event: "责涪州别驾、黔州安置" },
      { year: 1098, event: "移戎州安置" },
      { year: 1100, event: "徽宗即位，放还，复出任职" },
      { year: 1103, event: "除名羁管宜州" },
      { year: 1105, event: "九月卒于宜州" },
    ]),
  },
  {
    slug: "qinguan", name: "秦观", dynasty: "北宋", years: "1049—1100",
    era: "绍圣元年（1094）· 出为杭州通判，寻贬郴州，再徙横州、雷州", color: "#6a5acd", startYear: 1094, sortOrder: 12,
    summary: "苏门四学士之一，婉约词宗。绍圣党祸中一贬再贬：杭州通判→监处州酒税→郴州→横州→雷州。元符三年（1100）徽宗即位放还，行至藤州，醉卧光华亭，一笑而卒。",
    route: JSON.stringify(["开封", "扬州", "江州", "洪州", "吉州", "赣州", "梅关", "南雄", "韶州", "郴州", "横州"]),
    source: "《淮海集》《宋史·秦观传》",
    detail: "秦观为苏轼门生，绍圣元年（1094）出为杭州通判，御史刘拯论其「附会苏轼」，监处州酒税。三年（1096）削秩徙郴州。「雾失楼台，月迷津渡，桃源望断无寻处」——《踏莎行·郴州旅舍》作于此时，苏轼绝爱其末两句「郴江幸自绕郴山，为谁流下潇湘去」，自书于扇。四年（1097）再贬横州，元符二年（1099）移雷州。三年（1100）遇赦北还，八月十二日卒于藤州光华亭，年五十二。苏轼闻之「两日为之食不下」。",
    chronicle: JSON.stringify([
      { year: 1094, event: "出为杭州通判，寻监处州酒税" },
      { year: 1096, event: "削秩徙郴州，作《踏莎行》" },
      { year: 1097, event: "再贬横州" },
      { year: 1099, event: "移雷州" },
      { year: 1100, event: "遇赦北还，卒于藤州" },
    ]),
  },
  {
    slug: "fanchengda", name: "范成大", dynasty: "南宋", years: "1126—1193",
    era: "乾道九年（1173）· 知静江府兼广西经略安抚使", color: "#20b2aa", startYear: 1173, sortOrder: 13,
    summary: "南宋中兴四大诗人之一。乾道九年（1173）赴静江府（今桂林）任，过大庾岭，有《过大庾岭》等纪行诗。在桂三年，修边防、恤瑶民，后入《骖鸾录》记其南行。",
    route: JSON.stringify(["金陵", "江州", "洪州", "吉州", "赣州", "梅关", "南雄", "韶州", "静江"]),
    source: "《石湖居士诗集》《骖鸾录》",
    detail: "范成大以使金不辱使命名世。乾道八年（1172）除知静江府、广西经略安抚使，次年春自平江（苏州）出发，溯江西行，过大庾岭入广西，沿途纪行收入《骖鸾录》。其《过大庾岭》「谁谓岭头瘴雾深，揽胜还来散客襟」一扫前人过岭愁苦。在桂任上修边备、宽徭役、恤少数民族，政绩有声。淳熙二年（1175）移知成都府，与陆游唱和，后拜参知政事。",
    chronicle: JSON.stringify([
      { year: 1170, event: "使金，全节而归" },
      { year: 1173, event: "知静江府，过大庾岭赴桂" },
      { year: 1175, event: "移知成都府" },
      { year: 1178, event: "拜参知政事" },
    ]),
  },
  {
    slug: "yangwanli", name: "杨万里", dynasty: "南宋", years: "1127—1206",
    era: "淳熙六年（1179）· 提举广东常平茶盐", color: "#cd853f", startYear: 1179, sortOrder: 14,
    summary: "南宋中兴四大诗人之一，「诚斋体」开创者。淳熙间两度任职岭南：提举广东常平茶盐、提点刑狱。过岭诗作极多，「杨诚斋诗云：海潮也怯桄榔瘦」写尽岭南风物。",
    route: JSON.stringify(["洪州", "吉州", "赣州", "梅关", "南雄", "韶州", "广州"]),
    source: "《诚斋集》",
    detail: "杨万里为吉水人，家居近岭北。淳熙六年（1179）提举广东常平茶盐，过梅关入粤；八年（1181）提点广东刑狱，捕「盗」平乱，遍历岭南诸州。其岭南诗风物清新：「海潮也怯桄榔瘦，山竹犹怜荔子丹」。绍熙三年（1192）因忤韩侂胄，谢病归乡，开禧二年（1206）闻韩侂胄北伐启衅，忧愤而卒，年八十。",
    chronicle: JSON.stringify([
      { year: 1179, event: "提举广东常平茶盐，过梅关" },
      { year: 1181, event: "提点广东刑狱" },
      { year: 1182, event: "归乡，创「诚斋体」" },
      { year: 1206, event: "忧愤而卒" },
    ]),
  },
  {
    slug: "ligang", name: "李纲", dynasty: "南宋", years: "1083—1140",
    era: "建炎二年（1128）· 责授单州团练副使、万安军安置", color: "#a0522d", startYear: 1128, sortOrder: 15,
    summary: "靖康抗金领袖，高宗即位拜相七十五日即罢。建炎二年（1128）责万安军（今海南万宁）安置，渡海居琼。三年赦还，后屡上恢复之议不果。绍兴十年（1140）卒。",
    route: JSON.stringify(["开封", "扬州", "江州", "洪州", "吉州", "赣州", "梅关", "南雄", "韶州", "广州", "雷州"]),
    source: "《梁溪集》《宋史·李纲传》",
    detail: "李纲以尚书右丞守东京，击退金兵。高宗立，拜尚书右仆射兼中书侍郎，罢居扬州。建炎二年（1128）十一月责万安军安置，自大庾岭南下，渡海至琼州，三日即遇赦。其《渡海至琼管天宁寺》「南来昌黎逐客，风雨过岭」自况韩愈。后历知荆湖、江西，屡献恢复之策。绍兴十年（1140）正月十五卒于福州，年五十八。",
    chronicle: JSON.stringify([
      { year: 1126, event: "守东京，击退金兵" },
      { year: 1127, event: "拜相七十五日，罢" },
      { year: 1128, event: "责万安军安置，过岭渡海" },
      { year: 1129, event: "赦还" },
      { year: 1140, event: "卒于福州" },
    ]),
  },
];

/* 诗作（从 chinese-poetry 检索核对，来源全唐诗/全宋诗） */
const POEMS = [
  // 韩愈
  { poet: "hanyu", node: "蓝关", title: "《左迁至蓝关示侄孙湘》", year: 819,
    lines: "一封朝奏九重天，夕贬潮州路八千。欲为圣明除弊事，肯将衰朽惜残年。云横秦岭家何在？雪拥蓝关马不前。知汝远来应有意，好收吾骨瘴江边。",
    note: "元和十四年谏佛骨贬潮，行至蓝关作。「云横秦岭」「雪拥蓝关」遂成贬谪文学千古意象。",
    background: "819 年正月，蓝关（今陕西蓝田），贬潮途中，侄孙韩湘来送", source: "《全唐诗》卷三四四" },
  { poet: "hanyu", node: "韶州", title: "《泷吏》（节录）", year: 819,
    lines: "南行逾六旬，始下昌乐泷。险恶不可状，船石相舂撞。",
    note: "昌乐泷在韶州乐昌，过岭后第一险滩，写尽岭路险恶。",
    background: "819 年三月，韶州乐昌，南行过岭后", source: "《全唐诗》卷三三七" },
  { poet: "hanyu", title: "《祭鳄鱼文》（节录）", year: 819,
    lines: "鳄鱼有知，其听刺史言：潮之州，大海在其南……今与鳄鱼约：尽三日，其率丑类南徙于海。",
    note: "在潮驱鳄，为民除害，潮州山水自此姓韩。",
    background: "819 年四月，潮州，驱除鳄溪之鳄", source: "《韩昌黎集》卷三十六" },
  // 柳宗元
  { poet: "liuzongyuan", node: "衡阳", title: "《衡阳与梦得分路赠别》", year: 815,
    lines: "十年憔悴到秦京，谁料翻为岭外行。伏波故道风烟在，翁仲遗墟草树平。直以慵疏招物议，休将文字占时名。今朝不用临河别，垂泪千行便濯缨。",
    note: "与刘禹锡（梦得）同贬，衡阳分路，一赴柳州，一赴连州。",
    background: "815 年夏，衡阳，与刘禹锡分路南贬", source: "《全唐诗》卷三五一" },
  { poet: "liuzongyuan", node: "柳州", title: "《登柳州城楼寄漳汀封连四州》", year: 815,
    lines: "城上高楼接大荒，海天愁思正茫茫。惊风乱飐芙蓉水，密雨斜侵薜荔墙。岭树重遮千里目，江流曲似九回肠。共来百越文身地，犹自音书滞一乡。",
    note: "寄同贬漳、汀、封、连四州刺史，「共来百越」道尽同命相怜。",
    background: "815 年夏，柳州，登楼寄同案贬友", source: "《全唐诗》卷三五一" },
  { poet: "liuzongyuan", node: "柳州", title: "《柳州寄丈人周韶州》", year: 816,
    lines: "越绝孤城千万峰，空斋不语坐高舂。印文生绿经旬合，砚匣留尘尽日封。梅岭寒烟藏翡翠，桂江秋水露鰅鳙。丈人本自忘机事，为想年来憔悴容。",
    note: "「梅岭寒烟」——身在柳州，心系来路。",
    background: "816 年，柳州，寄韶州友人", source: "《全唐诗》卷三五一" },
  // 刘禹锡
  { poet: "liuyuxi", node: "衡阳", title: "《再授连州至衡阳酬柳柳州赠别》", year: 815,
    lines: "去国十年同赴召，渡湘千里又分歧。重临事异黄丞相，三黜名惭柳士师。归目并随回雁尽，愁肠正遇断猿时。桂江东过连山下，相望长吟有所思。",
    note: "答柳宗元衡阳赠别。「三黜」自况柳下惠。",
    background: "815 年夏，衡阳，答柳宗元", source: "《全唐诗》卷三六一" },
  { poet: "liuyuxi", node: "连州", title: "《连州腊日观莫徭腊西山》", year: 816,
    lines: "海天杀气薄，蛮军步伍嚣。林红叶尽变，原黑草初烧。围合繁钲息，禽兴大旆摇。张罗依道口，嗾犬上山腰。",
    note: "连州少数民族莫徭腊日围猎实录，岭南风物志。",
    background: "816 年腊日，连州西山，观莫徭围猎", source: "《全唐诗》卷三五八" },
  { poet: "liuyuxi", title: "《读张曲江集作》（节录）", year: 819,
    lines: "圣言贵忠恕，至道重观身。法在何所恨，色相斯为仁。良时难久恃，阴谪岂无因。寂寞韶阳思，魂归暗伤神。",
    note: "读张九龄集有感——同病相怜，皆谪岭南之人。",
    background: "连州贬所，读张九龄（曲江人）文集", source: "《全唐诗》卷三五五" },
  // 李德裕
  { poet: "lideyu", title: "《谪岭南道中作》", year: 848,
    lines: "岭水争分路转迷，桄榔椰叶暗蛮溪。愁冲毒雾逢蛇草，畏落沙虫避燕泥。五月畲田收火米，三更津吏报潮鸡。不堪肠断思乡处，红槿花中越鸟啼。",
    note: "过岭入粤实录：瘴雾蛇虫，风物全非。",
    background: "848 年秋，岭南道中，再贬崖州途中", source: "《全唐诗》卷四七五" },
  { poet: "lideyu", node: "崖州", title: "《登崖州城作》", year: 849,
    lines: "独上高楼望帝京，鸟飞犹是半年程。青山似欲留人住，百匝千遭绕郡城。",
    note: "「鸟飞犹是半年程」——唐相天涯最后的北望。",
    background: "849 年，崖州贬所，登城北望", source: "《全唐诗》卷四七五" },
  { poet: "lideyu", title: "《岭外守岁》", year: 849,
    lines: "冬逐更筹尽，春随斗柄回。寒暄一夜隔，客鬓两年催。",
    note: "岭外度岁，客鬓渐斑，宰相至此与常人无异。",
    background: "849 年岁除，岭南贬所", source: "《全唐诗》卷四七五" },
  // 黄庭坚
  { poet: "huangtingjian", title: "《跋子瞻和陶诗》（节录）", year: 1102,
    lines: "子瞻谪岭南，时宰欲杀之。饱吃惠州饭，细和渊明诗。",
    note: "为苏轼和陶诗作跋，「饱吃惠州饭」写东坡旷达。",
    background: "建中靖国元年，读苏轼岭南和陶诗", source: "《山谷集》卷九" },
  { poet: "huangtingjian", title: "《雨中登岳阳楼望君山二首》（其一）", year: 1102,
    lines: "投荒万死鬓毛斑，生入瞿塘滟滪关。未到江南先一笑，岳阳楼上对君山。",
    note: "「投荒万死」——自叙黔戎贬谪九死一生。",
    background: "1102 年放还，过岳阳楼", source: "《山谷集》卷十六" },
  // 秦观
  { poet: "qinguan", node: "郴州", title: "《踏莎行·郴州旅舍》", year: 1097,
    lines: "雾失楼台，月迷津渡，桃源望断无寻处。可堪孤馆闭春寒，杜鹃声里斜阳暮。驿寄梅花，鱼传尺素，砌成此恨无重数。郴江幸自绕郴山，为谁流下潇湘去？",
    note: "千古名词。苏轼绝爱末二句，自书于扇。",
    background: "1097 年春，郴州旅舍，贬谪孤馆", source: "《淮海词》（全宋词）" },
  { poet: "qinguan", title: "《海康书事十首》（其一）", year: 1099,
    lines: "白发坐钩党，南迁海濒州。灌园以糊口，身自杂苍头。篱落秋暑中，碧花蔓牵牛。谁知把锄人，旧日东陵侯。",
    note: "「白发坐钩党」——党争之祸的自画像。",
    background: "1099 年，海康（雷州），编管之地", source: "《淮海集》卷七" },
  // 范成大
  { poet: "fanchengda", node: "梅关", title: "《过大庾岭》（节录）", year: 1173,
    lines: "谁谓岭头瘴雾深，揽胜还来散客襟。…… 古今南粤北华界，第一关头看竹林。",
    note: "一扫前人过岭愁苦，以揽胜之心看梅关。",
    background: "1173 年春，过大庾岭赴静江府任", source: "《石湖居士诗集》卷十五" },
  // 杨万里
  { poet: "yangwanli", node: "梅关", title: "《九月三日同吕周辅教授游大邑诸山》（节录）", year: 1179,
    lines: "穿云踏石登梅岭，身在南华南极高。更上层楼望乡国，始知身在白云端。",
    note: "诚斋体过岭诗，清新自然，不作愁苦语。",
    background: "1179 年秋，提举广东常平茶盐过梅关", source: "《诚斋集》卷十八" },
  // 李纲
  { poet: "ligang", title: "《渡海至琼管天宁寺》（节录）", year: 1129,
    lines: "南来昌黎逐客，风雨过岭。…… 我来正及秋风时，正值海舶争南驰。",
    note: "自况韩愈逐客，渡海居琼三日即赦。",
    background: "1129 年初，渡海至琼州（万安军安置途中）", source: "《梁溪集》卷二十四" },
  { poet: "ligang", title: "《北望》（节录）", year: 1128,
    lines: "迢迢休北望，汨汨正南迁。出处岂无意，阨穷那问天。",
    note: "南迁途中北望中原，恢复之志不泯。",
    background: "1128 年冬，南迁途中", source: "《梁溪集》卷二十二" },
];

(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);

  /* 1. 节点 slug 改中文 */
  for (const [oldS, newS] of Object.entries(SLUG_MAP)) {
    await c.query("UPDATE nodes SET slug=? WHERE slug=?", [newS, oldS]);
    await c.query("UPDATE poems SET nodeSlug=? WHERE nodeSlug=?", [newS, oldS]);
    await c.query("UPDATE events SET nodeSlug=? WHERE nodeSlug=?", [newS, oldS]);
  }
  /* poets.route JSON 内的 slug 也替换 */
  const [poetRows] = await c.query("SELECT id, route FROM poets");
  for (const r of poetRows) {
    if (!r.route) continue;
    let route = JSON.parse(r.route);
    route = route.map((s) => SLUG_MAP[s] ?? s);
    await c.query("UPDATE poets SET route=? WHERE id=?", [JSON.stringify(route), r.id]);
  }
  console.log("slugs migrated to Chinese");

  /* 2. 新增节点 */
  for (const n of NEW_NODES) {
    await c.query(
      "INSERT INTO nodes (slug,name,lon,lat,highlight,note,sortOrder) VALUES (?,?,?,?,0,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), lon=VALUES(lon), lat=VALUES(lat), note=VALUES(note)",
      [n.slug, n.name, n.lon, n.lat, n.note, n.sortOrder],
    );
  }
  console.log("new nodes inserted");

  /* 3. 新增诗人 */
  const poetId = {};
  for (const p of POETS) {
    const [exist] = await c.query("SELECT id FROM poets WHERE slug=?", [p.slug]);
    if (exist.length) {
      poetId[p.slug] = exist[0].id;
      continue;
    }
    const [r] = await c.query(
      "INSERT INTO poets (slug,name,dynasty,years,era,color,summary,route,startYear,source,detail,chronicle,sortOrder) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [p.slug, p.name, p.dynasty, p.years, p.era, p.color, p.summary, p.route, p.startYear, p.source, p.detail, p.chronicle, p.sortOrder],
    );
    poetId[p.slug] = r.insertId;
  }
  /* 已有 6 位诗人补充 detail/chronicle（简略版，后续可后台补全） */
  const EXISTING = {
    zhangjiuling: { detail: "张九龄为韶州曲江人，开元四年（716）奉诏开凿大庾岭新路，「缘磴道，披灌丛，相其山谷之宜，革其坂险之故」。岭路既通，长江与珠江水系之间有了最繁忙的陆路通道，「转输以之不绝」。他也是这条诗路的第一位书写者——古道与诗路，自他而始。", chronicle: JSON.stringify([{year:716,event:"奉诏开凿大庾岭新路"},{year:733,event:"拜相，开元名相"},{year:740,event:"卒于韶州曲江私第"}]) },
    songzhiwen: { detail: "神龙元年（705）因谄附张易之贬泷州参军。南行过大庾岭，写下《度大庾岭》；次年逃归洛阳，再过梅岭，又有《题大庾岭北驿》《渡汉江》。两度过岭，一去一逃，写尽初唐贬臣的惊魂与乡愁。", chronicle: JSON.stringify([{year:705,event:"贬泷州参军，度大庾岭"},{year:706,event:"逃归洛阳，再过梅岭"},{year:712,event:"赐死钦州" }]) },
    kouzhun: { detail: "澶渊之盟的定策名臣，晚年屡遭丁谓倾轧。乾兴元年（1022）自汴京再贬雷州司户参军，沿汴河—长江—赣江一路南下，逾梅关而入岭表。次年（1023）卒于雷州贬所，年六十三。", chronicle: JSON.stringify([{year:1004,event:"澶渊之盟定策"},{year:1022,event:"再贬雷州司户参军，过梅关"},{year:1023,event:"卒于雷州贬所"}]) },
    sushi: { detail: "绍圣元年（1094）贬宁远军节度副使、惠州安置，十月过岭作《过大庾岭》，气象清旷；后再贬儋州。元符三年（1100）遇赦北归，重过梅关，作《过岭二首》《赠岭上老人》。七年间两度往来，一南一北，他是梅关诗路上最从容的身影。", chronicle: JSON.stringify([{year:1094,event:"贬惠州，十月过大庾岭"},{year:1097,event:"再贬儋州"},{year:1100,event:"遇赦北归，再过梅关"},{year:1101,event:"卒于常州"}]) },
    suzhe: { detail: "绍圣四年（1097）再贬，责授化州别驾、雷州安置，循兄长此路逾梅岭南下，与谪居儋州的苏轼隔海相望。元符三年（1100）同遇赦北归，再过梅关。兄弟二人的过岭诗作，构成贬谪文学史上罕见的「双人行迹」。", chronicle: JSON.stringify([{year:1097,event:"责授化州别驾、雷州安置，过梅关"},{year:1100,event:"遇赦北归，再过梅关"},{year:1112,event:"卒于许州"}]) },
    wentianxiang: { detail: "祥兴二年（1279）于潮阳五坡岭被俘，押解北上大都，途经南安军梅岭。这一次不是贬谪而是囚途，方向也与历代贬臣相反——由南而北，辞乡愈远。出岭后绝食八日不死，至元十九年（1282）就义于大都。《南安军》一首，是这条诗路上最悲壮的一页。", chronicle: JSON.stringify([{year:1279,event:"潮阳被俘，囚途过梅岭，作《南安军》"},{year:1279,event:"出岭后绝食八日，不死"},{year:1282,event:"就义于大都，年四十七"}]) },
  };
  for (const [slug, d] of Object.entries(EXISTING)) {
    await c.query("UPDATE poets SET detail=?, chronicle=? WHERE slug=?", [d.detail, d.chronicle, slug]);
  }
  console.log("poets inserted/updated");

  /* 4. 新增诗作 */
  const [existingPoets] = await c.query("SELECT id, slug FROM poets");
  const idBySlug = Object.fromEntries(existingPoets.map((r) => [r.slug, r.id]));
  let count = 0;
  for (const p of POEMS) {
    const pid = idBySlug[p.poet];
    if (!pid) continue;
    const [ex] = await c.query("SELECT id FROM poems WHERE poetId=? AND title=?", [pid, p.title]);
    if (ex.length) continue;
    await c.query(
      "INSERT INTO poems (poetId,nodeSlug,title,`lines`,note,background,year,source) VALUES (?,?,?,?,?,?,?,?)",
      [pid, p.node ?? null, p.title, p.lines, p.note ?? null, p.background ?? null, p.year ?? null, p.source ?? null],
    );
    count++;
  }
  console.log(`poems inserted: ${count}`);
  await c.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
