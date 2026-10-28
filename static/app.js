const TYPES = [
  { id: "Oyun", label: "Oyun", icon: "i-game" },
  { id: "Uygulama", label: "Uygulama", icon: "i-phone" },
];

const SCOPES = [
  { id: "auto", label: "Otonom (pazar araştırması)", short: "Otonom", desc: "Fırsatları kendisi bulur", icon: "i-spark" },
  { id: "idea", label: "Fikir araştırması", short: "Fikir araştırması", desc: "Yazdığın fikri ve rakiplerini inceler", icon: "i-bulb" },
];

const SORTS = [
  { id: "score_desc", label: "Fırsat puanı (yüksekten)" },
  { id: "score_asc", label: "Fırsat puanı (düşükten)" },
  { id: "evidence", label: "Kanıt sayısı" },
];

const FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "evidence", label: "Kanıta dayalı" },
  { id: "hypothesis", label: "Hipotez" },
];

const STEP_ORDER = ["plan", "search", "score", "save"];

const TONES = {
  red: ["#fdecec", "#e5484d", "⚡"],
  orange: ["#fff1e6", "#f08a24", "📢"],
  blue: ["#eaf4ff", "#53a7f5", "☁"],
  teal: ["#e6f8f6", "#14a38d", "⌁"],
  purple: ["#f4eeff", "#8b5cf6", "✦"],
};

const HUES = {
  green: ["#e5f6ea", "#1f8a46"],
  orange: ["#fff1e4", "#e07a2f"],
  amber: ["#fff6d8", "#c48a10"],
  teal: ["#e5f7f4", "#0f8f7a"],
  red: ["#fdecec", "#e15b4a"],
  blue: ["#e8f0ff", "#3b6fd8"],
  purple: ["#f3e8ff", "#7c4ddb"],
};

const SCOPE_TEXT = {
  auto: "Otonom (pazar araştırması)",
  idea: "Fikir araştırması",
};

const FLOW_FILTERS = [
  { id: "all", label: "Tüm fikirler" },
  { id: "with", label: "Akışı olanlar" },
  { id: "without", label: "Akışı olmayanlar" },
];

const FLOW_IDEAS = [
  { id: "flow-1", title: "Farm Simulation Game", subtitle: "Rahatlatıcı çiftlik simülasyonu", scene: "farm", type: "Oyun", date: "28 Eki 2026", time: "10:48", flow: true, score: 82 },
  { id: "flow-2", title: "Block Puzzle Game", subtitle: "Yenilikçi blok bulmaca", scene: "puzzle", type: "Oyun", date: "27 Eki 2026", time: "16:21", flow: false, score: 76 },
  { id: "flow-3", title: "Hidden Object Game", subtitle: "Saklı nesne bulma oyunu", scene: "search", type: "Oyun", date: "27 Eki 2026", time: "11:03", flow: true, score: 71 },
  { id: "flow-4", title: "Solitaire Game", subtitle: "Çevrimiçi günlük meydan okuma", scene: "cards", type: "Oyun", date: "26 Eki 2026", time: "14:37", flow: false },
  { id: "flow-5", title: "Racing Game", subtitle: "Arcade yarış oyunu", scene: "racing", type: "Oyun", date: "25 Eki 2026", time: "09:12", flow: false, score: 51 },
];

const state = {
  page: "home",
  productType: "Oyun",
  scope: "auto",
  criteria: "",
  sort: "score_desc",
  filter: "all",
  ideas: [],
  selectedId: null,
  sample: true,
  run: null,
  history: [],
  config: { openai: true, model: "gpt-4o", tavily: false, provider: "openai" },
  briefs: {},
  costs: null,
  running: false,
  step: "plan",
  message: "",
  error: "",
  started: 0,
  timer: null,
  expanded: { problems: false, competitors: false, reviews: false },
  sheet: null,
  dossiers: {},
  flow: {
    url: "",
    query: "",
    filter: "all",
    selected: {},
    ideas: FLOW_IDEAS.map((item) => Object.assign({}, item)),
    error: "",
    notice: "",
    menu: null,
    bell: false,
    running: false,
  },
  design: {
    url: "",
    about: "",
    notes: "",
    query: "",
    scope: { quality: true, flow: false, onboarding: true, paywall: false, a11y: false, consistency: false, ux: true, content: false, other: false },
    tab: "ai",
    analyzed: false,
    running: false,
    result: null,
    ranAt: 0,
    error: "",
    bell: false,
  },
  projects: {
    query: "",
    filter: "all",
    sort: "new",
    menu: null,
    creating: false,
    draftTitle: "",
    draftBlurb: "",
    draftKind: "Oyun",
    bell: false,
    items: null,
  },
  home: { query: "", range: "30", bell: false },
};

const SAMPLE = [
  idea({
    id: "sample-1", title: "Farm Simulation Game", subtitle: "Rahatlatıcı çiftlik simülasyonu",
    evidence: "evidence", evidence_count: 650, competitor_count: 12, web_sources: 18, platforms: 2, score: 82, scene: "farm",
    thesis: "Büyük çiftlik oyunları reklam ve kayıp ilerleme yüzünden yoruluyor. Kısa, çevrimdışı ve sakin bir tur için yer var.",
    reviews_grounded: false,
    problems: [
      p("Performans sorunları (donma, yavaşlık)", 28, 182, "red", "Hasat anında kare düşüşü, oturumu yarıda bırakıyor."),
      p("Reklamların fazla olması", 22, 143, "orange", "Ödüllü reklam, birkaç dakikada bir ritmi bölüyor."),
      p("İlerleme kaybı", 16, 104, "blue", "Çökme sonrası ürün ve görev geri sarılamıyor."),
      p("İnternet bağlantısı gerektirmesi", 12, 78, "teal", "Kısa molada açılan oyun, ağ yoksa kapanıyor."),
      p("Yeni içerik yetersizliği", 10, 65, "purple", "İlk haftadan sonra döngü aynı kalıyor."),
    ],
    competitors: [
      c("Hay Day", 4.6, "Güçlü marka", "Sade ve reklamsız tur", "green", "🐔"),
      c("Township", 4.6, "Zengin içerik", "Daha kısa oturum", "orange", "🏡"),
      c("Family Farm", 4.5, "Kolay oynanış", "Daha az menü", "amber", "🚜"),
      c("FarmVille 2", 4.4, "Sadık kullanıcı", "Hafif cihazlar", "teal", "🌻"),
      c("Harvest Land", 4.3, "Düşük reklam", "Çevrimdışı hasat", "red", "🌽"),
    ],
    reviews: [
      r(5, "Oyun çok güzel ama sürekli donuyor. Özellikle hasat yaparken takılıyor ve ilerlemem kayboluyor.", "Hay Day", "12 Eki 2026"),
      r(4, "Reklamlar çok fazla. Her birkaç dakikada bir reklam çıkıyor, bu yüzden oyun keyfi azalıyor.", "Township", "10 Eki 2026"),
      r(3, "İnternet kesilince tarla açılmıyor. Yolculukta oynamak için indirmiştim.", "Family Farm", "8 Eki 2026"),
      r(4, "İlk günler güzel, sonra aynı görevler dönüyor. Yeni bir şey beklerken sıkılıyorum.", "Harvest Land", "6 Eki 2026"),
    ],
  }),
  idea({
    id: "sample-2", title: "Block Puzzle Game", subtitle: "Yenilikçi blok bulmaca",
    evidence: "evidence", evidence_count: 420, competitor_count: 9, web_sources: 14, platforms: 2, score: 76, scene: "puzzle",
    thesis: "Blok bulmacada skor kovalamaca doydu. Az reklamlı, görsel olarak sakin bir tur ayrışabilir.",
    problems: [
      p("Tahtanın erken tıkanması", 30, 120, "red", "İlk hatalı parça oyunu iki dakikada bitiriyor."),
      p("Agresif can ve reklam", 24, 96, "orange", "Devam etmek için reklam izletiliyor."),
      p("Tek düze parçalar", 18, 70, "blue", "Aynı yedi şekil, yüzlerce el boyunca değişmiyor."),
      p("Puanın anlamsızlaşması", 14, 54, "teal", "Rekor dışında hedeflenen bir şey yok."),
      p("Görsel kalabalık", 11, 40, "purple", "Efektler, tahtayı okumayı zorlaştırıyor."),
    ],
    competitors: [
      c("Block Blast", 4.7, "Hızlı tur", "Daha az reklam", "green"),
      c("Woodoku", 4.6, "Sakin tahta", "Günlük hedef", "orange"),
      c("1010!", 4.5, "Klasik kural", "Yeni parça ritmi", "amber"),
      c("Blockudoku", 4.4, "Sudoku karışımı", "Daha açık tahta", "teal"),
      c("Sand Blast", 4.2, "Gevşek tempo", "Kısa seans", "red"),
    ],
    reviews: [
      r(4, "Bir hata yapınca tahta kapanıyor, devam etmek için reklam çıkıyor.", "Block Blast", "11 Eki 2026"),
      r(5, "Tahta güzel ama birkaç gün sonra aynı his.", "Woodoku", "9 Eki 2026"),
    ],
  }),
  idea({
    id: "sample-3", title: "Hidden Object Game", subtitle: "Saklı nesne bulma oyunu",
    evidence: "evidence", evidence_count: 380, competitor_count: 8, web_sources: 12, platforms: 2, score: 71, scene: "search",
    thesis: "Saklı nesne oyunları enerji ve ipucu satıyor. Zaman baskısız, kısa sahneli bir sürüm eksik.",
    problems: [
      p("Enerji bitmesi", 26, 98, "red", "Üç sahne sonra bekleme veya ödeme istiyor."),
      p("İpucu bağımlılığı", 20, 77, "orange", "Zor sahnede ipucu bitince ilerleme duruyor."),
      p("Küçük hedefler", 16, 61, "blue", "Telefonda nesne ayırt etmek yoruyor."),
      p("Hikayenin kopması", 13, 44, "teal", "Diyaloglar sahne arasına sıkışıyor."),
      p("Ağır indirme", 10, 36, "purple", "İlk sahne için büyük paket iniyor."),
    ],
    competitors: [
      c("June's Journey", 4.6, "Güçlü hikaye", "Daha kısa sahne", "green"),
      c("Hidden Hotel", 4.4, "Tanıdık mekan", "Enerjisiz tur", "orange"),
      c("Seekers Notes", 4.5, "Zengin sahne", "Daha büyük hedef", "amber"),
      c("Pearl's Peril", 4.3, "Macera tonu", "Hafif paket", "teal"),
      c("Criminal Case", 4.4, "Bölümlük yapı", "Sakin tempo", "red"),
    ],
    reviews: [
      r(3, "Enerji bitince bırakıyorum. Beş dakikalık araya sığmıyor.", "June's Journey", "7 Eki 2026"),
      r(4, "Sahneler güzel, nesneler çok küçük kalıyor.", "Hidden Hotel", "5 Eki 2026"),
    ],
  }),
  idea({
    id: "sample-4", title: "Merge Game", subtitle: "Birleştirme ve keşif oyunu",
    evidence: "evidence", evidence_count: 310, competitor_count: 7, web_sources: 10, platforms: 2, score: 68, scene: "merge",
    thesis: "Birleştirme oyunları ada ve enerji duvarına dayanıyor. Tek ekranlık, reklamsız bir döngü denenebilir.",
    problems: [
      p("Enerji bekleme", 27, 88, "red", "Birleştirme birkaç dakikada kilide giriyor."),
      p("Alan dolması", 18, 64, "orange", "Tahta dolunca zorunlu satış başlıyor."),
      p("Görev enflasyonu", 15, 51, "blue", "İstenen parça, eldeki seviyenin çok üstünde."),
      p("Anlaşılmaz sipariş", 12, 39, "teal", "Ne üreteceği menünün içinde kayboluyor."),
      p("Sürekli etkinlik", 9, 28, "purple", "Sınırlı süre baskısı sakin oyuncuyu kaçırıyor."),
    ],
    competitors: [
      c("Merge Dragons", 4.5, "Derin tahta", "Kısa tur", "green"),
      c("Merge Mansion", 4.4, "Hikaye", "Daha az bekleme", "orange"),
      c("EverMerge", 4.3, "Ada keşfi", "Tek ekran", "amber"),
      c("Merge County", 4.2, "Çiftlik karışımı", "Sade görev", "teal"),
      c("Love & Pies", 4.5, "Güçlü tema", "Reklamsız tempo", "red"),
    ],
    reviews: [
      r(3, "Beş birleştirmeden sonra enerji bitiyor.", "Merge Mansion", "4 Eki 2026"),
      r(4, "Tahta hoş ama görevler şişiyor.", "EverMerge", "2 Eki 2026"),
    ],
  }),
  idea({
    id: "sample-5", title: "Tower Defense Game", subtitle: "Strateji savunma oyunu",
    evidence: "hypothesis", evidence_count: 120, competitor_count: 6, web_sources: 8, platforms: 2, score: 61, scene: "defense",
    thesis: "Kule savunması ya çok sert ya da çok yavaş. On dakikalık, tek elle oynanan bir harita boşluğu hipotezi.",
    problems: [
      p("Uzun tur süresi", 24, 40, "red", "Bir harita yirmi dakikayı geçiyor."),
      p("Karmaşık yükseltme", 18, 28, "orange", "Ağaçtaki seçenek ilk turda okunmuyor."),
      p("Zorluk sıçraması", 14, 22, "blue", "Üçüncü dalga, hazırlıksız oyuncuyu eliyor."),
      p("Kontrol kalabalığı", 11, 16, "teal", "Küçük ekranda kule seçmek zor."),
      p("Tekrarlayan harita", 9, 12, "purple", "Aynı yol, farklı renk ile geri geliyor."),
    ],
    competitors: [
      c("Kingdom Rush", 4.7, "Net dalga", "Daha kısa harita", "green"),
      c("Bloons TD", 4.6, "Derin strateji", "Tek el", "orange"),
      c("Arknights", 4.5, "Koleksiyon", "Az sistem", "amber"),
      c("Plant vs Zombies", 4.4, "Rahat tempo", "Yeni yol düzeni", "teal"),
      c("Rush Royale", 4.2, "Hızlı maç", "Sakin kule", "red"),
    ],
    reviews: [
      r(4, "Harita güzel ama bir tur çok uzun sürüyor.", "Kingdom Rush", "3 Eki 2026"),
      r(3, "Yükseltmeler ilk bakışta anlaşılmıyor.", "Bloons TD", "1 Eki 2026"),
    ],
  }),
  idea({
    id: "sample-6", title: "Word Game", subtitle: "Kelime bulmaca oyunu",
    evidence: "hypothesis", evidence_count: 95, competitor_count: 5, web_sources: 5, platforms: 2, score: 57, scene: "word",
    thesis: "Günlük kelime oyunu kalabalık. Daha uzun oturum isteyen, reklamsız bir ızgara hipotez olarak duruyor.",
    problems: [
      p("Tek bulmaca sınırı", 22, 30, "red", "Gün bitince yarın bekleniyor."),
      p("İpucu reklamı", 16, 24, "orange", "Harf açmak videoya bağlı."),
      p("Zor kelime duvarı", 13, 18, "blue", "Nadir kelime, gündelik oyuncuyu kırıyor."),
      p("Arkadaş baskısı", 10, 14, "teal", "Seri kaybı, oyunu bırakmaya yol açıyor."),
      p("Kısa tur", 8, 11, "purple", "İki dakikada biten oyun, akşam oturumuna yetmiyor."),
    ],
    competitors: [
      c("Wordle", 4.8, "Günlük ritüel", "Uzun oturum", "green"),
      c("Words With Friends", 4.4, "Sosyal tur", "Tek kişilik derinlik", "orange"),
      c("CodyCross", 4.6, "Tema dünyası", "Daha az ipucu duvarı", "amber"),
      c("Wordscapes", 4.5, "Rahat ızgara", "Reklamsız akşam", "teal"),
      c("SpellTower", 4.3, "Sade tahta", "Günlük hedef", "purple"),
    ],
    reviews: [
      r(5, "Bir bulmacadan sonra bitecek bir şey kalmıyor.", "Wordle", "29 Eyl 2026"),
      r(4, "İpucu için reklam çıkması ritmi bozuyor.", "Wordscapes", "27 Eyl 2026"),
    ],
  }),
  idea({
    id: "sample-7", title: "Number Puzzle Game", subtitle: "Sayı bulmaca oyunu",
    evidence: "hypothesis", evidence_count: 80, competitor_count: 5, web_sources: 4, platforms: 2, score: 54, scene: "numbers",
    thesis: "2048 türevleri aynı kaydırmayı tekrarlıyor. Hedefli, kısa ve geri alınabilir bir sayı turu hipotezi.",
    problems: [
      p("Şans duvarı", 21, 26, "red", "Kötü bir kaydırma, turu bitiriyor."),
      p("Geri alma yok", 15, 19, "orange", "Tek hata, on dakikayı siliyor."),
      p("Aynı tahta", 12, 15, "blue", "Görünüş değişse de kural aynı."),
      p("Belirsiz hedef", 9, 10, "teal", "Rekor dışında bugünün işi yok."),
      p("Reklam arası", 8, 9, "purple", "Oyun biter bitmez tam ekran reklam açılıyor."),
    ],
    competitors: [
      c("2048", 4.6, "Net kural", "Geri alma", "green"),
      c("Threes", 4.5, "Zarif tempo", "Günlük hedef", "orange"),
      c("Sudoku.com", 4.7, "Geniş kitle", "Daha kısa ızgara", "amber"),
      c("Numberzilla", 4.3, "Rahat sayılar", "Yeni birleşme", "teal"),
      c("Good Sudoku", 4.6, "Temiz arayüz", "Daha oyunsu tur", "blue"),
    ],
    reviews: [
      r(4, "Bir yanlış kaydırma her şeyi bitiriyor, geri alamıyorum.", "2048", "21 Eyl 2026"),
      r(5, "Sade ve güzel, ama her tur aynı.", "Threes", "18 Eyl 2026"),
    ],
  }),
  idea({
    id: "sample-8", title: "Racing Game", subtitle: "Arcade yarış oyunu",
    evidence: "hypothesis", evidence_count: 70, competitor_count: 6, web_sources: 4, platforms: 2, score: 51, scene: "racing",
    thesis: "Mobil yarış ya simülasyon ya da kasa açma. Üç dakikalık, yükseltmesiz arcade tur hipotezi.",
    problems: [
      p("Kasa ve bekleme", 20, 22, "red", "Yeni araba için saatlerce bekleniyor."),
      p("Kontrol hassasiyeti", 14, 16, "orange", "Parmak kayınca duvar cezası ağır."),
      p("Ağ zorunluluğu", 11, 12, "blue", "Tek tur için sunucu aranıyor."),
      p("Uzun yükleme", 9, 10, "teal", "Garaj, yarıştan uzun sürüyor."),
      p("Pist tekrarı", 8, 8, "purple", "Üç pist, onlarca menü ile dönüyor."),
    ],
    competitors: [
      c("Asphalt", 4.5, "Görsel şov", "Kısa tur", "green"),
      c("Real Racing", 4.4, "Simülasyon", "Daha arcade", "orange"),
      c("Mario Kart Tour", 4.3, "Tanıdık his", "Yükseltmesiz", "red"),
      c("Horizon Chase", 4.6, "Retro tempo", "Yeni pist ritmi", "teal"),
      c("CSR Racing", 4.2, "Koleksiyon", "Beklemesiz garaj", "purple"),
    ],
    reviews: [
      r(3, "Yarış kısa, kasa ekranı uzun.", "CSR Racing", "14 Eyl 2026"),
      r(4, "Direksiyon hassas, küçük bir kayma turu bitiriyor.", "Asphalt", "12 Eyl 2026"),
    ],
  }),
];

function idea(fields) {
  return Object.assign({ reviews_grounded: false, platforms: 2, category: "Oyun" }, fields);
}
function p(title, pct, reviews, tone, detail) {
  return { title, pct, reviews, tone, detail };
}
function c(name, rating, note, gap, hue, mark) {
  return { name, rating, note, gap, hue, mark: mark || "" };
}
function r(stars, text, source, date) {
  return { stars, text, source, date };
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function prose(value) {
  return String(value || "").split(/\n{2,}/).filter(Boolean).map((part) => `<p>${esc(part).replace(/\n/g, "<br>")}</p>`).join("");
}

function n(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("tr-TR").format(num);
}

function rating(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "–";
  return num.toFixed(1).replace(".", ",");
}

function stars(count) {
  const c = Math.max(0, Math.min(5, Math.round(Number(count) || 0)));
  return `<b>${"★".repeat(c)}</b>${"★".repeat(5 - c)}`;
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch (err) { /* geçersiz adres */ }
  return "";
}

function currentIdea() {
  return state.ideas.find((item) => item.id === state.selectedId) || state.ideas[0] || null;
}

function visibleIdeas() {
  let items = state.ideas.map((idea, index) => ({ idea, index }));
  if (state.filter === "evidence") items = items.filter((item) => item.idea.evidence === "evidence");
  if (state.filter === "hypothesis") items = items.filter((item) => item.idea.evidence === "hypothesis");
  items.sort((a, b) => {
    if (state.sort === "score_asc") return a.idea.score - b.idea.score;
    if (state.sort === "evidence") return b.idea.evidence_count - a.idea.evidence_count;
    return b.idea.score - a.idea.score;
  });
  return items;
}

function iconHtml(scene) {
  if (scene === "numbers") return `<div class="mini mini-numbers"><b>8</b><b>2</b><b>4</b><b>8</b></div>`;
  if (scene === "word") return `<div class="mini mini-word">W</div>`;
  const icons = {
    farm: ["🏡", "#e7f6d8"], puzzle: ["🧩", "#e7eeff"], search: ["🔍", "#fff4d8"],
    merge: ["🧱", "#fff0e6"], defense: ["🏰", "#e7f0ff"], racing: ["🚗", "#ffecec"],
    app: ["📱", "#e7f6f2"], health: ["🌿", "#e5f6ea"], finance: ["💳", "#e8f0ff"],
    learn: ["📚", "#fff4e5"], social: ["💬", "#fdecf5"], tool: ["🛠️", "#f2f4f7"],
  };
  const [glyph, bg] = icons[scene] || icons.app;
  return `<div class="mini" style="background:${bg}">${glyph}</div>`;
}

function heroSvg(scene) {
  if (scene === "farm") return farmSvg();
  const palettes = {
    puzzle: ["#6e8bff", "#f7c948", "#7d6bff"],
    search: ["#f6c56b", "#8d6a43", "#fff4d2"],
    merge: ["#ffb085", "#7bc96a", "#8eb6ff"],
    defense: ["#8eb6ff", "#35507a", "#d5e4ff"],
    word: ["#7c4ddb", "#2a2252", "#e7d9ff"],
    numbers: ["#243044", "#f6c453", "#f27d6b"],
    racing: ["#ff8b7b", "#1c2430", "#ffe08a"],
    app: ["#7dcec3", "#e7f6f2", "#1c8c46"],
    health: ["#8ed1a5", "#e7f6ee", "#1c8c46"],
    finance: ["#8eb6ff", "#e8f0ff", "#3b6fd8"],
    learn: ["#f0c27a", "#fff4e5", "#c48a10"],
    social: ["#f3a6c8", "#fdecf5", "#c24173"],
    tool: ["#c5ced8", "#f4f6f8", "#3e4c5f"],
  };
  const [a, b, c] = palettes[scene] || palettes.app;
  return `<svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="g-${scene}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient></defs>
    <rect width="800" height="220" fill="url(#g-${scene})"/>
    <circle cx="640" cy="48" r="28" fill="${c}" opacity="0.9"/>
    <circle cx="150" cy="160" r="70" fill="#fff" opacity="0.18"/>
    <circle cx="390" cy="150" r="90" fill="#fff" opacity="0.14"/>
    <rect x="80" y="78" width="70" height="70" rx="16" fill="#fff" opacity="0.85"/>
    <rect x="166" y="96" width="52" height="52" rx="14" fill="${c}"/>
    <rect x="232" y="70" width="64" height="78" rx="16" fill="#fff" opacity="0.75"/>
  </svg>`;
}

function farmSvg() {
  return `<svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="farm-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8fd3f4"/><stop offset="1" stop-color="#e5f7ff"/>
      </linearGradient>
    </defs>
    <rect width="800" height="220" fill="url(#farm-sky)"/>
    <circle cx="655" cy="46" r="24" fill="#ffe08a"/>
    <ellipse cx="150" cy="48" rx="42" ry="16" fill="#fff"/>
    <ellipse cx="184" cy="46" rx="28" ry="14" fill="#fff"/>
    <ellipse cx="430" cy="62" rx="36" ry="13" fill="#fff" opacity="0.9"/>
    <path d="M0 150 C140 120 260 168 420 146 C560 128 680 160 800 138 V220 H0 Z" fill="#b7e38a"/>
    <path d="M0 176 C180 156 320 196 520 170 C650 156 730 180 800 168 V220 H0 Z" fill="#7fbf55"/>
    <g transform="translate(250,92)">
      <polygon points="8,28 58,0 108,28" fill="#f7f9fc"/>
      <rect x="18" y="28" width="80" height="58" rx="3" fill="#e15b4a"/>
      <rect x="46" y="52" width="24" height="34" fill="#f6e7c1"/>
      <path d="M24 40 H92 M58 34 V70" stroke="#fff" stroke-width="3"/>
      <rect x="28" y="40" width="14" height="12" fill="#f8e7b0"/>
    </g>
    <g transform="translate(470,108)">
      <rect x="-4" y="8" width="8" height="52" fill="#f4efe4"/>
      <g stroke="#f7f4ea" stroke-width="4" stroke-linecap="round">
        <path d="M0 8 V-24 M0 8 H28 M0 8 H-28 M0 8 L18 26 M0 8 L-18 26"/>
      </g>
      <polygon points="-16,-28 0,-48 16,-28" fill="#e15b4a"/>
      <circle cy="8" r="5" fill="#e7d7b8"/>
    </g>
    <g fill="#6eae45">
      <circle cx="80" cy="150" r="18"/><rect x="76" y="150" width="8" height="22" fill="#8a5a32"/>
      <circle cx="620" cy="156" r="16"/><rect x="616" y="156" width="7" height="18" fill="#8a5a32"/>
    </g>
    <g stroke="#f4efe4" stroke-width="4">
      <path d="M560 184 v18 M580 180 v22 M600 184 v18"/>
    </g>
  </svg>`;
}

function renderList() {
  const list = document.getElementById("idea-list");
  const items = visibleIdeas();
  const top = list.scrollTop;
  if (!items.length) {
    list.innerHTML = `<div class="empty">Bu filtrede fikir yok.</div>`;
    return;
  }
  list.innerHTML = items.map(({ idea }) => `
    <div class="idea ${idea.id === state.selectedId ? "active" : ""}" data-id="${esc(idea.id)}">
      ${iconHtml(idea.scene)}
      <span class="idea-main">
        <span class="idea-top">
          <span class="idea-title">${esc(idea.title)}</span>
          <span class="tag">${esc(idea.category || state.productType)}</span>
          <span class="tag ${idea.evidence === "evidence" ? "evidence" : "hypothesis"}">${idea.evidence === "evidence" ? "Kanıta dayalı" : "Hipotez"}</span>
        </span>
        <span class="idea-sub">${esc(idea.subtitle)}</span>
        <span class="idea-stats">
          <span class="meta"><svg class="ic xs"><use href="#i-chat"></use></svg>${n(idea.evidence_count)} kanıt</span>
          <span class="meta"><svg class="ic xs"><use href="#i-grid"></use></svg>${n(idea.competitor_count)} rakip</span>
          <span class="meta"><svg class="ic xs"><use href="#i-globe"></use></svg>${n(idea.web_sources)} web kaynağı</span>
        </span>
      </span>
      <span class="idea-side">
        <span class="idea-actions">
          <button type="button" class="decide approve ${idea.verdict === "approved" ? "is-on" : ""}" data-approve="${esc(idea.id)}">Onayla</button>
          <button type="button" class="decide reject ${idea.verdict === "rejected" ? "is-on" : ""}" data-reject="${esc(idea.id)}">Red</button>
        </span>
        <span class="idea-score">${n(idea.score)}<span>/100</span></span>
      </span>
      <svg class="ic go"><use href="#i-chevron"></use></svg>
    </div>
  `).join("");
  list.scrollTop = top;
}

function renderDetail() {
  const root = document.getElementById("detail");
  const idea = currentIdea();
  if (!idea) {
    root.innerHTML = `<div class="empty">Bir fikir seç.</div>`;
    return;
  }
  const maxPct = Math.max(...(idea.problems || []).map((item) => item.pct), 1);
  const reviewTitle = state.sample
    ? "Örnek kullanıcı yorumları"
    : (idea.reviews_grounded ? "Gerçek kullanıcı yorumları" : "Yorum temaları");
  const reviews = (idea.reviews || []).slice(0, 2);
  const rivals = idea.competitors || [];
  root.innerHTML = `
    <div class="hero">
      ${heroSvg(idea.scene)}
      <span class="hero-badge ${idea.evidence === "evidence" ? "" : "hypothesis"}">${idea.evidence === "evidence" ? "Kanıta dayalı" : "Hipotez"}</span>
    </div>
    <div class="detail-head">
      <div>
        <h2 class="detail-title">${esc(idea.title)}</h2>
        <p class="detail-sub">${esc(idea.subtitle)}</p>
      </div>
      <div class="score-block"><div><b>${n(idea.score)}</b><span>/100</span></div><small>Fırsat puanı</small></div>
    </div>
    <div class="stats-row">
      <div class="stats">
        ${stat("chat", idea.evidence_count, "Kullanıcı kanıtı")}
        ${stat("grid", idea.competitor_count, "Rakip uygulama")}
        ${stat("globe", idea.web_sources, "Web kaynağı")}
        ${stat("phone", idea.platforms, "Platform")}
      </div>
      <button type="button" class="report-btn" data-expand="report">Analizin tamamı <span aria-hidden="true">→</span></button>
    </div>
    <div class="section-head">
      <h3>Kullanıcıların temel sorunları</h3>
    </div>
    ${(idea.problems || []).map((item) => problemRow(item, maxPct)).join("") || `<p class="list-caption">Bu fikir için sorun başlığı çıkmadı.</p>`}
    <div class="section-head">
      <h3>Rakip analizi</h3>
    </div>
    <div class="rivals">
      ${rivals.map((item) => rivalCard(item)).join("")}
    </div>
    <div class="section-head">
      <h3>${reviewTitle}</h3>
    </div>
    <div class="quotes">${reviews.map((item) => quoteCard(item)).join("") || `<p class="list-caption">Yorum teması yok.</p>`}</div>
    ${decisionBlock(idea)}
    ${sourcesBlock()}
  `;
}

function stat(kind, value, label) {
  const icon = { chat: "i-chat", grid: "i-grid", globe: "i-globe", phone: "i-phone" }[kind];
  return `<div class="stat"><span class="stat-ic ${kind}"><svg class="ic"><use href="#${icon}"></use></svg></span><b>${n(value)}</b><span>${label}</span></div>`;
}

function problemRow(item, maxPct) {
  const tone = TONES[item.tone] || TONES.orange;
  const width = Math.max(8, Math.round((Number(item.pct) / maxPct) * 100));
  return `<div class="problem">
    <span class="dot" style="background:${tone[0]};color:${tone[1]}">${tone[2]}</span>
    <span class="problem-title">${esc(item.title)}</span>
    <span class="bar"><i style="width:${width}%;background:${tone[1]}"></i></span>
    <span class="pct">%${n(item.pct)}</span>
    <span class="reviews-n">${n(item.reviews)} yorum</span>
  </div>`;
}

function rivalCard(item) {
  const hue = HUES[item.hue] || HUES.green;
  const mark = item.mark || esc(String(item.name || "?").slice(0, 1).toUpperCase());
  return `<div class="rival">
    <div class="avatar" style="background:${hue[0]};color:${hue[1]}">${item.mark ? esc(item.mark) : mark}</div>
    <strong>${esc(item.name)}</strong>
    <div class="rate"><b>★</b> ${rating(item.rating)}</div>
    <small>${esc(item.note)}</small>
  </div>`;
}

function openSheet(kind) {
  state.sheet = kind || "problems";
  const idea = currentIdea();
  renderSheet();
  ensureDossier(idea);
  ensureBrief(idea);
}

function closeSheet() {
  state.sheet = null;
  renderSheet();
}

function renderSheet(options) {
  const root = document.getElementById("fullpage");
  const idea = currentIdea();
  if (!root) return;
  if (!state.sheet || !idea) {
    root.hidden = true;
    root.innerHTML = "";
    document.body.classList.remove("sheet-open");
    return;
  }
  const keepScroll = options && options.keepScroll;
  const previous = keepScroll ? root.querySelector(".full-scroll") : null;
  const top = previous ? previous.scrollTop : 0;
  document.body.classList.add("sheet-open");
  root.hidden = false;
  root.innerHTML = `
    <header class="full-head">
      <button type="button" class="full-back" data-close-sheet>← Panele dön</button>
      <div class="full-copy">
        <p class="page-kicker">${esc(idea.category || state.productType)}</p>
        <h2>${esc(idea.title)}</h2>
        <p>${esc(idea.subtitle || "")}</p>
      </div>
    </header>
    <div class="full-scroll"><div class="full-wrap">${fullReport(idea)}</div></div>
  `;
  const scroller = root.querySelector(".full-scroll");
  if (scroller) scroller.scrollTop = keepScroll ? top : 0;
}

function fullReport(idea) {
  const reviewTitle = state.sample
    ? "Örnek kullanıcı yorumları"
    : (idea.reviews_grounded ? "Gerçek kullanıcı yorumları" : "Yorum temaları");
  return `
    <div class="full-score">
      <div>
        <span class="tag ${idea.evidence === "evidence" ? "evidence" : "hypothesis"}">${idea.evidence === "evidence" ? "Kanıta dayalı" : "Hipotez"}</span>
        ${idea.thesis ? `<p class="full-thesis">${esc(idea.thesis)}</p>` : ""}
      </div>
      <div class="score-block"><div><b>${n(idea.score)}</b><span>/100</span></div><small>Fırsat puanı</small></div>
    </div>
    <div class="stats full-stats">
      ${stat("chat", idea.evidence_count, "Kullanıcı kanıtı")}
      ${stat("grid", idea.competitor_count, "Rakip uygulama")}
      ${stat("globe", idea.web_sources, "Web kaynağı")}
      ${stat("phone", idea.platforms, "Platform")}
    </div>
    <section class="full-section" id="sheet-problems">
      <h3>Kullanıcıların temel sorunları</h3>
      ${problemsPage(idea)}
    </section>
    <section class="full-section" id="sheet-competitors">
      <h3>Rakip analizi</h3>
      ${competitorsPage(idea)}
    </section>
    <section class="full-section" id="sheet-reviews">
      <h3>${reviewTitle}</h3>
      ${reviewsPage(idea)}
    </section>
    ${decisionBlock(idea)}
    ${productPlan(idea)}
    ${sourcesBlock()}
  `;
}

function problemsPage(idea) {
  const problems = idea.problems || [];
  const dossier = state.dossiers[idea.id];
  const items = dossier && dossier.status === "ready" ? dossier.data.items || [] : [];
  const totalReviews = problems.reduce((sum, item) => sum + (Number(item.reviews) || 0), 0);
  const maxPct = Math.max(...problems.map((item) => Number(item.pct) || 0), 1);
  const note = !dossier || dossier.status === "loading"
    ? `<section class="full-note">OpenAI her sorun için ayrıntılı dosyayı yazıyor. Paylar ve kısa notlar hemen aşağıda.</section>`
    : dossier.status === "error"
      ? `<section class="full-note is-error"><p>${esc(dossier.error)}</p><button type="button" class="text-btn" data-retry-dossier>Tekrar dene</button></section>`
      : "";
  const overview = dossier && dossier.status === "ready" && dossier.data.overview
    ? `<section class="full-overview"><p class="decision-kicker">OpenAI özeti</p>${prose(dossier.data.overview)}</section>`
    : "";
  const cards = problems.map((item, index) => problemCard(item, items[index], maxPct)).join("");
  return `
    <p class="full-meta">${n(problems.length)} sorun · ${n(totalReviews)} yorum</p>
    ${note}
    ${overview}
    ${cards || `<p class="list-caption">Bu fikir için sorun başlığı çıkmadı.</p>`}
  `;
}

function problemCard(item, detail, maxPct) {
  const tone = TONES[item.tone] || TONES.orange;
  const width = Math.max(8, Math.round((Number(item.pct) / maxPct) * 100));
  const written = detail && (detail.what || detail.where || detail.why_it_matters || detail.what_to_build);
  const block = (label, text) => text ? `<h4>${label}</h4>${prose(text)}` : "";
  const body = written
    ? `${block("Ne oluyor", detail.what)}${block("Nerede ortaya çıkıyor", detail.where)}${block("Neden önemli", detail.why_it_matters)}${block("İlk sürümde ne yapmalı", detail.what_to_build)}`
    : (item.detail ? `<p class="issue-pending">${esc(item.detail)}</p>` : "");
  return `<article class="issue-card">
    <header class="issue-head">
      <span class="dot" style="background:${tone[0]};color:${tone[1]}">${tone[2]}</span>
      <div>
        <h3>${esc(item.title)}</h3>
        <p>${n(item.reviews)} yorum</p>
      </div>
      <b>%${n(item.pct)}</b>
    </header>
    <span class="bar issue-bar"><i style="width:${width}%;background:${tone[1]}"></i></span>
    ${body}
  </article>`;
}

function competitorsPage(idea) {
  const rivals = idea.competitors || [];
  const cards = rivals.map((item) => {
    const hue = HUES[item.hue] || HUES.green;
    const mark = item.mark || esc(String(item.name || "?").slice(0, 1).toUpperCase());
    return `<article class="issue-card rival-card">
      <header class="issue-head">
        <span class="avatar" style="background:${hue[0]};color:${hue[1]}">${item.mark ? esc(item.mark) : mark}</span>
        <div>
          <h3>${esc(item.name)}</h3>
          <p>${esc(item.note || "Konum notu yok")}</p>
        </div>
        <b class="rate"><span>★</span> ${rating(item.rating)}</b>
      </header>
      <h4>Bu rakibe karşı boşluk</h4>
      <p>${esc(item.gap || "Boşluk notu yok.")}</p>
    </article>`;
  }).join("");
  return `
    <p class="full-meta">${n(rivals.length)} rakip</p>
    <div class="rivals full-rivals">${rivals.map((item) => rivalCard(item)).join("")}</div>
    ${cards || `<p class="list-caption">Rakip çıkmadı.</p>`}
  `;
}

function reviewsPage(idea) {
  const reviews = idea.reviews || [];
  return `
    <p class="full-meta">${n(reviews.length)} kayıt</p>
    <div class="full-quotes">${reviews.map((item) => quoteCard(item)).join("") || `<p class="list-caption">Yorum teması yok.</p>`}</div>
  `;
}

function ensureDossier(idea) {
  if (!idea || !(idea.problems || []).length) return;
  const current = state.dossiers[idea.id];
  if (current && (current.status === "loading" || current.status === "ready")) return;
  state.dossiers[idea.id] = { status: "loading" };
  const payload = {
    title: idea.title,
    subtitle: idea.subtitle || "",
    category: idea.category || "",
    score: Number(idea.score) || 0,
    thesis: idea.thesis || "",
    problems: (idea.problems || []).slice(0, 5),
    competitors: (idea.competitors || []).slice(0, 10),
    reviews: (idea.reviews || []).slice(0, 6),
  };
  fetch("/api/problems", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    if (!response.ok) {
      let message = "Sorun dosyası yazılamadı";
      try {
        const body = await response.json();
        if (typeof body.detail === "string") message = body.detail;
      } catch (err) { /* gövde json değil */ }
      throw new Error(message);
    }
    return response.json();
  }).then((data) => {
    state.dossiers[idea.id] = { status: "ready", data };
    if (state.sheet && state.selectedId === idea.id) renderSheet({ keepScroll: true });
  }).catch((err) => {
    state.dossiers[idea.id] = { status: "error", error: err.message || "Sorun dosyası yazılamadı" };
    if (state.sheet && state.selectedId === idea.id) renderSheet({ keepScroll: true });
  });
}

function quoteCard(item) {
  return `<article class="quote"><div class="stars" aria-label="${n(item.stars)} yıldız">${stars(item.stars)}</div><p>${esc(item.text)}</p><footer><span>${esc(item.source)}</span><span>${esc(item.date)}</span></footer></article>`;
}

function productPlan(idea) {
  const cached = state.briefs[idea.id];
  const data = cached && cached.status === "ready" ? cached.data : null;
  const sections = data && data.app_sections ? data.app_sections : [];
  if (!data || !data.app_concept) {
    if (cached && cached.status === "error") {
      return `<section class="full-section"><h3>Bizim yapacağımız uygulama</h3><section class="full-note is-error"><p>${esc(cached.error)}</p><button type="button" class="text-btn" data-retry-brief>Tekrar dene</button></section></section>`;
    }
    return `<section class="full-section"><h3>Bizim yapacağımız uygulama</h3><section class="full-note">OpenAI, bizim çıkaracağımız uygulamayı ve içinde neler olacağını yazıyor.</section></section>`;
  }
  const cards = sections.map((item) => `<article class="issue-card">
    <header class="issue-head"><div><h3>${esc(item.title)}</h3></div></header>
    ${prose(item.detail)}
  </article>`).join("");
  return `<section class="full-section" id="sheet-product">
    <h3>Bizim yapacağımız uygulama</h3>
    <section class="full-overview">${prose(data.app_concept)}</section>
    ${cards ? `<h3>Uygulamada neler olacak</h3>${cards}` : ""}
  </section>`;
}

function decisionSource(idea) {
  const cached = state.briefs[idea.id];
  if (cached && cached.status === "ready") return cached.data;
  if ((idea.score_reason || "").length > 280 && (idea.why_build || "").length > 180) return idea;
  return null;
}

function decisionBlock(idea) {
  const cached = state.briefs[idea.id];
  const source = decisionSource(idea);
  if (!source) {
    if (cached && cached.status === "error") {
      return `<section class="decision is-wait"><h3>Değerlendirme yazılamadı</h3><p>${esc(cached.error)}</p><button type="button" class="text-btn" data-retry-brief>Tekrar dene</button></section>`;
    }
    return `<section class="decision is-wait"><h3>OpenAI yazıyor</h3><p>Puan gerekçesi, yapılma nedeni, avantajlar, rakip farkı ve özellikler bu fikir için hazırlanıyor.</p></section>`;
  }
  const advantages = source.advantages || [];
  const features = source.features || [];
  const list = (items) => items.map((item) => `<li>${esc(item)}</li>`).join("");
  return `<section class="decision">
    <p class="decision-kicker">OpenAI değerlendirmesi</p>
    ${source.score_reason ? `<h3>Neden bu puan</h3>${prose(source.score_reason)}` : ""}
    ${source.why_build ? `<h3>Neden yapmalıyız</h3>${prose(source.why_build)}` : ""}
    ${advantages.length ? `<h3>Avantajlar</h3><ul>${list(advantages)}</ul>` : ""}
    ${source.difference ? `<h3>Diğer uygulamalardan farkı</h3>${prose(source.difference)}` : ""}
    ${features.length ? `<h3>Olması gereken özellikler</h3><ul>${list(features)}</ul>` : ""}
  </section>`;
}

function ensureBrief(idea) {
  if (!idea) return;
  const current = state.briefs[idea.id];
  if (current && (current.status === "loading" || (current.status === "ready" && current.data && current.data.app_concept))) return;
  state.briefs[idea.id] = { status: "loading" };
  const payload = {
    title: idea.title,
    subtitle: idea.subtitle || "",
    category: idea.category || "",
    score: Number(idea.score) || 0,
    thesis: idea.thesis || "",
    score_reason: idea.score_reason || "",
    why_build: idea.why_build || "",
    difference: idea.difference || "",
    advantages: (idea.advantages || []).slice(0, 6),
    features: (idea.features || []).slice(0, 6),
    reviews_grounded: idea.reviews_grounded === true,
    problems: (idea.problems || []).slice(0, 5),
    competitors: (idea.competitors || []).slice(0, 10),
  };
  fetch("/api/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    if (!response.ok) {
      let message = "OpenAI değerlendirmesi yazılamadı";
      try {
        const body = await response.json();
        if (typeof body.detail === "string") message = body.detail;
      } catch (err) { /* gövde json değil */ }
      throw new Error(message);
    }
    return response.json();
  }).then((data) => {
    state.briefs[idea.id] = { status: "ready", data };
    if (state.selectedId === idea.id) {
      renderDetail();
      if (state.sheet) renderSheet({ keepScroll: true });
    }
  }).catch((err) => {
    state.briefs[idea.id] = { status: "error", error: err.message || "OpenAI değerlendirmesi yazılamadı" };
    if (state.selectedId === idea.id) {
      renderDetail();
      if (state.sheet) renderSheet({ keepScroll: true });
    }
  });
}

function sourcesBlock() {
  const sources = (state.run && state.run.sources) || [];
  if (state.sample) {
    return `<div class="sources-block"><strong>Kaynaklar</strong><p>Bu ekran örnek düzendir. Keşfi başlat deyince ajan canlı kaynak arar.</p></div>`;
  }
  if (!sources.length) {
    return `<div class="sources-block"><strong>Kaynaklar</strong><p>${esc(providerLabel())}. Bağlantı çıkarılamadı.</p></div>`;
  }
  const links = sources.slice(0, 8).map((item) => {
    const href = safeUrl(item.url);
    if (!href) return "";
    return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(item.title || href)}</a>`;
  }).join("");
  return `<div class="sources-block"><strong>Kaynaklar · ${esc(providerLabel())}</strong><div class="sources">${links}</div></div>`;
}

function providerLabel() {
  const provider = (state.run && state.run.provider) || "";
  if (!state.run || state.run.search_mode === "model") return "Model bilgisi";
  if (provider.startsWith("tavily")) return "Tavily";
  return "OpenAI web araması";
}

function renderChrome() {
  const type = TYPES.find((item) => item.id === state.productType) || TYPES[0];
  const scope = SCOPES.find((item) => item.id === state.scope) || SCOPES[0];
  document.getElementById("type-value").textContent = type.label;
  document.getElementById("scope-value").textContent = scope.label;
  document.querySelector("#type-icon use").setAttribute("href", `#${type.icon}`);
  document.querySelector("#scope-icon use").setAttribute("href", `#${scope.icon}`);
  document.getElementById("criteria-wrap").hidden = state.scope !== "idea";
  const caption = document.getElementById("list-caption");
  if (!state.sample && state.run && state.run.scope === "idea") {
    caption.textContent = "Yazdığın fikrin rakipleri ve pazar karşılığı.";
  } else {
    caption.textContent = "Pazar araştırmasına göre öne çıkan ürün fırsatları.";
  }
  document.querySelectorAll("#type-menu button").forEach((button) => button.classList.toggle("active", button.dataset.value === state.productType));
  document.querySelectorAll("#scope-menu button").forEach((button) => button.classList.toggle("active", button.dataset.value === state.scope));
  document.querySelectorAll("#sort-menu button").forEach((button) => button.classList.toggle("active", button.dataset.value === state.sort));
  document.querySelectorAll("#filter-menu button").forEach((button) => button.classList.toggle("active", button.dataset.value === state.filter));
  const sort = SORTS.find((item) => item.id === state.sort);
  document.getElementById("sort-btn").innerHTML = `${esc(sort.label)} <svg class="ic"><use href="#i-chevron"></use></svg>`;

  const count = visibleIdeas().length;
  document.getElementById("idea-count").textContent = `${n(count)} fikir`;
  const pill = document.getElementById("run-status");
  if (state.sample) {
    pill.textContent = "Örnek veri";
    pill.className = "status-pill";
  } else if (state.run && state.run.search_mode === "model") {
    pill.textContent = "Hipotez turu";
    pill.className = "status-pill warn";
  } else {
    pill.textContent = "Canlı";
    pill.className = "status-pill live";
  }
  const warning = document.getElementById("warning");
  const text = state.error || (state.run && state.run.warning) || "";
  warning.hidden = !text;
  warning.textContent = text;

  const progress = document.getElementById("progress");
  progress.hidden = !state.running && !state.error;
  progress.classList.toggle("is-error", Boolean(state.error) && !state.running);
  document.getElementById("progress-message").textContent = state.error || state.message || "Araştırma planı hazırlanıyor";
  document.querySelectorAll("#steps span").forEach((step) => {
    const current = STEP_ORDER.indexOf(state.step);
    const index = STEP_ORDER.indexOf(step.dataset.step);
    step.className = index < current ? "done" : index === current ? "on" : "";
  });
  document.getElementById("workspace").classList.toggle("is-busy", state.running);

  const button = document.getElementById("start-btn");
  button.disabled = state.running;
  const startLabel = state.scope === "idea" ? "Fikri araştır" : "Keşfi başlat";
  button.innerHTML = state.running
    ? `<span class="spinner"></span> Araştırma sürüyor`
    : `${startLabel} <span aria-hidden="true">→</span>`;
}

function money(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: amount > 0 && amount < 0.01 ? 4 : 2,
  }).format(amount);
}

function costDelta(value) {
  if (value === null || value === undefined) return `<span class="cost-flat">Geçen ay kaydı yok</span>`;
  const down = Number(value) < 0;
  const amount = Math.abs(Number(value)).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
  return `<span class="${down ? "cost-down" : "cost-up"}">${down ? "↓" : "↑"} %${amount} geçen aya göre</span>`;
}

function jobLabel(name) {
  if (name === "Ürün metni") return "Akış metni";
  return name || "";
}

function costDonut(groups) {
  const colors = { Oyun: "#6d5efc", Uygulama: "#3b82f6", Diğer: "#94a3b8" };
  const palette = ["#6d5efc", "#3b82f6", "#22c55e", "#f59e0b", "#94a3b8", "#ec4899", "#14b8a6", "#f97316"];
  const total = groups.reduce((sum, item) => sum + (Number(item.usd) || 0), 0);
  let cursor = 0;
  const stops = [];
  groups.forEach((item, index) => {
    if (!item.usd || total <= 0) return;
    const next = cursor + (item.usd / total) * 100;
    stops.push(`${colors[item.kind] || palette[index % palette.length]} ${cursor}% ${next}%`);
    cursor = next;
  });
  const paint = stops.length ? `conic-gradient(${stops.join(",")})` : "#e7eaef";
  const legend = groups.map((item, index) => {
    const share = total > 0 ? Math.round((item.usd / total) * 100) : 0;
    const color = colors[item.kind] || palette[index % palette.length];
    return `<li><i style="background:${color}"></i><span>${esc(item.kind)}</span><b>${esc(money(item.usd))}</b><em>%${share}</em></li>`;
  }).join("");
  return `<div class="cost-donut" style="background:${paint}"><div><b>${esc(money(total))}</b><span>Bu ay</span></div></div><ul class="cost-legend">${legend}</ul>`;
}

function costBars(days) {
  const items = days || [];
  const peak = Math.max(0, ...items.map((item) => Number(item.usd) || 0));
  return items.map((item) => {
    const height = peak > 0 ? Math.max(4, Math.round(((Number(item.usd) || 0) / peak) * 100)) : 4;
    return `<span title="${esc(money(item.usd))}"><i style="height:${height}%"></i><em>${n(item.day)}</em></span>`;
  }).join("");
}

function renderCosts() {
  const root = document.getElementById("view-costs");
  if (!root) return;
  const data = state.costs;
  if (!data) {
    root.innerHTML = `<header class="cost-top"><div><h1>Maliyet</h1><p class="cost-note">OpenAI tutarı yükleniyor.</p></div></header>`;
    return;
  }
  const groups = data.groups || [];
  const account = data.account && data.account.available ? data.account : null;
  const features = data.features || [];
  const recent = data.recent || [];
  const featurePeak = Math.max(0, ...features.map((item) => Number(item.usd) || 0));
  const serviceRows = groups.map((item) => `<tr>
      <td><span class="cost-kind"><span class="cost-svc ${item.kind === "Oyun" ? "game" : "app"}">OpenAI</span><span>${esc(item.kind)}</span></span></td>
      <td>${n(item.input_tokens || 0)}</td>
      <td>${n(item.cached_tokens || 0)}</td>
      <td>${n(item.output_tokens || 0)}</td>
      <td>${esc(money((Number(item.input_usd) || 0) + (Number(item.cached_usd) || 0)))} girdi · ${esc(money(item.output_usd))} çıktı</td>
      <td>${esc(money(item.usd))}</td>
      <td>${item.change_pct === null || item.change_pct === undefined ? "—" : costDelta(item.change_pct)}</td>
    </tr>`).join("");
  const featureRows = features.map((item) => {
    const width = featurePeak > 0 ? Math.max(4, Math.round((item.usd / featurePeak) * 100)) : 0;
    return `<li><span>${esc(jobLabel(item.name))}</span><span class="cost-track"><b style="width:${width}%"></b></span><em>${esc(money(item.usd))}</em><small>%${n(item.share || 0)}</small></li>`;
  }).join("");
  const lines = data.lines || recent;
  const tokens = data.tokens || {};
  const parts = data.parts || {};
  const rate = data.rate || { input: 2.5, cached: 1.25, output: 10 };
  const freshTokens = Math.max(0, (Number(tokens.input) || 0) - (Number(tokens.cached) || 0));
  const mix = account
    ? (account.lines || []).slice(0, 6).map((item) => ({ kind: item.name, usd: item.usd }))
    : groups;
  const accountRows = (rows) => (rows || []).map((item) => `<tr><td>${esc(item.name)}</td><td>${esc(money(item.usd))}</td><td>%${n(item.share || 0)}</td></tr>`).join("");
  const kpis = account
    ? `<article><span class="kpi-ic green">$</span><p>Bu ay</p><strong>${esc(money(account.month_usd))}</strong>${costDelta(account.change_pct)}</article>
      <article><span class="kpi-ic blue">□</span><p>Geçen ay</p><strong>${esc(money(account.previous_usd))}</strong><span class="cost-flat">${esc(account.key_name || "Bu agentin anahtarı")}</span></article>
      <article><span class="kpi-ic purple">∿</span><p>Günlük ortalama</p><strong>${esc(money(account.daily_avg))}</strong><span class="cost-flat">Bu ayın geçen günleri</span></article>
      <article><span class="kpi-ic orange">◷</span><p>Tahmini aylık</p><strong>${esc(money(account.projected_usd))}</strong><span class="cost-flat">Bugünkü hızla ay sonu</span></article>`
    : `<article><span class="kpi-ic green">$</span><p>Toplam maliyet</p><strong>${esc(money(data.total_usd))}</strong>${costDelta(data.change_pct)}</article>
      <article><span class="kpi-ic blue">□</span><p>Bu ay</p><strong>${esc(money(data.month_usd))}</strong><span class="cost-flat">${n(data.month_calls || 0)} çağrı</span></article>
      <article><span class="kpi-ic purple">∿</span><p>Günlük ortalama</p><strong>${esc(money(data.daily_avg))}</strong><span class="cost-flat">Bu ayın geçen günleri</span></article>
      <article><span class="kpi-ic orange">◷</span><p>Tahmini aylık</p><strong>${esc(money(data.projected_usd))}</strong><span class="cost-flat">Bugünkü hızla ay sonu</span></article>`;
  const lineRows = lines.length
    ? lines.map((row) => `<tr>
        <td>${esc(formatWhen(row.at))}</td>
        <td><span class="cost-kind"><span class="cost-svc ${row.kind === "Oyun" ? "game" : "app"}">OpenAI</span><span>${esc(row.kind || "")}</span></span></td>
        <td>${esc(jobLabel(row.feature))}${row.title ? ` · ${esc(row.title)}` : ""}</td>
        <td>${esc(row.model || "gpt-4o")}</td>
        <td>${n(row.input_tokens || 0)}</td>
        <td>${n(row.cached_tokens || 0)}</td>
        <td>${n(row.output_tokens || 0)}</td>
        <td>${esc(money(row.input_usd))}</td>
        <td>${esc(money(row.cached_usd))}</td>
        <td>${esc(money(row.output_usd))}</td>
        <td>${esc(money(row.usd))}</td>
      </tr>`).join("")
    : `<tr><td colspan="11" class="cost-empty">Bu ay ölçülmüş çağrı yok. Yeni araştırma, ürün metni, sorun dosyası ve tasarım incelemesi satır satır buraya yazılır.</td></tr>`;
  root.innerHTML = `
    <header class="cost-top">
      <div>
        <p class="cost-crumb">Projeler / Maliyet</p>
        <h1>Maliyet</h1>
      </div>
      <div class="cost-range">${esc(data.range_label || "")}</div>
    </header>
    <div class="cost-kpis">${kpis}</div>
    <div class="cost-split">
      <section class="cost-card">
        <header><h2>Maliyet trendi</h2><span>Günlük</span></header>
        <div class="cost-bars">${costBars(account ? account.days : data.days)}</div>
      </section>
      <section class="cost-card">
        <header><h2>Maliyet dağılımı</h2></header>
        <div class="cost-mix">${costDonut(mix)}</div>
      </section>
    </div>
    ${account ? `<section class="cost-card">
      <header><h2>Bu anahtarın kalemleri</h2><span>${esc(account.key_name || "Bu agent")}</span></header>
      <div class="cost-scroll">
      <table class="flow-table">
        <thead><tr><th>Kalem</th><th>Tutar</th><th>Pay</th></tr></thead>
        <tbody>${accountRows(account.lines)}</tbody>
      </table>
      </div>
    </section>` : ""}
    <div class="cost-split">
      <section class="cost-card">
        <header><h2>Oyun ve uygulama</h2></header>
        <div class="cost-scroll">
        <table class="flow-table">
          <thead><tr><th>Tür</th><th>Girdi jeton</th><th>Önbellek</th><th>Çıktı jeton</th><th>Tutar ayrımı</th><th>Toplam</th><th>Değişim</th></tr></thead>
          <tbody>${serviceRows}</tbody>
        </table>
        </div>
      </section>
      <section class="cost-card">
        <header><h2>Araştırma, akış ve tasarım</h2></header>
        <ul class="cost-uses">${featureRows}</ul>
      </section>
    </div>
    <section class="cost-card">
      <header><h2>Bu panelin jeton hesabı</h2><span>gpt-4o liste fiyatı</span></header>
      <div class="cost-scroll">
      <table class="flow-table">
        <thead><tr><th>Kalem</th><th>Jeton</th><th>Birim</th><th>Tutar</th></tr></thead>
        <tbody>
          <tr><td>Girdi</td><td>${n(freshTokens)}</td><td>${esc(money(rate.input))} / 1 milyon</td><td>${esc(money(parts.input_usd))}</td></tr>
          <tr><td>Önbellekli girdi</td><td>${n(tokens.cached || 0)}</td><td>${esc(money(rate.cached))} / 1 milyon</td><td>${esc(money(parts.cached_usd))}</td></tr>
          <tr><td>Çıktı</td><td>${n(tokens.output || 0)}</td><td>${esc(money(rate.output))} / 1 milyon</td><td>${esc(money(parts.output_usd))}</td></tr>
        </tbody>
        <tfoot><tr><td>Toplam</td><td>${n(freshTokens + (Number(tokens.cached) || 0) + (Number(tokens.output) || 0))}</td><td>${n(data.month_calls || 0)} çağrı</td><td>${esc(money(data.month_usd))}</td></tr></tfoot>
      </table>
      </div>
    </section>
    <section class="cost-card">
      <header><h2>Çağrı dökümü</h2></header>
      <div class="cost-scroll">
      <table class="flow-table">
        <thead><tr><th>Tarih</th><th>Tür</th><th>İş</th><th>Model</th><th>Girdi</th><th>Önbellek</th><th>Çıktı</th><th>Girdi tutarı</th><th>Önbellek tutarı</th><th>Çıktı tutarı</th><th>Toplam</th></tr></thead>
        <tbody>${lineRows}</tbody>
      </table>
      </div>
    </section>
    <p class="cost-note">${esc(data.account_note || "Yalnızca bu panelin ölçtüğü OpenAI çağrıları.")}</p>
  `;
}

function loadCosts() {
  fetch("/api/costs").then((response) => {
    if (!response.ok) throw new Error("cost");
    return response.json();
  }).then((data) => {
    state.costs = data;
    if (state.page === "costs") renderCosts();
  }).catch(() => {
    state.costs = {
      total_calls: 0,
      total_usd: 0,
      groups: [
        { kind: "Oyun", calls: 0, usd: 0, rows: [] },
        { kind: "Uygulama", calls: 0, usd: 0, rows: [] },
      ],
    };
    if (state.page === "costs") renderCosts();
  });
}

function renderAux() {
  renderHome();
  renderFlow();
  renderDesign();
  renderProjects();
  renderCosts();
  renderSettings();
}

function renderHome() {
  const root = document.getElementById("view-home");
  const activeId = document.activeElement && document.activeElement.id;
  const caret = activeId === "home-search" ? document.activeElement.selectionStart : null;
  const query = state.home.query.trim().toLocaleLowerCase("tr");
  const match = (text) => !query || text.toLocaleLowerCase("tr").includes(query);
  const ideas = HOME_IDEAS.filter((item) => match(`${item.title} ${item.blurb} ${item.kind}`));
  const progress = HOME_PROGRESS.filter((item) => match(`${item.title} ${item.badge}`));
  const activity = HOME_ACTIVITY.filter((item) => match(item.text));
  const upcoming = HOME_UPCOMING.filter((item) => match(`${item.title} ${item.note}`));
  root.innerHTML = `
    <div class="studio-top">
      <label class="studio-search">
        <svg class="ic"><use href="#i-search"></use></svg>
        <input id="home-search" type="search" placeholder="Araştırma, proje veya fikir ara..." value="${esc(state.home.query)}" autocomplete="off">
      </label>
      <span class="bell-wrap">
        <button type="button" class="icon-btn bell-btn" id="home-bell" aria-label="Bildirimler"><svg class="ic"><use href="#i-bell"></use></svg></button>
        <div class="bell-pop" ${state.home.bell ? "" : "hidden"}>Yeni bildirim yok.</div>
      </span>
      <span class="studio-avatar letter" aria-hidden="true">T</span>
    </div>
    <section class="dash-hero">
      <div>
        <p class="page-kicker">Flywork Product Studio</p>
        <h1>Harika fikirler,<br>gerçek ürünlere.</h1>
        <p>Uygulama fikirlerini keşfet, analiz et, planla ve tasarımlara dönüştür.</p>
      </div>
      <div class="dash-orbs" aria-hidden="true">
        <span class="dash-orb game">🎮</span>
        <span class="dash-orb bulb">💡</span>
        <span class="dash-orb chart">📊</span>
      </div>
      <div class="dash-side">
        <div class="popover-host home-launch">
          <button type="button" class="start-btn project-new" data-page="research">+ Yeni araştırma</button>
          <button type="button" class="start-btn home-caret" id="home-caret" aria-label="Araştırma türü"><svg class="ic"><use href="#i-chevron"></use></svg></button>
          <div class="menu" id="home-launch-menu" hidden>
            <button type="button" data-home-scope="auto"><strong>Otonom keşif</strong><small>Pazarı tarar</small></button>
            <button type="button" data-home-scope="idea"><strong>Fikir araştırması</strong><small>Yazdığın fikre bakar</small></button>
          </div>
        </div>
        <button type="button" class="resume-card" data-page="research">
          <span>Son kaldığın yer</span>
          <strong>${projectThumb("farm")} <span>Farm Simulation Game<small>Araştırma analizi</small></span></strong>
          <b>3/5</b>
        </button>
      </div>
    </section>
    <div class="dash-metrics">
      ${metric("idea", "Toplam fikir", "24", "+3")}
      ${metric("box", "Aktif proje", "8", "+2")}
      ${metric("check", "Tamamlanan", "5", "+1")}
      ${metric("clock", "Beklemede", "3", "")}
    </div>
    <div class="dash-mid">
      <section class="dash-card">
        <header class="dash-card-head"><h2>Son fikirler</h2><button type="button" class="text-btn" data-page="research">Tümünü gör →</button></header>
        <div class="dash-list">${ideas.map((item) => ideaRow(item)).join("") || `<p class="dash-empty">Eşleşen fikir yok.</p>`}</div>
      </section>
      <section class="dash-card">
        <header class="dash-card-head"><h2>Proje ilerlemesi</h2><button type="button" class="text-btn" data-page="projects">Tümünü gör →</button></header>
        <div class="dash-list">${progress.map((item) => progressRow(item)).join("") || `<p class="dash-empty">Eşleşen proje yok.</p>`}</div>
      </section>
      <section class="dash-card">
        <header class="dash-card-head"><h2>Hızlı erişim</h2></header>
        <div class="quick-list">
          <button type="button" data-page="research"><span class="quick-ic green"><svg class="ic"><use href="#i-search"></use></svg></span>Fikir & Pazar Araştırması</button>
          <button type="button" data-page="flow"><span class="quick-ic purple"><svg class="ic"><use href="#i-flow"></use></svg></span>FigJam Flow</button>
          <button type="button" data-page="design"><span class="quick-ic blue"><svg class="ic"><use href="#i-layout"></use></svg></span>Tasarım İnceleme</button>
          <button type="button" data-page="projects"><span class="quick-ic orange"><svg class="ic"><use href="#i-folder"></use></svg></span>Projeler</button>
        </div>
      </section>
    </div>
    <div class="dash-bottom">
      <section class="dash-card">
        <header class="dash-card-head">
          <h2>Pazar trendleri</h2>
          <div class="popover-host">
            <button type="button" class="ghost flow-filter" id="home-range">${state.home.range === "7" ? "Son 7 gün" : "Son 30 gün"} <svg class="ic"><use href="#i-chevron"></use></svg></button>
            <div class="menu" id="home-range-menu" hidden>
              <button type="button" data-home-range="30"><strong>Son 30 gün</strong></button>
              <button type="button" data-home-range="7"><strong>Son 7 gün</strong></button>
            </div>
          </div>
        </header>
        <div class="trend-legend"><span class="g">Oyun</span><span class="p">Üretkenlik</span><span class="y">Eğitim</span><span class="o">Sağlık</span></div>
        ${trendSvg(state.home.range)}
      </section>
      <section class="dash-card">
        <header class="dash-card-head"><h2>Son aktiviteler</h2></header>
        <div class="activity-list">${activity.map((item) => `<article><span class="activity-ic ${item.tone}">${item.mark}</span><p>${esc(item.text)}</p><time>${esc(item.when)}</time></article>`).join("") || `<p class="dash-empty">Eşleşen aktivite yok.</p>`}</div>
      </section>
      <section class="dash-card">
        <header class="dash-card-head"><h2>Yaklaşanlar</h2><button type="button" class="text-btn" data-page="projects">Tümünü gör →</button></header>
        <div class="upcoming-list">${upcoming.map((item) => `<article><time><b>${esc(item.day)}</b><span>${esc(item.month)}</span></time><div><strong>${esc(item.title)}</strong><p>${esc(item.note)}</p></div><span class="project-team" aria-hidden="true"><i></i><i></i>${item.extra ? `<em>+${item.extra}</em>` : ""}</span></article>`).join("") || `<p class="dash-empty">Eşleşen kayıt yok.</p>`}</div>
      </section>
    </div>`;
  if (activeId === "home-search") {
    const field = document.getElementById("home-search");
    if (field && caret != null) {
      field.focus();
      field.setSelectionRange(caret, caret);
    }
  }
}

function metric(kind, label, value, delta) {
  return `<article class="dash-metric ${kind}"><span class="dash-metric-ic"></span><div><span>${label}</span><b>${value}${delta ? `<small>${delta}</small>` : ""}</b></div>${bars(kind)}</article>`;
}

function bars(kind) {
  const tones = { idea: "#1c8c46", box: "#3b6fd8", check: "#7c4ddb", clock: "#e09a2b" };
  const color = tones[kind] || "#1c8c46";
  const heights = [8, 12, 7, 14, 10, 16];
  return `<svg class="dash-bars" viewBox="0 0 54 20" aria-hidden="true">${heights.map((height, index) => `<rect x="${index * 9}" y="${20 - height}" width="6" height="${height}" rx="2" fill="${color}" opacity="${0.35 + index * 0.1}"/>`).join("")}</svg>`;
}

function ideaRow(item) {
  return `<button type="button" class="idea-row" data-home-idea="${esc(item.title)}">
    ${projectThumb(item.scene)}
    <span class="idea-row-copy"><strong>${esc(item.title)}</strong><small>${esc(item.blurb)}</small></span>
    <span class="project-tags"><span>${esc(item.kind)}</span><span>Mobil</span></span>
    <span class="idea-row-score"><b>${item.score}<small>/100</small></b><i style="width:${item.score}%"></i></span>
    <time>${esc(item.date)}</time>
    <svg class="ic go"><use href="#i-chevron"></use></svg>
  </button>`;
}

function progressRow(item) {
  const width = Math.round((item.step / 5) * 100);
  return `<button type="button" class="progress-row" data-page="projects">
    ${projectThumb(item.scene)}
    <span><strong>${esc(item.title)}</strong><i class="bar"><b style="width:${width}%"></b></i></span>
    <em>${item.step}/5</em>
    <span class="project-badge ${item.tone}">${esc(item.badge)}</span>
  </button>`;
}

function trendSvg(range) {
  const labels = range === "7" ? ["22 Eki", "24 Eki", "26 Eki", "28 Eki"] : ["1 Eki", "7 Eki", "14 Eki", "21 Eki", "28 Eki"];
  const lines = range === "7"
    ? ["8,78 48,64 88,70 128,42 168,30", "8,96 48,90 88,74 128,66 168,58", "8,88 48,92 88,80 128,76 168,62", "8,104 48,100 88,98 128,94 168,90"]
    : ["8,86 46,90 84,74 122,68 168,52 214,46 252,34 300,22", "8,108 46,102 90,96 140,88 184,78 230,70 268,62 300,54", "8,96 50,92 96,98 142,84 188,88 236,76 272,70 300,64", "8,114 54,110 100,112 150,104 198,106 246,100 300,96"];
  const colors = ["#1c8c46", "#7c4ddb", "#e0b13a", "#e07a2f"];
  return `<div class="trend">
    <svg viewBox="0 0 320 140" role="img" aria-label="Pazar trendleri">
      ${[28, 56, 84, 112].map((y) => `<line x1="8" y1="${y}" x2="312" y2="${y}" stroke="#eef1f4"/>`).join("")}
      ${lines.map((points, index) => `<polyline points="${points}" fill="none" stroke="${colors[index]}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}
    </svg>
    <div class="trend-axis">${labels.map((label) => `<span>${label}</span>`).join("")}</div>
  </div>`;
}

const HOME_IDEAS = [
  { title: "Farm Simulation Game", blurb: "Rahatlatıcı çiftlik simülasyonu", kind: "Oyun", scene: "farm", score: 82, date: "28 Eki 2026" },
  { title: "Block Puzzle Game", blurb: "Yenilikçi blok bulmaca", kind: "Oyun", scene: "puzzle", score: 76, date: "27 Eki 2026" },
  { title: "Hidden Object Game", blurb: "Saklı nesne bulma oyunu", kind: "Oyun", scene: "search", score: 71, date: "27 Eki 2026" },
  { title: "Language Learning App", blurb: "AI destekli dil öğrenme", kind: "Eğitim", scene: "learn", score: 68, date: "26 Eki 2026" },
  { title: "Racing Game", blurb: "Arcade yarış oyunu", kind: "Oyun", scene: "racing", score: 65, date: "25 Eki 2026" },
];

const HOME_PROGRESS = [
  { title: "Farm Simulation", scene: "farm", step: 3, badge: "Aktif", tone: "live" },
  { title: "Block Puzzle", scene: "puzzle", step: 2, badge: "Aktif", tone: "live" },
  { title: "Femia", scene: "health", step: 3, badge: "Tasarımda", tone: "design" },
  { title: "GetChat", scene: "chat", step: 1, badge: "Beklemede", tone: "wait" },
  { title: "Veylo", scene: "mask", step: 1, badge: "Araştırmada", tone: "research" },
];

const HOME_ACTIVITY = [
  { text: "Farm Simulation Game araştırması tamamlandı", when: "2 saat önce", tone: "green", mark: "✦" },
  { text: "Block Puzzle Game projesi güncellendi", when: "5 saat önce", tone: "purple", mark: "▣" },
  { text: "Femia tasarım incelemesi oluşturuldu", when: "1 gün önce", tone: "pink", mark: "♡" },
  { text: "Yeni fikir eklendi: Racing Game", when: "1 gün önce", tone: "orange", mark: "➤" },
  { text: "GetChat için FigJam akışı oluşturuldu", when: "2 gün önce", tone: "green", mark: "⌘" },
];

const HOME_UPCOMING = [
  { day: "28", month: "Eki", title: "Farm Simulation", note: "Tasarım incelemesi", extra: "2" },
  { day: "30", month: "Eki", title: "Femia", note: "Ürün planı hazırlığı", extra: "" },
  { day: "1", month: "Kas", title: "GetChat", note: "FigJam akışı", extra: "1" },
  { day: "3", month: "Kas", title: "Veylo", note: "Pazar araştırması güncellemesi", extra: "" },
];

function visibleFlowIdeas() {
  const query = state.flow.query.trim().toLocaleLowerCase("tr");
  return state.flow.ideas.filter((item) => {
    if (state.flow.filter === "with" && !item.flow) return false;
    if (state.flow.filter === "without" && item.flow) return false;
    if (!query) return true;
    return `${item.title} ${item.subtitle}`.toLocaleLowerCase("tr").includes(query);
  });
}

function figjamHref(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "figma.com" && host !== "figjam.com" && !host.endsWith(".figma.com") && !host.endsWith(".figjam.com")) return "";
    return url.href;
  } catch (err) {
    return "";
  }
}

function createFlows(ids) {
  const href = figjamHref(state.flow.url);
  const picked = state.flow.ideas.filter((item) => ids.includes(item.id));
  const fresh = picked.filter((item) => !item.flow);
  if (!href || !href.includes("/board/")) {
    state.flow.error = "Boş FigJam panosunun linkini yapıştır. Adres figma.com/board olmalı.";
    state.flow.notice = "";
    renderFlow();
    return;
  }
  if (picked.length !== 1 || fresh.length !== 1) {
    state.flow.error = "Akışı olmayan bir fikir seç.";
    state.flow.notice = "";
    renderFlow();
    return;
  }
  const idea = fresh[0];
  const source = state.ideas.find((item) => item.id === idea.sourceId)
    || state.ideas.find((item) => item.title === idea.title && (item.subtitle || "") === (idea.subtitle || ""));
  const brief = source && state.briefs[source.id];
  const plan = brief && brief.status === "ready" ? brief.data : null;
  const sections = plan && Array.isArray(plan.app_sections) ? plan.app_sections : [];
  if (!plan || !plan.app_concept || sections.length < 6) {
    state.flow.error = "Akış, analiz sayfasındaki uygulama metninden çizilir. Önce o fikri açıp metnin yazılmasını bekle.";
    state.flow.notice = "";
    renderFlow();
    return;
  }
  state.flow.running = true;
  state.flow.error = "";
  state.flow.notice = "";
  state.flow.menu = null;
  renderFlow();
  fetch("/api/figjam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: href,
      title: idea.title,
      subtitle: idea.subtitle || "",
      score: Number(idea.score) || 0,
      app_concept: plan.app_concept,
      app_sections: sections.slice(0, 8),
    }),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      state.flow.running = false;
      state.flow.error = data.detail || "FigJam panosuna akış yazılamadı.";
      state.flow.notice = "";
      renderFlow();
      return;
    }
    const drawn = await waitForFigjam(data.id);
    state.flow.running = false;
    idea.flow = true;
    rememberFlowDrawn(idea, true);
    state.flow.error = "";
    state.flow.notice = `${idea.title} akışı panoya çizildi.`;
    renderFlow();
    window.open(drawn.url || href, "_blank", "noopener,noreferrer");
  }).catch((err) => {
    state.flow.running = false;
    state.flow.error = err.message || "FigJam panosuna bağlanılamadı.";
    state.flow.notice = "";
    renderFlow();
  });
}

function waitForFigjam(id) {
  const plugin = "Bağlı Figma hesabı bu panoya çizemedi. Link, bu hesabın açabildiği bir FigJam dosyası olmalı.";
  let tries = 0;
  return new Promise((resolve, reject) => {
    const tick = () => {
      fetch(`/api/figjam/job/${id}`).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          reject(new Error(data.detail || plugin));
          return;
        }
        if (data.status === "done") {
          resolve(data);
          return;
        }
        if (data.status === "error") {
          reject(new Error(data.error || plugin));
          return;
        }
        tries += 1;
        if (tries >= 90) {
          reject(new Error(plugin));
          return;
        }
        setTimeout(tick, 1000);
      }).catch(() => reject(new Error(plugin)));
    };
    tick();
  });
}

function flowThumb(scene) {
  const art = {
    farm: ["🏡", "#e7f6d8"],
    puzzle: ["🧩", "#ecebff"],
    search: ["🔍", "#fff4d6"],
    cards: ["🃏", "#ffe8ea"],
    racing: ["🚀", "#ffe4dc"],
  };
  const [glyph, bg] = art[scene] || ["🎮", "#eef2f6"];
  return `<span class="flow-thumb" style="background:${bg}">${glyph}</span>`;
}

function renderFlow() {
  const root = document.getElementById("view-flow");
  const activeId = document.activeElement && document.activeElement.id;
  const caret = activeId === "flow-search" || activeId === "flow-url" ? document.activeElement.selectionStart : null;
  const ideas = visibleFlowIdeas();
  const filter = FLOW_FILTERS.find((item) => item.id === state.flow.filter) || FLOW_FILTERS[0];
  const picked = ideas.filter((item) => state.flow.selected[item.id]).length;
  const rows = ideas.map((item) => `
    <tr>
      <td><input type="checkbox" data-flow-check="${esc(item.id)}" ${state.flow.selected[item.id] ? "checked" : ""} aria-label="${esc(item.title)} seç"></td>
      <td>
        <div class="flow-idea">
          ${flowThumb(item.scene)}
          <div><strong>${esc(item.title)}</strong><span>${esc(item.subtitle)}</span></div>
        </div>
      </td>
      <td>${esc(item.type)}</td>
      <td class="flow-when">${esc(item.date)}<small>${esc(item.time)}</small></td>
      <td><span class="flow-status">✓ Onaylandı</span></td>
      <td><span class="flow-flag ${item.flow ? "on" : ""}"><i></i>${item.flow ? "Akış var" : "Akış yok"}</span></td>
      <td class="flow-actions">${Number.isFinite(Number(item.score)) ? `<span class="flow-score">${n(item.score)}<small>/100</small></span>` : `<span class="flow-score muted">–</span>`}</td>
    </tr>`).join("");
  root.innerHTML = `
    <div class="studio-top">
      <label class="studio-search">
        <svg class="ic"><use href="#i-search"></use></svg>
        <input id="flow-search" type="search" placeholder="Araştırma, proje veya fikir ara..." value="${esc(state.flow.query)}" autocomplete="off">
      </label>
      <span class="bell-wrap">
        <button type="button" class="icon-btn bell-btn" id="flow-bell" aria-label="Bildirimler"><svg class="ic"><use href="#i-bell"></use></svg></button>
        <div class="bell-pop" ${state.flow.bell ? "" : "hidden"}>Yeni bildirim yok.</div>
      </span>
      <span class="studio-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 18.5c1.2-2.4 3.2-3.5 6-3.5s4.8 1.1 6 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>
    </div>
    <header class="flow-intro">
      <h1>FigJam Flow</h1>
      <p>Akışı olmayan bir fikir seç. FigJam panosunun linkini yapıştır. Düğme, bağlı Figma hesabıyla kartları o panoya çizer.</p>
    </header>
    <section class="flow-board">
      <div class="flow-board-head">
        <span class="figma-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#f24e1e" d="M8 12a4 4 0 1 1 0-8h4v8z"/><path fill="#ff7262" d="M12 4a4 4 0 1 1 0 8z"/><path fill="#a259ff" d="M12 12a4 4 0 1 1 0 8z"/><path fill="#1abcfe" d="M8 20a4 4 0 0 1 0-8h4v8z"/><path fill="#0acf83" d="M8 16a4 4 0 0 1 0-8h4v8z"/></svg></span>
        <div>
          <strong>FigJam linki</strong>
          <p>Boş bir FigJam panosunun linki. Adres figma.com/board ile başlar.</p>
        </div>
      </div>
      <div class="flow-link-row">
        <label class="flow-url">
          <svg class="ic"><use href="#i-link"></use></svg>
          <input id="flow-url" type="url" placeholder="https://www.figma.com/board/..." value="${esc(state.flow.url)}" autocomplete="off">
        </label>
        <button type="button" class="start-btn flow-create" id="flow-create" ${state.flow.running ? "disabled" : ""}>${state.flow.running ? "FigJam'e yazılıyor" : "FigJam'de akışları oluştur"} <span aria-hidden="true">→</span></button>
      </div>
      ${state.flow.error ? `<p class="flow-msg error">${esc(state.flow.error)}</p>` : ""}
      ${state.flow.notice ? `<p class="flow-msg ok">${esc(state.flow.notice)}</p>` : ""}
    </section>
    <section class="flow-sheet">
      <header class="flow-sheet-head">
        <div>
          <h2>Onaylanan fikirler <span class="count">${n(ideas.length)}</span></h2>
          <p>Akışı olmayan bir satır seçili olmalı.</p>
        </div>
        <div class="popover-host">
          <button type="button" class="ghost flow-filter" id="flow-filter-btn">${esc(filter.label)} <svg class="ic"><use href="#i-chevron"></use></svg></button>
          <div class="menu" id="flow-filter-menu" hidden>
            ${FLOW_FILTERS.map((item) => `<button type="button" data-flow-filter="${esc(item.id)}"><strong>${esc(item.label)}</strong></button>`).join("")}
          </div>
        </div>
      </header>
      <table class="flow-table">
        <thead>
          <tr>
            <th><input type="checkbox" data-flow-all ${ideas.length && picked === ideas.length ? "checked" : ""} aria-label="Görünen fikirlerin tümünü seç"></th>
            <th>Fikir</th><th>Tür</th><th>Onay tarihi</th><th>Durum</th><th>FigJam</th><th>Puan</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="7" class="flow-empty">Bu filtrede onaylı fikir yok.</td></tr>`}
        </tbody>
      </table>
    </section>`;
  const all = root.querySelector("[data-flow-all]");
  if (all) all.indeterminate = picked > 0 && picked < ideas.length;
  if (activeId === "flow-search" || activeId === "flow-url") {
    const field = document.getElementById(activeId);
    if (field) {
      field.focus();
      if (caret != null) field.setSelectionRange(caret, caret);
    }
  }
}

const DESIGN_SCOPES = [
  { id: "quality", label: "Genel tasarım kalitesi" },
  { id: "flow", label: "Kullanıcı akışı" },
  { id: "onboarding", label: "Onboarding" },
  { id: "paywall", label: "Paywall / Monetizasyon" },
  { id: "a11y", label: "Erişilebilirlik (Accessibility)" },
  { id: "consistency", label: "Tasarım tutarlılığı" },
  { id: "ux", label: "Kullanılabilirlik (UX)" },
  { id: "content", label: "İçerik ve metinler" },
  { id: "other", label: "Diğer (aşağıda belirtin)" },
];

const DESIGN_TABS = [
  { id: "ai", label: "AI Analizi" },
  { id: "strong", label: "Güçlü Yönler" },
  { id: "improve", label: "Geliştirilmesi Gerekenler" },
  { id: "detail", label: "Detaylı Öneriler" },
];

function renderDesign() {
  const root = document.getElementById("view-design");
  const activeId = document.activeElement && document.activeElement.id;
  const caret = activeId && activeId.startsWith("design-") ? document.activeElement.selectionStart : null;
  const design = state.design;
  const when = designWhen();
  root.innerHTML = `
    <div class="studio-top">
      <label class="studio-search">
        <svg class="ic"><use href="#i-search"></use></svg>
        <input id="design-search" type="search" placeholder="Araştırma, proje veya fikir ara..." value="${esc(design.query)}" autocomplete="off">
      </label>
      <span class="bell-wrap">
        <button type="button" class="icon-btn bell-btn" id="design-bell" aria-label="Bildirimler"><svg class="ic"><use href="#i-bell"></use></svg></button>
        <div class="bell-pop" ${design.bell ? "" : "hidden"}>Yeni bildirim yok.</div>
      </span>
      <span class="studio-avatar letter" aria-hidden="true">T</span>
    </div>
    <header class="review-intro">
      <h1>Tasarım İnceleme <svg class="spark"><use href="#i-spark"></use></svg></h1>
      <p>Figma tasarımlarını analiz ederek güçlü yönleri, geliştirilmesi gereken noktaları ve önerileri alın.</p>
    </header>
    <div class="seg">
      <button type="button" data-page="flow"><svg class="ic"><use href="#i-flow"></use></svg> FigJam Flow</button>
      <button type="button" class="on" data-page="design"><svg class="ic"><use href="#i-layout"></use></svg> Tasarım İnceleme</button>
    </div>
    <div class="review-grid">
      <section class="review-form">
        <div class="review-step">
          <h2><span class="step-no">1</span> Figma linkini ekleyin</h2>
          <button type="button" class="example-link" id="design-example">Örnek link</button>
        </div>
        <label class="flow-url">
          <svg class="ic"><use href="#i-link"></use></svg>
          <input id="design-url" type="url" placeholder="https://www.figma.com/design/..." value="${esc(design.url)}" autocomplete="off">
        </label>
        ${design.error ? `<p class="flow-msg error">${esc(design.error)}</p>` : ""}
        <div class="review-step">
          <h2><span class="step-no">2</span> Uygulama hakkında bilgi verin <span class="review-optional">isteğe bağlı</span></h2>
        </div>
        <p class="review-hint">Uygulamanın amacı, hedef kitlesi, ana özellikleri ve özellikle incelemesini istediğiniz konuları yazın.</p>
        <textarea id="design-about" class="review-area" maxlength="2000" placeholder="Örn: Dil öğrenme uygulaması, 18–35 yaş. Onboarding’e bak.">${esc(design.about)}</textarea>
        <div class="review-count" id="design-about-count">${n(design.about.length)}/2000</div>
        <div class="review-step">
          <h2><span class="step-no">3</span> İnceleme kapsamı (isteğe bağlı)</h2>
        </div>
        <p class="review-hint">Hangi alanlara odaklanmasını istiyorsunuz?</p>
        <div class="scope-grid">
          ${DESIGN_SCOPES.map((item) => `<label class="scope-item"><input type="checkbox" data-scope="${item.id}" ${design.scope[item.id] ? "checked" : ""}> ${esc(item.label)}</label>`).join("")}
        </div>
        <div class="review-step">
          <h2><span class="step-no">4</span> Ek notlar (isteğe bağlı)</h2>
        </div>
        <textarea id="design-notes" class="review-area short" maxlength="1000" placeholder="Özel sorunlarınızı veya odaklanmasını istediğiniz detayları yazın...">${esc(design.notes)}</textarea>
        <div class="review-count" id="design-notes-count">${n(design.notes.length)}/1000</div>
        <button type="button" class="start-btn flow-create design-run" id="design-run" ${design.running ? "disabled" : ""}>${design.running ? `<span class="spinner"></span> Ekranlar inceleniyor` : `<svg class="ic"><use href="#i-spark"></use></svg> Tasarımı analiz et`}</button>
      </section>
      ${design.running ? `<section class="review-empty">Figma MCP ekranlara bakıyor. OpenAI gördüğü tasarımı puanlayıp güçlü ve zayıf yönleri yazacak.</section>` : (design.analyzed && design.result ? reviewResult(when) : `<section class="review-empty">Figma linkini ekleyip analizi başlat. Sonuçlar bu sütunda açılır.</section>`)}
    </div>`;
  if (activeId && activeId.startsWith("design-")) {
    const field = document.getElementById(activeId);
    if (field && caret != null && field.setSelectionRange) {
      field.focus();
      field.setSelectionRange(caret, caret);
    }
  }
}

function designWhen() {
  const count = state.design.result && state.design.result.screen_count;
  if (!state.design.ranAt) return count ? `${n(count)} ekran incelendi` : "";
  const mins = Math.round((Date.now() - state.design.ranAt) / 60000);
  return `${n(count || 0)} ekran incelendi · ${mins < 1 ? "az önce" : `${mins} dakika önce`}`;
}

function reviewResult(when) {
  const result = state.design.result || {};
  const scores = result.scores || {};
  const screens = result.screens || [];
  return `<div class="review-side">
    <section class="review-banner">
      <div class="banner-copy">
        <span class="banner-ic"><svg class="ic"><use href="#i-spark"></use></svg></span>
        <div>
          <strong>Tasarım Analizi Tamamlandı</strong>
          <p>${esc(when)}</p>
        </div>
      </div>
      <button type="button" class="rerun" id="design-rerun"><svg class="ic"><use href="#i-spark"></use></svg> Analizi yeniden çalıştır</button>
    </section>
    <div class="score-row">
      ${scoreTile("green", "i-sliders", "Genel Puan", scores.overall)}
      ${scoreTile("blue", "i-phone", "Kullanıcı Deneyimi", scores.ux)}
      ${scoreTile("orange", "i-check", "Tasarım Kalitesi", scores.quality)}
      ${scoreTile("purple", "i-spark", "Geliştirme Potansiyeli", scores.potential)}
    </div>
    <section class="screen-block">
      <h2>Öne çıkan ekranlar</h2>
      <div class="phone-row">
        ${screens.map((item) => `<article class="phone-card"><div class="phone shot"><span class="phone-score">${n(item.score)}</span>${item.image ? `<img class="phone-shot" src="${esc(item.image)}" alt="">` : phoneFace("home")}</div><span>${esc(item.name)}</span></article>`).join("")}
      </div>
    </section>
    <section class="review-analysis">
      <div class="review-tabs">
        ${DESIGN_TABS.map((item) => `<button type="button" class="${state.design.tab === item.id ? "on" : ""}" data-design-tab="${item.id}">${item.id === "ai" ? `<svg class="ic xs"><use href="#i-spark"></use></svg>` : ""} ${esc(item.label)}</button>`).join("")}
      </div>
      <div class="review-body">${reviewTab(state.design.tab)}</div>
    </section>
  </div>`;
}

function scoreTile(tone, icon, label, score) {
  return `<article class="score-tile"><span class="tile-ic ${tone}"><svg class="ic"><use href="#${icon}"></use></svg></span><span>${label}</span><b>${score}<small>/100</small></b></article>`;
}

function phoneFace(scene) {
  if (scene === "globe") return `<div class="face"><i class="orb"></i><small>Learn with AI</small></div>`;
  if (scene === "buddy") return `<div class="face"><i class="buddy"></i><small>Practice Speaking</small></div>`;
  if (scene === "home") return `<div class="face rows"><i></i><i></i><i></i></div>`;
  if (scene === "lesson") return `<div class="face"><i class="wave"></i><small>Continue</small></div>`;
  if (scene === "crown") return `<div class="face"><b>♛</b><small>Unlock Your Potential</small></div>`;
  return `<div class="face"><i class="avatar"></i><small>Profil</small></div>`;
}

function reviewTab(tab) {
  const result = state.design.result || {};
  if (tab === "strong") return noteList(result.strengths, "Güçlü yön çıkmadı.");
  if (tab === "improve") return noteList(result.improvements, "Geliştirilecek nokta çıkmadı.");
  if (tab === "detail") return noteList(result.suggestions, "Öneri çıkmadı.");
    const screens = result.screens || [];
    return `<div class="review-block">
      <h3><span class="mark spark">✦</span> Genel değerlendirme</h3>
      ${prose(result.summary || "Genel değerlendirme yazılamadı.")}
    </div>
    <div class="review-block">
      <h3><span class="mark aim">◎</span> Hedef kitleye uygunluk</h3>
      ${prose(result.audience || "Hedef kitle notu yazılamadı.")}
    </div>
    <div class="review-block">
      <h3><span class="mark spark">▣</span> Ekran ekran</h3>
      ${screens.length ? screens.map((item) => `<article class="screen-note"><strong>${esc(item.name)} · ${n(item.score)}</strong>${prose(item.note || "Bu ekran için not yazılamadı.")}</article>`).join("") : `<p>Ekran notu yazılamadı.</p>`}
    </div>`;
}

function noteList(items, empty) {
  const notes = items || [];
  if (!notes.length) return `<p class="list-caption">${esc(empty)}</p>`;
  return `<div class="review-list">${notes.map((item) => `<article><strong>${esc(item.title)}</strong><span>${esc(item.detail)}</span></article>`).join("")}</div>`;
}

function runDesignReview() {
  const href = figjamHref(state.design.url);
  if (!href) {
    state.design.error = "Figma dosyasının bağlantısını yapıştır. Adres figma.com ile başlamalı.";
    renderDesign();
    return;
  }
  if (state.design.running) return;
  state.design.url = href;
  state.design.error = "";
  state.design.running = true;
  state.design.analyzed = false;
  renderDesign();
  const scopes = DESIGN_SCOPES.filter((item) => state.design.scope[item.id]).map((item) => item.label);
  fetch("/api/design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: href,
      about: state.design.about || "",
      notes: state.design.notes || "",
      scopes,
    }),
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof body.detail === "string" ? body.detail : "Tasarım analizi yazılamadı";
      throw new Error(message);
    }
    return body;
  }).then((data) => {
    state.design.result = data;
    state.design.analyzed = true;
    state.design.ranAt = Date.now();
    state.design.tab = "ai";
  }).catch((err) => {
    state.design.error = err.message || "Tasarım analizi yazılamadı";
    state.design.analyzed = false;
  }).finally(() => {
    state.design.running = false;
    renderDesign();
  });
}

const PROJECT_STEPS = ["Araştırma", "Tasarım", "Geliştirme", "Yayın", "Büyüme"];

const PROJECT_FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "aktif", label: "Aktif" },
  { id: "beklemede", label: "Beklemede" },
  { id: "tamamlandi", label: "Tamamlanan" },
  { id: "arsiv", label: "Arşivlenen" },
];

const PROJECT_SORTS = [
  { id: "new", label: "En yeni" },
  { id: "old", label: "En eski" },
  { id: "progress", label: "İlerleme" },
];

const PROJECT_SEED = [
  { id: "p1", title: "Farm Simulation Game", kind: "Oyun", platform: "Mobil", scene: "farm", blurb: "Rahatlatıcı çiftlik simülasyonu oyunu. Offline oynanabilir, günlük görevler.", status: "aktif", progress: 3, updated: "28 Eki 2026", at: "2026-10-28" },
  { id: "p2", title: "Block Puzzle Game", kind: "Oyun", platform: "Mobil", scene: "puzzle", blurb: "Yenilikçi blok bulmaca oyunu. Farklı modlar ve günlük meydan okumalar.", status: "aktif", progress: 2, updated: "27 Eki 2026", at: "2026-10-27" },
  { id: "p3", title: "Hidden Object Game", kind: "Oyun", platform: "Mobil", scene: "search", blurb: "Saklı nesne bulma oyunu. Farklı tema paketleri ve hikaye modu.", status: "beklemede", progress: 1, updated: "26 Eki 2026", at: "2026-10-26" },
  { id: "p4", title: "Language Learning", kind: "Eğitim", platform: "Mobil", scene: "learn", blurb: "AI destekli dil öğrenme uygulaması. Konuşma pratiği ve kişiselleştirilmiş dersler.", status: "aktif", progress: 4, updated: "26 Eki 2026", at: "2026-10-26" },
  { id: "p5", title: "Racing Game", kind: "Oyun", platform: "Mobil", scene: "racing", blurb: "Arcade yarış oyunu. Farklı araçlar ve parkurlar.", status: "tasarimda", progress: 2, updated: "25 Eki 2026", at: "2026-10-25" },
  { id: "p6", title: "Femia", kind: "Sağlık", platform: "Mobil", scene: "health", blurb: "Adet takibi uygulaması. Kişisel sağlık ve yaşam döngüsü takibi.", status: "aktif", progress: 3, updated: "24 Eki 2026", at: "2026-10-24" },
  { id: "p7", title: "GetChat", kind: "AI Araç", platform: "Mobil", scene: "chat", blurb: "AI chat bot uygulaması. Flywork'ün yapay zekası.", status: "beklemede", progress: 1, updated: "22 Eki 2026", at: "2026-10-22" },
  { id: "p8", title: "Veylo", kind: "Sosyal", platform: "Mobil", scene: "mask", blurb: "Anonim arkadaşlık uygulaması. Güvenli ve eğlenceli eşleşme deneyimi.", status: "arastirmada", progress: 1, updated: "21 Eki 2026", at: "2026-10-21" },
];

function projectItems() {
  if (!state.projects.items) state.projects.items = PROJECT_SEED.map((item) => Object.assign({}, item));
  return state.projects.items;
}

function projectBucket(status) {
  if (status === "beklemede") return "beklemede";
  if (status === "tamamlandi") return "tamamlandi";
  if (status === "arsiv") return "arsiv";
  if (status === "arastirmada") return "arastirmada";
  return "aktif";
}

function visibleProjects() {
  const query = state.projects.query.trim().toLocaleLowerCase("tr");
  let items = projectItems().filter((item) => {
    const bucket = projectBucket(item.status);
    if (state.projects.filter !== "all" && bucket !== state.projects.filter) return false;
    if (!query) return true;
    return `${item.title} ${item.blurb} ${item.kind}`.toLocaleLowerCase("tr").includes(query);
  });
  items.sort((a, b) => {
    if (state.projects.sort === "old") return a.at < b.at ? -1 : 1;
    if (state.projects.sort === "progress") return b.progress - a.progress || (a.at < b.at ? 1 : -1);
    return a.at < b.at ? 1 : -1;
  });
  return items;
}

function projectCounts() {
  const items = projectItems();
  const count = (bucket) => items.filter((item) => projectBucket(item.status) === bucket).length;
  return {
    all: items.length,
    aktif: count("aktif"),
    beklemede: count("beklemede"),
    tamamlandi: count("tamamlandi"),
    arsiv: count("arsiv"),
  };
}

function renderProjects() {
  const root = document.getElementById("view-projects");
  const activeId = document.activeElement && document.activeElement.id;
  const caret = activeId && activeId.startsWith("project-") ? document.activeElement.selectionStart : null;
  const counts = projectCounts();
  const items = visibleProjects();
  const sort = PROJECT_SORTS.find((item) => item.id === state.projects.sort) || PROJECT_SORTS[0];
  const board = state.projects;
  root.innerHTML = `
    <div class="studio-top">
      <label class="studio-search">
        <svg class="ic"><use href="#i-search"></use></svg>
        <input id="project-top-search" type="search" placeholder="Araştırma, proje veya fikir ara..." value="${esc(board.query)}" autocomplete="off">
      </label>
      <span class="bell-wrap">
        <button type="button" class="icon-btn bell-btn" id="project-bell" aria-label="Bildirimler"><svg class="ic"><use href="#i-bell"></use></svg></button>
        <div class="bell-pop" ${board.bell ? "" : "hidden"}>Yeni bildirim yok.</div>
      </span>
      <span class="studio-avatar letter" aria-hidden="true">T</span>
    </div>
    <header class="projects-head">
      <div>
        <h1>Projeler</h1>
        <p>Onaylanan fikirlerden oluşturulan projeleri yönetin, ilerlemeyi takip edin ve ekibinizle çalışın.</p>
      </div>
      <button type="button" class="start-btn project-new" id="project-new">+ Yeni proje</button>
    </header>
    <div class="project-stats">
      ${projectStat("cube", "Toplam Proje", counts.all)}
      ${projectStat("pulse", "Aktif Proje", counts.aktif)}
      ${projectStat("wait", "Beklemede", counts.beklemede)}
      ${projectStat("done", "Tamamlanan", counts.tamamlandi)}
    </div>
    ${board.creating ? projectForm() : ""}
    <div class="project-tools">
      <div class="project-tabs">
        ${PROJECT_FILTERS.map((item) => `<button type="button" class="${board.filter === item.id ? "on" : ""}" data-project-filter="${item.id}">${esc(item.label)} <span>${n(counts[item.id] || 0)}</span></button>`).join("")}
      </div>
      <div class="project-tools-right">
        <label class="project-search">
          <svg class="ic"><use href="#i-search"></use></svg>
          <input id="project-search" type="search" placeholder="Proje ara..." value="${esc(board.query)}" autocomplete="off">
        </label>
        <div class="popover-host">
          <button type="button" class="ghost flow-filter" id="project-sort">${esc(sort.label)} <svg class="ic"><use href="#i-chevron"></use></svg></button>
          <div class="menu" id="project-sort-menu" hidden>
            ${PROJECT_SORTS.map((item) => `<button type="button" data-project-sort="${item.id}"><strong>${esc(item.label)}</strong></button>`).join("")}
          </div>
        </div>
      </div>
    </div>
    <div class="project-grid">
      ${items.map((item) => projectCard(item)).join("") || `<p class="project-empty">Bu filtrede proje yok.</p>`}
    </div>`;
  if (activeId && activeId.startsWith("project-")) {
    const field = document.getElementById(activeId);
    if (field && caret != null && field.setSelectionRange) {
      field.focus();
      field.setSelectionRange(caret, caret);
    }
  }
}

function projectStat(kind, label, value) {
  return `<article class="project-stat ${kind}"><span class="project-stat-ic"></span><div><span>${label}</span><b>${n(value)}</b></div></article>`;
}

function projectForm() {
  return `<form class="project-form" id="project-form">
    <label>Proje adı<input id="project-title" maxlength="80" value="${esc(state.projects.draftTitle)}" placeholder="Örn. Farm Simulation Game" required></label>
    <label>Kısa açıklama<input id="project-blurb" maxlength="160" value="${esc(state.projects.draftBlurb)}" placeholder="Proje ne işe yarıyor?"></label>
    <label>Tür<select id="project-kind">
      ${["Oyun", "Eğitim", "Sağlık", "AI Araç", "Sosyal"].map((kind) => `<option ${state.projects.draftKind === kind ? "selected" : ""}>${esc(kind)}</option>`).join("")}
    </select></label>
    <div class="project-form-actions">
      <button type="button" class="flow-act" id="project-cancel">Vazgeç</button>
      <button type="submit" class="start-btn project-new">Ekle</button>
    </div>
  </form>`;
}

function projectCard(item) {
  const badge = {
    aktif: ["Aktif", "live"],
    beklemede: ["Beklemede", "wait"],
    tasarimda: ["Tasarımda", "design"],
    arastirmada: ["Araştırmada", "research"],
    tamamlandi: ["Tamamlandı", "live"],
    arsiv: ["Arşiv", "archive"],
  }[item.status] || ["Aktif", "live"];
  const width = Math.max(0, Math.min(100, Math.round((item.progress / PROJECT_STEPS.length) * 100)));
  return `<article class="project-card">
    <header>
      ${projectThumb(item.scene)}
      <div>
        <div class="project-title"><strong>${esc(item.title)}</strong><span class="project-badge ${badge[1]}">${badge[0]}</span></div>
        <div class="project-tags"><span>${esc(item.kind)}</span><span>${esc(item.platform)}</span></div>
      </div>
    </header>
    <p>${esc(item.blurb)}</p>
    <div class="project-progress"><span class="bar"><i style="width:${width}%"></i></span><b>${item.progress}/${PROJECT_STEPS.length}</b></div>
    <div class="project-steps">${PROJECT_STEPS.map((name, index) => {
      const cls = index < item.progress ? "done" : index === item.progress ? "now" : "";
      return `<span class="${cls}">${index < item.progress ? "✓ " : ""}${esc(name)}</span>`;
    }).join("")}</div>
    <footer>
      <span class="project-team" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="project-updated">Güncellendi<small>${esc(item.updated)}</small></span>
      <span class="flow-more-wrap">
        <button type="button" class="flow-more" data-project-menu="${esc(item.id)}" aria-label="${esc(item.title)} işlemleri">···</button>
        ${state.projects.menu === item.id ? `<div class="flow-menu">
          <button type="button" data-project-status="aktif" data-project-id="${esc(item.id)}">Aktif yap</button>
          <button type="button" data-project-status="beklemede" data-project-id="${esc(item.id)}">Beklemeye al</button>
          <button type="button" data-project-status="tamamlandi" data-project-id="${esc(item.id)}">Tamamlandı işaretle</button>
          <button type="button" data-project-status="arsiv" data-project-id="${esc(item.id)}">Arşivle</button>
        </div>` : ""}
      </span>
    </footer>
  </article>`;
}

function projectThumb(scene) {
  const art = {
    farm: ["🏡", "#e7f6d8"],
    puzzle: ["🧩", "#ece7ff"],
    search: ["🔍", "#fff4d6"],
    learn: ["💬", "#e7f0ff"],
    racing: ["🚀", "#ffe4dc"],
    health: ["💗", "#ffe4ef"],
    chat: ["💬", "#e5f8ee"],
    mask: ["🎭", "#f3e8ff"],
  };
  const [glyph, bg] = art[scene] || ["📁", "#eef2f6"];
  return `<span class="project-thumb" style="background:${bg}">${glyph}</span>`;
}

function addProject() {
  const title = state.projects.draftTitle.trim();
  if (title.length < 2) return;
  const now = new Date();
  projectItems().unshift({
    id: `p-${now.getTime()}`,
    title,
    kind: state.projects.draftKind || "Oyun",
    platform: "Mobil",
    scene: "learn",
    blurb: state.projects.draftBlurb.trim() || "Yeni proje. Araştırma adımı açık.",
    status: "arastirmada",
    progress: 1,
    updated: new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(now),
    at: now.toISOString().slice(0, 10),
  });
  state.projects.draftTitle = "";
  state.projects.draftBlurb = "";
  state.projects.creating = false;
  state.projects.filter = "all";
  renderProjects();
}

function renderSettings() {
  const cfg = state.config || {};
  document.getElementById("view-settings").innerHTML = `
    <div><div class="page-kicker">Bağlantı</div><h2 class="page-title">Ayarlar</h2><p class="lede">Anahtar tarayıcıya gelmez. İstekler bu bilgisayardaki Python sunucusundan OpenAI'ye gider.</p></div>
    <div class="status-grid">
      <article class="status-card"><span>OpenAI</span><strong class="${cfg.openai ? "ok" : "warn-text"}">${cfg.openai ? "Anahtar var" : "Anahtar yok"}</strong></article>
      <article class="status-card"><span>Model</span><strong>${esc(cfg.model || "gpt-4o")}</strong></article>
      <article class="status-card"><span>Web araması</span><strong class="${cfg.tavily ? "ok" : ""}">${cfg.tavily ? "Tavily" : "OpenAI web araması"}</strong></article>
    </div>
    <article class="soft-card help">
      <p>${cfg.tavily ? "Tavily anahtarı yüklü. Kaynak taraması Tavily üzerinden gidiyor." : "Tavily anahtarı yok. İstersen <code>.env</code> içine <code>TAVILY_API_KEY</code> yaz; ajan aramayı oradan yapar. Yazmazsan OpenAI web araması kullanılır."}</p>
      <p style="margin-top:8px">Bir keşif iki çağrı yapar: önce kaynak taraması, sonra fırsat ve rakip karşılaştırması. Bu, OpenAI kotandan düşer ve genelde bir dakikadan kısa sürer. Anahtar kısıtlıysa Model capabilities izninin açık olması gerekir.</p>
    </article>`;
}

function renderHistory() {
  const root = document.getElementById("history-list");
  if (!state.history.length) {
    root.innerHTML = `<article class="soft-card"><strong>Henüz kayıt yok</strong><p class="detail-sub">İlk canlı keşif bitince burada görünür.</p></article>`;
    return;
  }
  root.innerHTML = state.history.map((run) => `
    <button type="button" class="history-item" data-run="${esc(run.id)}">
      <b>${esc(run.product_type)} · ${esc(SCOPE_TEXT[run.scope] || run.scope)}</b>
      <span>${esc(formatWhen(run.created_at))} · ${n((run.ideas || []).length)} fikir</span>
      <span class="history-queries">${esc((run.queries || []).join(" · "))}</span>
    </button>`).join("");
}

function formatWhen(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

const PAGES = ["home", "research", "flow", "design", "projects", "costs", "settings"];

function savedPage() {
  try {
    const page = sessionStorage.getItem("flywork-page");
    if (PAGES.includes(page)) return page;
  } catch (err) {
    return "home";
  }
  return "home";
}

function showPage(page) {
  if (!PAGES.includes(page)) page = "home";
  state.page = page;
  try {
    sessionStorage.setItem("flywork-page", page);
  } catch (err) {
    /* sekme kaydı kapalıysa sayfa yine değişir */
  }
  state.sheet = null;
  renderSheet();
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${page}`));
  document.querySelectorAll(".nav-btn").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  document.getElementById("history-drawer").hidden = true;
  renderAux();
  if (page === "costs") loadCosts();
}

const FLOW_STORE = "flywork-flow-decisions";

function readFlowStore() {
  try {
    const data = JSON.parse(localStorage.getItem(FLOW_STORE) || "{}");
    return {
      approved: Array.isArray(data.approved) ? data.approved : [],
      rejected: Array.isArray(data.rejected) ? data.rejected : [],
      drawn: Array.isArray(data.drawn) ? data.drawn : [],
      url: typeof data.url === "string" ? data.url : "",
    };
  } catch (err) {
    return { approved: [], rejected: [], drawn: [], url: "" };
  }
}

function writeFlowStore(store) {
  try {
    localStorage.setItem(FLOW_STORE, JSON.stringify(store));
  } catch (err) {
    /* tarayıcı kaydı kapalıysa onay bu sekmede kalır */
  }
}

function restoreFlowDecisions() {
  const store = readFlowStore();
  const drawn = new Set(store.drawn);
  if (store.url && !state.flow.url) state.flow.url = store.url;
  store.approved.forEach((record) => {
    if (!record || !record.id) return;
    const existing = state.flow.ideas.find((item) => item.id === record.id || item.title === record.title);
    const hasFlow = Boolean(record.flow) || drawn.has(record.id);
    if (existing) {
      if (hasFlow) existing.flow = true;
      return;
    }
    state.flow.ideas.unshift(Object.assign({}, record, { source: "decision", flow: hasFlow }));
  });
  state.ideas.forEach((idea) => {
    const flowId = `flow-${idea.id}`;
    const approved = store.approved.some((item) => item.id === flowId || item.sourceId === idea.id || item.title === idea.title);
    if (approved) idea.verdict = "approved";
    else if (store.rejected.includes(idea.id)) idea.verdict = "rejected";
  });
}

function rememberApproval(idea, record) {
  const store = readFlowStore();
  store.approved = store.approved.filter((item) => item.id !== record.id && item.title !== record.title);
  store.approved.unshift(record);
  store.rejected = store.rejected.filter((item) => item !== idea.id);
  writeFlowStore(store);
}

function rememberRejection(idea) {
  const flowId = `flow-${idea.id}`;
  const store = readFlowStore();
  store.approved = store.approved.filter((item) => item.id !== flowId && item.sourceId !== idea.id && item.title !== idea.title);
  if (!store.rejected.includes(idea.id)) store.rejected.push(idea.id);
  writeFlowStore(store);
}

function rememberFlowDrawn(flowIdea, drawn) {
  const store = readFlowStore();
  store.drawn = store.drawn.filter((item) => item !== flowIdea.id);
  if (drawn) store.drawn.push(flowIdea.id);
  const saved = store.approved.find((item) => item.id === flowIdea.id || item.title === flowIdea.title);
  if (saved) saved.flow = drawn;
  writeFlowStore(store);
}

function flowRecord(idea) {
  const now = new Date();
  return {
    id: `flow-${idea.id}`,
    source: "decision",
    title: idea.title,
    subtitle: idea.subtitle || "",
    scene: idea.scene || "app",
    type: idea.category || state.productType || "Oyun",
    date: new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(now),
    time: new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(now),
    score: Number(idea.score) || 0,
    sourceId: idea.id,
    flow: false,
  };
}

function approveIdea(id) {
  const idea = state.ideas.find((item) => item.id === id);
  if (!idea) return;
  idea.verdict = "approved";
  const flowId = `flow-${idea.id}`;
  const record = flowRecord(idea);
  record.flow = readFlowStore().drawn.includes(record.id);
  if (!state.flow.ideas.some((item) => item.id === flowId || item.title === idea.title)) {
    state.flow.ideas.unshift(record);
  }
  rememberApproval(idea, record);
  selectIdea(id);
  showPage("flow");
}

function rejectIdea(id) {
  const idea = state.ideas.find((item) => item.id === id);
  if (!idea) return;
  idea.verdict = "rejected";
  const flowId = `flow-${idea.id}`;
  state.flow.ideas = state.flow.ideas.filter((item) => !(item.source === "decision" && item.id === flowId));
  delete state.flow.selected[flowId];
  rememberRejection(idea);
  renderList();
}

function selectIdea(id) {
  state.selectedId = id;
  state.expanded = { problems: false, competitors: false, reviews: false };
  state.sheet = null;
  renderSheet();
  renderList();
  renderDetail();
  renderAux();
  ensureBrief(currentIdea());
}

function applyRun(run) {
  state.sample = false;
  state.run = run;
  state.ideas = run.ideas || [];
  state.selectedId = state.ideas[0] ? state.ideas[0].id : null;
  state.expanded = { problems: false, competitors: false, reviews: false };
  state.productType = run.product_type || state.productType;
  state.scope = run.scope || state.scope;
  state.criteria = run.criteria || "";
  const field = document.getElementById("criteria");
  if (field) field.value = state.criteria;
}

function useSample() {
  state.sample = true;
  state.run = null;
  state.ideas = SAMPLE;
  state.selectedId = SAMPLE[0].id;
}

function fillMenu(id, items, onPick) {
  const menu = document.getElementById(id);
  menu.innerHTML = items.map((item) => `
    <button type="button" data-value="${esc(item.id)}"><strong>${esc(item.label)}</strong>${item.desc ? `<small>${esc(item.desc)}</small>` : ""}</button>
  `).join("");
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    onPick(button.dataset.value);
    closeMenus();
  });
}

function closeMenus() {
  document.querySelectorAll(".menu").forEach((menu) => menu.setAttribute("hidden", ""));
}

function toggleMenu(id) {
  const menu = document.getElementById(id);
  const willOpen = menu.hasAttribute("hidden");
  closeMenus();
  if (willOpen) menu.removeAttribute("hidden");
}

function bind() {
  fillMenu("type-menu", TYPES, (value) => { state.productType = value; renderChrome(); });
  fillMenu("scope-menu", SCOPES, (value) => { state.scope = value; renderChrome(); });
  fillMenu("sort-menu", SORTS, (value) => { state.sort = value; renderList(); renderChrome(); });
  fillMenu("filter-menu", FILTERS, (value) => { state.filter = value; renderList(); renderChrome(); });

  document.getElementById("type-btn").addEventListener("click", () => toggleMenu("type-menu"));
  document.getElementById("scope-btn").addEventListener("click", () => toggleMenu("scope-menu"));
  document.getElementById("sort-btn").addEventListener("click", () => toggleMenu("sort-menu"));
  document.getElementById("filter-btn").addEventListener("click", () => toggleMenu("filter-menu"));
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".popover-host") && !event.target.closest(".field")) closeMenus();
  });

  document.getElementById("criteria").addEventListener("input", (event) => {
    state.criteria = event.target.value;
  });
  document.getElementById("start-btn").addEventListener("click", startResearch);
  document.getElementById("idea-list").addEventListener("click", (event) => {
    const approve = event.target.closest("[data-approve]");
    if (approve) {
      approveIdea(approve.dataset.approve);
      return;
    }
    const reject = event.target.closest("[data-reject]");
    if (reject) {
      rejectIdea(reject.dataset.reject);
      return;
    }
    const card = event.target.closest("[data-id]");
    if (!card) return;
    selectIdea(card.dataset.id);
  });
  document.getElementById("detail").addEventListener("click", (event) => {
    if (event.target.closest("[data-retry-brief]")) {
      const idea = currentIdea();
      if (idea) delete state.briefs[idea.id];
      renderDetail();
      ensureBrief(idea);
      return;
    }
    const button = event.target.closest("[data-expand]");
    if (!button) return;
    openSheet(button.dataset.expand);
  });
  document.getElementById("fullpage").addEventListener("click", (event) => {
    if (event.target.closest("[data-close-sheet]")) {
      closeSheet();
      return;
    }
    if (event.target.closest("[data-retry-dossier]")) {
      const idea = currentIdea();
      if (!idea) return;
      delete state.dossiers[idea.id];
      state.dossiers[idea.id] = { status: "loading" };
      renderSheet();
      delete state.dossiers[idea.id];
      ensureDossier(idea);
    }
  });
  document.body.addEventListener("click", (event) => {
    const page = event.target.closest("[data-page]");
    if (page) showPage(page.dataset.page);
    const runButton = event.target.closest("[data-run]");
    if (runButton) openRun(runButton.dataset.run);
  });
  const flowView = document.getElementById("view-flow");
  flowView.addEventListener("input", (event) => {
    if (event.target.id === "flow-url") {
      state.flow.url = event.target.value;
      const store = readFlowStore();
      store.url = state.flow.url;
      writeFlowStore(store);
      return;
    }
    if (event.target.id === "flow-search") {
      state.flow.query = event.target.value;
      renderFlow();
    }
  });
  flowView.addEventListener("click", (event) => {
    if (event.target.closest("#flow-filter-btn")) {
      toggleMenu("flow-filter-menu");
      return;
    }
    const filterPick = event.target.closest("[data-flow-filter]");
    if (filterPick) {
      state.flow.filter = filterPick.dataset.flowFilter;
      closeMenus();
      renderFlow();
      return;
    }
    if (event.target.closest("#flow-bell")) {
      state.flow.bell = !state.flow.bell;
      state.flow.menu = null;
      renderFlow();
      return;
    }
    if (event.target.closest("#flow-create")) {
      createFlows(visibleFlowIdeas().filter((item) => state.flow.selected[item.id]).map((item) => item.id));
      return;
    }
    const check = event.target.closest("[data-flow-check]");
    if (check) {
      const id = check.dataset.flowCheck;
      if (state.flow.selected[id]) delete state.flow.selected[id];
      else state.flow.selected[id] = true;
      renderFlow();
      return;
    }
    if (event.target.closest("[data-flow-all]")) {
      const visible = visibleFlowIdeas();
      const allOn = visible.length > 0 && visible.every((item) => state.flow.selected[item.id]);
      visible.forEach((item) => {
        if (allOn) delete state.flow.selected[item.id];
        else state.flow.selected[item.id] = true;
      });
      renderFlow();
      return;
    }
    const make = event.target.closest("[data-flow-make]");
    if (make) {
      createFlows([make.dataset.flowMake]);
      return;
    }
    const open = event.target.closest("[data-flow-open]");
    if (open) {
      const href = figjamHref(state.flow.url);
      if (!href) {
        state.flow.error = "FigJam'de açmak için pano bağlantısını yapıştır.";
        state.flow.notice = "";
        renderFlow();
        return;
      }
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    const more = event.target.closest("[data-flow-more]");
    if (more) {
      state.flow.menu = state.flow.menu === more.dataset.flowMore ? null : more.dataset.flowMore;
      state.flow.bell = false;
      renderFlow();
      return;
    }
    const clear = event.target.closest("[data-flow-clear]");
    if (clear) {
      const idea = state.flow.ideas.find((item) => item.id === clear.dataset.flowClear);
      if (idea) {
        idea.flow = false;
        rememberFlowDrawn(idea, false);
      }
      state.flow.menu = null;
      state.flow.notice = "";
      renderFlow();
    }
  });
  const designView = document.getElementById("view-design");
  designView.addEventListener("input", (event) => {
    const field = event.target;
    if (field.id === "design-search") state.design.query = field.value;
    if (field.id === "design-url") state.design.url = field.value;
    if (field.id === "design-about") {
      state.design.about = field.value.slice(0, 2000);
      const count = document.getElementById("design-about-count");
      if (count) count.textContent = `${state.design.about.length}/2000`;
    }
    if (field.id === "design-notes") {
      state.design.notes = field.value.slice(0, 1000);
      const count = document.getElementById("design-notes-count");
      if (count) count.textContent = `${state.design.notes.length}/1000`;
    }
  });
  designView.addEventListener("change", (event) => {
    const box = event.target.closest("[data-scope]");
    if (!box) return;
    state.design.scope[box.dataset.scope] = box.checked;
  });
  designView.addEventListener("click", (event) => {
    if (event.target.closest("#design-bell")) {
      state.design.bell = !state.design.bell;
      renderDesign();
      return;
    }
    if (event.target.closest("#design-example")) {
      state.design.url = "https://www.figma.com/design/ornek/dil-ogrenme";
      state.design.error = "";
      renderDesign();
      return;
    }
    if (event.target.closest("#design-run") || event.target.closest("#design-rerun")) {
      runDesignReview();
      return;
    }
    const tab = event.target.closest("[data-design-tab]");
    if (tab) {
      state.design.tab = tab.dataset.designTab;
      renderDesign();
    }
  });
  const projectView = document.getElementById("view-projects");
  projectView.addEventListener("input", (event) => {
    const field = event.target;
    if (field.id === "project-search" || field.id === "project-top-search") {
      state.projects.query = field.value;
      renderProjects();
      return;
    }
    if (field.id === "project-title") state.projects.draftTitle = field.value;
    if (field.id === "project-blurb") state.projects.draftBlurb = field.value;
  });
  projectView.addEventListener("change", (event) => {
    if (event.target.id === "project-kind") state.projects.draftKind = event.target.value;
  });
  projectView.addEventListener("submit", (event) => {
    if (event.target.id !== "project-form") return;
    event.preventDefault();
    addProject();
  });
  projectView.addEventListener("click", (event) => {
    if (event.target.closest("#project-bell")) {
      state.projects.bell = !state.projects.bell;
      renderProjects();
      return;
    }
    if (event.target.closest("#project-new")) {
      state.projects.creating = !state.projects.creating;
      renderProjects();
      return;
    }
    if (event.target.closest("#project-cancel")) {
      state.projects.creating = false;
      renderProjects();
      return;
    }
    if (event.target.closest("#project-sort")) {
      toggleMenu("project-sort-menu");
      return;
    }
    const sort = event.target.closest("[data-project-sort]");
    if (sort) {
      state.projects.sort = sort.dataset.projectSort;
      closeMenus();
      renderProjects();
      return;
    }
    const filter = event.target.closest("[data-project-filter]");
    if (filter) {
      state.projects.filter = filter.dataset.projectFilter;
      renderProjects();
      return;
    }
    const menu = event.target.closest("[data-project-menu]");
    if (menu) {
      state.projects.menu = state.projects.menu === menu.dataset.projectMenu ? null : menu.dataset.projectMenu;
      renderProjects();
      return;
    }
    const status = event.target.closest("[data-project-status]");
    if (status) {
      const item = projectItems().find((project) => project.id === status.dataset.projectId);
      if (item) {
        item.status = status.dataset.projectStatus;
        if (item.status === "tamamlandi") item.progress = PROJECT_STEPS.length;
      }
      state.projects.menu = null;
      renderProjects();
    }
  });
  const homeView = document.getElementById("view-home");
  homeView.addEventListener("input", (event) => {
    if (event.target.id !== "home-search") return;
    state.home.query = event.target.value;
    renderHome();
  });
  homeView.addEventListener("click", (event) => {
    if (event.target.closest("#home-bell")) {
      state.home.bell = !state.home.bell;
      renderHome();
      return;
    }
    if (event.target.closest("#home-caret")) {
      toggleMenu("home-launch-menu");
      return;
    }
    if (event.target.closest("#home-range")) {
      toggleMenu("home-range-menu");
      return;
    }
    const range = event.target.closest("[data-home-range]");
    if (range) {
      state.home.range = range.dataset.homeRange;
      closeMenus();
      renderHome();
      return;
    }
    const scope = event.target.closest("[data-home-scope]");
    if (scope) {
      state.scope = scope.dataset.homeScope;
      closeMenus();
      showPage("research");
      renderChrome();
      return;
    }
    const ideaButton = event.target.closest("[data-home-idea]");
    if (ideaButton) {
      const title = ideaButton.dataset.homeIdea;
      const idea = state.ideas.find((item) => title.startsWith(item.title) || item.title.startsWith(title));
      if (idea) selectIdea(idea.id);
      showPage("research");
    }
  });
  document.getElementById("history-btn").addEventListener("click", () => {
    renderHistory();
    document.getElementById("history-drawer").hidden = false;
  });
  document.getElementById("close-history").addEventListener("click", () => {
    document.getElementById("history-drawer").hidden = true;
  });
  document.getElementById("history-drawer").addEventListener("click", (event) => {
    if (event.target.id === "history-drawer") event.currentTarget.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.sheet) {
        closeSheet();
        return;
      }
      closeMenus();
      document.getElementById("history-drawer").hidden = true;
    }
  });
}

function openRun(id) {
  const run = state.history.find((item) => item.id === id);
  if (!run) return;
  applyRun(run);
  state.error = "";
  showPage("research");
  renderList();
  renderDetail();
  renderChrome();
  ensureBrief(currentIdea());
}

async function startResearch() {
  if (state.running) return;
  state.criteria = document.getElementById("criteria").value;
  if (state.scope === "idea" && state.criteria.trim().length < 8) {
    fail("Fikir araştırması için aklındaki fikri birkaç cümleyle yaz.");
    return;
  }
  state.running = true;
  state.error = "";
  state.step = "plan";
  state.message = "Araştırma planı hazırlanıyor";
  state.started = Date.now();
  renderChrome();
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    const node = document.getElementById("progress-time");
    if (node) node.textContent = `${Math.floor((Date.now() - state.started) / 1000)} sn`;
  }, 1000);

  try {
    const response = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_type: state.productType,
        scope: state.scope,
        criteria: state.criteria,
      }),
    });
    if (!response.ok) {
      let message = "Araştırma başlamadı";
      try {
        const body = await response.json();
        message = typeof body.detail === "string" ? body.detail : message;
      } catch (err) { /* gövde json değil */ }
      throw new Error(message);
    }
    await readStream(response);
  } catch (err) {
    fail(err.message || "Araştırma tamamlanamadı");
  } finally {
    state.running = false;
    clearInterval(state.timer);
    renderChrome();
  }
}

async function readStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop();
    for (const chunk of chunks) {
      let event = "message";
      let data = "";
      chunk.split("\n").forEach((line) => {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      });
      if (!data) continue;
      const payload = JSON.parse(data);
      if (event === "progress") {
        state.step = payload.step || state.step;
        state.message = payload.message || state.message;
        renderChrome();
      } else if (event === "result") {
        applyRun(payload);
        restoreFlowDecisions();
        state.history = [payload, ...state.history.filter((item) => item.id !== payload.id)].slice(0, 20);
        state.error = "";
        state.step = "save";
        state.message = "Keşif hazır";
        renderList();
        renderDetail();
        renderAux();
        ensureBrief(currentIdea());
      } else if (event === "error") {
        throw new Error(payload.message || "Araştırma tamamlanamadı");
      }
    }
  }
}

function fail(message) {
  state.error = message;
  state.running = false;
  renderChrome();
}

async function init() {
  bind();
  useSample();
  try {
    const [config, latest, history] = await Promise.all([
      fetch("/api/config").then((res) => res.json()),
      fetch("/api/latest").then((res) => res.json()),
      fetch("/api/history").then((res) => res.json()),
    ]);
    state.config = config;
    state.history = history.runs || [];
    if (latest.run && latest.run.ideas && latest.run.ideas.length) applyRun(latest.run);
  } catch (err) {
    state.error = "Panel verisi okunamadı. Sayfayı yenile.";
  }
  restoreFlowDecisions();
  renderList();
  renderDetail();
  renderChrome();
  showPage(savedPage());
  ensureBrief(currentIdea());
}

init();
