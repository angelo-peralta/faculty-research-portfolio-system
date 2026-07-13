# Performance Baseline Report

## A. Test Environment

- Date/time: 2026-07-03T07:37:27.858Z
- Machine/environment: win32 x64, Node v24.17.0
- Mode tested: production next start
- Browser: Playwright Chromium
- Database: MySQL via DATABASE_URL (sample lookup ok)
- Authentication status: no authenticated Playwright storage state supplied; protected pages expected to redirect to /login
- Base URL: http://localhost:3002
- Limitations: Authenticated admin/faculty pages cannot be fully timed without an authenticated browser storage state.; Client-side navigation timing requires an authenticated shell with visible links; this unauthenticated run records cold/warm loads only.

## B. Route Inventory

| Route |File path |Public/protected |Data loading |Dynamic/static |Tested? |Notes |
| --- | --- | --- | --- | --- | --- | --- |
| / | app/page.tsx | public | no | static | tested | may block on server data |
| /admin/analytics | app/admin/analytics/page.tsx | protected | yes | static | auth blocked | may block on server data; tables/lists; charts/stats |
| /admin/dashboard | app/admin/dashboard/page.tsx | protected | yes | static | auth blocked | may block on server data; tables/lists; charts/stats; forms |
| /admin/decision-support | app/admin/decision-support/page.tsx | protected | yes | static | auth blocked | may block on server data; tables/lists; charts/stats; forms |
| /admin/departments | app/admin/departments/page.tsx | protected | yes | static | auth blocked | may block on server data; tables/lists; charts/stats |
| /admin/departments/[department] | app/admin/departments/[department]/page.tsx | protected | yes | dynamic | auth blocked | department: BEU; may block on server data; tables/lists; charts/stats; forms |
| /admin/engagements | app/admin/engagements/page.tsx | protected | yes | static | auth blocked | tables/lists; forms |
| /admin/faculty | app/admin/faculty/page.tsx | protected | yes | static | auth blocked | tables/lists; forms |
| /admin/faculty/[id] | app/admin/faculty/[id]/page.tsx | protected | yes | dynamic | auth blocked | faculty user: Ada Alodia C. Bansig; may block on server data; tables/lists; forms |
| /admin/notifications | app/admin/notifications/page.tsx | protected | yes | static | auth blocked | may block on server data; tables/lists |
| /admin/publications | app/admin/publications/page.tsx | protected | yes | static | auth blocked | tables/lists; forms |
| /admin/research | app/admin/research/page.tsx | protected | yes | static | auth blocked | tables/lists; forms |
| /admin/settings | app/admin/settings/page.tsx | protected | yes | static | auth blocked | may block on server data; tables/lists; charts/stats; forms |
| /faculty/dashboard | app/faculty/dashboard/page.tsx | protected | no | static | auth blocked | tables/lists; charts/stats |
| /faculty/education | app/faculty/education/page.tsx | protected | yes | static | auth blocked | tables/lists; forms |
| /faculty/engagements | app/faculty/engagements/page.tsx | protected | yes | static | auth blocked | tables/lists; forms |
| /faculty/notifications | app/faculty/notifications/page.tsx | protected | yes | static | auth blocked | may block on server data; tables/lists |
| /faculty/profile | app/faculty/profile/page.tsx | protected | yes | static | auth blocked | tables/lists; forms |
| /faculty/publications | app/faculty/publications/page.tsx | protected | yes | static | auth blocked | tables/lists; forms |
| /faculty/research | app/faculty/research/page.tsx | protected | yes | static | auth blocked | tables/lists; forms |
| /faculty/research-titles | app/faculty/research-titles/page.tsx | protected | no | static | auth blocked | tables/lists; forms |
| /faculty/settings | app/faculty/settings/page.tsx | protected | yes | static | auth blocked | tables/lists; forms |
| /login | app/login/page.tsx | public | no | static | tested | forms |
| /manifest.webmanifest | app/manifest.ts | public | no | static | tested |  |
| /onboarding | app/onboarding/page.tsx | public | no | static | tested | tables/lists |
| /select-role | app/select-role/page.tsx | protected | no | static | auth blocked | charts/stats; forms |

## API Route Inventory

| Route |File path |Public/protected |Data loading |Dynamic/static |Notes |
| --- | --- | --- | --- | --- | --- |
| /api/admin/admin-users | app/api/admin/admin-users/route.ts | protected | yes | static | server data wait; settings bootstrap |
| /api/admin/admin-users/[id] | app/api/admin/admin-users/[id]/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/analytics | app/api/admin/analytics/route.ts | protected | yes | static | aggregate/dashboard data |
| /api/admin/assets/sign | app/api/admin/assets/sign/route.ts | protected | yes | static |  |
| /api/admin/broadcasts | app/api/admin/broadcasts/route.ts | protected | yes | static |  |
| /api/admin/dashboard | app/api/admin/dashboard/route.ts | protected | yes | static | aggregate/dashboard data |
| /api/admin/decision-support | app/api/admin/decision-support/route.ts | protected | yes | static | aggregate/dashboard data |
| /api/admin/departments | app/api/admin/departments/route.ts | protected | yes | static |  |
| /api/admin/departments/[department] | app/api/admin/departments/[department]/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/engagements | app/api/admin/engagements/route.ts | protected | yes | static | server data wait |
| /api/admin/exports/[kind] | app/api/admin/exports/[kind]/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/faculty | app/api/admin/faculty/route.ts | protected | yes | static | server data wait |
| /api/admin/faculty/[id] | app/api/admin/faculty/[id]/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/faculty/[id]/education | app/api/admin/faculty/[id]/education/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/faculty/[id]/education/[entryId] | app/api/admin/faculty/[id]/education/[entryId]/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/faculty/[id]/engagements | app/api/admin/faculty/[id]/engagements/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/faculty/[id]/engagements/[engagementId] | app/api/admin/faculty/[id]/engagements/[engagementId]/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/faculty/[id]/publications | app/api/admin/faculty/[id]/publications/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/faculty/[id]/publications/[publicationId] | app/api/admin/faculty/[id]/publications/[publicationId]/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/faculty/[id]/research | app/api/admin/faculty/[id]/research/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/faculty/[id]/research/[researchTitleId] | app/api/admin/faculty/[id]/research/[researchTitleId]/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/invites | app/api/admin/invites/route.ts | protected | yes | static | server data wait |
| /api/admin/invites/[id] | app/api/admin/invites/[id]/route.ts | protected | yes | dynamic | server data wait |
| /api/admin/notifications | app/api/admin/notifications/route.ts | protected | yes | static |  |
| /api/admin/notifications/read | app/api/admin/notifications/read/route.ts | protected | yes | static |  |
| /api/admin/publications | app/api/admin/publications/route.ts | protected | yes | static | server data wait |
| /api/admin/research | app/api/admin/research/route.ts | protected | yes | static | server data wait |
| /api/admin/settings/bootstrap | app/api/admin/settings/bootstrap/route.ts | protected | yes | static | settings bootstrap |
| /api/admin/settings/decision-support | app/api/admin/settings/decision-support/route.ts | protected | yes | static | aggregate/dashboard data |
| /api/admin/workspace | app/api/admin/workspace/route.ts | protected | yes | static |  |
| /api/auth/microsoft | app/api/auth/microsoft/route.ts | public | yes | static |  |
| /api/auth/sign-out | app/api/auth/sign-out/route.ts | protected | yes | static |  |
| /api/faculty/search | app/api/faculty/search/route.ts | protected | yes | static | server data wait |
| /api/me | app/api/me/route.ts | protected | yes | static |  |
| /api/me/assets/sign | app/api/me/assets/sign/route.ts | protected | yes | static |  |
| /api/me/bootstrap | app/api/me/bootstrap/route.ts | protected | yes | static | parallel data fetch |
| /api/me/completion | app/api/me/completion/route.ts | protected | yes | static | server data wait |
| /api/me/education | app/api/me/education/route.ts | protected | yes | static | server data wait |
| /api/me/education/[id] | app/api/me/education/[id]/route.ts | protected | yes | dynamic | server data wait |
| /api/me/engagements | app/api/me/engagements/route.ts | protected | yes | static | server data wait |
| /api/me/engagements/[id] | app/api/me/engagements/[id]/route.ts | protected | yes | dynamic | server data wait |
| /api/me/export/csv | app/api/me/export/csv/route.ts | protected | yes | static |  |
| /api/me/export/json | app/api/me/export/json/route.ts | protected | yes | static |  |
| /api/me/notifications | app/api/me/notifications/route.ts | protected | yes | static |  |
| /api/me/notifications/read | app/api/me/notifications/read/route.ts | protected | yes | static |  |
| /api/me/preferences | app/api/me/preferences/route.ts | protected | yes | static |  |
| /api/me/profile | app/api/me/profile/route.ts | protected | yes | static | server data wait |
| /api/me/publications | app/api/me/publications/route.ts | protected | yes | static | server data wait |
| /api/me/publications/[id] | app/api/me/publications/[id]/route.ts | protected | yes | dynamic | server data wait |
| /api/me/push-subscriptions | app/api/me/push-subscriptions/route.ts | protected | yes | static |  |
| /api/me/research | app/api/me/research/route.ts | protected | yes | static | server data wait |
| /api/me/research/[id] | app/api/me/research/[id]/route.ts | protected | yes | dynamic | server data wait |
| /api/me/workspace | app/api/me/workspace/route.ts | protected | yes | static |  |
| /api/publications/lookup | app/api/publications/lookup/route.ts | public | yes | static |  |
| /api/version | app/api/version/route.ts | public | yes | static |  |
| /auth/callback | app/auth/callback/route.ts | public | yes | static |  |

## C. Page Speed Results

| Route |Cold load |Warm load |Client navigation |Requests |Slowest request |Console errors |Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| / | 1213 ms | 786 ms | N/A | 21 | GET / (450 ms) | 2 | tested |
| /login | 727 ms | 709 ms | N/A | 24 | GET /login (101 ms) | 2 | tested |
| /manifest.webmanifest | 521 ms | 516 ms | N/A | 1 | GET /manifest.webmanifest (10 ms) | 0 | tested |
| /onboarding | 1052 ms | 1038 ms | N/A | 28 | GET /onboarding (93 ms) | 2 | tested |
| /admin/analytics | 744 ms | 727 ms | N/A | 25 | GET /admin/analytics (124 ms) | 2 | auth blocked |
| /admin/dashboard | 729 ms | 710 ms | N/A | 25 | GET /admin/dashboard (106 ms) | 2 | auth blocked |
| /admin/decision-support | 721 ms | 729 ms | N/A | 25 | GET /admin/decision-support (98 ms) | 2 | auth blocked |
| /admin/departments | 722 ms | 716 ms | N/A | 25 | GET /admin/departments (101 ms) | 2 | auth blocked |
| /admin/departments/[department] | 722 ms | 731 ms | N/A | 25 | GET /admin/departments/BEU (88 ms) | 2 | auth blocked |
| /admin/engagements | 757 ms | 713 ms | N/A | 25 | GET /admin/engagements (131 ms) | 2 | auth blocked |
| /admin/faculty | 723 ms | 697 ms | N/A | 25 | GET /admin/faculty (94 ms) | 2 | auth blocked |
| /admin/faculty/[id] | 733 ms | 710 ms | N/A | 25 | GET /admin/faculty/cfe028fc-ec9a-4782-8051-daf47b57b5e2 (99 ms) | 2 | auth blocked |
| /admin/notifications | 723 ms | 735 ms | N/A | 25 | GET /admin/notifications (85 ms) | 2 | auth blocked |
| /admin/publications | 733 ms | 729 ms | N/A | 25 | GET /admin/publications (100 ms) | 2 | auth blocked |
| /admin/research | 734 ms | 718 ms | N/A | 25 | GET /admin/research (116 ms) | 2 | auth blocked |
| /admin/settings | 687 ms | 668 ms | N/A | 25 | GET /admin/settings (113 ms) | 2 | auth blocked |
| /faculty/dashboard | 685 ms | 677 ms | N/A | 25 | GET /faculty/dashboard (92 ms) | 2 | auth blocked |
| /faculty/education | 691 ms | 665 ms | N/A | 25 | GET /faculty/education (100 ms) | 2 | auth blocked |
| /faculty/engagements | 696 ms | 700 ms | N/A | 25 | GET /faculty/engagements (88 ms) | 2 | auth blocked |
| /faculty/notifications | 751 ms | 698 ms | N/A | 25 | GET /faculty/notifications (116 ms) | 2 | auth blocked |
| /faculty/profile | 701 ms | 680 ms | N/A | 25 | GET /faculty/profile (113 ms) | 2 | auth blocked |
| /faculty/publications | 688 ms | 677 ms | N/A | 25 | GET /faculty/publications (85 ms) | 2 | auth blocked |
| /faculty/research | 694 ms | 673 ms | N/A | 25 | GET /faculty/research (103 ms) | 2 | auth blocked |
| /faculty/research-titles | 671 ms | 667 ms | N/A | 25 | GET /faculty/research-titles (92 ms) | 2 | auth blocked |
| /faculty/settings | 685 ms | 675 ms | N/A | 25 | GET /faculty/settings (103 ms) | 2 | auth blocked |
| /select-role | 2554 ms | 2546 ms | N/A | 20 | GET /select-role (96 ms) | 2 | auth blocked |

## D. Slowest Pages Ranked

| Rank |Route |Cold load |Warm load |Main suspected cause |Blocking/API call |
| --- | --- | --- | --- | --- | --- |
| 1 | / | 1213 ms | 786 ms | code scan: route may block render on server data | GET /api/me (114 ms) |
| 2 | /onboarding | 1052 ms | 1038 ms | Measured page load | GET /api/me (10 ms) |
| 3 | /login | 727 ms | 709 ms | Measured page load | GET /api/me (14 ms) |
| 4 | /manifest.webmanifest | 521 ms | 516 ms | Measured page load | N/A |

## E. Navigation Performance Issues

- /admin/analytics: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /admin/dashboard: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /admin/decision-support: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /admin/departments: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /admin/departments/[department]: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /admin/engagements: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /admin/faculty: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /admin/faculty/[id]: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /admin/notifications: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /admin/publications: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /admin/research: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /admin/settings: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /faculty/dashboard: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /faculty/education: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /faculty/engagements: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /faculty/notifications: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /faculty/profile: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /faculty/publications: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /faculty/research: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /faculty/research-titles: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /faculty/settings: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.
- /select-role: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.

## F. API And Data Loading Issues

No slow authenticated API calls were measurable without an authenticated session. Code scan findings are reflected in the priority list.

## G. Frontend Loading Issues

- /: console errors observed: Failed to load resource: the server responded with a status of 404 (Not Found) | Failed to load resource: the server responded with a status of 401 (Unauthorized)
- /login: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /onboarding: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/analytics: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/dashboard: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/decision-support: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/departments: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/departments/[department]: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/engagements: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/faculty: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/faculty/[id]: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/notifications: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/publications: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/research: console errors observed: Failed to load resource: the server responded with a status of 401 (Unauthorized) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /admin/settings: console errors observed: Failed to load resource: the server responded with a status of 429 (Too Many Requests) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /faculty/dashboard: console errors observed: Failed to load resource: the server responded with a status of 429 (Too Many Requests) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /faculty/education: console errors observed: Failed to load resource: the server responded with a status of 429 (Too Many Requests) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /faculty/engagements: console errors observed: Failed to load resource: the server responded with a status of 429 (Too Many Requests) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /faculty/notifications: console errors observed: Failed to load resource: the server responded with a status of 404 (Not Found) | Failed to load resource: the server responded with a status of 429 (Too Many Requests)
- /faculty/profile: console errors observed: Failed to load resource: the server responded with a status of 429 (Too Many Requests) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /faculty/publications: console errors observed: Failed to load resource: the server responded with a status of 429 (Too Many Requests) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /faculty/research: console errors observed: Failed to load resource: the server responded with a status of 429 (Too Many Requests) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /faculty/research-titles: console errors observed: Failed to load resource: the server responded with a status of 429 (Too Many Requests) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /faculty/settings: console errors observed: Failed to load resource: the server responded with a status of 429 (Too Many Requests) | Failed to load resource: the server responded with a status of 404 (Not Found)
- /select-role: console errors observed: Failed to load resource: the server responded with a status of 429 (Too Many Requests) | Failed to load resource: the server responded with a status of 404 (Not Found)

## H. Priority Optimization List

| Priority |File path |Route affected |Problem |Recommended fix |Expected improvement |Risk |
| --- | --- | --- | --- | --- | --- | --- |
| Priority 1 | app/admin/settings/page.tsx | /admin/settings | Code scan indicates server data can block route render. | Benchmark authenticated load first, then split shell render from data fetch or stream expensive sections if confirmed slow. | Faster perceived navigation; exact gain requires authenticated timing. | medium |
| Priority 1 | app/admin/faculty/[id]/page.tsx | /admin/faculty/[id] | Code scan indicates server data can block route render. | Benchmark authenticated load first, then split shell render from data fetch or stream expensive sections if confirmed slow. | Faster perceived navigation; exact gain requires authenticated timing. | medium |
| Priority 2 | app/admin/dashboard/page.tsx | /admin/dashboard | Code scan indicates server data can block route render. | Benchmark authenticated load first, then split shell render from data fetch or stream expensive sections if confirmed slow. | Faster perceived navigation; exact gain requires authenticated timing. | low-medium |
| Priority 2 | app/admin/analytics/page.tsx | /admin/analytics | Code scan indicates server data can block route render. | Benchmark authenticated load first, then split shell render from data fetch or stream expensive sections if confirmed slow. | Faster perceived navigation; exact gain requires authenticated timing. | low-medium |
| Priority 2 | app/admin/decision-support/page.tsx | /admin/decision-support | Code scan indicates server data can block route render. | Benchmark authenticated load first, then split shell render from data fetch or stream expensive sections if confirmed slow. | Faster perceived navigation; exact gain requires authenticated timing. | low-medium |
| Priority 2 | app/faculty/dashboard/page.tsx | /faculty/dashboard | High-value protected route likely loads dashboard/settings/detail data. | Benchmark authenticated load first, then split shell render from data fetch or stream expensive sections if confirmed slow. | Faster perceived navigation; exact gain requires authenticated timing. | low-medium |
| Priority 2 | app/faculty/settings/page.tsx | /faculty/settings | High-value protected route likely loads dashboard/settings/detail data. | Benchmark authenticated load first, then split shell render from data fetch or stream expensive sections if confirmed slow. | Faster perceived navigation; exact gain requires authenticated timing. | medium |

## I. Performance Baseline Summary

- Fastest tested page: /manifest.webmanifest (521 ms)
- Slowest tested page: / (1213 ms)
- Average cold load: 878 ms
- Average warm load: 762 ms
- Average navigation time: N/A
- Most common bottleneck: Measured route timing; see slowest request column
- Biggest quick win: Optimize the slowest measured authenticated page first

## J. Next Optimization Plan

1. Stage 1: Fix the slowest authenticated navigation blockers after running this same script with an authenticated storage state.
2. Stage 2: Optimize database queries and pagination for the measured slow API/page pairs.
3. Stage 3: Add or tune loading states, Suspense, and streaming where measured blank or skeleton time is high.
4. Stage 4: Reduce client bundle and heavy chart/table components where measured transfer or render cost is high.
5. Stage 5: Add caching and production hardening for repeated dashboard/settings/bootstrap reads.
