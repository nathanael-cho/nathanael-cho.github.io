/**
 * The shape of the heart, written in a 0..1 unit box.
 *
 * The view is the standard anterior cutaway: we are facing the patient, so the
 * patient's right heart is on the *left* of the picture and their left heart on
 * the right, and the apex — formed by the left ventricle — points down and to
 * the viewer's right. The front wall is cut away to show the four chambers,
 * which sit inside one continuous mass of muscle.
 *
 * Nothing here draws: it is the measurements only, shared by the blood
 * simulation in heartFluid.ts and the painting in heartDrawing.ts.
 */

import { ChamberName, Circulation, ValveName } from './heartModel';

/* ---------------------------------------------------------------------------
 * Geometry, in the unit box
 * ------------------------------------------------------------------------ */

/**
 * The atrioventricular groove is oblique, not level: the tricuspid ring sits
 * lower — more towards the apex — than the mitral one, and the base of the
 * muscle slopes between them. These are the two ring heights with the muscle
 * relaxed; both descend together as it contracts.
 */
export const TRICUSPID_Y = 0.430;
export const MITRAL_Y = 0.401;

/** The interventricular septum, which the ventricles squeeze against. */
export const SEPTUM_X = 0.48;

/** The tip of the heart, which barely moves; the base descends onto it. */
export const APEX_Y = 0.945;

/**
 * How much the ventricles shorten along their long axis at peak contraction.
 * A real heart ejects mostly by pulling its base down towards a nearly
 * stationary apex, and that descent is the most visible thing a beating heart
 * does.
 */
export const LONG_AXIS_SHORTENING = 0.055;

export interface ChamberGeometry {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    /** Tilt of the long axis, radians, clockwise on screen. */
    rotation: number;
    /** Volume at which the drawn size equals rx by ry. */
    vRef: number;
}

// Both ventricles are aimed at the apex rather than drawn upright: the left
// ventricle leans left as it descends, the right ventricle leans right across
// the front of it, which is what gives the pair their real relationship.
export const RA: ChamberGeometry = { cx: 0.268, cy: 0.268, rx: 0.086, ry: 0.078, rotation: 0, vRef: 55 };
export const LA: ChamberGeometry = { cx: 0.726, cy: 0.262, rx: 0.082, ry: 0.074, rotation: 0, vRef: 55 };
export const RV: ChamberGeometry = { cx: 0.338, cy: 0.628, rx: 0.098, ry: 0.190, rotation: -0.26, vRef: 130 };
export const LV: ChamberGeometry = { cx: 0.664, cy: 0.648, rx: 0.110, ry: 0.222, rotation: 0.15, vRef: 130 };

export interface ValveGeometry {
    x: number;
    y: number;
    /** Half the width of the valve ring. */
    hw: number;
    /** True when the blood leaves upward (the two outflow valves). */
    flip: boolean;
    label: string;
    /**
     * Where to stand the pressure-difference arrow, in unit-box x. Chosen to
     * land in clear ground: outside the muscle for the two inflow valves, and
     * in the gap between the two great arteries for the outflow ones.
     */
    arrowX: number;
}

export const VALVE_GEOMETRY: Record<ValveName, ValveGeometry> = {
    tricuspid: { x: 0.300, y: TRICUSPID_Y, hw: 0.060, flip: false, label: 'Tricuspid', arrowX: 0.180 },
    mitral: { x: 0.690, y: MITRAL_Y, hw: 0.058, flip: false, label: 'Mitral', arrowX: 0.812 },
    // A semilunar valve ring is the calibre of its artery, so these have to
    // stay just inside the widths of PULMONARY_TRUNK and AORTA below. The
    // pulmonary valve sits anterior and to the left of the aortic one.
    pulmonary: { x: 0.415, y: 0.352, hw: 0.030, flip: true, label: 'Pulmonary', arrowX: 0.479 },
    aortic: { x: 0.545, y: 0.374, hw: 0.030, flip: true, label: 'Aortic', arrowX: 0.606 },
};

export const VALVE_ORDER: ValveName[] = ['tricuspid', 'pulmonary', 'aortic', 'mitral'];

/** A tube of blood: a polyline plus how wide to draw it. */
/**
 * Blood in the great arteries never actually stops: the valve slams shut, but
 * the stretched artery keeps squeezing its contents onward through diastole.
 */
const aorticFlow = (s: Circulation): number => Math.max(s.valves.aortic.flow, s.flows.systemic);
const pulmonaryArteryFlow = (s: Circulation): number =>
    Math.max(s.valves.pulmonary.flow, s.flows.pulmonary);

/**
 * A tube of blood. One declaration serves both jobs: it is the shape drawn on
 * the canvas *and* the track its cells run along. They were once written out
 * twice, which is exactly how a vessel ends up moved in the picture but not
 * under the blood flowing through it.
 */
export interface Vessel {
    points: [number, number][];
    /** Drawn calibre, as a fraction of the unit box. */
    width: number;
    oxygenated: boolean;
    /** What drives the blood along it, mL/s. */
    flow: (sim: Circulation) => number;
    /** Wider pipe, slower drift for the same flow. */
    caliber: number;
    /** How many cells populate it. */
    cells: number;
    /**
     * Where the cells travel, when that is only part of the drawn tube. The
     * inferior vena cava is drawn the full height of the heart but passes
     * behind it, and cells on the hidden stretch would be painted over the
     * ventricles rather than covered by them.
     */
    cellPoints?: [number, number][];
}

/**
 * The venae cavae, which run behind the heart and are drawn before the muscle
 * so it covers where they pass behind it, and the pulmonary veins returning
 * into the back of the left atrium.
 */
export const BEHIND_VESSELS: Vessel[] = [
    {
        // Superior vena cava, descending on the patient's right.
        points: [[0.196, -0.06], [0.204, 0.055], [0.218, 0.145], [0.234, 0.226]],
        width: 0.046, oxygenated: false, caliber: 1.6, cells: 22,
        flow: (s) => s.flows.systemicVenous,
    },
    {
        // Inferior vena cava, climbing from the abdomen behind the heart.
        points: [[0.446, 1.10], [0.408, 0.940], [0.336, 0.700], [0.252, 0.404]],
        cellPoints: [[0.446, 1.12], [0.430, 1.030], [0.414, 0.952]],
        width: 0.042, oxygenated: false, caliber: 1.6, cells: 8,
        flow: (s) => s.flows.systemicVenous,
    },
    {
        // Right and left pulmonary veins into the left atrium.
        points: [[1.06, 0.170], [0.952, 0.196], [0.884, 0.222], [0.822, 0.244]],
        width: 0.032, oxygenated: true, caliber: 1.4, cells: 22,
        flow: (s) => s.flows.pulmonaryVenous,
    },
    {
        points: [[1.06, 0.372], [0.956, 0.358], [0.884, 0.330], [0.824, 0.300]],
        width: 0.028, oxygenated: true, caliber: 1.4, cells: 22,
        flow: (s) => s.flows.pulmonaryVenous,
    },
    {
        // The descending aorta, disappearing behind the left atrium.
        points: [[0.734, 0.150], [0.786, 0.250], [0.806, 0.350], [0.808, 0.430]],
        width: 0.054, oxygenated: true, caliber: 1.1, cells: 12, flow: aorticFlow,
    },
];

/** Short channels carrying blood from each ventricle up to its outflow valve. */
export const OUTFLOW_TRACTS: Vessel[] = [
    {
        points: [[0.352, 0.520], [0.386, 0.452], [0.415, 0.382]],
        width: 0.062, oxygenated: false, caliber: 1.0, cells: 10,
        flow: (s) => s.valves.pulmonary.flow,
    },
    {
        points: [[0.628, 0.520], [0.586, 0.452], [0.545, 0.394]],
        width: 0.062, oxygenated: true, caliber: 1.0, cells: 10,
        flow: (s) => s.valves.aortic.flow,
    },
];

/**
 * The aorta: up out of the left ventricle, arching over to the patient's left,
 * and giving off the three vessels that supply the head and arms.
 */
export const AORTA: Vessel = {
    points: [[0.545, 0.386], [0.552, 0.278], [0.566, 0.180], [0.620, 0.118], [0.690, 0.112], [0.734, 0.150]],
    width: 0.060, oxygenated: true, caliber: 1.0, cells: 20, flow: aorticFlow,
};

export const ARCH_BRANCHES: Vessel[] = [
    {
        points: [[0.588, 0.130], [0.578, 0.056], [0.572, -0.04]],
        width: 0.024, oxygenated: true, caliber: 1.3, cells: 10, flow: aorticFlow,
    },
    {
        points: [[0.638, 0.112], [0.634, 0.046], [0.632, -0.04]],
        width: 0.022, oxygenated: true, caliber: 1.3, cells: 10, flow: aorticFlow,
    },
    {
        points: [[0.688, 0.114], [0.694, 0.048], [0.698, -0.04]],
        width: 0.022, oxygenated: true, caliber: 1.3, cells: 10, flow: aorticFlow,
    },
];

/**
 * The pulmonary trunk, which leaves the right ventricle in front of the aorta,
 * crosses it, and divides into the two pulmonary arteries.
 */
export const PULMONARY_TRUNK: Vessel = {
    points: [[0.415, 0.362], [0.428, 0.280], [0.450, 0.212], [0.470, 0.164]],
    width: 0.058, oxygenated: false, caliber: 1.0, cells: 14, flow: pulmonaryArteryFlow,
};

export const PULMONARY_BRANCHES: Vessel[] = [
    {
        points: [[0.470, 0.164], [0.408, 0.126], [0.336, 0.100], [0.268, 0.092]],
        width: 0.036, oxygenated: false, caliber: 1.2, cells: 16, flow: pulmonaryArteryFlow,
    },
    {
        points: [[0.470, 0.164], [0.520, 0.120], [0.560, 0.074], [0.590, 0.030]],
        width: 0.034, oxygenated: false, caliber: 1.2, cells: 16, flow: pulmonaryArteryFlow,
    },
];

/** The coronary arteries, which run over the outside of the muscle. */
export const CORONARIES: [number, number][][] = [
    // Left anterior descending, in the groove between the two ventricles —
    // which is the septum's landmark on the surface.
    [[0.455, 0.400], [0.492, 0.560], [0.535, 0.720], [0.578, 0.858]],
    // Right coronary, round the groove between right atrium and ventricle.
    [[0.400, 0.412], [0.310, 0.448], [0.248, 0.505], [0.228, 0.585]],
    // Circumflex, round the same groove on the left-hand side.
    [[0.600, 0.404], [0.700, 0.428], [0.790, 0.470], [0.838, 0.548]],
];

/* ---------------------------------------------------------------------------
 * Blood in the pipes
 * ------------------------------------------------------------------------ */

/** Every vessel, in one list, so the blood has a single source of truth. */
export const ALL_VESSELS: Vessel[] = [
    ...BEHIND_VESSELS,
    ...OUTFLOW_TRACTS,
    AORTA,
    ...ARCH_BRANCHES,
    PULMONARY_TRUNK,
    ...PULMONARY_BRANCHES,
];

/** Largest radius a blood cell is drawn at, as a fraction of the unit box. */
export const MAX_CELL_RADIUS = 0.0087;

export interface VesselPath {
    points: [number, number][];
    /** Cumulative arc length, same length as `points`. */
    lengths: number[];
    total: number;
    caliber: number;
    /**
     * How far off the centreline a cell may sit. Derived from the vessel's own
     * calibre, less the room a cell needs for its own width, so a cell can no
     * longer be drawn hanging out of the tube carrying it.
     */
    spread: number;
    cells: number;
    oxygenated: boolean;
    flow: (sim: Circulation) => number;
}

function measure(points: [number, number][]): { lengths: number[]; total: number } {
    const lengths = [0];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
        lengths.push(total);
    }
    return { lengths, total };
}

export const VESSEL_PATHS: VesselPath[] = ALL_VESSELS.map((vessel) => {
    const points = vessel.cellPoints ?? vessel.points;
    return {
        points,
        ...measure(points),
        caliber: vessel.caliber,
        spread: Math.max((vessel.width / 2 - MAX_CELL_RADIUS) * 0.85, 0),
        cells: vessel.cells,
        oxygenated: vessel.oxygenated,
        flow: vessel.flow,
    };
});

/** Point and unit normal at arc-length fraction `s` along a path. */
export function along(p: VesselPath, s: number): [number, number, number, number] {
    const target = s * p.total;
    let i = 1;
    while (i < p.lengths.length - 1 && p.lengths[i] < target) i++;
    const segment = p.lengths[i] - p.lengths[i - 1] || 1;
    const f = (target - p.lengths[i - 1]) / segment;
    const [x0, y0] = p.points[i - 1];
    const [x1, y1] = p.points[i];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    return [x0 + dx * f, y0 + dy * f, -dy / len, dx / len];
}

/* ---------------------------------------------------------------------------
 * The chambers, as the blood sees them
 *
 * Each chamber's blood occupies the unit disc of an ellipse, so it follows the
 * wall automatically as that contracts. These specs say where that ellipse is
 * and where blood enters and leaves it; heartFluid.ts does the moving. Within
 * the disc the cells are carried by a source at the inlet, a sink at the
 * outlet and a matching spread term that
 * keeps the field divergence-free — which is what makes it transport blood
 * across the chamber rather than heap it at one end.
 * ------------------------------------------------------------------------ */

export interface ChamberSpec {
    chamber: ChamberName;
    geometry: ChamberGeometry;
    /** The ellipse the blood occupies, if it differs from the drawn cavity. */
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    rotation: number;
    /** Where blood arrives and leaves, in disc coordinates. */
    inlet: [number, number];
    outlet: [number, number];
    /** Signed flow into the chamber through each port, mL/s. */
    inletFlow: (s: Circulation) => number;
    outletFlow: (s: Circulation) => number;
    oxygenated: boolean;
    swirl: number;
    /** True for the ventricles, which ride the descending valve plane. */
    shortens: boolean;
    /** Cells per unit of volume^(2/3); tuned so all four look equally full. */
    cellsPerArea: number;
}

export const CHAMBER_SPECS: ChamberSpec[] = [
    {
        chamber: 'ra',
        geometry: RA,
        // Narrower and lower than the drawn dome: the atrium tapers into its
        // valve, so blood on the dome's full width would sit outside the funnel.
        cx: 0.272, cy: 0.300, rx: 0.050, ry: 0.086, rotation: 0,
        inlet: [-0.30, -0.62], outlet: [0.12, 0.84],
        inletFlow: (s) => s.flows.systemicVenous,
        outletFlow: (s) => s.valves.tricuspid.flow,
        oxygenated: false, swirl: -0.35, shortens: false, cellsPerArea: 3.6,
    },
    {
        chamber: 'la',
        geometry: LA,
        cx: 0.718, cy: 0.302, rx: 0.048, ry: 0.082, rotation: 0,
        inlet: [0.62, -0.30], outlet: [-0.10, 0.84],
        inletFlow: (s) => s.flows.pulmonaryVenous,
        outletFlow: (s) => s.valves.mitral.flow,
        oxygenated: true, swirl: 0.35, shortens: false, cellsPerArea: 3.6,
    },
    {
        chamber: 'rv',
        geometry: RV,
        cx: RV.cx, cy: RV.cy, rx: RV.rx, ry: RV.ry, rotation: RV.rotation,
        inlet: [-0.20, -0.84], outlet: [0.26, -0.66],
        inletFlow: (s) => s.valves.tricuspid.flow,
        outletFlow: (s) => s.valves.pulmonary.flow,
        oxygenated: false, swirl: -1, shortens: true, cellsPerArea: 4.0,
    },
    {
        chamber: 'lv',
        geometry: LV,
        cx: LV.cx, cy: LV.cy, rx: LV.rx, ry: LV.ry, rotation: LV.rotation,
        inlet: [0.26, -0.84], outlet: [-0.26, -0.64],
        inletFlow: (s) => s.valves.mitral.flow,
        outletFlow: (s) => s.valves.aortic.flow,
        oxygenated: true, swirl: 1, shortens: true, cellsPerArea: 4.6,
    },
];

/** The two chambers that have trabeculae and a descending valve plane. */
export type VentricleName = Extract<ChamberName, 'rv' | 'lv'>;

export interface Trabecula {
    u: number;
    v: number;
    angle: number;
    length: number;
}

/**
 * The inside of a ventricle is not smooth: it is lined with trabeculae carneae,
 * ridges of muscle that catch the light in every real photograph of a heart.
 * Laid out once, in disc coordinates, so they contract along with the wall.
 */
function makeTrabeculae(count: number): Trabecula[] {
    const list: Trabecula[] = [];
    for (let i = 0; i < count; i++) {
        const around = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const radius = 0.60 + Math.random() * 0.28;
        list.push({
            u: Math.cos(around) * radius,
            v: Math.sin(around) * radius,
            // Roughly tangential to the wall, with a little scatter.
            angle: around + Math.PI / 2 + (Math.random() - 0.5) * 0.9,
            length: 0.18 + Math.random() * 0.20,
        });
    }
    return list;
}

export const TRABECULAE: Record<VentricleName, Trabecula[]> = {
    rv: makeTrabeculae(15),
    lv: makeTrabeculae(17),
};

/** The moderator band: a cord of muscle that crosses the right ventricle. */
export const MODERATOR_BAND: [number, number][] = [[-0.52, 0.22], [-0.10, 0.44], [0.42, 0.46]];

/** Linear scale for a chamber drawn at `volume`, from the cube root of volume. */
export function chamberScale(volume: number, vRef: number): number {
    return Math.min(Math.max(Math.cbrt(Math.max(volume, 1) / vRef), 0.5), 1.5);
}

/** A chamber's cavity as drawn this frame. */
export interface Disc {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    rotation: number;
}

/** Map a point in a chamber's unit disc to the unit box. */
export function fromDisc(disc: Disc, u: number, v: number): [number, number] {
    const lx = u * disc.rx;
    const ly = v * disc.ry;
    const cos = Math.cos(disc.rotation);
    const sin = Math.sin(disc.rotation);
    return [disc.cx + lx * cos - ly * sin, disc.cy + lx * sin + ly * cos];
}
