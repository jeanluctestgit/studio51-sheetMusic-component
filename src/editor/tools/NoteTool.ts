import { ToolContext } from "./toolTypes";

export const NoteTool = {
  id: "note",
  onPointerDown: (context: ToolContext) => {
    context.setCaretFromPoint(context.point);
    context.insertNoteAtCaret();
  },
};
