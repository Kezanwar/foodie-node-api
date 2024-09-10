import chalk from 'chalk'

class Logger {
  static green(msg) {
    console.log(chalk.green(msg))
  }
  static red(msg) {
    console.error(chalk.red(msg))
  }
  static cyan(msg) {
    console.log(chalk.cyan(msg))
  }
}

export default Logger
