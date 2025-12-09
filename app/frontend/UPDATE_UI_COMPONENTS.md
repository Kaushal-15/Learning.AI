# UI Component Updates - Detailed Changes

## Important: Save all open files before applying these changes!

This document contains the specific code changes needed to match the Dashboard UI across all pages.

---

## 1. Learn.jsx - Key Changes

### Change 1: Update main container and add sidebar

**Find this code (around line 280):**
```jsx
return (
  <div className="min-h-screen bg-gray-50 relative">
    <GlobalThemeToggle />
    <AnimatedBackground />
    {/* Header */}
    <header className="bg-white shadow-sm border-b border-gray-200">
```

**Replace with:**
```jsx
return (
  <div className="dashboard-container">
    <GlobalThemeToggle />
    <AnimatedBackground />
    
    {/* Sidebar */}
    <aside className="dashboard-sidebar">
      <div className="sidebar-content">
        <div className="sidebar-logo">
          <div className="logo-icon">📚</div>
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item"
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard"
          >
            <ArrowLeft className="nav-icon" />
          </button>
        </nav>
      </div>
    </aside>

    {/* Main Content */}
    <main className="dashboard-main">
      {/* Header Card */}
      <div className="dashboard-welcome-card" style={{ marginBottom: '2rem' }}>
```

### Change 2: Update header content

**Find this code (around line 290):**
```jsx
<div className="flex items-center justify-between py-4">
  <div className="flex items-center gap-4">
    <button
      onClick={() => navigate("/dashboard")}
      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-[#344F1F] rounded-lg flex items-center justify-center">
        {roadmapIcons[user?.selectedRoadmap]}
      </div>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{roadmapData.title}</h1>
        <p className="text-sm text-gray-500">{roadmapData.description}</p>
      </div>
    </div>
  </div>

  <div className="flex items-center gap-8">
    <div className="text-center">
      <div className="text-2xl font-bold text-[#344F1F]">{getTotalProgress()}%</div>
      <div className="text-xs text-gray-500">Progress</div>
    </div>
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-600">{Array.from(completedTasks).length}</div>
      <div className="text-xs text-gray-500">Completed</div>
    </div>
  </div>
</div>

{/* Progress Bar */}
<div className="pb-4">
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-[#344F1F] h-2 rounded-full transition-all duration-500"
      style={{ width: `${getTotalProgress()}%` }}
    ></div>
  </div>
</div>
```

**Replace with:**
```jsx
<div className="welcome-card-content">
  <h3 className="welcome-back-text">Your Learning Path</h3>
  <h2 className="welcome-name">{roadmapData.title}</h2>
  <p className="welcome-description">{roadmapData.description}</p>
  <div className="flex items-center gap-8 mt-4">
    <div>
      <div className="text-3xl font-bold text-white">{getTotalProgress()}%</div>
      <div className="text-sm text-white opacity-90">Progress</div>
    </div>
    <div>
      <div className="text-3xl font-bold text-white">{Array.from(completedTasks).length}</div>
      <div className="text-sm text-white opacity-90">Completed</div>
    </div>
  </div>
  {/* Progress Bar */}
  <div className="mt-4">
    <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
      <div
        className="bg-white h-2 rounded-full transition-all duration-500"
        style={{ width: `${getTotalProgress()}%` }}
      ></div>
    </div>
  </div>
</div>
<div className="welcome-card-character">
  <div className="character-3d-dashboard">🎯</div>
</div>
```

### Change 3: Update content wrapper

**Find this code (around line 320):**
```jsx
</header>

{/* Main Content */}
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
```

**Replace with:**
```jsx
</div>

{/* Content Grid */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
```

### Change 4: Update sidebar navigation cards

**Find this code (around line 325):**
```jsx
<div className="lg:col-span-1">
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <Calendar className="w-5 h-5 text-[#344F1F]" />
      Timeline
    </h3>
```

**Replace with:**
```jsx
<div className="lg:col-span-1">
  <div className="course-progress-card sticky top-8">
    <h3 className="section-title-dashboard mb-4 flex items-center gap-2" style={{ fontSize: '1.25rem' }}>
      <Calendar className="w-5 h-5" style={{ color: 'var(--orange-accent)' }} />
      Timeline
    </h3>
```

### Change 5: Update week navigation items

**Find this code (around line 335):**
```jsx
<div
  key={week.week}
  onClick={() => setCurrentWeek(week.week)}
  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${isActive
    ? 'bg-[#344F1F] text-white border-[#344F1F]'
    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300'
    }`}
>
  <div className="flex items-center justify-between mb-2">
    <span className="font-medium">Week {week.week}</span>
    <span className="text-sm">{progress}%</span>
  </div>
  <div className="text-sm opacity-90 mb-3">{week.title}</div>
  <div className={`w-full rounded-full h-1.5 ${isActive ? 'bg-white bg-opacity-30' : 'bg-gray-200'}`}>
    <div
      className={`h-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-white' : 'bg-[#344F1F]'
        }`}
      style={{ width: `${progress}%` }}
    ></div>
  </div>
</div>
```

**Replace with:**
```jsx
<div
  key={week.week}
  onClick={() => setCurrentWeek(week.week)}
  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${isActive
    ? 'border-current shadow-md'
    : 'bg-white border-gray-200 hover:border-gray-300'
    }`}
  style={isActive ? { 
    background: 'var(--orange-accent)', 
    color: 'white',
    borderColor: 'var(--orange-accent)'
  } : {}}
>
  <div className="flex items-center justify-between mb-2">
    <span className="font-semibold">Week {week.week}</span>
    <span className="text-sm font-bold">{progress}%</span>
  </div>
  <div className="text-sm opacity-90 mb-3">{week.title}</div>
  <div className="progress-bar-container" style={{ height: '6px' }}>
    <div
      className={`progress-bar-fill ${isActive ? '' : 'progress-orange'}`}
      style={isActive ? { background: 'white', width: `${progress}%` } : { width: `${progress}%` }}
    ></div>
  </div>
</div>
```

### Change 6: Update week header card

**Find this code (around line 365):**
```jsx
{/* Week Header */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <div className="flex items-center gap-4 mb-4">
    <div className="w-12 h-12 bg-[#344F1F] text-white rounded-lg flex items-center justify-center">
      <Trophy className="w-6 h-6" />
    </div>
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Week {week.week}: {week.title}</h2>
      <p className="text-gray-600">{week.description}</p>
    </div>
  </div>

  <div className="flex items-center gap-6 text-sm text-gray-500">
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-[#344F1F]" />
      <span>{week.days.reduce((sum, day) => sum + parseInt(day.duration), 0)} hours total</span>
    </div>
    <div className="flex items-center gap-2">
      <Target className="w-4 h-4 text-[#344F1F]" />
      <span>{week.days.length} tasks</span>
    </div>
    <div className="flex items-center gap-2">
      <Zap className="w-4 h-4 text-[#344F1F]" />
      <span>{getWeekProgress(week, weekIndex)}% complete</span>
    </div>
  </div>
</div>
```

**Replace with:**
```jsx
{/* Week Header */}
<div className="stat-card">
  <div className="flex items-center gap-4 mb-4">
    <div className="stat-icon-wrapper stat-icon-blue">
      <Trophy className="stat-icon" />
    </div>
    <div className="flex-1">
      <h2 className="section-title-dashboard">Week {week.week}: {week.title}</h2>
      <p className="text-gray-600">{week.description}</p>
    </div>
  </div>

  <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--text-gray)' }}>
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4" style={{ color: 'var(--orange-accent)' }} />
      <span>{week.days.reduce((sum, day) => sum + parseInt(day.duration), 0)} hours total</span>
    </div>
    <div className="flex items-center gap-2">
      <Target className="w-4 h-4" style={{ color: 'var(--orange-accent)' }} />
      <span>{week.days.length} tasks</span>
    </div>
    <div className="flex items-center gap-2">
      <Zap className="w-4 h-4" style={{ color: 'var(--orange-accent)' }} />
      <span>{getWeekProgress(week, weekIndex)}% complete</span>
    </div>
  </div>
</div>
```

### Change 7: Update daily task cards

**Find this code (around line 390):**
```jsx
{/* Daily Tasks */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {week.days.map((day, dayIndex) => {
    const taskId = `${weekIndex}-${dayIndex}`;
    const isCompleted = completedTasks.has(taskId);

    return (
      <div
        key={day.day}
        className={`bg-white rounded-lg shadow-sm border p-6 transition-all duration-200 hover:shadow-md ${isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-200'
          }`}
      >
```

**Replace with:**
```jsx
{/* Daily Tasks */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {week.days.map((day, dayIndex) => {
    const taskId = `${weekIndex}-${dayIndex}`;
    const isCompleted = completedTasks.has(taskId);

    return (
      <div
        key={day.day}
        className={`stat-card ${isCompleted ? 'border-2' : ''}`}
        style={isCompleted ? { borderColor: '#10B981', background: '#D1FAE5' } : {}}
      >
```

### Change 8: Update task card content

**Find this code (around line 405):**
```jsx
<div className="flex items-start justify-between mb-4">
  <div className="flex items-center gap-3">
    <div className={`p-2 rounded-lg border-2 ${getTypeColor(day.type)}`}>
      {getTypeIcon(day.type)}
    </div>
    <div>
      <div className="text-sm text-gray-500">Day {day.day}</div>
      <h3 className="font-semibold text-gray-800">{day.title}</h3>
    </div>
  </div>
```

**Replace with:**
```jsx
<div className="flex items-start justify-between mb-4">
  <div className="flex items-center gap-3">
    <div className={`p-2 rounded-lg border-2 ${getTypeColor(day.type)}`}>
      {getTypeIcon(day.type)}
    </div>
    <div>
      <div className="text-sm" style={{ color: 'var(--text-gray)' }}>Day {day.day}</div>
      <h3 className="font-semibold" style={{ color: 'var(--text-dark)' }}>{day.title}</h3>
    </div>
  </div>
```

### Change 9: Update task action button

**Find this code (around line 425):**
```jsx
<button
  onClick={() => navigate('/LearnPaths', {
    state: {
      roadmapId: user?.selectedRoadmap,
      week: week.week,
      day: day.day,
      dayData: day,
      roadmapTitle: roadmapData.title
    }
  })}
  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isCompleted
    ? 'bg-green-100 text-green-700 hover:bg-green-200'
    : 'bg-[#344F1F] text-white hover:bg-[#2a3f1a]'
    }`}
>
  <Play className="w-4 h-4" />
  {isCompleted ? 'Review' : 'Start Learning'}
</button>
```

**Replace with:**
```jsx
<button
  onClick={() => navigate('/LearnPaths', {
    state: {
      roadmapId: user?.selectedRoadmap,
      week: week.week,
      day: day.day,
      dayData: day,
      roadmapTitle: roadmapData.title
    }
  })}
  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${isCompleted
    ? 'bg-green-100 text-green-700 hover:bg-green-200'
    : 'btn-explore-courses'
    }`}
  style={!isCompleted ? { background: 'var(--text-dark)', color: 'white' } : {}}
>
  <Play className="w-4 h-4" />
  {isCompleted ? 'Review' : 'Start Learning'}
</button>
```

### Change 10: Close main and container tags

**Find this code (at the end, around line 450):**
```jsx
        </div>
      </div>
    </div>
  </div>
);
```

**Replace with:**
```jsx
        </div>
      </div>
    </main>
  </div>
);
```

---

## 2. QuizSelection.jsx - Key Changes

### Change 1: Update main container

**Find this code (around line 140):**
```jsx
return (
  <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative">
    <GlobalThemeToggle />
    <AnimatedBackground />

    {/* Header */}
    <header className="bg-white/90 dark:bg-dark-400/50 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-dark-300">
```

**Replace with:**
```jsx
return (
  <div className="dashboard-container">
    <GlobalThemeToggle />
    <AnimatedBackground />

    {/* Sidebar */}
    <aside className="dashboard-sidebar">
      <div className="sidebar-content">
        <div className="sidebar-logo">
          <div className="logo-icon">🎯</div>
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item"
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard"
          >
            <ArrowLeft className="nav-icon" />
          </button>
        </nav>
      </div>
    </aside>

    {/* Main Content */}
    <main className="dashboard-main">
      {/* Header Card */}
      <div className="dashboard-welcome-card" style={{ marginBottom: '2rem' }}>
        <div className="welcome-card-content">
          <h3 className="welcome-back-text">Test Your Knowledge</h3>
          <h2 className="welcome-name">Interactive Quiz</h2>
          <p className="welcome-description">
            Challenge yourself with {getRoadmapTitle(user?.selectedRoadmap)} quizzes
          </p>
        </div>
        <div className="welcome-card-character">
          <div className="character-3d-dashboard">🧠</div>
        </div>
      </div>
```

### Change 2: Update quiz type cards

**Find this code (around line 170):**
```jsx
<div
  key={quiz.id}
  className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 p-6 hover:shadow-xl transition-all duration-200"
>
```

**Replace with:**
```jsx
<div
  key={quiz.id}
  className="stat-card"
  style={{ cursor: 'pointer' }}
>
```

### Change 3: Update quiz card icon wrapper

**Find this code (around line 175):**
```jsx
<div className={`w-16 h-16 bg-gradient-to-r ${quiz.color} rounded-lg flex items-center justify-center text-white mb-4`}>
  {quiz.icon}
</div>
```

**Replace with:**
```jsx
<div className="cta-icon-wrapper" style={{ 
  width: '64px', 
  height: '64px', 
  background: `linear-gradient(135deg, ${quiz.color.includes('from-') ? quiz.color.replace('from-', '').replace('to-', ', ') : quiz.color})`,
  marginBottom: '1rem'
}}>
  {quiz.icon}
</div>
```

### Change 4: Update quiz card button

**Find this code (around line 200):**
```jsx
<button
  onClick={() => handleQuizTypeClick(quiz)}
  disabled={creating}
  className={`w-full py-3 px-4 bg-gradient-to-r ${quiz.color} text-white rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
>
  <Play className="w-4 h-4" />
  {creating ? 'Creating...' : quiz.isAdaptive ? 'Start Adaptive Quiz' : 'Select Mode'}
</button>
```

**Replace with:**
```jsx
<button
  onClick={() => handleQuizTypeClick(quiz)}
  disabled={creating}
  className="btn-explore-courses w-full"
  style={{ 
    background: 'var(--text-dark)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  }}
>
  <Play className="w-4 h-4" />
  {creating ? 'Creating...' : quiz.isAdaptive ? 'Start Adaptive Quiz' : 'Select Mode'}
</button>
```

### Change 5: Update recent quizzes section

**Find this code (around line 215):**
```jsx
<div className="lg:col-span-1">
  <h2 className="text-xl font-bold text-gray-900 dark:text-cream-100 mb-6">Recent Quizzes</h2>
  <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 p-6">
```

**Replace with:**
```jsx
<div className="lg:col-span-1">
  <h2 className="section-title-dashboard mb-6">Recent Quizzes</h2>
  <div className="course-progress-card">
```

---

## 3. AdaptiveQuizTest.jsx - Key Changes

### Change 1: Update main container

**Find this code (around line 100):**
```jsx
return (
  <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative p-6">
    <AnimatedBackground />
    <div className="absolute top-4 right-4 z-10">
      <ThemeToggle />
    </div>
```

**Replace with:**
```jsx
return (
  <div className="dashboard-container">
    <AnimatedBackground />
    <div className="absolute top-4 right-4 z-10">
      <ThemeToggle />
    </div>

    {/* Sidebar */}
    <aside className="dashboard-sidebar">
      <div className="sidebar-content">
        <div className="sidebar-logo">
          <div className="logo-icon">🧪</div>
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item"
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard"
          >
            <ArrowLeft className="nav-icon" />
          </button>
        </nav>
      </div>
    </aside>

    <main className="dashboard-main">
```

### Change 2: Update test cards

**Find this code (around line 120):**
```jsx
<div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6">
```

**Replace with:**
```jsx
<div className="stat-card">
```

### Change 3: Update result cards

**Find this code (around line 180):**
```jsx
<div
  key={index}
  className={`bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-lg shadow-sm border-2 p-6 ${
    result.success ? 'border-green-200 dark:border-green-400/30' : 'border-red-200 dark:border-red-400/30'
  }`}
>
```

**Replace with:**
```jsx
<div
  key={index}
  className="stat-card"
  style={{
    borderWidth: '2px',
    borderColor: result.success ? '#10B981' : '#EF4444',
    background: result.success ? '#D1FAE5' : '#FEE2E2'
  }}
>
```

---

## Final Steps

1. **Save all open files** in your editor
2. Apply changes to each file one at a time
3. Test each page after updating
4. Verify responsive behavior
5. Check dark mode compatibility
6. Ensure all functionality still works

## Quick Test Commands

```bash
# Start the frontend
cd app/frontend
npm run dev

# Test each page:
# - http://localhost:5173/learn
# - http://localhost:5173/LearnPaths
# - http://localhost:5173/quiz-selection
# - http://localhost:5173/adaptive-quiz-test
```

## Common Issues & Solutions

**Issue:** Styles not applying
**Solution:** Clear browser cache, check DevvoraStyles.css is imported

**Issue:** Layout breaks on mobile
**Solution:** Verify responsive classes are maintained

**Issue:** Colors don't match
**Solution:** Use CSS variables (var(--orange-accent), etc.)

**Issue:** Animations not working
**Solution:** Check transition classes are applied

---

Need help? Check the DevvoraStyles.css file for all available classes and color variables.
