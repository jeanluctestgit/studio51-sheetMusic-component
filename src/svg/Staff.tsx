type StaffProps = {
  x: number;
  y: number;
  width: number;
  lineSpacing: number;
  showTab?: boolean;
  tabLineCount?: number;
};

export const Staff = ({ x, y, width, lineSpacing, showTab, tabLineCount = 6 }: StaffProps) => {
  const staffLines = Array.from({ length: 5 }, (_, index) => y + index * lineSpacing);
  const tabTop = y + 5 * lineSpacing + 36;
  const tabLines = Array.from({ length: tabLineCount }, (_, index) => tabTop + index * lineSpacing);

  return (
    <g>
      {staffLines.map((lineY) => (
        <line key={lineY} x1={x} x2={x + width} y1={lineY} y2={lineY} stroke="#cbd5f5" strokeWidth={1} />
      ))}
      <text x={x + 8} y={y + lineSpacing * 3} fontSize={32} fill="#e2e8f0">
        𝄞
      </text>
      <text x={x + 52} y={y + lineSpacing * 2.2} fontSize={14} fill="#cbd5f5">
        C
      </text>
      <text x={x + 80} y={y + lineSpacing * 1.5} fontSize={16} fill="#e2e8f0">
        4
      </text>
      <text x={x + 80} y={y + lineSpacing * 3.5} fontSize={16} fill="#e2e8f0">
        4
      </text>
      {showTab &&
        tabLines.map((lineY) => (
          <line key={`tab-${lineY}`} x1={x} x2={x + width} y1={lineY} y2={lineY} stroke="#64748b" strokeWidth={1} />
        ))}
      {showTab && (
        <text x={x + 8} y={tabTop + lineSpacing * 2.5} fontSize={18} fill="#94a3b8">
          TAB
        </text>
      )}
    </g>
  );
};
