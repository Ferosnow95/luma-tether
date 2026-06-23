"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // src/actions.ts
  function round(n, p = 2) {
    const f = Math.pow(10, p);
    return Math.round(n * f) / f;
  }
  function num(v) {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return isNaN(n) ? 0 : n;
  }
  function clamp01(n) {
    return Math.max(0, Math.min(1, n));
  }
  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }
  function rgbToHex(c) {
    const to = (x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, "0");
    return `#${to(c.r)}${to(c.g)}${to(c.b)}`;
  }
  function hexToRgb(hex) {
    let h = String(hex).replace("#", "").trim();
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const v = parseInt(h, 16);
    if (isNaN(v)) return { r: 0, g: 0, b: 0 };
    return { r: (v >> 16 & 255) / 255, g: (v >> 8 & 255) / 255, b: (v & 255) / 255 };
  }
  function firstVisibleSolid(paints) {
    if (paints === figma.mixed) return null;
    for (const p of paints) {
      if (p.type === "SOLID" && p.visible !== false) return p;
    }
    return null;
  }
  function dropShadow(n) {
    if (!("effects" in n)) return null;
    for (const e of n.effects) {
      if (e.type === "DROP_SHADOW") return e;
    }
    return null;
  }
  function layerBlur(n) {
    if (!("effects" in n)) return null;
    for (const e of n.effects) {
      if (e.type === "LAYER_BLUR") return e;
    }
    return null;
  }
  var sd = (n, f, def) => {
    if (!("effects" in n)) return void 0;
    const e = dropShadow(n);
    return e ? f(e) : def;
  };
  var lb = (n, f, def) => {
    if (!("effects" in n)) return void 0;
    const e = layerBlur(n);
    return e ? f(e) : def;
  };
  var al = (n, key) => {
    if (!("layoutMode" in n)) return void 0;
    if (n.layoutMode === "NONE") return void 0;
    return round(n[key]);
  };
  var alStr = (n, key) => {
    if (!("layoutMode" in n)) return void 0;
    if (n.layoutMode === "NONE") return void 0;
    return n[key];
  };
  var GETTERS = {
    x: (n) => "x" in n ? round(n.x) : void 0,
    y: (n) => "y" in n ? round(n.y) : void 0,
    width: (n) => "width" in n ? round(n.width) : void 0,
    height: (n) => "height" in n ? round(n.height) : void 0,
    rotation: (n) => "rotation" in n ? round(n.rotation) : void 0,
    cornerRadius: (n) => {
      if (!("cornerRadius" in n)) return void 0;
      const cr = n.cornerRadius;
      return cr === figma.mixed ? figma.mixed : round(cr);
    },
    opacity: (n) => "opacity" in n ? round(n.opacity * 100) : void 0,
    blendMode: (n) => "blendMode" in n ? n.blendMode : void 0,
    visible: (n) => "visible" in n ? n.visible : void 0,
    locked: (n) => "locked" in n ? n.locked : void 0,
    fillColor: (n) => {
      if (!("fills" in n)) return void 0;
      const fills = n.fills;
      if (fills === figma.mixed) return figma.mixed;
      const s = firstVisibleSolid(fills);
      return s ? rgbToHex(s.color) : "none";
    },
    fillOpacity: (n) => {
      var _a;
      if (!("fills" in n)) return void 0;
      const fills = n.fills;
      if (fills === figma.mixed) return figma.mixed;
      const s = firstVisibleSolid(fills);
      return s ? round(((_a = s.opacity) != null ? _a : 1) * 100) : void 0;
    },
    strokeColor: (n) => {
      if (!("strokes" in n)) return void 0;
      const s = firstVisibleSolid(n.strokes);
      return s ? rgbToHex(s.color) : "none";
    },
    strokeWeight: (n) => {
      if (!("strokeWeight" in n)) return void 0;
      const w = n.strokeWeight;
      return w === figma.mixed ? figma.mixed : round(w);
    },
    strokeAlign: (n) => "strokeAlign" in n ? n.strokeAlign : void 0,
    shadowEnabled: (n) => sd(n, (e) => e.visible !== false, false),
    shadowColor: (n) => sd(n, (e) => rgbToHex(e.color), "#000000"),
    shadowX: (n) => sd(n, (e) => round(e.offset.x), 0),
    shadowY: (n) => sd(n, (e) => round(e.offset.y), 4),
    shadowBlur: (n) => sd(n, (e) => round(e.radius), 4),
    shadowSpread: (n) => sd(n, (e) => {
      var _a;
      return round((_a = e.spread) != null ? _a : 0);
    }, 0),
    blurEnabled: (n) => lb(n, (e) => e.visible !== false, false),
    blurRadius: (n) => lb(n, (e) => round(e.radius), 0),
    layoutMode: (n) => "layoutMode" in n ? n.layoutMode : void 0,
    itemSpacing: (n) => al(n, "itemSpacing"),
    paddingTop: (n) => al(n, "paddingTop"),
    paddingRight: (n) => al(n, "paddingRight"),
    paddingBottom: (n) => al(n, "paddingBottom"),
    paddingLeft: (n) => al(n, "paddingLeft"),
    fontSize: (n) => {
      if (n.type !== "TEXT") return void 0;
      return n.fontSize === figma.mixed ? figma.mixed : round(n.fontSize);
    },
    lineHeight: (n) => {
      if (n.type !== "TEXT") return void 0;
      const lh = n.lineHeight;
      if (lh === figma.mixed) return figma.mixed;
      return lh.unit === "AUTO" ? "AUTO" : round(lh.value);
    },
    letterSpacing: (n) => {
      if (n.type !== "TEXT") return void 0;
      const ls = n.letterSpacing;
      return ls === figma.mixed ? figma.mixed : round(ls.value);
    },
    textAlignHorizontal: (n) => n.type === "TEXT" ? n.textAlignHorizontal : void 0,
    textAlignVertical: (n) => n.type === "TEXT" ? n.textAlignVertical : void 0,
    textAutoResize: (n) => n.type === "TEXT" ? n.textAutoResize : void 0,
    textCase: (n) => n.type === "TEXT" ? n.textCase === figma.mixed ? figma.mixed : n.textCase : void 0,
    textDecoration: (n) => n.type === "TEXT" ? n.textDecoration === figma.mixed ? figma.mixed : n.textDecoration : void 0,
    paragraphSpacing: (n) => {
      if (n.type !== "TEXT") return void 0;
      const ps = n.paragraphSpacing;
      return ps === figma.mixed ? figma.mixed : round(ps);
    },
    fontFamily: (n) => n.type === "TEXT" ? n.fontName === figma.mixed ? figma.mixed : n.fontName.family : void 0,
    fontStyle: (n) => n.type === "TEXT" ? n.fontName === figma.mixed ? figma.mixed : n.fontName.style : void 0,
    topLeftRadius: (n) => "topLeftRadius" in n ? round(n.topLeftRadius) : void 0,
    topRightRadius: (n) => "topRightRadius" in n ? round(n.topRightRadius) : void 0,
    bottomLeftRadius: (n) => "bottomLeftRadius" in n ? round(n.bottomLeftRadius) : void 0,
    bottomRightRadius: (n) => "bottomRightRadius" in n ? round(n.bottomRightRadius) : void 0,
    clipsContent: (n) => "clipsContent" in n ? n.clipsContent : void 0,
    layoutWrap: (n) => "layoutWrap" in n && n.layoutMode !== "NONE" ? n.layoutWrap : void 0,
    layoutSizingHorizontal: (n) => "layoutSizingHorizontal" in n ? n.layoutSizingHorizontal : void 0,
    layoutSizingVertical: (n) => "layoutSizingVertical" in n ? n.layoutSizingVertical : void 0,
    primaryAxisAlignItems: (n) => alStr(n, "primaryAxisAlignItems"),
    counterAxisAlignItems: (n) => alStr(n, "counterAxisAlignItems"),
    constraintH: (n) => "constraints" in n ? n.constraints.horizontal : void 0,
    constraintV: (n) => "constraints" in n ? n.constraints.vertical : void 0,
    constrainProportions: (n) => "constrainProportions" in n ? n.constrainProportions : void 0
  };
  function readField(nodes, getter) {
    let supported = false;
    const vals = [];
    for (const n of nodes) {
      let v;
      try {
        v = getter(n);
      } catch (e) {
        v = void 0;
      }
      if (v === void 0) continue;
      supported = true;
      vals.push(v);
    }
    if (!supported) return { value: null, mixed: false, supported: false };
    const first = vals[0];
    const mixed = vals.some((v) => v === figma.mixed) || vals.some((v) => v !== first);
    const value = mixed || first === figma.mixed ? null : first;
    return { value, mixed, supported: true };
  }
  function getSnapshot() {
    const sel = figma.currentPage.selection;
    const fields = {};
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
      exports: readExports()
    };
  }
  function singleNode() {
    const sel = figma.currentPage.selection;
    return sel.length === 1 ? sel[0] : null;
  }
  function readEffects() {
    const n = singleNode();
    if (!n || !("effects" in n)) return void 0;
    const effs = n.effects;
    if (effs === figma.mixed || !Array.isArray(effs)) return void 0;
    return effs.map((e) => {
      var _a;
      return {
        type: e.type,
        visible: e.visible !== false,
        color: e.color ? rgbToHex(e.color) : void 0,
        opacity: e.color && typeof e.color.a === "number" ? round(e.color.a * 100) : void 0,
        x: e.offset ? round(e.offset.x) : void 0,
        y: e.offset ? round(e.offset.y) : void 0,
        radius: round((_a = e.radius) != null ? _a : 0),
        spread: typeof e.spread === "number" ? round(e.spread) : void 0
      };
    });
  }
  function readGrids() {
    const n = singleNode();
    if (!n || !("layoutGrids" in n)) return void 0;
    const grids = n.layoutGrids;
    if (!Array.isArray(grids)) return void 0;
    return grids.map((g) => ({
      pattern: g.pattern,
      visible: g.visible !== false,
      color: g.color ? rgbToHex(g.color) : void 0,
      sectionSize: typeof g.sectionSize === "number" ? round(g.sectionSize) : void 0,
      count: typeof g.count === "number" && isFinite(g.count) ? g.count : void 0,
      gutterSize: typeof g.gutterSize === "number" ? round(g.gutterSize) : void 0,
      offset: typeof g.offset === "number" ? round(g.offset) : void 0,
      alignment: g.alignment
    }));
  }
  function readExports() {
    const n = singleNode();
    if (!n || !("exportSettings" in n)) return void 0;
    const ex = n.exportSettings;
    if (!Array.isArray(ex)) return void 0;
    return ex.map((s) => ({
      format: s.format,
      suffix: s.suffix || "",
      scale: s.constraint && s.constraint.type === "SCALE" ? s.constraint.value : void 0
    }));
  }
  function setSolidColor(n, key, value) {
    if (!(key in n)) return;
    const node = n;
    if (value === "none") {
      node[key] = [];
      return;
    }
    const rgb = hexToRgb(String(value));
    const cur = node[key];
    let arr = cur === figma.mixed || !Array.isArray(cur) ? [] : clone(cur);
    const idx = arr.findIndex((p) => p.type === "SOLID");
    if (idx >= 0) {
      arr[idx] = __spreadProps(__spreadValues({}, arr[idx]), { color: rgb });
    } else {
      arr = [{ type: "SOLID", color: rgb, opacity: 1, visible: true }, ...arr];
    }
    node[key] = arr;
  }
  function setPaintOpacity(n, key, o) {
    if (!(key in n)) return;
    const cur = n[key];
    if (cur === figma.mixed || !Array.isArray(cur)) return;
    const arr = clone(cur);
    const idx = arr.findIndex((p) => p.type === "SOLID");
    if (idx < 0) return;
    arr[idx] = __spreadProps(__spreadValues({}, arr[idx]), { opacity: clamp01(o) });
    n[key] = arr;
  }
  function setShadow(n, patch) {
    var _a;
    if (!("effects" in n)) return;
    const arr = clone(n.effects);
    let idx = arr.findIndex((e2) => e2.type === "DROP_SHADOW");
    let e;
    if (idx < 0) {
      e = {
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        offset: { x: 0, y: 4 },
        radius: 4,
        spread: 0,
        visible: true,
        blendMode: "NORMAL"
      };
      arr.push(e);
      idx = arr.length - 1;
    } else {
      e = __spreadProps(__spreadValues({}, arr[idx]), { color: __spreadValues({}, arr[idx].color), offset: __spreadValues({}, arr[idx].offset) });
    }
    if (patch.enabled !== void 0) e.visible = patch.enabled;
    if (patch.color !== void 0) {
      const c = hexToRgb(patch.color);
      e.color = { r: c.r, g: c.g, b: c.b, a: (_a = e.color.a) != null ? _a : 1 };
    }
    if (patch.x !== void 0) e.offset = { x: patch.x, y: e.offset.y };
    if (patch.y !== void 0) e.offset = { x: e.offset.x, y: patch.y };
    if (patch.blur !== void 0) e.radius = Math.max(0, patch.blur);
    if (patch.spread !== void 0) e.spread = patch.spread;
    arr[idx] = e;
    n.effects = arr;
  }
  function setBlur(n, patch) {
    if (!("effects" in n)) return;
    const arr = clone(n.effects);
    let idx = arr.findIndex((e2) => e2.type === "LAYER_BLUR");
    let e;
    if (idx < 0) {
      e = { type: "LAYER_BLUR", radius: 4, visible: true };
      arr.push(e);
      idx = arr.length - 1;
    } else {
      e = __spreadValues({}, arr[idx]);
    }
    if (patch.enabled !== void 0) e.visible = patch.enabled;
    if (patch.radius !== void 0) e.radius = Math.max(0, patch.radius);
    arr[idx] = e;
    n.effects = arr;
  }
  function setAutoLayout(n, key, value) {
    if (!("layoutMode" in n)) return;
    if (n.layoutMode === "NONE") return;
    n[key] = Math.max(0, value);
  }
  async function applyText(n, field, value) {
    if (n.type !== "TEXT") return;
    const t = n;
    const len = t.characters.length;
    const fonts = len > 0 ? t.getRangeAllFontNames(0, len) : t.fontName === figma.mixed ? [] : [t.fontName];
    await Promise.all(fonts.map((f) => figma.loadFontAsync(f)));
    switch (field) {
      case "fontSize":
        t.fontSize = Math.max(1, num(value));
        break;
      case "textAlignHorizontal":
        t.textAlignHorizontal = value;
        break;
      case "letterSpacing":
        t.letterSpacing = { value: num(value), unit: "PIXELS" };
        break;
      case "lineHeight":
        if (value === "AUTO" || value === "" || value === null || value === void 0) {
          t.lineHeight = { unit: "AUTO" };
        } else {
          t.lineHeight = { value: num(value), unit: "PIXELS" };
        }
        break;
      case "textAlignVertical":
        t.textAlignVertical = value;
        break;
      case "textAutoResize":
        t.textAutoResize = value;
        break;
      case "textCase":
        t.textCase = value;
        break;
      case "textDecoration":
        t.textDecoration = value;
        break;
      case "paragraphSpacing":
        t.paragraphSpacing = Math.max(0, num(value));
        break;
      case "fontFamily": {
        const family = String(value);
        const avail = await figma.listAvailableFontsAsync();
        const stylesFor = avail.filter((a) => a.fontName.family === family).map((a) => a.fontName.style);
        const curStyle = t.fontName === figma.mixed ? null : t.fontName.style;
        let style = "Regular";
        if (curStyle && stylesFor.indexOf(curStyle) !== -1) style = curStyle;
        else if (stylesFor.indexOf("Regular") !== -1) style = "Regular";
        else if (stylesFor.length) style = stylesFor[0];
        const nf = { family, style };
        await figma.loadFontAsync(nf);
        if (len > 0) t.setRangeFontName(0, len, nf);
        else t.fontName = nf;
        break;
      }
      case "fontStyle": {
        const family = t.fontName === figma.mixed ? null : t.fontName.family;
        if (!family) break;
        const nf = { family, style: String(value) };
        await figma.loadFontAsync(nf);
        if (len > 0) t.setRangeFontName(0, len, nf);
        else t.fontName = nf;
        break;
      }
    }
  }
  async function applyToNode(n, field, value) {
    switch (field) {
      case "x":
        if ("x" in n) n.x = num(value);
        break;
      case "y":
        if ("y" in n) n.y = num(value);
        break;
      case "width":
        if ("resize" in n) n.resize(Math.max(0.01, num(value)), n.height);
        break;
      case "height":
        if ("resize" in n) n.resize(n.width, Math.max(0.01, num(value)));
        break;
      case "rotation":
        if ("rotation" in n) n.rotation = num(value);
        break;
      case "cornerRadius":
        if ("cornerRadius" in n) n.cornerRadius = Math.max(0, num(value));
        break;
      case "opacity":
        if ("opacity" in n) n.opacity = clamp01(num(value) / 100);
        break;
      case "blendMode":
        if ("blendMode" in n) n.blendMode = value;
        break;
      case "visible":
        if ("visible" in n) n.visible = !!value;
        break;
      case "locked":
        if ("locked" in n) n.locked = !!value;
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
        if ("strokeWeight" in n) n.strokeWeight = Math.max(0, num(value));
        break;
      case "strokeAlign":
        if ("strokeAlign" in n) n.strokeAlign = value;
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
        if ("layoutMode" in n) n.layoutMode = value;
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
        if (field in n) n[field] = Math.max(0, num(value));
        break;
      case "clipsContent":
        if ("clipsContent" in n) n.clipsContent = !!value;
        break;
      case "layoutWrap":
        if ("layoutWrap" in n) n.layoutWrap = value;
        break;
      case "layoutSizingHorizontal":
        if ("layoutSizingHorizontal" in n) n.layoutSizingHorizontal = value;
        break;
      case "layoutSizingVertical":
        if ("layoutSizingVertical" in n) n.layoutSizingVertical = value;
        break;
      case "primaryAxisAlignItems":
        if ("primaryAxisAlignItems" in n) n.primaryAxisAlignItems = value;
        break;
      case "counterAxisAlignItems":
        if ("counterAxisAlignItems" in n) n.counterAxisAlignItems = value;
        break;
      case "constraintH":
        if ("constraints" in n) n.constraints = __spreadProps(__spreadValues({}, n.constraints), { horizontal: value });
        break;
      case "constraintV":
        if ("constraints" in n) n.constraints = __spreadProps(__spreadValues({}, n.constraints), { vertical: value });
        break;
      case "constrainProportions":
        if ("constrainProportions" in n) n.constrainProportions = !!value;
        break;
      case "fontSize":
      case "textAlignHorizontal":
      case "letterSpacing":
      case "lineHeight":
      case "textAlignVertical":
      case "textAutoResize":
      case "textCase":
      case "textDecoration":
      case "paragraphSpacing":
      case "fontFamily":
      case "fontStyle":
        await applyText(n, field, value);
        break;
    }
  }
  async function applyField(field, value) {
    const sel = figma.currentPage.selection;
    if (sel.length === 0) throw new Error("Select a layer first.");
    for (const n of sel) {
      try {
        await applyToNode(n, field, value);
      } catch (e) {
      }
    }
  }
  function composeFlip(a, b) {
    return [
      [
        a[0][0] * b[0][0] + a[0][1] * b[1][0],
        a[0][0] * b[0][1] + a[0][1] * b[1][1],
        a[0][0] * b[0][2] + a[0][1] * b[1][2] + a[0][2]
      ],
      [
        a[1][0] * b[0][0] + a[1][1] * b[1][0],
        a[1][0] * b[0][1] + a[1][1] * b[1][1],
        a[1][0] * b[0][2] + a[1][1] * b[1][2] + a[1][2]
      ]
    ];
  }
  function flipHorizontal(n) {
    if (!("relativeTransform" in n)) return;
    const t = n.relativeTransform;
    n.relativeTransform = composeFlip(t, [[-1, 0, n.width], [0, 1, 0]]);
  }
  function flipVertical(n) {
    if (!("relativeTransform" in n)) return;
    const t = n.relativeTransform;
    n.relativeTransform = composeFlip(t, [[1, 0, 0], [0, -1, n.height]]);
  }
  function alignSelection(kind) {
    const sel = figma.currentPage.selection;
    if (sel.length === 0) return;
    let minX, minY, maxX, maxY;
    if (sel.length > 1) {
      minX = Infinity;
      minY = Infinity;
      maxX = -Infinity;
      maxY = -Infinity;
      for (const n of sel) {
        const b = n.absoluteBoundingBox;
        if (!b) continue;
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      }
      if (!isFinite(minX)) return;
    } else {
      const parent = sel[0].parent;
      const pb = parent && "absoluteBoundingBox" in parent ? parent.absoluteBoundingBox : null;
      if (!pb) return;
      minX = pb.x;
      minY = pb.y;
      maxX = pb.x + pb.width;
      maxY = pb.y + pb.height;
    }
    for (const n of sel) {
      const b = n.absoluteBoundingBox;
      if (!b) continue;
      let dx = 0, dy = 0;
      switch (kind) {
        case "align-left":
          dx = minX - b.x;
          break;
        case "align-h-center":
          dx = (minX + maxX) / 2 - (b.x + b.width / 2);
          break;
        case "align-right":
          dx = maxX - (b.x + b.width);
          break;
        case "align-top":
          dy = minY - b.y;
          break;
        case "align-v-center":
          dy = (minY + maxY) / 2 - (b.y + b.height / 2);
          break;
        case "align-bottom":
          dy = maxY - (b.y + b.height);
          break;
      }
      if ("x" in n) n.x += dx;
      if ("y" in n) n.y += dy;
    }
  }
  async function runCommand(name) {
    const sel = figma.currentPage.selection;
    if (sel.length === 0) throw new Error("Select a layer first.");
    if (name === "flip-h") {
      for (const n of sel) try {
        flipHorizontal(n);
      } catch (e) {
      }
    } else if (name === "flip-v") {
      for (const n of sel) try {
        flipVertical(n);
      } catch (e) {
      }
    } else if (name.indexOf("align-") === 0) {
      alignSelection(name);
    }
  }
  function listPages() {
    return figma.root.children.map((p) => ({ id: p.id, name: p.name }));
  }
  async function gotoPage(id) {
    const node = await figma.getNodeByIdAsync(id);
    if (node && node.type === "PAGE") {
      await figma.setCurrentPageAsync(node);
    }
  }
  async function reorderPage(id, newIndex) {
    const node = await figma.getNodeByIdAsync(id);
    if (!node || node.type !== "PAGE") return;
    const max = figma.root.children.length - 1;
    const idx = Math.max(0, Math.min(Math.round(newIndex), max));
    figma.root.insertChild(idx, node);
  }
  async function listFonts() {
    const fonts = await figma.listAvailableFontsAsync();
    const styles = {};
    for (const f of fonts) {
      const fam = f.fontName.family;
      if (!styles[fam]) styles[fam] = [];
      styles[fam].push(f.fontName.style);
    }
    const families = Object.keys(styles).sort((a, b) => a.localeCompare(b));
    return { families, styles };
  }
  function defaultEffect(type) {
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
      blendMode: "NORMAL"
    };
  }
  function patchEffect(e, key, value) {
    const c = __spreadProps(__spreadValues({}, e), { color: e.color ? __spreadValues({}, e.color) : void 0, offset: e.offset ? __spreadValues({}, e.offset) : void 0 });
    switch (key) {
      case "color": {
        const rgb = hexToRgb(String(value));
        c.color = { r: rgb.r, g: rgb.g, b: rgb.b, a: c.color ? c.color.a : 1 };
        break;
      }
      case "opacity":
        if (c.color) c.color = __spreadProps(__spreadValues({}, c.color), { a: clamp01(num(value) / 100) });
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
  function defaultGrid(pattern) {
    const color = { r: 1, g: 0, b: 0, a: 0.1 };
    if (pattern === "GRID") return { pattern: "GRID", visible: true, color, sectionSize: 8 };
    return { pattern, visible: true, color, alignment: "STRETCH", gutterSize: 20, count: 5, sectionSize: 60, offset: 0 };
  }
  function patchGrid(g, key, value) {
    const c = __spreadProps(__spreadValues({}, g), { color: g.color ? __spreadValues({}, g.color) : void 0 });
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
  function defaultExport(format) {
    if (format === "SVG" || format === "PDF") return { format, suffix: "", contentsOnly: true };
    return { format, suffix: "", constraint: { type: "SCALE", value: 1 }, contentsOnly: true };
  }
  function patchExport(s, key, value) {
    const c = __spreadProps(__spreadValues({}, s), { constraint: s.constraint ? __spreadValues({}, s.constraint) : void 0 });
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
  async function applyList(kind, action, payload) {
    const prop = kind === "effects" ? "effects" : kind === "grids" ? "layoutGrids" : "exportSettings";
    const mk = kind === "effects" ? defaultEffect : kind === "grids" ? defaultGrid : defaultExport;
    const patch = kind === "effects" ? patchEffect : kind === "grids" ? patchGrid : patchExport;
    const newType = payload.etype || (kind === "exports" ? "PNG" : kind === "grids" ? "COLUMNS" : "DROP_SHADOW");
    const sel = figma.currentPage.selection;
    if (sel.length === 0) throw new Error("Select a layer first.");
    for (const n of sel) {
      if (!(prop in n)) continue;
      try {
        const cur = n[prop];
        const arr = cur === figma.mixed || !Array.isArray(cur) ? [] : clone(cur);
        const i = payload.index;
        switch (action) {
          case "add":
            arr.push(mk(newType));
            break;
          case "remove":
            if (i >= 0 && i < arr.length) arr.splice(i, 1);
            break;
          case "toggle":
            if (arr[i]) arr[i] = __spreadProps(__spreadValues({}, arr[i]), { visible: !(arr[i].visible !== false) });
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
      } catch (e) {
      }
    }
  }

  // src/code.ts
  figma.showUI(__html__, {
    width: 264,
    height: 640,
    themeColors: true,
    title: "Tether"
  });
  function pushSelection() {
    figma.ui.postMessage({ type: "selection", snapshot: getSnapshot() });
  }
  var follow = false;
  var uiW = 264;
  var uiH = 640;
  function selectionBounds() {
    const sel = figma.currentPage.selection;
    if (sel.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of sel) {
      const b = n.absoluteBoundingBox;
      if (!b) continue;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    if (minX === Infinity) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  function snapToSelection(announce) {
    if (!follow) return;
    const b = selectionBounds();
    if (!b) {
      if (announce) figma.notify("Follow selection on - select a frame to snap beside it");
      return;
    }
    const zoom = figma.viewport.zoom;
    const vb = figma.viewport.bounds;
    const GAP = 16;
    let pos = null;
    try {
      if (typeof figma.ui.getPosition === "function") pos = figma.ui.getPosition();
    } catch (e) {
      pos = null;
    }
    let x, y, minX, minY, maxX, maxY;
    if (pos) {
      const W = pos.windowSpace, C = pos.canvasSpace;
      const wx = (cx) => W.x + (cx - C.x) * zoom;
      const wy = (cy) => W.y + (cy - C.y) * zoom;
      minX = wx(vb.x) + 8;
      minY = wy(vb.y) + 8;
      maxX = wx(vb.x + vb.width) - 8;
      maxY = wy(vb.y + vb.height) - 8;
      x = wx(b.x + b.width) + GAP;
      if (x + uiW > maxX) x = wx(b.x) - GAP - uiW;
      y = wy(b.y);
    } else {
      const viewW = vb.width * zoom, viewH = vb.height * zoom;
      minX = 8;
      minY = 8;
      maxX = viewW - 8;
      maxY = viewH - 8;
      x = (b.x + b.width - vb.x) * zoom + GAP;
      if (x + uiW > maxX) x = (b.x - vb.x) * zoom - GAP - uiW;
      y = (b.y - vb.y) * zoom;
    }
    x = Math.max(minX, Math.min(x, maxX - uiW));
    y = Math.max(minY, Math.min(y, maxY - uiH));
    figma.ui.reposition(Math.round(x), Math.round(y));
    if (announce) {
      figma.notify(`Follow selection on (${pos ? "exact" : "viewport"} positioning)`);
    }
  }
  var history = [];
  var histIndex = -1;
  var navigating = false;
  function pushNav() {
    figma.ui.postMessage({
      type: "pages",
      pages: listPages(),
      currentId: figma.currentPage.id,
      canBack: histIndex > 0,
      canForward: histIndex < history.length - 1
    });
  }
  function recordPage() {
    const id = figma.currentPage.id;
    if (histIndex >= 0 && history[histIndex] === id) return;
    history = history.slice(0, histIndex + 1);
    history.push(id);
    histIndex = history.length - 1;
  }
  async function navTo(index) {
    if (index < 0 || index >= history.length) return;
    histIndex = index;
    navigating = true;
    await gotoPage(history[histIndex]);
  }
  figma.on("selectionchange", () => {
    pushSelection();
    snapToSelection();
  });
  figma.on("currentpagechange", () => {
    if (navigating) navigating = false;
    else recordPage();
    pushSelection();
    pushNav();
  });
  recordPage();
  pushSelection();
  pushNav();
  figma.ui.onmessage = async (msg) => {
    try {
      switch (msg.type) {
        case "apply": {
          await applyField(msg.field, msg.value);
          pushSelection();
          break;
        }
        case "command": {
          await runCommand(msg.name);
          pushSelection();
          break;
        }
        case "list": {
          await applyList(msg.kind, msg.action, msg.payload || {});
          pushSelection();
          break;
        }
        case "set-page": {
          await gotoPage(msg.id);
          break;
        }
        case "reorder-page": {
          await reorderPage(msg.id, msg.index);
          pushNav();
          break;
        }
        case "set-follow": {
          follow = !!msg.on;
          if (follow) snapToSelection(true);
          break;
        }
        case "get-fonts": {
          const f = await listFonts();
          figma.ui.postMessage({ type: "fonts", families: f.families, styles: f.styles });
          break;
        }
        case "nav-back": {
          await navTo(histIndex - 1);
          break;
        }
        case "nav-forward": {
          await navTo(histIndex + 1);
          break;
        }
        case "drag": {
          figma.ui.reposition(msg.x, msg.y);
          break;
        }
        case "resize": {
          const w = Math.max(240, Math.round(msg.width));
          const h = Math.max(240, Math.round(msg.height));
          uiW = w;
          uiH = h;
          figma.ui.resize(w, h);
          break;
        }
        case "refresh": {
          pushSelection();
          pushNav();
          break;
        }
        case "close": {
          figma.closePlugin();
          break;
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      figma.notify(message, { error: true });
      figma.ui.postMessage({ type: "error", message });
    }
  };
})();
