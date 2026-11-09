import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { productV, shopV, answerV, briefItemV, jobStateV, briefV, contactV, recipientSourceV } from "./validators";
export default defineSchema({
  oauthClients: defineTable({
    clientId: v.string(),
    name: v.string(),
    redirectUris: v.array(v.string()),
  }).index("by_client", ["clientId"]),
  oauthFamilies: defineTable({
    familyId: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_family", ["familyId"])
    .index("by_expiry", ["expiresAt"]),
  oauthRequests: defineTable({
    requestId: v.string(),
    clientId: v.string(),
    clientName: v.string(),
    redirectUri: v.string(),
    state: v.optional(v.string()),
    challenge: v.string(),
    resource: v.string(),
    scope: v.string(),
    expiresAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("denied"),
    ),
  })
    .index("by_request", ["requestId"])
    .index("by_expiry", ["expiresAt"]),
  oauthCodes: defineTable({
    hash: v.string(),
    userId: v.id("users"),
    clientId: v.string(),
    redirectUri: v.string(),
    challenge: v.string(),
    resource: v.string(),
    scope: v.string(),
    expiresAt: v.number(),
  })
    .index("by_hash", ["hash"])
    .index("by_expiry", ["expiresAt"]),
  oauthRefreshTokens: defineTable({
    hash: v.string(),
    userId: v.id("users"),
    clientId: v.string(),
    resource: v.string(),
    scope: v.string(),
    familyId: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_hash", ["hash"])
    .index("by_family", ["familyId"])
    .index("by_expiry", ["expiresAt"]),
  playbackTokens: defineTable({
    hash: v.string(),
    userId: v.id("users"),
    attemptId: v.id("callAttempts"),
    expiresAt: v.number(),
  })
    .index("by_hash", ["hash"])
    .index("by_expiry", ["expiresAt"]),
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    eligible: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  accessTokens: defineTable({
    scope: v.optional(v.string()),
    resource: v.optional(v.string()),
    clientId: v.optional(v.string()),
    familyId: v.optional(v.string()),
    userId: v.id("users"),
    name: v.string(),
    hash: v.string(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_hash", ["hash"])
    .index("by_family", ["familyId"])
    .index("by_user", ["userId"]),
  drafts: defineTable({
    source: v.optional(recipientSourceV),
    briefId: v.optional(v.id("briefs")),
    userId: v.id("users"),
    productInput: v.string(),
    product: productV,
    pincode: v.optional(v.string()),
    /** Area text the customer gave instead of a pincode ("Ameerpet, Hyderabad"). */
    area: v.optional(v.string()),
    cards: v.array(v.string()),
    comments: v.string(),
    radiusKm: v.optional(v.number()),
    shops: v.array(shopV),
    expiresAt: v.number(),
  })
    .index("by_brief_source", ["briefId", "source"])
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),
  briefs: defineTable({
    contacts: v.optional(v.array(contactV)),
    userId: v.id("users"),
    request: v.string(),
    pincode: v.optional(v.string()),
    turns: v.array(
      v.object({ question: v.string(), choices: v.array(v.string()), answer: v.optional(v.string()) }),
    ),
    status: v.union(v.literal("question"), v.literal("ready")),
    summary: v.optional(v.string()),
    brief: v.optional(briefV),
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),
  tasks: defineTable({
    source: v.optional(recipientSourceV),
    briefId: v.optional(v.id("briefs")),
    brief: v.optional(briefV),
    selfTest: v.optional(v.boolean()),
    answerPriceCents: v.optional(v.number()),
    currency: v.optional(v.literal("INR")),
    verification: v.optional(v.boolean()),
    userId: v.id("users"),
    draftId: v.id("drafts"),
    title: v.string(),
    type: v.literal("shop_calls"),
    detailsVersion: v.number(),
    product: productV,
    pincode: v.optional(v.string()),
    cards: v.array(v.string()),
    comments: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("finished"),
      v.literal("error"),
    ),
    approvedAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    idempotencyKey: v.string(),
    workflowId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_self_test", ["userId", "selfTest"])
    .index("by_user_operation", ["userId", "idempotencyKey"]),
  shopJobs: defineTable({
    taskId: v.id("tasks"),
    shop: shopV,
    state: jobStateV,
    attemptCount: v.number(),
    retryAt: v.optional(v.number()),
    answer: v.optional(answerV),
    executor: v.literal("AI"),
    billingState: v.union(
      v.literal("not_assessed"),
      v.literal("reserved"),
      v.literal("charged"),
      v.literal("refunded"),
      v.literal("released"),
    ),
    latestAttemptId: v.optional(v.id("callAttempts")),
  }).index("by_task", ["taskId"]),
  callAttempts: defineTable({
    taskId: v.id("tasks"),
    shopJobId: v.id("shopJobs"),
    number: v.number(),
    executor: v.literal("AI"),
    status: v.string(),
    startedAt: v.number(),
    reconciliationChecks: v.optional(v.number()),
    reconciliationNextAt: v.optional(v.number()),
    manualReconciliationAt: v.optional(v.number()),
    answeredAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    providerCallId: v.optional(v.string()),
    providerRequestId: v.optional(v.string()),
    endReason: v.optional(v.string()),
    answer: v.optional(answerV),
    items: v.optional(v.array(briefItemV)),
    recordingId: v.optional(v.id("_storage")),
    recordingStatus: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    dispatchState: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("uncertain"),
      v.literal("rejected"),
    ),
  })
    .index("by_job", ["shopJobId"])
    .index("by_task", ["taskId"])
    .index("by_status", ["status"]),
  transcriptSegments: defineTable({
    attemptId: v.id("callAttempts"),
    sequence: v.number(),
    speaker: v.string(),
    text: v.string(),
    timestamp: v.number(),
  }).index("by_attempt_sequence", ["attemptId", "sequence"]),
  taskEvents: defineTable({
    taskId: v.id("tasks"),
    shopJobId: v.optional(v.id("shopJobs")),
    attemptId: v.optional(v.id("callAttempts")),
    eventId: v.string(),
    type: v.string(),
    text: v.string(),
    timestamp: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_event", ["eventId"]),
  creditEntries: defineTable({
    shopJobId: v.optional(v.id("shopJobs")),
    amountCents: v.optional(v.number()),
    userId: v.id("users"),
    taskId: v.optional(v.id("tasks")),
    amount: v.number(),
    currency: v.union(v.literal("USD"), v.literal("INR")),
    type: v.union(
      v.literal("grant"),
      v.literal("reservation"),
      v.literal("charge"),
      v.literal("release"),
      v.literal("refund"),
    ),
    reason: v.string(),
    operationId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_operation", ["operationId"]),
  creditAccounts: defineTable({
    userId: v.id("users"),
    balanceCents: v.number(),
    reservedCents: v.number(),
  }).index("by_user", ["userId"]),
  creditReservations: defineTable({
    userId: v.id("users"),
    taskId: v.id("tasks"),
    shopJobId: v.id("shopJobs"),
    amountCents: v.number(),
    state: v.union(
      v.literal("reserved"),
      v.literal("charged"),
      v.literal("released"),
      v.literal("refunded"),
    ),
  })
    .index("by_shop", ["shopJobId"])
    .index("by_user", ["userId"])
    .index("by_task", ["taskId"]),
  // Website chat (D158). New tables only; they start empty.
  chats: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastTaskId: v.optional(v.id("tasks")),
    /** Latest brief this chat is working on, and the pincode the customer gave. */
    briefId: v.optional(v.id("briefs")),
    pincode: v.optional(v.string()),
    /** Area or locality the customer gave ("Ameerpet, Hyderabad"), used to search when there is no pincode. */
    area: v.optional(v.string()),
    /** Plural word for who we call: "shops", "plumbers", "businesses". */
    noun: v.optional(v.string()),
  }).index("by_user_updated", ["userId", "updatedAt"]),
  chatMessages: defineTable({
    chatId: v.id("chats"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    kind: v.union(
      v.literal("text"),
      v.literal("question"),
      v.literal("brief"),
      v.literal("picker"),
      v.literal("calls"),
      v.literal("test_call"),
    ),
    text: v.string(),
    payload: v.optional(
      v.object({
        briefId: v.optional(v.id("briefs")),
        question: v.optional(v.string()),
        choices: v.optional(v.array(v.string())),
        index: v.optional(v.number()),
        total: v.optional(v.number()),
        questions: v.optional(v.array(v.string())),
        noun: v.optional(v.string()),
        draftId: v.optional(v.id("drafts")),
        taskId: v.optional(v.id("tasks")),
        /** D163: the picker lists matches for this business the customer named. */
        businessName: v.optional(v.string()),
      }),
    ),
  })
    .index("by_chat", ["chatId"])
    .index("by_user", ["userId"])
    /** Find the chat a task was started from (the "calls" card stores payload.taskId). */
    .index("by_task", ["payload.taskId"]),
  /** One row per chat turn that may call the model. Never deleted on failure, so the hourly limit cannot be reset. */
  chatTurns: defineTable({ userId: v.id("users") }).index("by_user", ["userId"]),
  notifications: defineTable({
    attempts: v.optional(v.number()),
    leaseUntil: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
    payload: v.optional(
      v.object({
        from: v.string(),
        to: v.string(),
        subject: v.string(),
        text: v.string(),
      }),
    ),
    taskId: v.id("tasks"),
    type: v.union(v.literal("started"), v.literal("completed")),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("error"),
    ),
    providerId: v.optional(v.string()),
    error: v.optional(v.string()),
  }).index("by_task_type", ["taskId", "type"]),
});
