var lerp = function(a, b, t) { return a + (b - a) * t; };
var clamp = function(v, lo, hi) { return Math.min(Math.max(v, lo), hi); };
var rand = function(lo, hi) { return Math.random() * (hi - lo) + lo; };
var randI = function(lo, hi) { return Math.floor(rand(lo, hi + 1)); };
var dist = function(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); };
var smoothstep = function(t) { return t * t * (3 - 2 * t); };
var isTouch = function() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; };

// Use PRIDE from config
var PRIDE = CONFIG.pride;

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

window.__stringNodes = [];