# Role trust issues

- [x] Add failing tests for shared non-core permission counting.
- [x] Add a failing overview regression test for aligned counts.
- [x] Add a failing editor regression test for in-place `?role=` changes.
- [x] Implement shared role-task helpers and refactor duplicate filters.
- [x] Synchronize mounted editor state with the requested role.
- [x] Run tests, typecheck, lint, and build.
- [x] Capture before/after screenshots in `docs/demo-evidence/`.
- [x] Review the final diff and document verification results.

## Review

- Regression tests were confirmed failing before production changes and passing afterward.
- Targeted shared, overview, and editor tests pass.
- Typecheck, lint, and production build pass.
- Full test suite: 179 pass; 2 unrelated `config.dataDir` assertions fail on both base and branch because the cloud checkout is `/workspace`, not a folder named `mparticle-roles-manager`.
- Before/after mock-app screenshots cover the permission-count mismatch and mounted-editor query change.
