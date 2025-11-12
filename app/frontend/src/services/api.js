const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Learner API methods
  async createLearner(learnerData) {
    return this.request('/learners', {
      method: 'POST',
      body: learnerData,
    });
  }

  async getAllLearners() {
    return this.request('/learners');
  }

  async getLearner(id) {
    return this.request(`/learners/${id}`);
  }

  async updateLearner(id, updates) {
    return this.request(`/learners/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async simulateAnswer(learnerId, answerData) {
    return this.request(`/learners/${learnerId}/answer`, {
      method: 'POST',
      body: answerData,
    });
  }

  async getLearnerAnalytics(id) {
    return this.request(`/learners/${id}/analytics`);
  }

  async getRecommendedDifficulty(learnerId, category) {
    return this.request(`/learners/${learnerId}/difficulty/${category}`);
  }

  async deleteLearner(id) {
    return this.request(`/learners/${id}`, {
      method: 'DELETE',
    });
  }

  // Performance API methods
  async createPerformance(performanceData) {
    return this.request('/performance', {
      method: 'POST',
      body: performanceData,
    });
  }

  async getPerformanceRecords(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/performance${queryParams ? `?${queryParams}` : ''}`);
  }

  async getPerformanceAnalytics(learnerId, timeRange = 30) {
    return this.request(`/performance/analytics/learner/${learnerId}?timeRange=${timeRange}`);
  }

  async getCategoryTrends(learnerId, category, days = 30) {
    return this.request(`/performance/analytics/trends/${learnerId}/${category}?days=${days}`);
  }

  async getDifficultyProgression(learnerId, category) {
    return this.request(`/performance/analytics/difficulty/${learnerId}/${category}`);
  }

  async getSessionPerformance(sessionId) {
    return this.request(`/performance/analytics/session/${sessionId}`);
  }
}

export default new ApiService();