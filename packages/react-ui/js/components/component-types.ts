import {Font, Material, Object3D, Texture} from '@wonderlandengine/api';
import React, {createContext} from 'react';

import type {YogaNodeProps, Color} from '../renderer-types.js';

export interface FlatMaterial {
    flatTexture: Texture;
    setColor(c: Float32Array): void;
    color: Color;
}

export interface TextMaterial extends FlatMaterial {
    setEffectColor(value: Float32Array): void;
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

declare global {
    namespace JSX {
        interface IntrinsicElements {
            container: React.PropsWithChildren<YogaNodeProps> &
                React.RefAttributes<Object3D>;
        }
    }
}
