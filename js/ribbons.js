/**
 * Organic Pride Strings — Bloomy & Overlapping
 *
 * Each stream has 10-16 individual strings that:
 *  - Breathe with pulsating opacity (dim ↔ full)
 *  - Glow with additive bloom
 *  - Cross/overlap at forced intersection points
 *  - Push nearby floating text when moving
 */

// Global registry so floating text can react to string positions
window.__stringNodes = [];

/* ═══════════════════════════════════════════════════════
   LIVING STRING — one breathing, glowing line
   ═══════════════════════════════════════════════════════ */
class LivingString {
    constructor(stream, index, totalStrings) {
        this.stream = stream;
        this.index = index;
        this.totalStrings = totalStrings;

        // color
        this.colorIdx = (index / totalStrings) * PRIDE.length + rand(-0.3, 0.3);

        // home position — spread across the bundle
        const spread = 60;
        this.homeOffset = (index - (totalStrings - 1) / 2) * (spread * 2 / totalStrings);
        this.homeOffset += rand(-8, 8);

        // forced crossing — strings swap sides at specific points
        // this guarantees overlapping
        this.crossings = [];
        const crossCount = randI(1, 3);
        for (let c = 0; c < crossCount; c++) {
            this.crossings.push({
                pos: rand(0.15, 0.85),   // where along the spine (0-1)
                width: rand(0.08, 0.2),  // how wide the crossing zone
                amp: rand(40, 80) * (Math.random() > 0.5 ? 1 : -1) // how far it crosses
            });
        }

        // wave layers
        this.waves = [];
        const waveCount = randI(3, 5);
        for (let w = 0; w < waveCount; w++) {
            this.waves.push({
                amp: w === 0 ? rand(20, 45) : rand(3, 15 - w * 2),
                freq: rand(0.006 + w * 0.008, 0.015 + w * 0.015),
                phase: rand(0, Math.PI * 2),
                speed: rand(0.1 + w * 0.08, 0.25 + w * 0.12)
            });
        }

        // traveling wave
        this.travelDir = Math.random() > 0.5 ? 1 : -1;
        this.travelSpeed = rand(0.15, 0.5);

        // width
        this.baseWidth = rand(1.5, 3.8);
        this.widthWavePhase = rand(0, Math.PI * 2);
        this.widthWaveFreq = rand(0.015, 0.04);

        // BLOOM OPACITY — pulsates between dim and near-full
        this.opacityMin = rand(0.12, 0.25);
        this.opacityMax = rand(0.7, 0.95);
        this.opacityPhase = rand(0, Math.PI * 2);
        this.opacitySpeed = rand(0.3, 0.7);   // main pulse speed
        this.opacitySpeed2 = rand(0.8, 1.5);  // secondary faster flicker

        // breathing
        this.breathePhase = rand(0, Math.PI * 2);
        this.breatheSpeed = rand(0.2, 0.45);

        // shimmer traveling along string
        this.shimmerSpeed = rand(0.6, 1.8) * this.travelDir;
        this.shimmerFreq = rand(0.05, 0.1);

        // interaction
        this.excitement = 0;
        this.smoothExcitement = 0;

        // color drift
        this.colorDriftAmp = rand(0.15, 0.5);
        this.colorDriftSpeed = rand(0.05, 0.12);

        this.independence = rand(0.4, 0.9);

        // computed state
        this.currentBreath = 0;
        this.currentPulse = 0;
        this.currentColorDrift = 0;

        // store sampled points for floating text interaction
        this.sampledPoints = [];
    }

    update(dt, time, maxSqueeze) {
        // breathing
        const b1 = Math.sin(time * this.breatheSpeed + this.breathePhase);
        const b2 = Math.sin(time * this.breatheSpeed * 1.7 + this.breathePhase * 0.6) * 0.3;
        this.currentBreath = (b1 + b2) * 0.5 + 0.5;

        // bloom pulse — the main pulsating opacity
        const pulse1 = Math.sin(time * this.opacitySpeed + this.opacityPhase);
        const pulse2 = Math.sin(time * this.opacitySpeed2 + this.opacityPhase * 1.3) * 0.3;
        const pulse3 = Math.sin(time * this.opacitySpeed * 0.4 + this.opacityPhase * 2.1) * 0.25;
        this.currentPulse = (pulse1 + pulse2 + pulse3) / 1.55 * 0.5 + 0.5; // 0..1

        // excitement
        const exciteRate = maxSqueeze > this.excitement ? 0.15 : 0.04;
        this.excitement = lerp(this.excitement, maxSqueeze, exciteRate);
        this.smoothExcitement = lerp(this.smoothExcitement, this.excitement, 0.05);

        // color drift
        this.currentColorDrift = Math.sin(time * this.colorDriftSpeed + this.breathePhase) * this.colorDriftAmp;
    }

    getOffset(i, time, squeeze, totalPts) {
        const t = i / totalPts;
        let offset = this.homeOffset;

        // wave motion
        const travel = time * this.travelSpeed * this.travelDir;
        for (const wave of this.waves) {
            offset += Math.sin(i * wave.freq + time * wave.speed + wave.phase + travel * 0.08) * wave.amp;
        }

        // forced crossings — strings must pass through each other
        for (const cross of this.crossings) {
            const dist = Math.abs(t - cross.pos);
            if (dist < cross.width) {
                const crossT = 1 - dist / cross.width;
                const crossSmooth = smoothstep(crossT);
                // smoothly push the string to the other side
                offset += Math.sin(time * 0.2 + this.breathePhase) * cross.amp * crossSmooth;
            }
        }

        // breathing modulates
        offset *= (0.85 + this.currentBreath * 0.25);

        // excitement wiggle
        if (this.smoothExcitement > 0.05) {
            offset += Math.sin(i * 0.06 + time * 2.5 + this.breathePhase) * 18 * this.smoothExcitement;
        }

        // squeeze scatter
        if (squeeze > 0) {
            const dir = offset > 0 ? 1 : -1;
            const scatter = (Math.abs(offset) * 0.5 + 20) * squeeze * dir;
            offset += scatter * this.independence;
        }

        return offset;
    }

    getWidth(i, time, squeeze, totalPts) {
        const t = i / totalPts;
        const widthWave = Math.sin(i * this.widthWaveFreq + time * 0.25 + this.widthWavePhase);
        let width = this.baseWidth * (0.7 + widthWave * 0.3);

        // pulse makes it throb
        width *= (0.8 + this.currentPulse * 0.4);

        // edge fade
        const edgeFade = Math.sin(t * Math.PI);
        width *= (0.35 + edgeFade * 0.65);

        // excitement
        width *= (1 + this.smoothExcitement * 0.6);
        width *= (1 + squeeze * 0.3);

        return Math.max(width, 0.3);
    }

    getOpacity(i, time, squeeze, totalPts) {
        const t = i / totalPts;

        // pulsating opacity — lerp between min and max
        let baseOpacity = lerp(this.opacityMin, this.opacityMax, this.currentPulse);

        // edge fade
        const edgeFade = Math.sin(t * Math.PI);
        baseOpacity *= (0.15 + edgeFade * 0.85);

        // traveling shimmer
        const shimmer = Math.sin(i * this.shimmerFreq + time * this.shimmerSpeed + this.opacityPhase);
        baseOpacity *= (0.65 + shimmer * 0.35 + Math.abs(shimmer) * 0.12);

        // breathing modulation
        baseOpacity *= (0.75 + this.currentBreath * 0.35);

        // excitement brightens toward max
        baseOpacity = lerp(baseOpacity, this.opacityMax, this.smoothExcitement * 0.6);

        // local squeeze glow
        baseOpacity += squeeze * 0.25;

        return clamp(baseOpacity, 0.03, 0.95);
    }

    draw(ctx, pts, perps, time, squeeze, colorShift) {
        if (pts.length < 4) return;

        const n = pts.length;
        const points = [];
        const widths = [];
        const opacities = [];

        this.sampledPoints = [];

        for (let i = 0; i < n; i++) {
            const sq = squeeze[i];
            const offset = this.getOffset(i, time, sq, n);

            const px = pts[i].x + perps[i].x * offset;
            const py = pts[i].y + perps[i].y * offset;

            points.push({ x: px, y: py });
            widths.push(this.getWidth(i, time, sq, n));
            opacities.push(this.getOpacity(i, time, sq, n));

            // store every 5th point for floating text interaction
            if (i % 5 === 0) {
                this.sampledPoints.push({
                    x: px, y: py,
                    intensity: this.smoothExcitement + this.currentPulse * 0.3
                });
            }
        }

        const c = prideColor(this.colorIdx + this.currentColorDrift, colorShift);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // main string — variable width segments
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const w = (widths[i] + widths[i + 1]) * 0.5;
            const o = (opacities[i] + opacities[i + 1]) * 0.5;

            if (o < 0.01 || w < 0.2) continue;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${o})`;
            ctx.lineWidth = w;
            ctx.stroke();
        }

        // bloom glow layer — always present, pulses with opacity
        const bloomIntensity = this.currentPulse * 0.4 + this.smoothExcitement * 0.4;
        if (bloomIntensity > 0.05) {
            ctx.globalCompositeOperation = 'lighter';
            const step = Math.max(2, Math.floor(5 - bloomIntensity * 3));

            for (let i = 0; i < points.length - 1; i += step) {
                const p1 = points[i];
                const p2 = points[Math.min(i + step, points.length - 1)];
                const w = (widths[i] || this.baseWidth) + 4 + bloomIntensity * 6;
                const o = (opacities[i] || 0.3) * bloomIntensity * 0.35;

                if (o < 0.003) continue;

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${o})`;
                ctx.lineWidth = w;
                ctx.stroke();
            }

            // outer soft glow
            if (bloomIntensity > 0.2) {
                for (let i = 0; i < points.length - 1; i += step * 2) {
                    const p1 = points[i];
                    const p2 = points[Math.min(i + step * 2, points.length - 1)];
                    const w = (widths[i] || this.baseWidth) + 12 + bloomIntensity * 10;
                    const o = (opacities[i] || 0.2) * bloomIntensity * 0.12;

                    if (o < 0.002) continue;

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${o})`;
                    ctx.lineWidth = w;
                    ctx.stroke();
                }
            }

            ctx.globalCompositeOperation = 'source-over';
        }
    }
}

/* ═══════════════════════════════════════════════════════
   STRING STREAM — a bundle of overlapping strings
   ═══════════════════════════════════════════════════════ */
class StringStream {
    constructor(canvas, index) {
        this.canvas = canvas;
        this.index = index;
        this.time = rand(0, 1000);
        this.seed = rand(0, 100);
        this.colorShift = 0;

        this.generatePath();
        this.generateStrings();
    }

    generatePath() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const diag = Math.hypot(w, h);
        const ext = diag * 0.7;

        this.angle = rand(-0.5, 0.5);

        const cx = w * rand(0.2, 0.8);
        const cy = h * rand(0.15, 0.85);

        this.sx = cx - Math.cos(this.angle) * (diag / 2 + ext);
        this.sy = cy - Math.sin(this.angle) * (diag / 2 + ext);
        this.ex = cx + Math.cos(this.angle) * (diag / 2 + ext);
        this.ey = cy + Math.sin(this.angle) * (diag / 2 + ext);

        this.c1x = w * rand(0.1, 0.4);
        this.c1y = cy + rand(-h * 0.35, h * 0.35);
        this.c2x = w * rand(0.6, 0.9);
        this.c2y = cy + rand(-h * 0.35, h * 0.35);
    }

    generateStrings() {
        const count = randI(10, 16);
        this.strings = [];
        for (let i = 0; i < count; i++) {
            this.strings.push(new LivingString(this, i, count));
        }
    }

    getControlPoints(time) {
        const s = this.seed;
        const a = 30;
        const w = (t, f, p) => Math.sin(t * f + p);

        return {
            c1x: this.c1x + (w(time, 0.1, s) + w(time, 0.04, s * 2.3) * 0.5 + w(time, 0.017, s * 0.7) * 0.8) * a,
            c1y: this.c1y + (w(time, 0.08, s * 1.5) + w(time, 0.033, s * 1.1) * 0.6 + w(time, 0.014, s * 2.9) * 0.9) * a,
            c2x: this.c2x + (w(time, 0.09, s + 2) + w(time, 0.037, s * 1.8) * 0.55 + w(time, 0.015, s * 3.1) * 0.7) * a,
            c2y: this.c2y + (w(time, 0.075, s * 2.2) + w(time, 0.027, s * 0.9) * 0.7 + w(time, 0.012, s * 1.4) * 0.85) * a
        };
    }

    bezier(t, p0, p1, p2, p3) {
        const mt = 1 - t;
        return mt * mt * mt * p0 +
               3 * mt * mt * t * p1 +
               3 * mt * t * t * p2 +
               t * t * t * p3;
    }

    sampleSpine(n, px, py) {
        const cp = this.getControlPoints(this.time);
        const ir = 200;
        const is = 95;
        const pts = [];

        for (let i = 0; i <= n; i++) {
            const t = i / n;
            let x = this.bezier(t, this.sx, cp.c1x, cp.c2x, this.ex);
            let y = this.bezier(t, this.sy, cp.c1y, cp.c2y, this.ey);

            if (px > 0) {
                const dx = x - px;
                const dy = y - py;
                const d = Math.hypot(dx, dy);
                if (d < ir && d > 1) {
                    const f = Math.pow(1 - d / ir, 2.5);
                    const angle = Math.atan2(dy, dx);
                    x += Math.cos(angle) * f * is;
                    y += Math.sin(angle) * f * is;
                }
            }
            pts.push({ x, y });
        }

        const perps = [];
        for (let i = 0; i <= n; i++) {
            const prev = pts[Math.max(0, i - 1)];
            const next = pts[Math.min(n, i + 1)];
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.hypot(dx, dy) || 1;
            perps.push({ x: -dy / len, y: dx / len });
        }

        return { pts, perps };
    }

    computeSqueeze(pts, px, py) {
        const ir = 200;
        return pts.map(p => {
            if (px < 0) return 0;
            const d = Math.hypot(p.x - px, p.y - py);
            if (d >= ir) return 0;
            return smoothstep(1 - d / ir);
        });
    }

    update(dt, scrollProg) {
        this.time += dt;
        this.colorShift = scrollProg * PRIDE.length * 0.85;
    }

    draw(ctx, px, py) {
        const segments = 100;
        const { pts, perps } = this.sampleSpine(segments, px, py);
        const squeeze = this.computeSqueeze(pts, px, py);
        const maxSq = Math.max(...squeeze);

        for (const s of this.strings) {
            s.update(0.016, this.time, maxSq);
        }

        // draw all strings — natural overlap order
        for (const s of this.strings) {
            s.draw(ctx, pts, perps, this.time, squeeze, this.colorShift);
        }

        // collect all sampled points for floating text interaction
        this._allSampledPoints = [];
        for (const s of this.strings) {
            this._allSampledPoints.push(...s.sampledPoints);
        }
    }
}

/* ═══════════════════════════════════════════════════════
   STRING CANVAS — manages streams + exposes node data
   ═══════════════════════════════════════════════════════ */
class RibbonCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.rawPx = -1000;
        this.rawPy = -1000;
        this.px = -1000;
        this.py = -1000;
        this.vx = 0;
        this.vy = 0;

        this.slots = [];
        this.scroll = 0;
        this.lastScroll = 0;
        this.lastTime = performance.now();
        this.nextSlot = 0;

        this.resize();
        this.createSlots();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        this.canvas.width = innerWidth * dpr;
        this.canvas.height = innerHeight * dpr;
        this.canvas.style.width = innerWidth + 'px';
        this.canvas.style.height = innerHeight + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.createSlots();
    }

    createSlots() {
        this.slots = [];
        for (let i = 0; i < 2; i++) {
            this.slots.push({
                current: new StringStream(this.canvas, i),
                incoming: null,
                progress: 1
            });
        }
    }

    crossfade(idx) {
        const slot = this.slots[idx];
        if (slot.incoming) return;
        slot.incoming = new StringStream(this.canvas, idx);
        slot.progress = 0;
    }

    updatePointer(x, y) {
        this.rawPx = x;
        this.rawPy = y;
    }

    updateScroll(s) {
        const delta = Math.abs(s - this.lastScroll);
        if (delta > 0.12) {
            this.crossfade(this.nextSlot);
            this.nextSlot = (this.nextSlot + 1) % this.slots.length;
            this.lastScroll = s;
        }
        this.scroll = s;
    }

    animate() {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        const sm = 0.1;
        if (this.rawPx > 0) {
            if (this.px < 0) {
                this.px = this.rawPx;
                this.py = this.rawPy;
            } else {
                this.vx = lerp(this.vx, (this.rawPx - this.px) * 2, 0.3);
                this.vy = lerp(this.vy, (this.rawPy - this.py) * 2, 0.3);
                this.px = lerp(this.px, this.rawPx, sm);
                this.py = lerp(this.py, this.rawPy, sm);
            }
        } else {
            this.px = lerp(this.px, -1000, sm * 0.3);
            this.py = lerp(this.py, -1000, sm * 0.3);
            this.vx *= 0.9;
            this.vy *= 0.9;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // collect all string nodes for floating text interaction
        const allNodes = [];

        this.slots.forEach(slot => {
            if (slot.incoming) {
                slot.progress += dt / 2.5;
                if (slot.progress >= 1) {
                    slot.current = slot.incoming;
                    slot.incoming = null;
                    slot.progress = 1;
                }
            }

            const ease = smoothstep(clamp(slot.progress, 0, 1));

            slot.current.update(dt, this.scroll);
            this.ctx.save();
            this.ctx.globalAlpha = slot.incoming ? (1 - ease) : 1;
            slot.current.draw(this.ctx, this.px, this.py);
            this.ctx.restore();

            if (slot.current._allSampledPoints) {
                allNodes.push(...slot.current._allSampledPoints);
            }

            if (slot.incoming) {
                slot.incoming.update(dt, this.scroll);
                this.ctx.save();
                this.ctx.globalAlpha = ease;
                slot.incoming.draw(this.ctx, this.px, this.py);
                this.ctx.restore();

                if (slot.incoming._allSampledPoints) {
                    allNodes.push(...slot.incoming._allSampledPoints);
                }
            }
        });

        // expose string nodes globally for floating text
        window.__stringNodes = allNodes;
    }
}