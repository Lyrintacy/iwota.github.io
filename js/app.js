/**
 * Procedural Landscape Generator
 * Creates layered hills with trees, houses at appropriate depth shading
 */
class LandscapeGenerator {
    constructor(container) {
        this.container = container;
        this.layers = [];
        this.layerCount = 8;
        this.generate();
        window.addEventListener('resize', () => this.generate());
    }

    generate() {
        this.container.innerHTML = '';
        this.layers = [];
        const w = Math.max(innerWidth * 1.15, 1400);

        for (let i = 0; i < this.layerCount; i++) {
            const depth = i / (this.layerCount - 1); // 0 = farthest, 1 = closest
            const layer = this.createLayer(i, depth, w);
            this.layers.push(layer);
        }
    }

    createLayer(index, depth, w) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const h = lerp(180, 350, depth);
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.setAttribute('preserveAspectRatio', 'none');

        // color: white → gray → dark purple → near black
        const lightness = Math.round(lerp(230, 8, depth * depth));
        const purpleTint = depth > 0.4 ? Math.round(lerp(0, 30, (depth - 0.4) / 0.6)) : 0;
        const r = Math.max(lightness - purpleTint * 0.3, 5);
        const g = Math.max(lightness - purpleTint, 3);
        const b = Math.min(lightness + purpleTint * 0.5, 255);
        const fillColor = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

        // darker shade for objects on this layer
        const objR = Math.max(r - 20, 2);
        const objG = Math.max(g - 25, 2);
        const objB = Math.min(b - 5, 250);
        const objColor = `rgb(${Math.round(objR)},${Math.round(objG)},${Math.round(objB)})`;

        const darkObjR = Math.max(r - 40, 1);
        const darkObjG = Math.max(g - 45, 1);
        const darkObjB = Math.max(b - 15, 1);
        const darkObjColor = `rgb(${Math.round(darkObjR)},${Math.round(darkObjG)},${Math.round(darkObjB)})`;

        // hill path
        const hillPath = this.generateHillPath(w, h, depth);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', hillPath);
        path.setAttribute('fill', fillColor);
        svg.appendChild(path);

        // trees — more on mid layers, fewer on far/near
        const treeDensity = depth > 0.15 && depth < 0.85 ? lerp(2, 8, 1 - Math.abs(depth - 0.5) * 2) : 0;
        for (let t = 0; t < treeDensity; t++) {
            const tx = rand(50, w - 50);
            const ty = this.getHillY(tx, w, h, depth) - rand(0, 5);
            const treeSize = lerp(8, 35, depth);
            const treeType = Math.random();

            if (treeType < 0.5) {
                this.addPineTree(svg, tx, ty, treeSize, objColor, darkObjColor);
            } else {
                this.addRoundTree(svg, tx, ty, treeSize, objColor);
            }
        }

        // houses — only on mid-to-near layers
        if (depth > 0.3 && depth < 0.8) {
            const houseCount = randI(0, 2);
            for (let h2 = 0; h2 < houseCount; h2++) {
                const hx = rand(100, w - 150);
                const hy = this.getHillY(hx, w, h, depth);
                const houseSize = lerp(12, 40, depth);
                this.addHouse(svg, hx, hy, houseSize, objColor, darkObjColor, depth);
            }
        }

        // grass tufts on close layers
        if (depth > 0.6) {
            const grassCount = randI(4, 12);
            for (let g = 0; g < grassCount; g++) {
                const gx = rand(30, w - 30);
                const gy = this.getHillY(gx, w, h, depth) + rand(-3, 2);
                this.addGrass(svg, gx, gy, lerp(6, 18, depth), objColor);
            }
        }

        // wrap in div
        const div = document.createElement('div');
        div.className = 'land-layer';
        div.style.zIndex = index + 2;
        div.appendChild(svg);
        this.container.appendChild(div);

        return {
            el: div,
            depth,
            index,
            baseScale: 1,
            baseY: 0
        };
    }

    generateHillPath(w, h, depth) {
        const points = [];
        const segments = randI(6, 12);
        const baseY = lerp(h * 0.7, h * 0.4, depth);
        const amplitude = lerp(15, 60, depth);

        points.push(`M0 ${h}`);
        points.push(`L0 ${baseY}`);

        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * w;
            const y = baseY + Math.sin(i * 1.3 + depth * 10) * amplitude
                     + Math.sin(i * 2.7 + depth * 5) * amplitude * 0.4
                     + rand(-amplitude * 0.2, amplitude * 0.2);
            if (i === 0) {
                points.push(`Q${x + w / segments / 2} ${y} ${(i + 0.5) / segments * w} ${y}`);
            } else {
                const px = ((i - 0.5) / segments) * w;
                points.push(`Q${px} ${y} ${x} ${y}`);
            }
        }

        points.push(`L${w} ${h}`);
        points.push('Z');

        // store hill data for object placement
        this._lastHillData = { baseY, amplitude, depth, segments };

        return points.join(' ');
    }

    getHillY(x, w, h, depth) {
        const d = this._lastHillData || { baseY: h * 0.5, amplitude: 30, depth, segments: 8 };
        const t = x / w * d.segments;
        return d.baseY + Math.sin(t * 1.3 + depth * 10) * d.amplitude
             + Math.sin(t * 2.7 + depth * 5) * d.amplitude * 0.4;
    }

    addPineTree(svg, x, y, size, color, darkColor) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('opacity', '0.85');

        // trunk
        const trunk = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        trunk.setAttribute('x', x - size * 0.06);
        trunk.setAttribute('y', y);
        trunk.setAttribute('width', size * 0.12);
        trunk.setAttribute('height', size * 0.4);
        trunk.setAttribute('fill', darkColor);
        g.appendChild(trunk);

        // foliage layers
        for (let i = 0; i < 3; i++) {
            const layerY = y - size * (0.3 + i * 0.28);
            const layerW = size * (0.5 - i * 0.1);
            const tri = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            tri.setAttribute('d', `M${x} ${layerY - size * 0.25} L${x - layerW} ${layerY + size * 0.1} L${x + layerW} ${layerY + size * 0.1} Z`);
            tri.setAttribute('fill', color);
            g.appendChild(tri);
        }

        svg.appendChild(g);
    }

    addRoundTree(svg, x, y, size, color) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('opacity', '0.8');

        // trunk
        const trunk = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        trunk.setAttribute('x', x - size * 0.05);
        trunk.setAttribute('y', y - size * 0.3);
        trunk.setAttribute('width', size * 0.1);
        trunk.setAttribute('height', size * 0.5);
        trunk.setAttribute('fill', color);
        g.appendChild(trunk);

        // canopy circles
        for (let i = 0; i < 3; i++) {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx', x + rand(-size * 0.15, size * 0.15));
            c.setAttribute('cy', y - size * 0.5 - rand(0, size * 0.2));
            c.setAttribute('r', size * rand(0.2, 0.35));
            c.setAttribute('fill', color);
            g.appendChild(c);
        }

        svg.appendChild(g);
    }

    addHouse(svg, x, y, size, color, darkColor, depth) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('opacity', '0.9');

        const hw = size * 1.2;
        const hh = size;

        // body
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        body.setAttribute('x', x - hw / 2);
        body.setAttribute('y', y - hh);
        body.setAttribute('width', hw);
        body.setAttribute('height', hh);
        body.setAttribute('fill', color);
        g.appendChild(body);

        // roof
        const roof = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        roof.setAttribute('d', `M${x - hw / 2 - size * 0.1} ${y - hh} L${x} ${y - hh - size * 0.7} L${x + hw / 2 + size * 0.1} ${y - hh} Z`);
        roof.setAttribute('fill', darkColor);
        g.appendChild(roof);

        // door
        const door = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        door.setAttribute('x', x - size * 0.12);
        door.setAttribute('y', y - size * 0.45);
        door.setAttribute('width', size * 0.24);
        door.setAttribute('height', size * 0.45);
        door.setAttribute('fill', darkColor);
        g.appendChild(door);

        // windows with warm glow
        if (depth > 0.35) {
            const winSize = size * 0.15;
            const goldAlpha = lerp(0.1, 0.4, depth);
            [-0.3, 0.3].forEach(offset => {
                const win = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                win.setAttribute('x', x + offset * hw - winSize / 2);
                win.setAttribute('y', y - hh + size * 0.25);
                win.setAttribute('width', winSize);
                win.setAttribute('height', winSize);
                win.setAttribute('fill', `rgba(212,168,67,${goldAlpha})`);
                g.appendChild(win);
            });
        }

        // chimney on deeper layers
        if (depth > 0.5 && Math.random() > 0.4) {
            const chimney = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            chimney.setAttribute('x', x + hw * 0.2);
            chimney.setAttribute('y', y - hh - size * 0.5);
            chimney.setAttribute('width', size * 0.12);
            chimney.setAttribute('height', size * 0.55);
            chimney.setAttribute('fill', darkColor);
            g.appendChild(chimney);
        }

        svg.appendChild(g);
    }

    addGrass(svg, x, y, size, color) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('opacity', '0.4');

        for (let i = 0; i < 3; i++) {
            const blade = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const bx = x + (i - 1) * size * 0.2;
            blade.setAttribute('d', `M${bx} ${y} Q${bx + rand(-3, 3)} ${y - size} ${bx + rand(-4, 4)} ${y}`);
            blade.setAttribute('stroke', color);
            blade.setAttribute('stroke-width', lerp(1, 2.5, size / 18));
            blade.setAttribute('fill', 'none');
            g.appendChild(blade);
        }

        svg.appendChild(g);
    }

    update(scrollProgress) {
        // zoom/depth effect — as you scroll, layers scale up and fade
        // creating the feeling of moving forward through the landscape
        for (const layer of this.layers) {
            const depth = layer.depth;

            // scale: closer layers zoom more, creating forward motion
            const zoomAmount = scrollProgress * lerp(0.02, 0.6, depth);
            const scale = 1 + zoomAmount;

            // vertical shift: layers move down as they "pass" us
            const yShift = scrollProgress * lerp(5, 200, depth);

            // opacity: far layers fade first, close layers last
            const fadeStart = lerp(0.0, 0.5, 1 - depth);
            const fadeEnd = lerp(0.3, 0.95, 1 - depth);
            const opacity = 1 - smoothstep(clamp((scrollProgress - fadeStart) / (fadeEnd - fadeStart), 0, 1));

            layer.el.style.transform = `translateY(${yShift}px) scale(${scale})`;
            layer.el.style.transformOrigin = 'center bottom';
            layer.el.style.opacity = clamp(opacity, 0, 1);
        }
    }
}

/**
 * Cloud Parallax
 */
class CloudController {
    constructor() {
        this.clouds = document.querySelectorAll('.cloud');
        this.data = [];
        this.clouds.forEach((cloud, i) => {
            this.data.push({
                el: cloud,
                speed: rand(0.02, 0.08),
                driftSpeed: rand(0.001, 0.003),
                driftAmp: rand(15, 40),
                baseX: parseFloat(cloud.style.left) || 0,
                phase: rand(0, Math.PI * 2)
            });
        });
    }

    update(scrollProgress, time) {
        for (const cloud of this.data) {
            const scrollY = scrollProgress * innerHeight * cloud.speed * -8;
            const drift = Math.sin(time * cloud.driftSpeed + cloud.phase) * cloud.driftAmp;
            // clouds also fade as we descend
            const opacity = clamp(1 - scrollProgress * 1.5, 0, 1);
            cloud.el.style.transform = `translateY(${scrollY}px) translateX(${drift}px)`;
            cloud.el.style.opacity = opacity * parseFloat(cloud.el.style.opacity || 1);
        }
    }
}

/**
 * Sky Darkening
 */
class SkyController {
    constructor() {
        this.sky = document.getElementById('sky');
    }

    update(scrollProgress) {
        // sky darkens as we descend into the basement
        const darkness = scrollProgress * 0.7;
        this.sky.style.filter = `brightness(${1 - darkness})`;
    }
}

/**
 * Main Application
 */
class App {
    constructor() {
        this.canvasEl = document.getElementById('ribbonCanvas');
        this.floatBox = document.getElementById('floatingStrings');
        this.glow = document.getElementById('cursorGlow');
        this.progressBar = document.getElementById('scrollProgress');
        this.menuBtn = document.getElementById('mobileMenuBtn');
        this.mobileNav = document.getElementById('mobileNav');
        this.navbar = document.getElementById('navbar');
        this.landscapeContainer = document.getElementById('landscapeContainer');

        this.px = -1000;
        this.py = -1000;
        this.scrollY = 0;
        this.scrollPct = 0;
        this.running = true;
        this.mobile = isTouch();
        this.time = 0;

        this.init();
    }

    init() {
        // pride ribbon strings woven into the landscape
        if (this.canvasEl) {
            this.ribbons = new RibbonCanvas(this.canvasEl);
        }

        this.floats = new FloatingManager(this.floatBox, this.mobile);
        this.landscape = new LandscapeGenerator(this.landscapeContainer);
        this.clouds = new CloudController();
        this.sky = new SkyController();

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
            if (this.running && this.ribbons) this.ribbons.lastTime = performance.now();
            if (this.running) this.loop();
        });

        if (this.menuBtn) {
            this.menuBtn.addEventListener('click', () => {
                this.menuBtn.classList.toggle('active');
                this.mobileNav.classList.toggle('active');
            });
        }

        document.querySelectorAll('.mobile-nav a').forEach(a => {
            a.addEventListener('click', () => {
                this.menuBtn.classList.remove('active');
                this.mobileNav.classList.remove('active');
            });
        });

        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                const target = document.querySelector(a.getAttribute('href'));
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        });

        this.formSetup();
    }

    setPointer(x, y) {
        this.px = x; this.py = y;
        if (this.glow) {
            this.glow.style.left = x + 'px';
            this.glow.style.top = y + 'px';
            this.glow.classList.add('visible');
        }
        if (this.ribbons) this.ribbons.updatePointer(x, y);
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
            if (this.ribbons) this.ribbons.updatePointer(-1000, -1000);
        }, 150);
    }

    onScroll() {
        this.scrollY = scrollY;
        const max = document.documentElement.scrollHeight - innerHeight;
        this.scrollPct = max > 0 ? clamp(scrollY / max, 0, 1) : 0;

        if (this.progressBar) {
            this.progressBar.style.width = (this.scrollPct * 100) + '%';
        }

        // navbar transparency at top
        if (this.navbar) {
            this.navbar.classList.toggle('at-top', scrollY < 50);
        }

        // update landscape parallax
        this.landscape.update(this.scrollPct);
        this.sky.update(this.scrollPct);

        if (this.ribbons) this.ribbons.updateScroll(this.scrollPct);
    }

    formSetup() {
        const form = document.getElementById('contactForm');
        if (!form) return;
        form.addEventListener('submit', e => {
            e.preventDefault();
            const btn = form.querySelector('.btn');
            const txt = btn.textContent;
            btn.textContent = 'Sending…';
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = '✓ Sent to the void';
                form.reset();
                setTimeout(() => { btn.textContent = txt; btn.disabled = false; }, 3000);
            }, 1500);
        });
    }

    loop() {
        if (!this.running) return;
        this.time += 0.016;

        if (this.ribbons) this.ribbons.animate();
        if (this.floats) this.floats.update(this.px, this.py, this.scrollY);
        this.clouds.update(this.scrollPct, this.time);

        requestAnimationFrame(() => this.loop());
    }
}

document.addEventListener('DOMContentLoaded', () => new App());