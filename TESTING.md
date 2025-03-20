# Manual Tests for cursor-worktree CLI

## Manual Test for CLI Command Name Change

1. Install the package globally:
   ```bash
   pnpm install -g .
   ```
2. Run the command help to verify the new command:
   ```bash
   cwt --help
   ```
3. Optionally, test additional commands:
   - Create a new worktree:
     ```bash
     cwt new feature/test
     ```
   - List worktrees:
     ```bash
     cwt list
     ```
   - Remove a worktree:
     ```bash
     cwt remove feature/test
     ```

## New Worktree Sibling Directory Test

1. In a test repository, run:
   ```bash
   cwt new editor
   ```
2. Verify that a new sibling directory named `<currentDirectoryName>-editor` is created.
3. Confirm that the worktree is added to the Git repository and that the Cursor editor opens the new directory.

## Remove Worktree Force Flag Test

1. Create a test worktree:
   ```bash
   cwt new test-branch
   ```
2. Make some changes in the worktree that would prevent normal removal
3. Try removing the worktree without the force flag:
   ```bash
   cwt remove test-branch
   ```
   This should fail if there are uncommitted changes
4. Try removing the worktree with the force flag:
   ```bash
   cwt remove --force test-branch
   ```
   This should succeed and remove the worktree regardless of its state
5. Verify that the worktree directory is removed and the Git worktree reference is cleaned up

## Manual Test for Merge Command

1. **Setup a Test Worktree:**
   - Create a new worktree for a test branch:
     ```bash
     cwt new test-merge
     ```
2. **Make Changes in the Test Worktree:**
   - Navigate to the test worktree directory, edit a file, and save your changes.
3. **Run the Merge Command:**
   - Go back to your main worktree (current branch) and execute:
     ```bash
     cwt merge test-merge
     ```
4. **Verify the Merge:**
   - Confirm that the changes from `test-merge` are merged into the current branch.
   - Check that the test worktree is removed.
5. **Test with Force Flag:**
   - Create another test worktree:
     ```bash
     cwt new test-merge-force
     ```
   - Make changes that would prevent normal removal (e.g., untracked files)
   - Run the merge with force flag:
     ```bash
     cwt merge test-merge-force --force
     ```
   - Verify that the merge succeeds and the worktree is forcibly removed.

## Manual Test for CI Publish Workflow

1. Push a commit to the main branch (or merge the PR) to trigger the workflow.
2. Check the Actions tab in your GitHub repository to see that the "Publish to npm" workflow runs successfully.
3. Verify that the package is published to npm with the expected version (0.0.0-development) without any new commits from the workflow.

## Important Notes

- The CI workflow will not make any commits or version bumps
- Version updates should be handled manually outside of CI
- Make sure you have set up the `NPM_TOKEN` secret in your GitHub repository settings 
