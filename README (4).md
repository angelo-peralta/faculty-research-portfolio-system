# Faculty Research Portfolio System

The **Faculty Research Portfolio System (FRPS)** is a proprietary,
multi-institution platform for recording, organizing, monitoring, and
reporting faculty research activities and scholarly outputs.

The repository contains the global platform and separate
institution-specific implementations.

## Purpose

FRPS is designed to support institutional management of information
such as:

- Faculty research profiles
- Research projects
- Publications
- Presentations and research engagements
- Indexing and publication information
- Digital object identifiers
- Research participation
- Institutional research reports
- Administrative monitoring and analytics

Actual features may vary between institutional implementations.

## Repository Structure

```text
faculty-research-portfolio-system/
├── LICENSE
├── README.md
├── packages/
│   └── shared/
└── apps/
    └── spup-frps/
        ├── LICENSE-SPUP.md
        └── README.md
```

### Global Platform

Shared source code, components, utilities, documentation, database
structures, and platform-level functionality are maintained at the
repository root and under shared package directories.

### Institutional Implementations

Each institution-specific implementation is maintained in its own
directory under `apps/`.

For example:

```text
apps/spup-frps/
```

An institutional implementation may contain institution-specific:

- Branding
- Configuration
- Authentication settings
- Database connections
- Workflows
- Reports
- Forms
- Access roles
- Deployment settings

Institution-specific data and credentials must not be shared between
implementations.

## Copyright Registration

The original institutional implementation was registered under the
title:

> **SPUP Faculty Research Portfolio**

Copyright Registration Certificate:

> **IPOPHL Certificate No. 2026-04854-N**

Registered copyright owner:

> **Angelo Pambid Peralta**

Registered authorship claim:

> **Source code**

The registration relates to the original SPUP implementation. It should
not be interpreted as a representation that every later institutional
configuration or edition has been separately registered under the same
certificate.

## Licensing Model

This repository uses a two-level proprietary licensing model.

### 1. Global License

The root [`LICENSE`](LICENSE) applies to the global Platform.

It establishes that:

- The Platform is proprietary software.
- No general public or open-source license is granted.
- Access to the repository does not authorize redistribution or
  commercial use.
- Each institution must receive separate written authorization.

### 2. Institution-Specific Addendum

Each authorized institution must have its own license addendum.

For example, the SPUP implementation is governed by:

```text
apps/spup-frps/LICENSE-SPUP.md
```

An institutional license does not authorize that institution to give
the software to another school, affiliate, company, or third party.

## Institutional Data

Each institution retains ownership and control of the information it
enters into its authorized implementation.

Institutional data ownership is separate from ownership of the Platform
and source code.

Data belonging to one institution must not be copied into, disclosed to,
or used by another institution without proper authorization.

## Institutional Branding

The global Platform uses generic branding.

Institution names, seals, logos, trademarks, official colors, forms, and
other identity materials may be used only in the implementation
authorized for that institution.

The SPUP name and branding must not be included in an implementation for
another institution without appropriate authorization.

## Security

Do not commit the following to this repository:

- `.env` files
- Database passwords
- Production credentials
- API keys
- Service-role keys
- Authentication secrets
- Private certificates
- Personal information
- Confidential institutional records

Provide an `.env.example` file containing placeholder values instead.

Example:

```env
DATABASE_URL=
AUTH_SECRET=
APPLICATION_URL=
```

## Adding Another Institution

A new institution should be added as a separate application:

```text
apps/institution-name-frps/
```

Before deployment, complete the following:

1. An institution-specific license or written agreement
2. Written authorization for institutional branding
3. Separate environment and database configuration
4. Data-protection and security review
5. Confirmation of hosting and support responsibilities
6. Confirmation of ownership and licensing of custom modifications

Do not copy SPUP data, branding, forms, credentials, or confidential
materials into another institution’s implementation.

## Development and Contributions

Contributions are not automatically accepted as open-source
contributions.

Any contribution that may be incorporated into the global Platform
should be covered by an appropriate written contribution, employment,
commissioning, or intellectual-property agreement.

## License

Copyright © 2025–2026 Angelo Pambid Peralta. All rights reserved.

This project is proprietary software. See the root
[`LICENSE`](LICENSE) file for the complete terms.

Unauthorized copying, publication, redistribution, sublicensing,
commercial use, external deployment, or disclosure of the source code
is prohibited.
