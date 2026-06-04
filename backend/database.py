"""
NextSkill AI — Database Layer
Uses SQLite (zero setup) + SQLAlchemy ORM.
File: nextskill_data.db is auto-created in the backend folder on first run.
"""

from sqlalchemy import (
    create_engine, Column, Integer, String, Float,
    DateTime, Text, Boolean
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "nextskill_data.db")

engine       = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()


# ─────────────────────────────────────────
# TABLE 1 — Analysis Sessions
# Every time a user clicks "Analyze My Career" we store the full result.
# This gives us: who analyzed what, risk trends, popular roles, etc.
# ─────────────────────────────────────────
class AnalysisSession(Base):
    __tablename__ = "analysis_sessions"

    id                  = Column(Integer, primary_key=True, index=True)
    session_id          = Column(String, index=True)           # browser-generated UUID
    target_role         = Column(String, index=True)
    target_role_name    = Column(String)
    experience_years    = Column(Integer)
    risk_score          = Column(Float)
    risk_label          = Column(String)
    role_match_percent  = Column(Float)
    current_skills_json = Column(Text)                         # JSON list of skill IDs
    gap_skills_json     = Column(Text)                         # JSON list of gap skill IDs
    roadmap_weeks       = Column(Integer)
    created_at          = Column(DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────
# TABLE 2 — Skill Popularity Counter
# Every analysis increments a counter for each skill the user has.
# We can then show "most in-demand skills among NextSkill users" — great for the demo.
# ─────────────────────────────────────────
class SkillPopularity(Base):
    __tablename__ = "skill_popularity"

    id           = Column(Integer, primary_key=True, index=True)
    skill_id     = Column(String, unique=True, index=True)
    skill_name   = Column(String)
    appear_count = Column(Integer, default=0)   # how many users have this skill
    gap_count    = Column(Integer, default=0)   # how many users are missing this skill


# ─────────────────────────────────────────
# TABLE 3 — Role Interest Tracker
# Counts how many users targeted each role.
# ─────────────────────────────────────────
class RoleInterest(Base):
    __tablename__ = "role_interest"

    id          = Column(Integer, primary_key=True, index=True)
    role_id     = Column(String, unique=True, index=True)
    role_name   = Column(String)
    search_count= Column(Integer, default=0)
    avg_risk    = Column(Float, default=0.0)
    avg_match   = Column(Float, default=0.0)
    total_analyzed = Column(Integer, default=0)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────
# HELPER — Save a full analysis to DB
# ─────────────────────────────────────────
def save_analysis(db, session_id: str, analysis: dict, roadmap: dict):
    # 1. Save the session record
    record = AnalysisSession(
        session_id         = session_id,
        target_role        = analysis.get("target_role_id", ""),
        target_role_name   = analysis.get("target_role_name", ""),
        experience_years   = analysis.get("experience_years", 0),
        risk_score         = analysis.get("risk_score", 0),
        risk_label         = analysis.get("risk_label", ""),
        role_match_percent = analysis.get("role_match_percent", 0),
        current_skills_json= json.dumps([s["id"] for s in analysis.get("owned_skills", [])]),
        gap_skills_json    = json.dumps([s["id"] for s in analysis.get("gap_skills", [])]),
        roadmap_weeks      = roadmap.get("total_weeks", 0),
    )
    db.add(record)

    # 2. Update skill popularity counters
    owned_ids = [s["id"] for s in analysis.get("owned_skills", [])]
    gap_ids   = [s["id"] for s in analysis.get("gap_skills", [])]

    for sid in owned_ids:
        row = db.query(SkillPopularity).filter_by(skill_id=sid).first()
        if row:
            row.appear_count += 1
        else:
            db.add(SkillPopularity(
                skill_id    = sid,
                skill_name  = next((s["name"] for s in analysis.get("owned_skills", []) if s["id"] == sid), sid),
                appear_count= 1,
                gap_count   = 0,
            ))

    for sid in gap_ids:
        row = db.query(SkillPopularity).filter_by(skill_id=sid).first()
        if row:
            row.gap_count += 1
        else:
            db.add(SkillPopularity(
                skill_id  = sid,
                skill_name= next((s["name"] for s in analysis.get("gap_skills", []) if s["id"] == sid), sid),
                appear_count=0,
                gap_count = 1,
            ))

    # 3. Update role interest
    role_id   = analysis.get("target_role_id", "")
    role_name = analysis.get("target_role_name", "")
    role_row  = db.query(RoleInterest).filter_by(role_id=role_id).first()
    if role_row:
        n = role_row.total_analyzed + 1
        role_row.search_count  += 1
        role_row.avg_risk       = ((role_row.avg_risk * role_row.total_analyzed) + analysis.get("risk_score", 0)) / n
        role_row.avg_match      = ((role_row.avg_match * role_row.total_analyzed) + analysis.get("role_match_percent", 0)) / n
        role_row.total_analyzed = n
    else:
        db.add(RoleInterest(
            role_id      = role_id,
            role_name    = role_name,
            search_count = 1,
            avg_risk     = analysis.get("risk_score", 0),
            avg_match    = analysis.get("role_match_percent", 0),
            total_analyzed=1,
        ))

    db.commit()