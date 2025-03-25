// src/services/pipeLogicService.js
/**
 * Helper service to handle complex question piping logic
 */

// Define question ID prefixes for easier identification
const QUESTION_IDS = {
  BRAND_AWARENESS: 'P1',
  EVER_USED: 'P2',
  CURRENT_USE: 'P3',
  MOST_USED: 'P4',
  FUTURE_CONSIDER: 'P5',
  CONSIDERATION_SET: 'P6', // Virtual question - not displayed
  ASPIRING_BRAND: 'P7',
  MC_JEANS_PERCEPTION: 'P8a',
  OTHER_BRANDS_PERCEPTION: 'P8', // P8b, P8c, etc.
  COMPARISON_MADE: 'P9a',
  COMPARED_BRANDS: 'P9b',
  COMPARISON_FACTORS: 'P9c',
  PURCHASE_REASON: 'P10',
  BRAND_ATTRIBUTES: 'P11',
  MEDIA_EXPOSURE: 'P12a',
  INFLUENTIAL_MEDIA: 'P12b',
};

// Store randomly selected brands for P11 to ensure consistency
let selectedP11Brands = null;

let lastP3P5Key = "";

// Store selected brands for P8b-P8d to ensure consistency
let selectedP8Brands = null;

// Flag to track if dynamic P8 questions have been created
let p8QuestionsCreated = false;

/**
* Apply piping logic to questions based on current answers
* @param {Array} questions - Original questions array
* @param {Object} answers - Current user answers
* @return {Array} - Modified questions with piped options and logic
*/
export const applyPipingLogic = (questions, answers) => {
// Make a deep copy of questions to avoid modifying the original
const processedQuestions = JSON.parse(JSON.stringify(questions));

// Find the P1 question (brand awareness) to use as a reference
const brandOptions = questions.find(q => q.id === QUESTION_IDS.BRAND_AWARENESS)?.options || [];

// Find McJeans option to exclude it from P8b-d selections
const mcJeansOption = brandOptions.find(option => option.label.includes("แม็ค ยีนส์") || option.value === "1");
const mcJeansValue = mcJeansOption ? mcJeansOption.value : "1"; // Default to "1" if not found

console.log(`Identified McJeans with value ${mcJeansValue} to exclude from P8b-d selections`);

// Create a union of P3 and P5 answers for P6
const p3Answers = answers[QUESTION_IDS.CURRENT_USE] || [];
const p5Answers = answers[QUESTION_IDS.FUTURE_CONSIDER] || [];
const p6Values = [...new Set([...p3Answers, ...p5Answers])];

const p3P5Key = JSON.stringify(p3Answers) + JSON.stringify(p5Answers);
  if (p3P5Key !== lastP3P5Key) {
    console.log("P3 or P5 answers changed, resetting P8 brands");
    selectedP8Brands = null;
    lastP3P5Key = p3P5Key;
  }

// For debugging, check all questions with ID P8b, P8c, P8d
const p8Questions = processedQuestions.filter(q => ['P8b', 'P8c', 'P8d'].includes(q.id));
console.log(`Initial P8 questions: ${p8Questions.map(q => `${q.id}: "${q.questionText}"`).join(', ')}`);

// Ensure we have at least 3 brands for P8 questions even if not enough from P6
// This makes sure we always have brands for P8b, P8c, and P8d
if (!selectedP8Brands) {
  // IMPORTANT: Filter out McJeans from the brand pool since it's already used in P8a
  let brandPool = p6Values.filter(value => value !== mcJeansValue);
  console.log(`Filtered P6 values to exclude McJeans: ${brandPool.join(', ')}`);
  
  // If we don't have at least 3 brands from P6, supplement with brands from P1
  if (brandPool.length < 3) {
    const additionalBrands = brandOptions
      .filter(opt => !brandPool.includes(opt.value) && opt.value !== mcJeansValue)
      .map(opt => opt.value);
    
    brandPool = [...brandPool, ...additionalBrands].slice(0, 3);
    console.log(`Supplemented brand pool to ensure 3 brands (excluding McJeans): ${brandPool.join(', ')}`);
  }
  
  // Shuffle the brand pool and take up to 3
  const shuffledBrands = shuffleArray(brandPool).slice(0, 3);
  
  // Map to full brand objects
  selectedP8Brands = shuffledBrands.map(value => {
    const brand = brandOptions.find(opt => opt.value === value);
    return brand || { value, label: `Brand ${value}` }; // Fallback
  });
  
  console.log(`Selected brands for P8b-d questions (excluding McJeans): ${selectedP8Brands.map(b => b.label).join(', ')}`);
}

// Randomize 4 brands for P11 once if not already done
if (!selectedP11Brands && p6Values.length > 0) {
  selectedP11Brands = preSelectP11Brands(p6Values, brandOptions);
  console.log(`Pre-selected brands for P11: ${selectedP11Brands.map(b => b.label).join(', ')}`);
}

// Process dynamic P8 questions if needed - placing them right after P8a
// Only process them if they haven't been created yet
const updatedQuestions = p8QuestionsCreated 
  ? processedQuestions 
  : processDynamicPerceptionQuestions(processedQuestions, answers, brandOptions);

// Process existing P8b-P8d questions to ensure brand names are correctly displayed
const finalQuestions = updateDynamicP8Questions(updatedQuestions, selectedP8Brands);

// Normal processing for other questions
return applyRegularPiping(finalQuestions, answers, brandOptions);
};

/**
* Apply regular piping logic to all questions
*/
function applyRegularPiping(questions, answers, brandOptions) {
// Create processing functions with access to questions array
const processingFunctions = createProcessingFunctions(questions, answers, brandOptions);

// Process each question if needed
for (let i = 0; i < questions.length; i++) {
  const question = questions[i];
  const processor = processingFunctions[question.id];
  
  // Skip processing for P8b, P8c, P8d to avoid changing them
  if (processor && !(question.id.startsWith(QUESTION_IDS.OTHER_BRANDS_PERCEPTION) && 
                    question.id !== QUESTION_IDS.MC_JEANS_PERCEPTION)) {
    questions[i] = processor(question);
  }
}

return questions;
}

/**
* Pre-select brands for P11 to ensure consistent display
* @param {Array} p6Values - Values from P6
* @param {Array} brandOptions - All brand options
* @return {Array} - Selected brands including Mc Jeans
*/
function preSelectP11Brands(p6Values, brandOptions) {
// Find Mc Jeans option
const mcJeansOption = brandOptions.find(option => option.label.includes("แม็ค ยีนส์") || option.value === "1");

// Filter other brands from P6
const otherOptions = brandOptions.filter(option => 
  p6Values.includes(option.value) && 
  (!mcJeansOption || option.value !== mcJeansOption.value)
);

// Randomly select up to 4 brands
const randomizedOptions = shuffleArray(otherOptions).slice(0, 4);

// Ensure Mc Jeans is included if available
if (mcJeansOption) {
  return [mcJeansOption, ...randomizedOptions];
} else {
  return randomizedOptions;
}
}

/**
* Create processing functions for each question type
*/
function createProcessingFunctions(questions, answers, brandOptions) {
return {
  // P2: Options from P1 answers
  [QUESTION_IDS.EVER_USED]: (question) => {
    if (answers[QUESTION_IDS.BRAND_AWARENESS] && Array.isArray(answers[QUESTION_IDS.BRAND_AWARENESS])) {
      question.options = brandOptions.filter(option => 
        answers[QUESTION_IDS.BRAND_AWARENESS].includes(option.value)
      );
      console.log(`P2: Piped ${question.options.length} options from P1 answers`);
    }
    return question;
  },
  
  // P3: Options from P2 answers
  [QUESTION_IDS.CURRENT_USE]: (question) => {
    if (answers[QUESTION_IDS.EVER_USED] && Array.isArray(answers[QUESTION_IDS.EVER_USED])) {
      question.options = brandOptions.filter(option => 
        answers[QUESTION_IDS.EVER_USED].includes(option.value)
      );
      console.log(`P3: Piped ${question.options.length} options from P2 answers`);
    }
    return question;
  },
  
  // P4: Options from P3 answers
  [QUESTION_IDS.MOST_USED]: (question) => {
    if (answers[QUESTION_IDS.CURRENT_USE] && Array.isArray(answers[QUESTION_IDS.CURRENT_USE])) {
      question.options = brandOptions.filter(option => 
        answers[QUESTION_IDS.CURRENT_USE].includes(option.value)
      );
      console.log(`P4: Piped ${question.options.length} options from P3 answers`);
    }
    return question;
  },
  
  // P5: Options from P1 EXCLUDING P3 answers (P1 - P3)
  [QUESTION_IDS.FUTURE_CONSIDER]: (question) => {
    if (answers[QUESTION_IDS.BRAND_AWARENESS] && Array.isArray(answers[QUESTION_IDS.BRAND_AWARENESS])) {
      const p3Answers = answers[QUESTION_IDS.CURRENT_USE] || [];
      
      question.options = brandOptions.filter(option => 
        answers[QUESTION_IDS.BRAND_AWARENESS].includes(option.value) && 
        !p3Answers.includes(option.value)
      );
      console.log(`P5: Piped ${question.options.length} options from P1 excluding P3`);
    }
    return question;
  },
  
  // P7: Options from P6 (P3 + P5 combined set)
  [QUESTION_IDS.ASPIRING_BRAND]: (question) => {
    // Create a union of P3 and P5 answers
    const p3Answers = answers[QUESTION_IDS.CURRENT_USE] || [];
    const p5Answers = answers[QUESTION_IDS.FUTURE_CONSIDER] || [];
    const p6Values = [...new Set([...p3Answers, ...p5Answers])];
    
    if (p6Values.length > 0) {
      question.options = brandOptions.filter(option => 
        p6Values.includes(option.value)
      );
      console.log(`P7: Piped ${question.options.length} options from P6 (P3+P5)`);
    }
    return question;
  },
  
  // P9b: Options from P6 (P3 + P5 combined set)
  [QUESTION_IDS.COMPARED_BRANDS]: (question) => {
    console.log(`Processing P9b. P9a answer: ${answers[QUESTION_IDS.COMPARISON_MADE]}`);
    
    // Create a union of P3 and P5 answers
    const p3Answers = answers[QUESTION_IDS.CURRENT_USE] || [];
    const p5Answers = answers[QUESTION_IDS.FUTURE_CONSIDER] || [];
    const p6Values = [...new Set([...p3Answers, ...p5Answers])];
    
    console.log(`P6 values for P9b: ${JSON.stringify(p6Values)}`);
    
    if (p6Values.length > 0) {
      // Find McJeans value (usually "1")
      const mcJeansOption = brandOptions.find(option => 
        option.label.includes("แม็ค ยีนส์") || option.value === "1"
      );
      const mcJeansValue = mcJeansOption ? mcJeansOption.value : "1";
      
      // Filter out McJeans and filter by P6 values
      question.options = brandOptions.filter(option => 
        p6Values.includes(option.value) && option.value !== mcJeansValue
      );
      
      console.log(`P9b: Filtered to ${question.options.length} options from P6 (excluding Mc Jeans)`);
    } else {
      console.log("No P6 values available for P9b");
    }
    
    return question;
  },
  
  // P11: Use pre-selected brands (Mc Jeans + 4 random brands from P6)
  [QUESTION_IDS.BRAND_ATTRIBUTES]: (question) => {
    if (selectedP11Brands && selectedP11Brands.length > 0) {
      // Use the pre-selected brands
      question.options = selectedP11Brands;
      console.log(`P11: Using ${question.options.length} pre-selected brands`);
    } else {
      // Fallback logic if pre-selection didn't happen
      const p3Answers = answers[QUESTION_IDS.CURRENT_USE] || [];
      const p5Answers = answers[QUESTION_IDS.FUTURE_CONSIDER] || [];
      const p6Values = [...new Set([...p3Answers, ...p5Answers])];
      
      if (p6Values.length > 0) {
        selectedP11Brands = preSelectP11Brands(p6Values, brandOptions);
        question.options = selectedP11Brands;
        console.log(`P11: Fallback selection of ${question.options.length} brands`);
      }
    }
    return question;
  },
  
  // P12b: Options from P12a answers
  [QUESTION_IDS.INFLUENTIAL_MEDIA]: (question) => {
    console.log(`Processing P12b. P12a answers: ${JSON.stringify(answers[QUESTION_IDS.MEDIA_EXPOSURE])}`);
    
    if (answers[QUESTION_IDS.MEDIA_EXPOSURE] && Array.isArray(answers[QUESTION_IDS.MEDIA_EXPOSURE])) {
      // Find P12a question to get its options
      const p12aQuestion = questions.find(q => q.id === QUESTION_IDS.MEDIA_EXPOSURE);
      
      if (p12aQuestion && p12aQuestion.options) {
        // Filter options to only include those selected in P12a
        question.options = p12aQuestion.options.filter(option => 
          answers[QUESTION_IDS.MEDIA_EXPOSURE].includes(option.value)
        );
        console.log(`P12b: Filtered to ${question.options.length} options from P12a answers`);
      } else {
        console.log("P12a question not found or has no options");
      }
    } else {
      console.log("No answers for P12a available");
    }
    
    return question;
  }
};
}

/**
* Update existing P8b-P8d questions to ensure brand names are properly displayed
* instead of showing placeholders like [Brand 1] or Brand X
* @param {Array} questions - Questions array to update
* @param {Array} selectedBrands - Selected brands for P8 questions
* @return {Array} - Updated questions array
*/
function updateDynamicP8Questions(questions, selectedBrands) {
// If we don't have selected brands yet, return unchanged questions
if (!selectedBrands || selectedBrands.length === 0) {
  console.log("No selected brands available for P8 questions");
  return questions;
}

console.log(`Selected brands for P8 questions: ${selectedBrands.map(b => b.label).join(', ')}`);

return questions.map(question => {
  // Log all P8-related questions for debugging
  if (question.id.includes('P8')) {
    console.log(`Found question ${question.id} with text "${question.questionText}"`);
  }
  
  // Process P8b, P8c, P8d questions specifically - checking exact IDs
  if (question.id === 'P8b' || question.id === 'P8c' || question.id === 'P8d') {
    // Determine index based on the letter (b=0, c=1, d=2)
    const letterCode = question.id.charAt(2);
    const index = letterCode.charCodeAt(0) - 'b'.charCodeAt(0);
    
    console.log(`Processing ${question.id}, index ${index}`);
    
    // Safety check to ensure we have enough brands
    if (index >= 0 && index < selectedBrands.length) {
      const brand = selectedBrands[index];
      // Always update with actual brand name
      const brandName = brand.label;
      
      // Update the question text regardless of its current content
      question.questionText = `What comes into your mind when you think of ${brandName}?`;
      question.questionSubtext = `เมื่อนึก ${brandName} คุณนึกถึงอะไรบ้าง? (เช่น ภาพลักษณ์ยี่ห้อ, คุณภาพสินค้า, การออกแบบ ฯลฯ)`;
      console.log(`Updated ${question.id} with brand name: ${brandName}`);
    } else {
      console.log(`No brand available for ${question.id} at index ${index}`);
    }
  }
  return question;
});
}

/**
* Process P8b-P8d (dynamic questions based on P6) and place them right after P8a
* @param {Array} questions - Questions array to modify
* @param {Object} answers - Current answers
* @param {Array} brandOptions - Brand options from P1
* @return {Array} - Updated questions array
*/
function processDynamicPerceptionQuestions(questions, answers, brandOptions) {
// Log all P8 questions at the beginning
const p8Questions = questions.filter(q => q.id.includes('P8'));
console.log(`Found ${p8Questions.length} P8 questions: ${p8Questions.map(q => q.id).join(', ')}`);

// If we've already created P8 questions, don't recreate them
if (p8QuestionsCreated) {
  console.log("P8 questions already created, skipping recreation");
  return questions;
}

// Check if any P8b, P8c, P8d questions already exist - using exact IDs
const existingP8Questions = questions.filter(q => 
  q.id === 'P8b' || q.id === 'P8c' || q.id === 'P8d'
);

if (existingP8Questions.length > 0) {
  console.log(`Found ${existingP8Questions.length} existing P8 questions: ${existingP8Questions.map(q => q.id).join(', ')}`);
  p8QuestionsCreated = true;
  return questions;
}

// Create a union of P3 and P5 answers
const p3Answers = answers[QUESTION_IDS.CURRENT_USE] || [];
const p5Answers = answers[QUESTION_IDS.FUTURE_CONSIDER] || [];
const p6Values = [...new Set([...p3Answers, ...p5Answers])];

console.log(`P6 values for dynamic P8 questions: ${JSON.stringify(p6Values)}`);

if (p6Values.length === 0) return questions;

// Remove all existing P8b+ questions (just in case)
const filteredQuestions = questions.filter(q => 
  !q.id.startsWith(QUESTION_IDS.OTHER_BRANDS_PERCEPTION) || 
  q.id === QUESTION_IDS.MC_JEANS_PERCEPTION
);

// Find the P8a question to use as a template
const p8aIndex = filteredQuestions.findIndex(q => q.id === QUESTION_IDS.MC_JEANS_PERCEPTION);
if (p8aIndex === -1) {
  console.log("P8a question not found!");
  return questions;
}

const p8BaseQuestion = filteredQuestions[p8aIndex];

// If we already have selected brands, use them. Otherwise, select them now
if (!selectedP8Brands) {
  // Find McJeans option to exclude it
  const mcJeansOption = brandOptions.find(option => 
    option.label.includes("แม็ค ยีนส์") || option.value === "1"
  );
  const mcJeansValue = mcJeansOption ? mcJeansOption.value : "1"; // Default to "1" if not found
  
  console.log(`Found McJeans with value ${mcJeansValue} to exclude from P8b-d`);
  
  // FIXING THE ISSUE - More careful selection from P6 values
  // Only use brands from P6 that are NOT McJeans
  const p6BrandsExcludingMcJeans = p6Values.filter(value => value !== mcJeansValue);
  console.log(`P6 values (from P3+P5): ${JSON.stringify(p6Values)}`);
  console.log(`Filtered P6 values (excluding McJeans): ${JSON.stringify(p6BrandsExcludingMcJeans)}`);
  
  // Create a shuffled copy
  const shuffledP6Brands = shuffleArray([...p6BrandsExcludingMcJeans]);
  console.log(`Shuffled P6 brands: ${JSON.stringify(shuffledP6Brands)}`);
  
  // If we don't have enough brands from P6, supplement with other brands from brandOptions
  let selectedBrandValues = shuffledP6Brands;
  
  if (selectedBrandValues.length < 3) {
    console.log("Not enough brands from P6, adding supplemental brands");
    
    // Get all brand values except McJeans that aren't already in our selection
    const supplementalBrands = brandOptions
      .filter(opt => 
        opt.value !== mcJeansValue && 
        !selectedBrandValues.includes(opt.value)
      )
      .map(opt => opt.value);
    
    console.log(`Potential supplemental brands: ${JSON.stringify(supplementalBrands)}`);
    
    // Shuffle supplemental brands and add as many as needed
    const shuffledSupplemental = shuffleArray(supplementalBrands);
    const neededCount = 3 - selectedBrandValues.length;
    
    selectedBrandValues = [
      ...selectedBrandValues,
      ...shuffledSupplemental.slice(0, neededCount)
    ];
  }
  
  // Take only up to 3 values
  selectedBrandValues = selectedBrandValues.slice(0, 3);
  console.log(`Final selected brand values: ${JSON.stringify(selectedBrandValues)}`);
  
  // Convert values to full brand objects
  selectedP8Brands = selectedBrandValues.map(value => {
    const brand = brandOptions.find(opt => opt.value === value);
    return brand || { value, label: `Brand ${value}` }; // Fallback if brand not found
  });
  
  console.log(`Selected ${selectedP8Brands.length} brands for P8 questions: ${JSON.stringify(selectedP8Brands.map(b => b.label))}`);
}

// Create new P8 questions
const newP8Questions = [];

// For each selected brand, create a P8 question
selectedP8Brands.forEach((brand, index) => {
  const brandName = brand.label;
  console.log(`Creating dynamic question for brand: ${brandName}`);
  
  // Create question ID (P8b, P8c, etc.)
  const suffix = String.fromCharCode(98 + index); // 98 = 'b', 99 = 'c', etc.
  const questionId = `${QUESTION_IDS.OTHER_BRANDS_PERCEPTION}${suffix}`;
  
  // Create new question based on P8a
  const newQuestion = {
    ...JSON.parse(JSON.stringify(p8BaseQuestion)),
    id: questionId,
    questionText: `What comes into your mind when you think of ${brandName}?`,
    questionSubtext: `เมื่อนึก ${brandName} คุณนึกถึงอะไรบ้าง? (เช่น ภาพลักษณ์ยี่ห้อ, คุณภาพสินค้า, การออกแบบ ฯลฯ)`
  };
  
  // Add the new question to our array
  newP8Questions.push(newQuestion);
});

// Insert the new P8 questions right after P8a
filteredQuestions.splice(p8aIndex + 1, 0, ...newP8Questions);

console.log(`Created and positioned ${newP8Questions.length} dynamic P8 questions right after P8a`);

// Set flag to indicate P8 questions have been created
p8QuestionsCreated = true;

return filteredQuestions;
}

/**
* Fisher-Yates shuffle algorithm to randomize array elements
* @param {Array} array - Array to shuffle
* @return {Array} - Shuffled array
*/
function shuffleArray(array) {
const newArray = [...array];
for (let i = newArray.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
}
return newArray;
}

// Function to reset piping logic state (useful for testing or restarting the survey)
export const resetPipingLogicState = () => {
selectedP11Brands = null;
selectedP8Brands = null;
p8QuestionsCreated = false;
console.log("Piping logic state has been reset");
};

// Default export
export default {
applyPipingLogic,
resetPipingLogicState
};