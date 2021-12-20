import chalk from 'chalk';

export default {
  log(...message) {
    console.log(chalk.green(...message));
  },
  warn(...message) {
    console.log(chalk.yellow(...message));
  },
  error(...message) {
    console.log(chalk.red(...message));
  },
  info(...message) {
    console.log(chalk.blue(...message));
  },
};
