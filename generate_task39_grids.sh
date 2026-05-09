#!/bin/bash

NODE="/Users/vaquita/.nvm/versions/node/v24.14.0/bin/node"
NPX="/Users/vaquita/.nvm/versions/node/v24.14.0/bin/npx"

BASE_DIR="/Users/vaquita/Downloads/aisha/aisha-cannes-showcase/public"

AISHA="$BASE_DIR/assets/storyboard/uploads/Aisha-and-Sands-of-Destiny-70-1778041121249.png"
DJINN_CARD="$BASE_DIR/assets/storyboard/uploads/Plasma-character-1778041170397.png"
DJINN_CLOSE="$BASE_DIR/assets/storyboard/uploads/Plasma-character-Djinn-close-up-1778041175715.png"
REF_401="$BASE_DIR/assets/storyboard/uploads/401-1778040955251.png"
REF_395="$BASE_DIR/assets/storyboard/uploads/395-1778040967935.png"
REF_396="$BASE_DIR/assets/storyboard/uploads/396-1778040971164.png"

# We only run gemini-2.5-flash for speed as Nano Banana 2 (4K)
MODEL="gemini-2.5-flash"
QUALITY="2160p"

PROMPT1="premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric golden hour light, little tiny dust motes, soft sunrays, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look. CHARACTER LOCKS: @image1 = Aisha. @image2 = Dora, white panther. @image3 = Djinn, plasma form. LOCATION REFERENCE: @image4 = House in the Rocks exterior. @image5 = Sand dunes and ancient structures. @image6 = Steps to the dwelling. SCENE: Late afternoon. Aisha, Dora, and the Djinn arrive at the ancient carved rock dwellings. Create 2x2 cinematic grid with 4 panels: Panel 1: Wide shot. Aisha and Djinn look at the hole in the rock. Panel 2: Medium shot. Aisha pauses on the path. Panel 3: Low angle. Djinn leads Aisha and Dora up the steps. Panel 4: Medium shot. Dora sniffs the doorway. All panels must be consistent as one beat-to-beat story. Style: premium luminous 3D animated feature-film, 4K animated movie look."

PROMPT2="premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric warm candlelight and arabesque lamp glow, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look. CHARACTER LOCKS: @image1 = Aisha. @image2 = Dora. @image3 = Niura, tiny white snake. @image4 = Djinn. LOCATION REFERENCE: @image5 = House in the Rocks Interior. @image6 = Starry Night View. SCENE: Night scene. Warm candlelight. Aisha finds peace looking at the starry night sky. Niura voices concerns. Create 2x2 cinematic grid with 4 panels: Panel 1: Medium wide interior. Aisha sits by fire pit, looking at stars. Panel 2: Close-up on Aisha's face reflecting fire. Panel 3: Medium shot on Niura looking at Aisha with concern. Panel 4: Tight two-shot. Aisha looks resolute, touching Talisman. All panels must be consistent as one beat-to-beat story. Style: premium luminous 3D animated feature-film, 4K animated movie look."

echo "Starting generation for Task 39..."

"$NODE" "$NPX" pixverse-cli create image --prompt "$PROMPT1" --images "$AISHA" "$DJINN_CARD" "$REF_401" --model "$MODEL" --quality "$QUALITY" --aspect-ratio 16:9 --json
sleep 10
"$NODE" "$NPX" pixverse-cli create image --prompt "$PROMPT2" --images "$AISHA" "$DJINN_CARD" "$REF_395" --model "$MODEL" --quality "$QUALITY" --aspect-ratio 16:9 --json

echo "Done!"
