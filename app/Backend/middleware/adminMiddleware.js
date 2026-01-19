const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
    try {
        // req.user is populated by authMiddleware
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: No user found" });
        }

        const user = await User.findById(req.user.id || req.user._id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Admin access required" });
        }

        next();
    } catch (err) {
        console.error("Admin middleware error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = adminMiddleware;
