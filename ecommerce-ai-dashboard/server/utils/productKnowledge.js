/**
 * productKnowledge.js
 * Built-in product knowledge base used when Gemini quota is exceeded.
 * Returns detailed, accurate descriptions based on product name matching.
 */

// ── Known product database ───────────────────────────────────────────────────
const PRODUCTS = [
  // ── Headphones ──────────────────────────────────────────────────────────────
  {
    match: ['wh-1000xm5','wh1000xm5'],
    name: 'Sony WH-1000XM5',
    short: 'The Sony WH-1000XM5 is a wireless over-ear headphone with industry-leading noise cancellation, 30-hour battery life, and multipoint Bluetooth connectivity for audiophiles and remote workers.',
    long: `The Sony WH-1000XM5 is Sony's flagship wireless noise-cancelling headphone, built for commuters, remote workers, and audiophiles who demand silence and clarity in equal measure. It uses eight microphones and two processors to analyse and cancel ambient noise in real time, making it one of the most effective noise-cancelling headphones available today.\n\nThe WH-1000XM5 features a 40mm driver with a new carbon-fibre composite diaphragm that delivers balanced sound across bass, mid, and treble frequencies. Bluetooth 5.2 with multipoint connection lets you stay linked to two devices simultaneously. A 30-hour battery life with quick charging (3 minutes charge for 3 hours of playback) ensures you are never caught without power. The headphone weighs 250g and uses a redesigned lightweight frame with synthetic leather ear pads rated for all-day comfort.\n\nThe WH-1000XM5 excels on long-haul flights, in open-plan offices, and during focus work at home. Its Speak-to-Chat feature automatically pauses music when you start talking, and the companion Sony Headphones Connect app lets you fine-tune the equaliser and noise-cancellation level.`,
    bullets: [
      '30-hour battery life with 3-minute quick charge (3 hours playback) — stay unplugged all day',
      '8 microphones + 2 processors for industry-leading active noise cancellation',
      'Bluetooth 5.2 with multipoint — connect to two devices simultaneously',
      '40mm carbon-fibre composite driver for balanced bass, mid, and treble response',
      'Lightweight 250g frame with synthetic leather ear pads rated for all-day wear',
    ],
    tags: ['sony wh-1000xm5','buy sony wh-1000xm5','wh-1000xm5 review','best noise cancelling headphones 2025','sony headphones wireless','wh1000xm5 price'],
  },
  {
    match: ['airpods pro'],
    name: 'Apple AirPods Pro',
    short: 'The Apple AirPods Pro are true wireless in-ear headphones with Active Noise Cancellation, Adaptive Transparency mode, and up to 30 hours total listening time with the MagSafe charging case.',
    long: `The Apple AirPods Pro are designed for iPhone and Apple Watch users who want seamless integration, strong noise cancellation, and a secure fit for active use. The H2 chip powers computational audio that continuously adjusts noise cancellation and sound quality in real time, delivering noticeably cleaner audio than standard earbuds.\n\nEach AirPods Pro earbud includes three silicone ear tip sizes for a personalised fit, an IPX4 water resistance rating, and force sensor controls on the stem. Active Noise Cancellation blocks external noise, while Adaptive Transparency lets in environmental sound at a safe, processed volume. Spatial Audio with dynamic head tracking creates a theatre-like sound stage for supported content. A single charge provides 6 hours of listening, and the MagSafe case adds another 24 hours for a total of 30 hours.\n\nThe AirPods Pro integrate tightly with the Apple ecosystem — instant pairing with all signed-in iCloud devices, automatic switching between iPhone, iPad, and Mac, and Siri voice commands without lifting your phone.`,
    bullets: [
      'Active Noise Cancellation with H2 chip — blocks external noise in real time',
      'Adaptive Transparency mode — lets in ambient sound at a safe, processed level',
      'Up to 30 hours total playback with MagSafe charging case (6 hours per charge)',
      'IPX4 water resistance — safe for sweat and light rain',
      'Spatial Audio with dynamic head tracking for immersive, theatre-like sound',
    ],
    tags: ['apple airpods pro','airpods pro review','best true wireless earbuds','airpods pro noise cancelling','buy airpods pro','airpods pro price'],
  },

  // ── Smartphones ──────────────────────────────────────────────────────────────
  {
    match: ['iphone 15 pro'],
    name: 'Apple iPhone 15 Pro',
    short: 'The Apple iPhone 15 Pro is a flagship smartphone with the A17 Pro chip, a titanium frame, a 48MP triple camera system, and USB 3 speeds via USB-C.',
    long: `The iPhone 15 Pro is Apple's top-tier iPhone for 2023, built for professionals and enthusiasts who need the fastest processor, the best cameras, and a durable premium build. The A17 Pro chip, built on a 3nm process, delivers class-leading CPU and GPU performance while maintaining efficient battery use throughout the day.\n\nThe iPhone 15 Pro features a 6.1-inch Super Retina XDR OLED display with ProMotion (1–120Hz adaptive refresh), 2000 nits peak outdoor brightness, and Always-On Display. The titanium frame reduces weight compared to stainless steel while improving structural rigidity. The triple camera system includes a 48MP main sensor, a 12MP ultrawide, and a 12MP 3× telephoto — all supported by Apple's Photonic Engine for computational photography. USB-C replaces Lightning and supports USB 3 transfer speeds up to 10Gbps.\n\nThe iPhone 15 Pro runs iOS 17 with Action Button customisation, satellite Emergency SOS, and crash detection. It is available in Natural Titanium, Blue Titanium, White Titanium, and Black Titanium finishes.`,
    bullets: [
      'A17 Pro chip (3nm) — fastest mobile processor with hardware ray tracing support',
      '48MP main camera with Photonic Engine — captures detailed photos in low light',
      'Titanium frame — stronger and lighter than stainless steel at 187g',
      'USB-C with USB 3 speeds — transfer 4K ProRes video at up to 10Gbps',
      '6.1-inch ProMotion OLED with Always-On Display — 2000 nits peak brightness',
    ],
    tags: ['iphone 15 pro','buy iphone 15 pro','iphone 15 pro review','apple iphone 2023','iphone 15 pro price','best iphone 2025'],
  },
  {
    match: ['samsung galaxy s24','galaxy s24 ultra'],
    name: 'Samsung Galaxy S24',
    short: 'The Samsung Galaxy S24 is an Android flagship with the Snapdragon 8 Gen 3 processor, a 50MP triple camera system, 7 years of OS updates, and Galaxy AI on-device features.',
    long: `The Samsung Galaxy S24 is Samsung's 2024 flagship smartphone, designed for Android power users who want top-tier performance, a versatile camera, and long-term software support. The Snapdragon 8 Gen 3 chip delivers fast app performance, smooth gaming, and efficient background processing.\n\nThe Galaxy S24 uses a 6.2-inch Dynamic AMOLED display with a 120Hz adaptive refresh rate, 2600 nits peak brightness, and Gorilla Glass Armor on the front. The 50MP main camera is paired with a 12MP ultrawide and a 10MP 3× telephoto, all enhanced by Galaxy AI for features like Generative Edit and Circle to Search. The 4000mAh battery supports 25W wired and 15W wireless charging. Samsung has committed to 7 years of Android OS and security updates.\n\nThe S24 also introduces Galaxy AI — a suite of on-device and cloud AI tools including Live Translate for real-time call translation, Chat Assist for messaging suggestions, and Note Assist for automatic meeting summaries.`,
    bullets: [
      'Snapdragon 8 Gen 3 — flagship performance for gaming and multitasking',
      '50MP triple camera with Galaxy AI — Generative Edit and Circle to Search',
      '7 years of OS and security updates — longest commitment in Android',
      '6.2-inch 120Hz Dynamic AMOLED — 2600 nits peak outdoor brightness',
      '25W wired + 15W wireless charging with 4000mAh battery',
    ],
    tags: ['samsung galaxy s24','buy galaxy s24','galaxy s24 review','samsung flagship 2024','galaxy s24 price','best android phone 2025'],
  },

  // ── Laptops ──────────────────────────────────────────────────────────────────
  {
    match: ['macbook air m2','macbook air m3'],
    name: 'Apple MacBook Air M2',
    short: 'The Apple MacBook Air M2 is a fanless ultrabook with the Apple M2 chip, 18-hour battery life, a Liquid Retina display, and a 1.24kg weight — designed for students and professionals.',
    long: `The MacBook Air M2 is Apple's best-selling laptop, built around the M2 chip which integrates CPU, GPU, and Neural Engine on a single 5nm die. Without a fan, it operates completely silently under typical workloads and stays cool enough for sustained use during writing, browsing, video editing, and coding.\n\nThe M2 MacBook Air features a 13.6-inch Liquid Retina display with 500 nits brightness, P3 wide colour, and True Tone. It ships with 8GB or 16GB of unified memory and 256GB to 2TB SSD storage, all soldered to the logic board for fast access speeds. MagSafe 3 returns for charging, alongside two Thunderbolt 4 ports. The 52.6Wh battery delivers up to 18 hours of video playback. At 1.24kg and 11.3mm thin, it is Apple's most portable Mac.\n\nThe MacBook Air M2 runs macOS with full support for iPhone and iPad apps, Universal Control for multi-device workflows, and Continuity Camera to use an iPhone as a webcam.`,
    bullets: [
      'Apple M2 chip (5nm) — fanless design with up to 18-hour battery life',
      '13.6-inch Liquid Retina display — 500 nits, P3 wide colour, True Tone',
      '1.24kg at 11.3mm thin — the lightest Mac laptop available',
      'MagSafe 3 + two Thunderbolt 4 ports — fast charging and versatile connectivity',
      'Unified memory architecture — 8GB or 16GB shared between CPU and GPU',
    ],
    tags: ['macbook air m2','buy macbook air','macbook air m2 review','best ultrabook 2025','apple laptop','macbook air price'],
  },
  {
    match: ['dell xps 15','dell xps 13','dell xps'],
    name: 'Dell XPS 15',
    short: 'The Dell XPS 15 is a premium Windows laptop with a 15.6-inch OLED or IPS display, up to Intel Core i9 processor, NVIDIA GeForce RTX graphics, and a CNC-machined aluminium chassis.',
    long: `The Dell XPS 15 is Dell's flagship consumer laptop, targeting creative professionals, developers, and power users who need a large, high-resolution display and dedicated GPU in a portable form factor. It is built around Intel's 13th or 14th Gen Core processors paired with NVIDIA GeForce RTX 4060 or 4070 graphics, making it capable of handling video editing, 3D rendering, and software development alongside everyday productivity.\n\nThe XPS 15 offers a 15.6-inch display in two configurations: a 1920×1200 IPS panel for all-day battery life, or a 3456×2160 OLED touch panel with 100% DCI-P3 colour coverage and 400 nits brightness for colour-accurate creative work. The chassis is CNC-machined aluminium with a carbon fibre palm rest, weighing approximately 1.86kg. It ships with up to 64GB DDR5 RAM and up to 4TB PCIe Gen 4 SSD storage. Connectivity includes two Thunderbolt 4 ports, a USB-A 3.2 port, an SD card reader, and a 3.5mm headphone jack.\n\nThe XPS 15 runs Windows 11 and includes Dell's Optimizer software for AI-based performance tuning. Battery life ranges from 6 to 13 hours depending on display and workload choice.`,
    bullets: [
      'Intel Core i7/i9 (13th/14th Gen) + NVIDIA RTX 4060 — handles video editing and 3D work',
      '15.6-inch OLED option with 3456×2160 and 100% DCI-P3 — accurate colour for creatives',
      'CNC aluminium chassis with carbon fibre palm rest — weighs 1.86kg',
      'Up to 64GB DDR5 RAM + 4TB PCIe Gen 4 SSD — fast memory and storage',
      'Thunderbolt 4 × 2 + SD card reader + USB-A — full connectivity in one device',
    ],
    tags: ['dell xps 15','buy dell xps 15','dell xps 15 review','best windows laptop 2025','dell laptop','xps 15 price'],
  },
  {
    match: ['dell inspiron'],
    name: 'Dell Inspiron',
    short: 'The Dell Inspiron is a mainstream laptop line offering Intel or AMD processors, Full HD displays, and solid everyday performance at an accessible price for students and home users.',
    long: `The Dell Inspiron series is designed for students, home users, and entry-level professionals who need a reliable, no-fuss Windows laptop for everyday tasks. Depending on the configuration, Inspiron models ship with Intel Core i3 to i7 processors or AMD Ryzen 5 to Ryzen 7 chips, paired with 8GB to 16GB of DDR4 or DDR5 RAM and 256GB to 1TB SSD storage.\n\nThe Inspiron lineup uses Full HD (1920×1080) IPS displays across its 14-inch and 15.6-inch models, with typical brightness between 250 and 300 nits — suitable for indoor use and standard productivity work. The chassis uses a plastic build with a textured finish, keeping the weight between 1.6kg and 1.8kg. Battery life ranges from 6 to 9 hours depending on the processor and usage. Ports include USB-A, USB-C, HDMI, and a 3.5mm audio jack.\n\nThe Inspiron runs Windows 11 Home and is available through Dell's website with multiple configuration options, allowing buyers to choose storage, RAM, and processor to match their budget.`,
    bullets: [
      'Intel Core i3–i7 or AMD Ryzen 5/7 — flexible processor options at multiple price points',
      'Full HD IPS display — 1920×1080 resolution for clear text and everyday media',
      '256GB–1TB SSD — fast boot times and adequate storage for documents and media',
      '8GB–16GB DDR4/DDR5 RAM — handles multitasking for school and office use',
      'USB-A, USB-C, HDMI ports — connects to monitors, drives, and accessories',
    ],
    tags: ['dell inspiron','buy dell inspiron','dell inspiron review','best budget laptop 2025','dell student laptop','inspiron price'],
  },
  {
    match: ['lenovo thinkpad','thinkpad x1','thinkpad e14','thinkpad t14'],
    name: 'Lenovo ThinkPad',
    short: 'The Lenovo ThinkPad is a business laptop renowned for its MIL-SPEC durability, precise keyboard, Intel vPro security, and up to 20-hour battery life in slim, professional designs.',
    long: `The Lenovo ThinkPad series is built for business professionals and enterprise users who prioritise reliability, security, and keyboard quality over flashy design. ThinkPads undergo MIL-SPEC 810H testing covering drops, vibration, temperature extremes, and humidity — a standard that has defined the line since its IBM origins in 1992.\n\nThe ThinkPad X1 Carbon, the flagship model, weighs as little as 1.12kg while fitting an Intel Core Ultra or 13th Gen Core i7 processor, 16GB to 32GB LPDDR5 RAM, and a 512GB to 2TB PCIe SSD into a carbon-fibre and magnesium alloy chassis. The 14-inch IPS or OLED display options include models certified for low blue light and anti-glare coatings. The TrackPoint pointing stick, found on every ThinkPad, allows cursor control without moving hands away from the keyboard. Security features include a fingerprint reader, IR webcam for Windows Hello, and optional Intel vPro with hardware-level threat protection.\n\nBattery life in the X1 Carbon reaches up to 15 hours in normal use. Connectivity includes Thunderbolt 4, USB-A, HDMI 2.0, and a nano SIM slot on LTE-enabled models.`,
    bullets: [
      'MIL-SPEC 810H certified — tested against drops, extreme temperatures, and humidity',
      'TrackPoint pointing stick — cursor control without leaving the keyboard home row',
      'Intel vPro security option — hardware-level threat detection for enterprise use',
      'Up to 15-hour battery (X1 Carbon) — lasts through a full business day',
      'Carbon fibre + magnesium chassis — weighs from 1.12kg with rigid structural strength',
    ],
    tags: ['lenovo thinkpad','buy lenovo thinkpad','thinkpad review','best business laptop 2025','lenovo laptop','thinkpad price'],
  },
  {
    match: ['lenovo ideapad','ideapad 3','ideapad 5','ideapad slim'],
    name: 'Lenovo IdeaPad',
    short: 'The Lenovo IdeaPad is a budget-to-midrange laptop line with Full HD displays, AMD Ryzen or Intel Core processors, and thin designs aimed at students and everyday home users.',
    long: `The Lenovo IdeaPad series covers the budget and mid-range consumer laptop market, offering configurations from entry-level Intel Core i3 or AMD Ryzen 3 up to Intel Core i7 or AMD Ryzen 7, depending on the model. IdeaPad laptops are designed for web browsing, document work, media consumption, and light creative tasks.\n\nIdeaPad 5 and Slim models feature aluminium lids and plastic bases, Full HD IPS displays with 300 nits brightness, and starting storage of 256GB SSD. RAM options begin at 8GB and can be upgraded to 16GB on most models. Battery life is rated at 7 to 10 hours depending on processor and screen brightness. Ports typically include USB-A 3.2, USB-C, HDMI 1.4, and a 3.5mm jack. The IdeaPad 5 Pro upgrades to a 2.8K or 2K display with 90Hz refresh for sharper visuals.\n\nThe IdeaPad series runs Windows 11 Home and is frequently available at competitive prices, making it a popular choice for students looking for a capable first laptop.`,
    bullets: [
      'AMD Ryzen 5/7 or Intel Core i5/i7 — handles everyday computing and light multitasking',
      'Full HD IPS display — 1920×1080 with 300 nits for indoor use',
      '256GB–512GB SSD — fast startup and adequate storage for school or home use',
      '7–10 hour battery — gets through a school or work day on a single charge',
      'Thin and lightweight — most IdeaPad models weigh under 1.7kg',
    ],
    tags: ['lenovo ideapad','buy lenovo ideapad','ideapad review','best student laptop 2025','lenovo budget laptop','ideapad price'],
  },

  // ── Shoes ────────────────────────────────────────────────────────────────────
  {
    match: ['nike air max 270'],
    name: 'Nike Air Max 270',
    short: 'The Nike Air Max 270 is a lifestyle sneaker featuring Nike\'s largest Air heel unit at 32mm, a breathable mesh upper, and a foam midsole designed for all-day comfort.',
    long: `The Nike Air Max 270 is Nike's first lifestyle Air Max shoe designed specifically for all-day wear rather than athletic performance. It centres on a 32mm Air heel unit — the largest of any Nike lifestyle shoe — which provides visible cushioning and responsive underfoot comfort during walking and casual everyday use.\n\nThe upper is made from engineered mesh for breathability, overlaid with reinforced panels at the toe and midfoot for structure. The midsole combines a foam layer with the Air unit to balance softness and responsiveness. The rubber outsole uses a waffle-pattern traction layout that offers grip on both indoor and outdoor surfaces. The shoe weighs approximately 298g in a US size 10 and is available in a wide range of colourways.\n\nThe Air Max 270 is popular for street style, casual outfits, and light city walking. It pairs easily with jeans, joggers, and casual trousers, making it a versatile addition to any everyday wardrobe.`,
    bullets: [
      '32mm Air heel unit — Nike\'s largest lifestyle Air cushion for all-day comfort',
      'Engineered mesh upper — lightweight and breathable for warm-weather wear',
      'Foam + Air midsole combination — balances softness and step responsiveness',
      'Rubber waffle outsole — durable grip on indoor and outdoor surfaces',
      'Available in 20+ colourways — versatile styling for casual and street looks',
    ],
    tags: ['nike air max 270','buy nike air max 270','air max 270 review','nike lifestyle sneakers','air max 270 price','best nike shoes 2025'],
  },

  // ── Coffee Makers ────────────────────────────────────────────────────────────
  {
    match: ['nespresso vertuo','nespresso original'],
    name: 'Nespresso Vertuo',
    short: 'The Nespresso Vertuo is a pod coffee machine that brews five cup sizes from espresso to alto using centrifusion technology, producing a consistent crema layer in under 30 seconds.',
    long: `The Nespresso Vertuo is designed for coffee drinkers who want café-quality coffee at home without the complexity of a traditional espresso machine. It uses Nespresso's Centrifusion technology — spinning the capsule up to 7000 RPM while hot water flows through — to extract a full-bodied cup with a thick crema layer regardless of cup size.\n\nThe Vertuo brews five cup sizes: espresso (40ml), double espresso (80ml), gran lungo (150ml), mug (230ml), and alto (414ml). Each Vertuo capsule has a barcode on the rim that the machine reads to automatically set brewing temperature, water volume, and spin speed for that specific blend. The machine heats up in 15 seconds and enters energy-saving mode after 9 minutes of inactivity. The 1.1-litre water tank is removable for easy refilling.\n\nThe Nespresso Vertuo is available in several model variants — Vertuo Pop, Next, and Plus — at different price points, all using the same Vertuo capsule format.`,
    bullets: [
      'Centrifusion technology — spins capsule at 7000 RPM for consistent extraction',
      'Brews 5 cup sizes from 40ml espresso to 414ml alto with one machine',
      'Barcode-reading system — automatically adjusts settings per capsule blend',
      '15-second heat-up time — ready faster than most coffee machines',
      '1.1-litre removable water tank — easy to refill without moving the machine',
    ],
    tags: ['nespresso vertuo','buy nespresso vertuo','nespresso vertuo review','best pod coffee machine','nespresso price','home coffee maker 2025'],
  },
];

// ── Category-level knowledge for unrecognised products ───────────────────────
const CATEGORY_KNOWLEDGE = {
  headphone: {
    features: 'wireless Bluetooth connectivity, built-in microphone, up to 30 hours battery life, foldable design for portability, and padded ear cushions for comfort',
    bullets: (n) => [
      `Wireless Bluetooth — the ${n} connects without cables up to 10 metres`,
      `Built-in microphone — take hands-free calls directly through the ${n}`,
      `Long battery life — the ${n} plays for hours on a single charge`,
      `Foldable design — the ${n} collapses flat for bag storage`,
      `Padded ear cups — the ${n} is comfortable for extended listening sessions`,
    ],
  },
  phone: {
    features: 'a multi-lens rear camera, a high-refresh-rate OLED display, fast charging, expandable storage, and at least a full day of battery life',
    bullets: (n) => [
      `Multi-lens camera — the ${n} captures sharp photos in multiple lighting conditions`,
      `OLED display — the ${n} delivers vivid colours and deep contrast`,
      `Fast charging — the ${n} powers from 0 to 50% in under 30 minutes`,
      `All-day battery — the ${n} handles a full day of use without recharging`,
      `Biometric security — the ${n} unlocks quickly via fingerprint or face recognition`,
    ],
  },
  laptop: {
    features: 'a fast multi-core processor, SSD storage, at least 8GB RAM for multitasking, a full-HD display, and a battery rated for 8 or more hours',
    bullets: (n) => [
      `Fast processor — the ${n} runs multiple apps simultaneously without slowdown`,
      `SSD storage — the ${n} boots in seconds and opens files without delay`,
      `8GB+ RAM — the ${n} handles browsing, documents, and calls at once`,
      `Full-HD display — the ${n} screen is sharp enough for long work sessions`,
      `8+ hour battery — the ${n} runs through a full workday unplugged`,
    ],
  },
  speaker: {
    features: '360-degree sound output, Bluetooth 5.0 connectivity, a built-in battery for portable use, IPX5 water resistance, and a USB-C charging port',
    bullets: (n) => [
      `Bluetooth 5.0 — the ${n} pairs quickly and holds connection up to 12 metres`,
      `360-degree sound — the ${n} fills a room evenly from any position`,
      `IPX5 water resistance — the ${n} handles splashes and outdoor use`,
      `Built-in battery — the ${n} plays for hours away from a power outlet`,
      `USB-C charging — the ${n} uses the same cable as most modern devices`,
    ],
  },
  shoe: {
    features: 'a cushioned midsole for impact absorption, a breathable mesh or knit upper, a rubber outsole with traction patterning, and a padded collar for ankle support',
    bullets: (n) => [
      `Cushioned midsole — the ${n} absorbs impact on hard surfaces`,
      `Breathable upper — the ${n} keeps feet cool during warm-weather use`,
      `Rubber outsole — the ${n} provides grip on both wet and dry surfaces`,
      `Padded collar — the ${n} supports the ankle and reduces friction`,
      `Versatile styling — the ${n} works for casual, sport, and street looks`,
    ],
  },
  tv: {
    features: 'a 4K UHD panel with HDR10+ support, a 120Hz refresh rate for smooth motion, multiple HDMI 2.1 ports, a smart OS with built-in streaming apps, and Dolby Atmos audio',
    bullets: (n) => [
      `4K UHD resolution — the ${n} displays four times the detail of 1080p`,
      `120Hz refresh rate — the ${n} renders motion smoothly for sports and gaming`,
      `HDR10+ support — the ${n} shows wider brightness range for realistic images`,
      `Smart OS — the ${n} streams Netflix, YouTube, and more without a set-top box`,
      `Dolby Atmos audio — the ${n} delivers spatial sound from built-in speakers`,
    ],
  },
  watch: {
    features: 'heart rate and SpO2 monitoring, GPS tracking, up to 14 days battery life, 5ATM water resistance, and smartphone notifications',
    bullets: (n) => [
      `Heart rate + SpO2 monitoring — the ${n} tracks health metrics around the clock`,
      `Built-in GPS — the ${n} records accurate distance and route without a phone`,
      `Up to 14-day battery — the ${n} lasts two weeks between charges`,
      `5ATM water resistance — the ${n} is safe for swimming and showering`,
      `Smartphone notifications — the ${n} shows calls, messages, and alerts on your wrist`,
    ],
  },
};

// ── Lookup function ──────────────────────────────────────────────────────────
function getProductKnowledge(productName, category, feats, targetAudience) {
  const nl  = productName.toLowerCase();
  const aud = targetAudience || 'everyday users';

  // 1. Check known product database first
  for (const p of PRODUCTS) {
    if (p.match.some(m => nl.includes(m))) {
      return {
        short_description: p.short,
        long_description:  p.long,
        bullet_points:     p.bullets,
        seo_tags:          p.tags,
        _fallback: true,
      };
    }
  }

  // 2. Detect category from name
  const cat = (category || '').toLowerCase();
  let typeKey = null;
  if (nl.includes('headphone')||nl.includes('earphone')||nl.includes('earbud')||nl.includes('airpod')||nl.includes('wh-')||nl.includes('qc')) typeKey='headphone';
  else if (nl.includes('phone')||nl.includes('iphone')||nl.includes('galaxy')||nl.includes('pixel')||nl.includes('redmi')||nl.includes('realme')) typeKey='phone';
  else if (nl.includes('laptop')||nl.includes('macbook')||nl.includes('notebook')||nl.includes('thinkpad')||nl.includes('chromebook')||nl.includes('ideapad')||nl.includes('inspiron')||nl.includes('xps')||nl.includes('vivobook')||nl.includes('zenbook')||nl.includes('aspire')||nl.includes('nitro')||nl.includes('pavilion')||nl.includes('spectre')||nl.startsWith('dell ')||nl.startsWith('lenovo ')||nl.startsWith('hp ')||nl.startsWith('asus ')||nl.startsWith('acer ')) typeKey='laptop';
  else if (nl.includes('speaker')||nl.includes('soundbar')||nl.includes('jbl')||nl.includes('bose')||nl.includes('sonos')) typeKey='speaker';
  else if (nl.includes('shoe')||nl.includes('sneaker')||nl.includes('boot')||nl.includes('air max')||nl.includes('jordan')||nl.includes('yeezy')) typeKey='shoe';
  else if (nl.includes(' tv')||nl.includes('television')||nl.includes('oled')||nl.includes('qled')||cat.includes('tv')) typeKey='tv';
  else if (nl.includes('watch')||nl.includes('band')||nl.includes('fitbit')||nl.includes('garmin')) typeKey='watch';

  const hasFeats    = feats && feats.length >= 1;
  const brand       = productName.split(' ')[0];
  const displayCat  = category || typeKey || 'product';
  const catKnow     = typeKey ? CATEGORY_KNOWLEDGE[typeKey] : null;

  // Build description from category knowledge or user features
  const featureText = hasFeats
    ? feats.join(', ')
    : catKnow
      ? catKnow.features
      : 'reliable performance, user-friendly design, and durable construction';

  const short = `The ${productName} is a ${displayCat} designed for ${aud}, featuring ${feats && feats[0] ? feats[0] : (catKnow ? featureText.split(',')[0].trim() : 'reliable performance')}.`;

  const long = `The ${productName} is a ${displayCat} built for ${aud} who need a dependable solution for everyday use. It is designed around ${featureText.split(',')[0].trim()}, making it a practical choice from the moment you unbox it.\n\nThe ${productName} includes ${featureText}. ${catKnow ? `These are standard capabilities expected from a quality ${displayCat} in this price range.` : `Together these features make the ${productName} well-suited for both home and professional settings.`}\n\nWhether used daily or occasionally, the ${productName} delivers consistent results for ${aud}. Its ${feats && feats[0] ? feats[0] : 'overall design'} is the reason most customers choose the ${productName} over alternatives in the ${displayCat} category.`;

  const bullets = hasFeats
    ? feats.slice(0, 5).map(f => `${f} — a key feature of the ${productName}`)
    : catKnow
      ? catKnow.bullets(productName)
      : [
          `Reliable performance — the ${productName} delivers consistent results`,
          `Easy setup — the ${productName} is ready to use out of the box`,
          `Durable build — the ${productName} handles regular everyday use`,
          `Designed for ${aud} — the ${productName} fits daily routines`,
          `${displayCat} quality — the ${productName} meets ${brand} standards`,
        ];

  while (bullets.length < 5) bullets.push(`${displayCat} reliability — the ${productName} performs consistently`);

  return {
    short_description: short,
    long_description:  long,
    bullet_points:     bullets.slice(0, 5),
    seo_tags: [
      productName.toLowerCase(),
      `buy ${productName.toLowerCase()}`,
      `${productName.toLowerCase()} review`,
      `best ${displayCat} ${new Date().getFullYear()}`,
      `${productName.toLowerCase()} price`,
      `${brand.toLowerCase()} ${displayCat}`,
    ],
    _fallback: true,
  };
}

module.exports = { getProductKnowledge };
