# Business-to-customer AI calling in India — rules, numbers and providers

Research for D167 (explore before deciding). Checked 26 October 2026. Research only, not legal advice; nothing built or tested. Labels: **[P]** primary source read (TRAI, PIB, gazette, provider's own page), **[S]** secondary source, **[I]** our inference, **[?]** not confirmed.

## The idea being tested

A business (clinic, D2C brand, coaching institute, restaurant) uploads its own customers' names, numbers and details. Boomerang's AI agent calls each one for feedback, reminders or similar tasks, from a number belonging to that business.

## Short answer

- **Feasible, but each business must register itself with the telecom system.** Boomerang cannot hold one shared number and call on behalf of many businesses.
- **Calls must be offer-free to count as "service" calls.** Feedback, appointment reminders and payment reminders to existing customers are most likely service calls [I]. Any offer in the script makes the whole call promotional [P].
- **Most of our likely clients cannot get the service-call number series yet.** The 1600 series is for banks, insurers and similar finance firms, plus government. The 1601 series (Phase I) covers only utilities and courier/logistics.
- **That leaves two routes for a clinic or shop:**
  - a 140 (promotional) number, which means calls only from 10 AM to 8 PM, DND checks and consent;
  - an ordinary 10-digit number declared to the operator as automated calling. Its legal status for commercial calls is unclear; get it confirmed in writing by the operator.
- **"One number per business" is the normal pattern**, but it costs each business paperwork and money (DLT registration ₹5,900 plus company documents), so it suits SMEs better than small shops.

## 1. Which calls count as what [P unless marked]

Source: TCCCPR as amended in 2025 (Regulation 1 of 2025) and 2026 (Regulation 05 of 2026).

| Call | Likely category | Consent |
|---|---|---|
| Delivery or service feedback to an existing customer | Service (bh)(i) [I: "feedback" is not named] | Implied by the purchase; no explicit consent needed |
| Appointment reminder or confirmation | Service (bh)(i) | Implied |
| Payment or due reminder | Service (bh)(i); transactional only within 30 minutes of a customer-started transaction | Implied |
| "Come back, here's an offer" | Promotional | Customer must not be on DND for that category, or explicit consent |

- **Mixed content:** "if promotional content is mixed with any type of commercial Voice Call, such voice call shall be treated as a Promotional Voice Call."
- **Upsell:** TRAI's 2025 reasoning: "No cross-sell, upsell messages and promotional offers to existing customers should be permitted as a service message."

## 2. Number series

- **140, promotional.**
  - Sender business and telemarketer must both be registered on DLT, the operators' registry of approved business callers [P].
  - Robocalls for promotion must use 140 only [P].
  - Vobiz assigns 140 numbers onto the client's own DLT entity ID [P].
- **1600, service and transactional.**
  - Only for finance firms regulated by RBI, SEBI, PFRDA or IRDAI, and for government [P, PIB].
  - The deadlines for those sectors to move to 1600 have passed.
- **1601, service and transactional for other sectors.**
  - Set out in the TRAI direction of 10 August 2026 [P; also Economic Times, The Hindu].
  - Phase I covers utilities, courier and logistics only; operators have 90 days to onboard them.
  - Numbers are "allocated directly to eligible entities, and not to intermediaries or aggregators". No date is known for later phases [?].
- **Ordinary 10-digit numbers.**
  - The 2025 rule says commercial calls must use registered headers or special-series numbers [P].
  - The 2026 amendment instead requires every sender to declare automated calls and their caller numbers to its operator in advance. Undeclared automated calls count as spam [P].
  - Automated calls from ordinary numbers pay an operator-to-operator charge of up to ₹0.05 per minute; special series are exempt [P].
  - So declared AI service calls from ordinary numbers appear tolerated but not clearly permitted [I]. **This needs written confirmation from the operator.**

## 3. Automated-call (A2P) rules from September 2026 [P]

TCCCPR Third Amendment, Regulation 05 of 2026, dated 18 September 2026. A2P ("application-to-person") calls are calls placed by software rather than a person dialling.

- **AI calls are covered.** A2P covers calls placed "by an application, software system, or automated platform without direct human dialling", explicitly including artificial voice. A live AI agent is covered.
- **Advance declaration.** The business must declare its automated calls and caller numbers to its operator beforehand. This starts about 17 November 2026; dates run from gazette publication, which we did not see [?].
- **Complaint triggers tighten.** From about December 2026, 3 unique complaints in 10 days plus an AI flag trigger action, instead of 5 complaints. Action escalates up to disconnection.
- **Penalties for an unregistered or misbehaving sender:**
  - first offence: all outgoing calls barred for 15 days, across all operators;
  - second offence: disconnection for 1 year and blacklisting.
- **Platform risk.** If a client spams using an intermediary's numbers, operators act against the intermediary's resources. In practice, one bad client could get Boomerang's own lines cut.
- **AI disclosure.** No TRAI rule requiring the call to say it is an AI was found [?]. Disclosing at the start is still advisable, and matches D141's "truthful if asked".

## 4. Data protection (DPDP)

- **Roles:** the client business is the Data Fiduciary, the party responsible for the data. Boomerang is its Data Processor and needs a written contract with each client, including security terms; logs must be kept for 1 year [P, DPDP Act s. 8(2), Rules 6(1)(e)-(f)].
- **Dates:**
  - the notice, security, breach and retention rules apply from 13 May 2027 [P, G.S.R. 846(E)];
  - the consent-manager rule applies from 13 November 2026 [P].
- **Lawful basis:** the business's original notice or consent must cover phone outreach for that purpose. TRAI consent does not exempt anyone from DPDP [P].
- **Call recording:** no specific Indian consent rule was found [?]. Announcing the recording is best practice.

## 5. Providers

| Provider | Relevant offer | Notes |
|---|---|---|
| Vobiz (current) | Ordinary local numbers (~$1/month), toll-free, 140, 160 | KYC is per number. Sub-accounts or partner child accounts give each client its own KYC, done through a hosted flow inside our product. "The number used to call a person must be linked to the KYC of the business that actually makes those calls." 140/160 pricing is enterprise quote only [?]. Its FAQ says 160 is "BFSI only". [P] |
| Sarvam (current agent) | Rents 11/79/80-series numbers at ₹59 per 30 days via Vobiz; or bring your own provider | No 140/1600/1601. Agent ₹3.00–3.50/min. [P] |
| Tata Tele Business | 1600, toll-free, virtual numbers (₹950–1,100/month) | No 1600 price published [P] |
| Exotel, Ozonetel, Plivo | 140 through a DLT-registered telemarketer; 1600/1601 for eligible entities | No prices found [P/?] |

How AI-calling platforms handle numbers:

- **Bolna:** makes each client register on Tata DLT itself (₹5,900, plus company documents). 140 numbers come via Vobiz and 160 via Plivo [P].
- **Ringg:** clients bring their own operator account; "You still own registration, consent and number allocation." ₹6 per connected minute [P].
- **No platform found offers a shared, pooled number** that calls on behalf of many businesses [I].
- **No published price was found for a feedback-call product**; only per-minute rates [?].

## 6. What this means if we choose option (a)

[I] proposals, not decisions:

1. Give each client business its own Vobiz partner child account, so KYC and numbers sit in the business's name.
2. **Start with service-only scripts** (feedback, reminders) and enforce "no offers" in the brief.
3. **Have each business register on DLT** as a Principal Entity, the sender business itself.
4. Use 1600/1601 where the business is eligible. Otherwise use a declared ordinary number for service calls (only after operator confirmation), and 140 for anything promotional.
5. File the advance automated-calling declaration in each client's name.
6. Sign a processor agreement with each client, collect customer lists with a statement that customers were told they may be contacted, and honour opt-outs.
7. Watch complaint rates per client, since 3 complaints in 10 days can trigger action.

**Open questions to put to Vobiz and an Indian telecom lawyer:**

- Can a non-eligible-sector business (a clinic, say) make declared AI service or feedback calls from an ordinary number?
- What do 140 numbers cost, and how long do they take to set up?
- Does Vobiz support filing the A2P declaration for partner child accounts?

## Sources

- TRAI TCCCPR Second Amendment 2025: https://trai.gov.in/sites/default/files/2025-02/Regulation_12022025.pdf
- TRAI TCCCPR Third Amendment 2026: https://www.trai.gov.in/sites/default/files/2026-09/Regulation_18092026.pdf ; press release 119/2026: https://www.trai.gov.in/sites/default/files/2026-09/PR_No119of2026.pdf
- TRAI 1601 series, press release 113/2026: https://trai.gov.in/sites/default/files/2026-08/PR_No113of2026_1.pdf ; Economic Times: https://telecom.economictimes.indiatimes.com/news/policy/trai-initiates-implementation-of-1601-series-numbers-for-utilities-courier-logistics-firms/133095763
- PIB on 1600 for BFSI: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2191647 ; PIB on the 2025 amendment: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2102413
- DPDP Rules 2025: https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
- Vobiz: https://vobiz.ai/docs/faq/number-series ; https://vobiz.ai/docs/best-practices/140-160-acquisition ; https://vobiz.ai/docs/concepts/sub-accounts-vs-partner-accounts ; https://vobiz.ai/pricing/
- Sarvam: https://sarvam.ai/products/voice-agents/pricing ; https://docs.sarvam.ai/voice-agents/deploy/telephony/rent-from-sarvam
- Bolna: https://bolna.ai/docs/obtaining-regulated-phone-numbers ; Ringg: https://ringg.ai/voice-ai-compliance-india
- Tata Tele: https://www.tatatelebusiness.com/marketing-solutions/1600-phone-number-series/

Method: two research subagents read the sources above. The assistant spot-checked the 1601 direction and the September 2026 A2P amendment against independent news and summary sources. Specific clause numbers and prices were not individually re-read.
