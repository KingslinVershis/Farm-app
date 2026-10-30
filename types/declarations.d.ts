// ─────────────────────────────────────────────────────────────
// CSS Modules
// ─────────────────────────────────────────────────────────────
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// ─────────────────────────────────────────────────────────────
// Static Assets
// ─────────────────────────────────────────────────────────────
declare module '*.svg' {
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}
