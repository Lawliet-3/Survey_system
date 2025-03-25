// src/services/questionService.js
import api from './api';

// Public API - ALWAYS uses the backend API
const questionService = {
  // Get all questions
  getQuestions: async () => {
    console.log("Fetching questions from backend API");
    try {
      return await api.survey.getQuestions();
    } catch (error) {
      console.error("Error fetching questions from API:", error);
      throw error;
    }
  },
  
  // Get a specific question by ID
  getQuestion: async (id) => {
    console.log(`Fetching question ${id} from backend API`);
    try {
      return await api.admin.getQuestion(id);
    } catch (error) {
      console.error(`Error fetching question ${id}:`, error);
      throw error;
    }
  },
  
  // Create a new question
  createQuestion: async (questionData) => {
    console.log("Creating question via backend API", questionData);
    try {
      return await api.admin.createQuestion(questionData);
    } catch (error) {
      console.error(`Error creating question:`, error);
      throw error;
    }
  },
  
  // Update an existing question
  updateQuestion: async (id, questionData) => {
    console.log("Updating question via backend API", id, questionData);
    try {
      return await api.admin.updateQuestion(id, questionData);
    } catch (error) {
      console.error(`Error updating question ${id}:`, error);
      throw error;
    }
  },
  
  // Delete a question
  deleteQuestion: async (questionId) => {
    console.log("Deleting question via backend API", questionId);
    try {
      return await api.admin.deleteQuestion(questionId);
    } catch (error) {
      console.error(`Error deleting question ${questionId}:`, error);
      throw error;
    }
  },
  
  // Update question order
  updateQuestionOrder: async (orderedQuestions) => {
    console.log("Updating question order via backend API");
    try {
      return await api.admin.updateQuestionsOrder(orderedQuestions);
    } catch (error) {
      console.error("Error updating question order:", error);
      throw error;
    }
  },
  
  // Submit survey answers
  submitSurvey: async (answers) => {
    console.log("Submitting survey via backend API", answers);
    try {
      return await api.survey.submitSurvey(answers);
    } catch (error) {
      console.error("Error submitting survey:", error);
      throw error;
    }
  },
  
  // Get all survey responses
  getResponses: async () => {
    console.log("Fetching responses from backend API");
    try {
      return await api.admin.getResponses();
    } catch (error) {
      console.error("Error fetching responses:", error);
      throw error;
    }
  },
  
  // Get a specific response
  getResponse: async (id) => {
    console.log(`Fetching response ${id} from backend API`);
    try {
      return await api.admin.getResponse(id);
    } catch (error) {
      console.error(`Error fetching response ${id}:`, error);
      throw error;
    }
  },
  
  // Initialize database
  initializeDatabase: async () => {
    console.log("Initializing database via backend API");
    try {
      return await api.admin.initializeDatabase();
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }
};

export default questionService;