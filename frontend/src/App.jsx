import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

import RiskGauge from "./components/RiskGauge";
import TrendChart from "./components/TrendChart";
import GapAnalysis from "./components/GapAnalysis";
import Roadmap from "./components/Roadmap";
import OpportunityCost from "./components/OpportunityCost";
import AdvancedRoles from "./components/AdvancedRoles";
import HistoryPanel from "./components/HistoryPanel";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DOMAINS = ["all","programming","frontend","backend","database","devops","cloud","ai","data","mobile","tools","architecture","system"];

// Generate or retrieve a persistent session UUID for this browser
function getSessionId() {
  let sid = localStorage.getItem("nextskill_session_id");
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("nextskill_session_id", sid);
  }
  return sid;
}

export default function App() {
  const [skills, setSkills]                 = useState([]);
  const [roles, setRoles]                   = useState({});
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [experience, setExperience]         = useState(null);
  const [targetRole, setTargetRole]         = useState("");
  const [loading, setLoading]               = useState(false);
  const [initError, setInitError]           = useState(null);
  const [analyzeError, setAnalyzeError]     = useState(null);
  const [analysis, setAnalysis]             = useState(null);
  const [roadmap, setRoadmap]               = useState(null);
  const [view, setView]                     = useState("form");
  const [domainFilter, setDomainFilter]     = useState("all");
  const [skillSearch, setSkillSearch]       = useState("");
  const [validationMsg, setValidationMsg]   = useState("");
  const [showHistory, setShowHistory]       = useState(false);
  const [analytics, setAnalytics]           = useState(null);

  const sessionId = getSessionId();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [skillsRes, rolesRes] = await Promise.all([
          axios.get(`${API}/api/skills`),
          axios.get(`${API}/api/roles`),
        ]);
        setSkills(skillsRes.data);
        setRoles(rolesRes.data);
        // Load analytics silently for the history panel
        const analyticsRes = await axios.get(`${API}/api/analytics`);
        setAnalytics(analyticsRes.data);
      } catch {
        setInitError("Could not connect to the server. Make sure the backend is running on port 8000.");
      }
    };
    fetchData();
  }, []);

  const toggleSkill = (skillId) => {
    setSelectedSkills(prev =>
      prev.includes(skillId) ? prev.filter(s => s !== skillId) : [...prev, skillId]
    );
    setValidationMsg("");
  };

  const handleAnalyze = async () => {
    if (selectedSkills.length === 0) { setValidationMsg("Please select at least 1 skill to continue."); return; }
    if (experience === null)          { setValidationMsg("Please select your experience level."); return; }
    if (!targetRole)                  { setValidationMsg("Please select a target role."); return; }

    setLoading(true);
    setAnalyzeError(null);
    try {
      const [analyzeRes, roadmapRes] = await Promise.all([
        axios.post(`${API}/api/analyze`, {
          current_skills:  selectedSkills,
          experience_years: experience,
          target_role:     targetRole,
        }),
        axios.post(`${API}/api/roadmap`, {
          current_skills: selectedSkills,
          target_role:    targetRole,
        }),
      ]);

      setAnalysis(analyzeRes.data);
      setRoadmap(roadmapRes.data);
      setView("dashboard");
      window.scrollTo(0, 0);

      // Save to database in background (don't block UI)
      axios.post(`${API}/api/save-session`, {
        session_id:       sessionId,
        analysis:         analyzeRes.data,
        roadmap:          roadmapRes.data,
        experience_years: experience,
      }).catch(() => {}); // silent fail — DB save is non-critical

      // Refresh analytics
      axios.get(`${API}/api/analytics`).then(r => setAnalytics(r.data)).catch(() => {});

    } catch (err) {
      setAnalyzeError(err?.response?.data?.detail || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = () => {
    setView("form");
    setAnalysis(null);
    setRoadmap(null);
    setAnalyzeError(null);
    window.scrollTo(0, 0);
  };

  const filteredSkills = skills.filter(sk => {
    const matchDomain = domainFilter === "all" || sk.domain === domainFilter;
    const matchSearch = sk.name.toLowerCase().includes(skillSearch.toLowerCase());
    return matchDomain && matchSearch;
  });

  // ── INIT ERROR ──
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-red-100">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-500 text-sm mb-6">{initError}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition">Try Again</button>
        </div>
      </div>
    );
  }

  // ── LOADING ──
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 spin"></div>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">Analyzing your career profile</p>
          <p className="text-sm text-gray-400 mt-1">Running risk algorithm · Building skill graph · Computing roadmap…</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // FORM VIEW
  // ══════════════════════════════════════════
  if (view === "form") {
    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #f8faff 60%, #fff 100%)" }}>
        {/* HEADER */}
        <header className="border-b border-blue-100 bg-white/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <span className="font-bold text-gray-900 text-lg">NextSkill AI</span>
              <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Beta</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {analytics && analytics.total_analyses > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  {analytics.total_analyses} analyses run
                </div>
              )}
              <button
                onClick={() => setShowHistory(p => !p)}
                className="flex items-center gap-1.5 text-sm text-blue-600 font-medium border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
              >
                📋 History
              </button>
            </div>
          </div>
        </header>

        {/* History Panel */}
        {showHistory && (
          <div className="max-w-5xl mx-auto px-6 pt-4">
            <HistoryPanel sessionId={sessionId} onClose={() => setShowHistory(false)} />
          </div>
        )}

        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* HERO */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-3">
              Your career GPS<br />
              <span className="text-blue-600">for the AI era</span>
            </h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Predict your career risk, discover decaying vs growing skills, and get the
              shortest learning path to your dream role — powered by real market data.
            </p>
            {analytics && analytics.total_analyses > 0 && (
              <div className="mt-4 inline-flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-6 py-3 shadow-sm text-sm text-gray-600">
                <span>🔥 <strong>{analytics.total_analyses}</strong> career analyses done</span>
                <span className="w-px h-4 bg-gray-200"></span>
                <span>⚡ Avg risk score: <strong>{analytics.avg_risk_score}/100</strong></span>
                {analytics.top_roles[0] && (
                  <>
                    <span className="w-px h-4 bg-gray-200"></span>
                    <span>🎯 Most targeted: <strong>{analytics.top_roles[0].role_name}</strong></span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* STEPS */}
          <div className="flex items-center justify-center gap-3 mb-10">
            {["Your Skills","Experience","Target Role"].map((s,i) => (
              <div key={s} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{i+1}</div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">{s}</span>
                </div>
                {i < 2 && <div className="w-8 h-px bg-gray-300"></div>}
              </div>
            ))}
          </div>

          <div className="space-y-8">
            {/* STEP 1: SKILLS */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Your Current Skills</h2>
                  <p className="text-xs text-gray-400">Select all technologies you know</p>
                </div>
                {selectedSkills.length > 0 && (
                  <span className="ml-auto bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">{selectedSkills.length} selected</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                />
                <select
                  value={domainFilter}
                  onChange={e => setDomainFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 capitalize"
                >
                  {DOMAINS.map(d => <option key={d} value={d}>{d === "all" ? "All Domains" : d}</option>)}
                </select>
              </div>

              {skills.length === 0 ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-6 justify-center">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full spin"></div>
                  Loading skills...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto pr-1">
                  {filteredSkills.map(skill => {
                    const sel = selectedSkills.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        onClick={() => toggleSkill(skill.id)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all duration-150 ${
                          sel ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {skill.name}{sel && <span className="ml-1.5 text-blue-200">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedSkills.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2 font-medium">SELECTED</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSkills.map(sid => {
                      const sk = skills.find(s => s.id === sid);
                      return sk ? (
                        <span key={sid} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-medium">
                          {sk.name}
                          <button onClick={() => toggleSkill(sid)} className="text-blue-400 hover:text-blue-700 ml-0.5">×</button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* STEP 2: EXPERIENCE */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Experience Level</h2>
                  <p className="text-xs text-gray-400">How long have you been working in tech?</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label:"Fresher", sub:"0–1 years", val:0, icon:"🌱" },
                  { label:"Junior",  sub:"1–3 years", val:2, icon:"🚀" },
                  { label:"Mid-level",sub:"3–5 years",val:4, icon:"⚡" },
                  { label:"Senior",  sub:"5+ years",  val:6, icon:"🏆" },
                ].map(({ label, sub, val, icon }) => (
                  <button
                    key={label}
                    onClick={() => { setExperience(val); setValidationMsg(""); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${experience === val ? "border-blue-600 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-blue-200"}`}
                  >
                    <div className="text-2xl mb-2">{icon}</div>
                    <div className={`font-semibold text-sm ${experience === val ? "text-blue-700" : "text-gray-800"}`}>{label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* STEP 3: ROLE */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Target Role</h2>
                  <p className="text-xs text-gray-400">Where do you want your career to go?</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(roles).map(([roleId, roleData]) => (
                  <button
                    key={roleId}
                    onClick={() => { setTargetRole(roleId); setValidationMsg(""); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${targetRole === roleId ? "border-blue-600 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-blue-200"}`}
                  >
                    <div className={`font-semibold text-sm ${targetRole === roleId ? "text-blue-700" : "text-gray-800"}`}>{roleData.name}</div>
                    <div className="text-xs text-gray-400 mt-1">Avg ₹{roleData.avg_salary_lpa} LPA · {roleData.required_skills.length} core skills</div>
                  </button>
                ))}
              </div>
            </section>

            {validationMsg && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
                {validationMsg}
              </div>
            )}
            {analyzeError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{analyzeError}</div>
            )}

            <button
              onClick={handleAnalyze}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-200 transition-all duration-150"
            >
              Analyze My Career →
            </button>
            <p className="text-center text-xs text-gray-400 pb-6">
              Powered by graph-based skill adjacency · market trend scoring · explainable AI risk algorithm
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // DASHBOARD VIEW
  // ══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">NextSkill AI</h1>
              <p className="text-xs text-gray-400">Career Risk Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-400">Target: </span>
              <span className="font-semibold text-gray-800">{analysis.target_role_name}</span>
              <span className="ml-3 text-gray-400">Match: </span>
              <span className={`font-semibold ${analysis.role_match_percent >= 70 ? "text-green-600" : analysis.role_match_percent >= 40 ? "text-amber-600" : "text-red-600"}`}>
                {analysis.role_match_percent}%
              </span>
            </div>
            <button
              onClick={handleReanalyze}
              className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
            >
              ← Re-analyze
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 fade-in">
        <RiskGauge data={analysis} />
        <TrendChart skills={analysis.owned_skills} />
        <GapAnalysis data={analysis} />
        <Roadmap data={roadmap} role={analysis.target_role_name} />

        {/* Advanced roles when 100% match */}
        {analysis.advanced_suggestions && analysis.advanced_suggestions.length > 0 && (
          <AdvancedRoles suggestions={analysis.advanced_suggestions} currentRole={analysis.target_role_name} />
        )}

        <OpportunityCost
          gapSkills={analysis.gap_skills}
          allSkills={analysis.owned_skills}
          currentSkills={selectedSkills}
          targetRole={targetRole}
        />
      </div>

      <footer className="text-center text-xs text-gray-400 py-8 border-t border-gray-100 mt-4">
        NextSkill AI · Built for the future of work · All market data is curated for the Indian tech market
      </footer>
    </div>
  );
}