

function Chain() {
  this.out_ = [];
  this.in_ = []
  this.cursor_ = 0;
}

Chain.prototype.proceed = function(c) {
  var fn = this.out_[this.cursor_++];
  if (fn) {
    if (c) this.in_.push(c);
    fn(this);
  } else {
    while (this.in_.length) {
      this.in_.pop()();
    }
    this.in_.length = 0;
    this.cursor_ = 0;
  }
};


Chain.prototype.push = function(fn) {
  this.out_.push(fn);
};

Chain.prototype.pushSync = function(fn) {
  var that = this;
  this.out_.push(function() {
    fn();
    that.proceed();
  });
};

function log(m) {
  console.log(m);
}


var iFac = function(ctx, chain) {
  return {
    before: function() {
      
    },
    after: function() {
      
    }
  };
};


var i = function(ctx, chain) {
  
};

var list = [iFac, i];

// 
// var c = new Chain;
// 
// for (var i = 0; i < list.length; i++) {
//   var rv = list[i]({}, c);
//   if (rv.before)
// }



console.log('Typical chain')

var chain = [];

chain.push(function(proceed) {
  console.log('a');
  proceed();
  console.log('a\'');  // logged after 'b', expect after 'bBc'.
});

chain.push(function(proceed) {
  console.log('b');
  setTimeout(function() {
    console.log('B');
    proceed();
  }, 500);
});

chain.push(function(proceed) {
  console.log('c');
  proceed();
});

var i = 0, executeChain = function() {
  if (i < chain.length) {
    chain[i++](executeChain);
  }
};
executeChain();


setTimeout(function() {
  console.log('Before/After');

  var chain = [];

  chain.push(function(proceed) {
    return {
      before: function() {
        console.log('a');
        proceed();
      },
      after: function() {
        console.log('a\'');
        proceed();
      }
    };
  });

  chain.push(function(proceed) {
    return {
      before: function() {
        console.log('b');
        setTimeout(function() {
          console.log('B');
          proceed();
        }, 500);
      },
      after: function() {
        proceed();
      }
    };
  });

  chain.push(function(proceed) {
    return {
      before: function() {
        console.log('c');
        proceed();
      },
      after: function() {
        proceed();
      }
    };
  });
  
  var j = 0, back = false, executeChain2 = function() {
    if (!back) {
      if (j < chain2.length) {
        chain2[j++].before(executeChain2);
      } else {
        back = true;
        executeChain2();
      }
    } else {
      if (j > 0) {
        chain2[--j].after(executeChain2);
      }
    }
  };

  // build new chain by executing the factory methods, this gives a new object
  // per execution chain.
  var chain2 = chain.map(function(c) {
    return c(executeChain2);
  });
  
  executeChain2();
  
}, 750);



setTimeout(function() {
  console.log('proceed(after)');

  var chain = [];

  chain.push(function(proceed) {
    console.log('a');
    proceed(function() {
      console.log('a\'');
      proceed();
    });
  });

  chain.push(function(proceed) {
    console.log('b');
    setTimeout(function() {
      console.log('B');
      proceed();
    }, 500);
  });

  chain.push(function(proceed) {
    console.log('c');
    proceed();
  });
  
  var j = 0, back = false, backChain = [], executeChain3 = function(c) {
    if (!back) {
      if (c) backChain[j] = c;
      if (j < chain.length) {
        chain[j++](executeChain3);
      } else {
        back = true;
        executeChain3();
      }
    } else {
      var fn;
      while (j > 0 && !(fn = backChain[--j])) {}
      if (fn) fn(executeChain3);
    }
  };

  executeChain3();
  
}, 1500);