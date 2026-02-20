class BasementManager {
    constructor() {
        this.buildCards();
        this.buildReferences();
        this.buildBasementProjects();
        this.bindEvents();
    }

    getEngineIcon(engineName) {
        var icons = {
            'Unity': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10.4 0L1.6 5.2v10.4L4 17l4-2.3V9.5L12 7l4 2.5v5.2l4 2.3 2.4-1.4V5.2L13.6 0h-3.2zM12 9.5L8 12l4 2.5 4-2.5-4-2.5zM4 17l4-2.3 4 2.5 4-2.5 4 2.3-6.4 3.7h-3.2L4 17z"/></svg>',
            'Unreal Engine': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2zm-1 5v6l-3-1.5V14l4 2 4-2v-2.5L13 13V7h-2z"/></svg>',
            'Godot': '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2zm-3 6.5a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4zM8.5 15c0 1.9 1.6 3.5 3.5 3.5s3.5-1.6 3.5-3.5h-7z"/></svg>'
        };
        return icons[engineName] || '';
    }

    getLinkIcon(type) {
        var icons = {
            'itch': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 245.371 220.736" fill="currentColor"><path d="M31.99 1.365C21.287 7.72.2 31.945 0 38.298v10.516C0 62.144 12.46 73.86 23.773 73.86c13.584 0 24.902-11.258 24.903-24.62 0 13.362 10.93 24.62 24.515 24.62 13.586 0 24.165-11.258 24.165-24.62 0 13.362 11.622 24.62 25.207 24.62h.246c13.586 0 25.208-11.258 25.208-24.62 0 13.362 10.58 24.62 24.164 24.62 13.585 0 24.515-11.258 24.515-24.62 0 13.362 11.32 24.62 24.903 24.62 11.313 0 23.773-11.714 23.773-25.046V38.298c-.2-6.354-21.287-30.58-31.988-36.933C180.118.197 125.943 0 122.686 0c-3.256 0-57.43.197-90.696 1.365z"/></svg>',
            'github': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>',
            'link': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>'
        };
        return icons[type] || icons['link'];
    }

    renderContentBlock(block) {
        if (!block || !block.type) return '';
        
        switch (block.type) {
            case 'text':
                return '<p class="bp-text">' + (block.text || '') + '</p>';

            case 'heading':
                return '<h4 class="bp-heading">' + (block.text || '') + '</h4>';

            case 'image':
                var sizeClass = block.size === 'small' ? 'bp-img-small' : block.size === 'medium' ? 'bp-img-medium' : 'bp-img-full';
                return '<figure class="bp-figure ' + sizeClass + '">' +
                    '<img src="' + (block.src || '') + '" alt="' + (block.caption || '') + '" class="bp-img" onerror="this.parentElement.style.display=\'none\'">' +
                    (block.caption ? '<figcaption class="bp-caption">' + block.caption + '</figcaption>' : '') +
                    '</figure>';

            case 'gallery':
                if (!block.images || !block.images.length) return '';
                var html = '<div class="bp-gallery">';
                for (var i = 0; i < block.images.length; i++) {
                    var img = block.images[i];
                    html += '<figure class="bp-gallery-item">' +
                        '<img src="' + (img.src || '') + '" alt="' + (img.caption || '') + '" class="bp-gallery-img" onerror="this.parentElement.style.display=\'none\'">' +
                        (img.caption ? '<figcaption class="bp-caption">' + img.caption + '</figcaption>' : '') +
                        '</figure>';
                }
                html += '</div>';
                return html;

            case 'columns':
                return '<div class="bp-columns">' +
                    '<div class="bp-col">' + (block.left ? this.renderContentBlock(block.left) : '') + '</div>' +
                    '<div class="bp-col">' + (block.right ? this.renderContentBlock(block.right) : '') + '</div>' +
                    '</div>';

            case 'quote':
                return '<blockquote class="bp-quote">' +
                    '<p>"' + (block.text || '') + '"</p>' +
                    (block.author ? '<cite>— ' + block.author + '</cite>' : '') +
                    '</blockquote>';

            case 'video':
                return '<div class="bp-video">' +
                    '<iframe src="' + (block.src || '') + '" frameborder="0" allowfullscreen></iframe>' +
                    '</div>';

            default:
                return '';
        }
    }

    buildCards() {
        var grid = document.getElementById('projectGrid');
        if (!grid) return;

        for (var idx = 0; idx < PROJECTS.length; idx++) {
            var proj = PROJECTS[idx];
            var card = document.createElement('article');
            card.className = 'pcard';
            card.setAttribute('data-project-id', proj.id);

            var thumbHTML = '';
            if (proj.thumbnail) {
                thumbHTML = '<img src="' + proj.thumbnail + '" alt="' + proj.title + '" class="pcard-thumb-img" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
                    '<div style="width:100%;height:100%;display:none;align-items:center;justify-content:center;color:var(--pri);opacity:.3">' + proj.icon + '</div>';
            } else {
                thumbHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--pri);opacity:.3">' + proj.icon + '</div>';
            }

            var engineHTML = '<span class="engine-icon">' + this.getEngineIcon(proj.engine) + ' ' + proj.engine + '</span>';

            card.innerHTML =
                '<div class="pcard-thumb">' + thumbHTML + '</div>' +
                '<div class="pcard-body">' +
                    '<div class="pcard-num">' + proj.num + '</div>' +
                    '<h3>' + proj.title + '</h3>' +
                    '<p class="pcard-short">' + proj.short + '</p>' +
                '</div>' +
                '<div class="pcard-meta-expand">' +
                    '<div class="pm-row"><span class="pm-label">Role</span><span class="pm-value">' + proj.role + '</span></div>' +
                    '<div class="pm-row"><span class="pm-label">Team</span><span class="pm-value">' + proj.team + '</span></div>' +
                    '<div class="pm-row"><span class="pm-label">Engine</span><span class="pm-value">' + engineHTML + '</span></div>' +
                    '<div class="pm-row"><span class="pm-label">Timeline</span><span class="pm-value">' + proj.timeframe + '</span></div>' +
                    '<a href="#bp-' + proj.id + '" class="pcard-go">' + TEXTS.games.cardGoLabel + '</a>' +
                '</div>' +
                '<div class="pcard-tooltip">' +
                    '<div class="pcard-tooltip-row"><span class="pcard-tooltip-label">Engine</span>' + engineHTML + '</div>' +
                    '<div class="pcard-tooltip-row"><span class="pcard-tooltip-label">Role</span>' + proj.role + '</div>' +
                    '<div class="pcard-tooltip-row"><span class="pcard-tooltip-label">Team</span>' + proj.team + '</div>' +
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
            card.href = ref.link;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
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
            block.className = 'bproject';
            block.id = 'bp-' + proj.id;

            // Thumbnail
            var thumbHTML = '';
            if (proj.thumbnail) {
                thumbHTML = '<img src="' + proj.thumbnail + '" alt="' + proj.title + '" class="bproject-thumb-img" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
                    '<div style="width:100%;height:100%;display:none;align-items:center;justify-content:center;color:var(--pri);opacity:.4">' + proj.icon + '</div>';
            } else {
                thumbHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--pri);opacity:.4">' + proj.icon + '</div>';
            }

            // Tags
            var tagsHTML = '';
            if (proj.tags && proj.tags.length > 0) {
                for (var t = 0; t < proj.tags.length; t++) {
                    tagsHTML += '<span>' + proj.tags[t] + '</span>';
                }
            }

            // Engine with icon
            var engineHTML = '<span class="engine-icon">' + this.getEngineIcon(proj.engine || '') + ' ' + (proj.engine || '') + '</span>';

            // Links
            var linksHTML = '';
            if (proj.links && proj.links.length > 0) {
                linksHTML = '<div class="bp-links">';
                for (var l = 0; l < proj.links.length; l++) {
                    var lnk = proj.links[l];
                    linksHTML += '<a href="' + lnk.url + '" target="_blank" rel="noopener" class="bp-link">' +
                        this.getLinkIcon(lnk.icon || 'link') + ' ' + lnk.label + '</a>';
                }
                linksHTML += '</div>';
            }

            // Content blocks - support BOTH old 'paragraphs' and new 'content' format
            var contentHTML = '';
            if (proj.content && proj.content.length > 0) {
                for (var c = 0; c < proj.content.length; c++) {
                    contentHTML += this.renderContentBlock(proj.content[c]);
                }
            } else if (proj.paragraphs && proj.paragraphs.length > 0) {
                for (var c = 0; c < proj.paragraphs.length; c++) {
                    contentHTML += '<p class="bp-text">' + proj.paragraphs[c] + '</p>';
                }
            }

            block.innerHTML =
                '<div class="bproject-header" data-target="bp-' + proj.id + '">' +
                    '<div class="bproject-header-inner">' +
                        '<div class="bproject-thumb">' + thumbHTML + '</div>' +
                        '<div class="bproject-header-text">' +
                            '<h3>' + proj.title + '</h3>' +
                            '<p class="bproject-tagline">' + (proj.tagline || '') + '</p>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="bproject-meta">' +
                    '<div><span class="bm-label">Role</span><span class="bm-value">' + (proj.role || '') + '</span></div>' +
                    '<div><span class="bm-label">Team</span><span class="bm-value">' + (proj.team || '') + '</span></div>' +
                    '<div><span class="bm-label">Engine</span><span class="bm-value">' + engineHTML + '</span></div>' +
                    '<div><span class="bm-label">Timeline</span><span class="bm-value">' + (proj.timeframe || '') + '</span></div>' +
                '</div>' +
                '<div class="bproject-tags">' + tagsHTML + '</div>' +
                linksHTML +
                '<div class="bproject-content">' + contentHTML + '</div>' +
                '<button class="bproject-toggle">' +
                    '<span>' + TEXTS.basement.expandLabel + '</span>' +
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

        var headers = document.querySelectorAll('.bproject-header');
        for (var i = 0; i < headers.length; i++) {
            (function(header) {
                header.addEventListener('click', function(e) {
                    e.preventDefault();
                    var targetId = header.getAttribute('data-target');
                    var target = document.getElementById(targetId);
                    if (target) {
                        if (!target.classList.contains('expanded')) {
                            target.classList.add('expanded');
                            var btn = target.querySelector('.bproject-toggle span');
                            if (btn) btn.textContent = TEXTS.basement.collapseLabel;
                        }
                        setTimeout(function() {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                    }
                });
            })(headers[i]);
        }

        var toggles = document.querySelectorAll('.bproject-toggle');
        for (var i = 0; i < toggles.length; i++) {
            (function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var project = btn.closest('.bproject');
                    var isExpanded = project.classList.toggle('expanded');
                    btn.querySelector('span').textContent = isExpanded ? TEXTS.basement.collapseLabel : TEXTS.basement.expandLabel;
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
            if (btn) btn.textContent = TEXTS.basement.collapseLabel;
            setTimeout(function() {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }
}