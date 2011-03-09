
var util = require('./util');

function LogManager() {}
module.exports = LogManager;

LogManager.prototype.getLogger = function(name) {
  return new Logger(name);
};


function Logger(name) {
  this.name = name;
}

Logger.prototype.log = function(msg, opt_e) {
  if (opt_e instanceof Error) {
    msg += ' : ' + Colors.RED + opt_e.stack + Colors.RESET;
  }
  var now = util.getDateString();
  console.log(Colors.GREY + now + ' [' +
      Colors.YELLOW + this.name + Colors.GREY + '] : ' + Colors.RESET + msg);
};

var Colors = {
  RESET: '\x1B[0m',
  RED: '\x1B[0;31m',
  GREEN: '\x1B[0;32m',
  YELLOW: '\x1B[0;33m',
  BLUE: '\x1B[0;34m',
  MAGENTA: '\x1B[0;35m',
  CYAN: '\x1B[0;36m',
  GREY: '\x1B[0;37m',
};