"""
Daily Learning Content Generator
Generates multimodal learning content for all roadmaps using AI
"""
import json
import os
import sys
import argparse
from datetime import datetime
from typing import Dict, List, Optional
from pymongo import MongoClient
from roadmap_mapper import RoadmapMapper
from content_templates import ContentTemplates

# Try to import transformers, but allow running in dry-run mode without it
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("⚠️  Warning: transformers not installed. Running in dry-run mode only.")


class ContentGenerator:
    def __init__(self, mongo_uri: str = "mongodb://localhost:27017/", 
                 db_name: str = "dynamic-mcq-system",
                 use_ai: bool = True):
        self.mongo_client = MongoClient(mongo_uri)
        self.db = self.mongo_client[db_name]
        self.collection = self.db['dailylearningplans']
        self.mapper = RoadmapMapper()
        self.use_ai = use_ai and TRANSFORMERS_AVAILABLE
        self.model = None
        self.tokenizer = None
        
        if self.use_ai:
            print("🤖 AI mode enabled")
        else:
            print("📝 Template mode (no AI generation)")
    
    def load_model(self):
        """Load Qwen model for content generation"""
        if not self.use_ai:
            print("⚠️  Skipping model load (AI disabled)")
            return
            
        try:
            model_name = "Qwen/Qwen2.5-0.5B-Instruct"
            print(f"Loading model: {model_name}...")
            
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float32,
                device_map="cpu"
            )
            print("✓ Model loaded successfully")
        except Exception as e:
            print(f"✗ Error loading model: {str(e)}")
            print("Falling back to template mode")
            self.use_ai = False
    
    def generate_content_with_ai(self, prompt: str, max_length: int = 1024) -> str:
        """Generate content using AI model"""
        if not self.use_ai or not self.model:
            return self._get_template_content(prompt)
        
        try:
            messages = [
                {"role": "system", "content": "You are an expert educator creating high-quality learning content. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ]
            
            text = self.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            
            model_inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)
            
            generated_ids = self.model.generate(
                **model_inputs,
                max_new_tokens=max_length,
                temperature=0.7,
                do_sample=True,
                top_p=0.9
            )
            
            generated_ids = [
                output_ids[len(input_ids):] 
                for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
            ]
            
            response = self.tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            # Extract JSON from response
            try:
                # Try to find JSON in the response
                start_idx = response.find('{')
                end_idx = response.rfind('}') + 1
                if start_idx != -1 and end_idx > start_idx:
                    json_str = response[start_idx:end_idx]
                    json.loads(json_str)  # Validate JSON
                    return json_str
                else:
                    return self._get_template_content(prompt)
            except json.JSONDecodeError:
                return self._get_template_content(prompt)
                
        except Exception as e:
            print(f"⚠️  AI generation error: {str(e)}")
            return self._get_template_content(prompt)
    
    def _get_template_content(self, prompt: str) -> str:
        """Generate template content when AI is unavailable"""
        # Extract topic from prompt
        topic_line = [line for line in prompt.split('\n') if '**Topic**:' in line]
        topic = topic_line[0].split('**Topic**:')[1].strip() if topic_line else "Topic"
        
        # Determine which type of content based on prompt
        if '"conceptExplanation"' in prompt:
            return json.dumps({
                "conceptExplanation": f"Learn about {topic}. This fundamental concept is essential for understanding modern web development. We'll cover the basics, practical applications, and best practices.",
                "codeExamples": [
                    f"// Example 1: Basic {topic}\nconsole.log('Learning {topic}');",
                    f"// Example 2: Advanced {topic}\nconst result = advanced{topic.replace(' ', '')}();"
                ],
                "realWorldAnalogy": f"Think of {topic} like a building block - each piece serves a specific purpose and connects with others to create something greater.",
                "keyPoints": [
                    f"Understand the core concept of {topic}",
                    f"Know when and how to use {topic}",
                    "Practice with real examples",
                    "Avoid common pitfalls",
                    "Build on this foundation"
                ]
            })
        elif '"script"' in prompt:
            return json.dumps({
                "script": f"Hello! Today we're diving into {topic}. This is an exciting concept that you'll use frequently in your development journey. Let me walk you through it step by step... First, let's understand what {topic} is all about. Then, we'll look at practical examples. Finally, I'll share some pro tips to help you master this. Remember, practice makes perfect!",
                "estimatedDuration": "3-5 minutes"
            })
        elif '"mainConcept"' in prompt:
            return json.dumps({
                "mainConcept": topic,
                "subConcepts": [
                    f"Basic {topic} concepts",
                    f"Practical applications",
                    f"Advanced techniques",
                    f"Best practices"
                ],
                "useCases": [
                    f"Building web applications",
                    f"Solving real-world problems",
                    f"Optimizing performance"
                ],
                "commonMistakes": [
                    f"Misunderstanding {topic} fundamentals",
                    "Not following best practices",
                    "Overcomplicating simple solutions"
                ]
            })
        elif '"videos"' in prompt:
            return json.dumps({
                "videos": [
                    {
                        "title": f"{topic} Tutorial for Beginners",
                        "url": "https://www.youtube.com/watch?v=placeholder",
                        "description": f"Comprehensive introduction to {topic} covering all fundamental concepts with practical examples.",
                        "duration": "15:30"
                    },
                    {
                        "title": f"Mastering {topic}",
                        "url": "https://www.youtube.com/watch?v=placeholder",
                        "description": f"Advanced {topic} techniques and real-world applications from industry experts.",
                        "duration": "22:45"
                    }
                ]
            })
        else:  # Intelligence layer
            return json.dumps({
                "learningGoals": [
                    f"Understand the fundamentals of {topic}",
                    f"Implement {topic} in practical projects",
                    f"Explain {topic} concepts clearly"
                ],
                "miniRecap": f"Today we explored {topic}, learning its core concepts and practical applications. This knowledge forms a crucial foundation for your development journey.",
                "practiceSuggestions": [
                    f"Create a simple project using {topic}",
                    f"Practice with {topic} exercises",
                    f"Review code examples and experiment"
                ],
                "optionalChallenge": f"Build a complete application that demonstrates advanced {topic} concepts and integrates with other technologies you've learned."
            })
    
    def generate_day_content(self, roadmap_id: str, day: int, week: int, 
                           topic: str, difficulty: str) -> Dict:
        """Generate complete content for one day"""
        print(f"  Generating content for Day {day}: {topic}")
        
        # Get all prompts
        prompts = ContentTemplates.get_complete_prompt(topic, difficulty, roadmap_id)
        
        # Generate each component
        text_content = json.loads(self.generate_content_with_ai(prompts['text']))
        audio_content = json.loads(self.generate_content_with_ai(prompts['audio']))
        mindmap_content = json.loads(self.generate_content_with_ai(prompts['mindmap']))
        video_content = json.loads(self.generate_content_with_ai(prompts['video']))
        intelligence_content = json.loads(self.generate_content_with_ai(prompts['intelligence']))
        
        # Construct the complete document
        day_content = {
            'roadmapId': roadmap_id,
            'week': week,
            'day': day,
            'topic': topic,
            'difficultyLevel': difficulty,
            'learningGoals': intelligence_content.get('learningGoals', []),
            'learningOptions': {
                'text': {
                    'sources': ['w3schools', 'geeksforgeeks', 'notebooklm'],
                    'conceptExplanation': text_content.get('conceptExplanation', ''),
                    'codeExamples': text_content.get('codeExamples', []),
                    'realWorldAnalogy': text_content.get('realWorldAnalogy', ''),
                    'keyPoints': text_content.get('keyPoints', [])
                },
                'video': {
                    'links': video_content.get('videos', [])
                },
                'audio': {
                    'script': audio_content.get('script', ''),
                    'estimatedDuration': audio_content.get('estimatedDuration', '3-5 minutes')
                },
                'images': {
                    'mindmap': mindmap_content
                }
            },
            'miniRecap': intelligence_content.get('miniRecap', ''),
            'practiceSuggestions': intelligence_content.get('practiceSuggestions', []),
            'optionalChallenge': intelligence_content.get('optionalChallenge', '')
        }
        
        return day_content
    
    def generate_roadmap_content(self, roadmap_id: str, limit_days: Optional[int] = None,
                                dry_run: bool = False) -> List[Dict]:
        """Generate content for entire roadmap"""
        print(f"\n{'='*60}")
        print(f"Generating content for: {roadmap_id}")
        print(f"{'='*60}\n")
        
        # Get day mappings
        day_mappings = self.mapper.map_to_days(roadmap_id)
        
        if limit_days:
            day_mappings = day_mappings[:limit_days]
            print(f"⚠️  Limited to first {limit_days} days\n")
        
        generated_content = []
        
        for mapping in day_mappings:
            try:
                content = self.generate_day_content(
                    roadmap_id=mapping['roadmapId'],
                    day=mapping['day'],
                    week=mapping['week'],
                    topic=mapping['topic'],
                    difficulty=mapping['difficultyLevel']
                )
                generated_content.append(content)
                
                if not dry_run:
                    # Insert into MongoDB
                    self.collection.replace_one(
                        {'roadmapId': roadmap_id, 'day': mapping['day']},
                        content,
                        upsert=True
                    )
                    print(f"    ✓ Saved to database")
                else:
                    print(f"    ✓ Generated (dry-run, not saved)")
                    
            except Exception as e:
                print(f"    ✗ Error: {str(e)}")
        
        print(f"\n✓ Completed {roadmap_id}: {len(generated_content)} days generated\n")
        return generated_content
    
    def generate_all_roadmaps(self, dry_run: bool = False):
        """Generate content for all roadmaps"""
        roadmaps = [
            'frontend-development',
            'backend-development',
            'full-stack-development',
            'mobile-app-development',
            'ai-machine-learning',
            'devops-cloud',
            'database-data-science',
            'cybersecurity'
        ]
        
        print(f"\n{'#'*60}")
        print("Daily Learning Content Generator")
        print(f"Mode: {'DRY RUN' if dry_run else 'PRODUCTION'}")
        print(f"AI Generation: {'ENABLED' if self.use_ai else 'DISABLED'}")
        print(f"{'#'*60}\n")
        
        total_generated = 0
        
        for roadmap_id in roadmaps:
            try:
                content = self.generate_roadmap_content(roadmap_id, dry_run=dry_run)
                total_generated += len(content)
            except Exception as e:
                print(f"✗ Error generating {roadmap_id}: {str(e)}\n")
        
        print(f"\n{'#'*60}")
        print(f"Generation Complete!")
        print(f"Total days generated: {total_generated}")
        print(f"{'#'*60}\n")


def main():
    parser = argparse.ArgumentParser(description='Generate daily learning content')
    parser.add_argument('--roadmap', type=str, default='all',
                      help='Roadmap ID or "all" for all roadmaps')
    parser.add_argument('--limit-days', type=int, default=None,
                      help='Limit number of days to generate')
    parser.add_argument('--dry-run', type=bool, default=False,
                      help='Generate content without saving to database')
    parser.add_argument('--no-ai', action='store_true',
                      help='Use template content instead of AI generation')
    parser.add_argument('--mongo-uri', type=str, default='mongodb://localhost:27017/',
                      help='MongoDB connection URI')
    parser.add_argument('--db-name', type=str, default='dynamic-mcq-system',
                      help='Database name')
    
    args = parser.parse_args()
    
    # Initialize generator
    generator = ContentGenerator(
        mongo_uri=args.mongo_uri,
        db_name=args.db_name,
        use_ai=not args.no_ai
    )
    
    # Load AI model if needed
    if generator.use_ai:
        generator.load_model()
    
    # Generate content
    if args.roadmap == 'all':
        generator.generate_all_roadmaps(dry_run=args.dry_run)
    else:
        generator.generate_roadmap_content(
            args.roadmap, 
            limit_days=args.limit_days,
            dry_run=args.dry_run
        )


if __name__ == '__main__':
    main()
