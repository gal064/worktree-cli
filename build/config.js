import Conf from 'conf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Read package.json dynamically instead of using named imports
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const packageName = packageJson.name;
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
};
const config = new Conf({
    projectName: packageName, // Use the actual package name
    schema,
});
// Function to get the default editor
export function getDefaultEditor() {
    return config.get('defaultEditor');
}
// Function to set the default editor
export function setDefaultEditor(editor) {
    config.set('defaultEditor', editor);
}
// Function to get the path to the config file (for debugging/info)
export function getConfigPath() {
    return config.path;
}
export function getExtraCopyPaths() {
    return config.get('extraCopyPaths');
}
// Get copy-paths as comma-separated string
export function getCopyPaths() {
    const paths = getExtraCopyPaths();
    return paths.join(',');
}
// Set copy-paths from comma-separated string
export function setCopyPaths(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        config.set('extraCopyPaths', []);
        return;
    }
    // Split by comma and trim each path
    const paths = trimmed
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    // Remove duplicates
    const uniquePaths = Array.from(new Set(paths));
    config.set('extraCopyPaths', uniquePaths);
}
export function getDefaultPackageManager() {
    return config.get('defaultPackageManager');
}
export function setDefaultPackageManager(manager) {
    config.set('defaultPackageManager', manager);
}
