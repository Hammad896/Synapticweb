# Graph Report - .  (2026-07-14)

## Corpus Check
- 83 files · ~51,491 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 474 nodes · 891 edges · 28 communities (24 shown, 4 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.87)
- Token cost: 118,000 input · 27,000 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin Shell Internals|Admin Shell Internals]]
- [[_COMMUNITY_Admin God Component Responsibilities|Admin God Component Responsibilities]]
- [[_COMMUNITY_Security & Storage Rationale|Security & Storage Rationale]]
- [[_COMMUNITY_Mobile Sheets & Drawers|Mobile Sheets & Drawers]]
- [[_COMMUNITY_Design System Doctrine|Design System Doctrine]]
- [[_COMMUNITY_Letterhead Calibration|Letterhead Calibration]]
- [[_COMMUNITY_Supabase Data Adapter|Supabase Data Adapter]]
- [[_COMMUNITY_Local Storage Fallback Adapter|Local Storage Fallback Adapter]]
- [[_COMMUNITY_Auth Layer|Auth Layer]]
- [[_COMMUNITY_Marketing Site Content|Marketing Site Content]]
- [[_COMMUNITY_Theme Kit & Announcements|Theme Kit & Announcements]]
- [[_COMMUNITY_Lab Assist Assistant|Lab Assist Assistant]]
- [[_COMMUNITY_CountUp()|CountUp()]]
- [[_COMMUNITY_Footer()|Footer()]]
- [[_COMMUNITY_EASE|EASE]]
- [[_COMMUNITY_AdminPage|AdminPage]]
- [[_COMMUNITY_TECH_INTRO|TECH_INTRO]]
- [[_COMMUNITY_setup.ts|setup.ts]]
- [[_COMMUNITY_Engagement|Engagement]]
- [[_COMMUNITY_PROCESS|PROCESS]]
- [[_COMMUNITY_Partner|Partner]]
- [[_COMMUNITY_env|env]]
- [[_COMMUNITY_ImportMeta|ImportMeta]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 22 edges
2. `SupabaseRepository` - 21 edges
3. `LocalRepository` - 20 edges
4. `AdminPage (God Component, ~1200 lines)` - 20 edges
5. `read()` - 18 edges
6. `write()` - 13 edges
7. `Employee` - 12 edges
8. `README — Project Entry Point` - 11 edges
9. `Button()` - 10 edges
10. `inputClass()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `repository.ts — The Storage Seam (EmployeeRepository)` --semantically_similar_to--> `Theme Engine (pre-paint boot script + ThemeProvider)`  [INFERRED] [semantically similar]
  src/admin/repository.ts → docs/ARCHITECTURE.md
- `README — Project Entry Point` --references--> `Lab Assist — Deliberately Not an LLM (answers derived from site.ts)`  [EXTRACTED]
  README.md → src/components/LabAssist.tsx
- `Module: Public Marketing Site` --conceptually_related_to--> `src/App.tsx — Section Order / Page Outline`  [EXTRACTED]
  docs/ARCHITECTURE.md → src/App.tsx
- `Style Guide — Tokens, Type, Motion, A11y` --references--> `src/data/site.ts — The Copy Layer`  [EXTRACTED]
  docs/STYLE_GUIDE.md → src/data/site.ts
- `Style Guide — Tokens, Type, Motion, A11y` --references--> `Logo.tsx — Theme-Aware Wordmark`  [EXTRACTED]
  docs/STYLE_GUIDE.md → src/components/Logo.tsx

## Hyperedges (group relationships)
- **Draft → Issue: minting an officially-signed company document** — hr_letter_composer, hr_letters_templates, hr_pdf_letterhead, hr_letterhead_pdf, schema_table_documents, schema_table_audit_log, hr_draft_issue_model [EXTRACTED 1.00]
- **Unguessable-token QR verification (public, no query surface)** — hr_id_card, hr_verify_page, schema_fn_verify_credential, schema_unguessable_verify_token, schema_no_query_surface, schema_table_employees, schema_table_documents [EXTRACTED 1.00]
- **Admin allowlist is the root of trust for every RLS policy** — schema_table_admins, schema_fn_is_admin, schema_policy_admins_manage_employees, schema_policy_admins_manage_documents, schema_policy_admins_append_audit, schema_policy_admins_manage_photos, schema_authenticated_not_trust_level, schema_rls_only_protection [EXTRACTED 1.00]
- **Letter lifecycle: Draft -> Issue -> Register -> Verify** — lettercomposer_component, pdf_renderletter, pdf_draftmask, repository_issueddocument, adminpage_documentregister, pdf_verifyqr, verify_page [EXTRACTED 1.00]
- **Auth flow: LoginPage -> AuthAdapter -> AuthProvider -> RequireAuth -> AdminPage (RLS behind it)** — loginpage_component, auth_authadapter, auth_supabaseauthadapter, auth_authprovider, requireauth_guard, adminpage_component, supabase_rationalerls [EXTRACTED 1.00]
- **AdminPage refactor seams: eight responsibilities tangled in one file** — adminpage_tabshell, adminpage_datarefresh, adminpage_employeecrud, adminpage_employeetable, adminpage_employeecardlist, adminpage_documentregister, adminpage_announcements, adminpage_careers, adminpage_auditlog, adminpage_metrics [INFERRED 0.95]

## Communities (28 total, 4 thin omitted)

### Community 0 - "Admin Shell Internals"
Cohesion: 0.06
Nodes (54): AdminPage(), money(), MORE_TABS, PRIMARY_TABS, Tab, TABS, EmployeeForm(), Props (+46 more)

### Community 1 - "Admin God Component Responsibilities"
Cohesion: 0.07
Nodes (67): Responsibility: Announcements / Website Management, Responsibility: Audit Log Rendering, Responsibility: Careers / Jobs Management, AdminPage (God Component, ~1200 lines), Responsibility: CSV Export Trigger, Responsibility: Data Loading / refresh() Orchestrator, Responsibility: Document Register View & Revoke, Responsibility: Mobile Employee Card List + ActionSheet (+59 more)

### Community 2 - "Security & Storage Rationale"
Cohesion: 0.06
Nodes (53): Invariant: Auth and Backend Must Ship in the Same Change, Rationale: The Browser Login Is Not Authentication, CSV Export — The Escape Hatch, Admin Panel Doc — Employee Records, localStorage Local Adapter (fallback, unsafe for PII), AdminPage.tsx — Shell + Tabs, repository.ts — The Storage Seam (EmployeeRepository), src/admin/types.ts — Employee Model + ID Generator (+45 more)

### Community 3 - "Mobile Sheets & Drawers"
Cohesion: 0.11
Nodes (21): ActionSheet(), Drawer(), EASE, SheetAction(), useEscape(), useScrollLock(), Logo(), Navbar() (+13 more)

### Community 4 - "Design System Doctrine"
Cohesion: 0.09
Nodes (32): Accent Is a Token, Not a Constant, Light Mode Obeys Different Physics, No Placeholders, Ever, Nordic Back-Office Relationship (Noregna AS · Superlogics AS), prefers-reduced-motion Disables All Motion, The Site Must Sell (a/b/c section test), Master Prompt — Governing Spec, The Synapse Gradient (logo-derived brand ramp) (+24 more)

### Community 5 - "Letterhead Calibration"
Cohesion: 0.11
Nodes (19): SAMPLE, DEFAULT_LAYOUT, LetterheadLayout, loadLayout(), resetLayout(), saveLayout(), getTemplate(), LETTER_TEMPLATES (+11 more)

### Community 6 - "Supabase Data Adapter"
Cohesion: 0.09
Nodes (3): SupabaseRepository, toEmployee(), toRow()

### Community 7 - "Local Storage Fallback Adapter"
Cohesion: 0.21
Nodes (3): LocalRepository, read(), write()

### Community 8 - "Auth Layer"
Cohesion: 0.13
Nodes (10): AuthAdapter, AuthContext, AuthContextValue, AuthProvider(), AuthUser, DevCredentialAdapter, SupabaseAuthAdapter, useAuth() (+2 more)

### Community 9 - "Marketing Site Content"
Cohesion: 0.18
Nodes (8): CAPABILITIES, CAPABILITIES_INTRO, Capability, Executive, EXECUTIVES, FAQ_INTRO, FAQS, LEADERSHIP_INTRO

### Community 10 - "Theme Kit & Announcements"
Cohesion: 0.15
Nodes (8): Live, Card(), Section(), SectionHeader(), anonKey, url, OpenRole, TeamMember

### Community 11 - "Lab Assist Assistant"
Cohesion: 0.24
Nodes (7): EASE, Message, findAnswer(), Intent, INTENTS, QUICK_REPLIES, COMPANY

### Community 12 - "CountUp()"
Cohesion: 0.18
Nodes (3): HERO, STATS, EASE

### Community 14 - "EASE"
Cohesion: 0.22
Nodes (5): EASE, MOTION_TAGS, RevealProps, RevealTag, CONTACT

### Community 15 - "AdminPage"
Cohesion: 0.25
Nodes (3): AdminPage, LoginPage, Verify

### Community 16 - "TECH_INTRO"
Cohesion: 0.29
Nodes (4): TECH_INTRO, TECH_TIERS, TechTier, ALL_TECH

### Community 18 - "Engagement"
Cohesion: 0.33
Nodes (3): Engagement, ENGAGEMENTS, ENGAGEMENTS_INTRO

### Community 19 - "PROCESS"
Cohesion: 0.33
Nodes (3): PROCESS, PROCESS_INTRO, ProcessStep

### Community 20 - "Partner"
Cohesion: 0.33
Nodes (3): Partner, PARTNERS, PARTNERS_INTRO

## Ambiguous Edges - Review These
- `Admin Panel Doc — Employee Records` → `HR Module Doc`  [AMBIGUOUS]
  docs/ADMIN.md · relation: conceptually_related_to
- `Module Boundary: Public Marketing Site` → `Module Boundary: Data Layer`  [AMBIGUOUS]
  src/App.tsx · relation: shares_data_with

## Knowledge Gaps
- **74 isolated node(s):** `env`, `missing`, `AdminPage`, `LoginPage`, `Verify` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Admin Panel Doc — Employee Records` and `HR Module Doc`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Module Boundary: Public Marketing Site` and `Module Boundary: Data Layer`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **Why does `SupabaseRepository` connect `Supabase Data Adapter` to `Admin Shell Internals`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `cn()` connect `Mobile Sheets & Drawers` to `Admin Shell Internals`, `Marketing Site Content`, `Theme Kit & Announcements`, `Lab Assist Assistant`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `LocalRepository` connect `Local Storage Fallback Adapter` to `Admin Shell Internals`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `env`, `missing`, `AdminPage` to the rest of the system?**
  _74 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Shell Internals` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._