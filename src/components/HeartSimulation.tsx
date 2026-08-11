import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    Group,
    Paper,
    SegmentedControl,
    Text,
    useComputedColorScheme,
} from '@mantine/core';
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';

import { Circulation } from './heartModel';
import {
    advanceFluid,
    createFluid,
    describePhase,
    drawHeart,
    heartPalette,
} from './heartDrawing';

/** Simulated seconds per integration chunk between fluid updates. */
const CHUNK = 0.004;

/** Real seconds of catch-up allowed after a stall, so a backgrounded tab does
 *  not come back and integrate a minute of heartbeats in one frame. */
const MAX_FRAME = 0.05;

export default function HeartSimulation(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Lazy initialisers, so the model and its blood survive every re-render.
    const [sim] = useState(() => new Circulation());
    const [fluid] = useState(createFluid);

    const [running, setRunning] = useState(true);
    const [speed, setSpeed] = useState('1');

    // The animation loop reads these instead of the state itself, so that
    // changing either does not tear the loop down and restart it. Mirroring in
    // an effect rather than during render keeps the render pure.
    const runningRef = useRef(running);
    const speedRef = useRef(1);
    useEffect(() => {
        runningRef.current = running;
        speedRef.current = Number(speed);
    }, [running, speed]);

    const colorScheme = useComputedColorScheme('light');
    const isDark = colorScheme === 'dark';

    const toggleRunning = useCallback(() => setRunning((value) => !value), []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = canvas?.parentElement;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const palette = heartPalette(isDark);
        let width = 0;
        let height = 0;

        const resize = (): void => {
            const cssWidth = Math.max(container.clientWidth, 1);
            const cssHeight = Math.round(Math.min(Math.max(cssWidth * 0.78, 360), 700));
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round(cssWidth * dpr);
            canvas.height = Math.round(cssHeight * dpr);
            canvas.style.width = '100%';
            canvas.style.height = `${cssHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            width = cssWidth;
            height = cssHeight;
        };
        resize();

        // Deferring the re-fit dodges the benign "ResizeObserver loop completed
        // with undelivered notifications" warning that the dev overlay treats
        // as an error.
        let resizeFrame = 0;
        const observer = new ResizeObserver(() => {
            if (resizeFrame) cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(resize);
        });
        observer.observe(container);

        let frame = 0;
        let last = performance.now();
        let elapsed = 0;
        let previousLv = sim.pressures.lv;
        let rising = true;

        const tick = (now: number): void => {
            const wall = Math.min((now - last) / 1000, MAX_FRAME);
            last = now;

            if (runningRef.current) {
                let remaining = wall * speedRef.current;
                while (remaining > 1e-6) {
                    const step = Math.min(remaining, CHUNK);
                    sim.advance(step);
                    advanceFluid(fluid, sim, step);
                    elapsed += step;
                    remaining -= step;
                }
                rising = sim.pressures.lv >= previousLv;
                previousLv = sim.pressures.lv;
            }

            // Worked out here and painted in the same frame, so the caption
            // always describes the picture beside it.
            const phase = describePhase(sim, rising);
            drawHeart(ctx, width, height, sim, fluid, elapsed, phase, palette);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(frame);
            if (resizeFrame) cancelAnimationFrame(resizeFrame);
            observer.disconnect();
        };
        // `sim` and `fluid` come from lazy state initialisers, so their identity
        // never changes; only a colour-scheme flip restarts the loop.
    }, [isDark, sim, fluid]);

    return (
        <Paper withBorder radius="md" p="sm">
            <Box>
                <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 8 }} />
            </Box>

            <Group justify="space-between" align="flex-end" mt="xs" px="xs" gap="sm">
                <Text size="xs" c="dimmed" style={{ flex: 1, minWidth: 220 }}>
                    The arrow beside each valve is the pressure difference across it, in mmHg. Nothing
                    opens or shuts a valve except that arrow: when it flips, the blood turns around and
                    pushes the leaflets closed.
                </Text>
                <Group gap="xs" wrap="nowrap">
                    <Button
                        size="xs"
                        variant="light"
                        leftSection={running ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
                        onClick={toggleRunning}
                    >
                        {running ? 'Pause' : 'Play'}
                    </Button>
                    <SegmentedControl
                        size="xs"
                        value={speed}
                        onChange={setSpeed}
                        data={[
                            { label: '1×', value: '1' },
                            { label: '½×', value: '0.5' },
                            { label: '¼×', value: '0.25' },
                        ]}
                    />
                </Group>
            </Group>
        </Paper>
    );
}
