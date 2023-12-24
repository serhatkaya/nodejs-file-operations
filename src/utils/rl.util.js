const readline = require('readline');

async function askUserToContinue() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      'Operation timed out. Reconnect the device and continue? (yes/no): ',
      (answer) => {
        rl.close();
        resolve(`${true}-${answer}`);
      },
    );
  });
}

module.exports = { askUserToContinue };
