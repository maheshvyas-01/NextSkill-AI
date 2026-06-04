"""
NextSkill AI — FastAPI Backend v2
Fixes:
  - path_summary quotes bug fixed
  - free_courses always returned in roadmap steps
  - advanced role suggestions when role_match = 100%
  - target_role_id in analyze response
  - /api/save-session persists to SQLite
  - /api/analytics for platform stats
  - /api/history/:session_id for past analyses
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json
import networkx as nx
import os

from database import (
    create_tables, get_db, save_analysis,
    AnalysisSession, SkillPopularity, RoleInterest,
)

app = FastAPI(title="NextSkill AI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

create_tables()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def load_data():
    path = os.path.join(BASE_DIR, "skills_data.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    skills_map = {s["id"]: s for s in data["skills"]}
    roles_map  = {
        rid: {**rd, "id": rid}
        for rid, rd in data["roles"].items()
    }
    return skills_map, roles_map


skills_map, roles_map = load_data()


# ─────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    current_skills:   list[str]
    experience_years: int
    target_role:      str

class RoadmapRequest(BaseModel):
    current_skills: list[str]
    target_role:    str

class OpportunityCostRequest(BaseModel):
    skill_a:        str
    skill_b:        str
    current_skills: list[str]
    target_role:    str

class SaveSessionRequest(BaseModel):
    session_id:       str
    analysis:         dict
    roadmap:          dict
    experience_years: int


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────
def build_graph():
    G = nx.DiGraph()
    for sid, sk in skills_map.items():
        G.add_node(sid)
        for adj in sk.get("adjacency", []):
            if adj in skills_map:
                G.add_edge(sid, adj, weight=skills_map[adj]["learn_weeks"])
    return G


def get_status(gr):
    if gr >= 5:   return "growing fast"
    if gr >= 1:   return "growing"
    if gr == 0:   return "stable"
    if gr >= -3:  return "slightly decaying"
    return "decaying"


# ─────────────────────────────────────────
# RISK SCORE
# ─────────────────────────────────────────
def compute_risk(current_skills, experience_years, target_role):
    owned = [skills_map[s] for s in current_skills if s in skills_map]

    # 1. Decay penalty 0–40
    decay = min(40, sum(abs(s.get("growth_rate", 0)) * 2 for s in owned if s.get("growth_rate", 0) < 0))

    # 2. Market demand 0–30
    avg_demand = (sum(s["demand_score"] for s in owned) / len(owned)) if owned else 0
    demand_contrib = round(30 - (avg_demand / 100) * 30)

    # 3. Role readiness 0–25
    required   = set(roles_map[target_role]["required_skills"])
    owned_ids  = set(current_skills)
    gap_count  = len(required - owned_ids)
    total_req  = len(required)
    readiness  = round((gap_count / total_req) * 25) if total_req else 0

    # 4. Experience 0–5
    exp_factor = 0 if experience_years >= 5 else 2 if experience_years >= 3 else 4 if experience_years >= 1 else 5

    risk_score = min(100, decay + demand_contrib + readiness + exp_factor)

    if   risk_score <= 25: label = "Low Risk"
    elif risk_score <= 50: label = "Medium Risk"
    elif risk_score <= 75: label = "High Risk"
    else:                   label = "Critical"

    decaying = [s for s in owned if s.get("growth_rate", 0) < 0]
    growing  = [s for s in owned if s.get("growth_rate", 0) >= 5]

    threat   = (f"Your {decaying[0]['name']} skill has decay rate {decaying[0]['growth_rate']}."
                if decaying else "No major decaying skills detected.")
    strength = (f"{growing[0]['name']} has demand {growing[0]['demand_score']} and is growing at +{growing[0]['growth_rate']}."
                if growing else "Maintain and diversify your current skill set.")

    gap_skills_out = []
    for gid in list(required - owned_ids):
        if gid not in skills_map: continue
        sk = skills_map[gid]
        d  = sk["demand_score"]
        gap_skills_out.append({
            "id": gid, "name": sk["name"],
            "demand_score": d, "learn_weeks": sk["learn_weeks"],
            "priority": "critical" if d >= 85 else "high" if d >= 65 else "medium",
            "growth_rate": sk.get("growth_rate", 0),
            "avg_salary_lpa": sk.get("avg_salary_lpa", 0),
        })
    gap_skills_out.sort(key=lambda x: x["demand_score"], reverse=True)

    role_match = round(((total_req - gap_count) / total_req) * 100) if total_req else 100

    return {
        "target_role_id":        target_role,
        "risk_score":            risk_score,
        "risk_label":            label,
        "risk_breakdown": {
            "skill_decay_penalty": decay,
            "market_demand":       demand_contrib,
            "role_readiness":      readiness,
            "experience_factor":   exp_factor,
        },
        "risk_explanation": {
            "summary": (f"You are at {label.lower()} career risk. "
                        f"You are missing {gap_count} of {total_req} required skills "
                        f"for the {roles_map[target_role]['name']} role."),
            "biggest_threat":   threat,
            "biggest_strength": strength,
        },
        "owned_skills": [
            {"id": s["id"], "name": s["name"], "demand_score": s["demand_score"],
             "growth_rate": s.get("growth_rate", 0), "status": get_status(s.get("growth_rate", 0)),
             "avg_salary_lpa": s.get("avg_salary_lpa", 0)}
            for s in owned
        ],
        "gap_skills":            gap_skills_out,
        "role_match_percent":    role_match,
        "target_role_name":      roles_map[target_role]["name"],
        "target_role_salary_lpa":roles_map[target_role]["avg_salary_lpa"],
    }


# ─────────────────────────────────────────
# ROADMAP ENGINE
# ─────────────────────────────────────────
def generate_roadmap(current_skills, target_role):
    if target_role not in roles_map:
        raise HTTPException(status_code=400, detail="Invalid target role")

    G        = build_graph()
    owned    = set(s for s in current_skills if s in skills_map)
    required = set(roles_map[target_role]["required_skills"])
    gap_ids  = list(required - owned)

    all_paths = []
    for gap in gap_ids:
        if gap not in skills_map: continue
        best_path, best_cost = None, float("inf")
        for source in owned:
            if source not in G: continue
            try:
                p = nx.dijkstra_path(G, source, gap, weight="weight")
                c = nx.dijkstra_path_length(G, source, gap, weight="weight")
                if c < best_cost:
                    best_cost, best_path = c, p
            except Exception:
                continue
        all_paths.append(best_path or [gap])

    final_path, seen = [], set()
    for path in all_paths:
        for s in path:
            if s not in seen:
                final_path.append(s)
                seen.add(s)
    final_path = [s for s in final_path if s not in owned and s in skills_map]

    roadmap, total_weeks = [], 0
    for i, sid in enumerate(final_path):
        sk     = skills_map[sid]
        is_gap = sid in gap_ids
        total_weeks += sk["learn_weeks"]
        roadmap.append({
            "step":               i + 1,
            "skill_id":           sid,
            "skill_name":         sk["name"],
            "learn_weeks":        sk["learn_weeks"],
            "difficulty":         sk["difficulty"],
            "demand_score":       sk["demand_score"],
            "growth_rate":        sk.get("growth_rate", 0),
            "is_bridge":          not is_gap,
            "is_gap_skill":       is_gap,
            "reason": (f"Required for {roles_map[target_role]['name']}."
                       if is_gap else "Bridge skill — unlocks advanced concepts."),
            "free_courses":       sk.get("free_courses", []),   # always included
            "job_readiness_boost":sk.get("job_readiness_boost", 10),
        })

    # FIX: plain string, no json.dumps
    path_names = []
    for s in list(owned)[:1]:
        if s in skills_map:
            path_names.append(skills_map[s]["name"])
    for s in final_path:
        if s in skills_map:
            path_names.append(skills_map[s]["name"])
    path_summary = " → ".join(path_names)

    return {
        "roadmap":             roadmap,
        "total_weeks":         total_weeks,
        "total_months":        round(total_weeks / 4),
        "path_summary":        path_summary,
        "gap_skills_count":    len(gap_ids),
        "bridge_skills_count": sum(1 for r in roadmap if r["is_bridge"]),
    }


# ─────────────────────────────────────────
# ADVANCED SUGGESTIONS (100% match)
# ─────────────────────────────────────────
def get_advanced_suggestions(current_skills, current_role_id):
    owned          = set(s for s in current_skills if s in skills_map)
    current_salary = roles_map[current_role_id]["avg_salary_lpa"]
    suggestions    = []

    for role_id, role in roles_map.items():
        if role_id == current_role_id: continue
        required = set(role["required_skills"])
        if not required: continue
        match = len(owned & required) / len(required)
        if match >= 0.3 and role["avg_salary_lpa"] >= current_salary:
            gap_skills = [
                {"id": gid, "name": skills_map[gid]["name"],
                 "learn_weeks": skills_map[gid]["learn_weeks"],
                 "difficulty": skills_map[gid]["difficulty"],
                 "free_courses": skills_map[gid].get("free_courses", [])}
                for gid in list(required - owned) if gid in skills_map
            ]
            suggestions.append({
                "role_id":               role_id,
                "role_name":             role["name"],
                "avg_salary_lpa":        role["avg_salary_lpa"],
                "salary_increase":       role["avg_salary_lpa"] - current_salary,
                "current_match_percent": round(match * 100),
                "skills_to_add":         gap_skills,
                "skills_gap_count":      len(gap_skills),
            })

    suggestions.sort(key=lambda x: (-x["salary_increase"], -x["current_match_percent"]))
    return suggestions[:4]


# ─────────────────────────────────────────
# OPPORTUNITY COST
# ─────────────────────────────────────────
def compute_roi(skill_id, current_skills, target_role):
    if skill_id not in skills_map: return None
    sk           = skills_map[skill_id]
    required     = roles_map.get(target_role, {}).get("required_skills", [])
    role_rel     = 1 if skill_id in required else 0
    roi          = ((sk["demand_score"] * 0.4) + (sk.get("growth_rate", 0) * 5)
                    + (sk.get("job_count_india", 0) / 5000) + (role_rel * 20)
                    - (sk["learn_weeks"] * 0.5))
    salary_impact = max(0.5, min(8, (sk.get("avg_salary_lpa", 6) - 6) / 2))
    return {
        "id": skill_id, "name": sk["name"],
        "roi_score":   round(roi, 1),
        "demand_score": sk["demand_score"],
        "growth_rate":  sk.get("growth_rate", 0),
        "learn_weeks":  sk["learn_weeks"],
        "job_count_india": sk.get("job_count_india", 0),
        "estimated_salary_impact_lpa": round(salary_impact, 1),
        "difficulty":   sk["difficulty"],
    }


# ─────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "skills_loaded": len(skills_map), "roles_loaded": len(roles_map)}

@app.get("/api/skills")
def get_skills():
    return list(skills_map.values())

@app.get("/api/roles")
def get_roles():
    return roles_map

@app.post("/api/analyze")
def analyze(data: AnalyzeRequest):
    if data.target_role not in roles_map:
        raise HTTPException(status_code=400, detail=f"Role '{data.target_role}' not found")
    result = compute_risk(data.current_skills, data.experience_years, data.target_role)
    try:
        rm = generate_roadmap(data.current_skills, data.target_role)
        result["roadmap_preview"]     = rm["roadmap"][:3]
        result["roadmap_total_weeks"] = rm["total_weeks"]
    except Exception:
        result["roadmap_preview"]     = []
        result["roadmap_total_weeks"] = 0
    result["advanced_suggestions"] = (
        get_advanced_suggestions(data.current_skills, data.target_role)
        if result["role_match_percent"] == 100 else []
    )
    return result

@app.post("/api/roadmap")
def roadmap(data: RoadmapRequest):
    return generate_roadmap(data.current_skills, data.target_role)

@app.post("/api/opportunity-cost")
def opportunity_cost(data: OpportunityCostRequest):
    if data.target_role not in roles_map:
        raise HTTPException(status_code=400, detail="Invalid target role")
    for sid in [data.skill_a, data.skill_b]:
        if sid not in skills_map:
            raise HTTPException(status_code=400, detail=f"Skill '{sid}' not found")
    ra = compute_roi(data.skill_a, data.current_skills, data.target_role)
    rb = compute_roi(data.skill_b, data.current_skills, data.target_role)
    winner = data.skill_a if ra["roi_score"] >= rb["roi_score"] else data.skill_b
    wd     = ra if winner == data.skill_a else rb
    ld     = rb if winner == data.skill_a else ra
    ts     = abs(ra["learn_weeks"] - rb["learn_weeks"])
    return {
        "skill_a": ra, "skill_b": rb,
        "winner": winner, "winner_name": wd["name"],
        "recommendation": (
            f"Learn {wd['name']} first. ROI score {wd['roi_score']} vs {ld['roi_score']}. "
            f"{wd['job_count_india']:,} jobs in India, ₹{wd['estimated_salary_impact_lpa']} LPA salary impact."
            + (f" Saves {ts} weeks vs {ld['name']}." if ts > 0 else "")
        ),
        "time_saved_weeks": ts,
    }

# DB endpoints
@app.post("/api/save-session")
def save_session_endpoint(data: SaveSessionRequest, db: Session = Depends(get_db)):
    try:
        analysis = {**data.analysis, "experience_years": data.experience_years}
        save_analysis(db, data.session_id, analysis, data.roadmap)
        return {"saved": True}
    except Exception as e:
        return {"saved": False, "error": str(e)}

@app.get("/api/analytics")
def analytics(db: Session = Depends(get_db)):
    total     = db.query(AnalysisSession).count()
    sessions  = db.query(AnalysisSession).all()
    avg_risk  = round(sum(s.risk_score for s in sessions) / total, 1) if total else 0
    top_roles = db.query(RoleInterest).order_by(RoleInterest.search_count.desc()).limit(5).all()
    top_owned = db.query(SkillPopularity).order_by(SkillPopularity.appear_count.desc()).limit(8).all()
    top_gaps  = db.query(SkillPopularity).order_by(SkillPopularity.gap_count.desc()).limit(8).all()
    return {
        "total_analyses":  total,
        "avg_risk_score":  avg_risk,
        "top_roles":       [{"role_id": r.role_id, "role_name": r.role_name, "count": r.search_count,
                              "avg_risk": round(r.avg_risk, 1), "avg_match": round(r.avg_match, 1)} for r in top_roles],
        "top_owned_skills":[{"skill_id": s.skill_id, "skill_name": s.skill_name, "count": s.appear_count} for s in top_owned],
        "top_gap_skills":  [{"skill_id": s.skill_id, "skill_name": s.skill_name, "count": s.gap_count} for s in top_gaps],
    }

@app.get("/api/history/{session_id}")
def session_history(session_id: str, db: Session = Depends(get_db)):
    records = (db.query(AnalysisSession)
               .filter(AnalysisSession.session_id == session_id)
               .order_by(AnalysisSession.created_at.desc())
               .limit(10).all())
    return [{
        "id": r.id, "target_role_name": r.target_role_name,
        "risk_score": r.risk_score, "risk_label": r.risk_label,
        "role_match_percent": r.role_match_percent,
        "roadmap_weeks": r.roadmap_weeks,
        "created_at": r.created_at.isoformat(),
        "current_skills": json.loads(r.current_skills_json or "[]"),
    } for r in records]