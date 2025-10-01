# @johnlindquist/worktree

A CLI tool for managing Git worktrees with a focus on opening them in the Cursor editor.

## Installation

```bash
npm install -g @johnlindquist/worktree
```

## Usage

### Create a new worktree from Branch Name

```bash
wt new <branchName> [options]
```
Options:
- `-p, --path <path>`: Specify a custom path for the worktree
- `-c, --checkout`: Create new branch if it doesn't exist and checkout automatically
- `-i, --install [packageManager]`: Package manager to use for installing dependencies (npm, pnpm, bun, uv, skip, auto, etc.). If no value provided, auto-detects. Use `skip` to disable installation.
- `-e, --editor <editor>`: Editor to use for opening the worktree (overrides default editor)

Example:
```bash
wt new feature/login
wt new feature/chat --checkout
wt new feature/auth -p ./auth-worktree
wt new feature/deps -i uv
wt new feature/vscode -e code
wt new feature/nodeps -i skip  # Skip dependency installation
wt new feature/autodetect -i   # Force auto-detect (override config)
```

When a worktree is created, the CLI copies every `.env*` file (plus any paths configured via `wt config copy-paths`) into the new directory. By default, it auto-detects lockfiles (`uv.lock`, `package-lock.json`, `yarn.lock`) to install dependencies. You can configure the default behavior with `wt config set package-manager <manager>`, or use `--install` to override on a per-command basis. Use `--install skip` to disable installation entirely.

### Create a new worktree from Pull Request Number

```bash
wt pr <prNumber> [options]
```
Uses the GitHub CLI (`gh`) to check out the branch associated with the given Pull Request number, sets it up locally to track the correct remote branch (handling forks automatically), and then creates a worktree for it.

**Benefit:** Commits made in this worktree can be pushed directly using `git push` to update the Pull Request.

**Requires GitHub CLI (`gh`) to be installed and authenticated.**

Options:
- `-p, --path <path>`: Specify a custom path for the worktree (defaults to `<repoName>-<branchName>`)
- `-i, --install [packageManager]`: Package manager to use for installing dependencies (npm, pnpm, bun, uv, skip, auto, etc.). If no value provided, auto-detects.
- `-e, --editor <editor>`: Editor to use for opening the worktree (overrides default editor)

Example:
```bash
# Create worktree for PR #123
wt pr 123

# Create worktree for PR #456, install deps with npm, open in vscode
wt pr 456 -i npm -e code

### Copy the current worktree state

```bash
wt copy [branchName] [options]
```

Creates a new worktree seeded from the current HEAD, then mirrors your working tree (staged, unstaged, and untracked changes) into the new location. Useful for cloning an in-progress branch to try out experiments in parallel.

Options:
- `-p, --path <path>`: Specify a custom path for the copied worktree
- `-i, --install [packageManager]`: Package manager to use when installing dependencies (npm, pnpm, bun, uv, skip, auto, etc.). If no value provided, auto-detects.
- `-e, --editor <editor>`: Editor to use for opening the worktree (overrides default editor)

Examples:
```bash
# Create a copy with an auto-generated branch name
wt copy

# Create a copy on a named branch and open in VS Code
wt copy feature/experiment -e code
```
```

### Configure Default Editor

You can set a default editor to be used when creating new worktrees:

```bash
# Set default editor
wt config set editor <editorName>

# Examples:
wt config set editor code     # Use VS Code
wt config set editor webstorm # Use WebStorm
wt config set editor cursor   # Use Cursor

# Get current default editor
wt config get editor

# Show config file location
wt config path
```

Additional helpers:

```bash
# Manage extra files or folders to copy alongside .env* files during wt new/copy
wt config copy-paths add configs/local.json
wt config copy-paths list
wt config copy-paths remove configs/local.json
```

The default editor (VS Code) will be used when creating new or copied worktrees unless overridden with the `-e` flag.

### Configure Default Package Manager

You can set a default package manager to be used when creating worktrees:

```bash
# Set default package manager
wt config set package-manager <manager>

# Examples:
wt config set package-manager npm    # Always use npm
wt config set package-manager pnpm   # Always use pnpm
wt config set package-manager skip   # Never install dependencies by default
wt config set package-manager auto   # Auto-detect based on lock files (default)

# Get current default package manager
wt config get package-manager
```

The default package manager setting will be used for all worktree creation commands (`new`, `copy`, `pr`, `extract`) unless overridden with the `-i` flag.

**Available values:**
- `auto` (default): Auto-detects package manager based on lock files
- `npm`, `pnpm`, `yarn`, `bun`, `uv`: Use specific package manager
- `skip`: Don't install dependencies by default

### List worktrees

```bash
wt list
```

### Remove a worktree

```bash
wt remove <pathOrBranch>
```

You can remove a worktree by either its path or branch name:
```bash
wt remove ./feature/login-worktree
wt remove feature/chat
```

## Requirements

- Git
- Node.js
- An editor installed and available in PATH (defaults to VS Code)
- **GitHub CLI (`gh`) installed and authenticated (for `wt pr` command)**

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

## License

MIT 
