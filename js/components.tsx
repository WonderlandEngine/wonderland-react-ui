import { Material } from "@wonderlandengine/api";
import React, { PropsWithChildren, useState } from "react";
import { Panel, YogaNodeProps } from "./renderer";

export const Button = (
  props: PropsWithChildren<
    {
      material: Material;
      materialHovered?: Material;
      materialActive?: Material;
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
