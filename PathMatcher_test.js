var PathMatcher = require('./PathMatcher');

exports.testPathMatcher = function(test) {
  var pm = new PathMatcher();
  pm.addAction('/', 'root');
  pm.addAction('/about/', 'about');
  pm.addAction('/:user/', 'user');
  pm.addAction('/:user/profile/', 'user-profile');
  pm.addAction('/tags/:tag/list/:page/', 'tag-list');
  pm.addAction('/dir/*', 'dir');
  pm.addAction('/dir/tools/', 'dir-tools');
  pm.addAction('/dir/tools/*', 'dir-tools-wc');
  pm.addAction('/dir/tools/:tool/', 'dir-screw');
  
  test.throws(function() { pm.addAction('/dir/*/dir/'); }, Error,
      '* should not be allowed in the middle of a pattern.');
  
  test.throws(function() { pm.addAction('/:test/'); }, Error,
      'Ambiguous patterns should throw.');

  console.log(pm.tree_);
      
  assertAction(test, pm, '/', 'root');
  assertAction(test, pm, '/about/', 'about');
  assertAction(test, pm, '/macgyver/', 'user', {user: 'macgyver'});
  assertAction(test, pm, '/macgyver/profile/', 'user-profile', {user: 'macgyver'});
  assertAction(test, pm, '/tags/monkeys/list/2/', 'tag-list', {tag: 'monkeys', page: '2'});
  assertAction(test, pm, '/dir/foo/', 'dir', {'*': ['foo']});
  assertAction(test, pm, '/dir/foo/bar/', 'dir', {'*': ['foo', 'bar']});
  assertAction(test, pm, '/dir/foo/bar/baz/', 'dir', {'*': ['foo', 'bar', 'baz']});
  assertAction(test, pm, '/dir/tools/', 'dir-tools');
  assertAction(test, pm, '/dir/tools/screwdriver/', 'dir-screw', {'tool': 'screwdriver'});
  assertAction(test, pm, '/dir/tools/screwdriver/xxx/', 'dir-tools-wc', {'*': ['screwdriver', 'xxx']});
  
  test.equals(null, pm.getMatch('/foo/bar/'));
  
  test.done();
};


function assertAction(test, pm, path, expected, matches) {
  var node = pm.getMatch(path);
  test.ok(node, 'No node found for ' + path);
  test.equals(node.action, expected);
  test.deepEqual(node.matches, matches || []);
}