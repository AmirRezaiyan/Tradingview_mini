// frontend/src/api/api.js
import axios from "axios";

export const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const BASE_URL = `${API_ORIGIN}/api/market`;
const NOTES_BASE = `${API_ORIGIN}/api/notes/`;

const api = {
  getCryptoKlines: (symbol, interval, limit = 200) =>
    axios.get(`${BASE_URL}/crypto/`, { params: { symbol, interval, limit } }),

  getForexKlines: (symbol, interval, limit = 200) =>
    axios.get(`${BASE_URL}/forex/`, { params: { symbol, interval, limit } }),

  getLatestPrice: async (marketType, symbol, signal) => {
    const base = `${BASE_URL}/${marketType}/latest_price/`;
    if (marketType === "forex") {
      const variants = [
        symbol,
        symbol.replace(/\//g, ""),   // EUR/USD -> EURUSD
        symbol.replace(/\//g, "_"),  // EUR/USD -> EUR_USD
      ];
      const uniq = Array.from(new Set(variants));

      for (const s of uniq) {
        try {
          const res = await axios.get(base, { params: { symbol: s }, signal });
          return res;
        } catch (err) {
          if (err.response && err.response.status === 400) {
            console.warn(`getLatestPrice: tried symbol='${s}' -> 400, trying next variant`);
            continue;
          }
          throw err;
        }
      }
      return axios.get(base, { params: { symbol }, signal });
    }

    return axios.get(`${BASE_URL}/${marketType}/latest_price/`, { params: { symbol }, signal });
  },

  // notes endpoints (fixed: accept symbol param; added delete)
  listNotes: (symbol) =>
    axios.get(NOTES_BASE, { params: symbol ? { symbol } : {} }),

  createNote: (symbol, content) =>
    axios.post(
      NOTES_BASE,
      { symbol, content },
      { headers: { "Content-Type": "application/json" } }
    ),

  updateNote: (id, content) =>
    axios.patch(
      `${NOTES_BASE}${id}/`,
      { content },
      { headers: { "Content-Type": "application/json" } }
    ),

  deleteNote: (id) =>
    axios.delete(`${NOTES_BASE}${id}/`),
};

export default api;
