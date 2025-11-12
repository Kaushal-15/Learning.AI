# Dynamic MCQ System Backend

This is the backend service for the Dynamic MCQ System, built with Node.js, Express.js, and MongoDB.

## Project Structure

```
Backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── middleware/
│   ├── errorHandler.js      # Global error handling middleware
│   ├── logger.js           # Request logging middleware
│   └── validation.js       # Input validation middleware
├── models/
│   ├── Question.js         # Question schema and methods
│   ├── Learner.js          # Learner profile schema and methods
│   ├── Performance.js      # Performance tracking schema and methods
│   ├── SpacedRepetition.js # Spaced repetition schema and methods
│   └── index.js           # Model exports
├── routes/
│   ├── questionRoutes.js   # Question-related API endpoints
│   ├── assessmentRoutes.js # Assessment API endpoints
│   ├── learnerRoutes.js    # Learner profile API endpoints
│   └── analyticsRoutes.js  # Analytics API endpoints
├── .env                    # Environment variables (not in git)
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies and scripts
├── server.js              # Main server file
└── README.md              # This file
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd app/Backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your actual configuration values
   ```

3. **MongoDB Setup**
   - Install MongoDB locally or use MongoDB Atlas
   - Update MONGODB_URI in .env file
   - The application will create the database and collections automatically

4. **Start the Server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Health Check**
   Visit `http://localhost:3000/health` to verify the server is running

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/dynamic-mcq-system` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `OPENAI_API_KEY` | OpenAI API key for question generation | Required for AI features |
| `JWT_SECRET` | Secret for JWT access token signing | Required for authentication |
| `JWT_EXPIRES_IN` | Access token expiration time | `15m` (15 minutes) |
| `JWT_REFRESH_SECRET` | Secret for JWT refresh token signing | Required for authentication |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration time | `7d` (7 days) |
| `REDIS_URL` | Redis connection string for caching | Optional |

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Questions (Placeholder)
- `GET /api/questions` - List questions
- `POST /api/questions/generate` - Generate new question
- `GET /api/questions/:id` - Get specific question

### Assessment (Placeholder)
- `POST /api/assessment/submit` - Submit answer
- `GET /api/assessment/feedback/:questionId` - Get feedback
- `POST /api/assessment/hint` - Get hint

### Learners (Placeholder)
- `GET /api/learners/:id` - Get learner profile
- `PUT /api/learners/:id` - Update learner profile
- `POST /api/learners` - Create learner profile

### Analytics (Placeholder)
- `GET /api/analytics/learner/:id` - Get learner analytics
- `GET /api/analytics/performance/:id` - Get performance data
- `GET /api/analytics/trends/:category` - Get category trends

## Data Models

### Question
- Content, options, correct answer, explanation
- Hierarchical categories and difficulty levels
- AI generation tracking and validation scores
- Usage statistics and performance metrics

### Learner
- Profile information and preferences
- Category mastery tracking with confidence levels
- Learning velocity and retention rates
- Overall performance statistics

### Performance
- Individual question attempt records
- Time spent, hints used, confidence levels
- Session tracking and device information
- Comprehensive analytics support

### SpacedRepetition
- SM-2 algorithm implementation
- Review scheduling and interval management
- Mastery tracking and card retirement
- Priority-based review ordering

## Development

### Running Tests
```bash
npm test
```

### Code Style
The project uses ESLint for code formatting. Run:
```bash
npm run lint
```

### Database Seeding
Database seeding utilities will be implemented in later tasks.

## Next Steps

This is the foundational setup. The following features will be implemented in subsequent tasks:
1. Question generation service with AI integration
2. Assessment engine with adaptive difficulty
3. Learner profile management
4. Analytics and progress tracking
5. Spaced repetition algorithms
6. API endpoint implementations
7. Testing suite
8. Performance optimization