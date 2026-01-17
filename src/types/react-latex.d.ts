declare module 'react-latex' {
  import { ComponentType, ReactNode } from 'react';

  interface LatexProps {
    children?: ReactNode;
    displayMode?: boolean;
  }

  const Latex: ComponentType<LatexProps>;
  export = Latex;
}
