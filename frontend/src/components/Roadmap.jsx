import { useState } from "react";

const DIFFICULTY_CONFIG = {
  easy:   { bg: "bg-green-100",  text: "text-green-700",  label: "Easy" },
  medium: { bg: "bg-amber-100",  text: "text-amber-700",  label: "Medium" },
  hard:   { bg: "bg-red-100",    text: "text-red-700",    label: "Hard" },
};

const PLATFORM_COLORS = {
  "Coursera":       { bg: "bg-blue-100",   text: "text-blue-700" },
  "YouTube":        { bg: "bg-red-100",    text: "text-red-700" },
  "freeCodeCamp":   { bg: "bg-purple-100", text: "text-purple-700" },
  "Kaggle":         { bg: "bg-teal-100",   text: "text-teal-700" },
  "NPTEL":          { bg: "bg-orange-100", text: "text-orange-700" },
  "MongoDB":        { bg: "bg-green-100",  text: "text-green-700" },
  "Redis":          { bg: "bg-red-100",    text: "text-red-700" },
  "Google":         { bg: "bg-blue-100",   text: "text-blue-700" },
  "Microsoft":      { bg: "bg-blue-100",   text: "text-blue-700" },
  "AWS":            { bg: "bg-amber-100",  text: "text-amber-700" },
  "GitHub":         { bg: "bg-gray-100",   text: "text-gray-700" },
  "Odin":           { bg: "bg-purple-100", text: "text-purple-700" },
  "JetBrains":      { bg: "bg-indigo-100", text: "text-indigo-700" },
  "PyTorch":        { bg: "bg-orange-100", text: "text-orange-700" },
  "roadmap":        { bg: "bg-indigo-100", text: "text-indigo-700" },
  "Spring":         { bg: "bg-green-100",  text: "text-green-700" },
  "learncpp":       { bg: "bg-gray-100",   text: "text-gray-700" },
  "Hacking":        { bg: "bg-red-100",    text: "text-red-700" },
  "Apple":          { bg: "bg-gray-100",   text: "text-gray-700" },
};

function getPlatformStyle(platform) {
  for (const key of Object.keys(PLATFORM_COLORS)) {
    if (platform.toLowerCase().includes(key.toLowerCase())) {
      return PLATFORM_COLORS[key];
    }
  }
  return { bg: "bg-gray-100", text: "text-gray-700" };
}

function StepCard({ step, index, isLast }) {
  const [open, setOpen] = useState(false);
  const dc         = DIFFICULTY_CONFIG[step.difficulty] || DIFFICULTY_CONFIG.medium;
  const hasCourses = Array.isArray(step.free_courses) && step.free_courses.length > 0;
  const growthPos  = step.growth_rate > 0;

  return (
    <div className="flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm z-10 shadow-md ${step.is_gap_skill ? "bg-blue-600" : "bg-gray-400"}`}>
          {index + 1}
        </div>
        {!isLast && <div className="w-0.5 bg-gray-200 flex-1 mt-1 mb-1"></div>}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-4 rounded-2xl border p-5 transition-all hover:shadow-sm ${step.is_gap_skill ? "border-blue-200 bg-blue-50/30" : "border-gray-100 bg-white"}`}>
        <div className="flex flex-wrap items-start gap-2 mb-3">
          <h3 className="font-bold text-gray-900 text-base flex-1">{step.skill_name}</h3>
          {step.is_gap_skill && (
            <span className="text-xs bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-semibold">Target Skill</span>
          )}
          {step.is_bridge && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full font-semibold">Bridge Skill</span>
          )}
        </div>

        {/* Metrics row */}
        <div className="flex flex-wrap gap-3 mb-3 text-sm text-gray-600">
          <span className="flex items-center gap-1 text-xs">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {step.learn_weeks} weeks
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dc.bg} ${dc.text}`}>{dc.label}</span>
          <span className="text-xs text-gray-600 flex items-center gap-1">
            📊 Demand: <strong>{step.demand_score}</strong>
          </span>
          <span className={`text-xs font-semibold ${growthPos ? "text-green-600" : step.growth_rate < 0 ? "text-red-500" : "text-amber-500"}`}>
            {growthPos ? "↑ Growing" : step.growth_rate < 0 ? "↓ Decaying" : "→ Stable"}
            {" "}({step.growth_rate > 0 ? "+" : ""}{step.growth_rate})
          </span>
          {step.job_readiness_boost > 0 && (
            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
              +{step.job_readiness_boost} job readiness
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400 italic mb-3">{step.reason}</p>

        {/* Free Courses */}
        {hasCourses ? (
          <div>
            <button
              onClick={() => setOpen(p => !p)}
              className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-800 transition"
            >
              <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
              {open ? "Hide" : "View"} Free Resources ({step.free_courses.length})
            </button>

            {open && (
              <div className="mt-3 flex flex-wrap gap-2">
                {step.free_courses.map((course, ci) => {
                  const ps = getPlatformStyle(course.platform);
                  return (
                    <a
                      key={ci}
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium hover:shadow-sm transition-all ${ps.bg} ${ps.text}`}
                    >
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                      <span className="font-semibold">{course.platform}</span>
                      <span className="opacity-70 hidden sm:inline truncate max-w-[160px]">— {course.title}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-300 italic">No free courses linked for this skill</p>
        )}
      </div>
    </div>
  );
}

export default function Roadmap({ data, role }) {
  if (!data || !data.roadmap) return null;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
        <h2 className="text-lg font-bold text-gray-900">Your Learning Roadmap</h2>
      </div>
      <p className="text-sm text-gray-400 mb-2">
        Fastest path to <span className="font-semibold text-gray-700">{role}</span> — computed using Dijkstra's algorithm on the skill adjacency graph
      </p>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-4 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="text-center">
          <p className="text-2xl font-extrabold text-gray-900">{data.total_weeks}</p>
          <p className="text-xs text-gray-400">total weeks</p>
        </div>
        <div className="w-px bg-gray-200 hidden sm:block"></div>
        <div className="text-center">
          <p className="text-2xl font-extrabold text-blue-600">{data.total_months}</p>
          <p className="text-xs text-gray-400">months</p>
        </div>
        <div className="w-px bg-gray-200 hidden sm:block"></div>
        <div className="text-center">
          <p className="text-2xl font-extrabold text-gray-900">{data.gap_skills_count || 0}</p>
          <p className="text-xs text-gray-400">target skills</p>
        </div>
        <div className="w-px bg-gray-200 hidden sm:block"></div>
        <div className="text-center">
          <p className="text-2xl font-extrabold text-gray-500">{data.bridge_skills_count || 0}</p>
          <p className="text-xs text-gray-400">bridge skills</p>
        </div>
        {data.path_summary && (
          <div className="flex-1 hidden md:flex items-center min-w-0">
            <p className="text-xs text-gray-500 italic truncate">"{data.path_summary}"</p>
          </div>
        )}
      </div>

      {data.roadmap.length === 0 ? (
        <div className="text-center py-10 text-green-600 text-base font-semibold bg-green-50 rounded-2xl">
          🎉 You already have all the skills needed for this role!
        </div>
      ) : (
        <div>
          {data.roadmap.map((step, i) => (
            <StepCard
              key={step.skill_id + i}
              step={step}
              index={i}
              isLast={i === data.roadmap.length - 1}
            />
          ))}
          <div className="mt-2 flex items-center gap-3 p-5 bg-blue-600 rounded-2xl text-white">
            <span className="text-2xl flex-shrink-0">🏁</span>
            <div>
              <p className="font-bold text-lg">You're ready for <span className="underline">{role}</span></p>
              <p className="text-sm text-blue-200 mt-0.5">
                Total journey: {data.total_weeks} weeks ({data.total_months} months) · {data.roadmap.length} skills to learn
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}