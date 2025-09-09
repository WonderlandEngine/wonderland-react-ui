import {Object3D} from '@wonderlandengine/api';
import React, {forwardRef} from 'react';
import {FlexDirection} from 'yoga-layout';
import type {YogaNodeProps} from '../renderer-types.js';
import {Container} from './Container.js';

/**
 * A container component that arranges children in a vertical column layout.
 * Convenience wrapper around Container with flexDirection set to Column.
 *
 * @component
 * @example
 * ```tsx
 * <Column gap={10} padding={20}>
 *   <Text>First Item</Text>
 *   <Text>Second Item</Text>
 *   <Text>Third Item</Text>
 * </Column>
 * ```
 *
 * @param {YogaNodeProps} props - Yoga layout properties
 * @param {React.ReactNode} props.children - Child elements to arrange vertically
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} A container with column layout
 */

export const Column = forwardRef<Object3D, React.PropsWithChildren<YogaNodeProps>>(
    (props, ref) => {
        return (
            <Container flexDirection={FlexDirection.Column} {...props} ref={ref}>
                {props.children}
            </Container>
        );
    }
);

Column.displayName = 'Column';
