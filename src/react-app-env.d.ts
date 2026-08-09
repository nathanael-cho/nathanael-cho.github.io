/// <reference types="react-scripts" />

// Create React App resolves plain CSS side-effect imports through webpack, but
// react-scripts' bundled types only declare `*.module.css`. Declaring plain
// stylesheets here lets `import '@mantine/core/styles.css'` and `import
// './App.css'` type-check under `moduleResolution: "Bundler"`.
declare module '*.css';
