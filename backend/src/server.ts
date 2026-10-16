import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import { getAIService } from "./services/ai/index.js";
import { getKnowledgeService } from "./services/knowledge/index.js";

// In production the frontend build (repo-root dist/, from `npm run build`) is served by this same server, so the
// browser's relative /api/ask calls reach the API with no CORS setup. In development Vite serves the frontend.
const frontendDist = fileURLToPath(new URL("../../dist/", import.meta.url));
const staticDir = existsSync(`${frontendDist}index.html`) ? frontendDist : undefined;

// Built before listening so invalid knowledge settings stop startup with a clear error.
const app = createApp({
  frontendOrigin: config.frontendOrigin,
  requireAuth,
  knowledgeService: getKnowledgeService(),
  getAIService,
  staticDir,
});

app.listen(config.port, () => {
  console.log(`EagleDesk API listening on :${config.port}${staticDir ? " (serving the frontend build)" : ""}`);
});
