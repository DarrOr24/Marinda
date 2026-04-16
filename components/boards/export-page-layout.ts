/**
 * Fixed layout size for off-screen schedule → JPEG exports (not tied to the current device).
 * Uses a **large-phone** logical width so one page fits about as much as before on typical devices
 * (`windowWidth × 2.05`), avoiding unnecessary splits when we used a smaller fixed size.
 */
export const EXPORT_PAGE_CONTENT_WIDTH = 428;

const PORTRAIT_HEIGHT_TO_WIDTH = 2.05;

/** Max height for one JPEG “page”; wider+budget keeps busy days on a single image when possible. */
export const EXPORT_PAGE_HEIGHT = Math.round(
  EXPORT_PAGE_CONTENT_WIDTH * PORTRAIT_HEIGHT_TO_WIDTH,
);
