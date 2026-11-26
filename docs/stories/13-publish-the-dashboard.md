# 13. Publish the dashboard

Phase 3 (dashboard). Built on 26 November 2026.

## Story

As a visitor, I want to open the dashboard at one public address, so I
can see the results without installing anything.

## Acceptance criteria

- [x] The address is `https://codelaunch.nl/containment-breach/` (the
      maintainer's choice).
- [x] A push to `main` that passes every check builds the dashboard
      and uploads it over FTPS. Pull requests never deploy.
- [x] Without the three FTP secrets the deploy step says so and is
      skipped; the run still passes.
- [x] The upload goes to one fixed folder on the server and nowhere
      else.
- [x] After an upload, the workflow fetches the address and fails if
      the page is not there.
- [x] The maintainer sets the secrets with a script that never shows
      or saves a value.
- [x] A shared link shows a preview picture, title and description.
- [ ] The secrets are set and the first deploy was checked in a
      browser (waits for the maintainer).

## Tests

- [x] The dashboard's page keeps its strict content policy; the
      preview picture is one of the site's own files.

## Notes

- The page is static files. Hosting it costs nothing extra and calls
  no model.
- Until there is a recorded live run, the published page says "No
  recorded run yet".
- The host adds its own security headers (no framing, HTTPS only).
  The page's own `<meta>` policy is the strict one.
