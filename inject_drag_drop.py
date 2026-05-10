import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Add localToolImage state
if "const [localToolImage" not in content:
    content = content.replace("const [extStart, setExtStart] = useState({x: 0, y: 0})", "const [extStart, setExtStart] = useState({x: 0, y: 0})\n  const [localToolImage, setLocalToolImage] = useState<string | null>(null)")

# 2. Reset localToolImage when tool mode changes
content = content.replace("setLightboxToolMode(lightboxToolMode === '3d-camera' ? 'normal' : '3d-camera')", "setLightboxToolMode(lightboxToolMode === '3d-camera' ? 'normal' : '3d-camera'); setLocalToolImage(null)")
content = content.replace("setLightboxToolMode(lightboxToolMode === 'extend' ? 'normal' : 'extend')", "setLightboxToolMode(lightboxToolMode === 'extend' ? 'normal' : 'extend'); setLocalToolImage(null)")
# Also when selecting a thumbnail, reset localToolImage:
content = content.replace("setLightbox({ ...lightbox, media: m }); setLbEmptyMode(false)", "setLightbox({ ...lightbox, media: m }); setLbEmptyMode(false); setLocalToolImage(null)")

# 3. Add drag handlers to the containers
drag_handlers = """
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        if (file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setLocalToolImage(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
"""

content = content.replace('className="container-3d"', 'className="container-3d" ' + drag_handlers)
content = content.replace('className="extend-preview"', 'className="extend-preview" ' + drag_handlers)

# 4. Use localToolImage || lightbox.media.url
content = content.replace("style={{ backgroundImage: `url('${lightbox.media.url}')` }}", "style={{ backgroundImage: `url('${localToolImage || lightbox.media.url}')` }}")
content = content.replace('className="extend-image" draggable="false"', 'className="extend-image" draggable="false" src={localToolImage || lightbox.media.url}')
content = content.replace('<img src={lightbox.media.url} className="extend-image"', '<img ')

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Injected localToolImage and drag/drop logic.")
