/* ═══════ AMENDMENTS LOADER v7 — Auto-scan + Smart Merge ═══════ */
(function(){
    'use strict';

    var AMENDMENTS_FOLDER = './js/amendments/';
    var DEBUG = true;

    window.LOADED_AMENDMENTS = {
        stickers: {}, textChanges: {}, dividers: {}, links: {}, images: {},
        projectOrder: null, _loaded: false
    };

    var storedAmendments = null;
    var mergedAmendments = {
        textChanges: {}, stickers: {}, dividers: {}, links: {}, images: {},
        projectOrder: null
    };

    var style = document.createElement('style');
    style.textContent =
        '.bproject-stickers{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none!important;overflow:visible;z-index:50}' +
        '.amendment-sticker,.amendment-sticker *{pointer-events:none!important}' +
        '.fancy{font-family:var(--font-display),cursive}' +
        '.amendment-divider{pointer-events:none}';
    document.head.appendChild(style);

    function log(){ if(DEBUG) console.log.apply(console, arguments); }

    // ══════════════════════════════════════════════════════════════
    // SCAN FOR ALL AMENDMENT FILES
    // ══════════════════════════════════════════════════════════════

    function discoverFiles(){
        var found = [];

        // Always try base file first
        var baseNames = [
            'amendments.json'
        ];

        // Generate numbered files: amendments-001.json to amendments-099.json
        for(var n = 1; n <= 99; n++){
            var padded = n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n;
            baseNames.push('amendments-' + padded + '.json');
        }

        // Generate timestamp files for years 2024-2030, all months/days
        // Pattern: amendments-YYYYMMDD-HHMM.json
        // We probe a broad range by trying known-possible timestamps
        // Instead of brute-forcing dates, we use a smarter approach:
        // Try fetching a directory listing via XHR (works on some servers)
        var directoryFiles = tryDirectoryListing();
        if(directoryFiles.length > 0){
            log('📂 Directory listing found:', directoryFiles.length, 'files');
            return sortFiles(directoryFiles);
        }

        // Fallback: probe hardcoded patterns
        baseNames.forEach(function(filename){
            if(fileExists(filename)) found.push(filename);
        });

        // Also probe timestamp pattern files we might know about
        // by trying a range of recent dates
        var timestampFiles = probeTimestampFiles();
        timestampFiles.forEach(function(f){ found.push(f); });

        return sortFiles(found);
    }

    function tryDirectoryListing(){
        // Some servers return directory listings as HTML/JSON
        // Try to parse filenames from a directory GET request
        var found = [];
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', AMENDMENTS_FOLDER, false);
            xhr.send(null);

            if(xhr.status === 200){
                var text = xhr.responseText;
                // Match any amendments*.json filenames in the response
                var regex = /amendments[^"'<>\s]*\.json/g;
                var matches = text.match(regex);
                if(matches){
                    // Deduplicate
                    var seen = {};
                    matches.forEach(function(m){
                        if(!seen[m]){ seen[m] = true; found.push(m); }
                    });
                }
            }
        } catch(e){}
        return found;
    }

    function probeTimestampFiles(){
        // Probe timestamp-format files: amendments-YYYYMMDD-HHMM.json
        // We try dates from 2024-01-01 to 2 years from now
        var found = [];
        var now = new Date();
        var startYear = 2024;
        var endYear = now.getFullYear() + 1;

        for(var year = startYear; year <= endYear; year++){
            for(var month = 1; month <= 12; month++){
                for(var day = 1; day <= 31; day++){
                    var mm = month < 10 ? '0' + month : '' + month;
                    var dd = day < 10 ? '0' + day : '' + day;
                    var datePrefix = 'amendments-' + year + mm + dd + '-';

                    // For each day, probe hours 00-23
                    for(var hour = 0; hour <= 23; hour++){
                        // Only probe round hours + half hours to keep requests manageable
                        var probeMinutes = [0, 30];
                        probeMinutes.forEach(function(min){
                            var hh = hour < 10 ? '0' + hour : '' + hour;
                            var mn = min < 10 ? '0' + min : '' + min;
                            var filename = datePrefix + hh + mn + '.json';
                            if(fileExists(filename)) found.push(filename);
                        });
                    }
                }
            }
        }
        return found;
    }

    function fileExists(filename){
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', AMENDMENTS_FOLDER + filename, false);
            xhr.send(null);
            return xhr.status === 200;
        } catch(e){ return false; }
    }

    function sortFiles(files){
        // Sort alphabetically — this means:
        // amendments.json < amendments-001.json < amendments-20260101-0000.json
        // Newer timestamps naturally sort later = higher priority
        return files.sort();
    }

    // ══════════════════════════════════════════════════════════════
    // LOAD + MERGE ALL FOUND FILES
    // ══════════════════════════════════════════════════════════════

    function loadAllAmendments(){
        log('🔍 Scanning for amendment files...');
        var files = discoverFiles();
        log('📁 Found', files.length, 'file(s):', files);

        var loadedCount = 0;
        files.forEach(function(filename){
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', AMENDMENTS_FOLDER + filename, false);
                xhr.send(null);
                if(xhr.status === 200){
                    var data = JSON.parse(xhr.responseText);
                    smartMerge(data);
                    loadedCount++;
                    log('✅ Loaded:', filename);
                }
            } catch(e){ log('❌ Failed to parse:', filename, e.message); }
        });

        if(loadedCount > 0){
            storedAmendments = finalizeAmendments();

            window.LOADED_AMENDMENTS = {
                stickers:     Object.assign({}, mergedAmendments.stickers),
                textChanges:  Object.assign({}, mergedAmendments.textChanges),
                dividers:     Object.assign({}, mergedAmendments.dividers),
                links:        Object.assign({}, mergedAmendments.links),
                images:       Object.assign({}, mergedAmendments.images),
                projectOrder: mergedAmendments.projectOrder,
                _loaded:      true
            };

            if(storedAmendments.projectOrder && typeof PROJECTS !== 'undefined'){
                reorderArray(PROJECTS, storedAmendments.projectOrder);
                log('📋 Reordered PROJECTS array');
            }

            log('📦 Merged', loadedCount, 'file(s)');
            log('📝 Text changes:', storedAmendments.textChanges.length);
            log('🎨 Stickers:', storedAmendments.stickers.length);

            scheduleVisualChanges(storedAmendments);
        } else {
            window.LOADED_AMENDMENTS._loaded = true;
            log('ℹ️ No amendment files found');
        }
    }

    // ══════════════════════════════════════════════════════════════
    // SMART MERGE — later files overwrite earlier ones by key
    // ══════════════════════════════════════════════════════════════

    function smartMerge(data){
        // Text changes — key by projectId + selector
        // Later file with same key overwrites earlier
        if(data.textChanges){
            data.textChanges.forEach(function(change){
                var key = (change.projectId || 'static') + '|' + change.selector;
                mergedAmendments.textChanges[key] = change;
            });
        }

        // Stickers — key by projectId + position
        if(data.stickers){
            data.stickers.forEach(function(sticker){
                var key = (sticker.projectId || 'global') + '|' +
                          sticker.position.left + '|' + sticker.position.top;
                mergedAmendments.stickers[key] = sticker;
            });
        }

        // Dividers — key by parentSelector
        if(data.dividers){
            data.dividers.forEach(function(d){
                mergedAmendments.dividers[d.parentSelector] = d;
            });
        }

        // Links — key by parentSelector + href
        if(data.links){
            data.links.forEach(function(l){
                mergedAmendments.links[l.parentSelector + '|' + l.href] = l;
            });
        }

        // Images — key by selector
        if(data.images){
            data.images.forEach(function(img){
                mergedAmendments.images[img.selector] = img;
            });
        }

        // Project order — last file wins
        if(data.projectOrder) mergedAmendments.projectOrder = data.projectOrder;
    }

    function finalizeAmendments(){
        return {
            textChanges:  Object.values(mergedAmendments.textChanges),
            stickers:     Object.values(mergedAmendments.stickers),
            dividers:     Object.values(mergedAmendments.dividers),
            links:        Object.values(mergedAmendments.links),
            images:       Object.values(mergedAmendments.images),
            projectOrder: mergedAmendments.projectOrder
        };
    }

    function reorderArray(arr, orderIds){
        var orderMap = {};
        orderIds.forEach(function(id, i){ orderMap[id] = i; });
        arr.sort(function(a, b){
            return (orderMap[a.id] !== undefined ? orderMap[a.id] : 999) -
                   (orderMap[b.id] !== undefined ? orderMap[b.id] : 999);
        });
    }

    // ══════════════════════════════════════════════════════════════
    // APPLY TO DOM
    // ══════════════════════════════════════════════════════════════

    function scheduleVisualChanges(data){
        if(document.readyState === 'loading'){
            document.addEventListener('DOMContentLoaded', function(){
                setTimeout(function(){ applyAll(data); }, 500);
            });
        } else {
            setTimeout(function(){ applyAll(data); }, 500);
        }
    }

    function applyAll(data){
        log('🎨 Applying amendments to DOM...');
        var applied = 0;

        if(data.textChanges) data.textChanges.forEach(function(c){ if(applyTextChange(c)) applied++; });
        if(data.stickers)    data.stickers.forEach(function(s){    if(applySticker(s))    applied++; });
        if(data.dividers)    data.dividers.forEach(function(d){    if(applyDivider(d))    applied++; });
        if(data.links)       data.links.forEach(function(l){       if(applyLink(l))       applied++; });
        if(data.images){
            data.images.forEach(function(img){
                try {
                    var el = document.querySelector(img.selector);
                    if(el && el.tagName === 'IMG'){ el.src = img.src; applied++; }
                } catch(e){}
            });
        }

        if(data.projectOrder) reorderDOM(data.projectOrder);
        setupProjectObserver();
        log('✅ Applied', applied, 'amendments');
    }

    // ══════════════════════════════════════════════════════════════
    // FIND ELEMENT — 4-strategy fallback
    // ══════════════════════════════════════════════════════════════

    function findElement(change){
        // Strategy 1: direct querySelector (new data-ed-idx format)
        if(change.selector){
            try {
                var el = document.querySelector(change.selector);
                if(el) return el;
            } catch(e){}
        }

        // Strategy 2: data-ed-idx based search
        if(change.selector && change.selector.includes('data-ed-idx')){
            return findByIndex(change);
        }

        // Strategy 3: old nth-of-type fallback
        if(change.selector && change.selector.includes('nth-of-type')){
            return findByNthFallback(change);
        }

        // Strategy 4: project + class only
        if(change.projectId && change.classes){
            return findByProjectAndClass(change);
        }

        return null;
    }

    function findByIndex(change){
        var idxMatch = change.selector.match(/data-ed-idx="(\d+)"/);
        if(!idxMatch) return null;
        var idx = parseInt(idxMatch[1]);

        var project = document.querySelector('[data-project-id="' + change.projectId + '"]');
        if(!project) return null;

        // Extract element selector (tag.class)
        var elMatch = change.selector.match(/\]\s*\.[\w-]+\s+([\w.]+)\[data-ed-idx/);
        if(!elMatch) return null;
        var elSelector = elMatch[1];

        // Extract container class
        var containerMatch = change.selector.match(/\]\s*\.([\w-]+)\s+/);
        if(!containerMatch) return null;
        var containerClass = containerMatch[1];

        var container = project.querySelector('.' + containerClass);
        if(!container) return null;

        var candidates = Array.from(container.querySelectorAll(elSelector));
        return candidates[idx] || null;
    }

    function findByNthFallback(change){
        var project = document.querySelector('[data-project-id="' + change.projectId + '"]');
        if(!project) return null;

        var nthMatch = change.selector.match(/:nth-of-type\((\d+)\)/);
        var idx = nthMatch ? parseInt(nthMatch[1]) - 1 : 0;

        var tagClassMatch = change.selector.match(/(\w+)\.([\w-]+):nth-of-type/);
        if(!tagClassMatch) return null;

        var tag = tagClassMatch[1];
        var cls = tagClassMatch[2];
        var content = project.querySelector('.bproject-content');
        if(!content) return null;

        var candidates = Array.from(content.querySelectorAll(tag + '.' + cls));
        log('  📍 nth fallback:', tag + '.' + cls, 'found', candidates.length, 'want index', idx);
        return candidates[idx] || candidates[0] || null;
    }

    function findByProjectAndClass(change){
        var project = document.querySelector('[data-project-id="' + change.projectId + '"]');
        if(!project) return null;
        var mainClass = change.classes.split(' ').find(function(c){ return c && !c.startsWith('ed-'); });
        if(!mainClass) return null;
        return project.querySelector('.' + mainClass) || null;
    }

    // ══════════════════════════════════════════════════════════════
    // APPLY FUNCTIONS
    // ══════════════════════════════════════════════════════════════

    function applyTextChange(change){
        try {
            var el = findElement(change);
            if(el){
                el.innerHTML = change.content;
                if(change.styles) el.style.cssText = change.styles;
                if(change.classes){
                    change.classes.split(' ').forEach(function(c){
                        if(c && !c.startsWith('ed-') && c !== 'expanded') el.classList.add(c);
                    });
                }
                log('  ✓ Text applied:', change.projectId);
                return true;
            } else {
                log('  ⚠️ Not found:', change.selector ? change.selector.substring(0,60) : change.projectId);
                return false;
            }
        } catch(e){ log('  ❌ Error:', e.message); return false; }
    }

    function applySticker(sticker){
        try {
            var project = document.querySelector('[data-project-id="' + sticker.projectId + '"]');
            if(!project){
                log('  ❌ Sticker: project not found:', sticker.projectId);
                return false;
            }

            project.style.position = 'relative';

            var layer = project.querySelector('.bproject-stickers');
            if(!layer){
                layer = document.createElement('div');
                layer.className = 'bproject-stickers';
                project.insertBefore(layer, project.firstChild);
            }

            // Deduplicate by position
            var existing = layer.querySelectorAll('.amendment-sticker');
            for(var i = 0; i < existing.length; i++){
                if(existing[i].style.left === sticker.position.left &&
                   existing[i].style.top  === sticker.position.top) return false;
            }

            var div = document.createElement('div');
            div.className = 'ed-sticker amendment-sticker';
            div.dataset.amendmentLoaded = 'true';
            div.dataset.projectId = sticker.projectId;
            div.style.cssText =
                'position:absolute;' +
                'left:'    + sticker.position.left + ';' +
                'top:'     + sticker.position.top  + ';' +
                'width:'   + sticker.size.width    + ';' +
                'height:'  + sticker.size.height   + ';' +
                'z-index:' + (sticker.zIndex  || 10)  + ';' +
                'opacity:' + (sticker.opacity || 1)   + ';' +
                'transform:rotate(' + (sticker.rotation || 0) + 'deg);' +
                'pointer-events:none;';

            var img = document.createElement('img');
            img.src = sticker.src;
            img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
            img.onerror = function(){ log('  ❌ Sticker image failed:', sticker.src.substring(0,50)); };

            div.appendChild(img);
            layer.appendChild(div);
            log('  ✓ Sticker applied to:', sticker.projectId);
            return true;
        } catch(e){ log('  ❌ Sticker error:', e.message); return false; }
    }

    function applyDivider(divider){
        try {
            var parent = document.querySelector(divider.parentSelector);
            if(!parent) return false;
            if(parent.querySelector('.amendment-divider')) return false;
            var div = document.createElement('div');
            div.className = 'ed-divider amendment-divider';
            div.dataset.amendmentLoaded = 'true';
            div.style.cssText = divider.styles;
            parent.appendChild(div);
            return true;
        } catch(e){ return false; }
    }

    function applyLink(link){
        try {
            var parent = document.querySelector(link.parentSelector);
            if(!parent) return false;
            if(parent.querySelector('.amendment-link a[href="' + link.href + '"]')) return false;
            var wrapper = document.createElement('div');
            wrapper.className = 'ed-link-block amendment-link';
            wrapper.dataset.amendmentLoaded = 'true';
            wrapper.style.margin = '16px 0';
            var a = document.createElement('a');
            a.href = link.href; a.textContent = link.text;
            a.className = link.className || 'btn'; a.target = link.target || '_blank';
            wrapper.appendChild(a); parent.appendChild(wrapper);
            return true;
        } catch(e){ return false; }
    }

    function reorderDOM(order){
        var container = document.querySelector('.basement-projects, #basementProjects');
        if(container){
            order.forEach(function(id){
                var el = container.querySelector('[data-project-id="' + id + '"]');
                if(el) container.appendChild(el);
            });
        }
        var grid = document.querySelector('.pgrid, #projectGrid');
        if(grid){
            order.forEach(function(id){
                var el = grid.querySelector('[data-project-id="' + id + '"], [data-target="' + id + '"]');
                if(el) grid.appendChild(el);
            });
        }
    }

    // ══════════════════════════════════════════════════════════════
    // PROJECT EXPAND OBSERVER
    // ══════════════════════════════════════════════════════════════

    function setupProjectObserver(){
        if(!storedAmendments) return;
        var observer = new MutationObserver(function(mutations){
            mutations.forEach(function(m){
                var target = m.target;
                if(target.classList.contains('bproject') && target.classList.contains('expanded')){
                    setTimeout(function(){ reapplyForProject(target.dataset.projectId); }, 200);
                }
            });
        });
        document.querySelectorAll('.bproject').forEach(function(p){
            observer.observe(p, { attributes: true, attributeFilter: ['class'] });
        });
        log('👁️ Watching for project expansions');
    }

    function reapplyForProject(projectId){
        if(!storedAmendments || !projectId) return;
        log('📌 Re-applying for:', projectId);

        // Stamp idx attributes on freshly rendered content
        var project = document.querySelector('[data-project-id="' + projectId + '"]');
        if(project){
            project.querySelectorAll('.bproject-content, .bproject-header-text, .bproject-meta')
            .forEach(function(container){
                var groups = {};
                Array.from(container.children).forEach(function(child){
                    var tag = child.tagName.toLowerCase();
                    var mainClass = '';
                    for(var i = 0; i < child.classList.length; i++){
                        var c = child.classList[i];
                        if(!c.startsWith('ed-') && c !== 'expanded'){ mainClass = c; break; }
                    }
                    var key = mainClass ? tag + '.' + mainClass : tag;
                    if(!groups[key]) groups[key] = [];
                    groups[key].push(child);
                });
                Object.keys(groups).forEach(function(key){
                    groups[key].forEach(function(el, idx){ el.setAttribute('data-ed-idx', idx); });
                });
            });
        }

        var applied = 0;
        storedAmendments.textChanges.forEach(function(c){ if(c.projectId === projectId && applyTextChange(c)) applied++; });
        storedAmendments.stickers.forEach(function(s){    if(s.projectId === projectId && applySticker(s))    applied++; });
        storedAmendments.dividers.forEach(function(d){    if(d.parentSelector && d.parentSelector.includes(projectId) && applyDivider(d)) applied++; });
        storedAmendments.links.forEach(function(l){       if(l.parentSelector && l.parentSelector.includes(projectId) && applyLink(l))    applied++; });

        log('  Applied', applied, 'items for', projectId);
    }

    // ── RUN ──
    loadAllAmendments();

})();