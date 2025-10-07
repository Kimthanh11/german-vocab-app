import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------- Safe helpers ---------- */

// Convert Map | object | null → plain object
function toPlainObject(maybeMap) {
  if (!maybeMap) return {};
  if (maybeMap instanceof Map) return Object.fromEntries(maybeMap.entries());
  // If mongoose Map-like (has .toObject), use it
  if (typeof maybeMap.toObject === "function") return maybeMap.toObject();
  return { ...maybeMap };
}

// Annotate text with inline tooltips.
// - Keeps paragraph breaks (blank line = <p>)
// - Never inserts extra newlines for highlights
// - Longest terms first; fully escaped; try/catch per term
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

      // Escape regex specials
      const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      try {
        // Word boundary by default; if label contains non-word chars (e.g., umlauts),
        // fallback to plain global match to avoid boundary issues.
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
      } catch {
        // If the regex fails for some reason, skip this term instead of crashing
        continue;
      }
    }

    // Single newlines inside a paragraph → spaces (flow naturally)
    return out.replace(/\n/g, " ");
  };

  // Split into paragraphs on blank lines
  return raw
    .trim()
    .split(/\n\s*\n+/)
    .map((p) => `<p>${wrapTerms(p)}</p>`)
    .join("");
}

/* ---------- Component ---------- */

export default function CreateLesson({
  initialLesson,
  onBack,
  onSavedLesson,   // should return saved doc { id, title, content, dict }
  onAddFlashcard,  // (term, meaning, lesson_id?) -> void|Promise
}) {
  const [id, setId] = useState(initialLesson?.id ?? null);
  const [title, setTitle] = useState(initialLesson?.title ?? "New Lesson");
  const [input, setInput] = useState(initialLesson?.content ?? "");
  const [dict, setDict] = useState(toPlainObject(initialLesson?.dict) ?? {});
  const [rendered, setRendered] = useState(initialLesson?.content ?? "");

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const viewRef = useRef(null);

  const annotated = useMemo(() => {
    try {
      return annotateText(rendered || input, dict);
    } catch {
      return (rendered || input || "")
        .split(/\n\s*\n+/)
        .map((p) => `<p>${p.replace(/\n/g, " ")}</p>`)
        .join("");
    }
  }, [rendered, input, dict]);

  // When opening a different lesson from Home
  useEffect(() => {
    if (!initialLesson) return;
    setId(initialLesson.id ?? null);
    setTitle(initialLesson.title ?? "New Lesson");
    setInput(initialLesson.content ?? "");
    setDict(toPlainObject(initialLesson.dict) ?? {});
    setRendered(initialLesson.content ?? "");
    setSavedAt(null);
  }, [initialLesson]);

  // Preview only
  const handlePreview = () => setRendered(input);

  // Save (create/update); expects parent to return saved doc
  const handleSave = async () => {
    setSaving(true);
    try {
      setRendered(input);
      const lesson = { id, title, content: input, dict };
      const saved = (await onSavedLesson?.(lesson)) || null;
      if (saved && saved.id) setId(saved.id);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  const handleTitleBlur = async () => {
    if (!onSavedLesson) return;
    const saved = (await onSavedLesson({ id, title, content: input, dict })) || null;
    if (saved && saved.id) setId(saved.id);
    setSavedAt(new Date());
  };

  // Add meaning from selection → save lesson → add flashcard
  const addMeaningFromSelection = async () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection?.();
    const container = viewRef.current;

    if (!sel || sel.isCollapsed) return alert("Highlight a word or phrase first.");
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;
    const anchor = range?.commonAncestorContainer || null;

    if (!container || !anchor || !container.contains(anchor)) {
      return alert("Please select text inside the preview area.");
    }

    const term = sel.toString().trim();
    if (!term) return;

    const meaning = prompt(`Meaning for: "${term}"`);
    if (!meaning) return;

    const nextDict = { ...toPlainObject(dict), [term]: meaning };
    setDict(nextDict);

    // Save lesson first to ensure we have a real id
    const saved = (await onSavedLesson?.({ id, title, content: input, dict: nextDict })) || null;
    const lessonId = saved?.id ?? id;
    if (saved?.id && !id) setId(saved.id);
    setSavedAt(new Date());

    // Then add flashcard (ignore if handler missing)
    await onAddFlashcard?.(term, meaning, lessonId);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-4 isolate">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-3 py-2 rounded border hover:bg-gray-50"
          onClick={onBack}
        >
          ← Back
        </button>
        <input
          className="flex-1 px-3 py-2 border rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Lesson title"
        />
      </div>

      {/* Editor */}
      <textarea
        className="w-full h-40 border rounded p-3"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type or paste German text here…"
      />

      {/* Actions (above preview, higher z-index) */}
      <div className="flex flex-wrap gap-2 items-center relative z-10">
        <button
          type="button"
          className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
          onClick={handlePreview}
        >
          Create / Update Preview
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          onClick={addMeaningFromSelection}
        >
          Add Meaning from Selection
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save to db"}
        </button>
        <span className="text-sm text-gray-600">
          {savedAt ? `Saved ✓ ${savedAt.toLocaleTimeString()}` : "Not saved yet"}
        </span>
      </div>

      {/* Preview (bounded height; behind buttons) */}
      <div>
        <h3 className="font-semibold mb-2">Preview (hover words to see meaning)</h3>
        <div
          ref={viewRef}
          className="min-h-24 max-h-[50vh] overflow-auto border rounded p-3 leading-7 whitespace-normal break-words relative z-0"
          dangerouslySetInnerHTML={{ __html: annotated || "" }}
        />
      </div>

      {/* Current dictionary */}
      {!!Object.keys(toPlainObject(dict)).length && (
        <div className="pt-2 border-t">
          <h4 className="font-semibold mb-2">Words added to Flashcards</h4>
          <ul className="list-disc pl-5">
            {Object.entries(toPlainObject(dict)).map(([t, m]) => (
              <li key={t}>
                <span className="font-medium">{t}</span>: {String(m)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
