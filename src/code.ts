/// <reference types="@figma/plugin-typings" />

import { getSnapshot, applyField, runCommand, listPages, gotoPage, applyList, reorderPage } from "./actions";

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

// Place the plugin window just to the right of the current selection. Uses
// getPosition() to derive the canvas->window transform (no viewport-origin guessing).
function snapToSelection(): void {
  if (!follow) return;
  const b = selectionBounds();
  if (!b) return;
  let pos: { windowSpace: Vector; canvasSpace: Vector };
  try {
    pos = figma.ui.getPosition();
  } catch (e) {
    return;
  }
  const zoom = figma.viewport.zoom;
  const W = pos.windowSpace, C = pos.canvasSpace;
  const GAP = 16;
  const winX = W.x + (b.x + b.width - C.x) * zoom + GAP;
  const winY = W.y + (b.y - C.y) * zoom;
  figma.ui.reposition(Math.max(8, Math.round(winX)), Math.max(8, Math.round(winY)));
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
        if (follow) snapToSelection();
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
