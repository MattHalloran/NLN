import type React from "react";

declare global {
  namespace JSX {
    type Element = React.ReactElement;
    interface ElementClass extends React.Component {
      render(): React.ReactNode;
    }
    interface IntrinsicElements extends React.JSX.IntrinsicElements { }
  }
}

export {};

