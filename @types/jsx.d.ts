import { YogaNodeProps } from "./renderer.js";

declare namespace JSX {
  interface IntrinsicElements {
    "rounded-rectangle": YogaNodeProps & {
      /* Rounding in pixel-like units */
      rounding?: number;
      /* Rounding resolution */
      resolution?: number;
    };

    column: YogaNodeProps;
    row: YogaNodeProps;
    text: YogaNodeProps & {
      text: string;
    };
  }
}
