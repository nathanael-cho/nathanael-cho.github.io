/**
 * Painting the heart diagram.
 *
 * Everything here is pure — it takes a state and paints it. The geometry comes
 * from heartAnatomy.ts and the blood from heartFluid.ts; this module only turns
 * them into pixels.
 *
 * The point of the picture is the mechanism: muscle squeezes the chambers, and
 * the pressures that result push the valves open and shut. So the blood is
 * drawn as it actually behaves — filling each chamber, streaming through it and
 * out — and every valve carries the pressure difference acting on it.
 */

import { ChamberName, Circulation, ValveName, ValveState } from './heartModel';
import {
    along, APEX_Y, ARCH_BRANCHES, AORTA, BEHIND_VESSELS, chamberScale, ChamberGeometry,
    CHAMBER_SPECS, CORONARIES, Disc, fromDisc, LA, LONG_AXIS_SHORTENING, MITRAL_Y,
    MODERATOR_BAND, OUTFLOW_TRACTS, PULMONARY_BRANCHES, PULMONARY_TRUNK,
    RA, SEPTUM_X, Trabecula, TRABECULAE, TRICUSPID_Y, VALVE_GEOMETRY, VALVE_ORDER,
    ValveGeometry, VentricleName, Vessel, VESSEL_PATHS,
} from './heartAnatomy';
import { advanceFluid, createFluid, Fluid, VesselCell, WALL_MARGIN } from './heartFluid';

export { advanceFluid, createFluid };
export type { Fluid };

/* ---------------------------------------------------------------------------
 * Colours
 * ------------------------------------------------------------------------ */

export interface Palette {
    surface: string;
    ink: string;
    inkMuted: string;
    /** Oxygen-poor blood: everything from the body up to the pulmonary valve. */
    blue: string;
    /** Oxygen-rich blood: everything from the lungs out to the body. */
    red: string;
    /** Individual cells drifting through each of those. */
    blueCell: string;
    redCell: string;
    muscle: string;
    muscleDeep: string;
    muscleEdge: string;
    vesselWall: string;
    leaflet: string;
    leafletEdge: string;
    coronary: string;
    /** The arrow showing which way the pressure across a valve is pushing. */
    pushOpen: string;
    pushShut: string;
}

export function heartPalette(isDark: boolean): Palette {
    return isDark
        ? {
            surface: '#242424',
            ink: '#e8e8e8',
            inkMuted: '#9a9a9a',
            blue: '#3f77b8',
            red: '#c2453f',
            blueCell: '#a9cbea',
            redCell: '#f0b8b0',
            muscle: '#8c5148',
            muscleDeep: '#6d3d37',
            muscleEdge: '#a76257',
            vesselWall: '#7d5a57',
            leaflet: '#f2e2d4',
            leafletEdge: '#9d7c68',
            coronary: '#8f2f2a',
            pushOpen: '#e4e4e4',
            pushShut: '#f5b04a',
        }
        : {
            surface: '#ffffff',
            ink: '#1f1f1f',
            inkMuted: '#6b6b6b',
            blue: '#3a6ea5',
            red: '#c03f3a',
            blueCell: '#cde2f6',
            redCell: '#ffd6cd',
            muscle: '#c88178',
            muscleDeep: '#ab655c',
            muscleEdge: '#9c574d',
            vesselWall: '#b3857e',
            leaflet: '#fdf4ea',
            leafletEdge: '#a6836c',
            coronary: '#a8322c',
            pushOpen: '#2b2b2b',
            pushShut: '#a85c00',
        };
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function font(size: number, weight = 400): string {
    return `${weight} ${size}px ${FONT}`;
}

/** How much travel a cell's motion-blur streak represents, in seconds. */
const STREAK_SECONDS = 0.026;

/** Longest streak we will draw, in unit-box lengths. */
const MAX_STREAK = 0.055;

/** Fraction of a path over which cells fade in and out at its ends. */
const FADE = 0.07;

/**
 * Trace a polyline through `at`, which maps unit-box coordinates to the canvas.
 * The great vessels are anchored outside the heart and use a plain mapping; the
 * coronaries are stuck to the muscle and use the contracting one.
 */
function strokePolyline(
    ctx: CanvasRenderingContext2D,
    points: [number, number][],
    at: (x: number, y: number) => [number, number],
): void {
    ctx.beginPath();
    ctx.moveTo(...at(points[0][0], points[0][1]));
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(...at(points[i][0], points[i][1]));
    }
}

function vesselStroke(
    ctx: CanvasRenderingContext2D,
    vessel: Vessel,
    unit: number,
    ox: number,
    oy: number,
    palette: Palette,
): void {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    strokePolyline(ctx, vessel.points, (x, y) => [ox + x * unit, oy + y * unit]);
    ctx.strokeStyle = palette.vesselWall;
    ctx.lineWidth = (vessel.width + 0.014) * unit;
    ctx.stroke();
    ctx.strokeStyle = vessel.oxygenated ? palette.red : palette.blue;
    ctx.lineWidth = vessel.width * unit;
    ctx.stroke();
}

/**
 * The ventricular mass. Not a symmetric dome: the right border bulges out under
 * the right atrium, the left border sweeps down in a long curve, and the two
 * meet at an apex that sits below the left ventricle rather than in the middle.
 */
/**
 * The outline of the whole organ. All four chambers live inside this: the heart
 * is one continuous mass of muscle, not a pair of ventricles with two atria
 * perched on top. The notch in the top edge is where the great arteries leave,
 * and the waist across the middle is the coronary sulcus — the groove that
 * divides atria from ventricles on the outside.
 */
function heartOutlinePath(
    ctx: CanvasRenderingContext2D,
    at: (x: number, y: number) => [number, number],
): void {
    const curve = (
        c1x: number, c1y: number, c2x: number, c2y: number, ex: number, ey: number,
    ): void => {
        const [a, b] = at(c1x, c1y);
        const [c, d] = at(c2x, c2y);
        const [e, f] = at(ex, ey);
        ctx.bezierCurveTo(a, b, c, d, e, f);
    };

    ctx.beginPath();
    // Up the patient's right border and over the right atrium.
    ctx.moveTo(...at(0.146, 0.360));
    curve(0.138, 0.236, 0.208, 0.148, 0.300, 0.150);
    // Down into the notch the great arteries leave through.
    curve(0.368, 0.152, 0.406, 0.204, 0.420, 0.268);
    curve(0.446, 0.330, 0.520, 0.330, 0.556, 0.290);
    // Up over the left atrium.
    curve(0.592, 0.244, 0.634, 0.166, 0.718, 0.156);
    curve(0.812, 0.146, 0.866, 0.226, 0.872, 0.336);
    // Down the patient's left border to the apex.
    curve(0.884, 0.452, 0.896, 0.596, 0.878, 0.700);
    curve(0.852, 0.838, 0.760, 0.926, 0.632, 0.944);
    curve(0.520, 0.958, 0.406, 0.892, 0.316, 0.780);
    // Back up the right border, past the coronary sulcus.
    curve(0.220, 0.660, 0.156, 0.500, 0.146, 0.360);
    ctx.closePath();
}

/** An atrium: a rounded chamber funnelling down into its valve ring. */
function atriumPath(
    ctx: CanvasRenderingContext2D,
    g: ChamberGeometry,
    scale: number,
    annulusX: number,
    annulusHw: number,
    annulusY: number,
    unit: number,
    ox: number,
    oy: number,
): void {
    const px = (x: number) => ox + x * unit;
    const py = (y: number) => oy + y * unit;
    const rx = g.rx * scale;
    const ry = g.ry * scale;

    ctx.beginPath();
    ctx.moveTo(px(annulusX - annulusHw), py(annulusY));
    ctx.quadraticCurveTo(px(annulusX - annulusHw - 0.008), py(g.cy + ry * 0.94), px(g.cx - rx), py(g.cy));
    ctx.ellipse(px(g.cx), py(g.cy), rx * unit, ry * unit, 0, Math.PI, 2 * Math.PI);
    ctx.quadraticCurveTo(px(annulusX + annulusHw + 0.008), py(g.cy + ry * 0.94), px(annulusX + annulusHw), py(annulusY));
    ctx.closePath();
}

/**
 * One leaflet, drawn as a tapered flap: thick where it hangs off the fibrous
 * ring, thin at its free edge, and bowed by whatever pressure leans on it.
 */
function drawLeaflet(
    ctx: CanvasRenderingContext2D,
    hingeX: number,
    hingeY: number,
    dirX: number,
    dirY: number,
    length: number,
    bowY: number,
    baseHalf: number,
    tipHalf: number,
    palette: Palette,
): [number, number] {
    const tipX = hingeX + dirX * length;
    const tipY = hingeY + dirY * length;
    const controlX = (hingeX + tipX) / 2;
    const controlY = (hingeY + tipY) / 2 + bowY;
    const nx = -dirY;
    const ny = dirX;
    const midHalf = (baseHalf + tipHalf) / 2;

    ctx.beginPath();
    ctx.moveTo(hingeX + nx * baseHalf, hingeY + ny * baseHalf);
    ctx.quadraticCurveTo(controlX + nx * midHalf, controlY + ny * midHalf, tipX + nx * tipHalf, tipY + ny * tipHalf);
    ctx.lineTo(tipX - nx * tipHalf, tipY - ny * tipHalf);
    ctx.quadraticCurveTo(controlX - nx * midHalf, controlY - ny * midHalf, hingeX - nx * baseHalf, hingeY - ny * baseHalf);
    ctx.closePath();
    ctx.fillStyle = palette.leaflet;
    ctx.fill();
    ctx.strokeStyle = palette.leafletEdge;
    ctx.lineWidth = Math.max(length * 0.045, 0.8);
    ctx.stroke();

    return [tipX, tipY + bowY * 0.6];
}

function drawValve(
    ctx: CanvasRenderingContext2D,
    g: ValveGeometry,
    valveY: number,
    valve: ValveState,
    time: number,
    unit: number,
    ox: number,
    oy: number,
    palette: Palette,
): void {
    const x = ox + g.x * unit;
    const y = oy + valveY * unit;
    const hw = g.hw * unit;
    const downstream = g.flip ? -1 : 1;
    const open = valve.opening;

    let swing = (Math.PI / 180) * 78 * open;
    const flow = Math.abs(valve.flow);
    if (flow > 40) {
        swing += Math.sin(time * 88 + g.x * 40) * 0.055 * open * Math.min(flow / 400, 1);
    }

    // A shut valve is being held shut by the pressure behind it, so it bulges
    // back towards the chamber it is protecting.
    const backPressure = Math.max(0, -valve.gradient);
    const bow = (1 - open) * Math.min(backPressure / 45, 1) * hw * 0.5 * -downstream;

    const length = hw * 1.12;
    const baseHalf = Math.max(hw * 0.18, 1.6);
    const tipHalf = Math.max(hw * 0.07, 0.9);
    const tips: [number, number][] = [];

    ctx.lineJoin = 'round';
    for (const side of [-1, 1] as const) {
        tips.push(
            drawLeaflet(
                ctx, x + side * hw, y,
                -side * Math.cos(swing), downstream * Math.sin(swing),
                length, bow, baseHalf, tipHalf, palette,
            ),
        );
    }

    // The atrioventricular valves are guyed down by chordae tendineae running
    // to papillary muscles. Without them the leaflets would simply invert into
    // the atrium the moment the ventricle squeezed.
    if (!g.flip) {
        const anchorDrop = hw * 2.5;
        ctx.strokeStyle = palette.leafletEdge;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = Math.max(unit * 0.003, 0.7);
        for (let i = 0; i < tips.length; i++) {
            const side = i === 0 ? -1 : 1;
            const anchorX = x + side * hw * 0.5;
            const anchorY = y + downstream * anchorDrop;
            const [tipX, tipY] = tips[i];
            for (const spread of [-0.32, 0, 0.32] as const) {
                ctx.beginPath();
                ctx.moveTo(tipX + spread * hw * 0.5, tipY);
                ctx.lineTo(anchorX, anchorY);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = palette.muscleDeep;
        ctx.strokeStyle = palette.muscleEdge;
        ctx.lineWidth = Math.max(unit * 0.0035, 0.8);
        for (const side of [-1, 1] as const) {
            ctx.beginPath();
            ctx.ellipse(
                x + side * hw * 0.5, y + downstream * (anchorDrop + hw * 0.18),
                hw * 0.16, hw * 0.27, side * 0.25, 0, Math.PI * 2,
            );
            ctx.fill();
            ctx.stroke();
        }
    }

    ctx.fillStyle = palette.leafletEdge;
    for (const side of [-1, 1] as const) {
        ctx.beginPath();
        ctx.arc(x + side * hw, y, Math.max(unit * 0.008, 1.4), 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * The arrow beside a valve: which way the pressure across it is pushing, and
 * how hard. This is the whole mechanism in one mark — when the arrow flips, the
 * valve shuts, and nothing else had to happen for it to.
 */
function drawPressureArrow(
    ctx: CanvasRenderingContext2D,
    g: ValveGeometry,
    valveY: number,
    valve: ValveState,
    unit: number,
    ox: number,
    oy: number,
    palette: Palette,
): void {
    const gradient = valve.gradient;
    const downstream = g.flip ? -1 : 1;
    const opening = gradient >= 0;
    const direction = opening ? downstream : -downstream;

    const magnitude = Math.min(Math.abs(gradient) / 40, 1);
    const shaft = unit * (0.020 + 0.032 * magnitude);
    const x = ox + g.arrowX * unit;
    const mid = oy + valveY * unit;
    const from = mid - direction * shaft * 0.5;
    const to = mid + direction * shaft * 0.5;
    const head = Math.max(unit * 0.011, 5);
    const color = opening ? palette.pushOpen : palette.pushShut;
    const weight = Math.max(unit * 0.0045, 1.8);
    const halo = Math.max(unit * 0.0045, 1.8);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const arrow = (): void => {
        ctx.beginPath();
        ctx.moveTo(x, from);
        ctx.lineTo(x, to - direction * head * 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, to);
        ctx.lineTo(x - head * 0.62, to - direction * head);
        ctx.lineTo(x + head * 0.62, to - direction * head);
        ctx.closePath();
    };

    // Painted twice: a fat outline in the surface colour, then the arrow on top,
    // so it stays separated from whatever it happens to fall over.
    ctx.strokeStyle = palette.surface;
    ctx.lineWidth = weight + halo * 2;
    arrow();
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = weight;
    arrow();
    ctx.stroke();
    ctx.fill();

    if (Math.abs(gradient) < 1) return;
    const text = String(Math.round(Math.abs(gradient)));
    const size = Math.max(unit * 0.019, 10);
    ctx.font = font(size, 700);
    ctx.textAlign = 'center';
    ctx.textBaseline = direction > 0 ? 'bottom' : 'top';
    const textY = direction > 0 ? from - head * 0.4 : from + head * 0.4;
    ctx.lineWidth = Math.max(size * 0.36, 3.5);
    ctx.strokeStyle = palette.surface;
    ctx.strokeText(text, x, textY);
    ctx.fillStyle = color;
    ctx.fillText(text, x, textY);
}

/** Height reserved at the bottom of the canvas for the phase caption. */
const CAPTION_HEIGHT = 62;

export interface Phase {
    title: string;
    detail: string;
}

/**
 * Which part of the beat we are in, worked out purely from what the valves are
 * doing — which is exactly how these phases are named in the first place.
 */
export function describePhase(sim: Circulation, rising: boolean): Phase {
    if (sim.valves.aortic.opening > 0.3) {
        return {
            title: 'Ejection',
            detail: 'The ventricle has out-pushed the aorta, so the aortic valve is held open and blood leaves.',
        };
    }
    if (sim.valves.mitral.opening > 0.3) {
        return {
            title: 'Filling',
            detail: 'The atrium is now the higher pressure, so the mitral valve is held open and the ventricle fills.',
        };
    }
    if (rising) {
        return {
            title: 'Isovolumic contraction',
            detail: 'Every valve is shut. The muscle squeezes a sealed box, so pressure climbs but no blood moves.',
        };
    }
    return {
        title: 'Isovolumic relaxation',
        detail: 'Every valve is shut again. The muscle lets go and pressure collapses before the ventricle can refill.',
    };
}

export function drawHeart(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    sim: Circulation,
    fluid: Fluid,
    /** Seconds of simulated time so far; only drives the leaflet flutter. */
    time: number,
    phase: Phase,
    palette: Palette,
): void {
    ctx.fillStyle = palette.surface;
    ctx.fillRect(0, 0, width, height);

    const artHeight = height - CAPTION_HEIGHT;
    const unit = Math.min(width * 0.94, artHeight * 0.99);
    const ox = (width - unit) / 2;
    const oy = (artHeight - unit) / 2;
    const px = (x: number) => ox + x * unit;
    const py = (y: number) => oy + y * unit;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, artHeight);
    ctx.clip();

    const { volumes, valves } = sim;
    const activation = sim.ventricularActivation;
    const shorten = (y: number): number =>
        APEX_Y + (y - APEX_Y) * (1 - LONG_AXIS_SHORTENING * activation);
    /**
     * The two sides do not beat alike. The left ventricle's wall is about three
     * times the thickness of the right's and drives against a pressure seven
     * times higher, so it draws in far harder; the thin right ventricle mostly
     * sweeps its free wall against the septum. Squeezing about the septum, at
     * different rates either side, is what makes the beat look asymmetric
     * rather than like a balloon deflating.
     */
    const squeezeX = (x: number, y: number): number => {
        // Fades out above the coronary sulcus, so the atria are not dragged in
        // while the ventricles are the ones contracting.
        const depth = Math.min(Math.max((y - 0.34) / 0.20, 0), 1);
        const rate = (x > SEPTUM_X ? 0.070 : 0.018) * activation * depth;
        return SEPTUM_X + (x - SEPTUM_X) * (1 - rate);
    };
    const at = (x: number, y: number): [number, number] => [
        ox + squeezeX(x, y) * unit,
        oy + shorten(y) * unit,
    ];

    // Vessels that pass behind the heart.
    for (const vessel of BEHIND_VESSELS) vesselStroke(ctx, vessel, unit, ox, oy, palette);

    // The heart itself — one organ, with all four chambers cut away inside it.
    heartOutlinePath(ctx, at);
    ctx.fillStyle = palette.muscle;
    ctx.fill();
    ctx.strokeStyle = palette.muscleEdge;
    ctx.lineWidth = Math.max(unit * 0.005, 1);
    ctx.stroke();

    // Everything painted onto the muscle — the groove round the outside, the
    // septum, the coronary arteries — is clipped to the outline. Each is a
    // hand-drawn curve that has to stop exactly at a border it knows nothing
    // about, and each was overrunning it; clipping makes that impossible
    // rather than something to re-check whenever the outline moves.
    ctx.save();
    heartOutlinePath(ctx, at);
    ctx.clip();

    // The coronary sulcus: the groove round the outside that separates the
    // atria above from the ventricles below.
    ctx.beginPath();
    ctx.moveTo(...at(0.152, 0.392));
    ctx.bezierCurveTo(...at(0.330, 0.452), ...at(0.640, 0.436), ...at(0.878, 0.372));
    ctx.strokeStyle = palette.muscleDeep;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(unit * 0.013, 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // The interventricular septum: the wall between the two ventricles, and a
    // structure in its own right rather than undifferentiated muscle.
    ctx.beginPath();
    ctx.moveTo(px(0.438), py(shorten(0.412)));
    ctx.bezierCurveTo(px(0.460), py(0.548), px(0.496), py(0.672), px(0.534), py(0.796));
    ctx.lineTo(px(0.602), py(0.774));
    ctx.bezierCurveTo(px(0.564), py(0.652), px(0.530), py(0.526), px(0.518), py(shorten(0.402)));
    ctx.closePath();
    ctx.fillStyle = palette.muscleDeep;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Coronary arteries run over the outside of that muscle; the cutaway
    // cavities are painted over them next, so they only show on the wall.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const artery of CORONARIES) {
        strokePolyline(ctx, artery, at);
        ctx.strokeStyle = palette.muscleEdge;
        ctx.lineWidth = Math.max(unit * 0.017, 2.4);
        ctx.stroke();
        ctx.strokeStyle = palette.coronary;
        ctx.lineWidth = Math.max(unit * 0.011, 1.6);
        ctx.stroke();
    }

    ctx.restore();

    // The outflow tracts go down behind the cavities, so each one appears to
    // emerge from its ventricle rather than to have been pushed into it.
    for (const vessel of OUTFLOW_TRACTS) vesselStroke(ctx, vessel, unit, ox, oy, palette);

    // Where each chamber's blood sits this frame.
    const discs = new Map<ChamberName, Disc>();
    for (const spec of CHAMBER_SPECS) {
        const scale = chamberScale(volumes[spec.chamber], spec.geometry.vRef);
        const squash = spec.shortens ? 1 - LONG_AXIS_SHORTENING * activation : 1;
        const drawnY = spec.shortens ? shorten(spec.cy) : spec.cy;
        // The cavity has to ride the same squeeze as the wall around it, or the
        // two drift apart as the muscle contracts.
        const narrow = squeezeX(spec.cx + spec.rx, spec.cy) - squeezeX(spec.cx - spec.rx, spec.cy);
        discs.set(spec.chamber, {
            cx: squeezeX(spec.cx, spec.cy),
            cy: drawnY,
            rx: spec.rx * scale * (narrow / (2 * spec.rx)),
            ry: spec.ry * scale * squash,
            rotation: spec.rotation,
        });
    }

    for (const [name, oxygenated, valve] of [
        ['rv', false, 'tricuspid'],
        ['lv', true, 'mitral'],
    ] as [VentricleName, boolean, ValveName][]) {
        const disc = discs.get(name);
        if (!disc) continue;
        ctx.fillStyle = oxygenated ? palette.red : palette.blue;
        // Funnel first, then the body of the cavity over it, in the same colour,
        // so the pair read as one chamber that opens at its valve.
        ventricleInflowPath(ctx, VALVE_GEOMETRY[valve], shorten(VALVE_GEOMETRY[valve].y), disc, unit, ox, oy);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px(disc.cx), py(disc.cy), disc.rx * unit, disc.ry * unit, disc.rotation, 0, Math.PI * 2);
        ctx.fill();
        drawTrabeculae(ctx, TRABECULAE[name], disc, unit, ox, oy, palette);
        if (name === 'rv') {
            ctx.strokeStyle = palette.muscleDeep;
            ctx.globalAlpha = 0.55;
            ctx.lineWidth = Math.max(unit * 0.013, 2);
            ctx.beginPath();
            MODERATOR_BAND.forEach(([u, v], i) => {
                const [bx, by] = fromDisc(disc, u, v);
                if (i === 0) ctx.moveTo(px(bx), py(by));
                else ctx.lineTo(px(bx), py(by));
            });
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    // Atria.
    for (const [g, name, oxygenated, valve] of [
        [RA, 'ra', false, 'tricuspid'],
        [LA, 'la', true, 'mitral'],
    ] as [ChamberGeometry, ChamberName, boolean, ValveName][]) {
        const ring = VALVE_GEOMETRY[valve];
        const scale = chamberScale(volumes[name], g.vRef);
        ctx.fillStyle = oxygenated ? palette.red : palette.blue;
        ctx.strokeStyle = palette.vesselWall;
        ctx.lineWidth = Math.max(unit * 0.007, 1.2);
        atriumPath(ctx, g, scale, ring.x, ring.hw, shorten(ring.y), unit, ox, oy);
        ctx.fill();
        ctx.stroke();
    }

    // The great arteries, which pass in front of everything.
    for (const branch of PULMONARY_BRANCHES) vesselStroke(ctx, branch, unit, ox, oy, palette);
    for (const branch of ARCH_BRANCHES) vesselStroke(ctx, branch, unit, ox, oy, palette);
    vesselStroke(ctx, AORTA, unit, ox, oy, palette);
    vesselStroke(ctx, PULMONARY_TRUNK, unit, ox, oy, palette);

    drawChamberBlood(ctx, fluid, discs, unit, ox, oy, palette);
    drawVesselBlood(ctx, fluid.vessels, unit, ox, oy, palette);

    for (const name of VALVE_ORDER) {
        const g = VALVE_GEOMETRY[name];
        drawValve(ctx, g, shorten(g.y), valves[name], time, unit, ox, oy, palette);
    }
    for (const name of VALVE_ORDER) {
        const g = VALVE_GEOMETRY[name];
        drawPressureArrow(ctx, g, shorten(g.y), valves[name], unit, ox, oy, palette);
    }

    drawLabels(ctx, sim, discs, shorten, unit, ox, oy, palette);
    ctx.restore();
    drawCaption(ctx, phase, width, artHeight, CAPTION_HEIGHT, palette);
}

/**
 * The mouth of a ventricle: a funnel from its atrioventricular valve ring down
 * into the body of the cavity, so the atrium empties into the ventricle rather
 * than into solid muscle.
 */
function ventricleInflowPath(
    ctx: CanvasRenderingContext2D,
    ring: ValveGeometry,
    annulusY: number,
    disc: Disc,
    unit: number,
    ox: number,
    oy: number,
): void {
    const px = (x: number) => ox + x * unit;
    const py = (y: number) => oy + y * unit;
    // Stop at the widest part of the cavity, which the ellipse then rounds off.
    const [leftX, leftY] = fromDisc(disc, -0.82, 0);
    const [rightX, rightY] = fromDisc(disc, 0.82, 0);
    const midY = (annulusY + disc.cy) / 2;

    ctx.beginPath();
    ctx.moveTo(px(ring.x - ring.hw), py(annulusY));
    ctx.quadraticCurveTo(px(ring.x - ring.hw), py(midY), px(leftX), py(leftY));
    ctx.lineTo(px(rightX), py(rightY));
    ctx.quadraticCurveTo(px(ring.x + ring.hw), py(midY), px(ring.x + ring.hw), py(annulusY));
    ctx.closePath();
}

function drawTrabeculae(
    ctx: CanvasRenderingContext2D,
    trabeculae: Trabecula[],
    disc: Disc,
    unit: number,
    ox: number,
    oy: number,
    palette: Palette,
): void {
    ctx.strokeStyle = palette.muscleDeep;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = Math.max(unit * 0.007, 1.2);
    ctx.lineCap = 'round';
    for (const t of trabeculae) {
        const half = t.length / 2;
        const du = Math.cos(t.angle) * half;
        const dv = Math.sin(t.angle) * half;
        const [ax, ay] = fromDisc(disc, t.u - du, t.v - dv);
        const [bx, by] = fromDisc(disc, t.u + du, t.v + dv);
        ctx.beginPath();
        ctx.moveTo(ox + ax * unit, oy + ay * unit);
        ctx.lineTo(ox + bx * unit, oy + by * unit);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function drawChamberBlood(
    ctx: CanvasRenderingContext2D,
    fluid: Fluid,
    discs: Map<ChamberName, Disc>,
    unit: number,
    ox: number,
    oy: number,
    palette: Palette,
): void {
    const base = Math.max(unit * 0.0068, 1.3);
    ctx.lineCap = 'round';

    for (const chamber of fluid.chambers) {
        const disc = discs.get(chamber.spec.chamber);
        if (!disc) continue;
        ctx.fillStyle = chamber.spec.oxygenated ? palette.redCell : palette.blueCell;
        ctx.strokeStyle = ctx.fillStyle;

        for (const cell of chamber.cells) {
            if (!cell.active) continue;
            const [hx, hy] = fromDisc(disc, cell.u, cell.v);
            const x = ox + hx * unit;
            const y = oy + hy * unit;
            const radius = base * cell.size;

            // Trail the streak from where the cell was, pulled back inside the
            // wall first so a fast cell near the edge cannot smear across it.
            let tailU = cell.u - cell.vu * STREAK_SECONDS;
            let tailV = cell.v - cell.vv * STREAK_SECONDS;
            const tailR = Math.hypot(tailU, tailV);
            if (tailR > WALL_MARGIN) {
                tailU = (tailU / tailR) * WALL_MARGIN;
                tailV = (tailV / tailR) * WALL_MARGIN;
            }
            const [tx, ty] = fromDisc(disc, tailU, tailV);
            const dx = (hx - tx) * unit;
            const dy = (hy - ty) * unit;
            const travel = Math.hypot(dx, dy);

            const arriving = Math.min(cell.age / 0.25, 1);
            ctx.globalAlpha = arriving * (0.55 + 0.45 * Math.min(travel / (unit * 0.02), 1));
            if (travel > radius) {
                ctx.lineWidth = radius * 1.5;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - dx, y - dy);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    ctx.globalAlpha = 1;
}

function drawVesselBlood(
    ctx: CanvasRenderingContext2D,
    cells: VesselCell[],
    unit: number,
    ox: number,
    oy: number,
    palette: Palette,
): void {
    const base = Math.max(unit * 0.0068, 1.3);
    ctx.lineCap = 'round';

    for (const cell of cells) {
        const p = VESSEL_PATHS[cell.pathIndex];
        const [hx, hy, nx, ny] = along(p, cell.s);
        const lateral = cell.offset * p.spread;
        const headX = ox + (hx + nx * lateral) * unit;
        const headY = oy + (hy + ny * lateral) * unit;

        const edge = Math.min(1, cell.s / FADE, (1 - cell.s) / FADE);
        const speed = Math.abs(cell.velocity);
        ctx.globalAlpha = Math.max(edge, 0) * (0.5 + 0.5 * Math.min(speed / 1.2, 1));
        ctx.fillStyle = p.oxygenated ? palette.redCell : palette.blueCell;
        ctx.strokeStyle = ctx.fillStyle;

        const radius = base * cell.size;
        const travel = Math.min(speed * STREAK_SECONDS * p.total, MAX_STREAK) * unit;
        if (travel > radius) {
            const tailS = Math.min(
                Math.max(cell.s - Math.sign(cell.velocity) * (travel / unit) / p.total, 0),
                1,
            );
            const [tx, ty, tnx, tny] = along(p, tailS);
            ctx.lineWidth = radius * 1.45;
            ctx.beginPath();
            ctx.moveTo(headX, headY);
            ctx.lineTo(ox + (tx + tnx * lateral) * unit, oy + (ty + tny * lateral) * unit);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(headX, headY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

function drawLabels(
    ctx: CanvasRenderingContext2D,
    sim: Circulation,
    discs: Map<ChamberName, Disc>,
    shorten: (y: number) => number,
    unit: number,
    ox: number,
    oy: number,
    palette: Palette,
): void {
    const px = (x: number) => ox + x * unit;
    const py = (y: number) => oy + y * unit;
    const size = Math.max(unit * 0.027, 10);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const names: [ChamberName, string, number][] = [
        ['ra', 'RA', 0.03], ['la', 'LA', 0.03], ['rv', 'RV', 0.05], ['lv', 'LV', 0.05],
    ];
    for (const [name, text, drop] of names) {
        const disc = discs.get(name);
        if (!disc) continue;
        const x = px(disc.cx);
        const y = py(disc.cy + drop);
        ctx.fillStyle = '#ffffff';
        ctx.font = font(size, 700);
        ctx.fillText(text, x, y);
        ctx.font = font(size * 0.76, 500);
        ctx.globalAlpha = 0.85;
        ctx.fillText(`${Math.round(sim.pressures[name])} mmHg`, x, y + size * 1.05);
        ctx.globalAlpha = 1;
    }

    // The two atrioventricular valves have clear space out to the sides.
    ctx.font = font(size * 0.72, 600);
    ctx.fillStyle = palette.inkMuted;
    ctx.fillText('Tricuspid', px(0.300 - 0.060 - 0.120), py(shorten(TRICUSPID_Y)));
    ctx.fillText('Mitral', px(0.690 + 0.058 + 0.120), py(shorten(MITRAL_Y)));

    // The outflow valves' names run up their own artery.
    ctx.font = font(size * 0.62, 600);
    ctx.fillStyle = '#ffffff';
    for (const [text, x, y, angle] of [
        ['Pulmonary', 0.436, 0.250, -1.36],
        ['Aortic', 0.562, 0.268, -1.44],
    ] as [string, number, number, number][]) {
        ctx.save();
        ctx.translate(px(x), py(y));
        ctx.rotate(angle);
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }

    // Where the blood comes from and goes to.
    ctx.font = font(size * 0.78, 500);
    ctx.fillStyle = palette.inkMuted;
    const routes: [string, number, number, CanvasTextAlign][] = [
        ['from body', 0.142, 0.052, 'right'],
        ['to lungs', 0.268, 0.052, 'center'],
        ['to body', 0.782, 0.058, 'left'],
        ['from lungs', 0.998, 0.136, 'right'],
    ];
    for (const [text, x, y, align] of routes) {
        ctx.textAlign = align;
        ctx.fillText(text, px(x), py(y));
    }
}

/**
 * The phase caption lives on the canvas rather than beside it, so it is painted
 * from the same state as the frame and cannot drift out of step with it.
 */
function drawCaption(
    ctx: CanvasRenderingContext2D,
    phase: Phase,
    width: number,
    top: number,
    height: number,
    palette: Palette,
): void {
    const left = 14;
    const available = width - left * 2;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = palette.ink;
    ctx.font = font(15, 700);
    ctx.fillText(phase.title, left, top + height * 0.3);

    ctx.fillStyle = palette.inkMuted;
    ctx.font = font(13);
    // Wrap by hand: canvas text does not.
    const words = phase.detail.split(' ');
    let line = '';
    let y = top + height * 0.62;
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width > available && line) {
            ctx.fillText(line, left, y);
            y += 16;
            line = word;
        } else {
            line = candidate;
        }
    }
    if (line) ctx.fillText(line, left, y);
}
