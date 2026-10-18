/**
 * Idempotent Database Seeder for Learning.AI
 * Path: app/Backend/scripts/seed.js
 * 
 * Safely upserts default roadmap curricula and initial data into MongoDB Atlas.
 * Safe to run repeatedly; does NOT run on boot.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config(); // Fallback to current working directory
const mongoose = require('mongoose');
const Roadmap = require('../models/Roadmap');

const MONGODB_URI = (process.env.MONGODB_URI || process.env.MONGODB_TEST_URI || '').replace(/^["']|["']$/g, '').trim();

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables.');
  process.exit(1);
}

const roadmapsData = [
  {
    roadmapId: 'frontend-development',
    title: 'Frontend Development',
    description: 'Create responsive, high-performance web applications using modern HTML, CSS, JavaScript, and React.',
    category: 'frontend',
    skills: ['HTML5', 'CSS3', 'JavaScript ES6+', 'React', 'Tailwind CSS', 'TypeScript', 'Web Performance'],
    totalTopics: 18,
    levels: [
      {
        levelName: 'Beginner',
        overview: 'Core web fundamentals: semantic HTML, modern responsive CSS layouts, and JavaScript programming basics.',
        lessons: [
          {
            lessonId: 'html-fundamentals',
            title: 'Semantic HTML5 & Accessibility',
            content: 'Semantic HTML introduces meaning to the web page rather than just presentation. Using elements like <header>, <nav>, <main>, <article>, and <footer> helps screen readers and search engines parse document structure correctly.',
            summary: ['Use semantic tags over plain divs', 'Always provide alt text for images', 'Ensure proper heading hierarchy (h1 to h6)'],
            quiz: [
              {
                question: 'Which HTML5 element represents the primary navigation section?',
                options: ['<nav>', '<menu>', '<header>', '<navigation>'],
                answer: '<nav>',
                explanation: 'The <nav> element is intended for major navigation links on a website.'
              }
            ]
          },
          {
            lessonId: 'css-flexbox-grid',
            title: 'Modern CSS: Flexbox and Grid',
            content: 'CSS Flexbox is designed for one-dimensional layouts (rows or columns), while CSS Grid excels at two-dimensional layouts (rows and columns simultaneously). Mastering both is essential for modern responsive UI development.',
            summary: ['Flexbox for 1D component layouts', 'CSS Grid for 2D page architecture', 'Use mobile-first media queries'],
            quiz: [
              {
                question: 'Which CSS property creates a two-dimensional grid container?',
                options: ['display: grid', 'display: flex', 'grid-template-columns', 'flex-direction: both'],
                answer: 'display: grid',
                explanation: 'display: grid defines the element as a grid container.'
              }
            ]
          }
        ]
      },
      {
        levelName: 'Intermediate',
        overview: 'State management, React component lifecycle, asynchronous data fetching, and hooks.',
        lessons: [
          {
            lessonId: 'react-hooks-state',
            title: 'React Hooks and State Architecture',
            content: 'React hooks like useState, useEffect, and useMemo allow functional components to manage local state, execute side effects, and memoize expensive calculations cleanly without class boilerplate.',
            summary: ['useState for component memory', 'useEffect for lifecycle & subscriptions', 'Follow the Rules of Hooks'],
            quiz: [
              {
                question: 'When does useEffect with an empty dependency array [] run?',
                options: ['Once after the initial mount', 'On every re-render', 'Before component mounts', 'Only when state changes'],
                answer: 'Once after the initial mount',
                explanation: 'An empty dependency array indicates the effect does not depend on any state/props, running once on mount.'
              }
            ]
          }
        ]
      },
      {
        levelName: 'Advanced',
        overview: 'Advanced rendering patterns, SSR/SSG, code-splitting, and Web Vitals optimization.',
        lessons: [
          {
            lessonId: 'web-performance-vitals',
            title: 'Core Web Vitals & Bundle Optimization',
            content: 'Optimizing Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS) ensures smooth user experiences. Techniques include lazy loading, code splitting, and memoization.',
            summary: ['Minimize bundle size via tree shaking', 'Prioritize critical rendering path assets', 'Prevent layout shifts with explicit dimensions'],
            quiz: [
              {
                question: 'What does LCP stand for in Core Web Vitals?',
                options: ['Largest Contentful Paint', 'Layout Critical Process', 'Linear Component Parser', 'Lazy Content Preload'],
                answer: 'Largest Contentful Paint',
                explanation: 'LCP measures perceived loading speed by marking when the main page content has likely loaded.'
              }
            ]
          }
        ]
      }
    ],
    projects: [
      {
        id: 'fe-proj-1',
        difficulty: 'easy',
        title: 'Responsive Portfolio with Dark Mode',
        description: 'Build a multi-page portfolio featuring dynamic theme toggling and responsive flex layouts.',
        exampleUrl: 'https://github.com/example/portfolio',
        techStack: ['HTML5', 'Tailwind CSS', 'JavaScript']
      }
    ]
  },
  {
    roadmapId: 'backend-development',
    title: 'Backend Development',
    description: 'Architect scalable web servers, RESTful/GraphQL APIs, database persistence, and secure authentication.',
    category: 'backend',
    skills: ['Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'JWT', 'OAuth', 'Redis', 'REST APIs'],
    totalTopics: 16,
    levels: [
      {
        levelName: 'Beginner',
        overview: 'HTTP fundamentals, Express routing, middleware architecture, and request/response lifecycles.',
        lessons: [
          {
            lessonId: 'express-middleware-flow',
            title: 'Express Middleware & Request Processing',
            content: 'Middleware functions have access to the request object (req), response object (res), and the next middleware function in the application’s request-response cycle. They perform logging, auth, validation, and error handling.',
            summary: ['Order of middleware registration matters', 'Always call next() or send a response', 'Centralize error handling with 4-argument middleware'],
            quiz: [
              {
                question: 'How do you define an Express error-handling middleware?',
                options: ['(err, req, res, next)', '(req, res, err)', '(req, res, next)', 'app.onError(handler)'],
                answer: '(err, req, res, next)',
                explanation: 'Express identifies error-handling middleware by checking for exactly four function arguments.'
              }
            ]
          }
        ]
      },
      {
        levelName: 'Intermediate',
        overview: 'NoSQL & SQL database modelling, indexes, transactions, and token-based authentication.',
        lessons: [
          {
            lessonId: 'jwt-auth-architecture',
            title: 'Stateless Authentication with JWT',
            content: 'JSON Web Tokens provide a stateless mechanism for verifying user identity across distributed servers. Combining short-lived access tokens with secure HTTP-only refresh tokens prevents XSS and CSRF token theft.',
            summary: ['Store access token in memory or Authorization header', 'Use httpOnly, Secure, SameSite cookies for refresh tokens', 'Sign with strong secrets or asymmetric keys'],
            quiz: [
              {
                question: 'Which JWT part contains claims such as user ID and expiration?',
                options: ['Payload', 'Header', 'Signature', 'Secret'],
                answer: 'Payload',
                explanation: 'The payload contains claims and user attributes encoded in Base64Url format.'
              }
            ]
          }
        ]
      },
      {
        levelName: 'Advanced',
        overview: 'Microservices, caching with Redis, message queues, rate limiting, and serverless architectures.',
        lessons: [
          {
            lessonId: 'caching-distributed-systems',
            title: 'High-Throughput Caching & Connection Pools',
            content: 'In serverless environments, connection exhaustion is mitigated by connection pooling and query caching using Redis or in-memory LRU caches.',
            summary: ['Cache read-heavy idempotent queries', 'Set TTLs to prevent stale data', 'Reuse connection pools across serverless warm invocations'],
            quiz: [
              {
                question: 'What is the primary benefit of connection caching in serverless functions?',
                options: ['Avoids establishing a new TCP/TLS handshake per request', 'Increases database memory', 'Enables multi-threading in Node.js', 'Bypasses authentication'],
                answer: 'Avoids establishing a new TCP/TLS handshake per request',
                explanation: 'Reusing database clients eliminates 100-300ms TLS handshake latency on warm serverless requests.'
              }
            ]
          }
        ]
      }
    ],
    projects: [
      {
        id: 'be-proj-1',
        difficulty: 'medium',
        title: 'REST API with JWT & Role-Based Access Control',
        description: 'Build a production Express API with MongoDB, validation middleware, and refresh token rotation.',
        exampleUrl: 'https://github.com/example/api-starter',
        techStack: ['Node.js', 'Express', 'MongoDB', 'JWT']
      }
    ]
  },
  {
    roadmapId: 'full-stack-development',
    title: 'Full-Stack Development',
    description: 'Bridge client and server to deliver end-to-end, resilient digital products with modern DevOps workflows.',
    category: 'backend',
    skills: ['React', 'Node.js', 'Express', 'MongoDB', 'REST APIs', 'Vite', 'Docker', 'Vercel Deployment'],
    totalTopics: 20,
    levels: [
      {
        levelName: 'Beginner',
        overview: 'Connecting frontend clients to backend APIs with Fetch, Axios, and CORS handling.',
        lessons: [
          {
            lessonId: 'client-server-data-flow',
            title: 'Client-Server Communication & CORS',
            content: 'Cross-Origin Resource Sharing (CORS) is a browser security mechanism. Learn how to configure CORS allowlists, preflight OPTIONS requests, and credentials handling.',
            summary: ['Set Access-Control-Allow-Origin correctly', 'Enable credentials when sending cookies', 'Inspect preflight OPTIONS responses in DevTools'],
            quiz: [
              {
                question: 'What HTTP status does a successful CORS preflight request return?',
                options: ['204 No Content (or 200 OK)', '401 Unauthorized', '301 Moved Permanently', '500 Server Error'],
                answer: '204 No Content (or 200 OK)',
                explanation: 'A CORS preflight OPTIONS request returns 204 No Content or 200 OK with allowed headers and methods.'
              }
            ]
          }
        ]
      },
      {
        levelName: 'Intermediate',
        overview: 'End-to-end state sync, optimistic UI updates, and real-time communications.',
        lessons: [
          {
            lessonId: 'optimistic-ui-updates',
            title: 'Optimistic UI Updates & Error Rollbacks',
            content: 'Providing immediate UI feedback before server confirmation delivers snappy interactions, requiring robust rollback strategies if the API call fails.',
            summary: ['Update local state immediately', 'Revert on API error', 'Display non-intrusive toast alerts'],
            quiz: [
              {
                question: 'Why are optimistic UI updates used in web applications?',
                options: ['To provide perceived instant performance', 'To eliminate backend servers', 'To bypass validation', 'To save database memory'],
                answer: 'To provide perceived instant performance',
                explanation: 'Optimistic updates make the UI feel instantaneous while awaiting server confirmation in the background.'
              }
            ]
          }
        ]
      },
      {
        levelName: 'Advanced',
        overview: 'CI/CD pipelines, containerization with Docker, and hybrid edge-serverless deployments.',
        lessons: [
          {
            lessonId: 'production-monorepo-deployments',
            title: 'Modern Monorepos and Edge Deployment',
            content: 'Deploying frontend and backend simultaneously requires coordinating environment variables, edge proxies, and atomic rollback capabilities.',
            summary: ['Use Vercel rewrites to avoid third-party cookie restrictions', 'Store secrets in environment variables', 'Automate linting and testing in CI'],
            quiz: [
              {
                question: 'How do reverse proxy rewrites simplify frontend-backend cookie security?',
                options: ['They make both share the same origin, avoiding third-party cookie blocks', 'They disable cookies', 'They encrypt cookies with AES', 'They increase cookie expiration'],
                answer: 'They make both share the same origin, avoiding third-party cookie blocks',
                explanation: 'Rewriting /api on the frontend domain serves both from the same origin, ensuring First-Party cookie compliance.'
              }
            ]
          }
        ]
      }
    ],
    projects: [
      {
        id: 'fs-proj-1',
        difficulty: 'hard',
        title: 'Adaptive Learning Management System',
        description: 'Complete full-stack platform featuring student testing, real-time proctoring, and teacher analytics.',
        exampleUrl: 'https://github.com/example/fullstack-lms',
        techStack: ['React', 'Express', 'MongoDB', 'Tailwind CSS']
      }
    ]
  },
  {
    roadmapId: 'ai-machine-learning',
    title: 'AI & Machine Learning',
    description: 'Master data preparation, neural networks, modern NLP, large language models, and AI agent architectures.',
    category: 'ai',
    skills: ['Python', 'PyTorch', 'TensorFlow', 'Scikit-learn', 'LLMs', 'Prompt Engineering', 'LangChain', 'RAG'],
    totalTopics: 15,
    levels: [
      {
        levelName: 'Beginner',
        overview: 'Supervised vs. unsupervised learning, feature engineering, and classification algorithms.',
        lessons: [
          {
            lessonId: 'ml-fundamentals',
            title: 'Supervised Learning & Model Evaluation',
            content: 'Understand regression, classification, train-test splits, overfitting, cross-validation, and metrics like Precision, Recall, and F1-score.',
            summary: ['Split data into train, val, and test sets', 'Watch out for data leakage', 'Use appropriate metrics for imbalanced classes'],
            quiz: [
              {
                question: 'What metric evaluates the harmonic mean of Precision and Recall?',
                options: ['F1-Score', 'Accuracy', 'MSE', 'ROC-AUC'],
                answer: 'F1-Score',
                explanation: 'The F1-score is the harmonic mean of precision and recall.'
              }
            ]
          }
        ]
      },
      {
        levelName: 'Intermediate',
        overview: 'Deep learning architectures, convolutional neural networks, transformers, and embeddings.',
        lessons: [
          {
            lessonId: 'transformer-architectures',
            title: 'Attention Mechanisms & Transformers',
            content: 'Self-attention allows models to weigh the significance of different tokens dynamically, forming the foundation of modern LLMs like GPT and Gemini.',
            summary: ['Self-attention computes token query-key-value interactions', 'Positional encodings provide sequence order', 'Multi-head attention captures diverse relationships'],
            quiz: [
              {
                question: 'What core mechanism enables Transformers to process text sequences in parallel?',
                options: ['Self-Attention', 'Recurrent Backpropagation', 'Max Pooling', 'Convolutional Filters'],
                answer: 'Self-Attention',
                explanation: 'Self-attention processes all tokens simultaneously without the sequential constraints of RNNs.'
              }
            ]
          }
        ]
      },
      {
        levelName: 'Advanced',
        overview: 'Retrieval-Augmented Generation (RAG), vector databases, and autonomous AI agents.',
        lessons: [
          {
            lessonId: 'rag-vector-search',
            title: 'Retrieval-Augmented Generation (RAG)',
            content: 'RAG bridges static LLM weights with real-time enterprise documents by indexing text into vector embeddings and performing semantic similarity searches.',
            summary: ['Chunk documents effectively', 'Store dense vectors in specialized databases', 'Inject retrieved context into prompts'],
            quiz: [
              {
                question: 'What is the main advantage of RAG over model fine-tuning for dynamic knowledge?',
                options: ['Immediate updates without re-training costs', 'Smaller embedding models', 'Faster context token speeds', 'Eliminates prompt tokens'],
                answer: 'Immediate updates without re-training costs',
                explanation: 'RAG allows updating knowledge in real time by simply adding documents to the vector index.'
              }
            ]
          }
        ]
      }
    ],
    projects: [
      {
        id: 'ai-proj-1',
        difficulty: 'medium',
        title: 'Adaptive AI Question Generator',
        description: 'AI-assisted quiz generator that creates difficulty-tailored MCQs based on user performance vectors.',
        exampleUrl: 'https://github.com/example/ai-quiz',
        techStack: ['Python', 'OpenAI/Gemini API', 'Node.js']
      }
    ]
  },
  {
    roadmapId: 'mobile-app-development',
    title: 'Mobile App Development',
    description: 'Build native and cross-platform mobile apps for iOS and Android with React Native and Flutter.',
    category: 'mobile',
    skills: ['React Native', 'Flutter', 'Dart', 'iOS/Android Architecture', 'Mobile UI/UX', 'App Store Publishing'],
    totalTopics: 12,
    levels: [
      {
        levelName: 'Beginner',
        overview: 'Mobile layout principles, device hardware APIs, and touch-based interactions.',
        lessons: [
          {
            lessonId: 'react-native-basics',
            title: 'React Native Core Components & Layouts',
            content: 'React Native compiles JSX to native iOS and Android components (View, Text, Image, ScrollView) using Flexbox layouts.',
            summary: ['View is the native container', 'Text must wrap all strings', 'StyleSheet.create optimizes styles'],
            quiz: [
              {
                question: 'Which component in React Native is used to display strings?',
                options: ['<Text>', '<p>', '<span>', '<Label>'],
                answer: '<Text>',
                explanation: 'In React Native, all text strings must be wrapped in a <Text> component.'
              }
            ]
          }
        ]
      }
    ],
    projects: []
  },
  {
    roadmapId: 'devops-cloud',
    title: 'DevOps & Cloud',
    description: 'Automate infrastructure, CI/CD pipelines, container orchestration, and cloud observability.',
    category: 'devops',
    skills: ['Docker', 'Kubernetes', 'GitHub Actions', 'AWS', 'Terraform', 'Monitoring & Logging'],
    totalTopics: 12,
    levels: [
      {
        levelName: 'Beginner',
        overview: 'Containerization principles with Docker, multi-stage builds, and environment isolation.',
        lessons: [
          {
            lessonId: 'docker-container-fundamentals',
            title: 'Docker Containerization & Multi-stage Builds',
            content: 'Docker packages applications and dependencies into immutable containers, ensuring identical execution across local dev and production.',
            summary: ['Multi-stage builds reduce image size', 'Use .dockerignore to skip node_modules', 'Never run containers as root'],
            quiz: [
              {
                question: 'What is the command to build a Docker image with a tag?',
                options: ['docker build -t my-app .', 'docker make -tag my-app', 'docker create my-app', 'docker run -b my-app'],
                answer: 'docker build -t my-app .',
                explanation: 'docker build -t specifies the tag name and build context.'
              }
            ]
          }
        ]
      }
    ],
    projects: []
  },
  {
    roadmapId: 'database-data-science',
    title: 'Database & Data Science',
    description: 'Master relational and NoSQL database modeling, querying, aggregations, and data analytics.',
    category: 'database',
    skills: ['SQL', 'PostgreSQL', 'MongoDB', 'Aggregation Pipelines', 'Pandas', 'Data Warehousing'],
    totalTopics: 12,
    levels: [
      {
        levelName: 'Beginner',
        overview: 'Schema design, normalization, ACID properties, and query optimization.',
        lessons: [
          {
            lessonId: 'mongodb-aggregation-pipelines',
            title: 'MongoDB Aggregation Framework',
            content: 'Aggregation pipelines transform documents through multiple stages: $match, $group, $project, $lookup, and $sort for high-speed analytical queries.',
            summary: ['$match early to reduce dataset volume', '$lookup handles relational joins', 'Create compound indexes matching query patterns'],
            quiz: [
              {
                question: 'Which aggregation pipeline stage filters documents matching specified criteria?',
                options: ['$match', '$filter', '$find', '$where'],
                answer: '$match',
                explanation: '$match filters documents to pass only matching documents to the next pipeline stage.'
              }
            ]
          }
        ]
      }
    ],
    projects: []
  },
  {
    roadmapId: 'cybersecurity',
    title: 'Cybersecurity',
    description: 'Defend systems from modern threat vectors, secure APIs, and implement defense-in-depth.',
    category: 'cybersecurity',
    skills: ['OWASP Top 10', 'Penetration Testing', 'Cryptography', 'Network Security', 'IAM & RBAC'],
    totalTopics: 12,
    levels: [
      {
        levelName: 'Beginner',
        overview: 'Web vulnerabilities (SQLi, XSS, CSRF), defensive headers, and encryption standards.',
        lessons: [
          {
            lessonId: 'owasp-top-10-mitigation',
            title: 'Mitigating the OWASP Top 10 Vulnerabilities',
            content: 'Secure coding practices prevent cross-site scripting (XSS), SQL injection, and broken object-level authorization (BOLA) in web applications.',
            summary: ['Sanitize and validate all user inputs', 'Use parameterized queries', 'Set strict Content-Security-Policy headers'],
            quiz: [
              {
                question: 'Which HTTP header prevents your site from being embedded in an iframe (clickjacking)?',
                options: ['X-Frame-Options: DENY', 'X-Iframe-Policy: false', 'X-Secure-Frame: true', 'Content-Type: no-frame'],
                answer: 'X-Frame-Options: DENY',
                explanation: 'X-Frame-Options: DENY instructs browsers to refuse rendering the page in a frame or iframe.'
              }
            ]
          }
        ]
      }
    ],
    projects: []
  }
];

async function seed() {
  console.log('🚀 Starting idempotent database seed for Learning.AI...');
  console.log('📡 Connecting to MongoDB Atlas...');

  try {
    let normalizedURI = MONGODB_URI;
    if (normalizedURI.startsWith('mongodb+srv://') && !normalizedURI.includes('authSource=')) {
      normalizedURI += (normalizedURI.includes('?') ? '&' : '?') + 'authSource=admin';
    }

    await mongoose.connect(normalizedURI, {
      dbName: 'learning-ai',
      serverSelectionTimeoutMS: 10000
    });

    console.log('✅ Connected to MongoDB Atlas (database: learning-ai)');

    let upsertedCount = 0;
    for (const track of roadmapsData) {
      const res = await Roadmap.updateOne(
        { roadmapId: track.roadmapId },
        { $set: track },
        { upsert: true }
      );

      const status = res.upsertedCount > 0 ? 'Created' : 'Updated';
      console.log(`  ✓ [${status}] Roadmap: ${track.roadmapId} ("${track.title}")`);
      upsertedCount++;
    }

    console.log(`\n🎉 Successfully seeded ${upsertedCount} roadmaps into MongoDB Atlas.`);

    // Question Bank Inspection & Diagnostic Report
    console.log('\n📋 Question Bank Status:');
    console.log('  Notice regarding test_questions.csv:');
    console.log('  - test_questions.csv contains generic trivia without required schema fields:');
    console.log('    • Missing "explanation" (required by Question model, minlength 10)');
    console.log('    • Missing "category" hierarchy array (required, minlength 1)');
    console.log('    • Missing "generatedBy" enum ("AI" | "Human")');
    console.log('    • Missing "adminApproved" boolean flag');
    console.log('  - To seed questions, use an exam seed script with compliant question schemas (see seed-exam.js).');

    console.log('\n✨ Database seeding completed safely and idempotently.');
  } catch (err) {
    console.error('❌ Seeding failed with error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB Atlas.');
    process.exit(0);
  }
}

seed();
