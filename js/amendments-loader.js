/* ═══════ AMENDMENTS LOADER v4 — Patches PROJECTS + Smart Merge ═══════ */
(function(){
    'use strict';
    
    var AMENDMENTS_FOLDER = './js/amendments/';
    var AMENDMENTS_FILES = [
        'amendments.json',
        'amendments-001.json',
        'amendments-002.json',
        'amendments-003.json',
        'amendments-004.json',
        'amendments-005.json',
        'amendments-006.json',
        'amendments-007.json',
        'amendments-008.json',
        'amendments-009.json'
    ];
    
    // Exposed globally for editor
    window.LOADED_AMENDMENTS = {
        stickers: {},
        textChanges: {},
        dividers: {},
        links: {},
        images: {},
        projectOrder: null,
        basementOrder: null,
        _loaded: false
    };
    
    var storedAmendments = null;
    var mergedAmendments = {
        _version: '4.0',
        _sources: [],
        textChanges: {},
        stickers: {},
        dividers: {},
        links: {},
        images: {},
        projectOrder: null,
        basementOrder: null
    };
    
    // Inject styles
    var style = document.createElement('style');
    style.textContent = 
        '.bproject-stickers{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none!important;overflow:visible;z-index:50}' +
        '.bproject-stickers .ed-sticker,.bproject-stickers .amendment-sticker{pointer-events:none!important}' +
        '.amendment-sticker img{pointer-events:none!important}' +
        '.fancy,.alt-font,.font-display{font-family:var(--font-display),cursive}' +
        '.amendment-divider{pointer-events:none}' +
        '.whisper{font-size:0.85em;opacity:0.6;font-style:italic}';
    document.head.appendChild(style);
    
    // ══════════════════════════════════════════════════════════════
    // LOAD ALL AMENDMENTS
    // ══════════════════════════════════════════════════════════════
    
    function loadAllAmendments(){
        var loadedCount = 0;
        
        AMENDMENTS_FILES.forEach(function(filename){
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', AMENDMENTS_FOLDER + filename, false); // Synchronous!
                xhr.send(null);
                
                if(xhr.status === 200){
                    var data = JSON.parse(xhr.responseText);
                    smartMerge(data, filename);
                    loadedCount++;
                    console.log('✅ Loaded:', filename);
                }
            } catch(e){}
        });
        
        if(loadedCount > 0){
            storedAmendments = finalizeAmendments();
            
            // Expose for editor's smart export
            window.LOADED_AMENDMENTS = {
                stickers: Object.assign({}, mergedAmendments.stickers),
                textChanges: Object.assign({}, mergedAmendments.textChanges),
                dividers: Object.assign({}, mergedAmendments.dividers),
                links: Object.assign({}, mergedAmendments.links),
                images: Object.assign({}, mergedAmendments.images),
                projectOrder: mergedAmendments.projectOrder ? mergedAmendments.projectOrder.slice() : null,
                basementOrder: mergedAmendments.basementOrder ? mergedAmendments.basementOrder.slice() : null,
                _loaded: true
            };
            
            // ═══════════════════════════════════════════════════════
            // PATCH PROJECTS ARRAY (before app.js builds DOM)
            // ═══════════════════════════════════════════════════════
            patchProjectsData(storedAmendments);
            
            // Reorder arrays
            if(storedAmendments.projectOrder && typeof PROJECTS !== 'undefined'){
                reorderArray(PROJECTS, storedAmendments.projectOrder);
                console.log('📋 Reordered PROJECTS');
            }
            
            console.log('📦 Merged ' + loadedCount + ' amendment file(s)');
            
            // Schedule visual changes (stickers, dividers, etc.) for after DOM is built
            scheduleVisualChanges(storedAmendments);
        } else {
            window.LOADED_AMENDMENTS._loaded = true;
            console.log('ℹ️ No amendments to load');
        }
    }
    
    // ══════════════════════════════════════════════════════════════
    // PATCH PROJECTS DATA - Modify PROJECTS array before app.js uses it
    // ══════════════════════════════════════════════════════════════
    
    function patchProjectsData(data){
        if(!data.textChanges || !data.textChanges.length) return;
        if(typeof PROJECTS === 'undefined') return;
        
        var patched = 0;
        
        data.textChanges.forEach(function(change){
            var selector = change.selector;
            var projectId = change.projectId || extractProjectId(selector);
            
            if(!projectId) return;
            
            // Find project in array
            var project = null;
            for(var i = 0; i < PROJECTS.length; i++){
                if(PROJECTS[i].id === projectId){
                    project = PROJECTS[i];
                    break;
                }
            }
            
            if(!project) return;
            
            // Determine what field to patch based on selector
            var content = change.content;
            
            // Title: .bproject-header-text h3
            if(selector.includes('bproject-header-text') && selector.includes('h3')){
                project.title = stripTags(content);
                patched++;
                console.log('📝 Patched title for:', projectId);
            }
            // Tagline: .bproject-tagline
            else if(selector.includes('bproject-tagline')){
                project.tagline = stripTags(content);
                patched++;
                console.log('📝 Patched tagline for:', projectId);
            }
            // Role: .bm-value (first one)
            else if(selector.includes('bm-value') && change._field === 'role'){
                project.role = stripTags(content);
                patched++;
            }
            // Team
            else if(selector.includes('bm-value') && change._field === 'team'){
                project.team = stripTags(content);
                patched++;
            }
            // Content paragraphs: .bp-text
            else if(selector.includes('bp-text')){
                // Find which paragraph
                var match = selector.match(/:nth-child\((\d+)\)/);
                var index = match ? parseInt(match[1]) - 1 : 0;
                
                // Patch content array or paragraphs
                if(project.content && project.content[index]){
                    if(project.content[index].type === 'text'){
                        project.content[index].value = content;
                        patched++;
                        console.log('📝 Patched content[' + index + '] for:', projectId);
                    }
                } else if(project.paragraphs && project.paragraphs[index] !== undefined){
                    project.paragraphs[index] = content;
                    patched++;
                    console.log('📝 Patched paragraph[' + index + '] for:', projectId);
                }
            }
            // Heading: .bp-heading
            else if(selector.includes('bp-heading')){
                var match = selector.match(/:nth-child\((\d+)\)/);
                var index = match ? parseInt(match[1]) - 1 : 0;
                
                if(project.content && project.content[index] && project.content[index].type === 'heading'){
                    project.content[index].value = stripTags(content);
                    patched++;
                    console.log('📝 Patched heading for:', projectId);
                }
            }
        });
        
        if(patched > 0){
            console.log('🔧 Patched ' + patched + ' project fields');
        }
    }
    
    function extractProjectId(selector){
        // Extract from [data-project-id="xxx"]
        var match = selector.match(/\[data-project-id="([^"]+)"\]/);
        if(match) return match[1];
        
        // Extract from #bp-xxx
        match = selector.match(/#bp-([^\s\.\[]+)/);
        if(match) return match[1];
        
        return null;
    }
    
    function stripTags(html){
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }
    
    // ══════════════════════════════════════════════════════════════
    // SMART MERGE
    // ══════════════════════════════════════════════════════════════
    
    function smartMerge(data, filename){
        mergedAmendments._sources.push(filename);
        
        if(data.textChanges){
            data.textChanges.forEach(function(change){
                mergedAmendments.textChanges[change.selector] = change;
            });
        }
        
        if(data.stickers){
            data.stickers.forEach(function(sticker){
                var key = (sticker.projectId || 'global') + '|' + 
                          (sticker.position.left || '0') + '|' + 
                          (sticker.position.top || '0');
                mergedAmendments.stickers[key] = sticker;
            });
        }
        
        if(data.dividers){
            data.dividers.forEach(function(divider){
                var key = divider.parentSelector + '|' + hashString(divider.styles || '');
                mergedAmendments.dividers[key] = divider;
            });
        }
        
        if(data.links){
            data.links.forEach(function(link){
                var key = link.parentSelector + '|' + link.href;
                mergedAmendments.links[key] = link;
            });
        }
        
        if(data.images){
            data.images.forEach(function(img){
                mergedAmendments.images[img.selector] = img;
            });
        }
        
        if(data.projectOrder) mergedAmendments.projectOrder = data.projectOrder;
        if(data.basementOrder) mergedAmendments.basementOrder = data.basementOrder;
    }
    
    function hashString(str){
        var hash = 0;
        for(var i = 0; i < str.length; i++){
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    
    function finalizeAmendments(){
        return {
            _version: mergedAmendments._version,
            _sources: mergedAmendments._sources,
            textChanges: Object.values(mergedAmendments.textChanges),
            stickers: Object.values(mergedAmendments.stickers),
            dividers: Object.values(mergedAmendments.dividers),
            links: Object.values(mergedAmendments.links),
            images: Object.values(mergedAmendments.images),
            projectOrder: mergedAmendments.projectOrder,
            basementOrder: mergedAmendments.basementOrder
        };
    }
    
    function reorderArray(arr, orderIds){
        var orderMap = {};
        orderIds.forEach(function(id, index){ orderMap[id] = index; });
        arr.sort(function(a, b){
            var aOrder = orderMap[a.id] !== undefined ? orderMap[a.id] : 999;
            var bOrder = orderMap[b.id] !== undefined ? orderMap[b.id] : 999;
            return aOrder - bOrder;
        });
    }
    
    // ══════════════════════════════════════════════════════════════
    // VISUAL CHANGES (after DOM is built)
    // ══════════════════════════════════════════════════════════════
    
    function scheduleVisualChanges(data){
        var apply = function(){ applyVisualChanges(data); };
        if(document.readyState === 'loading'){
            document.addEventListener('DOMContentLoaded', function(){ setTimeout(apply, 300); });
        } else {
            setTimeout(apply, 300);
        }
    }
    
    function applyVisualChanges(data){
        var applied = 0;
        
        // Apply text changes to DOM (backup for anything not patched in data)
        if(data.textChanges){
            data.textChanges.forEach(function(change){
                try {
                    var el = document.querySelector(change.selector);
                    if(el){
                        // Check if content differs (might already be correct from data patch)
                        if(el.innerHTML !== change.content){
                            el.innerHTML = change.content;
                            if(change.styles) el.setAttribute('style', change.styles);
                            if(change.classes) applyClasses(el, change.classes);
                            applied++;
                        }
                    }
                } catch(e){}
            });
        }
        
        // Images
        if(data.images){
            data.images.forEach(function(img){
                try {
                    var el = document.querySelector(img.selector);
                    if(el && el.tagName === 'IMG' && el.src !== img.src){
                        el.src = img.src;
                        if(img.alt) el.alt = img.alt;
                        applied++;
                    }
                } catch(e){}
            });
        }
        
        // Stickers
        if(data.stickers){
            data.stickers.forEach(function(sticker){
                if(applySticker(sticker)) applied++;
            });
        }
        
        // Dividers
        if(data.dividers){
            data.dividers.forEach(function(divider){
                if(applyDivider(divider)) applied++;
            });
        }
        
        // Links
        if(data.links){
            data.links.forEach(function(link){
                if(applyLink(link)) applied++;
            });
        }
        
        // Reorder DOM (backup)
        if(data.projectOrder) reorderDOMProjects(data.projectOrder);
        
        setupProjectObserver();
        
        if(applied > 0) console.log('🎨 Applied ' + applied + ' visual changes');
    }
    
    function reorderDOMProjects(order){
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
    
    function applyClasses(el, classString){
        if(!classString) return;
        var newClasses = classString.split(' ').filter(function(c){ 
            return c && !c.startsWith('ed-') && c !== 'expanded'; 
        });
        var preserve = ['bproject', 'bproject-content', 'bp-figure', 'bp-gallery', 'pcard', 'bp-text', 'bp-heading'];
        var existing = Array.from(el.classList).filter(function(c){ 
            return preserve.indexOf(c) !== -1; 
        });
        el.className = existing.concat(newClasses).join(' ');
    }
    
    function applySticker(sticker){
        try {
            var projectCard = null, stickerLayer = null;
            
            if(sticker.projectId){
                projectCard = document.querySelector('.bproject[data-project-id="' + sticker.projectId + '"]');
            }
            if(!projectCard && sticker.parentSelector){
                stickerLayer = document.querySelector(sticker.parentSelector);
                if(stickerLayer) projectCard = stickerLayer.closest('.bproject');
            }
            
            if(projectCard){
                stickerLayer = projectCard.querySelector('.bproject-stickers');
                if(!stickerLayer){
                    stickerLayer = document.createElement('div');
                    stickerLayer.className = 'bproject-stickers';
                    projectCard.appendChild(stickerLayer);
                }
                projectCard.style.position = 'relative';
            } else if(sticker.parentSelector){
                stickerLayer = document.querySelector(sticker.parentSelector);
                if(stickerLayer) stickerLayer.style.position = 'relative';
            }
            
            if(!stickerLayer) return false;
            
            // Check duplicates
            var existing = stickerLayer.querySelectorAll('.amendment-sticker');
            for(var i = 0; i < existing.length; i++){
                if(existing[i].style.left === sticker.position.left && 
                   existing[i].style.top === sticker.position.top){
                    existing[i].remove();
                    break;
                }
            }
            
            var div = document.createElement('div');
            div.className = 'ed-sticker amendment-sticker';
            div.dataset.rotation = sticker.rotation || '0';
            div.dataset.z = sticker.layer || 'normal';
            div.dataset.amendmentLoaded = 'true';
            if(sticker.projectId) div.dataset.projectId = sticker.projectId;
            
            div.style.cssText = 'position:absolute;' +
                'left:' + (sticker.position.left || '50px') + ';' +
                'top:' + (sticker.position.top || '150px') + ';' +
                'width:' + (sticker.size.width || '80px') + ';' +
                'height:' + (sticker.size.height || '80px') + ';' +
                'z-index:' + (sticker.zIndex || '10') + ';' +
                'opacity:' + (sticker.opacity || '1') + ';' +
                'transform:rotate(' + (sticker.rotation || '0') + 'deg);' +
                'pointer-events:none;';
            
            var img = document.createElement('img');
            img.src = sticker.src;
            img.alt = '';
            img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
            img.draggable = false;
            div.appendChild(img);
            stickerLayer.appendChild(div);
            return true;
        } catch(e){ return false; }
    }
    
    function applyDivider(divider){
        try {
            var parent = document.querySelector(divider.parentSelector);
            if(!parent) return false;
            
            var existing = parent.querySelectorAll('.amendment-divider');
            for(var i = 0; i < existing.length; i++){
                if(existing[i].getAttribute('style') === divider.styles) return false;
            }
            
            var div = document.createElement('div');
            div.className = 'ed-divider amendment-divider';
            div.dataset.amendmentLoaded = 'true';
            div.setAttribute('style', divider.styles);
            parent.appendChild(div);
            return true;
        } catch(e){ return false; }
    }
    
    function applyLink(link){
        try {
            var parent = document.querySelector(link.parentSelector);
            if(!parent) return false;
            
            var existing = parent.querySelectorAll('.amendment-link a');
            for(var i = 0; i < existing.length; i++){
                if(existing[i].href === link.href){
                    existing[i].textContent = link.text;
                    return false;
                }
            }
            
            var wrapper = document.createElement('div');
            wrapper.className = 'ed-link-block amendment-link';
            wrapper.dataset.amendmentLoaded = 'true';
            wrapper.style.cssText = 'margin:16px 0;';
            
            var a = document.createElement('a');
            a.href = link.href;
            a.textContent = link.text;
            a.className = link.className || 'btn';
            a.target = link.target || '_blank';
            a.rel = 'noopener noreferrer';
            
            wrapper.appendChild(a);
            parent.appendChild(wrapper);
            return true;
        } catch(e){ return false; }
    }
    
    // ══════════════════════════════════════════════════════════════
    // PROJECT OBSERVER
    // ══════════════════════════════════════════════════════════════
    
    function setupProjectObserver(){
        if(!storedAmendments) return;
        
        var projects = document.querySelectorAll('.bproject');
        if(!projects.length) return;
        
        var observer = new MutationObserver(function(mutations){
            mutations.forEach(function(mutation){
                if(mutation.type === 'attributes' && mutation.attributeName === 'class'){
                    var target = mutation.target;
                    if(target.classList.contains('bproject') && target.classList.contains('expanded')){
                        setTimeout(function(){ reapplyForProject(target); }, 150);
                    }
                }
            });
        });
        
        projects.forEach(function(project){ 
            observer.observe(project, { attributes: true, attributeFilter: ['class'] }); 
        });
    }
    
    function reapplyForProject(projectEl){
        if(!storedAmendments) return;
        var projectId = projectEl.dataset.projectId;
        if(!projectId) return;
        
        var applied = 0;
        
        // Re-apply stickers
        if(storedAmendments.stickers){
            var existingStickers = projectEl.querySelectorAll('.amendment-sticker');
            if(existingStickers.length === 0){
                storedAmendments.stickers.forEach(function(sticker){
                    if(sticker.projectId === projectId){
                        if(applySticker(sticker)) applied++;
                    }
                });
            }
        }
        
        // Re-apply text changes
        if(storedAmendments.textChanges){
            storedAmendments.textChanges.forEach(function(change){
                var changeProjectId = change.projectId || extractProjectId(change.selector);
                if(changeProjectId === projectId){
                    try {
                        var el = document.querySelector(change.selector);
                        if(el && el.innerHTML !== change.content){
                            el.innerHTML = change.content;
                            if(change.styles) el.setAttribute('style', change.styles);
                            if(change.classes) applyClasses(el, change.classes);
                            applied++;
                        }
                    } catch(e){}
                }
            });
        }
        
        // Re-apply dividers
        if(storedAmendments.dividers){
            var existingDividers = projectEl.querySelectorAll('.amendment-divider');
            if(existingDividers.length === 0){
                storedAmendments.dividers.forEach(function(divider){
                    if(divider.parentSelector.includes(projectId)){
                        if(applyDivider(divider)) applied++;
                    }
                });
            }
        }
        
        // Re-apply links
        if(storedAmendments.links){
            var existingLinks = projectEl.querySelectorAll('.amendment-link');
            if(existingLinks.length === 0){
                storedAmendments.links.forEach(function(link){
                    if(link.parentSelector.includes(projectId)){
                        if(applyLink(link)) applied++;
                    }
                });
            }
        }
        
        if(applied > 0) console.log('📌 Re-applied ' + applied + ' items to:', projectId);
    }
    
    // ══════════════════════════════════════════════════════════════
    // RUN IMMEDIATELY (synchronous, before app.js)
    // ══════════════════════════════════════════════════════════════
    
    loadAllAmendments();
    
})();