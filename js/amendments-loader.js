/* ═══════ AMENDMENTS LOADER — Auto-applies changes from amendments.json ═══════ */
(function(){
    'use strict';
    
    var AMENDMENTS_URL = './data/amendments.json';
    var storedAmendments = null; // Store for re-application on project expand
    
    function loadAmendments(){
        fetch(AMENDMENTS_URL)
            .then(function(response){
                if(!response.ok) throw new Error('No amendments file');
                return response.json();
            })
            .then(function(data){
                storedAmendments = data;
                applyAmendments(data);
                setupProjectObserver();
                console.log('✅ Amendments loaded:', data._exported || 'unknown date');
            })
            .catch(function(err){
                console.log('ℹ️ No amendments to load');
            });
    }
    
    function applyAmendments(data){
        // Apply text changes
        if(data.textChanges && data.textChanges.length){
            data.textChanges.forEach(function(change){
                try {
                    var el = document.querySelector(change.selector);
                    if(el){
                        el.innerHTML = change.content;
                        if(change.styles) el.setAttribute('style', change.styles);
                    }
                } catch(e){ console.warn('Amendment selector failed:', change.selector); }
            });
        }
        
        // Apply image changes
        if(data.images && data.images.length){
            data.images.forEach(function(img){
                try {
                    var el = document.querySelector(img.selector);
                    if(el && el.tagName === 'IMG'){
                        el.src = img.src;
                        if(img.alt) el.alt = img.alt;
                    }
                } catch(e){}
            });
        }
        
        // Apply stickers (UPDATED FOR PROJECT-LINKED SYSTEM)
        if(data.stickers && data.stickers.length){
            data.stickers.forEach(function(sticker){
                applySticker(sticker);
            });
        }
        
        // Apply dividers
        if(data.dividers && data.dividers.length){
            data.dividers.forEach(function(divider){
                try {
                    var parent = document.querySelector(divider.parentSelector);
                    if(parent){
                        var div = document.createElement('div');
                        div.className = 'ed-divider amendment-divider';
                        div.setAttribute('style', divider.styles);
                        parent.appendChild(div);
                    }
                } catch(e){}
            });
        }
        
        // Apply link blocks
        if(data.links && data.links.length){
            data.links.forEach(function(link){
                try {
                    var parent = document.querySelector(link.parentSelector);
                    if(parent){
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
                    }
                } catch(e){}
            });
        }
        
        // Apply new blocks (generic HTML blocks)
        if(data.newBlocks && data.newBlocks.length){
            data.newBlocks.forEach(function(block){
                try {
                    var parent = document.querySelector(block.parentSelector);
                    if(parent){
                        var temp = document.createElement('div');
                        temp.innerHTML = block.html;
                        while(temp.firstChild){
                            parent.appendChild(temp.firstChild);
                        }
                    }
                } catch(e){}
            });
        }
    }
    
    // NEW: Apply individual sticker with project-linked support
    function applySticker(sticker){
        try {
            var projectCard = null;
            var stickerLayer = null;
            
            // Method 1: Find by projectId (preferred)
            if(sticker.projectId){
                projectCard = document.querySelector(
                    '.bproject[data-project-id="' + sticker.projectId + '"]'
                );
            }
            
            // Method 2: Fallback to parentSelector (backwards compatibility)
            if(!projectCard && sticker.parentSelector){
                stickerLayer = document.querySelector(sticker.parentSelector);
                if(stickerLayer){
                    projectCard = stickerLayer.closest('.bproject');
                }
            }
            
            // If we found a project card, find/create sticker layer
            if(projectCard){
                stickerLayer = projectCard.querySelector('.bproject-stickers');
                if(!stickerLayer){
                    stickerLayer = document.createElement('div');
                    stickerLayer.className = 'bproject-stickers';
                    stickerLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:50;';
                    projectCard.appendChild(stickerLayer);
                }
                // Ensure project card has relative positioning
                projectCard.style.position = 'relative';
            } 
            // Final fallback: use parentSelector directly
            else if(sticker.parentSelector){
                stickerLayer = document.querySelector(sticker.parentSelector);
                if(stickerLayer){
                    stickerLayer.style.position = 'relative';
                }
            }
            
            if(!stickerLayer){
                console.warn('Sticker: Could not find parent for', sticker.projectId || sticker.parentSelector);
                return;
            }
            
            // Check if sticker already exists (prevent duplicates)
            var existingStickers = stickerLayer.querySelectorAll('.ed-sticker');
            for(var i = 0; i < existingStickers.length; i++){
                var existing = existingStickers[i];
                if(existing.style.left === sticker.position.left && 
                   existing.style.top === sticker.position.top &&
                   existing.querySelector('img') &&
                   existing.querySelector('img').src === sticker.src){
                    return; // Already exists
                }
            }
            
            // Create sticker element
            var div = document.createElement('div');
            div.className = 'ed-sticker amendment-sticker';
            div.dataset.rotation = sticker.rotation || '0';
            div.dataset.z = sticker.layer || 'normal';
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
            div.appendChild(img);
            
            stickerLayer.appendChild(div);
            
        } catch(e){ 
            console.warn('Sticker failed:', e); 
        }
    }
    
    // NEW: Watch for project expansions to re-apply stickers
    function setupProjectObserver(){
        if(!storedAmendments || !storedAmendments.stickers || !storedAmendments.stickers.length) return;
        
        var projects = document.querySelectorAll('.bproject');
        if(!projects.length) return;
        
        var observer = new MutationObserver(function(mutations){
            mutations.forEach(function(mutation){
                if(mutation.type === 'attributes' && mutation.attributeName === 'class'){
                    var target = mutation.target;
                    if(target.classList.contains('bproject') && target.classList.contains('expanded')){
                        // Project just expanded - apply its stickers
                        var projectId = target.dataset.projectId;
                        if(projectId){
                            reapplyStickersForProject(projectId);
                        }
                    }
                }
            });
        });
        
        projects.forEach(function(project){
            observer.observe(project, { attributes: true, attributeFilter: ['class'] });
        });
    }
    
    // NEW: Re-apply stickers for a specific project
    function reapplyStickersForProject(projectId){
        if(!storedAmendments || !storedAmendments.stickers) return;
        
        storedAmendments.stickers.forEach(function(sticker){
            if(sticker.projectId === projectId){
                applySticker(sticker);
            }
        });
    }
    
    // Load when DOM is ready
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', loadAmendments);
    } else {
        loadAmendments();
    }
})();