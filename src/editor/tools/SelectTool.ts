import { ToolContext } from "./toolTypes";

export const SelectTool = {
  id: "select",
  onPointerDown: (context: ToolContext) => {
    if (context.noteHit) {
      if (context.shiftKey) {
        context.toggleSelection(context.noteHit.id);
      } else {
        context.selectSingle(context.noteHit.id);
      }
      return;
    }
    context.selectSingle(null);
  },
};
