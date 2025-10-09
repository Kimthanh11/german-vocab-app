// src/CreateLesson.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------- helpers ---------- */
function extractSentenceContext(fullText, term) {
  if (!fullText || !term) return null;
  const sentences = fullText
    .split(/\n\s*\n+/)
    .flatMap(p => p.split(/(?<=[\.\?\!\:\;])\s+|\n+/));
  const lt = term.toLowerCase();
  for (const s of sentences) {
    const i = s.toLowerCase().indexOf(lt);
    if (i !== -1) return { sentence: s.trim(), start: i, end: i + term.length };
  }
  const pos = fullText.toLowerCase().indexOf(lt);
  if (pos !== -1) {
    const start = Math.max(0, pos - 60);
    const end = Math.min(fullText.length, pos + term.length + 60);
    const snippet = fullText.slice(start, end).trim();
    return { sentence: snippet, start: pos - start, end: pos - start + term.length };
  }
  return null;
}

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

/* ---------- component ---------- */
export default function CreateLesson({
  initialLesson,
  onBack,
  onSavedLesson,   // (lesson) => Promise<{id,...}>
  onAddFlashcard,  // (term, meaning, lesson_id?) => Promise<void>
}) {
  // modes: "input" (first screen), "view" (highlight/preview), "edit" (edit original)
  const [mode, setMode] = useState(initialLesson ? "view" : "input");

  const [id, setId] = useState(initialLesson?.id ?? null);
  const [title, setTitle] = useState(initialLesson?.title ?? "New Lesson");
  const [input, setInput] = useState(initialLesson?.content ?? ""); // authoritative text
  const [dict, setDict] = useState(toPlainObject(initialLesson?.dict) ?? {});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // what gets rendered (kept in sync when we start/apply edits)
  const [rendered, setRendered] = useState(initialLesson?.content ?? "");

  const viewRef = useRef(null);

  const annotated = useMemo(() => {
    try {
      return annotateText(rendered || "", dict);
    } catch {
      return (rendered || "")
        .split(/\n\s*\n+/)
        .map((p) => `<p>${p.replace(/\n/g, " ")}</p>`)
        .join("");
    }
  }, [rendered, dict]);

  // if user opens another lesson
  useEffect(() => {
    if (!initialLesson) return;
    setId(initialLesson.id ?? null);
    setTitle(initialLesson.title ?? "New Lesson");
    setInput(initialLesson.content ?? "");
    setRendered(initialLesson.content ?? "");
    setDict(toPlainObject(initialLesson.dict) ?? {});
    setMode("view");
    setSavedAt(null);
  }, [initialLesson]);

  /* ---------- actions ---------- */
  // Step 1 → Step 2
  const startLesson = async () => {
    const base = (input || "").trim();
    if (!base) return alert("Please paste or type some text first.");
    setRendered(base);
    setMode("view");
  };

  // Save to DB (create/update)
  const handleSave = async () => {
    setSaving(true);
    try {
      const lesson = { id, title, content: input, dict };
      const saved = (await onSavedLesson?.(lesson)) || null;
      if (saved?.id) setId(saved.id);
      setSavedAt(new Date());
      // ensure preview reflects current text
      setRendered(input);
    } finally {
      setSaving(false);
    }
  };

  // Inline title autosave
  const handleTitleBlur = async () => {
    if (!onSavedLesson) return;
    const saved = (await onSavedLesson({ id, title, content: input, dict })) || null;
    if (saved?.id) setId(saved.id);
    setSavedAt(new Date());
  };

  // Add meaning for the highlighted text inside the preview, and save context sentence
const addMeaningFromSelection = async () => {
  const sel = window.getSelection?.();
  const container = viewRef.current;

  if (!sel || sel.isCollapsed) return alert("Highlight a word or phrase first.");
  const range = sel.rangeCount ? sel.getRangeAt(0) : null;
  const anchor = range?.commonAncestorContainer || null;
  if (!container || !anchor || !container.contains(anchor)) {
    return alert("Please select inside the preview area.");
  }

  const term = sel.toString().trim();
  if (!term) return;

  const meaning = prompt(`Meaning for: "${term}"`);
  if (!meaning) return;

  // update local dict
  const nextDict = { ...dict, [term]: meaning };
  setDict(nextDict);

  // ensure lesson is saved (to get a stable id)
  const saved = (await onSavedLesson?.({ id, title, content: input, dict: nextDict })) || null;
  const lessonId = saved?.id ?? id;
  if (saved?.id && !id) setId(saved.id);
  setSavedAt(new Date());

  // capture sentence context from ORIGINAL text
  const ctx = extractSentenceContext(input, term); // { sentence, start, end } | null

  // create/merge flashcard on server (will store context too)
  await onAddFlashcard?.(term, meaning, lessonId, ctx);
};


  /* ---------- UI ---------- */
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-4">
      {/* Top bar */}
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
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={saving}
          title="Save lesson to database"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <span className="text-sm text-gray-600 min-w-28 text-right">
          {savedAt ? `Saved ✓ ${savedAt.toLocaleTimeString()}` : "Not saved"}
        </span>
      </div>

      {/* MODE: input (first screen) */}
      {mode === "input" && (
        <div className="flex flex-col gap-3">
          <label className="text-sm text-gray-700">Paste your paragraph(s):</label>
          <textarea
            className="w-full h-48 border rounded p-3"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste German text here…"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              onClick={startLesson}
            >
              Start lesson
            </button>
          </div>
        </div>
      )}

      {/* MODE: view (highlight + tooltips) */}
      {mode === "view" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 border rounded hover:bg-gray-50"
              onClick={() => setMode("edit")}
              title="Edit the original text"
            >
              Edit text
            </button>
            <button
              type="button"
              className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              onClick={addMeaningFromSelection}
              title="Highlight a word in the preview and click this to add meaning"
            >
              Add meaning from selection
            </button>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Preview (hover words to see meaning)</h3>
            <div
              ref={viewRef}
              className="pt-8 min-h-24 max-h-[60vh] overflow-auto border rounded p-3 leading-7 whitespace-normal break-words"
              dangerouslySetInnerHTML={{ __html: annotated || "" }}
            />
          </div>

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
      )}

      {/* MODE: edit (inline editor just for the original) */}
      {mode === "edit" && (
        <div className="flex flex-col gap-3">
          <label className="text-sm text-gray-700">Edit original text:</label>
          <textarea
            className="w-full h-48 border rounded p-3"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
              onClick={() => {
                // apply edits → update preview text too
                setRendered(input);
                setMode("view");
              }}
            >
              Apply changes
            </button>
            <button
              type="button"
              className="px-4 py-2 border rounded hover:bg-gray-50"
              onClick={() => {
                // discard edits → reset input to last rendered snapshot
                setInput(rendered);
                setMode("view");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
