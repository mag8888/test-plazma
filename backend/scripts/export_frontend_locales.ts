
import fs from 'fs';
import path from 'path';

const frontendDir = path.join(__dirname, '../../frontend/app');
const outputPath = path.join(__dirname, '../../localization_export.csv'); // Append to this

const escapeCsv = (str: string) => {
    if (!str) return '';
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const walkSync = (dir: string, filelist: string[] = []) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            filelist = walkSync(filepath, filelist);
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                filelist.push(filepath);
            }
        }
    });
    return filelist;
};

const extractFrontend = () => {
    const files = walkSync(frontendDir);
    const strings = new Set<string>();
    const rows: string[] = [];

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        // Match Cyrillic strings
        // 1. JSX content: >Текст<
        const jsxRegex = />([^<]*[А-Яа-яЁё][^<]*)<\//g;
        // 2. String literals: 'Текст' or "Текст"
        const stringRegex = /['"`]([^'"`]*[А-Яа-яЁё][^'"`]*)['"`]/g;

        let match;
        const relativePath = path.relative(frontendDir, file);

        // Scan JSX
        while ((match = jsxRegex.exec(content)) !== null) {
            const raw = match[1].trim();
            if (raw && !strings.has(raw)) {
                strings.add(raw);
                rows.push(`Frontend Label,${relativePath},${escapeCsv(raw)},,,,`);
            }
        }

        // Scan Literals
        while ((match = stringRegex.exec(content)) !== null) {
            const raw = match[1].trim();
            // Filter out obvious code or paths
            if (raw && !strings.has(raw) && !raw.includes('/') && raw.length < 200) {
                strings.add(raw);
                rows.push(`Frontend Label,${relativePath},${escapeCsv(raw)},,,,`);
            }
        }
    });

    // Append to file
    fs.appendFileSync(outputPath, rows.join('\n'));
    console.log(`Frontend strings appended to ${outputPath}`);
};

extractFrontend();
