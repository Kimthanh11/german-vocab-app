import React, { useEffect, useMemo, useRef, useState } from "react";

// Keep paragraphs + inline highlights (no new lines from highlights)
function annotateText(raw, dict) {
  if (!raw) return "";
  const wrapTerms = (text) => {
    const terms = Object.keys(dict).sort((a, b) => b.length - a.length);
    let out = text;
    for (const term of terms) {
      if (!term.trim()) continue;
      const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(
        new RegExp(`\\b${esc}\\b`, "gi"),
        (m) => `<span class="relative group underline decoration-dotted cursor-help inline">
                  ${m}
                  <span class="pointer-events-none absolute left-0 -top-8 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow">
                    ${dict[term]}
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

export default function CreateLesson({ initialLesson, onBack, onSavedLesson, onAddFlashcard }) {
  const [id, setId] = useState(initialLesson?.id || Date.now());
  const [title, setTitle] = useState(initialLesson?.title || "New Lesson");
  const [input, setInput] = useState(initialLesson?.content || "");
  const [dict, setDict] = useState(initialLesson?.dict || {});
  const [rendered, setRendered] = useState(initialLesson?.content || ""); // preview text

  const viewRef = useRef(null);
  const annotated = useMemo(() => annotateText(rendered || input, dict), [rendered, input, dict]);

  // If user opens another lesson while on this screen
  useEffect(() => {
    if (!initialLesson) return;
    setId(initialLesson.id);
    setTitle(initialLesson.title);
    setInput(initialLesson.content || "");
    setDict(initialLesson.dict || {});
    setRendered(initialLesson.content || "");
  }, [initialLesson]);

  const handleCreate = () => {
    setRendered(input);
    const lesson = { id, title, content: input, dict };
    onSavedLesson?.(lesson);
  };

  const addMeaningFromSelection = () => {
    const sel = window.getSelection();
    const container = viewRef.current;
    if (!sel || sel.isCollapsed) return alert("Highlight a word or phrase first.");
    if (!container || !container.contains(sel.anchorNode))
      return alert("Please select text inside the preview area.");
    const term = sel.toString().trim();
    if (!term) return;
    const meaning = prompt(`Meaning for: "${term}"`);
    if (!meaning) return;
    const newDict = { ...dict, [term]: meaning };
    setDict(newDict);
    onAddFlashcard?.(term, meaning);

    // Save updated lesson immediately so Old Lessons keeps meanings too
    onSavedLesson?.({ id, title, content: input, dict: newDict });
  };

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      setRendered(input); // keep your preview update
      const lesson = { id, title, content: input, dict };
      // If onSavedLesson returns a promise (App calls API), await it:
      await onSavedLesson?.(lesson);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={onBack}>← Back</button>
        <input
          className="flex-1 px-3 py-2 border rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lesson title"
          onBlur={() => onSavedLesson?.({ id, title, content: input, dict })}
        />
      </div>

      <textarea
        className="w-full h-40 border rounded p-3"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type or paste German text here…"
      />

      <div className="flex gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleCreate}>
          Create / Update Preview
        </button>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700" onClick={addMeaningFromSelection}>
          Add Meaning from Selection
        </button>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Preview (hover words to see meaning)</h3>
        <div
          ref={viewRef}
          className="min-h-24 border rounded p-3 leading-7 whitespace-normal break-words"
          dangerouslySetInnerHTML={{ __html: annotated }}
        />
      </div>

      {!!Object.keys(dict).length && (
        <div className="pt-2 border-t">
          <h4 className="font-semibold mb-2">Words added to Flashcards</h4>
          <ul className="list-disc pl-5">
            {Object.entries(dict).map(([t, m]) => (
              <li key={t}><span className="font-medium">{t}</span>: {m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Create / Update Preview"}
        </button>
        <span className="text-sm text-gray-600">
          {savedAt ? `Saved ✓ ${savedAt.toLocaleTimeString()}` : "Not saved yet"}
        </span>
      </div>
    </div>
  );
}
