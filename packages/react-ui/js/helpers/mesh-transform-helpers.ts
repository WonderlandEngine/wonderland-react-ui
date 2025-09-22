import {Z_INC} from '../constants.js';

export type MeshTransform = {
    position: [number, number, number];
    scaling?: [number, number, number];
    resetScaling?: boolean;
};

/**
 * Compute the child object's position and optional scaling for meshes.
 * - For roundedRectangle and nineSlice we position the child at the center
 *   and reset scaling.
 * - For plain planes we position the child at the center and set scaling
 *   to half the width/height (planes use diameter 2 logic), with special
 *   handling for a provided z prop.
 */
export function computeMeshChildTransforms(
    sw: number,
    sh: number,
    propsZ: number | undefined,
    tag: string
): MeshTransform {
    const centerX = 0.5 * sw;
    const centerY = -0.5 * sh;
    const z = Z_INC + (propsZ ?? 0);

    if (tag === 'roundedRectangle' || tag === 'nineSlice') {
        return {position: [centerX, centerY, z], resetScaling: true};
    }

    // plane/other
    const sx = 0.5 * sw;
    const sy = 0.5 * sh;
    const sz = propsZ === undefined ? 0.5 * sw : 1;
    return {position: [centerX, centerY, z], scaling: [sx, sy, sz]};
}
