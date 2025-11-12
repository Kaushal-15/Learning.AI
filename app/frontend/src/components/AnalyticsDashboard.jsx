import React, { useState, useEffect } from 'react';
import apiService from '../services/api.js';

const AnalyticsDashboard = () => {
    const [learners, setLearners] = useState([]);
    const [selectedLearner, setSelectedLearner] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [performanceAnalytics, setPerformanceAnalytics] = useState(null);
    const [categoryTrends, setCategoryTrends] = useState([]);
    const [difficultyProgression, setDifficultyProgression] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [selectedCategory, setSelectedCategory] = useState('Mathematics');
    const [timeRange, setTimeRange] = useState(30);

    useEffect(() => {
        loadLearners();
    }, []);

    useEffect(() => {
        if (selectedLearner) {
            loadAnalytics();
        }
    }, [selectedLearner, timeRange, selectedCategory]);

    const loadLearners = async () => {
        try {
            const response = await apiService.getAllLearners();
            setLearners(response.data);
            if (response.data.length > 0) {
                setSelectedLearner(response.data[0]);
            }
        } catch (err) {
            setError('Failed to load learners: ' + err.message);
        }
    };

    const loadAnalytics = async () => {
        if (!selectedLearner) return;

        try {
            setLoading(true);
            setError('');

            // Load learner analytics
            const learnerAnalyticsResponse = await apiService.getLearnerAnalytics(selectedLearner._id);
            setAnalytics(learnerAnalyticsResponse.data);

            // Load performance analytics
            const performanceAnalyticsResponse = await apiService.getPerformanceAnalytics(selectedLearner._id, timeRange);
            setPerformanceAnalytics(performanceAnalyticsResponse.data);

            // Load category trends
            const trendsResponse = await apiService.getCategoryTrends(selectedLearner._id, selectedCategory, timeRange);
            setCategoryTrends(trendsResponse.data);

            // Load difficulty progression
            const progressionResponse = await apiService.getDifficultyProgression(selectedLearner._id, selectedCategory);
            setDifficultyProgression(progressionResponse.data);

        } catch (err) {
            setError('Failed to load analytics: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatPercentage = (value) => {
        return (value * 100).toFixed(1) + '%';
    };

    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        return `${(seconds / 60).toFixed(1)}m`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getMasteryLevel = (level) => {
        if (level >= 80) return { class: 'high', label: 'High' };
        if (level >= 60) return { class: 'medium', label: 'Medium' };
        return { class: 'low', label: 'Low' };
    };

    return (
        <div>
            <div className="card">
                <h2>Analytics Dashboard</h2>

                {error && <div className="error">{error}</div>}

                <div className="grid grid-3">
                    <div className="form-group">
                        <label>Select Learner:</label>
                        <select
                            value={selectedLearner?._id || ''}
                            onChange={(e) => {
                                const learner = learners.find(l => l._id === e.target.value);
                                setSelectedLearner(learner);
                            }}
                        >
                            {learners.map(learner => (
                                <option key={learner._id} value={learner._id}>
                                    {learner.name} ({learner.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Time Range (days):</label>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(parseInt(e.target.value))}
                        >
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="365">Last year</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Category for Trends:</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="Mathematics">Mathematics</option>
                            <option value="Science">Science</option>
                            <option value="History">History</option>
                            <option value="Literature">Literature</option>
                            <option value="Programming">Programming</option>
                        </select>
                    </div>
                </div>
            </div>

            {selectedLearner && (
                <>
                    {/* Overall Metrics */}
                    <div className="card">
                        <h3>Overall Performance Metrics</h3>
                        {loading && <div className="loading">Loading analytics...</div>}

                        {analytics && (
                            <div className="analytics-grid">
                                <div className="metric-card">
                                    <div className="value">{formatPercentage(analytics.learner.overallAccuracy)}</div>
                                    <div className="label">Overall Accuracy</div>
                                </div>
                                <div className="metric-card">
                                    <div className="value">{analytics.learner.currentStreak}</div>
                                    <div className="label">Current Streak</div>
                                </div>
                                <div className="metric-card">
                                    <div className="value">{analytics.learner.longestStreak}</div>
                                    <div className="label">Longest Streak</div>
                                </div>
                                <div className="metric-card">
                                    <div className="value">{Object.keys(analytics.learner.categoryMastery || {}).length}</div>
                                    <div className="label">Categories Attempted</div>
                                </div>
                            </div>
                        )}

                        {performanceAnalytics && (
                            <div className="analytics-grid">
                                <div className="metric-card">
                                    <div className="value">{performanceAnalytics.totalQuestions}</div>
                                    <div className="label">Questions in {timeRange} days</div>
                                </div>
                                <div className="metric-card">
                                    <div className="value">{formatPercentage(performanceAnalytics.accuracy)}</div>
                                    <div className="label">Recent Accuracy</div>
                                </div>
                                <div className="metric-card">
                                    <div className="value">{formatTime(performanceAnalytics.averageTimePerQuestion)}</div>
                                    <div className="label">Avg Time per Question</div>
                                </div>
                                <div className="metric-card">
                                    <div className="value">{performanceAnalytics.averageDifficulty?.toFixed(1) || 0}</div>
                                    <div className="label">Avg Difficulty</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Category Mastery */}
                    {analytics?.learner.categoryMastery && Object.keys(analytics.learner.categoryMastery).length > 0 && (
                        <div className="card">
                            <h3>Category Mastery Levels</h3>
                            <div className="category-mastery">
                                {Object.entries(analytics.learner.categoryMastery).map(([category, mastery]) => {
                                    const masteryInfo = getMasteryLevel(mastery.level);
                                    return (
                                        <div key={category} className="mastery-item">
                                            <div>
                                                <strong>{category}</strong>
                                                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                                    {mastery.questionsAnswered} questions • {formatPercentage(mastery.averageAccuracy)} accuracy
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className={`mastery-level ${masteryInfo.class}`}>
                                                    {mastery.level}% {masteryInfo.label}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                                    Confidence: {formatPercentage(mastery.confidence)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Weak and Strong Areas */}
                    {analytics?.learner && (
                        <div className="grid grid-2">
                            <div className="card">
                                <h3>Weak Areas</h3>
                                {analytics.learner.weakAreas.length > 0 ? (
                                    <div>
                                        {analytics.learner.weakAreas.map(area => (
                                            <div key={area} className="mastery-item">
                                                <span>{area}</span>
                                                <span className="mastery-level low">Needs Improvement</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: '#666', textAlign: 'center', padding: '1rem' }}>
                                        No weak areas identified! 🎉
                                    </p>
                                )}
                            </div>

                            <div className="card">
                                <h3>Strong Areas</h3>
                                {analytics.learner.strongAreas.length > 0 ? (
                                    <div>
                                        {analytics.learner.strongAreas.map(area => (
                                            <div key={area} className="mastery-item">
                                                <span>{area}</span>
                                                <span className="mastery-level high">Mastered</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: '#666', textAlign: 'center', padding: '1rem' }}>
                                        Keep practicing to master more areas!
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Category Trends */}
                    {categoryTrends.length > 0 && (
                        <div className="card">
                            <h3>{selectedCategory} Performance Trends (Last {timeRange} days)</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e1e5e9' }}>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Questions</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Accuracy</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Avg Time</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Avg Difficulty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categoryTrends.map((trend, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid #f1f3f4' }}>
                                                <td style={{ padding: '0.75rem' }}>{formatDate(trend.date)}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{trend.questionsAnswered}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{formatPercentage(trend.accuracy)}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{formatTime(trend.averageTimeSpent)}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{trend.averageDifficulty.toFixed(1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Difficulty Progression */}
                    {difficultyProgression.length > 0 && (
                        <div className="card">
                            <h3>{selectedCategory} Difficulty Progression</h3>
                            <div className="analytics-grid">
                                {difficultyProgression.map(level => (
                                    <div key={level.difficulty} className="metric-card">
                                        <div className="value">{formatPercentage(level.accuracy)}</div>
                                        <div className="label">
                                            Level {level.difficulty} ({level.questionsAnswered} questions)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {learners.length === 0 && (
                <div className="card">
                    <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                        No learners found. Create some learners first to see analytics!
                    </p>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;