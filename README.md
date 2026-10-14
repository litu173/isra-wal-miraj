# Al-Isra wal-Mi'raj — upward journey

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
| `sound.js` | Synthesised soundscape: the `MIX` table sets each layer's loudness per level. |
| `tests/layout-audit.js` | Layout audit (see below). |

## Layout modes

- **Pinned** (desktop and tablet landscape): each level sticks while its content plays out.
- **Stacked** (under 900px wide or 560px tall): picture and text follow one another at full width and reveal as they scroll into view.
- A pinned level whose text cannot fit the screen switches to stacked on its own.

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
