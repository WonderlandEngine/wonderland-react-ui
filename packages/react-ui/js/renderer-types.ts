import type {
    Align,
    Display,
    FlexDirection,
    Justify,
    Overflow,
    PositionType,
    Wrap,
} from './renderer.js';
import type {
    Component,
    Material,
    Mesh,
    Object3D,
    TextComponent,
    Texture,
    Font,
    ViewComponent,
    WonderlandEngine,
} from '@wonderlandengine/api';
import type {ReactNode} from 'react';

export type ValueType = number | 'auto' | `${number}%`;
export type ValueTypeNoAuto = number | `${number}%`;
export type Color = string | Float32Array | number;
export type Vec2 = {x: number; y: number} | [number, number];

export interface YogaNodeProps {
    height?: ValueType;
    width?: ValueType;

    alignContent?: Align;
    alignItems?: Align;
    alignSelf?: Align;
    justifyContent?: Justify;

    aspectRatio?: number;
    display?: Display;

    flex?: number;
    flexDirection?: FlexDirection;
    flexGrow?: number;
    flexBasis?: ValueType;
    flexShrink?: number;
    flexWrap?: Wrap;

    isReferenceBaseline?: boolean;

    gap?: number;
    columnGap?: number;
    rowGap?: number;

    border?: number;
    borderTop?: number;
    borderBottom?: number;
    borderLeft?: number;
    borderRight?: number;

    margin?: ValueType;
    marginTop?: ValueType;
    marginBottom?: ValueType;
    marginLeft?: ValueType;
    marginRight?: ValueType;

    maxHeight?: ValueTypeNoAuto;
    maxWidth?: ValueTypeNoAuto;

    minHeight?: ValueTypeNoAuto;
    minWidth?: ValueTypeNoAuto;

    overflow?: Overflow;

    padding?: ValueTypeNoAuto;
    paddingTop?: ValueTypeNoAuto;
    paddingBottom?: ValueTypeNoAuto;
    paddingLeft?: ValueTypeNoAuto;
    paddingRight?: ValueTypeNoAuto;

    /* Relative z value to add to the usual increment, to allow widgets to render on top/behind other widgets */
    z?: number;

    top?: ValueTypeNoAuto;
    left?: ValueTypeNoAuto;
    right?: ValueTypeNoAuto;
    bottom?: ValueTypeNoAuto;
    position?: PositionType;

    onClick?: (e: {x: number; y: number; e: MouseEvent}) => void;
    onUp?: (e: {x: number; y: number; e: PointerEvent}) => void;
    onDown?: (e: {x: number; y: number; e: PointerEvent}) => void;
    onMove?: (e: {x: number; y: number; e: PointerEvent}) => void;
    onHover?: (e: {x: number; y: number; e: PointerEvent}) => void;
    onUnhover?: (e: {x: number; y: number; e: PointerEvent}) => void;
}

export interface TextProps extends YogaNodeProps {
    text?: string;
    fontSize?: number;
    material?: Material | null;
    textAlign?: 'left' | 'center' | 'right';
    textWrap?: 'none' | 'soft' | 'hard' | 'clip';
    /**
     * Text effect to apply.
     * For `outline`, you need to have the Outline option checked in Wonderland Editor.
     * For `shadow`, no special setup is required in Wonderland Editor.
     */
    textEffect?: 'none' | 'outline' | 'shadow';
    /** Color of the text effect */
    textEffectColor?: Color | null;
    /** Offset of the text effect */
    textEffectOffset?: Vec2 | null;
}

export interface RoundedRectangleProps extends YogaNodeProps {
    /* Material for the rounded rectangle mesh */
    material?: Material | null;
    /* Material for the rounded rectangle border */
    borderMaterial?: Material | null;
    /* Rounding in pixel-like units */
    rounding?: number;
    /* Rounding resolution */
    resolution?: number;
    roundTopLeft?: boolean;
    roundTopRight?: boolean;
    roundBottomLeft?: boolean;
    roundBottomRight?: boolean;
}

export interface MeshProps extends YogaNodeProps {
    material?: Material | null;
    mesh?: Mesh | null;
}

export interface NineSliceProps extends YogaNodeProps {
    material?: Material | null;
    texture?: Texture | null;
    borderSize?: number;
    borderTextureSize?: number;
}

export type ReactComp = Component & {
    needsUpdate: boolean;
    textMaterial: Material;
    scaling: number[];
    renderCallback: () => void;
    callbacks: Record<string, any>;

    setContext(c: any): void;
    updateLayout(): void;
    render(): ReactNode;
};
