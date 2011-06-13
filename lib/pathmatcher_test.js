var PathMatcher = require('./pathmatcher');

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
  
  // Wildcards only match if there's anything to match the '*' so this
  // doesn't match anything.
  test.ok(pm.getMatch('/dir/') == null);
  
  // No wildcards.
  test.ok(pm.getMatch('/about/what/') == null);
  
  test.equals(null, pm.getMatch('/foo/bar/'));
  
  test.done();
};


exports.testRegExpPathMatching = function(test) {
  var pm = new PathMatcher();
  pm.addAction('/@re1:one|two|three/', 'regexp1');
  pm.addAction('/@re2:aaa|bbb', 'regexp2');
  
  assertAction(test, pm, '/one/', 'regexp1', {'re1': 'one'});
  assertAction(test, pm, '/two/', 'regexp1', {'re1': 'two'});
  assertAction(test, pm, '/three/', 'regexp1', {'re1': 'three'});

  assertAction(test, pm, '/aaa/', 'regexp2', {'re2': 'aaa'});
  assertAction(test, pm, '/bbb/', 'regexp2', {'re2': 'bbb'});

  test.equals(null, pm.getMatch('/four/'));
  
  test.done();
};


exports.testDisambiguation = function(test) {
  var pm = new PathMatcher();
  pm.addAction('/one/', 'one');
  pm.addAction('/:two/', 'two');
  pm.addAction('/@three:(xxx|yyy)', 'three');
  pm.addAction('/*', 'four');
  
  assertAction(test, pm, '/one/', 'one', {});
  assertAction(test, pm, '/two/', 'two', {'two': 'two'});
  assertAction(test, pm, '/zzz/', 'two', {'two': 'zzz'});
  assertAction(test, pm, '/xxx/', 'three', {'three': 'xxx'});
  assertAction(test, pm, '/yyy/', 'three', {'three': 'yyy'});
  assertAction(test, pm, '/two/four/', 'four', {'*': ['two', 'four']});
  test.done();
};


function assertAction(test, pm, path, expected, matches) {
  var node = pm.getMatch(path);
  test.ok(node, 'No node found for ' + path);
  test.equals(node.action, expected);
  test.deepEqual(node.matches, matches || []);
}