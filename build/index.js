#!/usr/bin/env node
import { Command } from "commander";
import { newWorktreeHandler } from "./commands/new.js";
import { copyWorktreeHandler } from "./commands/copy.js";
import { listWorktreesHandler } from "./commands/list.js";
import { removeWorktreeHandler } from "./commands/remove.js";
import { mergeWorktreeHandler } from "./commands/merge.js";
import { purgeWorktreesHandler } from "./commands/purge.js";
import { configHandler } from "./commands/config.js";
import { prWorktreeHandler } from "./commands/pr.js";
import { openWorktreeHandler } from "./commands/open.js";
import { extractWorktreeHandler } from "./commands/extract.js";
import { getDefaultPackageManager } from "./config.js";
/**
 * Resolves the install option based on CLI flag and config.
 * Priority: CLI flag > config
 * - true (flag without value) -> 'auto'
 * - string value -> use that value
 * - undefined -> use config value
 */
function resolveInstallOption(cliValue) {
    if (cliValue !== undefined) {
        // CLI flag was provided
        if (typeof cliValue === 'boolean') {
            // --install flag without value means auto-detect
            return cliValue ? 'auto' : undefined;
        }
        // --install <value> was provided
        return cliValue;
    }
    // Use config value
    const configValue = getDefaultPackageManager();
    return configValue === 'skip' ? 'skip' : configValue;
}
const program = new Command();
program
    .name("wt")
    .description("Manage git worktrees and open them in the Cursor editor.")
    .version("1.0.0");
program
    .command("new")
    .argument("[branchName]", "Name of the branch to base this worktree on")
    .option("-p, --path <path>", "Relative path/folder name for new worktree")
    .option("-c, --checkout", "Create new branch if it doesn't exist and checkout automatically", false)
    .option("-i, --install [packageManager]", "Package manager to use for installing dependencies (npm, pnpm, bun, uv, skip, auto, etc.). If no value provided, auto-detects.")
    .option("-e, --editor <editor>", "Editor to use for opening the worktree (e.g., code, webstorm, windsurf, etc.)")
    .description("Create a new worktree for the specified branch, install dependencies if specified, and open in editor.")
    .action((branchName, options) => {
    const resolvedInstall = resolveInstallOption(options.install);
    newWorktreeHandler(branchName, { ...options, install: resolvedInstall });
});
program
    .command("copy")
    .argument("[branchName]", "Name of the branch to create or reuse for the copied worktree")
    .option("-p, --path <path>", "Relative path/folder name for the new worktree")
    .option("-i, --install [packageManager]", "Package manager to use for installing dependencies (npm, pnpm, bun, uv, skip, auto, etc.). If no value provided, auto-detects.")
    .option("-e, --editor <editor>", "Editor to use for opening the worktree (e.g., code, webstorm, windsurf, etc.)")
    .description("Create a new worktree from the current HEAD and replicate the working directory state.")
    .action((branchName, options) => {
    const resolvedInstall = resolveInstallOption(options.install);
    copyWorktreeHandler(branchName, { ...options, install: resolvedInstall });
});
program
    .command("list")
    .alias("ls")
    .description("List all existing worktrees for this repository.")
    .action(listWorktreesHandler);
program
    .command("remove")
    .alias("rm")
    .argument("[pathOrBranch]", "Path of the worktree or branch to remove.")
    .option("-f, --force", "Force removal of worktree and deletion of the folder", false)
    .description("Remove a specified worktree. Cleans up the .git/worktrees references.")
    .action(removeWorktreeHandler);
program
    .command("merge")
    .argument("<branchName>", "Name of the branch to merge from")
    .option("-f, --force", "Force removal of worktree after merge", false)
    .description("Commit changes in the target branch and merge them into the current branch, then remove the branch/worktree")
    .action(mergeWorktreeHandler);
program
    .command("purge")
    .description("Safely remove all worktrees except for the main branch, with confirmation.")
    .action(purgeWorktreesHandler);
program
    .command("pr")
    .argument("<prNumber>", "GitHub Pull Request number to create a worktree from")
    .option("-p, --path <path>", "Specify a custom path for the worktree (defaults to repoName-branchName)")
    .option("-i, --install [packageManager]", "Package manager to use for installing dependencies (npm, pnpm, bun, uv, skip, auto, etc.). If no value provided, auto-detects.")
    .option("-e, --editor <editor>", "Editor to use for opening the worktree (overrides default editor)")
    .description("Fetch the branch for a given GitHub PR number and create a worktree.")
    .action((prNumber, options) => {
    const resolvedInstall = resolveInstallOption(options.install);
    prWorktreeHandler(prNumber, { ...options, install: resolvedInstall });
});
program
    .command("open")
    .argument("[pathOrBranch]", "Path to worktree or branch name to open")
    .option("-e, --editor <editor>", "Editor to use for opening the worktree (overrides default editor)")
    .description("Open an existing worktree in the editor.")
    .action(openWorktreeHandler);
program
    .command("extract")
    .argument("[branchName]", "Name of the branch to extract (defaults to current branch)")
    .option("-p, --path <path>", "Relative path/folder name for the worktree")
    .option("-i, --install [packageManager]", "Package manager to use for installing dependencies (npm, pnpm, bun, uv, skip, auto, etc.). If no value provided, auto-detects.")
    .option("-e, --editor <editor>", "Editor to use for opening the worktree (overrides default editor)")
    .description("Extract an existing branch as a new worktree. If no branch is specified, extracts the current branch.")
    .action((branchName, options) => {
    const resolvedInstall = resolveInstallOption(options.install);
    extractWorktreeHandler(branchName, { ...options, install: resolvedInstall });
});
program
    .command("config")
    .description("Manage CLI configuration settings.")
    .addCommand(new Command("set")
    .description("Set a configuration value.")
    .addCommand(new Command("editor")
    .argument("<editorName>", "Name of the editor command (e.g., code, cursor, webstorm)")
    .description("Set the default editor to open worktrees in.")
    .action((editorName) => configHandler("set", "editor", editorName)))
    .addCommand(new Command("package-manager")
    .argument("<manager>", "Package manager to use by default (npm, pnpm, bun, uv, skip, auto)")
    .description("Set the default package manager for dependency installation.")
    .action((manager) => configHandler("set", "package-manager", manager)))
    .addCommand(new Command("copy-paths")
    .argument("<paths>", "Comma-separated list of paths to copy into new worktrees")
    .description("Set the paths to copy into new worktrees (comma-separated).")
    .action((paths) => configHandler("set", "copy-paths", paths))))
    .addCommand(new Command("get")
    .description("Get a configuration value.")
    .addCommand(new Command("editor")
    .description("Get the currently configured default editor.")
    .action(() => configHandler("get", "editor")))
    .addCommand(new Command("package-manager")
    .description("Get the currently configured default package manager.")
    .action(() => configHandler("get", "package-manager")))
    .addCommand(new Command("copy-paths")
    .description("Get the currently configured copy-paths (comma-separated).")
    .action(() => configHandler("get", "copy-paths"))))
    .addCommand(new Command("path")
    .description("Show the path to the configuration file.")
    .action(() => configHandler("path")));
program.parse(process.argv);
