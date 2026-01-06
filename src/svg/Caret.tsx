import { useEffect, useState } from "react";

type CaretProps = {
  x: number;
  yTop: number;
  yBottom: number;
};

export const Caret = ({ x, yTop, yBottom }: CaretProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let frame = 0;
    let lastToggle = performance.now();
    const loop = (time: number) => {
      if (time - lastToggle > 500) {
        setVisible((current) => !current);
        lastToggle = time;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!visible) {
    return null;
  }

  return <line x1={x} x2={x} y1={yTop} y2={yBottom} stroke="#ef4444" strokeWidth={2} />;
};
