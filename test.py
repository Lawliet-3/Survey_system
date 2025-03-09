import requests
import json

# Base URL of your API
base_url = "http://localhost:8000/api"  # Change to your actual API URL

# Helper function to create a question
def create_question(question_data):
    url = f"{base_url}/admin/questions"
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, headers=headers, json=question_data)
    if response.status_code == 200:
        print(f"Successfully created question {question_data['id']}")
    else:
        print(f"Failed to create question {question_data['id']}: {response.status_code}")
        print(response.text)
    return response

# List of clothing brands to reuse
brands = [
    {"value": "1", "label": "แม็ค ยีนส์ (Mc Jeans)"},
    {"value": "2", "label": "ลีไวส์ (Levi's)"},
    {"value": "3", "label": "แรงเลอร์ (Wrangler)"},
    {"value": "4", "label": "ลี คูปเปอร์ (Lee Cooper)"},
    {"value": "5", "label": "จี คิว (GQ)"},
    {"value": "6", "label": "เบฟเวอรี่ ฮิล โปโล คลับ (Beverly Hill Polo club)"},
    {"value": "7", "label": "ลาคอสท์ (Lacoste)"},
    {"value": "8", "label": "คร็อคโคไดล์ (Crocodile)"},
    {"value": "9", "label": "อี เอส พี (ESP)"},
    {"value": "10", "label": "ยูนิโคล่ (Uniqlo)"},
    {"value": "11", "label": "มูจิ (Muji)"},
    {"value": "12", "label": "แจสพาล / แยสพาล (Jaspal)"},
    {"value": "13", "label": "ซีซี ดับเบิลโอ (CC OO)"},
    {"value": "14", "label": "เอ ทู แซด (AIIZ)"},
    {"value": "15", "label": "นิยม ยีนส์ (Niyom Jeans)"},
    {"value": "16", "label": "ปั๊มแก๊สโซลีน (Gasoline)"},
    {"value": "17", "label": "เอส แฟร์ (S'Fare)"},
    {"value": "18", "label": "แช็ปส์ (Chaps)"},
    {"value": "19", "label": "เอช แอนด์ เอ็ม (H&M)"},
    {"value": "20", "label": "เดวี่ โจนส์ (Davie Jones)"},
    {"value": "98", "label": "อื่นๆ (Others)"},
    {"value": "99", "label": "ไม่ทราบ (Don't know)"}
]

# Define comparison factors for P9c
comparison_factors = [
    {"value": "1", "label": "ภาพลักษณ์แบรนด์ (Brand)"},
    {"value": "2", "label": "ราคา (Price)"},
    {"value": "3", "label": "การออกแบบ / ดีไซน์ (Design)"},
    {"value": "4", "label": "โปรโมชั่น ส่งเสริมการขาย (Promotion)"},
    {"value": "5", "label": "ขนาดที่หลากหลาย (Sizes)"},
    {"value": "6", "label": "สีสัน (Color)"},
    {"value": "7", "label": "เนื้อผ้า (Fabric type)"},
    {"value": "8", "label": "การตัดเย็บ (Craftsmanship)"},
    {"value": "9", "label": "การบริการของพนักงานหน้าร้าน (Staff service)"},
    {"value": "10", "label": "อื่นๆ (Other)"}
]

# Define media types for P12
media_types = [
    {"value": "1", "label": "FB Page / Post"},
    {"value": "2", "label": "IG Page / Post"},
    {"value": "3", "label": "Live stream on TikTok"},
    {"value": "4", "label": "Live stream on Youtube"},
    {"value": "5", "label": "Live stream on facebook"},
    {"value": "6", "label": "Billboard"},
    {"value": "7", "label": "Advertisement on Free TV / Digital TV"},
    {"value": "8", "label": "Product tie in (in TV programs)"},
    {"value": "9", "label": "Roadside signage"},
    {"value": "10", "label": "Bus wrap / Bus stop"},
    {"value": "11", "label": "Fashion magazine"},
    {"value": "12", "label": "e-commerce platform"}
]

# Brand statements for P11
brand_statements = [
    "เหมาะสำหรับคนทุกเพศทุกวัย (Suitable for everyone)",
    "มีภาพลักษณ์ที่เท่ (Cool brand)",
    "มีราคาที่จับต้องได้ (Affordable price)",
    "มีสาขาเยอะ / ร้านหาง่าย (High availability)",
    "มีผลิตภัณฑ์ให้เลือกหลากหลาย (Have variety of products)",
    "มีขนาดให้เลือกหลากหลาย (Have various sizes)",
    "มีสีสันให้เลือกหลากหลาย (Have various color)",
    "เหมาะสมกับวัยรุ่น (Suitable for teenagers)",
    "มีภาพลักษณ์ที่สร้างสรรค์ (Creative brand)",
    "มีการจัดวางร้านค้าที่น่าดึงดูด (Attractive store layout)",
    "มีแฟชั่นที่ทันสมัย (Fashionable brand)",
    "ผลิตภัณฑ์มีคุณภาพสูง (High quality products)"
]

# Create all questions
questions = [
    # D1: Income question
    {
        "id": "D1",
        "questionType": "SA",
        "questionText": "Please specify your monthly household income (Before tax)?",
        "questionSubtext": "กรุณาระบุรายได้ครัวเรือนของครอบครัวคุณ (ก่อนหักภาษี) ของครอบครัวคุณค่ะ?",
        "options": [
            {"value": "1", "label": "14,999 บาท หรือน้อยกว่า (14,999 and below)"},
            {"value": "2", "label": "15,000-19,999 บาท (15,000-19,999)"},
            {"value": "3", "label": "20,000-29,999 บาท (20,000-29,999)"},
            {"value": "4", "label": "30,000-39,999 บาท (30,000-39,999)"},
            {"value": "5", "label": "40,000-49,999 บาท (40,000-49,999)"},
            {"value": "6", "label": "50,000-59,999 บาท (50,000-59,999)"},
            {"value": "7", "label": "60,000 บาท หรือมากกว่า (60,000 and above)"}
        ],
        "logic": [],
        "isRequired": True,
        "displayOrder": 1
    },
    
    # D2a: Marital status
    {
        "id": "D2a",
        "questionType": "SA",
        "questionText": "Please specify your marital status?",
        "questionSubtext": "กรุณาระบุสถานภาพสมรสของคุณค่ะ?",
        "options": [
            {"value": "1", "label": "โสด (Single)"},
            {"value": "2", "label": "สมรส (มีบุตร) (Married with kids)"},
            {"value": "3", "label": "สมรส (ไม่มีบุตร) (Married without kids)"},
            {"value": "4", "label": "ม่าย/ หย่าร้าง (มีบุตร) (Divorced/Widow with kids)"},
            {"value": "5", "label": "ม่าย/ หย่าร้าง (ไม่มีบุตร) (Divorced/Widow without kids)"}
        ],
        "logic": [
            {"condition": "equals", "value": "2", "jumpToQuestion": "D2b"},
            {"condition": "equals", "value": "4", "jumpToQuestion": "D2b"}
        ],
        "isRequired": True,
        "displayOrder": 2
    },
    
    # D2b: Kid clothing purchase
    {
        "id": "D2b",
        "questionType": "SA",
        "questionText": "Do you make any purchase of apparels/clothing for your kid within the past 6 months?",
        "questionSubtext": "คุณได้มีการซื้อเสื้อผ้าให้บุตรของคุณใน 6 เดือนที่ผ่านมาหรือไม่คะ?",
        "options": [
            {"value": "1", "label": "ใช่ (Yes)"},
            {"value": "2", "label": "ไม่ใช่ (No)"}
        ],
        "logic": [],
        "isRequired": True,
        "displayOrder": 3
    },
    
    # P1: Brand awareness
    {
        "id": "P1",
        "questionType": "MA",
        "questionText": "Which of the following brands have you heard of?",
        "questionSubtext": "คุณรู้จักหรือเคยเห็นเสื้อผ้ายี่ห้อใดต่อไปนี้บ้าง?",
        "options": brands,
        "logic": [],
        "isRequired": True,
        "displayOrder": 4
    },
    
    # P2: Ever used brands
    {
        "id": "P2",
        "questionType": "MA",
        "questionText": "Which of the following brands have you personally ever used?",
        "questionSubtext": "จากยี่ห้อเสื้อผ้าที่คุณรู้จักหรือเคยเห็นที่คุณได้เลือกมา มีเสื้อผ้ายี่ห้อใดบ้างที่คุณเคยใช้?",
        "options": brands,
        "logic": [],
        "isRequired": True,
        "displayOrder": 5
    },
    
    # P3: Currently using brands
    {
        "id": "P3",
        "questionType": "MA",
        "questionText": "Which of the following brands have you currently using or used in the last 3 months?",
        "questionSubtext": "แล้วมีเสื้อผ้ายี่ห้อใดบ้างที่คุณใช้อยู่ในปัจจุบัน หรือ ใช้ใน 3 เดือนที่ผ่านมา?",
        "options": brands,
        "logic": [],
        "isRequired": True,
        "displayOrder": 6
    },
    
    # P4: Most often used brand
    {
        "id": "P4",
        "questionType": "SA",
        "questionText": "Which of the following brands do you use most often?",
        "questionSubtext": "แล้วมีเสื้อผ้ายี่ห้อ คือยี่ห้อที่คุณใช้เป็นหลัก?",
        "options": brands,
        "logic": [],
        "isRequired": True,
        "displayOrder": 7
    },
    
    # P5: Consider using brands
    {
        "id": "P5",
        "questionType": "MA",
        "questionText": "Which of the following brands do you consider using in the near future?",
        "questionSubtext": "จากยี่ห้อเสื้อผ้าต่อไปนี้ มียี่ห้อใดบ้างที่คุณคิดจะใช้ในอนาคต?",
        "options": brands,
        "logic": [],
        "isRequired": True,
        "displayOrder": 8
    },
    
    # P7: Most aspiring brand
    {
        "id": "P7",
        "questionType": "SA",
        "questionText": "May I know what is/are your most aspiring brand for you?",
        "questionSubtext": "จากยี่ห้อเสื้อผ้าต่อไปนี้ ยี่ห้อใดคือยี่ห้อที่คุณชื่นชอบที่สุด?",
        "options": brands,
        "logic": [],
        "isRequired": True,
        "displayOrder": 9
    },
    
    # P8a: Thoughts on Mc Jeans
    {
        "id": "P8a",
        "questionType": "OE",
        "questionText": "What comes into your mind when you think of Mc Jeans?",
        "questionSubtext": "เมื่อนึก แม็ค ยีนส์ คุณนึกถึงอะไรบ้าง? (เช่น ภาพลักษณ์ยี่ห้อ, คุณภาพสินค้า, การออกแบบ ฯลฯ)",
        "options": [],
        "logic": [],
        "isRequired": True,
        "displayOrder": 10
    },
    
    # P8b: Thoughts on other brand 1
    {
        "id": "P8b",
        "questionType": "OE",
        "questionText": "What comes into your mind when you think of [Brand 1]?",
        "questionSubtext": "เมื่อนึก [Brand 1] คุณนึกถึงอะไรบ้าง? (เช่น ภาพลักษณ์ยี่ห้อ, คุณภาพสินค้า, การออกแบบ ฯลฯ)",
        "options": [],
        "logic": [],
        "isRequired": True,
        "displayOrder": 11
    },
    
    # P8c: Thoughts on other brand 2
    {
        "id": "P8c",
        "questionType": "OE",
        "questionText": "What comes into your mind when you think of [Brand 2]?",
        "questionSubtext": "เมื่อนึก [Brand 2] คุณนึกถึงอะไรบ้าง? (เช่น ภาพลักษณ์ยี่ห้อ, คุณภาพสินค้า, การออกแบบ ฯลฯ)",
        "options": [],
        "logic": [],
        "isRequired": True,
        "displayOrder": 12
    },
    
    # P8d: Thoughts on other brand 3
    {
        "id": "P8d",
        "questionType": "OE",
        "questionText": "What comes into your mind when you think of [Brand 3]?",
        "questionSubtext": "เมื่อนึก [Brand 3] คุณนึกถึงอะไรบ้าง? (เช่น ภาพลักษณ์ยี่ห้อ, คุณภาพสินค้า, การออกแบบ ฯลฯ)",
        "options": [],
        "logic": [],
        "isRequired": True,
        "displayOrder": 13
    },
    
    # P9a: Brand comparison
    {
        "id": "P9a",
        "questionType": "SA",
        "questionText": "Before making your most recent purchase, did you make any brand comparisons before you made your decision to purchase?",
        "questionSubtext": "ก่อนที่คุณจะซื้อเสื้อผ้า/เครื่องประดับที่ ร้านแม๊ค ยีนส์ ครั้งล่าสุด คุณได้เปรียบเทียบแม๊คยีนส์กับยี่ห้ออื่นหรือไม่?",
        "options": [
            {"value": "1", "label": "มีการเปรียบเทียบยี่ห้อ (Yes)"},
            {"value": "2", "label": "ไม่มีการเปรียบเทียบยี่ห้อ (No)"}
        ],
        "logic": [
            {"condition": "equals", "value": "1", "jumpToQuestion": "P9b"},
            {"condition": "equals", "value": "2", "jumpToQuestion": "P10"}
        ],
        "isRequired": True,
        "displayOrder": 14
    },
    
    # P9b: Compared brands
    {
        "id": "P9b",
        "questionType": "MA",
        "questionText": "Apart from Mc Jeans, what are the brands which you'd compared?",
        "questionSubtext": "นอกเหนือจาก แม๊คยีนส์ คุณเปรียบเทียบยี่ห้ออื่นใดอีกบ้าง?",
        "options": brands,
        "logic": [],
        "isRequired": True,
        "displayOrder": 15
    },
    
    # P9c: Comparison factors
    {
        "id": "P9c",
        "questionType": "MA",
        "questionText": "As you had compared some other brand when making your most recent purchase at Mc Jeans. Please select the top 3 factors which you were comparing at that time?",
        "questionSubtext": "จากที่คุณได้มีการเปรียบเทียบ แม๊คยีนส์ และยี่ห้ออื่นๆ ปัจจัยต่อไปนี้เป็นสิ่งที่ผู้บริโภคใช้เวลาเลือกซื้อเสื้อผ้า กรุณาเลือก 3 ปัจจัยที่คุณใช้ในการเปรียบเทียบยี่ห้อเสื้อผ้า?",
        "options": comparison_factors,
        "logic": [],
        "isRequired": True,
        "displayOrder": 16
    },
    
    # P10: Reason for purchase
    {
        "id": "P10",
        "questionType": "OE",
        "questionText": "Why do you choose to buy Mc Jeans in your most recent purchase?",
        "questionSubtext": "เพราะเหตุใดคุณจึงตัดสินใจซื้อ แม๊คยีนส์ ในการซื้อครั้งล่าสุดของคุณ?",
        "options": [],
        "logic": [],
        "isRequired": True,
        "displayOrder": 17
    },
    
    # P11: Brand statements
    {
        "id": "P11",
        "questionType": "MA",
        "questionText": "From the following statements, please select the brands which fit in with each statements?",
        "questionSubtext": "ข้อความต่อไปนี้เป็นภาพลักษณ์ต่างๆของยี่ห้อเสื้อผ้า กรุณาเลือกยี่ห้อที่คุณคิดเหมาะสมสำหรับแต่ละข้อความ",
        "options": [
            {"value": "1", "label": brand_statements[0]},
            {"value": "2", "label": brand_statements[1]},
            {"value": "3", "label": brand_statements[2]},
            {"value": "4", "label": brand_statements[3]},
            {"value": "5", "label": brand_statements[4]},
            {"value": "6", "label": brand_statements[5]},
            {"value": "7", "label": brand_statements[6]},
            {"value": "8", "label": brand_statements[7]},
            {"value": "9", "label": brand_statements[8]},
            {"value": "10", "label": brand_statements[9]},
            {"value": "11", "label": brand_statements[10]},
            {"value": "12", "label": brand_statements[11]}
        ],
        "logic": [],
        "isRequired": True,
        "displayOrder": 18
    },
    
    # P12a: Media exposure
    {
        "id": "P12a",
        "questionType": "MA",
        "questionText": "What are the media which you usually come across in your daily life?",
        "questionSubtext": "ต่อไปนี้เป็นช่องทางของสื่อต่างๆ คุณเข้าถึงหรือบริโภคสื่อประเภทใดบ้างในชีวิตประจำวันของคุณ?",
        "options": media_types,
        "logic": [],
        "isRequired": True,
        "displayOrder": 19
    },
    
    # P12b: Media influence
    {
        "id": "P12b",
        "questionType": "MA",
        "questionText": "Which of your selected media have impact on your decision to purchase apparels products?",
        "questionSubtext": "แล้วสื่อประเภทใดบ้าง ที่คุณคิดว่ามีอิทธิพลต่อการตัดสินใจซื้อเสื้อผ้าของคุณ?",
        "options": media_types,
        "logic": [],
        "isRequired": True,
        "displayOrder": 20
    }
]

# Insert all questions into the database
for question in questions:
    create_question(question)

print("All questions have been inserted!")