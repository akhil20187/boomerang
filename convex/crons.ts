import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval(
  "expire temporary searches and playback grants",
  { minutes: 15 },
  internal.maintenance.cleanup,
  {},
);
export default crons;
