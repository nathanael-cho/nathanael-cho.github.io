import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Group, Loader, Paper, Switch, Text } from '@mantine/core';

/* The shape of the exports from our hand-written water.wat module. */
interface WaterExports {
  memory: WebAssembly.Memory;
  init: (w: number, h: number) => void;
  step: () => void;
  perturb: (cx: number, cy: number, radius: number, strength: number) => void;
  setParams: (damping: number, c2: number) => void;
  setBand: (cells: number) => void;
  heightsPtr: () => number;
}

/* All tunable parameters for the simulation live here. */
const CONFIG = {
  canvas: {
    maxWidth: 1140,       // cap on canvas pixel width; matches <Container size="lg">
    height: 460,          // canvas pixel height
    waterlineFrac: 0.5,   // fraction of the height that is sky/forest (rest is lake)
  },
  perspective: {
    flatten: 0.6,         // ripple squash: 1 = round (top-down), <1 = flatter ellipses
    trapezoid: 0.3,       // 0 = uniform; >0 adds receding convergence (near bigger,
                          // far smaller) on top of flatten, plus mild edge slant
    margin: 24,           // off-screen absorbing border, in simulation cells
  },
  physics: {
    damping: 0.985,       // fraction of ripple energy kept per step (must be < 1)
    waveSpeed: 0.2,       // c^2 * dt^2 in the wave equation (must stay < 0.5)
  },
  distortion: {
    x: 7,                 // horizontal reflection bend per unit surface slope
    y: 9,                 // vertical reflection bend per unit surface slope
  },
  // Pointer pokes: negative strength = downward impulse; radius grows with
  // nearness (far .. near) so distant ripples stay small.
  drag:  { strength: -1.6, radiusFar: 1.5, radiusNear: 4.5 },
  click: { strength: -6,   radiusFar: 3,   radiusNear: 9 },
  // Idle ripples that keep the lake alive.
  ambient: { chance: 0.04, radius: 2, strength: -0.6 },
  snow: { areaPerFlake: 6000 }, // one flake per N pixels of sky
} as const;

/* ---- scene drawing (the static wintry forest that gets reflected) ---- */

interface Tree {
  x: number;
  baseY: number;
  height: number;
  width: number;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  waterlineY: number,
  trees: Tree[],
): void {
  // Cold twilight sky.
  const sky = ctx.createLinearGradient(0, 0, 0, waterlineY);
  sky.addColorStop(0, '#1a2740');
  sky.addColorStop(0.55, '#3b4a6b');
  sky.addColorStop(0.85, '#8494ac');
  sky.addColorStop(1, '#c3ccd6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, waterlineY);

  // Moon with a soft halo.
  const moonX = width * 0.78;
  const moonY = waterlineY * 0.28;
  const halo = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 90);
  halo.addColorStop(0, 'rgba(255,255,240,0.55)');
  halo.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(moonX - 90, moonY - 90, 180, 180);
  ctx.fillStyle = '#fdfdf0';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
  ctx.fill();

  // Two ridges of distant snowy mountains.
  const drawRidge = (baseY: number, amp: number, color: string, seed: number): void => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    const points = 8;
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const jag = Math.sin(i * 1.7 + seed) * 0.5 + Math.sin(i * 3.3 + seed * 2) * 0.5;
      ctx.lineTo(x, baseY - amp * (0.5 + 0.5 * jag));
    }
    ctx.lineTo(width, baseY);
    ctx.closePath();
    ctx.fill();
  };
  drawRidge(waterlineY * 0.92, waterlineY * 0.42, '#6c7a95', 0.5);
  drawRidge(waterlineY * 0.98, waterlineY * 0.30, '#4d5a75', 2.1);

  // Snow-covered shoreline.
  ctx.fillStyle = '#e9eef4';
  ctx.fillRect(0, waterlineY - 10, width, 12);

  // Pine forest along the shore.
  for (const t of trees) {
    drawPine(ctx, t);
  }
}

function drawPine(ctx: CanvasRenderingContext2D, t: Tree): void {
  const { x, baseY, height, width } = t;
  const layers = 4;
  const layerH = height / layers;
  // trunk
  ctx.fillStyle = '#3b2f2a';
  ctx.fillRect(x - width * 0.04, baseY - layerH * 0.4, width * 0.08, layerH * 0.5);
  for (let i = 0; i < layers; i++) {
    const topY = baseY - height + i * layerH * 0.82;
    const halfW = (width / 2) * (1 - i / (layers + 0.5));
    // dark pine body
    ctx.fillStyle = '#1f3b2f';
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x - halfW, topY + layerH);
    ctx.lineTo(x + halfW, topY + layerH);
    ctx.closePath();
    ctx.fill();
    // snow cap on top-left of each layer
    ctx.fillStyle = 'rgba(240,245,250,0.9)';
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x - halfW * 0.55, topY + layerH * 0.55);
    ctx.lineTo(x - halfW * 0.1, topY + layerH * 0.5);
    ctx.closePath();
    ctx.fill();
  }
}

function makeTrees(width: number, waterlineY: number): Tree[] {
  const trees: Tree[] = [];
  // A back row of smaller trees and a front row of larger ones.
  const rows = [
    { count: Math.round(width / 55), scale: 0.7, y: waterlineY - 6 },
    { count: Math.round(width / 80), scale: 1.0, y: waterlineY - 2 },
  ];
  for (const row of rows) {
    for (let i = 0; i < row.count; i++) {
      const jitter = (Math.random() - 0.5) * (width / row.count) * 0.6;
      const x = ((i + 0.5) / row.count) * width + jitter;
      const height = (60 + Math.random() * 40) * row.scale;
      trees.push({ x, baseY: row.y, height, width: height * 0.62 });
    }
  }
  return trees;
}

/* ---- snow (animated, drawn on top of the sky each frame) ---- */

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
}

function makeFlakes(width: number, waterlineY: number): Flake[] {
  const count = Math.round((width * waterlineY) / CONFIG.snow.areaPerFlake);
  const flakes: Flake[] = [];
  for (let i = 0; i < count; i++) {
    flakes.push({
      x: Math.random() * width,
      y: Math.random() * waterlineY,
      r: 0.8 + Math.random() * 1.8,
      speed: 0.3 + Math.random() * 0.8,
      drift: 0.3 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return flakes;
}

export default function WaterSimulation(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // true once the first frame has painted
  const [snow, setSnow] = useState(true);
  // Mirrored for the animation loop to read; assigned in an effect rather than
  // during render so the render stays pure.
  const snowRef = useRef(snow);
  useEffect(() => {
    snowRef.current = snow;
  }, [snow]);

  const wasmRef = useRef<WaterExports | null>(null);

  // Instantiate the WASM module once.
  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}wasm_files/water.wasm`)
      .then((res) => res.arrayBuffer())
      .then((bytes) => WebAssembly.instantiate(bytes, {}))
      .then(({ instance }) => {
        if (cancelled) return;
        wasmRef.current = instance.exports as unknown as WaterExports;
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const perturbAt = useCallback(
    (gridX: number, gridY: number, radius: number, strength: number) => {
      const w = wasmRef.current;
      if (w) w.perturb(Math.round(gridX), Math.round(gridY), radius, strength);
    },
    [],
  );

  // Main render loop. Restarts whenever the WASM finishes loading.
  useEffect(() => {
    if (loading || error) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const wasm = wasmRef.current;
    if (!canvas || !container || !wasm) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Local aliases for the config values used all over this effect.
    const MARGIN = CONFIG.perspective.margin;
    const MAX_WIDTH = CONFIG.canvas.maxWidth;

    let width = 0;
    let waterlineY = 0;
    let lakeH = 0;
    let gw = 0; // full simulation grid width  = width + 2*MARGIN
    let gh = 0; // full simulation grid height = lakeH + 2*MARGIN
    let heights = new Float32Array();
    // Maps each lake screen row -> the (fractional) simulation row it samples,
    // giving the water an across-the-lake perspective instead of a top-down one.
    let rowMap = new Float32Array();
    // Per screen row: the fraction of the grid's width that maps across the
    // screen. Constant here (a uniform horizontal squash that flattens ripples
    // into ellipses); this hook is also where a depth-varying trapezoid lived.
    let colScale = new Float32Array();
    let sceneImage: ImageData = ctx.createImageData(1, 1);
    let sceneData: Uint8ClampedArray = new Uint8ClampedArray();
    let lakeImage: ImageData = ctx.createImageData(1, 1);
    let flakes: Flake[] = [];
    let raf = 0;
    let tick = 0;

    const setup = (): void => {
      width = Math.min(container.clientWidth, MAX_WIDTH);
      const height = CONFIG.canvas.height;
      canvas.width = width;
      canvas.height = height;
      waterlineY = Math.round(height * CONFIG.canvas.waterlineFrac);
      lakeH = height - waterlineY;

      // (Re)initialise the simulation grid at lake-pixel resolution, padded by
      // MARGIN cells on every side. The visible lake occupies the interior;
      // the padding is the absorbing sponge, kept off-screen.
      gw = width + 2 * MARGIN;
      gh = lakeH + 2 * MARGIN;
      wasm.init(gw, gh);
      wasm.setParams(CONFIG.physics.damping, CONFIG.physics.waveSpeed);
      wasm.setBand(MARGIN);
      const ptr = wasm.heightsPtr();
      heights = new Float32Array(wasm.memory.buffer, ptr, gw * gh);

      // Tilt mapping: rows map 1:1 (no nonlinear depth warp, so no egg) and the
      // horizontal is squashed by `flatten` to make ellipses. `trapezoid` then
      // adds an optional depth-varying convergence on top -- near rows get
      // extra magnification (bigger ripples), far rows less -- for a receding
      // look. At trapezoid 0 this is a pure uniform flatten.
      rowMap = new Float32Array(lakeH);
      colScale = new Float32Array(lakeH);
      const flatten = CONFIG.perspective.flatten;
      const trapezoid = CONFIG.perspective.trapezoid;
      for (let sv = 0; sv < lakeH; sv++) {
        rowMap[sv] = sv; // 1:1 vertical
        const u = lakeH > 1 ? sv / (lakeH - 1) : 0; // 0 at horizon (far), 1 near
        colScale[sv] = flatten * Math.max(0.12, 1 - trapezoid * u);
      }

      // Render the static scene once and cache its pixels for reflection.
      const trees = makeTrees(width, waterlineY);
      drawScene(ctx, width, waterlineY, trees);
      sceneImage = ctx.getImageData(0, 0, width, waterlineY);
      sceneData = sceneImage.data;
      lakeImage = ctx.createImageData(width, lakeH);
      flakes = makeFlakes(width, waterlineY);

      // Paint one complete frame (a calm mirror, since all heights are zero)
      // synchronously. Assigning canvas.width above clears the canvas to black;
      // repainting the lake here — before setup() returns — means the browser
      // never composites that black state, even across resizes.
      renderLake();
    };

    // Defer resize handling to the next frame. Doing the canvas resize +
    // redraw synchronously inside the observer callback can trip the benign
    // "ResizeObserver loop completed with undelivered notifications" warning,
    // which the CRA dev overlay surfaces as an error.
    let resizeRaf = 0;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (Math.min(container.clientWidth, MAX_WIDTH) !== width) setup();
      });
    });

    // Distortion tuning (aliased for the hot inner loop).
    const DISP_X = CONFIG.distortion.x;
    const DISP_Y = CONFIG.distortion.y;

    const renderLake = (): void => {
      const out = lakeImage.data;
      const skyH = waterlineY;
      const halfW = width * 0.5;
      for (let ry = 0; ry < lakeH; ry++) {
        // Ripples read as smaller/calmer toward the far shore (small ry).
        const distFade = 0.25 + 0.75 * (ry / lakeH);
        // Perspective-corrected reflection source row.
        const baseSrcY = skyH - 1 - ry;
        const rowDark = 1 - (ry / lakeH) * 0.4;

        // Which simulation rows this screen row samples (perspective). We read
        // the two bracketing grid rows and blend, so the magnified near-water
        // doesn't look stepped.
        const gRowF = rowMap[ry];
        const gy0 = gRowF | 0;
        const fy = gRowF - gy0;
        const gy1 = gy0 < lakeH - 1 ? gy0 + 1 : gy0;
        // Grid-ROW base indices into the padded grid (stride gw). The column is
        // added per pixel below. The MARGIN padding guarantees the ±1/±gw
        // neighbours are always valid cells, so the inner loop needs no bounds
        // checks.
        const r0 = (gy0 + MARGIN) * gw;
        const r1 = (gy1 + MARGIN) * gw;
        const up0 = r0 - gw;
        const dn0 = r0 + gw;
        const up1 = r1 - gw;
        const dn1 = r1 + gw;

        // Trapezoid: at this depth only a central band of grid columns is
        // visible, so the full screen width maps to gridcol = cCenter +
        // cSlope*(rx - halfW). Near rows use a narrow band (magnified); far
        // rows use the full width.
        const ratio = colScale[ry];
        const cCenter = MARGIN + (width - 1) * 0.5;
        const cSlope = ((width - 1) * ratio) / width;

        for (let rx = 0; rx < width; rx++) {
          const col = cCenter + cSlope * (rx - halfW);
          const c0 = col | 0;
          const cf = col - c0;
          // Central-difference slopes at c0 and c0+1, blended horizontally (cf)
          // then vertically (fy) — bilinear over the perspective-warped grid.
          const gx0 = (heights[r0 + c0 + 1] - heights[r0 + c0 - 1]) * (1 - cf)
            + (heights[r0 + c0 + 2] - heights[r0 + c0]) * cf;
          const gy0v = (heights[dn0 + c0] - heights[up0 + c0]) * (1 - cf)
            + (heights[dn0 + c0 + 1] - heights[up0 + c0 + 1]) * cf;
          const gx1 = (heights[r1 + c0 + 1] - heights[r1 + c0 - 1]) * (1 - cf)
            + (heights[r1 + c0 + 2] - heights[r1 + c0]) * cf;
          const gy1v = (heights[dn1 + c0] - heights[up1 + c0]) * (1 - cf)
            + (heights[dn1 + c0 + 1] - heights[up1 + c0 + 1]) * cf;
          const gx = (gx0 + (gx1 - gx0) * fy) * distFade;
          const gy = (gy0v + (gy1v - gy0v) * fy) * distFade;

          let sx = rx + gx * DISP_X;
          let sy = baseSrcY + gy * DISP_Y;
          if (sx < 0) sx = 0;
          else if (sx > width - 1) sx = width - 1;
          if (sy < 0) sy = 0;
          else if (sy > skyH - 1) sy = skyH - 1;

          const sIdx = ((sy | 0) * width + (sx | 0)) * 4;
          // Water tint + depth darkening.
          const tint = rowDark;
          let r = sceneData[sIdx] * 0.7 * tint + 12;
          let g = sceneData[sIdx + 1] * 0.8 * tint + 20;
          let b = sceneData[sIdx + 2] * 0.9 * tint + 34;

          // Specular glint where the surface tilts steeply.
          const slope = Math.abs(gx) + Math.abs(gy);
          if (slope > 0.35) {
            const spec = Math.min((slope - 0.35) * 120, 90);
            r += spec;
            g += spec;
            b += spec;
          }

          const oIdx = (ry * width + rx) * 4;
          out[oIdx] = r > 255 ? 255 : r;
          out[oIdx + 1] = g > 255 ? 255 : g;
          out[oIdx + 2] = b > 255 ? 255 : b;
          out[oIdx + 3] = 255;
        }
      }
      ctx.putImageData(lakeImage, 0, waterlineY);
    };

    const drawSnow = (): void => {
      if (!snowRef.current) return;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const f of flakes) {
        f.y += f.speed;
        f.x += Math.sin(tick * 0.02 + f.phase) * f.drift * 0.5;
        if (f.y > waterlineY) {
          f.y = -2;
          f.x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let painted = false;
    const frame = (): void => {
      tick++;
      // Ambient life: an occasional tiny drip keeps the lake from going flat.
      // Placed within the visible interior (offset past the margin).
      if (Math.random() < CONFIG.ambient.chance) {
        perturbAt(
          MARGIN + Math.random() * width,
          MARGIN + Math.random() * lakeH,
          CONFIG.ambient.radius,
          CONFIG.ambient.strength,
        );
      }
      // Advance the physics a couple of substeps per frame for lively waves.
      wasm.step();
      wasm.step();

      // Re-blit the cached static scene into the sky region, then the
      // reflected lake, then snow on top.
      ctx.putImageData(sceneImage, 0, 0);
      renderLake();
      drawSnow();

      // Reveal the canvas only once there's a fully-painted frame to show,
      // so the reader never sees a black canvas filling in.
      if (!painted) {
        painted = true;
        setReady(true);
      }
      raf = requestAnimationFrame(frame);
    };

    // Everything setup() and the render loop reference is now defined, so do
    // the initial sizing + paint and start watching for resizes.
    setup();
    resizeObserver.observe(container);
    raf = requestAnimationFrame(frame);

    // Pointer interaction over the lake. Returns [gridX, gridRow, nearFactor]
    // where nearFactor is 0 at the horizon and 1 at the near shore.
    const toGrid = (clientX: number, clientY: number): [number, number, number] | null => {
      const rect = canvas.getBoundingClientRect();
      const px = (clientX - rect.left) * (width / rect.width);
      const py = (clientY - rect.top) * (canvas.height / rect.height);
      const sv = py - waterlineY;
      if (sv < 0 || sv >= lakeH) return null;
      // Map to the padded grid using the same perspective trapezoid as the
      // renderer, so a poke lands under the cursor at any depth.
      const svi = sv | 0;
      const ratio = colScale[svi];
      const cCenter = MARGIN + (width - 1) * 0.5;
      const cSlope = ((width - 1) * ratio) / width;
      const gridX = cCenter + cSlope * (px - width * 0.5);
      return [gridX, rowMap[svi] + MARGIN, sv / lakeH];
    };
    // Farther pokes (small nearFactor g[2]) make smaller, tighter ripples.
    const pokeRadius = (far: number, near: number, nearFactor: number): number =>
      Math.max(1, Math.round(far + (near - far) * nearFactor));
    const onMove = (e: PointerEvent): void => {
      const g = toGrid(e.clientX, e.clientY);
      if (!g) return;
      const { radiusFar, radiusNear, strength } = CONFIG.drag;
      perturbAt(g[0], g[1], pokeRadius(radiusFar, radiusNear, g[2]), strength);
    };
    const onDown = (e: PointerEvent): void => {
      const g = toGrid(e.clientX, e.clientY);
      if (!g) return;
      const { radiusFar, radiusNear, strength } = CONFIG.click;
      perturbAt(g[0], g[1], pokeRadius(radiusFar, radiusNear, g[2]), strength);
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    return () => {
      cancelAnimationFrame(raf);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  }, [loading, error, perturbAt]);

  return (
    <Paper withBorder radius="md" p="xs" ref={containerRef}>
      <Box
        style={{
          position: 'relative',
          width: '100%',
          // Reserve the canvas's height while loading so revealing it doesn't
          // shift the page layout.
          minHeight: ready ? undefined : CONFIG.canvas.height,
        }}
      >
        {!ready && !error && (
          <Group justify="center" align="center" gap="sm" style={{ position: 'absolute', inset: 0 }}>
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Loading the water simulation…</Text>
          </Group>
        )}
        {error && (
          <Text c="red" size="sm" p="md">Failed to load WebAssembly module: {error}</Text>
        )}
        <canvas
          ref={canvasRef}
          style={{
            display: ready && !error ? 'block' : 'none',
            width: '100%',
            borderRadius: 8,
            cursor: 'crosshair',
            touchAction: 'none',
          }}
        />
      </Box>
      {ready && !error && (
        <Group justify="space-between" mt="xs" px="xs">
          <Text size="xs" c="dimmed">
            Move your cursor over the lake, or click to drop a stone.
          </Text>
          <Switch
            size="sm"
            label="Snowfall"
            checked={snow}
            onChange={(e) => setSnow(e.currentTarget.checked)}
          />
        </Group>
      )}
    </Paper>
  );
}
