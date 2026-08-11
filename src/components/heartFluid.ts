/**
 * The blood: where each cell of it is, and how it moves.
 *
 * This is a simulation, not a drawing — it holds no canvas and no React, so it
 * can be exercised on its own. Cells in a vessel run along a fixed path at a
 * speed set by the flow through it. Cells in a chamber live in the unit disc of
 * that chamber's ellipse, so they ride the wall as it contracts, and within it
 * they are carried by a source at the inlet, a sink at the outlet and a
 * matching spread term that keeps the field divergence-free — which is what
 * makes it carry blood across a chamber rather than heap it at one end.
 */

import { Circulation } from './heartModel';
import { CHAMBER_SPECS, ChamberSpec, VESSEL_PATHS } from './heartAnatomy';

/** Converts mL/s into fractions-of-path per second. */
const FLOW_TO_SPEED = 0.0024;

export interface VesselCell {
    pathIndex: number;
    s: number;
    offset: number;
    profile: number;
    size: number;
    velocity: number;
}

export function createVesselCells(): VesselCell[] {
    const cells: VesselCell[] = [];
    for (let p = 0; p < VESSEL_PATHS.length; p++) {
        const { cells: count } = VESSEL_PATHS[p];
        for (let i = 0; i < count; i++) {
            const offset = (Math.random() * 2 - 1) * 0.86;
            cells.push({
                pathIndex: p,
                s: (i + Math.random()) / count,
                offset,
                // Flow in a pipe is fastest down the middle and slowest against
                // the wall, which is what makes the stream shear rather than
                // march along in lockstep.
                profile: 0.42 + 0.58 * (1 - offset * offset),
                size: 0.72 + Math.random() * 0.56,
                velocity: 0,
            });
        }
    }
    return cells;
}

/**
 * We are drawing a slice through a chamber, and the area of a slice grows as
 * volume^(2/3), not as volume. Scaling the cell count the same way keeps the
 * blood at a constant density: the chamber stays convincingly full at every
 * size, and it is the outline that shows it emptying.
 */
function cellTarget(volume: number, perArea: number): number {
    return Math.round(perArea * Math.pow(Math.max(volume, 0), 2 / 3));
}

/** Largest volume we keep cells for, mL. */
const MAX_CHAMBER_VOLUME = 300;

/**
 * How fast blood crosses a chamber, per unit of turnover. What sets the speed
 * is not the flow alone but the flow relative to the chamber's own contents.
 */
const TURNOVER_GAIN = 6;

/** Softening on the port singularities, in disc units. */
const PORT_SOFTEN = 0.3;

const MAX_DISC_SPEED = 4.5;

/** Random walk that keeps the blood mixing instead of running on rails. */
const MIXING = 0.25;

/** How close to an outflowing port counts as having left the chamber. */
const RECYCLE_RADIUS = 0.17;

/**
 * How far out into the chamber cells may drift, in disc units. Short of 1 so
 * that a cell — drawn with real width, trailing a streak — still falls inside
 * the wall rather than straddling it.
 */
export const WALL_MARGIN = 0.88;

/**
 * How much of the divergence balance to apply. At 1 the field is exactly
 * divergence-free, but a hard-squeezing ventricle then presses its blood
 * visibly against the far wall; easing it off keeps the transport without that.
 */
const SPREAD_BALANCE = 0.6;

export interface ChamberCell {
    u: number;
    v: number;
    vu: number;
    vv: number;
    /** Slowly-varying wander, which mixes the chamber without visible jitter. */
    wu: number;
    wv: number;
    /** Seconds since this cell entered, so new blood fades in. */
    age: number;
    size: number;
    active: boolean;
}

export interface ChamberFluid {
    spec: ChamberSpec;
    cells: ChamberCell[];
}

function createChamberFluid(): ChamberFluid[] {
    return CHAMBER_SPECS.map((spec) => {
        const pool = cellTarget(MAX_CHAMBER_VOLUME, spec.cellsPerArea);
        const cells: ChamberCell[] = [];
        for (let i = 0; i < pool; i++) {
            // Uniform over the disc: sqrt keeps them from bunching at the centre.
            const r = Math.sqrt(Math.random()) * 0.9;
            const a = Math.random() * Math.PI * 2;
            cells.push({
                u: Math.cos(a) * r,
                v: Math.sin(a) * r,
                vu: 0, vv: 0, wu: 0, wv: 0, age: 0,
                size: 0.7 + Math.random() * 0.6,
                active: false,
            });
        }
        return { spec, cells };
    });
}

export interface Fluid {
    vessels: VesselCell[];
    chambers: ChamberFluid[];
}

export function createFluid(): Fluid {
    return { vessels: createVesselCells(), chambers: createChamberFluid() };
}

function advanceChamberFluid(fluid: ChamberFluid, sim: Circulation, dt: number): void {
    const { spec, cells } = fluid;
    const inletFlow = spec.inletFlow(sim);
    const outletFlow = spec.outletFlow(sim);
    const volume = sim.volumes[spec.chamber];

    // Keep as many cells as there is blood, so filling and emptying are visible
    // as blood arriving and leaving rather than as the outline alone changing.
    const target = Math.min(cellTarget(volume, spec.cellsPerArea), cells.length);
    let active = 0;
    for (const cell of cells) if (cell.active) active++;

    while (active < target) {
        const cell = cells.find((c) => !c.active);
        if (!cell) break;
        const port = inletFlow >= 0 ? spec.inlet : spec.outlet;
        const r = Math.sqrt(Math.random()) * 0.88;
        const a = Math.random() * Math.PI * 2;
        const u = Math.cos(a) * r;
        const v = Math.sin(a) * r;
        // Only a slight lean towards the port it arrives through. A real chamber
        // is uniformly full of blood — it does not pool at one end.
        const pull = Math.random() * 0.18;
        cell.u = u + (port[0] - u) * pull;
        cell.v = v + (port[1] - v) * pull;
        cell.vu = 0;
        cell.vv = 0;
        cell.wu = 0;
        cell.wv = 0;
        cell.age = 0;
        cell.active = true;
        active++;
    }
    while (active > target) {
        // Picking the single closest cell every time scrubs that end of the
        // chamber bare; a small tournament keeps the bias towards the port
        // while drawing from the whole chamber.
        const port = outletFlow >= 0 ? spec.outlet : spec.inlet;
        let victim: ChamberCell | null = null;
        let best = Infinity;
        let seen = 0;
        for (let tries = 0; tries < 32 && seen < 5; tries++) {
            const cell = cells[(Math.random() * cells.length) | 0];
            if (!cell.active) continue;
            seen++;
            const d = Math.hypot(cell.u - port[0], cell.v - port[1]);
            if (d < best) {
                best = d;
                victim = cell;
            }
        }
        if (!victim) break;
        victim.active = false;
        active--;
    }

    // Signed flow *into* the chamber at each port. Their sum is dV/dt.
    const ports: [[number, number], number][] = [
        [spec.inlet, inletFlow],
        [spec.outlet, -outletFlow],
    ];
    const net = inletFlow - outletFlow;
    const coefficient = TURNOVER_GAIN / (Math.max(volume, 5) * 2 * Math.PI);
    const spread = -net * coefficient * SPREAD_BALANCE;
    const swirl = (spec.swirl * Math.max(inletFlow, 0) * 0.25) / Math.max(volume, 5);

    const exit = ports.find(([, flow]) => flow < -1);
    const entry = ports.find(([, flow]) => flow > 1);

    for (const cell of cells) {
        if (!cell.active) continue;
        let vu = 0;
        let vv = 0;
        for (const [port, flow] of ports) {
            const dx = cell.u - port[0];
            const dy = cell.v - port[1];
            const d = Math.hypot(dx, dy) || 1e-4;
            const magnitude = (flow * coefficient) / (d + PORT_SOFTEN);
            vu += (dx / d) * magnitude;
            vv += (dy / d) * magnitude;
        }
        vu += spread * cell.u;
        vv += spread * cell.v;
        vu += -cell.v * swirl;
        vv += cell.u * swirl;
        cell.wu = cell.wu * 0.93 + (Math.random() - 0.5) * MIXING;
        cell.wv = cell.wv * 0.93 + (Math.random() - 0.5) * MIXING;
        vu += cell.wu;
        vv += cell.wv;
        cell.age += dt;

        const speed = Math.hypot(vu, vv);
        if (speed > MAX_DISC_SPEED) {
            vu *= MAX_DISC_SPEED / speed;
            vv *= MAX_DISC_SPEED / speed;
        }
        cell.vu = vu;
        cell.vv = vv;
        cell.u += vu * dt;
        cell.v += vv * dt;

        // Blood that reaches the exit has left; if blood is arriving elsewhere
        // at the same time, that cell is the new blood coming in. Without this
        // a conduit like the atrium silts up against its exit.
        if (exit && entry) {
            const dx = cell.u - exit[0][0];
            const dy = cell.v - exit[0][1];
            if (dx * dx + dy * dy < RECYCLE_RADIUS * RECYCLE_RADIUS) {
                cell.u = entry[0][0] + (Math.random() - 0.5) * 0.36;
                cell.v = entry[0][1] + (Math.random() - 0.5) * 0.36;
                cell.wu = 0;
                cell.wv = 0;
                cell.age = 0;
            }
        }

        // Stay inside the wall, with room for the cell's own width.
        const r = Math.hypot(cell.u, cell.v);
        if (r > WALL_MARGIN) {
            cell.u = (cell.u / r) * WALL_MARGIN;
            cell.v = (cell.v / r) * WALL_MARGIN;
        }
    }
}

export function advanceFluid(fluid: Fluid, sim: Circulation, dt: number): void {
    for (const cell of fluid.vessels) {
        const p = VESSEL_PATHS[cell.pathIndex];
        const velocity = (p.flow(sim) * FLOW_TO_SPEED * cell.profile) / (p.caliber * p.total);
        cell.velocity = velocity;
        let s = cell.s + velocity * dt;
        // Backward flow simply runs the parameter down instead of up, so
        // regurgitation shows as blood travelling the wrong way.
        if (s > 1 || s < 0) s -= Math.floor(s);
        cell.s = s;
    }
    for (const chamber of fluid.chambers) advanceChamberFluid(chamber, sim, dt);
}
