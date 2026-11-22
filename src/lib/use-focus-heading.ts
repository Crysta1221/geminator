import { useEffect, useRef } from "react";

/** Moves focus to the heading on screen transitions without scrolling. */
export function useFocusHeading<T extends HTMLElement = HTMLHeadingElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  return ref;
}
