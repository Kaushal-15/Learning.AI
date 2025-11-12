🧠 Learning.AI

🚀 Overview

Learning.AI is an educational web platform designed to make learning smarter and more engaging using Artificial Intelligence.
It enables users to learn topics interactively through dynamic multiple-choice questions (MCQs), AI-generated content, and secure user sessions.

The platform ensures user data protection using SHA-256 encryption, secure cookies, and session management — following modern web security standards.


---

🧩 Features (Implemented So Far)

🔐 Authentication & Security

User Registration & Login:
Secure signup and login using hashed credentials.

SHA-256 Encryption:
All passwords are encrypted using crypto.js before storing in the database, ensuring sensitive data protection.

Session Management:
Uses Express sessions with unique session IDs for each authenticated user.

Secure Cookies:
Cookies are HTTP-only and signed to prevent unauthorized access or XSS attacks.

Logout Handling:
Sessions and cookies are cleared securely upon logout.


📚 Dynamic MCQs (Learning Engine)

AI-driven Question Generation:
Dynamically generates MCQs based on user-selected topics and difficulty levels.

Randomized Options:
Each question set is unique to enhance recall and avoid repetition.

Real-time Evaluation:
Immediate scoring and feedback after each question.

Question Pool Management:
Structured question database supporting topic-wise categorization.


🧠 Intelligent Learning Flow (Planned Features)

Adaptive learning based on past performance.

AI-generated explanations for answers.

Personalized topic recommendations using machine learning.

Leaderboard and achievement badges.



---

⚙️ Tech Stack

Category	Technology

Frontend	React.js / Tailwind CSS
Backend	Node.js + Express.js
Database	MongoDB (with Mongoose ORM)
Authentication	Sessions + Cookies + SHA-256
Security	Helmet, CORS, Express Rate Limit
Version Control	Git & GitHub
Environment Variables	Managed with dotenv



---


---

🔧 Installation & Setup

Prerequisites

Ensure you have the following installed:

Node.js (v18+)

MongoDB (Local or Cloud)

Git


Steps

# Clone the repository
git clone https://github.com/Kaushal-15/Learning.AI.git

# Navigate into the backend
cd Learning.AI/backend

# Install dependencies
npm install

# Create an .env file
touch .env

Add your environment variables:

PORT=3000
MONGO_URI=your_mongo_connection_string
SESSION_SECRET=your_secure_session_secret

Run the server

npm run dev

The backend runs on:
👉 http://localhost:3000

For the frontend:

cd ../frontend
npm install
npm run dev

Frontend runs on:
👉 http://localhost:5173


---

🔒 Security Highlights

SHA-256 hashing to protect user passwords.

Helmet.js for securing HTTP headers.

CORS configured for safe cross-origin requests.

Rate limiting to prevent brute-force attacks.

Session & Cookie Management:

Secure, signed, and HTTP-only cookies.

Session-based authentication ensures persistence and protection.




---

🧠 Dynamic MCQs Flow

1. User selects a topic → (e.g., AI, Data Structures, Algorithms).


2. Server fetches or generates relevant questions dynamically.


3. MCQs displayed with randomized order of options.


4. User answers → Instant feedback and score tracking.


5. Session stores progress to resume where left off.




---

🌟 Upcoming Enhancements

Integration of AI question generation using OpenAI API.

Timed Assessments and performance analytics dashboard.

AI Summarizer & Explanation feature for MCQs.

User Profile Analytics for topic-wise progress.

JWT Authentication (alternative to sessions).

Docker Support for easy deployment.



---

👨‍💻 Contributors

Kaushal Shanmugam — Full Stack Developer

---

🏁 Current Milestone

✅ Completed:

Secure Authentication (SHA-256)

Sessions & Cookies

Dynamic MCQs System
🚧 In Progress:

AI-driven explanations & scoring analytics


---

📜 License

This project is licensed under the MIT License — free to use, modify, and distribute.

---
