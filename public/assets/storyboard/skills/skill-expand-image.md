# Expand Image (Outpainting)

This skill dictates the required prompt structure for outpainting and extending a cinematic reference image. 

## Base Template
Use exact same image 1 and complete the empty space with seamless background extension that should preserve same style, light and colors, seamlessly and logically completing the space.
[ZOOM CONDITION]
[USER NOTE HERE]
The quality should match the same level of detail quality and 4k of the original image.

## Conditions

### Zoom Condition
If the user manually scales down the image to create empty canvas space.
**Trigger**: When `currentScale < 1`.
**Text**:
> The camera has zoomed out.

### User Instructions
User-added instructions for *what* to fill the empty space with are injected securely in curly brackets `{...}` right before the quality instruction, to ensure the model focuses on the background addition rather than mutating the core subject.
