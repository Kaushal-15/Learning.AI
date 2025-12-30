/**
 * Quick Start Guide - XP & Progress Tracking System
 * Example usage of the new API endpoints
 */

// ============================================
// 1. AWARD XP FOR COMPLETING A TOPIC
// ============================================

// When a user completes a topic in your frontend:
fetch('http://localhost:3000/api/progress-tracking/update', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        roadmapId: 'backend-development',
        topicId: 'nodejs-fundamentals',
        difficulty: 'medium'  // easy, medium, hard, advanced
    })
})
    .then(res => res.json())
    .then(data => {
        console.log(`+${data.data.xpAwarded} XP!`);
        console.log(`Total XP: ${data.data.totalXP}`);
        console.log(`League: ${data.data.league}`);

        // Show notification to user
        if (data.data.streakInfo.bonusAwarded) {
            alert(`🔥 7-day streak! Bonus +${data.data.streakInfo.bonusXP} XP!`);
        }
    });

// ============================================
// 2. AWARD XP FOR COMPLETING A DAILY PLAN
// ============================================

fetch('http://localhost:3000/api/progress-tracking/update', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        roadmapId: 'full-stack-development',
        planId: 'day-1-plan',
        difficulty: 'medium'  // Gets 1.5x multiplier (30 XP instead of 20)
    })
})
    .then(res => res.json())
    .then(data => {
        console.log(`Plan completed! +${data.data.xpAwarded} XP`);
    });

// ============================================
// 3. AWARD XP FOR ANSWERING A QUESTION
// ============================================

fetch('http://localhost:3000/api/progress-tracking/update', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        roadmapId: 'dsa',
        questionId: 'array-question-42',
        difficulty: 'hard'  // Gets 0.5x multiplier (15 XP instead of 30)
    })
})
    .then(res => res.json())
    .then(data => {
        console.log(`Question answered! +${data.data.xpAwarded} XP`);
    });

// ============================================
// 4. GET USER'S LEAGUE DASHBOARD
// ============================================

fetch('http://localhost:3000/api/xp/league', {
    headers: {
        'Authorization': `Bearer ${userToken}`
    }
})
    .then(res => res.json())
    .then(data => {
        const { totalXP, league, leagueRank, nextLeague, xpToNextLeague, streak } = data.data;

        // Display in UI
        console.log(`League: ${league}`);
        console.log(`Rank: #${leagueRank}`);
        console.log(`Total XP: ${totalXP}`);
        console.log(`${xpToNextLeague} XP to ${nextLeague}`);
        console.log(`Streak: ${streak.current} days`);

        // Example UI update
        document.getElementById('league-badge').textContent = league;
        document.getElementById('xp-count').textContent = totalXP;
        document.getElementById('streak').textContent = streak.current;
    });

// ============================================
// 5. GET LEADERBOARD
// ============================================

// Global leaderboard
fetch('http://localhost:3000/api/xp/leaderboard?limit=10', {
    headers: {
        'Authorization': `Bearer ${userToken}`
    }
})
    .then(res => res.json())
    .then(data => {
        data.data.forEach(user => {
            console.log(`#${user.rank} - ${user.name}: ${user.totalXP} XP (${user.league})`);
        });
    });

// League-specific leaderboard
fetch('http://localhost:3000/api/xp/leaderboard?league=Gold&limit=20', {
    headers: {
        'Authorization': `Bearer ${userToken}`
    }
})
    .then(res => res.json())
    .then(data => {
        console.log('Gold League Top 20:');
        data.data.forEach(user => {
            console.log(`#${user.rank} - ${user.name}: ${user.totalXP} XP`);
        });
    });

// ============================================
// 6. GET PROGRESS FOR A ROADMAP
// ============================================

fetch('http://localhost:3000/api/progress-tracking/backend-development', {
    headers: {
        'Authorization': `Bearer ${userToken}`
    }
})
    .then(res => res.json())
    .then(data => {
        const { completedTopics, progressPercent, xpEarned } = data.data;

        console.log(`Progress: ${progressPercent}%`);
        console.log(`Topics completed: ${completedTopics}`);
        console.log(`XP earned: ${xpEarned}`);

        // Update progress bar
        document.getElementById('progress-bar').style.width = `${progressPercent}%`;
    });

// ============================================
// 7. GET ALL USER PROGRESS
// ============================================

fetch('http://localhost:3000/api/progress-tracking', {
    headers: {
        'Authorization': `Bearer ${userToken}`
    }
})
    .then(res => res.json())
    .then(data => {
        console.log(`Active in ${data.count} roadmaps`);

        data.data.forEach(progress => {
            console.log(`${progress.roadmapId}: ${progress.progressPercent}% (${progress.xpEarned} XP)`);
        });
    });

// ============================================
// 8. GET TOP PERFORMERS BY CATEGORY
// ============================================

fetch('http://localhost:3000/api/xp/category/backend?limit=10', {
    headers: {
        'Authorization': `Bearer ${userToken}`
    }
})
    .then(res => res.json())
    .then(data => {
        console.log('Top Backend Developers:');
        data.data.forEach(user => {
            console.log(`#${user.rank} - ${user.name}: ${user.categoryXP} XP`);
        });
    });

// ============================================
// 9. BATCH UPDATE (Multiple Activities)
// ============================================

fetch('http://localhost:3000/api/progress-tracking/batch-update', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        roadmapId: 'frontend-development',
        activities: [
            { topicId: 'html-basics', difficulty: 'easy' },
            { topicId: 'css-flexbox', difficulty: 'medium' },
            { topicId: 'js-async', difficulty: 'hard' },
            { planId: 'day-1', difficulty: 'medium' }
        ]
    })
})
    .then(res => res.json())
    .then(data => {
        console.log(`Batch complete! +${data.data.totalXPAwarded} XP`);
        console.log(`${data.data.activitiesProcessed} activities processed`);
    });

// ============================================
// 10. REACT COMPONENT EXAMPLE
// ============================================

// Example React component using the XP system
function LeagueDashboard() {
    const [dashboard, setDashboard] = useState(null);

    useEffect(() => {
        fetch('http://localhost:3000/api/xp/league', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then(res => res.json())
            .then(data => setDashboard(data.data));
    }, []);

    if (!dashboard) return <div>Loading...</div>;

    return (
        <div className="league-dashboard">
            <div className="league-badge">{dashboard.league}</div>
            <div className="xp-count">{dashboard.totalXP} XP</div>
            <div className="rank">Rank #{dashboard.leagueRank}</div>
            <div className="streak">🔥 {dashboard.streak.current} day streak</div>
            <div className="next-league">
                {dashboard.xpToNextLeague} XP to {dashboard.nextLeague}
            </div>

            <div className="category-xp">
                <h3>Category XP</h3>
                {Object.entries(dashboard.categoryXP).map(([category, xp]) => (
                    xp > 0 && <div key={category}>{category}: {xp} XP</div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// 11. HANDLE TOPIC COMPLETION IN FRONTEND
// ============================================

async function handleTopicComplete(topicId, difficulty) {
    try {
        const response = await fetch('http://localhost:3000/api/progress-tracking/update', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roadmapId: getCurrentRoadmap(),
                topicId,
                difficulty
            })
        });

        const data = await response.json();

        if (data.success) {
            // Show XP notification
            showNotification(`+${data.data.xpAwarded} XP`, 'success');

            // Check for league upgrade
            if (data.data.league !== previousLeague) {
                showNotification(`🎉 Promoted to ${data.data.league} League!`, 'celebration');
            }

            // Check for streak bonus
            if (data.data.streakInfo.bonusAwarded) {
                showNotification(`🔥 ${data.data.streakInfo.count}-day streak! +${data.data.streakInfo.bonusXP} bonus XP!`, 'bonus');
            }

            // Update UI
            updateProgressBar(data.data.progressPercent);
            updateXPDisplay(data.data.totalXP);
            updateLeagueBadge(data.data.league);
        }
    } catch (error) {
        console.error('Error updating progress:', error);
    }
}

// ============================================
// XP CALCULATION REFERENCE
// ============================================

/*
DIFFICULTY LEVELS:
- Easy: 10 XP
- Medium: 20 XP
- Hard: 30 XP
- Advanced: 50 XP

ACTIVITY MULTIPLIERS:
- Topic: 1.0x (base)
- Plan: 1.5x
- Question: 0.5x

EXAMPLES:
- Easy topic: 10 XP
- Medium plan: 20 * 1.5 = 30 XP
- Hard question: 30 * 0.5 = 15 XP
- Advanced topic: 50 XP

STREAK BONUS:
- Every 7 consecutive days: +100 XP

LEAGUE THRESHOLDS:
- Bronze: 0 - 500 XP
- Silver: 501 - 1,500 XP
- Gold: 1,501 - 3,000 XP
- Platinum: 3,001 - 6,000 XP
- Diamond: 6,000+ XP
*/
