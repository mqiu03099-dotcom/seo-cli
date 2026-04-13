#!/usr/bin/env node

const { run } = require("../src/cli");

Promise.resolve(run(process.argv.slice(2))).catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
