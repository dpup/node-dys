/**
 * @fileoverview Class used to match actions against a given path.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */


function PathMatcher() {
  this.tree_ = {};  
};
module.exports = PathMatcher;


/**
 * Adds an action to be matched for the given path.  Paths can contain
 * wildcards in the form ':identifier'.  * will match anything following.  The
 * most specific path will be used.
 *
 * e.g.
 *   /tags/:tagname/
 *   /photos/:user/:set/
 *   /search/*
 * @param {string} path The path to match.
 * @param {function(Context)|{{execute:function(Context)}}} action The action
 *    function to execute, or an object with an execute method.
 */
PathMatcher.prototype.addAction = function(path, action) {
  var parts = this.getPathParts_(path);
  var matches = [];
  var node = this.tree_;
  for (var i = 0; i < parts.length; i++) {
    var name = part = parts[i];
    if (part == '*' && i != parts.length - 1) {
      throw Error('Invalid path [' + path + '], * must only be at the end.');
    }
    if (part[0] == ':') {
      name = ':';
      matches.push(part.substr(1));
    }
    if (!node[name]) {
      node[name] = {};
    }
    node = node[name];
  }
  if (node.action) {
    throw Error('Can not register [' + path + '], path is ambiguous. [' +
        node.fullPath + '] previously registered.');
  }
  node.matches = matches;
  node.fullPath = path;
  node.action = action;
};


/**
 * Gets the matching node for the given path.  If no path matches, then null.
 * @param {string} path The path to match.
 * @return {{action: Object, matches: Array}} An object containing the matched
 *    action and the matches extracted from the path.
 */
PathMatcher.prototype.getMatch = function(path) {
  var parts = this.getPathParts_(path);
  var node = this.tree_;
  var pendingWildcard = null, pendingWildcardMatch = [], matches = [];
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (node['*']) {
      pendingWildcard = node['*'];
      pendingWildcardMatch = [];
    }
    if (node[part]) {
      node = node[part];
    } else if (node[':']) {
      node = node[':'];
      matches.push(part);
    } else if (node['*']) {
      node = node['*'];
      pendingWildcardMatch = pendingWildcardMatch.concat(parts.slice(i));
      break
    } else {
      node = pendingWildcard || null;
      pendingWildcardMatch = pendingWildcardMatch.concat(parts.slice(i));
      break;
    }
    if (pendingWildcard) {
      pendingWildcardMatch.push(part);
    }
  }
  if (node && node.action) {
    var matchObj = {};
    if (pendingWildcard == node) {
      matchObj['*'] = pendingWildcardMatch;
    }
    for (var j = 0; j < node.matches.length; j++) {
      matchObj[node.matches[j]] = matches[j];
    }
    return {
      action: node.action,
      matches: matchObj
    };
  } else {
    return null;
  }
};


/**
 * Splits a path into its component parts, stripping leading and trailing
 * slashes.
 * @param {string} path The path to split.
 * @return {!Array.<string>} The path parts.
 * @private
 */
PathMatcher.prototype.getPathParts_ = function(path) {
  return path.replace(/(^\/|\/$)/g, '').split('/');
};
