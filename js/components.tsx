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
import {Color, parseColor} from './utils.js';

interface FlatMaterial {
    flatTexture: Texture;
    setColor(c: Float32Array): void;
    color: Color;
}

export const MaterialContext = createContext(
    {} as {
        panelMaterial?: Material | null;
        panelMaterialTextured?: Material | null;
        textMaterial?: Material | null;
    }
);

export const ThemeContext = createContext(
    {} as {
        colors?: {
            background?: Color;

            primary?: Color;
            primaryActive?: Color;
            primaryHovered?: Color;
            borderPrimary?: Color;
            borderPrimaryActive?: Color;
            borderPrimaryHovered?: Color;
            text?: Color;
        };
    }
);

export interface PanelProps extends YogaNodeProps {
    material?: Material | null;
    borderMaterial?: Material | null;
    rounding?: number;
    resolution?: number;
    backgroundColor?: Color;
    borderColor?: Color;
    borderSize?: number;
}

const tempColor = new Float32Array(4);

export const Container = (props: React.PropsWithChildren<YogaNodeProps>) => {
    return <container {...props}>{props.children}</container>;
};

export const Panel = (props: React.PropsWithChildren<PanelProps>) => {
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
            src: string | Texture;
        } & PanelProps
    >
) => {
    const context = useContext(MaterialContext);
    const mat = props.material ?? useMemo(() => context.panelMaterialTextured?.clone(), []);
    const texture =
        typeof props.src === 'string'
            ? useMemo(() => mat!.engine.textures.load(props.src as string), [])
            : Promise.resolve(props.src);
    texture.then((t) => ((mat as unknown as FlatMaterial).flatTexture = t));

    return (
        <Panel {...props} material={mat}>
            {props.children}
        </Panel>
    );
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
    const theme = useContext(ThemeContext);
    const mat = props.material ?? useMemo(() => context.textMaterial?.clone(), []);
    if (mat) {
        (mat as unknown as FlatMaterial).setColor(
            parseColor(
                props.color ??
                    theme.colors?.text ??
                    ((props.material ?? context.textMaterial) as unknown as FlatMaterial)
                        .color,
                tempColor
            )
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

            fgMaterial?: Material;
            bgMaterial?: Material;

            fgColor?: Color;
            bgColor?: Color;
        }
    >
) => {
    const rounding = props.rounding ?? 30;
    const value = Math.min(1, props.value);
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
            {value > 0.05 && (
                <Panel
                    width={`${100 * value}%`}
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
