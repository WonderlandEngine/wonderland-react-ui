import * as React from 'react';
import {Object3D} from '@wonderlandengine/api';
import {
    MeshProps,
    NineSliceProps,
    RoundedRectangleProps,
    TextProps,
    YogaNodeProps,
} from '../js/renderer.jsx';

declare global {
    namespace JSX {
        type PropsWithChildren<P> = P & {children?: React.ReactNode | undefined};
        interface IntrinsicElements {
            container: React.PropsWithChildren<YogaNodeProps>;
            mesh: PropsWithChildren<MeshProps>;

            roundedRectangle: PropsWithChildren<RoundedRectangleProps>;
            nineSlice: PropsWithChildren<NineSliceProps>;

            /* 'text' is SVG text, so we need a different name*/
            text3d: TextProps & React.RefAttributes<Object3D>;
        }
    }
}
