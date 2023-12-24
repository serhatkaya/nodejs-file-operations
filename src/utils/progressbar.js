function createProgressBar(maxValue) {
  let lastPercentage = -1;
  const startTime = Date.now();

  function clearPreviousLines() {
    process.stdout.moveCursor(0, -5);
    process.stdout.clearScreenDown();
  }

  function updateProgressBar(currentValue) {
    if (currentValue < 0) {
      currentValue = 0;
    } else if (currentValue > maxValue) {
      currentValue = maxValue;
    }

    const percentage = Math.floor((currentValue / maxValue) * 100);

    if (percentage > lastPercentage) {
      lastPercentage = percentage;
      const progressBar =
        '[' + '#'.repeat(percentage) + '-'.repeat(100 - percentage) + ']';
      clearPreviousLines();
      process.stdout.write(`Progress: ${progressBar} | ${percentage}% \n`);
      process.stdout.write(`Total: ${currentValue}/${maxValue} \n`);
      process.stdout.write(
        `Elapsed Time: ${formatTime(Date.now() - startTime)} \n`,
      );
    }
  }

  function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }

  return { updateProgressBar };
}

module.exports = { createProgressBar };
