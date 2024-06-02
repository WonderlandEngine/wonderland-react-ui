import {Object3D} from '@wonderlandengine/api';
import {
    MeshProps,
    RoundedRectangleProps,
    TextProps,
    YogaNodeProps,
} from '../js/renderer.jsx';

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            container: PropsWithChildren<YogaNodeProps>;
            mesh: PropsWithChildren<MeshProps>;

            roundedRectangle: PropsWithChildren<RoundedRectangleProps>;

            /* 'text' is SVG text, so we need a different name*/
            text3d: TextProps & React.RefAttributes<Object3D>;
        }
    }
}
