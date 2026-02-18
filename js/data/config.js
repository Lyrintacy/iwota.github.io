/**
 * Visual / behavior configuration — tweak without touching logic
 */
var CONFIG = {
    // ═══ Floating code snippets ═══
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
    },

    // ═══ Parallax landscape ═══
    landscape: {
        layerCount: 14,
        parallaxZone: 0.45,       // all layers done by this scroll %
        contourLinesPerLayer: [4, 8],  // min, max
        treeCountRange: [1, 8]
    },

    // ═══ Ribbon behavior ═══
    ribbons: {
        cursorRadius: 130,        // how far cursor affects ribbons
        cursorStrength: 30,       // how much cursor pushes ribbons
        maxSqueeze: 0.35,         // max deformation near cursor
        crossfadeDuration: 4.5,   // seconds for ribbon crossfade
        scrollTriggerDelta: 0.18, // scroll change to trigger new ribbons
        stringsPerStream: [8, 12],
        waveCount: [4, 6],
        baseWidth: [1.5, 5]
    },

    // ═══ Scroll zones — when things appear/disappear ═══
    zones: {
        cloudsGoneBy: 0.30,       // clouds fade by this scroll %
        skyDarkBy: 0.50,          // sky fully dark by this %
        undergroundStart: 0.42,   // darkness overlay begins
        undergroundFull: 0.62,    // darkness overlay fully opaque
        ribbonsFadeStart: 0.50,   // ribbons start fading
        ribbonsFadeEnd: 0.65,     // ribbons fully gone
        dustStart: 0.60,          // dust particles begin
        dustFull: 0.75,           // dust fully visible
        mascotsIn: 0.12,          // mascots fade in
        mascotsOut: 0.55          // mascots fade out
    },

    // ═══ Colors ═══
    pride: [
        { r: 192, g: 132, b: 252 },
        { r: 168, g: 85,  b: 247 },
        { r: 244, g: 114, b: 182 },
        { r: 212, g: 168, b: 67  },
        { r: 139, g: 92,  b: 246 },
        { r: 236, g: 72,  b: 153 },
        { r: 180, g: 140, b: 60  },
        { r: 147, g: 51,  b: 234 }
    ]
};