#!/bin/bash
# PixVerse Batch Generator for Aisha Cannes Showcase
# Usage: ./pixverse-batch.sh <prompts_dir> [delay_seconds]
# 
# Reads all .txt files from <prompts_dir> and generates images
# using 3 models: Nano Banana 2 (4K), Nano Banana Pro (2K), GPT2 Medium (2K)
# Each prompt is sent with a configurable delay (default: 20s) to avoid concurrency issues.

PROMPTS_DIR="${1:-.}"
DELAY="${2:-20}"
OUTPUT_DIR="$(pwd)/generated-$(date +%Y%m%d-%H%M%S)"
MODELS=("nano-banana-2" "nano-banana-pro" "gpt2-medium")
RESOLUTIONS=("4k" "2k" "2k")

mkdir -p "$OUTPUT_DIR"

echo "🎬 Aisha PixVerse Batch Generator"
echo "================================="
echo "Prompts directory: $PROMPTS_DIR"
echo "Delay between jobs: ${DELAY}s"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Count prompts
PROMPT_COUNT=$(ls -1 "$PROMPTS_DIR"/*.txt 2>/dev/null | wc -l | tr -d ' ')
echo "📋 Found $PROMPT_COUNT prompt files"
echo "🔄 Will generate $((PROMPT_COUNT * 3)) images (3 models × $PROMPT_COUNT prompts)"
echo ""

JOB=0
TOTAL=$((PROMPT_COUNT * 3))

for prompt_file in "$PROMPTS_DIR"/*.txt; do
  [ -f "$prompt_file" ] || continue
  PROMPT_NAME=$(basename "$prompt_file" .txt)
  PROMPT=$(cat "$prompt_file")
  
  for i in "${!MODELS[@]}"; do
    MODEL="${MODELS[$i]}"
    RES="${RESOLUTIONS[$i]}"
    JOB=$((JOB + 1))
    
    echo "[$JOB/$TOTAL] 🖼️  Generating: $PROMPT_NAME"
    echo "         Model: $MODEL | Resolution: $RES"
    
    # Generate image
    pixverse create image \
      --prompt "$PROMPT" \
      --model "$MODEL" \
      --resolution "$RES" \
      --output "$OUTPUT_DIR/${PROMPT_NAME}_${MODEL}_${RES}.png" \
      --json 2>&1 | tee -a "$OUTPUT_DIR/generation-log.json"
    
    # Also generate 2x2 grid variant
    pixverse create image \
      --prompt "$PROMPT" \
      --model "$MODEL" \
      --resolution "$RES" \
      --grid "2x2" \
      --output "$OUTPUT_DIR/${PROMPT_NAME}_${MODEL}_${RES}_grid.png" \
      --json 2>&1 | tee -a "$OUTPUT_DIR/generation-log.json"
    
    echo "         ✅ Done. Waiting ${DELAY}s..."
    sleep "$DELAY"
  done
done

echo ""
echo "🎉 Batch generation complete!"
echo "📁 Output: $OUTPUT_DIR"
echo "📊 Total images generated: $((JOB * 2)) (images + grids)"
ls -la "$OUTPUT_DIR"/*.png 2>/dev/null | wc -l | xargs -I{} echo "📸 {} files created"
