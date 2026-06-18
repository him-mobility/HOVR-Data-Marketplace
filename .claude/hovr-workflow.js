export const meta = {
  name: 'hovr-rebuild',
  description: 'Build robot-data-lake-site by executing hovr-rebuild-kit phases 01-08 sequentially with verify+fix gates',
  phases: [
    { title: 'P1 Foundation' },
    { title: 'P2 Data+Seed' },
    { title: 'P3 Home' },
    { title: 'P4 Demo' },
    { title: 'P5 HOVI' },
    { title: 'P6 QA' },
    { title: 'P7 Search' },
    { title: 'P8 Verify' },
  ],
}

const ROOT = 'C:/Users/ums/myseo/github/hovr-final'
const KIT = ROOT + '/hovr-rebuild-kit'
const APP = ROOT + '/robot-data-lake-site'

const PHASE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'summary', 'buildPassed', 'filesWritten', 'issues'],
  properties: {
    status: { type: 'string', enum: ['pass', 'fail'], description: 'pass only if build (and tests where applicable) are green' },
    summary: { type: 'string', description: 'what was implemented this phase, 2-5 sentences' },
    buildPassed: { type: 'boolean', description: 'did `npm run build` exit 0' },
    testsPassed: { type: 'string', description: 'test result e.g. "10/10 pass" or "n/a" if phase has no tests' },
    seedOutput: { type: 'string', description: 'for phase 2: the seed summary line (positions/uniqueCoords/media), else "n/a"' },
    filesWritten: { type: 'array', items: { type: 'string' }, description: 'relative paths created/modified' },
    issues: { type: 'array', items: { type: 'string' }, description: 'unresolved problems or deviations from spec; empty if clean' },
  },
}

const GLOBAL = `You are implementing the HOVR Rebuild Kit. The Next.js 14.2.35 app is ALREADY scaffolded at ${APP} with ALL dependencies installed (next, react, better-sqlite3, maplibre-gl, recharts, @anthropic-ai/sdk, tsx, vitest, @types/better-sqlite3) and package.json scripts set (dev/build/start/lint/seed/pretest/test/test:watch). DO NOT run create-next-app and DO NOT run npm install — deps are present. better-sqlite3 native module is verified working on this machine (Node 24, Windows).

WORKING DIRECTORY for all commands: ${APP}

AUTHORITATIVE SPECS (read them, implement EXACTLY — values/classes/SVG/Korean copy verbatim):
- Global principles & invariants: ${KIT}/00_README.md (especially §3 global principles, §4 env vars)
- Your phase spec: read the specific file named in your task below.

NON-NEGOTIABLE GLOBAL INVARIANTS (00_README §3):
1. key-optional: ANTHROPIC_API_KEY is optional; every AI feature (agent/chat/recommend) MUST have a deterministic fallback. No key is set on this machine, so fallbacks WILL run.
2. Customer-exposure hygiene: customer screens (home/demo/chat/recommend) must NEVER show SQL, tool names (search_records etc.), table/column names, "synthetic data" admissions, PRNG/dev process, or infra (S3/Terraform).
3. Deterministic PRNG = mulberry32 (seed 42) ONLY. Never LCG. Enforce unique (lat,lng) > 95,000.
4. Coordinates inside city-radius boxes, coord<->project 1:1 (no points in sea/mountain/other regions).
5. Map paint colors hex/rgb only (never oklch).
6. Data nationwide: total 98,043 (97,843 generated + 200 external).

ENVIRONMENT/PLATFORM RULES:
- Windows. The Bash tool is git-bash (POSIX sh); PowerShell also available. Use absolute paths.
- NEVER run long-running/blocking commands: no \`npm run dev\`, no \`npm start\`, no \`next dev\`, no dev servers, no \`vitest\` watch. ONLY terminating commands: \`npm run build\`, \`npm test\`, \`npm run seed\`, \`node scripts/gen-extra.mjs\`, \`npx tsc --noEmit\`.
- When running build/test, give the command a long timeout (build can take 2-4 min). cd into ${APP} first.

VERIFY-AND-FIX (mandatory): after writing your phase's code, run the verification for your phase, READ the errors, FIX them, and re-run until green. Only return status:"pass" when the verification actually passes. If you exhaust reasonable attempts and are still blocked, return status:"fail" with precise \`issues\`. Your final message MUST be the structured object — it is data, not prose for a human.`

function prompt(specFile, phaseTitle, instructions) {
  return `${GLOBAL}

=== ${phaseTitle} ===
Read ${KIT}/00_README.md and ${KIT}/${specFile} now, then implement that phase.

${instructions}`
}

async function runPhase(num, title, specFile, instructions, hardGate) {
  phase(title)
  let res = await agent(prompt(specFile, title, instructions), {
    label: `phase-${num}`,
    phase: title,
    schema: PHASE_SCHEMA,
    effort: 'high',
  })
  if (!res) {
    log(`Phase ${num} agent returned null (died/skipped).`)
    if (hardGate) throw new Error(`HARD GATE: phase ${num} (${title}) produced no result; aborting.`)
    return { status: 'fail', summary: 'agent returned null', buildPassed: false, testsPassed: 'n/a', filesWritten: [], issues: ['agent died or was skipped'] }
  }
  if (res.status !== 'pass') {
    log(`Phase ${num} reported fail. Spawning one targeted fix agent.`)
    const fix = await agent(`${GLOBAL}

=== FIX PASS for ${title} ===
A previous agent implemented ${specFile} but verification did NOT pass. Reported issues:
${(res.issues || []).map((i) => '- ' + i).join('\n')}
Previous summary: ${res.summary}

Read ${KIT}/00_README.md and ${KIT}/${specFile}. Inspect the current state of ${APP}, diagnose the failure, fix it, and run the phase verification until it passes. Return the structured object.`, {
      label: `phase-${num}-fix`,
      phase: title,
      schema: PHASE_SCHEMA,
      effort: 'high',
    })
    if (fix && fix.status === 'pass') res = fix
    else {
      const merged = fix || res
      if (hardGate) throw new Error(`HARD GATE: phase ${num} (${title}) failed after fix attempt. Issues: ${JSON.stringify((merged.issues || []))}`)
      res = merged
    }
  }
  log(`Phase ${num} (${title}): ${res.status}. ${res.summary}`)
  return res
}

const results = {}

// Phase 1 — Foundation (hard gate). Scaffold+deps already done; implement design system + shell + brand.
results.p1 = await runPhase(1, 'P1 Foundation', '01_FOUNDATION.md', `The app is scaffolded and deps installed. Implement sections B-K of 01_FOUNDATION.md: tailwind.config.ts theme.extend (verbatim), Google Fonts <link> in layout, globals.css (verbatim), layout.tsx + metadata, SiteChrome (BARE for /demo), SiteHeader (teal-highlighted /search pill), SiteFooter, Section wrapper, HimWordmark + GraphicMotive brand SVGs (verbatim paths). Put brand SVGs in src/components/brand/, shell in src/components/site/. Per the README's last line: content.ts (phase 3) and ChatWidget (phase 6) do not exist yet — create minimal temporary STUBS so the build passes (a stub content.ts exporting NAV/SITE used by the header/footer, and a no-op ChatWidget). Later phases will replace them.
VERIFY: \`cd ${APP} && npm run build\` exits 0 (warnings allowed, errors not).`, true)

// Phase 2 — Data model & seed (hard gate). Must hit 98,043 + uniqueCoords>95000 + 6 tests.
results.p2 = await runPhase(2, 'P2 Data+Seed', '02_DATA_MODEL_AND_SEED.md', `Implement: src/lib/rng.ts (mulberry32 verbatim), src/lib/schema.ts (SEED/TOTAL/DISPLAY_TOTAL, EVENT_TYPES with exact counts summing to 97843, PROJECTS, REGIONS/CAPITAL_REGIONS/METRO_REGIONS, REGION_PROJECTS, enums, SCHEMA_SQL 4 tables+indexes), src/lib/paths.ts, src/lib/db.ts (read-only singleton), scripts/gen-extra.mjs (exactly 200 records, mulberry32 seed 20260617, radius-box coord validation), scripts/seed.ts (deterministic generation, coord<->project alignment, radius box placeNear, event assignment incl. rain-weighted accident sampling, observation correlations, media ~34%), scripts/seed.test.ts (the 6 invariants).
VERIFY in order: \`cd ${APP} && node scripts/gen-extra.mjs\` (creates scripts/extra-records.json, exactly 200) → \`npm run seed\` (must print positions=98043, uniqueCoords>95000, media in ~30k-37k) → \`npm test\` (6/6 pass) → \`npm run build\` exits 0. Report the seed summary line in seedOutput.`, true)

// Phase 3 — Marketplace home.
results.p3 = await runPhase(3, 'P3 Home', '03_MARKETPLACE_HOME.md', `Replace the phase-1 content.ts STUB with the full src/lib/content.ts (SITE, NAV with /search, HERO with 4 stats derived from schema: DISPLAY_TOTAL "매월 갱신" / 항목 나열 / 항목 나열 / "수도권 외 21개 지역", SALES, PRICING, LINEAGE, EVENTS; also export PROOF/PRINCIPLES/WORKFLOW/LESSON/CHECKLIST/DIALOGUE but DO NOT render them on /). Implement src/app/page.tsx (Hero→DataSales→Lineage→Pricing) and src/components/site/sections.tsx (Hero, DataSales, Lineage, Pricing). Keep header/footer working with the now-complete content.ts.
VERIFY: \`cd ${APP} && npm run build\` exits 0; confirm the 4 hero stats render the exact required strings.`, false)

// Phase 4 — Demo dashboard.
results.p4 = await runPhase(4, 'P4 Demo', '04_DEMO_DASHBOARD.md', `Implement src/lib/query.ts (Filters/parseFilters/buildWhere), optional src/lib/route.ts safe(), src/components/demo/types.ts, the 5 data APIs (/api/geo /api/facets /api/aggregate /api/records /api/record/[idx], all runtime=nodejs dynamic=force-dynamic), src/app/demo/page.tsx, DemoApp.tsx, MapView.tsx (MapLibre v5, center [127.0,36.35] zoom 6.4, CARTO dark-matter, cluster layers, colors hex/rgb ONLY), Charts.tsx (Recharts), Ledger.tsx, Drawer.tsx, FilterModal.tsx. MapView must be next/dynamic ssr:false. AgentPanel (phase 5) not built yet — render a minimal placeholder in DemoApp's right column for now.
VERIFY: seed DB exists from phase 2. \`cd ${APP} && npm run build\` exits 0. Map paint colors must be hex/rgb (no oklch).`, false)

// Phase 5 — HOVI agent.
results.p5 = await runPhase(5, 'P5 HOVI', '05_HOVI_AGENT.md', `Implement src/lib/agent-tools.ts (5 tools + TOOL_DEFS + runTool, describe_schema note with NO synthetic/internal mention), src/app/api/agent/route.ts (key-optional: returns {noKey:true} when no key; tool loop max 6 turns when key present), and replace the DemoApp placeholder with the real src/components/demo/AgentPanel.tsx (customer-friendly: NEVER render tool traces/SQL/code; extract only "N건" counts; related-data chips; "관련 데이터를 살펴보는 중…" pending; SCENARIOS script fallback for no-key). Wire onApplyFilter to DemoApp's filter sync.
VERIFY: \`cd ${APP} && npm run build\` exits 0. Confirm no tool/SQL/table names can reach the rendered panel.`, false)

// Phase 6 — QA chatbot.
results.p6 = await runPhase(6, 'P6 QA', '06_QA_CHATBOT.md', `Implement src/lib/kb.ts (CHUNKS incl internal+customer, INTERNAL_IDS set, CUSTOMER_CHUNKS, CUSTOMER_GOLDEN, GOLDEN, SUGGESTED, retrieve() over CUSTOMER_CHUNKS only, answerFromGolden() over CUSTOMER_GOLDEN only with "범위 밖" fallback), src/app/api/chat/route.ts (key-optional, customer-scope evidence), replace the phase-1 ChatWidget STUB with the real src/components/site/ChatWidget.tsx, and src/lib/kb.test.ts (the 4 customer-scope tests).
VERIFY: \`cd ${APP} && npm test\` (now seed 6 + kb 4 = 10/10 pass) → \`npm run build\` exits 0.`, false)

// Phase 7 — Recommend & search.
results.p7 = await runPhase(7, 'P7 Search', '07_RECOMMEND_SEARCH.md', `Implement src/lib/recommend.ts (REGION_CASE_SQL, buildSchemaContext live aggregation, computeRealCount with region->project mapping, finalizeDataset, ruleBasedRecommend with region), src/app/api/recommend/route.ts (key-optional, RECOMMEND_MODEL default claude-haiku-4-5-20251001, inject projects when region given), src/app/search/page.tsx ("use client", import REGION_PROJECTS from @/lib/schema NOT recommend.ts, full-screen single column, 5 form sections, submit picks the single best dataset and routes straight to /demo?{demoQuery}).
VERIFY: \`cd ${APP} && npm run build\` exits 0. Confirm search page does NOT import server-only recommend.ts (would pull better-sqlite3 into client bundle and break build).`, false)

// Phase 8 — Security, env, final verification (hard gate on final build+test).
results.p8 = await runPhase(8, 'P8 Verify', '08_SECURITY_DEPLOY_VERIFY.md', `Implement src/lib/ratelimit.ts (sliding window, rateLimit + clientKey) and wire it into /api/agent, /api/chat, /api/recommend (429 on excess). Implement src/middleware.ts (optional Basic-Auth gate via DEMO_PASSWORD, no-op when unset). Create .env.local.example documenting the 4 optional vars (do NOT set real keys). Then run the FULL final verification from §F: \`cd ${APP} && node scripts/gen-extra.mjs && npm run seed\` (positions=98043, uniqueCoords>95000), \`npm test\` (10/10), \`npm run build\` (0 errors). Audit customer-exposure hygiene (§D) across home/demo/chat/recommend/HOVI — report any leak of SQL/tool-names/table-names/synthetic-data/infra as an issue.
VERIFY: all three commands green; report seedOutput and testsPassed precisely.`, true)

log('All phases attempted. Compiling final report.')

return {
  phases: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, {
    status: v.status, summary: v.summary, buildPassed: v.buildPassed,
    testsPassed: v.testsPassed, seedOutput: v.seedOutput, issues: v.issues,
  }])),
  allPassed: Object.values(results).every((r) => r && r.status === 'pass'),
}
