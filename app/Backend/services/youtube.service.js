const axios = require('axios');

/**
 * YouTube Service
 * Handles YouTube Data API v3 integration for fetching educational videos
 */
class YouTubeService {
    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
        this.defaultMaxResults = 5;

        // Curated educational channels for programming/tech content
        this.educationalChannels = [
            'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
            'UCW5YeuERMmlnqo4oq8vwUpg', // Net Ninja
            'UC29ju8bIPH5as8OGnQzwJyA', // Traversy Media
            'UCvjgXvBlbQiydffTwlwv7KQ', // Coding Train
            'UCsBjURrPoezykLs9EqgamOA', // Fireship
        ];
    }

    /**
     * Search YouTube for videos on a specific topic
     */
    async searchVideos(query, maxResults = this.defaultMaxResults) {
        // If no API key, return curated fallback
        if (!this.apiKey) {
            console.log('[YouTube] No API key found, using curated fallback');
            return this.getCuratedVideos(query, maxResults);
        }

        try {
            const response = await axios.get(`${this.baseUrl}/search`, {
                params: {
                    key: this.apiKey,
                    q: query,
                    part: 'snippet',
                    type: 'video',
                    maxResults: maxResults,
                    order: 'relevance',
                    videoDuration: 'medium', // 4-20 minutes
                    videoEmbeddable: true,
                    videoSyndicated: true,
                    relevanceLanguage: 'en',
                    safeSearch: 'strict'
                }
            });

            if (response.data && response.data.items) {
                const videos = response.data.items.map(item => ({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails.medium.url,
                    channelTitle: item.snippet.channelTitle,
                    publishedAt: item.snippet.publishedAt,
                    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
                    duration: 'N/A' // Will be fetched separately if needed
                }));

                // Fetch durations for all videos
                const videoIds = videos.map(v => v.id).join(',');
                const durations = await this.getVideoDurations(videoIds);

                videos.forEach((video, index) => {
                    video.duration = durations[video.id] || 'N/A';
                });

                return videos;
            }

            return [];
        } catch (error) {
            console.error('[YouTube] Search error:', error.message);
            // Fallback to curated videos
            return this.getCuratedVideos(query, maxResults);
        }
    }

    /**
     * Get video durations for multiple videos
     */
    async getVideoDurations(videoIds) {
        if (!this.apiKey) return {};

        try {
            const response = await axios.get(`${this.baseUrl}/videos`, {
                params: {
                    key: this.apiKey,
                    id: videoIds,
                    part: 'contentDetails'
                }
            });

            const durations = {};
            if (response.data && response.data.items) {
                response.data.items.forEach(item => {
                    durations[item.id] = this.formatDuration(item.contentDetails.duration);
                });
            }

            return durations;
        } catch (error) {
            console.error('[YouTube] Duration fetch error:', error.message);
            return {};
        }
    }

    /**
     * Format ISO 8601 duration to readable format
     */
    formatDuration(isoDuration) {
        const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return 'N/A';

        const hours = (match[1] || '').replace('H', '');
        const minutes = (match[2] || '').replace('M', '');
        const seconds = (match[3] || '').replace('S', '');

        if (hours) {
            return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
        } else if (minutes) {
            return `${minutes}:${seconds.padStart(2, '0')}`;
        } else {
            return `0:${seconds.padStart(2, '0')}`;
        }
    }

    /**
     * Find best educational videos for a topic
     */
    async findBestVideos(topic, roadmap = '', count = 5) {
        const queries = [
            `${topic} tutorial ${roadmap}`,
            `${topic} explained`,
            `${topic} crash course`,
            `${topic} for beginners`,
            `learn ${topic}`
        ];

        const allVideos = [];

        // Search with different queries to get variety
        for (const query of queries.slice(0, 3)) { // Use first 3 queries
            const videos = await this.searchVideos(query, 3);
            allVideos.push(...videos);

            // Small delay to avoid rate limiting
            await this.delay(100);
        }

        // Remove duplicates based on video ID
        const uniqueVideos = Array.from(
            new Map(allVideos.map(v => [v.id, v])).values()
        );

        // Sort by relevance (prefer educational channels)
        const sorted = uniqueVideos.sort((a, b) => {
            const aIsEducational = this.educationalChannels.includes(a.channelId);
            const bIsEducational = this.educationalChannels.includes(b.channelId);

            if (aIsEducational && !bIsEducational) return -1;
            if (!aIsEducational && bIsEducational) return 1;
            return 0;
        });

        return sorted.slice(0, count);
    }

    /**
     * Get curated video links (fallback when API unavailable)
     */
    getCuratedVideos(query, maxResults = 5) {
        console.log(`[YouTube] Generating curated videos for: ${query}`);

        // Generate search-based videos that will work
        const videos = [];
        const searchQueries = [
            `${query} tutorial`,
            `${query} explained`,
            `${query} crash course`,
            `${query} for beginners`,
            `learn ${query}`
        ];

        for (let i = 0; i < Math.min(maxResults, searchQueries.length); i++) {
            const searchQuery = searchQueries[i];
            videos.push({
                id: `search-${i}`,
                title: searchQuery,
                description: `Learn about ${query} through this curated video tutorial`,
                thumbnail: '',
                channelTitle: 'YouTube',
                url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
                embedUrl: `https://www.youtube.com/embed/videoseries?list=PLWKjhJtqVAbnRT_hue-3zyiuIYj0OlpyG&search_query=${encodeURIComponent(searchQuery)}`,
                duration: '10-20 min'
            });
        }

        return videos;
    }

    /**
     * Convert video data to database format
     */
    formatForDatabase(videos) {
        return videos.map(video => ({
            url: video.embedUrl,
            title: video.title,
            description: video.description.substring(0, 200), // Limit description length
            duration: video.duration
        }));
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new YouTubeService();
