import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Add theme toggle button to Lightbox
theme_btn = """
                <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10 }}>
                  <button className="tool-icon" aria-label="Toggle theme" onClick={(e) => { e.stopPropagation(); setBookTheme(bookTheme === 'dark' ? 'light' : 'dark') }} title="Toggle Theme" style={{ color: bookTheme === 'light' ? '#333' : 'rgba(255,255,255,0.6)' }}>
                    {bookTheme === 'dark' ? '☀️' : '🌙'}
                  </button>
                </div>
"""

# Find where to put it. We can put it near the close button.
close_btn = 'onClick={() => { setLightbox(null); setLightboxCompare(false); setLbNoteOpen(false)'
if close_btn in content:
    # insert before close button
    parts = content.split('<button aria-label="Close" onClick={() => { setLightbox(null);')
    if len(parts) == 2:
        content = parts[0] + theme_btn + '\n          <button aria-label="Close" onClick={() => { setLightbox(null);' + parts[1]

# 2. Make Lightbox background respect bookTheme
lightbox_bg_target = "background: 'rgba(0,0,0,0.85)'"
lightbox_bg_replace = "background: bookTheme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.85)'"
content = content.replace(lightbox_bg_target, lightbox_bg_replace)

# 3. Text area colors inside Lightbox (the Note area)
# Target line 2331
ta_target = "style={{ background: 'transparent', border: 'none', color: 'var(--cream)'"
ta_replace = "style={{ background: 'transparent', border: 'none', color: bookTheme === 'light' ? '#111' : 'var(--cream)'"
content = content.replace(ta_target, ta_replace)

# 4. Note container background
nc_target = "background: 'linear-gradient(to top, rgba(10,12,20,0.98) 0%, rgba(10,12,20,0.95) 60%, rgba(10,12,20,0) 100%)'"
nc_replace = "background: bookTheme === 'light' ? 'linear-gradient(to top, rgba(245,245,245,0.98) 0%, rgba(245,245,245,0.95) 60%, rgba(245,245,245,0) 100%)' : 'linear-gradient(to top, rgba(10,12,20,0.98) 0%, rgba(10,12,20,0.95) 60%, rgba(10,12,20,0) 100%)'"
content = content.replace(nc_target, nc_replace)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Applied theme fixes")
