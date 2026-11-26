import { useEffect, useRef } from 'react';

// What falls: zeros and ones, and the suite's own words.
const WORDS = [
    '0',
    '1',
    '0',
    '1',
    '1',
    '0',
    'LLM01',
    'CANARY',
    '7F3A',
    'HELD',
    'BREACH',
    'INJECT',
    'TOOL',
    'FILTER',
    '0',
    '1',
];
const STEP = 16;

interface Column {
    y: number;
    speed: number;
    word: string;
    i: number;
}

const pick = (): string =>
    WORDS[Math.floor(Math.random() * WORDS.length)] ?? '0';

/**
 * The code rain: decoration in its own band, never behind text and
 * hidden from screen readers. Under reduced motion it is drawn once
 * and stands still. It stops while the tab is hidden.
 */
export function Rain() {
    const canvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const element = canvas.current;
        const context = element?.getContext('2d');

        if (element === null || context === null || context === undefined) {
            return;
        }

        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        let columns: Column[] = [];
        let width = 0;
        let height = 0;
        let frame = 0;
        let last = 0;

        const size = () => {
            const box = element.getBoundingClientRect();
            const ratio = Math.min(2, devicePixelRatio || 1);

            width = box.width;
            height = box.height;
            element.width = width * ratio;
            element.height = height * ratio;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            columns = Array.from({ length: Math.ceil(width / STEP) }, () => ({
                y: Math.random() * height,
                speed: 0.6 + Math.random() * 1.6,
                word: pick(),
                i: 0,
            }));

            if (still) {
                for (let n = 0; n < 40; n += 1) {
                    draw();
                }
            }
        };

        const draw = () => {
            context.fillStyle = 'rgba(5, 10, 7, 0.16)';
            context.fillRect(0, 0, width, height);
            context.font = '500 13px "JetBrains Mono", monospace';

            columns.forEach((column, x) => {
                context.fillStyle = column.i % 9 === 0 ? '#d6f7df' : '#39e66b';
                context.fillText(
                    column.word[column.i % column.word.length] ?? '0',
                    x * STEP + 2,
                    column.y,
                );
                column.y += column.speed * 6;
                column.i += 1;

                if (column.y > height + 20) {
                    column.y = -10;
                    column.word = pick();
                    column.i = 0;
                }
            });
        };

        const loop = (time: number) => {
            if (time - last > 70 && !document.hidden) {
                draw();
                last = time;
            }

            frame = requestAnimationFrame(loop);
        };

        size();
        addEventListener('resize', size);

        if (!still) {
            frame = requestAnimationFrame(loop);
        }

        return () => {
            removeEventListener('resize', size);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div className="rain" aria-hidden="true">
            <canvas ref={canvas} />
        </div>
    );
}
