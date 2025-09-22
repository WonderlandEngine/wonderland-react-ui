import {Object3D} from '@wonderlandengine/api';
import React, {forwardRef} from 'react';
import type {YogaNodeProps} from '../renderer-types.js';

/**
 * A React component that creates a container element with Yoga layout properties.
 * This component is designed to work with a 3D object system and supports flexible box layout.
 *
 * @component
 * @example
 * ```tsx
 * <Container
 *   flexDirection="row"
 *   justifyContent="center"
 *   alignItems="center"
 * >
 *   <ChildComponent />
 * </Container>
 * ```
 *
 * @param {YogaNodeProps} props - The Yoga layout properties to apply to the container
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} A container element with the specified layout properties
 */
export const Container = forwardRef<Object3D, React.PropsWithChildren<YogaNodeProps>>(
    (props, ref) => {
        return React.createElement('container', {...props, ref: ref}, props.children);
    }
);
Container.displayName = 'Container';
