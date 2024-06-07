import {Material, Object3D, Texture} from '@wonderlandengine/api';
import React, {
    createContext,
    forwardRef,
    PropsWithChildren,
    useContext,
    useMemo,
    useState,
} from 'react';

import {
    YogaNodeProps,
    FlexDirection,
    TextProps,
    Align,
    MeshProps,
    PositionType,
} from './renderer.js';

interface FlatMaterial {
    setTexture(t: Texture): void;
    setColor(c: Float32Array): void;
}

export type Color = string | Float32Array | number;

const tempColor = new Float32Array(4);
function hexToFloat32Array(hex: string, out?: Float32Array): Float32Array {
    // Check if the first character is '#' and remove it if present
    if (hex[0] === '#') {
        hex = hex.slice(1);
    }

    let r: number,
        g: number,
        b: number,
        a: number = 1.0;

    if (hex.length === 3) {
        // #fff format
        r = parseInt(hex[0] + hex[0], 16) / 255;
        g = parseInt(hex[1] + hex[1], 16) / 255;
        b = parseInt(hex[2] + hex[2], 16) / 255;
    } else if (hex.length === 6) {
        // #ffffff format
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
    } else if (hex.length === 8) {
        // #ff00ff00 format
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
        a = parseInt(hex.slice(6, 8), 16) / 255;
    } else {
        throw new Error('Invalid hex color format');
    }

    out = out ?? new Float32Array([r, g, b, a]);
    out[0] = r;
    out[1] = g;
    out[2] = b;
    out[3] = a;
    return out;
}
function parseColor(hex: number | string | Float32Array, out?: Float32Array): Float32Array {
    if (typeof hex == 'string') return hexToFloat32Array(hex, out);
    if (typeof hex == 'number') {
        out = out ?? new Float32Array(4);
        out[0] = hex >> 24 && 0xff;
        out[1] = hex >> 16 && 0xff;
        out[2] = hex >> 8 && 0xff;
        out[3] = hex && 0xff;
        return out;
    }
    return hex;
}

export const Container = (props: React.PropsWithChildren<YogaNodeProps>) => {
    return <container {...props}>{props.children}</container>;
};

export const Panel = (
    props: React.PropsWithChildren<
        {
            material?: Material;
            borderMaterial?: Material;
            rounding?: number;
            resolution?: number;
            backgroundColor?: Color;
            borderColor?: Color;
        } & YogaNodeProps
    >
) => {
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
    return (
        <roundedRectangle
            {...props}
            material={props.material ?? mat}
            borderMaterial={props.borderMaterial ?? bmat}
        >
            {props.children}
        </roundedRectangle>
    );
};

export const Image = (
    props: React.PropsWithChildren<
        {
            src: string;
            material: Material;
            rounding?: number;
            resolution?: number;
        } & YogaNodeProps
    >
) => {
    const texture = useMemo(() => props.material.engine.textures.load(props.src), []);
    texture.then((t) => (props.material as unknown as FlatMaterial).setTexture(t));

    return <roundedRectangle {...props}>{props.children}</roundedRectangle>;
};

export const Plane = (props: React.PropsWithChildren<MeshProps>) => {
    return <mesh {...props}>{props.children}</mesh>;
};

export const Column = (props: React.PropsWithChildren<YogaNodeProps>) => {
    return (
        <Container flexDirection={FlexDirection.Column} {...props}>
            {props.children}
        </Container>
    );
};

export const MaterialContext = createContext({
    panelMaterial: null,
    textMaterial: null,
} as {
    panelMaterial: Material | null;
    textMaterial: Material | null;
});

export const Row = (props: React.PropsWithChildren<YogaNodeProps>) => {
    return (
        <Container flexDirection={FlexDirection.Row} {...props}>
            {props.children}
        </Container>
    );
};

export const Text = forwardRef<
    Object3D,
    PropsWithChildren<
        TextProps & {
            color?: Color;
        }
    >
>((props, ref) => {
    const context = useContext(MaterialContext);
    const mat = props.material ?? useMemo(() => context.textMaterial?.clone(), []);
    if (mat) {
        (mat as unknown as FlatMaterial).setColor(
            parseColor(props.color ?? 'fff', tempColor)
        );
    }
    return (
        <text3d
            {...props}
            text={props.children?.toString() ?? props.text}
            material={mat}
            ref={ref}
        />
    );
});

export const Button = (
    props: PropsWithChildren<
        {
            material?: Material;
            backgroundColor?: Color;

            rounding?: number;
            resolution?: number;

            hovered: {
                material?: Material;
                backgroundColor?: Color;
            };

            active: {
                material?: Material;
                backgroundColor?: Color;
            };
        } & YogaNodeProps
    >
) => {
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
        >
            {props.children}
        </Panel>
    );
};

export const ProgressBar = (
    props: React.PropsWithChildren<
        YogaNodeProps & {
            /* Number between 0-1 */
            value: number;
            rounding?: number;

            fgMaterial: Material;
            bgMaterial: Material;

            fgColor: Color;
            bgColor: Color;
        }
    >
) => {
    const rounding = props.rounding ?? 30;
    return (
        <Panel
            material={props.bgMaterial}
            backgroundColor={props.bgColor}
            {...props}
            flexDirection={FlexDirection.Row}
            padding={6}
            paddingLeft={8}
            paddingRight={8}
            resolution={6}
            rounding={rounding * 1.5}
        >
            <Container
                alignItems={Align.FlexStart}
                position={PositionType.Absolute}
                width="100%"
                height="100%"
                left={12}
            >
                {props.children}
            </Container>
            {props.value > 0.05 && (
                <Panel
                    width={`${100 * Math.min(1, props.value)}%`}
                    height="100%"
                    material={props.fgMaterial}
                    backgroundColor={props.fgColor}
                    alignItems={Align.Center}
                    rounding={rounding}
                ></Panel>
            )}
        </Panel>
    );
};
