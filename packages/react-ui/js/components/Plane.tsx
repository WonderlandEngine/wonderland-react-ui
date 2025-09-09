import {Object3D} from '@wonderlandengine/api';
import React, {forwardRef} from 'react';
import type {MeshProps} from '../renderer-types.js';

/**
 * A simple mesh plane component for rendering flat surfaces in 3D space.
 * Useful for creating basic geometric elements or custom rendered content.
 *
 * @component
 * @example
 * ```tsx
 * <Plane
 *   material={myMaterial}
 *   width={100}
 *   height={100}
 * />
 * ```
 *
 * @param {MeshProps} props - The mesh properties
 * @param {Material} [props.material] - Material to apply to the mesh
 * @param {React.ReactNode} props.children - Child elements
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} A mesh plane element
 */

export const Plane = forwardRef<Object3D, React.PropsWithChildren<MeshProps>>(
    (props, ref) => {
        return React.createElement('mesh', {...props, ref: ref}, props.children);
    }
);
