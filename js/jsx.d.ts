import * as React from 'react';
import {Object3D} from '@wonderlandengine/api';
import {
    MeshProps,
    NineSliceProps,
    RoundedRectangleProps,
    TextProps,
    YogaNodeProps,
} from './renderer.ts';

declare namespace JSX {
    //type PropsWithChildren<P> = P & {children?: React.ReactNode | undefined};
    interface IntrinsicElements {
        'container': React.PropsWithChildren<YogaNodeProps> & React.RefAttributes<Object3D>;
        'mesh': React.PropsWithChildren<MeshProps> & React.RefAttributes<Object3D>;

        'roundedRectangle': React.PropsWithChildren<RoundedRectangleProps> &
            React.RefAttributes<Object3D>;
        'nineSlice': React.PropsWithChildren<NineSliceProps> &
            React.RefAttributes<Object3D>;

        /* 'text' is SVG text, so we need a different name*/
        'text3d': TextProps & React.RefAttributes<Object3D>;
    }
}
