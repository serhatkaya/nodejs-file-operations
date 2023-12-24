// usage: node missinFilefinder.js <sourcePath> <targetPath>

const { listFilesRecursively, writeToJsonFile } = require('./utils/file.util');
const path = require('path');
const fs = require('fs');

const sourcePath = process.argv[2];
const targetPath = process.argv[3];

if (!sourcePath || !targetPath) {
  console.log('Missing parameters');
} else {
  const sourceFiles = listFilesRecursively(sourcePath);
  const targetFiles = listFilesRecursively(targetPath);

  const missingOrMismatchedSizeFiles = [];

  sourceFiles.forEach((sourceFile) => {
    const relativePath = path.relative(sourcePath, sourceFile);
    const correspondingTargetFile = path.join(targetPath, relativePath);

    if (targetFiles.includes(correspondingTargetFile)) {
      const sourceFileSize = fs.statSync(sourceFile).size;
      const targetFileSize = fs.statSync(correspondingTargetFile).size;

      if (sourceFileSize !== targetFileSize) {
        missingOrMismatchedSizeFiles.push(sourceFile);
      }
    } else {
      missingOrMismatchedSizeFiles.push(sourceFile);
    }
  });

  const ignoredPaths = [];
  const arr = missingOrMismatchedSizeFiles.filter(
    (x) => !ignoredPaths.some((y) => x.includes(y)),
  );

  console.log(`Files found: ${arr.length}`);

  writeToJsonFile(arr, 'missingFiles.json');
}
