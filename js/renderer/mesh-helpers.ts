/**
 * Helpers to build canonical mesh prop objects for roundedRectangle and nineSlice
 * so we can compare and cache them reliably.
 */
export function buildRoundedRectangleMeshProps(
    wrapperProps: any,
    sw: number,
    sh: number,
    compScaling: [number, number]
) {
    return {
        sw,
        sh,
        rounding: (wrapperProps.rounding ?? 30) * compScaling[0],
        resolution: wrapperProps.resolution ?? 4,
        tl: wrapperProps.roundTopLeft ?? true,
        tr: wrapperProps.roundTopRight ?? true,
        bl: wrapperProps.roundBottomLeft ?? true,
        br: wrapperProps.roundBottomRight ?? true,
    };
}

export function buildNineSliceProps(
    wrapperProps: any,
    sw: number,
    sh: number,
    compScaling: [number, number]
) {
    return {
        sw,
        sh,
        borderTextureSize: wrapperProps.borderTextureSize ?? 0,
        borderSize: (wrapperProps.borderSize ?? 0) * compScaling[0],
    };
}
