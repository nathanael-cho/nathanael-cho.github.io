# AI Agent Guidelines

## Project Overview

A personal blog built with React 18 and Create React App, written in TypeScript.
It uses Mantine v7 for UI, renders posts from a hash-based route table, and
deploys to GitHub Pages at https://nathanael-cho.github.io.

### Key Technologies
- React 18 + TypeScript (Create React App / `react-scripts`)
- Mantine UI v7 (`@mantine/core`, `@mantine/hooks`) and `@tabler/icons-react`
- `react-latex` for mathematics, `react-syntax-highlighter` for code blocks
- `wabt` to assemble hand-written WebAssembly for one of the simulations

### Project Structure
- `src/App.tsx` — the shell: header, navbar, routing, and the `posts` table
- `src/index.tsx` — Mantine theme (the `brand-light` / `brand-dark` palettes)
- `src/pages/` — `Home`, `AboutMe`
- `src/pages/posts/` — one file per post, plus `helper.tsx`
- `src/components/` — anything substantial a post embeds, e.g. simulations
- `public/` — static assets served as-is: `python_files/`, `wasm_files/`, images
- `build/` — generated, git-ignored; never edit by hand

There is no React Router. `App.tsx` reads the URL hash with Mantine's `useHash`
and picks a component out of the `posts` array, so every post is `#post-N`.

## Commands

```bash
npm start          # dev server on :3000 (runs build:wasm first)
npm run build      # production build into build/ (runs build:wasm first)
npm run build:wasm # assemble public/wasm_files/water.wat -> water.wasm
npm run deploy     # build, then publish build/ to GitHub Pages
npx tsc --noEmit -p tsconfig.json          # typecheck without emitting
CI=true npx react-scripts test --watchAll=false   # run tests once
```

`react-scripts test` defaults to watch mode; always pass `CI=true` and
`--watchAll=false` in a non-interactive session or it will hang.

## Rules

1. **Python environment**: the virtualenv lives in `.venv` (note the leading
   dot) and is managed with `uv` against `pyproject.toml` / `uv.lock`. Use
   `uv run <command>`, or `source .venv/bin/activate` first. Add dependencies
   with `uv add`, not bare `pip install`.

2. **JavaScript dependencies**: `npm install`. Keep `package-lock.json` in the
   commit.

3. **Do not edit `build/`** — it is generated output and is git-ignored.

## Adding a blog post

1. Create `src/pages/posts/NthPost.tsx`. It takes `PostProps` (`{ date }`) and
   returns `postFramework(title, content, date)` from `./helper`, which supplies
   the `<Container>`, the `<Title>`, and the "Published on ..." line. Do not
   re-create those.
2. Register it in the `posts` array in `src/App.tsx` with an `id` of
   `post-<n>`, a title, a `Date` (months are zero-indexed — keep the trailing
   comment spelling out the real date), a Tabler icon, and the component. Order
   in the array drives the navbar numbering and the previous/next links.
3. Long-form posts compose Mantine `Text` / `Title` / `Anchor`, wrap maths in
   `<Latex>`, and load code samples by `fetch`ing a file from
   `public/python_files/` rather than inlining the source.
4. Post-length simulations belong in `src/components/`, with the post file left
   as a thin wrapper — see `SeventhPost.tsx` and `EighthPost.tsx`.

## Writing simulations

Both existing simulations (`WaterSimulation`, `HeartSimulation`) follow the same
shape, and new ones should too:

- Keep the physics in a plain module with no React and no canvas calls, so it
  can be unit-tested directly. The heart post splits into four files, and the
  split is the point: `heartModel.ts` is the circulation (pressures, flows,
  valves), `heartFluid.ts` is where each cell of blood is and how it moves,
  `heartAnatomy.ts` is the geometry in a 0..1 unit box, and `heartDrawing.ts`
  only turns those into pixels. The first two are pure and have tests
  (`heartModel.test.ts`, `heartFluid.test.ts`) asserting conservation laws,
  invariants and output ranges rather than exact numbers.
- Drive everything from a single `requestAnimationFrame` loop inside one
  `useEffect`. Hold the model, and anything else that must survive a re-render,
  in refs; mirror rapidly-changing React state into a ref so the loop can read
  it without being torn down and restarted.
- Clamp the per-frame timestep. A backgrounded tab hands you a multi-second
  delta on return, and integrating that in one step blows up the model.
- Only push to React state at a human rate (once per beat, per event), never
  every frame.
- Size canvases from a `ResizeObserver`, and defer the actual resize into a
  `requestAnimationFrame`. Resizing synchronously inside the observer trips the
  "ResizeObserver loop completed with undelivered notifications" warning, which
  the CRA dev overlay reports as an error.
- Scale the canvas backing store by `devicePixelRatio` and draw in CSS pixels,
  or text and hairlines render blurry.

## Light and dark mode

The site ships both schemes and `MantineProvider` is set to `defaultColorScheme="auto"`,
so anything new must be legible in both. Read the active scheme with
`useComputedColorScheme('light')` and pick colours from there — never hard-code
a single palette, and never assume white. Canvas drawing has no CSS cascade to
fall back on, so pass an explicit palette in and paint the background rather
than leaving it transparent.

Diagram colours should stay distinguishable under colour-vision deficiency in
*both* schemes. `heartDrawing.ts` keeps its two schemes in one `heartPalette`
function so they stay in step; if you add charts, validate any categorical
series palette rather than eyeballing it.

## Checking a drawing

Screenshots are the only way to know a canvas is right, but check geometry with
arithmetic rather than by eye where you can — several bugs in the heart diagram
(a cavity poking through the muscle wall, blood cells wider than the vein
carrying them) were invisible at a glance and obvious once measured against the
path that was meant to contain them.

## Checking narrow layouts

Headless Chrome on macOS refuses to lay out below roughly 500 CSS pixels, so
`--window-size=375,900` still renders at 500 and merely *crops* the screenshot
to 375. That crop looks exactly like a horizontal-overflow bug and is not one.
Verify with the numbers rather than the picture — compare
`document.documentElement.scrollWidth` against `clientWidth` — or drive real
device metrics through the DevTools protocol.
