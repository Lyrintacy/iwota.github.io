/* ═══════ LANDSCAPE — fast parallax, bold contour curves ═══════ */
class Landscape {
    constructor(container) {
        this.container = container;
        this.layers = [];
        this.N = 14;
        this.seed = rand(0, 9999);
        this.build();
        window.addEventListener('resize', this.build.bind(this));
    }
    srand(a, b) {
        var x = Math.sin(this.seed + a * 127.1 + b * 311.7) * 43758.5453;
        return x - Math.floor(x);
    }
    build() {
        this.container.innerHTML = '';
        this.layers = [];
        var w = Math.max(innerWidth * 1.2, 1500);
        for (var i = 0; i < this.N; i++) this.addLayer(i, i / (this.N - 1), w);
    }
    color(depth) {
        var t = depth, t2 = t * t;
        var r = Math.round(lerp(235, 6, t2 * 0.75 + t * 0.25));
        var g = Math.round(lerp(230, 3, t2 * 0.8 + t * 0.2));
        var b = Math.round(lerp(240, 12, t2 * 0.5 + t * 0.5));
        return { r: r, g: g, b: b, str: 'rgb(' + r + ',' + g + ',' + b + ')' };
    }
    darker(c, amt) {
        return 'rgb(' + Math.max(c.r - amt, 0) + ',' + Math.max(c.g - amt, 0) + ',' + Math.max(c.b - Math.round(amt * 0.5), 0) + ')';
    }
    bleach(c, amount) {
        return 'rgb(' + Math.round(lerp(c.r, 225, amount)) + ',' + Math.round(lerp(c.g, 222, amount)) + ',' + Math.round(lerp(c.b, 230, amount)) + ')';
    }
    addLayer(idx, depth, w) {
        var NS = 'http://www.w3.org/2000/svg';
        var h = Math.round(lerp(220, 550, depth));
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        svg.setAttribute('preserveAspectRatio', 'none');
        var c = this.color(depth);
        var hill = this.hillPath(w, h, depth);
        // main fill
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', hill.d); p.setAttribute('fill', c.str);
        svg.appendChild(p);
        // bold contour curves — parallel lines wrapping terrain
        this.addContourCurves(svg, hill, w, h, depth, c, idx);
        // objects
        this.addObjects(svg, hill, w, h, depth, c, idx);
        var div = document.createElement('div');
        div.className = 'land-layer';
        div.style.zIndex = idx + 2;
        div.appendChild(svg);
        this.container.appendChild(div);
        this.layers.push({ el: div, depth: depth, vis: true });
    }
    hillPath(w, h, depth) {
        var segs = randI(8, 14);
        var base = lerp(h * 0.5, h * 0.2, depth);
        var amp = lerp(12, 75, depth);
        var s = this.seed + depth * 77;
        var ys = [];
        for (var i = 0; i <= segs; i++) {
            ys.push(base + Math.sin(i * 1.4 + s) * amp + Math.sin(i * 2.8 + s * 0.6) * amp * 0.35 + Math.sin(i * 0.5 + s * 1.4) * amp * 0.45);
        }
        var d = 'M0 ' + h + ' L0 ' + ys[0];
        for (var i = 0; i < segs; i++) {
            var x0 = (i / segs) * w, x1 = ((i + 1) / segs) * w;
            var xm = (x0 + x1) / 2, ym = (ys[i] + ys[i + 1]) / 2;
            d += ' Q' + (x0 + (x1 - x0) * 0.5) + ' ' + ys[i] + ' ' + xm + ' ' + ym;
        }
        d += ' L' + w + ' ' + ys[segs] + ' L' + w + ' ' + h + ' Z';
        var _ys = ys, _segs = segs;
        var getY = function(x) {
            var t = (x / w) * _segs;
            var i = Math.floor(clamp(t, 0, _segs - 1));
            return lerp(_ys[i], _ys[Math.min(i + 1, _segs)], t - i);
        };
        return { d: d, getY: getY, ys: ys, segs: segs };
    }

    // ═══ BOLD CONTOUR CURVES — parallel dark lines that follow terrain ═══
    addContourCurves(svg, hill, w, h, depth, c, idx) {
        var NS = 'http://www.w3.org/2000/svg';
        // number of parallel contour lines per layer
        var lineCount = randI(4, 8);
        // darker color — at landscape opacity, not transparent
        var dk = Math.round(lerp(18, 45, depth));
        var strokeColor = 'rgb(' + Math.max(c.r - dk, 0) + ',' + Math.max(c.g - dk, 0) + ',' + Math.max(c.b - Math.round(dk * 0.4), 0) + ')';
        var strokeWidth = lerp(0.8, 2.5, depth);
        var segs = hill.segs;
        var ys = hill.ys;

        for (var line = 0; line < lineCount; line++) {
            // each contour line is offset downward from the hilltop
            // parallel lines at regular vertical intervals
            var vertOffset = 8 + line * lerp(6, 14, depth);

            // build a smooth bezier path that follows the hill contour
            var d = '';
            var pts = [];
            var step = w / 60; // sample many points for smooth curve
            for (var x = 0; x <= w; x += step) {
                var y = hill.getY(x) + vertOffset;
                // only draw if inside the filled area (below or at hill surface, above bottom)
                if (y < h - 2) {
                    pts.push({ x: x, y: y });
                }
            }

            if (pts.length < 4) continue;

            // build smooth path through sampled points
            d = 'M' + pts[0].x + ' ' + pts[0].y;
            for (var i = 1; i < pts.length - 1; i++) {
                var prev = pts[i - 1], curr = pts[i], next = pts[i + 1];
                // smooth cubic interpolation
                var cpx1 = curr.x - (next.x - prev.x) * 0.15;
                var cpy1 = curr.y - (next.y - prev.y) * 0.15;
                var cpx2 = curr.x + (next.x - prev.x) * 0.15;
                var cpy2 = curr.y + (next.y - prev.y) * 0.15;
                d += ' Q' + curr.x + ' ' + curr.y + ' ' + ((curr.x + next.x) / 2) + ' ' + ((curr.y + next.y) / 2);
            }
            // last point
            d += ' L' + pts[pts.length - 1].x + ' ' + pts[pts.length - 1].y;

            var path = document.createElementNS(NS, 'path');
            path.setAttribute('d', d);
            path.setAttribute('stroke', strokeColor);
            path.setAttribute('stroke-width', strokeWidth);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            // slight opacity variation between lines for depth
            path.setAttribute('opacity', lerp(0.5, 1, depth) - line * 0.04);
            svg.appendChild(path);
        }
    }

    addObjects(svg, hill, w, h, depth, c, idx) {
        var dk1 = this.darker(c, Math.round(lerp(12, 35, depth)));
        var dk2 = this.darker(c, Math.round(lerp(22, 55, depth)));
        var bl1 = this.bleach(c, 0.35);
        var bl2 = this.bleach(c, 0.55);
        var sz = lerp(6, 48, depth);

        // background bleached trees on all layers
        if (depth > 0.02) {
            var bgCount = Math.round(lerp(1, 4, depth));
            for (var i = 0; i < bgCount; i++) {
                var x = rand(20, w - 20), y = hill.getY(x) + rand(3, 12);
                var s = sz * rand(0.35, 0.7);
                this.pine(svg, x, y, s, bl1, bl2, lerp(0.12, 0.3, depth));
            }
        }

        // main trees on all layers
        var treeCount = Math.max(1, Math.round(lerp(2, 8, 1 - Math.abs(depth - 0.45) * 2)));
        for (var i = 0; i < treeCount; i++) {
            var x = rand(30, w - 30), y = hill.getY(x), s = sz * rand(0.6, 1.3);
            if (this.srand(idx, i * 13) > 0.45) this.pine(svg, x, y, s, dk1, dk2, 1);
            else this.roundTree(svg, x, y, s, dk1, dk2, 1);
        }

        // foreground darker trees
        if (depth > 0.3) {
            var fgCount = Math.max(0, Math.round(lerp(0, 3, depth - 0.3)));
            for (var i = 0; i < fgCount; i++) {
                var x = rand(10, w - 10), y = hill.getY(x) - rand(1, 6);
                var s = sz * rand(1.0, 1.5);
                this.pine(svg, x, y, s, dk2, this.darker(c, Math.round(lerp(35, 65, depth))), 0.45);
            }
        }

        // houses
        if (depth > 0.15 && depth < 0.85) {
            var n = this.srand(idx, 77) > 0.5 ? 1 : 0;
            for (var i = 0; i < n; i++) {
                var x = rand(120, w - 160), y = hill.getY(x);
                this.house(svg, x, y, sz * rand(0.7, 1.1), dk1, dk2, depth);
            }
        }
        if (depth > 0.45) {
            var n = randI(3, 10);
            for (var i = 0; i < n; i++) {
                var x = rand(15, w - 15), y = hill.getY(x) + rand(-2, 3);
                this.grass(svg, x, y, sz * rand(0.5, 1.3), dk2);
            }
        }
        if (depth > 0.65 && this.srand(idx, 42) > 0.5) {
            var x = rand(80, w - 80);
            this.deadTree(svg, x, hill.getY(x), lerp(18, 50, depth), dk2);
        }
    }

    pine(svg, x, y, s, c1, c2, opacity) {
        var NS = 'http://www.w3.org/2000/svg';
        var g = document.createElementNS(NS, 'g');
        if (opacity < 1) g.setAttribute('opacity', String(opacity));
        var trunk = document.createElementNS(NS, 'rect');
        trunk.setAttribute('x', x - s * 0.055); trunk.setAttribute('y', y - s * 0.02);
        trunk.setAttribute('width', s * 0.11); trunk.setAttribute('height', s * 0.38);
        trunk.setAttribute('fill', c2); trunk.setAttribute('rx', s * 0.02);
        g.appendChild(trunk);
        var layers = randI(3, 4);
        for (var i = 0; i < layers; i++) {
            var ly = y - s * (0.15 + i * 0.22);
            var lw = s * (0.45 - i * 0.08);
            var p = document.createElementNS(NS, 'path');
            p.setAttribute('d', 'M' + x + ' ' + (ly - s * 0.25) + ' L' + (x - lw) + ' ' + (ly + s * 0.04) + ' Q' + x + ' ' + (ly + s * 0.08) + ' ' + (x + lw) + ' ' + (ly + s * 0.04) + ' Z');
            p.setAttribute('fill', c1); g.appendChild(p);
        }
        svg.appendChild(g);
    }

    roundTree(svg, x, y, s, c1, c2, opacity) {
        var NS = 'http://www.w3.org/2000/svg';
        var g = document.createElementNS(NS, 'g');
        if (opacity < 1) g.setAttribute('opacity', String(opacity));
        var trunk = document.createElementNS(NS, 'path');
        trunk.setAttribute('d', 'M' + (x - s * 0.05) + ' ' + (y + s * 0.02) + ' L' + (x - s * 0.04) + ' ' + (y - s * 0.28) + ' L' + (x + s * 0.04) + ' ' + (y - s * 0.28) + ' L' + (x + s * 0.05) + ' ' + (y + s * 0.02) + ' Z');
        trunk.setAttribute('fill', c2); g.appendChild(trunk);
        var circles = [[0, -0.48, 0.28], [-0.14, -0.42, 0.22], [0.14, -0.42, 0.22], [-0.06, -0.55, 0.18], [0.08, -0.56, 0.17]];
        for (var i = 0; i < circles.length; i++) {
            var ci = circles[i];
            var el = document.createElementNS(NS, 'circle');
            el.setAttribute('cx', x + s * ci[0]); el.setAttribute('cy', y + s * ci[1]);
            el.setAttribute('r', s * ci[2]); el.setAttribute('fill', c1); g.appendChild(el);
        }
        svg.appendChild(g);
    }

    deadTree(svg, x, y, s, c) {
        var NS = 'http://www.w3.org/2000/svg';
        var g = document.createElementNS(NS, 'g');
        g.setAttribute('opacity', '0.55');
        var trunk = document.createElementNS(NS, 'path');
        trunk.setAttribute('d', 'M' + (x - s * 0.04) + ' ' + y + ' L' + (x - s * 0.025) + ' ' + (y - s * 0.75) + ' L' + (x + s * 0.025) + ' ' + (y - s * 0.75) + ' L' + (x + s * 0.04) + ' ' + y + ' Z');
        trunk.setAttribute('fill', c); g.appendChild(trunk);
        var branches = [
            { sy: 0.55, ex: -0.25, ey: 0.72, cx: -0.12, cy: 0.58 },
            { sy: 0.4, ex: 0.2, ey: 0.52, cx: 0.1, cy: 0.42 },
            { sy: 0.65, ex: 0.16, ey: 0.82, cx: 0.08, cy: 0.7 },
            { sy: 0.5, ex: -0.18, ey: 0.58, cx: -0.08, cy: 0.5 }
        ];
        for (var i = 0; i < branches.length; i++) {
            var b = branches[i];
            var p = document.createElementNS(NS, 'path');
            p.setAttribute('d', 'M' + x + ' ' + (y - s * b.sy) + ' Q' + (x + s * b.cx) + ' ' + (y - s * b.cy) + ' ' + (x + s * b.ex) + ' ' + (y - s * b.ey));
            p.setAttribute('stroke', c); p.setAttribute('stroke-width', Math.max(0.5, s * 0.02));
            p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round');
            g.appendChild(p);
        }
        svg.appendChild(g);
    }

    house(svg, x, y, s, c1, c2, depth) {
        var NS = 'http://www.w3.org/2000/svg';
        var g = document.createElementNS(NS, 'g');
        var hw = s * 1.0, hh = s * 0.8;
        var walls = document.createElementNS(NS, 'rect');
        walls.setAttribute('x', x - hw / 2); walls.setAttribute('y', y - hh);
        walls.setAttribute('width', hw); walls.setAttribute('height', hh);
        walls.setAttribute('fill', c1); walls.setAttribute('rx', s * 0.02);
        g.appendChild(walls);
        var overhang = s * 0.08;
        var roof = document.createElementNS(NS, 'path');
        roof.setAttribute('d', 'M' + (x - hw / 2 - overhang) + ' ' + (y - hh) + ' L' + x + ' ' + (y - hh - s * 0.55) + ' L' + (x + hw / 2 + overhang) + ' ' + (y - hh) + ' Z');
        roof.setAttribute('fill', c2); g.appendChild(roof);
        var doorW = s * 0.16, doorH = s * 0.32;
        var door = document.createElementNS(NS, 'rect');
        door.setAttribute('x', x - doorW / 2); door.setAttribute('y', y - doorH);
        door.setAttribute('width', doorW); door.setAttribute('height', doorH);
        door.setAttribute('fill', c2); door.setAttribute('rx', doorW * 0.15);
        g.appendChild(door);
        if (depth > 0.2) {
            var winAlpha = lerp(0.08, 0.5, (depth - 0.2) / 0.6), winS = s * 0.11;
            var positions = [[-0.28, -0.6], [0.28, -0.6]];
            for (var i = 0; i < positions.length; i++) {
                var wp = positions[i];
                var win = document.createElementNS(NS, 'rect');
                win.setAttribute('x', x + wp[0] * hw - winS / 2);
                win.setAttribute('y', y + wp[1] * hh);
                win.setAttribute('width', winS); win.setAttribute('height', winS);
                win.setAttribute('fill', 'rgba(212,168,67,' + winAlpha + ')');
                win.setAttribute('rx', winS * 0.1); g.appendChild(win);
            }
        }
        if (depth > 0.3 && this.srand(x * 0.1, depth * 100) > 0.4) {
            var chimW = s * 0.08, chimH = s * 0.35;
            var chim = document.createElementNS(NS, 'rect');
            chim.setAttribute('x', x + hw * 0.22); chim.setAttribute('y', y - hh - s * 0.35);
            chim.setAttribute('width', chimW); chim.setAttribute('height', chimH);
            chim.setAttribute('fill', c2); g.appendChild(chim);
        }
        svg.appendChild(g);
    }

    grass(svg, x, y, s, c) {
        var NS = 'http://www.w3.org/2000/svg';
        var g = document.createElementNS(NS, 'g');
        g.setAttribute('opacity', '0.3');
        for (var i = -1; i <= 1; i++) {
            var bx = x + i * s * 0.16;
            var p = document.createElementNS(NS, 'path');
            p.setAttribute('d', 'M' + bx + ' ' + y + ' Q' + (bx + rand(-3, 3)) + ' ' + (y - s * 0.8) + ' ' + (bx + rand(-5, 5)) + ' ' + (y - s * 0.15));
            p.setAttribute('stroke', c); p.setAttribute('stroke-width', clamp(s * 0.06, 0.5, 2));
            p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round');
            g.appendChild(p);
        }
        svg.appendChild(g);
    }

    // ═══ FAST PARALLAX — layers cycle through quickly, all finish before darkness ═══
    update(progress) {
        // all parallax happens in the first 50% of scroll
        // then 50-100% is the underground/basement
        var parallaxZone = 0.45; // all layers done by 45%
        var p = clamp(progress / parallaxZone, 0, 1); // normalized parallax progress

        for (var li = 0; li < this.layers.length; li++) {
            var L = this.layers[li];
            var d = L.depth; // 0=far, 1=near

            // each layer has a narrow window of full visibility
            // near layers (d=1) appear and vanish first
            // far layers (d=0) linger longest

            // calculate when this layer starts fading and finishes
            // near layers: fadeStart early, far layers: fadeStart late
            var layerStart = d * 0.15; // near layers start fading at ~15%, far at ~0%
            var layerEnd = lerp(0.95, 0.3, d); // far layers stay until 95%, near until 30%
            var fadeInLen = 0.05; // quick fade in
            var fadeOutLen = lerp(0.15, 0.08, d); // quick fade out, near=quicker

            var alpha;
            if (p < layerStart) {
                alpha = 1;
            } else if (p < layerStart + fadeInLen) {
                alpha = 1; // already visible
            } else if (p < layerEnd) {
                alpha = 1;
            } else if (p < layerEnd + fadeOutLen) {
                alpha = 1 - smoothstep((p - layerEnd) / fadeOutLen);
            } else {
                alpha = 0;
            }

            // aerial perspective for very far layers
            if (d < 0.12) alpha *= lerp(0.45, 1, d / 0.12);

            // zoom and drop — faster, more dramatic
            var zoom = 1 + p * lerp(0.02, 2.8, d * d);
            var drop = p * lerp(0, innerHeight * 1.0, d * d);

            L.el.style.transform = 'translateY(' + drop + 'px) scale(' + zoom + ')';
            L.el.style.opacity = clamp(alpha, 0, 1);
            var vis = alpha > 0.005;
            if (vis !== L.vis) { L.vis = vis; L.el.style.display = vis ? '' : 'none'; }
        }
    }
}

class Clouds {
    constructor() {
        this.items = [];
        var clouds = document.querySelectorAll('.cloud');
        for (var i = 0; i < clouds.length; i++) {
            this.items.push({
                el: clouds[i],
                baseOp: parseFloat(getComputedStyle(clouds[i]).opacity) || 0.5,
                pSpeed: rand(0.015, 0.055), dPhase: rand(0, Math.PI * 2),
                dSpeed: rand(0.0008, 0.002), dAmp: rand(18, 45),
                zoomRate: 0.04 + i * 0.015
            });
        }
    }
    update(progress, time) {
        for (var i = 0; i < this.items.length; i++) {
            var c = this.items[i];
            var sy = progress * -innerHeight * c.pSpeed * 5;
            var dx = Math.sin(time * c.dSpeed + c.dPhase) * c.dAmp;
            // clouds gone by 30% scroll
            var fade = clamp(1 - progress * 3.3, 0, 1);
            c.el.style.transform = 'translateY(' + sy + 'px) translateX(' + dx + 'px) scale(' + (1 + progress * c.zoomRate) + ')';
            c.el.style.opacity = c.baseOp * fade;
        }
    }
}

class SkyController {
    constructor() { this.el = document.getElementById('sky'); }
    update(progress) {
        // sky darkens faster to match fast parallax
        this.el.style.filter = 'brightness(' + lerp(1, 0.04, clamp(progress / 0.5, 0, 1)) + ') saturate(' + lerp(1, 3, clamp(progress / 0.5, 0, 1)) + ')';
    }
}

/* ═══════ MAIN APP ═══════ */
class App {
    constructor() {
        this.floatBox = document.getElementById('floatingStrings');
        this.glow = document.getElementById('cursorGlow');
        this.progressBar = document.getElementById('scrollProgress');
        this.menuBtn = document.getElementById('mobileMenuBtn');
        this.mobileNav = document.getElementById('mobileNav');
        this.navbar = document.getElementById('navbar');
        this.landWrap = document.getElementById('landscapeWrap');
        this.stringWrap = document.getElementById('stringLayers');
        this.dustCanvas = document.getElementById('dustCanvas');
        this.undergroundOverlay = document.getElementById('undergroundOverlay');
        this.px = -1000; this.py = -1000;
        this.scrollY = 0; this.scrollPct = 0;
        this.running = true;
        this.mobile = isTouch();
        this.time = 0;
        this.lastTime = performance.now();
        this.init();
    }
    init() {
        this.basement = new BasementManager();
        this.ribbonCanvasEl = document.createElement('canvas');
        this.ribbonCanvasEl.style.cssText = 'position:fixed;inset:0;z-index:4;pointer-events:none;width:100%;height:100%';
        document.body.appendChild(this.ribbonCanvasEl);
        this.ribbons = new RibbonCanvas(this.ribbonCanvasEl);
        this.floats = new FloatingManager(this.floatBox, this.mobile);
        this.landscape = new Landscape(this.landWrap);
        this.woven = new WovenStrings(this.stringWrap, this.landscape.N);
        this.clouds = new Clouds();
        this.sky = new SkyController();
        this.mascots = new MascotController();
        this.dust = new DustParticles(this.dustCanvas);
        this.setupTreeGrowth();
        this.events();
        this.onScroll();
        this.loop();
    }

    setupTreeGrowth() {
        var grid = document.getElementById('projectGrid');
        if (!grid) return;
        this.treeGrowCanvas = document.createElement('canvas');
        this.treeGrowCanvas.style.cssText = 'position:fixed;inset:0;z-index:13;pointer-events:none;width:100%;height:100%';
        document.body.appendChild(this.treeGrowCanvas);
        this.treeGrowCtx = this.treeGrowCanvas.getContext('2d');
        var dpr = Math.min(devicePixelRatio || 1, 2);
        this.treeGrowCanvas.width = innerWidth * dpr;
        this.treeGrowCanvas.height = innerHeight * dpr;
        this.treeGrowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.growTrees = [];
        this.gridHovered = false;
        this.growProgress = 0;
        var self = this;
        grid.addEventListener('mouseenter', function() {
            self.gridHovered = true;
            self.spawnGrowTrees(grid);
        });
        grid.addEventListener('mouseleave', function() {
            self.gridHovered = false;
        });
        window.addEventListener('resize', function() {
            var dpr = Math.min(devicePixelRatio || 1, 2);
            self.treeGrowCanvas.width = innerWidth * dpr;
            self.treeGrowCanvas.height = innerHeight * dpr;
            self.treeGrowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        });
    }

    spawnGrowTrees(grid) {
        var rect = grid.getBoundingClientRect();
        this.growTrees = [];
        var count = randI(10, 16);
        for (var i = 0; i < count; i++) {
            var edge = Math.floor(rand(0, 4));
            var x, y;
            if (edge === 0) { x = rect.left + rand(0, rect.width); y = rect.top; }
            else if (edge === 1) { x = rect.right; y = rect.top + rand(0, rect.height); }
            else if (edge === 2) { x = rect.left + rand(0, rect.width); y = rect.bottom; }
            else { x = rect.left; y = rect.top + rand(0, rect.height); }
            this.growTrees.push({
                x: x, y: y,
                maxHeight: rand(18, 45),
                width: rand(10, 20),
                delay: rand(0, 0.35),
                speed: rand(2, 4),
                type: Math.random() > 0.5 ? 'pine' : 'round',
                phase: rand(0, Math.PI * 2),
                grown: 0
            });
        }
    }

    updateGrowTrees(dt) {
        if (!this.treeGrowCtx) return;
        var ctx = this.treeGrowCtx;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        var targetGrow = this.gridHovered ? 1 : 0;
        this.growProgress = lerp(this.growProgress, targetGrow, dt * 2.5);
        if (this.growProgress < 0.01 && !this.gridHovered) return;
        for (var i = 0; i < this.growTrees.length; i++) {
            var tree = this.growTrees[i];
            var delayed = clamp((this.growProgress - tree.delay) / (1 - tree.delay), 0, 1);
            tree.grown = lerp(tree.grown, delayed, dt * tree.speed);
            if (tree.grown < 0.02) continue;
            var h = tree.maxHeight * tree.grown;
            var w = tree.width * tree.grown;
            var sway = Math.sin(this.time * 1.5 + tree.phase) * 2 * tree.grown;
            ctx.save();
            ctx.globalAlpha = clamp(tree.grown * 0.55, 0, 0.45);
            if (tree.type === 'pine') {
                ctx.fillStyle = 'rgba(60,45,80,0.5)';
                ctx.fillRect(tree.x - w * 0.06 + sway, tree.y - h * 0.1, w * 0.12, h * 0.35);
                ctx.fillStyle = 'rgba(80,60,120,0.4)';
                for (var f = 0; f < 3; f++) {
                    var fy = tree.y - h * (0.15 + f * 0.28);
                    var fw = w * (0.5 - f * 0.1) * Math.min(1, tree.grown * 2);
                    ctx.beginPath();
                    ctx.moveTo(tree.x + sway, fy - h * 0.2);
                    ctx.lineTo(tree.x - fw + sway, fy + h * 0.04);
                    ctx.lineTo(tree.x + fw + sway, fy + h * 0.04);
                    ctx.closePath(); ctx.fill();
                }
            } else {
                ctx.fillStyle = 'rgba(60,45,80,0.5)';
                ctx.fillRect(tree.x - w * 0.05 + sway, tree.y - h * 0.25, w * 0.1, h * 0.35);
                ctx.fillStyle = 'rgba(80,60,120,0.35)';
                ctx.beginPath();
                ctx.arc(tree.x + sway, tree.y - h * 0.5, w * 0.35 * Math.min(1, tree.grown * 1.5), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    events() {
        var self = this;
        if (this.mobile) {
            document.addEventListener('touchstart', function(e) { self.onTouch(e); }, { passive: true });
            document.addEventListener('touchmove', function(e) { self.onTouch(e); }, { passive: true });
            document.addEventListener('touchend', function() { self.offPointer(); });
        } else {
            document.addEventListener('mousemove', function(e) { self.onMouse(e); });
            document.addEventListener('mouseleave', function() { self.offPointer(); });
        }
        window.addEventListener('scroll', function() { self.onScroll(); }, { passive: true });
        document.addEventListener('visibilitychange', function() {
            self.running = !document.hidden;
            if (self.running) { self.lastTime = performance.now(); self.loop(); }
        });
        if (this.menuBtn) {
            this.menuBtn.addEventListener('click', function() {
                self.menuBtn.classList.toggle('active');
                self.mobileNav.classList.toggle('active');
            });
        }
        var mnavLinks = document.querySelectorAll('.mnav a');
        for (var i = 0; i < mnavLinks.length; i++) {
            mnavLinks[i].addEventListener('click', function() {
                self.menuBtn.classList.remove('active');
                self.mobileNav.classList.remove('active');
            });
        }
        var hashLinks = document.querySelectorAll('a[href^="#"]');
        for (var i = 0; i < hashLinks.length; i++) {
            (function(a) {
                a.addEventListener('click', function(e) {
                    var href = a.getAttribute('href');
                    if (href === '#') return;
                    e.preventDefault();
                    var t = document.querySelector(href);
                    if (t) t.scrollIntoView({ behavior: 'smooth' });
                });
            })(hashLinks[i]);
        }
        this.formSetup();
    }

    setPointer(x, y) {
        this.px = x; this.py = y;
        this.ribbons.updatePointer(x, y);
        if (this.glow) {
            this.glow.style.left = x + 'px'; this.glow.style.top = y + 'px';
            this.glow.classList.add('visible');
        }
    }
    onMouse(e) { this.setPointer(e.clientX, e.clientY); }
    onTouch(e) {
        var t = e.touches[0]; if (!t) return;
        this.setPointer(t.clientX, t.clientY);
        if (this.floats) this.floats.touchNear(t.clientX, t.clientY);
    }
    offPointer() {
        var self = this;
        setTimeout(function() {
            self.px = -1000; self.py = -1000;
            self.ribbons.updatePointer(-1000, -1000);
            if (self.glow) self.glow.classList.remove('visible');
        }, 200);
    }

    onScroll() {
        this.scrollY = scrollY;
        var max = document.documentElement.scrollHeight - innerHeight;
        this.scrollPct = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
        if (this.progressBar) this.progressBar.style.width = (this.scrollPct * 100) + '%';
        if (this.navbar) this.navbar.classList.toggle('at-top', scrollY < 50);
        this.ribbons.updateScroll(this.scrollPct);
        this.landscape.update(this.scrollPct);
        this.sky.update(this.scrollPct);

        // underground darkness starts AFTER all parallax is done (~45%)
        var undergroundAlpha = smoothstep(clamp((this.scrollPct - 0.42) / 0.2, 0, 1));
        if (this.undergroundOverlay) this.undergroundOverlay.style.opacity = undergroundAlpha;
    }

    formSetup() {
        var form = document.getElementById('contactForm');
        if (!form) return;
        form.addEventListener('submit', function() {
            var btn = form.querySelector('.btn');
            var txt = btn.textContent;
            btn.textContent = 'Sending…'; btn.disabled = true;
            setTimeout(function() { btn.textContent = txt; btn.disabled = false; }, 5000);
        });
    }

    loop() {
        if (!this.running) return;
        var now = performance.now();
        var dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        this.time += dt;

        // ribbons fade after parallax zone
        var ribbonFade = 1 - smoothstep(clamp((this.scrollPct - 0.5) / 0.15, 0, 1));
        this.ribbonCanvasEl.style.opacity = ribbonFade;
        if (ribbonFade > 0.01) this.ribbons.animate();

        this.woven.update(dt, this.scrollPct);
        this.clouds.update(this.scrollPct, this.time);
        this.mascots.update(this.scrollPct, this.time);

        var dustOpacity = smoothstep(clamp((this.scrollPct - 0.6) / 0.15, 0, 1));
        this.dust.update(this.time, dustOpacity);

        this.updateGrowTrees(dt);

        if (this.floats) this.floats.update(this.px, this.py, this.scrollY);

        var self = this;
        requestAnimationFrame(function() { self.loop(); });
    }
}

document.addEventListener('DOMContentLoaded', function() { new App(); });