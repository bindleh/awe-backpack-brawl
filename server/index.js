import cors from "cors";
import express from "express";
import { topEntries, validateEntry } from "./hallOfFame.js";
import { opponentForRound, parseRound } from "./opponents.js";

const app = express();
const port = Number(process.env.PORT ?? 4200);
/** Hall of fame entries, kept in memory: restarting the server clears them. */
const entries = [];

app.use(cors()); app.use(express.json());
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "backpack-brawl" }));

app.get("/api/opponents", (req, res) => {
  const requested = Number(req.query.latency ?? process.env.API_LATENCY ?? 1200);
  const latency = Number.isFinite(requested) ? Math.max(0, Math.min(5000, requested)) : 1200;
  setTimeout(() => {
    const round = parseRound(req.query.round);
    if (round === null) return res.status(400).json({ error: "round must be a positive whole number" });
    if (req.query.fail === "true" || process.env.API_FAIL === "true") {
      return res.status(503).json({ error: "The arena gates are shut. No challenger answered the call." });
    }
    res.json(opponentForRound(round));
  }, latency);
});

app.get("/api/hall-of-fame", (_req, res) => res.json(topEntries(entries)));

app.post("/api/hall-of-fame", (req, res) => {
  const { entry, error } = validateEntry(req.body);
  if (error) return res.status(400).json({ error });
  if (entries.some((existing) => existing.runId === entry.runId)) {
    return res.status(409).json({ error: "This run was already submitted." });
  }
  const saved = { ...entry, submittedAt: new Date().toISOString() };
  entries.push(saved);
  res.status(201).json(saved);
});

// Malformed JSON bodies get the same error shape as every other failure.
app.use((err, _req, res, next) => {
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Request body must be valid JSON" });
  next(err);
});

app.listen(port, () => console.log(`Backpack Brawl API listening on http://localhost:${port}`));
