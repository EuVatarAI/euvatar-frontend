import { useEffect, useMemo, useRef, useState } from "react";

type ScaledIframeProps = {
  src: string;
  title: string;
  baseWidth?: number;
  baseHeight?: number;
  className?: string;
  sandbox?: string;
};

/**
 * Renders an iframe in a fixed "device" viewport (baseWidth/baseHeight)
 * and scales it to fit its container.
 *
 * Note: scaling is applied to a wrapper div (not the iframe), avoiding
 * layout/scrollbar quirks from transforming the iframe element itself.
 */
export function ScaledIframe({
  src,
  title,
  baseWidth = 1366,
  baseHeight = 768,
  className,
  sandbox = "allow-scripts allow-same-origin allow-forms allow-popups",
}: ScaledIframeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const base = useMemo(() => ({ width: baseWidth, height: baseHeight }), [baseWidth, baseHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const sx = rect.width / base.width;
      const sy = rect.height / base.height;
      setScale(Math.min(sx, sy));
    };

    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(el);

    return () => ro.disconnect();
  }, [base.width, base.height]);

  return (
    <div ref={containerRef} className={"w-full h-full overflow-hidden " + (className ?? "")}>
      <div
        className="origin-top-left"
        style={{
          width: base.width,
          height: base.height,
          transform: `scale(${scale})`,
        }}
      >
        <iframe
          src={src}
          title={title}
          sandbox={sandbox}
          className="border-0"
          style={{ width: base.width, height: base.height }}
        />
      </div>
    </div>
  );
}
