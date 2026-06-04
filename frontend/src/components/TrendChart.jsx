import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, CartesianGrid } from "recharts";

const STATUS_CONFIG = {
  "growing fast":     { color: "#22c55e", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  "growing":          { color: "#86efac", bg: "bg-green-50",  text: "text-green-600", dot: "bg-green-400" },
  "stable":           { color: "#f59e0b", bg: "bg-amber-50",  text: "text-amber-700", dot: "bg-amber-400" },
  "slightly decaying":{ color: "#fb923c", bg: "bg-orange-50", text: "text-orange-700",dot: "bg-orange-400" },
  "decaying":         { color: "#ef4444", bg: "bg-red-50",    text: "text-red-700",   dot: "bg-red-500" },
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG["stable"];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-bold text-gray-900 mb-1">{d.name}</p>
      <p className="text-gray-600">Demand: <span className="font-semibold text-gray-900">{d.demand_score}/100</span></p>
      <p className="text-gray-600">Growth: <span className="font-semibold" style={{ color: cfg.color }}>{d.growth_rate > 0 ? "+" : ""}{d.growth_rate}</span></p>
      <p className="text-gray-600">Avg Salary: <span className="font-semibold text-gray-900">₹{d.avg_salary_lpa} LPA</span></p>
      <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>{d.status}</span>
    </div>
  );
};

export default function TrendChart({ skills }) {
  if (!skills || skills.length === 0) return null;

  const data = skills.map(sk => ({
    name: sk.name,
    demand_score: sk.demand_score,
    growth_rate: sk.growth_rate,
    status: sk.status || "stable",
    avg_salary_lpa: sk.avg_salary_lpa || 0,
  }));

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-6 bg-purple-500 rounded-full"></div>
        <h2 className="text-lg font-bold text-gray-900">Your Skill Market Value</h2>
      </div>
      <p className="text-sm text-gray-400 mb-6">How much the market values each of your skills right now</p>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="demand_score" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => {
              const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG["stable"];
              return <Cell key={i} fill={cfg.color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 mb-6">
        {Object.entries(STATUS_CONFIG).map(([label, cfg]) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`}></div>
            <span className="capitalize">{label}</span>
          </div>
        ))}
      </div>

      {/* Skills Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Skill</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Demand</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Growth</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Avg Salary</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((sk, i) => {
              const cfg = STATUS_CONFIG[sk.status] || STATUS_CONFIG["stable"];
              return (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">{sk.name}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${sk.demand_score}%`, background: cfg.color }}></div>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{sk.demand_score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold text-sm`} style={{ color: cfg.color }}>
                      {sk.growth_rate > 0 ? "+" : ""}{sk.growth_rate}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">
                    ₹{sk.avg_salary_lpa} LPA
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium capitalize ${cfg.bg} ${cfg.text}`}>
                      {sk.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}