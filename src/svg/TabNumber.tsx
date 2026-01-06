type TabNumberProps = {
  x: number;
  y: number;
  value: number;
};

export const TabNumber = ({ x, y, value }: TabNumberProps) => {
  return (
    <text x={x} y={y} fontSize={12} fill="#38bdf8" textAnchor="middle" dominantBaseline="middle">
      {value}
    </text>
  );
};
