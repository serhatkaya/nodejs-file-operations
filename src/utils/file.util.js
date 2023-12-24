const fs = require('fs');
const path = require('path');
const fsp = fs.promises;
const { Subject, takeUntil, BehaviorSubject } = require('rxjs');

const cancelBs = new BehaviorSubject(null);

function listFilesRecursively(directory) {
  const files = [];

  function walk(dir) {
    const dirPath = path.join(directory, dir);
    let fileNames;
    try {
      fileNames = fs.readdirSync(dirPath);
    } catch (err) {
      console.error(`Error reading directory ${dirPath}: ${err.message}`);
    }

    for (const fileName of fileNames) {
      try {
        const filePath = path.join(dirPath, fileName);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          walk(path.join(dir, fileName));
        } else {
          files.push(filePath);
        }
      } catch (err) {
        console.error(`Error reading directory ${dirPath}: ${err.message}`);
      }
    }
  }

  walk('');

  return files;
}

function cancelFile(destinationPath) {
  cancelBs.next(destinationPath);
}

function copyFileWithStream(sourcePath, destinationPath) {
  return new Promise((resolve, reject) => {
    const destroy$ = new Subject();
    const destroySub = () => {
      destroy$.next();
      destroy$.complete();
    };

    cancelBs
      .asObservable()
      .pipe(takeUntil(destroy$))
      .subscribe((dest) => {
        if (dest === destinationPath) {
          resolve('cancelled');
          destroySub();
        }
      });

    const sourceStream = fs.createReadStream(sourcePath);
    const destinationStream = fs.createWriteStream(destinationPath);

    sourceStream.pipe(destinationStream);

    sourceStream.on('error', (err) => {
      destroySub();
      reject(err);
    });
    destinationStream.on('error', (err) => {
      destroySub();
      reject(err);
    });

    destinationStream.on('finish', () => {
      resolve('filecopied');
      destroySub();
    });
  });
}

function writeToJsonFile(data, fileName) {
  const filePath = path.join(process.cwd(), fileName);
  fs.writeFile(filePath, JSON.stringify(data), 'utf8', (err) => {
    if (err) {
      console.error('Error writing to JSON file:', err);
    }
  });
}

function readAndParseJSON(filePath) {
  try {
    const jsonData = fs.readFileSync(filePath, 'utf8');

    const parsedData = JSON.parse(jsonData);

    return parsedData;
  } catch (error) {
    console.error(`Error reading or parsing JSON file: ${error.message}`);
    return [];
  }
}

async function writeToJsonFileAsync(data, fileName) {
  const filePath = path.join(process.cwd(), fileName);

  // Check if the file exists before attempting to remove it
  //   if (await fsp.access(filePath).catch((_) => false)) {
  //     try {
  //       await fsp.unlink(filePath);
  //     } catch (err) {
  //       console.error(`Error removing file ${fileName}: ${err}`);
  //     }
  //   }

  try {
    await fsp.writeFile(filePath, JSON.stringify(data), 'utf8');
  } catch (err) {
    console.error(`Error writing to JSON file ${fileName}: ${err}`);
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

module.exports = {
  shuffleArray,
  copyFileWithStream,
  listFilesRecursively,
  writeToJsonFile,
  writeToJsonFileAsync,
  cancelFile,
  readAndParseJSON,
};
