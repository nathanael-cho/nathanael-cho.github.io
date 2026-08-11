/**
 * A closed-loop lumped-parameter model of the human circulation.
 *
 * The circuit is a ring of eight elastic compartments:
 *
 *   RA -> RV -> pulmonary arteries -> pulmonary veins ->
 *   LA -> LV -> systemic arteries  -> systemic veins   -> back to RA
 *
 * The four chambers are *active*: their elastance E(t) is driven up and down
 * by the muscle, which is what pumps. The four valves are *passive*: nothing
 * actuates them, and each one's opening is an ordinary differential equation
 * driven by the pressure difference the flow itself creates.
 *
 * Units are the ones clinicians actually use: pressure in mmHg, volume in mL,
 * time in seconds. Flow is therefore mL/s, compliance mL/mmHg, elastance
 * mmHg/mL, resistance mmHg*s/mL and inertance mmHg*s^2/mL.
 */

export type ChamberName = 'la' | 'lv' | 'ra' | 'rv';
export type VesselName = 'sa' | 'sv' | 'pa' | 'pv';
export type CompartmentName = ChamberName | VesselName;
export type ValveName = 'mitral' | 'aortic' | 'tricuspid' | 'pulmonary';

export type Volumes = Record<CompartmentName, number>;
export type Pressures = Record<CompartmentName, number>;

export interface ValveState {
    /** Geometric opening: 0 is sealed, 1 is the full healthy orifice. */
    opening: number;
    /** Flow through the orifice in mL/s; negative means regurgitation. */
    flow: number;
    /** Pressure difference across the valve in mmHg (upstream - downstream). */
    gradient: number;
}

/** Everything a reader is allowed to fiddle with from the UI. */
export interface HeartControls {
    /** Beats per minute. */
    heartRate: number;
    /** Multiplier on ventricular contractility (peak elastance). 1 is normal. */
    contractility: number;
    /** Multiplier on systemic vascular resistance (afterload). 1 is normal. */
    systemicResistance: number;
    /** 0 is a normal aortic valve, 1 is critical stenosis (a narrowed orifice). */
    aorticStenosis: number;
    /** 0 is a competent mitral valve, 1 is severe regurgitation (it cannot seal). */
    mitralRegurgitation: number;
}

export const DEFAULT_CONTROLS: HeartControls = {
    heartRate: 75,
    contractility: 1,
    systemicResistance: 1,
    aorticStenosis: 0,
    mitralRegurgitation: 0,
};

/** Summary numbers recomputed once per completed beat. */
export interface BeatMetrics {
    /** Peak and trough aortic pressure, i.e. the blood pressure cuff reading. */
    systolic: number;
    diastolic: number;
    /** Time-averaged aortic pressure. */
    meanArterial: number;
    /** Net volume delivered to the aorta per beat, mL. */
    strokeVolume: number;
    /** Stroke volume times heart rate, L/min. */
    cardiacOutput: number;
    /** Fraction of the filled left ventricle ejected per beat, 0-1. */
    ejectionFraction: number;
    endDiastolicVolume: number;
    endSystolicVolume: number;
    /** Mean pressure drop across the aortic valve while it is ejecting, mmHg. */
    aorticGradient: number;
    /** Backward mitral volume as a fraction of total left ventricular output. */
    regurgitantFraction: number;
    /** Peak left atrial pressure, mmHg: the number that makes lungs wet. */
    peakAtrialPressure: number;
}

/* ---------------------------------------------------------------------------
 * Fixed model parameters
 * ------------------------------------------------------------------------ */

interface ChamberParams {
    /** Peak (end-systolic) elastance, mmHg/mL. */
    eMax: number;
    /** Resting (end-diastolic) elastance, mmHg/mL. */
    eMin: number;
    /** Unstressed volume: the volume at which the chamber generates no pressure. */
    v0: number;
    /**
     * Internal source resistance, s/mL. Contracting muscle generates less
     * pressure the faster it is allowed to shorten, so a chamber that is
     * ejecting hard develops less pressure than its elastance alone predicts.
     * Without this term the ventricle would dump its whole stroke volume the
     * instant the valve cracked open.
     */
    sourceResistance: number;
}

const CHAMBERS: Record<ChamberName, ChamberParams> = {
    lv: { eMax: 3.4, eMin: 0.05, v0: 10, sourceResistance: 9e-4 },
    rv: { eMax: 0.72, eMin: 0.035, v0: 10, sourceResistance: 9e-4 },
    la: { eMax: 0.3, eMin: 0.16, v0: 15, sourceResistance: 0 },
    ra: { eMax: 0.22, eMin: 0.12, v0: 15, sourceResistance: 0 },
};

interface VesselParams {
    /** Compliance, mL/mmHg. */
    c: number;
    /** Unstressed volume, mL. */
    v0: number;
}

const VESSELS: Record<VesselName, VesselParams> = {
    sa: { c: 1.3, v0: 700 },
    sv: { c: 70, v0: 2700 },
    pa: { c: 4.5, v0: 90 },
    pv: { c: 10, v0: 150 },
};

/** Resistances of the non-valve segments, mmHg*s/mL. */
const RESISTANCE = {
    /** Systemic arterioles and capillaries: the great majority of afterload. */
    systemic: 1.0,
    /** Systemic veins returning to the right atrium. */
    systemicVenous: 0.04,
    /** Pulmonary capillary bed. */
    pulmonary: 0.08,
    /** Pulmonary veins returning to the left atrium. */
    pulmonaryVenous: 0.02,
};

interface ValveParams {
    /** Resistance of the fully open orifice, mmHg*s/mL. */
    r: number;
    /** Inertance of the blood column in the orifice, mmHg*s^2/mL. */
    l: number;
    /** Opening rate constant, 1/(s*mmHg). */
    kOpen: number;
    /** Closing rate constant, 1/(s*mmHg). */
    kClose: number;
    upstream: CompartmentName;
    downstream: CompartmentName;
}

const VALVES: Record<ValveName, ValveParams> = {
    tricuspid: { r: 0.004, l: 1.0e-4, kOpen: 12, kClose: 45, upstream: 'ra', downstream: 'rv' },
    pulmonary: { r: 0.006, l: 1.8e-4, kOpen: 8, kClose: 20, upstream: 'rv', downstream: 'pa' },
    mitral: { r: 0.005, l: 1.0e-4, kOpen: 10, kClose: 40, upstream: 'la', downstream: 'lv' },
    aortic: { r: 0.008, l: 2.2e-4, kOpen: 6, kClose: 16, upstream: 'lv', downstream: 'sa' },
};

export const VALVE_NAMES: ValveName[] = ['tricuspid', 'pulmonary', 'mitral', 'aortic'];

/**
 * Even a "sealed" valve is not a perfect wall, and pretending it is would make
 * the flow equation infinitely stiff. This is the residual orifice fraction of
 * a healthy closed valve; the leak it permits is well under 1 mL per beat.
 */
const SEALED_OPENING = 0.01;

/** Residual orifice of a severely regurgitant valve — it cannot close further. */
const SEVERE_LEAK = 0.15;

/** Orifice of a critically stenotic valve — it cannot open further. */
const CRITICAL_STENOSIS = 0.2;

/** Delay from the onset of atrial contraction to the onset of ventricular
 *  contraction: the PR interval on an ECG, in seconds. */
const PR_INTERVAL = 0.16;

/** Duration of atrial contraction, seconds. */
const ATRIAL_SYSTOLE = 0.15;

/** Fixed integration step, seconds. */
const DT = 5e-5;

/* ---------------------------------------------------------------------------
 * Muscle activation
 * ------------------------------------------------------------------------ */

/**
 * Normalised activation e(t) in [0, 1]: a raised-cosine rise followed by a
 * raised-cosine fall, and zero the rest of the beat. `start` may sit near the
 * end of the beat, in which case the window wraps around.
 */
function activation(t: number, beat: number, start: number, rise: number, fall: number): number {
    let dt = t - start;
    if (dt < 0) dt += beat;
    if (dt < rise) return 0.5 * (1 - Math.cos((Math.PI * dt) / rise));
    if (dt < rise + fall) return 0.5 * (1 + Math.cos((Math.PI * (dt - rise)) / fall));
    return 0;
}

/**
 * Duration of ventricular systole. Systole shortens as the heart speeds up,
 * but far less than diastole does, so at high rates it occupies a much larger
 * share of the beat — which is why filling time is what runs out first.
 */
function systoleDuration(beat: number): number {
    return Math.min(0.1 + 0.25 * beat, 0.7 * beat);
}

/* ---------------------------------------------------------------------------
 * The simulation
 * ------------------------------------------------------------------------ */

/** Running totals for the beat currently in progress. */
interface BeatAccumulator {
    forwardAortic: number;
    backwardMitral: number;
    forwardMitral: number;
    pressureIntegral: number;
    duration: number;
    systolicPeak: number;
    diastolicTrough: number;
    gradientIntegral: number;
    ejectionTime: number;
    peakAtrial: number;
    maxLv: number;
    minLv: number;
}

function emptyAccumulator(): BeatAccumulator {
    return {
        forwardAortic: 0,
        backwardMitral: 0,
        forwardMitral: 0,
        pressureIntegral: 0,
        duration: 0,
        systolicPeak: -Infinity,
        diastolicTrough: Infinity,
        gradientIntegral: 0,
        ejectionTime: 0,
        peakAtrial: -Infinity,
        maxLv: -Infinity,
        minLv: Infinity,
    };
}

/**
 * Starting volumes: the model's own steady state at rest, sampled at the top of
 * a beat. The total (about 4.7 L, the part of an adult's blood that this circuit
 * accounts for) is what sets preload, and it never changes afterwards. Starting
 * here rather than at a guess means the very first beat drawn is already a real
 * one instead of a settling transient.
 */
const INITIAL_VOLUMES: Volumes = {
    lv: 129.7,
    rv: 120.6,
    la: 42.6,
    ra: 38.9,
    sa: 799.2,
    sv: 3208.1,
    pa: 134.4,
    pv: 216.5,
};

/** The beat those volumes came from, so the readouts are honest before the
 *  first simulated beat finishes. */
const INITIAL_METRICS: BeatMetrics = {
    systolic: 118.6,
    diastolic: 74.1,
    meanArterial: 95.2,
    strokeVolume: 71.5,
    cardiacOutput: 5.37,
    ejectionFraction: 0.557,
    endDiastolicVolume: 130.4,
    endSystolicVolume: 57.8,
    aorticGradient: 4.8,
    regurgitantFraction: 0.017,
    peakAtrialPressure: 7.4,
};

export class Circulation {
    controls: HeartControls;

    /** Seconds elapsed since the start of the current beat. */
    time = 0;
    /** Beats completed since the simulation started. */
    beatCount = 0;

    readonly volumes: Volumes = { ...INITIAL_VOLUMES };
    readonly pressures: Pressures = {
        la: 0, lv: 0, ra: 0, rv: 0, sa: 0, sv: 0, pa: 0, pv: 0,
    };
    readonly valves: Record<ValveName, ValveState> = {
        tricuspid: { opening: SEALED_OPENING, flow: 0, gradient: 0 },
        pulmonary: { opening: SEALED_OPENING, flow: 0, gradient: 0 },
        mitral: { opening: SEALED_OPENING, flow: 0, gradient: 0 },
        aortic: { opening: SEALED_OPENING, flow: 0, gradient: 0 },
    };

    /** Normalised muscle activation, exposed so the UI can draw the ECG-ish timing. */
    atrialActivation = 0;
    ventricularActivation = 0;

    /**
     * Flows through the segments that have no valve, mL/s. Only the drawing
     * code needs these; the model itself recomputes them each step.
     */
    readonly flows = {
        /** Systemic arteries through the capillary bed into the systemic veins. */
        systemic: 0,
        /** Systemic veins into the right atrium. */
        systemicVenous: 0,
        /** Pulmonary arteries through the lungs into the pulmonary veins. */
        pulmonary: 0,
        /** Pulmonary veins into the left atrium. */
        pulmonaryVenous: 0,
    };

    metrics: BeatMetrics = { ...INITIAL_METRICS };

    private accumulator = emptyAccumulator();

    constructor(controls: HeartControls = DEFAULT_CONTROLS) {
        this.controls = { ...controls };
        this.updatePressures();
    }

    /** Total blood volume in the model. Constant to within rounding — a useful check. */
    get totalVolume(): number {
        const v = this.volumes;
        return v.la + v.lv + v.ra + v.rv + v.sa + v.sv + v.pa + v.pv;
    }

    get beatDuration(): number {
        return 60 / this.controls.heartRate;
    }

    reset(): void {
        Object.assign(this.volumes, INITIAL_VOLUMES);
        for (const name of VALVE_NAMES) {
            this.valves[name].opening = SEALED_OPENING;
            this.valves[name].flow = 0;
            this.valves[name].gradient = 0;
        }
        this.time = 0;
        this.beatCount = 0;
        this.metrics = { ...INITIAL_METRICS };
        this.accumulator = emptyAccumulator();
        this.updatePressures();
    }

    /** Advance the model by `seconds` of simulated time. */
    advance(seconds: number): void {
        const steps = Math.round(seconds / DT);
        for (let i = 0; i < steps; i++) this.step();
    }

    private chamberElastance(name: ChamberName): number {
        const p = CHAMBERS[name];
        const isVentricle = name === 'lv' || name === 'rv';
        const e = isVentricle ? this.ventricularActivation : this.atrialActivation;
        const eMax = isVentricle ? p.eMax * this.controls.contractility : p.eMax;
        return p.eMin + (eMax - p.eMin) * e;
    }

    /**
     * Pressure developed by a chamber: its elastance times its stretch, derated
     * by how fast it is currently being allowed to empty. `ejection` is the net
     * outflow in mL/s; only positive (shortening) values derate.
     */
    private chamberPressure(name: ChamberName, ejection: number): number {
        const p = CHAMBERS[name];
        const developed = this.chamberElastance(name) * (this.volumes[name] - p.v0);
        if (ejection <= 0 || p.sourceResistance === 0) return developed;
        return developed * Math.max(1 - p.sourceResistance * ejection, 0.15);
    }

    private updatePressures(): void {
        const beat = this.beatDuration;
        const systole = systoleDuration(beat);
        this.ventricularActivation = activation(this.time, beat, 0, systole * 0.45, systole * 0.55);
        this.atrialActivation = activation(
            this.time,
            beat,
            (beat - PR_INTERVAL + beat) % beat,
            ATRIAL_SYSTOLE * 0.5,
            ATRIAL_SYSTOLE * 0.5,
        );

        const p = this.pressures;
        const v = this.volumes;
        p.lv = this.chamberPressure('lv', this.valves.aortic.flow - this.valves.mitral.flow);
        p.rv = this.chamberPressure('rv', this.valves.pulmonary.flow - this.valves.tricuspid.flow);
        p.la = this.chamberPressure('la', 0);
        p.ra = this.chamberPressure('ra', 0);
        p.sa = (v.sa - VESSELS.sa.v0) / VESSELS.sa.c;
        p.sv = (v.sv - VESSELS.sv.v0) / VESSELS.sv.c;
        p.pa = (v.pa - VESSELS.pa.v0) / VESSELS.pa.c;
        p.pv = (v.pv - VESSELS.pv.v0) / VESSELS.pv.c;
    }

    /** The opening range a valve is mechanically able to reach, given its pathology. */
    private openingLimits(name: ValveName): [min: number, max: number] {
        const { aorticStenosis, mitralRegurgitation } = this.controls;
        if (name === 'aortic') {
            return [SEALED_OPENING, 1 - aorticStenosis * (1 - CRITICAL_STENOSIS)];
        }
        if (name === 'mitral') {
            return [SEALED_OPENING + mitralRegurgitation * (SEVERE_LEAK - SEALED_OPENING), 1];
        }
        return [SEALED_OPENING, 1];
    }

    private step(): void {
        this.updatePressures();
        const p = this.pressures;

        // Passive valve dynamics. Each valve is its own little ODE: the pressure
        // difference across it decides whether it is being pushed open or pushed
        // shut, and the momentum of the blood already moving through it decides
        // how fast the flow can change.
        for (const name of VALVE_NAMES) {
            const params = VALVES[name];
            const valve = this.valves[name];
            const gradient = p[params.upstream] - p[params.downstream];
            valve.gradient = gradient;

            const [minOpen, maxOpen] = this.openingLimits(name);
            const rate =
                gradient >= 0
                    ? params.kOpen * (1 - valve.opening) * gradient
                    : params.kClose * valve.opening * gradient;
            let opening = valve.opening + rate * DT;
            if (opening < minOpen) opening = minOpen;
            else if (opening > maxOpen) opening = maxOpen;
            valve.opening = opening;

            // A narrower orifice is both more resistive (as 1/area^2, since the
            // blood must accelerate through it) and less inertial (as 1/area).
            const r = params.r / (opening * opening);
            const l = params.l / opening;
            // Treat the resistive term implicitly. It is stiff when the valve is
            // nearly shut, and doing it this way keeps the step unconditionally
            // stable instead of forcing a much smaller DT.
            valve.flow = (valve.flow + (DT * gradient) / l) / (1 + (DT * r) / l);
        }

        // Purely resistive segments: the vascular beds and the veins.
        const rSystemic = RESISTANCE.systemic * this.controls.systemicResistance;
        const qSystemic = (p.sa - p.sv) / rSystemic;
        const qSystemicVenous = (p.sv - p.ra) / RESISTANCE.systemicVenous;
        const qPulmonary = (p.pa - p.pv) / RESISTANCE.pulmonary;
        const qPulmonaryVenous = (p.pv - p.la) / RESISTANCE.pulmonaryVenous;
        this.flows.systemic = qSystemic;
        this.flows.systemicVenous = qSystemicVenous;
        this.flows.pulmonary = qPulmonary;
        this.flows.pulmonaryVenous = qPulmonaryVenous;

        const { tricuspid, pulmonary, mitral, aortic } = this.valves;
        const v = this.volumes;
        v.ra += (qSystemicVenous - tricuspid.flow) * DT;
        v.rv += (tricuspid.flow - pulmonary.flow) * DT;
        v.pa += (pulmonary.flow - qPulmonary) * DT;
        v.pv += (qPulmonary - qPulmonaryVenous) * DT;
        v.la += (qPulmonaryVenous - mitral.flow) * DT;
        v.lv += (mitral.flow - aortic.flow) * DT;
        v.sa += (aortic.flow - qSystemic) * DT;
        v.sv += (qSystemic - qSystemicVenous) * DT;

        this.accumulate();

        this.time += DT;
        if (this.time >= this.beatDuration) {
            this.time -= this.beatDuration;
            this.beatCount++;
            this.closeOutBeat();
        }
    }

    private accumulate(): void {
        const a = this.accumulator;
        const p = this.pressures;
        const { aortic, mitral } = this.valves;

        if (aortic.flow > 0) {
            a.forwardAortic += aortic.flow * DT;
            // Only average the gradient while blood is actually crossing the
            // valve. Outside ejection the two sides are decoupled and their
            // pressure difference says nothing about the orifice.
            a.gradientIntegral += aortic.gradient * DT;
            a.ejectionTime += DT;
        }
        if (mitral.flow > 0) a.forwardMitral += mitral.flow * DT;
        else a.backwardMitral -= mitral.flow * DT;

        a.pressureIntegral += p.sa * DT;
        a.duration += DT;
        if (p.sa > a.systolicPeak) a.systolicPeak = p.sa;
        if (p.sa < a.diastolicTrough) a.diastolicTrough = p.sa;
        if (p.la > a.peakAtrial) a.peakAtrial = p.la;
        if (this.volumes.lv > a.maxLv) a.maxLv = this.volumes.lv;
        if (this.volumes.lv < a.minLv) a.minLv = this.volumes.lv;
    }

    private closeOutBeat(): void {
        const a = this.accumulator;
        // Net forward delivery to the body, which is what "stroke volume" means
        // clinically. With a leaking mitral valve the ventricle moves more blood
        // than this; the difference sloshes back into the atrium.
        const strokeVolume = a.forwardAortic;
        const totalOutput = a.forwardAortic + a.backwardMitral;
        this.metrics = {
            systolic: a.systolicPeak,
            diastolic: a.diastolicTrough,
            meanArterial: a.pressureIntegral / a.duration,
            strokeVolume,
            cardiacOutput: (strokeVolume * this.controls.heartRate) / 1000,
            ejectionFraction: a.maxLv > 0 ? (a.maxLv - a.minLv) / a.maxLv : 0,
            endDiastolicVolume: a.maxLv,
            endSystolicVolume: a.minLv,
            aorticGradient: a.ejectionTime > 0 ? a.gradientIntegral / a.ejectionTime : 0,
            regurgitantFraction: totalOutput > 0 ? a.backwardMitral / totalOutput : 0,
            peakAtrialPressure: a.peakAtrial,
        };
        this.accumulator = emptyAccumulator();
    }
}
