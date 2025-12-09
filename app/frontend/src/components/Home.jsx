
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/DevvoraStyles.css";
import GlobalThemeToggle from "./GlobalThemeToggle";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const testimonials = [
    {
      name: "Rajesh Kumar",
      role: "Full Stack Developer",
      text: "The premium curriculum helped me master coding. The project-based learning approach made me industry-ready in just 6 months!",
      avatar: "👨‍💻"
    },
    {
      name: "Priya Sharma",
      role: "Frontend Developer",
      text: "Learning.AI's structured approach and real-world projects helped me land my dream job. The progress tracking kept me motivated!",
      avatar: "👩‍💻"
    },
    {
      name: "Amit Patel",
      role: "Backend Developer",
      text: "The complete source code access and project-based courses are game-changers. I built 5 production-ready projects!",
      avatar: "🧑‍💻"
    }
  ];

  const faqs = [
    {
      question: "What is Learning.AI and how does it work?",
      answer: "Learning.AI is a project-based learning platform where you build real-world applications with complete source code. Each course includes hands-on projects, progress tracking, and modern tech stack learning."
    },
    {
      question: "Do I get certificates after completion?",
      answer: "Yes! You receive industry-recognized certificates for each completed course and project. These certificates showcase your practical skills to potential employers."
    },
    {
      question: "Can I access courses on mobile devices?",
      answer: "Absolutely! Our platform is fully responsive and works seamlessly on all devices - desktop, tablet, and mobile."
    },
    {
      question: "What support is available for learners?",
      answer: "We provide 24/7 community support, dedicated mentors, and comprehensive documentation for all courses."
    }
  ];

  return (
    <div className="devvora-container">
      <GlobalThemeToggle />
      {/* ==================== NAVIGATION BAR ==================== */}
      <nav className="devvora-navbar">
        <div className="navbar-content">
          <div className="navbar-logo">
            <div className="logo-icon">📚</div>
            <span className="logo-text">Learning.AI</span>
          </div>

          <div className="navbar-actions">
            <button onClick={() => navigate("/login")} className="btn-signin">
              Sign In
            </button>
            <button onClick={() => navigate("/signup")} className="btn-getstarted">
              Get Started →
            </button>
          </div>
        </div>
      </nav>

      {/* ==================== HERO SECTION ==================== */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            The <span className="highlight-orange">Skill Development Center</span> for Tech Stack Learners
          </h1>
          <p className="hero-subtitle">
            Explore a wide range of courses from beginner to advanced levels. Learn at your own pace, anytime, anywhere.
          </p>
          <button onClick={() => navigate("/signup")} className="btn-cta">
            Start Learning Now →
          </button>
        </div>
      </section>

      {/* ==================== FEATURED SECTION ==================== */}
      <section className="featured-section">
        <div className="featured-grid">
          {/* Welcome Back Card */}
          <div className="welcome-card">
            <div className="welcome-content">
              <h3 className="welcome-title">Welcome back</h3>
              <h2 className="welcome-name">Learner 👋</h2>
              <p className="welcome-text">
                Start building amazing projects today! Access real-world courses, complete source code, and build your portfolio.
              </p>
              <button onClick={() => navigate("/dashboard")} className="btn-explore">
                Explore Courses
              </button>
            </div>
            <div className="welcome-character">
              <div className="character-3d">🧑‍💻</div>
            </div>
          </div>

          {/* Featured Course Card */}
          <div className="featured-course-card">
            <div className="course-badge">Featured</div>
            <div className="course-content">
              <h3 className="course-title">Master Full-Stack Development</h3>
              <p className="course-description">
                From frontend to backend, with hands-on experience with modern tech stacks and industry standard practices.
              </p>
            </div>
            <div className="course-nav">
              <button className="nav-arrow">←</button>
              <button className="nav-arrow">→</button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== WHY CHOOSE SECTION ==================== */}
      <section className="why-choose-section">
        <div className="section-header">
          <h2 className="section-title">
            Why Choose <span className="highlight-orange">Learning.AI</span> ?
          </h2>
          <p className="section-subtitle">
            Learn by building real projects with complete source code and step-by-step guidance everyday of the way.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card pastel-peach">
            <div className="feature-icon">📝</div>
            <h3 className="feature-title">Project-Based Courses</h3>
            <p className="feature-text">
              Learn by building real-world applications. Each course includes complete working projects with source code.
            </p>
          </div>

          <div className="feature-card pastel-mint">
            <div className="feature-icon">📊</div>
            <h3 className="feature-title">Track Your Progress</h3>
            <p className="feature-text">
              Monitor your learning journey with detailed analytics, progress tracking, and completion badges.
            </p>
          </div>

          <div className="feature-card pastel-pink">
            <div className="feature-icon">💼</div>
            <h3 className="feature-title">Build Your Portfolio</h3>
            <p className="feature-text">
              Showcase your projects to potential employers. Build a portfolio that stands out with real projects.
            </p>
          </div>

          <div className="feature-card pastel-yellow">
            <div className="feature-icon">⚡</div>
            <h3 className="feature-title">Modern Tech Stack</h3>
            <p className="feature-text">
              Learn cutting-edge technologies like React, Node.js, MongoDB, and more with hands-on projects.
            </p>
          </div>

          <div className="feature-card pastel-rose">
            <div className="feature-icon">🎓</div>
            <h3 className="feature-title">Course Enrollment System</h3>
            <p className="feature-text">
              Easily enroll in multiple courses. Track enrollments, manage your learning path, and stay organized.
            </p>
          </div>

          <div className="feature-card pastel-blue">
            <div className="feature-icon">📈</div>
            <h3 className="feature-title">Learning Analytics</h3>
            <p className="feature-text">
              Visualize your daily learning hours, course completion rates, and overall performance with charts.
            </p>
          </div>

          <div className="feature-card pastel-teal">
            <div className="feature-icon">👥</div>
            <h3 className="feature-title">Project Visitors</h3>
            <p className="feature-title">Track who's viewing your projects. Get insights into your project's reach and popularity.</p>
          </div>

          <div className="feature-card pastel-lavender">
            <div className="feature-icon">💻</div>
            <h3 className="feature-title">Complete Source Code</h3>
            <p className="feature-text">
              Get access to complete, production-ready source code for every project. Learn from best practices.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== LEARNING JOURNEY SECTION ==================== */}
      <section className="journey-section">
        <div className="journey-grid">
          <div className="journey-content">
            <h2 className="journey-title">
              Start Your <span className="highlight-orange">Learning</span><br />Journey
            </h2>
            <p className="journey-text">
              Learn by building real-world applications with complete source code. Master your projects, showcase your progress, and demonstrate your skills to employers.
            </p>
            <ul className="journey-list">
              <li>✅ Access complete, production-ready source code to study</li>
              <li>✅ Track your learning hours with detailed analytics and charts</li>
              <li>✅ Build portfolio-worthy projects with modern tech stacks</li>
              <li>✅ Monitor project visitors and showcase your work</li>
            </ul>
            <button onClick={() => navigate("/signup")} className="btn-journey">
              Start Learning Now →
            </button>
          </div>

          <div className="journey-projects">
            <div className="project-stack">
              <div className="project-card card-1">
                <div className="project-header">
                  <span className="project-tag">E-Commerce</span>
                  <span className="project-rating">⭐ 4.8</span>
                </div>
                <h4 className="project-name">Next Level Book Store</h4>
                <p className="project-desc">Full-featured online bookstore with cart & payments</p>
                <div className="project-stats">
                  <span>📚 250+ Books</span>
                  <span>👥 1.2k Users</span>
                </div>
              </div>

              <div className="project-card card-2">
                <div className="project-header">
                  <span className="project-tag">Fashion</span>
                  <span className="project-rating">⭐ 4.9</span>
                </div>
                <h4 className="project-name">Trendovix</h4>
                <p className="project-desc">Modern fashion e-commerce with AI recommendations</p>
                <div className="project-stats">
                  <span>👗 500+ Items</span>
                  <span>👥 2.5k Users</span>
                </div>
              </div>

              <div className="project-card card-3">
                <div className="project-header">
                  <span className="project-tag">Streaming</span>
                  <span className="project-rating">⭐ 4.7</span>
                </div>
                <h4 className="project-name">Movieo</h4>
                <p className="project-desc">Netflix-style streaming platform with subscriptions</p>
                <div className="project-stats">
                  <span>🎬 1000+ Movies</span>
                  <span>👥 5k Users</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS SECTION ==================== */}
      <section className="testimonials-section">
        <div className="testimonials-bg">
          <div className="grid-lines"></div>

          {/* Floating Avatars */}
          <div className="floating-avatars">
            <div className="avatar avatar-1">😊</div>
            <div className="avatar avatar-2">🤓</div>
            <div className="avatar avatar-3">😎</div>
            <div className="avatar avatar-4">🥳</div>
            <div className="avatar avatar-5">🤩</div>
            <div className="avatar avatar-6">😄</div>
            <div className="avatar avatar-7">🙂</div>
            <div className="avatar avatar-8">😃</div>
          </div>

          <div className="testimonials-content">
            <h2 className="testimonials-title">
              Loved by <span className="highlight-orange">Developers</span>
            </h2>
            <p className="testimonials-subtitle">
              with 1000+ on users, developers and professionals trust Learning.AI to master new skills
            </p>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">{testimonials[activeTestimonial].avatar}</div>
                <div className="testimonial-info">
                  <h4 className="testimonial-name">{testimonials[activeTestimonial].name}</h4>
                  <p className="testimonial-role">{testimonials[activeTestimonial].role}</p>
                </div>
              </div>
              <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <p className="testimonial-text">{testimonials[activeTestimonial].text}</p>
            </div>

            <div className="testimonial-dots">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${index === activeTestimonial ? 'active' : ''} `}
                  onClick={() => setActiveTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FAQ SECTION ==================== */}
      <section className="faq-section">
        <h2 className="faq-title">
          Frequently Asked <span className="highlight-orange">Questions</span>
        </h2>
        <p className="faq-subtitle">
          Everything you need to know about Learning.AI. Can't find the answer you're looking for? Feel free to contact our support team.
        </p>

        <div className="faq-container">
          {faqs.map((faq, index) => (
            <div key={index} className={`faq - item ${activeFaq === index ? 'active' : ''} `}>
              <button
                className="faq-question"
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
              >
                <span>{faq.question}</span>
                <span className="faq-icon">{activeFaq === index ? '−' : '+'}</span>
              </button>
              {activeFaq === index && (
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="devvora-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="logo-icon">📚</div>
              <span className="logo-text">Learning.AI</span>
            </div>
            <p className="footer-tagline">The Skill Development Center for Tech Stack Learners</p>
          </div>
          <div className="footer-links">
            <a href="#">About</a>
            <a href="#">Courses</a>
            <a href="#">Contact</a>
            <a href="#">Privacy</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2024 Learning.AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}