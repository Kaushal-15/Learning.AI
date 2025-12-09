# UI Matching Guide - Dashboard Style Application

## Overview
This guide shows how to match the Dashboard UI styling across Learn, LearnPaths, QuizSelection, and AdaptiveQuizTest pages.

## Core Design Principles from Dashboard

### 1. Layout Structure
```
┌─────────────────────────────────────────┐
│  Sidebar (90px)  │  Main Content Area   │
│                  │                       │
│  [Logo]          │  [Welcome Card]       │
│                  │                       │
│  [Nav Icons]     │  [Content Cards]      │
│                  │                       │
│  [Theme Toggle]  │  [Stats/Progress]     │
│                  │                       │
│  [Logout]        │  [Tables/Lists]       │
└─────────────────────────────────────────┘
```

### 2. Color Palette
- **Primary Accent:** `#FF8A00` (Orange)
- **Background:** `#FFFFFF` (White cards), `#F8F9FA` (Page background)
- **Text:** `#1A1A1A` (Dark), `#6B7280` (Gray)
- **Success:** `#10B981` (Green)
- **Info:** `#3B82F6` (Blue)
- **Warning:** `#F59E0B` (Amber)

### 3. Card Styles
- **Border Radius:** 25px-30px for main cards, 15px-20px for smaller elements
- **Padding:** 2rem-2.5rem for main cards
- **Shadow:** `0 4px 20px rgba(0, 0, 0, 0.06)` default, `0 12px 35px rgba(0, 0, 0, 0.12)` on hover
- **Transitions:** `all 0.3s ease`

### 4. Typography
- **Headings:** Inter/Poppins, 700-800 weight
- **Body:** Inter, 400-500 weight
- **Sizes:** 
  - Large titles: 2.5rem
  - Section titles: 1.5rem
  - Body text: 1rem
  - Small text: 0.85-0.95rem

## Component Mapping

### Dashboard → Learn Page

| Dashboard Element | Learn Page Equivalent | CSS Class |
|-------------------|----------------------|-----------|
| Welcome Card | Learning Path Header | `dashboard-welcome-card` |
| Stat Cards | Week Overview Card | `stat-card` |
| Progress Bars | Week Progress | `progress-bar-container` |
| CTA Cards | Daily Task Cards | `stat-card` |
| Sidebar Nav | Week Timeline | `course-progress-card` |

### Dashboard → LearnPaths Page

| Dashboard Element | LearnPaths Equivalent | CSS Class |
|-------------------|----------------------|-----------|
| Welcome Card | Topic Header | `dashboard-welcome-card` |
| Stat Cards | Content Mode Cards | `stat-card` |
| CTA Cards | Learning Mode Selector | `dashboard-cta-card` |
| Table Card | Content Display Area | `courses-table-card` |

### Dashboard → QuizSelection Page

| Dashboard Element | QuizSelection Equivalent | CSS Class |
|-------------------|-------------------------|-----------|
| Welcome Card | Quiz Header | `dashboard-welcome-card` |
| CTA Cards | Quiz Type Cards | `dashboard-cta-card` |
| Stat Cards | Recent Quizzes | `stat-card` |
| Progress Card | Quiz History | `course-progress-card` |

### Dashboard → AdaptiveQuizTest Page

| Dashboard Element | AdaptiveQuizTest Equivalent | CSS Class |
|-------------------|----------------------------|-----------|
| Welcome Card | Test Header | `dashboard-welcome-card` |
| Stat Cards | Test Option Cards | `stat-card` |
| Table Card | Results Display | `courses-table-card` |
| Status Badges | Pass/Fail Indicators | `status-badge` |

## Specific Style Patterns

### 1. Welcome/Header Cards
```jsx
<div className="dashboard-welcome-card">
  <div className="welcome-card-content">
    <h3 className="welcome-back-text">Subtitle</h3>
    <h2 className="welcome-name">Main Title 👋</h2>
    <p className="welcome-description">Description text</p>
    <button className="btn-explore-courses">Action Button</button>
  </div>
  <div className="welcome-card-character">
    <div className="character-3d-dashboard">🎯</div>
  </div>
</div>
```

**Features:**
- Gradient green background
- White text
- Floating character animation
- Rounded corners (30px)
- Shadow effect

### 2. Stat/Content Cards
```jsx
<div className="stat-card">
  <div className="stat-header">
    <div className="stat-icon-wrapper stat-icon-blue">
      <Icon className="stat-icon" />
    </div>
    <div className="stat-value-container">
      <p className="stat-value">Value</p>
      <p className="stat-label">Label</p>
    </div>
  </div>
  <div className="stat-footer">
    <div className="stat-progress-bar">
      <div className="stat-progress-fill" style={{ width: "75%" }}></div>
    </div>
  </div>
</div>
```

**Features:**
- White background
- Hover lift effect (translateY(-5px))
- Icon with colored background
- Progress indicators
- Rounded corners (25px)

### 3. CTA/Action Cards
```jsx
<button className="dashboard-cta-card">
  <div className="cta-icon-wrapper">
    <Icon />
  </div>
  <div className="cta-content">
    <h3 className="cta-title">Title</h3>
    <p className="cta-description">Description</p>
  </div>
  <div className="cta-arrow">→</div>
</button>
```

**Features:**
- Horizontal layout
- Icon on left
- Arrow on right
- Hover border color change
- Background tint on hover

### 4. Progress Bars
```jsx
<div className="progress-bar-container">
  <div className="progress-bar-fill progress-orange" style={{ width: "85%" }}></div>
</div>
```

**Variants:**
- `progress-orange` - Orange gradient
- `progress-blue` - Blue gradient
- `progress-green` - Green gradient

### 5. Sidebar Navigation
```jsx
<aside className="dashboard-sidebar">
  <div className="sidebar-content">
    <div className="sidebar-logo">
      <div className="logo-icon">📚</div>
    </div>
    <nav className="sidebar-nav">
      <button className="nav-item active">
        <Icon className="nav-icon" />
      </button>
    </nav>
  </div>
</aside>
```

**Features:**
- Fixed 90px width
- Vertical icon layout
- Active state (dark background)
- Hover effects

## Responsive Breakpoints

```css
/* Mobile First */
@media (max-width: 768px) {
  - Stack cards vertically
  - Hide sidebar or make collapsible
  - Reduce padding
  - Smaller font sizes
}

@media (max-width: 480px) {
  - Single column layout
  - Compact spacing
  - Touch-friendly buttons (min 44px)
}
```

## Animation Guidelines

### Hover Effects
```css
.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.12);
}
```

### Button Hover
```css
.btn-explore-courses:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255, 255, 255, 0.3);
}
```

### Floating Animation
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
```

## Icon Usage

### Icon Sizes
- **Nav Icons:** 22px × 22px
- **Stat Icons:** 24px × 24px
- **CTA Icons:** 32px × 32px
- **Large Icons:** 48px × 48px

### Icon Colors
- Use CSS variables: `color: var(--orange-accent)`
- Match icon color to card theme
- Consistent stroke width (2px)

## Status Badges

```jsx
<span className="status-badge status-completed">Completed</span>
<span className="status-badge status-building">In Progress</span>
<span className="status-badge status-easy">Easy</span>
<span className="status-badge status-medium">Medium</span>
<span className="status-badge status-hard">Hard</span>
```

**Variants:**
- `status-completed` - Green
- `status-building` - Yellow/Amber
- `status-easy` - Green
- `status-medium` - Yellow
- `status-hard` - Orange
- `status-expert` - Red

## Tables

```jsx
<div className="courses-table-card">
  <table className="courses-table">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data 1</td>
        <td>Data 2</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Features:**
- Rounded container
- Hover row effect
- Clean borders
- Responsive overflow

## Dark Mode Considerations

While the current implementation focuses on light mode, the structure supports dark mode:

```css
.dashboard-dark {
  --bg-white: #1A1A1A;
  --bg-gray: #0F0F0F;
  --text-dark: #FFFFFF;
  --text-gray: #9CA3AF;
}
```

## Implementation Checklist

### For Each Page:

- [ ] Replace main container with `dashboard-container`
- [ ] Add `dashboard-sidebar` with navigation
- [ ] Wrap content in `dashboard-main`
- [ ] Add welcome card at top
- [ ] Convert cards to `stat-card` or `course-progress-card`
- [ ] Update buttons to `btn-explore-courses`
- [ ] Apply progress bars with correct classes
- [ ] Use CSS variables for colors
- [ ] Add hover effects
- [ ] Test responsive layout
- [ ] Verify all functionality works
- [ ] Check accessibility (contrast, focus states)

## Quick Reference: CSS Variables

```css
var(--orange-accent)    /* #FF8A00 */
var(--orange-light)     /* #FFB84D */
var(--bg-white)         /* #FFFFFF */
var(--bg-gray)          /* #F8F9FA */
var(--text-dark)        /* #1A1A1A */
var(--text-gray)        /* #6B7280 */
var(--border-light)     /* #E5E7EB */
```

## Common Patterns

### Card with Icon and Stats
```jsx
<div className="stat-card">
  <div className="stat-header">
    <div className="stat-icon-wrapper stat-icon-blue">
      <BookOpen className="stat-icon" />
    </div>
    <div className="stat-value-container">
      <p className="stat-value">3</p>
      <p className="stat-label">Courses</p>
    </div>
  </div>
</div>
```

### Action Button
```jsx
<button 
  className="btn-explore-courses"
  onClick={handleClick}
>
  Action Text
</button>
```

### Section Header
```jsx
<div className="section-header-dashboard">
  <h3 className="section-title-dashboard">Section Title</h3>
  <button className="view-all-link">View All</button>
</div>
```

## Testing Your Changes

1. **Visual Check:** Compare side-by-side with Dashboard
2. **Hover States:** Test all interactive elements
3. **Responsive:** Check mobile, tablet, desktop
4. **Functionality:** Ensure all features still work
5. **Performance:** No layout shifts or jank
6. **Accessibility:** Keyboard navigation, screen readers

## Resources

- **Main Styles:** `app/frontend/src/styles/DevvoraStyles.css`
- **Dashboard Component:** `app/frontend/src/components/Dashboard.jsx`
- **Icons:** lucide-react library
- **Fonts:** Inter, Poppins (Google Fonts)

---

**Remember:** The goal is visual consistency while maintaining all existing functionality. Only UI changes, no logic changes!
