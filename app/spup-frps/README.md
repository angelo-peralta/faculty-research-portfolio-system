# SPUP Faculty Research Portfolio

The **SPUP Faculty Research Portfolio** is the institution-specific
implementation of the Faculty Research Portfolio System for:

> **St. Paul University Philippines**

This application is intended solely for approved internal SPUP
academic, research, administrative, accreditation, quality-assurance,
and institutional operations.

## Copyright Registration

Registered title:

> **SPUP Faculty Research Portfolio**

IPOPHL Copyright Registration Certificate:

> **2026-04854-N**

Copyright owner:

> **Angelo Pambid Peralta**

Registered authorship claim:

> **Source code**

Copyright © 2025–2026 Angelo Pambid Peralta. All rights reserved.

## Relationship to the Global Platform

This application is built on the proprietary Faculty Research Portfolio
System global Platform.

The global Platform contains shared functionality that may be configured
for authorized institutions. This SPUP implementation contains
SPUP-specific branding, configuration, workflows, reports, and
institutional settings.

```text
faculty-research-portfolio-system/
├── LICENSE
├── README.md
└── apps/
    └── spup-frps/
        ├── LICENSE-SPUP.md
        └── README.md
```

## Authorized Institution

This implementation is authorized only for St. Paul University
Philippines.

Its license does not authorize another school, university, company,
affiliate, foundation, hospital, organization, or third party to use,
copy, host, redistribute, or operate the Software.

## Intended Functions

The application may support functions such as:

- Faculty research profiles
- Research-project records
- Publications
- Research presentations and engagements
- Indexing and publication classifications
- Digital object identifiers
- Research monitoring
- Administrative reports
- Institutional analytics
- Accreditation and quality-assurance documentation

Available functions depend on the approved SPUP configuration.

## Authorized Users

Access may be provided only to approved SPUP users, such as:

- System administrators
- Research office personnel
- Authorized university officials
- Faculty members
- Authorized IT personnel
- Other users approved for a specific institutional workflow

Access must be role-based and limited to the functions needed by each
user.

## Institutional Data

SPUP retains ownership and control of its:

- Faculty information
- Research records
- Publication information
- Uploaded documents
- User-account data
- Reports
- Institutional configurations
- Other records entered into or generated through the system

Ownership of institutional data is separate from ownership of the
Platform and source code.

## SPUP Branding

The SPUP name, seal, logo, official colors, institutional documents, and
other identity materials remain owned or controlled by St. Paul
University Philippines.

SPUP branding must not be reused in an implementation for another
institution without authorization.

A generic or other institution-specific version must remove:

- SPUP’s name
- SPUP’s logo and seal
- SPUP-specific forms
- SPUP data
- SPUP credentials
- SPUP confidential materials
- Statements implying SPUP endorsement

## Security Requirements

Do not commit any of the following:

```text
.env
.env.local
.env.production
database passwords
API keys
service-role keys
authentication secrets
production credentials
private certificates
personal information
institutional records
```

Use an `.env.example` file containing placeholders:

```env
DATABASE_URL=
AUTH_SECRET=
APPLICATION_URL=
```

Production credentials must be stored through an approved secret or
environment-management process.

## Development and Maintenance

Routine deployment, configuration, backup, security maintenance,
dependency updates, and error correction may be performed only by
authorized personnel.

Source code must not be:

- Published in a public repository
- Given to another institution
- Reused in an unrelated project
- Sold or sublicensed
- Retained by a contractor after authorization ends
- Used to operate an external commercial service without written
  permission

Material modifications should be documented and approved under the
applicable institutional agreement.

## License

This application is governed by both:

1. The [Global Proprietary License](../../LICENSE); and
2. The [SPUP Institutional License Addendum](LICENSE-SPUP.md).

The SPUP Addendum governs institution-specific rights granted to
St. Paul University Philippines.

This software is proprietary and is not distributed under an
open-source license.

Unauthorized copying, publication, redistribution, sublicensing,
commercial use, external deployment, or disclosure of the source code
is prohibited.

## Contact

For licensing, source-code access, modification, maintenance, external
deployment, or commercial-use permission, contact:

**Angelo Pambid Peralta**  
Copyright Owner
