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

        this.px = -1000;
        this.py = -1000;
        this.scrollY = 0;
        this.scrollPct = 0;
        this.theme = -1;
        this.running = true;
        this.mobile = isTouch();

        this.init();
    }

    init() {
        if (this.canvasEl) {
            this.ribbons = new RibbonCanvas(this.canvasEl);
        }
        this.floats = new FloatingManager(this.floatBox, this.mobile);
        this.events();
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
            if (this.running && this.ribbons) {
                this.ribbons.lastTime = performance.now();
            }
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
                const t = document.querySelector(a.getAttribute('href'));
                if (t) t.scrollIntoView({ behavior: 'smooth' });
            });
        });

        this.formSetup();
    }

    setPointer(x, y) {
        this.px = x;
        this.py = y;
        if (this.glow) {
            this.glow.style.left = x + 'px';
            this.glow.style.top = y + 'px';
            this.glow.classList.add('visible');
        }
        if (this.ribbons) this.ribbons.updatePointer(x, y);
    }

    onMouse(e) {
        this.setPointer(e.clientX, e.clientY);
    }

    onTouch(e) {
        const t = e.touches[0];
        if (!t) return;
        this.setPointer(t.clientX, t.clientY);
        if (this.floats) this.floats.touchNear(t.clientX, t.clientY);
    }

    offPointer() {
        setTimeout(() => {
            this.px = -1000;
            this.py = -1000;
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
        if (this.ribbons) this.ribbons.updateScroll(this.scrollPct);
        this.updateTheme();
    }

    updateTheme() {
        let cur = 0;
        document.querySelectorAll('[data-section]').forEach((s, i) => {
            if (s.getBoundingClientRect().top <= innerHeight / 2) cur = i;
        });
        if (cur !== this.theme) {
            CONFIG.themes.forEach(t => document.body.classList.remove(t));
            document.body.classList.add(CONFIG.themes[cur % CONFIG.themes.length]);
            this.theme = cur;
        }
    }

    formSetup() {
        const form = document.querySelector('.contact-form');
        if (!form) return;
        form.addEventListener('submit', e => {
            e.preventDefault();
            const btn = form.querySelector('.btn');
            const txt = btn.textContent;
            btn.textContent = 'Sending…';
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = '✓ Sent';
                form.reset();
                setTimeout(() => {
                    btn.textContent = txt;
                    btn.disabled = false;
                }, 3000);
            }, 1500);
        });
    }

    loop() {
        if (!this.running) return;
        if (this.ribbons) this.ribbons.animate();
        if (this.floats) this.floats.update(this.px, this.py, this.scrollY);
        requestAnimationFrame(() => this.loop());
    }
}

document.addEventListener('DOMContentLoaded', () => new App());