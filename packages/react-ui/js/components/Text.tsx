import {Object3D} from '@wonderlandengine/api';
import React, {forwardRef, PropsWithChildren, useContext, useMemo} from 'react';
import type {TextProps, Color} from '../renderer-types.js';
import {parseColor} from '../utils.js';
import {
    MaterialContext,
    ThemeContext,
    FlatMaterial,
    TextMaterial,
} from './component-types.js';

const tempColor = new Float32Array(4);
/**
 * A 3D text component that renders text in 3D space with customizable styling.
 * Supports color customization and inherits text properties from theme context.
 *
 * @note
 * To use outline, ensure the Outline option is checked in the Wonderland Editor for the font.
 *
 * @component
 * @example
 * ```tsx
 * <Text
 *   color="#ff0000"
 *   fontSize={24}
 *   textEffect="shadow"
 *   textEffectColor="#440000"
 *   textEffectOffset={[0.05, -0.05]}
 * >
 *   Hello World
 * </Text>
 * ```
 *
 * @param {TextProps & {color?: Color}} props - The text properties
 * @param {Color} [props.color] - Text color. Falls back to theme color or material color
 * @param {Material} [props.material] - Custom material for the text. If not provided, uses cloned text material from context
 * @param {string} [props.text] - Alternative way to provide text content (children takes precedence)
 * @param {React.ReactNode} props.children - Text content to display (converted to string)
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} A 3D text element
 */

export const Text = forwardRef<
    Object3D,
    PropsWithChildren<
        TextProps & {
            color?: Color;
        }
    >
>((props, ref) => {
    const context = useContext(MaterialContext);
    const theme = useContext(ThemeContext);
    const mat = props.material ?? useMemo(() => context.textMaterial?.clone(), []);
    if (mat) {
        (mat as unknown as TextMaterial).setColor(
            parseColor(
                props.color ??
                    theme.colors?.text ??
                    ((props.material ?? context.textMaterial) as unknown as FlatMaterial)
                        .color,
                tempColor
            )
        );
        if (props.textEffectColor) {
            (mat as unknown as TextMaterial).setEffectColor(
                parseColor(props.textEffectColor, tempColor)
            );
        }
    }
    return React.createElement('text3d', {
        ...props,
        material: mat,
        text: props.children?.toString() ?? props.text,
        ref: ref,
    });
});

Text.displayName = 'Text';
