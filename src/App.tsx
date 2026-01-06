import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { Viewport } from "./components/Viewport";
import { Inspector } from "./components/Inspector";
import { useScoreStore } from "./store/scoreStore";

const App = () => {
  const {
    activeDurationTicks,
    moveCaret,
    removeSelected,
    redo,
    undo,
    selection,
    setActiveDurationTicks,
    setTool,
  } = useScoreStore();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selection.length) {
          event.preventDefault();
          removeSelected();
        }
        return;
      }
      if (event.key >= "1" && event.key <= "6") {
        const durations = [1920, 960, 480, 240, 120, 60];
        setActiveDurationTicks(durations[Number(event.key) - 1]);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveCaret(-activeDurationTicks, 0);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveCaret(activeDurationTicks, 0);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveCaret(0, 1);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveCaret(0, -1);
        return;
      }
      if (key === "v") {
        setTool("select");
      }
      if (key === "n") {
        setTool("note");
      }
      if (key === "r") {
        setTool("rest");
      }
      if (key === "e") {
        setTool("erase");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeDurationTicks,
    moveCaret,
    redo,
    removeSelected,
    selection.length,
    setActiveDurationTicks,
    setTool,
    undo,
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">StaffFirst Editor</p>
          <h1 className="text-2xl font-semibold">Staff-first Guitar Pro–style SVG editor</h1>
          <p className="text-sm text-slate-400">
            The score is the source of truth. Tablature is derived from pitch via the instrument mapping engine.
          </p>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl grid-cols-[72px_minmax(0,1fr)_280px] gap-4 px-6 py-6">
        <Toolbar />
        <Viewport />
        <Inspector />
      </div>
    </div>
  );
};

export default App;
