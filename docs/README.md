# Documentation Index

Documentation is organized by topic. Each subfolder contains related docs; audit reports are kept as separate files and were not merged.

## Topic Folders

| Folder | Contents |
|--------|----------|
| **api** | API reference (`API.md`) |
| **architecture** | `ARCHITECTURAL_AUDIT.md` (audit) |
| **audit** | Cross-cutting audit (`FULL_AUDIT_2025.md`) |
| **bootstrap** | Bootstrap setup (`BOOTSTRAP.md`) |
| **dependencies** | Dependency notes (`dependency-xml-parsing.md`) |
| **deployment** | Deployment and lockfile (`DEPLOYMENT.md`) |
| **design** | `DESIGN_AUDIT.md` (audit) |
| **dev** | Dev optimization (`DEV_OPTIMIZATION.md`) |
| **getting-started** | Quick start (`QUICK_START.md`) |
| **implementation** | Combined implementation and refactoring summary (`implementation.md`) |
| **ldap** | Combined LDAP setup and troubleshooting (`ldap.md`) |
| **monitoring** | Monitoring (`MONITORING.md`) |
| **product** | Product requirements (`PRD.md`) |
| **security** | Security audits and guides: `SECURITY_AUDIT_FINAL.md` (audit), `PDF_SECURITY.md`, `SECURITY_HEADERS.md` |
| **ux** | UX/UI audits and plans: `UX_AUDIT_FINAL.md`, `MOBILE_TABLET_UX_AUDIT.md` (audits), `MOBILE_TABLET_REMEDIATION_PLAN.md`, `MOBILE_TABLET_IMPLEMENTATION_PREPARATION.md` |

## Summary of Changes

- **Topics created:** 15 subfolders (api, architecture, audit, bootstrap, dependencies, deployment, design, dev, getting-started, implementation, ldap, monitoring, product, security, ux).
- **Audit files:** 6 audit reports moved into topic folders; none were merged.
- **Non-audit combined:** `LDAP_SETUP.md` + `LDAP_TROUBLESHOOTING.md` → `ldap/ldap.md`; `IMPLEMENTATION_SUMMARY.md` + `REFACTORING_SUMMARY.md` → `implementation/implementation.md`.
- **Other non-audit docs:** Moved into the topic folder that best matches their content.

If you have links or scripts that pointed to the previous flat paths (e.g. `docs/DEPLOYMENT.md`), update them to the new paths (e.g. `docs/deployment/DEPLOYMENT.md`).
