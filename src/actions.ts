/// <reference types="@figma/plugin-typings" />

// ---------------------------------------------------------------------------
// Tether engine — reads the current selection into a serializable snapshot and
// applies edits back to the selected node(s). Pure figma.* work, no UI.
// ---------------------------------------------------------------------------

export interface Field {
  value: number | string | boolean | null;
  mixed: boolean;
  supported: boolean;
}

export interface Snapshot {
  count: number;
  name: string;
  type: string;
  fields: Record<string, Field>;
  effects?: EffectRow[];
  grids?: GridRow[];
  exports?: ExportRow[];
}

// List rows (single-selection only; null/undefined => section not shown).
export interface EffectRow {
  type: string; // DROP_SHADOW | INNER_SHADOW | LAYER_BLUR | BACKGROUND_BLUR
  visible: boolean;
  color?: string;
  opacity?: number; // shadow color alpha, 0-100
  x?: number;
  y?: number;
  radius: number;
  spread?: number;
}

export interface GridRow {
  pattern: string; // COLUMNS | ROWS | GRID
  visible: boolean;
  color?: string;
  sectionSize?: number; // GRID cell size, or COLUMNS/ROWS width/height
  count?: number;
  gutterSize?: number;
  offset?: number;
  alignment?: string; // MIN | STRETCH | CENTER | MAX
}

export interface ExportRow {
  format: string; // PNG | JPG | SVG | PDF
  suffix: string;
  scale?: number; // PNG/JPG only
}

// ---------- small helpers ----------

function round(n: number, p = 2): number {
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function rgbToHex(c: RGB | RGBA): string {
  const to = (x: number) => Math.round(clamp01(x) * 255).toString(16).padStart(2, "0");
  return `#${to(c.r)}${to(c.g)}${to(c.b)}`;
}

function hexToRgb(hex: string): RGB {
  let h = String(hex).replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const v = parseInt(h, 16);
  if (isNaN(v)) return { r: 0, g: 0, b: 0 };
  return { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 };
}

function firstVisibleSolid(paints: readonly Paint[] | typeof figma.mixed): SolidPaint | null {
  if (paints === figma.mixed) return null;
  for (const p of paints) {
    if (p.type === "SOLID" && p.visible !== false) return p as SolidPaint;
  }
  return null;
}

function dropShadow(n: SceneNode): DropShadowEffect | null {
  if (!("effects" in n)) return null;
  for (const e of (n as any).effects as readonly Effect[]) {
    if (e.type === "DROP_SHADOW") return e as DropShadowEffect;
  }
  return null;
}

function layerBlur(n: SceneNode): BlurEffect | null {
  if (!("effects" in n)) return null;
  for (const e of (n as any).effects as readonly Effect[]) {
    if (e.type === "LAYER_BLUR") return e as BlurEffect;
  }
  return null;
}

// ---------- reading ----------

type Raw = number | string | boolean | null | undefined | typeof figma.mixed;
type Getter = (n: SceneNode) => Raw;

const sd = (n: SceneNode, f: (e: DropShadowEffect) => Raw, def: Raw): Raw => {
  if (!("effects" in n)) return undefined;
  const e = dropShadow(n);
  return e ? f(e) : def;
};

const lb = (n: SceneNode, f: (e: BlurEffect) => Raw, def: Raw): Raw => {
  if (!("effects" in n)) return undefined;
  const e = layerBlur(n);
  return e ? f(e) : def;
};

const al = (n: SceneNode, key: keyof BaseFrameMixin): Raw => {
  if (!("layoutMode" in n)) return undefined;
  if ((n as FrameNode).layoutMode === "NONE") return undefined;
  return round((n as any)[key]);
};

const alStr = (n: SceneNode, key: string): Raw => {
  if (!("layoutMode" in n)) return undefined;
  if ((n as FrameNode).layoutMode === "NONE") return undefined;
  return (n as any)[key];
};

const GETTERS: Record<string, Getter> = {
  x: (n) => ("x" in n ? round((n as LayoutMixin).x) : undefined),
  y: (n) => ("y" in n ? round((n as LayoutMixin).y) : undefined),
  width: (n) => ("width" in n ? round((n as LayoutMixin).width) : undefined),
  height: (n) => ("height" in n ? round((n as LayoutMixin).height) : undefined),
  rotation: (n) => ("rotation" in n ? round((n as LayoutMixin).rotation) : undefined),
  cornerRadius: (n) => {
    if (!("cornerRadius" in n)) return undefined;
    const cr = (n as RectangleNode).cornerRadius;
    return cr === figma.mixed ? figma.mixed : round(cr);
  },

  opacity: (n) => ("opacity" in n ? round((n as MinimalBlendMixin).opacity * 100) : undefined),
  blendMode: (n) => ("blendMode" in n ? (n as MinimalBlendMixin).blendMode : undefined),
  visible: (n) => ("visible" in n ? (n as SceneNodeMixin).visible : undefined),
  locked: (n) => ("locked" in n ? (n as SceneNodeMixin).locked : undefined),

  fillColor: (n) => {
    if (!("fills" in n)) return undefined;
    const fills = (n as GeometryMixin).fills;
    if (fills === figma.mixed) return figma.mixed;
    const s = firstVisibleSolid(fills);
    return s ? rgbToHex(s.color) : "none";
  },
  fillOpacity: (n) => {
    if (!("fills" in n)) return undefined;
    const fills = (n as GeometryMixin).fills;
    if (fills === figma.mixed) return figma.mixed;
    const s = firstVisibleSolid(fills);
    return s ? round((s.opacity ?? 1) * 100) : undefined;
  },

  strokeColor: (n) => {
    if (!("strokes" in n)) return undefined;
    const s = firstVisibleSolid((n as GeometryMixin).strokes);
    return s ? rgbToHex(s.color) : "none";
  },
  strokeWeight: (n) => {
    if (!("strokeWeight" in n)) return undefined;
    const w = (n as GeometryMixin & { strokeWeight: number | typeof figma.mixed }).strokeWeight;
    return w === figma.mixed ? figma.mixed : round(w);
  },
  strokeAlign: (n) => ("strokeAlign" in n ? (n as GeometryMixin).strokeAlign : undefined),

  shadowEnabled: (n) => sd(n, (e) => e.visible !== false, false),
  shadowColor: (n) => sd(n, (e) => rgbToHex(e.color), "#000000"),
  shadowX: (n) => sd(n, (e) => round(e.offset.x), 0),
  shadowY: (n) => sd(n, (e) => round(e.offset.y), 4),
  shadowBlur: (n) => sd(n, (e) => round(e.radius), 4),
  shadowSpread: (n) => sd(n, (e) => round(e.spread ?? 0), 0),
  blurEnabled: (n) => lb(n, (e) => e.visible !== false, false),
  blurRadius: (n) => lb(n, (e) => round(e.radius), 0),

  layoutMode: (n) => ("layoutMode" in n ? (n as FrameNode).layoutMode : undefined),
  itemSpacing: (n) => al(n, "itemSpacing"),
  paddingTop: (n) => al(n, "paddingTop"),
  paddingRight: (n) => al(n, "paddingRight"),
  paddingBottom: (n) => al(n, "paddingBottom"),
  paddingLeft: (n) => al(n, "paddingLeft"),

  fontSize: (n) => {
    if (n.type !== "TEXT") return undefined;
    return n.fontSize === figma.mixed ? figma.mixed : round(n.fontSize);
  },
  lineHeight: (n) => {
    if (n.type !== "TEXT") return undefined;
    const lh = n.lineHeight;
    if (lh === figma.mixed) return figma.mixed;
    return lh.unit === "AUTO" ? "AUTO" : round(lh.value);
  },
  letterSpacing: (n) => {
    if (n.type !== "TEXT") return undefined;
    const ls = n.letterSpacing;
    return ls === figma.mixed ? figma.mixed : round(ls.value);
  },
  textAlignHorizontal: (n) => (n.type === "TEXT" ? n.textAlignHorizontal : undefined),

  topLeftRadius: (n) => ("topLeftRadius" in n ? round((n as any).topLeftRadius) : undefined),
  topRightRadius: (n) => ("topRightRadius" in n ? round((n as any).topRightRadius) : undefined),
  bottomLeftRadius: (n) => ("bottomLeftRadius" in n ? round((n as any).bottomLeftRadius) : undefined),
  bottomRightRadius: (n) => ("bottomRightRadius" in n ? round((n as any).bottomRightRadius) : undefined),

  clipsContent: (n) => ("clipsContent" in n ? (n as any).clipsContent : undefined),
  layoutWrap: (n) =>
    "layoutWrap" in n && (n as FrameNode).layoutMode !== "NONE" ? (n as any).layoutWrap : undefined,
  layoutSizingHorizontal: (n) =>
    "layoutSizingHorizontal" in n ? (n as any).layoutSizingHorizontal : undefined,
  layoutSizingVertical: (n) =>
    "layoutSizingVertical" in n ? (n as any).layoutSizingVertical : undefined,
  primaryAxisAlignItems: (n) => alStr(n, "primaryAxisAlignItems"),
  counterAxisAlignItems: (n) => alStr(n, "counterAxisAlignItems"),

  constraintH: (n) => ("constraints" in n ? (n as any).constraints.horizontal : undefined),
  constraintV: (n) => ("constraints" in n ? (n as any).constraints.vertical : undefined),
  constrainProportions: (n) => ("constrainProportions" in n ? (n as any).constrainProportions : undefined),
};

function readField(nodes: readonly SceneNode[], getter: Getter): Field {
  let supported = false;
  const vals: Raw[] = [];
  for (const n of nodes) {
    let v: Raw;
    try {
      v = getter(n);
    } catch {
      v = undefined;
    }
    if (v === undefined) continue;
    supported = true;
    vals.push(v);
  }
  if (!supported) return { value: null, mixed: false, supported: false };
  const first = vals[0];
  const mixed = vals.some((v) => v === figma.mixed) || vals.some((v) => v !== first);
  const value = mixed || first === figma.mixed ? null : (first as Field["value"]);
  return { value, mixed, supported: true };
}

export function getSnapshot(): Snapshot {
  const sel = figma.currentPage.selection;
  const fields: Record<string, Field> = {};
  for (const key of Object.keys(GETTERS)) fields[key] = readField(sel, GETTERS[key]);

  const name = sel.length === 0 ? "" : sel.length === 1 ? sel[0].name : `${sel.length} layers`;
  const types = new Set(sel.map((n) => n.type));
  const type = sel.length === 0 ? "" : types.size === 1 ? sel[0].type : "Mixed";

  return {
    count: sel.length,
    name,
    type,
    fields,
    effects: readEffects(),
    grids: readGrids(),
    exports: readExports(),
  };
}

// ---------- list readers (single selection) ----------

function singleNode(): SceneNode | null {
  const sel = figma.currentPage.selection;
  return sel.length === 1 ? sel[0] : null;
}

function readEffects(): EffectRow[] | undefined {
  const n = singleNode() as any;
  if (!n || !("effects" in n)) return undefined;
  const effs = n.effects;
  if (effs === figma.mixed || !Array.isArray(effs)) return undefined;
  return effs.map((e: any) => ({
    type: e.type,
    visible: e.visible !== false,
    color: e.color ? rgbToHex(e.color) : undefined,
    opacity: e.color && typeof e.color.a === "number" ? round(e.color.a * 100) : undefined,
    x: e.offset ? round(e.offset.x) : undefined,
    y: e.offset ? round(e.offset.y) : undefined,
    radius: round(e.radius ?? 0),
    spread: typeof e.spread === "number" ? round(e.spread) : undefined,
  }));
}

function readGrids(): GridRow[] | undefined {
  const n = singleNode() as any;
  if (!n || !("layoutGrids" in n)) return undefined;
  const grids = n.layoutGrids;
  if (!Array.isArray(grids)) return undefined;
  return grids.map((g: any) => ({
    pattern: g.pattern,
    visible: g.visible !== false,
    color: g.color ? rgbToHex(g.color) : undefined,
    sectionSize: typeof g.sectionSize === "number" ? round(g.sectionSize) : undefined,
    count: typeof g.count === "number" && isFinite(g.count) ? g.count : undefined,
    gutterSize: typeof g.gutterSize === "number" ? round(g.gutterSize) : undefined,
    offset: typeof g.offset === "number" ? round(g.offset) : undefined,
    alignment: g.alignment,
  }));
}

function readExports(): ExportRow[] | undefined {
  const n = singleNode() as any;
  if (!n || !("exportSettings" in n)) return undefined;
  const ex = n.exportSettings;
  if (!Array.isArray(ex)) return undefined;
  return ex.map((s: any) => ({
    format: s.format,
    suffix: s.suffix || "",
    scale: s.constraint && s.constraint.type === "SCALE" ? s.constraint.value : undefined,
  }));
}

// ---------- writing ----------

function setSolidColor(n: SceneNode, key: "fills" | "strokes", value: unknown): void {
  if (!(key in n)) return;
  const node = n as GeometryMixin;
  if (value === "none") {
    (node as any)[key] = [];
    return;
  }
  const rgb = hexToRgb(String(value));
  const cur = (node as any)[key];
  let arr: Paint[] = cur === figma.mixed || !Array.isArray(cur) ? [] : clone(cur);
  const idx = arr.findIndex((p) => p.type === "SOLID");
  if (idx >= 0) {
    arr[idx] = { ...(arr[idx] as SolidPaint), color: rgb };
  } else {
    arr = [{ type: "SOLID", color: rgb, opacity: 1, visible: true } as SolidPaint, ...arr];
  }
  (node as any)[key] = arr;
}

function setPaintOpacity(n: SceneNode, key: "fills" | "strokes", o: number): void {
  if (!(key in n)) return;
  const cur = (n as any)[key];
  if (cur === figma.mixed || !Array.isArray(cur)) return;
  const arr: Paint[] = clone(cur);
  const idx = arr.findIndex((p) => p.type === "SOLID");
  if (idx < 0) return;
  arr[idx] = { ...(arr[idx] as SolidPaint), opacity: clamp01(o) };
  (n as any)[key] = arr;
}

interface ShadowPatch {
  enabled?: boolean;
  color?: string;
  x?: number;
  y?: number;
  blur?: number;
  spread?: number;
}

function setShadow(n: SceneNode, patch: ShadowPatch): void {
  if (!("effects" in n)) return;
  const arr: any[] = clone((n as any).effects);
  let idx = arr.findIndex((e) => e.type === "DROP_SHADOW");
  let e: any;
  if (idx < 0) {
    e = {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      offset: { x: 0, y: 4 },
      radius: 4,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    };
    arr.push(e);
    idx = arr.length - 1;
  } else {
    e = { ...arr[idx], color: { ...arr[idx].color }, offset: { ...arr[idx].offset } };
  }
  if (patch.enabled !== undefined) e.visible = patch.enabled;
  if (patch.color !== undefined) {
    const c = hexToRgb(patch.color);
    e.color = { r: c.r, g: c.g, b: c.b, a: e.color.a ?? 1 };
  }
  if (patch.x !== undefined) e.offset = { x: patch.x, y: e.offset.y };
  if (patch.y !== undefined) e.offset = { x: e.offset.x, y: patch.y };
  if (patch.blur !== undefined) e.radius = Math.max(0, patch.blur);
  if (patch.spread !== undefined) e.spread = patch.spread;
  arr[idx] = e;
  (n as any).effects = arr;
}

function setBlur(n: SceneNode, patch: { enabled?: boolean; radius?: number }): void {
  if (!("effects" in n)) return;
  const arr: any[] = clone((n as any).effects);
  let idx = arr.findIndex((e) => e.type === "LAYER_BLUR");
  let e: any;
  if (idx < 0) {
    e = { type: "LAYER_BLUR", radius: 4, visible: true };
    arr.push(e);
    idx = arr.length - 1;
  } else {
    e = { ...arr[idx] };
  }
  if (patch.enabled !== undefined) e.visible = patch.enabled;
  if (patch.radius !== undefined) e.radius = Math.max(0, patch.radius);
  arr[idx] = e;
  (n as any).effects = arr;
}

function setAutoLayout(n: SceneNode, key: string, value: number): void {
  if (!("layoutMode" in n)) return;
  if ((n as FrameNode).layoutMode === "NONE") return;
  (n as any)[key] = Math.max(0, value);
}

async function applyText(n: SceneNode, field: string, value: unknown): Promise<void> {
  if (n.type !== "TEXT") return;
  const t = n as TextNode;
  const len = t.characters.length;
  const fonts: FontName[] =
    len > 0
      ? (t.getRangeAllFontNames(0, len) as FontName[])
      : t.fontName === figma.mixed
        ? []
        : [t.fontName];
  await Promise.all(fonts.map((f) => figma.loadFontAsync(f)));

  switch (field) {
    case "fontSize":
      t.fontSize = Math.max(1, num(value));
      break;
    case "textAlignHorizontal":
      t.textAlignHorizontal = value as TextNode["textAlignHorizontal"];
      break;
    case "letterSpacing":
      t.letterSpacing = { value: num(value), unit: "PIXELS" };
      break;
    case "lineHeight":
      if (value === "AUTO" || value === "" || value === null || value === undefined) {
        t.lineHeight = { unit: "AUTO" };
      } else {
        t.lineHeight = { value: num(value), unit: "PIXELS" };
      }
      break;
  }
}

async function applyToNode(n: SceneNode, field: string, value: unknown): Promise<void> {
  switch (field) {
    case "x":
      if ("x" in n) (n as LayoutMixin).x = num(value);
      break;
    case "y":
      if ("y" in n) (n as LayoutMixin).y = num(value);
      break;
    case "width":
      if ("resize" in n) (n as LayoutMixin).resize(Math.max(0.01, num(value)), (n as LayoutMixin).height);
      break;
    case "height":
      if ("resize" in n) (n as LayoutMixin).resize((n as LayoutMixin).width, Math.max(0.01, num(value)));
      break;
    case "rotation":
      if ("rotation" in n) (n as LayoutMixin).rotation = num(value);
      break;
    case "cornerRadius":
      if ("cornerRadius" in n) (n as RectangleNode).cornerRadius = Math.max(0, num(value));
      break;

    case "opacity":
      if ("opacity" in n) (n as MinimalBlendMixin).opacity = clamp01(num(value) / 100);
      break;
    case "blendMode":
      if ("blendMode" in n) (n as MinimalBlendMixin).blendMode = value as BlendMode;
      break;
    case "visible":
      if ("visible" in n) (n as SceneNodeMixin).visible = !!value;
      break;
    case "locked":
      if ("locked" in n) (n as SceneNodeMixin).locked = !!value;
      break;

    case "fillColor":
      setSolidColor(n, "fills", value);
      break;
    case "fillOpacity":
      setPaintOpacity(n, "fills", num(value) / 100);
      break;
    case "strokeColor":
      setSolidColor(n, "strokes", value);
      break;
    case "strokeWeight":
      if ("strokeWeight" in n) (n as any).strokeWeight = Math.max(0, num(value));
      break;
    case "strokeAlign":
      if ("strokeAlign" in n) (n as GeometryMixin).strokeAlign = value as GeometryMixin["strokeAlign"];
      break;

    case "shadowEnabled":
      setShadow(n, { enabled: !!value });
      break;
    case "shadowColor":
      setShadow(n, { color: String(value) });
      break;
    case "shadowX":
      setShadow(n, { x: num(value) });
      break;
    case "shadowY":
      setShadow(n, { y: num(value) });
      break;
    case "shadowBlur":
      setShadow(n, { blur: num(value) });
      break;
    case "shadowSpread":
      setShadow(n, { spread: num(value) });
      break;
    case "blurEnabled":
      setBlur(n, { enabled: !!value });
      break;
    case "blurRadius":
      setBlur(n, { radius: num(value) });
      break;

    case "layoutMode":
      if ("layoutMode" in n) (n as FrameNode).layoutMode = value as FrameNode["layoutMode"];
      break;
    case "itemSpacing":
      setAutoLayout(n, "itemSpacing", num(value));
      break;
    case "paddingTop":
    case "paddingRight":
    case "paddingBottom":
    case "paddingLeft":
      setAutoLayout(n, field, num(value));
      break;

    case "topLeftRadius":
    case "topRightRadius":
    case "bottomLeftRadius":
    case "bottomRightRadius":
      if (field in n) (n as any)[field] = Math.max(0, num(value));
      break;
    case "clipsContent":
      if ("clipsContent" in n) (n as any).clipsContent = !!value;
      break;
    case "layoutWrap":
      if ("layoutWrap" in n) (n as any).layoutWrap = value;
      break;
    case "layoutSizingHorizontal":
      if ("layoutSizingHorizontal" in n) (n as any).layoutSizingHorizontal = value;
      break;
    case "layoutSizingVertical":
      if ("layoutSizingVertical" in n) (n as any).layoutSizingVertical = value;
      break;
    case "primaryAxisAlignItems":
      if ("primaryAxisAlignItems" in n) (n as any).primaryAxisAlignItems = value;
      break;
    case "counterAxisAlignItems":
      if ("counterAxisAlignItems" in n) (n as any).counterAxisAlignItems = value;
      break;
    case "constraintH":
      if ("constraints" in n) (n as any).constraints = { ...(n as any).constraints, horizontal: value };
      break;
    case "constraintV":
      if ("constraints" in n) (n as any).constraints = { ...(n as any).constraints, vertical: value };
      break;
    case "constrainProportions":
      if ("constrainProportions" in n) (n as any).constrainProportions = !!value;
      break;

    case "fontSize":
    case "textAlignHorizontal":
    case "letterSpacing":
    case "lineHeight":
      await applyText(n, field, value);
      break;
  }
}

export async function applyField(field: string, value: unknown): Promise<void> {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) throw new Error("Select a layer first.");
  for (const n of sel) {
    try {
      await applyToNode(n, field, value);
    } catch {
      // skip nodes that can't accept this field; keep applying to the rest
    }
  }
}

// ---------- commands (align / flip) ----------

function composeFlip(a: Transform, b: number[][]): Transform {
  return [
    [
      a[0][0] * b[0][0] + a[0][1] * b[1][0],
      a[0][0] * b[0][1] + a[0][1] * b[1][1],
      a[0][0] * b[0][2] + a[0][1] * b[1][2] + a[0][2],
    ],
    [
      a[1][0] * b[0][0] + a[1][1] * b[1][0],
      a[1][0] * b[0][1] + a[1][1] * b[1][1],
      a[1][0] * b[0][2] + a[1][1] * b[1][2] + a[1][2],
    ],
  ] as Transform;
}

function flipHorizontal(n: SceneNode): void {
  if (!("relativeTransform" in n)) return;
  const t = (n as LayoutMixin).relativeTransform;
  (n as any).relativeTransform = composeFlip(t, [[-1, 0, (n as LayoutMixin).width], [0, 1, 0]]);
}

function flipVertical(n: SceneNode): void {
  if (!("relativeTransform" in n)) return;
  const t = (n as LayoutMixin).relativeTransform;
  (n as any).relativeTransform = composeFlip(t, [[1, 0, 0], [0, -1, (n as LayoutMixin).height]]);
}

function alignSelection(kind: string): void {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) return;
  let minX: number, minY: number, maxX: number, maxY: number;
  if (sel.length > 1) {
    minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
    for (const n of sel) {
      const b = n.absoluteBoundingBox;
      if (!b) continue;
      minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height);
    }
    if (!isFinite(minX)) return;
  } else {
    const parent = sel[0].parent as any;
    const pb = parent && "absoluteBoundingBox" in parent ? parent.absoluteBoundingBox : null;
    if (!pb) return;
    minX = pb.x; minY = pb.y; maxX = pb.x + pb.width; maxY = pb.y + pb.height;
  }
  for (const n of sel) {
    const b = n.absoluteBoundingBox;
    if (!b) continue;
    let dx = 0, dy = 0;
    switch (kind) {
      case "align-left": dx = minX - b.x; break;
      case "align-h-center": dx = (minX + maxX) / 2 - (b.x + b.width / 2); break;
      case "align-right": dx = maxX - (b.x + b.width); break;
      case "align-top": dy = minY - b.y; break;
      case "align-v-center": dy = (minY + maxY) / 2 - (b.y + b.height / 2); break;
      case "align-bottom": dy = maxY - (b.y + b.height); break;
    }
    if ("x" in n) (n as LayoutMixin).x += dx;
    if ("y" in n) (n as LayoutMixin).y += dy;
  }
}

export async function runCommand(name: string): Promise<void> {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) throw new Error("Select a layer first.");
  if (name === "flip-h") {
    for (const n of sel) try { flipHorizontal(n); } catch { /* skip */ }
  } else if (name === "flip-v") {
    for (const n of sel) try { flipVertical(n); } catch { /* skip */ }
  } else if (name.indexOf("align-") === 0) {
    alignSelection(name);
  }
}

// ---------- page navigation ----------

export interface PageInfo {
  id: string;
  name: string;
}

// Reading id/name of root.children is allowed in dynamic-page mode without loading.
export function listPages(): PageInfo[] {
  return figma.root.children.map((p) => ({ id: p.id, name: p.name }));
}

export function currentPageId(): string {
  return figma.currentPage.id;
}

export async function gotoPage(id: string): Promise<void> {
  const node = await figma.getNodeByIdAsync(id);
  if (node && node.type === "PAGE") {
    await figma.setCurrentPageAsync(node as PageNode);
  }
}

// ---------- list editing (effects / grids / exports) ----------

function defaultEffect(type: string): any {
  if (type === "LAYER_BLUR" || type === "BACKGROUND_BLUR") {
    return { type, radius: 4, visible: true };
  }
  return {
    type,
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 4 },
    radius: 4,
    spread: 0,
    visible: true,
    blendMode: "NORMAL",
  };
}

function patchEffect(e: any, key: string, value: unknown): any {
  const c: any = { ...e, color: e.color ? { ...e.color } : undefined, offset: e.offset ? { ...e.offset } : undefined };
  switch (key) {
    case "color": {
      const rgb = hexToRgb(String(value));
      c.color = { r: rgb.r, g: rgb.g, b: rgb.b, a: c.color ? c.color.a : 1 };
      break;
    }
    case "opacity":
      if (c.color) c.color = { ...c.color, a: clamp01(num(value) / 100) };
      break;
    case "x":
      if (c.offset) c.offset = { x: num(value), y: c.offset.y };
      break;
    case "y":
      if (c.offset) c.offset = { x: c.offset.x, y: num(value) };
      break;
    case "radius":
      c.radius = Math.max(0, num(value));
      break;
    case "spread":
      c.spread = num(value);
      break;
  }
  return c;
}

function defaultGrid(pattern: string): any {
  const color = { r: 1, g: 0, b: 0, a: 0.1 };
  if (pattern === "GRID") return { pattern: "GRID", visible: true, color, sectionSize: 8 };
  return { pattern, visible: true, color, alignment: "STRETCH", gutterSize: 20, count: 5, sectionSize: 60, offset: 0 };
}

function patchGrid(g: any, key: string, value: unknown): any {
  const c: any = { ...g, color: g.color ? { ...g.color } : undefined };
  switch (key) {
    case "color": {
      const rgb = hexToRgb(String(value));
      c.color = { r: rgb.r, g: rgb.g, b: rgb.b, a: c.color ? c.color.a : 0.1 };
      break;
    }
    case "count":
      c.count = Math.max(1, Math.round(num(value)));
      break;
    case "gutterSize":
      c.gutterSize = Math.max(0, num(value));
      break;
    case "sectionSize":
      c.sectionSize = Math.max(1, num(value));
      break;
    case "offset":
      c.offset = num(value);
      break;
    case "alignment":
      c.alignment = String(value);
      break;
  }
  return c;
}

function defaultExport(format: string): any {
  if (format === "SVG" || format === "PDF") return { format, suffix: "", contentsOnly: true };
  return { format, suffix: "", constraint: { type: "SCALE", value: 1 }, contentsOnly: true };
}

function patchExport(s: any, key: string, value: unknown): any {
  const c: any = { ...s, constraint: s.constraint ? { ...s.constraint } : undefined };
  switch (key) {
    case "suffix":
      c.suffix = String(value);
      break;
    case "scale":
      c.constraint = { type: "SCALE", value: Math.max(0.01, num(value)) };
      break;
  }
  return c;
}

// kind: "effects" | "grids" | "exports"
export async function applyList(kind: string, action: string, payload: any): Promise<void> {
  const prop = kind === "effects" ? "effects" : kind === "grids" ? "layoutGrids" : "exportSettings";
  const mk = kind === "effects" ? defaultEffect : kind === "grids" ? defaultGrid : defaultExport;
  const patch = kind === "effects" ? patchEffect : kind === "grids" ? patchGrid : patchExport;
  const newType = payload.etype || (kind === "exports" ? "PNG" : kind === "grids" ? "COLUMNS" : "DROP_SHADOW");

  const sel = figma.currentPage.selection;
  if (sel.length === 0) throw new Error("Select a layer first.");
  for (const n of sel as any[]) {
    if (!(prop in n)) continue;
    try {
      const cur = n[prop];
      const arr: any[] = cur === figma.mixed || !Array.isArray(cur) ? [] : clone(cur);
      const i = payload.index;
      switch (action) {
        case "add":
          arr.push(mk(newType));
          break;
        case "remove":
          if (i >= 0 && i < arr.length) arr.splice(i, 1);
          break;
        case "toggle":
          if (arr[i]) arr[i] = { ...arr[i], visible: !(arr[i].visible !== false) };
          break;
        case "type": {
          if (arr[i]) {
            const prev = arr[i];
            const next = mk(newType);
            next.visible = prev.visible;
            if (kind === "effects" && typeof prev.radius === "number") next.radius = prev.radius;
            arr[i] = next;
          }
          break;
        }
        case "param":
          if (arr[i]) arr[i] = patch(arr[i], payload.key, payload.value);
          break;
      }
      n[prop] = arr;
    } catch {
      // skip nodes that reject this list op
    }
  }
}
