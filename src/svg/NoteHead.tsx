type NoteHeadProps = {
  cx: number;
  cy: number;
  filled?: boolean;
};

export const NoteHead = ({ cx, cy, filled = true }: NoteHeadProps) => {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={7}
      ry={5}
      fill={filled ? "#f1f5f9" : "transparent"}
      stroke="#f1f5f9"
      strokeWidth={1.5}
    />
  );
};
