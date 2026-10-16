import { createApp } from "./app.js";
import { config } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import { getAIService } from "./services/ai/index.js";
import { getKnowledgeService } from "./services/knowledge/index.js";

// Built before listening so invalid knowledge settings stop startup with a clear error.
const app = createApp({
  frontendOrigin: config.frontendOrigin,
  requireAuth,
  knowledgeService: getKnowledgeService(),
  getAIService,
});

app.listen(config.port, () => { console.log(`EagleDesk API listening on :${config.port}`); });
