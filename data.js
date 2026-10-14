/*
 * Al-Isra wal-Mi'raj — journey content.
 *
 * Ordered from the LOWEST level (Earth) to the HIGHEST. The page renders this
 * list bottom-up, so index 0 sits at the bottom of the document.
 *
 * English is a careful paraphrase of the narrations, not a verbatim quote.
 * Hadith numbering follows sunnah.com.
 *
 * Fields
 *   id, scene        anchor id + which visual to draw (see SCENES in app.js)
 *   sky              [top colour, bottom colour] of the sky while here
 *   accent           highlight colour for this level
 *   height           section length in vh (longer = more time pinned)
 *   wide             two-column text layout on desktop (for long levels)
 *   meeting          { ar, en } prophet(s) met — names only, never depicted
 *   greeting         { ar, en } words of welcome
 *   dialogue         exchange at the gate (shown once, at the first heaven)
 *   points           [{ text, ref }]
 *   widget           'choice' | 'counter' | 'return' (custom UI blocks)
 *   ayah, ayah2      { ar, en, ref }
 *   passage          { text, ref? } a line of narration met on the way into this level
 *   quote            { en, ref } a hero quotation (Paradise)
 *   phased           content plays in three acts while pinned (Paradise)
 *   rivers           [key, label, note] legend for the rivers of Paradise
 */
window.JOURNEY = [
  {
    id: 'makkah',
    passage: { text: 'One night in Makkah, the House of Allah lay still beneath the stars.' },
    scene: 'makkah',
    short: 'Makkah',
    kicker: 'Earth · The Night Journey begins',
    ar: 'المسجد الحرام',
    title: 'Al-Masjid al-Haram',
    place: 'Makkah',
    sky: ['#060a1c', '#1d1526'],
    accent: '#e3b867',
    height: 260,
    points: [
      {
        text: 'While he lay by the Ka‘bah, between sleep and wakefulness, Jibril came. His chest was opened, washed with Zamzam, and filled from a golden basin brimming with wisdom and faith.',
        ref: 'Sahih al-Bukhari 349, 3207',
      },
      {
        text: 'Al-Buraq was brought to him — a white mount, larger than a donkey and smaller than a mule, whose every stride reached as far as its sight could see.',
        ref: 'Sahih Muslim 162 · Sahih al-Bukhari 3887',
      },
    ],
    ayah: {
      ar: 'سُبْحَانَ الَّذِي أَسْرَىٰ بِعَبْدِهِ لَيْلًا مِّنَ الْمَسْجِدِ الْحَرَامِ إِلَى الْمَسْجِدِ الْأَقْصَى',
      en: 'Glory be to the One who carried His servant by night from the Sacred Mosque to the Farthest Mosque…',
      ref: 'Al-Isra 17:1',
    },
  },
  {
    id: 'aqsa',
    passage: { text: 'Upon al-Buraq — each stride reaching the edge of sight — he was carried by night to Jerusalem.', ref: 'Sahih Muslim 162' },
    scene: 'aqsa',
    wide: true,
    short: 'Al-Aqsa',
    kicker: 'Earth · The Isra is complete',
    ar: 'المسجد الأقصى',
    title: 'Al-Masjid al-Aqsa',
    place: 'Bayt al-Maqdis · Jerusalem',
    sky: ['#081232', '#1d1a38'],
    accent: '#e8c47a',
    height: 280,
    points: [
      {
        text: 'He tethered al-Buraq to the ring where the prophets used to tether their mounts, then entered and prayed two rak‘ahs.',
        ref: 'Sahih Muslim 162',
      },
      {
        text: 'The prophets were gathered there, and when the time for prayer came, he led them.',
        ref: 'Sahih Muslim 172',
      },
      {
        text: 'Jibril brought him a vessel of wine and a vessel of milk. He chose the milk, and Jibril said: “You have chosen the fitrah.”',
        ref: 'Sahih Muslim 162',
      },
    ],
    widget: 'choice',
    note: 'From here, the Mi‘raj — the ascent — begins.',
  },
  {
    id: 'heaven-1',
    passage: { text: 'Then Jibril took him by the hand and ascended with him to the nearest heaven.', ref: 'Sahih al-Bukhari 349' },
    scene: 'gate',
    n: 1,
    short: '1st Heaven',
    kicker: 'The First Heaven',
    ar: 'السماء الأولى',
    title: 'As-Samā’ ad-Dunyā',
    place: 'The nearest heaven',
    sky: ['#07163f', '#0f2b5c'],
    accent: '#8fb8ff',
    height: 300,
    dialogue: [
      ['Gatekeeper', 'Who is it?'],
      ['Jibril', 'Jibril.'],
      ['Gatekeeper', 'And who is with you?'],
      ['Jibril', 'Muhammad ﷺ.'],
      ['Gatekeeper', 'Has he been sent for?'],
      ['Jibril', 'Yes.'],
      ['Gatekeeper', 'Welcome to him — what an excellent arrival!'],
    ],
    meeting: { ar: 'آدم عليه السلام', en: 'Adam' },
    greeting: {
      ar: 'مَرْحَبًا بِالِابْنِ الصَّالِحِ وَالنَّبِيِّ الصَّالِحِ',
      en: 'Welcome, righteous son and righteous prophet.',
    },
    points: [
      {
        text: 'To his right were the souls of his offspring bound for Paradise, and he smiled when he looked at them; to his left, those bound for the Fire, and he wept.',
        ref: 'Sahih al-Bukhari 349',
      },
    ],
    refs: 'Sahih al-Bukhari 3207 · Sahih Muslim 162',
  },
  {
    id: 'heaven-2',
    passage: { text: 'Then he ascended with him to the second heaven, and asked for it to be opened.', ref: 'Sahih al-Bukhari 3207' },
    scene: 'gate',
    n: 2,
    short: '2nd Heaven',
    kicker: 'The Second Heaven',
    ar: 'السماء الثانية',
    title: 'The Second Heaven',
    sky: ['#0a1f4a', '#123f63'],
    accent: '#7fd6e0',
    height: 260,
    gateNote: 'The same questions were asked at the gate, and it opened in welcome.',
    meeting: { ar: 'يحيى وعيسى عليهما السلام', en: 'Yahya & ‘Isa' },
    greeting: {
      ar: 'مَرْحَبًا بِالْأَخِ الصَّالِحِ وَالنَّبِيِّ الصَّالِحِ',
      en: 'Welcome, righteous brother and righteous prophet.',
    },
    points: [
      {
        text: 'Here he met the two maternal cousins, Yahya son of Zakariyya and ‘Isa son of Maryam. They welcomed him and prayed for his good.',
        ref: 'Sahih al-Bukhari 3207 · Sahih Muslim 162',
      },
    ],
  },
  {
    id: 'heaven-3',
    passage: { text: 'Higher still — to the third heaven.' },
    scene: 'gate',
    n: 3,
    short: '3rd Heaven',
    kicker: 'The Third Heaven',
    ar: 'السماء الثالثة',
    title: 'The Third Heaven',
    sky: ['#151a4f', '#2a2d6b'],
    accent: '#a9a6ff',
    height: 260,
    gateNote: 'The gate was opened after the same exchange.',
    meeting: { ar: 'يوسف عليه السلام', en: 'Yusuf' },
    greeting: {
      ar: 'مَرْحَبًا بِالْأَخِ الصَّالِحِ وَالنَّبِيِّ الصَّالِحِ',
      en: 'Welcome, righteous brother and righteous prophet.',
    },
    points: [
      {
        text: 'He met Yusuf, who had been given half of all beauty. He welcomed him and prayed for his good.',
        ref: 'Sahih Muslim 162',
      },
    ],
  },
  {
    id: 'heaven-4',
    passage: { text: 'Then to the fourth heaven.' },
    scene: 'gate',
    n: 4,
    short: '4th Heaven',
    kicker: 'The Fourth Heaven',
    ar: 'السماء الرابعة',
    title: 'The Fourth Heaven',
    sky: ['#1d1550', '#3a2a72'],
    accent: '#c6a2ff',
    height: 260,
    gateNote: 'The gate was opened after the same exchange.',
    meeting: { ar: 'إدريس عليه السلام', en: 'Idris' },
    greeting: {
      ar: 'مَرْحَبًا بِالْأَخِ الصَّالِحِ وَالنَّبِيِّ الصَّالِحِ',
      en: 'Welcome, righteous brother and righteous prophet.',
    },
    points: [
      {
        text: 'He met Idris, of whom Allah says He raised him to a lofty station.',
        ref: 'Sahih Muslim 162 · Sahih al-Bukhari 3207',
      },
    ],
    ayah: {
      ar: 'وَرَفَعْنَاهُ مَكَانًا عَلِيًّا',
      en: 'And We raised him to a lofty station.',
      ref: 'Maryam 19:57',
    },
  },
  {
    id: 'heaven-5',
    passage: { text: 'Then to the fifth heaven.' },
    scene: 'gate',
    n: 5,
    short: '5th Heaven',
    kicker: 'The Fifth Heaven',
    ar: 'السماء الخامسة',
    title: 'The Fifth Heaven',
    sky: ['#251246', '#4c2463'],
    accent: '#f0a6d8',
    height: 260,
    gateNote: 'The gate was opened after the same exchange.',
    meeting: { ar: 'هارون عليه السلام', en: 'Harun' },
    greeting: {
      ar: 'مَرْحَبًا بِالْأَخِ الصَّالِحِ وَالنَّبِيِّ الصَّالِحِ',
      en: 'Welcome, righteous brother and righteous prophet.',
    },
    points: [
      {
        text: 'He met Harun, brother of Musa, who welcomed him and prayed for his good.',
        ref: 'Sahih Muslim 162 · Sahih al-Bukhari 3207',
      },
    ],
  },
  {
    id: 'heaven-6',
    passage: { text: 'Then to the sixth heaven.' },
    scene: 'gate',
    n: 6,
    short: '6th Heaven',
    kicker: 'The Sixth Heaven',
    ar: 'السماء السادسة',
    title: 'The Sixth Heaven',
    sky: ['#0b2f3d', '#16505a'],
    accent: '#86e0c0',
    height: 280,
    gateNote: 'The gate was opened after the same exchange.',
    meeting: { ar: 'موسى عليه السلام', en: 'Musa' },
    greeting: {
      ar: 'مَرْحَبًا بِالْأَخِ الصَّالِحِ وَالنَّبِيِّ الصَّالِحِ',
      en: 'Welcome, righteous brother and righteous prophet.',
    },
    points: [
      {
        text: 'As he moved on, Musa wept. Asked why, he said: “A young man sent after me — more of his Ummah will enter Paradise than of mine.”',
        ref: 'Sahih al-Bukhari 3207',
      },
    ],
  },
  {
    id: 'heaven-7',
    passage: { text: 'Then to the seventh heaven — the last of the gates.' },
    scene: 'gate',
    inner: 'bayt',
    n: 7,
    short: '7th Heaven',
    kicker: 'The Seventh Heaven',
    ar: 'السماء السابعة',
    title: 'The Seventh Heaven',
    sky: ['#0f2a28', '#2c4a36'],
    accent: '#e9d38a',
    height: 300,
    gateNote: 'The gate was opened after the same exchange.',
    meeting: { ar: 'إبراهيم عليه السلام', en: 'Ibrahim' },
    greeting: {
      ar: 'مَرْحَبًا بِالِابْنِ الصَّالِحِ وَالنَّبِيِّ الصَّالِحِ',
      en: 'Welcome, righteous son and righteous prophet.',
    },
    points: [
      {
        text: 'He found Ibrahim reclining with his back against al-Bayt al-Ma‘mur, the Much-Frequented House.',
        ref: 'Sahih Muslim 162',
      },
      {
        text: 'Every day seventy thousand angels enter it, and they never return to it again.',
        ref: 'Sahih al-Bukhari 3207 · Sahih Muslim 162',
      },
    ],
    ayah: {
      ar: 'وَالْبَيْتِ الْمَعْمُورِ',
      en: 'By the Much-Frequented House.',
      ref: 'At-Tur 52:4',
    },
  },
  {
    id: 'sidrah',
    passage: { text: 'Then he was raised up to Sidrat al-Muntaha.', ref: 'Sahih al-Bukhari 3207' },
    scene: 'sidrah',
    short: 'Sidrat al-Muntaha',
    kicker: 'The Utmost Boundary',
    ar: 'سدرة المنتهى',
    title: 'Sidrat al-Muntaha',
    place: 'The Lote Tree of the Furthest Limit',
    sky: ['#2a210e', '#6b4f1c'],
    accent: '#ffd98a',
    height: 320,
    points: [
      {
        text: 'Its fruits were like the clay jars of Hajar, and its leaves like the ears of elephants.',
        ref: 'Sahih al-Bukhari 3207',
      },
      {
        text: 'When it was covered by the command of Allah, it changed — covered in colours he could not name. None of creation could describe its beauty.',
        ref: 'Sahih Muslim 162 · Sahih al-Bukhari 349',
      },
      {
        text: 'From its root flowed four rivers: two hidden, the rivers of Paradise, and two manifest — the Nile and the Euphrates.',
        ref: 'Sahih al-Bukhari 3207',
      },
      {
        text: 'Here he saw Jibril in his true form, with six hundred wings.',
        ref: 'Sahih al-Bukhari 4856 · Sahih Muslim 174, 177',
      },
    ],
    ayah: {
      ar: 'عِندَ سِدْرَةِ الْمُنتَهَىٰ ۝ إِذْ يَغْشَى السِّدْرَةَ مَا يَغْشَىٰ',
      en: 'At the Lote Tree of the Furthest Limit… when there covered the Lote Tree that which covered it.',
      ref: 'An-Najm 53:14, 16',
    },
  },
  {
    id: 'jannah',
    passage: { text: 'Then he was admitted into Paradise.', ref: 'Sahih al-Bukhari 349' },
    scene: 'jannah',
    phased: true,
    short: 'Jannah',
    kicker: 'What no eye has seen',
    ar: 'جنة المأوى',
    title: 'The Garden of Refuge',
    sky: ['#1a1238', '#2a1d4e'],
    accent: '#ffe3a0',
    height: 420,
    quote: {
      en: 'I have prepared for My righteous servants what no eye has seen, no ear has heard, and no heart has ever imagined.',
      ref: 'Hadith Qudsi · Sahih al-Bukhari 3244 · Sahih Muslim 2824',
    },
    points: [
      {
        text: 'Within it were domes of pearl, and its soil was musk.',
        ref: 'Sahih al-Bukhari 349',
      },
      {
        text: 'He came upon a river whose banks were domes of hollowed pearl. Jibril said: “This is al-Kawthar.”',
        ref: 'Sahih al-Bukhari 4964',
      },
      {
        text: 'In it is a tree in whose shade a rider could travel for a hundred years without crossing it.',
        ref: 'Sahih al-Bukhari 3251 · Sahih Muslim 2826',
      },
      {
        text: 'Its people will see the dwellers of the lofty rooms above them as you see a brilliant star on the far horizon.',
        ref: 'Sahih al-Bukhari 3256 · Sahih Muslim 2831',
      },
    ],
    rivers: [
      ['water', 'Water', 'never stale'],
      ['milk', 'Milk', 'its taste unchanging'],
      ['wine', 'Wine', 'a delight to drink'],
      ['honey', 'Honey', 'purified'],
    ],
    ayah: {
      ar: 'فِيهَا أَنْهَارٌ مِّن مَّاءٍ غَيْرِ آسِنٍ وَأَنْهَارٌ مِّن لَّبَنٍ لَّمْ يَتَغَيَّرْ طَعْمُهُ وَأَنْهَارٌ مِّنْ خَمْرٍ لَّذَّةٍ لِّلشَّارِبِينَ وَأَنْهَارٌ مِّنْ عَسَلٍ مُّصَفًّى',
      en: 'In it are rivers of water never stale, rivers of milk whose taste never changes, rivers of wine delightful to those who drink, and rivers of purified honey.',
      ref: 'Muhammad 47:15',
    },
    ayah2: {
      ar: 'لَا يَرَوْنَ فِيهَا شَمْسًا وَلَا زَمْهَرِيرًا',
      en: 'They will see therein neither a burning sun nor bitter cold.',
      ref: 'Al-Insan 76:13',
    },
  },
  {
    id: 'pens',
    passage: { text: 'Then he was raised higher still.', ref: 'Sahih al-Bukhari 349' },
    scene: 'pens',
    wide: true,
    short: 'The Pens',
    kicker: 'A level beyond',
    ar: 'صريف الأقلام',
    title: 'The scratching of the Pens',
    sky: ['#3a2b10', '#8a6a30'],
    accent: '#fff1c9',
    height: 340,
    points: [
      {
        text: 'He was raised until he reached a level where he heard the scratching of the Pens.',
        ref: 'Sahih al-Bukhari 349',
      },
      {
        text: 'Fifty prayers were enjoined. On his way down, Musa urged him to return and ask for a lightening — again and again, until five remained.',
        ref: 'Sahih al-Bukhari 3207 · Sahih Muslim 162',
      },
      {
        text: '“They are five, and they are fifty. My Word does not change.”',
        ref: 'Sahih al-Bukhari 349',
      },
      {
        text: 'He was given three things: the five prayers, the closing verses of Surah al-Baqarah, and forgiveness of the major sins for those of his Ummah who associate nothing with Allah.',
        ref: 'Sahih Muslim 173',
      },
    ],
    widget: 'counter',
    ayah: {
      ar: 'مَا زَاغَ الْبَصَرُ وَمَا طَغَىٰ ۝ لَقَدْ رَأَىٰ مِنْ آيَاتِ رَبِّهِ الْكُبْرَىٰ',
      en: 'His sight did not swerve, nor did it overstep. He certainly saw some of the greatest signs of his Lord.',
      ref: 'An-Najm 53:17–18',
    },
  },
  {
    id: 'arsh',
    passage: { text: 'And above it all — the Throne of the Most Merciful.', ref: 'Sahih al-Bukhari 2790' },
    scene: 'arsh',
    short: 'Al-‘Arsh',
    kicker: 'Above all creation',
    ar: 'رَبُّ الْعَرْشِ الْعَظِيمِ',
    title: 'Al-‘Arsh al-‘Azim',
    place: 'The Mighty Throne — beyond all description',
    sky: ['#f7ecd0', '#fffaf0'],
    accent: '#a87a1e',
    height: 260,
    points: [
      {
        text: 'Al-Firdaus is the highest and most central part of Paradise, and above it is the Throne of the Most Merciful.',
        ref: 'Sahih al-Bukhari 2790',
      },
      {
        text: 'Those who bear the Throne, and those around it, glorify their Lord with praise and believe in Him, and ask forgiveness for those who believe.',
        ref: 'Ghafir 40:7',
      },
      {
        text: 'That same night he returned to Makkah. When the Quraysh denied him, Allah displayed Bayt al-Maqdis before his eyes, and he described it to them sign by sign.',
        ref: 'Sahih al-Bukhari 3886',
      },
    ],
    ayah: {
      ar: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
      en: 'Allah is sufficient for me; there is no god but Him. In Him I place my trust, and He is the Lord of the Mighty Throne.',
      ref: 'At-Tawbah 9:129',
    },
    widget: 'return',
  },
];

/*
 * Beneath the Earth — the warning of the Fire.
 *
 * Ordered from the Earth DOWNWARD (index 0 sits just below the opening
 * screen). Same fields as JOURNEY, plus:
 *   sealed   the gate's doors stay shut ("it will be closed down upon them", 104:8)
 *
 * Its true location is known to Allah; the page places it below as the
 * direction of descent, not as a claim about where it is.
 * Scenes are fire, depth and darkness only — no person is depicted.
 */
window.DESCENT = [
  {
    id: 'hell-gate',
    passage: { text: '“I saw the Fire, and I have never seen a sight more terrible.”', ref: 'Sahih al-Bukhari 1052' },
    scene: 'gate',
    inner: 'fire',
    sealed: true,
    short: 'Its Gates',
    kicker: 'Beneath · A warning',
    ar: 'أبواب جهنم',
    title: 'The Gates of Jahannam',
    place: 'Its place is in the knowledge of Allah alone',
    sky: ['#170806', '#2c0d08'],
    accent: '#ff7a45',
    height: 280,
    points: [
      {
        text: 'The Fire is veiled by desires, and Paradise is veiled by hardships.',
        ref: 'Sahih al-Bukhari 6487 · Sahih Muslim 2822',
      },
      {
        text: 'On the night of the Isra he was shown Malik, the keeper of the Fire.',
        ref: 'Sahih al-Bukhari 3239 · Sahih Muslim 165',
      },
      {
        text: 'Over it stand angels, stern and severe, who never disobey Allah in what He commands them.',
        ref: 'At-Tahrim 66:6',
      },
    ],
    ayah: {
      ar: 'لَهَا سَبْعَةُ أَبْوَابٍ لِّكُلِّ بَابٍ مِّنْهُمْ جُزْءٌ مَّقْسُومٌ',
      en: 'It has seven gates; for every gate is an assigned portion of them.',
      ref: 'Al-Hijr 15:44',
    },
  },
  {
    id: 'hell-fire',
    passage: { text: 'It was described so that hearts would fear it — and be saved from it.' },
    scene: 'flames',
    short: 'Its Fire',
    kicker: 'Its heat',
    ar: 'نار جهنم',
    title: 'Its Fire',
    sky: ['#1e0704', '#5a1406'],
    accent: '#ffa04a',
    height: 260,
    points: [
      {
        text: 'The fire of this world is one part out of seventy parts of the fire of Jahannam.',
        ref: 'Sahih al-Bukhari 3265 · Sahih Muslim 2843',
      },
      {
        text: 'The Fire complained to its Lord, and He permitted it two breaths: one in winter and one in summer — the fiercest heat and the bitterest cold you feel.',
        ref: 'Sahih al-Bukhari 3260',
      },
      {
        text: 'On that Day it will be brought forth with seventy thousand reins, each rein pulled by seventy thousand angels.',
        ref: 'Sahih Muslim 2842',
      },
    ],
    ayah: {
      ar: 'إِذَا أُلْقُوا فِيهَا سَمِعُوا لَهَا شَهِيقًا وَهِيَ تَفُورُ ۝ تَكَادُ تَمَيَّزُ مِنَ الْغَيْظِ',
      en: 'When they are cast into it, they will hear its roaring as it boils up, almost bursting with rage.',
      ref: 'Al-Mulk 67:7–8',
    },
  },
  {
    id: 'hell-depth',
    passage: { text: 'Deeper — a depth no eye can measure.' },
    scene: 'abyss',
    short: 'Its Depth',
    kicker: 'Its depth',
    ar: 'قعر جهنم',
    title: 'Its Depth',
    sky: ['#0e0504', '#260a05'],
    accent: '#ff6a3a',
    height: 340,
    points: [
      {
        text: 'The Companions heard a heavy sound. He said: “That was a stone thrown into the Fire seventy years ago; it has only now reached its bottom.”',
        ref: 'Sahih Muslim 2844',
      },
      {
        text: 'The Fire will keep saying “Is there more?” until the Lord of Might places His Foot upon it, and it says: “Enough, enough.”',
        ref: 'Sahih al-Bukhari 4848 · Sahih Muslim 2848',
      },
    ],
    ayah: {
      ar: 'يَوْمَ نَقُولُ لِجَهَنَّمَ هَلِ امْتَلَأْتِ وَتَقُولُ هَلْ مِن مَّزِيدٍ',
      en: 'The Day We will say to Jahannam, “Are you filled?” and it will say, “Is there any more?”',
      ref: 'Qaf 50:30',
    },
  },
  {
    id: 'hell-shown',
    passage: { text: 'Every deed carries its recompense. Some of them were shown to him.' },
    scene: 'embers',
    wide: true,
    short: 'What he was shown',
    kicker: 'Punishments shown to the Prophet ﷺ',
    ar: 'ما أُرِيَه النبي ﷺ',
    title: 'What he was shown',
    place: 'On the Mi‘raj, and in a vision — the dreams of prophets are revelation',
    sky: ['#170605', '#3a0d07'],
    accent: '#ff8a5a',
    height: 320,
    points: [
      {
        text: 'On the Mi‘raj he passed people with nails of copper, scratching their own faces and chests — those who ate the flesh of people through backbiting and attacked their honour.',
        ref: 'Sunan Abi Dawud 4878 · graded sahih',
      },
      {
        text: 'One whose cheek was torn from mouth to the back of the head, again and again — the liar whose lies spread to the horizons.',
        ref: 'Sahih al-Bukhari 1386',
      },
      {
        text: 'A pit like an oven, narrow above and wide below, fire blazing beneath — the men and women who committed zina.',
        ref: 'Sahih al-Bukhari 1386',
      },
      {
        text: 'A river of blood, a man in it pelted with stones into his mouth each time he neared the bank — the one who consumed riba.',
        ref: 'Sahih al-Bukhari 1386',
      },
      {
        text: 'A head crushed by a rock, made whole, then crushed again — one who learned the Qur’an and abandoned it, and slept through the obligatory prayers.',
        ref: 'Sahih al-Bukhari 1386, 7047',
      },
    ],
  },
  {
    id: 'hell-zaqqum',
    passage: { text: 'Its food, and its drink.' },
    scene: 'zaqqum',
    short: 'Zaqqum',
    kicker: 'Its food and its drink',
    ar: 'شجرة الزقوم',
    title: 'The Tree of Zaqqum',
    sky: ['#120604', '#300f06'],
    accent: '#e0603a',
    height: 270,
    points: [
      {
        text: 'Whenever their skins are roasted through, they are replaced with new skins, so they may taste the punishment.',
        ref: 'An-Nisa 4:56',
      },
      {
        text: 'The one with the lightest punishment will have two embers placed beneath the soles of his feet, from which his brain will boil.',
        ref: 'Sahih al-Bukhari 6561 · Sahih Muslim 213',
      },
    ],
    ayah: {
      ar: 'إِنَّ شَجَرَتَ الزَّقُّومِ ۝ طَعَامُ الْأَثِيمِ ۝ كَالْمُهْلِ يَغْلِي فِي الْبُطُونِ ۝ كَغَلْيِ الْحَمِيمِ',
      en: 'Indeed, the tree of Zaqqum is the food of the sinner — like molten metal, boiling in the bellies like scalding water.',
      ref: 'Ad-Dukhan 44:43–46',
    },
  },
  {
    id: 'hell-lowest',
    passage: { text: 'At the very bottom — and still, the door of mercy is open.' },
    scene: 'refuge',
    short: 'The Lowest Depth',
    kicker: 'The lowest depth — and the door of mercy',
    ar: 'الدرك الأسفل',
    title: 'Seek refuge',
    sky: ['#060303', '#0d0605'],
    accent: '#f4d9a8',
    height: 260,
    points: [
      {
        text: 'The hypocrites will be in the lowest depth of the Fire.',
        ref: 'An-Nisa 4:145',
      },
      {
        text: 'Allah made mercy one hundred parts. He kept ninety-nine with Himself and sent down a single part to the earth.',
        ref: 'Sahih al-Bukhari 6000',
      },
      {
        text: 'Whoever seeks refuge from the Fire three times, the Fire says: “O Allah, protect him from the Fire.”',
        ref: 'Jami‘ at-Tirmidhi 2572 · graded sahih',
      },
    ],
    ayah: {
      ar: 'رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ ۖ إِنَّ عَذَابَهَا كَانَ غَرَامًا',
      en: 'Our Lord, turn away from us the punishment of Jahannam. Indeed, its punishment is ever clinging.',
      ref: 'Al-Furqan 25:65',
    },
    widget: 'ascend',
  },
];

window.SOURCES = [
  ['Qur’an', 'Al-Isra 17:1 · An-Najm 53:1–18 · Maryam 19:57 · At-Tur 52:4 · At-Tawbah 9:129 · Ghafir 40:7'],
  ['Sahih al-Bukhari 349', 'Abu Dharr — opening of the chest, the heavens, the Pens, fifty to five, Paradise'],
  ['Sahih al-Bukhari 3207', 'Malik ibn Sa‘sa‘ah — the gates, each prophet, al-Bayt al-Ma‘mur, the Lote Tree, the four rivers'],
  ['Sahih al-Bukhari 3886 · 3887', 'Jabir · Malik ibn Sa‘sa‘ah — the return; al-Buraq'],
  ['Sahih al-Bukhari 2790 · 4856 · 4964', 'Al-Firdaus and the Throne · Jibril’s six hundred wings · al-Kawthar'],
  ['Paradise', 'Muhammad 47:15 · Al-Insan 76:13 · Bukhari 3244, 3251, 3256 · Muslim 2824, 2826, 2831'],
  ['Sahih Muslim 162', 'Anas ibn Malik — al-Buraq, Bayt al-Maqdis, milk and wine, the heavens, the Lote Tree, the prayers'],
  ['Sahih Muslim 172 · 173 · 174 · 177', 'Leading the prophets in prayer · the three gifts · seeing Jibril'],
  ['Beneath — Qur’an', 'Al-Hijr 15:44 · At-Tahrim 66:6 · Al-Mulk 67:7–8 · Qaf 50:30 · An-Nisa 4:56, 4:145 · Ad-Dukhan 44:43–46 · Al-Furqan 25:65'],
  ['Beneath — Sahih al-Bukhari', '1052 (the Fire shown) · 1386 & 7047 (the vision of punishments) · 3239 (Malik) · 3260 · 3265 · 4848 · 6000 · 6487 · 6561'],
  ['Beneath — Sahih Muslim', '165 · 213 · 2822 · 2842 · 2843 · 2844 · 2848'],
  ['Beneath — other graded sahih', 'Sunan Abi Dawud 4878 (the backbiters, seen on the Mi‘raj) · Jami‘ at-Tirmidhi 2572'],
];
