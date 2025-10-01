import Conf from 'conf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Read package.json dynamically instead of using named imports
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const packageName = packageJson.name;

// Define the structure of the configuration
interface ConfigSchema {
    defaultEditor: string;
    extraCopyPaths: string[];
    defaultPackageManager: string;
}

// Initialize conf with a schema and project name
// Using the package name ensures a unique storage namespace
const schema = {
    defaultEditor: {
        type: 'string',
        default: 'code', // Use VS Code by default
    },
    extraCopyPaths: {
        type: 'array',
        default: [],
        items: {
            type: 'string',
        },
    },
    defaultPackageManager: {
        type: 'string',
        default: 'auto', // Auto-detect by default
    },
} as const;

const config = new Conf<ConfigSchema>({
    projectName: packageName, // Use the actual package name
    schema,
});

// Function to get the default editor
export function getDefaultEditor(): string {
    return config.get('defaultEditor');
}

// Function to set the default editor
export function setDefaultEditor(editor: string): void {
    config.set('defaultEditor', editor);
}

// Function to get the path to the config file (for debugging/info)
export function getConfigPath(): string {
    return config.path;
}

export function getExtraCopyPaths(): string[] {
    return config.get('extraCopyPaths');
}

export function addExtraCopyPath(extraPath: string): string[] {
    const trimmed = extraPath.trim();
    if (!trimmed) {
        return getExtraCopyPaths();
    }

    const current = new Set(getExtraCopyPaths());
    current.add(trimmed);
    const next = Array.from(current);
    config.set('extraCopyPaths', next);
    return next;
}

export function removeExtraCopyPath(extraPath: string): string[] {
    const trimmed = extraPath.trim();
    if (!trimmed) {
        return getExtraCopyPaths();
    }

    const current = getExtraCopyPaths().filter((path) => path !== trimmed);
    config.set('extraCopyPaths', current);
    return current;
}

export function getDefaultPackageManager(): string {
    return config.get('defaultPackageManager');
}

export function setDefaultPackageManager(manager: string): void {
    config.set('defaultPackageManager', manager);
}
