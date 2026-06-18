# SHSAT Prep — Project Status

Last updated: 2026-06-17

A snapshot of the project so a future session (or another machine) can pick
up where things were left off.

## What this is

A static SHSAT prep web app for the user's niece (12 yr old, prepping for the
NYC specialized high school admissions test). Daily 35-question panels with
password-gated answer checking. Theme: fuchsia/orchid/purple, blue answer
selection, green/red right/wrong.

## Where it lives

| | |
|---|---|
| **Live URL** | https://acarvajal618.github.io/shsat-prep/ |
| **Deploy repo (public, GH Pages)** | https://github.com/Acarvajal618/shsat-prep |
| **Source code (local, contains pipeline)** | `/Users/angelc_macmini/Project_0_openclaw/` |
| **Admin keys page** | https://acarvajal618.github.io/shsat-prep/keys.html |

The deploy repo only contains the static site (web/public mirror); the
source repo (Project_0_openclaw) is local-only and contains the Python
content pipeline, canonicals, generators, and review docs.

## Architecture

```
Project_0_openclaw/                  ← local source (not on GH)
├── web/public/                      ← the website
│   ├── prep.html                    ← daily 35q panels (main UX)
│   ├── keys.html                    ← admin passwords (hidden from nav)
│   ├── index.html                   ← dashboard / practice / exam SPA
│   ├── scratchpad.js                ← opt-in drawing overlay (?scratchpad=1)
│   ├── compact.js                   ← opt-in left-aligned layout (?compact=1)
│   ├── nav.js, common.js            ← shared shell + helpers
│   ├── homework/index.json          ← prep day definitions
│   └── data/generated/type_X_Y.json ← 1790-problem bank (mirrored)
├── data/generated/                  ← bank source of truth
├── Problems/                        ← canonical problems (Kaplan, etc.)
├── prompts/variation_by_type/       ← per-type rules for generations
├── scripts/                         ← reusable Python
│   ├── build_prep_panels.py         ← daily-panel generator
│   ├── expand_bank.py               ← deterministic problem generators
│   ├── fix_flagged.py               ← regen problems flagged in null_list
│   ├── find_dupes.py                ← scan for duplicate problems
│   └── generate_review_docs.py      ← per-type markdown review files
├── docs/
│   ├── RUNBOOK.md                   ← canonical runbook
│   ├── TODO.md                      ← roadmap + active list
│   ├── review/                      ← per-type markdown review (after fixes)
│   └── PROJECT_STATUS.md            ← (this file, also at repo root)
├── data/null_list.json              ← quality-flag queue (status: open|fixed)
└── deploy.sh                        ← rsync web/public/ → shsat-prep + push
```

## How deploys work

```bash
cd /Users/angelc_macmini/Project_0_openclaw
./deploy.sh "commit message"
```

The script rsyncs `web/public/` → `~/shsat-prep/`, commits, and pushes to
GitHub. GH Pages rebuilds within ~1 min.

Videos and the videos zip are intentionally excluded (too big for Pages).

## Current state (as of 2026-06-17)

### Prep panels

- **35 days**, June 17 → July 21, **every day** (Sun–Sat), 35 questions each.
- **One set per day** — Set 1/Set 2 dual-set experiment was rolled back.
- Each panel: 17 distinct major-type families × 2 problems each + 1 from an
  18th major (= 35 total).
- Sampling: random with replacement against the full bank.
- May 14–31 originals (12 days, 20q each) preserved as legacy examples.
- Passwords are flower-themed (`magnolia17`, `gardenia18`, …) — see
  `/keys.html`. 80+ unique flower names available.

### Problem bank

- **1790 problems** across 159 types (originally 1590; +200 via
  `expand_bank.py` across 10 types).
- 17 types have been quality-fixed via `fix_flagged.py` (regen of dupes /
  broken / nonsense-units / paraphrase-only entries):
  `11_4, 11_5, 12_1, 13_1, 14_6, 14_12, 14_14, 15_2, 16_3, 32_2, 35_2,
   35_3, 35_4, 35_5, 36_2, 38_2, 38_3`.
- ~28 known duplicates remain across 8 types (mostly picture-heavy:
  `6_2, 7_4, 7_5, 9_3, 12_2, 12_3, 31_2`). Listed in `data/null_list.json`
  with `status: "open"`.

### Scratchpad (opt-in)

- URL param: `?scratchpad=1`
- Floating toolbar (bottom-right): mode toggle (draw ↔ scroll), eraser,
  color picker, size slider (S–XXL for pen, S–XL for eraser), undo, clear.
- Strokes anchored to page coordinates → scroll moves the text + ink
  together.
- Keyboard shortcuts: `d` = draw, `e` = erase, ⌘Z = undo.
- iPad text-selection menu is suppressed via `body.scratchpad-loaded`
  user-select rule.
- Auto-loads `compact.js` (left-aligns the panel so there's drawing room on
  the right).
- No persistence — strokes vanish on reload. Built for one-take videos.

### Compact mode (opt-in standalone)

- URL param: `?compact=1`
- Same left-alignment as scratchpad's compact, without the drawing UI.
- Font sizes left at defaults (per niece's preference).

## How to extend

### Add more prep days

```bash
python3 scripts/build_prep_panels.py shuffled --start 2026-07-22 --days 14 \
  --questions 35 --every-day --set 1 --seed <some_int>
```

### Expand the bank deterministically

`scripts/expand_bank.py` has generators for 10 types. To add more:
1. Read the canonical at `Problems/<N>_<SLUG>/`
2. Read `prompts/variation_by_type/NN_<name>.txt`
3. Write a `gen_X_Y(rng)` function in `expand_bank.py`
4. Add it to the `GENERATORS` dict
5. Run `python3 scripts/expand_bank.py --per-type N`

### Fix a quality-flagged problem

1. Add an entry to `data/null_list.json` (ids, reason, action: `REGEN | EXPAND_SOLUTION | MARK_PICTURE_REQUIRED | REMOVE_DUPLICATE`, status: `open`).
2. If `REGEN`, add a per-type generator in `scripts/fix_flagged.py` and
   wire it in the driver's `if/elif` block.
3. `python3 scripts/fix_flagged.py`
4. `python3 web/copy_data.py` to sync the bank into web/public
5. `python3 scripts/generate_review_docs.py` to refresh per-type review files
6. `./deploy.sh "msg"`

### Hunt duplicates

```bash
python3 scripts/find_dupes.py                # report
python3 scripts/find_dupes.py --add-to-null  # also queue for regen
```

## Picking up on another machine

You'd need:
1. Clone the deploy repo: `git clone https://github.com/Acarvajal618/shsat-prep.git`
2. For source/pipeline work, the local `Project_0_openclaw/` would need to
   be moved — it's not in any repo yet (canonical Problems/ contain
   copyrighted Kaplan images so it's kept local).
3. Python 3 + standard library (no external deps).
4. `gh` CLI authed as `Acarvajal618` for deploys.
5. The deploy script hard-codes `/Users/angelc_macmini/` paths — adjust
   `SRC` and `DST` at the top of `deploy.sh`.

## Hosting note

The local Tailscale Funnel (`angels-mac-mini.tailbed019.ts.net`) still
works as a backup if `shsat-start` is running, but GH Pages is the durable
URL. Niece bookmarks should point to the GH Pages URL, not Tailscale.

## What's next (active TODO)

From `docs/TODO.md`:

- Quality-fix the remaining 8 dupe groups (picture-heavy types).
- Add Kaplan 2026 questions to the bank.
- Add SHSAT Prep DOE source questions.
- Review Wave 1 generated questions for math/phrasing errors.
- Crop diagrams for the 14 `[PICTURE REQUIRED]` flagged questions.
- (Eventually) host videos elsewhere so the type-1 lesson video embeds work
  on GH Pages.
