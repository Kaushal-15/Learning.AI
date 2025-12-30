import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Flame, Star } from 'lucide-react';
import '../styles/ProgressTracker.css';

export default function ProgressTracker() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        fetchProgressData();
        // Refresh every 30 seconds for real-time updates
        const interval = setInterval(fetchProgressData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchProgressData = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/xp/league', {
                method: 'GET',
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setDashboard(data.data);
            }
        } catch (error) {
            console.error('Error fetching progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const getLeagueColor = (league) => {
        const colors = {
            'Bronze': '#CD7F32',
            'Silver': '#C0C0C0',
            'Gold': '#FFD700',
            'Platinum': '#E5E4E2',
            'Diamond': '#B9F2FF'
        };
        return colors[league] || '#CD7F32';
    };

    const getLeagueEmoji = (league) => {
        const emojis = {
            'Bronze': '🥉',
            'Silver': '🥈',
            'Gold': '🥇',
            'Platinum': '💎',
            'Diamond': '💠'
        };
        return emojis[league] || '🏆';
    };

    if (loading) {
        return (
            <div className="progress-tracker-button">
                <div className="progress-tracker-icon">
                    <Trophy className="icon-animate-pulse" size={20} />
                </div>
            </div>
        );
    }

    if (!dashboard) return null;

    return (
        <div className="progress-tracker-container">
            <button
                className="progress-tracker-button"
                onClick={() => setIsExpanded(!isExpanded)}
                title="Progress Tracker"
            >
                <div className="progress-tracker-icon">
                    <Trophy size={20} style={{ color: getLeagueColor(dashboard.league) }} />
                </div>
                <div className="xp-badge">{dashboard.totalXP}</div>
            </button>

            {isExpanded && (
                <>
                    <div className="progress-tracker-overlay" onClick={() => setIsExpanded(false)} />
                    <div className="progress-tracker-panel">
                        {/* Header */}
                        <div className="tracker-header">
                            <div className="league-badge" style={{ borderColor: getLeagueColor(dashboard.league) }}>
                                <span className="league-emoji">{getLeagueEmoji(dashboard.league)}</span>
                                <span className="league-name">{dashboard.league}</span>
                            </div>
                            <button className="close-btn" onClick={() => setIsExpanded(false)}>×</button>
                        </div>

                        {/* XP Stats */}
                        <div className="tracker-stats">
                            <div className="stat-item">
                                <div className="stat-icon">
                                    <Star size={16} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-label">Total XP</div>
                                    <div className="stat-value">{dashboard.totalXP.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="stat-item">
                                <div className="stat-icon">
                                    <TrendingUp size={16} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-label">Weekly XP</div>
                                    <div className="stat-value">{dashboard.weeklyXP.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="stat-item">
                                <div className="stat-icon">
                                    <Flame size={16} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-label">Streak</div>
                                    <div className="stat-value">{dashboard.streak.current} days</div>
                                </div>
                            </div>
                        </div>

                        {/* Rank Info */}
                        <div className="rank-info">
                            <div className="rank-item">
                                <span className="rank-label">League Rank</span>
                                <span className="rank-value">#{dashboard.leagueRank}</span>
                            </div>
                            <div className="rank-item">
                                <span className="rank-label">Global Rank</span>
                                <span className="rank-value">#{dashboard.globalRank}</span>
                            </div>
                        </div>

                        {/* Progress to Next League */}
                        {dashboard.nextLeague && (
                            <div className="next-league">
                                <div className="next-league-header">
                                    <span>Next: {dashboard.nextLeague}</span>
                                    <span className="xp-needed">{dashboard.xpToNextLeague} XP</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${Math.min(100, ((dashboard.totalXP / (dashboard.totalXP + dashboard.xpToNextLeague)) * 100))}%`,
                                            background: `linear-gradient(90deg, ${getLeagueColor(dashboard.league)}, ${getLeagueColor(dashboard.nextLeague)})`
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Category XP */}
                        <div className="category-xp">
                            <div className="category-header">Category Progress</div>
                            <div className="category-list">
                                {Object.entries(dashboard.categoryXP)
                                    .filter(([_, xp]) => xp > 0)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 3)
                                    .map(([category, xp]) => (
                                        <div key={category} className="category-item">
                                            <span className="category-name">{category.toUpperCase()}</span>
                                            <span className="category-xp">{xp} XP</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Streak Info */}
                        {dashboard.streak.current >= 3 && (
                            <div className="streak-bonus">
                                <Flame size={16} />
                                <span>
                                    {dashboard.streak.current >= 7
                                        ? `🎉 ${Math.floor(dashboard.streak.current / 7)} week streak!`
                                        : `${7 - (dashboard.streak.current % 7)} days to bonus!`}
                                </span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
