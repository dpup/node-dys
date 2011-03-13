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
  var query = ctx.get('query');
  var resp = ctx.get('response');
  
  var stats = this.stats_.getStats(query.filter || null);  
    
  if (query.type == 'json') {
    resp.writeHead(200, {'Content-Type': 'application/json'});
    resp.end(JSON.stringify(stats));
    
  } else {
    var out = ['<pre>'];
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
    resp.writeHead(200, {'Content-Type': 'text/html'});
    resp.end(out.join('\n'));
  }
};
