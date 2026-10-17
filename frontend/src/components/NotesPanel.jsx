import React, { useEffect, useRef, useState } from "react";
import api from "../api/api";

function requestErrorMessage(error, fallback) {
  const message = error?.response?.data?.error || error?.response?.data?.detail || error?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function parseNotesResponse(data) {
  if (!Array.isArray(data) || data.some((note) => (
    !note || typeof note !== "object" || note.id == null ||
    typeof note.symbol !== "string" || typeof note.content !== "string"
  ))) {
    throw new Error("The notes response did not contain a valid note list.");
  }
  return data;
}

export default function NotesPanel({ symbol, activeSymbol }) {
  const currentSymbol = symbol || activeSymbol || "";
  const currentSymbolRef = useRef(currentSymbol);
  currentSymbolRef.current = currentSymbol;
  const mountedRef = useRef(false);
  const loadedSymbolRef = useRef(currentSymbol);
  const createPendingRef = useRef(false);
  const updatePendingRef = useRef(false);
  const deletingIdsRef = useRef(new Set());

  const [notes, setNotes] = useState([]);
  const [notesSymbol, setNotesSymbol] = useState(currentSymbol);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editText, setEditText] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!currentSymbol) {
        setNotes([]);
        setNotesSymbol("");
        setEditingNoteId(null);
        setEditText("");
        loadedSymbolRef.current = "";
        setError("");
        setLoadFailed(false);
        setLoading(false);
        return;
      }
      if (loadedSymbolRef.current !== currentSymbol) {
        setNotes([]);
        setEditingNoteId(null);
        setEditText("");
        loadedSymbolRef.current = currentSymbol;
      }
      setLoading(true);
      setError("");
      setLoadFailed(false);
      try {
        const res = await api.listNotes(currentSymbol);
        const scopedNotes = parseNotesResponse(res.data);
        if (!cancelled) {
          setNotes(scopedNotes);
          setNotesSymbol(currentSymbol);
        }
      } catch (err) {
        console.error("Failed to load notes:", err);
        if (!cancelled) {
          setError(requestErrorMessage(err, "Unable to load notes."));
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentSymbol, reloadKey]);

  const handleAdd = async () => {
    if (!currentSymbol || createPendingRef.current) return;
    const content = text.trim();
    if (!content) return;
    const targetSymbol = currentSymbol;
    createPendingRef.current = true;
    setSaving(true);
    setError("");
    setLoadFailed(false);
    try {
      const res = await api.createNote(targetSymbol, content);
      if (!mountedRef.current || currentSymbolRef.current !== targetSymbol) return;
      if (res?.data?.id != null && typeof res.data.symbol === "string" && typeof res.data.content === "string") {
        setNotes((prev) => [res.data, ...prev.filter((note) => note.id !== res.data.id)]);
        setNotesSymbol(targetSymbol);
      } else {
        const listResponse = await api.listNotes(targetSymbol);
        const scopedNotes = parseNotesResponse(listResponse.data);
        if (!mountedRef.current || currentSymbolRef.current !== targetSymbol) return;
        setNotes(scopedNotes);
        setNotesSymbol(targetSymbol);
      }
      setText("");
    } catch (err) {
      console.error("Failed to add note:", err);
      if (mountedRef.current && currentSymbolRef.current === targetSymbol) {
        setError(requestErrorMessage(err, "Unable to save the note."));
        setLoadFailed(false);
      }
    } finally {
      createPendingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  };

  const visibleNotes = notesSymbol === currentSymbol ? notes : [];

  const handleDelete = async (id) => {
    if (!currentSymbol || deletingIdsRef.current.has(id)) return;
    const targetSymbol = currentSymbol;
    deletingIdsRef.current.add(id);
    setDeletingIds(new Set(deletingIdsRef.current));
    setError("");
    try {
      await api.deleteNote(id);
      if (mountedRef.current && currentSymbolRef.current === targetSymbol) {
        setNotes((prev) => prev.filter((note) => note.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
      if (mountedRef.current && currentSymbolRef.current === targetSymbol) {
        setError(requestErrorMessage(err, "Unable to delete the note."));
        setLoadFailed(false);
      }
    } finally {
      deletingIdsRef.current.delete(id);
      if (mountedRef.current) setDeletingIds(new Set(deletingIdsRef.current));
    }
  };

  const handleUpdate = async (note) => {
    const content = editText.trim();
    if (!content || updatePendingRef.current) return;
    const targetSymbol = currentSymbol;
    updatePendingRef.current = true;
    setUpdating(true);
    setError("");
    try {
      const res = await api.updateNote(note.id, content);
      if (!mountedRef.current || currentSymbolRef.current !== targetSymbol) return;
      if (res?.data?.id == null || typeof res.data.symbol !== "string" || typeof res.data.content !== "string") {
        throw new Error("The updated note response was invalid.");
      }
      setNotes((prev) => prev.map((item) => item.id === note.id ? res.data : item));
      setEditingNoteId(null);
      setEditText("");
    } catch (err) {
      console.error("Failed to update note:", err);
      if (mountedRef.current && currentSymbolRef.current === targetSymbol) {
        setError(requestErrorMessage(err, "Unable to update the note."));
        setLoadFailed(false);
      }
    } finally {
      updatePendingRef.current = false;
      if (mountedRef.current) setUpdating(false);
    }
  };

  return (
    <aside aria-label="Notes" className="flex h-full w-full min-w-0 flex-col bg-[#071017] p-3 text-gray-100 sm:p-4">
      <h3 className="mb-2 text-sm text-gray-300">Notes</h3>

      <div className="mb-3">
        <div className="mb-1 text-xs text-gray-300">
          Active: {currentSymbol || "—"}
        </div>
        <label htmlFor="new-note-content" className="sr-only">New note for {currentSymbol || "selected symbol"}</label>
        <textarea
          id="new-note-content"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full min-w-0 rounded border border-gray-700 bg-[#0e1317] p-2 text-gray-100 placeholder-gray-400"
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
            onClick={() => setReloadKey((key) => key + 1)}
            className="px-3 py-1 bg-gray-700 rounded"
            disabled={!currentSymbol || loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="text-sm text-gray-500">Loading...</div>
        )}
        {!loading && error && (
          <div className="text-sm text-red-400" role="alert">
            <div>{error}</div>
            {loadFailed && (
              <button
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-2 px-3 py-1 bg-gray-700 rounded text-gray-200"
              >
                Retry
              </button>
            )}
          </div>
        )}
        {!loading && !error && visibleNotes.length === 0 && (
          <div className="text-sm text-gray-500">No notes yet</div>
        )}
        <ul className="space-y-3">
          {visibleNotes.map((n) => (
            <li
              key={n.id}
              className="p-2 bg-[#0b0f13] rounded border border-gray-800"
            >
              <div className="flex justify-between text-xs text-gray-400">
                <span>{n.symbol}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingNoteId(n.id);
                      setEditText(n.content);
                      setError("");
                    }}
                    className="text-gray-300"
                    disabled={updating || deletingIds.has(n.id)}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-red-500"
                    disabled={deletingIds.has(n.id) || updating}
                  >
                    {deletingIds.has(n.id) ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
              {editingNoteId === n.id ? (
                <div className="mt-2">
                  <label htmlFor={`edit-note-${n.id}`} className="sr-only">Edit note for {n.symbol}</label>
                  <textarea
                    id={`edit-note-${n.id}`}
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    rows={3}
                    maxLength={5000}
                    className="w-full min-w-0 rounded border border-gray-700 bg-[#0e1317] p-2 text-gray-100"
                    disabled={updating}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleUpdate(n)}
                      className="px-2 py-1 bg-green-700 rounded"
                      disabled={updating || !editText.trim()}
                    >
                      {updating ? "Saving..." : "Save edit"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingNoteId(null);
                        setEditText("");
                      }}
                      className="px-2 py-1 bg-gray-700 rounded"
                      disabled={updating}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-sm">{n.content}</div>
              )}
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
