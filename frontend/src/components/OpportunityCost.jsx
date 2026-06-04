import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function ROIBar({ value, max = 120, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color || "#3d6bff" }}></div>
    </div>
  );
}

function SkillCard({ skill, isWinner }) {
  if (!skill) return null;
  const color = isWinner ? "#22c55e" : "#94a3b8";
  return (
    <div className={`relative flex-1 rounded-2xl border-2 p-5 transition-all ${isWinner ? "border-green-400 bg-green-50/40" : "border-gray-100 bg-gray-50/50"}`}>
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">✓ Recommended</span>
        </div>
      )}
      <div className="mt-2 mb-4 text-center">
        <h3 className="text-xl font-extrabold text-gray-900">{skill.name}</h3>
        <div className={`text-3xl font-black mt-1 ${isWinner ? "text-green-600" : "text-gray-500"}`}>{skill.roi_score}</div>
        <p className="text-xs text-gray-400">ROI Score</p>
      </div>
      <ROIBar value={skill.roi_score} color={color} />
      <div className="mt-4 space-y-2.5">
        {[
          ["Market Demand",  `${skill.demand_score}/100`],
          ["Growth Rate",    `${skill.growth_rate > 0 ? "+" : ""}${skill.growth_rate}`],
          ["Time to Learn",  `${skill.learn_weeks} weeks`],
          ["Difficulty",     skill.difficulty],
          ["Jobs in India",  (skill.job_count_india || 0).toLocaleString()],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className={`font-semibold text-gray-800 capitalize ${label === "Growth Rate" && skill.growth_rate < 0 ? "text-red-500" : label === "Growth Rate" && skill.growth_rate > 0 ? "text-green-600" : ""}`}>{val}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
          <span className="text-gray-500">Salary Impact</span>
          <span className="font-bold text-blue-700">+₹{skill.estimated_salary_impact_lpa} LPA</span>
        </div>
      </div>
    </div>
  );
}

export default function OpportunityCost({ gapSkills, allSkills, currentSkills, targetRole }) {
  const [skillA, setSkillA]   = useState("");
  const [skillB, setSkillB]   = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // FIX: use gap skills first, fall back to all skills if no gaps
  // This ensures the dropdown always has options even at 100% match
  const primaryOptions = gapSkills && gapSkills.length > 0 ? gapSkills : [];
  const secondaryOptions = allSkills && allSkills.length > 0 ? allSkills : [];
  // Merge: gap skills first (for relevance), then owned skills
  const allOptions = [
    ...primaryOptions,
    ...secondaryOptions.filter(s => !primaryOptions.find(g => g.id === s.id)),
  ];

  const handleCompare = async () => {
    if (!skillA || !skillB) { setError("Please select both skills to compare."); return; }
    if (skillA === skillB)  { setError("Please select two different skills."); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post(`${API}/api/opportunity-cost`, {
        skill_a:        skillA,
        skill_b:        skillB,
        current_skills: currentSkills,
        target_role:    targetRole,
      });
      setResult(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Comparison failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
        <h2 className="text-lg font-bold text-gray-900">Opportunity Cost Calculator</h2>
        <span className="ml-2 text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">USP Feature</span>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Can't decide what to learn first? Compare any two skills by ROI — market demand, growth rate, salary impact, and time to learn.
        {primaryOptions.length > 0 && (
          <span className="text-indigo-600 font-medium"> Your {primaryOptions.length} gap skill{primaryOptions.length > 1 ? "s" : ""} are pre-populated.</span>
        )}
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Skill A</label>
          <select
            value={skillA}
            onChange={e => setSkillA(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Select a skill...</option>
            {primaryOptions.length > 0 && (
              <optgroup label="── Skills You Need (Gap Skills)">
                {primaryOptions.map(sk => (
                  <option key={sk.id} value={sk.id}>{sk.name} — demand {sk.demand_score}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="── Skills You Have">
              {secondaryOptions.map(sk => (
                <option key={sk.id} value={sk.id}>{sk.name} — demand {sk.demand_score}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex items-end justify-center pb-0.5">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-base font-bold text-gray-500">VS</div>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Skill B</label>
          <select
            value={skillB}
            onChange={e => setSkillB(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Select a skill...</option>
            {primaryOptions.length > 0 && (
              <optgroup label="── Skills You Need (Gap Skills)">
                {primaryOptions.map(sk => (
                  <option key={sk.id} value={sk.id}>{sk.name} — demand {sk.demand_score}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="── Skills You Have">
              {secondaryOptions.map(sk => (
                <option key={sk.id} value={sk.id}>{sk.name} — demand {sk.demand_score}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <button
            onClick={handleCompare}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin"></div>
                Comparing...
              </span>
            ) : "Compare →"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      {result && (
        <div className="mt-6">
          <div className="flex gap-4 flex-col sm:flex-row">
            <SkillCard skill={result.skill_a} isWinner={result.winner === result.skill_a.id} />
            <SkillCard skill={result.skill_b} isWinner={result.winner === result.skill_b.id} />
          </div>

          <div className="mt-6 p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-indigo-900 mb-1">
                  AI Recommendation: Learn <span className="underline">{result.winner_name}</span> first
                </p>
                <p className="text-sm text-indigo-800 leading-relaxed">{result.recommendation}</p>
                {result.time_saved_weeks > 0 && (
                  <p className="text-xs text-indigo-600 font-semibold mt-2">
                    ⏱ Save {result.time_saved_weeks} weeks by choosing the right skill now
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}