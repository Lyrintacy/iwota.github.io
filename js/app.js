/* ═══════ LANDSCAPE — 14 layers for longer parallax journey ═══════ */
class Landscape {
    constructor(container) {
        this.container = container;
        this.layers = [];
        this.N = 14; // more layers
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
        var r = Math.round(lerp(232, 4, t2 * 0.8 + t * 0.2));
        var g = Math.round(lerp(228, 2, t2 * 0.85 + t * 0.15));
        var b = Math.round(lerp(236, 10, t2 * 0.55 + t * 0.45));
        return { r: r, g: g, b: b, str: 'rgb(' + r + ',' + g + ',' + b + ')' };
    }
    darker(c, amt) {
        return 'rgb(' + Math.max(c.r - amt, 0) + ',' + Math.max(c.g - amt, 0) + ',' + Math.max(c.b - Math.round(amt * 0.5), 0) + ')';
    }
    addLayer(idx, depth, w) {
        var NS = 'http://www.w3.org/2000/svg';
        var h = Math.round(lerp(160, 380, depth));
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        svg.setAttribute('preserveAspectRatio', 'none');
        var c = this.color(depth);
        var hill = this.hillPath(w, h, depth);
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', hill.d); p.setAttribute('fill', c.str);
        svg.appendChild(p);
        this.addObjects(svg, hill, w, h, depth, c, idx);
        var div = document.createElement('div');
        div.className = 'land-layer';
        div.style.zIndex = idx + 2;
        div.appendChild(svg);
        this.container.appendChild(div);
        this.layers.push({ el: div, depth: depth, vis: true });
    }
    hillPath(w, h, depth) {
        var segs = randI(7, 13);
        var base = lerp(h * 0.68, h * 0.32, depth);
        var amp = lerp(8, 50, depth);
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
        var getY = function(x) {
            var t = (x / w) * segs;
            var i = Math.floor(clamp(t, 0, segs - 1));
            return lerp(ys[i], ys[Math.min(i + 1, segs)], t - i);
        };
        return { d: d, getY: getY };
    }
    addObjects(svg, hill, w, h, depth, c, idx) {
        var dk1 = this.darker(c, Math.round(lerp(10, 30, depth)));
        var dk2 = this.darker(c, Math.round(lerp(20, 50, depth)));
        var sz = lerp(5, 38, depth);
        if (depth > 0.06 && depth < 0.88) {
            var count = Math.max(0, Math.round(lerp(1, 8, 1 - Math.abs(depth - 0.4) * 2.5)));
            for (var i = 0; i < count; i++) {
                var x = rand(30, w - 30), y = hill.getY(x), s = sz * rand(0.6, 1.3);
                if (this.srand(idx, i * 13) > 0.5) this.pine(svg, x, y, s, dk1, dk2);
                else this.roundTree(svg, x, y, s, dk1, dk2);
            }
        }
        if (depth > 0.2 && depth < 0.8) {
            var n = this.srand(idx, 77) > 0.5 ? randI(0, 1) : 0;
            for (var i = 0; i < n; i++) {
                var x = rand(100, w - 140), y = hill.getY(x);
                this.house(svg, x, y, sz * rand(0.8, 1.2), dk1, dk2, depth);
            }
        }
        if (depth > 0.5) {
            var n = randI(3, 10);
            for (var i = 0; i < n; i++) {
                var x = rand(15, w - 15), y = hill.getY(x) + rand(-2, 3);
                this.grass(svg, x, y, sz * rand(0.5, 1.3), dk2);
            }
        }
        if (depth > 0.7 && this.srand(idx, 42) > 0.5) {
            var x = rand(80, w - 80);
            this.deadTree(svg, x, hill.getY(x), lerp(18, 45, depth), dk2);
        }
    }
    pine(svg, x, y, s, c1, c2) {
        var NS = 'http://www.w3.org/2000/svg';
        var g = document.createElementNS(NS, 'g');
        g.appendChild(this._rect(x - s * 0.05, y, s * 0.1, s * 0.35, c2));
        for (var i = 0; i < 3; i++) {
            var ly = y - s * (0.22 + i * 0.24), lw = s * (0.42 - i * 0.09);
            var p = document.createElementNS(NS, 'path');
            p.setAttribute('d', 'M' + x + ' ' + (ly - s * 0.2) + 'L' + (x - lw) + ' ' + (ly + s * 0.07) + 'L' + (x + lw) + ' ' + (ly + s * 0.07) + 'Z');
            p.setAttribute('fill', c1); g.appendChild(p);
        }
        svg.appendChild(g);
    }
    roundTree(svg, x, y, s, c1, c2) {
        var NS = 'http://www.w3.org/2000/svg';
        var g = document.createElementNS(NS, 'g');
        g.appendChild(this._rect(x - s * 0.045, y - s * 0.22, s * 0.09, s * 0.4, c2));
        var cs = [[0, -0.5, 0.28], [-0.1, -0.46, 0.22], [0.12, -0.44, 0.2]];
        for (var i = 0; i < cs.length; i++) {
            var ci = cs[i];
            var c = document.createElementNS(NS, 'circle');
            c.setAttribute('cx', x + s * ci[0]); c.setAttribute('cy', y + s * ci[1]);
            c.setAttribute('r', s * ci[2]); c.setAttribute('fill', c1); g.appendChild(c);
        }
        svg.appendChild(g);
    }
    deadTree(svg, x, y, s, c) {
        var NS = 'http://www.w3.org/2000/svg';
        var g = document.createElementNS(NS, 'g');
        g.setAttribute('opacity', '0.65');
        g.appendChild(this._rect(x - s * 0.035, y - s * 0.75, s * 0.07, s * 0.75, c));
        var bs = [[0, -0.55, -0.28, -0.7], [0, -0.4, 0.22, -0.5], [0, -0.65, 0.14, -0.8]];
        for (var i = 0; i < bs.length; i++) {
            var b = bs[i];
            var p = document.createElementNS(NS, 'path');
            p.setAttribute('d', 'M' + (x + s * b[0]) + ' ' + (y + s * b[1]) + 'L' + (x + s * b[2]) + ' ' + (y + s * b[3]));
            p.setAttribute('stroke', c); p.setAttribute('stroke-width', s * 0.025);
            p.setAttribute('fill', 'none'); g.appendChild(p);
        }
        svg.appendChild(g);
    }
    house(svg, x, y, s, c1, c2, depth) {
        var NS = 'http://www.w3.org/2000/svg';
        var g = document.createElementNS(NS, 'g');
        var hw = s * 1.05, hh = s * 0.85;
        g.appendChild(this._rect(x - hw / 2, y - hh, hw, hh, c1));
        var roof = document.createElementNS(NS, 'path');
        roof.setAttribute('d', 'M' + (x - hw / 2 - s * 0.07) + ' ' + (y - hh) + 'L' + x + ' ' + (y - hh - s * 0.6) + 'L' + (x + hw / 2 + s * 0.07) + ' ' + (y - hh) + 'Z');
        roof.setAttribute('fill', c2); g.appendChild(roof);
        g.appendChild(this._rect(x - s * 0.09, y - s * 0.38, s * 0.18, s * 0.38, c2));
        if (depth > 0.3) {
            var ga = lerp(0.05, 0.5, (depth - 0.3) / 0.7), ws = s * 0.12;
            [-0.26, 0.26].forEach(function(off) {
                g.appendChild(this._rect(x + off * hw - ws / 2, y - hh + s * 0.2, ws, ws, 'rgba(212,168,67,' + ga + ')'));
            }.bind(this));
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
            p.setAttribute('d', 'M' + bx + ' ' + y + 'Q' + (bx + rand(-2, 2)) + ' ' + (y - s) + ' ' + (bx + rand(-4, 4)) + ' ' + y);
            p.setAttribute('stroke', c); p.setAttribute('stroke-width', clamp(s * 0.07, 0.8, 2.5));
            p.setAttribute('fill', 'none'); g.appendChild(p);
        }
        svg.appendChild(g);
    }
    _rect(x, y, w, h, fill) {
        var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', x); r.setAttribute('y', y);
        r.setAttribute('width', w); r.setAttribute('height', h);
        r.setAttribute('fill', fill); return r;
    }

    update(progress) {
        for (var li = 0; li < this.layers.length; li++) {
            var L = this.layers[li];
            var d = L.depth;
            // smoother forward traversal with more layers
            var zoom = 1 + progress * lerp(0.015, 1.8, d * d);
            var drop = progress * lerp(0, innerHeight * 0.7, d * d);
            // staggered fade — near layers vanish first, far layers linger
            var fadeStart = lerp(0.7, 0.05, d);
            var fadeLen = lerp(0.25, 0.45, d);
            var alpha = progress < fadeStart ? 1 : 1 - smoothstep(clamp((progress - fadeStart) / fadeLen, 0, 1));
            if (d < 0.2) alpha *= lerp(0.35, 1, d / 0.2);
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
            var fade = clamp(1 - progress * 2.2, 0, 1);
            var scale = 1 + progress * c.zoomRate;
            c.el.style.transform = 'translateY(' + sy + 'px) translateX(' + dx + 'px) scale(' + scale + ')';
            c.el.style.opacity = c.baseOp * fade;
        }
    }
}

class SkyController {
    constructor() { this.el = document.getElementById('sky'); }
    update(progress) {
        var b = lerp(1, 0.06, progress);
        var s = lerp(1, 2.5, progress);
        this.el.style.filter = 'brightness(' + b + ') saturate(' + s + ')';
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

        // Ribbon canvas — fixed fullscreen, z-index between landscape and content
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

        this.events();
        this.onScroll();
        this.loop();
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
        }, 150);
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

        // Underground overlay — smooth darkness fade
        // starts appearing around 40% scroll, fully dark by 65%
        var undergroundAlpha = smoothstep(clamp((this.scrollPct - 0.35) / 0.3, 0, 1));
        if (this.undergroundOverlay) {
            this.undergroundOverlay.style.opacity = undergroundAlpha;
        }
    }

    formSetup() {
        var form = document.getElementById('contactForm');
        if (!form) return;
        form.addEventListener('submit', function(e) {
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

        // Ribbons — fade out in basement section (no active ribbons in cave)
        var ribbonFade = 1 - smoothstep(clamp((this.scrollPct - 0.55) / 0.2, 0, 1));
        this.ribbonCanvasEl.style.opacity = ribbonFade;
        if (ribbonFade > 0.01) {
            this.ribbons.animate();
        }

        // Woven strings stay visible everywhere (fullscreen, subtle)
        this.woven.update(dt, this.scrollPct);

        this.clouds.update(this.scrollPct, this.time);
        this.mascots.update(this.scrollPct, this.time);

        // Dust in basement
        var dustOpacity = smoothstep(clamp((this.scrollPct - 0.65) / 0.15, 0, 1));
        this.dust.update(this.time, dustOpacity);

        if (this.floats) this.floats.update(this.px, this.py, this.scrollY);

        var self = this;
        requestAnimationFrame(function() { self.loop(); });
    }
}

document.addEventListener('DOMContentLoaded', function() { new App(); });