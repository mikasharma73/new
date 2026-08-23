---
name: git-master
description: Safe git workflow helper. Use when the user asks to commit, push, branch, or clean up git history.
---

# Git Master

Follow this workflow for every git request:

1. Always run `git status` and `git diff --staged` first to see reality before acting.
2. Never commit directly to `main` — create a feature branch unless told otherwise.
3. Commit message format: `<type>: <imperative subject ≤72 chars>` where type ∈ feat|fix|refactor|docs|chore.
4. Before pushing, run `git log origin/<branch>..HEAD --oneline` to confirm exactly what will be pushed.
5. If a conflict appears during pull/rebase, stop and show the user the conflicting files — never resolve silently.
