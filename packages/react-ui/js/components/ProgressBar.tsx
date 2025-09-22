import {Object3D, Material} from '@wonderlandengine/api';
import React, {forwardRef} from 'react';
import {FlexDirection, Align, PositionType} from '../renderer.js';
import type {YogaNodeProps, Color} from '../renderer-types.js';
import {Container} from './Container.js';
import {Panel} from './Panel.js';

/**
 * A progress bar component that displays a value between 0 and 1 as a filled bar.
 * Supports customizable foreground and background styling.
 *
 * @component
 * @example
 * ```tsx
 * <ProgressBar
 *   value={0.75}
 *   bgColor="#e0e0e0"
 *   fgColor="#4caf50"
 *   height={20}
 *   width={200}
 * >
 *   <Text>75%</Text>
 * </ProgressBar>
 * ```
 *
 * @param {YogaNodeProps & Object} props - The progress bar properties
 * @param {number} props.value - Progress value between 0 and 1 (will be clamped if outside range)
 * @param {number} [props.rounding=30] - Corner rounding radius for the progress bar
 * @param {Material} [props.fgMaterial] - Material for the foreground (filled) bar
 * @param {Material} [props.bgMaterial] - Material for the background bar
 * @param {Color} [props.fgColor] - Color for the foreground (filled) bar
 * @param {Color} [props.bgColor] - Color for the background bar
 * @param {number} [props.barLeftMargin=12] - Left margin for the content overlay
 * @param {React.ReactNode} props.children - Content to display over the progress bar (e.g., percentage text)
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} A progress bar element
 */

export const ProgressBar = forwardRef<
    Object3D,
    React.PropsWithChildren<
        YogaNodeProps & {
            /* Number between 0-1 */
            value: number;
            rounding?: number;

            fgMaterial?: Material;
            bgMaterial?: Material;

            fgColor?: Color;
            bgColor?: Color;

            barLeftMargin?: number;
        }
    >
>((props, ref) => {
    const rounding = props.rounding ?? 30;
    const value = Math.max(Math.min(1, props.value), 0); // clamp between 0 and 1
    return (
        <Panel
            material={props.bgMaterial}
            backgroundColor={props.bgColor}
            {...props}
            flexDirection={FlexDirection.Row}
            padding={props.padding ?? 6}
            paddingLeft={props.paddingLeft ?? 8}
            paddingRight={props.paddingRight ?? 8}
            resolution={6}
            rounding={rounding * 1.5}
            ref={ref}
        >
            <Container
                alignItems={Align.FlexStart}
                position={PositionType.Absolute}
                width="100%"
                height="100%"
                left={props.barLeftMargin ?? 12}
            >
                {props.children}
            </Container>

            <Panel
                width={`${100 * value}%`}
                minWidth={rounding * 2}
                height="100%"
                material={props.fgMaterial}
                backgroundColor={props.fgColor}
                alignItems={Align.Center}
                rounding={rounding}
            ></Panel>
        </Panel>
    );
});
ProgressBar.displayName = 'ProgressBar';
