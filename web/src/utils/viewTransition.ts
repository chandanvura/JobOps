import { flushSync } from "react-dom";

/**
 * Progressive-enhancement wrapper around the Same-Document View Transitions API.
 * Runs the DOM update immediately if unsupported or if the user prefers reduced motion.
 */
export function runViewTransition(update: () => void): void {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const startVT =
    typeof document !== "undefined"
      ? (document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } })
          .startViewTransition
      : undefined;

  if (!startVT || prefersReduced) {
    update();
    return;
  }

  startVT.call(document, () => {
    flushSync(() => {
      update();
    });
  });
}
