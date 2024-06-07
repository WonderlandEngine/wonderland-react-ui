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
        <Panel
            material={props.comp.panelMaterial}
            rounding={100}
            resolution={8}
            borderMaterial={props.comp.borderMaterial}
            width={'80%'}
        >
            <Column padding="8%" width="100%" rowGap={20}>
                <ProgressBar
                    bgMaterial={props.comp.panelMaterialSecondaryHovered}
                    fgMaterial={props.comp.panelMaterialSecondary}
                    value={list.length / 10}
                    height={50}
                    rounding={10}
                    width="100%"
                />
                <Button
                    onClick={addListElement}
                    material={props.comp.panelMaterialSecondary}
                    materialHovered={props.comp.panelMaterialSecondaryHovered}
                    padding={20}
                >
                    <Text text={'Add Item'} fontSize={24} />
                </Button>
                {list.map((label, i) => (
                    <Row
                        key={i}
                        width="100%"
                        height={40}
                        columnGap={20}
                        justifyContent={Justify.SpaceBetween}
                    >
                        <Text text={label} fontSize={20} />
                        <Button
                            width={100}
                            height="100%"
                            rounding={10}
                            onClick={(e) => removeListElement(i)}
                            material={props.comp.panelMaterialSecondary}
                            materialHovered={props.comp.panelMaterialSecondaryHovered}
                            justifyContent={Justify.Center}
                            alignItems={Align.Center}
                        >
                            <Text text={'Remove'} fontSize={16} />
                        </Button>
                    </Row>
                ))}
            </Column>
        </Panel>
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

    @property.material({required: true})
    borderMaterial!: Material;

    @property.material({required: true})
    panelMaterialSecondary!: Material;

    @property.material({required: true})
    panelMaterialSecondaryHovered!: Material;

    render() {
        return <App comp={this} />;
    }
}
