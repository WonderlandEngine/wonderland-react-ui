import { Material, WonderlandEngine } from "@wonderlandengine/api";
import { property } from "@wonderlandengine/api/decorators.js";
import { useState } from "react";

import { Display, ReactUiBase, YogaNodeProps } from "./renderer.js";

const Panel = (
  props: {
    engine: WonderlandEngine;
    material: Material;
  } & YogaNodeProps &
    React.PropsWithChildren
) => {
  return <rounded-rectangle {...props}>{props.children}</rounded-rectangle>;
};

const HoverThing = (
  props: {
    engine: WonderlandEngine;
    material: Material;
    materialHovered: Material;
  } & YogaNodeProps &
    React.PropsWithChildren
) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Panel
      {...props}
      material={hovered ? props.material : props.materialHovered}
      onHover={() => setHovered(true)}
      onUnhover={() => setHovered(false)}
    >
      {props.children}
    </Panel>
  );
};
const App = (props: { comp: ReactUi }) => {
  return (
    <Panel
      material={props.comp.panelMaterial}
      engine={props.comp.engine}
      marginRight={0}
      rounding={100}
      resolution={8}
      display={Display.Flex}
    >
      <column padding={"8%"} width={"100%"} rowGap={20}>
        {["Element 1", "Element 2", "Element 3", "Element 4"].map((label) => (
          <HoverThing
            width={"100%"}
            material={props.comp.panelMaterialSecondary}
            materialHovered={props.comp.panelMaterialSecondaryHovered}
            padding={30}
            flexGrow={1}
          >
            <text width={"100%"} text={label} />
          </HoverThing>
        ))}
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

  @property.material({ required: true })
  panelMaterialSecondaryHovered!: Material;

  render() {
    return <App comp={this} />;
  }
}
