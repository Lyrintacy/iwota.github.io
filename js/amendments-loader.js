/* ═══════ AMENDMENTS LOADER — Auto-applies changes from amendments.json ═══════ */
(function(){
    'use strict';
    
    var AMENDMENTS_URL = './data/amendments.json';
    var storedAmendments = null;
    
    // Inject styles for loaded amendments (matches editor styles)
    var style = document.createElement('style');
    style.textContent = 
        '.bproject-stickers{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none!important;overflow:visible;z-index:50}' +
        '.bproject-stickers .ed-sticker,.bproject-stickers .amendment-sticker{pointer-events:none!important}' +
        '.amendment-sticker img{pointer-events:none!important}';
    document.head.appendChild(style);
    
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
        var applied = 0;
        
        // Apply text changes
        if(data.textChanges && data.textChanges.length){
            data.textChanges.forEach(function(change){
                try {
                    var el = document.querySelector(change.selector);
                    if(el){
                        el.innerHTML = change.content;
                        if(change.styles) el.setAttribute('style', change.styles);
                        applied++;
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
                try {
                    var parent = document.querySelector(divider.parentSelector);
                    if(parent){
                        var div = document.createElement('div');
                        div.className = 'ed-divider amendment-divider';
                        div.setAttribute('style', divider.styles);
                        parent.appendChild(div);
                        applied++;
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
                        applied++;
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
                        applied++;
                    }
                } catch(e){}
            });
        }
        
        if(applied > 0){
            console.log('📝 Applied ' + applied + ' amendments');
        }
    }
    
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
            
            // Method 2: Fallback to parentSelector
            if(!projectCard && sticker.parentSelector){
                stickerLayer = document.querySelector(sticker.parentSelector);
                if(stickerLayer){
                    projectCard = stickerLayer.closest('.bproject');
                }
            }
            
            // Find or create sticker layer
            if(projectCard){
                stickerLayer = projectCard.querySelector('.bproject-stickers');
                if(!stickerLayer){
                    stickerLayer = document.createElement('div');
                    stickerLayer.className = 'bproject-stickers';
                    // Styles handled by injected CSS above
                    projectCard.appendChild(stickerLayer);
                }
                // Ensure project card has relative positioning
                projectCard.style.position = 'relative';
            } 
            // Final fallback
            else if(sticker.parentSelector){
                stickerLayer = document.querySelector(sticker.parentSelector);
                if(stickerLayer){
                    stickerLayer.style.position = 'relative';
                }
            }
            
            if(!stickerLayer){
                console.warn('Sticker: Could not find parent for', sticker.projectId || sticker.parentSelector);
                return false;
            }
            
            // Check for duplicates
            var existingStickers = stickerLayer.querySelectorAll('.ed-sticker, .amendment-sticker');
            for(var i = 0; i < existingStickers.length; i++){
                var existing = existingStickers[i];
                var existingImg = existing.querySelector('img');
                if(existing.style.left === sticker.position.left && 
                   existing.style.top === sticker.position.top &&
                   existingImg && existingImg.src === sticker.src){
                    return false; // Already exists
                }
            }
            
            // Create sticker element
            var div = document.createElement('div');
            div.className = 'ed-sticker amendment-sticker';
            div.dataset.rotation = sticker.rotation || '0';
            div.dataset.z = sticker.layer || 'normal';
            if(sticker.projectId) div.dataset.projectId = sticker.projectId;
            
            // Build style string - pointer-events:none is critical!
            var styles = [
                'position:absolute',
                'left:' + (sticker.position.left || '50px'),
                'top:' + (sticker.position.top || '150px'),
                'width:' + (sticker.size.width || '80px'),
                'height:' + (sticker.size.height || '80px'),
                'z-index:' + (sticker.zIndex || '10'),
                'opacity:' + (sticker.opacity || '1'),
                'transform:rotate(' + (sticker.rotation || '0') + 'deg)',
                'pointer-events:none'  // Important: don't block content!
            ];
            div.style.cssText = styles.join(';');
            
            // Create image
            var img = document.createElement('img');
            img.src = sticker.src;
            img.alt = '';
            img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
            img.draggable = false;
            div.appendChild(img);
            
            stickerLayer.appendChild(div);
            return true;
            
        } catch(e){ 
            console.warn('Sticker failed:', e); 
            return false;
        }
    }
    
    // Watch for project expansions to re-apply stickers
    function setupProjectObserver(){
        if(!storedAmendments || !storedAmendments.stickers || !storedAmendments.stickers.length) return;
        
        var projects = document.querySelectorAll('.bproject');
        if(!projects.length) return;
        
        var observer = new MutationObserver(function(mutations){
            mutations.forEach(function(mutation){
                if(mutation.type === 'attributes' && mutation.attributeName === 'class'){
                    var target = mutation.target;
                    if(target.classList.contains('bproject') && target.classList.contains('expanded')){
                        // Small delay to ensure DOM is ready
                        setTimeout(function(){
                            var projectId = target.dataset.projectId;
                            if(projectId){
                                reapplyStickersForProject(projectId, target);
                            }
                        }, 50);
                    }
                }
            });
        });
        
        projects.forEach(function(project){
            observer.observe(project, { attributes: true, attributeFilter: ['class'] });
        });
    }
    
    // Re-apply stickers for a specific project
    function reapplyStickersForProject(projectId, projectEl){
        if(!storedAmendments || !storedAmendments.stickers) return;
        
        // Check if stickers already exist for this project
        var existing = projectEl.querySelectorAll('.amendment-sticker');
        if(existing.length > 0) return; // Already applied
        
        var applied = 0;
        storedAmendments.stickers.forEach(function(sticker){
            if(sticker.projectId === projectId){
                if(applySticker(sticker)) applied++;
            }
        });
        
        if(applied > 0){
            console.log('📌 Applied ' + applied + ' stickers to project:', projectId);
        }
    }
    
    // Load when DOM is ready
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', loadAmendments);
    } else {
        loadAmendments();
    }
})();