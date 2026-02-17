/* ═══════ LIVING STRING — gentler cursor response ═══════ */
class LivingString {
    constructor(stream, index, totalStrings) {
        this.stream = stream;
        this.index = index;
        this.totalStrings = totalStrings;
        this.colorIdx = (index / totalStrings) * PRIDE.length + rand(-0.3, 0.3);
        var spread = 45; // tighter spread
        this.homeOffset = (index - (totalStrings - 1) / 2) * (spread * 2 / totalStrings);
        this.homeOffset += rand(-6, 6);

        this.crossings = [];
        var crossCount = randI(1, 2);
        for (var c = 0; c < crossCount; c++) {
            this.crossings.push({
                pos: rand(0.15, 0.85),
                width: rand(0.08, 0.2),
                amp: rand(25, 55) * (Math.random() > 0.5 ? 1 : -1) // reduced
            });
        }

        this.waves = [];
        var waveCount = randI(3, 4);
        for (var w = 0; w < waveCount; w++) {
            this.waves.push({
                amp: w === 0 ? rand(12, 30) : rand(2, Math.max(1, 10 - w * 2)), // smaller amps
                freq: rand(0.004 + w * 0.005, 0.01 + w * 0.01), // lower freq
                phase: rand(0, Math.PI * 2),
                speed: rand(0.06 + w * 0.04, 0.15 + w * 0.08) // slower
            });
        }

        this.travelDir = Math.random() > 0.5 ? 1 : -1;
        this.travelSpeed = rand(0.15, 0.4); // slower travel
        this.baseWidth = rand(1, 4); // thinner
        this.widthWavePhase = rand(0.5, Math.PI * 2);
        this.widthWaveFreq = rand(0.01, 0.03);
        this.opacityMin = rand(0.2, 0.4);
        this.opacityMax = rand(0.7, 1.1); // less max
        this.opacityPhase = rand(1, Math.PI * 2);
        this.opacitySpeed = rand(0.2, 0.5);
        this.opacitySpeed2 = rand(0.5, 1.0);
        this.breathePhase = rand(0, Math.PI * 2);
        this.breatheSpeed = rand(0.3, 0.7);
        this.shimmerSpeed = rand(0.4, 1.2) * this.travelDir;
        this.shimmerFreq = rand(0.03, 0.07);
        this.excitement = 0;
        this.smoothExcitement = 0;
        this.colorDriftAmp = rand(0.1, 0.35);
        this.colorDriftSpeed = rand(0.03, 0.08);
        this.independence = rand(0.5, 0.7); // less independent push
        this.currentBreath = 0.5;
        this.currentPulse = 0.15;
        this.currentColorDrift = 0;
        this.sampledPoints = [];
    }

    update(dt, time, maxSqueeze) {
        var b1 = Math.sin(time * this.breatheSpeed + this.breathePhase);
        var b2 = Math.sin(time * this.breatheSpeed * 1.7 + this.breathePhase * 0.6) * 0.3;
        this.currentBreath = (b1 + b2) * 0.5 + 0.5;
        var p1 = Math.sin(time * this.opacitySpeed + this.opacityPhase);
        var p2 = Math.sin(time * this.opacitySpeed2 + this.opacityPhase * 1.3) * 0.3;
        var p3 = Math.sin(time * this.opacitySpeed * 0.4 + this.opacityPhase * 2.1) * 0.25;
        this.currentPulse = (p1 + p2 + p3) / 1.55 * 0.5 + 0.5;
        // gentler excitement ramp
        var exciteRate = maxSqueeze > this.excitement ? 0.06 : 0.02;
        this.excitement = lerp(this.excitement, maxSqueeze, exciteRate);
        this.smoothExcitement = lerp(this.smoothExcitement, this.excitement, 0.03);
        this.currentColorDrift = Math.sin(time * this.colorDriftSpeed + this.breathePhase) * this.colorDriftAmp;
    }

    getOffset(i, time, squeeze, totalPts) {
        var offset = this.homeOffset;
        var localS = clamp(squeeze, 0, 1);
        var dragMul = 1 - localS * 0.7; // less friction
        var travel = time * this.travelSpeed * this.travelDir * dragMul;
        for (var w = 0; w < this.waves.length; w++) {
            var wave = this.waves[w];
            var amp = wave.amp * (1 - localS * 0.5); // less dampening
            offset += Math.sin(i * wave.freq + time * wave.speed * (1 - localS * 0.3) + wave.phase + travel * 0.05) * amp;
        }
        for (var c = 0; c < this.crossings.length; c++) {
            var cross = this.crossings[c];
            var d = Math.abs(i / totalPts - cross.pos);
            if (d < cross.width) {
                offset += Math.sin(time * 0.15 + this.breathePhase) * cross.amp * smoothstep(1 - d / cross.width);
            }
        }
        offset *= (0.9 + this.currentBreath * 0.15);
        if (this.smoothExcitement > 0.05) {
            offset += Math.sin(i * 0.04 + time * 1.5 + this.breathePhase) * 8 * this.smoothExcitement * (1 - localS * 0.5);
        }
        // gentler cursor push
        if (squeeze > 0) {
            var dir = offset > 0 ? 1 : -1;
            offset += (Math.abs(offset) * 0.25 + 8) * squeeze * dir * this.independence;
        }
        return offset;
    }

    getWidth(i, time, squeeze, totalPts) {
        var t = i / totalPts;
        var ww = Math.sin(i * this.widthWaveFreq + time * 0.2 + this.widthWavePhase);
        var width = this.baseWidth * (0.75 + ww * 0.25);
        width *= (0.85 + this.currentPulse * 0.3);
        width *= (0.4 + Math.sin(t * Math.PI) * 0.6);
        width *= (1 + this.smoothExcitement * 0.3);
        width *= (1 + squeeze * 0.2); // less width change on hover
        return Math.max(width, 0.3);
    }

    getOpacity(i, time, squeeze, totalPts) {
        var t = i / totalPts;
        var op = lerp(this.opacityMin, this.opacityMax, this.currentPulse);
        op *= (0.15 + Math.sin(t * Math.PI) * 0.85);
        var shimmer = Math.sin(i * this.shimmerFreq + time * this.shimmerSpeed + this.opacityPhase);
        op *= (0.7 + shimmer * 0.3);
        op *= (0.8 + this.currentBreath * 0.25);
        op = lerp(op, this.opacityMax * 0.7, this.smoothExcitement * 0.3);
        op += squeeze * 0.2; // much less opacity boost
        return clamp(op, 0.03, 0.85);
    }

    draw(ctx, pts, perps, time, squeeze, colorShift) {
        if (pts.length < 4) return;
        var n = pts.length;
        var points = [], widths = [], opacities = [];
        this.sampledPoints = [];

        for (var i = 0; i < n; i++) {
            var sq = squeeze[i];
            var offset = this.getOffset(i, time, sq, n);
            var px = pts[i].x + perps[i].x * offset;
            var py = pts[i].y + perps[i].y * offset;
            points.push({ x: px, y: py });
            widths.push(this.getWidth(i, time, sq, n));
            opacities.push(this.getOpacity(i, time, sq, n));
            if (i % 6 === 0) {
                this.sampledPoints.push({ x: px, y: py, intensity: this.smoothExcitement + this.currentPulse * 0.2 });
            }
        }

        var c = prideColor(this.colorIdx + this.currentColorDrift, colorShift);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // main stroke
        for (var i = 0; i < points.length - 1; i++) {
            var p1 = points[i], p2 = points[i + 1];
            var w = (widths[i] + widths[i + 1]) * 0.5;
            var o = (opacities[i] + opacities[i + 1]) * 0.5;
            if (o < 0.01 || w < 0.2) continue;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + o + ')';
            ctx.lineWidth = w; ctx.stroke();
        }

        // subtle bloom only
        var bi = (this.currentPulse * 0.4 + this.smoothExcitement * 0.3) * 0.8;
        if (bi > 0.08) {
            ctx.globalCompositeOperation = 'lighter';
            var step = Math.max(3, Math.floor(6 - bi * 3));
            for (var i = 0; i < points.length - 1; i += step) {
                var p1 = points[i], p2 = points[Math.min(i + step, points.length - 1)];
                var w = (widths[i] || this.baseWidth) + 4 + bi * 5;
                var o = (opacities[i] || 0.2) * bi * 0.35;
                if (o < 0.003) continue;
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + o + ')';
                ctx.lineWidth = w; ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        // lighter core — subtle
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < points.length - 1; i += 2) {
            var p1 = points[i], p2 = points[Math.min(i + 2, points.length - 1)];
            var w = (widths[i] + widths[Math.min(i + 2, points.length - 1)]) * 0.5;
            var o = (opacities[i] + opacities[Math.min(i + 2, points.length - 1)]) * 0.5;
            if (o < 0.03 || w < 0.4) continue;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + Math.min(0.5, o * 0.4) + ')';
            ctx.lineWidth = Math.max(0.5, w * 0.35); ctx.stroke();
        }
        ctx.restore();
    }
}

/* ═══════ STRING STREAM — reduced interaction ═══════ */
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
        var w = this.canvas.width, h = this.canvas.height;
        var diag = Math.hypot(w, h), ext = diag * 0.7;
        this.angle = rand(-0.4, 0.4);
        var cx = w * rand(0.2, 0.8), cy = h * rand(0.2, 0.8);
        this.sx = cx - Math.cos(this.angle) * (diag / 2 + ext);
        this.sy = cy - Math.sin(this.angle) * (diag / 2 + ext);
        this.ex = cx + Math.cos(this.angle) * (diag / 2 + ext);
        this.ey = cy + Math.sin(this.angle) * (diag / 2 + ext);
        this.c1x = w * rand(0.1, 0.4);
        this.c1y = cy + rand(-h * 0.3, h * 0.3);
        this.c2x = w * rand(0.6, 0.9);
        this.c2y = cy + rand(-h * 0.3, h * 0.3);
    }

    generateStrings() {
        var count = randI(8, 12); // fewer strings per stream
        this.strings = [];
        for (var i = 0; i < count; i++) this.strings.push(new LivingString(this, i, count));
    }

    getControlPoints(time) {
        var s = this.seed, a = 20; // less control point wobble
        var w = function(t, f, p) { return Math.sin(t * f + p); };
        return {
            c1x: this.c1x + (w(time, 0.07, s) + w(time, 0.03, s * 2.3) * 0.4) * a,
            c1y: this.c1y + (w(time, 0.06, s * 1.5) + w(time, 0.025, s * 1.1) * 0.5) * a,
            c2x: this.c2x + (w(time, 0.065, s + 2) + w(time, 0.028, s * 1.8) * 0.4) * a,
            c2y: this.c2y + (w(time, 0.055, s * 2.2) + w(time, 0.02, s * 0.9) * 0.5) * a
        };
    }

    bezier(t, p0, p1, p2, p3) {
        var mt = 1 - t;
        return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
    }

    sampleSpine(n, px, py) {
        var cp = this.getControlPoints(this.time);
        // REDUCED: smaller radius, weaker push
        var ir = 160, is = 60, pts = [];
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var x = this.bezier(t, this.sx, cp.c1x, cp.c2x, this.ex);
            var y = this.bezier(t, this.sy, cp.c1y, cp.c2y, this.ey);
            if (px > 0) {
                var dx = x - px, dy = y - py, d = Math.hypot(dx, dy);
                if (d < ir && d > 1) {
                    var f = Math.pow(1 - d / ir, 2.5), angle = Math.atan2(dy, dx); // softer falloff
                    x += Math.cos(angle) * f * is;
                    y += Math.sin(angle) * f * is;
                }
            }
            pts.push({ x: x, y: y });
        }
        var perps = [];
        for (var i = 0; i <= n; i++) {
            var prev = pts[Math.max(0, i - 1)], next = pts[Math.min(n, i + 1)];
            var dx = next.x - prev.x, dy = next.y - prev.y, len = Math.hypot(dx, dy) || 1;
            perps.push({ x: -dy / len, y: dx / len });
        }
        return { pts: pts, perps: perps };
    }

    computeSqueeze(pts, px, py) {
        var ir = 160;
        return pts.map(function(p) {
            if (px < 0) return 0;
            var d = Math.hypot(p.x - px, p.y - py);
            if (d >= ir) return 0;
            var t = 1 - d / ir;
            return smoothstep(t) * 0.6; // cap squeeze at 0.6 instead of 1.0
        });
    }

    update(dt, scrollProg) {
        this.time += dt;
        this.colorShift = scrollProg * PRIDE.length * 0.7;
    }

    draw(ctx, px, py) {
        var segments = 80;
        var result = this.sampleSpine(segments, px, py);
        var squeeze = this.computeSqueeze(result.pts, px, py);
        var maxSq = 0;
        for (var i = 0; i < squeeze.length; i++) { if (squeeze[i] > maxSq) maxSq = squeeze[i]; }
        for (var i = 0; i < this.strings.length; i++) this.strings[i].update(0.016, this.time, maxSq);
        for (var i = 0; i < this.strings.length; i++) this.strings[i].draw(ctx, result.pts, result.perps, this.time, squeeze, this.colorShift);
        this._allSampledPoints = [];
        for (var i = 0; i < this.strings.length; i++) {
            var sp = this.strings[i].sampledPoints;
            for (var j = 0; j < sp.length; j++) this._allSampledPoints.push(sp[j]);
        }
    }
}

/* ═══════ RIBBON CANVAS — 1 slot, crossfade on scroll ═══════ */
class RibbonCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.rawPx = -1000; this.rawPy = -1000;
        this.px = -1000; this.py = -1000;
        this.vx = 0; this.vy = 0;
        this.slot = null;
        this.scroll = 0; this.lastScroll = 0;
        this.lastTime = performance.now();
        this.resize();
        this.createSlot();
        window.addEventListener('resize', this.resize.bind(this));
    }

    resize() {
        var dpr = Math.min(devicePixelRatio || 1, 2);
        this.canvas.width = innerWidth * dpr;
        this.canvas.height = innerHeight * dpr;
        this.canvas.style.width = innerWidth + 'px';
        this.canvas.style.height = innerHeight + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.createSlot();
    }

    createSlot() {
        this.slot = { current: new StringStream(this.canvas, 0), incoming: null, progress: 1 };
    }

    crossfade() {
        if (this.slot.incoming) return;
        this.slot.incoming = new StringStream(this.canvas, 0);
        this.slot.progress = 0;
    }

    updatePointer(x, y) { this.rawPx = x; this.rawPy = y; }

    updateScroll(s) {
        var delta = Math.abs(s - this.lastScroll);
        if (delta > 0.15) {
            this.crossfade();
            this.lastScroll = s;
        }
        this.scroll = s;
    }

    animate() {
        var now = performance.now();
        var dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        var sm = 0.08; // slightly slower cursor tracking
        if (this.rawPx > 0) {
            if (this.px < 0) { this.px = this.rawPx; this.py = this.rawPy; }
            else {
                this.px = lerp(this.px, this.rawPx, sm);
                this.py = lerp(this.py, this.rawPy, sm);
            }
        } else {
            this.px = lerp(this.px, -1000, sm * 0.2);
            this.py = lerp(this.py, -1000, sm * 0.2);
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        var allNodes = [];
        var slot = this.slot;

        if (slot.incoming) {
            slot.progress += dt / 3; // slower crossfade
            if (slot.progress >= 1) { slot.current = slot.incoming; slot.incoming = null; slot.progress = 1; }
        }
        var ease = smoothstep(clamp(slot.progress, 0, 1));
        slot.current.update(dt, this.scroll);
        this.ctx.save();
        this.ctx.globalAlpha = slot.incoming ? (1 - ease) : 1;
        slot.current.draw(this.ctx, this.px, this.py);
        this.ctx.restore();
        if (slot.current._allSampledPoints) {
            for (var j = 0; j < slot.current._allSampledPoints.length; j++) allNodes.push(slot.current._allSampledPoints[j]);
        }
        if (slot.incoming) {
            slot.incoming.update(dt, this.scroll);
            this.ctx.save();
            this.ctx.globalAlpha = ease;
            slot.incoming.draw(this.ctx, this.px, this.py);
            this.ctx.restore();
            if (slot.incoming._allSampledPoints) {
                for (var j = 0; j < slot.incoming._allSampledPoints.length; j++) allNodes.push(slot.incoming._allSampledPoints[j]);
            }
        }
        window.__stringNodes = allNodes;
    }
}

/* ═══════ WOVEN STRINGS — more of these, fullscreen ═══════ */
class WovenStrings {
    constructor(container, layerCount) {
        this.container = container;
        this.canvases = [];
        this.contexts = [];
        this.strings = [];
        this.N = 5; // more woven layers (was 3)
        this.time = rand(0, 1000);

        for (var i = 0; i < this.N; i++) {
            var canvas = document.createElement('canvas');
            canvas.className = 'string-canvas';
            canvas.style.zIndex = Math.round(lerp(3, layerCount + 1, i / (this.N - 1)));
            container.appendChild(canvas);
            this.canvases.push(canvas);
            this.contexts.push(canvas.getContext('2d'));

            var count = randI(5, 8); // more strings per layer
            var group = [];
            for (var j = 0; j < count; j++) group.push(this._createString(i, j));
            this.strings.push(group);
        }

        this.resize();
        window.addEventListener('resize', this.resize.bind(this));
    }

    _createString(layerIdx, idx) {
        return {
            colorIdx: (layerIdx * 2.1 + idx * 1.4) % PRIDE.length,
            homeY: rand(0.1, 0.9),
            waves: [
                { amp: rand(25, 65), freq: rand(0.002, 0.006), speed: rand(0.06, 0.18), phase: rand(0, Math.PI * 2) },
                { amp: rand(6, 20), freq: rand(0.008, 0.02), speed: rand(0.2, 0.4), phase: rand(0, Math.PI * 2) },
                { amp: rand(1.5, 6), freq: rand(0.03, 0.06), speed: rand(0.35, 0.6), phase: rand(0, Math.PI * 2) }
            ],
            width: rand(0.8, 2),
            opMin: rand(0.03, 0.08),
            opMax: rand(0.15, 0.35),
            breathPhase: rand(0, Math.PI * 2),
            breathSpeed: rand(0.15, 0.4),
            travelDir: Math.random() > 0.5 ? 1 : -1,
            travelSpeed: rand(0.08, 0.3)
        };
    }

    resize() {
        var dpr = Math.min(devicePixelRatio || 1, 2);
        for (var i = 0; i < this.canvases.length; i++) {
            this.canvases[i].width = innerWidth * dpr;
            this.canvases[i].height = innerHeight * dpr;
            this.canvases[i].style.width = innerWidth + 'px';
            this.canvases[i].style.height = innerHeight + 'px';
        }
        this.dpr = dpr;
    }

    update(dt, scrollProgress) {
        this.time += dt;
        var colorShift = scrollProgress * PRIDE.length * 0.5;
        var baseVis = lerp(0.4, 1, smoothstep(clamp(scrollProgress * 1.5, 0, 1)));
        var blendMode = scrollProgress > 0.4 ? 'screen' : 'multiply';

        for (var i = 0; i < this.N; i++) {
            var ctx = this.contexts[i];
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            ctx.clearRect(0, 0, innerWidth, innerHeight);
            this.canvases[i].style.opacity = clamp(baseVis * lerp(0.4, 1, i / (this.N - 1)), 0, 1);
            this.canvases[i].style.mixBlendMode = blendMode;
            for (var j = 0; j < this.strings[i].length; j++) this._drawString(ctx, this.strings[i][j], colorShift);
        }
    }

    _drawString(ctx, s, colorShift) {
        var w = innerWidth, h = innerHeight;
        var segs = 80, t = this.time;
        var breath = Math.sin(t * s.breathSpeed + s.breathPhase) * 0.5 + 0.5;
        var opacity = lerp(s.opMin, s.opMax, breath);
        var c = prideColor(s.colorIdx, colorShift);
        var travel = t * s.travelSpeed * s.travelDir;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var prevX, prevY;
        for (var i = 0; i <= segs; i++) {
            var pct = i / segs;
            var x = pct * w;
            var y = s.homeY * h;
            for (var wv = 0; wv < s.waves.length; wv++) {
                var wave = s.waves[wv];
                y += Math.sin(pct * w * wave.freq + t * wave.speed + wave.phase + travel * 0.04) * wave.amp;
            }
            if (i > 0) {
                var shimmer = Math.sin(i * 0.1 + t * 0.8 + s.breathPhase) * 0.25 + 0.75;
                var segOp = opacity * shimmer;
                ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y);
                ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + clamp(segOp, 0, 0.5) + ')';
                ctx.lineWidth = s.width * (0.75 + breath * 0.4); ctx.stroke();
                if (segOp > 0.08) {
                    ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y);
                    ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (segOp * 0.15) + ')';
                    ctx.lineWidth = s.width + 3; ctx.stroke();
                }
            }
            prevX = x; prevY = y;
        }
    }
}