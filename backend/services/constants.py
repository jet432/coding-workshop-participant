"""Shared constants and demo seed fixtures."""

MAX_TEAM_MEMBERS = 5
ACCESS_TOKEN_HOURS = 8
REFRESH_TOKEN_DAYS = 14
DEFAULT_DB_NAME = "coding_workshop"
VALID_REGIONS = ("NAM", "LATAM", "APAC", "EU")
VALID_ORGANIZATIONS = ("Enterprise Technology", "Credit Card", "Private Banking")

SEED_USERS = [
    {
        "id": "user-001",
        "email": "lara.chen@acme.test",
        "displayName": "Lara Chen",
        "password": "Welcome123!",
    },
    {
        "id": "user-002",
        "email": "mateo.silva@acme.test",
        "displayName": "Mateo Silva",
        "password": "Welcome123!",
    },
    {
        "id": "user-003",
        "email": "nia.brooks@acme.test",
        "displayName": "Nia Brooks",
        "password": "Welcome123!",
    },
]

SEED_EMPLOYEES = [
    {
        "id": "emp-001",
        "firstName": "Lara",
        "lastName": "Chen",
        "email": "lara.chen@acme.test",
        "title": "Platform Lead",
        "region": "NAM",
    },
    {
        "id": "emp-002",
        "firstName": "Mateo",
        "lastName": "Silva",
        "email": "mateo.silva@acme.test",
        "title": "Pulse Lead",
        "region": "LATAM",
    },
    {
        "id": "emp-003",
        "firstName": "Nia",
        "lastName": "Brooks",
        "email": "nia.brooks@acme.test",
        "title": "Orbit Lead",
        "region": "APAC",
    },
    {
        "id": "emp-004",
        "firstName": "Devon",
        "lastName": "Park",
        "email": "devon.park@acme.test",
        "title": "Software Engineer",
        "region": "NAM",
    },
    {
        "id": "emp-005",
        "firstName": "Priya",
        "lastName": "Patel",
        "email": "priya.patel@acme.test",
        "title": "Product Analyst",
        "region": "LATAM",
    },
    {
        "id": "emp-006",
        "firstName": "Omar",
        "lastName": "Hassan",
        "email": "omar.hassan@acme.test",
        "title": "QA Engineer",
        "region": "EU",
    },
    {
        "id": "emp-007",
        "firstName": "Chloe",
        "lastName": "Kim",
        "email": "chloe.kim@acme.test",
        "title": "UX Designer",
        "region": "LATAM",
    },
    {
        "id": "emp-008",
        "firstName": "Rafael",
        "lastName": "Gomez",
        "email": "rafael.gomez@acme.test",
        "title": "Software Engineer",
        "region": "APAC",
    },
    {
        "id": "emp-009",
        "firstName": "Zoe",
        "lastName": "Carter",
        "email": "zoe.carter@acme.test",
        "title": "Project Manager",
        "region": "LATAM",
    },
    {
        "id": "emp-010",
        "firstName": "Jalen",
        "lastName": "Reed",
        "email": "jalen.reed@acme.test",
        "title": "Solutions Engineer",
        "region": "NAM",
    },
    {
        "id": "emp-011",
        "firstName": "Sofia",
        "lastName": "Alvarez",
        "email": "sofia.alvarez@acme.test",
        "title": "Data Analyst",
        "region": "LATAM",
    },
    {
        "id": "emp-012",
        "firstName": "Marcus",
        "lastName": "Lee",
        "email": "marcus.lee@acme.test",
        "title": "Operations Analyst",
        "region": "APAC",
    },
    {
        "id": "emp-013",
        "firstName": "Amina",
        "lastName": "Yusuf",
        "email": "amina.yusuf@acme.test",
        "title": "Product Manager",
        "region": "NAM",
    },
]

SEED_TEAMS = [
    {
        "id": "team-001",
        "name": "Platform",
        "description": "Builds shared internal product capabilities.",
        "region": "NAM",
        "organization": "Enterprise Technology",
        "leaderEmployeeId": "emp-001",
    },
    {
        "id": "team-002",
        "name": "Pulse",
        "description": "Delivers customer engagement campaigns.",
        "region": "LATAM",
        "organization": "Credit Card",
        "leaderEmployeeId": "emp-002",
    },
    {
        "id": "team-003",
        "name": "Orbit",
        "description": "Handles analytics and reporting initiatives.",
        "region": "APAC",
        "organization": "Private Banking",
        "leaderEmployeeId": "emp-003",
    },
]

SEED_TEAM_MEMBERSHIPS = [
    {"id": "membership-001", "teamId": "team-001", "employeeId": "emp-004"},
    {"id": "membership-002", "teamId": "team-001", "employeeId": "emp-005"},
    {"id": "membership-003", "teamId": "team-001", "employeeId": "emp-006"},
    {"id": "membership-004", "teamId": "team-001", "employeeId": "emp-010"},
    {"id": "membership-005", "teamId": "team-001", "employeeId": "emp-011"},
    {"id": "membership-006", "teamId": "team-002", "employeeId": "emp-007"},
    {"id": "membership-007", "teamId": "team-002", "employeeId": "emp-008"},
    {"id": "membership-008", "teamId": "team-002", "employeeId": "emp-009"},
    {"id": "membership-009", "teamId": "team-002", "employeeId": "emp-010"},
    {"id": "membership-010", "teamId": "team-002", "employeeId": "emp-012"},
    {"id": "membership-011", "teamId": "team-003", "employeeId": "emp-004"},
    {"id": "membership-012", "teamId": "team-003", "employeeId": "emp-008"},
    {"id": "membership-013", "teamId": "team-003", "employeeId": "emp-011"},
    {"id": "membership-014", "teamId": "team-003", "employeeId": "emp-012"},
    {"id": "membership-015", "teamId": "team-003", "employeeId": "emp-013"},
]

SEED_ACHIEVEMENTS = [
    {
        "id": "ach-001",
        "teamId": "team-001",
        "month": "2026-01",
        "title": "Shared Design Tokens",
        "description": "Launched the shared design token package for all apps.",
        "impact": "Reduced duplicate styling work across teams.",
    },
    {
        "id": "ach-002",
        "teamId": "team-001",
        "month": "2026-02",
        "title": "Authentication Rollout",
        "description": "Completed the authentication rollout for the internal suite.",
        "impact": "Improved security posture and onboarding speed.",
    },
    {
        "id": "ach-003",
        "teamId": "team-002",
        "month": "2026-02",
        "title": "Campaign Console Refresh",
        "description": "Refreshed the campaign operations console for mobile use.",
        "impact": "Cut launch preparation time for new campaigns.",
    },
    {
        "id": "ach-004",
        "teamId": "team-003",
        "month": "2026-03",
        "title": "Executive Dashboard MVP",
        "description": "Delivered the first cross-team reporting dashboard.",
        "impact": "Made operational data available in one place.",
    },
]

SEED_METADATA = [
    {
        "id": "meta-001",
        "scope": "team",
        "entityId": "team-001",
        "key": "focusArea",
        "value": "Internal Platform",
        "month": "2026-01",
    },
    {
        "id": "meta-002",
        "scope": "team",
        "entityId": "team-002",
        "key": "focusArea",
        "value": "Customer Growth",
        "month": "2026-02",
    },
    {
        "id": "meta-003",
        "scope": "employee",
        "entityId": "emp-004",
        "key": "primarySkill",
        "value": "React",
        "month": "2026-01",
    },
]
