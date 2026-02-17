/**
 * Void Transition — cascading rounded squares
 * Gold → dark purple → black, with parallax
 */
class VoidTransition {
    constructor(container) {
        this.container = container;
        this.blocks = [];
        this.active = false;
        this.animFrame = null;
    }

    createBlocks() {
        this.container.innerHTML = '';
        this.blocks = [];

        const cellSize = 65;
        const cols = Math.ceil(innerWidth / cellSize) + 2;
        const rows = Math.ceil(innerHeight / cellSize) + 2;
        const size = cellSize - 5;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const block = document.createElement('div');
                block.className = 'void-block';

                const x = col * cellSize - cellSize / 2;
                const y = row * cellSize - cellSize / 2;

                // color: dark gold → dark purple → near black
                const t = row / rows;
                const t2 = t * t; // ease into darkness
                const r = Math.round(lerp(160, 8, t2));
                const g = Math.round(lerp(130, 5, t2));
                const b = Math.round(lerp(30, 14, t2));

                block.style.cssText = `
                    left:${x}px; top:${y}px;
                    width:${size}px; height:${size}px;
                    background:rgb(${r},${g},${b});
                    border-radius:14px;
                `;

                this.container.appendChild(block);
                this.blocks.push({
                    el: block,
                    x, y, row, col,
                    baseY: y,
                    // stagger: center-out spiral
                    delay: this.spiralDelay(row, col, rows, cols),
                    parallaxRate: 0.15 + t * 0.85,
                    rotation: rand(-8, 8)
                });
            }
        }
    }

    spiralDelay(row, col, rows, cols) {
        const cx = cols / 2;
        const cy = rows / 2;
        const dx = (col - cx) / cx;
        const dy = (row - cy) / cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        return dist * 0.35 + angle * 0.02 + rand(0, 0.04);
    }

    animateIn(callback) {
        this.createBlocks();
        this.active = true;

        const startTime = performance.now();
        const totalDuration = 1000;

        const animate = () => {
            const elapsed = performance.now() - startTime;

            let allDone = true;
            for (const block of this.blocks) {
                const localT = clamp((elapsed - block.delay * 1000) / 350, 0, 1);
                if (localT < 1) allDone = false;
                const ease = smoothstep(localT);
                const scale = ease;
                const rot = block.rotation * (1 - ease);

                block.el.style.opacity = ease;
                block.el.style.transform = `scale(${scale}) rotate(${rot}deg)`;
            }

            if (!allDone && elapsed < totalDuration + 600) {
                this.animFrame = requestAnimationFrame(animate);
            } else {
                // ensure all visible
                for (const block of this.blocks) {
                    block.el.style.opacity = '1';
                    block.el.style.transform = 'scale(1) rotate(0deg)';
                }
                if (callback) callback();
            }
        };

        this.animFrame = requestAnimationFrame(animate);
    }

    animateOut(callback) {
        const startTime = performance.now();
        const totalDuration = 800;

        const animate = () => {
            const elapsed = performance.now() - startTime;

            let allDone = true;
            for (const block of this.blocks) {
                // reverse stagger — outside in
                const reverseDelay = (1 - block.delay / 0.7) * 0.3;
                const localT = clamp((elapsed - Math.max(0, reverseDelay) * 1000) / 300, 0, 1);
                if (localT < 1) allDone = false;
                const ease = smoothstep(localT);
                const scale = 1 - ease;
                const rot = block.rotation * ease;

                block.el.style.opacity = 1 - ease;
                block.el.style.transform = `scale(${scale}) rotate(${rot}deg)`;
            }

            if (!allDone && elapsed < totalDuration + 500) {
                this.animFrame = requestAnimationFrame(animate);
            } else {
                this.container.innerHTML = '';
                this.blocks = [];
                this.active = false;
                if (callback) callback();
            }
        };

        this.animFrame = requestAnimationFrame(animate);
    }

    updateParallax(scrollTop) {
        if (!this.active || !this.blocks.length) return;

        for (const block of this.blocks) {
            const parallaxY = scrollTop * block.parallaxRate * -0.12;
            block.el.style.transform = `translateY(${parallaxY}px) scale(1)`;
        }
    }

    destroy() {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.container.innerHTML = '';
        this.blocks = [];
        this.active = false;
    }
}

/**
 * Glass Row Hover — all panels in row activate together
 */
class GlassManager {
    constructor() {
        this.rows = document.querySelectorAll('.glass-row');
        this.init();
    }

    init() {
        this.rows.forEach(row => {
            row.addEventListener('mouseenter', () => row.classList.add('row-hover'));
            row.addEventListener('mouseleave', () => row.classList.remove('row-hover'));

            // touch
            row.addEventListener('touchstart', () => row.classList.add('row-hover'), { passive: true });
            row.addEventListener('touchend', () => {
                setTimeout(() => row.classList.remove('row-hover'), 300);
            }, { passive: true });
        });
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
        this.logoBtn = document.getElementById('logoBtn');
        this.mainPage = document.getElementById('mainPage');
        this.mainContent = document.getElementById('mainContent');
        this.scrollIndicator = document.getElementById('scrollIndicator');
        this.subpageOverlay = document.getElementById('subpageOverlay');
        this.subpageScroll = document.getElementById('subpageScroll');
        this.voidContainer = document.getElementById('voidTransition');
        this.backBtn = document.getElementById('backBtn');

        this.px = -1000;
        this.py = -1000;
        this.scrollY = 0;
        this.scrollPct = 0;
        this.running = true;
        this.mobile = isTouch();
        this.currentSubpage = null;
        this.transitioning = false;

        this.init();
    }

    init() {
        if (this.canvasEl) {
            this.ribbons = new RibbonCanvas(this.canvasEl);
        }
        this.floats = new FloatingManager(this.floatBox, this.mobile);
        this.glass = new GlassManager();
        this.void = new VoidTransition(this.voidContainer);
        this.events();
        this.loop();
    }

    events() {
        // pointer
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

        // mobile menu
        if (this.menuBtn) {
            this.menuBtn.addEventListener('click', () => {
                this.menuBtn.classList.toggle('active');
                this.mobileNav.classList.toggle('active');
            });
        }

        document.querySelectorAll('.mobile-nav a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.menuBtn.classList.remove('active');
                this.mobileNav.classList.remove('active');
                const target = a.getAttribute('data-subpage');
                if (target) this.openSubpage(target);
            });
        });

        // subpage navigation
        document.querySelectorAll('[data-subpage]').forEach(el => {
            el.addEventListener('click', e => {
                // don't prevent default on external links within subpages
                if (el.closest('.subpage')) return;
                e.preventDefault();
                const target = el.getAttribute('data-subpage');
                if (target && !this.transitioning) this.openSubpage(target);
            });
        });

        // logo → home
        if (this.logoBtn) {
            this.logoBtn.addEventListener('click', () => {
                if (this.currentSubpage) this.closeSubpage();
            });
        }

        // back button
        if (this.backBtn) {
            this.backBtn.addEventListener('click', () => this.closeSubpage());
        }

        // subpage scroll parallax
        if (this.subpageScroll) {
            this.subpageScroll.addEventListener('scroll', () => {
                this.void.updateParallax(this.subpageScroll.scrollTop);
            });
        }

        // escape
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.currentSubpage && !this.transitioning) {
                this.closeSubpage();
            }
        });

        // browser back
        window.addEventListener('popstate', () => {
            if (this.currentSubpage && !this.transitioning) {
                this.closeSubpage(true);
            }
        });

        this.formSetup();
    }

    openSubpage(name) {
        if (this.transitioning || this.currentSubpage) return;
        this.transitioning = true;
        this.currentSubpage = name;

        // push history
        history.pushState({ subpage: name }, '', `#${name}`);

        // close mobile nav
        if (this.menuBtn) this.menuBtn.classList.remove('active');
        if (this.mobileNav) this.mobileNav.classList.remove('active');

        // Step 1: fade out main content
        this.mainPage.classList.add('fading');
        if (this.scrollIndicator) this.scrollIndicator.classList.add('hidden');

        // Step 2: after fade, start void transition
        setTimeout(() => {
            // hide main page completely
            this.mainPage.classList.add('hidden');
            this.navbar.classList.add('nav-hidden');

            // prep subpage
            document.querySelectorAll('.subpage').forEach(s => s.classList.remove('active'));
            const target = document.getElementById(`sub-${name}`);
            if (target) target.classList.add('active');

            // activate overlay (but content hidden until void finishes)
            this.subpageOverlay.classList.add('active');

            // run void in
            this.void.animateIn(() => {
                // show content on top of void
                this.subpageOverlay.classList.add('content-visible');
                if (this.subpageScroll) this.subpageScroll.scrollTop = 0;
                this.transitioning = false;
            });
        }, 450); // wait for content fade
    }

    closeSubpage(fromPopstate = false) {
        if (this.transitioning || !this.currentSubpage) return;
        this.transitioning = true;

        if (!fromPopstate) {
            history.back();
        }

        // Step 1: fade out subpage content
        this.subpageOverlay.classList.remove('content-visible');

        // Step 2: after content fades, void out
        setTimeout(() => {
            this.void.animateOut(() => {
                // clean up
                this.subpageOverlay.classList.remove('active');
                document.querySelectorAll('.subpage').forEach(s => s.classList.remove('active'));

                // show main page
                this.mainPage.classList.remove('hidden');
                this.navbar.classList.remove('nav-hidden');

                // slight delay then fade in
                requestAnimationFrame(() => {
                    this.mainPage.classList.remove('fading');
                    if (this.scrollIndicator) this.scrollIndicator.classList.remove('hidden');
                });

                this.currentSubpage = null;
                this.transitioning = false;
            });
        }, 400);
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

    onMouse(e) { this.setPointer(e.clientX, e.clientY); }

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
                btn.textContent = '✓ Sent';
                form.reset();
                setTimeout(() => { btn.textContent = txt; btn.disabled = false; }, 3000);
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