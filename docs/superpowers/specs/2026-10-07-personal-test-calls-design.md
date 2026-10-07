# Personal test calls

D130: every signed-in customer can enter their own mobile number, confirm it is theirs, and try five calls without SMS verification. User approved building the signed-in Find shops placement.

Implementation assumption, stated while the pricing/counting question was pending: five free lifetime attempts per account, including missed calls. No automatic redial; no credit charge; no quota reset on phone change, refresh, sign-out or duplicate submissions. Disabled calling and invalid input do not create a trial. A request that creates a task consumes one attempt even if it later fails. Existing Sarvam v2 five-minute limit applies. This does not alter paid shop-call pricing.

On /app, a compact white bordered section above product search expands to a mobile-number field, own-number checkbox and Call me button. Show the sample iPhone enquiry and explain that the user plays the shopkeeper. Show remaining allowance and all five private test attempts, current status, collected answers, transcript and recording using existing components. Signed-out visitors use the normal sign-in screen; homepage calling is not added.

Add an optional selfTest flag and indexed user/selfTest lookup to tasks. A new authenticated backend mutation atomically enforces the quota, idempotency and one active test per account, then schedules the existing call dispatcher. Accept Indian mobile numbers in local ten-digit or +91 format. No public access-token shortcut to this mutation. Test task records reuse existing private transcript, result and recording storage but never reserve credits, schedule shop retries or send shop-status emails. Test rows in task history link back to /app, avoiding misleading shop maps/ratings.

Verify authentication, own-number confirmation, number validation, quota/races, idempotency, no charge, no retry, private results and deployment. Inspect browser form and empty/remaining/exhausted states without placing unsolicited calls. A live personal call is a separate explicitly requested test.
