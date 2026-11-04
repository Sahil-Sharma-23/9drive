# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`AGENTS.md` (imported above) holds the conventions, security rules, env vars, and API list. This file adds what it leaves out. Where the two disagree, this file matches the current code.

## Commands

Neither package has a test runner or linter, so there are no tests to run. Verification means running the type-check/build:

- `cd backend && npm run build` (`tsc`)
- `cd frontend && npm run build` (`tsc && vite build`)

Other scripts that `AGENTS.md` doesn't list:

- `cd backend && npm run start:deploy`: `prisma migrate deploy`, then start. For production, never use `migrate reset` there.
- `cd backend && npm run test:s3 [connectedAccountId]`: manual smoke script for an S3 connection. Defaults to the newest active config.
- `cd backend && npm run test:api-upload`: manual smoke script that needs a running backend (`API_URL`, default `http://localhost:4000`). It creates a temporary API key for the first user in the DB and does a real upload to that user's accounts. A file routed to Drive stays in Drive afterwards.
- `setup.sh` / `setup.ps1`: create `backend/.env` with random secrets, run `npm install`, and generate the Prisma client. They skip any `.env` that already exists, so the tracked `frontend/.env` is left alone.
- On Windows, if `prisma generate` fails because a file is locked, stop the running dev servers first.

The backend Docker image runs `prisma migrate deploy` and `seed:google-config:docker` on every start.

## Architecture beyond AGENTS.md

**Two storage providers.** `ConnectedAccount.provider` is `google_drive` or `s3`. An S3-compatible account is a `ConnectedAccount` plus an `S3StorageConfig` row (encrypted keys, bucket, optional endpoint, `prefix` defaulting to `9drive`, optional `quotaBytes`). Code that touches a stored file has to branch on provider:
- Streaming: `modules/files/stream-file.ts` (`streamProviderFile`) sends work to `stream-google-file.ts` or `s3/s3.service.ts`.
- Quota: `syncGoogleQuota` (google.service) vs `syncS3Quota` (s3.service). Both write to `StorageAccount`.
- Location: Drive files go in the `9drive` folder or a mirrored subfolder. S3 keys are `<prefix>/<userId>/<fileId>/<name>` (`buildS3ObjectKey`).

**Two upload paths** (`modules/uploads/upload.routes.ts`). They behave differently, so check both when changing uploads.
- Resumable (`/uploads/resumable/init`, `/status/:id`, `/chunk/:id`) is the only path the browser uses (`context/UploadContext.tsx`, 5 MB chunks). Chunks pipe straight into a Drive resumable session. It's Drive-only: `init` accepts an S3 account, but `chunk` rejects it with `UNSUPPORTED_PROVIDER`, and `UploadContext` has no fallback.
- Multipart (`handleUpload`) serves `POST /uploads`, which has no frontend caller, and the external `POST /api/v1/uploads` (`modules/public-api`), guarded by `requireApiKey('files:upload')` rather than `requireAuth`. It's the only path that writes to S3. It holds each whole file in memory (`Buffer.concat`) before sending it to the provider, and it writes no audit log.
- Both paths grant `anyone` the `writer` role on each new Drive file, as does `POST /files/:id/public-permission`.

**Upload routing** (`selectAccount`, used by both paths):
1. The target folder's `connectedAccountId`, or `targetAccountId` on resumable init, pins the upload to one account and skips the routing policy.
2. Re-sync quota for any account whose last sync is more than 5 minutes old.
3. Subtract bytes already reserved by earlier files in the same multipart request.
4. Apply the user's `UploadRoutingPolicy` mode: `most_available` (default), `round_robin` (cursor kept in the DB), or `priority` (`priorityAccountIds`).
5. A null `availableBytes` means unlimited. In `most_available`, S3 accounts with unknown quota sort first and Drive accounts with unknown quota sort last.

**Folders are mirrored to Drive.** The `Folder.parentId` tree lives in MySQL, and when the user has a connected Google account each folder is also created under `9drive` on the first such account, setting `providerFolderId` and `connectedAccountId`. `ensureProviderFolderIds` backfills missing IDs whenever folders are listed. Folder renames and moves reach Drive, but file moves don't: `PATCH /files/:id` and `PATCH /files/batch` only change `File.folderId`.

**Drive sync overrides app state.** `syncGoogleAppFolderFiles` (`POST /files/sync-google`) scans `9drive` and the mirrored folders. For any Drive file it finds, it re-activates a trashed row and resets `folderId` from the Drive parent, which undoes app-side trashes and moves.

**Deletes.** `DELETE /files/:id` and `DELETE /files/batch` are soft (`status: 'deleted'`, `deletedAt`) and leave the provider copy alone, which is what the Trash page relies on. `DELETE /files/batch/permanent` removes the copy from either provider. `DELETE /folders/:id` is different: it permanently deletes Drive files straight away while still moving their rows to Trash, and it treats every file as Drive, so S3 objects are left behind with the error swallowed.

**Invites are records only.** Nothing outside `modules/invites` reads `WorkspaceInvite`, and file and folder queries filter on the owner's `userId`, so an invite grants no access. `accepted` only means the invitee's email has a 9Drive account.

**Google OAuth config comes from the DB, not env.** `env.ts` doesn't read `GOOGLE_*`. Those vars are read only by the seed scripts, which write a global `ProviderConfig` row (`userId` null) with encrypted credentials. It can also be set in Settings via `POST /system/google-config`. In Docker, `seed:google-config:docker` skips seeding when the credentials are blank or placeholders.

**`system` module and access control.** `User` has no role field, so `/system/*` is guarded only by `requireAuth`. That covers self-update, `update-log`, `google-config`, and backup/restore. Self-update runs `update.sh` from the repo root and falls back to `git pull`. It finds the root as `process.cwd()/..`, so the backend must run from `backend/`. `update.sh` isn't in the repo; it's created on the deployment host. `/system/backup` and `/system/restore` expect a SQLite file (`getDatabaseFilePath`), so they can't work with MySQL.

**Other modules missing from AGENTS.md:** `api-keys` and `audit-logs` (`utils/audit.ts` `createAuditLog`, shown on ActivityLogPage).

**Backend module style.** Source uses ESM syntax, but `backend/package.json` has no `"type": "module"`, so `module: NodeNext` compiles to CommonJS. `import.meta` and top-level `await` fail to compile. Relative imports use a `.js` suffix by convention, so keep it. Most route files hold their logic inline; services exist only for provider integrations (`google/`, `s3/`). Token encrypt/hash helpers are in `utils/crypto.ts`.

**Error responses.** `error.middleware.ts` turns every error into a 500 carrying the raw message, and nothing catches `ZodError`. A failed `.parse(req.body)` or a `findFirstOrThrow` miss is therefore a 500, not a 400 or 404, unless the route handles it first.

**Share tokens.** `FileShare` stores the raw `token` alongside `tokenHash`, and public lookups match either one.

**Frontend API base URL.** `lib/api.ts` uses `VITE_API_URL` unless it's unset or still the default `http://localhost:4000`. In that case a production build falls back to `/api`, which `frontend/nginx.conf` proxies to `backend:4000` with request buffering off. nginx strips the `/api/` prefix, so behind it the external upload endpoint is `/api/api/v1/uploads`.

**PWA.** The service worker's `navigateFallbackDenylist` (`vite.config.ts`) lists backend path prefixes. It only affects URLs the browser navigates to, not `fetch` calls, so add any backend route that gets opened directly, such as an OAuth callback. It matches unprefixed paths, so it doesn't cover `/api/*` in the nginx deployment.

**Mock pages.** Archived, Starred, and Recent render hard-coded data from `frontend/src/data/drive-data.ts` and aren't wired to the API. That file also exports the `FileItem` and `FolderItem` types that real components use.

**Env files.** `frontend/.env` is tracked despite the rule against committing `.env` files. It holds only public values, but its reCAPTCHA site key makes the register form require a captcha locally, even with no backend secret. Set `VITE_RECAPTCHA_SITE_KEY=` in `frontend/.env.local` to turn that off. The reverse also breaks: with only the backend secret set, email sign-up always fails, because the form sends no token. `docker-compose.yml` doesn't pass `RECAPTCHA_SECRET_KEY` to the backend, so registration isn't captcha-verified in Docker even if `.env` sets it.
