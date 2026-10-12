/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as briefs from "../briefs.js";
import type * as callLog from "../callLog.js";
import type * as calls from "../calls.js";
import type * as connections from "../connections.js";
import type * as contactDetails from "../contactDetails.js";
import type * as contacts from "../contacts.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as discovery from "../discovery.js";
import type * as domain from "../domain.js";
import type * as drafts from "../drafts.js";
import type * as http from "../http.js";
import type * as intake from "../intake.js";
import type * as maintenance from "../maintenance.js";
import type * as mcp from "../mcp.js";
import type * as mcpAddresses from "../mcpAddresses.js";
import type * as migration from "../migration.js";
import type * as mutationSafety from "../mutationSafety.js";
import type * as notifications from "../notifications.js";
import type * as oauth from "../oauth.js";
import type * as onboarding from "../onboarding.js";
import type * as recordings from "../recordings.js";
import type * as tasks from "../tasks.js";
import type * as testCalls from "../testCalls.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as verification from "../verification.js";
import type * as websiteOrigins from "../websiteOrigins.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  admin: typeof admin;
  auth: typeof auth;
  briefs: typeof briefs;
  callLog: typeof callLog;
  calls: typeof calls;
  connections: typeof connections;
  contactDetails: typeof contactDetails;
  contacts: typeof contacts;
  credits: typeof credits;
  crons: typeof crons;
  discovery: typeof discovery;
  domain: typeof domain;
  drafts: typeof drafts;
  http: typeof http;
  intake: typeof intake;
  maintenance: typeof maintenance;
  mcp: typeof mcp;
  mcpAddresses: typeof mcpAddresses;
  migration: typeof migration;
  mutationSafety: typeof mutationSafety;
  notifications: typeof notifications;
  oauth: typeof oauth;
  onboarding: typeof onboarding;
  recordings: typeof recordings;
  tasks: typeof tasks;
  testCalls: typeof testCalls;
  users: typeof users;
  validators: typeof validators;
  verification: typeof verification;
  websiteOrigins: typeof websiteOrigins;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
