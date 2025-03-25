// src/App.js - Updated with authentication
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import questionService from './services/questionService';
import pipeLogicService from './services/pipeLogicService';
import VoiceRecorder from './components/VoiceRecorder';
import Login from './components/Login';
import UserInfo from './components/UserInfo';
import AttributeQuestionnaire from './components/AttributeBrandMatcher';
import './components/AttributeBrandMatcher.css';
import './App.css';

function App() {
  const { isAuthenticated, getSurveyData, loading: authLoading } = useAuth();
  const [p11StatementsCompleted, setP11StatementsCompleted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [originalQuestions, setOriginalQuestions] = useState([]);
  const [questionMap, setQuestionMap] = useState({});
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const p11VisitedRef = useRef(false);

  const debugQuestionFlow = () => {
    if (!questions.length) return;
    
    console.log("==== QUESTION FLOW DEBUG ====");
    const userData = getSurveyData();
    console.log(`User status: ${userData?.userStatus}`);
    
    activeQuestionIndices.forEach(index => {
      const q = questions[index];
      console.log(`${index}. ${q.id}: ${q.questionText.substring(0, 40)}...`);
    });
    console.log("=============================");
  };
  // Keep track of the available questions based on logic rules
  const [activeQuestionIndices, setActiveQuestionIndices] = useState([]);

  useEffect(() => {
    console.log("P11 completion state changed:", p11StatementsCompleted);
  }, [p11StatementsCompleted]);

  useEffect(() => {
    if (activeQuestionIndices.length > 0 && questions.length > 0) {
      debugQuestionFlow();
    }
  }, [activeQuestionIndices, questions]);

  useEffect(() => {
    // Only reset when first navigating to P11, not on every render
    const isP11Question = questions[currentQuestionIndex]?.id === 'P11';
    
    if (isP11Question && !p11VisitedRef.current) {
      setP11StatementsCompleted(false);
      p11VisitedRef.current = true;
    } else if (!isP11Question) {
      // Reset the ref when leaving P11 question
      p11VisitedRef.current = false;
    }
  }, [currentQuestionIndex, questions]);

  // Fetch questions from the API
  useEffect(() => {
    // Only fetch questions if authenticated
    if (!isAuthenticated || authLoading) return;
    
    const userData = getSurveyData();
    console.log('UserData:', userData);
    
    // Better admin detection
    const isAdmin = userData?.role === 'admin' || 
                   userData?.username === 'admin' ||
                   (userData?.first_name === 'Admin' && userData?.last_name === 'User');
    
    if (isAdmin) {
      console.log('Admin user detected, redirecting to dashboard');
      window.location.href = '/#/admin';
      return;
    }

    const fetchQuestions = async () => {
      try {
        setLoading(true);
        
        // Get questions from the shared service
        const data = await questionService.getQuestions();
        
        // Keep a copy of original questions for reference
        setOriginalQuestions(data);
        
        // Create a map of question IDs to their index for easier logic rule processing
        const qMap = {};
        data.forEach((q, index) => {
          qMap[q.id] = index;
        });
        
        console.log("Fetched questions:", data);
        data.forEach(q => {
          if (q.questionType === 'MA') {
            console.log(`Question ${q.id} - minSelections: ${q.minSelections}, maxSelections: ${q.maxSelections}`);
          }
        });

        setQuestions(data);
        setQuestionMap(qMap);
        
        // Initialize answers with pre-populated data from user profile
        const surveyData = getSurveyData();
        const initialAnswers = {};

        data.forEach(question => {
          // Default initialization
          initialAnswers[question.id] = question.questionType === 'MA' ? [] : '';
          
          // NOTE: We don't pre-populate D1 as user needs to select their income range
        // We only use the location data behind the scenes for logic branching
          
        // We can pre-populate the P8a question with contextual hint if needed, but not the answer
        if (surveyData && surveyData.latestPurchase && question.id === 'P8a') {
          // Instead of pre-populating, we can modify the question subtext to give context
          // But we leave the actual answer field empty for user input
          initialAnswers[question.id] = '';
        }
        });
        
        setAnswers(initialAnswers);
        
        // Initialize active questions - only the first question is active at start
        if (data.length > 0) {
          setActiveQuestionIndices([0]);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load survey questions. Please try again later.');
        setLoading(false);
        console.error('Error loading questions:', err);
      }
    };

    fetchQuestions();
  }, [isAuthenticated, authLoading, getSurveyData]);

  // This effect recalculates active questions whenever answers change
  // Including special location-based logic for D1
  useEffect(() => {
    if (questions.length === 0) return;

    const calculateActiveQuestions = () => {
  // Start with just the first question active
  const activatedQuestions = [0];
  
  // Track which questions will be shown through normal sequence
  const sequentialFlow = new Set([0]); // First question is in normal flow
  
  // Track which questions will be shown due to logic jumps
  const logicTriggeredQuestions = new Set();
  
  // Get user location data for custom logic
  const userData = getSurveyData();
  const isUserFromBangkok = userData && (
    userData.province === 'Bangkok' || 
    ['Nakhon Pathom', 'Pathum Thani', 'Nonthaburi', 'Samut Prakan', 'Samut Sakhon'].includes(userData.province)
  );
  
  // Get user status for lapser vs user flow
  const userStatus = userData?.userStatus || "No Purchase";
  
  console.log("🔍 ROUTING LOGIC - User status:", userStatus);
  
  // FIRST: Find all relevant question indices
  const questionIndices = {};
  ['P8d', 'P9a', 'P9b', 'P9c', 'P9d', 'P9e', 'P10', 'P11'].forEach(id => {
    questionIndices[id] = questionMap[id];
    console.log(`Question ${id} is at index ${questionIndices[id]}`);
  });
  
  // Process normal question flow first (P1 to P8d)
  // This builds the basic sequential flow
  for (let i = 0; i < Math.min(questionIndices.P8d || questions.length, questions.length); i++) {
    if (i + 1 < questions.length) {
      sequentialFlow.add(i + 1);
    }
  }
  
  // LAPSER SPECIFIC ROUTING: Handle based on user status
  if (userStatus === "Lapser") {
    console.log("🔄 APPLYING LAPSER FLOW LOGIC");
    
    // REMOVE P9a-c and P10
    ['P9a', 'P9b', 'P9c', 'P10'].forEach(id => {
      if (questionIndices[id] !== undefined) {
        sequentialFlow.delete(questionIndices[id]);
        console.log(`Removed ${id} from flow for Lapser`);
      }
    });
    
    // ADD P9d and P9e to flow
    ['P9d', 'P9e'].forEach(id => {
      if (questionIndices[id] !== undefined) {
        sequentialFlow.add(questionIndices[id]);
        console.log(`Added ${id} to flow for Lapser`);
      }
    });
    
    // Ensure P9d follows P8d
    if (questionIndices.P8d !== undefined && questionIndices.P9d !== undefined) {
      console.log("Setting up P8d → P9d jump for Lapser");
      // We could use logic rules here if needed
    }
    
    // Make P9e jump to P11
    if (questionIndices.P9e !== undefined && questionIndices.P11 !== undefined) {
      console.log("Setting up P9e → P11 jump for Lapser");
      // We add P11 but P10 is already removed
      sequentialFlow.add(questionIndices.P11);
    }
  } else {
    console.log("🔄 APPLYING NORMAL USER FLOW LOGIC");
    
    // REMOVE P9d and P9e
    ['P9d', 'P9e'].forEach(id => {
      if (questionIndices[id] !== undefined) {
        sequentialFlow.delete(questionIndices[id]);
        console.log(`Removed ${id} from flow for normal User`);
      }
    });
    
    // KEEP P9a-c and P10 in flow (they should be there by default)
  }
  
  // Special logic for D1 based on location and answer
  for (let i = 0; i < questions.length; i++) {
    // Only process questions that are in the normal flow or triggered by logic
    if (!sequentialFlow.has(i) && !logicTriggeredQuestions.has(i)) continue;
    
    const currentQuestion = questions[i];
    const currentAnswer = answers[currentQuestion.id];
    
    if (currentQuestion.id === 'D1' && currentAnswer) {
      // If user from Bangkok AND selects options 1 or 2, jump to END
      if (isUserFromBangkok && (currentAnswer === '1' || currentAnswer === '2')) {
        if (questionMap.hasOwnProperty('END')) {
          console.log(`Special logic: Bangkok user with low income (${currentAnswer}), jumping to END`);
          const endIndex = questionMap['END'];
          logicTriggeredQuestions.add(endIndex);
          
          // Skip standard logic for this question
          continue;
        }
      }
      // If user from outside Bangkok AND selects option 1, jump to END
      else if (!isUserFromBangkok && currentAnswer === '1') {
        if (questionMap.hasOwnProperty('END')) {
          console.log(`Special logic: Non-Bangkok user with very low income (${currentAnswer}), jumping to END`);
          const endIndex = questionMap['END'];
          logicTriggeredQuestions.add(endIndex);
          
          // Skip standard logic for this question
          continue;
        }
      }
    }
    
    // Process regular logic rules if they exist
    if (currentQuestion.logic && currentQuestion.logic.length > 0) {
      let anyRuleMatched = false;
      
      for (const rule of currentQuestion.logic) {
        let conditionMet = false;
        
        // Check if the condition is met (with string conversion for consistency)
        if (rule.condition === 'equals' && String(currentAnswer) === String(rule.value)) {
          conditionMet = true;
        } else if (rule.condition === 'not_equals' && String(currentAnswer) !== String(rule.value)) {
          conditionMet = true;
        } else if (rule.condition === 'contains' && 
                  Array.isArray(currentAnswer) && 
                  currentAnswer.some(item => String(item) === String(rule.value))) {
          conditionMet = true;
        }
        
        // If condition is met, add the jump-to question to active questions
        if (conditionMet && rule.jumpToQuestion && questionMap.hasOwnProperty(rule.jumpToQuestion)) {
          const jumpToIndex = questionMap[rule.jumpToQuestion];
          logicTriggeredQuestions.add(jumpToIndex);
          anyRuleMatched = true;
          
          console.log(`Logic match for ${currentQuestion.id}: answer=${currentAnswer}, rule=${rule.condition}:${rule.value}, jumping to ${rule.jumpToQuestion} (index ${jumpToIndex})`);
        }
      }
      
      // Only add the next question to sequential flow if no logic rules matched
      if (!anyRuleMatched && i + 1 < questions.length) {
        sequentialFlow.add(i + 1);
      }
    } 
    // If no logic rules, add next question to sequential flow
    else if (i + 1 < questions.length) {
      sequentialFlow.add(i + 1);
    }
  }
  
  // Second pass: Check which questions should be excluded
  // Questions with logic rules pointing to them should ONLY appear if triggered by logic
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    // Check if this question is the target of any logic rule
    const isLogicTarget = questions.some(q => 
      q.logic && q.logic.some(rule => rule.jumpToQuestion === question.id)
    );
    
    // If it's a logic target and not triggered by logic, remove from sequential flow
    if (isLogicTarget && !logicTriggeredQuestions.has(i)) {
      sequentialFlow.delete(i);
      console.log(`Excluding ${question.id} from sequential flow - it's a logic target but no logic rule matched`);
    }
  }
  
  const endIndex = questions.findIndex(q => q.id === 'END');
  if (endIndex !== -1) {
    const isEndInFlow = sequentialFlow.has(endIndex) || logicTriggeredQuestions.has(endIndex);
    
    // Debug to see what's happening
    console.log(`END check: index=${endIndex}, inFlow=${isEndInFlow}`);
    
    // Check if user should qualify based on D1 answer
    const d1Answer = answers['D1'];
    if (d1Answer) {
      const shouldTerminate = 
        (isUserFromBangkok && (d1Answer === '1' || d1Answer === '2')) || 
        (!isUserFromBangkok && d1Answer === '1');
      
      console.log(`Qualification check: D1=${d1Answer}, Bangkok=${isUserFromBangkok}, shouldTerminate=${shouldTerminate}`);
      
      // If user qualifies (shouldn't be terminated) but END is in flow, remove it
      if (!shouldTerminate && isEndInFlow) {
        console.log('User qualifies - removing END question from flow');
        sequentialFlow.delete(endIndex);
        logicTriggeredQuestions.delete(endIndex);
      }
    }
  }

  // Combine all active questions
  const allActiveQuestions = [...sequentialFlow, ...logicTriggeredQuestions];
  
  // Convert to array, sort, and return
  return [...new Set(allActiveQuestions)].sort((a, b) => a - b);
};

    const activeQuestions = calculateActiveQuestions();
    setActiveQuestionIndices(activeQuestions);
    
    // Log for debugging
    console.log('Active question indices:', activeQuestions);
    
  }, [answers, questions, questionMap, getSurveyData]);

  // Apply piping logic when answers change, incorporating user data from auth
  useEffect(() => {
    if (originalQuestions.length > 0 && Object.keys(answers).length > 0) {
      console.log("Processing piped questions based on current answers");
      
      // Get user data to customize questions
      const userData = getSurveyData();
      
      // Make a deep copy of original questions for modification
      let questionsToProcess = JSON.parse(JSON.stringify(originalQuestions));
      
      // Customize P9a question with purchase details if available
      if (userData && userData.latestPurchase) {
        const purchase = userData.latestPurchase;
        const purchaseDate = new Date(purchase.purchaseDate);
        const formattedDate = purchaseDate.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Find and update the P9a question text
        const p9aIndex = questionsToProcess.findIndex(q => q.id === 'P9a');
        if (p9aIndex !== -1) {
          // Replace placeholders in question text
          const originalText = questionsToProcess[p9aIndex].questionText;
          const originalSubtext = questionsToProcess[p9aIndex].questionSubtext;
          
          // Update with purchase details
          questionsToProcess[p9aIndex].questionText = originalText.replace('most recent purchase', 
            `purchase of ${purchase.productType} on ${formattedDate}`);
          
          // Update subtext if needed
          if (originalSubtext && purchase.brand === 'Mc Jeans') {
            questionsToProcess[p9aIndex].questionSubtext = originalSubtext.replace('ร้านแม๊ค ยีนส์ ครั้งล่าสุด', 
              `ร้านแม๊ค ยีนส์ ครั้งล่าสุดเมื่อ ${formattedDate}`);
          }
        }
      }
      
      // Apply the piping logic from our service
      const processedQuestions = pipeLogicService.applyPipingLogic(questionsToProcess, answers);
      
      // Update the questions state with the piped questions
      setQuestions(processedQuestions);
    }
  }, [answers, originalQuestions, getSurveyData]);

  const handleAnswer = (questionId, value, isMultipleChoice, audioURL = null) => {
    setAnswers(prevAnswers => {
      if (isMultipleChoice) {
        // Handle multiple choice answers (unchanged)
        const currentAnswers = [...(prevAnswers[questionId] || [])];
        const index = currentAnswers.indexOf(value);
        
        if (index === -1) {
          const question = questions.find(q => q.id === questionId);
          const maxAllowed = question.maxSelections || 0;
          
          if (maxAllowed > 0 && currentAnswers.length >= maxAllowed) {
            alert(`You can select at most ${maxAllowed} options for this question.`);
            return prevAnswers; // Return unchanged
          }
          currentAnswers.push(value);
        } else {
          currentAnswers.splice(index, 1);
        }
        
        return { ...prevAnswers, [questionId]: currentAnswers };
      } else {
        // Handle single choice and OE answers, now with audio URL
        const updatedAnswers = { ...prevAnswers, [questionId]: value };
        
        if (value !== undefined && value !== null) {
          console.log(`Setting answer for ${questionId}: "${value}"`);
          updatedAnswers[questionId] = value;
        }

        // Store audio URL if provided
        if (audioURL) {
          updatedAnswers[`${questionId}_audio`] = audioURL;
        }
        
        return updatedAnswers;
      }
    });
  };

  // Find the next question to display based on logic rules
  const findNextQuestionIndex = () => {
    // Get all active question indices greater than the current index
    const nextIndices = activeQuestionIndices.filter(index => index > currentQuestionIndex);
    
    // If there are future active questions, go to the next one
    if (nextIndices.length > 0) {
      console.log(`Moving to next active question at index ${nextIndices[0]}`);
      return nextIndices[0];
    }
    
    // If at the end of all questions, return the current index to trigger submission
    return currentQuestionIndex;
  };

  // Find the previous question to display based on active questions
  const findPreviousQuestionIndex = () => {
    // Get all active question indices less than the current index
    const prevIndices = activeQuestionIndices.filter(index => index < currentQuestionIndex);
    
    // If there are previous active questions, go to the most recent one
    if (prevIndices.length > 0) {
      console.log(`Moving to previous active question at index ${prevIndices[prevIndices.length - 1]}`);
      return prevIndices[prevIndices.length - 1];
    }
    
    // If at the beginning, stay there
    return currentQuestionIndex;
  };

  const handleNext = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion.id];
    
    // Validate required questions
    if (currentQuestion.isRequired !== false) {
      if (currentQuestion.id === 'P11') {
        // If p11StatementsCompleted is true, we already know all attributes have selections
        if (!p11StatementsCompleted) {
          alert('Please complete all attribute statements before proceeding.');
          return;
        }
        
        // Skip all other validation for P11 since statements completed flag is true
      }
      // Normal validation for MA questions
      else if (currentQuestion.questionType === 'MA') {
        // Default to 3 if not specified in the question
        const minRequired = currentQuestion.minSelections !== undefined ? 
          currentQuestion.minSelections : 3;
        
        if (!currentAnswer || !Array.isArray(currentAnswer)) {
          alert('Please select at least one option.');
          return;
        }
        
        // Check if the minimum number of selections is met
        if (minRequired > 0 && currentAnswer.length < minRequired) {
          alert(`Please select at least ${minRequired} options for this question. You've selected ${currentAnswer.length}.`);
          return;
        }
  
        // Check if maximum selections is exceeded
        const maxAllowed = currentQuestion.maxSelections || 0;
        if (maxAllowed > 0 && currentAnswer.length > maxAllowed) {
          alert(`You can select at most ${maxAllowed} options for this question. You've selected ${currentAnswer.length}.`);
          return;
        }
      }

      else if (currentQuestion.questionType === 'OE') {
        const answer = answers[currentQuestion.id];

        const audioURL = answers[`${currentQuestion.id}_audio`];
  
        // Consider it answered if either text or audio is provided
        if ((answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '')) 
            && !audioURL) {
          alert('This question is required. Please record an audio response.');
          return;
        }
        console.log(`OE question ${currentQuestion.id} validated with answer: "${answer}" or audio: ${audioURL}`);
        
      }

      // Normal validation for other question types
      else if (
        (currentQuestion.questionType === 'SA' && !currentAnswer) 
      ) {
        alert('This question is required. Please provide an answer.');
        return;
      }
    }
    
    // Find the next active question index
    const nextIndex = findNextQuestionIndex();
    
    // If we have a next question, go to it
    if (nextIndex > currentQuestionIndex) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      // If at the end of all questions, submit
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    const prevIndex = findPreviousQuestionIndex();
    setCurrentQuestionIndex(prevIndex);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Create a copy of the answers with values converted to labels
      const labelAnswers = {};
      
      // Create a separate object to store audio URLs that won't be sent directly
      const audioURLsCollection = {};
      
      // Process each answer to convert values to labels
      for (const questionId in answers) {
        // Skip audio URLs, we'll handle them separately
        if (questionId.endsWith('_audio')) {
          // Store them in a separate collection but don't include in labelAnswers
          const relatedQuestionId = questionId.replace('_audio', '');
          audioURLsCollection[relatedQuestionId] = answers[questionId];
          continue;
        }
        
        // Skip P11 for now, we'll handle it specially
        if (questionId === 'P11') continue;
    
        const question = questions.find(q => q.id === questionId);
        if (!question) {
          labelAnswers[questionId] = answers[questionId];
          continue;
        }
        
        // For multiple-choice questions
        if (question.questionType === 'MA' && Array.isArray(answers[questionId])) {
          const answerLabels = answers[questionId].map(value => {
            // Find the matching option to get its label
            const option = question.options?.find(opt => String(opt.value) === String(value));
            return option ? option.label : value;
          });
          labelAnswers[questionId] = answerLabels;
        }
        // For single-choice questions
        else if (question.questionType === 'SA' && question.options) {
          const value = answers[questionId];
          const option = question.options.find(opt => String(opt.value) === String(value));
          labelAnswers[questionId] = option ? option.label : value;
        }
        // For open-ended questions or any other type
        else {
          labelAnswers[questionId] = answers[questionId];
        }
      }
      
      // Special handling for P11 - combine all attributes into a single JSON string
      if (answers.P11) {
        // Create a string representation of the P11 data
        // Format: "a:1,5,6|b:3,1|c:6,3" etc.
        const p11Parts = [];
        
        Object.keys(answers.P11).forEach(attrKey => {
          const brandValues = answers.P11[attrKey];
          if (Array.isArray(brandValues) && brandValues.length > 0) {
            p11Parts.push(`${attrKey}:${brandValues.join(',')}`);
          }
        });
        
        // Join all parts with a separator
        const p11Combined = p11Parts.join('|');
        
        // Add to labelAnswers as a single P11 answer
        labelAnswers['P11'] = p11Combined;
      }
      
      console.log('Original answers:', answers);
      console.log('Label answers for submission:', labelAnswers);
      console.log('Audio URLs (for reference only):', audioURLsCollection);
      
      // Submit only the labelAnswers, not including the audioURLs as a separate question
      await questionService.submitSurvey(labelAnswers);
      
      setIsCompleted(true);
    } catch (err) {
      setError('Failed to submit survey. Please try again.');
      console.error('Error submitting survey:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    // Reset the survey
    setCurrentQuestionIndex(0);
    
    // Reset answers
    const initialAnswers = {};
    questions.forEach(question => {
      initialAnswers[question.id] = question.questionType === 'MA' ? [] : '';
    });
    setAnswers(initialAnswers);
    
    // Reset active questions to only the first question
    setActiveQuestionIndices([0]);
    
    setIsCompleted(false);
  };
  
  // Handle login success
  const handleLoginSuccess = () => {
    // Reset state to ensure fresh data after login
    setQuestions([]);
    setOriginalQuestions([]);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setActiveQuestionIndices([]);
    setLoading(true);
    setError(null);
  };

  // If still checking authentication status
  if (authLoading) {
    return <div className="loading">Initializing survey...</div>;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Normal loading state
  if (loading) {
    return <div className="loading">Loading survey...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="btn btn-primary retry-btn"
        >
          Retry
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="loading">No questions available.</div>;
  }

  if (isCompleted) {
    return (
      <div className="survey-container completion">
        <h1>Thank you for completing the survey!</h1>
        <p>Your responses have been recorded.</p>
        <button onClick={handleReset} className="btn btn-primary">
          Take the survey again
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isMultipleChoice = currentQuestion.questionType === 'MA';
  const currentAnswer = answers[currentQuestion.id];
  const activeQuestionsCount = activeQuestionIndices.length;
  const currentActiveIndex = activeQuestionIndices.indexOf(currentQuestionIndex);

  // Add this function before the return statement
  const renderP11Attributes = () => {
  
    // Define all the attribute statements
    const attributeStatements = [
      { id: 'a', text: 'เหมาะสำหรับคนทุกเพศทุกวัย' }, // Suitable for everyone
      { id: 'b', text: 'มีภาพลักษณ์ที่เท่' }, // Cool brand
      { id: 'c', text: 'มีราคาที่จับต้องได้' }, // Affordable price
      { id: 'd', text: 'มีสาขาเยอะ / ร้านหาง่าย' }, // High availability
      { id: 'e', text: 'มีผลิตภัณฑ์ให้เลือกหลากหลาย' }, // Have variety of products
      { id: 'f', text: 'มีขนาดให้เลือกหลากหลาย' }, // Have various sizes
      { id: 'g', text: 'มีสีสันให้เลือกหลากหลาย' }, // Have various color
      { id: 'h', text: 'เหมาะสมกับวัยรุ่น' }, // Suitable for teenagers
      { id: 'i', text: 'มีภาพลักษณ์ที่สร้างสรรค์' }, // Creative brand
      { id: 'j', text: 'มีการจัดวางร้านค้าที่น่าดึงดูด' }, // Attractive store layout
      { id: 'k', text: 'มีแฟชั่นที่ทันสมัย' }, // Fashionable brand
      { id: 'l', text: 'ผลิตภัณฑ์มีคุณภาพสูง' } // High quality products
    ];
    
    // Define McJeans brand
    const mcJeansBrand = {
      value: '1',
      label: 'แม็ค ยีนส์ (Mc Jeans)'
    };
    
    // Get P6 brands (combined from P3 and P5 answers)
    const p3Answers = answers['P3'] || [];
    const p5Answers = answers['P5'] || [];
    const p6Values = [...new Set([...p3Answers, ...p5Answers])];
    
    // Find brand details from P1 options
    const p1Question = questions.find(q => q.id === 'P1');
    const p6Brands = p6Values.map(value => {
      const option = p1Question?.options?.find(opt => opt.value === value);
      return option || { value, label: `Brand ${value}` };
    });
    
    // Filter out McJeans from the P6 brands (since it will be added separately)
    const otherP6Brands = p6Brands.filter(brand => brand.value !== mcJeansBrand.value);
    
    // Extract existing P11 answers from the current answers state, if any
    // We'll use this to initialize the AttributeQuestionnaire
    const existingP11Answers = {};
    
    // Look for any keys in the answers object that might contain P11 attribute data
    Object.keys(answers).forEach(key => {
      // Check if this is a P11 attribute answer
      if (key === 'P11' && typeof answers[key] === 'object') {
        // If we have structured P11 data already, use it
        Object.keys(answers[key]).forEach(attrKey => {
          existingP11Answers[attrKey] = answers[key][attrKey];
        });
      }
    });

    // Handle completion of the attribute questionnaire
    const handleAttributesComplete = (allSelections) => {
      console.log('P11 statements completed!', allSelections);
      // Instead of creating separate entries for P11a, P11b, etc.,
      // we'll store all attribute selections under the main P11 question
      setAnswers(prevAnswers => ({
        ...prevAnswers,
        // Store as a single P11 answer with all attribute selections
        'P11': allSelections
      }));
      
      // Move to the next question
      setP11StatementsCompleted(true);
    };

    console.log('P11 completion state:', p11StatementsCompleted);
    
    return (
      <AttributeQuestionnaire
        attributes={attributeStatements}
        mcJeansBrand={mcJeansBrand}
        pipelineBrands={otherP6Brands}
        onComplete={handleAttributesComplete}
        initialSelections={existingP11Answers} // Pass any existing P11 answers
      />
    );
  };

  return (
    <div className="survey-container">
      {/* Add UserInfo component here */}
      <UserInfo />
      <div className="progress-bar">
        <div 
          className="progress" 
          style={{ width: `${((currentActiveIndex + 1) / activeQuestionsCount) * 100}%` }}
        ></div>
      </div>
      
      <h1>Survey</h1>
      <p className="question-count">
        Question {currentActiveIndex + 1} of {activeQuestionsCount}
      </p>

      <div className="question-container">
        <h2>{currentQuestion.questionText}</h2>
        {currentQuestion.questionSubtext && (
          <p className="subtext">{currentQuestion.questionSubtext}</p>
        )}

        {currentQuestion.id === 'P11' && (
          <div className="p11-question-container">
            {renderP11Attributes()}
          </div>
        )}

        {(currentQuestion.questionType === 'SA' || currentQuestion.questionType === 'MA')  && currentQuestion.id !== 'P11' && (
          <div className="options-container">
            {currentQuestion.questionType === 'MA' && currentQuestion.minSelections > 0 && (
              <div className="selection-requirements">
                {currentQuestion.minSelections > 0 && (
                  <p>Please select at least {currentQuestion.minSelections} options.</p>
                )}
                {currentQuestion.maxSelections > 0 && (
                  <p>You can select at most {currentQuestion.maxSelections} options.</p>
                )}
                <p className={
                  (currentAnswer && 
                  (currentQuestion.minSelections === 0 || currentAnswer.length >= currentQuestion.minSelections) &&
                  (currentQuestion.maxSelections === 0 || currentAnswer.length <= currentQuestion.maxSelections)) 
                    ? "requirement-met" 
                    : "requirement-not-met"
                }>
                  Selected: {currentAnswer ? currentAnswer.length : 0} 
                  {currentQuestion.minSelections > 0 && ` / ${currentQuestion.minSelections} minimum`}
                  {currentQuestion.maxSelections > 0 && ` (max: ${currentQuestion.maxSelections})`}
                </p>
              </div>
            )}
            {currentQuestion.options && currentQuestion.options.map(option => (
              <div key={option.value} className="option">
                <label>
                  <input
                    type={isMultipleChoice ? 'checkbox' : 'radio'}
                    name={`question-${currentQuestion.id}`}
                    value={option.value}
                    checked={
                      isMultipleChoice
                        ? currentAnswer?.includes(option.value)
                        : currentAnswer === option.value
                    }
                    onChange={() => handleAnswer(currentQuestion.id, option.value, isMultipleChoice)}
                  />
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        )}

        {currentQuestion.questionType === 'OE' && (
          <VoiceRecorder
            key={currentQuestion.id}
            questionId={currentQuestion.id}
            initialTranscript={currentAnswer || ''}
            initialAudio={answers[`${currentQuestion.id}_audio`]}
            onTranscriptionComplete={(text, audioURL) => handleAnswer(currentQuestion.id, text, false, audioURL)}
            showTranscription={false}
            language="th-TH"
          />
        )}
      </div>

      <div className="button-container">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="btn btn-secondary"
        >
          Previous
        </button>
        
        <button 
          onClick={handleNext}
          disabled={
            (isSubmitting || (currentQuestion.id === 'P11' && !p11StatementsCompleted)) 
              ? (console.log('Next button disabled:', {
                  isSubmitting, 
                  isP11: currentQuestion.id === 'P11', 
                  p11Completed: p11StatementsCompleted
                }), true) 
              : false
          }
          className="btn btn-primary"
        >
        {currentActiveIndex < activeQuestionsCount - 1 ? 'Next' : (isSubmitting ? 'Submitting...' : 'Submit')}
      </button>
      </div>
    </div>
  );
}

export default App;