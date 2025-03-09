// setupQuestions.js
// Run this script to initialize the database and create all questions from the Mc Jean questionnaire
// Usage: node setupQuestions.js

// First, we need to set up the environment
require('dotenv').config(); // If you use environment variables
const axios = require('axios');

// API URL - adjust to match your FastAPI backend location
const API_URL = 'http://localhost:8000/api';

// Simple API client
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000
});

// Helper function to create a question
async function createQuestion(question) {
  try {
    console.log(`Creating question: ${question.id}`);
    const response = await apiClient.post('/admin/questions', question);
    console.log(`Question ${question.id} created successfully!`);
    return response.data;
  } catch (error) {
    console.error(`Error creating question ${question.id}:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Helper function to initialize the database
async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    const response = await apiClient.post('/admin/init_db');
    console.log('Database initialized successfully!');
    return response.data;
  } catch (error) {
    console.error('Error initializing database:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Main function to set up everything
async function setupQuestions() {
  try {
    // Step 1: Initialize the database
    await initializeDatabase();
    
    // Step 2: Create all questions one by one
    for (const question of questions) {
      await createQuestion(question);
    }
    
    console.log('All questions created successfully!');
  } catch (error) {
    console.error('Error setting up questions:', error.message);
  }
}

// Define all the questions from the Mc Jean questionnaire
const questions = [
  {
    id: "D1",
    questionType: "SA",
    questionText: "Please specify your monthly household income (Before tax)?",
    questionSubtext: "กรุณาระบุรายได้ครัวเรือนของครอบครัวคุณ (ก่อนหักภาษี) ของครอบครัวคุณค่ะ?",
    options: [
      {value: "1", label: "14,999 บาท หรือน้อยกว่า"},
      {value: "2", label: "15,000-19,999 บาท"},
      {value: "3", label: "20,000-29,999 บาท"},
      {value: "4", label: "30,000-39,999 บาท"},
      {value: "5", label: "40,000-49,999 บาท"},
      {value: "6", label: "50,000-59,999 บาท"},
      {value: "7", label: "60,000 บาท หรือมากกว่า"}
    ],
    logic: [],
    isRequired: true
  },
  {
    id: "D2a",
    questionType: "SA",
    questionText: "Please specify your marital status?",
    questionSubtext: "กรุณาระบุสถานภาพสมรสของคุณค่ะ?",
    options: [
      {value: "1", label: "โสด (Single)"},
      {value: "2", label: "สมรส (มีบุตร) (Married with kids)"},
      {value: "3", label: "สมรส (ไม่มีบุตร) (Married without kids)"},
      {value: "4", label: "ม่าย/ หย่าร้าง (มีบุตร) (Divorced / Widow with kids)"},
      {value: "5", label: "ม่าย/ หย่าร้าง (ไม่มีบุตร) (Divorced / Widow without kids)"}
    ],
    logic: [
      {
        condition: "equals",
        value: "2",
        jumpToQuestion: "D2b"
      },
      {
        condition: "equals",
        value: "4",
        jumpToQuestion: "D2b"
      }
    ],
    isRequired: true
  },
  {
    id: "D2b",
    questionType: "SA",
    questionText: "Do you make any purchase of apparels / clothing for your kid within the past 6 months?",
    questionSubtext: "คุณได้มีการซื้อเสื้อผ้าให้บุตรของคุณใน 6 เดือนที่ผ่านมาหรือไม่คะ?",
    options: [
      {value: "1", label: "ใช่ (Yes)"},
      {value: "2", label: "ไม่ใช่ (No)"}
    ],
    logic: [],
    isRequired: true
  },
  {
    id: "P1",
    questionType: "MA",
    questionText: "Which of the following brands have you heard of?",
    questionSubtext: "คุณรู้จักหรือเคยเห็นเสื้อผ้ายี่ห้อใดต่อไปนี้บ้าง?",
    options: [
      {value: "1", label: "แม็ค ยีนส์ (Mc Jeans)"},
      {value: "2", label: "ลีไวส์ (Levi's)"},
      {value: "3", label: "แรงเลอร์ (Wrangler)"},
      {value: "4", label: "ลี คูปเปอร์ (Lee Cooper)"},
      {value: "5", label: "จี คิว (GQ)"},
      {value: "6", label: "เบฟเวอรี่ ฮิล โปโล คลับ (Beverly Hill Polo club)"},
      {value: "7", label: "ลาคอสท์ (Lacoste)"},
      {value: "8", label: "คร็อคโคไดล์ (Crocodile)"},
      {value: "9", label: "อี เอส พี (ESP)"},
      {value: "10", label: "ยูนิโคล่ (Uniqlo)"},
      {value: "11", label: "มูจิ (Muji)"},
      {value: "12", label: "แจสพาล / แยสพาล (Jaspal)"},
      {value: "13", label: "ซีซี ดับเบิลโอ (CC OO)"},
      {value: "14", label: "เอ ทู แซด (AIIZ)"},
      {value: "15", label: "นิยม ยีนส์ (Niyom Jeans)"},
      {value: "16", label: "ปั๊มแก๊สโซลีน (Gasoline)"},
      {value: "17", label: "เอส แฟร์ (S'Fare)"},
      {value: "18", label: "แช็ปส์ (Chaps)"},
      {value: "19", label: "เอช แอนด์ เอ็ม (H&M)"},
      {value: "20", label: "เดวี่ โจนส์ (Davie Jones)"}
    ],
    logic: [],
    isRequired: true
  },
  {
    id: "P2",
    questionType: "MA",
    questionText: "Which of the following brands have you personally ever used?",
    questionSubtext: "จากยี่ห้อเสื้อผ้าที่คุณรู้จักหรือเคยเห็นที่คุณได้เลือกมา มีเสื้อผ้ายี่ห้อใดบ้างที่คุณเคยใช้?",
    options: [], // Will be populated dynamically from P1 answers
    logic: [],
    isRequired: true
  },
  {
    id: "P3",
    questionType: "MA",
    questionText: "Which of the following brands have you currently using or used in the last 3 months?",
    questionSubtext: "แล้วมีเสื้อผ้ายี่ห้อใดบ้างที่คุณใช้อยู่ในปัจจุบัน หรือ ใช้ใน 3 เดือนที่ผ่านมา?",
    options: [], // Will be populated dynamically from P2 answers
    logic: [],
    isRequired: true
  },
  {
    id: "P4",
    questionType: "SA",
    questionText: "Which of the following brands do you use most often?",
    questionSubtext: "แล้วมีเสื้อผ้ายี่ห้อ คือยี่ห้อที่คุณใช้เป็นหลัก?",
    options: [], // Will be populated dynamically from P3 answers
    logic: [],
    isRequired: true
  },
  {
    id: "P5",
    questionType: "MA",
    questionText: "Which of the following brands do you consider using in the near future?",
    questionSubtext: "จากยี่ห้อเสื้อผ้าต่อไปนี้ มียี่ห้อใดบ้างที่คุณคิดจะใช้ในอนาคต?",
    options: [], // Will be populated dynamically from P1 answers not in P3
    logic: [],
    isRequired: true
  },
  {
    id: "P7",
    questionType: "SA",
    questionText: "May I know what is/are your most aspiring brand for you?",
    questionSubtext: "จากยี่ห้อเสื้อผ้าต่อไปนี้ ยี่ห้อใดคือยี่ห้อที่คุณชื่นชอบที่สุด?",
    options: [], // Will be populated dynamically from P6 (P3 + P5)
    logic: [],
    isRequired: true
  },
  {
    id: "P8a",
    questionType: "OE",
    questionText: "What comes into your mind when you think of Mc Jeans?",
    questionSubtext: "เมื่อนึก แม็ค ยีนส์ คุณนึกถึงอะไรบ้าง? (เช่น ภาพลักษณ์ยี่ห้อ, คุณภาพสินค้า, การออกแบบ ฯลฯ)",
    options: [],
    logic: [],
    isRequired: true
  },
  {
    id: "P9a",
    questionType: "SA",
    questionText: "Before making your most recent purchase, did you make any brand comparisons before you made your decision to purchase?",
    questionSubtext: "ก่อนที่คุณจะซื้อเสื้อผ้า/เครื่องประดับที่ ร้านแม๊ค ยีนส์ ครั้งล่าสุด คุณได้เปรียบเทียบแม๊คยีนส์กับยี่ห้ออื่นหรือไม่?",
    options: [
      {value: "1", label: "มีการเปรียบเทียบยี่ห้อ (Yes)"},
      {value: "2", label: "ไม่มีการเปรียบเทียบยี่ห้อ (No)"}
    ],
    logic: [
      {
        condition: "equals",
        value: "2",
        jumpToQuestion: "P10"
      }
    ],
    isRequired: true
  },
  {
    id: "P9b",
    questionType: "MA",
    questionText: "Apart from Mc Jeans, what are the brands which you'd compared?",
    questionSubtext: "นอกเหนือจาก แม๊คยีนส์ คุณเปรียบเทียบยี่ห้ออื่นใดอีกบ้าง?",
    options: [
      {value: "1", label: "แม็ค ยีนส์ (Mc Jeans)"},
      {value: "2", label: "ลีไวส์ (Levi's)"},
      {value: "3", label: "แรงเลอร์ (Wrangler)"},
      {value: "4", label: "ลี คูปเปอร์ (Lee Cooper)"},
      {value: "5", label: "จี คิว (GQ)"},
      {value: "6", label: "เบฟเวอรี่ ฮิล โปโล คลับ (Beverly Hill Polo club)"},
      {value: "7", label: "ลาคอสท์ (Lacoste)"},
      {value: "8", label: "คร็อคโคไดล์ (Crocodile)"},
      {value: "9", label: "อี เอส พี (ESP)"},
      {value: "10", label: "ยูนิโคล่ (Uniqlo)"},
      {value: "11", label: "มูจิ (Muji)"},
      {value: "12", label: "แจสพาล / แยสพาล (Jaspal)"},
      {value: "13", label: "ซีซี ดับเบิลโอ (CC OO)"},
      {value: "14", label: "เอ ทู แซด (AIIZ)"},
      {value: "15", label: "นิยม ยีนส์ (Niyom Jeans)"},
      {value: "16", label: "ปั๊มแก๊สโซลีน (Gasoline)"},
      {value: "17", label: "เอส แฟร์ (S'Fare)"},
      {value: "18", label: "แช็ปส์ (Chaps)"},
      {value: "19", label: "เอช แอนด์ เอ็ม (H&M)"},
      {value: "20", label: "เดวี่ โจนส์ (Davie Jones)"}
    ],
    logic: [],
    isRequired: true
  },
  {
    id: "P9c",
    questionType: "MA",
    questionText: "As you had compared some other brand when making your most recent purchase at Mc Jeans. Please select the top 3 factors which you were comparing at that time?",
    questionSubtext: "จากที่คุณได้มีการเปรียบเทียบ แม๊คยีนส์ และยี่ห้ออื่นๆ ปัจจัยต่อไปนี้เป็นสิ่งที่ผู้บริโภคใช้เวลาเลือกซื้อเสื้อผ้า กรุณาเลือก 3 ปัจจัยที่คุณใช้ในการเปรียบเทียบยี่ห้อเสื้อผ้า?",
    options: [
      {value: "1", label: "ภาพลักษณ์แบรนด์ (Brand)"},
      {value: "2", label: "ราคา (Price)"},
      {value: "3", label: "การออกแบบ / ดีไซน์ (Design)"},
      {value: "4", label: "โปรโมชั่น ส่งเสริมการขาย (Promotion)"},
      {value: "5", label: "ขนาดที่หลากหลาย (Sizes)"},
      {value: "6", label: "สีสัน (Color)"},
      {value: "7", label: "เนื้อผ้า (Fabric type)"},
      {value: "8", label: "การตัดเย็บ (Craftsmanship)"},
      {value: "9", label: "การบริการของพนักงานหน้าร้าน (Staff service)"},
      {value: "10", label: "อื่นๆ (Other)"}
    ],
    logic: [],
    isRequired: true
  },
  {
    id: "P10",
    questionType: "OE",
    questionText: "Why do you choose to buy Mc Jeans in your most recent purchase?",
    questionSubtext: "เพราะเหตุใดคุณจึงตัดสินใจซื้อ แม๊คยีนส์ ในการซื้อครั้งล่าสุดของคุณ?",
    options: [],
    logic: [],
    isRequired: true
  },
  {
    id: "P12a",
    questionType: "MA",
    questionText: "What are the media which you usually come across in your daily life?",
    questionSubtext: "ต่อไปนี้เป็นช่องทางของสื่อต่างๆ คุณเข้าถึงหรือบริโภคสื่อประเภทใดบ้างในชีวิตประจำวันของคุณ?",
    options: [
      {value: "1", label: "FB Page / Post"},
      {value: "2", label: "IG Page / Post"},
      {value: "3", label: "Live stream on TikTok"},
      {value: "4", label: "Live stream on Youtube"},
      {value: "5", label: "Live stream on facebook"},
      {value: "6", label: "Billboard"},
      {value: "7", label: "Advertisement on Free TV / Digital TV"},
      {value: "8", label: "Product tie in (in TV programs)"},
      {value: "9", label: "Roadside signage"},
      {value: "10", label: "Bus wrap / Bus stop"},
      {value: "11", label: "Fashion magazine"},
      {value: "12", label: "e-commerce platform"}
    ],
    logic: [],
    isRequired: true
  },
  {
    id: "P12b",
    questionType: "MA",
    questionText: "Which of your selected media have impact on your decision to purchase apparels products?",
    questionSubtext: "แล้วสื่อประเภทใดบ้าง ที่คุณคิดว่ามีอิทธิพลต่อการตัดสินใจซื้อเสื้อผ้าของคุณ?",
    options: [], // Will be populated dynamically from P12a answers
    logic: [],
    isRequired: true
  }
];

// Run the setup if this script is executed directly
if (require.main === module) {
  setupQuestions();
}