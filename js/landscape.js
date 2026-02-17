/**
 * Procedural Landscape — forward-traversal depth
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
            const d = i / (this.N - 1);
            this.addLayer(i, d, w);
        }
    }

    color(depth) {
        const t = depth;
        const t2 = t * t;
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
        const hill = this.hillPath(w, h, depth);
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', hill.d);
        p.setAttribute('fill', c.str);
        svg.appendChild(p);

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

        if (depth > 0.08 && depth < 0.9) {
            const count = Math.round(lerp(1, 10, 1 - Math.abs(depth - 0.4) * 2.5));
            for (let i = 0; i < Math.max(count, 0); i++) {
                const x = rand(30, w - 30);
                const y = hill.getY(x);
                const s = sz * rand(0.6, 1.3);
                if (this.srand(idx, i * 13) > 0.5) this.pine(svg, x, y, s, dk1, dk2);
                else this.roundTree(svg, x, y, s, dk1, dk2);
            }
        }

        if (depth > 0.22 && depth < 0.82) {
            const n = this.srand(idx, 77) > 0.45 ? randI(1, 2) : 0;
            for (let i = 0; i < n; i++) {
                const x = rand(100, w - 140);
                const y = hill.getY(x);
                this.house(svg, x, y, sz * rand(0.8, 1.2), dk1, dk2, depth);
            }
        }

        if (depth > 0.5) {
            const n = randI(4, 14);
            for (let i = 0; i < n; i++) {
                const x = rand(15, w - 15);
                const y = hill.getY(x) + rand(-2, 3);
                this.grass(svg, x, y, sz * rand(0.5, 1.3), dk2);
            }
        }

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
            c.setAttribute('cx', x + s * ox); c.setAttribute('cy', y + s * oy);
            c.setAttribute('r', s * r); c.setAttribute('fill', c1);
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
            p.setAttribute('stroke', c); p.setAttribute('stroke-width', s * 0.025);
            p.setAttribute('fill', 'none'); g.appendChild(p);
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
        roof.setAttribute('fill', c2); g.appendChild(roof);
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
            p.setAttribute('stroke', c); p.setAttribute('stroke-width', clamp(s * 0.07, 0.8, 2.5));
            p.setAttribute('fill', 'none'); g.appendChild(p);
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
            const zoom = 1 + progress * lerp(0.02, 2.2, d * d);
            const drop = progress * lerp(0, innerHeight * 0.9, d * d);
            const fadeAt = lerp(0.65, 0.04, d);
            const fadeLen = lerp(0.3, 0.55, d);
            let alpha = progress < fadeAt ? 1 : 1 - smoothstep(clamp((progress - fadeAt) / fadeLen, 0, 1));
            if (d < 0.25) alpha *= lerp(0.4, 1, d / 0.25);
            L.el.style.transform = `translateY(${drop}px) scale(${zoom})`;
            L.el.style.opacity = clamp(alpha, 0, 1);
            const vis = alpha > 0.005;
            if (vis !== L.vis) { L.vis = vis; L.el.style.display = vis ? '' : 'none'; }
        }
    }
}

/**
 * Clouds
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
 * Sky
 */
class Sky {
    constructor() { this.el = document.getElementById('sky'); }
    update(progress) {
        const b = lerp(1, 0.08, progress);
        const s = lerp(1, 2, progress);
        this.el.style.filter = `brightness(${b}) saturate(${s})`;
    }
}