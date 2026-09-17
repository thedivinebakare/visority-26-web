# Restore the previous Visority build

Saved before publication of the September 17, 2026 redesign.

- Original revision: `de4cd75` — Enter-key auto-advance for registration.
- Complete tracked-source archive: `visority-before-redesign-de4cd75.zip` in this directory.
- Repository: `https://github.com/thedivinebakare/visority-26-web.git`.
- The archive includes the prior homepage, checkout, confirmation pages, assets and scripts. It does not include dependencies, local hosting credentials or untracked temporary screenshots.

To restore without losing the redesign, extract the archive to a separate directory, install its dependencies and preview it there. Alternatively, create a fresh Git branch at `de4cd75`. Deploy that revision to the same Vercel project if a full rollback is desired. Do not overwrite the redesigned working directory to preview the original.

The previous production deployment can also be promoted back through Vercel:

- Deployment ID: `dpl_5B1NU38S3cwXEW1zYE4WzjHNEGUX`
- Deployment URL: `https://visority-26-2iidy3ifx-thedivinebakares-projects.vercel.app`
- Previous production created: 16 September 2026, 00:01 WAT.
- GitHub backup tag: `backup/pre-visority-redesign-2026-09-17` (pushed to origin).
- Redesigned source branch: `codex/visority-experience` (pushed to origin).

To restore production, promote that deployment back to production using Vercel. Confirm the project is `visority-26-web` before promoting; this changes the live site.
