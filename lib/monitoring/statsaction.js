/**
 * @fileoverview Action class used to render the /__stats page.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = StatsAction;

var util = require('../util'); 

/**
 * @constructor
 */
function StatsAction(ctx) {
  this.stats_ = ctx.get('stats')
};


/**
 * Executes the action, called by dispatcher
 * @param {!Context} ctx The request scope's context.
 */
StatsAction.prototype.execute = function(ctx) {
  var resp = ctx.get('response');
  resp.writeHead(200, {'Content-Type': 'text/html'});
  
  // TODO : JSON return type.
  // TODO : Filter by key.
  
  var out = ['<pre>'];
  var stats = this.stats_.getStats();
  for (var key in stats) {
    var stat = stats[key];
    if (typeof stat == 'object') {
      out.push('');
      out.push('<b>' + key + '</b>');
      for (var item in stat) {
        out.push('  ' + item + ' = ' + stat[item]);
      }
    } else {
      out.push(key + ' = ' + stat);
    }
  }
  resp.end(out.join('\n'));
};
