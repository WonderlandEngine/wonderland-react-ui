import {Material} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';

import {Align, Justify, ReactUiBase} from '@wonderlandengine/react-ui';
import {
    Column,
    Panel,
    Text,
    Button,
    Row,
    ProgressBar,
    MaterialContext,
} from '@wonderlandengine/react-ui/components';
import React, {useState} from 'react';

const App = (props: {comp: ReactUi}) => {
    const [list, setList] = useState(['Element 0', 'Element 1']);

    const addListElement = () => {
        const newList = list.slice();
        newList.push('Element ' + list.length.toString());
        setList(newList);
        console.log('Add');
    };

    const removeListElement = (i: number) => {
        const newList = list.slice();
        newList.splice(i, 1);
        setList(newList);
        console.log('Remove');
    };

    return (
        <MaterialContext.Provider value={props.comp}>
            <Panel
                material={props.comp.panelMaterial}
                rounding={100}
                resolution={10}
                borderSize={2}
                width={'80%'}
            >
                <Column padding="8%" width="100%" rowGap={20}>
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
                        }}
                        active={{
                            backgroundColor: props.comp.panelSecondaryActive,
                        }}
                        padding={20}
                    >
                        <Text fontSize={24}>Add Item</Text>
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
                                alignItems={Align.Center}
                            >
                                <Text fontSize={16}>Remove</Text>
                            </Button>
                        </Row>
                    ))}
                </Column>
            </Panel>
        </MaterialContext.Provider>
    );
};

/**
 * react-ui
 */
export class ReactUi extends ReactUiBase {
    static TypeName = 'react-ui';
    static InheritProperties = true;

    @property.material({required: true})
    panelMaterial!: Material;

    @property.color({required: true})
    textColor!: Float32Array;

    @property.color({required: true})
    panelSecondary!: Float32Array;

    @property.color({required: true})
    panelSecondaryHovered!: Float32Array;

    @property.color({required: true})
    panelSecondaryActive!: Float32Array;

    render() {
        return <App comp={this} />;
    }
}
