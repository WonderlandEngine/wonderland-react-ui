import { YogaNodeProps } from "../js/renderer.jsx";

declare namespace JSX {
  interface IntrinsicElements {
    roundedRectangle: YogaNodeProps & {
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
