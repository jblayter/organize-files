const fs = require('fs-extra');
const path = require('path');
const exifParser = require('exif-parser');

/**
 * Move a file to the destination based on its date information.
 * @param {string} filePath - The file path.
 * @param {Date} date - The date to use for folder organization.
 * @param {string} outputPath - The base output directory.
 */
async function moveFile(filePath, date, outputPath) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const destDir = path.join(outputPath, `${year}`, `${month}`);
    const fileName = path.basename(filePath);
    const destPath = path.join(destDir, fileName);

    await fs.ensureDir(destDir);
    await fs.move(filePath, destPath, { overwrite: true });

    console.log(`Moved: ${filePath} -> ${destPath}`);
}

/**
 * Process a single file, determine its date, and move it to the appropriate folder.
 * @param {string} filePath - The file path to process.
 * @param {string} outputPath - The base output directory.
 */
async function processFile(filePath, outputPath) {
    let date;

    try {
        const fileBuffer = await fs.readFile(filePath);
        const parser = exifParser.create(fileBuffer);
        const exifData = parser.parse();
        
        if (exifData && exifData.tags && exifData.tags.DateTimeOriginal) {
            date = new Date(exifData.tags.DateTimeOriginal * 1000);
        }
    } catch (err) {
        // If parsing EXIF data fails, fall back to file stats
    }

    if (!date) {
        const stats = await fs.stat(filePath);
        date = stats.birthtime || stats.ctime;
    }

    await moveFile(filePath, date, outputPath);
}

/**
 * Recursively scan a directory and process all files.
 * @param {string} inputPath - The source directory.
 * @param {string} outputPath - The destination directory.
 */
async function processDirectory(inputPath, outputPath) {
    const items = await fs.readdir(inputPath);

    for (const item of items) {
        const itemPath = path.join(inputPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
            await processDirectory(itemPath, outputPath);
        } else {
            await processFile(itemPath, outputPath);
        }
    }
}

// Main function
(async () => {
    try {
        const inputPath = process.argv[2];
        const outputPath = process.argv[3];

        if (!inputPath || !outputPath) {
            throw new Error('Please provide both input and output paths as arguments.');
        }

        if (!(await fs.pathExists(inputPath))) {
            throw new Error(`Input path does not exist: ${inputPath}`);
        }

        await processDirectory(inputPath, outputPath);
        console.log('File organization complete.');
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
})();