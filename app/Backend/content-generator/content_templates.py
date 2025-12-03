"""
Content Templates - Prompts for AI-generated learning content
"""

class ContentTemplates:
    @staticmethod
    def text_mode_prompt(topic: str, difficulty: str, roadmap_id: str) -> str:
        """Generate prompt for text-based learning content"""
        return f"""Generate comprehensive text-based learning content for the following topic:

**Topic**: {topic}
**Roadmap**: {roadmap_id}
**Difficulty Level**: {difficulty}

Please provide the following in a structured format:

1. **Concept Explanation**:
   - Clear, beginner-friendly explanation of the concept
   - Key terminology and definitions
   - How it relates to real-world applications
   - Step-by-step breakdown if applicable

2. **Code Examples** (if applicable):
   - Provide 2-3 practical code examples
   - Include comments explaining each line
   - Progress from simple to more complex examples
   - Use modern, industry-standard syntax

3. **Real-World Analogy**:
   - Create a relatable analogy to explain the concept
   - Make it memorable and easy to understand

4. **Key Points Summary**:
   - List 5-7 critical takeaways
   - Use bullet points
   - Focus on what learners must remember

**Content Style**: 
- Write in the style of W3Schools and GeeksforGeeks
- Be concise yet comprehensive
- Use simple language
- Include practical examples
- Avoid jargon unless explained

**Format your response as JSON**:
{{
  "conceptExplanation": "...",
  "codeExamples": ["...", "..."],
  "realWorldAnalogy": "...",
  "keyPoints": ["...", "..."]
}}"""

    @staticmethod
    def audio_script_prompt(topic: str, difficulty: str) -> str:
        """Generate prompt for audio narration script"""
        return f"""Create a 3-5 minute audio tutorial script for the following topic:

**Topic**: {topic}
**Difficulty Level**: {difficulty}

The script should be written as if a friendly tutor is speaking directly to the learner. Include:

1. **Introduction** (30 seconds):
   - Warm greeting
   - Brief overview of what will be covered
   - Why this topic matters

2. **Main Content** (2-3 minutes):
   - Clear explanation of the concept
   - Step-by-step walkthrough
   - Practical examples
   - Common mistakes to avoid

3. **Summary** (30-60 seconds):
   - Quick recap of key points
   - Encouragement
   - Next steps suggestion

**Style Guidelines**:
- Conversational and friendly tone
- Use "you" to address the learner
- Include natural pauses (indicate with "...")
- Add emphasis where needed (indicate with *italics*)
- Keep sentences short and clear

**Format your response as JSON**:
{{
  "script": "...",
  "estimatedDuration": "3-5 minutes"
}}"""

    @staticmethod
    def mindmap_prompt(topic: str, difficulty: str) -> str:
        """Generate prompt for mindmap/visual structure"""
        return f"""Create a structured mindmap outline for the following topic:

**Topic**: {topic}
**Difficulty Level**: {difficulty}

Design a visual learning structure with:

1. **Main Concept**: 
   - Central topic/idea (single clear statement)

2. **Sub Concepts** (3-6 items):
   - Key components or subtopics
   - Logical breakdown of the main concept

3. **Use Cases** (2-4 items):
   - Practical applications
   - Real-world scenarios
   - When to use this concept

4. **Common Mistakes** (2-4 items):
   - Frequent errors beginners make
   - Misconceptions to avoid
   - Best practices

**Format your response as JSON**:
{{
  "mainConcept": "...",
  "subConcepts": ["...", "..."],
  "useCases": ["...", "..."],
  "commonMistakes": ["...", "..."]
}}"""

    @staticmethod
    def video_curation_prompt(topic: str, difficulty: str) -> str:
        """Generate prompt for video link curation"""
        return f"""Suggest 2-3 high-quality educational video resources for the following topic:

**Topic**: {topic}
**Difficulty Level**: {difficulty}

For each video, provide:
1. **Title**: Clear, descriptive title
2. **URL**: YouTube or educational platform link
3. **Description**: What the learner will gain (2-3 sentences)
4. **Duration**: Approximate video length

**Criteria**:
- Reputable educational channels only
- Clear audio and visuals
- Appropriate for {difficulty} level
- Published within last 3 years (when possible)

**Format your response as JSON**:
{{
  "videos": [
    {{
      "title": "...",
      "url": "https://www.youtube.com/watch?v=...",
      "description": "...",
      "duration": "10:30"
    }}
  ]
}}"""

    @staticmethod
    def intelligence_layer_prompt(topic: str, difficulty: str) -> str:
        """Generate prompt for learning goals, recap, practice, and challenge"""
        return f"""Create the intelligence layer components for this learning topic:

**Topic**: {topic}
**Difficulty Level**: {difficulty}

Please provide:

1. **Learning Goals** (3-5 items):
   - What the learner will be able to do after this lesson
   - Start with action verbs (Understand, Implement, Explain, etc.)
   - Be specific and measurable

2. **Mini Recap** (2-3 sentences):
   - Quick summary of what was covered
   - Reinforcement of key concept
   - Connection to broader context

3. **Practice Suggestions** (3-5 items):
   - Hands-on exercises
   - Small projects or tasks
   - Progressive difficulty
   - Can be completed in 15-30 minutes each

4. **Optional Challenge** (1 item):
   - Advanced task for those who want to go deeper
   - Combines multiple concepts
   - Real-world application
   - May take 1-2 hours

**Format your response as JSON**:
{{
  "learningGoals": ["...", "..."],
  "miniRecap": "...",
  "practiceSuggestions": ["...", "..."],
  "optionalChallenge": "..."
}}"""

    @staticmethod
    def get_complete_prompt(topic: str, difficulty: str, roadmap_id: str) -> dict:
        """Get all prompts for a topic"""
        return {
            'text': ContentTemplates.text_mode_prompt(topic, difficulty, roadmap_id),
            'audio': ContentTemplates.audio_script_prompt(topic, difficulty),
            'mindmap': ContentTemplates.mindmap_prompt(topic, difficulty),
            'video': ContentTemplates.video_curation_prompt(topic, difficulty),
            'intelligence': ContentTemplates.intelligence_layer_prompt(topic, difficulty)
        }


if __name__ == '__main__':
    # Test template generation
    print("\n=== Content Template Test ===\n")
    
    prompts = ContentTemplates.get_complete_prompt(
        topic="HTML Basics",
        difficulty="Beginner",
        roadmap_id="frontend-development"
    )
    
    print("Text Mode Prompt (excerpt):")
    print(prompts['text'][:200] + "...\n")
    
    print("Audio Script Prompt (excerpt):")
    print(prompts['audio'][:200] + "...\n")
    
    print("✓ All prompts generated successfully")
