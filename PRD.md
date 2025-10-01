# Changes to the `new` command
1. Add support for the Python UV package manager when preparing a new worktree.
2. Automatically detect and install dependencies by walking the repository tree (skipping directories named `node_modules`, `.venv`, or starting with `.env`). For each detected lock file (`uv.lock`, `package-lock.json`, `yarn.lock`), run the corresponding install command from the directory that contains the lock file. If the user passes `--install`, use only that package manager and skip auto-detection.
3. Allow creating a new worktree even when the main worktree is dirty. Emit a red warning but do not abort.
4. Copy every file whose name begins with `.env` (e.g. `.env`, `.env.local`, `.env.prod`, `.env.production`) into the new worktree. Preserve the original folder structure while ignoring directories named `node_modules`, `.venv`, or starting with `.env`.

# Add a new command `copy`
1. Mirror the `new` command flow but seed the worktree from the current HEAD.
2. After creating the worktree, replicate the current working tree state: staged changes, unstaged changes, and untracked files (excluding anything ignored by gitignore) should all appear in the new worktree so it matches the source repo. Then continue with the regular `new` post-creation steps (copy `.env*`, install dependencies, open editor, etc.).

# Other changes
1. Use the `code` command as the default editor.
2. Add CLI support for managing a configurable list of extra paths to copy during `new`/`copy` (alongside the default `.env*` set).
3. Switch the project to npm (use `npm install`, publish a `package-lock.json`, update docs/scripts accordingly).
