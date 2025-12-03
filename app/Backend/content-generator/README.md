# Daily Learning Content Generator

This directory contains the AI-powered content generator that creates multimodal learning content for all roadmaps.

## 📁 Files

- **`generator.py`** - Main content generation script
- **`roadmap_mapper.py`** - Maps roadmap topics to days/weeks
- **`content_templates.py`** - AI prompt templates for content generation
- **`requirements.txt`** - Python dependencies
- **`run.sh`** - Convenient run script

## 🚀 Quick Start

### Option 1: Using the run script (Recommended)

```bash
# Generate content for all roadmaps (template mode, no AI)
./run.sh all "" false --no-ai

# Generate content for frontend roadmap (first 2 days, dry-run)
./run.sh frontend-development 2 true --no-ai

# Generate content for all roadmaps with AI (requires model download)
./run.sh all
```

### Option 2: Manual Python execution

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run generator
python generator.py --roadmap all --no-ai --dry-run true
```

## 📖 Usage

### Command Line Arguments

- `--roadmap` - Roadmap ID or "all" for all roadmaps
- `--limit-days` - Limit number of days to generate
- `--dry-run` - Generate content without saving to database
- `--no-ai` - Use template content instead of AI generation
- `--mongo-uri` - MongoDB connection URI (default: mongodb://localhost:27017/)
- `--db-name` - Database name (default: learning-ai)

### Examples

```bash
# Test with one roadmap, one day, template mode
python generator.py --roadmap frontend-development --limit-days 1 --dry-run true --no-ai

# Generate all content for frontend with AI
python generator.py --roadmap frontend-development

# Generate all roadmaps with template content (fast)
python generator.py --roadmap all --no-ai

# Generate all roadmaps with AI (slow, requires GPU recommended)
python generator.py --roadmap all
```

## 🤖 AI vs Template Mode

### Template Mode (`--no-ai`)
- **Fast**: Generates content instantly
- **No dependencies**: No AI model download required
- **Good for testing**: Perfect for development and testing
- **Limited quality**: Uses predefined templates

### AI Mode (default)
- **High quality**: Uses Qwen AI model for content generation
- **Slow**: First run downloads ~500MB model
- **GPU recommended**: CPU works but slower
- **Best results**: Contextual, topic-specific content

## 📊 Roadmaps Supported

The generator supports all 8 roadmaps:
1. frontend-development
2. backend-development
3. full-stack-development
4. mobile-app-development
5. ai-machine-learning
6. devops-cloud
7. database-data-science
8. cybersecurity

## 🗂️ Output Structure

Each day's content includes:

### 4 Learning Modes
- **Text**: W3Schools/GeeksforGeeks style explanations with code examples
- **Video**: Curated video links with descriptions
- **Audio**: Tutor-style narration script (3-5 minutes)
- **Images**: Mindmap structure with concepts and use cases

### Intelligence Layer
- Learning goals
- Mini recap
- Practice suggestions
- Optional challenge

## 💾 Database Schema

Content is saved to MongoDB collection `dailylearningplans`:

```javascript
{
  roadmapId: "frontend-development",
  week: 1,
  day: 1,
  topic: "HTML Basics",
  difficultyLevel: "Beginner",
  learningGoals: [...],
  learningOptions: {
    text: { conceptExplanation, codeExamples, ... },
    video: { links: [...] },
    audio: { script, estimatedDuration },
    images: { mindmap: {...} }
  },
  miniRecap: "...",
  practiceSuggestions: [...],
  optionalChallenge: "..."
}
```

## 🧪 Testing

### Quick Test (Template Mode)
```bash
# Test roadmap mapper
python roadmap_mapper.py

# Test content templates
python content_templates.py

# Generate 1 day of content (dry-run)
python generator.py --roadmap frontend-development --limit-days 1 --dry-run true --no-ai
```

### Full Test (AI Mode)
```bash
# Generate 1 day with AI (dry-run)
python generator.py --roadmap frontend-development --limit-days 1 --dry-run true

# Generate and save to database
python generator.py --roadmap frontend-development --limit-days 1
```

## ⏱️ Estimated Times

**Template Mode:**
- 1 day: ~1 second
- 1 roadmap (50 days): ~1 minute
- All 8 roadmaps: ~5-10 minutes

**AI Mode (CPU):**
- First run: +5 minutes (model download)
- 1 day: ~30-60 seconds
- 1 roadmap (50 days): ~30-40 minutes
- All 8 roadmaps: ~4-6 hours

**AI Mode (GPU):**
- 1 day: ~5-10 seconds
- 1 roadmap: ~5-10 minutes
- All 8 roadmaps: ~1-2 hours

## 🔧 Troubleshooting

### "transformers not installed"
Run: `pip install -r requirements.txt`

### "MongoDB connection failed"
Ensure MongoDB is running: `sudo systemctl start mongod`

### "Model download slow"
First run downloads Qwen model (~500MB). Subsequent runs use cached model.

### "Out of memory"
Use `--no-ai` flag or add `--limit-days` to generate fewer days at once.

## 📝 Notes

- Content quality improves with AI mode but requires more resources
- Template mode is perfect for testing and development
- Generated content can be edited manually in MongoDB
- Video links are placeholders in template mode (curated in AI mode)
