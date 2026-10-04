import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { productV, shopV, answerV, jobStateV } from "./validators";
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
    userId: v.id("users"),
    productInput: v.string(),
    product: productV,
    pincode: v.string(),
    cards: v.array(v.string()),
    comments: v.string(),
    radiusKm: v.number(),
    shops: v.array(shopV),
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),
  tasks: defineTable({
    verification: v.optional(v.boolean()),
    userId: v.id("users"),
    draftId: v.id("drafts"),
    title: v.string(),
    type: v.literal("shop_calls"),
    detailsVersion: v.number(),
    product: productV,
    pincode: v.string(),
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
    .index("by_user_operation", ["userId", "idempotencyKey"]),
  shopJobs: defineTable({
    taskId: v.id("tasks"),
    shop: shopV,
    state: jobStateV,
    attemptCount: v.number(),
    retryAt: v.optional(v.number()),
    answer: v.optional(answerV),
    executor: v.literal("AI"),
    billingState: v.union(v.literal("not_assessed"), v.literal("released")),
    latestAttemptId: v.optional(v.id("callAttempts")),
  }).index("by_task", ["taskId"]),
  callAttempts: defineTable({
    taskId: v.id("tasks"),
    shopJobId: v.id("shopJobs"),
    number: v.number(),
    executor: v.literal("AI"),
    status: v.string(),
    startedAt: v.number(),
    answeredAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    providerCallId: v.optional(v.string()),
    providerRequestId: v.optional(v.string()),
    endReason: v.optional(v.string()),
    answer: v.optional(answerV),
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
    userId: v.id("users"),
    taskId: v.optional(v.id("tasks")),
    amount: v.number(),
    currency: v.literal("USD"),
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
