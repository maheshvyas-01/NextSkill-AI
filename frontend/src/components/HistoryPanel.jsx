import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://nextskill-backend-iiy6.onrender.com";

const RISK_COLOR = {
  "Low Risk":    { bg: "bg-green-100",  text: "text-green-700" },
  "Medium Risk": { bg: "bg-amber-100",  text: "text-amber-700" },
  "High Risk":   { bg: "bg-orange-100", text: "text-orange-700" },
  "Critical":    { bg: "bg-red-100",    text: "text-red-700" },
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPanel({ sessionId, onClose }) {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/history/${sessionId}`),
      axios.get(`${API}/api/analytics`),
    ]).then(([hRes, aRes]) => {
      setHistory(hRes.data);
      setAnalytics(aRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md mb-6">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-900">📋 Your Analysis History</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{history.length} records</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg font-bold transition">×</button>
      </div>

      {/* Platform analytics */}
      {analytics && analytics.total_analyses > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Platform Insights</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm mb-3">
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <p className="text-2xl font-extrabold text-blue-600">{analytics.total_analyses}</p>
              <p className="text-xs text-gray-400">Total Analyses</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <p className="text-2xl font-extrabold text-orange-500">{analytics.avg_risk_score}</p>
              <p className="text-xs text-gray-400">Avg Risk Score</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <p className="text-2xl font-extrabold text-green-600">{analytics.top_roles.length}</p>
              <p className="text-xs text-gray-400">Popular Roles</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <p className="text-2xl font-extrabold text-purple-600">{analytics.top_gap_skills.length}</p>
              <p className="text-xs text-gray-400">Common Gaps</p>
            </div>
          </div>

          {analytics.top_roles.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-400 font-medium mb-1.5">🎯 Most Targeted Roles</p>
              <div className="flex flex-wrap gap-1.5">
                {analytics.top_roles.map(r => (
                  <div key={r.role_id} className="flex items-center gap-1.5 bg-white border border-gray-200 text-xs px-2.5 py-1 rounded-lg">
                    <span className="font-medium text-gray-700">{r.role_name}</span>
                    <span className="text-gray-400">{r.count}x</span>
                    <span className={`px-1.5 rounded text-xs font-semibold ${r.avg_risk <= 25 ? "bg-green-50 text-green-600" : r.avg_risk <= 50 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                      {r.avg_risk} risk
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.top_gap_skills.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1.5">⚠️ Most Common Skill Gaps</p>
              <div className="flex flex-wrap gap-1.5">
                {analytics.top_gap_skills.slice(0,6).map(s => (
                  <span key={s.skill_id} className="bg-red-50 text-red-600 border border-red-100 text-xs px-2.5 py-1 rounded-lg font-medium">
                    {s.skill_name} <span className="text-red-400">({s.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User's history */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm justify-center py-6">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full spin"></div>
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p className="text-3xl mb-2">🔍</p>
            <p>No past analyses yet. Run your first analysis above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((rec, i) => {
              const rc = RISK_COLOR[rec.risk_label] || RISK_COLOR["Medium Risk"];
              return (
                <div key={rec.id} className={`flex items-center justify-between p-4 rounded-xl border ${i === 0 ? "border-blue-100 bg-blue-50/30" : "border-gray-100 bg-gray-50"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{rec.target_role_name}</span>
                      {i === 0 && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Latest</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(rec.created_at)}</p>
                    {rec.current_skills && rec.current_skills.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{rec.current_skills.length} skills · {rec.roadmap_weeks} weeks roadmap</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-gray-900">{rec.risk_score}</p>
                      <p className="text-xs text-gray-400">risk</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rc.bg} ${rc.text}`}>
                      {rec.risk_label}
                    </span>
                    <div className="text-right">
                      <p className="text-base font-bold text-green-600">{rec.role_match_percent}%</p>
                      <p className="text-xs text-gray-400">match</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}