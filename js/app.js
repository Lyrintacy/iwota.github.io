/**
 * Procedural Landscape — forward-traversal depth
 * Layers zoom up + fade as you "walk through" them
 * Colors: white (far) → gray → purple → black (near)
 */
class Landscape {
    constructor(container) {
        this.container = container;
        this.layers = [];
        this.N = 10;
        this.seed = rand(0, 9999);
        this.build();
        window.addEventListener('resize', () => this.build());
    }

    srand(a, b) {
        const x = Math.sin(this.seed + a * 127.1 + b * 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    build() {
        this.container.innerHTML = '';
        this.layers = [];
        const w = Math.max(innerWidth * 1.2, 1500);

        for (let i = 0; i < this.N; i++) {
            const d = i / (this.N - 1); // 0=far 1=near
            this.addLayer(i, d, w);
        }
    }

    color(depth) {
        const t = depth;
        const t2 = t * t;
        // far=white, mid=gray-purple, near=very dark purple-black
        const r = Math.round(lerp(232, 4, t2 * 0.8 + t * 0.2));
        const g = Math.round(lerp(228, 2, t2 * 0.85 + t * 0.15));
        const b = Math.round(lerp(236, 10, t2 * 0.55 + t * 0.45));
        return { r, g, b, str: `rgb(${r},${g},${b})` };
    }

    darker(c, amt) {
        return `rgb(${Math.max(c.r - amt, 0)},${Math.max(c.g - amt, 0)},${Math.max(c.b - Math.round(amt * 0.5), 0)})`;
    }

    addLayer(idx, depth, w) {
        const NS = 'http://www.w3.org/2000/svg';
        const h = Math.round(lerp(180, 420, depth));
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.setAttribute('preserveAspectRatio', 'none');

        const c = this.color(depth);

        // hill
        const hill = this.hillPath(w, h, depth);
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', hill.d);
        p.setAttribute('fill', c.str);
        svg.appendChild(p);

        // objects
        this.addObjects(svg, hill, w, h, depth, c, idx);

        const div = document.createElement('div');
        div.className = 'land-layer';
        div.style.zIndex = idx + 2;
        div.appendChild(svg);
        this.container.appendChild(div);

        this.layers.push({ el: div, depth, vis: true });
    }

    hillPath(w, h, depth) {
        const segs = randI(7, 13);
        const base = lerp(h * 0.68, h * 0.32, depth);
        const amp = lerp(10, 60, depth);
        const s = this.seed + depth * 77;

        const ys = [];
        for (let i = 0; i <= segs; i++) {
            ys.push(base
                + Math.sin(i * 1.4 + s) * amp
                + Math.sin(i * 2.8 + s * 0.6) * amp * 0.35
                + Math.sin(i * 0.5 + s * 1.4) * amp * 0.45
            );
        }

        let d = `M0 ${h} L0 ${ys[0]}`;
        for (let i = 0; i < segs; i++) {
            const x0 = (i / segs) * w;
            const x1 = ((i + 1) / segs) * w;
            const xm = (x0 + x1) / 2;
            const ym = (ys[i] + ys[i + 1]) / 2;
            d += ` Q${x0 + (x1 - x0) * 0.5} ${ys[i]} ${xm} ${ym}`;
        }
        d += ` L${w} ${ys[segs]} L${w} ${h} Z`;

        const getY = x => {
            const t = (x / w) * segs;
            const i = Math.floor(clamp(t, 0, segs - 1));
            return lerp(ys[i], ys[Math.min(i + 1, segs)], t - i);
        };

        return { d, getY };
    }

    addObjects(svg, hill, w, h, depth, c, idx) {
        const NS = 'http://www.w3.org/2000/svg';
        const dk1 = this.darker(c, Math.round(lerp(10, 30, depth)));
        const dk2 = this.darker(c, Math.round(lerp(20, 50, depth)));
        const sz = lerp(5, 42, depth);

        // trees — mid layers
        if (depth > 0.08 && depth < 0.9) {
            const count = Math.round(lerp(1, 10, 1 - Math.abs(depth - 0.4) * 2.5));
            for (let i = 0; i < Math.max(count, 0); i++) {
                const x = rand(30, w - 30);
                const y = hill.getY(x);
                const s = sz * rand(0.6, 1.3);
                if (this.srand(idx, i * 13) > 0.5) {
                    this.pine(svg, x, y, s, dk1, dk2);
                } else {
                    this.roundTree(svg, x, y, s, dk1, dk2);
                }
            }
        }

        // houses — mid-to-near
        if (depth > 0.22 && depth < 0.82) {
            const n = this.srand(idx, 77) > 0.45 ? randI(1, 2) : 0;
            for (let i = 0; i < n; i++) {
                const x = rand(100, w - 140);
                const y = hill.getY(x);
                this.house(svg, x, y, sz * rand(0.8, 1.2), dk1, dk2, depth);
            }
        }

        // grass — close
        if (depth > 0.5) {
            const n = randI(4, 14);
            for (let i = 0; i < n; i++) {
                const x = rand(15, w - 15);
                const y = hill.getY(x) + rand(-2, 3);
                this.grass(svg, x, y, sz * rand(0.5, 1.3), dk2);
            }
        }

        // dead trees — closest
        if (depth > 0.72 && this.srand(idx, 42) > 0.45) {
            const x = rand(80, w - 80);
            this.deadTree(svg, x, hill.getY(x), lerp(18, 50, depth), dk2);
        }
    }

    pine(svg, x, y, s, c1, c2) {
        const NS = 'http://www.w3.org/2000/svg';
        const g = document.createElementNS(NS, 'g');
        g.appendChild(this.rect(x - s * 0.05, y, s * 0.1, s * 0.35, c2));
        for (let i = 0; i < 3; i++) {
            const ly = y - s * (0.22 + i * 0.24);
            const lw = s * (0.42 - i * 0.09);
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('d', `M${x} ${ly - s * 0.2}L${x - lw} ${ly + s * 0.07}L${x + lw} ${ly + s * 0.07}Z`);
            p.setAttribute('fill', c1);
            g.appendChild(p);
        }
        svg.appendChild(g);
    }

    roundTree(svg, x, y, s, c1, c2) {
        const NS = 'http://www.w3.org/2000/svg';
        const g = document.createElementNS(NS, 'g');
        g.appendChild(this.rect(x - s * 0.045, y - s * 0.22, s * 0.09, s * 0.4, c2));
        [[0, -0.5, 0.28], [-0.1, -0.46, 0.22], [0.12, -0.44, 0.2]].forEach(([ox, oy, r]) => {
            const c = document.createElementNS(NS, 'circle');
            c.setAttribute('cx', x + s * ox);
            c.setAttribute('cy', y + s * oy);
            c.setAttribute('r', s * r);
            c.setAttribute('fill', c1);
            g.appendChild(c);
        });
        svg.appendChild(g);
    }

    deadTree(svg, x, y, s, c) {
        const NS = 'http://www.w3.org/2000/svg';
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('opacity', '0.65');
        g.appendChild(this.rect(x - s * 0.035, y - s * 0.75, s * 0.07, s * 0.75, c));
        [[0, -0.55, -0.28, -0.7], [0, -0.4, 0.22, -0.5], [0, -0.65, 0.14, -0.8]].forEach(([x1o, y1o, x2o, y2o]) => {
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('d', `M${x + s * x1o} ${y + s * y1o}L${x + s * x2o} ${y + s * y2o}`);
            p.setAttribute('stroke', c);
            p.setAttribute('stroke-width', s * 0.025);
            p.setAttribute('fill', 'none');
            g.appendChild(p);
        });
        svg.appendChild(g);
    }

    house(svg, x, y, s, c1, c2, depth) {
        const NS = 'http://www.w3.org/2000/svg';
        const g = document.createElementNS(NS, 'g');
        const hw = s * 1.05, hh = s * 0.85;
        g.appendChild(this.rect(x - hw / 2, y - hh, hw, hh, c1));
        const roof = document.createElementNS(NS, 'path');
        roof.setAttribute('d', `M${x - hw / 2 - s * 0.07} ${y - hh}L${x} ${y - hh - s * 0.6}L${x + hw / 2 + s * 0.07} ${y - hh}Z`);
        roof.setAttribute('fill', c2);
        g.appendChild(roof);
        g.appendChild(this.rect(x - s * 0.09, y - s * 0.38, s * 0.18, s * 0.38, c2));
        if (depth > 0.3) {
            const ga = lerp(0.05, 0.5, (depth - 0.3) / 0.7);
            const ws = s * 0.12;
            [-0.26, 0.26].forEach(off => {
                g.appendChild(this.rect(x + off * hw - ws / 2, y - hh + s * 0.2, ws, ws, `rgba(212,168,67,${ga})`));
            });
        }
        if (depth > 0.38 && this.srand(x, y) > 0.4) {
            g.appendChild(this.rect(x + hw * 0.2, y - hh - s * 0.42, s * 0.09, s * 0.46, c2));
        }
        svg.appendChild(g);
    }

    grass(svg, x, y, s, c) {
        const NS = 'http://www.w3.org/2000/svg';
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('opacity', '0.3');
        for (let i = -1; i <= 1; i++) {
            const bx = x + i * s * 0.16;
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('d', `M${bx} ${y}Q${bx + rand(-2, 2)} ${y - s}${bx + rand(-4, 4)} ${y}`);
            p.setAttribute('stroke', c);
            p.setAttribute('stroke-width', clamp(s * 0.07, 0.8, 2.5));
            p.setAttribute('fill', 'none');
            g.appendChild(p);
        }
        svg.appendChild(g);
    }

    rect(x, y, w, h, fill) {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', x); r.setAttribute('y', y);
        r.setAttribute('width', w); r.setAttribute('height', h);
        r.setAttribute('fill', fill);
        return r;
    }

    update(progress) {
        for (const L of this.layers) {
            const d = L.depth;
            // FORWARD TRAVERSAL
            // Close layers zoom dramatically + fade first = passing through them
            // Far layers barely move + persist = distant horizon
            const zoom = 1 + progress * lerp(0.02, 2.2, d * d);
            const drop = progress * lerp(0, innerHeight * 0.9, d * d);

            // fade: close layers vanish early, far layers linger
            const fadeAt = lerp(0.65, 0.04, d);
            const fadeLen = lerp(0.3, 0.55, d);
            let alpha = progress < fadeAt ? 1 : 1 - smoothstep(clamp((progress - fadeAt) / fadeLen, 0, 1));

            // aerial perspective: far layers slightly transparent
            if (d < 0.25) alpha *= lerp(0.4, 1, d / 0.25);

            L.el.style.transform = `translateY(${drop}px) scale(${zoom})`;
            L.el.style.opacity = clamp(alpha, 0, 1);

            const vis = alpha > 0.005;
            if (vis !== L.vis) { L.vis = vis; L.el.style.display = vis ? '' : 'none'; }
        }
    }
}

/**
 * Pride Strings woven between landscape layers
 * Multiple small canvases at different z-indices
 */
class WovenStrings {
    constructor(container, layerCount) {
        this.container = container;
        this.canvases = [];
        this.contexts = [];
        this.strings = [];
        this.N = 3; // 3 string layers woven between landscape
        this.time = rand(0, 1000);
        this.colorShift = 0;

        for (let i = 0; i < this.N; i++) {
            const canvas = document.createElement('canvas');
            canvas.className = 'string-canvas';
            // z-index between landscape layers
            canvas.style.zIndex = Math.round(lerp(3, layerCount + 1, i / (this.N - 1)));
            container.appendChild(canvas);
            this.canvases.push(canvas);
            this.contexts.push(canvas.getContext('2d'));

            // each canvas gets 4-6 organic strings
            const count = randI(4, 6);
            const group = [];
            for (let j = 0; j < count; j++) {
                group.push(this.createString(i, j, count));
            }
            this.strings.push(group);
        }

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    createString(layerIdx, idx, total) {
        return {
            colorIdx: (layerIdx * 2.5 + idx * 1.2) % PRIDE.length,
            homeY: rand(0.2, 0.85),
            waves: [
                { amp: rand(30, 80), freq: rand(0.003, 0.008), speed: rand(0.1, 0.25), phase: rand(0, Math.PI * 2) },
                { amp: rand(8, 25), freq: rand(0.01, 0.025), speed: rand(0.3, 0.5), phase: rand(0, Math.PI * 2) },
                { amp: rand(2, 8), freq: rand(0.04, 0.08), speed: rand(0.5, 0.8), phase: rand(0, Math.PI * 2) }
            ],
            width: rand(1, 2.5),
            opMin: rand(0.04, 0.1),
            opMax: rand(0.2, 0.45),
            breathPhase: rand(0, Math.PI * 2),
            breathSpeed: rand(0.2, 0.5),
            travelDir: Math.random() > 0.5 ? 1 : -1,
            travelSpeed: rand(0.1, 0.4)
        };
    }

    resize() {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        for (const c of this.canvases) {
            c.width = innerWidth * dpr;
            c.height = innerHeight * dpr;
            c.style.width = innerWidth + 'px';
            c.style.height = innerHeight + 'px';
        }
        this.dpr = dpr;
    }

    update(dt, scrollProgress) {
        this.time += dt;
        this.colorShift = scrollProgress * PRIDE.length * 0.6;

        // strings become more visible as we descend
        const baseVis = lerp(0.3, 1, smoothstep(scrollProgress));
        // blend mode: multiply on white bg → screen in dark basement
        const blendMode = scrollProgress > 0.45 ? 'screen' : 'multiply';

        for (let i = 0; i < this.N; i++) {
            const ctx = this.contexts[i];
            const canvas = this.canvases[i];
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            ctx.clearRect(0, 0, innerWidth, innerHeight);

            canvas.style.opacity = clamp(baseVis * lerp(0.5, 1, i / (this.N - 1)), 0, 1);
            canvas.style.mixBlendMode = blendMode;

            for (const s of this.strings[i]) {
                this.drawString(ctx, s);
            }
        }
    }

    drawString(ctx, s) {
        const w = innerWidth;
        const h = innerHeight;
        const segs = 80;
        const t = this.time;

        // breathing opacity
        const breath = Math.sin(t * s.breathSpeed + s.breathPhase) * 0.5 + 0.5;
        const opacity = lerp(s.opMin, s.opMax, breath);

        const c = prideColor(s.colorIdx, this.colorShift);
        const travel = t * s.travelSpeed * s.travelDir;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let prevX, prevY;
        for (let i = 0; i <= segs; i++) {
            const pct = i / segs;
            const x = pct * w;
            let y = s.homeY * h;

            for (const wave of s.waves) {
                y += Math.sin(pct * w * wave.freq + t * wave.speed + wave.phase + travel * 0.05) * wave.amp;
            }

            if (i > 0) {
                // per-segment opacity for shimmer
                const shimmer = Math.sin(i * 0.12 + t * 1.2 + s.breathPhase) * 0.3 + 0.7;
                const segOp = opacity * shimmer;

                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x, y);
                ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${clamp(segOp, 0, 0.6)})`;
                ctx.lineWidth = s.width * (0.7 + breath * 0.5);
                ctx.stroke();

                // bloom glow
                if (segOp > 0.1) {
                    ctx.beginPath();
                    ctx.moveTo(prevX, prevY);
                    ctx.lineTo(x, y);
                    ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${segOp * 0.2})`;
                    ctx.lineWidth = s.width + 4;
                    ctx.stroke();
                }
            }

            prevX = x;
            prevY = y;
        }
    }
}

/**
 * Cloud parallax + fade
 */
class Clouds {
    constructor() {
        this.items = [];
        document.querySelectorAll('.cloud').forEach((el, i) => {
            this.items.push({
                el,
                baseOp: parseFloat(getComputedStyle(el).opacity) || 0.5,
                pSpeed: rand(0.015, 0.055),
                dPhase: rand(0, Math.PI * 2),
                dSpeed: rand(0.0008, 0.002),
                dAmp: rand(18, 45),
                zoomRate: 0.04 + i * 0.015
            });
        });
    }

    update(progress, time) {
        for (const c of this.items) {
            const sy = progress * -innerHeight * c.pSpeed * 5;
            const dx = Math.sin(time * c.dSpeed + c.dPhase) * c.dAmp;
            const fade = clamp(1 - progress * 2.2, 0, 1);
            const scale = 1 + progress * c.zoomRate;
            c.el.style.transform = `translateY(${sy}px) translateX(${dx}px) scale(${scale})`;
            c.el.style.opacity = c.baseOp * fade;
        }
    }
}

/**
 * Sky controller
 */
class Sky {
    constructor() {
        this.el = document.getElementById('sky');
    }
    update(progress) {
        const b = lerp(1, 0.08, progress);
        const s = lerp(1, 2, progress);
        this.el.style.filter = `brightness(${b}) saturate(${s})`;
    }
}

/**
 * Main App
 */
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

        this.px = -1000; this.py = -1000;
        this.scrollY = 0; this.scrollPct = 0;
        this.running = true;
        this.mobile = isTouch();
        this.time = 0;
        this.lastTime = performance.now();

        this.init();
    }

    init() {
        this.floats = new FloatingManager(this.floatBox, this.mobile);
        this.landscape = new Landscape(this.landWrap);
        this.woven = new WovenStrings(this.stringWrap, this.landscape.N);
        this.clouds = new Clouds();
        this.sky = new Sky();

        this.events();
        this.onScroll();
        this.loop();
    }

    events() {
        if (this.mobile) {
            document.addEventListener('touchstart', e => this.onTouch(e), { passive: true });
            document.addEventListener('touchmove', e => this.onTouch(e), { passive: true });
            document.addEventListener('touchend', () => this.offPointer());
        } else {
            document.addEventListener('mousemove', e => this.onMouse(e));
            document.addEventListener('mouseleave', () => this.offPointer());
        }

        window.addEventListener('scroll', () => this.onScroll(), { passive: true });

        document.addEventListener('visibilitychange', () => {
            this.running = !document.hidden;
            if (this.running) { this.lastTime = performance.now(); this.loop(); }
        });

        if (this.menuBtn) {
            this.menuBtn.addEventListener('click', () => {
                this.menuBtn.classList.toggle('active');
                this.mobileNav.classList.toggle('active');
            });
        }

        document.querySelectorAll('.mnav a').forEach(a => {
            a.addEventListener('click', () => {
                this.menuBtn.classList.remove('active');
                this.mobileNav.classList.remove('active');
            });
        });

        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                const t = document.querySelector(a.getAttribute('href'));
                if (t) t.scrollIntoView({ behavior: 'smooth' });
            });
        });

        this.formSetup();
    }

    setPointer(x, y) {
        this.px = x; this.py = y;
        if (this.glow) { this.glow.style.left = x + 'px'; this.glow.style.top = y + 'px'; this.glow.classList.add('visible'); }
    }

    onMouse(e) { this.setPointer(e.clientX, e.clientY); }

    onTouch(e) {
        const t = e.touches[0];
        if (!t) return;
        this.setPointer(t.clientX, t.clientY);
        if (this.floats) this.floats.touchNear(t.clientX, t.clientY);
    }

    offPointer() {
        setTimeout(() => {
            this.px = -1000; this.py = -1000;
            if (this.glow) this.glow.classList.remove('visible');
        }, 150);
    }

    onScroll() {
        this.scrollY = scrollY;
        const max = document.documentElement.scrollHeight - innerHeight;
        this.scrollPct = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
        if (this.progressBar) this.progressBar.style.width = (this.scrollPct * 100) + '%';
        if (this.navbar) this.navbar.classList.toggle('at-top', scrollY < 50);

        this.landscape.update(this.scrollPct);
        this.sky.update(this.scrollPct);
    }

    formSetup() {
        const form = document.getElementById('contactForm');
        if (!form) return;
        form.addEventListener('submit', e => {
            e.preventDefault();
            const btn = form.querySelector('.btn');
            const txt = btn.textContent;
            btn.textContent = 'Sending…'; btn.disabled = true;
            setTimeout(() => {
                btn.textContent = '✓ Swallowed by the void';
                form.reset();
                setTimeout(() => { btn.textContent = txt; btn.disabled = false; }, 3000);
            }, 1500);
        });
    }

    loop() {
        if (!this.running) return;
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        this.time += dt;

        this.woven.update(dt, this.scrollPct);
        this.clouds.update(this.scrollPct, this.time);
        if (this.floats) this.floats.update(this.px, this.py, this.scrollY);

        requestAnimationFrame(() => this.loop());
    }
}

document.addEventListener('DOMContentLoaded', () => new App());