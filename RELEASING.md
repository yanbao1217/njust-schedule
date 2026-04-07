# Releasing

This repository is prepared for GitHub Releases.

## Versioning

Use semantic version tags:

```bash
v0.1.0
v0.1.1
v0.2.0
```

## Local release check

Before pushing a release tag:

```bash
npm install
npm run build
npm run test
npm run pack:release
```

If everything succeeds, a local release bundle will be created under:

```text
release/
  opencli-njust-v<version>/
  opencli-njust-v<version>.zip
```

## GitHub Release flow

1. Update `package.json` version.
2. Update `CHANGELOG.md`.
3. Commit changes.
4. Create and push a tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

5. GitHub Actions will:
   - install dependencies
   - build the project
   - run tests
   - prepare the release directory
   - create a zip archive
   - create a GitHub Release
   - upload the zip asset

## Release contents

Each release bundle includes:

- compiled `dist/` output
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- a small `release-manifest.json`

Test files are excluded from the release bundle.

## Notes

- The release workflow does not publish to npm.
- If you later want npm publishing, add a separate publish workflow instead of mixing it into the GitHub Release workflow.
