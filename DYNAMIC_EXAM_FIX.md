# Dynamic Exam Fix for Student Portal

## Issue
The dynamic quiz creation is working in the ADMIN page but the dynamic test is not working in the student portal.

## Root Cause
The ExamSession component is only checking for `exam.isAdaptive` but the backend uses `exam.examType === 'dynamic'` for dynamic exams. This causes dynamic exams to be handled by the regular ExamSession instead of the AdaptiveExamSession.

## Fix Required

In `app/frontend/src/components/ExamSession.jsx`, line ~45, change:

```javascript
// Check if this is an adaptive exam
if (exam.isAdaptive) {
    // Redirect to adaptive exam session
    navigate(`/exam/${examId}/adaptive`, { replace: true });
    return;
}
```

To:

```javascript
// Check if this is an adaptive or dynamic exam
if (exam.isAdaptive || exam.examType === 'dynamic') {
    // Redirect to adaptive exam session
    navigate(`/exam/${examId}/adaptive`, { replace: true });
    return;
}
```

## Additional Issues Found

1. **Backend Route Missing**: The adaptive exam routes exist but may need additional validation
2. **Question Generation**: Dynamic exams should generate questions on-the-fly
3. **Session Handling**: The AdaptiveExamSession component expects different data structure

## Testing Steps

1. Create a dynamic exam in admin panel
2. Try to access it from student portal
3. Verify it redirects to adaptive session
4. Ensure questions are generated properly

## Files to Modify

1. `app/frontend/src/components/ExamSession.jsx` - Add dynamic exam check
2. Potentially `app/frontend/src/components/AdaptiveExamSession.jsx` - Ensure it handles dynamic exams properly