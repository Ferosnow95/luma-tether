# Tether

**A movable, in-canvas mirror of Figma's right-hand Design panel.**

Tether is a Figma plugin that recreates Figma's properties/inspector panel as a
floating window you can drag wherever you want on the canvas — so on ultrawide
and large monitors you stop making the round trip to the far-right edge of the
screen for every little tweak.

---

## Why

On a wide monitor, your work sits near the center but Figma's Design panel is
pinned to the right edge. Every property change — nudging X/Y, changing a corner
radius, tweaking padding — becomes a long mouse trip across the display. That
friction adds up over a day of detailed work.

Tether keeps the controls **next to what you're editing**. It deliberately mirrors
Figma's own design language, iconography, and interaction model so there's nothing
new to learn — it should feel like the native panel simply detached and floated
over to you.

> **Note on multi-monitor:** Figma plugin windows are iframes locked inside the
> Figma application window, so they can't be moved to a *separate* monitor. Tether
> instead floats **within** the Figma window (drag it via the native plugin title
> bar) and can be resized from its corner grip — placing the controls close to the
> center of a large/ultrawide display.

---

## Feature set

Tether reads the current selection and lets you edit it with controls that match
Figma's native panel one-to-one.

### Position
- **Alignment** — align left / horizontal centers / right / top / vertical
  centers / bottom. Single selection aligns to its parent; multi-selection aligns
  to the selection bounds.
- **Position** — `X` / `Y` fields.
- **Dimensions** — `W` / `H` fields with an inline **Fixed / Hug / Fill** resizing
  dropdown (shown when the node lives in an auto-layout frame), plus a
  **lock aspect ratio** padlock between them (`constrainProportions`).
- **Rotation** — rotation field with **flip horizontal** and **flip vertical**.
- **Constraints** — horizontal and vertical constraint selectors.

### Layout (auto layout)
- **Flow** — None / Horizontal / Vertical, plus **Wrap**.
- **Alignment & gap** — an axis-aware 3×3 alignment pad with a gap field.
- **Padding** — unified vertical / horizontal padding, with a toggle that expands
  to individual **T / R / B / L** controls (mirrors Figma's independent padding).
- **Clip content**.

### Appearance
- **Opacity** and **Corner radius** on one row, with an **independent-corners**
  toggle that expands to per-corner radii (TL / TR / BL / BR).
- **Blend mode**.
- **Visible** / **Locked**.

### Fill / Stroke
- **Fill** — color swatch + hex + opacity, with a native checkerboard for
  transparency.
- **Stroke** — color, **position** (inside / center / outside), and **weight**.

### Effects
- **Drop shadow** — enable, color, X / Y offset, blur, spread.
- **Layer blur** — enable + radius.

### Text
- **Font size** and **line height** (supports `Auto`).
- **Letter spacing**.
- **Horizontal alignment** — left / center / right / justified.

### Native interaction parity
These match behaviors documented in Figma's Design-panel and Auto-layout guides:

- **Math equations** in every numeric field — `+10`, `-20`, `*2`, `/4`, `^2`,
  `(x/2)+6` (where `x` is the current value). A leading operator applies to the
  current value. Evaluated with a small, safe recursive-descent parser — **no
  `eval`**, so it respects the plugin sandbox / CSP.
- **Scrub fields** — drag a field's label/icon to scrub its value
  (1px = 1 unit; hold **Shift** for ×10 big-nudge).
- **Mixed-value handling** — multi-selection with differing values shows `Mixed`
  and only writes the fields you actually change.
- **Live sync** — the panel follows the current selection and updates as the
  document changes, while skipping the input you're actively editing.

---

## Architecture

Two isolated contexts communicating only via `postMessage`:

- **`src/actions.ts`** — pure engine. Reads `figma.currentPage.selection` into a
  serializable `Snapshot` of `Field { value, mixed, supported }` and applies edits
  back to the node(s). Throws human-readable errors.
- **`src/code.ts`** — thin dispatcher. Hosts the UI, pushes selection snapshots,
  and routes `apply` / `command` / `resize` messages to the engine, surfacing
  errors via `figma.notify`.
- **`ui.html`** — single-file UI. Vanilla JS, UI3 theme tokens
  (`themeColors: true`), hand-authored 16px Figma-style icon set, and a builder
  per control that reports its own visibility from the snapshot.

The UI is built with **esbuild** to a single IIFE bundle (the Figma sandbox runs
one classic script); **`tsc`** is used only for type-checking.

---

## Requirements

- **Figma desktop app** (plugin development / "Import from manifest" is desktop-only).
- **Node.js 18+** and npm (to build the plugin bundle).
- No API keys, accounts, or network access — Tether runs 100% on-canvas.

## Install

Tether isn't on the Figma Community yet, so you install it as a local development
plugin. One-time setup:

1. **Clone the repo**
   ```bash
   git clone https://github.com/Ferosnow95/luma-tether.git
   cd luma-tether
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Build the plugin bundle** (produces `dist/code.js`)
   ```bash
   npm run build
   ```
4. **Import into Figma** — open the Figma **desktop** app, then:
   **Menu → Plugins → Development → Import plugin from manifest…** and select the
   `manifest.json` at the root of this repo.
5. Tether now appears under **Plugins → Development → Tether**. Run it from there (or
   right-click the canvas → **Plugins → Development → Tether**).

> **Updating:** after `git pull`, run `npm run build` again and reload the plugin in
> Figma (it re-reads `dist/code.js` on each run).

## How to use

1. **Run Tether.** A floating panel appears inside the Figma window.
2. **Position it where you work** — drag it by the native plugin **title bar** to sit
   next to the center of your canvas, and resize it from the **corner grip**. (Figma
   iframes can't leave the Figma window, so Tether floats *within* it rather than on a
   separate monitor.)
3. **Select a layer** (or several). Tether reads the selection and shows only the
   sections that apply — Position, Layout, Appearance, Fill / Stroke, Effects, Text.
4. **Edit in place.** The controls mirror Figma's native Design panel one-to-one, so
   changes apply to your selection exactly as they would on the right edge — without the
   mouse trip across a wide display.

### Power-user input
- **Math in any numeric field** — type `+10`, `-20`, `*2`, `/4`, `^2`, or `(x/2)+6`
  (where `x` is the current value). A leading operator applies to the current value.
  Parsed safely (no `eval`), so it respects the plugin sandbox.
- **Scrub fields** — drag a field's label/icon to scrub the value (1px = 1 unit; hold
  **Shift** for ×10).
- **Mixed values** — a multi-selection with differing values shows `Mixed`; only the
  fields you actually change get written.
- **Live sync** — the panel follows the current selection and updates as the document
  changes, while leaving the input you're actively editing untouched.

## Develop

```bash
npm install
npm run typecheck   # tsc --noEmit (type-check only)
npm run build       # esbuild -> dist/code.js
npm run watch       # rebuild on change
```

> **Must bundle with esbuild** (`--format=iife`). The Figma sandbox runs one classic
> script; `tsc` is used only for type-checking.

With `npm run watch` running, edit `src/*.ts` / `ui.html`, then re-run the plugin in
Figma to pick up the rebuilt bundle.

## License

MIT
