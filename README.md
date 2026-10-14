# Al-Isra wal-Mi'raj — upward journey

**Live review page:** https://litu173.github.io/isra-wal-miraj/

A single-page scroll experience that opens on the Earth. Scrolling **up** ascends
from Makkah through the seven heavens to Sidrat al-Muntaha and the Throne;
scrolling **down** descends into the warning of the Fire (`DESCENT` in `data.js`).

## Run

```bash
python3 -m http.server 5173
```

`.claude/launch.json` runs the same server with caching disabled, so edits always show on reload.

Then open http://localhost:5173. Opening `index.html` straight from disk also works.

## Files

| File | What to edit there |
| --- | --- |
| `data.js` | All text, references, colours and level heights. `JOURNEY` is ordered Earth → Throne; `DESCENT` is ordered Earth → lowest depth. |
| `styles.css` | Look and choreography. Every reveal is a function of `--s`, the level's progress (0 = arrived, 1 = leaving). |
| `app.js` | Smooth-scroll engine (`CONFIG` at the top), scene SVGs (`SCENES`), layout modes, starfield, altimeter. |
| `i18n.js` | Language choice, the language menu, fonts per script, and right-to-left support. |
| `locales/*.js` | One file per language: interface strings (`ui`) and content (`t`), keyed like `heaven-1.points.0`. |
| `sound.js` | Synthesised soundscape: the `MIX` table sets each layer's loudness per level. |
| `tests/layout-audit.js` | Layout audit (see below). |

## Logo and icons

The mark is a pointed arch (the gate of the heavens) with a beam of light rising from the Earth to an eight-pointed star.

| File | Purpose |
| --- | --- |
| `assets/logo-mark.svg` | The logo; it also serves as the site's brand mark |
| `favicon.svg` | Browser tab icon |
| `assets/favicon-32.png` | PNG fallback for the tab icon |
| `assets/apple-touch-icon.png` | iPhone and iPad home-screen icon |
| `assets/icon-192.png`, `assets/icon-512.png` | Android and installed-app icons (`site.webmanifest`) |
| `assets/og-image.jpg` | 1200×630 preview shown when the link is shared |
| `assets/og-image.source.svg` | Editable source for the share preview |

## Languages

The page is available in 12 languages:
- English
- العربية
- বাংলা
- اردو
- हिन्दी
- Bahasa Indonesia
- Türkçe
- Français
- Español
- Português
- Русский
- 中文

How a language is chosen and shown:
- **Order of choice:** `?lang=bn` in the address, then the visitor's last choice, then the browser's language, then English.
- **Switching:** pick a language from the globe menu. The page reloads at the same point of the journey.
- **Fonts:** each script loads its own font only when chosen: Anek Bangla, Noto Nastaliq Urdu, Noto Devanagari and Noto SC. Arabic and Urdu are laid out right to left.
- **Never translated:** Qur'anic Arabic and hadith references. In Arabic, the verses and greetings appear only in the original, without a repeated meaning.
- **Fallback:** a missing string falls back to English.
- **Accuracy:** the translations are careful renderings of meaning, and each one says so in its Sources panel. Please have native speakers and scholars review them before wide sharing.

To add a language:
1. Copy a file in `locales/`.
2. Add an entry to `LANGS` in `i18n.js`.

## Layout modes

- **Pinned** (desktop and tablet landscape): each level sticks while its content plays out.
- **Stacked** (under 900px wide or 560px tall): picture and text follow one another at full width and reveal as they scroll into view.
- **Same desktop design in every language:** a pinned level whose words run longer than the screen (longer translations, taller scripts) scales its text down, to 70% at most, instead of changing layout. It switches to stacked only beyond that.
- **Arabic and Urdu** keep English's arrangement of picture and text; only the words read right to left.

## Sound

Sound is off until the visitor presses **Sound**, and the choice is remembered. Everything is synthesised in the browser, with no instruments:
- a breeze through the heavens
- birdsong and a brook in Paradise
- nibs writing on paper at the Pens
- a soft, distant chorus of "Allah" at the Throne (Ghafir 40:7)
- fire, embers and rumble beneath

Visitors start it with **Begin with sound** on the Earth screen or with the **Sound** button. Browsers allow audio only after a tap, click or key press, and scrolling doesn't count.

Two layers use real CC0 recordings from `audio/`; see `audio/CREDITS.md`:
- The Throne layers a recording of "Allah Hu" about forty times. Each copy has its own pitch, pace, position and starting moment, filtered to a distant whisper in a vast room.
- The Pens play random phrases cut from a quill on parchment, written by two hands.

If a recording is missing, that layer falls back to synthesis. While developing, `SoundScape.meter()` in the console reports the current loudness.

## Testing layout

With the page running, paste `tests/layout-audit.js` into the browser console. Then run `await audit()` at any window size.

It reports:
- horizontal scrolling
- text off-screen or clipped
- text under the altimeter
- pinned content taller than the screen
- pictures overlapping text
- cropped illustrations
- an off-centre Earth screen

## Tuning

- **Scroll feel:** `CONFIG.wheelEase` in `app.js` (lower is silkier, higher is snappier).
- **Time spent on a level:** `height` in `data.js` (in vh).
- **When things appear:** each revealed element has a `--d` threshold. `.r` in `styles.css` turns that into opacity and slide.

## Content rules

- Sources are the Qur'an, Sahih al-Bukhari and Sahih Muslim, plus two narrations graded sahih (Abu Dawud 4878, at-Tirmidhi 2572). Numbering follows sunnah.com, and the English is paraphrased.
- No prophet, angel or person is depicted. Scenes use light, geometry, architecture and nature only.
