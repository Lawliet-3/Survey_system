from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Union, Optional
import json
import os
from datetime import datetime

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define models
class SurveySubmission(BaseModel):
    answers: Dict[str, Union[str, List[str]]]

# Sample questions from the provided document
def get_sample_questions():
    return [
        {
            "id": "D1",
            "questionType": "SA",
            "questionText": "Please specify your monthly household income (Before tax)?",
            "questionSubtext": "กรุณาระบุรายได้ครัวเรือนของครอบครัวคุณ (ก่อนหักภาษี) ของครอบครัวคุณค่ะ?",
            "options": [
                {"value": "1", "label": "14,999 บาท หรือน้อยกว่า"},
                {"value": "2", "label": "15,000-19,999 บาท"},
                {"value": "3", "label": "20,000-29,999 บาท"},
                {"value": "4", "label": "30,000-39,999 บาท"},
                {"value": "5", "label": "40,000-49,999 บาท"},
                {"value": "6", "label": "50,000-59,999 บาท"},
                {"value": "7", "label": "60,000 บาท หรือมากกว่า"}
            ]
        },
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
            ]
        },
        {
            "id": "P1",
            "questionType": "MA",
            "questionText": "Which of the following brands have you heard of?",
            "questionSubtext": "คุณรู้จักหรือเคยเห็นเสื้อผ้ายี่ห้อใดต่อไปนี้บ้าง?",
            "options": [
                {"value": "1", "label": "แม็ค ยีนส์ (Mc Jeans)"},
                {"value": "2", "label": "ลีไวส์ (Levi's)"},
                {"value": "3", "label": "แรงเลอร์ (Wrangler)"},
                {"value": "4", "label": "ลี คูปเปอร์ (Lee Cooper)"},
                {"value": "5", "label": "จี คิว (GQ)"},
                {"value": "6", "label": "เบฟเวอรี่ ฮิล โปโล คลับ (Beverly Hill Polo club)"},
                {"value": "7", "label": "ลาคอสท์ (Lacoste)"},
                {"value": "8", "label": "คร็อคโคไดล์ (Crocodile)"},
                {"value": "9", "label": "อี เอส พี (ESP)"},
                {"value": "10", "label": "ยูนิโคล่ (Uniqlo)"}
            ]
        },
        {
            "id": "P4",
            "questionType": "SA",
            "questionText": "Which of the following brands do you use most often?",
            "questionSubtext": "แล้วมีเสื้อผ้ายี่ห้อ คือยี่ห้อที่คุณใช้เป็นหลัก?",
            "options": [
                {"value": "1", "label": "แม็ค ยีนส์ (Mc Jeans)"},
                {"value": "2", "label": "ลีไวส์ (Levi's)"},
                {"value": "3", "label": "แรงเลอร์ (Wrangler)"},
                {"value": "4", "label": "ลี คูปเปอร์ (Lee Cooper)"},
                {"value": "5", "label": "จี คิว (GQ)"},
                {"value": "6", "label": "เบฟเวอรี่ ฮิล โปโล คลับ (Beverly Hill Polo club)"},
                {"value": "7", "label": "ลาคอสท์ (Lacoste)"},
                {"value": "8", "label": "คร็อคโคไดล์ (Crocodile)"},
                {"value": "9", "label": "อี เอส พี (ESP)"},
                {"value": "10", "label": "ยูนิโคล่ (Uniqlo)"}
            ]
        },
        {
            "id": "P8a",
            "questionType": "OE",
            "questionText": "What comes into your mind when you think of Mc Jeans?",
            "questionSubtext": "เมื่อนึก แม็ค ยีนส์ คุณนึกถึงอะไรบ้าง? (เช่น ภาพลักษณ์ยี่ห้อ, คุณภาพสินค้า, การออกแบบ ฯลฯ)",
            "options": []
        },
        {
            "id": "P12a",
            "questionType": "MA",
            "questionText": "What are the media which you usually come across in your daily life?",
            "questionSubtext": "ต่อไปนี้เป็นช่องทางของสื่อต่างๆ คุณเข้าถึงหรือบริโภคสื่อประเภทใดบ้างในชีวิตประจำวันของคุณ?",
            "options": [
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
        }
    ]

@app.get("/api/questions")
def read_questions():
    return get_sample_questions()

@app.post("/api/submit")
def submit_survey(submission: SurveySubmission):
    try:
        # Create responses directory if it doesn't exist
        responses_dir = "survey_responses"
        if not os.path.exists(responses_dir):
            os.makedirs(responses_dir)
            
        # Generate a filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{responses_dir}/response_{timestamp}.json"
        
        # Save the submission to a file
        with open(filename, 'w') as f:
            json.dump(submission.dict(), f, indent=2)
            
        return {"status": "success", "message": "Survey submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)