# AGENT.md

## Purpose

Codex's job is to deliver the scoped workshop application completely and
honestly. "Done" means the app behavior, tests, documentation, and deployment
workflow all support the agreed scope. Do not optimize for appearances over
verified functionality.

## Required References Before Major Work

Before major implementation or refactoring work, read:

- `docs/README.md`
- `docs/validation.md`
- `docs/evaluation.md`
- `docs/testing.md`
- `docs/implementation.md`
- `README.md`
- `backend/README.md`
- `frontend/README.md`
- `bin/README.md`
- `infra/README.md`
- `.github/instructions/*.md`
- `.github/workflows/*.yml`

Also inspect the current Terraform and shell-script workflow before changing
resource names, paths, packaging, or deployment behavior.

## Scope Overrides

This file records the currently approved project scope, even where it differs
from the original workshop docs.

- RBAC is out of scope for this implementation.
- All authenticated users share the same application permissions.
- The following business questions are out of scope and must not drive backend
  or dashboard work:
  - team leader not co-located with team members
  - team leader as non-direct staff
  - non-direct staff to employees ratio above 20%
  - teams reporting to an organization leader
- Treat everyone in the business model as employees.
- Use MongoDB / DocumentDB for persistence. MongoDB Compass is the preferred
  GUI inspection tool during development.
- Use hard deletes only. Do not implement soft deletes, restore flows, or
  `deletedAt` fields unless the user explicitly changes scope.

If the docs conflict with this file, follow this file and clearly document the
deviation in status updates, final reporting, and project documentation.

## Product Scope

Deliver a serverless team management application with:

- JWT-based authentication with refresh tokens
- CRUD for employees, teams, achievements, and metadata
- Team membership management
- Search and filter support
- Responsive React + Material UI frontend
- Validation, consistent API errors, and deployable infrastructure
- Local development through the provided scripts
- AWS deployment through the provided scripts

## Business Model

The business model is:

- `users`: authentication records only
- `employees`: all people in the domain
- `teams`: team records with a single designated leader
- `team_employees`: join records for non-leader team members
- `achievements`: monthly team accomplishments
- `metadata`: team-scoped or employee-scoped metadata

Important modeling rules:

- Leadership is a team relationship, not an RBAC role.
- `teams.leader_employee_id` stores the current leader for a team.
- `team_employees` stores non-leader memberships only.
- Team rosters are composed of the leader plus `team_employees` members.
- Employees may belong to more than one team.
- Employees may move or swap between teams.
- Leaders may not leave their teams until leadership is reassigned or the team
  is deleted.
- Seed/demo data should model a standard team as 1 leader plus 5 additional
  employees.
- Achievements are monthly and must include a valid `YYYY-MM` month value.

## Naming Guidance

Use "Employee" as the product and domain term in code, UI, tests, and docs.
However, preserve the existing deployment backbone unless a rename is clearly
worth the churn. It is acceptable to evolve the current `individuals` scaffold
into the employee service before deciding whether a filesystem or endpoint
rename is necessary.

## Required Data Rules

At minimum, enforce:

- required fields
- unique user email and employee email
- valid enum values
- valid `YYYY-MM` for monthly data
- referential integrity for leader, team, employee, and metadata targets
- no duplicate `team_id + employee_id` membership rows
- exactly one active leader per team
- leader removal blocked until a replacement leader is assigned
- malformed JSON handled as `400`
- unsupported methods handled as `405`
- consistent JSON success and error responses

## API Contract Expectations

Minimum auth endpoints:

- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

Business resources:

- employees
- teams
- team memberships
- achievements
- metadata

List endpoints must support search and relevant filters where appropriate.
Protected routes must require `Authorization: Bearer <token>`.

Use a consistent error shape:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": null
  }
}
```

## Reporting Scope

The required dashboard/reporting work is limited to:

- who the members of each team are
- where teams are located
- what monthly achievements each team has

Do not build or test the removed out-of-scope metrics.

## Delivery Order

Work in this order unless the user redirects it:

1. baseline and tooling stabilization
2. auth and shared backend utilities
3. teams, employees, and membership rules
4. achievements and metadata
5. dashboard/reporting for the remaining required questions
6. responsiveness, polish, tests, security checks, deployment, and docs

## Working Rules

- Maintain a live requirement-to-evidence checklist.
- Implement from backend contract outward, not page-first.
- Do not mark a requirement complete without code, tests, and verification.
- Preserve the provided `bin/` scripts and Terraform flow unless fixing a
  proven defect.
- Prefer incremental slices that remain deployable.
- Do not silently reintroduce RBAC or removed dashboard metrics.
- Keep seeded credentials, fixture assumptions, and known limitations
  documented.

## Verification Rules

Before declaring the project complete, run or explicitly account for:

- backend compilation
- backend automated tests
- frontend lint
- frontend build
- frontend automated tests
- `terraform -chdir=infra validate`
- `./bin/start-dev.sh`
- backend deployment rehearsal
- frontend deployment rehearsal

If any check is skipped or fails, report it explicitly with the reason and the
remaining risk.
