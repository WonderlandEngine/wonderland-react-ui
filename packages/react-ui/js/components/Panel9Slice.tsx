import {Object3D, Texture} from '@wonderlandengine/api';
import React, {forwardRef, useContext, useMemo} from 'react';
import {MaterialContext, FlatMaterial} from './component-types.js';
import {PanelProps} from './Panel.js';

/**
 * A 9-slice panel component that renders a textured panel with customizable borders.
 * Uses 9-slice scaling technique to maintain border proportions while scaling the content area.
 *
 * @component
 * @example
 * ```tsx
 * <Panel9Slice
 *   texture={myTexture}
 *   borderSize={10}
 *   borderTextureSize={0.3}
 * >
 *   <Content />
 * </Panel9Slice>
 * ```
 *
 * @param {PanelProps & {texture?: Texture | null; borderSize?: number; borderTextureSize?: number}} props - The component props
 * @param {Texture | null} [props.texture] - Optional texture to apply to the panel. If provided, will override the default material texture
 * @param {number} [props.borderSize] - The size of the border in world units
 * @param {number} [props.borderTextureSize] - The size of the border in the texture, between 0.0 - 1.0 (default is 0.5, meaning half the texture size)
 * @param {Material | null} [props.material] - Optional custom material. If not provided, uses the cloned panel material from context
 * @param {React.ReactNode} props.children - Child elements to render inside the panel
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying Object3D
 * @returns {React.ReactElement} A 9-slice panel element with the specified texture and border configuration
 */

export const Panel9Slice = forwardRef<
    Object3D,
    React.PropsWithChildren<
        PanelProps & {
            texture?: Texture | null;
            borderSize?: number;
            borderTextureSize?: number;
        }
    >
>((props, ref) => {
    const context = useContext(MaterialContext);
    const mat = useMemo(() => context.panelMaterialTextured?.clone(), []);
    if (mat && props.texture) (mat as unknown as FlatMaterial).flatTexture = props.texture;
    return React.createElement(
        'nineSlice',
        {...props, material: props.material ?? mat, ref: ref},
        props.children
    );
});

Panel9Slice.displayName = 'Panel9Slice';
