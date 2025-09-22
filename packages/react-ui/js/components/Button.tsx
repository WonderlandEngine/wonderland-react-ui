import {Object3D, Material} from '@wonderlandengine/api';
import React, {forwardRef, PropsWithChildren, useState} from 'react';
import type {Color, YogaNodeProps} from '../renderer-types.js';
import {Panel} from './Panel.js';

/**
 * An interactive button component with hover and active states.
 * Supports different styling for normal, hovered, and active states.
 *
 * @component
 * @example
 * ```tsx
 * <Button
 *   backgroundColor="#007bff"
 *   borderSize={2}
 *   borderColor="#0056b3"
 *   hovered={{
 *     backgroundColor="#0056b3",
 *     borderColor="#004085"
 *   }}
 *   active={{
 *     backgroundColor="#004085",
 *     borderColor="#002752"
 *   }}
 *   padding={10}
 *   onClick={() => console.log('Clicked!')}
 * >
 *   Click Me
 * </Button>
 * ```
 *
 * @param {Object} props - The button properties
 * @param {Material} [props.material] - Material for normal state
 * @param {Color} [props.backgroundColor] - Background color for normal state
 * @param {number} [props.rounding] - Corner rounding radius
 * @param {number} [props.resolution] - Resolution of rounded corners
 * @param {number} [props.borderSize] - Border width for normal state
 * @param {Color} [props.borderColor] - Border color for normal state
 * @param {Object} props.hovered - Styling for hovered state
 * @param {Material} [props.hovered.material] - Material for hovered state
 * @param {Color} [props.hovered.backgroundColor] - Background color for hovered state
 * @param {number} [props.hovered.borderSize] - Border width for hovered state
 * @param {Color} [props.hovered.borderColor] - Border color for hovered state
 * @param {Object} props.active - Styling for active (pressed) state
 * @param {Material} [props.active.material] - Material for active state
 * @param {Color} [props.active.backgroundColor] - Background color for active state
 * @param {number} [props.active.borderSize] - Border width for active state
 * @param {Color} [props.active.borderColor] - Border color for active state
 * @param {React.ReactNode} props.children - Button content
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} An interactive button element
 */

export const Button = forwardRef<
    Object3D,
    PropsWithChildren<
        {
            material?: Material;
            backgroundColor?: Color;

            rounding?: number;
            resolution?: number;

            borderSize?: number;
            borderColor?: Color;

            hovered: {
                material?: Material;
                backgroundColor?: Color;
                borderSize?: number;
                borderColor?: Color;
            };

            active: {
                material?: Material;
                backgroundColor?: Color;
                borderSize?: number;
                borderColor?: Color;
            };
        } & YogaNodeProps
    >
>((props, ref) => {
    const [hovered, setHovered] = useState(false);
    const [active, setActive] = useState(false);

    let propsMerged = {
        ...props,
        ...(hovered ? props.hovered : undefined),
        ...(active ? props.active : undefined),
    };
    return (
        <Panel
            {...propsMerged}
            onHover={() => setHovered(true)}
            onUnhover={() => setHovered(false)}
            onDown={() => setActive(true)}
            onUp={() => setActive(false)}
            ref={ref}
        >
            {props.children}
        </Panel>
    );
});

Button.displayName = 'Button';
