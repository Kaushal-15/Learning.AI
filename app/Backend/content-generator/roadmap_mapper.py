"""
Roadmap Mapper - Extract topics from Questions JSON and map to days/weeks
"""
import json
import os
from typing import Dict, List, Tuple
from collections import OrderedDict


class RoadmapMapper:
    def __init__(self, questions_dir: str = "../Questions"):
        self.questions_dir = questions_dir
        self.roadmap_topics = {}
        
    def load_questions_json(self, roadmap_id: str) -> Dict:
        """Load questions JSON for a roadmap"""
        # Map roadmap IDs to filenames
        filename_map = {
            'frontend-development': 'frontend.json',
            'backend-development': 'backend.json',
            'full-stack-development': 'full-stack.json',
            'mobile-app-development': 'mobile-app.json',
            'ai-machine-learning': 'ai-machine-learning.json',
            'devops-cloud': 'devops-cloud.json',
            'database-data-science': 'database-data-science.json',
            'cybersecurity': 'cybersecurity.json'
        }
        
        filename = filename_map.get(roadmap_id)
        if not filename:
            raise ValueError(f"Unknown roadmap ID: {roadmap_id}")
            
        filepath = os.path.join(self.questions_dir, filename)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Warning: Questions file not found: {filepath}")
            return {"roadmapId": roadmap_id, "questions": []}
    
    def extract_topics(self, roadmap_id: str) -> List[str]:
        """Extract unique topics from questions"""
        questions_data = self.load_questions_json(roadmap_id)
        questions = questions_data.get('questions', [])
        
        # Use OrderedDict to maintain insertion order and uniqueness
        topics_ordered = OrderedDict()
        
        for question in questions:
            topic = question.get('topic')
            if topic and topic not in topics_ordered:
                topics_ordered[topic] = True
        
        return list(topics_ordered.keys())
    
    def map_to_days(self, roadmap_id: str) -> List[Dict]:
        """Map topics to days (1 topic = 1 day)"""
        topics = self.extract_topics(roadmap_id)
        
        day_mappings = []
        for day_number, topic in enumerate(topics, start=1):
            week_number = ((day_number - 1) // 7) + 1
            
            day_mappings.append({
                'roadmapId': roadmap_id,
                'day': day_number,
                'week': week_number,
                'topic': topic,
                'difficultyLevel': self._assign_difficulty(day_number, len(topics))
            })
        
        return day_mappings
    
    def _assign_difficulty(self, day_number: int, total_days: int) -> str:
        """Assign difficulty level based on day progression"""
        # First 40% = Beginner, Next 40% = Intermediate, Last 20% = Advanced
        progress_percentage = (day_number / total_days) * 100
        
        if progress_percentage <= 40:
            return 'Beginner'
        elif progress_percentage <= 80:
            return 'Intermediate'
        else:
            return 'Advanced'
    
    def get_all_roadmaps_mapping(self) -> Dict[str, List[Dict]]:
        """Get day mappings for all roadmaps"""
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
        
        all_mappings = {}
        for roadmap_id in roadmaps:
            try:
                mappings = self.map_to_days(roadmap_id)
                all_mappings[roadmap_id] = mappings
                print(f"✓ Mapped {roadmap_id}: {len(mappings)} days")
            except Exception as e:
                print(f"✗ Error mapping {roadmap_id}: {str(e)}")
                all_mappings[roadmap_id] = []
        
        return all_mappings
    
    def get_roadmap_stats(self, roadmap_id: str) -> Dict:
        """Get statistics for a roadmap"""
        mappings = self.map_to_days(roadmap_id)
        
        difficulty_counts = {
            'Beginner': 0,
            'Intermediate': 0,
            'Advanced': 0
        }
        
        for mapping in mappings:
            difficulty = mapping['difficultyLevel']
            difficulty_counts[difficulty] += 1
        
        return {
            'roadmapId': roadmap_id,
            'totalDays': len(mappings),
            'totalWeeks': ((len(mappings) - 1) // 7) + 1 if mappings else 0,
            'difficultyBreakdown': difficulty_counts,
            'topics': [m['topic'] for m in mappings]
        }


if __name__ == '__main__':
    # Test the mapper
    mapper = RoadmapMapper()
    
    print("\n=== Roadmap Mapper Test ===\n")
    
    # Test frontend roadmap
    print("Frontend Development:")
    frontend_mappings = mapper.map_to_days('frontend-development')
    print(f"  Total days: {len(frontend_mappings)}")
    print(f"  First 3 topics: {[m['topic'] for m in frontend_mappings[:3]]}")
    
    print("\n" + "="*50 + "\n")
    
    # Get all roadmaps statistics
    print("All Roadmaps Statistics:\n")
    all_mappings = mapper.get_all_roadmaps_mapping()
    
    print("\n" + "="*50 + "\n")
    
    for roadmap_id in all_mappings:
        stats = mapper.get_roadmap_stats(roadmap_id)
        print(f"{roadmap_id}:")
        print(f"  Days: {stats['totalDays']}, Weeks: {stats['totalWeeks']}")
        print(f"  Difficulty: B={stats['difficultyBreakdown']['Beginner']}, "
              f"I={stats['difficultyBreakdown']['Intermediate']}, "
              f"A={stats['difficultyBreakdown']['Advanced']}")
        print()
