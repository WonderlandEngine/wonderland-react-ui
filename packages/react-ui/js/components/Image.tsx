import {Object3D, Texture} from '@wonderlandengine/api';
import React, {forwardRef, useContext, useMemo} from 'react';
import {MaterialContext, FlatMaterial} from './component-types.js';
import {Panel, PanelProps} from './Panel.js';

/**
 * An Image component that renders a textured panel with an image source.
 * Supports both URL strings and Texture objects as image sources.
 *
 * @component
 * @example
 * ```tsx
 * // Using a URL
 * <Image src="/path/to/image.png" width={100} height={100} />
 *
 * // Using a Texture object
 * <Image src={myTexture} width={100} height={100} />
 * ```
 *
 * @param {Object} props - The component props
 * @param {string | Texture} props.src - The image source, either a URL string or a Texture object
 * @param {Material | null} [props.material] - Optional custom material. If not provided, uses cloned textured panel material from context
 * @param {React.ReactNode} props.children - Child elements to render on top of the image
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} An image panel element
 */

export const Image = forwardRef<
    Object3D,
    React.PropsWithChildren<{src: string | Texture} & PanelProps>
>((props, ref) => {
    const context = useContext(MaterialContext);
    const mat = props.material ?? useMemo(() => context.panelMaterialTextured?.clone(), []);
    const texture =
        typeof props.src === 'string'
            ? useMemo(() => mat!.engine.textures.load(props.src as string), [props.src])
            : Promise.resolve(props.src);
    texture.then((t) => ((mat as unknown as FlatMaterial).flatTexture = t));

    return (
        <Panel {...props} material={mat} ref={ref}>
            {props.children}
        </Panel>
    );
});

Image.displayName = 'Image';
