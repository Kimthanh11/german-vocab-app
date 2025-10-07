// OldLessons.jsx
import React from "react";

export default function OldLessons({ lessons, onOpenLesson, onDeleteLesson }) {
  return (
    <div className="w-full max-w-xl bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 text-center">Old Lessons</h2>
      {lessons.length ? (
        <ul className="grid gap-2">
          {lessons.map((l) => (
            <li
              key={l.id}
              className="border rounded p-3 hover:bg-gray-50 cursor-pointer group"
              onClick={() => onOpenLesson(l)}
              title="Open lesson"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold">{l.title}</div>
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {(l.content || "").trim().split(/\n\s*\n+/)[0]}
                  </div>
                </div>
                <button
                  className="shrink-0 px-2 py-1 text-xs rounded bg-red-50 text-red-600 border border-red-200 opacity-0 group-hover:opacity-100 transition"
                  onClick={(e) => { e.stopPropagation(); onDeleteLesson(l.id); }}
                  aria-label="Delete lesson"
                  title="Delete lesson"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center">No lessons yet.</p>
      )}
    </div>
  );
}
