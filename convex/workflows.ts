import { WorkflowManager } from "@convex-dev/workflow";
import { components, internal } from "./_generated/api";
import { v } from "convex/values";
export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: { maxParallelism: 2 },
});
export const runTask = workflow
  .define({ args: { taskId: v.id("tasks") }, returns: v.null() })
  .handler(async (step, args): Promise<null> => {
    await step.runMutation(internal.tasks.markRunning, args);
    await step.runAction(
      internal.notifications.send,
      { taskId: args.taskId, type: "started" },
      { retry: false },
    );
    const context = await step.runQuery(internal.tasks.context, args);
    for (const job of context.jobs)
      await step.runAction(
        internal.calls.dispatch,
        { shopJobId: job._id },
        { retry: false },
      );
    return null;
  });
