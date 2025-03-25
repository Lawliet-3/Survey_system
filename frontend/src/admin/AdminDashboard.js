// src/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import questionService from '../services/questionService';
import './AdminStyles.css';
import authService from '../services/authService';

function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form state for editing or adding questions
  const [formData, setFormData] = useState({
    id: '',
    questionType: 'SA',
    questionText: '',
    questionSubtext: '',
    options: [],
    logic: [],
    isRequired: true
  });

  // Fetch questions from the service
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await questionService.getQuestions();
      setQuestions(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch questions. Please try again.');
      setLoading(false);
      console.error('Error fetching questions:', err);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    // Check if user is logged in
    if (!authService.isAuthenticated() || !authService.isAdmin()) {
      console.log('Not authenticated as admin, redirecting to main login');
      navigate('/');
      return;
    }
    
    fetchQuestions();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/'); // Redirect to main login instead of admin login
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSelect = (question) => {
    setSelectedQuestion(question);
    setFormData({
      id: question.id,
      questionType: question.questionType,
      questionText: question.questionText,
      questionSubtext: question.questionSubtext || '',
      options: question.options || [],
      logic: question.logic || [],
      isRequired: question.isRequired !== false
    });
    setIsEditing(false);
    setIsAddingQuestion(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleAddQuestion = () => {
    setSelectedQuestion(null);
    setFormData({
      id: generateQuestionId(),
      questionType: 'SA',
      questionText: '',
      questionSubtext: '',
      options: [{ value: '1', label: 'Option 1' }],
      logic: [],
      isRequired: true
    });
    setIsAddingQuestion(true);
    setIsEditing(true);
  };

  const generateQuestionId = () => {
    // Simple ID generation
    return `Q${Date.now().toString().substring(9)}_${Math.floor(Math.random() * 1000)}`;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRequiredChange = (e) => {
    setFormData(prev => ({
      ...prev,
      isRequired: e.target.checked
    }));
  };

  const handleOptionChange = (index, field, value) => {
    const updatedOptions = [...formData.options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      options: updatedOptions
    }));
  };

  const addOption = () => {
    const newValue = (formData.options.length + 1).toString();
    setFormData(prev => ({
      ...prev,
      options: [
        ...prev.options,
        { value: newValue, label: `Option ${newValue}` }
      ]
    }));
  };

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleLogicChange = (index, field, value) => {
    const updatedLogic = [...formData.logic];
    updatedLogic[index] = {
      ...updatedLogic[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      logic: updatedLogic
    }));
  };

  const addLogicRule = () => {
    setFormData(prev => ({
      ...prev,
      logic: [
        ...prev.logic,
        { condition: 'equals', value: '', jumpToQuestion: '' }
      ]
    }));
  };

  const removeLogicRule = (index) => {
    setFormData(prev => ({
      ...prev,
      logic: prev.logic.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    // Validate form
    if (!formData.questionText.trim()) {
      alert('Question text is required');
      return;
    }

    if (['SA', 'MA'].includes(formData.questionType) && formData.options.length < 1) {
      alert('Add at least one option for this question type');
      return;
    }

    try {
      setSaveLoading(true);
      
      if (isAddingQuestion) {
        // Create new question using the service
        await questionService.createQuestion(formData);
      } else {
        // Update existing question using the service
        await questionService.updateQuestion(formData.id, formData);
      }
      
      // Refresh questions list
      await fetchQuestions();
      
      // Find the saved question in the updated list
      const updatedQuestions = await questionService.getQuestions();
      const updatedQuestion = updatedQuestions.find(q => q.id === formData.id);
      
      if (updatedQuestion) {
        setSelectedQuestion(updatedQuestion);
      }
      
      // Reset states
      setIsEditing(false);
      setIsAddingQuestion(false);
      setSaveLoading(false);
      
    } catch (err) {
      setSaveLoading(false);
      setError(`Failed to save question: ${err.message}`);
      alert('Failed to save question. Please try again.');
    }
  };

  const handleCancel = () => {
    if (isAddingQuestion) {
      setIsAddingQuestion(false);
      setSelectedQuestion(null);
    } else {
      setFormData({
        id: selectedQuestion.id,
        questionType: selectedQuestion.questionType,
        questionText: selectedQuestion.questionText,
        questionSubtext: selectedQuestion.questionSubtext || '',
        options: selectedQuestion.options || [],
        logic: selectedQuestion.logic || [],
        isRequired: selectedQuestion.isRequired !== false
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!selectedQuestion) return;
    
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }
    
    try {
      // Delete question using the service
      await questionService.deleteQuestion(selectedQuestion.id);
      
      // Refresh questions list
      await fetchQuestions();
      setSelectedQuestion(null);
    } catch (err) {
      setError(`Failed to delete question: ${err.message}`);
      alert('Failed to delete question. Please try again.');
    }
  };
  
  const handleMoveUp = async (index) => {
    if (index === 0) return;
    
    const updatedQuestions = [...questions];
    const temp = updatedQuestions[index];
    updatedQuestions[index] = updatedQuestions[index - 1];
    updatedQuestions[index - 1] = temp;
    
    try {
      // Update question order using the service
      await questionService.updateQuestionOrder(updatedQuestions);
      
      // Refresh questions
      setQuestions(updatedQuestions);
    } catch (err) {
      setError('Failed to reorder questions');
      console.error('Error reordering questions:', err);
    }
  };
  
  const handleMoveDown = async (index) => {
    if (index === questions.length - 1) return;
    
    const updatedQuestions = [...questions];
    const temp = updatedQuestions[index];
    updatedQuestions[index] = updatedQuestions[index + 1];
    updatedQuestions[index + 1] = temp;
    
    try {
      // Update question order using the service
      await questionService.updateQuestionOrder(updatedQuestions);
      
      // Refresh questions
      setQuestions(updatedQuestions);
    } catch (err) {
      setError('Failed to reorder questions');
      console.error('Error reordering questions:', err);
    }
  };

  const handleViewResponses = () => {
    navigate('/admin/responses');
  };

  // Helper function to render P11 form when editing
  const renderP11Form = () => {
    // We'll treat the options array as our attributes list
    // Each option will have a value (a,b,c,d...) and label (attribute text)
    
    // The P11 attributes that should be included
    const expectedAttributes = [
      { id: 'a', defaultText: 'เหมาะสำหรับคนทุกเพศทุกวัย (Suitable for everyone)' },
      { id: 'b', defaultText: 'มีภาพลักษณ์ที่เท่ (Cool brand)' },
      { id: 'c', defaultText: 'มีราคาที่จับต้องได้ (Affordable price)' },
      { id: 'd', defaultText: 'มีสาขาเยอะ / ร้านหาง่าย (High availability)' },
      { id: 'e', defaultText: 'มีผลิตภัณฑ์ให้เลือกหลากหลาย (Have variety of products)' },
      { id: 'f', defaultText: 'มีขนาดให้เลือกหลากหลาย (Have various sizes)' },
      { id: 'g', defaultText: 'มีสีสันให้เลือกหลากหลาย (Have various color)' },
      { id: 'h', defaultText: 'เหมาะสมกับวัยรุ่น (Suitable for teenagers)' },
      { id: 'i', defaultText: 'มีภาพลักษณ์ที่สร้างสรรค์ (Creative brand)' },
      { id: 'j', defaultText: 'มีการจัดวางร้านค้าที่น่าดึงดูด (Attractive store layout)' },
      { id: 'k', defaultText: 'มีแฟชั่นที่ทันสมัย (Fashionable brand)' },
      { id: 'l', defaultText: 'ผลิตภัณฑ์มีคุณภาพสูง (High quality products)' }
    ];
    
    // Ensure all attributes exist in options
    const ensureAllAttributes = () => {
      const currentAttributes = [...formData.options];
      const updatedAttributes = [...currentAttributes];
      
      // Check if each expected attribute exists
      expectedAttributes.forEach(attr => {
        const existingAttrIndex = currentAttributes.findIndex(opt => opt.value === attr.id);
        
        if (existingAttrIndex === -1) {
          // Add missing attribute
          updatedAttributes.push({ value: attr.id, label: attr.defaultText });
        }
      });
      
      // Update form data if we added any attributes
      if (updatedAttributes.length !== currentAttributes.length) {
        setFormData({
          ...formData,
          options: updatedAttributes
        });
      }
      
      return updatedAttributes;
    };
    
    // Make sure all attributes exist
    const attributes = ensureAllAttributes();
    
    return (
      <div className="p11-editor">
        <div className="admin-form-group">
          <label>Question Text (Main Instruction):</label>
          <textarea 
            name="questionText" 
            value={formData.questionText} 
            onChange={handleFormChange}
            rows="2"
            className="admin-form-textarea"
          />
        </div>
        
        <div className="admin-form-group">
          <label>Subtext (Optional):</label>
          <textarea 
            name="questionSubtext" 
            value={formData.questionSubtext} 
            onChange={handleFormChange}
            rows="2"
            className="admin-form-textarea"
          />
        </div>
        
        <div className="admin-form-group checkbox">
          <input 
            type="checkbox" 
            id="isRequired" 
            checked={formData.isRequired} 
            onChange={handleRequiredChange} 
            className="admin-form-checkbox"
          />
          <label htmlFor="isRequired">Required</label>
        </div>
        
        <div className="admin-form-group">
          <label>Attribute Statements:</label>
          <p className="admin-form-help">
            These statements will be presented to users one at a time. For each statement, 
            users can select which brands match that attribute.
          </p>
          
          <div className="p11-attributes-list">
            {attributes
              .sort((a, b) => a.value.localeCompare(b.value)) // Sort by attribute ID
              .map((attr, index) => (
                <div key={attr.value} className="p11-attribute-item">
                  <div className="p11-attribute-id">{attr.value}:</div>
                  <input 
                    type="text" 
                    value={attr.label} 
                    onChange={(e) => {
                      const updatedOptions = [...formData.options];
                      const optionIndex = updatedOptions.findIndex(opt => opt.value === attr.value);
                      if (optionIndex !== -1) {
                        updatedOptions[optionIndex] = {
                          ...updatedOptions[optionIndex],
                          label: e.target.value
                        };
                        setFormData({
                          ...formData,
                          options: updatedOptions
                        });
                      }
                    }}
                    className="admin-form-input p11-attribute-text"
                    placeholder={`Enter attribute ${attr.value} text`}
                  />
                </div>
              ))}
          </div>
        </div>
        
        <div className="admin-form-actions">
          <button 
            onClick={handleCancel} 
            className="admin-cancel-button"
            disabled={saveLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="admin-save-button"
            disabled={saveLoading}
          >
            {saveLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  };

  // Helper function to render P11 details when not editing
  const renderP11Details = () => {
    return (
      <div className="admin-question-details">
        <div className="admin-detail-item">
          <span className="admin-detail-label">Question ID:</span>
          <span className="admin-detail-value">{selectedQuestion.id}</span>
        </div>
        
        <div className="admin-detail-item">
          <span className="admin-detail-label">Question Type:</span>
          <span className="admin-detail-value">Brand Attributes (P11)</span>
        </div>
        
        <div className="admin-detail-item">
          <span className="admin-detail-label">Question Text:</span>
          <div className="admin-detail-value">{selectedQuestion.questionText}</div>
        </div>
        
        {selectedQuestion.questionSubtext && (
          <div className="admin-detail-item">
            <span className="admin-detail-label">Subtext:</span>
            <div className="admin-detail-value">{selectedQuestion.questionSubtext}</div>
          </div>
        )}
        
        <div className="admin-detail-item">
          <span className="admin-detail-label">Required:</span>
          <span className="admin-detail-value">
            {selectedQuestion.isRequired !== false ? 'Yes' : 'No'}
          </span>
        </div>
        
        {selectedQuestion.options && (
          <div className="admin-detail-item">
            <span className="admin-detail-label">Attribute Statements:</span>
            <ul className="admin-detail-options p11-attributes-list">
              {selectedQuestion.options
                .sort((a, b) => a.value.localeCompare(b.value)) // Sort by attribute ID
                .map((attr, index) => (
                  <li key={index} className="p11-attribute-item-view">
                    <strong>{attr.value}:</strong> {attr.label}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="admin-loading">Loading questions...</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Survey Admin Dashboard</h1>
        <div className="admin-user-info">
          <button onClick={handleViewResponses} className="admin-nav-button">
            View Responses
          </button>
          <span>Logged in as: {currentUser?.first_name || 'admin'} (Administrator)</span>
          <button onClick={handleLogout} className="admin-logout-button">
            Logout
          </button>
        </div>
      </header>
      
      {error && (
        <div className="admin-error-banner">
          {error}
          <button onClick={() => setError(null)} className="admin-error-close">×</button>
        </div>
      )}
      
      <div className="admin-content">
        <div className="admin-questions-grid">
          <div className="admin-questions-list">
            <div className="admin-questions-list-header">
              <h2>Questions ({questions.length})</h2>
              <button onClick={handleAddQuestion} className="admin-add-button">
                + Add Question
              </button>
            </div>
            
            {questions.length === 0 ? (
              <div className="admin-empty-list">
                <p>No questions yet. Click "Add Question" to create your first survey question.</p>
              </div>
            ) : (
              <ul className="admin-question-items">
                {questions.map((question, index) => (
                  <li 
                    key={question.id} 
                    className={`admin-question-item ${selectedQuestion && selectedQuestion.id === question.id ? 'active' : ''}`}
                  >
                    <div 
                      className="admin-question-item-content"
                      onClick={() => handleSelect(question)}
                    >
                      <div className="admin-question-item-header">
                        <span className="admin-question-item-id">{question.id}</span>
                        <span className="admin-question-item-type">{question.questionType}</span>
                      </div>
                      <div className="admin-question-item-text">{question.questionText}</div>
                    </div>
                    
                    <div className="admin-question-item-actions">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveUp(index);
                        }}
                        disabled={index === 0}
                        className="admin-action-button up"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveDown(index);
                        }}
                        disabled={index === questions.length - 1}
                        className="admin-action-button down"
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="admin-question-editor">
            {!selectedQuestion && !isAddingQuestion ? (
              <div className="admin-empty-state">
                <p>Select a question to edit or add a new question</p>
              </div>
            ) : (
              <>
                <div className="admin-question-editor-header">
                  <h2>{isAddingQuestion ? 'Add New Question' : `Edit Question: ${selectedQuestion?.id}`}</h2>
                  {!isEditing && !isAddingQuestion && (
                    <div className="admin-editor-actions">
                      <button onClick={handleEdit} className="admin-edit-button">Edit</button>
                      <button onClick={handleDelete} className="admin-delete-button">Delete</button>
                    </div>
                  )}
                </div>
                
                {isEditing || isAddingQuestion ? (
                  <div className="admin-question-form">
                    {formData.id === 'P11' ? (
                      renderP11Form()
                    ) : (
                      <>
                        <div className="admin-form-group">
                          <label>Question ID:</label>
                          <input 
                            type="text" 
                            name="id" 
                            value={formData.id} 
                            onChange={handleFormChange} 
                            disabled={!isAddingQuestion}
                            className="admin-form-input"
                          />
                        </div>
                        {formData.questionType === 'MA' && (
                        <>
                          <div className="admin-form-group">
                            <label>Minimum Selections:</label>
                            <select
                              name="minSelections"
                              value={formData.minSelections || '0'}
                              onChange={handleFormChange}
                              className="admin-form-select"
                            >
                              <option value="0">No minimum</option>
                              <option value="1">1 option</option>
                              <option value="2">2 options</option>
                              <option value="3">3 options (default)</option>
                              <option value="4">4 options</option>
                              <option value="5">5 options</option>
                            </select>
                            <small className="form-text">
                              Number of options users must select at minimum for this question.
                            </small>
                          </div>
                          
                          <div className="admin-form-group">
                            <label>Maximum Selections:</label>
                            <select
                              name="maxSelections"
                              value={formData.maxSelections || '0'}
                              onChange={handleFormChange}
                              className="admin-form-select"
                            >
                              <option value="0">No maximum</option>
                              <option value="1">1 option</option>
                              <option value="2">2 options</option>
                              <option value="3">3 options</option>
                              <option value="4">4 options</option>
                              <option value="5">5 options</option>
                              <option value="10">10 options</option>
                            </select>
                            <small className="form-text">
                              Maximum number of options users can select (0 = unlimited).
                            </small>
                          </div>
                        </>
                      )}
                        <div className="admin-form-group">
                          <label>Question Type:</label>
                          <select 
                            name="questionType" 
                            value={formData.questionType} 
                            onChange={handleFormChange}
                            className="admin-form-select"
                          >
                            <option value="SA">Single Answer (SA)</option>
                            <option value="MA">Multiple Answer (MA)</option>
                            <option value="OE">Open Ended (OE)</option>
                          </select>
                        </div>
                        
                        <div className="admin-form-group">
                          <label>Question Text:</label>
                          <textarea 
                            name="questionText" 
                            value={formData.questionText} 
                            onChange={handleFormChange}
                            rows="2"
                            className="admin-form-textarea"
                          />
                        </div>
                        
                        <div className="admin-form-group">
                          <label>Subtext (Optional):</label>
                          <textarea 
                            name="questionSubtext" 
                            value={formData.questionSubtext} 
                            onChange={handleFormChange}
                            rows="2"
                            className="admin-form-textarea"
                          />
                        </div>
                        
                        <div className="admin-form-group checkbox">
                          <input 
                            type="checkbox" 
                            id="isRequired" 
                            checked={formData.isRequired} 
                            onChange={handleRequiredChange} 
                            className="admin-form-checkbox"
                          />
                          <label htmlFor="isRequired">Required</label>
                        </div>
                        
                        {['SA', 'MA'].includes(formData.questionType) && (
                          <div className="admin-form-group">
                            <label>Options:</label>
                            {formData.options.map((option, index) => (
                              <div key={index} className="admin-option-row">
                                <input 
                                  type="text" 
                                  placeholder="Value" 
                                  value={option.value} 
                                  onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                                  className="admin-option-value"
                                />
                                <input 
                                  type="text" 
                                  placeholder="Label" 
                                  value={option.label} 
                                  onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                                  className="admin-option-label"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => removeOption(index)}
                                  className="admin-remove-button"
                                  disabled={formData.options.length <= 1}
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button" 
                              onClick={addOption} 
                              className="admin-add-option-button"
                            >
                              + Add Option
                            </button>
                          </div>
                        )}
                        
                        <div className="admin-form-group">
                          <label>Logic Rules:</label>
                          {formData.logic.map((rule, index) => (
                            <div key={index} className="admin-logic-row">
                              <select
                                value={rule.condition}
                                onChange={(e) => handleLogicChange(index, 'condition', e.target.value)}
                                className="admin-logic-condition"
                              >
                                <option value="equals">Equals</option>
                                <option value="not_equals">Not Equals</option>
                                <option value="contains">Contains</option>
                              </select>
                              
                              <input
                                type="text"
                                placeholder="Value"
                                value={rule.value}
                                onChange={(e) => handleLogicChange(index, 'value', e.target.value)}
                                className="admin-logic-value"
                              />
                              
                              <select
                                value={rule.jumpToQuestion}
                                onChange={(e) => handleLogicChange(index, 'jumpToQuestion', e.target.value)}
                                className="admin-logic-jump"
                              >
                                <option value="">Select question to jump to...</option>
                                {questions
                                  .filter(q => q.id !== formData.id) // Filter out current question
                                  .map(q => (
                                    <option key={q.id} value={q.id}>
                                      {q.id}: {q.questionText.substring(0, 30)}
                                      {q.questionText.length > 30 ? '...' : ''}
                                    </option>
                                  ))
                                }
                              </select>
                              
                              <button
                                type="button"
                                onClick={() => removeLogicRule(index)}
                                className="admin-remove-button"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                          <button 
                            type="button" 
                            onClick={addLogicRule} 
                            className="admin-add-logic-button"
                          >
                            + Add Logic Rule
                          </button>
                        </div>
                        
                        <div className="admin-form-actions">
                          <button 
                            onClick={handleCancel} 
                            className="admin-cancel-button"
                            disabled={saveLoading}
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleSave} 
                            className="admin-save-button"
                            disabled={saveLoading}
                          >
                            {saveLoading ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {selectedQuestion.id === 'P11' ? (
                      renderP11Details()
                    ) : (
                      <div className="admin-question-details">
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">Question ID:</span>
                          <span className="admin-detail-value">{selectedQuestion.id}</span>
                        </div>
                        
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">Question Type:</span>
                          <span className="admin-detail-value">{selectedQuestion.questionType}</span>
                        </div>
                        
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">Question Text:</span>
                          <div className="admin-detail-value">{selectedQuestion.questionText}</div>
                        </div>
                        
                        {selectedQuestion.questionSubtext && (
                          <div className="admin-detail-item">
                            <span className="admin-detail-label">Subtext:</span>
                            <div className="admin-detail-value">{selectedQuestion.questionSubtext}</div>
                          </div>
                        )}
                        
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">Required:</span>
                          <span className="admin-detail-value">
                            {selectedQuestion.isRequired !== false ? 'Yes' : 'No'}
                          </span>
                        </div>
                        
                        {['SA', 'MA'].includes(selectedQuestion.questionType) && selectedQuestion.options && (
                          <div className="admin-detail-item">
                            <span className="admin-detail-label">Options:</span>
                            <ul className="admin-detail-options">
                              {selectedQuestion.options.map((option, index) => (
                                <li key={index}>
                                  <strong>{option.value}:</strong> {option.label}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {selectedQuestion.logic && selectedQuestion.logic.length > 0 && (
                          <div className="admin-detail-item">
                            <span className="admin-detail-label">Logic Rules:</span>
                            <ul className="admin-detail-logic">
                              {selectedQuestion.logic.map((rule, index) => {
                                // Find target question text
                                const targetQuestion = questions.find(q => q.id === rule.jumpToQuestion);
                                const targetText = targetQuestion 
                                  ? targetQuestion.questionText.substring(0, 30) + (targetQuestion.questionText.length > 30 ? '...' : '')
                                  : rule.jumpToQuestion;
                                  
                                return (
                                  <li key={index}>
                                    If answer <strong>{rule.condition}</strong> "{rule.value}", 
                                    jump to <strong>{targetText}</strong>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;