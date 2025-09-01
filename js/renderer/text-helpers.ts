export const TEXT_BASE_SIZE = 12;
export const DEFAULT_FONT_SIZE = 50;

/**
 * Compute the text scale (s) and the wrap width (ww) used by the renderer.
 * Pure function — no engine dependencies.
 */
export function computeTextScaleAndWrap(
    widthPx: number,
    fontSize: number | undefined,
    compScaling: [number, number],
    textBaseSize = TEXT_BASE_SIZE,
    defaultFontSize = DEFAULT_FONT_SIZE
) {
    const s = textBaseSize * (fontSize ?? defaultFontSize) * compScaling[1];
    const ww = (widthPx * compScaling[0]) / s;
    return {scale: s, wrapWidth: ww};
}

/**
 * Convert a bounding box (minX, minY, maxX, maxY) returned by the text
 * component into UI width/height values used by yoga.
 */
export function computeDimensionsFromBoundingBox(
    bb: ArrayLike<number>,
    scale: number,
    compScaling: [number, number]
) {
    const w = (scale * (bb[2] - bb[0])) / compScaling[0];
    const h = (scale * (bb[3] - bb[1])) / compScaling[1];
    return {width: w, height: h};
}
