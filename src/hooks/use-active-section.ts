import { useEffect, useState } from "react";

/**
 * Scroll-spy: reports which section currently owns the viewport.
 *
 * Uses one IntersectionObserver over all sections rather than a scroll handler
 * doing getBoundingClientRect on every frame — no layout thrash.
 *
 * The rootMargin band (`-45% top / -50% bottom`) collapses the viewport to a
 * thin line just above the middle, so a section becomes "active" when it crosses
 * the reader's natural focal point — not when its first pixel appears. Without
 * that, the next section lights up while you're still reading the current one.
 */
export const useActiveSection = (ids: readonly string[]) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
};
