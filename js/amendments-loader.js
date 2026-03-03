/* ═══════ AMENDMENTS LOADER — Patches source data + applies visual changes ═══════ */
(function(){
    'use strict';
    
    var AMENDMENTS_URL = './js/amendments/amendments.json';
    var storedAmendments = null;
    
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
    // SYNCHRONOUS LOAD - Patches data BEFORE app.js runs
    // ══════════════════════════════════════════════════════════════
    
    function loadAmendmentsSync(){
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', AMENDMENTS_URL, false); // SYNCHRONOUS
            xhr.send(null);
            
            if(xhr.status === 200){
                var data = JSON.parse(xhr.responseText);
                storedAmendments = data;
                
                // Patch source data immediately
                patchSourceData(data);
                
                console.log('✅ Amendments loaded & data patched:', data._exported || 'unknown');
                
                // Schedule visual changes for after DOM is built
                scheduleVisualChanges(data);
            }
        } catch(e){
            console.log('ℹ️ No amendments to load');
        }
    }
    
    // ══════════════════════════════════════════════════════════════
    // PATCH SOURCE DATA - Modifies PROJECTS/BASEMENT_PROJECTS arrays
    // ══════════════════════════════════════════════════════════════
    
    function patchSourceData(data){
        // Patch TEXTS if exists
        if(data.textPatches && typeof TEXTS !== 'undefined'){
            data.textPatches.forEach(function(patch){
                try {
                    setNestedValue(TEXTS, patch.path, patch.value);
                    console.log('📝 Patched TEXTS:', patch.path);
                } catch(e){}
            });
        }
        
        // Patch PROJECTS if exists
        if(data.projectPatches && typeof PROJECTS !== 'undefined'){
            data.projectPatches.forEach(function(patch){
                var project = PROJECTS.find(function(p){ return p.id === patch.projectId; });
                if(project){
                    for(var key in patch.changes){
                        setNestedValue(project, key, patch.changes[key]);
                    }
                    console.log('📝 Patched project:', patch.projectId);
                }
            });
        }
        
        // Patch BASEMENT_PROJECTS if exists
        if(data.basementPatches && typeof BASEMENT_PROJECTS !== 'undefined'){
            data.basementPatches.forEach(function(patch){
                var project = BASEMENT_PROJECTS.find(function(p){ return p.id === patch.projectId; });
                if(project){
                    for(var key in patch.changes){
                        setNestedValue(project, key, patch.changes[key]);
                    }
                    console.log('📝 Patched basement project:', patch.projectId);
                }
            });
        }
        
        // Patch REFERENCES if exists
        if(data.referencePatches && typeof REFERENCES !== 'undefined'){
            data.referencePatches.forEach(function(patch){
                var ref = REFERENCES.find(function(r){ return r.name === patch.name; });
                if(ref){
                    for(var key in patch.changes){
                        ref[key] = patch.changes[key];
                    }
                    console.log('📝 Patched reference:', patch.name);
                }
            });
        }
        
        // Reorder projects if specified
        if(data.projectOrder && typeof PROJECTS !== 'undefined'){
            reorderArray(PROJECTS, data.projectOrder);
            console.log('📋 Reordered PROJECTS');
        }
        
        if(data.basementOrder && typeof BASEMENT_PROJECTS !== 'undefined'){
            reorderArray(BASEMENT_PROJECTS, data.basementOrder);
            console.log('📋 Reordered BASEMENT_PROJECTS');
        }
    }
    
    function setNestedValue(obj, path, value){
        var keys = path.split('.');
        var current = obj;
        for(var i = 0; i < keys.length - 1; i++){
            var key = keys[i];
            // Handle array index like "content.0.text"
            if(!isNaN(key)) key = parseInt(key);
            if(current[key] === undefined) current[key] = {};
            current = current[key];
        }
        var lastKey = keys[keys.length - 1];
        if(!isNaN(lastKey)) lastKey = parseInt(lastKey);
        current[lastKey] = value;
    }
    
    function reorderArray(arr, orderIds){
        var orderMap = {};
        orderIds.forEach(function(id, index){
            orderMap[id] = index;
        });
        arr.sort(function(a, b){
            var aOrder = orderMap[a.id] !== undefined ? orderMap[a.id] : 999;
            var bOrder = orderMap[b.id] !== undefined ? orderMap[b.id] : 999;
            return aOrder - bOrder;
        });
    }
    
    // ══════════════════════════════════════════════════════════════
    // VISUAL CHANGES - Applied after DOM is built
    // ══════════════════════════════════════════════════════════════
    
    function scheduleVisualChanges(data){
        // Wait for DOM and app.js to finish
        if(document.readyState === 'loading'){
            document.addEventListener('DOMContentLoaded', function(){
                setTimeout(function(){ applyVisualChanges(data); }, 300);
            });
        } else {
            setTimeout(function(){ applyVisualChanges(data); }, 300);
        }
    }
    
    function applyVisualChanges(data){
        var applied = 0;
        
        // Apply direct DOM text changes (for elements not built from data)
        if(data.textChanges && data.textChanges.length){
            data.textChanges.forEach(function(change){
                try {
                    var el = document.querySelector(change.selector);
                    if(el){
                        el.innerHTML = change.content;
                        if(change.styles) el.setAttribute('style', change.styles);
                        if(change.classes) applyClasses(el, change.classes);
                        applied++;
                    }
                } catch(e){}
            });
        }
        
        // Apply stickers
        if(data.stickers && data.stickers.length){
            data.stickers.forEach(function(sticker){
                if(applySticker(sticker)) applied++;
            });
        }
        
        // Apply dividers
        if(data.dividers && data.dividers.length){
            data.dividers.forEach(function(divider){
                if(applyDivider(divider)) applied++;
            });
        }
        
        // Apply links
        if(data.links && data.links.length){
            data.links.forEach(function(link){
                if(applyLink(link)) applied++;
            });
        }
        
        // Apply images
        if(data.images && data.images.length){
            data.images.forEach(function(img){
                try {
                    var el = document.querySelector(img.selector);
                    if(el && el.tagName === 'IMG'){
                        el.src = img.src;
                        if(img.alt) el.alt = img.alt;
                        applied++;
                    }
                } catch(e){}
            });
        }
        
        // Setup observer for project expansions
        setupProjectObserver();
        
        if(applied > 0){
            console.log('🎨 Applied ' + applied + ' visual changes');
        }
    }
    
    function applyClasses(el, classString){
        var newClasses = classString.split(' ').filter(function(c){
            return c && !c.startsWith('ed-') && c !== 'expanded';
        });
        var preserve = ['bproject', 'bproject-content', 'bp-figure', 'bp-gallery'];
        var existing = Array.from(el.classList).filter(function(c){
            return preserve.indexOf(c) !== -1;
        });
        el.className = existing.concat(newClasses).join(' ');
    }
    
    function applySticker(sticker){
        try {
            var projectCard = null;
            var stickerLayer = null;
            
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
                var img = existing[i].querySelector('img');
                if(existing[i].style.left === sticker.position.left && 
                   existing[i].style.top === sticker.position.top &&
                   img && img.src === sticker.src){
                    return false;
                }
            }
            
            var div = document.createElement('div');
            div.className = 'ed-sticker amendment-sticker';
            div.dataset.rotation = sticker.rotation || '0';
            div.dataset.z = sticker.layer || 'normal';
            if(sticker.projectId) div.dataset.projectId = sticker.projectId;
            
            div.style.cssText = [
                'position:absolute',
                'left:' + (sticker.position.left || '50px'),
                'top:' + (sticker.position.top || '150px'),
                'width:' + (sticker.size.width || '80px'),
                'height:' + (sticker.size.height || '80px'),
                'z-index:' + (sticker.zIndex || '10'),
                'opacity:' + (sticker.opacity || '1'),
                'transform:rotate(' + (sticker.rotation || '0') + 'deg)',
                'pointer-events:none'
            ].join(';');
            
            var img = document.createElement('img');
            img.src = sticker.src;
            img.alt = '';
            img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
            img.draggable = false;
            div.appendChild(img);
            
            stickerLayer.appendChild(div);
            return true;
        } catch(e){ 
            return false;
        }
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
                if(existing[i].href === link.href) return false;
            }
            
            var wrapper = document.createElement('div');
            wrapper.className = 'ed-link-block amendment-link';
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
    // PROJECT OBSERVER - Re-applies when projects expand
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
                        setTimeout(function(){
                            reapplyForProject(target);
                        }, 150);
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
        
        // Re-apply dividers
        if(storedAmendments.dividers){
            storedAmendments.dividers.forEach(function(divider){
                if(divider.parentSelector.includes(projectId)){
                    if(applyDivider(divider)) applied++;
                }
            });
        }
        
        // Re-apply links
        if(storedAmendments.links){
            storedAmendments.links.forEach(function(link){
                if(link.parentSelector.includes(projectId)){
                    if(applyLink(link)) applied++;
                }
            });
        }
        
        if(applied > 0){
            console.log('📌 Re-applied ' + applied + ' items to:', projectId);
        }
    }
    
    // ══════════════════════════════════════════════════════════════
    // RUN IMMEDIATELY (synchronous)
    // ══════════════════════════════════════════════════════════════
    
    loadAmendmentsSync();
    
})();