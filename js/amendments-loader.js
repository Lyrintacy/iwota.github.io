/* ═══════ AMENDMENTS LOADER v12 — ProjectOverrides + Stickers ═══════ */
(function(){
    'use strict';

    var AMENDMENTS_FOLDER = './js/amendments/';
    var DEBUG = true;

    window.LOADED_AMENDMENTS = {
        projectOverrides: {},
        stickers: {},
        projectOrder: null,
        _loaded: false
    };

    var storedAmendments = null;
    var mergedAmendments = {
        projectOverrides: {},
        stickers: {},
        projectOrder: null
    };

    // Sticker styles injected early
    var style = document.createElement('style');
    style.textContent =
        '.bproject-stickers{position:absolute;top:0;left:0;width:100%;height:100%;' +
        'pointer-events:none!important;overflow:visible;z-index:50}' +
        '.amendment-sticker,.amendment-sticker *{pointer-events:none!important}' +
        '.fancy{font-family:var(--font-display),cursive}';
    document.head.appendChild(style);

    function log(){ if(DEBUG) console.log.apply(console, arguments); }

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
            log('ℹ️ manifest.json empty — no amendments');
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
                projectOverrides: Object.assign({}, mergedAmendments.projectOverrides),
                stickers:         Object.assign({}, mergedAmendments.stickers),
                projectOrder:     mergedAmendments.projectOrder,
                _loaded:          true
            };

            // ── Patch PROJECTS array BEFORE app.js builds DOM ──
            applyProjectOverrides();

            if(storedAmendments.projectOrder && typeof PROJECTS !== 'undefined'){
                reorderArray(PROJECTS, storedAmendments.projectOrder);
                log('📋 Reordered PROJECTS array');
            }

            log('📦 Merged', loadedCount, 'file(s)');
            log('🗂️ Project overrides:', Object.keys(mergedAmendments.projectOverrides).length);
            log('🎨 Stickers:', Object.keys(mergedAmendments.stickers).length);

            // Stickers applied after DOM is built
            scheduleStickers(storedAmendments.stickers);
        } else {
            window.LOADED_AMENDMENTS._loaded = true;
            log('ℹ️ No amendment files loaded');
        }
    }

    // ══════════════════════════════════════════════════════════════
    // MERGE — later files overwrite earlier by key
    // ══════════════════════════════════════════════════════════════

    function smartMerge(data){
        // Project overrides — keyed by project id
        if(data.projectOverrides){
            data.projectOverrides.forEach(function(override){
                var existing = mergedAmendments.projectOverrides[override.id];
                if(existing){
                    // Merge: newer file wins per field
                    Object.assign(existing, override);
                } else {
                    mergedAmendments.projectOverrides[override.id] = Object.assign({}, override);
                }
            });
        }

        // Stickers — keyed by projectId + position
        if(data.stickers){
            data.stickers.forEach(function(s){
                var key = (s.projectId||'global') + '|' + s.position.left + '|' + s.position.top;
                mergedAmendments.stickers[key] = s;
            });
        }

        if(data.projectOrder) mergedAmendments.projectOrder = data.projectOrder;
    }

    function finalizeAmendments(){
        return {
            projectOverrides: Object.values(mergedAmendments.projectOverrides),
            stickers:         Object.values(mergedAmendments.stickers),
            projectOrder:     mergedAmendments.projectOrder
        };
    }

    // ══════════════════════════════════════════════════════════════
    // PATCH PROJECTS ARRAY — runs before app.js builds DOM
    // ══════════════════════════════════════════════════════════════

    function applyProjectOverrides(){
        if(typeof PROJECTS === 'undefined') return;
        var overrides = mergedAmendments.projectOverrides;

        Object.keys(overrides).forEach(function(id){
            var override = overrides[id];
            var found = false;

            for(var i = 0; i < PROJECTS.length; i++){
                if(PROJECTS[i].id === id){
                    // Merge override into existing project
                    // content array replaces entirely if present
                    Object.assign(PROJECTS[i], override);
                    found = true;
                    log('  ✓ Patched project:', id);
                    break;
                }
            }

            if(!found){
                // New project not in projects.js — add it
                PROJECTS.push(override);
                log('  ✓ Added new project:', id);
            }
        });
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
    // STICKERS — applied after DOM is ready
    // ══════════════════════════════════════════════════════════════

    function scheduleStickers(stickers){
        if(!stickers || stickers.length === 0) return;
        if(document.readyState === 'loading'){
            document.addEventListener('DOMContentLoaded', function(){
                setTimeout(function(){ applyAllStickers(stickers); }, 600);
            });
        } else {
            setTimeout(function(){ applyAllStickers(stickers); }, 600);
        }
    }

    function applyAllStickers(stickers){
        log('🎨 Applying stickers...');
        var applied = 0;
        stickers.forEach(function(s){ if(applySticker(s)) applied++; });
        setupStickerObserver(stickers);
        log('✅ Applied', applied, 'stickers');
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

            // Deduplicate
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
                'left:'     + sticker.position.left + ';' +
                'top:'      + sticker.position.top  + ';' +
                'width:'    + sticker.size.width    + ';' +
                'height:'   + sticker.size.height   + ';' +
                'z-index:'  + (sticker.zIndex  || 10) + ';' +
                'opacity:'  + (sticker.opacity || 1)  + ';' +
                'transform:rotate(' + (sticker.rotation || 0) + 'deg);' +
                'pointer-events:none;';

            var img = document.createElement('img');
            img.src = sticker.src;
            img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
            img.onerror = function(){ log('  ❌ Sticker image failed'); };
            div.appendChild(img);
            layer.appendChild(div);
            log('  ✓ Sticker:', sticker.projectId);
            return true;
        } catch(e){ log('  ❌ Sticker error:', e.message); return false; }
    }

    function setupStickerObserver(stickers){
        var observer = new MutationObserver(function(mutations){
            mutations.forEach(function(m){
                var t = m.target;
                if(t.classList.contains('bproject') && t.classList.contains('expanded')){
                    var projectId = t.dataset.projectId ||
                        (t.id && t.id.startsWith('bp-') ? t.id.replace('bp-','') : null);
                    if(!projectId) return;
                    setTimeout(function(){
                        stickers.forEach(function(s){
                            if(s.projectId === projectId) applySticker(s);
                        });
                    }, 200);
                }
            });
        });
        document.querySelectorAll('.bproject').forEach(function(p){
            observer.observe(p, {attributes:true, attributeFilter:['class']});
        });
        log('👁️ Watching for project expansions');
    }

    loadAllAmendments();
})();