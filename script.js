// ========== CONFIGURATION ==========
const CONFIG = {
    // String chunks (the main visual strings)
    chunks: {
        count: 4, // Number of string chunks
        thickCount: 2, // Thick strings per chunk
        thinCount: 8, // Thin weaving strings per chunk
        thickWidth: 3,
        thinWidthMin: 0.3,
        thinWidthMax: 1,
        interactionRadius: 150,
        interactionStrength: 60,
        morphDuration: 1.5, // seconds to morph
        morphThreshold: 0.15 // scroll amount to trigger morph
    },
    // Floating code strings
    floatingStrings: {
        count: 60, // More strings since more open space
        interactionRadius: 120,
        repelStrength: 70,
        speed: 0.3,
        strings: [
            'const dream = await reality();',
            'function create() { return magic; }',
            'export default imagination;',
            'import { future } from "now";',
            'while(true) { innovate(); }',
            'let success = try { hard } catch { up };',
            '// TODO: change the world',
            'if(passion) { achieve(); }',
            'return new Promise(growth);',
            'async function life() {}',
            'const skills = [...learning];',
            'Object.assign(self, knowledge);',
            'Array.from(ideas).map(build);',
            '<Component {...dreams} />',
            'git push origin future',
            'npm run create-awesome',
            'SELECT * FROM opportunities',
            'INSERT INTO portfolio VALUES',
            '@keyframes success { 100% {} }',
            'transform: translateY(up);',
            'opacity: always-visible;',
            'z-index: above-rest;',
            'position: absolute-best;',
            'display: flex-skills;',
            '{ creativity: infinite }',
            '[ design, develop, deploy ]',
            'console.log("Hello World");',
            'addEventListener("success")',
            'requestAnimationFrame(grow)',
            'new IntersectionObserver(learn)'
        ]
    },
    themes: ['theme-0', 'theme-1', 'theme-2', 'theme-3']
};

// ========== UTILITIES ==========
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const random = (min, max) => Math.random() * (max - min) + min;
const distance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ========== STRING CHUNK CLASS ==========
class StringChunk {
    constructor(index, canvas) {
        this.index = index;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Current and target states for morphing
        this.current = this.generateConfig();
        this.target = null;
        this.morphProgress = 1;
        this.morphing = false;
        
        this.time = random(0, Math.PI * 2);
    }
    
    generateConfig() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Random angle (not just horizontal)
        const angle = random(-Math.PI * 0.4, Math.PI * 0.4);
        
        // Random center position
        const centerX = random(w * 0.1, w * 0.9);
        const centerY = random(h * 0.15, h * 0.85);
        
        // String length (long enough to cross screen)
        const length = Math.max(w, h) * 1.8;
        
        // Generate thick strings (2 main anchors)
        const thickStrings = [];
        const spacing = random(25, 45);
        
        for (let i = 0; i < CONFIG.chunks.thickCount; i++) {
            thickStrings.push({
                offset: (i - 0.5) * spacing,
                width: CONFIG.chunks.thickWidth + random(-0.5, 0.5),
                waveAmp: random(8, 20),
                waveFreq: random(0.003, 0.008),
                phase: random(0, Math.PI * 2),
                speed: random(0.3, 0.6)
            });
        }
        
        // Generate thin weaving strings
        const thinStrings = [];
        const thinCount = CONFIG.chunks.thinCount + Math.floor(random(-2, 3));
        
        for (let i = 0; i < thinCount; i++) {
            thinStrings.push({
                offset: random(-spacing * 1.5, spacing * 1.5),
                width: random(CONFIG.chunks.thinWidthMin, CONFIG.chunks.thinWidthMax),
                waveAmp: random(15, 40),
                waveFreq: random(0.008, 0.02),
                phase: random(0, Math.PI * 2),
                speed: random(0.5, 1.2),
                weaveAround: Math.floor(random(0, CONFIG.chunks.thickCount)) // Which thick string to weave around
            });
        }
        
        return {
            centerX,
            centerY,
            angle,
            length,
            thickStrings,
            thinStrings,
            hue: random(170, 200) // Base cyan hue
        };
    }
    
    startMorph() {
        if (this.morphing) return;
        
        this.target = this.generateConfig();
        this.morphProgress = 0;
        this.morphing = true;
    }
    
    updateMorph(dt) {
        if (!this.morphing || !this.target) return;
        
        this.morphProgress += dt / CONFIG.chunks.morphDuration;
        
        if (this.morphProgress >= 1) {
            this.morphProgress = 1;
            this.current = this.target;
            this.target = null;
            this.morphing = false;
            return;
        }
        
        // Smooth easing
        const t = this.easeInOutCubic(this.morphProgress);
        
        // Interpolate main properties
        this.current.centerX = lerp(this.current.centerX, this.target.centerX, t * 0.1);
        this.current.centerY = lerp(this.current.centerY, this.target.centerY, t * 0.1);
        this.current.angle = lerp(this.current.angle, this.target.angle, t * 0.1);
        this.current.hue = lerp(this.current.hue, this.target.hue, t * 0.1);
        
        // Interpolate thick strings
        this.current.thickStrings.forEach((str, i) => {
            if (this.target.thickStrings[i]) {
                str.offset = lerp(str.offset, this.target.thickStrings[i].offset, t * 0.1);
                str.waveAmp = lerp(str.waveAmp, this.target.thickStrings[i].waveAmp, t * 0.1);
            }
        });
        
        // Interpolate thin strings
        this.current.thinStrings.forEach((str, i) => {
            if (this.target.thinStrings[i]) {
                str.offset = lerp(str.offset, this.target.thinStrings[i].offset, t * 0.1);
                str.waveAmp = lerp(str.waveAmp, this.target.thinStrings[i].waveAmp, t * 0.1);
            }
        });
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    update(dt, pointerX, pointerY, scrollProgress) {
        this.time += dt;
        this.updateMorph(dt);
        
        // Update hue based on scroll
        const hueShift = scrollProgress * 80;
        this.currentHue = this.current.hue + hueShift;
    }
    
    draw(pointerX, pointerY) {
        const cfg = this.current;
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(cfg.centerX, cfg.centerY);
        ctx.rotate(cfg.angle);
        
        // Draw thin strings first (behind thick ones)
        cfg.thinStrings.forEach((str, i) => {
            this.drawString(str, pointerX, pointerY, cfg, false, i);
        });
        
        // Draw thick strings
        cfg.thickStrings.forEach((str, i) => {
            this.drawString(str, pointerX, pointerY, cfg, true, i);
        });
        
        ctx.restore();
    }
    
    drawString(str, pointerX, pointerY, cfg, isThick, index) {
        const ctx = this.ctx;
        const segments = 80;
        const halfLength = cfg.length / 2;
        
        // Transform pointer to local coordinates
        const cos = Math.cos(-cfg.angle);
        const sin = Math.sin(-cfg.angle);
        const localPointerX = (pointerX - cfg.centerX) * cos - (pointerY - cfg.centerY) * sin;
        const localPointerY = (pointerX - cfg.centerX) * sin + (pointerY - cfg.centerY) * cos;
        
        ctx.beginPath();
        
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = -halfLength + t * cfg.length;
            
            // Base wave
            let y = str.offset;
            y += Math.sin(x * str.waveFreq + this.time * str.speed + str.phase) * str.waveAmp;
            
            // Secondary wave for complexity
            if (!isThick) {
                y += Math.sin(x * str.waveFreq * 2.5 + this.time * str.speed * 0.7) * (str.waveAmp * 0.4);
            }
            
            // Pointer interaction
            const dx = x - localPointerX;
            const dy = y - localPointerY;
            const dist = Math.hypot(dx, dy);
            
            if (dist < CONFIG.chunks.interactionRadius && pointerX > 0) {
                const force = Math.pow(1 - dist / CONFIG.chunks.interactionRadius, 2);
                const pushY = (dy / dist) * force * CONFIG.chunks.interactionStrength;
                y += pushY;
            }
            
            points.push({ x, y });
        }
        
        // Draw smooth curve through points
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        
        // Styling
        const alpha = isThick ? 0.35 : 0.15 + (str.width / CONFIG.chunks.thinWidthMax) * 0.1;
        const hue = this.currentHue + (isThick ? 0 : index * 8);
        
        // Gradient along string
        const gradient = ctx.createLinearGradient(-halfLength, 0, halfLength, 0);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 65%, 0)`);
        gradient.addColorStop(0.15, `hsla(${hue}, 100%, 65%, ${alpha * 0.7})`);
        gradient.addColorStop(0.5, `hsla(${hue}, 100%, 70%, ${alpha})`);
        gradient.addColorStop(0.85, `hsla(${hue}, 100%, 65%, ${alpha * 0.7})`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 65%, 0)`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = str.width;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Glow effect for thick strings
        if (isThick) {
            ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha * 0.2})`;
            ctx.lineWidth = str.width + 8;
            ctx.stroke();
        }
    }
}

// ========== FLOATING CODE STRING CLASS ==========
class FloatingCodeString {
    constructor(container, text, index, total) {
        this.container = container;
        this.text = text;
        this.index = index;
        
        this.x = random(0, window.innerWidth);
        this.y = random(0, window.innerHeight);
        
        this.vx = (random(-1, 1)) * CONFIG.floatingStrings.speed;
        this.vy = (random(-1, 1)) * CONFIG.floatingStrings.speed;
        
        this.baseOpacity = random(0.12, 0.25);
        this.depth = random(0, 1);
        
        this.element = document.createElement('div');
        this.element.className = 'floating-code';
        this.element.textContent = text;
        this.element.style.cssText = `
            left: ${this.x}px;
            top: ${this.y}px;
            opacity: ${this.baseOpacity};
        `;
        
        container.appendChild(this.element);
    }
    
    update(pointerX, pointerY, scrollY) {
        const dx = this.x - pointerX;
        const dy = this.y - pointerY;
        const dist = Math.hypot(dx, dy);
        
        if (dist < CONFIG.floatingStrings.interactionRadius && pointerX > 0) {
            this.element.classList.add('active');
            
            const force = Math.pow(1 - dist / CONFIG.floatingStrings.interactionRadius, 1.5);
            const angle = Math.atan2(dy, dx);
            
            const repelX = Math.cos(angle) * force * CONFIG.floatingStrings.repelStrength;
            const repelY = Math.sin(angle) * force * CONFIG.floatingStrings.repelStrength;
            const scale = 1 + force * 0.25;
            const rotate = force * 8 * (this.index % 2 ? 1 : -1);
            
            this.element.style.transform = `translate(${repelX}px, ${repelY}px) scale(${scale}) rotate(${rotate}deg)`;
        } else {
            this.element.classList.remove('active');
            
            // Float around
            this.x += this.vx;
            this.y += this.vy;
            
            // Wrap around screen
            const buffer = 150;
            if (this.x < -buffer) this.x = window.innerWidth + buffer / 2;
            if (this.x > window.innerWidth + buffer) this.x = -buffer / 2;
            if (this.y < -buffer) this.y = window.innerHeight + buffer / 2;
            if (this.y > window.innerHeight + buffer) this.y = -buffer / 2;
            
            // Parallax
            const parallax = scrollY * (0.02 + this.depth * 0.06);
            
            this.element.style.left = `${this.x}px`;
            this.element.style.top = `${this.y}px`;
            this.element.style.transform = `translateY(${parallax}px)`;
        }
    }
    
    touch() {
        this.element.classList.add('touched');
        setTimeout(() => this.element.classList.remove('touched'), 600);
    }
}

// ========== MAIN CANVAS RENDERER ==========
class StringCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.chunks = [];
        
        this.pointerX = -1000;
        this.pointerY = -1000;
        this.scrollProgress = 0;
        this.lastScrollProgress = 0;
        this.lastTime = performance.now();
        
        this.resize();
        this.createChunks();
        
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.scale(dpr, dpr);
        
        // Recreate chunks on resize
        this.createChunks();
    }
    
    createChunks() {
        this.chunks = [];
        for (let i = 0; i < CONFIG.chunks.count; i++) {
            this.chunks.push(new StringChunk(i, this.canvas));
        }
    }
    
    updatePointer(x, y) {
        this.pointerX = x;
        this.pointerY = y;
    }
    
    updateScroll(progress) {
        // Check if scrolled enough to morph
        const scrollDelta = Math.abs(progress - this.lastScrollProgress);
        
        if (scrollDelta > CONFIG.chunks.morphThreshold) {
            // Morph a random chunk
            const chunkIndex = Math.floor(random(0, this.chunks.length));
            this.chunks[chunkIndex].startMorph();
            this.lastScrollProgress = progress;
        }
        
        this.scrollProgress = progress;
    }
    
    animate() {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and draw chunks
        this.chunks.forEach(chunk => {
            chunk.update(dt, this.pointerX, this.pointerY, this.scrollProgress);
            chunk.draw(this.pointerX, this.pointerY);
        });
    }
}

// ========== MAIN APPLICATION ==========
class Portfolio {
    constructor() {
        this.canvas = document.getElementById('stringCanvas');
        this.floatingContainer = document.getElementById('floatingStrings');
        this.cursorGlow = document.getElementById('cursorGlow');
        this.scrollProgress = document.getElementById('scrollProgress');
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
        this.mobileNav = document.getElementById('mobileNav');
        
        this.floatingStrings = [];
        this.pointerX = -1000;
        this.pointerY = -1000;
        this.scrollY = 0;
        this.scrollPercent = 0;
        this.currentTheme = 0;
        this.isRunning = true;
        this.isMobile = isTouchDevice();
        
        this.init();
    }
    
    init() {
        // Create string canvas
        if (this.canvas) {
            this.stringCanvas = new StringCanvas(this.canvas);
        }
        
        // Create floating strings
        this.createFloatingStrings();
        
        // Setup events
        this.setupEvents();
        
        // Start animation
        this.animate();
        
        console.log(`✨ Portfolio ready (${this.isMobile ? 'Touch' : 'Desktop'})`);
    }
    
    createFloatingStrings() {
        if (!this.floatingContainer) return;
        
        const count = this.isMobile ? 
            Math.floor(CONFIG.floatingStrings.count * 0.5) : 
            CONFIG.floatingStrings.count;
        
        for (let i = 0; i < count; i++) {
            const text = CONFIG.floatingStrings.strings[
                Math.floor(random(0, CONFIG.floatingStrings.strings.length))
            ];
            this.floatingStrings.push(
                new FloatingCodeString(this.floatingContainer, text, i, count)
            );
        }
    }
    
    setupEvents() {
        // Pointer events
        if (this.isMobile) {
            document.addEventListener('touchstart', e => this.handleTouch(e), { passive: true });
            document.addEventListener('touchmove', e => this.handleTouch(e), { passive: true });
            document.addEventListener('touchend', () => this.handleTouchEnd());
        } else {
            document.addEventListener('mousemove', e => this.handleMouse(e));
            document.addEventListener('mouseleave', () => this.handleMouseLeave());
        }
        
        // Scroll
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        
        // Visibility
        document.addEventListener('visibilitychange', () => {
            this.isRunning = !document.hidden;
            if (this.isRunning) {
                this.stringCanvas.lastTime = performance.now();
                this.animate();
            }
        });
        
        // Mobile menu
        if (this.mobileMenuBtn) {
            this.mobileMenuBtn.addEventListener('click', () => {
                this.mobileMenuBtn.classList.toggle('active');
                this.mobileNav.classList.toggle('active');
            });
        }
        
        document.querySelectorAll('.mobile-nav a').forEach(link => {
            link.addEventListener('click', () => {
                this.mobileMenuBtn.classList.remove('active');
                this.mobileNav.classList.remove('active');
            });
        });
        
        // Smooth scroll
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', e => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
        
        // Form
        this.setupForm();
    }
    
    handleMouse(e) {
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        
        if (this.cursorGlow) {
            this.cursorGlow.style.left = `${e.clientX}px`;
            this.cursorGlow.style.top = `${e.clientY}px`;
            this.cursorGlow.classList.add('visible');
        }
        
        if (this.stringCanvas) {
            this.stringCanvas.updatePointer(e.clientX, e.clientY);
        }
    }
    
    handleMouseLeave() {
        this.pointerX = -1000;
        this.pointerY = -1000;
        
        if (this.cursorGlow) {
            this.cursorGlow.classList.remove('visible');
        }
        
        if (this.stringCanvas) {
            this.stringCanvas.updatePointer(-1000, -1000);
        }
    }
    
    handleTouch(e) {
        const touch = e.touches[0];
        if (!touch) return;
        
        this.pointerX = touch.clientX;
        this.pointerY = touch.clientY;
        
        if (this.cursorGlow) {
            this.cursorGlow.style.left = `${touch.clientX}px`;
            this.cursorGlow.style.top = `${touch.clientY}px`;
            this.cursorGlow.classList.add('visible');
        }
        
        if (this.stringCanvas) {
            this.stringCanvas.updatePointer(touch.clientX, touch.clientY);
        }
        
        // Trigger touch on nearby floating strings
        this.floatingStrings.forEach(str => {
            const dist = distance(str.x, str.y, touch.clientX, touch.clientY);
            if (dist < CONFIG.floatingStrings.interactionRadius * 1.5) {
                str.touch();
            }
        });
    }
    
    handleTouchEnd() {
        setTimeout(() => {
            this.pointerX = -1000;
            this.pointerY = -1000;
            
            if (this.cursorGlow) {
                this.cursorGlow.classList.remove('visible');
            }
            
            if (this.stringCanvas) {
                this.stringCanvas.updatePointer(-1000, -1000);
            }
        }, 150);
    }
    
    handleScroll() {
        this.scrollY = window.scrollY;
        
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        this.scrollPercent = clamp(this.scrollY / docHeight, 0, 1);
        
        // Update progress bar
        if (this.scrollProgress) {
            this.scrollProgress.style.width = `${this.scrollPercent * 100}%`;
        }
        
        // Update string canvas
        if (this.stringCanvas) {
            this.stringCanvas.updateScroll(this.scrollPercent);
        }
        
        // Update theme
        this.updateTheme();
    }
    
    updateTheme() {
        const sections = document.querySelectorAll('[data-section]');
        let currentSection = 0;
        
        sections.forEach((section, index) => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= window.innerHeight / 2) {
                currentSection = index;
            }
        });
        
        if (currentSection !== this.currentTheme) {
            CONFIG.themes.forEach(t => document.body.classList.remove(t));
            document.body.classList.add(CONFIG.themes[currentSection % CONFIG.themes.length]);
            this.currentTheme = currentSection;
        }
    }
    
    setupForm() {
        const form = document.querySelector('.contact-form');
        if (!form) return;
        
        form.addEventListener('submit', e => {
            e.preventDefault();
            
            const btn = form.querySelector('.btn');
            const originalText = btn.textContent;
            
            btn.textContent = 'Sending...';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.textContent = '✓ Sent';
                form.reset();
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 2500);
            }, 1500);
        });
    }
    
    animate() {
        if (!this.isRunning) return;
        
        // Update canvas strings
        if (this.stringCanvas) {
            this.stringCanvas.animate();
        }
        
        // Update floating strings
        this.floatingStrings.forEach(str => {
            str.update(this.pointerX, this.pointerY, this.scrollY);
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', () => {
    new Portfolio();
});