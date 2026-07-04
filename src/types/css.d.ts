// Ambient declaration so TypeScript accepts global/side-effect CSS imports
// (e.g. `import './globals.css'` and the @fontsource-variable stylesheets).
// Next.js compiles these via its own pipeline; TS just needs the module to exist.
declare module '*.css';
