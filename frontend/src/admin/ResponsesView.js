// src/admin/ResponsesView.js - Updated to handle option labels better
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; 
import authService from '../services/authService';
import questionService from '../services/questionService';
import './AdminStyles.css';

function ResponsesView() {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const [responses, setResponses] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    // Check if user is logged in
    if (!authService.isAuthenticated() || !authService.isAdmin()) {
      console.log('Not authenticated as admin, redirecting to main login');
      navigate('/');
      return;
    }
    
    // Fetch data
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get responses and questions from the shared service
        const responsesData = await questionService.getResponses();
        const questionsData = await questionService.getQuestions();
        
        setResponses(responsesData);
        setQuestions(questionsData);
        
        if (responsesData.length > 0) {
          setSelectedResponse(responsesData[0]);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load responses. Please try again later.');
        setLoading(false);
        console.error('Error loading responses:', err);
      }
    };
    
    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logout();  // Use the context's logout function
      navigate('/');  // Redirect to main page instead of admin login
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const handleBackToQuestions = () => {
    navigate('/admin');
  };
  
  // Helper function to find question text by ID
  const getQuestionText = (questionId) => {
    const question = questions.find(q => q.id === questionId);
    return question ? question.questionText : questionId;
  };
  
  // Convert option values to labels for existing data
const convertValuesToLabels = (question, values) => {
  // Check if we have a valid question with options
  if (!question || !question.options || !Array.isArray(question.options)) {
    return values;
  }
  
  // Create a map of values to labels
  const valueToLabel = {};
  question.options.forEach(option => {
    if (option.value !== undefined && option.label) {
      valueToLabel[String(option.value)] = option.label;
    }
  });
  
  // For a single value
  if (!Array.isArray(values)) {
    return valueToLabel[String(values)] || values;
  }
  
  // For an array of values
  return values.map(value => valueToLabel[String(value)] || value);
};


  // Improved helper to strictly get option label from a question
  const getOptionLabelStrict = (question, value) => {
    // Make sure options exist and are properly formatted
    if (!question.options) return value;
    
    // Ensure options is an array
    let options = question.options;
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch (e) {
        console.error('Failed to parse options:', e);
        return value;
      }
    }
    
    // Now find the matching option
    const option = options.find(opt => String(opt.value) === String(value));
    return option ? option.label : value;
  };
  
  // Helper function to format raw answer values
  const formatRawAnswer = (answer) => {
    if (answer === null || answer === undefined) return '';
    
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    
    if (typeof answer === 'object') {
      try {
        return JSON.stringify(answer);
      } catch (e) {
        return '[Complex Object]';
      }
    }
    
    return String(answer);
  };
  
// Format the display of an answer based on question type
const formatAnswer = (questionId, answer) => {
  // Handle null/undefined
  if (answer === null || answer === undefined) {
    return '';
  }
  
  // Try to parse if it's a JSON string
  let parsedAnswer = answer;
  if (typeof answer === 'string') {
    // If it looks like a JSON array or object
    if ((answer.startsWith('[') && answer.endsWith(']')) || 
        (answer.startsWith('{') && answer.endsWith('}'))) {
      try {
        parsedAnswer = JSON.parse(answer);
      } catch (e) {
        // Not valid JSON, use as is
      }
    }
  }
  
  // Find the corresponding question
  const question = questions.find(q => q.id === questionId);
  
  // For existing data that still has numeric values
  // Check if the answer looks like option values (numbers or array of numbers)
  const isNumericValue = 
    (typeof parsedAnswer === 'number') || 
    (typeof parsedAnswer === 'string' && /^\d+$/.test(parsedAnswer)) ||
    (Array.isArray(parsedAnswer) && parsedAnswer.every(v => 
      (typeof v === 'number') || (typeof v === 'string' && /^\d+$/.test(v))
    ));
  
  if (question && isNumericValue) {
    // Convert values to labels
    const labels = convertValuesToLabels(question, parsedAnswer);
    
    // Format as string for display
    if (Array.isArray(labels)) {
      return labels.join(', ');
    } else {
      return String(labels);
    }
  }
  
  // Handle arrays (whether parsed from JSON or original)
  if (Array.isArray(parsedAnswer)) {
    return parsedAnswer.join(', ');
  }
  
  // Handle objects (usually complex answer data)
  if (typeof parsedAnswer === 'object') {
    try {
      return JSON.stringify(parsedAnswer);
    } catch (e) {
      return '[Complex Object]';
    }
  }
  
  // Default: return as string
  return String(parsedAnswer);
};

// Helper function to format values safely
const formatValue = (value) => {
  if (value === null || value === undefined) return '';
  
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '[Complex Object]';
    }
  }
  
  return String(value);
};

// Add this helper function to format P11 responses specifically
const formatP11Response = (answer) => {
  // Check if it's a P11 response string (has our format with attribute IDs)
  if (typeof answer === 'string' && answer.includes(':') && answer.includes('|')) {
    try {
      // Split by attribute
      const attributePairs = answer.split('|');
      
      // Map of attribute IDs to readable names
      const attributeNames = {
        'a': 'เหมาะสำหรับคนทุกเพศทุกวัย (Suitable for everyone)',
        'b': 'มีภาพลักษณ์ที่เท่ (Cool brand)',
        'c': 'มีราคาที่จับต้องได้ (Affordable price)',
        'd': 'มีสาขาเยอะ / ร้านหาง่าย (High availability)',
        'e': 'มีผลิตภัณฑ์ให้เลือกหลากหลาย (Have variety of products)',
        'f': 'มีขนาดให้เลือกหลากหลาย (Have various sizes)',
        'g': 'มีสีสันให้เลือกหลากหลาย (Have various color)',
        'h': 'เหมาะสมกับวัยรุ่น (Suitable for teenagers)',
        'i': 'มีภาพลักษณ์ที่สร้างสรรค์ (Creative brand)',
        'j': 'มีการจัดวางร้านค้าที่น่าดึงดูด (Attractive store layout)',
        'k': 'มีแฟชั่นที่ทันสมัย (Fashionable brand)',
        'l': 'ผลิตภัณฑ์มีคุณภาพสูง (High quality products)'
      };

      // Map of brand IDs to names (based on your data)
      const brandNames = {
        '1': 'แม็ค ยีนส์ (Mc Jeans)',
        '2': 'ลีไวส์ (Levi\'s)',
        '3': 'แรงเลอร์ (Wrangler)',
        '4': 'ลี คูปเปอร์ (Lee Cooper)',
        '5': 'จี คิว (GQ)',
        '6': 'เบฟเวอรี่ ฮิล โปโล คลับ (Beverly Hill Polo club)',
        '7': 'ลาคอสท์ (Lacoste)'
      };
      
      return (
        <div className="p11-response-table">
          <table>
            <thead>
              <tr>
                <th>Attribute</th>
                <th>Selected Brands</th>
              </tr>
            </thead>
            <tbody>
              {attributePairs.map(pair => {
                const [attrKey, brandsList] = pair.split(':');
                const attrName = attributeNames[attrKey] || `Attribute ${attrKey}`;
                const brandIDs = brandsList.split(',');
                const brandLabels = brandIDs.map(id => brandNames[id] || `Brand ${id}`).join(', ');
                
                return (
                  <tr key={attrKey}>
                    <td>{attrName}</td>
                    <td>{brandLabels}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    } catch (error) {
      console.error('Error parsing P11 response:', error);
      return answer; // Return original if parsing fails
    }
  }
  
  // Return original for non-P11 responses
  return answer;
};

  if (loading) {
    return <div className="admin-loading">Loading responses...</div>;
  }

  if (error) {
    return (
      <div className="admin-error-container">
        <div className="admin-error">{error}</div>
        <button onClick={() => window.location.reload()} className="admin-retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Survey Responses</h1>
        <div className="admin-user-info">
          <button onClick={handleBackToQuestions} className="admin-nav-button">
            Back to Questions
          </button>
          <span>Logged in as: {currentUser?.first_name || 'admin'} (Administrator)</span>
          <button onClick={handleLogout} className="admin-logout-button">
            Logout
          </button>
        </div>
      </header>
      
      <div className="admin-content">
        {responses.length === 0 ? (
          <div className="admin-empty-state">
            <h2>No responses yet</h2>
            <p>Survey responses will appear here once users start submitting them.</p>
          </div>
        ) : (
          <div className="admin-responses-grid">
            <div className="admin-responses-list">
              <h2>Responses ({responses.length})</h2>
              <div className="admin-responses-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((response) => (
                      <tr 
                        key={response.id} 
                        className={selectedResponse?.id === response.id ? 'active' : ''}
                        onClick={() => setSelectedResponse(response)}
                      >
                        <td>{response.id}</td>
                        <td>
                          {response.timestamp ? new Date(response.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td>
                          <button 
                            className="admin-view-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedResponse(response);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="admin-response-detail">
              {selectedResponse ? (
                <>
                  <h2>Response Details</h2>
                  <div className="admin-response-card">
                    <h3>ID: {selectedResponse.id}</h3>
                    
                    {selectedResponse.timestamp && (
                      <div className="admin-response-timestamp">
                        Submitted: {new Date(selectedResponse.timestamp).toLocaleString()}
                      </div>
                    )}
                    
                    <div className="admin-response-answers">
                      <h4>Answers</h4>
                      <table className="admin-answers-table">
                        <thead>
                          <tr>
                            <th>Question</th>
                            <th>Answer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Update the "enhanced format" mapping */}
                          {selectedResponse.answers_with_labels && Object.entries(selectedResponse.answers_with_labels).map(([questionId, answer]) => (
                            <tr key={questionId}>
                              <td>{getQuestionText(questionId)}</td>
                              <td>
                                {questionId === 'P11' 
                                  ? formatP11Response(answer) 
                                  : formatAnswer(questionId, answer)}
                              </td>
                            </tr>
                          ))}

                          {/* Update the old format fallback mapping */}
                          {!selectedResponse.answers_with_labels && selectedResponse.answers && Object.entries(selectedResponse.answers).map(([questionId, answer]) => (
                            <tr key={questionId}>
                              <td>{getQuestionText(questionId)}</td>
                              <td>
                                {questionId === 'P11' 
                                  ? formatP11Response(answer) 
                                  : formatAnswer(questionId, answer)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="admin-empty-state">
                  <p>Select a response to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResponsesView;