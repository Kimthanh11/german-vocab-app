// Flashcards.jsx
import React from "react";

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ContextSentence({ ctx, term }) {
  if (!ctx?.sentence) return null;
  const { sentence, start, end } = ctx;

  // Prefer precise indices if we have them
  if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start) {
    return (
      <span>
        {sentence.slice(0, start)}
        <mark className="px-1 rounded">{sentence.slice(start, end)}</mark>
        {sentence.slice(end)}
      </span>
    );
  }

  // Fallback: case-insensitive first match
  const re = new RegExp(`(${escapeRegExp(term)})`, "i");
  const parts = sentence.split(re);
  return (
    <span>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="px-1 rounded">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}

export default function Flashcards({ cards = [], loading, error, onBack, onDeleteCard }) {
  return (
    <div className="bg-white rounded p-4 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-lg">Flashcards</h2>
        <button className="px-2 py-1 border rounded" onClick={onBack}>
          ← Back
        </button>
      </div>

      {loading && <div className="text-gray-600">Loading…</div>}
      {error && <div className="text-red-600">Error: {error}</div>}

      {!loading && !error && cards.length === 0 && (
        <div className="text-gray-500">No flashcards yet.</div>
      )}

      {!loading && !error && cards.length > 0 && (
        <ul className="grid gap-2">
          {cards.map((c) => {
            const contexts = Array.isArray(c.contexts)
              ? c.contexts
              : c.contexts
              ? [c.contexts]
              : [];

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
                      {/* First example */}
                      <div className="italic">
                        “<ContextSentence ctx={contexts[0]} term={c.term} />”
                      </div>

                      {/* More examples collapsed */}
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
