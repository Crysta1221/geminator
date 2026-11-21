import { useEffect, useRef } from "react";

/** 画面切り替え時に見出しへフォーカスを移す（スクロールは起こさない）。 */
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
