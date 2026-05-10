import re
import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Add state variables
state_injection = """
  const [lightboxToolMode, setLightboxToolMode] = useState<'normal' | '3d-camera' | 'extend'>('normal')
  const [camRot, setCamRot] = useState({ x: 0, y: 0 })
  const [isCamDragging, setIsCamDragging] = useState(false)
  const [camSource, setCamSource] = useState<{type: 'front'|'back', index: number} | null>(null)
  const [camTarget, setCamTarget] = useState<{type: 'front'|'back', index: number} | null>(null)
  const [extScale, setExtScale] = useState(1)
  const [extRot, setExtRot] = useState(0)
  const [extOff, setExtOff] = useState({x: 0, y: 0})
  const [isExtDragging, setIsExtDragging] = useState(false)
  const [extStart, setExtStart] = useState({x: 0, y: 0})

  // Handlers
  const handleCamPointClick = (type: 'front'|'back', index: number) => {
    if (!camSource) { setCamSource({type, index}); return; }
    if (!camTarget) { 
      setCamTarget({type, index});
      
      // Generate prompt
      const rowWords = ['top', 'middle', 'bottom'];
      const colWords = ['left', 'center', 'right'];
      const srcRow = rowWords[Math.floor(camSource.index / 3)];
      const srcCol = colWords[camSource.index % 3];
      const tgtRow = rowWords[Math.floor(index / 3)];
      const tgtCol = colWords[index % 3];

      let promptText = `Use image 1 and create another projection of the exact same space.\\nOnly the camera angle and position changes.\\n`;
      let isBackTarget = (type === 'back');
      if (isBackTarget) {
        promptText += `Camera turns 180 degrees to reveal the back (opposite) view of the space not visible on this image and that should be consistent with the style, architecture and light of the original space.\\n`;
      }
      let targetSpaceName = isBackTarget ? "back (opposite side of the image)" : "space";
      let srcPosStr = srcCol.toUpperCase() + " SIDE";
      if (srcCol === 'center') srcPosStr = 'CENTER';
      let lookTowardsStr = tgtCol.toUpperCase() + " " + (tgtRow === 'top' ? 'UP' : tgtRow === 'bottom' ? 'DOWN' : 'FRONT');

      let revealVertical = '';
      if (srcRow === 'top' && tgtRow === 'bottom') { revealVertical = 'down side (topdown view)'; } 
      else if (srcRow === 'bottom' && tgtRow === 'top') { revealVertical = 'upper side (low angle view tilting up)'; } 
      else if (tgtRow === 'top') { revealVertical = 'top down side'; } 
      else if (tgtRow === 'bottom') { revealVertical = 'low angle'; } 
      else { revealVertical = 'front side'; }

      let revealingStr = `revealing the ${tgtCol} ${revealVertical} of the ${targetSpaceName}`;
      let actionDesc = `Camera is now positioned on the ${srcPosStr} looking towards the ${lookTowardsStr} SIDE of the space, ${revealingStr}.`;

      promptText += `${actionDesc}\\n[USER NOTE HERE]\\nThe image's objects, positions, architecture, and characters must remain exactly the same as reference image 1.\\nOnly the camera perspective changes.`;
      
      setLbNote(promptText);
      setLbNoteOpen(true);
    } else {
      setCamSource({type, index});
      setCamTarget(null);
    }
  }

  const handleExtPromptGenerate = () => {
    let zoomText = extScale < 1 ? " The camera has zoomed out." : "";
    let p = `Use exact same image 1 and complete the empty space with seamless background extension that should preserve same style, light and colors, seamlessly and logically completing the space.${zoomText}\\n\\n{USER CUSTOM PROMPT}\\n\\nThe quality should match the same level of detail quality and 4k of the original image.`;
    setLbNote(p);
    setLbNoteOpen(true);
  }
"""

if "const [lightboxToolMode" not in content:
    content = content.replace("const [lightboxCrop, setLightboxCrop] = useState(false)", "const [lightboxCrop, setLightboxCrop] = useState(false)\n" + state_injection)


# 2. Add top middle icons
icons_html = """
                <div style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '1rem', zIndex: 10 }}>
                  <button className={`tool-icon action-star ${lightboxToolMode === '3d-camera' ? 'is-active' : ''}`} onClick={() => { setLightboxToolMode(lightboxToolMode === '3d-camera' ? 'normal' : '3d-camera'); setLbNoteOpen(lightboxToolMode !== '3d-camera') }} title="3D Camera Projection">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </button>
                  <button className={`tool-icon action-doodle ${lightboxToolMode === 'extend' ? 'is-active' : ''}`} onClick={() => { setLightboxToolMode(lightboxToolMode === 'extend' ? 'normal' : 'extend'); setLbNoteOpen(lightboxToolMode !== 'extend'); if(lightboxToolMode !== 'extend') handleExtPromptGenerate(); }} title="Image Extend">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                  </button>
                </div>
"""

content = content.replace("{/* Shot number badge \u2014 top right of image */}", icons_html + "\n                {/* Shot number badge \u2014 top right of image */}")


# 3. Replace the <img> tag conditionally
img_target = "} : <img src={lightbox.media.url} alt={lightbox.media.fileName} style={{ maxHeight: '72vh', maxWidth: '85vw', borderRadius: '1rem', display: 'block' }} />}"

ui_logic = """} : lightboxToolMode === '3d-camera' ? (
                  <div className="container-3d" 
                    onMouseDown={(e) => { setIsCamDragging(true); setExtStart({x: e.clientX, y: e.clientY}); }}
                    onMouseMove={(e) => { if(isCamDragging) { setCamRot({ x: camRot.x + (e.clientX - extStart.x)*0.5, y: camRot.y + (e.clientY - extStart.y)*0.5 }); setExtStart({x: e.clientX, y: e.clientY}); } }}
                    onMouseUp={() => setIsCamDragging(false)} onMouseLeave={() => setIsCamDragging(false)}
                    style={{ width: '85vw', maxWidth: '1200px' }}>
                    <div className="image-plane" style={{ transform: `rotateX(${-camRot.y}deg) rotateY(${camRot.x}deg)` }}>
                      <div className="image-plane-inner" style={{ backgroundImage: `url('${lightbox.media.url}')` }} />
                      <div className="target-grid back-grid">
                        {[0,1,2,3,4,5,6,7,8].map(i => <div key={`b${i}`} className="point" style={{ background: camTarget?.type==='back' && camTarget.index===i ? '#fff' : '' }} onClick={(e) => { e.stopPropagation(); handleCamPointClick('back', i); }} />)}
                      </div>
                      <div className="source-grid front-grid">
                        {[0,1,2,3,4,5,6,7,8].map(i => <div key={`f${i}`} className="point" style={{ background: camSource?.type==='front' && camSource.index===i ? '#fff' : '' }} onClick={(e) => { e.stopPropagation(); handleCamPointClick('front', i); }} />)}
                      </div>
                    </div>
                  </div>
                ) : lightboxToolMode === 'extend' ? (
                  <div className="extend-preview" style={{ width: '85vw', maxWidth: '1200px' }}
                    onWheel={(e) => { e.preventDefault(); setExtScale(Math.max(0.1, Math.min(extScale + (e.deltaY < 0 ? 0.05 : -0.05), 4))); handleExtPromptGenerate(); }}
                    onMouseDown={(e) => { setIsExtDragging(true); setExtStart({x: e.clientX - extOff.x, y: e.clientY - extOff.y}); }}
                    onMouseMove={(e) => { 
                      if(isExtDragging) {
                        if(e.altKey) setExtRot(extRot + (e.clientX - extStart.x)*0.3);
                        else setExtOff({x: e.clientX - extStart.x, y: e.clientY - extStart.y});
                      }
                    }}
                    onMouseUp={() => setIsExtDragging(false)} onMouseLeave={() => setIsExtDragging(false)}>
                    <img src={lightbox.media.url} className="extend-image" draggable="false" style={{ transform: `translate3d(${extOff.x}px, ${extOff.y}px, 0) scale(${extScale}) rotate(${extRot}deg)` }} />
                  </div>
                ) : <img src={lightbox.media.url} alt={lightbox.media.fileName} style={{ maxHeight: '72vh', maxWidth: '85vw', borderRadius: '1rem', display: 'block' }} />}"""

content = content.replace(img_target, ui_logic)


with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Injected UI tools.")
