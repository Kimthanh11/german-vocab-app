// OldLessons.jsx
import React, { useMemo } from "react";

/* ---- helpers ---- */
function toPlainObject(maybeMap) {
  if (!maybeMap) return {};
  if (maybeMap instanceof Map) return Object.fromEntries(maybeMap.entries());
  if (typeof maybeMap.toObject === "function") return maybeMap.toObject();
  return { ...maybeMap };
}

function annotateText(raw, dictInput) {
  if (!raw) return "";
  const dict = toPlainObject(dictInput);

  const wrapTerms = (text) => {
    const terms = Object.keys(dict || {}).sort((a, b) => b.length - a.length);
    let out = text;

    for (const term of terms) {
      const label = (term ?? "").trim();
      const meaning = dict[term];
      if (!label || !meaning) continue;

      const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const useWordBoundary = /^[\p{L}\p{N}_]+$/u.test(label);
      const pattern = useWordBoundary ? `\\b${esc}\\b` : esc;
      const re = new RegExp(pattern, "gi");

      out = out.replace(
        re,
        (m) => `
          <span class="relative group underline decoration-dotted cursor-help inline text-indigo-700">
            ${m}
            <span class="pointer-events-none absolute left-0 -top-8 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow z-20">
              ${String(meaning)}
            </span>
          </span>`
      );
    }
    return out.replace(/\n/g, " ");
  };

  return raw
    .trim()
    .split(/\n\s*\n+/)
    .map((p) => `<p>${wrapTerms(p)}</p>`)
    .join("");
}

/* ---- card ---- */
function LessonCard({ lesson, onOpenLesson, onDeleteLesson }) {
  const dict = toPlainObject(lesson?.dict);
  const html = useMemo(
    () => annotateText(lesson?.content || "", dict),
    [lesson?.content, JSON.stringify(dict)]
  );

  const when =
    lesson?.updatedAt || lesson?.createdAt
      ? new Date(lesson.updatedAt || lesson.createdAt).toLocaleString()
      : "";

  return (
    <div className="border rounded p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-lg break-words">
            {lesson?.title || "Untitled"}
          </h3>
          {when && <p className="text-xs text-gray-500">{when}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            className="px-2 py-1 text-sm border rounded hover:bg-gray-50"
            onClick={() => onOpenLesson?.(lesson)}
            title="Open in editor"
          >
            Open
          </button>
          <button
            className="px-2 py-1 text-sm border rounded text-red-600 hover:bg-red-50"
            onClick={() => onDeleteLesson?.(lesson.id)}
            title="Delete lesson"
          >
            Delete
          </button>
        </div>
      </div>

      <div
        className="mt-3 leading-7 whitespace-normal break-words line-clamp-2"
        // NOTE: In production, sanitize if you accept untrusted input.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/* ---- list ---- */
export default function OldLessons({ lessons = [], onOpenLesson, onDeleteLesson }) {
  if (!lessons.length) {
    return (
      <div className="w-full max-w-3xl text-center text-gray-500">
        No lessons yet.
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl grid gap-4">
      {lessons.map((l) => (
        <LessonCard
          key={l.id}
          lesson={l}
          onOpenLesson={onOpenLesson}
          onDeleteLesson={onDeleteLesson}
        />
      ))}
    </div>
  );
}
