import React, { useState, useEffect } from 'react';
import apiService from '../services/api.js';

const PerformanceTester = () => {
  const [performances, setPerformances] = useState([]);
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newPerformance, setNewPerformance] = useState({
    learnerId: '',
    selectedAnswer: 'Option A',
    correct: true,
    timeSpent: 30,
    hintsUsed: 0,
    difficulty: 5,
    category: ['Mathematics'],
    sessionId: `session-${Date.now()}`,
    confidenceLevel: 4,
    deviceType: 'desktop'
  });

  const [filters, setFilters] = useState({
    learnerId: '',
    sessionId: '',
    category: '',
    limit: 20
  });

  useEffect(() => {
    loadLearners();
    loadPerformances();
  }, []);

  const loadLearners = async () => {
    try {
      const response = await apiService.getAllLearners();
      setLearners(response.data);
    } catch (err) {
      console.error('Failed to load learners:', err);
    }
  };

  const loadPerformances = async () => {
    try {
      setLoading(true);
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      );
      const response = await apiService.getPerformanceRecords(cleanFilters);
      setPerformances(response.data);
    } catch (err) {
      setError('Failed to load performance records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createPerformance = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await apiService.createPerformance(newPerformance);
      setSuccess('Performance record created successfully!');
      setNewPerformance({
        ...newPerformance,
        sessionId: `session-${Date.now()}`,
        selectedAnswer: 'Option A'
      });
      loadPerformances();
    } catch (err) {
      setError('Failed to create performance record: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomSession = () => {
    if (!newPerformance.learnerId) {
      setError('Please select a learner first');
      return;
    }

    const categories = ['Mathematics', 'Science', 'History', 'Literature', 'Programming'];
    const sessionId = `session-${Date.now()}`;
    const numQuestions = 5 + Math.floor(Math.random() * 10); // 5-15 questions

    const promises = [];
    for (let i = 0; i < numQuestions; i++) {
      const performance = {
        learnerId: newPerformance.learnerId,
        selectedAnswer: `Option ${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`, // A, B, C, or D
        correct: Math.random() > 0.3, // 70% correct rate
        timeSpent: 15 + Math.floor(Math.random() * 60), // 15-75 seconds
        hintsUsed: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0, // 30% chance of using hints
        difficulty: 1 + Math.floor(Math.random() * 10), // 1-10
        category: [categories[Math.floor(Math.random() * categories.length)]],
        sessionId,
        confidenceLevel: 1 + Math.floor(Math.random() * 5), // 1-5
        deviceType: ['desktop', 'tablet', 'mobile'][Math.floor(Math.random() * 3)]
      };
      promises.push(apiService.createPerformance(performance));
    }

    Promise.all(promises)
      .then(() => {
        setSuccess(`Generated ${numQuestions} performance records for session ${sessionId}`);
        loadPerformances();
      })
      .catch(err => {
        setError('Failed to generate session: ' + err.message);
      });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getPerformanceScore = (performance) => {
    let score = performance.correct ? 60 : 0;
    const timeBonus = Math.max(0, 25 - (performance.timeSpent / 10));
    score += timeBonus;
    const hintPenalty = performance.hintsUsed * 2;
    score = Math.max(0, score - hintPenalty);
    const difficultyBonus = (performance.difficulty - 1) * 1.5;
    score += difficultyBonus;
    return Math.min(100, Math.round(score));
  };

  return (
    <div>
      <div className="card">
        <h2>Performance Model Testing</h2>
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="grid grid-2">
          {/* Create Performance Form */}
          <div>
            <h3>Create Performance Record</h3>
            <form onSubmit={createPerformance}>
              <div className="form-group">
                <label>Learner:</label>
                <select
                  value={newPerformance.learnerId}
                  onChange={(e) => setNewPerformance({...newPerformance, learnerId: e.target.value})}
                  required
                >
                  <option value="">Select a learner...</option>
                  {learners.map(learner => (
                    <option key={learner._id} value={learner._id}>
                      {learner.name} ({learner.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Selected Answer:</label>
                <select
                  value={newPerformance.selectedAnswer}
                  onChange={(e) => setNewPerformance({...newPerformance, selectedAnswer: e.target.value})}
                >
                  <option value="Option A">Option A</option>
                  <option value="Option B">Option B</option>
                  <option value="Option C">Option C</option>
                  <option value="Option D">Option D</option>
                </select>
              </div>

              <div className="form-group">
                <label>Correct:</label>
                <select
                  value={newPerformance.correct}
                  onChange={(e) => setNewPerformance({...newPerformance, correct: e.target.value === 'true'})}
                >
                  <option value="true">Correct</option>
                  <option value="false">Incorrect</option>
                </select>
              </div>

              <div className="form-group">
                <label>Time Spent (seconds):</label>
                <input
                  type="number"
                  min="1"
                  max="3600"
                  value={newPerformance.timeSpent}
                  onChange={(e) => setNewPerformance({...newPerformance, timeSpent: parseInt(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Hints Used:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={newPerformance.hintsUsed}
                  onChange={(e) => setNewPerformance({...newPerformance, hintsUsed: parseInt(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Difficulty (1-10):</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newPerformance.difficulty}
                  onChange={(e) => setNewPerformance({...newPerformance, difficulty: parseInt(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Category:</label>
                <select
                  value={newPerformance.category[0]}
                  onChange={(e) => setNewPerformance({...newPerformance, category: [e.target.value]})}
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="History">History</option>
                  <option value="Literature">Literature</option>
                  <option value="Programming">Programming</option>
                </select>
              </div>

              <div className="form-group">
                <label>Session ID:</label>
                <input
                  type="text"
                  value={newPerformance.sessionId}
                  onChange={(e) => setNewPerformance({...newPerformance, sessionId: e.target.value})}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                Create Record
              </button>
              <button 
                type="button" 
                className="btn btn-warning" 
                onClick={generateRandomSession}
                disabled={loading}
              >
                Generate Random Session
              </button>
            </form>
          </div>

          {/* Filters */}
          <div>
            <h3>Filter Performance Records</h3>
            <div className="form-group">
              <label>Filter by Learner:</label>
              <select
                value={filters.learnerId}
                onChange={(e) => setFilters({...filters, learnerId: e.target.value})}
              >
                <option value="">All learners</option>
                {learners.map(learner => (
                  <option key={learner._id} value={learner._id}>
                    {learner.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Filter by Session ID:</label>
              <input
                type="text"
                value={filters.sessionId}
                onChange={(e) => setFilters({...filters, sessionId: e.target.value})}
                placeholder="Enter session ID..."
              />
            </div>

            <div className="form-group">
              <label>Filter by Category:</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="">All categories</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="History">History</option>
                <option value="Literature">Literature</option>
                <option value="Programming">Programming</option>
              </select>
            </div>

            <div className="form-group">
              <label>Limit:</label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({...filters, limit: parseInt(e.target.value)})}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <button className="btn btn-secondary" onClick={loadPerformances}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Performance Records List */}
      <div className="card">
        <h3>Performance Records ({performances.length})</h3>
        {loading && <div className="loading">Loading...</div>}
        
        <div>
          {performances.map(performance => (
            <div key={performance._id} className="performance-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div className={`status ${performance.correct ? 'correct' : 'incorrect'}`}>
                    {performance.correct ? 'CORRECT' : 'INCORRECT'}
                  </div>
                  
                  <p><strong>Learner:</strong> {performance.learnerId?.name || 'Unknown'}</p>
                  <p><strong>Answer:</strong> {performance.selectedAnswer}</p>
                  <p><strong>Category:</strong> {performance.category.join(', ')}</p>
                  <p><strong>Difficulty:</strong> {performance.difficulty}/10</p>
                  <p><strong>Time Spent:</strong> {performance.timeSpent}s</p>
                  <p><strong>Hints Used:</strong> {performance.hintsUsed}</p>
                  <p><strong>Session:</strong> {performance.sessionId}</p>
                  <p><strong>Device:</strong> {performance.deviceType}</p>
                  <p><strong>Date:</strong> {formatDate(performance.createdAt)}</p>
                </div>
                
                <div style={{ marginLeft: '1rem', textAlign: 'center' }}>
                  <div className="metric-card" style={{ minWidth: '120px' }}>
                    <div className="value">{getPerformanceScore(performance)}</div>
                    <div className="label">Performance Score</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {performances.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            No performance records found. Create some above or adjust your filters!
          </p>
        )}
      </div>
    </div>
  );
};

export default PerformanceTester;