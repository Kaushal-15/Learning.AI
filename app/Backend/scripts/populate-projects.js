require('dotenv').config();
const mongoose = require('mongoose');
const Roadmap = require('../models/Roadmap');

const PROJECTS = {
    'full-stack-development': [
        {
            id: 'fullstack-easy',
            difficulty: 'easy',
            title: 'Personal Portfolio Website',
            description: 'Create a responsive personal portfolio website using HTML, CSS, and basic JavaScript. Showcase your skills, projects, and contact information.',
            exampleUrl: 'https://github.com/topics/portfolio-website',
            requirements: [
                'Responsive design for mobile and desktop',
                'About Me section',
                'Projects gallery',
                'Contact form (static or functional)'
            ]
        },
        {
            id: 'fullstack-medium',
            difficulty: 'medium',
            title: 'Task Management App',
            description: 'Build a full-stack task management application (ToDo list) with CRUD operations. Use React for frontend and Node/Express for backend with MongoDB.',
            exampleUrl: 'https://github.com/topics/todo-app',
            requirements: [
                'User authentication (optional)',
                'Create, Read, Update, Delete tasks',
                'Task categorization or tagging',
                'Persistent storage in MongoDB'
            ]
        },
        {
            id: 'fullstack-hard',
            difficulty: 'hard',
            title: 'E-commerce Platform',
            description: 'Develop a comprehensive e-commerce platform with product listings, shopping cart, user authentication, and payment integration simulation.',
            exampleUrl: 'https://github.com/topics/ecommerce-website',
            requirements: [
                'User authentication and profiles',
                'Product search and filtering',
                'Shopping cart and checkout process',
                'Admin dashboard for product management',
                'Order history'
            ]
        }
    ],
    'frontend-development': [
        {
            id: 'frontend-easy',
            difficulty: 'easy',
            title: 'Weather Dashboard',
            description: 'Build a weather dashboard that fetches data from a public API and displays current weather and forecast for searched cities.',
            exampleUrl: 'https://github.com/topics/weather-app',
            requirements: [
                'Fetch data from OpenWeatherMap or similar API',
                'Search functionality for cities',
                'Display current temperature, humidity, and conditions',
                'Responsive layout'
            ]
        },
        {
            id: 'frontend-medium',
            difficulty: 'medium',
            title: 'Movie Discovery App',
            description: 'Create a movie discovery application using TMDB API. Allow users to browse popular movies, search, and view details.',
            exampleUrl: 'https://github.com/topics/movie-app',
            requirements: [
                'Fetch data from TMDB API',
                'Search and filter functionality',
                'Movie detail pages with trailers',
                'Favorites list using local storage'
            ]
        },
        {
            id: 'frontend-hard',
            difficulty: 'hard',
            title: 'Social Media Dashboard',
            description: 'Build a complex social media dashboard with charts, data visualization, and real-time updates simulation.',
            exampleUrl: 'https://github.com/topics/admin-dashboard',
            requirements: [
                'Interactive charts using Recharts or Chart.js',
                'Dark/Light mode toggle',
                'Data tables with sorting and pagination',
                'Responsive sidebar navigation'
            ]
        }
    ],
    'backend-development': [
        {
            id: 'backend-easy',
            difficulty: 'easy',
            title: 'RESTful API for Blog',
            description: 'Design and implement a RESTful API for a blogging platform. Handle posts, comments, and basic user management.',
            exampleUrl: 'https://github.com/topics/blog-api',
            requirements: [
                'CRUD endpoints for Posts',
                'Endpoints for Comments',
                'Error handling and validation',
                'MongoDB integration'
            ]
        },
        {
            id: 'backend-medium',
            difficulty: 'medium',
            title: 'Authentication System',
            description: 'Build a secure authentication system with JWT, password hashing, and email verification simulation.',
            exampleUrl: 'https://github.com/topics/authentication-api',
            requirements: [
                'User registration and login',
                'JWT token generation and verification',
                'Password hashing with bcrypt',
                'Protected routes middleware'
            ]
        },
        {
            id: 'backend-hard',
            difficulty: 'hard',
            title: 'Real-time Chat Server',
            description: 'Develop a real-time chat server using WebSockets (Socket.io). Support private messaging and chat rooms.',
            exampleUrl: 'https://github.com/topics/chat-application',
            requirements: [
                'Real-time messaging with Socket.io',
                'Chat rooms and private messages',
                'Message persistence in database',
                'Online user status'
            ]
        }
    ],
    'mobile-app-development': [
        {
            id: 'mobile-easy',
            difficulty: 'easy',
            title: 'Expense Tracker App',
            description: 'Build a simple expense tracking mobile app with local storage. Users can add, view, and categorize their daily expenses.',
            exampleUrl: 'https://github.com/topics/expense-tracker',
            requirements: [
                'Add/Edit/Delete expense entries',
                'Categorize expenses (Food, Transport, etc.)',
                'Local storage for data persistence',
                'Simple statistics view (total by category)'
            ]
        },
        {
            id: 'mobile-medium',
            difficulty: 'medium',
            title: 'Fitness Tracking App',
            description: 'Create a fitness tracking app with workout logging, progress charts, and goal setting. Include camera integration for progress photos.',
            exampleUrl: 'https://github.com/topics/fitness-app',
            requirements: [
                'User profile with goals',
                'Log workouts with sets/reps/weight',
                'Progress charts and statistics',
                'Camera integration for progress photos',
                'Local notifications for workout reminders'
            ]
        },
        {
            id: 'mobile-hard',
            difficulty: 'hard',
            title: 'Social Recipe Sharing App',
            description: 'Develop a social recipe sharing app with real-time features, image uploads, user authentication, and recipe recommendations.',
            exampleUrl: 'https://github.com/topics/recipe-app',
            requirements: [
                'User authentication (Firebase/Auth0)',
                'Create/Share recipes with images',
                'Real-time comments and likes',
                'Search and filter recipes',
                'Personalized recipe recommendations',
                'Offline mode with data sync'
            ]
        }
    ],
    'database-data-science': [
        {
            id: 'database-easy',
            difficulty: 'easy',
            title: 'Library Management System',
            description: 'Design and implement a relational database for a library management system. Include tables for books, members, and borrowing records.',
            exampleUrl: 'https://github.com/topics/library-management',
            requirements: [
                'Database schema design (ERD)',
                'Tables: Books, Members, Borrowings',
                'SQL queries for common operations',
                'Basic CRUD operations',
                'Sample data insertion'
            ]
        },
        {
            id: 'database-medium',
            difficulty: 'medium',
            title: 'Sales Data Analysis Dashboard',
            description: 'Create a data analysis project using Python/Pandas. Analyze sales data, create visualizations, and generate insights.',
            exampleUrl: 'https://github.com/topics/data-analysis',
            requirements: [
                'Data cleaning and preprocessing',
                'Exploratory Data Analysis (EDA)',
                'Statistical analysis and trends',
                'Visualizations (matplotlib/seaborn)',
                'Insights report with recommendations'
            ]
        },
        {
            id: 'database-hard',
            difficulty: 'hard',
            title: 'Predictive Analytics Pipeline',
            description: 'Build an end-to-end data pipeline with ETL processes, data warehousing, and machine learning for predictive analytics.',
            exampleUrl: 'https://github.com/topics/data-pipeline',
            requirements: [
                'ETL pipeline for data ingestion',
                'Data warehouse design (star schema)',
                'Feature engineering',
                'ML model for predictions',
                'Automated reporting dashboard',
                'Performance optimization'
            ]
        }
    ],
    'cybersecurity': [
        {
            id: 'cybersecurity-easy',
            difficulty: 'easy',
            title: 'Password Strength Checker',
            description: 'Create a password strength analyzer that evaluates passwords based on security best practices and provides recommendations.',
            exampleUrl: 'https://github.com/topics/password-checker',
            requirements: [
                'Check password length, complexity',
                'Detect common passwords',
                'Entropy calculation',
                'Strength visualization',
                'Security recommendations'
            ]
        },
        {
            id: 'cybersecurity-medium',
            difficulty: 'medium',
            title: 'Network Traffic Analyzer',
            description: 'Build a network packet analyzer tool that captures and analyzes network traffic, identifying potential security threats.',
            exampleUrl: 'https://github.com/topics/network-security',
            requirements: [
                'Packet capture using Scapy/Wireshark',
                'Protocol analysis (HTTP, DNS, TCP)',
                'Anomaly detection',
                'Traffic visualization',
                'Security alerts for suspicious activity'
            ]
        },
        {
            id: 'cybersecurity-hard',
            difficulty: 'hard',
            title: 'Vulnerability Scanner & Penetration Testing Tool',
            description: 'Develop a comprehensive security tool that scans web applications for common vulnerabilities (OWASP Top 10) and generates reports.',
            exampleUrl: 'https://github.com/topics/security-scanner',
            requirements: [
                'SQL injection detection',
                'XSS vulnerability scanning',
                'Authentication bypass testing',
                'Port scanning and service detection',
                'Detailed vulnerability reports',
                'Remediation recommendations'
            ]
        }
    ],
    'devops-cloud': [
        {
            id: 'devops-easy',
            difficulty: 'easy',
            title: 'Automated Deployment Script',
            description: 'Create a shell script to automate the deployment of a web application to a server, including dependency installation and service restart.',
            exampleUrl: 'https://github.com/topics/deployment-automation',
            requirements: [
                'Git pull latest code',
                'Install/update dependencies',
                'Run tests before deployment',
                'Restart application service',
                'Logging and error handling'
            ]
        },
        {
            id: 'devops-medium',
            difficulty: 'medium',
            title: 'Docker Containerization Project',
            description: 'Containerize a full-stack application using Docker and Docker Compose. Include multi-stage builds and environment configurations.',
            exampleUrl: 'https://github.com/topics/docker-compose',
            requirements: [
                'Dockerfiles for frontend and backend',
                'Docker Compose for orchestration',
                'Multi-stage builds for optimization',
                'Environment variable management',
                'Volume mounting for persistence',
                'Health checks and restart policies'
            ]
        },
        {
            id: 'devops-hard',
            difficulty: 'hard',
            title: 'CI/CD Pipeline with Kubernetes',
            description: 'Build a complete CI/CD pipeline using Jenkins/GitHub Actions, deploy to Kubernetes cluster with monitoring and auto-scaling.',
            exampleUrl: 'https://github.com/topics/kubernetes-deployment',
            requirements: [
                'CI/CD pipeline configuration',
                'Kubernetes deployment manifests',
                'Auto-scaling based on metrics',
                'Rolling updates and rollbacks',
                'Monitoring with Prometheus/Grafana',
                'Logging aggregation',
                'Infrastructure as Code (Terraform/Helm)'
            ]
        }
    ],
    'ai-machine-learning': [
        {
            id: 'ai-easy',
            difficulty: 'easy',
            title: 'Spam Email Classifier',
            description: 'Build a machine learning model to classify emails as spam or not spam using natural language processing techniques.',
            exampleUrl: 'https://github.com/topics/spam-detection',
            requirements: [
                'Data preprocessing and cleaning',
                'Text vectorization (TF-IDF/Bag of Words)',
                'Train classification model (Naive Bayes/SVM)',
                'Model evaluation (accuracy, precision, recall)',
                'Simple web interface for testing'
            ]
        },
        {
            id: 'ai-medium',
            difficulty: 'medium',
            title: 'Image Classification with CNN',
            description: 'Create a convolutional neural network to classify images into categories. Use transfer learning with pre-trained models.',
            exampleUrl: 'https://github.com/topics/image-classification',
            requirements: [
                'Dataset preparation and augmentation',
                'CNN architecture design or transfer learning',
                'Training with validation split',
                'Performance visualization (loss/accuracy curves)',
                'Model deployment as REST API',
                'Web interface for image upload and prediction'
            ]
        },
        {
            id: 'ai-hard',
            difficulty: 'hard',
            title: 'Chatbot with NLP and Context Awareness',
            description: 'Develop an intelligent chatbot using NLP, intent recognition, and context management. Include sentiment analysis and multi-turn conversations.',
            exampleUrl: 'https://github.com/topics/chatbot',
            requirements: [
                'Intent classification and entity extraction',
                'Context management for multi-turn conversations',
                'Sentiment analysis',
                'Integration with knowledge base',
                'Response generation (rule-based or generative)',
                'Web interface with chat UI',
                'Conversation history and analytics'
            ]
        }
    ],
    // Default projects for other roadmaps if specific ones aren't defined
    'default': [
        {
            id: 'default-easy',
            difficulty: 'easy',
            title: 'Topic Starter Project',
            description: 'Create a basic project demonstrating core concepts of this roadmap. Focus on setting up the environment and "Hello World" equivalent.',
            exampleUrl: 'https://github.com/topics/starter-project',
            requirements: [
                'Environment setup',
                'Basic implementation of core concept',
                'Documentation (README)'
            ]
        },
        {
            id: 'default-medium',
            difficulty: 'medium',
            title: 'Intermediate Application',
            description: 'Build an application that integrates multiple concepts. Focus on structure, data flow, and best practices.',
            exampleUrl: 'https://github.com/topics/intermediate-project',
            requirements: [
                'Modular code structure',
                'Data handling/storage',
                'Error handling',
                'Unit tests'
            ]
        },
        {
            id: 'default-hard',
            difficulty: 'hard',
            title: 'Advanced Capstone',
            description: 'Develop a production-ready application solving a real-world problem. Focus on scalability, security, and performance.',
            exampleUrl: 'https://github.com/topics/capstone-project',
            requirements: [
                'Full feature set implementation',
                'Security best practices',
                'Performance optimization',
                'Deployment documentation'
            ]
        }
    ]
};

// Roadmap metadata
const ROADMAP_METADATA = {
    'full-stack-development': {
        title: 'Full-Stack Development',
        description: 'Master both frontend and backend development',
        category: 'dsa'
    },
    'frontend-development': {
        title: 'Frontend Development',
        description: 'Build beautiful and interactive user interfaces',
        category: 'frontend'
    },
    'backend-development': {
        title: 'Backend Development',
        description: 'Create robust server-side applications and APIs',
        category: 'backend'
    },
    'mobile-app-development': {
        title: 'Mobile App Development',
        description: 'Develop native and cross-platform mobile applications',
        category: 'mobile'
    },
    'database-data-science': {
        title: 'Database & Data Science',
        description: 'Master data management and analysis',
        category: 'database'
    },
    'cybersecurity': {
        title: 'Cybersecurity',
        description: 'Learn to protect systems and data from threats',
        category: 'cybersecurity'
    },
    'devops-cloud': {
        title: 'DevOps & Cloud',
        description: 'Automate deployment and manage cloud infrastructure',
        category: 'devops'
    },
    'ai-machine-learning': {
        title: 'AI & Machine Learning',
        description: 'Build intelligent systems with machine learning',
        category: 'ai'
    }
};

async function populateProjects() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const roadmapIds = [
            'full-stack-development',
            'frontend-development',
            'backend-development',
            'mobile-app-development',
            'database-data-science',
            'cybersecurity',
            'devops-cloud',
            'ai-machine-learning'
        ];

        for (const roadmapId of roadmapIds) {
            let projectsToAdd = PROJECTS[roadmapId];

            if (!projectsToAdd) {
                console.log(`No specific projects for ${roadmapId}, using defaults.`);
                projectsToAdd = PROJECTS['default'].map(p => ({
                    ...p,
                    id: `${roadmapId}-${p.difficulty}`
                }));
            }

            const metadata = ROADMAP_METADATA[roadmapId];

            // Use updateOne with upsert to create or update the roadmap
            const result = await Roadmap.updateOne(
                { roadmapId: roadmapId },
                {
                    $set: {
                        roadmapId: roadmapId,
                        title: metadata.title,
                        description: metadata.description,
                        category: metadata.category,
                        skills: [],
                        levels: [],
                        projects: projectsToAdd
                    }
                },
                { upsert: true }
            );

            if (result.upsertedCount > 0) {
                console.log(`✅ Created roadmap: ${metadata.title} (${roadmapId})`);
            } else {
                console.log(`✅ Updated roadmap: ${metadata.title} (${roadmapId})`);
            }
        }

        console.log('\n🎉 All roadmaps updated with projects!');
    } catch (error) {
        console.error('❌ Error populating projects:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

populateProjects();
