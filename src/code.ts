/// <reference types="@figma/plugin-typings" />

import { getSnapshot, applyField, runCommand } from "./actions";

figma.showUI(__html__, {
  width: 264,
  height: 640,
  themeColors: true,
  title: "Tether",
});

function pushSelection(): void {
  figma.ui.postMessage({ type: "selection", snapshot: getSnapshot() });
}

figma.on("selectionchange", pushSelection);
pushSelection();

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
