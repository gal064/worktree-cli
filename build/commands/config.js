import chalk from 'chalk';
import { getDefaultEditor, setDefaultEditor, getConfigPath, getExtraCopyPaths, addExtraCopyPath, removeExtraCopyPath, getDefaultPackageManager, setDefaultPackageManager, } from '../config.js';
export async function configHandler(action, key, value) {
    try {
        switch (action) {
            case 'get':
                if (key === 'editor') {
                    const editor = getDefaultEditor();
                    console.log(chalk.blue(`Default editor is currently set to: ${chalk.bold(editor)}`));
                }
                else if (key === 'package-manager') {
                    const packageManager = getDefaultPackageManager();
                    console.log(chalk.blue(`Default package manager is currently set to: ${chalk.bold(packageManager)}`));
                }
                else {
                    console.error(chalk.red(`Unknown configuration key to get: ${key}`));
                    process.exit(1);
                }
                break;
            case 'set':
                if (key === 'editor' && value) {
                    setDefaultEditor(value);
                    console.log(chalk.green(`Default editor set to: ${chalk.bold(value)}`));
                }
                else if (key === 'editor') {
                    console.error(chalk.red(`You must provide an editor name.`));
                    process.exit(1);
                }
                else if (key === 'package-manager' && value) {
                    setDefaultPackageManager(value);
                    console.log(chalk.green(`Default package manager set to: ${chalk.bold(value)}`));
                }
                else if (key === 'package-manager') {
                    console.error(chalk.red(`You must provide a package manager (npm, pnpm, bun, uv, skip, auto, etc.).`));
                    process.exit(1);
                }
                else {
                    console.error(chalk.red(`Unknown configuration key to set: ${key}`));
                    process.exit(1);
                }
                break;
            case 'path':
                const configPath = getConfigPath();
                console.log(chalk.blue(`Configuration file path: ${configPath}`));
                break;
            case 'copy-paths':
                if (key === 'list') {
                    const paths = getExtraCopyPaths();
                    if (!paths.length) {
                        console.log(chalk.blue('No extra copy paths configured.'));
                    }
                    else {
                        console.log(chalk.blue('Extra copy paths:'));
                        paths.forEach((extraPath) => console.log(` - ${extraPath}`));
                    }
                }
                else if (key === 'add' && value) {
                    const paths = addExtraCopyPath(value);
                    console.log(chalk.green(`Added "${value}" to extra copy paths.`));
                    console.log(chalk.blue(`Current paths: ${paths.join(', ')}`));
                }
                else if (key === 'remove' && value) {
                    const before = getExtraCopyPaths();
                    if (!before.includes(value)) {
                        console.log(chalk.yellow(`Path "${value}" was not in the extra copy path list.`));
                    }
                    const paths = removeExtraCopyPath(value);
                    console.log(chalk.green(`Removed "${value}" from extra copy paths.`));
                    if (paths.length) {
                        console.log(chalk.blue(`Current paths: ${paths.join(', ')}`));
                    }
                    else {
                        console.log(chalk.blue('No extra copy paths configured.'));
                    }
                }
                else {
                    console.error(chalk.red(`Unknown copy-paths command: ${key}`));
                    process.exit(1);
                }
                break;
            default:
                console.error(chalk.red(`Unknown config action: ${action}`));
                process.exit(1);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(chalk.red('Configuration command failed:'), error.message);
        }
        else {
            console.error(chalk.red('Configuration command failed:'), error);
        }
        process.exit(1);
    }
}
