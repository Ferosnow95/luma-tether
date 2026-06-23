/// <reference types="@figma/plugin-typings" />

import { getSnapshot, applyField, runCommand, listPages, gotoPage, applyList, reorderPage, listFonts } from "./actions";

figma.showUI(__html__, {
  width: 264,
  height: 640,
  themeColors: true,
  title: "Tether",
});

function pushSelection(): void {
  figma.ui.postMessage({ type: "selection", snapshot: getSnapshot() });
}

// ---------- follow selection (snap window beside the selected frame) ----------
let follow = false;
let uiW = 264;
let uiH = 640;

function selectionBounds(): Rect | null {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of sel) {
    const b = (n as SceneNode & { absoluteBoundingBox?: Rect | null }).absoluteBoundingBox;
    if (!b) continue;
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height);
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Place the plugin window just to the right of the current selection (left side if
// there isn't room). Prefers the exact getPosition() transform; if that API isn't
// available, falls back to a viewport-only mapping. Always clamped on-screen.
function snapToSelection(announce?: boolean): void {
  if (!follow) return;
  const b = selectionBounds();
  if (!b) {
    if (announce) figma.notify("Follow selection on - select a frame to snap beside it");
    return;
  }
  const zoom = figma.viewport.zoom;
  const vb = figma.viewport.bounds;
  const GAP = 16;

  let pos: { windowSpace: Vector; canvasSpace: Vector } | null = null;
  try {
    if (typeof figma.ui.getPosition === "function") pos = figma.ui.getPosition();
  } catch (e) {
    pos = null;
  }

  let x: number, y: number, minX: number, minY: number, maxX: number, maxY: number;
  if (pos) {
    // exact: map canvas -> window space using the known anchor correspondence
    const W = pos.windowSpace, C = pos.canvasSpace;
    const wx = (cx: number) => W.x + (cx - C.x) * zoom;
    const wy = (cy: number) => W.y + (cy - C.y) * zoom;
    minX = wx(vb.x) + 8; minY = wy(vb.y) + 8;
    maxX = wx(vb.x + vb.width) - 8; maxY = wy(vb.y + vb.height) - 8;
    x = wx(b.x + b.width) + GAP;
    if (x + uiW > maxX) x = wx(b.x) - GAP - uiW; // not enough room right -> go left
    y = wy(b.y);
  } else {
    // fallback: reposition origin assumed to be the canvas viewport's top-left
    const viewW = vb.width * zoom, viewH = vb.height * zoom;
    minX = 8; minY = 8; maxX = viewW - 8; maxY = viewH - 8;
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

// ---------- page navigation + history ----------
// History of visited page ids during this plugin session, so "Back" can return to
// the previously viewed page without using Figma's left sidebar.
let history: string[] = [];
let histIndex = -1;
let navigating = false; // set while we programmatically change pages (suppresses history record)

function pushNav(): void {
  figma.ui.postMessage({
    type: "pages",
    pages: listPages(),
    currentId: figma.currentPage.id,
    canBack: histIndex > 0,
    canForward: histIndex < history.length - 1,
  });
}

function recordPage(): void {
  const id = figma.currentPage.id;
  if (histIndex >= 0 && history[histIndex] === id) return;
  history = history.slice(0, histIndex + 1);
  history.push(id);
  histIndex = history.length - 1;
}

async function navTo(index: number): Promise<void> {
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
  if (navigating) navigating = false; // page change we initiated via Back/Forward
  else recordPage(); // user (or page dropdown) navigated to a new page
  pushSelection();
  pushNav();
});

recordPage();
pushSelection();
pushNav();

figma.ui.onmessage = async (msg: any) => {
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
