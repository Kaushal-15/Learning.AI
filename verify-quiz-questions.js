#!/usr/bin/env node

/**
 * Verify Quiz Questions
 * Check that all question files are properly formatted and accessible
 */

const fs = require('fs').promises;
const path = require('path');

async function verifyQuizQuestions() {
  console.log('🔍 Verifying Quiz Questions...\n');

  const questionsDir = 'app/Backend/Questions';
  
  try {
    const files = await fs.readdir(questionsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} question files:\n`);
    
    for (const file of jsonFiles) {
      const filePath = path.join(questionsDir, file);
      console.log(`📄 Checking ${file}...`);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        
        if (!data.questions || !Array.isArray(data.questions)) {
          console.log(`   ❌ No questions array found`);
          continue;
        }
        
        const questions = data.questions;
        console.log(`   📊 Total questions: ${questions.length}`);
        
        // Check question structure
        let validQuestions = 0;
        let easyCount = 0, mediumCount = 0, hardCount = 0;
        
        for (const q of questions) {
          if (q.questionId && q.question && q.options && q.answer && q.difficulty) {
            validQuestions++;
            
            switch (q.difficulty) {
              case 'easy': easyCount++; break;
              case 'medium': mediumCount++; break;
              case 'hard': hardCount++; break;
            }
          }
        }
        
        console.log(`   ✅ Valid questions: ${validQuestions}/${questions.length}`);
        console.log(`   📈 Difficulty distribution: Easy(${easyCount}) Medium(${mediumCount}) Hard(${hardCount})`);
        
        // Check for common issues
        const issues = [];
        
        // Check if answers match options
        for (const q of questions.slice(0, 5)) { // Check first 5 questions
          if (!q.options.includes(q.answer)) {
            // Check if it's letter-based answer (A, B, C, D)
            if (/^[A-D]$/.test(q.answer)) {
              const letterIndex = q.answer.charCodeAt(0) - 65;
              if (letterIndex >= q.options.length) {
                issues.push(`Question ${q.questionId}: Letter answer ${q.answer} out of range`);
              }
            } else {
              issues.push(`Question ${q.questionId}: Answer "${q.answer}" not found in options`);
            }
          }
        }
        
        if (issues.length > 0) {
          console.log(`   ⚠️  Issues found:`);
          issues.forEach(issue => console.log(`      - ${issue}`));
        } else {
          console.log(`   ✅ No issues found in sample questions`);
        }
        
      } catch (parseError) {
        console.log(`   ❌ Error parsing JSON: ${parseError.message}`);
      }
      
      console.log('');
    }
    
    // Check roadmap mapping
    console.log('🗺️  Checking roadmap mapping...');
    const roadmapMapping = {
      'frontend': 'frontend.json',
      'backend': 'backend.json',
      'full-stack': 'full-stack.json',
      'mobile': 'mobile-app.json',
      'ai-ml': 'ai-machine-learning.json',
      'devops': 'devops-cloud.json',
      'database': 'database-data-science.json',
      'cybersecurity': 'cybersecurity.json'
    };
    
    for (const [roadmapId, expectedFile] of Object.entries(roadmapMapping)) {
      const exists = jsonFiles.includes(expectedFile);
      console.log(`   ${exists ? '✅' : '❌'} ${roadmapId} -> ${expectedFile} ${exists ? 'exists' : 'missing'}`);
    }
    
    console.log('\n✅ Quiz Questions Verification Complete!');
    
  } catch (error) {
    console.error('❌ Error verifying questions:', error);
  }
}

// Run verification
verifyQuizQuestions();