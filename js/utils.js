const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const rand = (lo, hi) => Math.random() * (hi - lo) + lo;
const randI = (lo, hi) => Math.floor(rand(lo, hi + 1));
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const smoothstep = t => t * t * (3 - 2 * t);
const isTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const PRIDE = [
    { r: 192, g: 132, b: 252 },
    { r: 168, g: 85,  b: 247 },
    { r: 244, g: 114, b: 182 },
    { r: 212, g: 168, b: 67  },
    { r: 139, g: 92,  b: 246 },
    { r: 236, g: 72,  b: 153 },
    { r: 180, g: 140, b: 60  },
    { r: 147, g: 51,  b: 234 },
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
        count: 40,
        radius: 130,
        repel: 80,
        speed: 0.2,
        strings: [
            'while(alive) { breed(); mutate(); }',
            'function evolve(creature) { }',
            'const soul = null; // TODO',
            'import { darkness } from "deep";',
            'export default nightmares;',
            'if (hearts > 0) takeDamage();',
            '// the basement has no floor',
            'let tears = new Pool();',
            'return spawn(abomination);',
            'async function descend() {}',
            'const items = [...suffering];',
            'Object.assign(self, madness);',
            'Array.from(sins).map(atone);',
            '<Creature {...mutations} />',
            'git push origin basement',
            'npm run generate-horrors',
            '@keyframes writhe { }',
            'console.log("guppy found");',
            'requestAnimationFrame(suffer)',
            'new Promise(escape) // rejected',
            'yield* tears(Infinity)',
            'class Mom extends Boss {}'
        ]
    },
    themes: ['theme-0']
};