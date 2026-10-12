import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval(
  "expire temporary searches and playback grants",
  { minutes: 15 },
  internal.maintenance.cleanup,
  {},
);
crons.interval(
  "delete chat turn records older than 2 hours",
  { minutes: 30 },
  internal.maintenance.cleanupChatTurns,
  {},
);
export default crons;
