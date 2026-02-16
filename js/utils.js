/**
 * Shared utilities & configuration
 */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const rand = (lo, hi) => Math.random() * (hi - lo) + lo;
const randI = (lo, hi) => Math.floor(rand(lo, hi + 1));
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const smoothstep = t => t * t * (3 - 2 * t);
const isTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const PRIDE = [
    { r: 255, g: 45,  b: 85  },
    { r: 255, g: 140, b: 0   },
    { r: 255, g: 214, b: 10  },
    { r: 48,  g: 209, b: 88  },
    { r: 0,   g: 199, b: 190 },
    { r: 10,  g: 132, b: 255 },
    { r: 94,  g: 92,  b: 230 },
    { r: 191, g: 90,  b: 242 },
];

function prideColor(idx, offset = 0) {
    const len = PRIDE.length;
    const ci = ((idx + offset) % len + len) % len;
    const a = PRIDE[Math.floor(ci)];
    const b = PRIDE[Math.ceil(ci) % len];
    const t = ci % 1;
    return {
        r: Math.round(lerp(a.r, b.r, t)),
        g: Math.round(lerp(a.g, b.g, t)),
        b: Math.round(lerp(a.b, b.b, t))
    };
}

const CONFIG = {
    floating: {
        count: 70,
        radius: 130,
        repel: 80,
        speed: 0.2,
        strings: [
            'const dream = await reality();',
            'function create() { return ✨; }',
            'export default imagination;',
            'import { future } from "now";',
            'while(true) { innovate(); }',
            'let success = try { hard };',
            '// TODO: change the world',
            'if (passion) achieve();',
            'return new Promise(growth);',
            'async function life() {}',
            'const skills = [...learning];',
            'Object.assign(self, wisdom);',
            'Array.from(ideas).map(build);',
            '<Component {...dreams} />',
            'git push origin future',
            'npm run build-awesome',
            '@keyframes success { }',
            'transform: scale(∞);',
            'console.log("Hello ✨");',
            'requestAnimationFrame(live)',
            'new Promise(succeed)',
            'fetch("/api/dreams")',
            'class Life extends Art {}'
        ]
    },
    themes: ['theme-0', 'theme-1', 'theme-2', 'theme-3', 'theme-4']
};