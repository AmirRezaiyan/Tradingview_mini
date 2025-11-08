import React, { useEffect, useState } from "react";
import api from "../api/api";

export default function NotesPanel({ symbol, activeSymbol }) {
  const currentSymbol = symbol || activeSymbol || "";

  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!currentSymbol) {
        setNotes([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.listNotes(currentSymbol);
        if (!cancelled) {
          const filtered = Array.isArray(res.data)
            ? res.data.filter((n) => n.symbol === currentSymbol)
            : [];
          setNotes(filtered);
        }
      } catch (err) {
        console.error("Failed to load notes:", err);
        if (!cancelled) setNotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentSymbol]);

  const handleAdd = async () => {
    if (!currentSymbol) return;
    const content = text.trim();
    if (!content) return;
    setSaving(true);
    try {
      const res = await api.createNote(currentSymbol, content);
      if (res?.data?.id) {
        setNotes((prev) => [res.data, ...prev]);
      } else {
        const r = await api.listNotes(currentSymbol);
        const filtered = Array.isArray(r.data)
          ? r.data.filter((n) => n.symbol === currentSymbol)
          : [];
        setNotes(filtered);
      }
      setText("");
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  return (
    <aside className="w-80 bg-[#071017] border-l border-gray-800 p-4 text-gray-200 flex flex-col">
      <h3 className="text-sm text-gray-400 mb-2">Notes</h3>

      <div className="mb-3">
        <div className="text-xs text-gray-400 mb-1">
          Active: {currentSymbol || "—"}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full bg-[#0e1317] text-gray-200 p-2 rounded border border-gray-800"
          placeholder={
            currentSymbol ? "Write analysis..." : "Select a symbol first"
          }
          disabled={!currentSymbol || saving}
        />
        <div className="flex mt-2">
          <button
            onClick={handleAdd}
            className="px-3 py-1 bg-green-600 rounded mr-2"
            disabled={!currentSymbol || saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              if (currentSymbol) {
                api
                  .listNotes(currentSymbol)
                  .then((r) => {
                    const filtered = Array.isArray(r.data)
                      ? r.data.filter((n) => n.symbol === currentSymbol)
                      : [];
                    setNotes(filtered);
                  })
                  .catch(console.error);
              }
            }}
            className="px-3 py-1 bg-gray-700 rounded"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="text-sm text-gray-500">Loading...</div>
        )}
        {!loading && notes.length === 0 && (
          <div className="text-sm text-gray-500">No notes yet</div>
        )}
        <ul className="space-y-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="p-2 bg-[#0b0f13] rounded border border-gray-800"
            >
              <div className="flex justify-between text-xs text-gray-400">
                <span>{n.symbol}</span>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="text-red-500"
                >
                  Delete
                </button>
              </div>
              <div className="mt-1 text-sm">{n.content}</div>
              <div className="mt-2 text-xs text-gray-500">
                {n.created_at
                  ? new Date(n.created_at).toLocaleString()
                  : ""}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
