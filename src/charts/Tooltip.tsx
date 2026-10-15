import { useCallback, useRef, useState, type ReactNode } from "react";

/** Tooltip that follows the pointer inside a relatively positioned chart container. */
export function useTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);
  const show = useCallback((e: React.PointerEvent | React.FocusEvent, content: ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    let x: number, y: number;
    if ("clientX" in e) {
      x = e.clientX - box.left;
      y = e.clientY - box.top;
    } else {
      const t = (e.target as Element).getBoundingClientRect();
      x = t.left + t.width / 2 - box.left;
      y = t.top - box.top;
    }
    setTip({ x, y, content });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  const node = tip ? (
    <div
      className="tooltip"
      role="status"
      style={{
        left: Math.min(Math.max(tip.x, 70), (ref.current?.clientWidth ?? 0) - 70),
        top: tip.y,
      }}
    >
      {tip.content}
    </div>
  ) : null;
  return { ref, show, hide, node };
}
