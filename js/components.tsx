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
    Color,
} from './renderer.js';

import {parseColor} from './utils.js';

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
declare global {
    namespace JSX {
        interface IntrinsicElements {
            container: React.PropsWithChildren<YogaNodeProps> &
                React.RefAttributes<Object3D>;
        }
    }
}

const tempColor = new Float32Array(4);
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

/**
 * A React component that renders a rounded rectangle panel with customizable appearance.
 * Supports background color, border styling, and rounded corners.
 *
 * @component
 * @example
 * ```tsx
 * <Panel
 *   backgroundColor="#f0f0f0"
 *   borderColor="#333333"
 *   borderSize={2}
 *   rounding={10}
 *   padding={20}
 * >
 *   <Text>Panel Content</Text>
 * </Panel>
 * ```
 *
 * @param {PanelProps} props - The panel properties
 * @param {Material | null} [props.material] - Custom material for the panel. If not provided, uses cloned panel material from context
 * @param {Material | null} [props.borderMaterial] - Custom material for the border. If not provided, uses cloned panel material from context
 * @param {number} [props.rounding] - Corner rounding radius
 * @param {number} [props.resolution] - Resolution of the rounded corners
 * @param {Color} [props.backgroundColor='fff'] - Background color of the panel
 * @param {Color} [props.borderColor='fff'] - Border color of the panel
 * @param {number} [props.borderSize] - Width of the border
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} A rounded rectangle panel element
 */
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

        return React.createElement(
            'roundedRectangle',
            {
                ...props,
                material: props.material ?? mat,
                borderMaterial: props.borderMaterial ?? bmat,
                ref: ref,
            },
            props.children
        );
    }
);
Panel.displayName = 'Panel';

/**
 * A 9-slice panel component that renders a textured panel with customizable borders.
 * Uses 9-slice scaling technique to maintain border proportions while scaling the content area.
 *
 * @component
 * @example
 * ```tsx
 * <Panel9Slice
 *   texture={myTexture}
 *   borderSize={10}
 *   borderTextureSize={0.3}
 * >
 *   <Content />
 * </Panel9Slice>
 * ```
 *
 * @param {PanelProps & {texture?: Texture | null; borderSize?: number; borderTextureSize?: number}} props - The component props
 * @param {Texture | null} [props.texture] - Optional texture to apply to the panel. If provided, will override the default material texture
 * @param {number} [props.borderSize] - The size of the border in world units
 * @param {number} [props.borderTextureSize] - The size of the border in the texture, between 0.0 - 1.0 (default is 0.5, meaning half the texture size)
 * @param {Material | null} [props.material] - Optional custom material. If not provided, uses the cloned panel material from context
 * @param {React.ReactNode} props.children - Child elements to render inside the panel
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying Object3D
 * @returns {React.ReactElement} A 9-slice panel element with the specified texture and border configuration
 */
export const Panel9Slice = forwardRef<
    Object3D,
    React.PropsWithChildren<
        PanelProps & {
            texture?: Texture | null;
            borderSize?: number;
            borderTextureSize?: number;
        }
    >
>((props, ref) => {
    const context = useContext(MaterialContext);
    const mat = useMemo(() => context.panelMaterialTextured?.clone(), []);
    if (mat && props.texture) (mat as unknown as FlatMaterial).flatTexture = props.texture;
    return React.createElement(
        'nineSlice',
        {...props, material: props.material ?? mat, ref: ref},
        props.children
    );
});
Panel9Slice.displayName = 'Panel9Slice';

/**
 * An Image component that renders a textured panel with an image source.
 * Supports both URL strings and Texture objects as image sources.
 *
 * @component
 * @example
 * ```tsx
 * // Using a URL
 * <Image src="/path/to/image.png" width={100} height={100} />
 *
 * // Using a Texture object
 * <Image src={myTexture} width={100} height={100} />
 * ```
 *
 * @param {Object} props - The component props
 * @param {string | Texture} props.src - The image source, either a URL string or a Texture object
 * @param {Material | null} [props.material] - Optional custom material. If not provided, uses cloned textured panel material from context
 * @param {React.ReactNode} props.children - Child elements to render on top of the image
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} An image panel element
 */
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

/**
 * A simple mesh plane component for rendering flat surfaces in 3D space.
 * Useful for creating basic geometric elements or custom rendered content.
 *
 * @component
 * @example
 * ```tsx
 * <Plane
 *   material={myMaterial}
 *   width={100}
 *   height={100}
 * />
 * ```
 *
 * @param {MeshProps} props - The mesh properties
 * @param {Material} [props.material] - Material to apply to the mesh
 * @param {React.ReactNode} props.children - Child elements
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} A mesh plane element
 */
export const Plane = forwardRef<Object3D, React.PropsWithChildren<MeshProps>>(
    (props, ref) => {
        return React.createElement('mesh', {...props, ref: ref}, props.children);
    }
);
Plane.displayName = 'Plane';

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

/**
 * A 3D text component that renders text in 3D space with customizable styling.
 * Supports color customization and inherits text properties from theme context.
 *
 * @component
 * @example
 * ```tsx
 * <Text
 *   color="#ff0000"
 *   fontSize={24}
 *   fontWeight="bold"
 * >
 *   Hello World
 * </Text>
 * ```
 *
 * @param {TextProps & {color?: Color}} props - The text properties
 * @param {Color} [props.color] - Text color. Falls back to theme color or material color
 * @param {Material} [props.material] - Custom material for the text. If not provided, uses cloned text material from context
 * @param {string} [props.text] - Alternative way to provide text content (children takes precedence)
 * @param {React.ReactNode} props.children - Text content to display (converted to string)
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} A 3D text element
 */
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
    return React.createElement('text3d', {
        ...props,
        material: mat,
        text: props.children?.toString() ?? props.text,
        ref: ref,
    });
});
Text.displayName = 'Text';

/**
 * An interactive button component with hover and active states.
 * Supports different styling for normal, hovered, and active states.
 *
 * @component
 * @example
 * ```tsx
 * <Button
 *   backgroundColor="#007bff"
 *   borderSize={2}
 *   borderColor="#0056b3"
 *   hovered={{
 *     backgroundColor="#0056b3",
 *     borderColor="#004085"
 *   }}
 *   active={{
 *     backgroundColor="#004085",
 *     borderColor="#002752"
 *   }}
 *   padding={10}
 *   onClick={() => console.log('Clicked!')}
 * >
 *   Click Me
 * </Button>
 * ```
 *
 * @param {Object} props - The button properties
 * @param {Material} [props.material] - Material for normal state
 * @param {Color} [props.backgroundColor] - Background color for normal state
 * @param {number} [props.rounding] - Corner rounding radius
 * @param {number} [props.resolution] - Resolution of rounded corners
 * @param {number} [props.borderSize] - Border width for normal state
 * @param {Color} [props.borderColor] - Border color for normal state
 * @param {Object} props.hovered - Styling for hovered state
 * @param {Material} [props.hovered.material] - Material for hovered state
 * @param {Color} [props.hovered.backgroundColor] - Background color for hovered state
 * @param {number} [props.hovered.borderSize] - Border width for hovered state
 * @param {Color} [props.hovered.borderColor] - Border color for hovered state
 * @param {Object} props.active - Styling for active (pressed) state
 * @param {Material} [props.active.material] - Material for active state
 * @param {Color} [props.active.backgroundColor] - Background color for active state
 * @param {number} [props.active.borderSize] - Border width for active state
 * @param {Color} [props.active.borderColor] - Border color for active state
 * @param {React.ReactNode} props.children - Button content
 * @param {React.Ref<Object3D>} ref - Forward ref to access the underlying 3D object
 * @returns {React.ReactElement} An interactive button element
 */
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
