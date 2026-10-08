# Signed-in experience: five improvements

7 October 2026. Recommendations for prioritisation; no app changes approved or made.

The biggest problem is that signing in does not lead users through setup to their first useful result. The pieces exist, but users have to work out how they fit together.

## Top five, in recommended order

### 1. Make “Connect your assistant” a complete setup guide

**Current problem:** Account offers “Create access key” under “Connect your AI assistant,” then stops. It has no MCP address, app-specific steps, agent-skill prompt, example request, or connection check. MCP is the connection that lets an assistant use Boomerang. Instructions exist on the public landing page and in the skill file, but the signed-in app does not link to them. `/setup` redirects to the marketing homepage.

**Proposed improvement:** Give assistant setup its own destination. Let users choose their assistant, copy the server address or the existing skill setup prompt, follow sign-in and account approval, and test the connection. Put short help beside each step: where to paste the address, how to recover from an expired connection, and what to do if their assistant cannot add connections. Keep manual access keys under advanced setup. Clearly distinguish “signed into Boomerang” from “assistant connected”; never mark connected merely because someone copied the address or created a key.

**Complete when:** A new user can reach setup from any app page, connect a supported assistant, verify authenticated `account_status`, and copy a first shop-search request without finding the marketing page themselves. Verify current provider instructions when building; this audit does not validate their current plan eligibility or menu paths.

### 2. Show the cost and requirements before “Call shops”

**Current problem:** The shop picker receives `answerPriceCents` and submits it as approval, but never displays the rate or selected-shop maximum. Its only explanation is “Calls use your account credit.” The backend reserves the maximum for selected shops and can reject a missing name, missing phone number, or insufficient credit after the user presses Call. The backend even tells users to review a price “shown in the shop search,” although that price is absent from the picker.

**Proposed improvement:** Beside the action, show the actual configured service price per chargeable answer, selected-shop maximum, available credit, and what held credit means. Explain when an answer is charged without implying only in-stock answers count. Show account or shop requirements early with a direct action, such as “Add your name” or “Pick fewer shops.” Preserve the search and selection when completing account details. Keep the five free personal test requests separate from shop-call credit. Do not offer a working “Add credit” button until there is a working payment route.

**Complete when:** Users know the maximum they are approving, why calls may be unavailable, and how to proceed before sending a call request. Use real configured values; this is not a pricing change.

### 3. Give the app clear, consistent navigation

**Current problem:** The header contains only My tasks, Demo, and Account. Find shops is hidden behind the logo or a button on task history. There is no setup/help destination or indication of the current page. Header links reload the app while unsent product inputs, results, and selections live only in component memory.

**Proposed improvement:** Use a stable menu: **Find shops · My tasks · Connect assistant · Help**, with Account in a consistent place and Demo available from Help. Mark the current destination visibly and for screen readers. Preserve an unfinished search when users visit account or help, and give task pages a clear return path. This can remain a compact header; a sidebar is not required.

**Complete when:** Users can name where they are, find every main destination without using the logo as a hidden menu, and return to their unfinished request without re-entering it. Check the same navigation at 320px and desktop widths.

### 4. Make first login show a useful next step

**Current problem:** Sign-in from `/account` goes to My tasks. New accounts see a history empty state and Find shops, but receive no explanation of assistant setup, their one-time $1 credit, or the five free personal test requests. Account still says “Sign in with your email” when the user is already signed in. The optional test-call component sits above the search form and can grow with its history and results.

**Proposed improvement:** Add a compact first-use panel to the existing entry page: account verified, name for calls, connect an assistant, and make a first request. Lead with assistant setup, consistent with D44; offer the website search as another usable route. Explain the welcome credit only when appropriate for that account, and offer “Try a call to yourself” as an optional step. Returning users should see their active work or the next request action without repeating onboarding.

**Complete when:** A new user can answer “What can I do now?” and “What is free?” on their first signed-in screen. Opening a task link or an assistant approval link must still return to that original destination.

### 5. Use one consistent presentation for progress and results

**Current problem:** `/app?task=…` uses `CallCard`; `/status?task=…` uses `TaskDetails`. The first has a progress bar, outcome counts, SVG call/map controls and a link saying “Open live status on website” while already on the website. The second uses separate shop cards, text-symbol controls and different status wording. The same `answered` outcome with unknown stock reads “Answered · stock unconfirmed” in one view and “Some details unconfirmed” in the other. The inline website view offers no explicit new-search action after it hides the search form for an active task.

**Proposed improvement:** Share shop status wording, result rows, controls and evidence presentation across the website views; keep the embedded assistant card compact where required. Keep stock, quoted final price, offers, time, recording and transcript in predictable places. Use “View full details” when already on the website, and expose “Find another product” with a clear route back to existing tasks. Standardise page headings, spacing and mobile control sizes as part of this work, using DESIGN.md.

**Complete when:** The same task has the same outcome and next actions wherever it is opened. Users can understand the answer, inspect its proof, call/map the shop, and start another search without losing the saved task.

## Findings and source evidence

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Writing / setup | `web/src/AccountDetails.tsx:11`; `web/public/SKILL.md:24`; `vercel.json:8` | Create access key is presented as assistant setup; guide absent from app | Complete guided connection with verified status and linked help | Users cannot finish the intended assistant entry path from the account page alone |
| HIGH | Writing / cost | `web/src/App.tsx:30`; `convex/tasks.ts:65`; `convex/credits.ts:96` | Rate is submitted without being shown; maximum reserved by backend | Display configured rate, selected maximum and requirements before approval | Users approve spending without seeing the amount |
| MEDIUM | Layout / navigation | `web/src/App.tsx:23–25` | Three links, no named search/setup/help or current-page marker; unsent state held in memory | Stable destinations and preserved search context | Users must discover routes and repeat work after visiting settings |
| MEDIUM | Layout / onboarding | `web/src/App.tsx:26–27`; `web/src/TaskHistory.tsx:12`; `web/src/TestCalls.tsx:29` | Login leads to history; onboarding benefits scattered; test UI precedes search | Compact first-use guidance and optional rehearsal | Users lack a clear first action and explanation of allowances |
| MEDIUM | UI / results | `web/src/App.tsx:34–41`; `web/src/TaskDetails.tsx:17–21`; `web/src/tasks.css:1` | Separate result presentations, status wording and controls | Shared status and result patterns with clear next actions | The same request requires relearning its presentation |

## Scope and coverage

Reviewed the customer website after sign-in: account/profile, assistant setup and approval, shop search/picker, optional personal test, task history, inline progress, and task details. The embedded card was inspected only where shared components explain website inconsistencies. Stack: React/Vite, Convex, plain CSS. Project references: AGENTS.md, memory.md, DESIGN.md and the existing public agent skill.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Native controls and labels, focus CSS, reduced-motion CSS, task tabs and accessible account tree | Static review only; full keyboard and screen-reader checks not verified. Task tabs declare tab roles without arrow-key handling. |
| Layout | Shell, first-use order, account grouping, task presentations, responsive rules | Findings 3–4; mobile clipping and 200% zoom not verified |
| Writing | Setup, sign-in, cost approval, empty/loading/error states and status labels | Findings 1–2 and 4–5 |
| Typography | System-font rules, input sizes, headings and task metadata | Mobile inputs declare 13px; check iPhone focus zoom when building. Actual wrapping and readability not visually verified. |
| Colours | Declared status colours and textual cues | Text accompanies status colours. Rendered contrast and dark mode not verified; no contrast pass claimed. |
| UI polish | Two result implementations, SVG versus symbol controls, CSS interaction rules | Finding 5; rendered motion and hover states not verified |

## Verification and limits

- **Live account checked:** Safari's accessibility tree at `https://askboomerang.vercel.app/account` showed a signed-in account, $1 available credit, a saved caller name, Create access key, My tasks and Sign out. It confirmed the missing setup instructions and the signed-in sign-in wording.
- **Source checked:** Traced route selection, login return destination, setup packaging, skill instructions, local search state, pre-call validation, credit reservation, personal-test allowance, history links and both result components. Read the loading/empty/error branches; existing global error recovery was accounted for.
- **Not verified:** A fresh email-login flow, full connection approval, live shop search/calling, payment, recordings, task-history rendering, mobile/zoom and visual presentation. Browser inspection was interrupted by user activity and a browser timeout. No outbound calls, emails, new access keys or spending were performed.
- No application source changed. Tests were not run because this is an inspection and proposal, not an implementation.

## Verdict and next step

**Block:** The setup path and missing spending preview should be fixed before treating first-time onboarding as ready. This is a usability verdict, not a claim that existing calls are broken.

Recommended first build: improvement 1, with the menu entry needed to reach it. Choose priorities before implementation. All five remain proposals; D44, D97, D130 and D134 remain the recorded product decisions.
