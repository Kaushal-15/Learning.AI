import React, { useState, useEffect } from 'react';
import apiService from '../services/api.js';

const LearnerTester = () => {
  const [learners, setLearners] = useState([]);
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [newLearner, setNewLearner] = useState({
    name: '',
    email: '',
    difficultyPreference: 5
  });

  const [answerForm, setAnswerForm] = useState({
    category: 'Mathematics',
    wasCorrect: true,
    timeSpent: 30
  });

  useEffect(() => {
    loadLearners();
  }, []);

  const loadLearners = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllLearners();
      setLearners(response.data);
    } catch (err) {
      setError('Failed to load learners: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createLearner = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await apiService.createLearner(newLearner);
      setSuccess('Learner created successfully!');
      setNewLearner({ name: '', email: '', difficultyPreference: 5 });
      loadLearners();
    } catch (err) {
      setError('Failed to create learner: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const simulateAnswer = async (e) => {
    e.preventDefault();
    if (!selectedLearner) {
      setError('Please select a learner first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await apiService.simulateAnswer(selectedLearner._id, answerForm);
      setSuccess('Answer recorded successfully!');
      loadLearners(); // Refresh to see updated stats
    } catch (err) {
      setError('Failed to record answer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteLearner = async (id) => {
    if (!window.confirm('Are you sure you want to delete this learner?')) return;

    try {
      setLoading(true);
      await apiService.deleteLearner(id);
      setSuccess('Learner deleted successfully!');
      loadLearners();
      if (selectedLearner && selectedLearner._id === id) {
        setSelectedLearner(null);
      }
    } catch (err) {
      setError('Failed to delete learner: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMasteryLevel = (level) => {
    if (level >= 80) return 'high';
    if (level >= 60) return 'medium';
    return 'low';
  };

  return (
    <div>
      <div className="card">
        <h2>Learner Model Testing</h2>
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="grid grid-2">
          {/* Create Learner Form */}
          <div>
            <h3>Create New Learner</h3>
            <form onSubmit={createLearner}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={newLearner.name}
                  onChange={(e) => setNewLearner({...newLearner, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={newLearner.email}
                  onChange={(e) => setNewLearner({...newLearner, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Difficulty Preference (1-10):</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newLearner.difficultyPreference}
                  onChange={(e) => setNewLearner({...newLearner, difficultyPreference: parseInt(e.target.value)})}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Create Learner
              </button>
            </form>
          </div>

          {/* Simulate Answer Form */}
          <div>
            <h3>Simulate Answer</h3>
            <form onSubmit={simulateAnswer}>
              <div className="form-group">
                <label>Select Learner:</label>
                <select
                  value={selectedLearner?._id || ''}
                  onChange={(e) => {
                    const learner = learners.find(l => l._id === e.target.value);
                    setSelectedLearner(learner);
                  }}
                  required
                >
                  <option value="">Choose a learner...</option>
                  {learners.map(learner => (
                    <option key={learner._id} value={learner._id}>
                      {learner.name} ({learner.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Category:</label>
                <select
                  value={answerForm.category}
                  onChange={(e) => setAnswerForm({...answerForm, category: e.target.value})}
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="History">History</option>
                  <option value="Literature">Literature</option>
                  <option value="Programming">Programming</option>
                </select>
              </div>
              <div className="form-group">
                <label>Answer Correct:</label>
                <select
                  value={answerForm.wasCorrect}
                  onChange={(e) => setAnswerForm({...answerForm, wasCorrect: e.target.value === 'true'})}
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
                  value={answerForm.timeSpent}
                  onChange={(e) => setAnswerForm({...answerForm, timeSpent: parseInt(e.target.value)})}
                />
              </div>
              <button type="submit" className="btn btn-success" disabled={loading || !selectedLearner}>
                Record Answer
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Learners List */}
      <div className="card">
        <h3>All Learners ({learners.length})</h3>
        {loading && <div className="loading">Loading...</div>}
        
        <div className="learner-list">
          {learners.map(learner => (
            <div key={learner._id} className="learner-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4>{learner.name}</h4>
                  <p><strong>Email:</strong> {learner.email}</p>
                  <p><strong>Overall Accuracy:</strong> {(learner.overallAccuracy * 100).toFixed(1)}%</p>
                  <p><strong>Questions Answered:</strong> {learner.totalQuestionsAnswered}</p>
                  <p><strong>Current Streak:</strong> {learner.currentStreak}</p>
                  <p><strong>Longest Streak:</strong> {learner.longestStreak}</p>
                  <p><strong>Difficulty Preference:</strong> {learner.difficultyPreference}/10</p>
                  
                  {learner.categoryMastery && Object.keys(learner.categoryMastery).length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <strong>Category Mastery:</strong>
                      <div className="category-mastery" style={{ marginTop: '0.5rem' }}>
                        {Object.entries(learner.categoryMastery).map(([category, mastery]) => (
                          <div key={category} className="mastery-item">
                            <span>{category}</span>
                            <span className={`mastery-level ${getMasteryLevel(mastery.level)}`}>
                              {mastery.level}% ({mastery.questionsAnswered} questions)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div style={{ marginLeft: '1rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedLearner(learner)}
                    style={{ marginBottom: '0.5rem', display: 'block' }}
                  >
                    Select
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteLearner(learner._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {learners.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            No learners found. Create one above to get started!
          </p>
        )}
      </div>
    </div>
  );
};

export default LearnerTester;