const fs = require('fs').promises;

async function isDiskReadable(path) {
  try {
    await fs.readdir(path);
    return true;
  } catch (err) {
    return false;
  }
}

function getDiskPath(path) {
  return `${path.split(':')[0]}:\\`;
}

module.exports = { isDiskReadable, getDiskPath };
