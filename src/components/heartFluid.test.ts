import { Circulation } from './heartModel';
import { ALL_VESSELS, MAX_CELL_RADIUS, VESSEL_PATHS } from './heartAnatomy';
import { advanceFluid, createFluid, Fluid, WALL_MARGIN } from './heartFluid';

/** Run the heart and its blood forward together, as the animation loop does. */
function run(seconds: number): { sim: Circulation; fluid: Fluid } {
    const sim = new Circulation();
    const fluid = createFluid();
    const step = 0.004;
    for (let t = 0; t < seconds; t += step) {
        sim.advance(step);
        advanceFluid(fluid, sim, step);
    }
    return { sim, fluid };
}

function activeCells(fluid: Fluid, chamber: string): number {
    const found = fluid.chambers.find((c) => c.spec.chamber === chamber);
    return found ? found.cells.filter((cell) => cell.active).length : 0;
}

jest.setTimeout(60000);

test('no cell can be drawn wider than the vessel carrying it', () => {
    // The blood used to be routed along its own copy of each vessel's path,
    // with a hand-tuned spread, and several vessels ended up with cells hanging
    // out of the tube. Both now come from one declaration, so this holds by
    // construction — this is here to keep it that way.
    expect(VESSEL_PATHS).toHaveLength(ALL_VESSELS.length);
    VESSEL_PATHS.forEach((path, i) => {
        const vessel = ALL_VESSELS[i];
        expect(path.spread + MAX_CELL_RADIUS).toBeLessThanOrEqual(vessel.width / 2);
        expect(path.spread).toBeGreaterThan(0);
        // Cells travel the drawn tube unless the vessel says otherwise.
        expect(path.points).toBe(vessel.cellPoints ?? vessel.points);
        expect(path.total).toBeGreaterThan(0);
    });
});

test('every cell stays inside the chamber wall', () => {
    const { fluid } = run(4);
    for (const chamber of fluid.chambers) {
        for (const cell of chamber.cells) {
            if (!cell.active) continue;
            // Cells are drawn with real width and trail a streak, so they have
            // to stay short of the wall rather than merely inside it.
            expect(Math.hypot(cell.u, cell.v)).toBeLessThanOrEqual(WALL_MARGIN + 1e-9);
        }
    }
});

test('nothing in the blood goes non-finite', () => {
    const { fluid } = run(4);
    for (const cell of fluid.vessels) {
        expect(Number.isFinite(cell.s)).toBe(true);
        expect(cell.s).toBeGreaterThanOrEqual(0);
        expect(cell.s).toBeLessThanOrEqual(1);
        expect(Number.isFinite(cell.velocity)).toBe(true);
    }
    for (const chamber of fluid.chambers) {
        for (const cell of chamber.cells) {
            expect(Number.isFinite(cell.u)).toBe(true);
            expect(Number.isFinite(cell.v)).toBe(true);
        }
    }
});

test('a chamber holds more blood when it is fuller', () => {
    // Sample the left ventricle at end-diastole and again at end-systole, and
    // check the drawn blood tracks the volume rather than staying put.
    const sim = new Circulation();
    const fluid = createFluid();
    const step = 0.004;
    for (let t = 0; t < 3; t += step) {
        sim.advance(step);
        advanceFluid(fluid, sim, step);
    }

    let fullest = { volume: 0, cells: 0 };
    let emptiest = { volume: Infinity, cells: 0 };
    for (let t = 0; t < 1; t += step) {
        sim.advance(step);
        advanceFluid(fluid, sim, step);
        const volume = sim.volumes.lv;
        const cells = activeCells(fluid, 'lv');
        if (volume > fullest.volume) fullest = { volume, cells };
        if (volume < emptiest.volume) emptiest = { volume, cells };
    }

    expect(fullest.volume).toBeGreaterThan(emptiest.volume);
    expect(fullest.cells).toBeGreaterThan(emptiest.cells);
});

test('blood keeps moving through the atria, which are conduits', () => {
    // The atrium passes its whole contents onward every beat; if the transport
    // field stalls, its cells sit still and the chamber reads as a pool.
    const { fluid } = run(4);
    const atrium = fluid.chambers.find((c) => c.spec.chamber === 'la');
    expect(atrium).toBeDefined();
    const moving = atrium!.cells.filter(
        (cell) => cell.active && Math.hypot(cell.vu, cell.vv) > 0.05,
    );
    const active = atrium!.cells.filter((cell) => cell.active).length;
    expect(active).toBeGreaterThan(10);
    expect(moving.length).toBeGreaterThan(active * 0.5);
});
