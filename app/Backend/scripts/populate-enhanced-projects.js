require('dotenv').config();
const mongoose = require('mongoose');
const Roadmap = require('../models/Roadmap');

const ENHANCED_PROJECTS = {
    'full-stack': [
        {
            id: 'fullstack-easy',
            difficulty: 'easy',
            difficultyLevel: 3,
            title: 'Personal Portfolio with CMS',
            description: 'Build a modern, responsive personal portfolio website with an integrated content management system. Showcase your projects, skills, and blog posts with an admin panel for easy content updates.',
            exampleUrl: 'https://github.com/topics/portfolio-cms',
            estimatedTime: '20-30 hours',
            requirements: [
                'Responsive design for all devices',
                'Dynamic project showcase with filtering',
                'Blog section with markdown support',
                'Admin panel for content management',
                'Contact form with email integration',
                'SEO optimization'
            ],
            techStack: [
                'React.js',
                'Node.js/Express',
                'MongoDB',
                'TailwindCSS',
                'JWT Authentication',
                'Nodemailer'
            ],
            features: [
                'Hero section with animated elements',
                'Project gallery with categories and tags',
                'Blog with rich text editor',
                'Admin dashboard for CRUD operations',
                'Contact form with validation',
                'Dark/Light mode toggle',
                'Analytics integration'
            ],
            learningOutcomes: [
                'Full-stack application architecture',
                'RESTful API design and implementation',
                'User authentication and authorization',
                'Database modeling and relationships',
                'Responsive UI development',
                'Deployment and hosting'
            ],
            implementationGuide: `**Phase 1: Setup & Planning**
- Initialize React frontend and Express backend
- Set up MongoDB database and define schemas
- Plan component structure and API endpoints

**Phase 2: Backend Development**
- Create User, Project, and Blog models
- Implement authentication with JWT
- Build CRUD APIs for all resources
- Add email service for contact form

**Phase 3: Frontend Development**
- Build reusable components (Navbar, Footer, Cards)
- Create public pages (Home, Projects, Blog, Contact)
- Develop admin panel with protected routes
- Implement forms with validation

**Phase 4: Integration & Polish**
- Connect frontend to backend APIs
- Add loading states and error handling
- Implement dark mode
- Optimize performance and SEO

**Phase 5: Deployment**
- Deploy backend to Heroku/Railway
- Deploy frontend to Vercel/Netlify
- Configure environment variables
- Test production build`,
            bonusChallenges: [
                'Add multi-language support (i18n)',
                'Implement image optimization and lazy loading',
                'Add visitor analytics dashboard',
                'Create downloadable resume feature',
                'Integrate social media feeds'
            ]
        },
        {
            id: 'fullstack-medium',
            difficulty: 'medium',
            difficultyLevel: 6,
            title: 'Real-Time Collaboration Tool',
            description: 'Develop a team collaboration platform with real-time document editing, chat, and file sharing. Think of it as a simplified version of Notion or Slack combined.',
            exampleUrl: 'https://github.com/topics/collaboration-tool',
            estimatedTime: '40-60 hours',
            requirements: [
                'Real-time collaborative text editing',
                'Team chat with channels and DMs',
                'File upload and sharing',
                'User presence indicators',
                'Workspace management',
                'Search functionality'
            ],
            techStack: [
                'React.js',
                'Socket.io',
                'Express.js',
                'PostgreSQL',
                'Redis',
                'AWS S3',
                'Operational Transform/CRDT'
            ],
            features: [
                'Real-time document collaboration with conflict resolution',
                'Channel-based and direct messaging',
                'File upload with preview',
                'Online/offline user status',
                'Typing indicators',
                'Message reactions and threads',
                'Workspace invitations',
                'Role-based permissions'
            ],
            learningOutcomes: [
                'WebSocket implementation with Socket.io',
                'Real-time data synchronization',
                'Operational transformation for collaborative editing',
                'Redis for caching and pub/sub',
                'File storage with cloud services',
                'Complex state management',
                'Scalable architecture patterns'
            ],
            implementationGuide: `**Phase 1: Core Setup**
- Set up monorepo or separate repos
- Configure Socket.io server
- Set up PostgreSQL with proper schemas
- Configure Redis for caching

**Phase 2: Authentication & Workspaces**
- Implement user registration/login
- Create workspace management
- Add team member invitations
- Set up role-based access control

**Phase 3: Real-Time Features**
- Implement Socket.io event handlers
- Build collaborative text editor with OT
- Create chat system with channels
- Add user presence tracking

**Phase 4: File Management**
- Set up AWS S3 bucket
- Implement file upload/download
- Add file preview functionality
- Create file sharing permissions

**Phase 5: Polish & Optimization**
- Add search across documents and messages
- Implement notifications
- Optimize WebSocket connections
- Add offline support with service workers

**Phase 6: Testing & Deployment**
- Write integration tests
- Load testing for concurrent users
- Deploy with Docker containers
- Set up CI/CD pipeline`,
            bonusChallenges: [
                'Add video/audio calling with WebRTC',
                'Implement rich text formatting (bold, italic, lists)',
                'Create mobile app with React Native',
                'Add AI-powered search and suggestions',
                'Implement end-to-end encryption for messages'
            ]
        },
        {
            id: 'fullstack-hard',
            difficulty: 'hard',
            difficultyLevel: 9,
            title: 'Multi-Tenant SaaS Platform',
            description: 'Build a complete Software-as-a-Service platform with multi-tenancy, subscription management, and comprehensive admin dashboard. This is a production-ready application architecture.',
            exampleUrl: 'https://github.com/topics/saas-platform',
            estimatedTime: '80-120 hours',
            requirements: [
                'Multi-tenant architecture with data isolation',
                'Subscription plans with Stripe integration',
                'Admin dashboard with analytics',
                'API rate limiting and usage tracking',
                'Email notification system',
                'Comprehensive audit logging'
            ],
            techStack: [
                'Next.js 14 (App Router)',
                'NestJS',
                'PostgreSQL with Row-Level Security',
                'Prisma ORM',
                'Stripe API',
                'AWS S3',
                'Redis',
                'Bull Queue',
                'SendGrid/Resend'
            ],
            features: [
                'Tenant isolation at database level',
                'Subscription management (trial, paid, enterprise)',
                'Payment processing with Stripe',
                'Usage-based billing',
                'Admin panel for tenant management',
                'Analytics dashboard with charts',
                'API key management',
                'Webhook system',
                'Email templates and automation',
                'Audit trail for all actions',
                'Role-based access control (RBAC)',
                'SSO integration (OAuth2)'
            ],
            learningOutcomes: [
                'Multi-tenant architecture patterns',
                'Payment gateway integration',
                'Subscription and billing logic',
                'Database row-level security',
                'Background job processing',
                'Email automation systems',
                'API design and versioning',
                'Security best practices',
                'Scalable application architecture',
                'DevOps and deployment strategies'
            ],
            implementationGuide: `**Phase 1: Architecture & Setup**
- Design multi-tenant database schema
- Set up Next.js and NestJS projects
- Configure PostgreSQL with RLS
- Set up Prisma with multi-schema support

**Phase 2: Authentication & Tenancy**
- Implement auth with NextAuth.js
- Create tenant registration flow
- Set up subdomain routing
- Implement tenant context middleware

**Phase 3: Subscription System**
- Integrate Stripe API
- Create subscription plans
- Implement checkout flow
- Add webhook handlers for payment events
- Build billing portal

**Phase 4: Core Features**
- Build tenant admin dashboard
- Implement user management
- Create API key system
- Add usage tracking and analytics
- Set up rate limiting

**Phase 5: Background Jobs**
- Configure Bull queue with Redis
- Create email notification jobs
- Implement data export jobs
- Add scheduled tasks (billing, reminders)

**Phase 6: Admin Platform**
- Build super admin dashboard
- Add tenant management
- Create analytics and reporting
- Implement audit logs viewer

**Phase 7: Security & Optimization**
- Add comprehensive error handling
- Implement logging and monitoring
- Set up automated backups
- Add security headers and CORS
- Optimize database queries

**Phase 8: Testing & Deployment**
- Write unit and integration tests
- Set up E2E testing
- Configure CI/CD pipeline
- Deploy to AWS/Vercel
- Set up monitoring and alerts`,
            bonusChallenges: [
                'Add white-label customization for tenants',
                'Implement advanced analytics with data warehouse',
                'Create mobile app for tenant management',
                'Add AI-powered insights and recommendations',
                'Implement multi-region deployment',
                'Add GraphQL API alongside REST',
                'Create marketplace for third-party integrations'
            ]
        }
    ],
    'frontend': [
        {
            id: 'frontend-easy',
            difficulty: 'easy',
            difficultyLevel: 3,
            title: 'Interactive Landing Page Builder',
            description: 'Create a drag-and-drop landing page builder where users can create beautiful landing pages without coding. Export the final result as HTML/CSS.',
            exampleUrl: 'https://github.com/topics/page-builder',
            estimatedTime: '25-35 hours',
            requirements: [
                'Drag-and-drop interface',
                'Pre-built component library',
                'Real-time preview',
                'Export to HTML/CSS',
                'Responsive design controls',
                'Style customization panel'
            ],
            techStack: [
                'React.js',
                'React DnD / dnd-kit',
                'TailwindCSS',
                'Zustand/Redux',
                'React Color',
                'html2canvas'
            ],
            features: [
                'Component library (headers, heroes, features, testimonials, CTAs)',
                'Drag-and-drop canvas',
                'Property editor for each component',
                'Color picker and font selector',
                'Responsive breakpoint preview',
                'Undo/redo functionality',
                'Save/load projects to localStorage',
                'Export as HTML/CSS files'
            ],
            learningOutcomes: [
                'Drag-and-drop implementation',
                'Complex state management',
                'Component composition patterns',
                'Dynamic styling and theming',
                'File generation and download',
                'Local storage management'
            ],
            implementationGuide: `**Phase 1: Setup**
- Initialize React project with Vite
- Set up TailwindCSS
- Install dnd-kit library
- Plan component structure

**Phase 2: Component Library**
- Create reusable landing page components
- Make components configurable via props
- Add default styles and variants

**Phase 3: Drag-and-Drop**
- Implement drag-and-drop canvas
- Create component palette
- Add drop zones and sorting

**Phase 4: Editor Panel**
- Build property editor
- Add color picker
- Implement font selector
- Create spacing/sizing controls

**Phase 5: Features**
- Add undo/redo with history
- Implement save/load functionality
- Create responsive preview modes
- Build export functionality

**Phase 6: Polish**
- Add animations and transitions
- Improve UX with loading states
- Add keyboard shortcuts
- Create onboarding tutorial`,
            bonusChallenges: [
                'Add template gallery with pre-made designs',
                'Implement custom CSS editor',
                'Add image upload and management',
                'Create collaboration features',
                'Add SEO meta tags editor'
            ]
        },
        {
            id: 'frontend-medium',
            difficulty: 'medium',
            difficultyLevel: 6,
            title: 'Advanced Analytics Dashboard',
            description: 'Build a comprehensive analytics dashboard with interactive charts, real-time data updates, and advanced filtering. Perfect for displaying business metrics and KPIs.',
            exampleUrl: 'https://github.com/topics/analytics-dashboard',
            estimatedTime: '45-60 hours',
            requirements: [
                'Multiple chart types (line, bar, pie, area)',
                'Real-time data updates',
                'Advanced filtering and date ranges',
                'Export reports (PDF, CSV)',
                'Responsive layout',
                'Dark/Light theme'
            ],
            techStack: [
                'React.js',
                'TypeScript',
                'Recharts or D3.js',
                'Redux Toolkit',
                'React Query',
                'TailwindCSS',
                'date-fns',
                'jsPDF'
            ],
            features: [
                'Interactive charts with tooltips and legends',
                'Real-time data simulation/WebSocket integration',
                'Date range picker with presets',
                'Multi-dimensional filtering',
                'Drill-down capabilities',
                'Comparison mode (YoY, MoM)',
                'Custom metric builder',
                'Export to PDF and CSV',
                'Customizable dashboard layout',
                'Saved views and bookmarks'
            ],
            learningOutcomes: [
                'Data visualization best practices',
                'Complex state management with Redux',
                'TypeScript in React applications',
                'Performance optimization for large datasets',
                'Real-time data handling',
                'Advanced filtering logic',
                'Report generation'
            ],
            implementationGuide: `**Phase 1: Project Setup**
- Initialize React + TypeScript project
- Configure Redux Toolkit
- Set up TailwindCSS
- Install charting library

**Phase 2: Data Layer**
- Create mock data generators
- Set up Redux slices for data
- Implement React Query for API calls
- Add data transformation utilities

**Phase 3: Chart Components**
- Build reusable chart wrappers
- Create line, bar, pie, area charts
- Add interactive features (zoom, pan, tooltips)
- Implement responsive behavior

**Phase 4: Dashboard Layout**
- Create grid-based layout system
- Add drag-to-resize functionality
- Implement widget system
- Build customization panel

**Phase 5: Filtering & Controls**
- Create date range picker
- Build multi-select filters
- Add comparison mode
- Implement search functionality

**Phase 6: Advanced Features**
- Add real-time updates
- Create export functionality
- Build saved views system
- Add keyboard shortcuts

**Phase 7: Optimization**
- Implement virtualization for large lists
- Add memoization for expensive calculations
- Optimize re-renders
- Add loading skeletons`,
            bonusChallenges: [
                'Add AI-powered insights and anomaly detection',
                'Implement custom query builder',
                'Add collaboration features (comments, sharing)',
                'Create mobile-responsive version',
                'Add scheduled email reports',
                'Implement A/B testing dashboard'
            ]
        },
        {
            id: 'frontend-hard',
            difficulty: 'hard',
            difficultyLevel: 9,
            title: 'Progressive Web App with Offline Support',
            description: 'Build a full-featured Progressive Web App with offline capabilities, background sync, push notifications, and installability. Create a note-taking or task management app.',
            exampleUrl: 'https://github.com/topics/progressive-web-app',
            estimatedTime: '60-90 hours',
            requirements: [
                'Full offline functionality',
                'Service Worker implementation',
                'Background sync',
                'Push notifications',
                'Installable on mobile and desktop',
                'Optimistic UI updates'
            ],
            techStack: [
                'React.js',
                'TypeScript',
                'Workbox',
                'IndexedDB (Dexie.js)',
                'Web Push API',
                'PWA Builder',
                'Redux Toolkit',
                'TailwindCSS'
            ],
            features: [
                'Complete offline mode with local storage',
                'Background sync for pending changes',
                'Push notifications for reminders',
                'Installable as native app',
                'Optimistic UI updates',
                'Conflict resolution for sync',
                'Rich text editing',
                'File attachments with offline access',
                'Search with full-text indexing',
                'Categories and tags',
                'Data export/import',
                'Cross-device sync'
            ],
            learningOutcomes: [
                'Service Worker lifecycle and strategies',
                'IndexedDB for client-side storage',
                'Background sync implementation',
                'Push notification system',
                'PWA manifest configuration',
                'Offline-first architecture',
                'Conflict resolution strategies',
                'Performance optimization',
                'Web APIs (Cache, Notification, etc.)'
            ],
            implementationGuide: `**Phase 1: PWA Foundation**
- Set up React project with PWA template
- Configure service worker with Workbox
- Create manifest.json
- Set up IndexedDB with Dexie.js

**Phase 2: Core Application**
- Build note/task management UI
- Implement CRUD operations
- Add rich text editor
- Create categories and tags system

**Phase 3: Offline Functionality**
- Implement offline detection
- Set up IndexedDB schema
- Create sync queue for pending changes
- Add optimistic UI updates

**Phase 4: Service Worker**
- Configure caching strategies
- Implement background sync
- Add offline fallback pages
- Handle service worker updates

**Phase 5: Push Notifications**
- Set up push notification server
- Implement subscription management
- Create notification triggers
- Add notification actions

**Phase 6: Sync & Conflict Resolution**
- Build sync engine
- Implement conflict detection
- Create merge strategies
- Add sync status indicators

**Phase 7: Advanced Features**
- Add file attachments
- Implement full-text search
- Create data export/import
- Add sharing capabilities

**Phase 8: Optimization & Testing**
- Optimize bundle size
- Implement code splitting
- Add performance monitoring
- Test on multiple devices
- Lighthouse audit optimization`,
            bonusChallenges: [
                'Add end-to-end encryption for notes',
                'Implement voice input and dictation',
                'Add OCR for image-to-text',
                'Create browser extension version',
                'Add collaborative editing',
                'Implement version history',
                'Add AI-powered suggestions and auto-complete'
            ]
        }
    ],
    'backend': [
        {
            id: 'backend-easy',
            difficulty: 'easy',
            difficultyLevel: 3,
            title: 'RESTful API with Auto-Generated Documentation',
            description: 'Build a complete RESTful API for a blog platform with automatic API documentation using Swagger/OpenAPI. Include authentication, validation, and error handling.',
            exampleUrl: 'https://github.com/topics/rest-api',
            estimatedTime: '25-35 hours',
            requirements: [
                'CRUD operations for posts and comments',
                'User authentication with JWT',
                'Input validation and sanitization',
                'Auto-generated API documentation',
                'Error handling middleware',
                'Rate limiting'
            ],
            techStack: [
                'Node.js',
                'Express.js',
                'MongoDB/Mongoose',
                'JWT',
                'Swagger/OpenAPI',
                'Joi/Express-validator',
                'express-rate-limit'
            ],
            features: [
                'User registration and login',
                'CRUD for blog posts',
                'Comments system',
                'Like/unlike functionality',
                'Search and filtering',
                'Pagination',
                'Interactive API documentation',
                'Request validation',
                'Error responses with proper status codes',
                'Rate limiting per endpoint'
            ],
            learningOutcomes: [
                'RESTful API design principles',
                'JWT authentication implementation',
                'MongoDB schema design',
                'Input validation strategies',
                'API documentation with Swagger',
                'Error handling patterns',
                'Security best practices'
            ],
            implementationGuide: `**Phase 1: Setup**
- Initialize Node.js project
- Set up Express server
- Connect to MongoDB
- Configure environment variables

**Phase 2: Database Models**
- Create User model
- Create Post model
- Create Comment model
- Add indexes for performance

**Phase 3: Authentication**
- Implement registration endpoint
- Create login with JWT
- Build auth middleware
- Add password hashing

**Phase 4: CRUD Endpoints**
- Build post endpoints (CRUD)
- Create comment endpoints
- Add like/unlike functionality
- Implement search and filters

**Phase 5: Validation & Error Handling**
- Add request validation
- Create error handling middleware
- Implement custom error classes
- Add logging

**Phase 6: Documentation**
- Set up Swagger
- Document all endpoints
- Add request/response examples
- Create API testing interface

**Phase 7: Security & Polish**
- Add rate limiting
- Implement CORS
- Add security headers
- Write tests`,
            bonusChallenges: [
                'Add image upload with Cloudinary',
                'Implement email verification',
                'Add social auth (Google, GitHub)',
                'Create admin dashboard endpoints',
                'Add analytics tracking'
            ]
        },
        {
            id: 'backend-medium',
            difficulty: 'medium',
            difficultyLevel: 6,
            title: 'Microservices Architecture',
            description: 'Design and implement a microservices-based e-commerce backend with separate services for users, products, orders, and payments. Use message queues for inter-service communication.',
            exampleUrl: 'https://github.com/topics/microservices',
            estimatedTime: '50-70 hours',
            requirements: [
                'Multiple independent services',
                'Message queue for async communication',
                'API Gateway',
                'Service discovery',
                'Distributed logging',
                'Docker containerization'
            ],
            techStack: [
                'Node.js/Express',
                'RabbitMQ or Apache Kafka',
                'MongoDB/PostgreSQL',
                'Redis',
                'Docker',
                'Nginx (API Gateway)',
                'Winston (Logging)',
                'Consul/Eureka (Service Discovery)'
            ],
            features: [
                'User Service (auth, profiles)',
                'Product Service (catalog, inventory)',
                'Order Service (cart, checkout)',
                'Payment Service (payment processing)',
                'Notification Service (emails, SMS)',
                'API Gateway for routing',
                'Event-driven communication',
                'Distributed caching',
                'Centralized logging',
                'Health checks and monitoring'
            ],
            learningOutcomes: [
                'Microservices architecture patterns',
                'Message queue implementation',
                'Service-to-service communication',
                'API Gateway design',
                'Docker containerization',
                'Distributed system challenges',
                'Event-driven architecture',
                'Service orchestration'
            ],
            implementationGuide: `**Phase 1: Architecture Design**
- Design service boundaries
- Plan database per service
- Define communication patterns
- Create API contracts

**Phase 2: Core Services**
- Build User Service
- Create Product Service
- Implement Order Service
- Develop Payment Service

**Phase 3: Message Queue**
- Set up RabbitMQ/Kafka
- Create event publishers
- Implement event consumers
- Add dead letter queues

**Phase 4: API Gateway**
- Set up Nginx or custom gateway
- Implement routing rules
- Add authentication middleware
- Configure rate limiting

**Phase 5: Service Discovery**
- Set up service registry
- Implement health checks
- Add auto-discovery
- Configure load balancing

**Phase 6: Observability**
- Implement centralized logging
- Add distributed tracing
- Set up monitoring
- Create dashboards

**Phase 7: Containerization**
- Create Dockerfiles for each service
- Write docker-compose.yml
- Set up networking
- Add volume management

**Phase 8: Testing & Deployment**
- Write integration tests
- Test service communication
- Deploy to cloud
- Set up CI/CD`,
            bonusChallenges: [
                'Implement saga pattern for distributed transactions',
                'Add GraphQL federation',
                'Create service mesh with Istio',
                'Implement circuit breaker pattern',
                'Add Kubernetes orchestration',
                'Create admin dashboard for monitoring'
            ]
        },
        {
            id: 'backend-hard',
            difficulty: 'hard',
            difficultyLevel: 9,
            title: 'GraphQL API with Real-Time Subscriptions',
            description: 'Build a sophisticated GraphQL API with queries, mutations, subscriptions, and advanced features like DataLoader for N+1 optimization, custom directives, and comprehensive caching.',
            exampleUrl: 'https://github.com/topics/graphql-api',
            estimatedTime: '70-100 hours',
            requirements: [
                'Complete GraphQL schema',
                'Real-time subscriptions',
                'DataLoader for optimization',
                'Custom directives',
                'Query complexity analysis',
                'Comprehensive caching strategy'
            ],
            techStack: [
                'Apollo Server',
                'GraphQL',
                'PostgreSQL',
                'Prisma ORM',
                'Redis',
                'WebSockets',
                'DataLoader',
                'GraphQL Shield',
                'graphql-rate-limit'
            ],
            features: [
                'Type-safe schema with SDL',
                'Queries with filtering, sorting, pagination',
                'Mutations with optimistic updates',
                'Real-time subscriptions via WebSocket',
                'DataLoader for batch loading',
                'Custom directives (@auth, @deprecated, etc.)',
                'Query complexity calculation',
                'Response caching with Redis',
                'Field-level permissions',
                'GraphQL Playground',
                'Persisted queries',
                'File uploads'
            ],
            learningOutcomes: [
                'GraphQL schema design',
                'Resolver implementation patterns',
                'N+1 query problem solutions',
                'Real-time data with subscriptions',
                'Custom directive creation',
                'Performance optimization',
                'Security in GraphQL',
                'Caching strategies',
                'Error handling in GraphQL'
            ],
            implementationGuide: `**Phase 1: Schema Design**
- Design GraphQL schema
- Define types and relationships
- Plan queries and mutations
- Design subscription events

**Phase 2: Server Setup**
- Set up Apollo Server
- Configure PostgreSQL with Prisma
- Set up Redis for caching
- Configure WebSocket server

**Phase 3: Resolvers**
- Implement query resolvers
- Create mutation resolvers
- Add subscription resolvers
- Handle nested resolvers

**Phase 4: DataLoader**
- Set up DataLoader
- Implement batch loading
- Add caching layer
- Optimize N+1 queries

**Phase 5: Custom Directives**
- Create @auth directive
- Add @deprecated directive
- Implement @rateLimit directive
- Build custom validation directives

**Phase 6: Security**
- Add authentication context
- Implement field-level permissions
- Add query complexity analysis
- Set up rate limiting

**Phase 7: Caching**
- Implement response caching
- Add cache invalidation
- Set up cache warming
- Configure cache TTL

**Phase 8: Advanced Features**
- Add file upload support
- Implement persisted queries
- Create error handling
- Add logging and monitoring

**Phase 9: Testing & Documentation**
- Write resolver tests
- Add integration tests
- Document schema
- Create usage examples`,
            bonusChallenges: [
                'Implement GraphQL federation',
                'Add automatic persisted queries (APQ)',
                'Create schema stitching',
                'Add GraphQL Code Generator',
                'Implement field-level caching',
                'Add GraphQL Voyager for visualization',
                'Create custom scalar types'
            ]
        }
    ]
};

// Continue with remaining roadmaps...
const REMAINING_PROJECTS = {
    'mobile': [
        {
            id: 'mobile-easy',
            difficulty: 'easy',
            difficultyLevel: 3,
            title: 'Note-Taking App with Cloud Sync',
            description: 'Build a feature-rich note-taking mobile app with cloud synchronization, rich text editing, and offline support.',
            exampleUrl: 'https://github.com/topics/note-app',
            estimatedTime: '30-40 hours',
            requirements: [
                'Create, edit, delete notes',
                'Rich text formatting',
                'Cloud sync with Firebase',
                'Offline support',
                'Search functionality',
                'Categories and tags'
            ],
            techStack: ['React Native', 'Firebase', 'AsyncStorage', 'React Navigation', 'Redux Toolkit'],
            features: [
                'Rich text editor with formatting',
                'Auto-save functionality',
                'Cloud backup and sync',
                'Offline mode',
                'Search with highlighting',
                'Categories and color coding',
                'Dark mode support',
                'Biometric authentication'
            ],
            learningOutcomes: [
                'React Native fundamentals',
                'Firebase integration',
                'Offline-first architecture',
                'Local storage management',
                'Navigation patterns',
                'State management in mobile'
            ],
            implementationGuide: `**Phase 1**: Set up React Native project and Firebase. **Phase 2**: Build note CRUD functionality. **Phase 3**: Implement rich text editor. **Phase 4**: Add cloud sync. **Phase 5**: Implement offline support. **Phase 6**: Add search and categories. **Phase 7**: Polish UI and add authentication.`,
            bonusChallenges: [
                'Add voice-to-text',
                'Implement note sharing',
                'Add image attachments',
                'Create widgets',
                'Add note templates'
            ]
        },
        {
            id: 'mobile-medium',
            difficulty: 'medium',
            difficultyLevel: 6,
            title: 'Social Media App Clone',
            description: 'Create a full-featured social media application similar to Instagram with posts, stories, real-time chat, and notifications.',
            exampleUrl: 'https://github.com/topics/social-media-app',
            estimatedTime: '60-80 hours',
            requirements: [
                'User authentication and profiles',
                'Photo/video posts with filters',
                'Stories feature',
                'Real-time chat',
                'Push notifications',
                'Follow/unfollow system'
            ],
            techStack: ['React Native', 'Firebase/Supabase', 'Redux', 'Socket.io', 'React Native Camera', 'FFmpeg'],
            features: [
                'User profiles with bio and avatar',
                'Photo/video posts with captions',
                'Image filters and editing',
                'Stories with 24h expiry',
                'Like, comment, share',
                'Real-time messaging',
                'Push notifications',
                'Follow/follower system',
                'Explore feed with recommendations',
                'Activity feed'
            ],
            learningOutcomes: [
                'Complex app architecture',
                'Real-time features',
                'Media handling and optimization',
                'Push notifications',
                'Social graph implementation',
                'Performance optimization'
            ],
            implementationGuide: `**Phase 1**: Authentication and profiles. **Phase 2**: Post creation with camera. **Phase 3**: Feed and interactions. **Phase 4**: Stories feature. **Phase 5**: Real-time chat. **Phase 6**: Notifications. **Phase 7**: Follow system and explore. **Phase 8**: Optimization and polish.`,
            bonusChallenges: [
                'Add live streaming',
                'Implement AR filters',
                'Add video calls',
                'Create reels/shorts',
                'Add monetization features'
            ]
        },
        {
            id: 'mobile-hard',
            difficulty: 'hard',
            difficultyLevel: 9,
            title: 'E-Learning Mobile Platform',
            description: 'Develop a comprehensive mobile learning platform with video streaming, offline downloads, progress tracking, quizzes, and payment integration.',
            exampleUrl: 'https://github.com/topics/elearning-app',
            estimatedTime: '90-120 hours',
            requirements: [
                'Video streaming with quality selection',
                'Offline video downloads',
                'Progress tracking and analytics',
                'Interactive quizzes',
                'Payment integration',
                'Certificate generation'
            ],
            techStack: ['React Native', 'Video streaming (HLS)', 'SQLite', 'Stripe', 'Redux Saga', 'React Native Video'],
            features: [
                'Course catalog with categories',
                'Video player with controls',
                'Adaptive streaming',
                'Download for offline viewing',
                'Progress tracking per video',
                'Interactive quizzes with scoring',
                'Discussion forums',
                'In-app purchases',
                'Certificate generation',
                'Instructor profiles',
                'Bookmarks and notes',
                'Search and recommendations'
            ],
            learningOutcomes: [
                'Video streaming implementation',
                'Offline content management',
                'Payment gateway integration',
                'Complex state management',
                'Analytics and tracking',
                'Performance optimization for media'
            ],
            implementationGuide: `**Phase 1**: App architecture and navigation. **Phase 2**: Course catalog and details. **Phase 3**: Video player with streaming. **Phase 4**: Download manager. **Phase 5**: Progress tracking. **Phase 6**: Quiz system. **Phase 7**: Payment integration. **Phase 8**: Certificates and completion. **Phase 9**: Social features. **Phase 10**: Optimization and testing.`,
            bonusChallenges: [
                'Add live classes with WebRTC',
                'Implement peer-to-peer learning',
                'Add AI-powered recommendations',
                'Create instructor dashboard',
                'Add gamification elements'
            ]
        }
    ],
    'database': [
        {
            id: 'database-easy',
            difficulty: 'easy',
            difficultyLevel: 3,
            title: 'Library Management System Database',
            description: 'Design and implement a complete relational database for a library management system with proper normalization, indexes, and stored procedures.',
            exampleUrl: 'https://github.com/topics/library-database',
            estimatedTime: '20-30 hours',
            requirements: [
                'Normalized database schema (3NF)',
                'Tables for books, members, loans',
                'Stored procedures for operations',
                'Views for common queries',
                'Indexes for performance',
                'Sample data and queries'
            ],
            techStack: ['PostgreSQL/MySQL', 'SQL', 'pgAdmin/MySQL Workbench', 'ER Diagram tools'],
            features: [
                'Complete ERD design',
                'Books catalog with authors and categories',
                'Member management',
                'Loan tracking with due dates',
                'Fine calculation',
                'Reservation system',
                'Search functionality',
                'Reports and analytics'
            ],
            learningOutcomes: [
                'Database normalization',
                'ER diagram creation',
                'SQL query optimization',
                'Stored procedures and triggers',
                'Index design',
                'Transaction management'
            ],
            implementationGuide: `**Phase 1**: Design ERD. **Phase 2**: Create normalized tables. **Phase 3**: Add constraints and relationships. **Phase 4**: Create indexes. **Phase 5**: Write stored procedures. **Phase 6**: Create views. **Phase 7**: Insert sample data. **Phase 8**: Write complex queries.`,
            bonusChallenges: [
                'Add full-text search',
                'Implement audit logging',
                'Create backup strategy',
                'Add performance monitoring',
                'Build admin dashboard'
            ]
        },
        {
            id: 'database-medium',
            difficulty: 'medium',
            difficultyLevel: 6,
            title: 'Sales Data Analysis with Python',
            description: 'Perform comprehensive data analysis on sales data using Python, Pandas, and visualization libraries. Generate insights and recommendations.',
            exampleUrl: 'https://github.com/topics/sales-analysis',
            estimatedTime: '40-55 hours',
            requirements: [
                'Data cleaning and preprocessing',
                'Exploratory Data Analysis',
                'Statistical analysis',
                'Data visualizations',
                'Insights report',
                'Predictive modeling'
            ],
            techStack: ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Scikit-learn', 'Jupyter Notebook'],
            features: [
                'Data import and cleaning',
                'Missing value handling',
                'Outlier detection',
                'Trend analysis',
                'Correlation analysis',
                'Customer segmentation',
                'Sales forecasting',
                'Interactive visualizations',
                'Automated reporting'
            ],
            learningOutcomes: [
                'Data cleaning techniques',
                'Pandas for data manipulation',
                'Statistical analysis',
                'Data visualization',
                'Feature engineering',
                'Basic machine learning'
            ],
            implementationGuide: `**Phase 1**: Data acquisition and exploration. **Phase 2**: Data cleaning. **Phase 3**: EDA with visualizations. **Phase 4**: Statistical analysis. **Phase 5**: Customer segmentation. **Phase 6**: Predictive modeling. **Phase 7**: Create dashboard. **Phase 8**: Generate report.`,
            bonusChallenges: [
                'Add real-time data pipeline',
                'Create interactive Dash/Streamlit app',
                'Implement advanced ML models',
                'Add anomaly detection',
                'Create automated email reports'
            ]
        },
        {
            id: 'database-hard',
            difficulty: 'hard',
            difficultyLevel: 9,
            title: 'End-to-End Data Pipeline with ML',
            description: 'Build a complete data pipeline from ingestion to prediction, including ETL, data warehousing, feature engineering, and ML model deployment.',
            exampleUrl: 'https://github.com/topics/data-pipeline',
            estimatedTime: '80-110 hours',
            requirements: [
                'ETL pipeline with scheduling',
                'Data warehouse design',
                'Feature engineering',
                'ML model training and deployment',
                'Monitoring and alerting',
                'Automated reporting'
            ],
            techStack: ['Apache Airflow', 'PostgreSQL', 'dbt', 'Python', 'Scikit-learn', 'Docker', 'FastAPI', 'Grafana'],
            features: [
                'Data ingestion from multiple sources',
                'ETL with Apache Airflow',
                'Data warehouse (star schema)',
                'Data quality checks',
                'Feature store',
                'ML model training pipeline',
                'Model versioning',
                'REST API for predictions',
                'Monitoring dashboard',
                'Automated alerts'
            ],
            learningOutcomes: [
                'ETL pipeline design',
                'Data warehouse architecture',
                'Workflow orchestration',
                'ML pipeline automation',
                'Model deployment',
                'Data quality management'
            ],
            implementationGuide: `**Phase 1**: Architecture design. **Phase 2**: Set up Airflow. **Phase 3**: Build ETL jobs. **Phase 4**: Design data warehouse. **Phase 5**: Implement dbt models. **Phase 6**: Feature engineering. **Phase 7**: ML pipeline. **Phase 8**: Model deployment. **Phase 9**: Monitoring. **Phase 10**: Documentation.`,
            bonusChallenges: [
                'Add real-time streaming with Kafka',
                'Implement data lineage tracking',
                'Add A/B testing framework',
                'Create feature flags',
                'Implement model retraining automation'
            ]
        }
    ],
    'cybersecurity': [
        {
            id: 'cybersecurity-easy',
            difficulty: 'easy',
            difficultyLevel: 3,
            title: 'Password Security Analyzer',
            description: 'Create a comprehensive password strength analyzer that evaluates passwords and provides security recommendations based on best practices.',
            exampleUrl: 'https://github.com/topics/password-security',
            estimatedTime: '20-30 hours',
            requirements: [
                'Password strength calculation',
                'Common password detection',
                'Entropy calculation',
                'Visual strength indicator',
                'Security recommendations',
                'Breach database check'
            ],
            techStack: ['Python', 'Flask', 'React', 'zxcvbn', 'Have I Been Pwned API'],
            features: [
                'Real-time strength analysis',
                'Pattern detection',
                'Dictionary attack simulation',
                'Entropy calculation',
                'Time-to-crack estimation',
                'Breach database lookup',
                'Password generation',
                'Security tips'
            ],
            learningOutcomes: [
                'Password security principles',
                'Entropy and randomness',
                'API integration',
                'Security best practices',
                'Algorithm implementation'
            ],
            implementationGuide: `**Phase 1**: Research password security. **Phase 2**: Build strength algorithm. **Phase 3**: Integrate breach API. **Phase 4**: Create web interface. **Phase 5**: Add password generator. **Phase 6**: Implement recommendations. **Phase 7**: Testing and documentation.`,
            bonusChallenges: [
                'Add password manager integration',
                'Create browser extension',
                'Add multi-language support',
                'Implement password history',
                'Add 2FA recommendations'
            ]
        },
        {
            id: 'cybersecurity-medium',
            difficulty: 'medium',
            difficultyLevel: 6,
            title: 'Network Traffic Analyzer',
            description: 'Build a network packet analyzer that captures and analyzes traffic, identifies protocols, and detects potential security threats.',
            exampleUrl: 'https://github.com/topics/network-analyzer',
            estimatedTime: '50-70 hours',
            requirements: [
                'Packet capture and parsing',
                'Protocol analysis',
                'Anomaly detection',
                'Traffic visualization',
                'Alert system',
                'Report generation'
            ],
            techStack: ['Python', 'Scapy', 'Wireshark', 'Flask', 'Chart.js', 'SQLite'],
            features: [
                'Live packet capture',
                'Protocol dissection (HTTP, DNS, TCP, UDP)',
                'Traffic statistics',
                'Anomaly detection',
                'Suspicious activity alerts',
                'Packet filtering',
                'Traffic visualization',
                'Export to PCAP',
                'Geolocation mapping'
            ],
            learningOutcomes: [
                'Network protocols',
                'Packet analysis',
                'Anomaly detection',
                'Network security',
                'Python networking',
                'Data visualization'
            ],
            implementationGuide: `**Phase 1**: Learn Scapy basics. **Phase 2**: Implement packet capture. **Phase 3**: Build protocol parsers. **Phase 4**: Add anomaly detection. **Phase 5**: Create visualization. **Phase 6**: Implement alerts. **Phase 7**: Build web dashboard. **Phase 8**: Testing and optimization.`,
            bonusChallenges: [
                'Add machine learning for threat detection',
                'Implement DPI (Deep Packet Inspection)',
                'Add IDS/IPS capabilities',
                'Create custom rules engine',
                'Add integration with SIEM'
            ]
        },
        {
            id: 'cybersecurity-hard',
            difficulty: 'hard',
            difficultyLevel: 9,
            title: 'Web Application Security Scanner',
            description: 'Develop a comprehensive security scanner that tests web applications for OWASP Top 10 vulnerabilities and generates detailed reports.',
            exampleUrl: 'https://github.com/topics/security-scanner',
            estimatedTime: '80-110 hours',
            requirements: [
                'OWASP Top 10 vulnerability scanning',
                'Automated crawling',
                'SQL injection testing',
                'XSS detection',
                'Authentication testing',
                'Detailed reporting'
            ],
            techStack: ['Python', 'Selenium', 'BeautifulSoup', 'SQLMap', 'Burp Suite API', 'FastAPI', 'PostgreSQL'],
            features: [
                'Web crawler with authentication',
                'SQL injection detection',
                'XSS vulnerability scanning',
                'CSRF testing',
                'Authentication bypass attempts',
                'Directory traversal detection',
                'Security header analysis',
                'SSL/TLS testing',
                'Port scanning',
                'Detailed vulnerability reports',
                'Remediation recommendations',
                'False positive filtering'
            ],
            learningOutcomes: [
                'Web application security',
                'OWASP Top 10',
                'Penetration testing',
                'Vulnerability assessment',
                'Security automation',
                'Ethical hacking'
            ],
            implementationGuide: `**Phase 1**: Study OWASP Top 10. **Phase 2**: Build web crawler. **Phase 3**: Implement SQL injection tests. **Phase 4**: Add XSS detection. **Phase 5**: Create auth testing. **Phase 6**: Add other vulnerability checks. **Phase 7**: Build reporting engine. **Phase 8**: Create web interface. **Phase 9**: Add scheduling. **Phase 10**: Testing and validation.`,
            bonusChallenges: [
                'Add API security testing',
                'Implement GraphQL scanning',
                'Add mobile app testing',
                'Create CI/CD integration',
                'Add compliance checking (PCI DSS, GDPR)',
                'Implement continuous monitoring'
            ]
        }
    ],
    'devops': [
        {
            id: 'devops-easy',
            difficulty: 'easy',
            difficultyLevel: 3,
            title: 'Automated Deployment Pipeline',
            description: 'Create a complete automated deployment script that handles code deployment, dependency management, testing, and service restart.',
            exampleUrl: 'https://github.com/topics/deployment-automation',
            estimatedTime: '25-35 hours',
            requirements: [
                'Automated Git deployment',
                'Dependency installation',
                'Pre-deployment testing',
                'Service management',
                'Rollback capability',
                'Logging and notifications'
            ],
            techStack: ['Bash/Shell', 'Git', 'PM2/Systemd', 'Nginx', 'Slack API'],
            features: [
                'Git pull automation',
                'Environment-specific configs',
                'Dependency management',
                'Database migrations',
                'Health checks',
                'Zero-downtime deployment',
                'Automatic rollback on failure',
                'Slack notifications',
                'Deployment logs'
            ],
            learningOutcomes: [
                'Shell scripting',
                'Deployment strategies',
                'Process management',
                'Error handling',
                'Automation best practices'
            ],
            implementationGuide: `**Phase 1**: Plan deployment workflow. **Phase 2**: Write Git automation. **Phase 3**: Add dependency management. **Phase 4**: Implement testing. **Phase 5**: Add service restart. **Phase 6**: Create rollback mechanism. **Phase 7**: Add notifications. **Phase 8**: Testing and documentation.`,
            bonusChallenges: [
                'Add blue-green deployment',
                'Implement canary releases',
                'Add performance monitoring',
                'Create deployment dashboard',
                'Add multi-server deployment'
            ]
        },
        {
            id: 'devops-medium',
            difficulty: 'medium',
            difficultyLevel: 6,
            title: 'Full-Stack Docker Containerization',
            description: 'Containerize a complete full-stack application using Docker and Docker Compose with multi-stage builds, networking, and production optimization.',
            exampleUrl: 'https://github.com/topics/docker-deployment',
            estimatedTime: '45-60 hours',
            requirements: [
                'Dockerfiles for all services',
                'Docker Compose orchestration',
                'Multi-stage builds',
                'Environment configuration',
                'Volume management',
                'Production optimization'
            ],
            techStack: ['Docker', 'Docker Compose', 'Nginx', 'PostgreSQL', 'Redis', 'Node.js'],
            features: [
                'Multi-stage Dockerfiles',
                'Service orchestration',
                'Network isolation',
                'Volume persistence',
                'Environment variables',
                'Health checks',
                'Restart policies',
                'Resource limits',
                'Logging configuration',
                'Development vs production configs'
            ],
            learningOutcomes: [
                'Docker fundamentals',
                'Container orchestration',
                'Networking in Docker',
                'Volume management',
                'Build optimization',
                'Production best practices'
            ],
            implementationGuide: `**Phase 1**: Learn Docker basics. **Phase 2**: Create Dockerfiles. **Phase 3**: Optimize with multi-stage builds. **Phase 4**: Set up Docker Compose. **Phase 5**: Configure networking. **Phase 6**: Add volumes. **Phase 7**: Environment management. **Phase 8**: Production optimization. **Phase 9**: Documentation.`,
            bonusChallenges: [
                'Add Docker Swarm orchestration',
                'Implement secrets management',
                'Add monitoring with Prometheus',
                'Create CI/CD integration',
                'Add security scanning'
            ]
        },
        {
            id: 'devops-hard',
            difficulty: 'hard',
            difficultyLevel: 9,
            title: 'Complete DevOps Platform with Kubernetes',
            description: 'Build a production-ready DevOps platform with CI/CD, Kubernetes deployment, monitoring, logging, and auto-scaling.',
            exampleUrl: 'https://github.com/topics/kubernetes-devops',
            estimatedTime: '90-130 hours',
            requirements: [
                'CI/CD pipeline',
                'Kubernetes cluster',
                'Monitoring and alerting',
                'Centralized logging',
                'Auto-scaling',
                'Infrastructure as Code'
            ],
            techStack: ['Kubernetes', 'Helm', 'Jenkins/GitHub Actions', 'Prometheus', 'Grafana', 'ELK Stack', 'Terraform', 'ArgoCD'],
            features: [
                'Automated CI/CD pipeline',
                'Kubernetes manifests',
                'Helm charts',
                'Horizontal Pod Autoscaling',
                'Ingress configuration',
                'Service mesh (Istio)',
                'Prometheus monitoring',
                'Grafana dashboards',
                'ELK logging stack',
                'Alert manager',
                'GitOps with ArgoCD',
                'Infrastructure as Code'
            ],
            learningOutcomes: [
                'Kubernetes architecture',
                'Container orchestration',
                'CI/CD implementation',
                'Monitoring and observability',
                'Infrastructure as Code',
                'GitOps practices',
                'Cloud-native patterns'
            ],
            implementationGuide: `**Phase 1**: Set up Kubernetes cluster. **Phase 2**: Create deployment manifests. **Phase 3**: Build CI/CD pipeline. **Phase 4**: Implement Helm charts. **Phase 5**: Set up monitoring. **Phase 6**: Configure logging. **Phase 7**: Add auto-scaling. **Phase 8**: Implement GitOps. **Phase 9**: Add service mesh. **Phase 10**: Documentation and runbooks.`,
            bonusChallenges: [
                'Add multi-cluster management',
                'Implement disaster recovery',
                'Add cost optimization',
                'Create operator patterns',
                'Implement chaos engineering',
                'Add security scanning in pipeline'
            ]
        }
    ],
    'ai-ml': [
        {
            id: 'ai-easy',
            difficulty: 'easy',
            difficultyLevel: 3,
            title: 'Sentiment Analysis API',
            description: 'Build a sentiment analysis service that classifies text as positive, negative, or neutral using NLP techniques and machine learning.',
            exampleUrl: 'https://github.com/topics/sentiment-analysis',
            estimatedTime: '30-40 hours',
            requirements: [
                'Text preprocessing',
                'Model training',
                'REST API',
                'Batch processing',
                'Visualization',
                'Web interface'
            ],
            techStack: ['Python', 'Scikit-learn', 'NLTK', 'Flask', 'Pandas', 'Matplotlib'],
            features: [
                'Text cleaning and preprocessing',
                'Feature extraction (TF-IDF)',
                'Multiple ML models (Naive Bayes, SVM)',
                'Model evaluation',
                'REST API endpoints',
                'Batch analysis',
                'Confidence scores',
                'Visualization dashboard',
                'Model persistence'
            ],
            learningOutcomes: [
                'NLP fundamentals',
                'Text preprocessing',
                'Machine learning classification',
                'Model evaluation',
                'API development',
                'Model deployment'
            ],
            implementationGuide: `**Phase 1**: Data collection and exploration. **Phase 2**: Text preprocessing. **Phase 3**: Feature engineering. **Phase 4**: Model training. **Phase 5**: Model evaluation. **Phase 6**: API development. **Phase 7**: Web interface. **Phase 8**: Deployment.`,
            bonusChallenges: [
                'Add deep learning model (LSTM)',
                'Implement aspect-based sentiment',
                'Add multi-language support',
                'Create Chrome extension',
                'Add real-time Twitter analysis'
            ]
        },
        {
            id: 'ai-medium',
            difficulty: 'medium',
            difficultyLevel: 6,
            title: 'Image Classification with CNN',
            description: 'Create a convolutional neural network for image classification using transfer learning and deploy as a REST API with web interface.',
            exampleUrl: 'https://github.com/topics/image-classification',
            estimatedTime: '55-75 hours',
            requirements: [
                'Dataset preparation',
                'CNN model training',
                'Transfer learning',
                'Model evaluation',
                'API deployment',
                'Web interface'
            ],
            techStack: ['Python', 'TensorFlow/PyTorch', 'OpenCV', 'FastAPI', 'React', 'Docker'],
            features: [
                'Data augmentation',
                'Transfer learning (ResNet, VGG)',
                'Custom CNN architecture',
                'Training with validation',
                'Model checkpointing',
                'Confusion matrix',
                'Grad-CAM visualization',
                'REST API for predictions',
                'Batch processing',
                'Web upload interface'
            ],
            learningOutcomes: [
                'Deep learning fundamentals',
                'CNN architecture',
                'Transfer learning',
                'Image preprocessing',
                'Model optimization',
                'Model deployment'
            ],
            implementationGuide: `**Phase 1**: Dataset collection. **Phase 2**: Data preprocessing. **Phase 3**: Model architecture. **Phase 4**: Training pipeline. **Phase 5**: Evaluation and tuning. **Phase 6**: API development. **Phase 7**: Web interface. **Phase 8**: Dockerization. **Phase 9**: Deployment.`,
            bonusChallenges: [
                'Add object detection (YOLO)',
                'Implement model quantization',
                'Add mobile deployment',
                'Create data labeling tool',
                'Add active learning pipeline'
            ]
        },
        {
            id: 'ai-hard',
            difficulty: 'hard',
            difficultyLevel: 9,
            title: 'Conversational AI Chatbot',
            description: 'Develop an intelligent chatbot with NLP, intent recognition, entity extraction, context management, and multi-turn conversation capabilities.',
            exampleUrl: 'https://github.com/topics/ai-chatbot',
            estimatedTime: '90-130 hours',
            requirements: [
                'Intent classification',
                'Entity extraction',
                'Context management',
                'Response generation',
                'Sentiment analysis',
                'Multi-turn conversations'
            ],
            techStack: ['Python', 'Rasa/Dialogflow', 'Transformers', 'FastAPI', 'Redis', 'PostgreSQL', 'React'],
            features: [
                'Intent recognition',
                'Named entity recognition',
                'Context tracking',
                'Slot filling',
                'Dialogue management',
                'Sentiment analysis',
                'Response generation',
                'Fallback handling',
                'Multi-language support',
                'Analytics dashboard',
                'Training interface',
                'Integration APIs'
            ],
            learningOutcomes: [
                'NLP advanced concepts',
                'Dialogue systems',
                'Intent classification',
                'Entity extraction',
                'Context management',
                'Transformer models',
                'Chatbot architecture'
            ],
            implementationGuide: `**Phase 1**: Architecture design. **Phase 2**: Intent classification. **Phase 3**: Entity extraction. **Phase 4**: Dialogue management. **Phase 5**: Context tracking. **Phase 6**: Response generation. **Phase 7**: Integration layer. **Phase 8**: Web interface. **Phase 9**: Analytics. **Phase 10**: Training pipeline. **Phase 11**: Deployment.`,
            bonusChallenges: [
                'Add voice interface',
                'Implement knowledge graph',
                'Add reinforcement learning',
                'Create multi-modal responses',
                'Add personality customization',
                'Implement A/B testing framework'
            ]
        }
    ]
};

// Merge all projects
const ALL_PROJECTS = { ...ENHANCED_PROJECTS, ...REMAINING_PROJECTS };

const ROADMAP_METADATA = {
    'full-stack': {
        title: 'Full-Stack Development',
        description: 'Master both frontend and backend development',
        category: 'dsa'
    },
    'frontend': {
        title: 'Frontend Development',
        description: 'Build beautiful and interactive user interfaces',
        category: 'frontend'
    },
    'backend': {
        title: 'Backend Development',
        description: 'Create robust server-side applications and APIs',
        category: 'backend'
    },
    'mobile': {
        title: 'Mobile App Development',
        description: 'Develop native and cross-platform mobile applications',
        category: 'mobile'
    },
    'database': {
        title: 'Database & Data Science',
        description: 'Master data management and analysis',
        category: 'database'
    },
    'cybersecurity': {
        title: 'Cybersecurity',
        description: 'Learn to protect systems and data from threats',
        category: 'cybersecurity'
    },
    'devops': {
        title: 'DevOps & Cloud',
        description: 'Automate deployment and manage cloud infrastructure',
        category: 'devops'
    },
    'ai-ml': {
        title: 'AI & Machine Learning',
        description: 'Build intelligent systems with machine learning',
        category: 'ai'
    }
};

async function populateEnhancedProjects() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const roadmapIds = Object.keys(ALL_PROJECTS);

        for (const roadmapId of roadmapIds) {
            const projectsToAdd = ALL_PROJECTS[roadmapId];
            const metadata = ROADMAP_METADATA[roadmapId];

            console.log(`📦 Processing: ${metadata.title}`);

            const result = await Roadmap.updateOne(
                { roadmapId: roadmapId },
                {
                    $set: {
                        roadmapId: roadmapId,
                        title: metadata.title,
                        description: metadata.description,
                        category: metadata.category,
                        projects: projectsToAdd
                    }
                },
                { upsert: true }
            );

            if (result.upsertedCount > 0) {
                console.log(`   ✅ Created with ${projectsToAdd.length} enhanced projects`);
            } else {
                console.log(`   ✅ Updated with ${projectsToAdd.length} enhanced projects`);
            }
        }

        console.log('\n🎉 All roadmaps updated with enhanced projects!');
        console.log(`📊 Total: ${roadmapIds.length} roadmaps, ${roadmapIds.length * 3} projects`);
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

populateEnhancedProjects();
