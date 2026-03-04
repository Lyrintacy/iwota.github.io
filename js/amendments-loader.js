/* ═══════ AMENDMENTS LOADER v5 — Better Selectors + Debug ═══════ */
(function(){
    'use strict';
    
    var AMENDMENTS_FOLDER = './js/amendments/';
    var AMENDMENTS_FILES = [
        'amendments.json',
        'amendments-001.json',
        'amendments-002.json',
        'amendments-003.json',
        'amendments-004.json',
        'amendments-005.json'
    ];
    
    var DEBUG = true; // Set to false to hide console logs
    
    window.LOADED_AMENDMENTS = {
        stickers: {},
        textChanges: {},
        dividers: {},
        links: {},
        images: {},
        projectOrder: null,
        _loaded: false
    };
    
    var storedAmendments = null;
    var mergedAmendments = {
        textChanges: {},
        stickers: {},
        dividers: {},
        links: {},
        images: {},
        projectOrder: null
    };
    
    // Inject styles
    var style = document.createElement('style');
    style.textContent = 
        '.bproject-stickers{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none!important;overflow:visible;z-index:50}' +
        '.amendment-sticker,.amendment-sticker *{pointer-events:none!important}' +
        '.fancy{font-family:var(--font-display),cursive}' +
        '.amendment-divider{pointer-events:none}';
    document.head.appendChild(style);
    
    function log(){
        if(DEBUG) console.log.apply(console, arguments);
    }
    
    // ══════════════════════════════════════════════════════════════
    // LOAD ALL AMENDMENTS
    // ══════════════════════════════════════════════════════════════
    
    function loadAllAmendments(){
        var loadedCount = 0;
        
        AMENDMENTS_FILES.forEach(function(filename){
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', AMENDMENTS_FOLDER + filename, false);
                xhr.send(null);
                
                if(xhr.status === 200){
                    var data = JSON.parse(xhr.responseText);
                    smartMerge(data, filename);
                    loadedCount++;
                    log('✅ Loaded:', filename);
                }
            } catch(e){}
        });
        
        if(loadedCount > 0){
            storedAmendments = finalizeAmendments();
            
            window.LOADED_AMENDMENTS = {
                stickers: Object.assign({}, mergedAmendments.stickers),
                textChanges: Object.assign({}, mergedAmendments.textChanges),
                dividers: Object.assign({}, mergedAmendments.dividers),
                links: Object.assign({}, mergedAmendments.links),
                images: Object.assign({}, mergedAmendments.images),
                projectOrder: mergedAmendments.projectOrder,
                _loaded: true
            };
            
            // Reorder PROJECTS array
            if(storedAmendments.projectOrder && typeof PROJECTS !== 'undefined'){
                reorderArray(PROJECTS, storedAmendments.projectOrder);
                log('📋 Reordered PROJECTS array');
            }
            
            log('📦 Merged', loadedCount, 'amendment file(s)');
            log('📝 Text changes:', storedAmendments.textChanges.length);
            log('🎨 Stickers:', storedAmendments.stickers.length);
            
            // Schedule DOM changes
            scheduleVisualChanges(storedAmendments);
        } else {
            window.LOADED_AMENDMENTS._loaded = true;
            log('ℹ️ No amendments found');
        }
    }
    
    function smartMerge(data, filename){
        if(data.textChanges){
            data.textChanges.forEach(function(change){
                // Key by projectId + simplified selector
                var key = (change.projectId || 'static') + '|' + change.selector;
                mergedAmendments.textChanges[key] = change;
            });
        }
        
        if(data.stickers){
            data.stickers.forEach(function(sticker){
                var key = (sticker.projectId || 'global') + '|' + sticker.position.left + '|' + sticker.position.top;
                mergedAmendments.stickers[key] = sticker;
            });
        }
        
        if(data.dividers){
            data.dividers.forEach(function(divider){
                mergedAmendments.dividers[divider.parentSelector] = divider;
            });
        }
        
        if(data.links){
            data.links.forEach(function(link){
                mergedAmendments.links[link.parentSelector + '|' + link.href] = link;
            });
        }
        
        if(data.images){
            data.images.forEach(function(img){
                mergedAmendments.images[img.selector] = img;
            });
        }
        
        if(data.projectOrder) mergedAmendments.projectOrder = data.projectOrder;
    }
    
    function finalizeAmendments(){
        return {
            textChanges: Object.values(mergedAmendments.textChanges),
            stickers: Object.values(mergedAmendments.stickers),
            dividers: Object.values(mergedAmendments.dividers),
            links: Object.values(mergedAmendments.links),
            images: Object.values(mergedAmendments.images),
            projectOrder: mergedAmendments.projectOrder
        };
    }
    
    function reorderArray(arr, orderIds){
        var orderMap = {};
        orderIds.forEach(function(id, i){ orderMap[id] = i; });
        arr.sort(function(a, b){
            return (orderMap[a.id] || 999) - (orderMap[b.id] || 999);
        });
    }
    
    // ══════════════════════════════════════════════════════════════
    // APPLY VISUAL CHANGES
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
        
        // Text changes
        if(data.textChanges){
            data.textChanges.forEach(function(change){
                if(applyTextChange(change)) applied++;
            });
        }
        
        // Stickers
        if(data.stickers){
            data.stickers.forEach(function(s){
                if(applySticker(s)) applied++;
            });
        }
        
        // Dividers
        if(data.dividers){
            data.dividers.forEach(function(d){
                if(applyDivider(d)) applied++;
            });
        }
        
        // Links
        if(data.links){
            data.links.forEach(function(l){
                if(applyLink(l)) applied++;
            });
        }
        
        // Images
        if(data.images){
            data.images.forEach(function(img){
                try {
                    var el = document.querySelector(img.selector);
                    if(el && el.tagName === 'IMG'){
                        el.src = img.src;
                        applied++;
                    }
                } catch(e){}
            });
        }
        
        // Reorder DOM
        if(data.projectOrder) reorderDOM(data.projectOrder);
        
        // Setup observer for project expansions
        setupProjectObserver();
        
        log('✅ Applied', applied, 'amendments');
    }
    
    function applyTextChange(change){
        try {
            // Try original selector first
            var el = document.querySelector(change.selector);
            
            // If not found and we have projectId, try alternative selectors
            if(!el && change.projectId){
                el = tryAlternativeSelectors(change);
            }
            
            if(el){
                el.innerHTML = change.content;
                if(change.styles) el.style.cssText = change.styles;
                log('  ✓ Text applied:', change.selector.substring(0, 50));
                return true;
            } else {
                log('  ⚠️ Not found:', change.selector.substring(0, 50));
                return false;
            }
        } catch(e){
            log('  ❌ Error:', e.message);
            return false;
        }
    }
    
    function tryAlternativeSelectors(change){
        var projectId = change.projectId;
        var selector = change.selector;
        
        // Extract tag and class from selector
        var tagMatch = selector.match(/(\w+)\.([^\s:>]+)/);
        if(!tagMatch) return null;
        
        var tag = tagMatch[1];
        var className = tagMatch[2].split('.')[0]; // First class only
        
        // Extract nth-child or nth-of-type index
        var indexMatch = selector.match(/:nth-(?:child|of-type)\((\d+)\)/);
        var index = indexMatch ? parseInt(indexMatch[1]) - 1 : 0;
        
        // Try to find in project
        var project = document.querySelector('[data-project-id="' + projectId + '"]');
        if(!project) return null;
        
        // Find all matching elements
        var elements = project.querySelectorAll(tag + '.' + className);
        if(elements[index]){
            return elements[index];
        }
        
        // Fallback: just find first matching
        return elements[0] || null;
    }
    
    function applySticker(sticker){
        try {
            var project = document.querySelector('[data-project-id="' + sticker.projectId + '"]');
            if(!project) return false;
            
            var layer = project.querySelector('.bproject-stickers');
            if(!layer){
                layer = document.createElement('div');
                layer.className = 'bproject-stickers';
                project.appendChild(layer);
            }
            project.style.position = 'relative';
            
            // Check duplicate
            var existing = layer.querySelectorAll('.amendment-sticker');
            for(var i = 0; i < existing.length; i++){
                if(existing[i].style.left === sticker.position.left &&
                   existing[i].style.top === sticker.position.top){
                    return false;
                }
            }
            
            var div = document.createElement('div');
            div.className = 'ed-sticker amendment-sticker';
            div.dataset.amendmentLoaded = 'true';
            div.dataset.projectId = sticker.projectId;
            div.style.cssText = 'position:absolute;left:' + sticker.position.left + 
                ';top:' + sticker.position.top + 
                ';width:' + sticker.size.width + 
                ';height:' + sticker.size.height + 
                ';z-index:' + (sticker.zIndex || 10) + 
                ';opacity:' + (sticker.opacity || 1) + 
                ';transform:rotate(' + (sticker.rotation || 0) + 'deg);pointer-events:none;';
            
            var img = document.createElement('img');
            img.src = sticker.src;
            img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
            div.appendChild(img);
            layer.appendChild(div);
            
            return true;
        } catch(e){ return false; }
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
            
            var existing = parent.querySelector('.amendment-link a[href="' + link.href + '"]');
            if(existing) return false;
            
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
    // PROJECT EXPAND OBSERVER - Re-apply when project opens
    // ══════════════════════════════════════════════════════════════
    
    function setupProjectObserver(){
        if(!storedAmendments) return;
        
        var observer = new MutationObserver(function(mutations){
            mutations.forEach(function(m){
                var target = m.target;
                if(target.classList.contains('bproject') && target.classList.contains('expanded')){
                    setTimeout(function(){
                        reapplyForProject(target.dataset.projectId);
                    }, 200);
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
        
        var applied = 0;
        
        log('📌 Re-applying amendments for:', projectId);
        
        // Re-apply text changes for this project
        storedAmendments.textChanges.forEach(function(change){
            if(change.projectId === projectId){
                if(applyTextChange(change)) applied++;
            }
        });
        
        // Re-apply stickers
        storedAmendments.stickers.forEach(function(s){
            if(s.projectId === projectId){
                if(applySticker(s)) applied++;
            }
        });
        
        // Re-apply dividers
        storedAmendments.dividers.forEach(function(d){
            if(d.parentSelector.includes(projectId)){
                if(applyDivider(d)) applied++;
            }
        });
        
        // Re-apply links
        storedAmendments.links.forEach(function(l){
            if(l.parentSelector.includes(projectId)){
                if(applyLink(l)) applied++;
            }
        });
        
        log('  Applied', applied, 'items');
    }
    
    // RUN
    loadAllAmendments();
    
})();