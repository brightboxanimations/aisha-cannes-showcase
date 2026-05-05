#!/bin/bash
# Aisha Director's Cut — Backup Script
# Creates timestamped backups of all storyboard data
#
# Usage: ./tools/backup.sh [backup_dir]
# Default backup dir: ~/Documents/aisha-backups/

BACKUP_ROOT="${1:-$HOME/Documents/aisha-backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STORYBOARD_DIR="$PROJECT_DIR/public/assets/storyboard"

echo "🎬 Aisha Director's Cut — Backup"
echo "================================="
echo "Source:  $STORYBOARD_DIR"
echo "Backup:  $BACKUP_DIR"
echo ""

mkdir -p "$BACKUP_DIR"

# 1. Backup storyboard data (JSON files - small, critical)
echo "📋 Backing up storyboard data..."
cp "$STORYBOARD_DIR/storyboard-data.json" "$BACKUP_DIR/"

# 2. Backup task files
echo "📋 Backing up task files..."
mkdir -p "$BACKUP_DIR/tasks"
cp -r "$STORYBOARD_DIR/tasks/" "$BACKUP_DIR/tasks/" 2>/dev/null

# 3. Backup uploaded images (large but important)
echo "🖼️  Backing up uploaded images..."
rsync -a --progress "$STORYBOARD_DIR/uploads/" "$BACKUP_DIR/uploads/" 2>/dev/null || \
  cp -r "$STORYBOARD_DIR/uploads/" "$BACKUP_DIR/uploads/"

# 4. Backup skills
if [ -d "$STORYBOARD_DIR/skills" ]; then
  echo "⚙️  Backing up skills..."
  cp -r "$STORYBOARD_DIR/skills/" "$BACKUP_DIR/skills/"
fi

# Calculate size
SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo ""
echo "✅ Backup complete!"
echo "📁 Location: $BACKUP_DIR"
echo "📊 Size: $SIZE"
echo ""

# Keep only last 10 backups
BACKUP_COUNT=$(ls -1d "$BACKUP_ROOT"/20* 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 10 ]; then
  echo "🗑️  Cleaning old backups (keeping last 10)..."
  ls -1d "$BACKUP_ROOT"/20* | head -n -10 | xargs rm -rf
fi

echo "📚 Total backups: $(ls -1d "$BACKUP_ROOT"/20* 2>/dev/null | wc -l | tr -d ' ')"
