# UI Update Instructions

## Overview
This document provides instructions to update the Learn, LearnPaths, QuizSelection, and AdaptiveQuizTest pages to match the Dashboard UI styling while maintaining all existing logic.

## Key Changes Required

### 1. Learn.jsx Updates

**Replace the main container structure:**
- Change from `<div className="min-h-screen bg-gray-50 relative">` to `<div className="dashboard-container">`
- Add the dashboard sidebar (same as Dashboard.jsx)
- Wrap content in `<main className="dashboard-main">`

**Update the header section:**
- Replace the current header with a `dashboard-welcome-card` component
- Use the same gradient green background as Dashboard
- Include progress stats in the welcome card
- Add the floating character animation

**Update the sidebar navigation:**
- Change from white cards to `course-progress-card` styling
- Use `progress-bar-container` and `progress-bar-fill` classes
- Apply orange accent color for active states
- Use `section-title-dashboard` for headings

**Update task cards:**
- Change from basic white cards to `stat-card` styling
- Add hover effects matching Dashboard cards
- Use `btn-explore-courses` styling for action buttons
- Apply consistent border-radius (25px-30px)

### 2. LearnPaths.jsx Updates

**Main container:**
- Use `dashboard-container` structure
- Add sidebar with back navigation
- Wrap content in `dashboard-main`

**Content cards:**
- Replace white cards with `stat-card` or `course-progress-card`
- Use `section-title-dashboard` for section headers
- Apply `cta-icon-wrapper` styling for icons
- Use consistent padding (2rem-2.5rem)

**Mode selector buttons:**
- Style similar to `dashboard-cta-card`
- Add hover effects with transform and shadow
- Use pastel backgrounds for different modes
- Apply `cta-title` and `cta-description` classes

**Content display:**
- Use `courses-table-card` for structured content
- Apply `stat-card` for information blocks
- Use `progress-bar-container` for progress indicators

### 3. QuizSelection.jsx Updates

**Layout structure:**
- Implement `dashboard-container` with sidebar
- Use `dashboard-main` for content area
- Add welcome card at the top

**Quiz type cards:**
- Style as `dashboard-cta-card` variants
- Use gradient backgrounds (from DevvoraStyles.css)
- Apply `cta-icon-wrapper` for icons
- Add `cta-title` and `cta-description` styling
- Include hover animations (translateY, shadow)

**Recent quizzes section:**
- Use `course-progress-card` styling
- Apply `courses-table` if using table layout
- Use `status-badge` for quiz status
- Add `stat-card` styling for individual quiz items

**Modal styling:**
- Use white background with rounded corners (25px-30px)
- Apply shadow: `0 8px 30px rgba(0, 0, 0, 0.2)`
- Use `btn-explore-courses` for primary actions
- Add backdrop blur effect

### 4. AdaptiveQuizTest.jsx Updates

**Container:**
- Use `dashboard-container` structure
- Add sidebar navigation
- Wrap in `dashboard-main`

**Test cards:**
- Apply `stat-card` styling
- Use `stat-icon-wrapper` with color variants
- Add `section-title-dashboard` for headings
- Include mini charts or progress indicators

**Action buttons:**
- Style as `dashboard-cta-card` for main actions
- Use `btn-explore-courses` for primary buttons
- Apply `view-all-link` for secondary actions

**Results display:**
- Use `courses-table-card` for results table
- Apply `status-badge` for pass/fail indicators
- Use `stat-card` for individual test results
- Add color coding (green for pass, red for fail)

## Color Scheme (from DevvoraStyles.css)

```css
--orange-accent: #FF8A00
--orange-light: #FFB84D
--bg-white: #FFFFFF
--bg-gray: #F8F9FA
--text-dark: #1A1A1A
--text-gray: #6B7280
--border-light: #E5E7EB
```

## Common CSS Classes to Use

### Cards:
- `stat-card` - Main card styling
- `course-progress-card` - Progress/info cards
- `dashboard-cta-card` - Call-to-action cards
- `courses-table-card` - Table containers

### Typography:
- `section-title-dashboard` - Section headings
- `welcome-name` - Large titles
- `welcome-description` - Descriptions

### Buttons:
- `btn-explore-courses` - Primary action buttons
- `view-all-link` - Secondary link buttons
- `nav-item` - Navigation buttons

### Progress:
- `progress-bar-container` - Progress bar wrapper
- `progress-bar-fill` - Progress bar fill
- `progress-orange` / `progress-blue` / `progress-green` - Color variants

### Icons:
- `stat-icon-wrapper` - Icon containers
- `stat-icon-blue` / `stat-icon-purple` / `stat-icon-green` - Color variants
- `cta-icon-wrapper` - CTA icon containers

## Responsive Considerations

- Maintain existing responsive breakpoints
- Ensure sidebar collapses on mobile
- Keep grid layouts flexible
- Test on mobile, tablet, and desktop views

## Animation & Transitions

- Use `transition-all duration-200` for hover effects
- Apply `transform: translateY(-5px)` on card hover
- Add shadow transitions on hover
- Include `character-3d-dashboard` animation for floating elements

## Implementation Steps

1. Save all open files in the editor
2. Update Learn.jsx first (it's the most complex)
3. Test Learn.jsx thoroughly
4. Update LearnPaths.jsx
5. Update QuizSelection.jsx
6. Update AdaptiveQuizTest.jsx
7. Test all pages for responsiveness
8. Verify dark mode compatibility (if applicable)
9. Check all interactive elements work correctly

## Testing Checklist

- [ ] All pages load without errors
- [ ] Navigation works between pages
- [ ] Cards have consistent styling
- [ ] Hover effects work properly
- [ ] Progress bars animate correctly
- [ ] Buttons have proper styling
- [ ] Icons display correctly
- [ ] Responsive layout works on all screen sizes
- [ ] Colors match Dashboard theme
- [ ] Typography is consistent
- [ ] All existing functionality still works
