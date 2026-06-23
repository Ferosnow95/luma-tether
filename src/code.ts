/// <reference types="@figma/plugin-typings" />

import { getSnapshot, applyField, runCommand, listPages, gotoPage } from "./actions";

figma.showUI(__html__, {
  width: 264,
  height: 640,
  themeColors: true,
  title: "Tether",
});

function pushSelection(): void {
  figma.ui.postMessage({ type: "selection", snapshot: getSnapshot() });
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

figma.on("selectionchange", pushSelection);
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
      case "set-page": {
        await gotoPage(msg.id);
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
