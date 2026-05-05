#!/bin/bash
# PixVerse Download Favorites — Aisha Pipeline
# Downloads all favorited images from PixVerse and outputs them to the specified directory.
# Usage: ./pixverse-download-favs.sh [output_dir] [date_filter]

OUTPUT_DIR="${1:-./favorites-$(date +%Y%m%d)}"
DATE_FILTER="${2:-today}"

mkdir -p "$OUTPUT_DIR"

echo "🎬 Downloading PixVerse Favorites"
echo "================================="
echo "Output: $OUTPUT_DIR"
echo "Date filter: $DATE_FILTER"
echo ""

# List favorites and download
pixverse list favorites --date "$DATE_FILTER" --json | while read -r line; do
  IMAGE_ID=$(echo "$line" | jq -r '.id')
  IMAGE_URL=$(echo "$line" | jq -r '.url')
  PROMPT=$(echo "$line" | jq -r '.prompt')
  MODEL=$(echo "$line" | jq -r '.model')
  
  if [ -n "$IMAGE_URL" ] && [ "$IMAGE_URL" != "null" ]; then
    FILENAME="${IMAGE_ID}_${MODEL}.png"
    echo "📥 Downloading: $FILENAME"
    curl -sL "$IMAGE_URL" -o "$OUTPUT_DIR/$FILENAME"
    
    # Save prompt alongside image
    echo "$PROMPT" > "$OUTPUT_DIR/${IMAGE_ID}_prompt.txt"
  fi
done

echo ""
echo "✅ Download complete!"
echo "📁 Files in $OUTPUT_DIR:"
ls -1 "$OUTPUT_DIR" | head -20
