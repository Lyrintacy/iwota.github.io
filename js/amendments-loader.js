/* ═══════ AMENDMENTS LOADER v3 — Smart Merge + Exposes Data for Editor ═══════ */
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
    
    // EXPOSED GLOBALLY so editor can access
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
        _version: '3.0',
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
                    console.log('✅ Loaded:', filename);
                }
            } catch(e){}
        });
        
        if(loadedCount > 0){
            storedAmendments = finalizeAmendments();
            
            // EXPOSE for editor
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
            
            if(storedAmendments.projectOrder && typeof PROJECTS !== 'undefined'){
                reorderArray(PROJECTS, storedAmendments.projectOrder);
            }
            if(storedAmendments.basementOrder && typeof BASEMENT_PROJECTS !== 'undefined'){
                reorderArray(BASEMENT_PROJECTS, storedAmendments.basementOrder);
            }
            
            console.log('📦 Merged ' + loadedCount + ' amendment file(s)');
            scheduleVisualChanges(storedAmendments);
        } else {
            window.LOADED_AMENDMENTS._loaded = true;
            console.log('ℹ️ No amendments to load');
        }
    }
    
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
        
        if(data.textChanges){
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
        
        if(data.images){
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
        
        if(data.stickers){
            data.stickers.forEach(function(sticker){
                if(applySticker(sticker)) applied++;
            });
        }
        
        if(data.dividers){
            data.dividers.forEach(function(divider){
                if(applyDivider(divider)) applied++;
            });
        }
        
        if(data.links){
            data.links.forEach(function(link){
                if(applyLink(link)) applied++;
            });
        }
        
        if(data.projectOrder) reorderDOMProjects(data.projectOrder);
        
        setupProjectObserver();
        
        if(applied > 0) console.log('🎨 Applied ' + applied + ' visual changes');
    }
    
    function reorderDOMProjects(order){
        var container = document.querySelector('.basement-projects');
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
        var newClasses = classString.split(' ').filter(function(c){ return c && !c.startsWith('ed-') && c !== 'expanded'; });
        var preserve = ['bproject', 'bproject-content', 'bp-figure', 'bp-gallery', 'pcard'];
        var existing = Array.from(el.classList).filter(function(c){ return preserve.indexOf(c) !== -1; });
        el.className = existing.concat(newClasses).join(' ');
    }
    
    function applySticker(sticker){
        try {
            var projectCard = null, stickerLayer = null;
            if(sticker.projectId) projectCard = document.querySelector('.bproject[data-project-id="' + sticker.projectId + '"]');
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
            
            var existing = stickerLayer.querySelectorAll('.amendment-sticker');
            for(var i = 0; i < existing.length; i++){
                if(existing[i].style.left === sticker.position.left && existing[i].style.top === sticker.position.top){
                    existing[i].remove();
                    break;
                }
            }
            
            var div = document.createElement('div');
            div.className = 'ed-sticker amendment-sticker';
            div.dataset.rotation = sticker.rotation || '0';
            div.dataset.z = sticker.layer || 'normal';
            div.dataset.amendmentLoaded = 'true'; // Mark as loaded from file
            if(sticker.projectId) div.dataset.projectId = sticker.projectId;
            div.style.cssText = 'position:absolute;left:' + (sticker.position.left || '50px') + ';top:' + (sticker.position.top || '150px') + ';width:' + (sticker.size.width || '80px') + ';height:' + (sticker.size.height || '80px') + ';z-index:' + (sticker.zIndex || '10') + ';opacity:' + (sticker.opacity || '1') + ';transform:rotate(' + (sticker.rotation || '0') + 'deg);pointer-events:none;';
            
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
                    existing[i].className = link.className || 'btn';
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
        projects.forEach(function(project){ observer.observe(project, { attributes: true, attributeFilter: ['class'] }); });
    }
    
    function reapplyForProject(projectEl){
        if(!storedAmendments) return;
        var projectId = projectEl.dataset.projectId;
        if(!projectId) return;
        var applied = 0;
        
        if(storedAmendments.stickers){
            var existingStickers = projectEl.querySelectorAll('.amendment-sticker');
            if(existingStickers.length === 0){
                storedAmendments.stickers.forEach(function(sticker){
                    if(sticker.projectId === projectId) if(applySticker(sticker)) applied++;
                });
            }
        }
        if(storedAmendments.textChanges){
            storedAmendments.textChanges.forEach(function(change){
                if(change.selector.includes(projectId) || change.projectId === projectId){
                    try {
                        var el = document.querySelector(change.selector);
                        if(el){
                            el.innerHTML = change.content;
                            if(change.styles) el.setAttribute('style', change.styles);
                            if(change.classes) applyClasses(el, change.classes);
                            applied++;
                        }
                    } catch(e){}
                }
            });
        }
        if(storedAmendments.dividers){
            var existingDividers = projectEl.querySelectorAll('.amendment-divider');
            if(existingDividers.length === 0){
                storedAmendments.dividers.forEach(function(divider){
                    if(divider.parentSelector.includes(projectId)) if(applyDivider(divider)) applied++;
                });
            }
        }
        if(storedAmendments.links){
            var existingLinks = projectEl.querySelectorAll('.amendment-link');
            if(existingLinks.length === 0){
                storedAmendments.links.forEach(function(link){
                    if(link.parentSelector.includes(projectId)) if(applyLink(link)) applied++;
                });
            }
        }
        if(applied > 0) console.log('📌 Re-applied ' + applied + ' items to:', projectId);
    }
    
    loadAllAmendments();
})();