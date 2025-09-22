import {Object3D} from '@wonderlandengine/api';
import React, {forwardRef} from 'react';
import {FlexDirection} from '../renderer.js';
import type {YogaNodeProps} from '../renderer-types.js';
import {Container} from './Container.js';

/**
 * A container component that arranges children in a horizontal row layout.
 * Convenience wrapper around Container with flexDirection set to Row.
 *
 * @component
 * @example
 * ```tsx
 * <Row gap={10} padding={20} justifyContent="space-between">
 *   <Button>Left</Button>
 *   <Button>Center</Button>
 *   <Button>Right</Button>
 * </Row>
 * ```
 *
 * @param {YogaNodeProps} props - Yoga layout properties
 * @param {React.ReactNode} props.children - Child elements to arrange horizontally
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} A container with row layout
 */

export const Row = forwardRef<Object3D, React.PropsWithChildren<YogaNodeProps>>(
    (props, ref) => {
        return (
            <Container flexDirection={FlexDirection.Row} {...props} ref={ref}>
                {props.children}
            </Container>
        );
    }
);

Row.displayName = 'Row';
