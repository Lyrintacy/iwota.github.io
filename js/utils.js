const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const rand = (lo, hi) => Math.random() * (hi - lo) + lo;
const randI = (lo, hi) => Math.floor(rand(lo, hi + 1));
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const smoothstep = t => t * t * (3 - 2 * t);
const isTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const PRIDE = [
    { r: 192, g: 132, b: 252 },  // purple
    { r: 168, g: 85,  b: 247 },  // deeper purple
    { r: 244, g: 114, b: 182 },  // pink
    { r: 212, g: 168, b: 67  },  // gold
    { r: 139, g: 92,  b: 246 },  // violet
    { r: 236, g: 72,  b: 153 },  // hot pink
    { r: 180, g: 140, b: 60  },  // dark gold
    { r: 147, g: 51,  b: 234 },  // bright purple
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