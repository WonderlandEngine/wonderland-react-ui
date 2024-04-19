import { Material, WonderlandEngine } from "@wonderlandengine/api";
import { property } from "@wonderlandengine/api/decorators.js";
import { useEffect, useState } from "react";

import {
  Align,
  Display,
  Justify,
  ReactUiBase,
  YogaNodeProps,
} from "./renderer.js";

const Panel = (
  props: {
    engine: WonderlandEngine;
    material: Material;
  } & YogaNodeProps &
    React.PropsWithChildren
) => {
  return <rounded-rectangle {...props}>{props.children}</rounded-rectangle>;
};

const App = (props: { comp: ReactUi }) => {
  const [textVisible, setTextVisible] = useState(true);
  useEffect(() => {
    const i = setInterval(() => {
      setTextVisible(!textVisible);
    }, 2000);

    return () => clearInterval(i);
  }, [textVisible]);
  return (
    <Panel
      material={props.comp.panelMaterial}
      engine={props.comp.engine}
      marginRight={0}
      marginLeft={100}
      rounding={100}
      resolution={8}
      display={Display.Flex}
    >
      <column padding={"8%"}>
        <row>
          <text text={textVisible ? "Top left" : "Pot left"} />
          <text text="Top right" />
        </row>
        <row>
          <Panel
            material={props.comp.panelMaterialSecondary}
            flexGrow={1}
            padding={10}
          >
            <row>
              {textVisible && <text text="Bot left" fontSize={0.75}></text>}
            </row>
          </Panel>
          <text text="Bot right" />
        </row>
      </column>
    </Panel>
  );
};

/**
 * react-ui
 */
export class ReactUi extends ReactUiBase {
  static TypeName = "react-ui";
  static InheritProperties = true;

  @property.material({ required: true })
  panelMaterial!: Material;

  @property.material({ required: true })
  panelMaterialSecondary!: Material;

  render() {
    return <App comp={this} />;
  }
}
