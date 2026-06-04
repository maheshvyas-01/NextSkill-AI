export default function AdvancedRoles({ suggestions, currentRole }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-6 bg-yellow-400 rounded-full"></div>
        <h2 className="text-lg font-bold text-gray-900">Level Up — What's Next?</h2>
        <span className="ml-2 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">
          🎉 You've mastered {currentRole}!
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        You already have all the required skills for <strong>{currentRole}</strong>. Here are the most valuable roles you can target next — ranked by salary increase and how many skills you already have.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {suggestions.map((role, i) => (
          <div
            key={role.role_id}
            className={`relative rounded-2xl border-2 p-5 ${
              i === 0
                ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            {i === 0 && (
              <div className="absolute -top-3 left-5">
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                  ⭐ Best Next Step
                </span>
              </div>
            )}

            <div className="mt-2 flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{role.role_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">You already match {role.current_match_percent}% of requirements</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-extrabold text-gray-900">₹{role.avg_salary_lpa} LPA</p>
                <p className="text-xs text-green-600 font-semibold">+₹{role.salary_increase} LPA</p>
              </div>
            </div>

            {/* Match progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Skills match</span>
                <span className="font-semibold text-gray-600">{role.current_match_percent}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${role.current_match_percent}%` }}
                ></div>
              </div>
            </div>

            {/* Skills to add */}
            {role.skills_to_add && role.skills_to_add.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  SKILLS TO ADD ({role.skills_gap_count})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {role.skills_to_add.map(sk => (
                    <div key={sk.id} className="flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-lg">
                      <span>{sk.name}</span>
                      <span className="text-gray-400">· {sk.learn_weeks}w</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
        <strong>💡 Pro Tip:</strong> Use the <strong>Opportunity Cost Calculator</strong> below to compare which skill to learn first for your next target role.
      </div>
    </section>
  );
}