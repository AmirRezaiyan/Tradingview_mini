// frontend/src/api/api.js
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api/market";
const NOTES_BASE = "http://127.0.0.1:8000/api/notes/";

const api = {
  getCryptoKlines: (symbol, interval, limit = 200) =>
    axios.get(`${BASE_URL}/crypto/`, { params: { symbol, interval, limit } }),

  getForexKlines: (symbol, interval, limit = 200) =>
    axios.get(`${BASE_URL}/forex/`, { params: { symbol, interval, limit } }),

  getLatestPrice: async (marketType, symbol) => {
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
          const res = await axios.get(base, { params: { symbol: s } });
          return res;
        } catch (err) {
          if (err.response && err.response.status === 400) {
            console.warn(`getLatestPrice: tried symbol='${s}' -> 400, trying next variant`);
            continue;
          }
          throw err;
        }
      }
      return axios.get(base, { params: { symbol } });
    }

    return axios.get(`${BASE_URL}/${marketType}/latest_price/`, { params: { symbol } });
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

  deleteNote: (id) =>
    axios.delete(`${NOTES_BASE}${id}/`),
};

export default api;
