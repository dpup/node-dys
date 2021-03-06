#!/bin/bash

nodeunit=`which nodeunit`
if [ ! $nodeunit ]; then
  echo 'ERROR: No nodeunit found on path.'
  exit 1
fi
find . | grep _test.js | grep -v ./node_modules/ | xargs $nodeunit
