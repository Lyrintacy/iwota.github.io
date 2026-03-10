/* ═══════ AMENDMENTS LOADER v11 — Clean + newElements support ═══════ */
(function(){
    'use strict';

    var AMENDMENTS_FOLDER = './js/amendments/';
    var DEBUG = true;

    window.LOADED_AMENDMENTS = {
        stickers: {}, textChanges: {}, dividers: {}, links: {}, images: {},
        newElements: {}, projectOrder: null, _loaded: false
    };

    var storedAmendments = null;
    var mergedAmendments = {
        textChanges: {}, stickers: {}, dividers: {}, links: {}, images: {},
        newElements: {}, projectOrder: null
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
    // SCOPED SELECTORS
    // ══════════════════════════════════════════════════════════════

    function getBasementProject(projectId){
        return document.querySelector(
            '#basementProjects [data-project-id="' + projectId + '"],' +
            '.basement-projects [data-project-id="' + projectId + '"],' +
            '#bp-' + projectId
        );
    }

    function getThumbCard(projectId){
        return document.querySelector(
            '#projectGrid [data-project-id="' + projectId + '"],' +
            '.pgrid [data-project-id="' + projectId + '"]'
        );
    }

    // ══════════════════════════════════════════════════════════════
    // LOAD
    // ══════════════════════════════════════════════════════════════

    function loadAllAmendments(){
        var files = [];
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', AMENDMENTS_FOLDER + 'manifest.json', false);
            xhr.send(null);
            if(xhr.status === 200){
                var parsed = JSON.parse(xhr.responseText);
                if(Array.isArray(parsed)) files = parsed.sort();
            } else {
                log('ℹ️ No manifest.json — amendments disabled');
                window.LOADED_AMENDMENTS._loaded = true;
                return;
            }
        } catch(e){
            log('ℹ️ manifest.json error — amendments disabled');
            window.LOADED_AMENDMENTS._loaded = true;
            return;
        }

        if(files.length === 0){
            log('ℹ️ manifest.json empty — no amendments loaded');
            window.LOADED_AMENDMENTS._loaded = true;
            return;
        }

        log('📋 Manifest:', files);

        var loadedCount = 0;
        files.forEach(function(filename){
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', AMENDMENTS_FOLDER + filename, false);
                xhr.send(null);
                if(xhr.status === 200){
                    smartMerge(JSON.parse(xhr.responseText));
                    loadedCount++;
                    log('✅ Loaded:', filename);
                } else {
                    log('⚠️ Not found:', filename);
                }
            } catch(e){ log('❌ Failed:', filename, e.message); }
        });

        if(loadedCount > 0){
            storedAmendments = finalizeAmendments();
            window.LOADED_AMENDMENTS = {
                stickers:     Object.assign({}, mergedAmendments.stickers),
                textChanges:  Object.assign({}, mergedAmendments.textChanges),
                dividers:     Object.assign({}, mergedAmendments.dividers),
                links:        Object.assign({}, mergedAmendments.links),
                images:       Object.assign({}, mergedAmendments.images),
                newElements:  Object.assign({}, mergedAmendments.newElements),
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
            log('➕ New elements:', storedAmendments.newElements.length);

            scheduleVisualChanges(storedAmendments);
        } else {
            window.LOADED_AMENDMENTS._loaded = true;
            log('ℹ️ No amendment files loaded');
        }
    }

    // ══════════════════════════════════════════════════════════════
    // MERGE
    // ══════════════════════════════════════════════════════════════

    function smartMerge(data){
        if(data.textChanges){
            data.textChanges.forEach(function(change){
                var key = (change.projectId || 'static') + '|' + change.selector;
                mergedAmendments.textChanges[key] = change;
            });
        }
        if(data.stickers){
            data.stickers.forEach(function(sticker){
                var key = (sticker.projectId || 'global') + '|' +
                          sticker.position.left + '|' + sticker.position.top;
                mergedAmendments.stickers[key] = sticker;
            });
        }
        if(data.dividers){
            data.dividers.forEach(function(d){
                mergedAmendments.dividers[d.parentSelector] = d;
            });
        }
        if(data.links){
            data.links.forEach(function(l){
                mergedAmendments.links[l.parentSelector + '|' + l.href] = l;
            });
        }
        if(data.images){
            data.images.forEach(function(img){
                mergedAmendments.images[img.selector] = img;
            });
        }
        if(data.newElements){
            data.newElements.forEach(function(el){
                var key = (el.projectId||'static') + '|' + el.container + '|' + el.insertIndex;
                mergedAmendments.newElements[key] = el;
            });
        }
        if(data.projectOrder) mergedAmendments.projectOrder = data.projectOrder;
    }

    function finalizeAmendments(){
        return {
            textChanges:  Object.values(mergedAmendments.textChanges),
            stickers:     Object.values(mergedAmendments.stickers),
            dividers:     Object.values(mergedAmendments.dividers),
            links:        Object.values(mergedAmendments.links),
            images:       Object.values(mergedAmendments.images),
            newElements:  Object.values(mergedAmendments.newElements),
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
    // STAMP — assigns data-ed-idx to all elements
    // ══════════════════════════════════════════════════════════════

    function stampProject(project){
        project.querySelectorAll('.bproject-content,.bproject-header-text,.bproject-meta')
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
                groups[key].forEach(function(el, idx){
                    el.setAttribute('data-ed-idx', idx);
                });
            });
        });
    }

    function stampAllProjects(){
        document.querySelectorAll('.bproject').forEach(function(project){
            stampProject(project);
        });
        log('🏷️ Stamped idx on all projects');
    }

    // ══════════════════════════════════════════════════════════════
    // APPLY
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
        log('🎨 Applying amendments...');
        var applied = 0;

        // Step 1: stamp original DOM
        stampAllProjects();

        // Step 2: insert new elements FIRST (so indices shift correctly)
        if(data.newElements){
            // Sort by insertIndex ascending so earlier inserts don't shift later ones
            var sorted = data.newElements.slice().sort(function(a,b){
                return (a.insertIndex||0) - (b.insertIndex||0);
            });
            sorted.forEach(function(e){ if(applyNewElement(e)) applied++; });
            // Re-stamp after inserting new elements
            stampAllProjects();
        }

        // Step 3: apply text changes (header/meta first, then content)
        if(data.textChanges){
            data.textChanges.forEach(function(c){
                if(c.selector && !c.selector.includes('bproject-content')){
                    if(applyTextChange(c)) applied++;
                }
            });
            data.textChanges.forEach(function(c){
                if(c.selector && c.selector.includes('bproject-content')){
                    if(applyTextChange(c)) applied++;
                }
            });
        }

        // Step 4: stickers, dividers, links, images
        if(data.stickers) data.stickers.forEach(function(s){ if(applySticker(s)) applied++; });
        if(data.dividers) data.dividers.forEach(function(d){ if(applyDivider(d)) applied++; });
        if(data.links)    data.links.forEach(function(l){    if(applyLink(l))    applied++; });
        if(data.images){
            data.images.forEach(function(img){
                try {
                    var el = document.querySelector(img.selector);
                    if(el && el.tagName === 'IMG'){ el.src = img.src; applied++; }
                } catch(e){}
            });
        }

        if(data.projectOrder) reorderDOM(data.projectOrder);
        if(data.textChanges) syncAllThumbnails(data.textChanges);
        setupProjectObserver();
        log('✅ Applied', applied, 'amendments');
    }

    // ══════════════════════════════════════════════════════════════
    // NEW ELEMENT — creates elements that don't exist in original DOM
    // ══════════════════════════════════════════════════════════════

    function applyNewElement(item){
        try {
            var project = getBasementProject(item.projectId);
            if(!project) return false;

            var container = project.querySelector(item.container);
            if(!container) return false;

            // Deduplicate by unique key
            var uniqueKey = item.projectId + '|' + item.container + '|' + item.insertIndex;
            if(container.querySelector('[data-new-key="' + uniqueKey + '"]')) return false;

            // Build element
            var tmp = document.createElement('div');
            tmp.innerHTML = item.html;
            var newEl = tmp.firstChild;
            if(!newEl) return false;

            newEl.dataset.newKey = uniqueKey;
            newEl.dataset.amendmentLoaded = 'true';

            // Insert at position
            var children = Array.from(container.children);
            var insertAfter = children[item.insertIndex - 1]; // insert AFTER this index

            if(item.insertIndex <= 0 || !insertAfter){
                // Insert at beginning
                container.insertBefore(newEl, container.firstChild);
            } else if(insertAfter.nextSibling){
                container.insertBefore(newEl, insertAfter.nextSibling);
            } else {
                container.appendChild(newEl);
            }

            log('  ✓ New element at index', item.insertIndex, 'in:', item.projectId);
            return true;
        } catch(e){
            log('  ❌ newElement error:', e.message);
            return false;
        }
    }

    // ══════════════════════════════════════════════════════════════
    // THUMBNAIL SYNC
    // ══════════════════════════════════════════════════════════════

    function plainText(html){
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        return (tmp.textContent || tmp.innerText || '').trim();
    }

    function syncAllThumbnails(textChanges){
        textChanges.forEach(function(change){
            if(!change.projectId) return;
            syncOneChange(change);
        });
    }

    function syncOneChange(change){
        var projectId = change.projectId;
        var sel = change.selector;
        var text = plainText(change.content);
        var thumb = getThumbCard(projectId);
        if(!thumb) return;

        if(sel.includes('bproject-header-text') && sel.match(/h[1-6]/i)){
            var h3 = thumb.querySelector('h3');
            if(h3) h3.textContent = text;
            var img = thumb.querySelector('.pcard-thumb-img');
            if(img) img.alt = text;
            updateProjectsArray(projectId, 'title', text);
            log('  🔄 Thumb title:', projectId, text);
            return;
        }

        if(sel.includes('bproject-tagline')){
            var shortEl = thumb.querySelector('.pcard-short');
            if(shortEl) shortEl.textContent = text;
            updateProjectsArray(projectId, 'tagline', text);
            updateProjectsArray(projectId, 'short', text);
            log('  🔄 Thumb tagline:', projectId, text);
            return;
        }

        if(sel.includes('bm-value')){
            var basement = getBasementProject(projectId);
            if(!basement) return;
            var allLabels = Array.from(basement.querySelectorAll('.bm-label'));
            var allValues = Array.from(basement.querySelectorAll('.bm-value'));
            var labelText = '';

            for(var i = 0; i < allValues.length; i++){
                if(plainText(allValues[i].innerHTML) === text){
                    labelText = allLabels[i] ? allLabels[i].textContent.toLowerCase().trim() : '';
                    break;
                }
            }

            if(!labelText){
                var idxMatch = sel.match(/data-ed-idx="(\d+)"/);
                if(idxMatch){
                    var idx = parseInt(idxMatch[1]);
                    labelText = allLabels[idx] ? allLabels[idx].textContent.toLowerCase().trim() : '';
                }
            }

            if(!labelText) return;
            var pmValues = Array.from(thumb.querySelectorAll('.pm-value'));

            if(labelText.includes('role')){
                if(pmValues[0]) pmValues[0].textContent = text;
                updateProjectsArray(projectId, 'role', text);
            } else if(labelText.includes('team')){
                if(pmValues[1]) pmValues[1].textContent = text;
                updateProjectsArray(projectId, 'team', text);
            } else if(labelText.includes('engine')){
                if(pmValues[2]){
                    var eIcon = pmValues[2].querySelector('.engine-icon');
                    if(eIcon) eIcon.textContent = text;
                    else pmValues[2].textContent = text;
                }
                updateProjectsArray(projectId, 'engine', text);
            } else if(labelText.includes('time')){
                if(pmValues[3]) pmValues[3].textContent = text;
                updateProjectsArray(projectId, 'timeframe', text);
            }
            log('  🔄 Thumb meta synced:', labelText, projectId);
        }
    }

    function updateProjectsArray(projectId, field, value){
        if(typeof PROJECTS === 'undefined') return;
        for(var i = 0; i < PROJECTS.length; i++){
            if(PROJECTS[i].id === projectId){ PROJECTS[i][field] = value; break; }
        }
    }

    // ══════════════════════════════════════════════════════════════
    // ELEMENT FINDER
    // ══════════════════════════════════════════════════════════════

    function findElement(change){
        // Always scope to basement project first
        if(change.projectId){
            var basement = getBasementProject(change.projectId);
            if(basement && change.selector){
                var stripped = change.selector.replace(/\[data-project-id="[^"]+"\]\s*/, '');
                try {
                    var el = basement.querySelector(stripped);
                    if(el) return el;
                } catch(e){}
            }
        }
        // Global fallback
        if(change.selector){
            try {
                var el = document.querySelector(change.selector);
                if(el) return el;
            } catch(e){}
        }
        if(change.selector && change.selector.includes('data-ed-idx')) return findByIndex(change);
        if(change.selector && change.selector.includes('nth-of-type')) return findByNthFallback(change);
        if(change.projectId && change.classes) return findByProjectAndClass(change);
        return null;
    }

    function findByIndex(change){
    var idxMatch = change.selector.match(/data-ed-idx="(\d+)"/);
    if(!idxMatch) return null;
    var idx = parseInt(idxMatch[1]);

    var project = getBasementProject(change.projectId);
    if(!project) return null;

    // Extract element selector without the [data-ed-idx] part
    var elMatch = change.selector.match(/\]\s*\.[\w-]+\s+([\w.]+)\[data-ed-idx/);
    if(!elMatch) return null;
    var elSelector = elMatch[1]; // e.g. "p.bp-text"

    var containerMatch = change.selector.match(/\]\s*\.([\w-]+)\s+/);
    if(!containerMatch) return null;
    var containerClass = containerMatch[1]; // e.g. "bproject-content"

    var container = project.querySelector('.' + containerClass);
    if(!container) return null;

    // Try with data-ed-idx attribute first
    var byAttr = container.querySelector(elSelector + '[data-ed-idx="' + idx + '"]');
    if(byAttr) return byAttr;

    // Fallback: get by position among matching elements
    log('  ⚠️ data-ed-idx not stamped yet, falling back to index position');
    var candidates = Array.from(container.querySelectorAll(elSelector));
    return candidates[idx] || null;
}

    function findByNthFallback(change){
        var project = getBasementProject(change.projectId);
        if(!project) return null;
        var nthMatch = change.selector.match(/:nth-of-type\((\d+)\)/);
        var idx = nthMatch ? parseInt(nthMatch[1]) - 1 : 0;
        var tagClassMatch = change.selector.match(/(\w+)\.([\w-]+):nth-of-type/);
        if(!tagClassMatch) return null;
        var content = project.querySelector('.bproject-content');
        if(!content) return null;
        var candidates = Array.from(content.querySelectorAll(tagClassMatch[1] + '.' + tagClassMatch[2]));
        return candidates[idx] || candidates[0] || null;
    }

    function findByProjectAndClass(change){
        var project = getBasementProject(change.projectId);
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
                log('  ✓ Text:', change.projectId, change.selector.substring(0,50));
                return true;
            }
            log('  ⚠️ Not found:', change.selector ? change.selector.substring(0,60) : '?');
            return false;
        } catch(e){ log('  ❌', e.message); return false; }
    }

    function applySticker(sticker){
        try {
            var project = getBasementProject(sticker.projectId);
            if(!project){ log('  ❌ Project not found:', sticker.projectId); return false; }
            project.style.position = 'relative';
            var layer = project.querySelector('.bproject-stickers');
            if(!layer){
                layer = document.createElement('div');
                layer.className = 'bproject-stickers';
                project.appendChild(layer);
            }
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
                'z-index:' + (sticker.zIndex  || 10) + ';' +
                'opacity:' + (sticker.opacity || 1)  + ';' +
                'transform:rotate(' + (sticker.rotation || 0) + 'deg);' +
                'pointer-events:none;';
            var img = document.createElement('img');
            img.src = sticker.src;
            img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
            img.onerror = function(){ log('  ❌ Sticker img failed'); };
            div.appendChild(img);
            layer.appendChild(div);
            log('  ✓ Sticker:', sticker.projectId);
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
            a.href = link.href;
            a.textContent = link.text;
            a.className = link.className || 'btn';
            a.target = link.target || '_blank';
            wrapper.appendChild(a);
            parent.appendChild(wrapper);
            return true;
        } catch(e){ return false; }
    }

    function reorderDOM(order){
        var container = document.querySelector('.basement-projects, #basementProjects');
        if(container){
            order.forEach(function(id){
                var el = container.querySelector('[data-project-id="' + id + '"], #bp-' + id);
                if(el) container.appendChild(el);
            });
        }
        var grid = document.querySelector('.pgrid, #projectGrid');
        if(grid){
            order.forEach(function(id){
                var el = grid.querySelector('[data-project-id="' + id + '"]');
                if(el) grid.appendChild(el);
            });
        }
    }

    // ══════════════════════════════════════════════════════════════
    // PROJECT OBSERVER
    // ══════════════════════════════════════════════════════════════

    function setupProjectObserver(){
        if(!storedAmendments) return;
        var observer = new MutationObserver(function(mutations){
            mutations.forEach(function(m){
                var t = m.target;
                if(t.classList.contains('bproject') && t.classList.contains('expanded')){
                    var projectId = t.dataset.projectId ||
                        (t.id && t.id.startsWith('bp-') ? t.id.replace('bp-', '') : null);
                    if(projectId) setTimeout(function(){ reapplyForProject(projectId); }, 200);
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

        var project = getBasementProject(projectId);
        if(project) stampProject(project);

        var applied = 0;

        // New elements first
        if(storedAmendments.newElements){
            var sorted = storedAmendments.newElements
                .filter(function(e){ return e.projectId === projectId; })
                .sort(function(a,b){ return (a.insertIndex||0) - (b.insertIndex||0); });
            sorted.forEach(function(e){ if(applyNewElement(e)) applied++; });
            if(project) stampProject(project);
        }

        storedAmendments.textChanges.forEach(function(c){
            if(c.projectId === projectId && applyTextChange(c)) applied++;
        });
        storedAmendments.stickers.forEach(function(s){
            if(s.projectId === projectId && applySticker(s)) applied++;
        });
        storedAmendments.dividers.forEach(function(d){
            if(d.parentSelector && d.parentSelector.includes(projectId) && applyDivider(d)) applied++;
        });
        storedAmendments.links.forEach(function(l){
            if(l.parentSelector && l.parentSelector.includes(projectId) && applyLink(l)) applied++;
        });

        if(storedAmendments.textChanges){
            syncAllThumbnails(
                storedAmendments.textChanges.filter(function(c){ return c.projectId === projectId; })
            );
        }

        log('  Applied', applied, 'items for', projectId);
    }

    loadAllAmendments();

})();