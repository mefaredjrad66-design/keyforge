/**
 * Next's own types only declare `*.module.css`, so a plain side-effect import like
 * `import './globals.css'` has no type declaration and some TypeScript versions flag it
 * with TS2307 ("Cannot find module ... or its corresponding type declarations") in the
 * editor. Webpack resolves it fine, so the build was never affected — this declaration
 * just removes the false red underline.
 */
declare module '*.css';
