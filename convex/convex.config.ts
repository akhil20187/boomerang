import { defineApp } from "convex/server";
import workflow from "@convex-dev/workflow/convex.config.js";
import staticHosting from "@convex-dev/static-hosting/convex.config";
const app = defineApp();
app.use(workflow);
app.use(staticHosting);
export default app;
