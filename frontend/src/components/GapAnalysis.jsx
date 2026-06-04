const PRIORITY_CONFIG = {
  critical: { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    badge: "bg-red-100 text-red-700",    dot: "bg-red-500",    label: "Critical" },
  high:     { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500", label: "High" },
  medium:   { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-400",  label: "Medium" },
};

export default function GapAnalysis({ data }) {
  const { owned_skills, gap_skills, role_match_percent, target_role_name, target_role_salary_lpa } = data;

  const getGrowthColor = (rate) => {
    if (rate >= 5)  return "text-green-600";
    if (rate >= 1)  return "text-green-500";
    if (rate === 0) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-6 bg-green-500 rounded-full"></div>
        <h2 className="text-lg font-bold text-gray-900">Skill Gap Analysis</h2>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">Role match</span>
          <span className={`text-xl font-extrabold ${role_match_percent >= 70 ? "text-green-600" : role_match_percent >= 40 ? "text-amber-600" : "text-red-600"}`}>
            {role_match_percent}%
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-6">
        Skills you have vs what <span className="font-semibold text-gray-600">{target_role_name}</span> requires (avg ₹{target_role_salary_lpa} LPA)
      </p>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>0% match</span>
          <span>100% match</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              role_match_percent >= 70 ? "bg-green-500" : role_match_percent >= 40 ? "bg-amber-400" : "bg-red-500"
            }`}
            style={{ width: `${role_match_percent}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">
          {owned_skills.filter(s => data.gap_skills.every(g => g.id !== s.id)).length} of {owned_skills.length + gap_skills.length} required skills covered
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SKILLS YOU HAVE */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h3 className="font-semibold text-gray-800 text-sm">Skills You Have</h3>
            <span className="ml-auto text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold">{owned_skills.length}</span>
          </div>
          <div className="space-y-2">
            {owned_skills.map(sk => (
              <div key={sk.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{sk.name}</p>
                  <p className={`text-xs ${getGrowthColor(sk.growth_rate)}`}>
                    {sk.growth_rate > 0 ? "+" : ""}{sk.growth_rate} market growth
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gray-700">{sk.demand_score}</p>
                  <p className="text-xs text-gray-400">demand</p>
                </div>
              </div>
            ))}
            {owned_skills.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl">No matching skills found</div>
            )}
          </div>
        </div>

        {/* SKILLS YOU NEED */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <h3 className="font-semibold text-gray-800 text-sm">Skills You Need</h3>
            <span className="ml-auto text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold">{gap_skills.length}</span>
          </div>
          <div className="space-y-2">
            {gap_skills.map(sk => {
              const cfg = PRIORITY_CONFIG[sk.priority] || PRIORITY_CONFIG.medium;
              return (
                <div key={sk.id} className={`p-3 rounded-xl border ${cfg.border} ${cfg.bg} hover:shadow-sm transition`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className={`font-semibold text-sm ${cfg.text}`}>{sk.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">~{sk.learn_weeks} weeks to learn</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>📊 Demand: <strong>{sk.demand_score}</strong></span>
                    <span className={getGrowthColor(sk.growth_rate)}>
                      {sk.growth_rate > 0 ? "↑" : sk.growth_rate < 0 ? "↓" : "→"} {sk.growth_rate > 0 ? "+" : ""}{sk.growth_rate}
                    </span>
                    <span>₹{sk.avg_salary_lpa} LPA</span>
                  </div>
                </div>
              );
            })}
            {gap_skills.length === 0 && (
              <div className="text-center py-6 text-green-600 text-sm bg-green-50 rounded-xl font-medium">
                🎉 You have all required skills for this role!
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}