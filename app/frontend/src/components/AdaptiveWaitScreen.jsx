import { useEffect, useState } from 'react';
import { Clock, TrendingUp, TrendingDown, Minus, Users, Target } from 'lucide-react';
import '../styles/DevvoraStyles.css';

export default function AdaptiveWaitScreen({
    waitTime,
    collectiveStats,
    onWaitComplete
}) {
    const [timeRemaining, setTimeRemaining] = useState(waitTime);

    // Sync with prop updates
    useEffect(() => {
        setTimeRemaining(waitTime);
    }, [waitTime]);

    useEffect(() => {
        if (timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onWaitComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onWaitComplete]); // Removed timeRemaining to prevent re-creation

    const getDifficultyIcon = () => {
        if (!collectiveStats) return <Minus size={24} />;

        const current = collectiveStats.currentDifficulty;
        const next = collectiveStats.nextDifficulty;

        if (next === current) return <Minus size={24} />;
        if (next > current) return <TrendingUp size={24} />;
        return <TrendingDown size={24} />;
    };

    const getDifficultyChange = () => {
        if (!collectiveStats) return 'Calculating...';

        const current = collectiveStats.currentDifficulty;
        const next = collectiveStats.nextDifficulty;

        if (next === current) return 'Maintaining difficulty';
        if (next > current) return `Increasing to ${next}`;
        return `Decreasing to ${next}`;
    };

    return (
        <div className="adaptive-wait-screen">
            <div className="wait-content">
                {/* Countdown Circle */}
                <div className="countdown-circle">
                    <svg className="countdown-svg" viewBox="0 0 100 100">
                        <circle
                            className="countdown-bg"
                            cx="50"
                            cy="50"
                            r="45"
                        />
                        <circle
                            className="countdown-progress"
                            cx="50"
                            cy="50"
                            r="45"
                            style={{
                                strokeDasharray: `${(timeRemaining / waitTime) * 283} 283`,
                                transition: 'stroke-dasharray 1s linear'
                            }}
                        />
                    </svg>
                    <div className="countdown-text">
                        <Clock size={32} />
                        <span className="countdown-number">{timeRemaining}</span>
                        <span className="countdown-label">seconds</span>
                    </div>
                </div>

                {/* Wait Message */}
                <h2 className="wait-title">Preparing Next Question...</h2>
                <p className="wait-subtitle">Analyzing collective performance</p>

                {/* Collective Stats */}
                {collectiveStats && (
                    <div className="collective-stats-grid">
                        <div className="stat-card">
                            <Users size={20} />
                            <div className="stat-content">
                                <span className="stat-value">{collectiveStats.totalAttempts}</span>
                                <span className="stat-label">Students Answered</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <Target size={20} />
                            <div className="stat-content">
                                <span className="stat-value">{collectiveStats.correctRate}%</span>
                                <span className="stat-label">Correct Rate</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Difficulty Change Indicator */}
                <div className="difficulty-change-card">
                    <div className="difficulty-icon">
                        {getDifficultyIcon()}
                    </div>
                    <div className="difficulty-text">
                        <span className="difficulty-label">Next Difficulty</span>
                        <span className="difficulty-value">{getDifficultyChange()}</span>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="wait-progress-bar">
                    <div
                        className="wait-progress-fill"
                        style={{ width: `${((waitTime - timeRemaining) / waitTime) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
