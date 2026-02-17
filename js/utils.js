var lerp = function(a, b, t) { return a + (b - a) * t; };
var clamp = function(v, lo, hi) { return Math.min(Math.max(v, lo), hi); };
var rand = function(lo, hi) { return Math.random() * (hi - lo) + lo; };
var randI = function(lo, hi) { return Math.floor(rand(lo, hi + 1)); };
var dist = function(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); };
var smoothstep = function(t) { return t * t * (3 - 2 * t); };
var isTouch = function() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; };

var PRIDE = [
    { r: 192, g: 132, b: 252 },
    { r: 168, g: 85,  b: 247 },
    { r: 244, g: 114, b: 182 },
    { r: 212, g: 168, b: 67  },
    { r: 139, g: 92,  b: 246 },
    { r: 236, g: 72,  b: 153 },
    { r: 180, g: 140, b: 60  },
    { r: 147, g: 51,  b: 234 },
];

function prideColor(idx, offset) {
    offset = offset || 0;
    var len = PRIDE.length;
    var ci = ((idx + offset) % len + len) % len;
    var a = PRIDE[Math.floor(ci)];
    var b = PRIDE[Math.ceil(ci) % len];
    var t = ci % 1;
    return {
        r: Math.round(lerp(a.r, b.r, t)),
        g: Math.round(lerp(a.g, b.g, t)),
        b: Math.round(lerp(a.b, b.b, t))
    };
}

var PROJECTS = [
    {
        id: 'creature-rpg', num: 'I', title: 'Unnamed Creature RPG',
        short: 'A roguelike breeding sim where every run generates unique creatures through deep genetics.',
        tagline: 'Every abomination inherits traits from its parents',
        role: 'Lead Designer', team: 'Solo + 1 Artist', engine: 'Unity / C#', timeframe: '2023 – Present',
        tags: ['Procedural', 'Genetics', 'Roguelike', 'Breeding'],
        paragraphs: [
            'The core loop is deceptively simple: breed creatures, fight through procedural dungeons, breed the survivors. But underneath lies a genetics engine with over 200 traits that combine, mutate, and express across generations.',
            'Each creature has a genome — a real data structure with dominant/recessive alleles, epigenetic modifiers, and mutation rates. <em>Two parents with fire resistance might produce a child immune to fire — or one that spontaneously combusts.</em>',
            'The combat system reads directly from the creature\'s genome. Body shape affects hit-boxes. Limb count changes available attacks. Color genes influence elemental affinities.',
            'The procedural dungeons adapt to your party composition. Bring fliers and the dungeon grows vertical. Bring burrowers and it goes underground.'
        ],
        icon: '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="38" r="22" stroke="currentColor" stroke-width="2" opacity="0.5"/><circle cx="32" cy="32" r="5" fill="currentColor" opacity="0.4"/><circle cx="48" cy="32" r="5" fill="currentColor" opacity="0.4"/><circle cx="32" cy="32" r="2.5" fill="#1a0e35"/><circle cx="48" cy="32" r="2.5" fill="#1a0e35"/><path d="M34 46Q40 52 46 46" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/></svg>'
    },
    {
        id: 'feline-machinations', num: 'II', title: 'Feline Machinations',
        short: 'Cat breeding simulation that starts cute and spirals into cosmic horror.',
        tagline: 'Complex genetics meet emergent narrative',
        role: 'Game Designer', team: '3 people', engine: 'Godot / GDScript', timeframe: '2024',
        tags: ['Simulation', 'Horror', 'Genetics', 'Narrative'],
        paragraphs: [
            'It starts as a cozy cat breeding game. You select pretty cats, breed them for color patterns, sell kittens. The tone is warm, the music is gentle, the UI has paw prints.',
            'But the genetics system has hidden depth. Certain recessive combinations unlock traits that shouldn\'t exist. <em>Cats with too many toes. Cats whose eyes glow in screenshots.</em>',
            'The horror is emergent, not scripted. The system produces increasingly unsettling results the deeper you breed.',
            'The narrative layer reads the player\'s breeding choices and generates procedural journal entries from the cats\' perspective.'
        ],
        icon: '<svg viewBox="0 0 80 80" fill="none"><ellipse cx="40" cy="42" rx="18" ry="20" stroke="currentColor" stroke-width="2" opacity="0.5"/><path d="M24 28L28 12L34 24" stroke="currentColor" stroke-width="2" fill="none" opacity="0.4"/><path d="M56 28L52 12L46 24" stroke="currentColor" stroke-width="2" fill="none" opacity="0.4"/><circle cx="34" cy="36" r="4" fill="currentColor" opacity="0.4"/><circle cx="46" cy="36" r="4" fill="currentColor" opacity="0.4"/><path d="M37 48Q40 51 43 48" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.3"/></svg>'
    },
    {
        id: 'spectral-decay', num: 'III', title: 'Spectral Decay',
        short: 'You ARE the ghost. Systems-driven haunting where fear is a resource.',
        tagline: 'Memories are weapons',
        role: 'Systems Designer', team: 'Solo', engine: 'Custom / Lua', timeframe: '2022 – 2023',
        tags: ['Systems', 'Narrative', 'Horror', 'Simulation'],
        paragraphs: [
            'Most horror games put you against the ghost. This one makes you the ghost. Your goal: haunt a house so effectively that the family inside loses their minds — or leaves.',
            'Fear is your primary resource. <em>Each family member has a unique fear profile generated at the start of each run.</em>',
            'You spend accumulated fear to unlock new haunting abilities. Flickering lights, cold spots, moving objects, whispers.',
            'The family fights back. They bring in priests, psychics, renovators. The emergent dialogue system means every playthrough tells a different story.'
        ],
        icon: '<svg viewBox="0 0 80 80" fill="none"><path d="M20 40Q20 14 40 14Q60 14 60 40L60 58Q56 52 52 58Q48 52 44 58Q40 52 36 58Q32 52 28 58Q24 52 20 58Z" stroke="currentColor" stroke-width="2" fill="none" opacity="0.5"/><circle cx="32" cy="32" r="5" fill="currentColor" opacity="0.4"/><circle cx="48" cy="32" r="5" fill="currentColor" opacity="0.4"/><ellipse cx="40" cy="44" rx="4" ry="5" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/></svg>'
    }
];

var REFERENCES = [
    {
        name: 'Anil Tahmaz', role: 'Creative Alchemist',
        desc: 'Turns constraints into art. Makes impossible things feel like undiscovered techniques.',
        quote: '"Oskar sees systems where others see chaos. Give him a spreadsheet and he\'ll hand you back an ecosystem."',
        link: 'https://aniltahmaz.com', linkLabel: 'aniltahmaz.com →',
        img: 'https://media.licdn.com/dms/image/v2/C4E03AQHBf3jTQ0QDoA/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1611150955292?e=2147483647&v=beta&t=cZ3k2oo_c3UBkRAj-p-xYWz7knrQCYmzztDWr-ACPEQ',
        fallback: 'https://ui-avatars.com/api/?name=AT&size=200&background=1a0a2e&color=c084fc&bold=true'
    },
    {
        name: 'Artem Shatail', role: 'Code Necromancer',
        desc: 'Resurrects dead codebases. Uncomfortably good at optimization.',
        quote: '"Working with Oskar is like watching someone play 4D chess with game mechanics."',
        link: 'https://www.linkedin.com/in/artem-shatail-559343340/', linkLabel: 'linkedin.com/in/artem-shatail →',
        img: 'https://media.licdn.com/dms/image/v2/D4E03AQGKmA8lxJjmhw/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1695393294633?e=2147483647&v=beta&t=8H_ow7FWLJO3B6bT_dJ6DWpKEsxhEuFgHkKR8XnSJ9E',
        fallback: 'https://ui-avatars.com/api/?name=AS&size=200&background=1a0a2e&color=a78bfa&bold=true'
    },
    {
        name: 'Jane Doe', role: 'Pixel Witch',
        desc: 'More personality in 16×16 than most have in full 3D.',
        quote: '"He designs systems that make my art feel alive."',
        link: '#', linkLabel: 'janedoe.art →',
        img: 'https://ui-avatars.com/api/?name=JD&size=200&background=1a0a2e&color=f472b6&bold=true',
        fallback: 'https://ui-avatars.com/api/?name=JD&size=200&background=1a0a2e&color=f472b6&bold=true'
    }
];

var CONFIG = {
    floating: {
        count: 35,
        radius: 130,
        repel: 80,
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
    }
};

window.__stringNodes = [];