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

export const Container = forwardRef<Object3D, React.PropsWithChildren<YogaNodeProps>>(
    (props, ref) => {
        return (
            <container {...props} ref={ref}>
                {props.children}
            </container>
        );
    }
);
Container.displayName = 'Container';

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
        return (
            <roundedRectangle
                {...props}
                material={props.material ?? mat}
                borderMaterial={props.borderMaterial ?? bmat}
                ref={ref}
            >
                {props.children}
            </roundedRectangle>
        );
    }
);
Panel.displayName = 'Panel';

export const Panel9Slice = (
    props: React.PropsWithChildren<
        PanelProps & {
            texture?: Texture | null;
            borderSize?: number;
            borderTextureSize?: number;
        }
    >
) => {
    const context = useContext(MaterialContext);
    const mat = useMemo(() => context.panelMaterialTextured?.clone(), []);
    if (mat && props.texture) (mat as unknown as FlatMaterial).flatTexture = props.texture;
    return (
        <nineSlice {...props} material={props.material ?? mat}>
            {props.children}
        </nineSlice>
    );
};
Panel9Slice.displayName = 'Panel9Slice';

export const Image = forwardRef<
    Object3D,
    React.PropsWithChildren<{src: string | Texture} & PanelProps>
>((props, ref) => {
    const context = useContext(MaterialContext);
    const mat = props.material ?? useMemo(() => context.panelMaterialTextured?.clone(), []);
    const texture =
        typeof props.src === 'string'
            ? useMemo(() => mat!.engine.textures.load(props.src as string), [props.src])
            : Promise.resolve(props.src);
    texture.then((t) => ((mat as unknown as FlatMaterial).flatTexture = t));

    return (
        <Panel {...props} material={mat} ref={ref}>
            {props.children}
        </Panel>
    );
});
Image.displayName = 'Image';

export const Plane = forwardRef<Object3D, React.PropsWithChildren<MeshProps>>(
    (props, ref) => {
        return (
            <mesh {...props} ref={ref}>
                {props.children}
            </mesh>
        );
    }
);
Plane.displayName = 'Plane';

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
Text.displayName = 'Text';

export const Button = forwardRef<
    Object3D,
    PropsWithChildren<
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
>((props, ref) => {
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
            ref={ref}
        >
            {props.children}
        </Panel>
    );
});
Button.displayName = 'Button';

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
