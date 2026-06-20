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

## Develop

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # esbuild -> dist/code.js
npm run watch       # rebuild on change
```

Then in Figma: **Plugins → Development → Import plugin from manifest…** and pick
`manifest.json`. Run it via **Plugins → Development → Tether**.

## License

MIT
