import { execa } from "execa";
import chalk from "chalk";
import { stat } from "node:fs/promises";
import { resolve, join, dirname, basename } from "node:path";
import { getDefaultEditor, getExtraCopyPaths } from "../config.js";
import { isMainRepoBare } from "../utils/git.js";
import {
    copyEnvFilesAndExtras,
    installDependencies,
    replicateWorkingTreeState,
    duplicateGitIndex,
} from "../utils/worktree.js";

interface CopyOptions {
    path?: string;
    install?: string;
    editor?: string;
}

function generateBranchName(currentBranch: string | null): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "");
    const base = (currentBranch && currentBranch.length > 0 ? currentBranch : "detached").replace(
        /[^a-zA-Z0-9._/-]+/g,
        "-"
    );
    return `copy/${base}-${timestamp}`;
}

export async function copyWorktreeHandler(
    branchName?: string,
    options: CopyOptions = {}
) {
    try {
        await execa("git", ["rev-parse", "--is-inside-work-tree"]);
        const { stdout: repoRootStdout } = await execa("git", ["rev-parse", "--show-toplevel"]);
        const repoRoot = repoRootStdout.trim();

        const { stdout: currentBranchStdout } = await execa("git", ["branch", "--show-current"]);
        const currentBranch = currentBranchStdout.trim() || null;

        let targetBranch = branchName?.trim();
        if (!targetBranch) {
            targetBranch = generateBranchName(currentBranch);
            console.log(chalk.blue(`No branch specified. Using generated branch name: ${targetBranch}`));
        }

        let folderName: string;
        if (options.path) {
            folderName = options.path;
        } else {
            const shortBranchName = targetBranch
                .split("/")
                .filter((part) => part.length > 0)
                .pop() || targetBranch;

            const currentDir = process.cwd();
            const parentDir = dirname(currentDir);
            const currentDirName = basename(currentDir);
            folderName = join(parentDir, `${currentDirName}-${shortBranchName}`);
        }
        const resolvedPath = resolve(folderName);

        try {
            await stat(resolvedPath);
            console.error(chalk.red(`❌ Error: Directory already exists at: ${resolvedPath}`));
            console.error(chalk.yellow("Please choose a different path with --path option."));
            process.exit(1);
        } catch (error) {
            // Directory doesn't exist, continue
        }

        if (await isMainRepoBare()) {
            console.error(chalk.red("❌ Error: The main repository is configured as 'bare' (core.bare=true)."));
            console.error(chalk.red("   This prevents normal Git operations. Please fix the configuration:"));
            console.error(chalk.cyan("   git config core.bare false"));
            process.exit(1);
        }

        const { stdout: localBranches } = await execa("git", ["branch", "--list", targetBranch]);
        const { stdout: remoteBranches } = await execa("git", ["branch", "-r", "--list", `origin/${targetBranch}`]);
        const branchExists = localBranches.trim().length > 0 || remoteBranches.trim().length > 0;

        console.log(chalk.blue(`Creating copy worktree at: ${resolvedPath}`));
        if (!branchExists) {
            console.log(chalk.blue(`Creating new branch "${targetBranch}" from current HEAD.`));
            await execa("git", ["worktree", "add", "-b", targetBranch, resolvedPath, "HEAD"]);
        } else {
            console.log(chalk.green(`Using existing branch "${targetBranch}".`));
            await execa("git", ["worktree", "add", resolvedPath, targetBranch]);
        }

        await replicateWorkingTreeState(repoRoot, resolvedPath);
        await duplicateGitIndex(repoRoot, resolvedPath);
        try {
            await execa("git", ["update-index", "--refresh"], { cwd: resolvedPath });
        } catch (refreshError) {
            console.warn(chalk.yellow("Failed to refresh git index in copied worktree."), refreshError);
        }

        console.log(chalk.blue("Copying environment files and configured extras..."));
        const extraPaths = getExtraCopyPaths();
        await copyEnvFilesAndExtras(repoRoot, resolvedPath, extraPaths);

        await installDependencies(resolvedPath, options.install);

        const configuredEditor = getDefaultEditor();
        const editorCommand = options.editor || configuredEditor;
        console.log(chalk.blue(`Opening ${resolvedPath} in ${editorCommand}...`));
        try {
            await execa(editorCommand, [resolvedPath], { stdio: "inherit" });
        } catch (editorError) {
            console.error(chalk.red(`Failed to open editor "${editorCommand}". Please ensure it's installed and in your PATH.`));
            console.warn(chalk.yellow("Continuing without opening editor."));
        }

        console.log(chalk.green(`Copy worktree created at ${resolvedPath}.`));
        console.log(chalk.green(`Branch ready at ${targetBranch}. Attempted to open in ${editorCommand}.`));
    } catch (error) {
        if (error instanceof Error) {
            console.error(chalk.red("Failed to create copy worktree:"), error.message);
        } else {
            console.error(chalk.red("Failed to create copy worktree:"), error);
        }
        process.exit(1);
    }
}
