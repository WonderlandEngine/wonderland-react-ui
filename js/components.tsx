import {Material, Mesh, Object3D} from '@wonderlandengine/api';
import React, {forwardRef, PropsWithChildren, useState} from 'react';

import {
    YogaNodeProps,
    FlexDirection,
    TextProps,
    Align,
    MeshProps,
    PositionType,
} from './renderer.js';

export const Container = (props: React.PropsWithChildren<YogaNodeProps>) => {
    return <container {...props}>{props.children}</container>;
};

export const Panel = (
    props: React.PropsWithChildren<
        {
            material: Material;
            rounding?: number;
            resolution?: number;
        } & YogaNodeProps
    >
) => {
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

export const Row = (props: React.PropsWithChildren<YogaNodeProps>) => {
    return (
        <Container flexDirection={FlexDirection.Row} {...props}>
            {props.children}
        </Container>
    );
};

export const Text = forwardRef<Object3D, TextProps>((props, ref) => {
    return <text3d {...props} ref={ref} />;
});

export const Button = (
    props: PropsWithChildren<
        {
            material: Material;
            materialHovered?: Material;
            materialActive?: Material;
            rounding?: number;
            resolution?: number;
        } & YogaNodeProps
    >
) => {
    const [hovered, setHovered] = useState(false);
    const [active, setActive] = useState(false);

    let mat = props.material;
    const activeMat = props.materialActive ?? mat;
    const hoveredMat = props.materialHovered ?? mat;
    if (hovered) mat = hoveredMat;
    if (active) mat = activeMat;
    return (
        <Panel
            {...props}
            material={mat}
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
        }
    >
) => {
    const rounding = props.rounding ?? 30;
    return (
        <roundedRectangle
            material={props.bgMaterial}
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
            {props.value > 0.1 && (
                <roundedRectangle
                    width={`${100 * props.value}%`}
                    height="100%"
                    material={props.fgMaterial}
                    alignItems={Align.Center}
                    rounding={rounding}
                ></roundedRectangle>
            )}
        </roundedRectangle>
    );
};
