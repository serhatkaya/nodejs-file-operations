const fs = require('fs');
const path = require('path');
const { writeToJsonFile } = require('./utils/file.util');

const sourceDirectory = process.argv[2];
const unreadableFiles = [];

function detectUnreadableFiles(directory) {
  try {
    const files = fs.readdirSync(directory);

    files.forEach((file) => {
      const filePath = path.join(directory, file);

      try {
        fs.readFileSync(filePath);
      } catch (readError) {
        console.error(`Unreadable file: ${filePath}`);
        unreadableFiles.push(file);
      }

      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        detectUnreadableFiles(filePath);
      }
    });
  } catch (error) {
    console.error(`Error reading directory: ${directory}`, error);
  }
}

detectUnreadableFiles(sourceDirectory);

writeToJsonFile(unreadableFiles, 'unredableFiles.json');
console.log(`Found ${unreadableFiles.length} unreadable files.`);
