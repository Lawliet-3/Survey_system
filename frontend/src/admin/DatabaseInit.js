// src/admin/DatabaseInit.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import questionService from '../services/questionService';
import './AdminStyles.css';

function DatabaseInit() {
  const navigate = useNavigate();
  const [initStatus, setInitStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('admin_user');
    if (!userData) {
      navigate('/admin/login');
    }
  }, [navigate]);
  
  const handleLogout = () => {
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };
  
  const handleBackToQuestions = () => {
    navigate('/admin');
  };

  const handleInitDatabase = async () => {
    try {
      setLoading(true);
      setInitStatus('Initializing database...');
      
      // Call the database initialization endpoint
      const result = await questionService.initializeDatabase();
      
      setInitStatus('Database initialized successfully.');
      setSuccess(true);
      console.log('Database initialization result:', result);
      
      // Populate with sample questions
      await createMcJeansSurveyQuestions();
      
      setInitStatus('Sample survey questions created successfully.');
    } catch (err) {
      setError(`Database initialization failed: ${err.message}`);
      console.error('Error initializing database:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Create all the Mc Jeans survey questions
  const createMcJeansSurveyQuestions = async () => {
    const brandOptions = [
      { value: "1", label: "แม็ค ยีนส์ (Mc Jeans)" },
      { value: "2", label: "ลีไวส์ (Levi's)" },
      { value: "3", label: "แรงเลอร์ (Wrangler)" },
      { value: "4", label: "ลี คูปเปอร์ (Lee Cooper)" },
      { value: "5", label: "จี คิว (GQ)" },
      { value: "6", label: "เบฟเวอรี่ ฮิล โปโล คลับ (Beverly Hill Polo club)" },
      { value: "7", label: "ลาคอสท์ (Lacoste)" },
      { value: "8", label: "คร็อคโคไดล์ (Crocodile)" },
      { value: "9", label: "อี เอส พี (ESP)" },
      { value: "10", label: "ยูนิโคล่ (Uniqlo)" },
      { value: "11", label: "มูจิ (Muji)" },
      { value: "12", label: "แจสพาล / แยสพาล (Jaspal)" },
      { value: "13", label: "ซีซี ดับเบิลโอ (CC OO)" },
      { value: "14", label: "เอ ทู แซด (AIIZ)" },
      { value: "15", label: "นิยม ยีนส์ (Niyom Jeans)" },
      { value: "16", label: "ปั๊มแก๊สโซลีน (Gasoline)" },
      { value: "17", label: "เอส แฟร์ (S'Fare)" },
      { value: "18", label: "แช็ปส์ (Chaps)" },
      { value: "19", label: "เอช แอนด์ เอ็ม (H&M)" },
      { value: "20", label: "เดวี่ โจนส์ (Davie Jones)" },
      { value: "98", label: "อื่นๆ (Others)" },
      { value: "99", label: "ไม่ทราบ (Don't know)" }
    ];
    
    const mediaOptions = [
      { value: "1", label: "FB Page / Post" },
      { value: "2", label: "IG Page / Post" },
      { value: "3", label: "Live stream on TikTok" },
      { value: "4", label: "Live stream on Youtube" },
      { value: "5", label: "Live stream on facebook" },
      { value: "6", label: "Billboard" },
      { value: "7", label: "Advertisement on Free TV / Digital TV" },
      { value: "8", label: "Product tie in (in TV programs)" },
      { value: "9", label: "Roadside signage" },
      { value: "10", label: "Bus wrap / Bus stop" },
      { value: "11", label: "Fashion magazine" },
      { value: "12", label: "e-commerce platform" }
    ];
    
    // Define the survey questions
    const questions = [
      // D1: Monthly income
      {
        id: "D1",
        questionType: "SA",
        questionText: "Please specify your monthly household income (Before tax)?",
        questionSubtext: "กรุณาระบุรายได้ครัวเรือนของครอบครัวคุณ (ก่อนหักภาษี) ของครอบครัวคุณค่ะ?",
        options: [
          { value: "1", label: "14,999 บาท หรือน้อยกว่า" },
          { value: "2", label: "15,000-19,999 บาท" },
          { value: "3", label: "20,000-29,999 บาท" },
          { value: "4", label: "30,000-39,999 บาท" },
          { value: "5", label: "40,000-49,999 บาท" },
          { value: "6", label: "50,000-59,999 บาท" },
          { value: "7", label: "60,000 บาท หรือมากกว่า" }
        ],
        logic: [
          { condition: "equals", value: "1", jumpToQuestion: "END" }
        ],
        isRequired: true,
        displayOrder: 1
      },
      
      // D2a: Marital status
      {
        id: "D2a",
        questionType: "SA",
        questionText: "Please specify your marital status?",
        questionSubtext: "กรุณาระบุสถานภาพสมรสของคุณค่ะ?",
        options: [
          { value: "1", label: "โสด (Single)" },
          { value: "2", label: "สมรส (มีบุตร) (Married with kids)" },
          { value: "3", label: "สมรส (ไม่มีบุตร) (Married without kids)" },
          { value: "4", label: "ม่าย/ หย่าร้าง (มีบุตร) (Divorced/Widow with kids)" },
          { value: "5", label: "ม่าย/ หย่าร้าง (ไม่มีบุตร) (Divorced/Widow without kids)" }
        ],
        logic: [
          { condition: "equals", value: "2", jumpToQuestion: "D2b" },
          { condition: "equals", value: "4", jumpToQuestion: "D2b" }
        ],
        isRequired: true,
        displayOrder: 2
      },
      
      // D2b: Kid's clothing purchase
      {
        id: "D2b",
        questionType: "SA",
        questionText: "Do you make any purchase of apparels / clothing for your kid within the past 6 months?",
        questionSubtext: "คุณได้มีการซื้อเสื้อผ้าให้บุตรของคุณใน 6 เดือนที่ผ่านมาหรือไม่คะ?",
        options: [
          { value: "1", label: "ใช่ (Yes)" },
          { value: "2", label: "ไม่ใช่ (No)" }
        ],
        isRequired: true,
        displayOrder: 3
      },
      
      // P1: Brand awareness
      {
        id: "P1",
        questionType: "MA",
        questionText: "Which of the following brands have you heard of?",
        questionSubtext: "คุณรู้จักหรือเคยเห็นเสื้อผ้ายี่ห้อใดต่อไปนี้บ้าง?",
        options: brandOptions,
        isRequired: true,
        minSelections: 1,
        displayOrder: 4
      },
      
      // P2: Ever used
      {
        id: "P2",
        questionType: "MA",
        questionText: "Which of the following brands have you personally ever used?",
        questionSubtext: "จากยี่ห้อเสื้อผ้าที่คุณรู้จักหรือเคยเห็นที่คุณได้เลือกมา มีเสื้อผ้ายี่ห้อใดบ้างที่คุณเคยใช้?",
        options: [], // Will be piped from P1
        isRequired: true,
        minSelections: 1,
        displayOrder: 5
      },
      
      // P3: Current use
      {
        id: "P3",
        questionType: "MA",
        questionText: "Which of the following brands have you currently using or used in the last 3 months?",
        questionSubtext: "แล้วมีเสื้อผ้ายี่ห้อใดบ้างที่คุณใช้อยู่ในปัจจุบัน หรือ ใช้ใน 3 เดือนที่ผ่านมา?",
        options: [], // Will be piped from P2
        isRequired: true,
        minSelections: 1,
        displayOrder: 6
      },
      
      // P4: Most used
      {
        id: "P4",
        questionType: "SA",
        questionText: "Which of the following brands do you use most often?",
        questionSubtext: "แล้วมีเสื้อผ้ายี่ห้อ คือยี่ห้อที่คุณใช้เป็นหลัก?",
        options: [], // Will be piped from P3
        isRequired: true,
        displayOrder: 7
      },
      
      // P5: Future consideration
      {
        id: "P5",
        questionType: "MA",
        questionText: "Which of the following brands do you consider using in the near future?",
        questionSubtext: "จากยี่ห้อเสื้อผ้าต่อไปนี้ มียี่ห้อใดบ้างที่คุณคิดจะใช้ในอนาคต?",
        options: [], // Will be piped from P1 minus P3
        isRequired: true,
        minSelections: 1,
        displayOrder: 8
      },
      
      // P7: Aspiring brand
      {
        id: "P7",
        questionType: "SA",
        questionText: "May I know what is/are your most aspiring brand for you?",
        questionSubtext: "จากยี่ห้อเสื้อผ้าต่อไปนี้ ยี่ห้อใดคือยี่ห้อที่คุณชื่นชอบที่สุด?",
        options: [], // Will be piped from P6 (P3 + P5)
        isRequired: true,
        displayOrder: 9
      },
      
      // P8a: Mc Jeans perception
      {
        id: "P8a",
        questionType: "OE",
        questionText: "What comes into your mind when you think of Mc Jeans?",
        questionSubtext: "เมื่อนึก แม็ค ยีนส์ คุณนึกถึงอะไรบ้าง? (เช่น ภาพลักษณ์ยี่ห้อ, คุณภาพสินค้า, การออกแบบ ฯลฯ)",
        isRequired: true,
        displayOrder: 10
      },
      
      // P8b: Brand perception (dynamic)
      {
        id: "P8b",
        questionType: "OE",
        questionText: "What comes into your mind when you think of Brand X?",
        questionSubtext: "เมื่อนึก Brand X คุณนึกถึงอะไรบ้าง? (เช่น ภาพลักษณ์ยี่ห้อ, คุณภาพสินค้า, การออกแบบ ฯลฯ)",
        isRequired: true,
        displayOrder: 11
      },
      
      // P9a: Brand comparison
      {
        id: "P9a",
        questionType: "SA",
        questionText: "Before making your most recent purchase, did you make any brand comparisons before you made your decision to purchase?",
        questionSubtext: "ก่อนที่คุณจะซื้อเสื้อผ้า/เครื่องประดับที่ ร้านแม๊ค ยีนส์ ครั้งล่าสุด คุณได้เปรียบเทียบแม๊คยีนส์กับยี่ห้ออื่นหรือไม่?",
        options: [
          { value: "1", label: "มีการเปรียบเทียบยี่ห้อ (Yes)" },
          { value: "2", label: "ไม่มีการเปรียบเทียบยี่ห้อ (No)" }
        ],
        logic: [
          { condition: "equals", value: "2", jumpToQuestion: "P10" }
        ],
        isRequired: true,
        displayOrder: 12
      },
      
      // P9b: Compared brands
      {
        id: "P9b",
        questionType: "MA",
        questionText: "Apart from Mc Jeans, what are the brands which you'd compared?",
        questionSubtext: "นอกเหนือจาก แม๊คยีนส์ คุณเปรียบเทียบยี่ห้ออื่นใดอีกบ้าง?",
        options: brandOptions, // Will be filtered by piping logic
        isRequired: true,
        minSelections: 1,
        displayOrder: 13
      },
      
      // P9c: Comparison factors
      {
        id: "P9c",
        questionType: "MA",
        questionText: "As you had compared some other brand when making your most recent purchase at Mc Jeans. Please select the top 3 factors which you were comparing at that time?",
        questionSubtext: "จากที่คุณได้มีการเปรียบเทียบ แม๊คยีนส์ และยี่ห้ออื่นๆ ปัจจัยต่อไปนี้เป็นสิ่งที่ผู้บริโภคใช้เวลาเลือกซื้อเสื้อผ้า กรุณาเลือก 3 ปัจจัยที่คุณใช้ในการเปรียบเทียบยี่ห้อเสื้อผ้า?",
        options: [
          { value: "1", label: "ภาพลักษณ์แบรนด์ (Brand)" },
          { value: "2", label: "ราคา (Price)" },
          { value: "3", label: "การออกแบบ / ดีไซน์ (Design)" },
          { value: "4", label: "โปรโมชั่น ส่งเสริมการขาย (Promotion)" },
          { value: "5", label: "ขนาดที่หลากหลาย (Sizes)" },
          { value: "6", label: "สีสัน (Color)" },
          { value: "7", label: "เนื้อผ้า (Fabric type)" },
          { value: "8", label: "การตัดเย็บ (Craftsmanship)" },
          { value: "9", label: "การบริการของพนักงานหน้าร้าน (Staff service)" },
          { value: "10", label: "อื่นๆ (Other)" }
        ],
        isRequired: true,
        minSelections: 3,
        displayOrder: 14
      },

      {
        id: "P9d",
        questionType: "MA",
        questionText: "What is the most recent apparel brand you purchased within the past 6 months?",
        questionSubtext: "คุณซื้อแบรนด์เสื้อผ้าอะไรล่าสุดในช่วง 6 เดือนที่ผ่านมา?",
        options: [], // Will be piped from P6
        isRequired: true,
        minSelections: 1,
        displayOrder: 15
      },
      
      // P9e: Why stopped buying Mc Jeans - Only for Lapsers
      {
        id: "P9e",
        questionType: "OE",
        questionText: "Why did you stop buying Mc Jeans?",
        questionSubtext: "เพราะเหตุใดคุณจึงหยุดซื้อสินค้าจากแม็คยีนส์?",
        isRequired: true,
        displayOrder: 16,
        logic: [
          // Skip P10 and go straight to P11 for Lapsers
          { condition: "equals", value: "any", jumpToQuestion: "P11" }
        ]
      },
      
      // P10: Purchase reason
      {
        id: "P10",
        questionType: "OE",
        questionText: "Why do you choose to buy Mc Jeans in your most recent purchase?",
        questionSubtext: "เพราะเหตุใดคุณจึงตัดสินใจซื้อ แม๊คยีนส์ ในการซื้อครั้งล่าสุดของคุณ?",
        isRequired: true,
        displayOrder: 17
      },
      
      // P11: Brand attributes
      {
        id: "P11",
        questionType: "MA",
        questionText: "From the following statements, please select the brands which fit in with each statements?",
        questionSubtext: "ข้อความต่อไปนี้เป็นภาพลักษณ์ต่างๆของยี่ห้อเสื้อผ้า กรุณาเลือกยี่ห้อที่คุณคิดเหมาะสมสำหรับแต่ละข้อความ (หลายคำตอบ)",
        options: [], // Will be filled with Mc Jeans + random brands from P6
        attributes: [
          "เหมาะสำหรับคนทุกเพศทุกวัย (Suitable for everyone)",
          "มีภาพลักษณ์ที่เท่ (Cool brand)",
          "มีราคาที่จับต้องได้ (Affordable price)",
          "มีสาขาเยอะ / ร้านหาง่าย (High availability)",
          "มีผลิตภัณฑ์ให้เลือกหลากหลาย (เช่น กางเกง, เสื้อผ้า, เครื่องประดับ ฯลฯ) (Have variety of products)",
          "มีขนาดให้เลือกหลากหลาย (เช่น XS / S / M / L / XL / XXL ฯลฯ) (Have various sizes)",
          "มีสีสันให้เลือกหลากหลาย (Have various color)",
          "เหมาะสมกับวัยรุ่น (Suitable for teenagers)",
          "มีภาพลักษณ์ที่สร้างสรรค์ (Creative brand)",
          "มีการจัดวางร้านค้าที่น่าดึงดูด (Attractive store layout)",
          "มีแฟชั่นที่ทันสมัย (Fashionable brand)",
          "ผลิตภัณฑ์มีคุณภาพสูง (High quality products)"
        ],
        isRequired: true,
        displayOrder: 18
      },
      
      // P12a: Media exposure
      {
        id: "P12a",
        questionType: "MA",
        questionText: "What are the media which you usually come across in your daily life?",
        questionSubtext: "ต่อไปนี้เป็นช่องทางของสื่อต่างๆ คุณเข้าถึงหรือบริโภคสื่อประเภทใดบ้างในชีวิตประจำวันของคุณ?",
        options: mediaOptions,
        isRequired: true,
        minSelections: 1,
        displayOrder: 19
      },
      
      // P12b: Influential media
      {
        id: "P12b",
        questionType: "MA",
        questionText: "Which of your selected media have impact on your decision to purchase apparels products?",
        questionSubtext: "แล้วสื่อประเภทใดบ้าง ที่คุณคิดว่ามีอิทธิพลต่อการตัดสินใจซื้อเสื้อผ้าของคุณ?",
        options: [], // Will be piped from P12a
        isRequired: true,
        minSelections: 1,
        displayOrder: 20
      },
      
      // END question - termination
      {
        id: "END",
        questionType: "SA",
        questionText: "Thank you for your participation. Unfortunately, you do not qualify for this survey.",
        questionSubtext: "ขอบคุณสำหรับการเข้าร่วม แต่น่าเสียดายที่คุณไม่ผ่านเกณฑ์สำหรับแบบสอบถามนี้",
        options: [
          { value: "1", label: "Exit" }
        ],
        isRequired: true,
        displayOrder: 99
      }
    ];
    
    // Clear any existing questions
    await clearExistingQuestions();
    
    // Create all questions in sequence
    for (const question of questions) {
      setInitStatus(`Creating question ${question.id}...`);
      await questionService.createQuestion(question);
    }
    
    setInitStatus('All questions created successfully!');
  };
  
  // Helper function to clear existing questions
  const clearExistingQuestions = async () => {
    setInitStatus('Clearing existing questions...');
    
    try {
      // Get all existing questions
      const questions = await questionService.getQuestions();
      
      // Delete each question
      for (const question of questions) {
        await questionService.deleteQuestion(question.id);
      }
      
      setInitStatus('Cleared existing questions.');
    } catch (err) {
      console.error('Error clearing questions:', err);
      setInitStatus('Error clearing questions: ' + err.message);
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Database Management</h1>
        <div className="admin-user-info">
          <button onClick={handleBackToQuestions} className="admin-nav-button">
            Back to Questions
          </button>
          <span>Logged in as: admin</span>
          <button onClick={handleLogout} className="admin-logout-button">
            Logout
          </button>
        </div>
      </header>
      
      <div className="admin-content">
        <div className="admin-db-init">
          <h2>Database Initialization</h2>
          
          <div className="admin-db-init-card">
            <h3>Initialize Database with Mc Jeans Survey</h3>
            <p>
              This will initialize the database tables and populate them with the complete Mc Jeans survey questions.
              All existing questions will be removed and replaced with the new survey.
            </p>
            
            {error && <div className="admin-error-message">{error}</div>}
            {success && <div className="admin-success-message">
              <p>{initStatus}</p>
              <p>Database initialized and questions created successfully! You can now go back to the admin dashboard to view and manage the questions.</p>
            </div>}
            
            <button
              onClick={handleInitDatabase}
              disabled={loading}
              className="admin-init-db-button"
            >
              {loading ? 'Initializing...' : 'Initialize Database'}
            </button>
            
            {loading && <p className="init-status">{initStatus}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DatabaseInit;