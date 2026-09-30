// Sub-filters ("tags") inside each category, e.g. Live Music -> Jazz, Arabic.
// Stored per event in events.tags (text[]). Labels are translated here rather
// than in messages/*.json so the list stays in one place; missing locales
// fall back to English.

type L = Record<string, string>;
const t = (en: string, ar: string, fr: string, rest: Partial<Record<"es" | "it" | "hi" | "ur" | "ru" | "ja" | "tl" | "zh", string>> = {}): L => ({ en, ar, fr, ...rest });

export const TAG_LABELS: Record<string, L> = {
  // Live music
  arabic: t("Arabic", "عربي", "Arabe", { es: "Árabe", it: "Arabo", hi: "अरबी", ur: "عربی", ru: "Арабская", ja: "アラビア", tl: "Arabic", zh: "阿拉伯" }),
  tarab: t("Oriental / Tarab", "طرب", "Tarab / Oriental", { es: "Oriental / Tarab", it: "Orientale / Tarab", hi: "ओरिएंटल / तरब", ur: "طرب", ru: "Восточная / тараб", ja: "オリエンタル / タラブ", tl: "Oriental / Tarab", zh: "东方 / 塔拉布" }),
  jazz: t("Jazz", "جاز", "Jazz", { es: "Jazz", it: "Jazz", hi: "जैज़", ur: "جاز", ru: "Джаз", ja: "ジャズ", tl: "Jazz", zh: "爵士" }),
  blues: t("Blues", "بلوز", "Blues", { es: "Blues", it: "Blues", hi: "ब्लूज़", ur: "بلوز", ru: "Блюз", ja: "ブルース", tl: "Blues", zh: "蓝调" }),
  rock: t("Rock", "روك", "Rock", { es: "Rock", it: "Rock", hi: "रॉक", ur: "راک", ru: "Рок", ja: "ロック", tl: "Rock", zh: "摇滚" }),
  pop: t("Pop", "بوب", "Pop", { es: "Pop", it: "Pop", hi: "पॉप", ur: "پاپ", ru: "Поп", ja: "ポップ", tl: "Pop", zh: "流行" }),
  hip_hop: t("Hip-Hop & Rap", "هيب هوب وراب", "Hip-hop & rap", { es: "Hip-hop y rap", it: "Hip-hop e rap", hi: "हिप-हॉप और रैप", ur: "ہپ ہاپ اور ریپ", ru: "Хип-хоп и рэп", ja: "ヒップホップ・ラップ", tl: "Hip-Hop & Rap", zh: "嘻哈与说唱" }),
  rnb: t("R&B & Soul", "آر أند بي وسول", "R&B & soul", { es: "R&B y soul", it: "R&B e soul", hi: "आर एंड बी और सोल", ur: "آر اینڈ بی اور سول", ru: "R&B и соул", ja: "R&B・ソウル", tl: "R&B & Soul", zh: "节奏布鲁斯与灵魂乐" }),
  classical: t("Classical", "كلاسيكي", "Classique", { es: "Clásica", it: "Classica", hi: "शास्त्रीय", ur: "کلاسیکی", ru: "Классика", ja: "クラシック", tl: "Classical", zh: "古典" }),
  latin: t("Latin", "لاتيني", "Latino", { es: "Latina", it: "Latina", hi: "लैटिन", ur: "لاطینی", ru: "Латино", ja: "ラテン", tl: "Latin", zh: "拉丁" }),
  tribute: t("Tributes", "تحية فنية", "Hommages", { es: "Tributos", it: "Tributi", hi: "ट्रिब्यूट", ur: "ٹریبیوٹ", ru: "Трибьюты", ja: "トリビュート", tl: "Tributes", zh: "致敬演出" }),
  // DJ
  house: t("House", "هاوس", "House", { es: "House", it: "House", hi: "हाउस", ur: "ہاؤس", ru: "Хаус", ja: "ハウス", tl: "House", zh: "浩室" }),
  techno: t("Techno", "تكنو", "Techno", { es: "Techno", it: "Techno", hi: "टेक्नो", ur: "ٹیکنو", ru: "Техно", ja: "テクノ", tl: "Techno", zh: "科技舞曲" }),
  afro_house: t("Afro House", "أفرو هاوس", "Afro house", { es: "Afro house", it: "Afro house", hi: "एफ्रो हाउस", ur: "افرو ہاؤس", ru: "Афро-хаус", ja: "アフロハウス", tl: "Afro House", zh: "非洲浩室" }),
  commercial: t("Commercial & Party", "تجاري وحفلات", "Commercial & fête", { es: "Comercial y fiesta", it: "Commerciale e party", hi: "कमर्शियल और पार्टी", ur: "کمرشل اور پارٹی", ru: "Коммерческая и вечеринки", ja: "コマーシャル・パーティー", tl: "Commercial & Party", zh: "商业与派对" }),
  // Sports
  football: t("Football", "كرة القدم", "Football", { es: "Fútbol", it: "Calcio", hi: "फ़ुटबॉल", ur: "فٹ بال", ru: "Футбол", ja: "サッカー", tl: "Football", zh: "足球" }),
  basketball: t("Basketball", "كرة السلة", "Basket", { es: "Baloncesto", it: "Basket", hi: "बास्केटबॉल", ur: "باسکٹ بال", ru: "Баскетбол", ja: "バスケットボール", tl: "Basketball", zh: "篮球" }),
  running: t("Running", "جري", "Course à pied", { es: "Running", it: "Corsa", hi: "दौड़", ur: "دوڑ", ru: "Бег", ja: "ランニング", tl: "Takbo", zh: "跑步" }),
  motorsport: t("Motorsport", "رياضة المحركات", "Sport automobile", { es: "Motor", it: "Motorsport", hi: "मोटरस्पोर्ट", ur: "موٹر اسپورٹ", ru: "Автоспорт", ja: "モータースポーツ", tl: "Motorsport", zh: "赛车" }),
  combat: t("Combat Sports", "رياضات قتالية", "Sports de combat", { es: "Deportes de combate", it: "Sport da combattimento", hi: "कॉम्बैट स्पोर्ट्स", ur: "کومبیٹ اسپورٹس", ru: "Единоборства", ja: "格闘技", tl: "Combat Sports", zh: "格斗" }),
  tennis_padel: t("Tennis & Padel", "تنس وبادل", "Tennis & padel", { es: "Tenis y pádel", it: "Tennis e padel", hi: "टेनिस और पैडल", ur: "ٹینس اور پیڈل", ru: "Теннис и падел", ja: "テニス・パデル", tl: "Tennis & Padel", zh: "网球与板式网球" }),
  water_sports: t("Water Sports", "رياضات مائية", "Sports nautiques", { es: "Deportes acuáticos", it: "Sport acquatici", hi: "वॉटर स्पोर्ट्स", ur: "واٹر اسپورٹس", ru: "Водный спорт", ja: "ウォータースポーツ", tl: "Water Sports", zh: "水上运动" }),
  cycling: t("Cycling", "دراجات", "Cyclisme", { es: "Ciclismo", it: "Ciclismo", hi: "साइकिलिंग", ur: "سائیکلنگ", ru: "Велоспорт", ja: "サイクリング", tl: "Cycling", zh: "骑行" }),
  golf: t("Golf", "غولف", "Golf", { es: "Golf", it: "Golf", hi: "गोल्फ़", ur: "گالف", ru: "Гольф", ja: "ゴルフ", tl: "Golf", zh: "高尔夫" }),
  // Food & drink
  brunch: t("Brunch", "برانش", "Brunch", { es: "Brunch", it: "Brunch", hi: "ब्रंच", ur: "برنچ", ru: "Бранч", ja: "ブランチ", tl: "Brunch", zh: "早午餐" }),
  wine: t("Wine", "نبيذ", "Vin", { es: "Vino", it: "Vino", hi: "वाइन", ur: "وائن", ru: "Вино", ja: "ワイン", tl: "Wine", zh: "葡萄酒" }),
  beer: t("Beer", "بيرة", "Bière", { es: "Cerveza", it: "Birra", hi: "बीयर", ur: "بیئر", ru: "Пиво", ja: "ビール", tl: "Beer", zh: "啤酒" }),
  dining: t("Dining & Tasting", "مطاعم وتذوق", "Gastronomie & dégustation", { es: "Gastronomía y catas", it: "Cene e degustazioni", hi: "डाइनिंग और टेस्टिंग", ur: "ڈائننگ اور ٹیسٹنگ", ru: "Ужины и дегустации", ja: "ダイニング・試食", tl: "Dining & Tasting", zh: "餐饮与品鉴" }),
  food_festival: t("Food Festivals", "مهرجانات طعام", "Festivals culinaires", { es: "Festivales gastronómicos", it: "Festival del cibo", hi: "फ़ूड फ़ेस्टिवल", ur: "فوڈ فیسٹیول", ru: "Гастрофестивали", ja: "フードフェス", tl: "Food Festivals", zh: "美食节" }),
  // Theater
  play: t("Plays", "مسرحيات", "Pièces", { es: "Obras", it: "Spettacoli teatrali", hi: "नाटक", ur: "ڈرامے", ru: "Спектакли", ja: "演劇", tl: "Dula", zh: "话剧" }),
  musical: t("Musicals", "مسرح غنائي", "Comédies musicales", { es: "Musicales", it: "Musical", hi: "म्यूज़िकल", ur: "میوزیکل", ru: "Мюзиклы", ja: "ミュージカル", tl: "Musicals", zh: "音乐剧" }),
  comedy: t("Stand-up Comedy", "ستاند أب كوميدي", "Stand-up", { es: "Stand-up", it: "Stand-up comedy", hi: "स्टैंड-अप कॉमेडी", ur: "اسٹینڈ اپ کامیڈی", ru: "Стендап", ja: "スタンダップコメディ", tl: "Stand-up Comedy", zh: "脱口秀" }),
  ballet_dance: t("Ballet & Dance", "باليه ورقص", "Ballet & danse", { es: "Ballet y danza", it: "Balletto e danza", hi: "बैले और डांस", ur: "بیلے اور رقص", ru: "Балет и танец", ja: "バレエ・ダンス", tl: "Ballet & Dance", zh: "芭蕾与舞蹈" }),
  opera: t("Opera", "أوبرا", "Opéra", { es: "Ópera", it: "Opera", hi: "ओपेरा", ur: "اوپیرا", ru: "Опера", ja: "オペラ", tl: "Opera", zh: "歌剧" }),
  // Arts, culture & exhibitions
  art: t("Art & Galleries", "فن ومعارض", "Art & galeries", { es: "Arte y galerías", it: "Arte e gallerie", hi: "कला और गैलरी", ur: "آرٹ اور گیلریاں", ru: "Искусство и галереи", ja: "アート・ギャラリー", tl: "Art & Galleries", zh: "艺术与画廊" }),
  museum: t("Museums", "متاحف", "Musées", { es: "Museos", it: "Musei", hi: "संग्रहालय", ur: "عجائب گھر", ru: "Музеи", ja: "美術館・博物館", tl: "Museums", zh: "博物馆" }),
  film: t("Film", "سينما", "Cinéma", { es: "Cine", it: "Cinema", hi: "फ़िल्म", ur: "فلم", ru: "Кино", ja: "映画", tl: "Pelikula", zh: "电影" }),
  books: t("Books & Talks", "كتب وندوات", "Livres & conférences", { es: "Libros y charlas", it: "Libri e incontri", hi: "किताबें और वार्ता", ur: "کتابیں اور گفتگو", ru: "Книги и лекции", ja: "本・トーク", tl: "Books & Talks", zh: "图书与讲座" }),
  heritage: t("Heritage", "تراث", "Patrimoine", { es: "Patrimonio", it: "Patrimonio", hi: "विरासत", ur: "ورثہ", ru: "Наследие", ja: "伝統・遺産", tl: "Heritage", zh: "文化遗产" }),
  photography: t("Photography", "تصوير", "Photographie", { es: "Fotografía", it: "Fotografia", hi: "फ़ोटोग्राफ़ी", ur: "فوٹوگرافی", ru: "Фотография", ja: "写真", tl: "Photography", zh: "摄影" }),
  consumer_show: t("Shopping & Consumer Shows", "تسوق ومعارض استهلاكية", "Shopping & salons grand public", { es: "Compras y ferias", it: "Shopping e fiere", hi: "शॉपिंग और उपभोक्ता मेले", ur: "شاپنگ اور نمائشیں", ru: "Шопинг и ярмарки", ja: "ショッピング・展示即売", tl: "Shopping & Consumer Shows", zh: "购物与消费展" }),
  // Nightlife
  club: t("Clubs", "نوادي ليلية", "Clubs", { es: "Clubs", it: "Club", hi: "क्लब", ur: "کلب", ru: "Клубы", ja: "クラブ", tl: "Clubs", zh: "夜店" }),
  bar_lounge: t("Bars & Lounges", "بارات ولاونج", "Bars & lounges", { es: "Bares y lounges", it: "Bar e lounge", hi: "बार और लाउंज", ur: "بارز اور لاؤنجز", ru: "Бары и лаунжи", ja: "バー・ラウンジ", tl: "Bars & Lounges", zh: "酒吧与酒廊" }),
  party: t("Parties", "حفلات", "Soirées", { es: "Fiestas", it: "Feste", hi: "पार्टी", ur: "پارٹیاں", ru: "Вечеринки", ja: "パーティー", tl: "Parties", zh: "派对" }),
  // Festivals
  music_festival: t("Music Festivals", "مهرجانات موسيقية", "Festivals de musique", { es: "Festivales de música", it: "Festival musicali", hi: "संगीत महोत्सव", ur: "میوزک فیسٹیول", ru: "Музыкальные фестивали", ja: "音楽フェス", tl: "Music Festivals", zh: "音乐节" }),
  cultural: t("Cultural", "ثقافي", "Culturel", { es: "Cultural", it: "Culturale", hi: "सांस्कृतिक", ur: "ثقافتی", ru: "Культурные", ja: "文化", tl: "Cultural", zh: "文化" }),
  seasonal: t("Seasonal & Holidays", "مواسم وأعياد", "Saisons & fêtes", { es: "Temporadas y fiestas", it: "Stagionali e festività", hi: "मौसमी और त्योहार", ur: "موسمی اور تہوار", ru: "Сезонные и праздники", ja: "季節・祝祭", tl: "Seasonal & Holidays", zh: "节庆与季节活动" }),
  // Conferences & expos
  tech: t("Tech", "تكنولوجيا", "Tech", { es: "Tecnología", it: "Tecnologia", hi: "टेक", ur: "ٹیک", ru: "Технологии", ja: "テック", tl: "Tech", zh: "科技" }),
  trade_show: t("Business & Trade", "أعمال وتجارة", "Affaires & salons", { es: "Negocios y ferias", it: "Business e fiere", hi: "व्यापार मेले", ur: "کاروبار اور تجارت", ru: "Бизнес и выставки", ja: "ビジネス・展示会", tl: "Business & Trade", zh: "商务与贸易" }),
  health: t("Health", "صحة", "Santé", { es: "Salud", it: "Salute", hi: "स्वास्थ्य", ur: "صحت", ru: "Здоровье", ja: "ヘルス", tl: "Health", zh: "健康" }),
  // Family
  kids_show: t("Kids' Shows", "عروض أطفال", "Spectacles enfants", { es: "Espectáculos infantiles", it: "Spettacoli per bambini", hi: "बच्चों के शो", ur: "بچوں کے شوز", ru: "Детские шоу", ja: "キッズショー", tl: "Kids' Shows", zh: "儿童演出" }),
  attractions: t("Attractions & Activities", "أنشطة ومعالم", "Attractions & activités", { es: "Atracciones y actividades", it: "Attrazioni e attività", hi: "आकर्षण और गतिविधियाँ", ur: "تفریحی سرگرمیاں", ru: "Развлечения", ja: "アトラクション・体験", tl: "Attractions & Activities", zh: "景点与活动" }),
  // Wellness & outdoor
  yoga: t("Yoga & Meditation", "يوغا وتأمل", "Yoga & méditation", { es: "Yoga y meditación", it: "Yoga e meditazione", hi: "योग और ध्यान", ur: "یوگا اور مراقبہ", ru: "Йога и медитация", ja: "ヨガ・瞑想", tl: "Yoga & Meditation", zh: "瑜伽与冥想" }),
  fitness: t("Fitness", "لياقة", "Fitness", { es: "Fitness", it: "Fitness", hi: "फ़िटनेस", ur: "فٹنس", ru: "Фитнес", ja: "フィットネス", tl: "Fitness", zh: "健身" }),
  hiking: t("Hiking", "مشي في الطبيعة", "Randonnée", { es: "Senderismo", it: "Escursionismo", hi: "हाइकिंग", ur: "ہائکنگ", ru: "Походы", ja: "ハイキング", tl: "Hiking", zh: "徒步" }),
  beach: t("Beach", "شاطئ", "Plage", { es: "Playa", it: "Spiaggia", hi: "समुद्र तट", ur: "ساحل", ru: "Пляж", ja: "ビーチ", tl: "Beach", zh: "海滩" }),
  desert: t("Desert", "صحراء", "Désert", { es: "Desierto", it: "Deserto", hi: "रेगिस्तान", ur: "صحرا", ru: "Пустыня", ja: "砂漠", tl: "Desert", zh: "沙漠" }),
};

// Which sub-filters belong to which category (display order).
export const CATEGORY_TAGS: Record<string, string[]> = {
  live_music: ["arabic", "tarab", "jazz", "blues", "rock", "pop", "hip_hop", "rnb", "classical", "latin", "tribute"],
  dj_performance: ["house", "techno", "afro_house", "commercial"],
  sports: ["football", "basketball", "running", "motorsport", "combat", "tennis_padel", "water_sports", "cycling", "golf"],
  food_drink: ["brunch", "wine", "beer", "dining", "food_festival"],
  theater: ["play", "musical", "comedy", "ballet_dance", "opera"],
  arts_culture: ["art", "museum", "film", "books", "heritage", "photography"],
  exhibitions: ["art", "museum", "photography", "heritage", "consumer_show", "trade_show"],
  nightlife: ["club", "bar_lounge", "party"],
  festivals: ["music_festival", "food_festival", "cultural", "seasonal"],
  conferences: ["tech", "trade_show", "health"],
  family_kids: ["kids_show", "attractions"],
  wellness: ["yoga", "fitness"],
  outdoor: ["hiking", "beach", "desert", "cycling"],
};

export function tagLabel(slug: string, locale: string): string {
  const l = TAG_LABELS[slug];
  return l ? l[locale] ?? l.en : slug;
}

export function isTagForCategory(tag: string, categorySlug: string | null | undefined): boolean {
  return !!categorySlug && (CATEGORY_TAGS[categorySlug] ?? []).includes(tag);
}

// Best-effort automatic tags from an event's title/description (used by the
// Ticketmaster import and as a fallback). Only returns tags valid for the
// category. Keep patterns conservative: a missing tag is better than a wrong one.
const TAG_PATTERNS: Record<string, RegExp> = {
  jazz: /\bjazz\b/i,
  blues: /\bblues\b/i,
  rock: /\b(rock|metal|punk|grunge)\b/i,
  hip_hop: /\b(hip[- ]?hop|rap|rapper|trap)\b/i,
  rnb: /\b(r&b|rnb|soul)\b/i,
  classical: /\b(orchestra|symphony|philharmonic|classical|quartet|piano recital|opera gala)\b/i,
  latin: /\b(latin[oa]?|salsa|reggaeton|bachata)\b/i,
  tribute: /\b(tribute|tributo|the music of)\b/i,
  tarab: /(tarab|oriental|طرب|oud|أمسية طرب)/i,
  arabic: /(\barab(ic)?\b|khaleeji|lebanese|egyptian|[؀-ۿ])/i,
  techno: /\btechno\b/i,
  afro_house: /\bafro[- ]?house\b/i,
  house: /\b(deep house|tech house|house music|house rules)\b/i,
  football: /\b(football|soccer|fc)\b/i,
  basketball: /\bbasketball\b/i,
  running: /\b(marathon|\d+\s?k (run|race)|fun run|race\b.*run|run\b)/i,
  motorsport: /\b(grand prix|f1|formula|rally|motorsport|karting|drift)\b/i,
  combat: /\b(ufc|pfl|mma|boxing|fight night|power slap|karate|jiu[- ]?jitsu)\b/i,
  tennis_padel: /\b(tennis|padel)\b/i,
  golf: /\bgolf\b/i,
  cycling: /\b(cycling|cyclists?|bike race|velo)\b/i,
  water_sports: /\b(fishing tournament|regatta|sailing|swim|surf|kayak)\b/i,
  brunch: /\bbrunch\b/i,
  wine: /\b(wine|vinifest|vineyard)\b/i,
  beer: /\b(beer|brew|oktoberfest|hallowbeer)\b/i,
  food_festival: /\b(food festival|taste of|street food|food & heritage)\b/i,
  musical: /\bmusical\b/i,
  comedy: /\b(comedy|comedian|stand[- ]?up)\b/i,
  ballet_dance: /\b(ballet|riverdance|dance show|swan lake|nutcracker)\b/i,
  opera: /\bopera\b(?! house)/i,
  film: /\b(film|cinema|movie|screening)\b/i,
  books: /\b(book fair|book|literature|author|talk)\b/i,
  museum: /\b(museum|louvre)\b/i,
  photography: /\bphotograph/i,
  heritage: /\b(heritage|traditional)\b/i,
  consumer_show: /\b(sale|shopper|shopping|perfume|oud exhibition)\b/i,
  trade_show: /\b(expo|trade show|horeca|industry|forum|b2b)\b/i,
  tech: /\b(tech|gitex|ai\b|digital|startup)\b/i,
  health: /\b(health|medical|wellness conference)\b/i,
  seasonal: /\b(new year|eid|ramadan|christmas|halloween|national day)\b/i,
  music_festival: /\b(music festival|festival of music|music fest)\b/i,
  party: /\b(party|halloween|nye)\b/i,
  yoga: /\b(yoga|meditation)\b/i,
  fitness: /\b(fitness|bootcamp|workout)\b/i,
  hiking: /\b(hike|hiking|trek)\b/i,
  beach: /\bbeach\b/i,
  desert: /\bdesert\b/i,
};

export function inferTags(text: string, categorySlug: string | null | undefined, extra: string[] = []): string[] {
  const allowed = CATEGORY_TAGS[categorySlug ?? ""] ?? [];
  const found = new Set<string>(extra.filter((x) => allowed.includes(x)));
  for (const tag of allowed) {
    const re = TAG_PATTERNS[tag];
    if (re && re.test(text)) found.add(tag);
  }
  return allowed.filter((x) => found.has(x));
}
