import { execa } from 'execa';
import chalk from 'chalk';
import { readdir, mkdir, copyFile, cp, stat, lstat, rm } from 'node:fs/promises';
import { Dirent } from 'node:fs';
import { join, dirname, relative, resolve, isAbsolute } from 'node:path';

const SKIP_DIR_NAMES = new Set(['node_modules', '.venv', '.git']);

function shouldSkipDirectory(dirent: Dirent): boolean {
    if (!dirent.isDirectory() && !dirent.isSymbolicLink()) {
        return false;
    }

    const name = dirent.name;
    if (SKIP_DIR_NAMES.has(name)) {
        return true;
    }
    return name.startsWith('.env');
}

async function pathExists(targetPath: string): Promise<boolean> {
    try {
        await stat(targetPath);
        return true;
    } catch {
        return false;
    }
}

interface CopySummary {
    envCopied: number;
    envSkipped: number;
    extraCopied: number;
    extraSkipped: number;
}

export async function copyEnvFilesAndExtras(
    sourceRoot: string,
    destinationRoot: string,
    extraPaths: string[]
): Promise<CopySummary> {
    const summary: CopySummary = {
        envCopied: 0,
        envSkipped: 0,
        extraCopied: 0,
        extraSkipped: 0,
    };

    // Prepare extra patterns (trim and deduplicate)
    const extraPatterns = Array.from(new Set(extraPaths.map((p) => p.trim()))).filter(
        (p) => p.length > 0
    );

    const stack: string[] = [sourceRoot];

    while (stack.length) {
        const currentDir = stack.pop();
        if (!currentDir) continue;

        let entries: Dirent[] = [];
        try {
            entries = await readdir(currentDir, { withFileTypes: true });
        } catch (error) {
            console.warn(chalk.yellow(`Skipping unreadable directory: ${currentDir}`), error);
            continue;
        }

        for (const entry of entries) {
            const entryPath = join(currentDir, entry.name);

            if (entry.isDirectory()) {
                if (shouldSkipDirectory(entry)) {
                    continue;
                }
                stack.push(entryPath);
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            const relativePath = relative(sourceRoot, entryPath);
            const destinationPath = join(destinationRoot, relativePath);

            // Check if this file matches .env* pattern
            if (entry.name.startsWith('.env')) {
                try {
                    await mkdir(dirname(destinationPath), { recursive: true });
                    if (await pathExists(destinationPath)) {
                        summary.envSkipped += 1;
                        continue;
                    }

                    await copyFile(entryPath, destinationPath);
                    summary.envCopied += 1;
                } catch (error) {
                    console.warn(
                        chalk.yellow(`Failed to copy ${relativePath} into new worktree.`),
                        error
                    );
                }
                continue;
            }

            // Check if this file matches any extra patterns
            const matchesPattern = extraPatterns.some((pattern) => entry.name === pattern);
            if (matchesPattern) {
                try {
                    await mkdir(dirname(destinationPath), { recursive: true });
                    if (await pathExists(destinationPath)) {
                        summary.extraSkipped += 1;
                        continue;
                    }

                    await copyFile(entryPath, destinationPath);
                    summary.extraCopied += 1;
                } catch (error) {
                    console.warn(
                        chalk.yellow(`Failed to copy ${relativePath} into new worktree.`),
                        error
                    );
                }
            }
        }
    }

    if (summary.envCopied > 0) {
        console.log(chalk.green(`Copied ${summary.envCopied} environment file(s).`));
    }
    if (summary.envSkipped > 0) {
        console.log(
            chalk.yellow(
                `Skipped ${summary.envSkipped} environment file(s) that already existed in the destination.`
            )
        );
    }

    if (summary.extraCopied > 0) {
        console.log(chalk.green(`Copied ${summary.extraCopied} extra file(s) matching configured patterns.`));
    }
    if (summary.extraSkipped > 0) {
        console.log(chalk.yellow(`Skipped ${summary.extraSkipped} extra file(s) that already existed.`));
    }

    return summary;
}

type AutoDetectedManager = 'npm' | 'yarn' | 'uv';

interface LockFileInfo {
    manager: AutoDetectedManager;
    directory: string;
    lockFile: string;
}

const LOCKFILE_MANAGER_MAP: Record<string, AutoDetectedManager> = {
    'package-lock.json': 'npm',
    'yarn.lock': 'yarn',
    'uv.lock': 'uv',
};

async function runInstallCommand(manager: string, cwd: string): Promise<void> {
    const normalized = manager.toLowerCase();
    let command = normalized;
    let args: string[] = [];

    switch (normalized) {
        case 'npm':
            args = ['install'];
            break;
        case 'yarn':
            args = ['install'];
            break;
        case 'pnpm':
            args = ['install'];
            break;
        case 'bun':
            args = ['install'];
            break;
        case 'uv':
            command = 'uv';
            args = ['sync'];
            break;
        default:
            command = normalized;
            args = ['install'];
            break;
    }

    console.log(chalk.blue(`Running ${command} ${args.join(' ')} in ${cwd}`));
    await execa(command, args, { cwd, stdio: 'inherit' });
}

async function discoverLockFiles(root: string): Promise<LockFileInfo[]> {
    const results: LockFileInfo[] = [];
    const queue: string[] = [root];

    while (queue.length) {
        const currentDir = queue.pop();
        if (!currentDir) continue;

        let entries: Dirent[] = [];
        try {
            entries = await readdir(currentDir, { withFileTypes: true });
        } catch (error) {
            console.warn(chalk.yellow(`Skipping unreadable directory during lockfile discovery: ${currentDir}`), error);
            continue;
        }

        for (const entry of entries) {
            const entryPath = join(currentDir, entry.name);

            if (entry.isDirectory()) {
                if (shouldSkipDirectory(entry)) {
                    continue;
                }
                queue.push(entryPath);
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            const manager = LOCKFILE_MANAGER_MAP[entry.name];
            if (!manager) {
                continue;
            }

            results.push({
                manager,
                directory: currentDir,
                lockFile: entryPath,
            });
        }
    }

    return results;
}

interface InstallSummary {
    executed: LockFileInfo[];
    manual?: { manager: string; directory: string };
}

export async function installDependencies(
    worktreePath: string,
    installOption?: string
): Promise<InstallSummary> {
    // Handle skip
    if (installOption === 'skip') {
        console.log(chalk.blue('Skipping dependency installation.'));
        return { executed: [] };
    }

    // Handle manual manager (not 'auto' or 'skip')
    if (installOption && installOption !== 'auto') {
        const summary: InstallSummary = {
            executed: [],
            manual: { manager: installOption, directory: worktreePath },
        };
        await runInstallCommand(installOption.toLowerCase(), worktreePath);
        return summary;
    }

    // Auto-detect (installOption is undefined or 'auto')
    console.log(chalk.blue('Auto-detecting lock files for dependency installation...'));
    const lockFiles = await discoverLockFiles(worktreePath);

    if (!lockFiles.length) {
        console.log(chalk.blue('No lock files detected for auto-install.'));
        return { executed: [] };
    }

    const summary: InstallSummary = {
        executed: [],
    };

    for (const info of lockFiles) {
        const relativeDir = relative(worktreePath, info.directory) || '.';
        console.log(
            chalk.blue(
                `Detected ${info.lockFile} (manager: ${info.manager}) in ${relativeDir}.`)
        );
        await runInstallCommand(info.manager, info.directory);
        summary.executed.push(info);
    }

    return summary;
}

interface ReplicationSummary {
    copied: string[];
    removed: string[];
    missing: string[];
}

function parseNullSeparated(stdout: string): string[] {
    if (!stdout) return [];
    return stdout
        .split('\0')
        .filter((entry) => entry.length > 0);
}

export async function replicateWorkingTreeState(
    sourceRoot: string,
    destinationRoot: string
): Promise<ReplicationSummary> {
    console.log(chalk.blue('Replicating current working tree state into the new worktree...'));

    const summary: ReplicationSummary = {
        copied: [],
        removed: [],
        missing: [],
    };

    const filesToCopy = new Set<string>();
    const deletions = new Set<string>();

    let diffNamesStdout = '';
    try {
        const diffNamesResult = await execa('git', ['diff', '--name-only', 'HEAD', '-z'], {
            cwd: sourceRoot,
        });
        diffNamesStdout = diffNamesResult.stdout;
    } catch (error: any) {
        if (error.exitCode !== 128) {
            throw error;
        }
        // exitCode 128 typically means no commits yet; ignore.
    }

    parseNullSeparated(diffNamesStdout).forEach((path) => filesToCopy.add(path));

    let untrackedStdout = '';
    try {
        const untrackedResult = await execa('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
            cwd: sourceRoot,
        });
        untrackedStdout = untrackedResult.stdout;
    } catch (error) {
        console.warn(chalk.yellow('Failed to detect untracked files for replication.'), error);
    }

    parseNullSeparated(untrackedStdout).forEach((path) => filesToCopy.add(path));

    let statusStdout = '';
    try {
        const statusResult = await execa('git', ['diff', '--name-status', 'HEAD', '-z'], {
            cwd: sourceRoot,
        });
        statusStdout = statusResult.stdout;
    } catch (error: any) {
        if (error.exitCode !== 128) {
            throw error;
        }
    }

    const statusEntries = parseNullSeparated(statusStdout);
    // With -z flag, git outputs: status\0filename\0status\0filename\0
    // After splitting by \0, we get pairs: [status, filename, status, filename, ...]
    for (let i = 0; i < statusEntries.length; i++) {
        const status = statusEntries[i];
        if (!status) continue;

        const code = status[0];

        if (code === 'D') {
            const filename = statusEntries[i + 1];
            if (filename) {
                deletions.add(filename);
            }
            i++; // Skip the filename we just processed
            continue;
        }

        if (code === 'R') {
            // For renames: R\0oldname\0newname\0
            const fromPath = statusEntries[i + 1];
            const toPath = statusEntries[i + 2];
            if (fromPath) {
                deletions.add(fromPath);
            }
            if (toPath) {
                filesToCopy.add(toPath);
            }
            i += 2; // Skip both paths we just processed
            continue;
        }

        // For other status codes (M, A, etc.)
        const filename = statusEntries[i + 1];
        if (filename) {
            filesToCopy.add(filename);
        }
        i++; // Skip the filename we just processed
    }

    deletions.forEach((path) => filesToCopy.delete(path));

    for (const relativePath of filesToCopy) {
        const sourcePath = join(sourceRoot, relativePath);
        const destinationPath = join(destinationRoot, relativePath);

        if (!(await pathExists(sourcePath))) {
            summary.missing.push(relativePath);
            continue;
        }

        try {
            await mkdir(dirname(destinationPath), { recursive: true });
            const stats = await lstat(sourcePath);
            await cp(sourcePath, destinationPath, {
                recursive: stats.isDirectory(),
                force: true,
                errorOnExist: false,
                dereference: false,
            });
            summary.copied.push(relativePath);
        } catch (error) {
            console.warn(chalk.yellow(`Failed to copy ${relativePath} to the new worktree.`), error);
        }
    }

    for (const relativePath of deletions) {
        const destinationPath = join(destinationRoot, relativePath);
        try {
            await rm(destinationPath, { recursive: true, force: true });
            summary.removed.push(relativePath);
        } catch (error) {
            console.warn(chalk.yellow(`Failed to remove ${relativePath} in the new worktree.`), error);
        }
    }

    if (summary.copied.length) {
        console.log(chalk.green(`Copied ${summary.copied.length} file(s) from the source worktree.`));
    }
    if (summary.removed.length) {
        console.log(chalk.green(`Removed ${summary.removed.length} file(s) to mirror deletions.`));
    }
    if (summary.missing.length) {
        console.log(
            chalk.yellow(
                `Skipped ${summary.missing.length} file(s) because they were not present in the source worktree.`
            )
        );
    }

    if (!summary.copied.length && !summary.removed.length) {
        console.log(chalk.blue('No changes to replicate; worktree matches HEAD.'));
    }

    return summary;
}

function resolveGitDir(basePath: string, gitDirValue: string): string {
    const trimmed = gitDirValue.trim();
    return isAbsolute(trimmed) ? trimmed : resolve(basePath, trimmed);
}

export async function duplicateGitIndex(sourceRoot: string, destinationRoot: string): Promise<void> {
    try {
        const [sourceGitDirResult, destinationGitDirResult] = await Promise.all([
            execa('git', ['rev-parse', '--git-dir'], { cwd: sourceRoot }),
            execa('git', ['rev-parse', '--git-dir'], { cwd: destinationRoot }),
        ]);

        const sourceGitDir = resolveGitDir(sourceRoot, sourceGitDirResult.stdout);
        const destinationGitDir = resolveGitDir(destinationRoot, destinationGitDirResult.stdout);

        const sourceIndexPath = join(sourceGitDir, 'index');
        const destinationIndexPath = join(destinationGitDir, 'index');

        if (!(await pathExists(sourceIndexPath))) {
            console.warn(chalk.yellow('Source git index not found; staged changes will not be copied.'));
            return;
        }

        await mkdir(dirname(destinationIndexPath), { recursive: true });
        await copyFile(sourceIndexPath, destinationIndexPath);
        console.log(chalk.green('Synced staged changes into the new worktree.'));
    } catch (error) {
        console.warn(chalk.yellow('Failed to synchronize git index between worktrees.'), error);
    }
}
