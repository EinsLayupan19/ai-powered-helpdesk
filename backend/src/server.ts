import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { requireAuth, type AuthedRequest } from "./middleware/auth.js";

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => { res.json({ ok: true }); });

// Smoke-test endpoint for token verification; real endpoints (/api/ask, ...) come in later phases.
app.get("/api/me", requireAuth, (req, res) => {
  const { user } = req as AuthedRequest;
  res.json({ id: user.id, email: user.email ?? null });
});

app.use("/api", (_req, res) => { res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } }); });

app.listen(config.port, () => { console.log(`EagleDesk API listening on :${config.port}`); });
