/// <reference types="vite/client" />

declare module "*?raw" {
  const content: string;
  export default content;
}

declare module "@examples/*?raw" {
  const content: string;
  export default content;
}
