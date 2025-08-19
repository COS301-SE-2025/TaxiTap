// declarations.d.ts or global.d.ts

declare module '*.ttf' {
  const content: string;
  export default content;
}

declare module '*.otf' {
  const content: string;
  export default content;
}