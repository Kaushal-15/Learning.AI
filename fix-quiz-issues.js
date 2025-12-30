#!/usr/bin/env node

/**
 * Fix Quiz Issues - Comprehensive fix for quiz functionality
 * 
 * Issues to fix:
 * 1. Quiz not loading questions properly
 * 2. Quiz completion not marking day as complete
 * 3. Ensure 60% threshold is working correctly
 */

const fs = require('fs').promises;
const path = require('path');

async function fixQuizIssues() {
  console.log('🔧 Fixing Quiz Issues...\n');

  try {
    // 1. Fix Quiz Component - Ensure proper question loading
    console.log('1. Fixing Quiz component question loading...');
    
    const quizPath = 'app/frontend/src/components/Quiz.jsx';
    let quizContent = await fs.readFile(quizPath, 'utf8');
    
    // Add better error handling and debugging for quiz loading
    const quizLoadingFix = `
  // Enhanced quiz loading with better error handling
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        console.log('Fetching quiz with ID:', id);
        const response = await fetch(\`\${API_BASE}/quiz/\${id}\`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        
        const data = await response.json();
        console.log('Quiz data received:', data);

        if (data.success && data.data) {
          const quizData = data.data;
          console.log('Quiz questions count:', quizData.questions?.length || 0);
          
          // Ensure quiz has questions
          if (!quizData.questions || quizData.questions.length === 0) {
            console.error('Quiz has no questions!');
            alert('This quiz has no questions. Please try creating a new quiz.');
            navigate('/dashboard');
            return;
          }
          
          setQuiz(quizData);
          setCurrentQuestionIndex(quizData.currentQuestionIndex || 0);

          // Calculate time left
          const elapsed = Math.floor((Date.now() - new Date(quizData.startedAt)) / 1000);
          const totalTime = quizData.timeLimit * 60;
          setTimeLeft(Math.max(0, totalTime - elapsed));

          if (quizData.status === 'completed') {
            setShowResults(true);
          }
        } else {
          console.error('Quiz fetch failed:', data.message);
          alert('Failed to load quiz: ' + (data.message || 'Unknown error'));
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
        alert('Error loading quiz: ' + error.message);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchQuiz();
    } else {
      console.error('No quiz ID provided');
      navigate('/dashboard');
    }
  }, [id, navigate]);`;

    // Replace the existing useEffect for quiz loading
    quizContent = quizContent.replace(
      /\/\/ Fetch quiz data[\s\S]*?}, \[id, navigate\]\);/,
      quizLoadingFix
    );

    await fs.writeFile(quizPath, quizContent);
    console.log('   ✅ Enhanced quiz loading with better error handling');

    // 2. Fix lesson completion logic
    console.log('\n2. Fixing lesson completion logic...');
    
    // Update the completion logic to be more explicit about the 60% threshold
    const completionFix = `
        // Check if we need to update lesson progress (60% threshold)
        if (lessonId && roadmapId) {
          const passedQuiz = completedQuiz.accuracy >= 60;
          console.log(\`Quiz completed with \${completedQuiz.accuracy}% accuracy. Passed: \${passedQuiz}\`);
          
          if (passedQuiz) {
            try {
              console.log('Marking lesson as complete...');
              const progressResponse = await fetch(\`\${API_BASE}/progress/complete-lesson\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  roadmapId,
                  lessonId,
                  timeSpent: Math.floor((Date.now() - new Date(completedQuiz.startedAt)) / 1000 / 60) || 15,
                  quizScore: completedQuiz.accuracy
                })
              });
              
              const progressData = await progressResponse.json();
              console.log('Lesson completion response:', progressData);
              
              if (progressData.success) {
                console.log('✅ Lesson marked as complete!');
                // Show success message
                setTimeout(() => {
                  alert(\`Congratulations! You passed with \${completedQuiz.accuracy}% and completed this lesson!\`);
                }, 1000);
              } else {
                console.error('Failed to mark lesson complete:', progressData.message);
              }
            } catch (progressError) {
              console.error('Error updating lesson progress:', progressError);
            }
          } else {
            console.log(\`Quiz score \${completedQuiz.accuracy}% is below 60% threshold. Lesson not marked as complete.\`);
            setTimeout(() => {
              alert(\`You scored \${completedQuiz.accuracy}%. You need at least 60% to complete this lesson. Try again!\`);
            }, 1000);
          }
        }`;

    quizContent = quizContent.replace(
      /\/\/ Check if we need to update lesson progress[\s\S]*?}\s*}/,
      completionFix
    );

    await fs.writeFile(quizPath, quizContent);
    console.log('   ✅ Enhanced lesson completion logic with 60% threshold');

    // 3. Fix LearnPaths component to ensure proper quiz creation
    console.log('\n3. Fixing LearnPaths quiz creation...');
    
    const learnPathsPath = 'app/frontend/src/components/LearnPaths.jsx';
    let learnPathsContent = await fs.readFile(learnPathsPath, 'utf8');
    
    // Enhance the handleTakeQuiz function
    const quizCreationFix = `
  const handleTakeQuiz = async () => {
    try {
      setLoading(true);
      console.log('Creating quiz for:', { roadmapId, topic: dayData.topic || dayData.title });

      // Create a quiz for this topic using the api service
      const response = await fetch(\`\${API_BASE}/quiz/create\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          roadmapType: roadmapId,
          difficulty: 'medium', // Initial difficulty (must be lowercase: easy, medium, hard, advanced)
          questionCount: 10,
          timeLimit: 15,
          topic: dayData.topic || dayData.title, // Pass topic to ensure relevance
          adaptiveDifficulty: true // Enable dynamic adaptive difficulty
        })
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const data = await response.json();
      console.log('Quiz creation response:', data);

      if (data.success && data.data) {
        console.log('Quiz created successfully with ID:', data.data._id);
        console.log('Quiz has', data.data.questions?.length || 0, 'questions');
        
        // Ensure quiz has questions before navigating
        if (!data.data.questions || data.data.questions.length === 0) {
          throw new Error('Created quiz has no questions');
        }
        
        // Navigate to the quiz with the MongoDB _id
        navigate(\`/quiz/\${data.data._id}\`, {
          state: {
            topic: dayData.topic || dayData.title,
            roadmapId,
            week,
            day,
            lessonId: \`week\${week}-day\${day}\`, // Pass lesson ID for progress update
            returnPath: location.pathname // Path to return to
          }
        });
      } else {
        throw new Error(data.message || 'Failed to create quiz');
      }
    } catch (err) {
      console.error('Error creating quiz:', err);
      alert('Error creating quiz: ' + err.message + '. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };`;

    learnPathsContent = learnPathsContent.replace(
      /const handleTakeQuiz = async \(\) => \{[\s\S]*?};/,
      quizCreationFix
    );

    await fs.writeFile(learnPathsPath, learnPathsContent);
    console.log('   ✅ Enhanced quiz creation with better error handling');

    // 4. Add quiz debugging endpoint to backend
    console.log('\n4. Adding quiz debugging endpoint...');
    
    const quizRoutesPath = 'app/Backend/routes/quizRoutes.js';
    let quizRoutesContent = await fs.readFile(quizRoutesPath, 'utf8');
    
    // Add debug endpoint before module.exports
    const debugEndpoint = `
// Debug endpoint to check quiz status
router.get('/:id/debug', asyncHandler(async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    const debugInfo = {
      quizId: quiz._id,
      title: quiz.title,
      status: quiz.status,
      totalQuestions: quiz.totalQuestions,
      actualQuestionCount: quiz.questions.length,
      currentQuestionIndex: quiz.currentQuestionIndex,
      accuracy: quiz.accuracy,
      correctAnswers: quiz.correctAnswers,
      timeLimit: quiz.timeLimit,
      startedAt: quiz.startedAt,
      completedAt: quiz.completedAt,
      isAdaptive: quiz.isAdaptive,
      roadmapType: quiz.roadmapType,
      difficulty: quiz.difficulty,
      questionsPreview: quiz.questions.slice(0, 3).map(q => ({
        questionId: q.questionId,
        question: q.question.substring(0, 100) + '...',
        optionsCount: q.options.length,
        hasCorrectAnswer: !!q.correctAnswer,
        status: q.status
      }))
    };

    res.json({
      success: true,
      data: debugInfo
    });

  } catch (error) {
    console.error('Error in quiz debug:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
}));

`;

    // Add before module.exports
    if (!quizRoutesContent.includes('/:id/debug')) {
      quizRoutesContent = quizRoutesContent.replace(
        'module.exports = router;',
        debugEndpoint + '\nmodule.exports = router;'
      );
      
      await fs.writeFile(quizRoutesPath, quizRoutesContent);
      console.log('   ✅ Added quiz debugging endpoint');
    } else {
      console.log('   ✅ Quiz debugging endpoint already exists');
    }

    // 5. Create a test script to verify quiz functionality
    console.log('\n5. Creating quiz test script...');
    
    const testScript = `#!/usr/bin/env node

/**
 * Test Quiz Functionality
 * Run this script to test if quiz creation and completion works
 */

const API_BASE = 'http://localhost:3000/api';

async function testQuizFunctionality() {
  console.log('🧪 Testing Quiz Functionality...\\n');
  
  try {
    // Test 1: Create a quiz
    console.log('1. Testing quiz creation...');
    const createResponse = await fetch(\`\${API_BASE}/quiz/create\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: You'll need to add authentication headers in a real test
      },
      body: JSON.stringify({
        roadmapType: 'frontend',
        difficulty: 'easy',
        questionCount: 5,
        timeLimit: 10,
        adaptiveDifficulty: false
      })
    });
    
    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('   ✅ Quiz created:', createData.data._id);
      console.log('   📊 Questions:', createData.data.questions.length);
      
      // Test 2: Fetch the quiz
      console.log('\\n2. Testing quiz fetch...');
      const fetchResponse = await fetch(\`\${API_BASE}/quiz/\${createData.data._id}\`);
      
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        console.log('   ✅ Quiz fetched successfully');
        console.log('   📋 Title:', fetchData.data.title);
        console.log('   ❓ First question:', fetchData.data.questions[0]?.question?.substring(0, 50) + '...');
      } else {
        console.log('   ❌ Failed to fetch quiz');
      }
      
    } else {
      console.log('   ❌ Failed to create quiz');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testQuizFunctionality();
}

module.exports = { testQuizFunctionality };
`;

    await fs.writeFile('test-quiz-functionality.js', testScript);
    console.log('   ✅ Created quiz test script');

    console.log('\n✅ Quiz Issues Fixed Successfully!\n');
    console.log('📋 Summary of fixes:');
    console.log('   1. Enhanced quiz loading with better error handling');
    console.log('   2. Fixed lesson completion logic with 60% threshold');
    console.log('   3. Improved quiz creation error handling');
    console.log('   4. Added quiz debugging endpoint');
    console.log('   5. Created test script for verification');
    
    console.log('\n🧪 To test the fixes:');
    console.log('   1. Restart your backend server');
    console.log('   2. Restart your frontend server');
    console.log('   3. Try taking a quiz from a learning path');
    console.log('   4. Check browser console for detailed logs');
    console.log('   5. Ensure you score above 60% to complete the lesson');
    
    console.log('\n🔍 Debugging tips:');
    console.log('   - Check browser console for detailed quiz logs');
    console.log('   - Use /api/quiz/{id}/debug endpoint to inspect quiz data');
    console.log('   - Verify questions exist in Backend/Questions/ directory');
    console.log('   - Check that roadmapId matches question file names');

  } catch (error) {
    console.error('❌ Error fixing quiz issues:', error);
    process.exit(1);
  }
}

// Run the fix
fixQuizIssues();