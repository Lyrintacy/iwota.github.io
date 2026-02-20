/* ═══════ MAIN APP - ORCHESTRATES EVERYTHING ═══════ */
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
        this.px = -1000; 
        this.py = -1000;
        this.scrollY = 0; 
        this.scrollPct = 0;
        this.running = true;
        this.mobile = isTouch();
        this.time = 0;
        this.lastTime = performance.now();
        this.init();
    }
    
    init() {
        this.basement = new BasementManager();
        
        // Ribbons - work on all devices, non-interactive on mobile
        this.ribbonCanvasEl = document.createElement('canvas');
        this.ribbonCanvasEl.style.cssText = 'position:fixed;inset:0;z-index:4;pointer-events:none;width:100%;height:100%';
        document.body.appendChild(this.ribbonCanvasEl);
        this.ribbons = new RibbonCanvas(this.ribbonCanvasEl, this.mobile);
        
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
        this.px = x; 
        this.py = y;
        if (this.ribbons && !this.mobile) {
            this.ribbons.updatePointer(x, y);
        }
        if (this.glow && !this.mobile) {
            this.glow.style.left = x + 'px'; 
            this.glow.style.top = y + 'px';
            this.glow.classList.add('visible');
        }
    }

    onMouse(e) { 
        this.setPointer(e.clientX, e.clientY); 
    }

    onTouch(e) {
        var t = e.touches[0]; 
        if (!t) return;
        if (this.floats) this.floats.touchNear(t.clientX, t.clientY);
    }

    offPointer() {
        var self = this;
        setTimeout(function() {
            self.px = -1000; 
            self.py = -1000;
            if (self.ribbons && !self.mobile) {
                self.ribbons.updatePointer(-1000, -1000);
            }
            if (self.glow) self.glow.classList.remove('visible');
        }, 200);
    }

    onScroll() {
        this.scrollY = scrollY;
        var max = document.documentElement.scrollHeight - innerHeight;
        this.scrollPct = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
        if (this.progressBar) this.progressBar.style.width = (this.scrollPct * 100) + '%';
        if (this.navbar) this.navbar.classList.toggle('at-top', scrollY < 50);
        if (this.ribbons) this.ribbons.updateScroll(this.scrollPct);
        this.landscape.update(this.scrollPct);
        this.sky.update(this.scrollPct);

        var undergroundAlpha = smoothstep(clamp((this.scrollPct - 0.42) / 0.2, 0, 1));
        if (this.undergroundOverlay) this.undergroundOverlay.style.opacity = undergroundAlpha;
    }

    formSetup() {
        var form = document.getElementById('contactForm');
        if (!form) return;
        form.addEventListener('submit', function() {
            var btn = form.querySelector('.btn');
            var txt = btn.textContent;
            btn.textContent = 'Sending…'; 
            btn.disabled = true;
            setTimeout(function() { 
                btn.textContent = txt; 
                btn.disabled = false; 
            }, 5000);
        });
    }

    loop() {
        if (!this.running) return;
        var now = performance.now();
        var dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        this.time += dt;

        if (this.ribbons) {
            var ribbonFade = 1 - smoothstep(clamp((this.scrollPct - 0.5) / 0.15, 0, 1));
            this.ribbonCanvasEl.style.opacity = ribbonFade;
            if (ribbonFade > 0.01) this.ribbons.animate();
        }

        this.woven.update(dt, this.scrollPct);
        this.clouds.update(this.scrollPct, this.time);
        this.mascots.update(this.scrollPct, this.time);

        var dustOpacity = smoothstep(clamp((this.scrollPct - 0.6) / 0.15, 0, 1));
        this.dust.update(this.time, dustOpacity);

        if (this.floats) this.floats.update(this.px, this.py, this.scrollY);

        var self = this;
        requestAnimationFrame(function() { self.loop(); });
    }
}

document.addEventListener('DOMContentLoaded', function() { 
    new App(); 
});