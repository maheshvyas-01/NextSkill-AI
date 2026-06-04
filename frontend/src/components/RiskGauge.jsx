export default function RiskGauge({ data }) {
  const score = data.risk_score;
  const radius = 110;
  const cx = 160;
  const cy = 150;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getArcColor = () => {
    if (score <= 25) return "#22c55e";
    if (score <= 50) return "#f59e0b";
    if (score <= 75) return "#f97316";
    return "#ef4444";
  };

  const getLabelStyle = () => {
    if (score <= 25) return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" };
    if (score <= 50) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    if (score <= 75) return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" };
    return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
  };

  const ls = getLabelStyle();

  const breakdownMeta = {
    skill_decay_penalty: { label: "Skill Decay",    icon: "📉", tip: "Penalty from decaying skills" },
    market_demand:       { label: "Market Demand",  icon: "📊", tip: "Protection from high-demand skills" },
    role_readiness:      { label: "Role Readiness", icon: "🎯", tip: "Gap between current & target role" },
    experience_factor:   { label: "Experience",     icon: "⏱️", tip: "Years of experience protection" },
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
        <h2 className="text-lg font-bold text-gray-900">Career Risk Score</h2>
        <div className="ml-auto">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${ls.bg} ${ls.text} ${ls.border}`}>
            {data.risk_label}
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* SVG GAUGE */}
        <div className="flex-shrink-0">
          <svg width="320" height="185" viewBox="0 0 320 185" className="overflow-visible max-w-full">
            {/* Background track */}
            <path
              d={`M${cx - radius} ${cy} A${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="18"
              strokeLinecap="round"
            />
            {/* Colored arc */}
            <path
              d={`M${cx - radius} ${cy} A${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke={getArcColor()}
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }}
            />
            {/* Score text */}
            <text x={cx} y={cy - 16} textAnchor="middle" fontSize="52" fontWeight="800" fill="#111827" fontFamily="Inter, sans-serif">
              {score}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="13" fill="#9ca3af" fontFamily="Inter, sans-serif">
              out of 100
            </text>
            {/* Scale labels */}
            <text x={cx - radius - 8} y={cy + 22} textAnchor="middle" fontSize="11" fill="#22c55e" fontWeight="600">0</text>
            <text x={cx + radius + 8} y={cy + 22} textAnchor="middle" fontSize="11" fill="#ef4444" fontWeight="600">100</text>
          </svg>
        </div>

        {/* BREAKDOWN CARDS */}
        <div className="flex-1 w-full">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Risk Breakdown</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(data.risk_breakdown).map(([key, val]) => {
              const meta = breakdownMeta[key] || { label: key, icon: "📌", tip: "" };
              return (
                <div key={key} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{meta.icon}</span>
                    <span className="text-xs text-gray-500 font-medium">{meta.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{val}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{meta.tip}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* EXPLANATION */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="col-span-1 sm:col-span-3 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-sm font-semibold text-blue-900 mb-1">📋 Summary</p>
          <p className="text-sm text-blue-800">{data.risk_explanation.summary}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-xs font-semibold text-red-600 mb-1">⚠️ Biggest Threat</p>
          <p className="text-sm text-red-800">{data.risk_explanation.biggest_threat}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs font-semibold text-green-600 mb-1">✅ Biggest Strength</p>
          <p className="text-sm text-green-800">{data.risk_explanation.biggest_strength}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <p className="text-xs font-semibold text-purple-600 mb-1">💼 Target Salary</p>
          <p className="text-xl font-bold text-purple-800">₹{data.target_role_salary_lpa} LPA</p>
          <p className="text-xs text-purple-500">Market average for {data.target_role_name}</p>
        </div>
      </div>
    </section>
  );
}