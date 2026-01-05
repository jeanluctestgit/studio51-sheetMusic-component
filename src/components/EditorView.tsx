import { useEffect } from "react";
import { useEditorStore } from "../editor/store";
import { StaffView } from "../svg/StaffView";
import { Toolbar } from "./Toolbar";
import { Inspector } from "./Inspector";
import { durationToTicks } from "../music/ticks";

export const EditorView = () => {
  const {
    activeTool,
    setTool,
    setDuration,
    duration,
    dotted,
    triplet,
    moveSelected,
    removeEvent,
    selectedEventIds,
    undo,
    redo,
  } = useEditorStore();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        selectedEventIds.forEach((id) => removeEvent(id));
        return;
      }
      if (event.key >= "1" && event.key <= "6") {
        const mapping = ["1/1", "1/2", "1/4", "1/8", "1/16", "1/32"] as const;
        setDuration(mapping[Number(event.key) - 1]);
        return;
      }
      if (event.key === "v") {
        setTool("select");
        return;
      }
      if (event.key === "n") {
        setTool("note");
        return;
      }
      if (event.key === "r") {
        setTool("rest");
        return;
      }
      if (event.key === "e") {
        setTool("erase");
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelected(0, 1);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelected(0, -1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const ticks = durationToTicks(duration, dotted, triplet ? { n: 3, inTimeOf: 2 } : null, 1024);
        moveSelected(-ticks, 0);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        const ticks = durationToTicks(duration, dotted, triplet ? { n: 3, inTimeOf: 2 } : null, 1024);
        moveSelected(ticks, 0);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeTool,
    duration,
    dotted,
    triplet,
    moveSelected,
    redo,
    removeEvent,
    selectedEventIds,
    setDuration,
    setTool,
    undo,
  ]);

  return (
    <div className="editor-layout">
      <Toolbar />
      <main className="editor-main">
        <StaffView />
      </main>
      <Inspector />
    </div>
  );
};
