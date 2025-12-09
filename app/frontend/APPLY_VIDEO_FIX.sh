#!/bin/bash

echo "🔧 Applying Video Embed Fix to LearnPaths.jsx"
echo "=============================================="
echo ""

FILE="src/components/LearnPaths.jsx"

# Check if file exists
if [ ! -f "$FILE" ]; then
    echo "❌ Error: $FILE not found!"
    echo "Make sure you're running this from app/frontend directory"
    exit 1
fi

# Create backup
BACKUP="${FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$FILE" "$BACKUP"
echo "✅ Backup created: $BACKUP"
echo ""

# Apply the fix using sed
echo "Applying fix..."

# This is a simplified version - manual edit is recommended
echo "⚠️  MANUAL EDIT RECOMMENDED"
echo ""
echo "Please make these changes in $FILE:"
echo ""
echo "1. Find line ~510:"
echo "   {generatedContent.video.links && generatedContent.video.links.length > 0 ? ("
echo ""
echo "2. Replace with:"
echo "   {(generatedContent.video.videos || generatedContent.video.links) && (generatedContent.video.videos?.length > 0 || generatedContent.video.links?.length > 0) ? ("
echo ""
echo "3. Find line ~512:"
echo "   generatedContent.video.links.map((video, idx) => ("
echo ""
echo "4. Replace with:"
echo "   (generatedContent.video.videos || generatedContent.video.links).map((video, idx) => ("
echo ""
echo "5. Find line ~516:"
echo "   src={video.url}"
echo ""
echo "6. Replace with:"
echo "   src={video.embedUrl || video.url}"
echo ""
echo "7. After the duration span (line ~527), add:"
echo "   {video.searchUrl && ("
echo "     <a "
echo "       href={video.searchUrl} "
echo "       target=\"_blank\" "
echo "       rel=\"noopener noreferrer\""
echo "       className=\"text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block\""
echo "     >"
echo "       Search on YouTube →"
echo "     </a>"
echo "   )}"
echo ""
echo "=============================================="
echo "See VIDEO_FIX.md for detailed instructions"
