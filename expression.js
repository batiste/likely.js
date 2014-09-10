
"use strict";
var util = require('./util');

var EXPRESSION_REG = /^{{(.+?)}}/;

function compileTextAndExpressions(txt) {
  // compile the expressions found in the text
  // and return a list of text+expression
  var expr, around;
  var list = [];
  while(true) {
    var match = /{{(.+?)}}/.exec(txt);
    if(!match) {
      if(txt) {
        list.push(txt);
      }
      break;
    }
    expr = jsExpression(match[1]);
    around = txt.split(match[0], 2);
    if(around[0].length) {
      list.push(around[0]);
    }
    list.push(expr);
    txt = around[1];
  }
  return list;
}

function evaluateExpressionList(expressions, context) {
  var str = "", i;
  for(i=0; i<expressions.length; i++) {
    var item = expressions[i];
    if(typeof item == "function") {
      str += item(context);
    } else {
      str += item;
    }
  }
  return str;
}

function replaceOutOfStrings(str) {
  var index = 0, length = str.length, ch;
  var new_str = "", inString = null, start = 0;
  while(index < length) {
    ch = str.charAt(index);
    if(ch === '\\') {
      index = index + 2;
      continue;
    }
    if(ch === '"' || ch === "'") {
      // closing a string
      if(inString === ch) {
        inString = null;
        new_str = new_str + str.slice(start, index);
        start = index;
      } else {
        // opening a string
        new_str = new_str + replaceNames(str.slice(start, index));
        start = index;
        inString = ch;
      }
    }
    index = index + 1;
  }
  new_str += replaceNames(str.slice(start, index));
  return new_str;
}

var nameReg = /[a-zA-Z_$][0-9a-zA-Z_$\.]*/gm;
var javascriptValues = ['true', 'false', 'undefined', 'null'];

function replaceNames(str) {
  return str.replace(nameReg, function(_name) {
    if(javascriptValues.indexOf(_name) > -1) {
      return _name;
    }
    if(!_name.match(/^context/) && (_name != 'true' && _name != 'false')) {
      return 'context.get("'+_name+'")';
    }
    return _name;
  });
}

function jsExpression(source) {
  var hasName = source.match(nameReg);
  var newSource = replaceOutOfStrings(source);
  var fct = new Function('context', 'return ' + newSource);
  // only one name? this is a candidate for data binding
  if(hasName && hasName.length == 1 && util.trim(source) == hasName[0]) {
    fct.binding = hasName[0];
  }
  return fct;
}

module.exports = {
  nameReg:nameReg,
  compileTextAndExpressions:compileTextAndExpressions,
  evaluateExpressionList:evaluateExpressionList,
  jsExpression:jsExpression,
  replaceNames:replaceNames,
  replaceOutOfStrings:replaceOutOfStrings,
  EXPRESSION_REG:EXPRESSION_REG
};