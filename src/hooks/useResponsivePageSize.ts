import { useEffect, useState, type RefObject } from "react";

// Rows-per-page that fills whatever vertical space is left below `anchorRef` in the
// viewport, so a taller window shows more terminales before paginating instead of a
// fixed page size that under-fills a big monitor or forces scrolling on a small one.
export function useResponsivePageSize(
  anchorRef: RefObject<HTMLElement | null>,
  rowHeight: number,
  reservedBelow: number,
  minRows = 5,
): number {
  const [pageSize, setPageSize] = useState(minRows);

  useEffect(() => {
    function recompute() {
      const top = anchorRef.current?.getBoundingClientRect().top ?? 0;
      const available = window.innerHeight - top - reservedBelow;
      setPageSize(Math.max(minRows, Math.floor(available / rowHeight)));
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [anchorRef, rowHeight, reservedBelow, minRows]);

  return pageSize;
}
