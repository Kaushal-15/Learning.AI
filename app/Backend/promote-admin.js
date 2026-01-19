const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function promoteToAdmin(email) {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const user = await User.findOneAndUpdate(
            { email },
            { role: 'admin' },
            { new: true }
        );

        if (user) {
            console.log(`User ${email} promoted to admin successfully.`);
        } else {
            console.log(`User ${email} not found.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Promotion failed:', error);
        process.exit(1);
    }
}

const email = process.argv[2];
if (!email) {
    console.log('Please provide an email: node promote-admin.js user@example.com');
    process.exit(1);
}

promoteToAdmin(email);
