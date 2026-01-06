import { ToolContext } from "./toolTypes";

export const EraseTool = {
  id: "erase",
  onPointerDown: (context: ToolContext) => {
    if (context.noteHit) {
      context.removeEvent(context.noteHit.id);
    }
  },
};
