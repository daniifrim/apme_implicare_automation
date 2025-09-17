---
description: Deploy APME automation to Google Apps Script and push to GitHub, ensuring CHANGELOG.md and commit history are up to date
---

Deploy the APME automation system by:

1. **Check latest GitHub commit and update `CHANGELOG.md`:**
   - Review the most recent commit with:
     ```
     git log -1
     ```
   - Open `docs/CHANGELOG.md` and ensure all recent changes are documented.
   - If you made any updates to `CHANGELOG.md`, stage it:
     ```
     git add docs/CHANGELOG.md
     ```

2. **Push main-project to Google Apps Script:**
   ```
   cd main-project && clasp push
   ```

3. **Check wrapper-project for changes and push if needed:**
   ```
   if [ -n "$(git diff --name-only wrapper-project/)" ]; then cd wrapper-project && clasp push; fi
   ```

4. **Commit and push to GitHub:**
   - Add all changes to git (including any updates to `CHANGELOG.md`)
   - Create commit with message: "$ARGUMENTS" (or default APME update message)
   - Push to GitHub
   ```
   git add .
   git commit -m "${1:-Update APME automation system

🤖 Generated with Claude Code (https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>}"
   git push
   ```

5. **Confirm deployment success:**
   Show the Script IDs:
   - Main project: `14cAHJIREVfcKY5zRtoiAwulqXqVOSHx1mX0hUPFJXqfYQwaS-r0tWDxm`
   - Wrapper project: `1AhAu_f7ob86gVECxGExu9bKqiRTtRrDR06aVF0oosr5s2mgse1-KUQEd`

If any step fails, stop and report the error. Always verify clasp authentication before proceeding.

---

**Theory/Explanation:**

- It's important to keep `CHANGELOG.md` up to date so that anyone reviewing the repository or using the project can see what has changed between versions. This is a best practice for software projects.
- By checking the latest commit (`git log -1`), you can see what was last pushed and ensure your changelog reflects all recent changes.
- Staging `CHANGELOG.md` before committing ensures that your documentation is included in the commit history.
- The rest of the steps ensure your Apps Script code is deployed via clasp and your repository is up to date on GitHub.
- Always verify clasp authentication to avoid deployment errors.
- If any step fails, it's best to stop and fix the issue before proceeding to avoid inconsistent deployments.