import {Texture} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';

import {Align, FlexDirection, Justify, ReactUiBase} from '@wonderlandengine/react-ui';
import {
    Column,
    Panel,
    Text,
    Button,
    Row,
    ProgressBar,
    MaterialContext,
    ThemeContext,
    Image,
    Panel9Slice,
} from '@wonderlandengine/react-ui/components';
import React, {useEffect, useState} from 'react';

const App = (props: {comp: ReactUi}) => {
    const comp = props.comp;

    const [list, setList] = useState(['Element 0', 'Element 1']);

    const addListElement = () => {
        const newList = list.slice();
        newList.push('Element ' + list.length.toString());
        setList(newList);
    };

    const removeListElement = (i: number) => {
        const newList = list.slice();
        newList.splice(i, 1);
        setList(newList);
    };

    const [text, setText] = useState(
        'This is a 9-slice. It is a texture that can be stretched and scaled without losing quality. It is used for UI elements like panels and buttons.'
    );

    const theme = {
        colors: {
            background: comp.panelSecondary,

            primary: comp.panelSecondary,
            primaryActive: comp.panelSecondaryActive,
            primaryHovered: comp.panelSecondaryHovered,

            borderPrimary: 0,
            borderPrimaryActive: 0,
            borderPrimaryHovered: 0xffffffff,
            text: comp.textColor,
        },
    };

    return (
        <MaterialContext.Provider value={props.comp}>
            <ThemeContext.Provider value={theme}>
                <Panel
                    material={props.comp.panelMaterial}
                    rounding={100}
                    resolution={10}
                    borderSize={2}
                    width={'80%'}
                >
                    <Column padding="8%" width="100%" rowGap={20} height="100%">
                        <ProgressBar
                            bgColor={props.comp.panelSecondaryHovered}
                            fgColor={props.comp.panelSecondary}
                            value={list.length / 10}
                            height={50}
                            rounding={10}
                            width="100%"
                        />
                        <Button
                            onClick={addListElement}
                            backgroundColor={props.comp.panelSecondary}
                            hovered={{
                                backgroundColor: props.comp.panelSecondaryHovered,
                                borderSize: 1,
                            }}
                            active={{
                                backgroundColor: props.comp.panelSecondaryActive,
                            }}
                            padding={20}
                        >
                            <Text
                                textEffect="shadow"
                                textEffectColor="#888888"
                                textEffectOffset={{x: 0.07, y: -0.07}}
                                fontSize={28}
                            >
                                Add Item
                            </Text>
                        </Button>
                        {list.map((label, i) => (
                            <Row
                                key={i}
                                width="100%"
                                height={40}
                                columnGap={20}
                                justifyContent={Justify.SpaceBetween}
                            >
                                <Text fontSize={20}>{label}</Text>
                                <Button
                                    width={100}
                                    height="100%"
                                    rounding={10}
                                    onClick={(e) => removeListElement(i)}
                                    backgroundColor={props.comp.panelSecondary}
                                    hovered={{
                                        backgroundColor: props.comp.panelSecondaryHovered,
                                    }}
                                    active={{
                                        backgroundColor: props.comp.panelSecondaryActive,
                                    }}
                                    justifyContent={Justify.Center}
                                >
                                    <Text textAlign="center" fontSize={16}>
                                        Remove
                                    </Text>
                                </Button>
                            </Row>
                        ))}
                        <Image
                            src="Orange-grumpy-cat-.jpg"
                            width="100%"
                            height={300}
                            borderSize={2}
                        />
                        <Panel9Slice
                            flexGrow={1}
                            texture={props.comp.nineSliceTexture}
                            borderSize={30}
                            padding={30}
                            borderTextureSize={0.4}
                            justifyContent={Justify.FlexStart}
                            flex={FlexDirection.Column}
                            gap={20}
                        >
                            <Text
                                color="#000"
                                textAlign="center"
                                fontSize={18}
                                textWrap="soft"
                            >
                                {text}
                            </Text>
                        </Panel9Slice>
                    </Column>
                </Panel>
            </ThemeContext.Provider>
        </MaterialContext.Provider>
    );
};

/**
 * react-ui
 */
export class ReactUi extends ReactUiBase {
    static TypeName = 'react-ui';
    static InheritProperties = true;

    @property.color(1, 1, 1, 1)
    textColor!: Float32Array;

    @property.color(1, 1, 1, 1)
    panelSecondary!: Float32Array;

    @property.color(1, 1, 1, 1)
    panelSecondaryHovered!: Float32Array;

    @property.color(1, 1, 1, 1)
    panelSecondaryActive!: Float32Array;

    @property.texture()
    nineSliceTexture!: Texture;

    render() {
        return <App comp={this} />;
    }
}
