# Video Display Fix for LearnPaths.jsx

## Problem
The frontend is trying to embed YouTube search URLs which don't work as iframes. The backend now returns proper `embedUrl` fields.

## Fix Required in: app/frontend/src/components/LearnPaths.jsx

### Find this code (around line 510):
```jsx
{generatedContent.video.links && generatedContent.video.links.length > 0 ? (
  generatedContent.video.links.map((video, idx) => (
    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <h4 className="font-semibold text-gray-900 mb-3">{video.title}</h4>
      <div className="relative w-full pb-[56.25%] mb-4 bg-gray-100 rounded-lg overflow-hidden">
        <iframe
          src={video.url}
          title={video.title}
```

### Replace with:
```jsx
{(generatedContent.video.videos || generatedContent.video.links) && (generatedContent.video.videos?.length > 0 || generatedContent.video.links?.length > 0) ? (
  (generatedContent.video.videos || generatedContent.video.links).map((video, idx) => (
    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <h4 className="font-semibold text-gray-900 mb-3">{video.title}</h4>
      <div className="relative w-full pb-[56.25%] mb-4 bg-gray-100 rounded-lg overflow-hidden">
        <iframe
          src={video.embedUrl || video.url}
          title={video.title}
```

### Also add this after the duration span (around line 527):
```jsx
{video.searchUrl && (
  <a 
    href={video.searchUrl} 
    target="_blank" 
    rel="noopener noreferrer"
    className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
  >
    Search on YouTube →
  </a>
)}
```

## What This Does
1. Uses the new `videos` array if available (with embedUrl)
2. Falls back to `links` array for backward compatibility
3. Uses `embedUrl` for iframe src (proper YouTube embeds)
4. Adds a link to search YouTube directly if needed

## After Applying
1. Save the file
2. Restart your frontend dev server
3. Clear browser cache or hard refresh (Ctrl+Shift+R)
4. Test video generation
