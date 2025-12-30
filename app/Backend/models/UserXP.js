const mongoose = require('mongoose');

/**
 * League thresholds (XP required for each league)
 */
const LEAGUE_THRESHOLDS = {
    BRONZE: 0,
    SILVER: 501,
    GOLD: 1501,
    PLATINUM: 3001,
    DIAMOND: 6001
};

/**
 * UserXP Model
 * Tracks global XP, league placement, category-wise XP, and streaks
 */
const userXPSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        unique: true,
        index: true
    },
    totalXP: {
        type: Number,
        default: 0,
        min: [0, 'Total XP cannot be negative'],
        index: true
    },
    league: {
        type: String,
        enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
        default: 'Bronze',
        index: true
    },
    categoryXP: {
        dsa: {
            type: Number,
            default: 0,
            min: [0, 'Category XP cannot be negative']
        },
        backend: {
            type: Number,
            default: 0,
            min: [0, 'Category XP cannot be negative']
        },
        frontend: {
            type: Number,
            default: 0,
            min: [0, 'Category XP cannot be negative']
        },
        mobile: {
            type: Number,
            default: 0,
            min: [0, 'Category XP cannot be negative']
        },
        database: {
            type: Number,
            default: 0,
            min: [0, 'Category XP cannot be negative']
        },
        ai: {
            type: Number,
            default: 0,
            min: [0, 'Category XP cannot be negative']
        },
        devops: {
            type: Number,
            default: 0,
            min: [0, 'Category XP cannot be negative']
        },
        cybersecurity: {
            type: Number,
            default: 0,
            min: [0, 'Category XP cannot be negative']
        }
    },
    streak: {
        count: {
            type: Number,
            default: 0,
            min: [0, 'Streak count cannot be negative']
        },
        lastActive: {
            type: Date,
            default: null
        },
        longestStreak: {
            type: Number,
            default: 0,
            min: [0, 'Longest streak cannot be negative']
        }
    },
    weeklyXP: {
        type: Number,
        default: 0,
        min: [0, 'Weekly XP cannot be negative']
    },
    lastWeeklyReset: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for leaderboard queries
userXPSchema.index({ totalXP: -1 });
userXPSchema.index({ league: 1, totalXP: -1 });
userXPSchema.index({ 'streak.count': -1 });

/**
 * Calculate and update league based on total XP
 */
userXPSchema.methods.updateLeague = function () {
    const xp = this.totalXP;

    if (xp >= LEAGUE_THRESHOLDS.DIAMOND) {
        this.league = 'Diamond';
    } else if (xp >= LEAGUE_THRESHOLDS.PLATINUM) {
        this.league = 'Platinum';
    } else if (xp >= LEAGUE_THRESHOLDS.GOLD) {
        this.league = 'Gold';
    } else if (xp >= LEAGUE_THRESHOLDS.SILVER) {
        this.league = 'Silver';
    } else {
        this.league = 'Bronze';
    }
};

/**
 * Add XP to total and category
 * @param {Number} xp - Amount of XP to add
 * @param {String} category - Category to add XP to (optional)
 */
userXPSchema.methods.addXP = function (xp, category = null) {
    this.totalXP += xp;
    this.weeklyXP += xp;

    // Add to category if specified
    if (category && this.categoryXP.hasOwnProperty(category)) {
        this.categoryXP[category] += xp;
    }

    // Update league based on new total
    this.updateLeague();
};

/**
 * Update streak based on activity
 * Checks if user was active today and updates streak accordingly
 * @returns {Object} - { streakContinued: Boolean, bonusAwarded: Boolean, bonusXP: Number }
 */
userXPSchema.methods.updateStreak = function () {
    const now = new Date();
    const lastActive = this.streak.lastActive;

    let streakContinued = false;
    let bonusAwarded = false;
    let bonusXP = 0;

    if (!lastActive) {
        // First activity ever
        this.streak.count = 1;
        this.streak.lastActive = now;
        streakContinued = true;
    } else {
        const hoursSinceLastActive = (now - lastActive) / (1000 * 60 * 60);

        if (hoursSinceLastActive < 24) {
            // Same day activity - no change to streak
            streakContinued = true;
        } else if (hoursSinceLastActive < 48) {
            // Next day activity - continue streak
            this.streak.count += 1;
            this.streak.lastActive = now;
            streakContinued = true;

            // Award bonus for 7-day streak
            if (this.streak.count % 7 === 0) {
                bonusXP = 100;
                this.addXP(bonusXP);
                bonusAwarded = true;
            }

            // Update longest streak
            if (this.streak.count > this.streak.longestStreak) {
                this.streak.longestStreak = this.streak.count;
            }
        } else {
            // Streak broken (more than 48 hours)
            this.streak.count = 1;
            this.streak.lastActive = now;
            streakContinued = false;
        }
    }

    return { streakContinued, bonusAwarded, bonusXP };
};

/**
 * Reset weekly XP (for weekly rankings)
 */
userXPSchema.methods.resetWeeklyXP = function () {
    this.weeklyXP = 0;
    this.lastWeeklyReset = new Date();
};

/**
 * Get user's rank within their league
 * @returns {Number} - Rank (1-indexed)
 */
userXPSchema.methods.getRankInLeague = async function () {
    const UserXP = this.constructor;
    const rank = await UserXP.countDocuments({
        league: this.league,
        totalXP: { $gt: this.totalXP }
    });
    return rank + 1;
};

/**
 * Get user's global rank
 * @returns {Number} - Rank (1-indexed)
 */
userXPSchema.methods.getGlobalRank = async function () {
    const UserXP = this.constructor;
    const rank = await UserXP.countDocuments({
        totalXP: { $gt: this.totalXP }
    });
    return rank + 1;
};

// Pre-save middleware to ensure league is up to date
userXPSchema.pre('save', function (next) {
    this.updateLeague();
    next();
});

// Static method to get or create XP record
userXPSchema.statics.getOrCreate = async function (userId) {
    let userXP = await this.findOne({ userId });

    if (!userXP) {
        userXP = new this({
            userId,
            totalXP: 0,
            league: 'Bronze',
            categoryXP: {
                dsa: 0,
                backend: 0,
                frontend: 0,
                mobile: 0,
                database: 0,
                ai: 0,
                devops: 0,
                cybersecurity: 0
            },
            streak: {
                count: 0,
                lastActive: null,
                longestStreak: 0
            },
            weeklyXP: 0
        });
        await userXP.save();
    }

    return userXP;
};

// Static method to get leaderboard
userXPSchema.statics.getLeaderboard = async function (options = {}) {
    const { league = null, limit = 50, skip = 0 } = options;

    const query = league ? { league } : {};

    return this.find(query)
        .sort({ totalXP: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'name email')
        .lean();
};

module.exports = mongoose.model('UserXP', userXPSchema);
module.exports.LEAGUE_THRESHOLDS = LEAGUE_THRESHOLDS;
