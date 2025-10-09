// Flashcards.jsx
import React, { useMemo, useState } from "react";

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function shuffle(arr) { return arr.map(a=>[Math.random(),a]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]); }
function pick(arr, n) { return shuffle(arr).slice(0, n); }

function ContextSentence({ ctx, term }) {
  if (!ctx?.sentence) return null;
  const { sentence, start, end } = ctx;
  if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start) {
    return (
      <span>
        {sentence.slice(0, start)}
        <mark className="px-1 rounded">{sentence.slice(start, end)}</mark>
        {sentence.slice(end)}
      </span>
    );
  }
  const re = new RegExp(`(${escapeRegExp(term)})`, "i");
  const parts = sentence.split(re);
  return (
    <span>
      {parts.map((p, i) =>
        i % 2 === 1 ? <mark key={i} className="px-1 rounded">{p}</mark> : <span key={i}>{p}</span>
      )}
    </span>
  );
}

/* ---------- Tiny practice engines ---------- */

// Build MCQ questions from cards
function buildQuestions(cards, count = 10, mode = "term->meaning") {
  // mode: "term->meaning" or "meaning->term"
  const usable = cards.filter(c => c.term && c.meaning);
  const baseQs = pick(usable, Math.min(count, usable.length));
  return baseQs.map((c) => {
    if (mode === "term->meaning") {
      const distractors = pick(usable.filter(x => x.term !== c.term), 3).map(x => x.meaning);
      const options = shuffle([c.meaning, ...distractors]);
      return {
        id: c.id || c.term, prompt: c.term, answer: c.meaning, options,
        direction: "Choose the meaning",
      };
    } else {
      const distractors = pick(usable.filter(x => x.meaning !== c.meaning), 3).map(x => x.term);
      const options = shuffle([c.term, ...distractors]);
      return {
        id: c.id || c.term, prompt: c.meaning, answer: c.term, options,
        direction: "Choose the term",
      };
    }
  });
}

// Generate a short paragraph using N random terms
function generatePracticeParagraph(cards, n = 6) {
  const chosen = pick(cards.filter(c => c.term), Math.min(n, cards.length));
  if (chosen.length === 0) return "";
  // Try to use first context sentences if available; else make simple glue text.
  const sentences = chosen.map((c) => {
    const s = c.contexts?.[0]?.sentence;
    if (s) return s;
    // simple fallback sentence:
    return `Ich lerne das Wort "${c.term}" (${c.meaning}).`;
  });
  // De-duplicate and lightly shuffle
  const unique = Array.from(new Set(sentences));
  return shuffle(unique).slice(0, Math.min(unique.length, n)).join(" ");
}

/* ---------- Component ---------- */

export default function Flashcards({ cards = [], loading, error, onBack, onDeleteCard }) {
  // Practice state
  const [practiceMode, setPracticeMode] = useState(null); // null | 'mcq' | 'text'
  const [mcqDir, setMcqDir] = useState("term->meaning");  // default direction
  const [mcqQs, setMcqQs] = useState([]);
  const [mcqIdx, setMcqIdx] = useState(0);
  const [mcqScore, setMcqScore] = useState(0);
  const [mcqPicked, setMcqPicked] = useState(null);

  const [textCount, setTextCount] = useState(6);
  const paragraph = useMemo(() => (
    practiceMode === "text" ? generatePracticeParagraph(cards, textCount) : ""
  ), [practiceMode, cards, textCount]);

  const startMCQ = () => {
    const qs = buildQuestions(cards, 10, mcqDir);
    setMcqQs(qs);
    setMcqIdx(0);
    setMcqScore(0);
    setMcqPicked(null);
    setPracticeMode("mcq");
  };

  const submitOption = (opt) => {
    if (mcqPicked != null) return; // already answered
    setMcqPicked(opt);
    if (opt === mcqQs[mcqIdx].answer) setMcqScore(s => s + 1);
  };

  const nextQuestion = () => {
    if (mcqIdx + 1 < mcqQs.length) {
      setMcqIdx(i => i + 1);
      setMcqPicked(null);
    } else {
      // finish
      alert(`Done! Score: ${mcqScore}/${mcqQs.length}`);
      setPracticeMode(null);
    }
  };

  const leavePractice = () => {
    setPracticeMode(null);
    setMcqQs([]); setMcqIdx(0); setMcqScore(0); setMcqPicked(null);
  };

  return (
    <div className="bg-white rounded p-4 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-lg">Flashcards</h2>
        <div className="flex gap-2">
          <button className="px-2 py-1 border rounded" onClick={onBack}>← Back</button>
        </div>
      </div>

      {/* Practice controls */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">

        <div className="flex items-center gap-2">
          <select
            className="px-2 py-2 border rounded"
            value={mcqDir}
            onChange={(e) => setMcqDir(e.target.value)}
            title="MCQ direction"
          >
            <option value="term->meaning">Ask term → choose meaning</option>
            <option value="meaning->term">Ask meaning → choose term</option>
          </select>
          <button
            className="px-3 py-2 border rounded hover:bg-gray-50"
            onClick={startMCQ}
            disabled={cards.length < 2}
            title="Start a multiple-choice quiz"
          >
            Practice MCQ
          </button>
        </div>
      </div>


      {/* MCQ panel */}
      {practiceMode === "mcq" && mcqQs.length > 0 && (
        <div className="mb-4 border rounded p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">
              {mcqQs[mcqIdx].direction} • {mcqIdx + 1}/{mcqQs.length}
            </div>
            <div className="text-sm text-gray-600">Score: {mcqScore}</div>
          </div>

          <div className="text-lg font-semibold mb-3">
            {mcqQs[mcqIdx].prompt}
          </div>

          <div className="grid gap-2">
            {mcqQs[mcqIdx].options.map((opt) => {
              const isPicked = mcqPicked === opt;
              const isCorrect = opt === mcqQs[mcqIdx].answer;
              const styles =
                mcqPicked == null
                  ? "border hover:bg-white"
                  : isCorrect
                  ? "border border-green-600 bg-green-50"
                  : isPicked
                  ? "border border-red-600 bg-red-50"
                  : "border opacity-70";
              return (
                <button
                  key={opt}
                  className={`text-left px-3 py-2 rounded ${styles}`}
                  onClick={() => submitOption(opt)}
                  disabled={mcqPicked != null}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <button className="px-3 py-2 border rounded" onClick={nextQuestion}>
              {mcqIdx + 1 < mcqQs.length ? "Next" : "Finish"}
            </button>
            <button className="px-3 py-2 border rounded" onClick={leavePractice}>
              Exit
            </button>
          </div>
        </div>
      )}

      {/* Existing list */}
      <div className="mb-3 flex items-center justify-between">
        <div className="font-medium">Your Cards</div>
      </div>

      {loading && <div className="text-gray-600">Loading…</div>}
      {error && <div className="text-red-600">Error: {error}</div>}

      {!loading && !error && cards.length === 0 && (
        <div className="text-gray-500">No flashcards yet.</div>
      )}

      {!loading && !error && cards.length > 0 && (
        <ul className="grid gap-2">
          {cards.map((c) => {
            const contexts = Array.isArray(c.contexts) ? c.contexts : c.contexts ? [c.contexts] : [];
            return (
              <li
                key={c.id || c.term}
                className="border rounded p-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">{c.term}</div>
                  <div className="text-sm text-gray-700">{c.meaning}</div>

                  {contexts.length > 0 && (
                    <div className="mt-2 text-sm text-gray-700">
                      <div className="italic">
                        “<ContextSentence ctx={contexts[0]} term={c.term} />”
                      </div>
                      {contexts.length > 1 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-gray-500">
                            Show {contexts.length - 1} more example
                            {contexts.length - 1 > 1 ? "s" : ""}
                          </summary>
                          <ul className="mt-1 list-disc pl-5">
                            {contexts.slice(1).map((ctx, i) => (
                              <li key={i} className="italic">
                                “<ContextSentence ctx={ctx} term={c.term} />”
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                <button
                  className="px-2 py-1 text-red-600 border rounded hover:bg-red-50 shrink-0"
                  onClick={() => onDeleteCard(c)}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
