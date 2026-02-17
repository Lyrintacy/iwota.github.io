class BasementManager {
    constructor() {
        this.buildCards();
        this.buildReferences();
        this.buildBasementProjects();
        this.bindEvents();
    }

    buildCards() {
        var grid = document.getElementById('projectGrid');
        if (!grid) return;
        for (var idx = 0; idx < PROJECTS.length; idx++) {
            var proj = PROJECTS[idx];
            var card = document.createElement('article');
            card.className = 'pcard';
            card.setAttribute('data-project-id', proj.id);
            card.innerHTML =
                '<div class="pcard-thumb">' +
                    '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--pri);opacity:.3">' + proj.icon + '</div>' +
                '</div>' +
                '<div class="pcard-body">' +
                    '<div class="pcard-num">' + proj.num + '</div>' +
                    '<h3>' + proj.title + '</h3>' +
                    '<p class="pcard-short">' + proj.short + '</p>' +
                '</div>' +
                '<div class="pcard-meta-expand">' +
                    '<div class="pm-row"><span class="pm-label">Role</span><span class="pm-value">' + proj.role + '</span></div>' +
                    '<div class="pm-row"><span class="pm-label">Team</span><span class="pm-value">' + proj.team + '</span></div>' +
                    '<div class="pm-row"><span class="pm-label">Engine</span><span class="pm-value">' + proj.engine + '</span></div>' +
                    '<div class="pm-row"><span class="pm-label">Timeline</span><span class="pm-value">' + proj.timeframe + '</span></div>' +
                    '<a href="#bp-' + proj.id + '" class="pcard-go">Read more in the Basement →</a>' +
                '</div>';
            grid.appendChild(card);
        }
    }

    buildReferences() {
        var list = document.getElementById('refList');
        if (!list) return;
        for (var i = 0; i < REFERENCES.length; i++) {
            var ref = REFERENCES[i];
            var card = document.createElement('a');
            card.href = ref.link; card.target = '_blank'; card.rel = 'noopener noreferrer';
            card.className = 'rcard';
            card.innerHTML =
                '<img src="' + ref.img + '" alt="' + ref.name + '" onerror="this.src=\'' + ref.fallback + '\'">' +
                '<div><h3>' + ref.name + '</h3><p class="rcard-role">' + ref.role + '</p>' +
                '<p>' + ref.desc + '</p>' +
                (ref.quote ? '<p class="rcard-quote">' + ref.quote + '</p>' : '') +
                '<span class="rcard-link">' + ref.linkLabel + '</span></div>';
            list.appendChild(card);
        }
    }

    buildBasementProjects() {
        var container = document.getElementById('basementProjects');
        if (!container) return;
        for (var idx = 0; idx < PROJECTS.length; idx++) {
            var proj = PROJECTS[idx];
            var block = document.createElement('div');
            block.className = 'bproject'; block.id = 'bp-' + proj.id;
            var paragraphsHTML = '', tagsHTML = '';
            for (var p = 0; p < proj.paragraphs.length; p++) paragraphsHTML += '<p>' + proj.paragraphs[p] + '</p>';
            for (var t = 0; t < proj.tags.length; t++) tagsHTML += '<span>' + proj.tags[t] + '</span>';
            block.innerHTML =
                '<div class="bproject-header">' +
                    '<div class="bproject-thumb" style="background:linear-gradient(135deg,rgba(var(--pri-rgb),.1),rgba(var(--acc-rgb),.06));display:flex;align-items:center;justify-content:center;color:var(--pri);opacity:.4">' + proj.icon + '</div>' +
                    '<div class="bproject-header-text"><h3>' + proj.title + '</h3><p class="bproject-tagline">' + proj.tagline + '</p></div>' +
                '</div>' +
                '<div class="bproject-meta">' +
                    '<div><span class="bm-label">Role</span><span class="bm-value">' + proj.role + '</span></div>' +
                    '<div><span class="bm-label">Team</span><span class="bm-value">' + proj.team + '</span></div>' +
                    '<div><span class="bm-label">Engine</span><span class="bm-value">' + proj.engine + '</span></div>' +
                    '<div><span class="bm-label">Timeline</span><span class="bm-value">' + proj.timeframe + '</span></div>' +
                '</div>' +
                '<div class="bproject-tags">' + tagsHTML + '</div>' +
                '<div class="bproject-content">' + paragraphsHTML + '</div>' +
                '<button class="bproject-toggle"><span>Read more</span>' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' +
                '</button>';
            container.appendChild(block);
        }
    }

    bindEvents() {
        var cards = document.querySelectorAll('.pcard');
        for (var i = 0; i < cards.length; i++) {
            (function(card) {
                card.addEventListener('click', function(e) {
                    if (e.target.closest('.pcard-go')) return;
                    if (isTouch()) card.classList.toggle('touch-open');
                });
            })(cards[i]);
        }
        var toggles = document.querySelectorAll('.bproject-toggle');
        for (var i = 0; i < toggles.length; i++) {
            (function(btn) {
                btn.addEventListener('click', function() {
                    var project = btn.closest('.bproject');
                    var isExpanded = project.classList.toggle('expanded');
                    btn.querySelector('span').textContent = isExpanded ? 'Show less' : 'Read more';
                });
            })(toggles[i]);
        }
        this.checkDeepLink();
        window.addEventListener('hashchange', this.checkDeepLink.bind(this));
    }

    checkDeepLink() {
        var hash = location.hash;
        if (!hash || hash.indexOf('#bp-') !== 0) return;
        var target = document.getElementById(hash.substring(1));
        if (target && target.classList.contains('bproject')) {
            target.classList.add('expanded');
            var btn = target.querySelector('.bproject-toggle span');
            if (btn) btn.textContent = 'Show less';
            setTimeout(function() { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
        }
    }
}