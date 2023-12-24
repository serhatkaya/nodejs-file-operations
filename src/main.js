// usage: node main.js <sourcePath> || <sourceFileArrayJsonFilePath> <targetPath>

const {
  copyFileWithStream,
  listFilesRecursively,
  writeToJsonFileAsync,
  cancelFile,
  readAndParseJSON,
  shuffleArray,
} = require('./utils/file.util');
const {
  Worker,
  isMainThread,
  workerData,
  parentPort,
} = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { Subject, timer, takeUntil, BehaviorSubject, filter } = require('rxjs');
const { askUserToContinue } = require('./utils/rl.util');
const { createProgressBar } = require('./utils/progressbar');
const { toPromise } = require('./utils/rxjs.util');
const { getDiskPath } = require('./utils/disk.util');

const pauseBs = new BehaviorSubject(false);
const operationTimeOutValue = 100 * 60 * 60; // 10 mins
const numberOfThreads = 4;

async function main() {
  const sourceArg = process.argv[2];
  const targetArg = process.argv[3];
  let sourceFolder = sourceArg === '.' ? process.cwd() : sourceArg;
  const targetFolder = targetArg === '.' ? process.cwd() : targetArg;

  try {
    let files;

    if (sourceFolder.includes('json')) {
      files = readAndParseJSON(sourceFolder);
      shuffleArray(files);
      console.log(files.length, 'files');
      sourceFolder = getDiskPath(files[0]);
    } else {
      files = listFilesRecursively(sourceFolder);
    }
    const totalFiles = files.length;
    let totalCopied = 0;

    const pb = createProgressBar(totalFiles);
    const chunkSize = Math.ceil(files.length / numberOfThreads);
    const workers = [];

    for (let i = 0; i < numberOfThreads; i++) {
      const start = i * chunkSize;
      const end = (i + 1) * chunkSize;
      const workerFiles = files.slice(start, end);
      const worker = new Worker(__filename, {
        workerData: {
          workerFiles,
          workerId: i,
          targetFolder,
          sourceFolder,
        },
      });

      worker.on('message', async (message) => {
        const { type: eventType } = message;
        if (eventType === 'fileCopied') {
          totalCopied++;
          const isPaused = await toPromise(pauseBs.asObservable());
          if (!isPaused) {
            pb.updateProgressBar(totalCopied);
          }
          if (totalCopied >= totalFiles) {
            console.log('Operation done!');
          }
        }

        if (eventType === 'requestUserInput') {
          pauseBs.next(true);
          const userInput = await askUserToContinue();
          pauseBs.next(false);
          worker.postMessage({
            type: 'userInput',
            payload: { key: message.payload.key, userInput },
          });
        }
      });

      workers.push(worker);
    }

    await Promise.all(
      workers.map(
        (worker) => new Promise((resolve) => worker.on('exit', resolve)),
      ),
    );
  } catch (err) {
    console.error('An error occurred on Main Thread', err);
  }
}

async function workerThread() {
  const { workerFiles, targetFolder, sourceFolder, workerId } = workerData;
  let saveArr = [...workerFiles];
  const cloneFiles = [...workerFiles];

  const applyFilter = (file) => {
    saveArr = [...saveArr.filter((x) => x !== file)];
  };

  for (const filePath of cloneFiles) {
    try {
      const relativePath = path.relative(sourceFolder, filePath);
      const targetFilePath = path.join(targetFolder, relativePath);
      const targetDir = path.dirname(targetFilePath);
      await writeToJsonFileAsync(saveArr, `remaining-worker-${workerId}.json`);
      const destroy$ = new Subject();
      const timeoutPromise = new Promise((resolve) => {
        timer(operationTimeOutValue)
          .pipe(takeUntil(destroy$))
          .subscribe(() => {
            console.log('Operation timed out');
            cancelFile(targetFilePath);
            resolve('data');
          });
      });

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const result = await Promise.race([
        timeoutPromise,
        copyFileWithStream(filePath, targetFilePath),
      ]);

      if (!result || result === 'cancelled') {
        const isPausedAlready = await toPromise(pauseBs.asObservable());
        let isDeviceReconnected;

        if (isPausedAlready) {
          isDeviceReconnected = !(await toPromise(
            pauseBs.asObservable().pipe(filter((res) => !res)),
          ));
        } else {
          isDeviceReconnected = await requestUserResponseFromMainThread(
            filePath,
          );
        }

        if (isDeviceReconnected) {
          await copyFileWithStream(filePath, targetFilePath);
          parentPort.postMessage({ type: 'fileCopied' });
          applyFilter(filePath);
          await writeToJsonFileAsync(
            saveArr,
            `remaining-worker-${workerId}.json`,
          );
          destroy$.next();
          destroy$.complete();
        } else {
          console.log('Exiting');
          break;
        }
      } else {
        parentPort.postMessage({ type: 'fileCopied' });
        destroy$.next();
        destroy$.complete();
        applyFilter(filePath);
      }
    } catch (err) {
      console.error('An error occurred:', err);
      break;
    }
  }
}

async function requestUserResponseFromMainThread(key) {
  return new Promise((resolve) => {
    parentPort.postMessage({
      type: 'requestUserInput',
      payload: {
        key,
      },
    });

    const onMessage = (message) => {
      if (message.payload.key === key) {
        resolve(message.payload.userInput);
      }
    };

    parentPort.on('message', onMessage);
    parentPort.off('message', onMessage);
  });
}

if (isMainThread) {
  main();
} else {
  workerThread();
}
