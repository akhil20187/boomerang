# Human MCP: market research

Research date: 2 October 2026. Scope: AI requests human execution or expert input and receives the result back. Primary sources only for product claims; research papers for independent observations. No accounts created, payments made, or workflows tested. Public documentation proves an offer exists, not that it works reliably.

## Finding

The general idea already exists. **Humwork closely matches expert review; RentAHuman closely matches physical task completion; human-mcp.io describes almost the entire proposed broad marketplace, including prepaid money.** A new connector alone would have little demonstrated distinction. A particular task with better access, response time, evidence, or local service could still be worth testing. That is an interpretation, not proof of an opportunity.

## Closest competitors

| Product | Mechanism and overlap | Published economics | Evidence limits |
|---|---|---|---|
| **[Humwork](https://humwork.ai/)** | Agent chats with a verified domain expert through MCP or an API. Shares context and returns expert help. Covers engineering, design, marketing and other knowledge work. Strongest overlap with the expert-review mechanism. | [Terms](https://humwork.ai/terms) describe prepaid credits, approximately $1 per credit with package differences, time-based billing in advance, a minimum charge, and expert rates disclosed before consultation. Exact rates and platform fee are not public there. | [YC profile](https://www.ycombinator.com/companies/humwork) confirms an active Spring 2026 company and describes connection in under 30 seconds. Speed, vetting quality and domain availability are company claims, not measured here. |
| **[RentAHuman](https://rentahuman.ai/)** | Marketplace for agents to hire local humans for physical work. [Docs](https://rentahuman.ai/docs) list provider search, messages, task bounties, delivery evidence, escrow, payment release, disputes and wallets. Strongest overlap with offline completion. | Search is free; hiring uses worker prices and payment flows. A uniform platform percentage was not verified. | Official site claims 750,000+ humans, 100+ countries and $500,000+ paid to humans. These are self-reported totals, not an audit of successful tasks or available workers in a particular city. [YC profile](https://www.ycombinator.com/companies/rentahuman) confirms Spring 2026 participation and describes deployments. |
| **[human-mcp.io](https://human-mcp.io/)** | Broad digital-services marketplace with automatic matching, task posting, deliverables, callbacks and prepaid wallet. [Docs](https://human-mcp.io/docs) describe 19 MCP tools for discovery, task status, attachments and payment approval. Nearly exact overlap with the broad proposal. | Docs say budget plus 15% fee; $40 task costs $46; providers keep the task budget. | Homepage payment answer instead says fee is deducted from provider funds. This inconsistency needs clarification. No independently verified transactions, response times, worker pool or funding found. Treat as a documented offering rather than an established successful marketplace. |
| **[HumanInLoop](https://humaninloop.org/)** | Claims verified operators, API/MCP submission, matching and structured results for inspections, deliveries, research and other physical work. Describes office support in Cebu. | Advertises 0% for direct crypto payment; 10% managed fee; custom enterprise pricing. | Marketing claims only: operator verification, background checks, capacity and service levels were not tested. Documentation URL did not load in this research. Published fee wording also says managed operators keep 90%, so confirm who bears the charge before comparing total prices. |

MCP means the common connection format through which an AI can discover and call outside tools. It is a delivery interface; these businesses must also find, pay and manage the people doing the work.

## Related products: different jobs

| Category | Examples and documented behavior | Why it matters |
|---|---|---|
| Existing human input and approval tools | HumanLayer's historical [Python package](https://pypi.org/project/humanlayer/0.5.8/) offers `human_as_tool()` for questions, advice or feedback, and approval controls. Its [current website](https://www.humanlayer.dev/) markets a multiplayer coding workspace: free small-team plan and $100/user/month Pro. | Do not confuse historical human-contact tooling with today's paid worker marketplace. Users can wire an agent to people they already know. |
| Workflow pause/resume | [LangGraph](https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt) saves agent state, pauses for human input and resumes with the answer. Includes review and editing patterns. | The mechanics of pausing and returning a result are already available. Recruiting suitable humans and assuring results remain separate work. |
| Managed human operations | [Humans in the Loop](https://humansintheloop.org/) offers annotation, human feedback and real-time edge-case handling. [Invisible](https://www.invisible.co/) describes combined automation and human-led evaluation. | Businesses can purchase managed human operations instead of assembling an open marketplace. These offers do not establish on-demand consumer expert review. |
| Expert evaluation of AI systems | [Scale](https://scale.com/evaluation/public-sector) offers expert human raters and evaluation processes. [Human in the Loop, Inc.](https://humanintheloop.inc/) offers validation of chatbots and agent workflows. | Reviewing an AI system is different from a qualified professional reviewing one person's financial or tax decision. Both use humans but have different buyers and outputs. |
| Historical human-work API | Mechanical Turk provided tasks and worker results through an API. **It is closed as of this research date**, according to [AWS documentation](https://docs.aws.amazon.com/mturk/) announcing closure on 30 September 2026. [AWS's 29 September update](https://aws.amazon.com/about-aws/whats-new/2026/09/aws-service-availability/) reports availability ended as of 29 September. | Important precedent, not a current integration recommendation. Old homepage and pricing pages remain accessible; that does not mean service is available. |

Do not merge similarly named businesses: rentahuman.ai, rentahuman.co and renthuman.com are different domains. HumanInLoop, Humans in the Loop and Human in the Loop, Inc. also refer to different offers.

## What is actually validated?

- Public products and documentation establish that people are building this category. They do not establish demand for Akhilesh's selected task, because no task has been selected.
- A [February 2026 preprint](https://arxiv.org/abs/2602.19514) examined 303 RentAHuman bounties and identified 99 originating through programmatic channels. This supports evidence of API/MCP task posting, not successful paid completion or repeat purchasing.
- An [August 2026 paper](https://arxiv.org/abs/2608.18547) audited a nonrandom May snapshot of 981 listings, almost all RentAHuman; 779 remained after screening. It studied listing evidence requirements, not actual worker submissions or worker experience. Its sample cannot establish market size or success rates.
- Marketplace signups, posted tasks, payment totals and recurring revenue measure different things. None alone shows repeat customers receiving satisfactory outcomes.

## Funding: verified versus unknown

[YC profiles](https://www.ycombinator.com/companies/rentahuman) establish RentAHuman's Spring 2026 membership; [Humwork](https://www.ycombinator.com/companies/humwork) is also Spring 2026; [HumanLayer](https://www.ycombinator.com/companies/humanlayer) is Fall 2024. No specific total funding figure was verified from a company or investor announcement in this research. Do not infer total funding from accelerator participation or repeat conflicting directory estimates. No verified funding figures found for the smaller marketplaces above. Funding would signal investor interest, not demand for this sprint's use case.

## Sprint implications

Google Trends growth was not verified. Category launches and YC participation are evidence of company activity, not proof of rising search interest. Once a task is chosen, check the words its users actually search for in the relevant country; this report makes no search-growth claim.

These are provisional assessments against the four kill rules, not a completed idea-selection sheet.

| Rule | Assessment |
|---|---|
| Could ChatGPT alone do it? | A human must supply some real capability: offline access, accountable expertise or unavailable information. Generic research or a rewritten answer is weak evidence. Compare the whole result against the best available existing assistant plus connected tools; avoid assuming all AI work stops at chat. |
| Is AI essential? | Stronger if it tries the task, isolates the missing work, transfers context and uses the returned result. If a person does the whole job and AI only sends a notification, necessity is unproven. |
| Is regulation within your control? | Unresolved until the task, country and provider are defined. Financial, insurance, tax and medical review need a separate check of applicable professional requirements. Adding a human does not establish compliance. This report makes no legal determination. |
| Can required data be obtained within two weeks? | A small real task may be testable with permission and an available provider. A general expert marketplace or InvestValue integration has no confirmed access yet. Public competitor APIs do not guarantee access to the particular data or people needed. |

**The marketplace risk is operational:** availability in the right place or field; acceptance within the promised time; adequate evidence; quality review; payment and failed-task handling. Expert review additionally requires demonstrable competence and a useful answer. More registered providers do not guarantee these conditions.

For store stock and price calls, public documentation above does not establish a service that will reliably call the specified Indian shops and return fresh, comparable answers. For expert review, Humwork is already a close generic alternative. These are two different experiments and should be measured separately.

## Next research step

Choose one real request and compare three routes: the existing AI workflow, an existing marketplace or known provider, and the proposed handoff. Record elapsed time, human time, price, evidence quality, failures and willingness to pay. First secure a named user and a named provider. A completed result is more useful than building a broad directory or prepaid balance before that evidence exists.
