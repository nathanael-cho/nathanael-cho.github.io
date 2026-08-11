import {
    DEFAULT_CONTROLS,
    HeartControls,
    Circulation,
    VALVE_NAMES,
} from './heartModel';

/** Beats to run before reading anything, so the loop reaches a steady state. */
const SETTLING_BEATS = 40;

const settled = new Map<string, Circulation>();

/** Run the model to steady state under `overrides`, memoised across tests. */
function steadyState(overrides: Partial<HeartControls> = {}): Circulation {
    const key = JSON.stringify(overrides);
    const cached = settled.get(key);
    if (cached) return cached;

    const sim = new Circulation({ ...DEFAULT_CONTROLS, ...overrides });
    for (let i = 0; i < SETTLING_BEATS; i++) sim.advance(sim.beatDuration);
    settled.set(key, sim);
    return sim;
}

jest.setTimeout(60000);

describe('conservation and stability', () => {
    test('blood volume is conserved', () => {
        const sim = new Circulation();
        const before = sim.totalVolume;
        for (let i = 0; i < 20; i++) sim.advance(sim.beatDuration);
        expect(sim.totalVolume).toBeCloseTo(before, 6);
    });

    test.each([
        ['maximum everything', { heartRate: 200, contractility: 2, systemicResistance: 1.6, aorticStenosis: 1, mitralRegurgitation: 1 }],
        ['minimum everything', { heartRate: 40, contractility: 0.3, systemicResistance: 0.5 }],
        ['stenosis and regurgitation together', { aorticStenosis: 1, mitralRegurgitation: 1 }],
    ])('stays finite and non-negative with %s', (_label, overrides: Partial<HeartControls>) => {
        const sim = steadyState(overrides);
        for (const volume of Object.values(sim.volumes)) {
            expect(Number.isFinite(volume)).toBe(true);
            expect(volume).toBeGreaterThan(0);
        }
        for (const pressure of Object.values(sim.pressures)) {
            expect(Number.isFinite(pressure)).toBe(true);
        }
        for (const name of VALVE_NAMES) {
            expect(sim.valves[name].opening).toBeGreaterThan(0);
            expect(sim.valves[name].opening).toBeLessThanOrEqual(1);
        }
    });
});

describe('a healthy heart at rest', () => {
    test('produces textbook vital signs', () => {
        const { metrics } = steadyState();
        expect(metrics.systolic).toBeGreaterThan(105);
        expect(metrics.systolic).toBeLessThan(135);
        expect(metrics.diastolic).toBeGreaterThan(60);
        expect(metrics.diastolic).toBeLessThan(90);
        expect(metrics.meanArterial).toBeGreaterThan(80);
        expect(metrics.meanArterial).toBeLessThan(105);
        expect(metrics.cardiacOutput).toBeGreaterThan(4.2);
        expect(metrics.cardiacOutput).toBeLessThan(6.5);
        expect(metrics.strokeVolume).toBeGreaterThan(55);
        expect(metrics.strokeVolume).toBeLessThan(90);
        expect(metrics.ejectionFraction).toBeGreaterThan(0.5);
        expect(metrics.ejectionFraction).toBeLessThan(0.72);
    });

    test('has competent valves and an unobstructed outflow', () => {
        const { metrics } = steadyState();
        // A healthy valve does leak a little as it swings shut — that closing
        // volume is what seals it — but only a few percent of the output.
        expect(metrics.regurgitantFraction).toBeLessThan(0.05);
        expect(metrics.aorticGradient).toBeLessThan(10);
    });

    test('keeps left atrial pressure out of the range that floods the lungs', () => {
        expect(steadyState().metrics.peakAtrialPressure).toBeLessThan(12);
    });
});

describe('valves open and close without being told to', () => {
    /**
     * Sample one full beat of the settled model. Cloning through a fresh
     * simulation would lose the steady state, so this walks the memoised one
     * forward and relies on it being periodic.
     */
    function sampleBeat(overrides: Partial<HeartControls> = {}, samples = 400) {
        const sim = steadyState(overrides);
        const dt = sim.beatDuration / samples;
        const frames = [];
        for (let i = 0; i < samples; i++) {
            frames.push({
                aorticFlow: sim.valves.aortic.flow,
                aorticOpening: sim.valves.aortic.opening,
                aorticGradient: sim.valves.aortic.gradient,
                mitralFlow: sim.valves.mitral.flow,
                mitralOpening: sim.valves.mitral.opening,
                lvVolume: sim.volumes.lv,
            });
            sim.advance(dt);
        }
        return frames;
    }

    test('the two left-heart valves are never open at the same time', () => {
        for (const frame of sampleBeat()) {
            const bothOpen = frame.aorticOpening > 0.5 && frame.mitralOpening > 0.5;
            expect(bothOpen).toBe(false);
        }
    });

    test('the aortic valve opens for ejection and reseals for filling', () => {
        const frames = sampleBeat();
        const ejecting = frames.filter((f) => f.aorticOpening > 0.5);
        const filling = frames.filter((f) => f.mitralOpening > 0.5);

        // Ejection occupies a minority of the beat; filling occupies more of it.
        expect(ejecting.length).toBeGreaterThan(frames.length * 0.1);
        expect(ejecting.length).toBeLessThan(frames.length * 0.45);
        expect(filling.length).toBeGreaterThan(frames.length * 0.3);

        // While a valve stands open the blood is overwhelmingly going the right
        // way through it. Small reversals are allowed only because that is how
        // the valve finds out it is time to shut.
        const meanEjection = ejecting.reduce((sum, f) => sum + f.aorticFlow, 0) / ejecting.length;
        expect(meanEjection).toBeGreaterThan(150);
        expect(Math.min(...ejecting.map((f) => f.aorticFlow))).toBeGreaterThan(-60);
        expect(Math.min(...filling.map((f) => f.mitralFlow))).toBeGreaterThan(-60);
    });

    test('nothing shuts a valve except the blood turning around', () => {
        const frames = sampleBeat();
        const closing = frames.findIndex(
            (f, i) => i > 0 && frames[i - 1].aorticOpening > 0.5 && f.aorticOpening <= 0.5,
        );
        expect(closing).toBeGreaterThan(0);

        // The pressure difference across the valve has already flipped against
        // it by the time it starts to shut. No signal, no muscle, no timer —
        // the ventricle simply stops pushing harder than the aorta pushes back.
        expect(frames[closing].aorticGradient).toBeLessThan(0);

        // And it was still positive while the valve was held open.
        const midEjection = frames
            .slice(0, closing)
            .filter((f) => f.aorticOpening > 0.9);
        expect(midEjection.length).toBeGreaterThan(0);
        expect(Math.max(...midEjection.map((f) => f.aorticGradient))).toBeGreaterThan(0);
    });

    test('there are isovolumic phases, with every valve shut', () => {
        const frames = sampleBeat();
        const sealed = frames.filter((f) => f.aorticOpening < 0.1 && f.mitralOpening < 0.1);
        // Both valves shut simultaneously for a real span of the beat: this is
        // the interval where the muscle builds pressure against a closed box.
        expect(sealed.length).toBeGreaterThan(frames.length * 0.05);
    });
});

describe('the circulation responds the way a real one does', () => {
    test('a faster heart trades stroke volume for rate', () => {
        const rest = steadyState().metrics;
        const fast = steadyState({ heartRate: 150 }).metrics;
        expect(fast.strokeVolume).toBeLessThan(rest.strokeVolume);
        expect(fast.endDiastolicVolume).toBeLessThan(rest.endDiastolicVolume);
    });

    test('a slower heart fills more and ejects more per beat', () => {
        const rest = steadyState().metrics;
        const slow = steadyState({ heartRate: 45 }).metrics;
        expect(slow.strokeVolume).toBeGreaterThan(rest.strokeVolume);
        expect(slow.endDiastolicVolume).toBeGreaterThan(rest.endDiastolicVolume);
    });

    test('a weak ventricle dilates, ejects a smaller fraction, and drops pressure', () => {
        const rest = steadyState().metrics;
        const weak = steadyState({ contractility: 0.4 }).metrics;
        expect(weak.ejectionFraction).toBeLessThan(rest.ejectionFraction);
        expect(weak.endDiastolicVolume).toBeGreaterThan(rest.endDiastolicVolume);
        expect(weak.meanArterial).toBeLessThan(rest.meanArterial);
        expect(weak.cardiacOutput).toBeLessThan(rest.cardiacOutput);
    });

    test('raising afterload raises pressure and lowers output', () => {
        const rest = steadyState().metrics;
        const tight = steadyState({ systemicResistance: 1.6 }).metrics;
        expect(tight.meanArterial).toBeGreaterThan(rest.meanArterial);
        expect(tight.cardiacOutput).toBeLessThan(rest.cardiacOutput);
        expect(tight.ejectionFraction).toBeLessThan(rest.ejectionFraction);
    });
});

describe('diseased valves', () => {
    test('a stenotic aortic valve cannot open and builds a large gradient', () => {
        const rest = steadyState().metrics;
        const severe = steadyState({ aorticStenosis: 1 });
        expect(severe.metrics.aorticGradient).toBeGreaterThan(40);
        expect(severe.metrics.aorticGradient).toBeGreaterThan(rest.aorticGradient * 5);
        // The orifice itself is what is limited, so the leaflets never fully part.
        expect(severe.valves.aortic.opening).toBeLessThanOrEqual(0.21);
    });

    test('a regurgitant mitral valve sends blood backwards and floods the atrium', () => {
        const rest = steadyState().metrics;
        const leaky = steadyState({ mitralRegurgitation: 1 }).metrics;
        expect(leaky.regurgitantFraction).toBeGreaterThan(0.4);
        expect(leaky.peakAtrialPressure).toBeGreaterThan(rest.peakAtrialPressure + 4);
        // Less of each beat reaches the body even though the ventricle moves more.
        expect(leaky.cardiacOutput).toBeLessThan(rest.cardiacOutput);
    });

    test('regurgitation flatters ejection fraction while starving the body', () => {
        // The classic bedside trap: the ventricle empties beautifully, because
        // half of what it empties goes the wrong way into a low-pressure atrium.
        const rest = steadyState().metrics;
        const leaky = steadyState({ mitralRegurgitation: 1 }).metrics;
        expect(leaky.ejectionFraction).toBeGreaterThan(rest.ejectionFraction);
        expect(leaky.strokeVolume).toBeLessThan(rest.strokeVolume);
    });
});
