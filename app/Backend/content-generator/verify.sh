#!/bin/bash
# Verify Daily Learning Content Generation

echo "========================================="
echo "Daily Learning Content - Verification"
echo "========================================="
echo ""

# Check MongoDB connection
echo "1. Checking MongoDB connection..."
mongosh learning-ai --quiet --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ MongoDB connected"
else
    echo "   ✗ MongoDB not connected"
    exit 1
fi

# Count total documents
echo ""
echo "2. Counting generated content..."
TOTAL=$(mongosh learning-ai --quiet --eval "db.dailylearningplans.countDocuments()")
echo "   ✓ Total days generated: $TOTAL"

# Check each roadmap
echo ""
echo "3. Roadmap breakdown:"
ROADMAPS=("frontend-development" "backend-development" "full-stack-development" "mobile-app-development" "ai-machine-learning" "devops-cloud" "database-data-science" "cybersecurity")

for roadmap in "${ROADMAPS[@]}"; do
    COUNT=$(mongosh learning-ai --quiet --eval "db.dailylearningplans.countDocuments({roadmapId: '$roadmap'})")
    echo "   • $roadmap: $COUNT days"
done

# Sample content check
echo ""
echo "4. Sample content (Frontend Day 1):"
mongosh learning-ai --quiet --eval "
  const doc = db.dailylearningplans.findOne({roadmapId: 'frontend-development', day: 1});
  if (doc) {
    print('   ✓ Topic: ' + doc.topic);
    print('   ✓ Difficulty: ' + doc.difficultyLevel);
    print('   ✓ Learning Goals: ' + doc.learningGoals.length + ' goals');
    print('   ✓ Text mode: ' + (doc.learningOptions.text ? 'Yes' : 'No'));
    print('   ✓ Video mode: ' + (doc.learningOptions.video ? 'Yes' : 'No'));
    print('   ✓ Audio mode: ' + (doc.learningOptions.audio ? 'Yes' : 'No'));
    print('   ✓ Images mode: ' + (doc.learningOptions.images ? 'Yes' : 'No'));
  } else {
    print('   ✗ No content found');
  }
"

# Check difficulty distribution
echo ""
echo "5. Difficulty distribution:"
echo "   Beginner:"
mongosh learning-ai --quiet --eval "print('     ' + db.dailylearningplans.countDocuments({difficultyLevel: 'Beginner'}) + ' days')"
echo "   Intermediate:" 
mongosh learning-ai --quiet --eval "print('     ' + db.dailylearningplans.countDocuments({difficultyLevel: 'Intermediate'}) + ' days')"
echo "   Advanced:"
mongosh learning-ai --quiet --eval "print('     ' + db.dailylearningplans.countDocuments({difficultyLevel: 'Advanced'}) + ' days')"

echo ""
echo "========================================="
echo "✓ Verification Complete!"
echo "========================================="
