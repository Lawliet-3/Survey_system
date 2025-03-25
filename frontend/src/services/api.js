// src/services/api.js - Complete revision
import axios from 'axios';

// Base API URL - adjust to match your FastAPI backend location
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

console.log("API URL:", API_URL); // Log the API URL for debugging

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Increase timeout for Cloud Run cold starts
  timeout: 60000
});

// Add request/response interceptors for debugging
apiClient.interceptors.request.use(
  config => {
    console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
    return config;
  }, 
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    if (error.response && error.response.status === 401) {
      // Avoid infinite loop - check if we're already trying to refresh
      const originalRequest = error.config;
      
      // If we're already in the refresh endpoint or already tried once, don't retry
      if (originalRequest.url.includes('/api/auth/refresh') || originalRequest._retry) {
        // Dispatch logout event and stop the loop
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      // Try token refresh just once
      return apiClient.post('/api/auth/refresh')
        .then(res => {
          return apiClient(originalRequest);
        })
        .catch(refreshError => {
          // If refresh fails, redirect to login
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return Promise.reject(error);
        });
    }
    return Promise.reject(error);
  }
);

// Survey endpoints
const surveyAPI = {
  // Health check endpoint to test connectivity
  checkHealth: async () => {
    try {
      const response = await apiClient.get('/api/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },
  
  // Get all questions for the survey
  getQuestions: async () => {
    try {
      const response = await apiClient.get('/api/questions');
      return response.data;
    } catch (error) {
      console.error('Error fetching questions:', error);
      throw error;
    }
  },
  
  // Submit survey responses
  submitSurvey: async (answers) => {
    try {
      const response = await apiClient.post('/api/submit', { answers });
      return response.data;
    } catch (error) {
      console.error('Error submitting survey:', error);
      throw error;
    }
  },
  
  // Unified transcription endpoint - this is the NEW main function for transcription
  transcribeAudio: async (audioBlob, language = 'th-TH') => {
    try {
      console.log(`Sending transcription request (${audioBlob.size} bytes)...`);
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');
      formData.append('language', language);
      
      // Set special headers for multipart form data
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout
      };
      
      const response = await apiClient.post('/api/transcribe', formData, config);
      console.log("Raw transcription response:", response);
      
      // Check if the response has the expected structure
      if (response && response.data) {
        console.log("Transcription response data:", response.data);
        
        // Ensure the transcript field exists
        if (response.data.transcript === undefined) {
          console.warn("Response doesn't contain a transcript field:", response.data);
          // Return a default object with empty transcript
          return { transcript: "", id: "missing", status: "error" };
        }
        
        return response.data;
      } else {
        console.warn("Unexpected response format:", response);
        // Return a default object
        return { transcript: "", id: "error", status: "error" };
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      // Return a default object so the UI can still update
      return { transcript: "", id: "error", status: "error" };
    }
  },
  
  // Check server transcription status
  checkTranscriptionStatus: async () => {
    try {
      const response = await apiClient.get('/api/transcription-status');
      return response.data;
    } catch (error) {
      console.error('Error checking transcription status:', error);
      throw error;
    }
  },
  
  // Keep these legacy methods for backward compatibility
  transcribeAudioGoogle: async (audioBlob, language = 'th-TH') => {
    return surveyAPI.transcribeAudio(audioBlob, language);
  },
  
  transcribeAudioTest: async (audioBlob, language = 'th-TH') => {
    return surveyAPI.transcribeAudio(audioBlob, language);
  },
  
  transcribeAudioGoogleImproved: async (audioBlob, language = 'th-TH') => {
    return surveyAPI.transcribeAudio(audioBlob, language);
  },
  
  // Legacy methods for compatibility
  testCredentials: async () => {
    return surveyAPI.checkTranscriptionStatus();
  },
  
  checkFfmpeg: async () => {
    return surveyAPI.checkTranscriptionStatus();
  }
};

// Admin endpoints
const adminAPI = {
  // Get all questions for admin - Add /api/ prefix to match backend
  getQuestions: async () => {
    try {
      const response = await apiClient.get('/api/admin/questions');
      return response.data;
    } catch (error) {
      console.error('Error fetching admin questions:', error);
      throw error;
    }
  },
  
  // Get a specific question - Add /api/ prefix to match backend
  getQuestion: async (questionId) => {
    try {
      const response = await apiClient.get(`/api/admin/questions/${questionId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching question ${questionId}:`, error);
      throw error;
    }
  },
  
  // Create a new question - Add /api/ prefix to match backend
  createQuestion: async (questionData) => {
    try {
      const response = await apiClient.post('/api/admin/questions', questionData);
      return response.data;
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  },
  
  // Update an existing question - Add /api/ prefix to match backend
  updateQuestion: async (questionId, questionData) => {
    try {
      const response = await apiClient.put(`/api/admin/questions/${questionId}`, questionData);
      return response.data;
    } catch (error) {
      console.error(`Error updating question ${questionId}:`, error);
      throw error;
    }
  },
  
  // Delete a question - Add /api/ prefix to match backend
  deleteQuestion: async (questionId) => {
    try {
      const response = await apiClient.delete(`/api/admin/questions/${questionId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting question ${questionId}:`, error);
      throw error;
    }
  },
  
  // Update question order - Add /api/ prefix to match backend
  updateQuestionsOrder: async (questions) => {
    try {
      // Transform the array into the expected format
      const orderData = {
        questions: questions.map((q, index) => ({
          id: q.id,
          displayOrder: index
        }))
      };
      
      console.log("Sending order data:", orderData);
      const response = await apiClient.put('/api/admin/questions/order', orderData);
      return response.data;
    } catch (error) {
      console.error('Error updating question order:', error);
      throw error;
    }
  },
  
  // Get all survey responses - Add /api/ prefix to match backend
  getResponses: async () => {
    try {
      const response = await apiClient.get('/api/admin/responses');
      return response.data;
    } catch (error) {
      console.error('Error fetching responses:', error);
      throw error;
    }
  },
  
  // Get a specific response - Add /api/ prefix to match backend
  getResponse: async (responseId) => {
    try {
      const response = await apiClient.get(`/api/admin/responses/${responseId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching response ${responseId}:`, error);
      throw error;
    }
  },
  
  // Initialize database - Add /api/ prefix to match backend
  initializeDatabase: async () => {
    try {
      const response = await apiClient.post('/api/admin/init_db');
      return response.data;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }
};

// Auth endpoints
const authAPI = {
  login: async (username, password) => {
    try {
      const response = await apiClient.post('/api/auth/login', { 
        username, 
        password 
      });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await apiClient.post('/api/auth/logout');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  },
  
  refreshToken: async () => {
    try {
      const response = await apiClient.post('/api/auth/refresh');
      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  },
  
  validateSession: async () => {
    try {
      const response = await apiClient.get('/api/auth/validate-session');
      return response.data.valid === true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  },
  
  getUserData: async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  }
};

// Export both API clients
export default {
  apiClient,
  survey: surveyAPI,
  admin: adminAPI,
  auth: authAPI,
};
