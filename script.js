// ========== CONFIGURATION ==========
const CONFIG = {
    // Floating text strings
    textStrings: {
        count: 35,
        interactionRadius: 150,
        repelStrength: 80,
        floatSpeed: 0.4,
        strings: [
            'const create = () => {}',
            'function design()',
            '<div class="dream">',
            'npm install creativity',
            'git commit -m "magic"',
            'console.log("Hello")',
            '{ innovation: true }',
            'import { success }',
            'async/await dreams',
            'return possibilities;',
            '// TODO: be awesome',
            'let future = now();',
            'while(alive) { code() }',
            'export default ideas',
            'new Promise(resolve)',
            'Array.from(passion)',
            '.map(skill => grow)',
            'try { succeed() }',
            'catch(err) { learn }',
            '/* creativity */',
            '@keyframes infinite',
            'transform: dreams;',
            'opacity: visible;',
            'z-index: top;',
            'display: flex;',
            'position: future;'
        ]
    },
    // Visual string lines
    stringLines: {
        count: 12,
        waveAmplitude: 30,
        waveFrequency: 0.02,
        interactionRadius: 120,
        interactionStrength: 50
    },
    // Color themes for each section
    themes: ['theme-cyan', 'theme-purple', 'theme-pink', 'theme-orange']
};

// ========== UTILITY FUNCTIONS ==========
const lerp = (start, end, factor) => start + (end - start) * factor;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const distance = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

// ========== DEVICE DETECTION ==========
const isTouchDevice = () => {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0);
};

// ========== FLOATING TEXT STRING CLASS ==========
class FloatingTextString {
    constructor(container, text, index, total) {
        this.container = container;
        this.text = text;
        this.index = index;
        
        // Position
        this.x = Math.random() * window.innerWidth;
        this.y = (index / total) * window.innerHeight * 1.5;
        
        // Velocity
        this.vx = (Math.random() - 0.5) * CONFIG.textStrings.floatSpeed;
        this.vy = (Math.random() - 0.5) * CONFIG.textStrings.floatSpeed;
        
        // Properties
        this.baseOpacity = 0.08 + Math.random() * 0.12;
        this.depth = Math.random(); // For parallax
        
        // Create element
        this.element = document.createElement('div');
        this.element.className = 'floating-string';
        this.element.textContent = text;
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
        this.element.style.opacity = this.baseOpacity;
        
        container.appendChild(this.element);
    }
    
    update(pointerX, pointerY, scrollY) {
        const dx = this.x - pointerX;
        const dy = this.y - pointerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < CONFIG.textStrings.interactionRadius && pointerX > 0) {
            this.element.classList.add('active');
            
            const force = Math.pow((CONFIG.textStrings.interactionRadius - dist) / CONFIG.textStrings.interactionRadius, 1.5);
            const angle = Math.atan2(dy, dx);
            
            const repelX = Math.cos(angle) * force * CONFIG.textStrings.repelStrength;
            const repelY = Math.sin(angle) * force * CONFIG.textStrings.repelStrength;
            const rotation = force * 10 * (this.index % 2 ? 1 : -1);
            
            this.element.style.transform = `translate(${repelX}px, ${repelY}px) scale(${1 + force * 0.2}) rotate(${rotation}deg)`;
        } else {
            this.element.classList.remove('active');
            
            // Float movement
            this.x += this.vx;
            this.y += this.vy;
            
            // Wrap around
            if (this.x < -100) this.x = window.innerWidth + 50;
            if (this.x > window.innerWidth + 100) this.x = -50;
            if (this.y < -50) this.y = window.innerHeight + 50;
            if (this.y > window.innerHeight + 50) this.y = -50;
            
            // Parallax
            const parallax = scrollY * (0.03 + this.depth * 0.07);
            
            this.element.style.left = `${this.x}px`;
            this.element.style.top = `${this.y}px`;
            this.element.style.transform = `translateY(${parallax}px)`;
        }
    }
    
    handleTouch() {
        this.element.classList.add('touched');
        setTimeout(() => this.element.classList.remove('touched'), 500);
    }
}

// ========== CANVAS STRING LINES CLASS ==========
class StringLinesCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.strings = [];
        this.pointerX = -1000;
        this.pointerY = -1000;
        this.scrollProgress = 0;
        this.time = 0;
        
        this.resize();
        this.createStrings();
        
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.createStrings();
    }
    
    createStrings() {
        this.strings = [];
        const spacing = this.canvas.height / (CONFIG.stringLines.count + 1);
        
        for (let i = 0; i < CONFIG.stringLines.count; i++) {
            const y = spacing * (i + 1);
            const points = [];
            const segments = Math.floor(this.canvas.width / 20);
            
            for (let j = 0; j <= segments; j++) {
                points.push({
                    x: (this.canvas.width / segments) * j,
                    baseY: y,
                    y: y,
                    vy: 0
                });
            }
            
            this.strings.push({
                points,
                baseY: y,
                phase: Math.random() * Math.PI * 2,
                amplitude: 15 + Math.random() * 20,
                frequency: 0.008 + Math.random() * 0.01,
                speed: 0.5 + Math.random() * 0.5,
                hue: 175 + Math.random() * 20 // Cyan-ish
            });
        }
    }
    
    updatePointer(x, y) {
        this.pointerX = x;
        this.pointerY = y;
    }
    
    updateScroll(progress) {
        this.scrollProgress = progress;
    }
    
    update() {
        this.time += 0.016; // ~60fps
        
        // Color shift based on scroll
        const hueShift = this.scrollProgress * 120; // Cycle through colors
        
        this.strings.forEach((string, stringIndex) => {
            // Update configuration based on scroll
            const scrollFactor = 1 + this.scrollProgress * 0.5;
            const currentAmplitude = string.amplitude * scrollFactor;
            const currentFrequency = string.frequency * (1 + this.scrollProgress * 0.3);
            
            string.points.forEach((point, pointIndex) => {
                // Wave motion
                const wave = Math.sin(
                    point.x * currentFrequency + 
                    this.time * string.speed + 
                    string.phase
                ) * currentAmplitude;
                
                // Second wave for complexity
                const wave2 = Math.sin(
                    point.x * currentFrequency * 2 + 
                    this.time * string.speed * 0.7 + 
                    string.phase + Math.PI
                ) * (currentAmplitude * 0.3);
                
                // Target Y with waves
                let targetY = string.baseY + wave + wave2;
                
                // Pointer interaction
                const dx = point.x - this.pointerX;
                const dy = point.y - this.pointerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < CONFIG.stringLines.interactionRadius) {
                    const force = (CONFIG.stringLines.interactionRadius - dist) / CONFIG.stringLines.interactionRadius;
                    const push = force * CONFIG.stringLines.interactionStrength;
                    
                    // Push away from cursor
                    if (dy > 0) {
                        targetY += push;
                    } else {
                        targetY -= push;
                    }
                }
                
                // Smooth movement
                point.vy += (targetY - point.y) * 0.1;
                point.vy *= 0.85; // Damping
                point.y += point.vy;
            });
            
            // Update hue based on scroll
            string.hue = 175 + hueShift + stringIndex * 5;
        });
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.strings.forEach((string, index) => {
            // Calculate opacity based on position
            const opacity = 0.15 + Math.sin(this.time + index) * 0.05;
            
            // Draw string
            this.ctx.beginPath();
            this.ctx.moveTo(string.points[0].x, string.points[0].y);
            
            // Use quadratic curves for smoothness
            for (let i = 1; i < string.points.length - 1; i++) {
                const xc = (string.points[i].x + string.points[i + 1].x) / 2;
                const yc = (string.points[i].y + string.points[i + 1].y) / 2;
                this.ctx.quadraticCurveTo(string.points[i].x, string.points[i].y, xc, yc);
            }
            
            // Last point
            const last = string.points.length - 1;
            this.ctx.lineTo(string.points[last].x, string.points[last].y);
            
            // Style
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
            gradient.addColorStop(0, `hsla(${string.hue}, 100%, 70%, 0)`);
            gradient.addColorStop(0.2, `hsla(${string.hue}, 100%, 70%, ${opacity})`);
            gradient.addColorStop(0.5, `hsla(${string.hue + 20}, 100%, 70%, ${opacity * 1.5})`);
            gradient.addColorStop(0.8, `hsla(${string.hue}, 100%, 70%, ${opacity})`);
            gradient.addColorStop(1, `hsla(${string.hue}, 100%, 70%, 0)`);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 1.5 + Math.sin(this.time * 2 + index) * 0.5;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
            
            // Draw glow
            this.ctx.strokeStyle = `hsla(${string.hue}, 100%, 70%, ${opacity * 0.3})`;
            this.ctx.lineWidth = 6;
            this.ctx.stroke();
        });
    }
    
    animate() {
        this.update();
        this.draw();
    }
}

// ========== MAIN APPLICATION ==========
class InteractivePortfolio {
    constructor() {
        // Elements
        this.stringBg = document.getElementById('stringBg');
        this.cursorGlow = document.getElementById('cursorGlow');
        this.canvas = document.getElementById('stringCanvas');
        this.scrollProgress = document.getElementById('scrollProgress');
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
        this.mobileNav = document.getElementById('mobileNav');
        
        // State
        this.textStrings = [];
        this.pointerX = -1000;
        this.pointerY = -1000;
        this.scrollY = 0;
        this.scrollPercent = 0;
        this.currentTheme = 0;
        this.isRunning = true;
        this.isMobile = isTouchDevice();
        
        // Initialize
        this.init();
    }
    
    init() {
        // Create floating text strings
        this.createTextStrings();
        
        // Create canvas string lines
        if (this.canvas) {
            this.stringLines = new StringLinesCanvas(this.canvas);
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start animation
        this.animate();
        
        console.log(`✨ Portfolio initialized (${this.isMobile ? 'Touch' : 'Desktop'} mode)`);
    }
    
    createTextStrings() {
        if (!this.stringBg) return;
        
        const count = this.isMobile ? 
            Math.floor(CONFIG.textStrings.count * 0.6) : 
            CONFIG.textStrings.count;
        
        for (let i = 0; i < count; i++) {
            const text = CONFIG.textStrings.strings[
                Math.floor(Math.random() * CONFIG.textStrings.strings.length)
            ];
            this.textStrings.push(
                new FloatingTextString(this.stringBg, text, i, count)
            );
        }
    }
    
    setupEventListeners() {
        // ===== POINTER EVENTS =====
        if (this.isMobile) {
            // Touch events
            document.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: true });
            document.addEventListener('touchmove', (e) => this.handleTouch(e), { passive: true });
            document.addEventListener('touchend', () => this.handleTouchEnd());
        } else {
            // Mouse events
            document.addEventListener('mousemove', (e) => this.handleMouse(e));
            document.addEventListener('mouseleave', () => this.handleMouseLeave());
        }
        
        // ===== SCROLL EVENTS =====
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        
        // ===== RESIZE =====
        window.addEventListener('resize', () => this.handleResize());
        
        // ===== VISIBILITY =====
        document.addEventListener('visibilitychange', () => {
            this.isRunning = !document.hidden;
            if (this.isRunning) this.animate();
        });
        
        // ===== MOBILE MENU =====
        if (this.mobileMenuBtn) {
            this.mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
        }
        
        // Close mobile menu on link click
        document.querySelectorAll('.mobile-nav a').forEach(link => {
            link.addEventListener('click', () => this.closeMobileMenu());
        });
        
        // ===== SMOOTH SCROLL =====
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
        
        // ===== FORM HANDLING =====
        this.setupFormHandling();
    }
    
    handleMouse(e) {
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        
        if (this.cursorGlow) {
            this.cursorGlow.style.left = `${e.clientX}px`;
            this.cursorGlow.style.top = `${e.clientY}px`;
            this.cursorGlow.classList.add('visible');
        }
        
        if (this.stringLines) {
            this.stringLines.updatePointer(e.clientX, e.clientY);
        }
    }
    
    handleMouseLeave() {
        this.pointerX = -1000;
        this.pointerY = -1000;
        
        if (this.cursorGlow) {
            this.cursorGlow.classList.remove('visible');
        }
        
        if (this.stringLines) {
            this.stringLines.updatePointer(-1000, -1000);
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
        
        if (this.stringLines) {
            this.stringLines.updatePointer(touch.clientX, touch.clientY);
        }
        
        // Trigger touch animation on nearby strings
        this.textStrings.forEach(string => {
            const dx = string.x - touch.clientX;
            const dy = string.y - touch.clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < CONFIG.textStrings.interactionRadius * 1.5) {
                string.handleTouch();
            }
        });
    }
    
    handleTouchEnd() {
        // Delay hiding to allow animation
        setTimeout(() => {
            this.pointerX = -1000;
            this.pointerY = -1000;
            
            if (this.cursorGlow) {
                this.cursorGlow.classList.remove('visible');
            }
            
            if (this.stringLines) {
                this.stringLines.updatePointer(-1000, -1000);
            }
        }, 100);
    }
    
    handleScroll() {
        this.scrollY = window.scrollY;
        
        // Calculate scroll percentage
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        this.scrollPercent = clamp(this.scrollY / docHeight, 0, 1);
        
        // Update scroll progress bar
        if (this.scrollProgress) {
            this.scrollProgress.style.width = `${this.scrollPercent * 100}%`;
        }
        
        // Update string lines
        if (this.stringLines) {
            this.stringLines.updateScroll(this.scrollPercent);
        }
        
        // Update theme based on scroll position
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
            // Remove all themes
            CONFIG.themes.forEach(theme => document.body.classList.remove(theme));
            
            // Add new theme
            document.body.classList.add(CONFIG.themes[currentSection % CONFIG.themes.length]);
            this.currentTheme = currentSection;
        }
    }
    
    handleResize() {
        // Redistribute text strings
        this.textStrings.forEach((string, index) => {
            string.x = Math.random() * window.innerWidth;
            string.y = (index / this.textStrings.length) * window.innerHeight;
            string.element.style.left = `${string.x}px`;
            string.element.style.top = `${string.y}px`;
        });
    }
    
    toggleMobileMenu() {
        this.mobileMenuBtn.classList.toggle('active');
        this.mobileNav.classList.toggle('active');
    }
    
    closeMobileMenu() {
        this.mobileMenuBtn.classList.remove('active');
        this.mobileNav.classList.remove('active');
    }
    
    setupFormHandling() {
        const form = document.querySelector('.contact-form');
        if (!form) return;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const btn = form.querySelector('.btn');
            const originalText = btn.textContent;
            
            btn.textContent = 'Sending...';
            btn.disabled = true;
            
            // Simulate sending
            setTimeout(() => {
                btn.textContent = 'Sent! ✓';
                btn.style.background = 'var(--primary)';
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
        
        // Update text strings
        this.textStrings.forEach(string => {
            string.update(this.pointerX, this.pointerY, this.scrollY);
        });
        
        // Update canvas string lines
        if (this.stringLines) {
            this.stringLines.animate();
        }
        
        requestAnimationFrame(() => this.animate());
    }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', () => {
    new InteractivePortfolio();
});