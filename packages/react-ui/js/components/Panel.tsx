import {Material, Object3D} from '@wonderlandengine/api';
import React, {forwardRef, useContext, useMemo} from 'react';
import {parseColor} from '../utils.js';
import {MaterialContext, FlatMaterial} from './component-types.js';
import {YogaNodeProps, Color} from '../renderer-types.js';

const tempColor = new Float32Array(4);

export interface PanelProps extends YogaNodeProps {
    material?: Material | null;
    borderMaterial?: Material | null;
    rounding?: number;
    resolution?: number;
    backgroundColor?: Color;
    borderColor?: Color;
    borderSize?: number;
}

/**
 * A React component that renders a rounded rectangle panel with customizable appearance.
 * Supports background color, border styling, and rounded corners.
 *
 * @component
 * @example
 * ```tsx
 * <Panel
 *   backgroundColor="#f0f0f0"
 *   borderColor="#333333"
 *   borderSize={2}
 *   rounding={10}
 *   padding={20}
 * >
 *   <Text>Panel Content</Text>
 * </Panel>
 * ```
 *
 * @param {PanelProps} props - The panel properties
 * @param {Material | null} [props.material] - Custom material for the panel. If not provided, uses cloned panel material from context
 * @param {Material | null} [props.borderMaterial] - Custom material for the border. If not provided, uses cloned panel material from context
 * @param {number} [props.rounding] - Corner rounding radius
 * @param {number} [props.resolution] - Resolution of the rounded corners
 * @param {Color} [props.backgroundColor='fff'] - Background color of the panel
 * @param {Color} [props.borderColor='fff'] - Border color of the panel
 * @param {number} [props.borderSize] - Width of the border
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} A rounded rectangle panel element
 */

export const Panel = forwardRef<Object3D, React.PropsWithChildren<PanelProps>>(
    (props, ref) => {
        const context = useContext(MaterialContext);
        const mat = useMemo(() => context.panelMaterial?.clone(), []);
        mat &&
            (mat as unknown as FlatMaterial).setColor(
                parseColor(props.backgroundColor ?? 'fff', tempColor)
            );
        const bmat = useMemo(() => context.panelMaterial?.clone(), []);
        bmat &&
            (bmat as unknown as FlatMaterial).setColor(
                parseColor(props.borderColor ?? 'fff', tempColor)
            );

        return React.createElement(
            'roundedRectangle',
            {
                ...props,
                material: props.material ?? mat,
                borderMaterial: props.borderMaterial ?? bmat,
                ref: ref,
            },
            props.children
        );
    }
);

Panel.displayName = 'Panel';
