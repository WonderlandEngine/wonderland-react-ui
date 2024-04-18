import { Material, WonderlandEngine } from "@wonderlandengine/api";
import { property } from "@wonderlandengine/api/decorators.js";
import { useEffect, useState } from "react";

import { Align, Justify, ReactUiBase, YogaNodeProps } from "./renderer.js";

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
      width={"auto"}
      height={"50%"}
      margin={"10%"}
      marginRight={0}
    >
      <column width={"100%"} height={"100%"} padding={"10%"}>
        <row width={"100%"} flexGrow={1}>
          <text text={textVisible ? "Top left" : "Pot left"} flexGrow={1} />
          <text text="Top right" flexGrow={1} />
        </row>
        <row width={"100%"} flexGrow={1}>
          <Panel
            height={"auto"}
            material={props.comp.panelMaterialSecondary}
            flexGrow={1}
            padding={10}
          >
            <row width={"100%"}>
              {textVisible && <text text="Bot left"></text>}
            </row>
          </Panel>
          <text text="Bot right" flexGrow={1} />
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
