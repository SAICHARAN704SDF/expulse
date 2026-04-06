from datetime import datetime, timedelta
import io
import logging
import os
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    get_current_user,
    get_current_user_optional,
    get_db,
    get_password_hash,
)
from database import Base, engine
from models import Analysis, User, UserSession
from schemas import (
    AnalysisResponse,
    ChatRequest,
    ChatResponse,
    RPPGPredictRequest,
    RPPGPredictResponse,
    Token,
    UserCreate,
    UserResponse,
)
from utils.rppg_pipeline import RPPGPipeline

try:
    from openai import OpenAI
except ImportError as e:
    print(f"⚠️  OpenAI SDK import failed: {e}")
    OpenAI = None
except Exception as e:
    print(f"⚠️  Unexpected error importing OpenAI: {type(e).__name__}: {e}")
    OpenAI = None

try:
    from dotenv import load_dotenv
except ImportError as e:
    print(f"⚠️  python-dotenv import failed: {e}")
    load_dotenv = None
except Exception as e:
    print(f"⚠️  Unexpected error importing dotenv: {type(e).__name__}: {e}")
    load_dotenv = None

if load_dotenv is not None:
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(backend_dir, ".env"))
    load_dotenv(os.path.join(os.path.dirname(backend_dir), ".env"))
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    env_paths = [
        os.path.join(backend_dir, ".env"),
        os.path.join(os.path.dirname(backend_dir), ".env"),
        ".env",
        "/Users/charan/Downloads/vitalll/backend/.env",
    ]
    
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            print(f"✅ Loaded .env from: {env_path}")
            break
    else:
        print(f"⚠️  No .env file found. Checked: {env_paths}")
else:
    print("⚠️  python-dotenv not available; environment variables may not load")

# Log startup status
print(f"{'✅' if OpenAI else '❌'} OpenAI SDK: {'Imported' if OpenAI else 'Not imported'}")
print(f"{'✅' if load_dotenv else '❌'} python-dotenv: {'Imported' if load_dotenv else 'Not imported'}")
api_key_status = "✅" if os.getenv("OPENAI_API_KEY") else "❌"
api_key_display = os.getenv("OPENAI_API_KEY", "NOT SET")[:30] if os.getenv("OPENAI_API_KEY") else "NOT SET"
print(f"{api_key_status} OPENAI_API_KEY: {api_key_display}...")
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Expluse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rppg_pipeline = RPPGPipeline()


def _openai_scoped_chat(message: str) -> Optional[str]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("❌ OPENAI_API_KEY not found in environment")
        return None
    if OpenAI is None:
        logger.warning("❌ OpenAI SDK not imported")
        return None

    try:
        client = OpenAI(api_key=api_key)
        system_prompt = (
            "You are Expluse Support Assistant. You MUST only answer questions about: "
            "(1) Expluse website usage and troubleshooting, "
            "(2) rPPG/ECG signal concepts and differences, "
            "(3) frame detection/ROI/face alignment workflow, "
            "(4) vitals interpretation in this app (BPM, RR, SDNN, RMSSD, confidence, signal quality). "
            "If user asks sexual, explicit, abusive, violent, or unrelated questions, reply exactly: "
            "'Sorry, I can't assist with that.' "
            "For other out-of-scope questions, reply exactly: "
            "'I am limited to Expluse support topics only: website usage/issues, rPPG/ECG concepts, signal processing flow, and vitals interpretation.' "
            "Keep responses concise and practical."
        )

        completion = client.chat.completions.create(
            model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            max_tokens=260,
        )
        content = (completion.choices[0].message.content or "").strip()
        logger.info(f"✅ OpenAI response generated for: {message[:40]}...")
        return content or None
    except Exception as e:
        logger.error(f"❌ OpenAI API Error: {type(e).__name__}: {str(e)}")
        return None


@app.get("/")
def read_root():
    return {"message": "Expluse API is running"}


@app.post("/api/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    normalized_email = user_data.email.strip().lower()
    normalized_username = user_data.username.strip()

    if not normalized_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required",
        )

    email_exists = (
        db.query(User.id)
        .filter(func.lower(User.email) == normalized_email)
        .first()
        is not None
    )
    username_exists = (
        db.query(User.id)
        .filter(func.lower(User.username) == normalized_username.lower())
        .first()
        is not None
    )

    if email_exists and username_exists:
        detail = "Email and username already registered"
    elif email_exists:
        detail = "Email already registered"
    elif username_exists:
        detail = "Username already registered"
    else:
        detail = ""

    if detail:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

    user = User(
        email=normalized_email,
        username=normalized_username,
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    identity = form_data.username.strip()
    password = form_data.password.strip()

    demo_aliases = {"demo", "demo@expluse.ai", "guest", "test"}
    if identity.lower() in demo_aliases and password == "demo123":
        user = db.query(User).filter(User.email == "demo@expluse.ai").first()
        if user is None:
            user = User(
                email="demo@expluse.ai",
                username="demo",
                hashed_password=get_password_hash("demo123"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    else:
        user = authenticate_user(db, identity, password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=expires_delta,
    )

    session = UserSession(
        user_id=user.id,
        session_token=access_token,
        expires_at=datetime.utcnow() + expires_delta,
        is_active=True,
    )
    db.add(session)
    db.commit()

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/api/analytics/history", response_model=List[AnalysisResponse])
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Analysis)
        .filter(Analysis.user_id == current_user.id)
        .order_by(Analysis.analysis_date.desc())
        .all()
    )


@app.post("/api/analyze", response_model=AnalysisResponse)
def analyze_health(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    heart_rate = 74.0
    oxygen_level = 98.0
    stress_level = 24.0
    respiratory_rate = 16.0
    systolic = 118
    diastolic = 76

    health_score = int(
        round(
            (
                max(0, 100 - abs(heart_rate - 75))
                + oxygen_level
                + max(0, 100 - stress_level)
                + max(0, 100 - abs(respiratory_rate - 16) * 5)
            )
            / 4
        )
    )

    if health_score >= 85:
        risk_level = "Low"
    elif health_score >= 70:
        risk_level = "Moderate"
    else:
        risk_level = "High"

    analysis = Analysis(
        user_id=current_user.id,
        heart_rate=heart_rate,
        oxygen_level=oxygen_level,
        stress_level=stress_level,
        respiratory_rate=respiratory_rate,
        blood_pressure_systolic=systolic,
        blood_pressure_diastolic=diastolic,
        health_score=health_score,
        risk_level=risk_level,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


@app.post("/predict", response_model=RPPGPredictResponse)
@app.post("/api/predict", response_model=RPPGPredictResponse)
def predict_rppg(
    payload: RPPGPredictRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    try:
        result = rppg_pipeline.predict(
            session_id=payload.session_id,
            frame_payloads=payload.frames,
            fps=payload.fps,
            model_preference=payload.model_preference,
            reset_session=payload.reset_session,
        )

        if (
            current_user is not None
            and result.face_detected
            and result.bpm > 0.0
            and result.respiratory_rate > 0.0
        ):
            latest = (
                db.query(Analysis)
                .filter(Analysis.user_id == current_user.id)
                .order_by(Analysis.analysis_date.desc())
                .first()
            )

            now = datetime.utcnow()
            should_record = (
                latest is None
                or (now - latest.analysis_date).total_seconds() >= 12
                or abs(float(latest.heart_rate) - float(result.bpm)) >= 2.5
            )

            if should_record:
                oxygen_level = max(94.0, min(100.0, 96.0 + float(result.confidence) * 4.0))
                stress_level = max(5.0, min(100.0, 85.0 - float(result.signal_quality) * 80.0))
                systolic = int(round(112 + (float(result.bpm) - 70.0) * 0.45))
                diastolic = int(round(72 + (float(result.bpm) - 70.0) * 0.22))

                health_score = int(
                    round(
                        (
                            max(0.0, 100.0 - abs(float(result.bpm) - 74.0) * 1.1)
                            + oxygen_level
                            + max(0.0, 100.0 - stress_level)
                            + max(0.0, 100.0 - abs(float(result.respiratory_rate) - 16.0) * 4.2)
                        )
                        / 4.0
                    )
                )

                if health_score >= 85:
                    risk_level = "Low"
                elif health_score >= 70:
                    risk_level = "Moderate"
                else:
                    risk_level = "High"

                analysis = Analysis(
                    user_id=current_user.id,
                    heart_rate=float(result.bpm),
                    oxygen_level=float(round(oxygen_level, 1)),
                    stress_level=float(round(stress_level, 1)),
                    respiratory_rate=float(result.respiratory_rate),
                    blood_pressure_systolic=systolic,
                    blood_pressure_diastolic=diastolic,
                    health_score=health_score,
                    risk_level=risk_level,
                )
                db.add(analysis)
                db.commit()

        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@app.post("/api/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    message = payload.message.lower().strip()

    blocked_keywords = [
        "sex",
        "sexual",
        "porn",
        "nude",
        "explicit",
    ]
    if any(keyword in message for keyword in blocked_keywords):
        return {"response": "Sorry, I can't assist with that.", "timestamp": datetime.utcnow()}

    try:
        ai_reply = _openai_scoped_chat(message)
        if ai_reply:
            return {"response": ai_reply, "timestamp": datetime.utcnow()}
    except Exception:
        pass

    # Fallback when OpenAI is unavailable
    return {
        "response": "I'm currently unavailable. Please try again or ask about: website usage, rPPG/ECG concepts, frame detection, or vitals interpretation.",
        "timestamp": datetime.utcnow(),
    }


@app.get("/api/analytics/{analysis_id}/report")
def download_report(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
    except ImportError as exc:
        raise HTTPException(
            status_code=500,
            detail="Report generation dependency is not installed",
        ) from exc

    analysis = (
        db.query(Analysis)
        .filter(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.setTitle(f"analysis-{analysis.id}")
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(72, 760, "Expluse Health Analysis Report")
    pdf.setFont("Helvetica", 11)

    lines = [
        f"User: {current_user.username} ({current_user.email})",
        f"Analysis Date: {analysis.analysis_date.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"Heart Rate: {analysis.heart_rate} bpm",
        f"Oxygen Level: {analysis.oxygen_level}%",
        f"Stress Level: {analysis.stress_level}%",
        f"Respiratory Rate: {analysis.respiratory_rate} breaths/min",
        (
            "Blood Pressure: "
            f"{analysis.blood_pressure_systolic}/{analysis.blood_pressure_diastolic} mmHg"
        ),
        f"Health Score: {analysis.health_score}/100",
        f"Risk Level: {analysis.risk_level}",
    ]

    y_position = 720
    for line in lines:
        pdf.drawString(72, y_position, line)
        y_position -= 24

    pdf.showPage()
    pdf.save()
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="analysis-{analysis.id}.pdf"'
        },
    )
