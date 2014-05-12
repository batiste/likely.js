!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.likely=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/* Likely.js version 0.9.1,
   Python style HTML template language with bi-directionnal data binding
   batiste bieler 2014 */
"use strict";
var util = _dereq_('./util');

var EXPRESSION_REG = /^{{(.+?)}}/;

// Expression evaluation engine
function StringValue(txt) {
  this.type = "value";
  if(txt[0] == '"') {
    this.value = txt.replace(/^"|"$/g, "");
  } else if(txt[0] == "'") {
    this.value = txt.replace(/^'|'$/g, "");
  } else {
    throw new util.CompileError("Invalid string value " + txt);
  }
}
StringValue.prototype.evaluate = function(context) {
  return this.value;
};
StringValue.reg = /^"(?:\\"|[^"])*"|^'(?:\\'|[^'])*'/;

function EqualOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
}
EqualOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) == this.right.evaluate(context);
};
EqualOperator.reg = /^==/;

function NotEqualOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
}
NotEqualOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) != this.right.evaluate(context);
};
NotEqualOperator.reg = /^!=/;

function BiggerOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
}
BiggerOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) > this.right.evaluate(context);
};
BiggerOperator.reg = /^>/;

function SmallerOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
  this.evaluate = function(context) {
    return this.left.evaluate(context) < this.right.evaluate(context);
  };
}
SmallerOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) < this.right.evaluate(context);
};
SmallerOperator.reg = /^</;

function OrOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
}
OrOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) || this.right.evaluate(context);
};
OrOperator.reg = /^or/;

function AndOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
}
AndOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) && this.right.evaluate(context);
};
AndOperator.reg = /^and/;

function Name(txt) {
  this.type = "value";
  this.name = txt;
}
Name.prototype.evaluate = function(context) {
  var value = context.get(this.name);
  return value;
};
Name.reg = /^[A-Za-z][\w\.]{0,}/;

function Filter(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
Filter.prototype.evaluate = function(context) {
  var fct = context.get(this.right.name);
  return fct.apply(this, [this.left.evaluate(context), context]);
};
Filter.reg = /^\|/;

// math

function MultiplyOperator(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
MultiplyOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) * this.right.evaluate(context);
};
MultiplyOperator.reg = /^\*/;

function PlusOperator(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
PlusOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) + this.right.evaluate(context);
};
PlusOperator.reg = /^\+/;

function MinusOperator(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
MinusOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) - this.right.evaluate(context);
};
MinusOperator.reg = /^\-/;

function FunctionCall(txt) {
  this.type = 'value';
  var m = txt.match(/^([a-zA-Z][a-zA-Z0-9\.]*)\(([^\)]*)\)/);
  this.funcName = m[1];
  this.params = m[2].split(',');
}
FunctionCall.prototype.evaluate = function(context) {
  var func = context.get(this.funcName), i, params=[];
  for(i=0; i<this.params.length; i++) {
    params.push(context.get(util.trim(this.params[i])));
  }
  return func.apply(context, params);
};
FunctionCall.reg = /^[a-zA-Z][a-zA-Z0-9\.]*\([^\)]*\)/;

function NumberValue(txt) {
  this.type = "value";
  this.number = parseFloat(txt, 10);
  this.evaluate = function(context) {
    return this.number;
  };
}
NumberValue.reg = /^[0-9]+/;

function IfOperator(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
IfOperator.prototype.evaluate = function(context) {
  var rv = this.right.evaluate(context);
  if(rv) {
    return this.left.evaluate(context);
  }
  return rv;
};
IfOperator.reg = /^if /;

function InOperator(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
InOperator.prototype.evaluate = function(context) {
  var left = this.left.evaluate(context);
  var right = this.right.evaluate(context);
  if(right === undefined) {
    throw new util.RuntimeError('right side of in operator cannot be undefined');
  }
  if(right.indexOf) {
    return right.indexOf(left) != -1;
  } else {
    return right.hasOwnProperty(left);
  }
};
InOperator.reg = /^in /;

function NotOperator(txt) {
  this.type = 'unary';
  this.right = null;
}
NotOperator.prototype.evaluate = function(context) {
  return !this.right.evaluate(context);
};
NotOperator.reg = /^not /;

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
    expr = build(match[1]);
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
    var param = expressions[i];
    if(param.evaluate) {
      str += param.evaluate(context);
    } else {
      str += param;
    }
  }
  return str;
}

// list order define operator precedence
var expression_list = [
  MultiplyOperator,
  PlusOperator,
  MinusOperator,
  BiggerOperator,
  SmallerOperator,
  EqualOperator,
  NotEqualOperator,
  Filter,
  NotOperator,
  IfOperator,
  InOperator,
  OrOperator,
  AndOperator,
  StringValue,
  NumberValue,
  FunctionCall,
  Name,
];

function build(input) {
  return buildExpressions(parseExpressions(input));
}

function parseExpressions(input) {
  // Return a list of expressions
  var currentExpr = null, i, expr, match, found, parsed = [];
  while(input) {
    input = util.trim(input);
    found = false;
    for(i=0; i<expression_list.length; i++) {
        expr = expression_list[i];
        match = expr.reg.exec(input);
        if(match) {
          input = input.slice(match[0].length);
          parsed.push(new expr(match[0], currentExpr));
          found = true;
          // starting again to respect precedence
          i = 0;
        }
    }
    if(found === false) {
      throw new util.CompileError("Expression parser: Impossible to parse further : " + input);
    }
  }
  return parsed;
}

function buildExpressions(list) {
  // build a tree of expression respecting precedence
  var i, j, expr;
  // a dumb algo that works
  for(i=0; i<expression_list.length; i++) {
    for(j=0; j<list.length; j++) {
      if(list.length == 1) {
        return list[0];
      }
      expr = list[j];
      if(expr instanceof expression_list[i]) {
        if(expr.type == 'operator') {
          expr.left = list[j-1];
          expr.right = list[j+1];
          list.splice(j-1, 2);
          list[j-1] = expr;
          j = j - 1;
        }
        if(expr.type == 'unary') {
          expr.right = list[j+1];
          list.splice(j+1, 1);
        }
        if(expr.type == 'value') {
          throw new util.CompileError("Expression builder: expected an operator but got " + expr.constructor.name);
        }
      }
    }
  }
  if(list.length == 1) {
    return list[0];
  } else {
    throw new util.CompileError("Expression builder: incorrect expression construction " + list);
  }
}

module.exports = {
  build:build,
  compileTextAndExpressions:compileTextAndExpressions,
  buildExpressions:buildExpressions,
  parseExpressions:parseExpressions,
  evaluateExpressionList:evaluateExpressionList,
  StringValue:StringValue,
  Name:Name,
  EXPRESSION_REG:EXPRESSION_REG
};
},{"./util":5}],2:[function(_dereq_,module,exports){
/* Likely.js version 0.9.1,
   Python style HTML template language with bi-directionnal data binding
   batiste bieler 2014 */
"use strict";

var util = _dereq_('./util');
var render = _dereq_('./render');
var expression = _dereq_('./expression');
var template = _dereq_('./template');

function updateData(context, dom) {
  var path = dom.getAttribute("lk-bind"), value;
  if(!path) {
    throw "No data-path attribute on the element";
  }
  if(dom.type == 'checkbox' && !dom.checked) {
    value = "";
  } else {
    value = dom.value;// || dom.getAttribute("value");
  }
  // remove the .
  path = path.substr(1);
  // update the context
  context.modify(path, value);
}

function Binding(dom, tpl, data) {
  // double data binding between some data and some dom
  this.dom = dom;
  this.data = data;
  this.context = new template.Context(this.data);
  this.template = tpl;
  this.init();
}

Binding.prototype.tree = function() {
  return this.template.tree(new template.Context(this.data));
};

Binding.prototype.init = function() {
  this.dom.innerHTML = "";
  this.currentTree = this.tree();
  this.currentTree.domTree(this.dom);
  this.bindEvents();
};

Binding.prototype.diff = function() {
  var newTree = this.tree();
  var diff = this.currentTree.diff(newTree);
  render.applyDiff(diff, this.dom);
  this.currentTree = newTree;
  this.lock = false;
};

Binding.prototype.dataEvent = function(e) {
  var dom = e.target;
  var path = dom.getAttribute('lk-bind');
  if(path) {
    var renderNode = this.getRenderNodeFromPath(dom);
    updateData(renderNode.context, dom);
    if(!this.lock) {
      this.lock = true;
      this.diff();
    }
    var event = new CustomEvent("dataViewChanged", {"path": path});
    this.dom.dispatchEvent(event);
  }
};

Binding.prototype.getRenderNodeFromPath = function(dom) {
  var path = dom.getAttribute('lk-path');
  var renderNode = this.currentTree;
  var bits = path.split("."), i;
  for(i=1; i<bits.length; i++) {
    renderNode = renderNode.children[bits[i]];
  }
  return renderNode;
};

Binding.prototype.anyEvent = function(e) {
  var dom = e.target;
  var lkEvent = dom.getAttribute('lk-' + e.type);
  if(!lkEvent) {
    return;
  }
  var renderNode = this.getRenderNodeFromPath(dom);
  renderNode.node.attrs['lk-'+e.type].evaluate(renderNode.context);
};

Binding.prototype.bindEvents = function() {
  var i;
  this.dom.addEventListener("keyup", function(e){ this.dataEvent(e); }.bind(this), false);
  this.dom.addEventListener("change", function(e){ this.dataEvent(e); }.bind(this), false);
  var events = "click,change,mouseover,focus,keydown,keyup,keypress,submit,blur".split(',');
  for(i=0; i<events.length; i++) {
    this.dom.addEventListener(
      events[i],
      function(e){ this.anyEvent(e); }.bind(this), false);
  }
};

Binding.prototype.update = function(){
  this.diff();
};

function Component(name, tpl, controller) {
  if(template.componentCache[name]) {
    util.CompileError("Component with name " + name + " already exist");
  }
  this.name = name;
  this.template = tpl;
  this.controller = controller;
  template.componentCache[name] = this;
}

module.exports = {
  Template:template.buildTemplate,
  updateData:updateData,
  Binding:Binding,
  Component:Component,
  getDom:render.getDom,
  parseExpressions:expression.parseExpressions,
  compileTextAndExpressions:expression.compileTextAndExpressions,
  buildExpressions:expression.buildExpressions,
  expressions:{
    StringValue:expression.StringValue
  },
  applyDiff:render.applyDiff,
  diffCost:render.diffCost,
  parseAttributes:template.parseAttributes,
  attributesDiff:render.attributesDiff,
  Context:template.Context,
  CompileError:util.CompileError,
  RuntimeError:util.RuntimeError,
  escape:util.escape,
  expression:expression,
  setHandicap:function(n){render.handicap = n;}
};

},{"./expression":1,"./render":3,"./template":4,"./util":5}],3:[function(_dereq_,module,exports){
/* Likely.js version 0.9.1,
   Python style HTML template language with bi-directionnal data binding
   batiste bieler 2014 */
"use strict";

function RenderedNode(node, context, renderer, path) {
  this.children = [];
  this.node = node;
  this.context = context;
  this.renderer = renderer;
  this.path = path || "";
  // shortcut
  this.nodeName = node.nodeName;
}

RenderedNode.prototype.repr = function(level) {
  var str = "", i;
  if(level === undefined) {
    level = 0;
  }
  for(i=0; i<level; i++) {
    str += "  ";
  }
  str += String(this.node) + " path " + this.path + "\r\n";
  for(i=0; i<this.children.length; i++) {
    str += this.children[i].repr(level + 1);
  }
  return str;
};

RenderedNode.prototype.domTree = function(append_to) {
  var node = append_to || this.node.domNode(this.context, this.path), i, child_tree;
  for(i=0; i<this.children.length; i++) {
    child_tree = this.children[i].domTree();
    if(node.push) {
      node.push(child_tree);
    } else {
      node.appendChild(child_tree);
    }
  }
  return node;
};

RenderedNode.prototype.domHtml = function() {
  var i;
  var d = document.createElement('div');
  for(i=0; i<this.children.length; i++) {
    var child = this.children[i].domTree();
    d.appendChild(child);
  }
  return d.innerHTML;
};

function diffCost(diff) {
  var value=0, i;
  for(i=0; i<diff.length; i++) {
    if(diff[i].action == "remove") {
      value += 5;
    }
    if(diff[i].action == "add") {
      value += 2;
    }
    if(diff[i].action == "mutate") {
      value += 1;
    }
    if(diff[i].action == "stringmutate") {
      value += 1;
    }
  }
  return value;
}

RenderedNode.prototype._diff = function(rendered_node, accu, path) {
  var i, j, source_pt = 0;
  if(path === undefined) { path = ""; }

  if(!rendered_node) {
    accu.push({
      action: 'remove',
      node: this,
      path: path
    });
    return accu;
  }

  if(rendered_node.node.nodeName != this.node.nodeName) {
    accu.push({
      action: 'remove',
      node: this,
      path: path
    });
    accu.push({
      action: 'add',
      node: rendered_node,
      path: path
    });
    return accu;
  }

  // Could use inheritance for this
  if(this.nodeName == "string" && this.renderer != rendered_node.renderer) {
      accu.push({
        action: 'stringmutate',
        node: this,
        value: rendered_node.renderer,
        path: path
      });
    return accu;
  } else {
    var a_diff = attributesDiff(this.attrs, rendered_node.attrs);
    if(a_diff.length) {
      accu.push({
        action: 'mutate',
        node: this,
        attributesDiff: a_diff,
        path: path
      });
    }
  }

  var l1 = this.children.length;
  var l2 = rendered_node.children.length;

  // no swap possible, but deleting a node is possible
  j = 0; i = 0; source_pt = 0;
  // let's got trough all the children
  for(; i<l1; i++) {
    var diff = 0, after_source_diff = 0, after_target_diff = 0, after_source_cost=null, after_target_cost=null;
    var after_target = rendered_node.children[j+1];
    var after_source = this.children[i+1];

    if(!rendered_node.children[j]) {
      accu.push({
        action: 'remove',
        node: this.children[i],
        path: path + '.' + source_pt
      });
      continue;
    }

    diff = this.children[i]._diff(rendered_node.children[j], [], path + '.' + source_pt);

    var cost = diffCost(diff);
    // does the next source one fits better?
    if(after_source) {
      after_source_diff = after_source._diff(rendered_node.children[j], [], path + '.' + source_pt);
      // needs some handicap otherwise inputs containing the current focus
      // might be removed
      after_source_cost = diffCost(after_source_diff) + module.exports.handicap;
    }
    // does the next target one fits better?
    if(after_target) {
      after_target_diff = this.children[i]._diff(after_target, [], path + '.' + source_pt);
      after_target_cost = diffCost(after_target_diff) + module.exports.handicap;
    }

    if((!after_target || cost <= after_target_cost) && (!after_source || cost <= after_source_cost)) {
      accu = accu.concat(diff);
      source_pt += 1;
    } else if(after_source && (!after_target || after_source_cost <= after_target_cost)) {
      accu.push({
        type: 'after_source',
        action: 'remove',
        node: this.children[i],
        path: path + '.' + source_pt
      });
      accu = accu.concat(after_source_diff);
      source_pt += 1;
      i++;
    } else if(after_target) {
      // important to add the diff before
      accu = accu.concat(after_target_diff);
      accu.push({
        type: 'after_target',
        action: 'add',
        node: rendered_node.children[j],
        path: path + '.' + (source_pt)
      });
      source_pt += 2;
      j++;
    } else {
      throw "Should never happen";
    }
    j++;
  }

  // new nodes to be added after the diff
  for(i=0; i<(l2-j); i++) {
    accu.push({
      action: 'add',
      node: rendered_node.children[j+i],
      path: path + '.' + (source_pt + 1)
    });
    source_pt += 1;
  }

  return accu;

};

RenderedNode.prototype.diff = function(rendered_node) {
  var accu = [];
  return this._diff(rendered_node, accu);
};

function attributesDiff(a, b) {
  var changes = [], key;
  for(key in a) {
      if(b[key] === false) {
        changes.push({action:"remove", key:key});
      } else if(b[key] !== undefined) {
        if(b[key] != a[key]) {
          changes.push({action:"mutate", key:key, value:b[key]});
        }
      } else {
        changes.push({action:"remove", key:key});
      }
  }
  for(key in b) {
    if(a[key] === undefined) {
      changes.push({action:"add", key:key, value:b[key]});
    }
  }
  return changes;
}

function getDom(dom, path, stop) {
  var i, p=path.split('.'), d=dom;
  if(stop === undefined) {
    stop = 0;
  }
  for(i=0; i<(p.length - stop); i++) {
    if(p[i]) { // first one is ""
      d = d.childNodes[parseInt(p[i], 10)];
    }
  }
  return d;
}

function applyDiff(diff, dom) {
  var i, j, _diff, _dom, parent;
  for(i=0; i<diff.length; i++) {
    _diff = diff[i];
    _dom = getDom(dom, _diff.path);
    if(_diff.action == "remove") {
      _dom.parentNode.removeChild(_dom);
    }
    if(_diff.action == "add") {
      var newNode = _diff.node.domTree();
      if(_dom) {
        _dom.parentNode.insertBefore(newNode, _dom);
      } else {
        // get the parent
        parent = getDom(dom, _diff.path, 1);
        parent.appendChild(newNode);
      }
    }
    if(_diff.action == "mutate") {
      for(j=0; j<_diff.attributesDiff.length; j++) {
        var a_diff = _diff.attributesDiff[j];
        if(a_diff.action == "mutate") {
          // important for select
          if("value,selected,checked".indexOf(a_diff.key) != -1) {
            if(_dom[a_diff.key] != a_diff.value) {
              _dom[a_diff.key] = a_diff.value;
            }
          }
          _dom.setAttribute(a_diff.key, a_diff.value);
        }
        if(a_diff.action == "remove") {
          if("checked,selected".indexOf(a_diff.key) != -1) {
            _dom[a_diff.key] = false;
          }
          _dom.removeAttribute(a_diff.key);
        }
        if(a_diff.action == "add") {
          if("checked,selected".indexOf(a_diff.key) != -1) {
            _dom[a_diff.key] = a_diff.value;
          }
          _dom.setAttribute(a_diff.key, a_diff.value);
        }
      }
    }
    if(_diff.action == "stringmutate") {
      _dom.nodeValue = _diff.value;
    }
  }
}

module.exports = {
  RenderedNode:RenderedNode,
  applyDiff:applyDiff,
  attributesDiff:attributesDiff,
  diffCost:diffCost,
  getDom:getDom,
  handicap:1
};
},{}],4:[function(_dereq_,module,exports){
/* Likely.js version 0.9.1,
   Python style HTML template language with bi-directionnal data binding
   batiste bieler 2014 */
"use strict";
var util = _dereq_('./util');
var render = _dereq_('./render');
var expression = _dereq_('./expression');

var templateCache = {};
var componentCache = {};
// a name here is also any valid JS object property
var VARNAME_REG = /^[a-zA-Z_$][0-9a-zA-Z_$]*/;
var HTML_ATTR_REG = /^[A-Za-z][\w-]{0,}/;
var DOUBLE_QUOTED_STRING_REG = /^"(\\"|[^"])*"/;

function Context(data, parent) {
  this.data = data;
  this.parent = parent;
  this.aliases = {};
  this.watching = {};
}

Context.prototype.addAlias = function(sourceName, aliasName) {
  // source name can be 'name' or 'list.key'
  if(sourceName === aliasName) {
    throw new util.CompileError("Alias with the same name added in this context.");
  }
  this.aliases[aliasName] = sourceName;
};

Context.prototype.resolveName = function(name) {
  // given a name, return the [Context, resolved path, value] when
  // this name is found or undefined

  var remaining = '', name_start = name, bits = [];

  if(name_start.indexOf(".") != -1) {
    bits = name_start.split(".");
    name_start = bits[0];
    remaining = '.' + bits.slice(1).join('.');
  }
  
  if(this.aliases.hasOwnProperty(name_start)) {
    name_start = this.aliases[name_start];
    return this.resolveName(name_start + remaining);
  }

  if(this.data.hasOwnProperty(name_start)) {
    var value = this.data[name_start];
    var i = 1;
    while(i < bits.length) {
      if(!value.hasOwnProperty(bits[i])) {
        return undefined;
      }
      value = value[bits[i]];
      i++;
    }
    return [this, name_start + remaining, value];
  }

  if(this.parent) {
    return this.parent.resolveName(name_start + remaining);
  }

};

Context.prototype.getNamePath = function(name) {
  var resolved = this.resolveName(name);
  if(resolved) {
    return '.' + resolved[1];
  } else {
  }
};

Context.prototype.watch = function(name, callback) {
  console.log("watch", this.aliases, name);
  this.watching[name] = callback;
};

Context.prototype.get = function(name) {

  var resolved = this.resolveName(name);
  if(resolved) {
    return resolved[2];
  }

  // quick path
  if(name.indexOf(".") == -1) {
    if(this.data.hasOwnProperty(name)) {
      return this.data[name];
    }
    if(this.parent) {
      return this.parent.get(name);
    }
  }

  var bits = name.split(".");
  var data = this.data;
  // we go in for a search if the first part matches
  if(data.hasOwnProperty(bits[0])) {
    data = data[bits[0]];
    var i = 1;
    while(i < bits.length) {
      if(!data.hasOwnProperty(bits[i])) {
        return undefined;
      }
      data = data[bits[i]];
      i++;
    }
    return data;
  }
  // data not found, let's search in the parent
  if(this.parent) {
    return this.parent.get(name);
  }
};

Context.prototype.modify = function(name, value) {

  console.log(this, name, value)
  if(this.watching.hasOwnProperty(name)) {
    this.watching[name](value);
  }

  // quick path
  if(name.indexOf(".") == -1) {
    if(this.data.hasOwnProperty(name)) {
      this.data[name] = value;
    }
    if(this.parent) {
      this.parent.modify(name, value);
    }
  }

  var bits = name.split(".");
  var data = this.data;
  // we go in for a search if the first part matches
  if(data.hasOwnProperty(bits[0])) {
    data = data[bits[0]];
    var i = 1;
    while(i < bits.length - 1) {
      if(!data.hasOwnProperty(bits[i])) {
        return false;
      }
      data = data[bits[i]];
      i++;
    }
    data[bits[i]] = value;
    return true;
  }
  // data not found, let's search in the parent
  if(this.parent) {
    return this.parent.modify(name, value);
  }

};

Context.prototype.set = function(name, value) {
  this.data[name] = value;
}

function parseAttributes(v, node) {
    var attrs = {}, n, s;
    while(v) {
        v = util.trim(v);
        n = v.match(HTML_ATTR_REG);
        if(!n) {
          node.cerror("parseAttributes: No attribute name found in "+v);
        }
        v = v.substr(n[0].length);
        n = n[0];
        if(v[0] != "=") {
          node.cerror("parseAttributes: No equal sign after name "+n);
        }
        v = v.substr(1);
        s = v.match(DOUBLE_QUOTED_STRING_REG);
        if(s) {
          attrs[n] = new StringNode(null, s[0]);
        } else {
          s = v.match(expression.EXPRESSION_REG);
          if(s === null) {
            node.cerror("parseAttributes: No string or expression found after name "+n);
          } else {
            var expr = expression.build(s[1]);
            attrs[n] = expr;
          }
        }
        v = v.substr(s[0].length);
    }
    return attrs;
}

// all the available template node

function Node(parent, content, level, line) {
  this.line = line;
  this.parent = parent;
  this.content = content;
  this.level = level;
  this.children = [];
}

Node.prototype.repr = function(level) {
  var str = "", i;
  if(level === undefined) {
    level = 0;
  }
  for(i=0; i<level; i++) {
    str += "  ";
  }
  str += String(this) + "\r\n";
  for(i=0; i<this.children.length; i++) {
    str += this.children[i].repr(level + 1);
  }
  return str;
};

Node.prototype.tree = function(context, path, pos) {
  if(path === undefined) {
    path = '';
    pos = 0;
    this.isRoot = true;
  }
  var t = new render.RenderedNode(this, context, '', path);
  t.children = this.treeChildren(context, path, pos);
  return t;
};

Node.prototype.cerror = function(msg) {
  throw new util.CompileError(this.toString() + ": " + msg);
};

Node.prototype.domNode = function() {
  return [];
};

Node.prototype.treeChildren = function(context, path, pos) {
  var t = [], i, p, j, children = null, child = null;
  j = pos;
  for(i=0; i<this.children.length; i++) {
    p = path;
    child = this.children[i];
    if(child.hasOwnProperty('nodeName')) {
      p += '.' + j;
      j++;
      children = child.tree(context, p, 0);
      t.push(children);
    } else if (!child.renderExlcuded) {
      children = child.tree(context, p, j);
      if(children) {
        t = t.concat(children);
        j += children.length;
      }
    }
  }
  return t;
};

Node.prototype.addChild = function(child) {
  this.children.push(child);
};

Node.prototype.toString = function() {
  return this.constructor.name + "("+this.content.replace("\n", "")+") at line " + this.line;
};

function CommentNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  parent.children.push(this);
  this.renderExlcuded = true;
}
util.inherits(CommentNode, Node);

function HtmlNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.nodeName = this.content.split(" ")[0];
  this.attrs = parseAttributes(this.content.substr(this.nodeName.length), this);
  parent.addChild(this);
}
util.inherits(HtmlNode, Node);

HtmlNode.prototype.tree = function(context, path, pos) {
  var t = new render.RenderedNode(this, context, this.domNode(context, path), path);
  t.attrs = this.renderAttributes(context, path);
  t.children = this.treeChildren(context, path, pos);
  return t;
};

function bindingPathName(node, context) {
  var name = bindingName(node);
  if(name) {
    return context.getNamePath(bindingName(node));
  }
}

function bindingName(node) {
  if(node instanceof expression.Name) {
    return node.name;
  }
  if(node instanceof StringNode && node.compiledExpression.length == 1 &&
      node.compiledExpression[0] instanceof expression.Name) {
    return node.compiledExpression[0].name;
  }
}

HtmlNode.prototype.renderAttributes = function(context, path) {
  var r_attrs = {}, key, attr, p;
  for(key in this.attrs) {
    attr = this.attrs[key];
    // todo, find a better way to discriminate events
    if(key.indexOf("lk-") === 0) {
      // add the path to the render node to any lk-thing node
      r_attrs['lk-path'] = path;
      r_attrs[key] = attr;
      continue;
    }
    if(attr.evaluate) {
      var v = attr.evaluate(context);
      if(v === false) {
        // nothing
      } else {
        r_attrs[key] = v;
      }
    } else {
      r_attrs[key] = attr;
    }
  }
  if("input,select,textarea".indexOf(this.nodeName) != -1 && this.attrs.hasOwnProperty('value')) {
    attr = this.attrs.value;
    p = bindingPathName(attr, context);
    if(p && this.attrs['lk-bind'] === undefined){
      r_attrs['lk-bind'] = p;
      r_attrs['lk-path'] = path;
    }
  }
  if(this.nodeName == "textarea" && this.children.length == 1) {
    p = bindingPathName(this.children[0].expression, context);
    if(p && this.attrs['lk-bind'] === undefined){
      r_attrs['lk-bind'] = p;
      r_attrs['lk-path'] = path;
      // as soon as the user has altered the value of the textarea or script has altered
      // the value property of the textarea, the text node is out of the picture and is no
      // longer bound to the textarea's value in any way.
      r_attrs.value = this.children[0].expression.evaluate(context);
    }
  }
  return r_attrs;
};

HtmlNode.prototype.domNode = function(context, path) {
  var node = document.createElement(this.nodeName), key, attrs=this.renderAttributes(context, path);
  for(key in attrs) {
    node.setAttribute(key, attrs[key]);
  }
  return node;
};

function ForNode(parent, content, level, line) {
  // syntax: for key, value in list
  //         for value in list
  Node.call(this, parent, content, level, line);
  var var1, var2, sourceName;
  content = util.trim(content.substr(4));
  var1 = content.match(VARNAME_REG);
  if(!var1) {
    this.cerror("first variable name is missing");
  }
  content = util.trim(content.substr(var1[0].length));
  if(content[0] == ',') {
    content = util.trim(content.substr(1));
    var2 = content.match(VARNAME_REG);
    if(!var2) {
      this.cerror("second variable after comma is missing");
    }
    content = util.trim(content.substr(var2[0].length));
  }
  if(!content.match(/^in/)) {
    this.cerror("in keyword is missing");
  }
  content = util.trim(content.substr(2));
  sourceName = content.match(expression.Name.reg);
  if(!sourceName) {
    this.cerror("iterable name is missing");
  }
  this.sourceName = sourceName[0];
  content = util.trim(content.substr(sourceName[0].length));
  if(content !== "") {
    this.cerror("left over unparsable content: " + content);
  }

  if(var1 && var2) {
    this.indexName = var1;
    this.alias = var2[0];
  } else {
    this.alias = var1[0];
  }
  parent.addChild(this);
}
util.inherits(ForNode, Node);

ForNode.prototype.tree = function(context, path, pos) {
  var t = [], key;
  var d = context.get(this.sourceName);
  for(key in d) {
    // putting the alias in the context
    var new_data = {};
    new_data[this.alias] = d[key];
    // add the key to access the context
    if(this.indexName) {
        new_data[this.indexName] = key;
    }
    var new_context = new Context(new_data, context);
    // keep track of where the data is coming from
    new_context.addAlias(this.sourceName + '.' + key, this.alias);
    t = t.concat(this.treeChildren(new_context, path, t.length + pos));
  }
  return t;
};

function IfNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.expression = expression.build(content.replace(/^if/g, ""));
  parent.children.push(this);
}
util.inherits(IfNode, Node);

IfNode.prototype.tree = function(context, path, pos) {
  if(!this.expression.evaluate(context)) {
    if(this.else) {
      return this.else.tree(context, path, pos);
    }
    return;
  }
  return this.treeChildren(context, path, pos);
};

function ElseNode(parent, content, level, line, currentNode) {
  Node.call(this, parent, content, level, line);
  this.searchIf(currentNode);
}
util.inherits(ElseNode, Node);

ElseNode.prototype.tree = function(context, path, pos) {
  return this.treeChildren(context, path, pos);
};

function IfElseNode(parent, content, level, line, currentNode) {
  Node.call(this, parent, content, level, line);
  this.expression = expression.build(content.replace(/^elseif/g, ""));
  this.searchIf(currentNode);
}
// important to be an IfNode
util.inherits(IfElseNode, IfNode);

IfElseNode.prototype.searchIf = function searchIf(currentNode) {
  // first node on the same level has to be the if/elseif node
  while(currentNode) {
    if(currentNode.level < this.level) {
      this.cerror("cannot find a corresponding if-like statement at the same level.");
    }
    if(currentNode.level == this.level) {
      if(!(currentNode instanceof IfNode)) {
        this.cerror("at the same level is not a if-like statement.");
      }
      currentNode.else = this;
      break;
    }
    currentNode = currentNode.parent;
  }
};
ElseNode.prototype.searchIf = IfElseNode.prototype.searchIf;

function ExpressionNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.nodeName = "string";
  var m = content.match(expression.EXPRESSION_REG);
  if(!m) {
    this.cerror("declared improperly");
  }
  this.expression = expression.build(m[1]);
  parent.addChild(this);
}
util.inherits(ExpressionNode, Node);

ExpressionNode.prototype.tree = function(context, path) {
  // renderer
  var renderer = String(this.expression.evaluate(context));
  var t = new render.RenderedNode(this, context, renderer, path);
  return t;
};

ExpressionNode.prototype.domNode = function(context) {
  return document.createTextNode(this.expression.evaluate(context));
};

function StringNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.nodeName = "string";
  this.string = this.content.replace(/^"|"$/g, "").replace(/\\"/g, '"', 'gm');
  this.compiledExpression = expression.compileTextAndExpressions(this.string);
  if(parent) {
    parent.addChild(this);
  }
}
util.inherits(StringNode, Node);

StringNode.prototype.tree = function(context, path) {
  // renderer should be all attributes
  var renderer = expression.evaluateExpressionList(this.compiledExpression, context);
  var t = new render.RenderedNode(this, context, renderer, path);
  return t;
};

StringNode.prototype.evaluate = function(context) {
  return expression.evaluateExpressionList(this.compiledExpression, context);
};

StringNode.prototype.domNode = function(context) {
  return document.createTextNode(expression.evaluateExpressionList(this.compiledExpression, context));
};

StringNode.prototype.addChild = function(child) {
  this.cerror("cannot have children");
};

function IncludeNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.name = util.trim(content.split(" ")[1]);
  this.template = templateCache[this.name];
  if(this.template === undefined) {
    this.cerror("Template with name " + this.name + " is not registered");
  }
  parent.addChild(this);
}
util.inherits(IncludeNode, Node);

IncludeNode.prototype.tree = function(context, path, pos) {
  return this.template.treeChildren(context, path, pos);
};

function ComponentNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  content = util.trim(content).substr(10);
  var name = content.match(VARNAME_REG);
  if(!name) {
    this.cerror("Component name is missing");
  }
  content = util.trim(content.substr(name[0].length));
  this.name = name[0];
  this.attrs = parseAttributes(content, this);
  this.component = componentCache[this.name];
  if(this.component === undefined) {
    this.cerror("Component with name " + this.name + " is not registered");
  }
  parent.addChild(this);
}
util.inherits(ComponentNode, Node);

ComponentNode.prototype.tree = function(context, path, pos) {
  var new_context = new Context({}, context);
  var key, attr, value, source;
  for(key in this.attrs) {
    attr = this.attrs[key];
    if(attr.evaluate) {
      value = attr.evaluate(context);
      // todo : if expression attribute, add an alias
      if(value === false) {
        // nothing
      } else {
        new_context.set(key, value);
        source = bindingName(attr);
        if(source) {
          new_context.addAlias(source, key);
        }
      }
    } else {
      //new_context.set(key, value);
    }
  }
  if(this.component.controller){
    this.component.controller(new_context);
  }
  return this.component.template.treeChildren(new_context, path, pos);
};

function createNode(parent, content, level, line, currentNode) {
  var node;
  if(content.length === 0) {
    node = new StringNode(parent, "\n", level, line+1);
  } else if(content.indexOf('#') === 0) {
    node = new CommentNode(parent, content, level, line+1);
  } else if(content.indexOf('if ') === 0) {
    node = new IfNode(parent, content, level, line+1);
  } else if(content.indexOf('elseif ') === 0) {
    node = new IfElseNode(parent, content, level, line+1, currentNode);
  } else if(content.indexOf('else') === 0) {
    node = new ElseNode(parent, content, level, line+1, currentNode);
  } else if(content.indexOf('for ') === 0) {
    node = new ForNode(parent, content, level, line+1);
  } else if(content.indexOf('include ') === 0) {
    node = new IncludeNode(parent, content, level, line+1);
  } else if(content.indexOf('component ') === 0) {
    node = new ComponentNode(parent, content, level, line+1);
  } else if(content.indexOf('"') === 0) {
    node = new StringNode(parent, content, level, line+1);
  } else if(/^\w/.exec(content)) {
    node = new HtmlNode(parent, content, level, line+1);
  } else if(content.indexOf('{{') === 0) {
    node = new ExpressionNode(parent, content, level, line+1);
  } else {
    throw new util.CompileError("createNode: unknow node type " + content);
  }
  return node;
}

function buildTemplate(tpl, templateName) {

  if(typeof tpl == 'object') {
    tpl = tpl.join('\n');
  }

  var root = new Node(null, "", 0), lines, line, level,
    content, i, currentNode = root, parent, searchNode;

  lines = tpl.split("\n");

  for(i=0; i<lines.length; i++) {
    line = lines[i];
    level = line.match(/\s*/)[0].length + 1;
    content = line.slice(level - 1);

    // multiline support: ends with a \
    var j = 0;
    while(content.match(/\\$/)) {
        j++;
        content = content.replace(/\\$/, '') + lines[i+j];
    }
    i = i + j;

    // multiline strings
    j = 0;
    if(content.match(/^"""/)) {
        content = content.replace(/^"""/, '"');
        while(!content.match(/"""$/)) {
            j++;
            if(i+j > lines.length) {
              throw new util.CompileError("Multiline string started but unfinished at line " + (i + 1));
            }
            content = content + lines[i+j];
        }
        content = content.replace(/"""$/, '"');
    }
    i = i + j;

    searchNode = currentNode;
    parent = null;

    // search for the parent node
    while(true) {

      if(level > searchNode.level) {
        parent = searchNode;
        break;
      }

      if(!searchNode.parent) {
        throw new util.CompileError("Indentation error at line " + (i + 1));
      }

      if(level == searchNode.level) {
        parent = searchNode.parent;
        break;
      }

      searchNode = searchNode.parent;
    }

    if(parent.children.length) {
      if(parent.children[0].level != level) {
        throw new util.CompileError("Indentation error at line " + (i + 1));
      }
    }

    var node = createNode(parent, content, level, i, currentNode);
    currentNode = node;

  }
  if(templateName) {
    templateCache[templateName] = root;
  }

  return root;
}

module.exports = {
	buildTemplate: buildTemplate,
	parseAttributes: parseAttributes,
	Context: Context,
  templateCache: templateCache,
  componentCache: componentCache
};
},{"./expression":1,"./render":3,"./util":5}],5:[function(_dereq_,module,exports){
/* Likely.js version 0.9.1,
   Python style HTML template language with bi-directionnal data binding
   batiste bieler 2014 */
"use strict";

function inherits(child, parent) {
  child.prototype = Object.create(parent.prototype);
  child.prototype.constructor = child;
}

function CompileError(msg) {
  this.name = "CompileError";
  this.message = (msg || "");
}
CompileError.prototype = Error.prototype;

function RuntimeError(msg) {
  this.name = "RuntimeError";
  this.message = (msg || "");
}
RuntimeError.prototype = Error.prototype;

function escape(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function trim(txt) {
  return txt.replace(/^\s+|\s+$/g ,"");
}

module.exports = {
	inherits:inherits,
	CompileError:CompileError,
	RuntimeError:RuntimeError,
	escape:escape,
	trim:trim
};
},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBMaWtlbHkuanMgdmVyc2lvbiAwLjkuMSxcbiAgIFB5dGhvbiBzdHlsZSBIVE1MIHRlbXBsYXRlIGxhbmd1YWdlIHdpdGggYmktZGlyZWN0aW9ubmFsIGRhdGEgYmluZGluZ1xuICAgYmF0aXN0ZSBiaWVsZXIgMjAxNCAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgRVhQUkVTU0lPTl9SRUcgPSAvXnt7KC4rPyl9fS87XG5cbi8vIEV4cHJlc3Npb24gZXZhbHVhdGlvbiBlbmdpbmVcbmZ1bmN0aW9uIFN0cmluZ1ZhbHVlKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcInZhbHVlXCI7XG4gIGlmKHR4dFswXSA9PSAnXCInKSB7XG4gICAgdGhpcy52YWx1ZSA9IHR4dC5yZXBsYWNlKC9eXCJ8XCIkL2csIFwiXCIpO1xuICB9IGVsc2UgaWYodHh0WzBdID09IFwiJ1wiKSB7XG4gICAgdGhpcy52YWx1ZSA9IHR4dC5yZXBsYWNlKC9eJ3wnJC9nLCBcIlwiKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJJbnZhbGlkIHN0cmluZyB2YWx1ZSBcIiArIHR4dCk7XG4gIH1cbn1cblN0cmluZ1ZhbHVlLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMudmFsdWU7XG59O1xuU3RyaW5nVmFsdWUucmVnID0gL15cIig/OlxcXFxcInxbXlwiXSkqXCJ8XicoPzpcXFxcJ3xbXiddKSonLztcblxuZnVuY3Rpb24gRXF1YWxPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbkVxdWFsT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpID09IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuRXF1YWxPcGVyYXRvci5yZWcgPSAvXj09LztcblxuZnVuY3Rpb24gTm90RXF1YWxPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbk5vdEVxdWFsT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpICE9IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuTm90RXF1YWxPcGVyYXRvci5yZWcgPSAvXiE9LztcblxuZnVuY3Rpb24gQmlnZ2VyT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5CaWdnZXJPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgPiB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbkJpZ2dlck9wZXJhdG9yLnJlZyA9IC9ePi87XG5cbmZ1bmN0aW9uIFNtYWxsZXJPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbiAgdGhpcy5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpIDwgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbiAgfTtcbn1cblNtYWxsZXJPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgPCB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcblNtYWxsZXJPcGVyYXRvci5yZWcgPSAvXjwvO1xuXG5mdW5jdGlvbiBPck9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuT3JPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgfHwgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5Pck9wZXJhdG9yLnJlZyA9IC9eb3IvO1xuXG5mdW5jdGlvbiBBbmRPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbkFuZE9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSAmJiB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbkFuZE9wZXJhdG9yLnJlZyA9IC9eYW5kLztcblxuZnVuY3Rpb24gTmFtZSh0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJ2YWx1ZVwiO1xuICB0aGlzLm5hbWUgPSB0eHQ7XG59XG5OYW1lLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIHZhbHVlID0gY29udGV4dC5nZXQodGhpcy5uYW1lKTtcbiAgcmV0dXJuIHZhbHVlO1xufTtcbk5hbWUucmVnID0gL15bQS1aYS16XVtcXHdcXC5dezAsfS87XG5cbmZ1bmN0aW9uIEZpbHRlcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5GaWx0ZXIucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgZmN0ID0gY29udGV4dC5nZXQodGhpcy5yaWdodC5uYW1lKTtcbiAgcmV0dXJuIGZjdC5hcHBseSh0aGlzLCBbdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpLCBjb250ZXh0XSk7XG59O1xuRmlsdGVyLnJlZyA9IC9eXFx8LztcblxuLy8gbWF0aFxuXG5mdW5jdGlvbiBNdWx0aXBseU9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbk11bHRpcGx5T3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpICogdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5NdWx0aXBseU9wZXJhdG9yLnJlZyA9IC9eXFwqLztcblxuZnVuY3Rpb24gUGx1c09wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cblBsdXNPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgKyB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcblBsdXNPcGVyYXRvci5yZWcgPSAvXlxcKy87XG5cbmZ1bmN0aW9uIE1pbnVzT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9ICdvcGVyYXRvcic7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuTWludXNPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgLSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbk1pbnVzT3BlcmF0b3IucmVnID0gL15cXC0vO1xuXG5mdW5jdGlvbiBGdW5jdGlvbkNhbGwodHh0KSB7XG4gIHRoaXMudHlwZSA9ICd2YWx1ZSc7XG4gIHZhciBtID0gdHh0Lm1hdGNoKC9eKFthLXpBLVpdW2EtekEtWjAtOVxcLl0qKVxcKChbXlxcKV0qKVxcKS8pO1xuICB0aGlzLmZ1bmNOYW1lID0gbVsxXTtcbiAgdGhpcy5wYXJhbXMgPSBtWzJdLnNwbGl0KCcsJyk7XG59XG5GdW5jdGlvbkNhbGwucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgZnVuYyA9IGNvbnRleHQuZ2V0KHRoaXMuZnVuY05hbWUpLCBpLCBwYXJhbXM9W107XG4gIGZvcihpPTA7IGk8dGhpcy5wYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICBwYXJhbXMucHVzaChjb250ZXh0LmdldCh1dGlsLnRyaW0odGhpcy5wYXJhbXNbaV0pKSk7XG4gIH1cbiAgcmV0dXJuIGZ1bmMuYXBwbHkoY29udGV4dCwgcGFyYW1zKTtcbn07XG5GdW5jdGlvbkNhbGwucmVnID0gL15bYS16QS1aXVthLXpBLVowLTlcXC5dKlxcKFteXFwpXSpcXCkvO1xuXG5mdW5jdGlvbiBOdW1iZXJWYWx1ZSh0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJ2YWx1ZVwiO1xuICB0aGlzLm51bWJlciA9IHBhcnNlRmxvYXQodHh0LCAxMCk7XG4gIHRoaXMuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMubnVtYmVyO1xuICB9O1xufVxuTnVtYmVyVmFsdWUucmVnID0gL15bMC05XSsvO1xuXG5mdW5jdGlvbiBJZk9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbklmT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgcnYgPSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xuICBpZihydikge1xuICAgIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCk7XG4gIH1cbiAgcmV0dXJuIHJ2O1xufTtcbklmT3BlcmF0b3IucmVnID0gL15pZiAvO1xuXG5mdW5jdGlvbiBJbk9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbkluT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgbGVmdCA9IHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KTtcbiAgdmFyIHJpZ2h0ID0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbiAgaWYocmlnaHQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyB1dGlsLlJ1bnRpbWVFcnJvcigncmlnaHQgc2lkZSBvZiBpbiBvcGVyYXRvciBjYW5ub3QgYmUgdW5kZWZpbmVkJyk7XG4gIH1cbiAgaWYocmlnaHQuaW5kZXhPZikge1xuICAgIHJldHVybiByaWdodC5pbmRleE9mKGxlZnQpICE9IC0xO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByaWdodC5oYXNPd25Qcm9wZXJ0eShsZWZ0KTtcbiAgfVxufTtcbkluT3BlcmF0b3IucmVnID0gL15pbiAvO1xuXG5mdW5jdGlvbiBOb3RPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ3VuYXJ5JztcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5Ob3RPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiAhdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5Ob3RPcGVyYXRvci5yZWcgPSAvXm5vdCAvO1xuXG5mdW5jdGlvbiBjb21waWxlVGV4dEFuZEV4cHJlc3Npb25zKHR4dCkge1xuICAvLyBjb21waWxlIHRoZSBleHByZXNzaW9ucyBmb3VuZCBpbiB0aGUgdGV4dFxuICAvLyBhbmQgcmV0dXJuIGEgbGlzdCBvZiB0ZXh0K2V4cHJlc3Npb25cbiAgdmFyIGV4cHIsIGFyb3VuZDtcbiAgdmFyIGxpc3QgPSBbXTtcbiAgd2hpbGUodHJ1ZSkge1xuICAgIHZhciBtYXRjaCA9IC97eyguKz8pfX0vLmV4ZWModHh0KTtcbiAgICBpZighbWF0Y2gpIHtcbiAgICAgIGlmKHR4dCkge1xuICAgICAgICBsaXN0LnB1c2godHh0KTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBleHByID0gYnVpbGQobWF0Y2hbMV0pO1xuICAgIGFyb3VuZCA9IHR4dC5zcGxpdChtYXRjaFswXSwgMik7XG4gICAgaWYoYXJvdW5kWzBdLmxlbmd0aCkge1xuICAgICAgbGlzdC5wdXNoKGFyb3VuZFswXSk7XG4gICAgfVxuICAgIGxpc3QucHVzaChleHByKTtcbiAgICB0eHQgPSBhcm91bmRbMV07XG4gIH1cbiAgcmV0dXJuIGxpc3Q7XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlRXhwcmVzc2lvbkxpc3QoZXhwcmVzc2lvbnMsIGNvbnRleHQpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGZvcihpPTA7IGk8ZXhwcmVzc2lvbnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyYW0gPSBleHByZXNzaW9uc1tpXTtcbiAgICBpZihwYXJhbS5ldmFsdWF0ZSkge1xuICAgICAgc3RyICs9IHBhcmFtLmV2YWx1YXRlKGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gcGFyYW07XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59XG5cbi8vIGxpc3Qgb3JkZXIgZGVmaW5lIG9wZXJhdG9yIHByZWNlZGVuY2VcbnZhciBleHByZXNzaW9uX2xpc3QgPSBbXG4gIE11bHRpcGx5T3BlcmF0b3IsXG4gIFBsdXNPcGVyYXRvcixcbiAgTWludXNPcGVyYXRvcixcbiAgQmlnZ2VyT3BlcmF0b3IsXG4gIFNtYWxsZXJPcGVyYXRvcixcbiAgRXF1YWxPcGVyYXRvcixcbiAgTm90RXF1YWxPcGVyYXRvcixcbiAgRmlsdGVyLFxuICBOb3RPcGVyYXRvcixcbiAgSWZPcGVyYXRvcixcbiAgSW5PcGVyYXRvcixcbiAgT3JPcGVyYXRvcixcbiAgQW5kT3BlcmF0b3IsXG4gIFN0cmluZ1ZhbHVlLFxuICBOdW1iZXJWYWx1ZSxcbiAgRnVuY3Rpb25DYWxsLFxuICBOYW1lLFxuXTtcblxuZnVuY3Rpb24gYnVpbGQoaW5wdXQpIHtcbiAgcmV0dXJuIGJ1aWxkRXhwcmVzc2lvbnMocGFyc2VFeHByZXNzaW9ucyhpbnB1dCkpO1xufVxuXG5mdW5jdGlvbiBwYXJzZUV4cHJlc3Npb25zKGlucHV0KSB7XG4gIC8vIFJldHVybiBhIGxpc3Qgb2YgZXhwcmVzc2lvbnNcbiAgdmFyIGN1cnJlbnRFeHByID0gbnVsbCwgaSwgZXhwciwgbWF0Y2gsIGZvdW5kLCBwYXJzZWQgPSBbXTtcbiAgd2hpbGUoaW5wdXQpIHtcbiAgICBpbnB1dCA9IHV0aWwudHJpbShpbnB1dCk7XG4gICAgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IoaT0wOyBpPGV4cHJlc3Npb25fbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBleHByID0gZXhwcmVzc2lvbl9saXN0W2ldO1xuICAgICAgICBtYXRjaCA9IGV4cHIucmVnLmV4ZWMoaW5wdXQpO1xuICAgICAgICBpZihtYXRjaCkge1xuICAgICAgICAgIGlucHV0ID0gaW5wdXQuc2xpY2UobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgICBwYXJzZWQucHVzaChuZXcgZXhwcihtYXRjaFswXSwgY3VycmVudEV4cHIpKTtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgLy8gc3RhcnRpbmcgYWdhaW4gdG8gcmVzcGVjdCBwcmVjZWRlbmNlXG4gICAgICAgICAgaSA9IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYoZm91bmQgPT09IGZhbHNlKSB7XG4gICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJFeHByZXNzaW9uIHBhcnNlcjogSW1wb3NzaWJsZSB0byBwYXJzZSBmdXJ0aGVyIDogXCIgKyBpbnB1dCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwYXJzZWQ7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkRXhwcmVzc2lvbnMobGlzdCkge1xuICAvLyBidWlsZCBhIHRyZWUgb2YgZXhwcmVzc2lvbiByZXNwZWN0aW5nIHByZWNlZGVuY2VcbiAgdmFyIGksIGosIGV4cHI7XG4gIC8vIGEgZHVtYiBhbGdvIHRoYXQgd29ya3NcbiAgZm9yKGk9MDsgaTxleHByZXNzaW9uX2xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBmb3Ioaj0wOyBqPGxpc3QubGVuZ3RoOyBqKyspIHtcbiAgICAgIGlmKGxpc3QubGVuZ3RoID09IDEpIHtcbiAgICAgICAgcmV0dXJuIGxpc3RbMF07XG4gICAgICB9XG4gICAgICBleHByID0gbGlzdFtqXTtcbiAgICAgIGlmKGV4cHIgaW5zdGFuY2VvZiBleHByZXNzaW9uX2xpc3RbaV0pIHtcbiAgICAgICAgaWYoZXhwci50eXBlID09ICdvcGVyYXRvcicpIHtcbiAgICAgICAgICBleHByLmxlZnQgPSBsaXN0W2otMV07XG4gICAgICAgICAgZXhwci5yaWdodCA9IGxpc3RbaisxXTtcbiAgICAgICAgICBsaXN0LnNwbGljZShqLTEsIDIpO1xuICAgICAgICAgIGxpc3Rbai0xXSA9IGV4cHI7XG4gICAgICAgICAgaiA9IGogLSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmKGV4cHIudHlwZSA9PSAndW5hcnknKSB7XG4gICAgICAgICAgZXhwci5yaWdodCA9IGxpc3RbaisxXTtcbiAgICAgICAgICBsaXN0LnNwbGljZShqKzEsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGV4cHIudHlwZSA9PSAndmFsdWUnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiRXhwcmVzc2lvbiBidWlsZGVyOiBleHBlY3RlZCBhbiBvcGVyYXRvciBidXQgZ290IFwiICsgZXhwci5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZihsaXN0Lmxlbmd0aCA9PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF07XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiRXhwcmVzc2lvbiBidWlsZGVyOiBpbmNvcnJlY3QgZXhwcmVzc2lvbiBjb25zdHJ1Y3Rpb24gXCIgKyBsaXN0KTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGQ6YnVpbGQsXG4gIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnM6Y29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyxcbiAgYnVpbGRFeHByZXNzaW9uczpidWlsZEV4cHJlc3Npb25zLFxuICBwYXJzZUV4cHJlc3Npb25zOnBhcnNlRXhwcmVzc2lvbnMsXG4gIGV2YWx1YXRlRXhwcmVzc2lvbkxpc3Q6ZXZhbHVhdGVFeHByZXNzaW9uTGlzdCxcbiAgU3RyaW5nVmFsdWU6U3RyaW5nVmFsdWUsXG4gIE5hbWU6TmFtZSxcbiAgRVhQUkVTU0lPTl9SRUc6RVhQUkVTU0lPTl9SRUdcbn07IiwiLyogTGlrZWx5LmpzIHZlcnNpb24gMC45LjEsXG4gICBQeXRob24gc3R5bGUgSFRNTCB0ZW1wbGF0ZSBsYW5ndWFnZSB3aXRoIGJpLWRpcmVjdGlvbm5hbCBkYXRhIGJpbmRpbmdcbiAgIGJhdGlzdGUgYmllbGVyIDIwMTQgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJyk7XG52YXIgZXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vZXhwcmVzc2lvbicpO1xudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZScpO1xuXG5mdW5jdGlvbiB1cGRhdGVEYXRhKGNvbnRleHQsIGRvbSkge1xuICB2YXIgcGF0aCA9IGRvbS5nZXRBdHRyaWJ1dGUoXCJsay1iaW5kXCIpLCB2YWx1ZTtcbiAgaWYoIXBhdGgpIHtcbiAgICB0aHJvdyBcIk5vIGRhdGEtcGF0aCBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnRcIjtcbiAgfVxuICBpZihkb20udHlwZSA9PSAnY2hlY2tib3gnICYmICFkb20uY2hlY2tlZCkge1xuICAgIHZhbHVlID0gXCJcIjtcbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRvbS52YWx1ZTsvLyB8fCBkb20uZ2V0QXR0cmlidXRlKFwidmFsdWVcIik7XG4gIH1cbiAgLy8gcmVtb3ZlIHRoZSAuXG4gIHBhdGggPSBwYXRoLnN1YnN0cigxKTtcbiAgLy8gdXBkYXRlIHRoZSBjb250ZXh0XG4gIGNvbnRleHQubW9kaWZ5KHBhdGgsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gQmluZGluZyhkb20sIHRwbCwgZGF0YSkge1xuICAvLyBkb3VibGUgZGF0YSBiaW5kaW5nIGJldHdlZW4gc29tZSBkYXRhIGFuZCBzb21lIGRvbVxuICB0aGlzLmRvbSA9IGRvbTtcbiAgdGhpcy5kYXRhID0gZGF0YTtcbiAgdGhpcy5jb250ZXh0ID0gbmV3IHRlbXBsYXRlLkNvbnRleHQodGhpcy5kYXRhKTtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRwbDtcbiAgdGhpcy5pbml0KCk7XG59XG5cbkJpbmRpbmcucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudGVtcGxhdGUudHJlZShuZXcgdGVtcGxhdGUuQ29udGV4dCh0aGlzLmRhdGEpKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5kb20uaW5uZXJIVE1MID0gXCJcIjtcbiAgdGhpcy5jdXJyZW50VHJlZSA9IHRoaXMudHJlZSgpO1xuICB0aGlzLmN1cnJlbnRUcmVlLmRvbVRyZWUodGhpcy5kb20pO1xuICB0aGlzLmJpbmRFdmVudHMoKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5ld1RyZWUgPSB0aGlzLnRyZWUoKTtcbiAgdmFyIGRpZmYgPSB0aGlzLmN1cnJlbnRUcmVlLmRpZmYobmV3VHJlZSk7XG4gIHJlbmRlci5hcHBseURpZmYoZGlmZiwgdGhpcy5kb20pO1xuICB0aGlzLmN1cnJlbnRUcmVlID0gbmV3VHJlZTtcbiAgdGhpcy5sb2NrID0gZmFsc2U7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kYXRhRXZlbnQgPSBmdW5jdGlvbihlKSB7XG4gIHZhciBkb20gPSBlLnRhcmdldDtcbiAgdmFyIHBhdGggPSBkb20uZ2V0QXR0cmlidXRlKCdsay1iaW5kJyk7XG4gIGlmKHBhdGgpIHtcbiAgICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuZ2V0UmVuZGVyTm9kZUZyb21QYXRoKGRvbSk7XG4gICAgdXBkYXRlRGF0YShyZW5kZXJOb2RlLmNvbnRleHQsIGRvbSk7XG4gICAgaWYoIXRoaXMubG9jaykge1xuICAgICAgdGhpcy5sb2NrID0gdHJ1ZTtcbiAgICAgIHRoaXMuZGlmZigpO1xuICAgIH1cbiAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoXCJkYXRhVmlld0NoYW5nZWRcIiwge1wicGF0aFwiOiBwYXRofSk7XG4gICAgdGhpcy5kb20uZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIH1cbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmdldFJlbmRlck5vZGVGcm9tUGF0aCA9IGZ1bmN0aW9uKGRvbSkge1xuICB2YXIgcGF0aCA9IGRvbS5nZXRBdHRyaWJ1dGUoJ2xrLXBhdGgnKTtcbiAgdmFyIHJlbmRlck5vZGUgPSB0aGlzLmN1cnJlbnRUcmVlO1xuICB2YXIgYml0cyA9IHBhdGguc3BsaXQoXCIuXCIpLCBpO1xuICBmb3IoaT0xOyBpPGJpdHMubGVuZ3RoOyBpKyspIHtcbiAgICByZW5kZXJOb2RlID0gcmVuZGVyTm9kZS5jaGlsZHJlbltiaXRzW2ldXTtcbiAgfVxuICByZXR1cm4gcmVuZGVyTm9kZTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmFueUV2ZW50ID0gZnVuY3Rpb24oZSkge1xuICB2YXIgZG9tID0gZS50YXJnZXQ7XG4gIHZhciBsa0V2ZW50ID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstJyArIGUudHlwZSk7XG4gIGlmKCFsa0V2ZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciByZW5kZXJOb2RlID0gdGhpcy5nZXRSZW5kZXJOb2RlRnJvbVBhdGgoZG9tKTtcbiAgcmVuZGVyTm9kZS5ub2RlLmF0dHJzWydsay0nK2UudHlwZV0uZXZhbHVhdGUocmVuZGVyTm9kZS5jb250ZXh0KTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmJpbmRFdmVudHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGk7XG4gIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbihlKXsgdGhpcy5kYXRhRXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpeyB0aGlzLmRhdGFFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIHZhciBldmVudHMgPSBcImNsaWNrLGNoYW5nZSxtb3VzZW92ZXIsZm9jdXMsa2V5ZG93bixrZXl1cCxrZXlwcmVzcyxzdWJtaXQsYmx1clwiLnNwbGl0KCcsJyk7XG4gIGZvcihpPTA7IGk8ZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIGV2ZW50c1tpXSxcbiAgICAgIGZ1bmN0aW9uKGUpeyB0aGlzLmFueUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgfVxufTtcblxuQmluZGluZy5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5kaWZmKCk7XG59O1xuXG5mdW5jdGlvbiBDb21wb25lbnQobmFtZSwgdHBsLCBjb250cm9sbGVyKSB7XG4gIGlmKHRlbXBsYXRlLmNvbXBvbmVudENhY2hlW25hbWVdKSB7XG4gICAgdXRpbC5Db21waWxlRXJyb3IoXCJDb21wb25lbnQgd2l0aCBuYW1lIFwiICsgbmFtZSArIFwiIGFscmVhZHkgZXhpc3RcIik7XG4gIH1cbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRwbDtcbiAgdGhpcy5jb250cm9sbGVyID0gY29udHJvbGxlcjtcbiAgdGVtcGxhdGUuY29tcG9uZW50Q2FjaGVbbmFtZV0gPSB0aGlzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgVGVtcGxhdGU6dGVtcGxhdGUuYnVpbGRUZW1wbGF0ZSxcbiAgdXBkYXRlRGF0YTp1cGRhdGVEYXRhLFxuICBCaW5kaW5nOkJpbmRpbmcsXG4gIENvbXBvbmVudDpDb21wb25lbnQsXG4gIGdldERvbTpyZW5kZXIuZ2V0RG9tLFxuICBwYXJzZUV4cHJlc3Npb25zOmV4cHJlc3Npb24ucGFyc2VFeHByZXNzaW9ucyxcbiAgY29tcGlsZVRleHRBbmRFeHByZXNzaW9uczpleHByZXNzaW9uLmNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnMsXG4gIGJ1aWxkRXhwcmVzc2lvbnM6ZXhwcmVzc2lvbi5idWlsZEV4cHJlc3Npb25zLFxuICBleHByZXNzaW9uczp7XG4gICAgU3RyaW5nVmFsdWU6ZXhwcmVzc2lvbi5TdHJpbmdWYWx1ZVxuICB9LFxuICBhcHBseURpZmY6cmVuZGVyLmFwcGx5RGlmZixcbiAgZGlmZkNvc3Q6cmVuZGVyLmRpZmZDb3N0LFxuICBwYXJzZUF0dHJpYnV0ZXM6dGVtcGxhdGUucGFyc2VBdHRyaWJ1dGVzLFxuICBhdHRyaWJ1dGVzRGlmZjpyZW5kZXIuYXR0cmlidXRlc0RpZmYsXG4gIENvbnRleHQ6dGVtcGxhdGUuQ29udGV4dCxcbiAgQ29tcGlsZUVycm9yOnV0aWwuQ29tcGlsZUVycm9yLFxuICBSdW50aW1lRXJyb3I6dXRpbC5SdW50aW1lRXJyb3IsXG4gIGVzY2FwZTp1dGlsLmVzY2FwZSxcbiAgZXhwcmVzc2lvbjpleHByZXNzaW9uLFxuICBzZXRIYW5kaWNhcDpmdW5jdGlvbihuKXtyZW5kZXIuaGFuZGljYXAgPSBuO31cbn07XG4iLCIvKiBMaWtlbHkuanMgdmVyc2lvbiAwLjkuMSxcbiAgIFB5dGhvbiBzdHlsZSBIVE1MIHRlbXBsYXRlIGxhbmd1YWdlIHdpdGggYmktZGlyZWN0aW9ubmFsIGRhdGEgYmluZGluZ1xuICAgYmF0aXN0ZSBiaWVsZXIgMjAxNCAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIFJlbmRlcmVkTm9kZShub2RlLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCkge1xuICB0aGlzLmNoaWxkcmVuID0gW107XG4gIHRoaXMubm9kZSA9IG5vZGU7XG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMucmVuZGVyZXIgPSByZW5kZXJlcjtcbiAgdGhpcy5wYXRoID0gcGF0aCB8fCBcIlwiO1xuICAvLyBzaG9ydGN1dFxuICB0aGlzLm5vZGVOYW1lID0gbm9kZS5ub2RlTmFtZTtcbn1cblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGlmKGxldmVsID09PSB1bmRlZmluZWQpIHtcbiAgICBsZXZlbCA9IDA7XG4gIH1cbiAgZm9yKGk9MDsgaTxsZXZlbDsgaSsrKSB7XG4gICAgc3RyICs9IFwiICBcIjtcbiAgfVxuICBzdHIgKz0gU3RyaW5nKHRoaXMubm9kZSkgKyBcIiBwYXRoIFwiICsgdGhpcy5wYXRoICsgXCJcXHJcXG5cIjtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgc3RyICs9IHRoaXMuY2hpbGRyZW5baV0ucmVwcihsZXZlbCArIDEpO1xuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRvbVRyZWUgPSBmdW5jdGlvbihhcHBlbmRfdG8pIHtcbiAgdmFyIG5vZGUgPSBhcHBlbmRfdG8gfHwgdGhpcy5ub2RlLmRvbU5vZGUodGhpcy5jb250ZXh0LCB0aGlzLnBhdGgpLCBpLCBjaGlsZF90cmVlO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBjaGlsZF90cmVlID0gdGhpcy5jaGlsZHJlbltpXS5kb21UcmVlKCk7XG4gICAgaWYobm9kZS5wdXNoKSB7XG4gICAgICBub2RlLnB1c2goY2hpbGRfdHJlZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGRfdHJlZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBub2RlO1xufTtcblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5kb21IdG1sID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpO1xuICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgY2hpbGQgPSB0aGlzLmNoaWxkcmVuW2ldLmRvbVRyZWUoKTtcbiAgICBkLmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgfVxuICByZXR1cm4gZC5pbm5lckhUTUw7XG59O1xuXG5mdW5jdGlvbiBkaWZmQ29zdChkaWZmKSB7XG4gIHZhciB2YWx1ZT0wLCBpO1xuICBmb3IoaT0wOyBpPGRpZmYubGVuZ3RoOyBpKyspIHtcbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcInJlbW92ZVwiKSB7XG4gICAgICB2YWx1ZSArPSA1O1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICB2YWx1ZSArPSAyO1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICB2YWx1ZSArPSAxO1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcInN0cmluZ211dGF0ZVwiKSB7XG4gICAgICB2YWx1ZSArPSAxO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuX2RpZmYgPSBmdW5jdGlvbihyZW5kZXJlZF9ub2RlLCBhY2N1LCBwYXRoKSB7XG4gIHZhciBpLCBqLCBzb3VyY2VfcHQgPSAwO1xuICBpZihwYXRoID09PSB1bmRlZmluZWQpIHsgcGF0aCA9IFwiXCI7IH1cblxuICBpZighcmVuZGVyZWRfbm9kZSkge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgbm9kZTogdGhpcyxcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfVxuXG4gIGlmKHJlbmRlcmVkX25vZGUubm9kZS5ub2RlTmFtZSAhPSB0aGlzLm5vZGUubm9kZU5hbWUpIHtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgIG5vZGU6IHRoaXMsXG4gICAgICBwYXRoOiBwYXRoXG4gICAgfSk7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICBub2RlOiByZW5kZXJlZF9ub2RlLFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9XG5cbiAgLy8gQ291bGQgdXNlIGluaGVyaXRhbmNlIGZvciB0aGlzXG4gIGlmKHRoaXMubm9kZU5hbWUgPT0gXCJzdHJpbmdcIiAmJiB0aGlzLnJlbmRlcmVyICE9IHJlbmRlcmVkX25vZGUucmVuZGVyZXIpIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIGFjdGlvbjogJ3N0cmluZ211dGF0ZScsXG4gICAgICAgIG5vZGU6IHRoaXMsXG4gICAgICAgIHZhbHVlOiByZW5kZXJlZF9ub2RlLnJlbmRlcmVyLFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYV9kaWZmID0gYXR0cmlidXRlc0RpZmYodGhpcy5hdHRycywgcmVuZGVyZWRfbm9kZS5hdHRycyk7XG4gICAgaWYoYV9kaWZmLmxlbmd0aCkge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAnbXV0YXRlJyxcbiAgICAgICAgbm9kZTogdGhpcyxcbiAgICAgICAgYXR0cmlidXRlc0RpZmY6IGFfZGlmZixcbiAgICAgICAgcGF0aDogcGF0aFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGwxID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7XG4gIHZhciBsMiA9IHJlbmRlcmVkX25vZGUuY2hpbGRyZW4ubGVuZ3RoO1xuXG4gIC8vIG5vIHN3YXAgcG9zc2libGUsIGJ1dCBkZWxldGluZyBhIG5vZGUgaXMgcG9zc2libGVcbiAgaiA9IDA7IGkgPSAwOyBzb3VyY2VfcHQgPSAwO1xuICAvLyBsZXQncyBnb3QgdHJvdWdoIGFsbCB0aGUgY2hpbGRyZW5cbiAgZm9yKDsgaTxsMTsgaSsrKSB7XG4gICAgdmFyIGRpZmYgPSAwLCBhZnRlcl9zb3VyY2VfZGlmZiA9IDAsIGFmdGVyX3RhcmdldF9kaWZmID0gMCwgYWZ0ZXJfc291cmNlX2Nvc3Q9bnVsbCwgYWZ0ZXJfdGFyZ2V0X2Nvc3Q9bnVsbDtcbiAgICB2YXIgYWZ0ZXJfdGFyZ2V0ID0gcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqKzFdO1xuICAgIHZhciBhZnRlcl9zb3VyY2UgPSB0aGlzLmNoaWxkcmVuW2krMV07XG5cbiAgICBpZighcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSkge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgICAgbm9kZTogdGhpcy5jaGlsZHJlbltpXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIHNvdXJjZV9wdFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBkaWZmID0gdGhpcy5jaGlsZHJlbltpXS5fZGlmZihyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG5cbiAgICB2YXIgY29zdCA9IGRpZmZDb3N0KGRpZmYpO1xuICAgIC8vIGRvZXMgdGhlIG5leHQgc291cmNlIG9uZSBmaXRzIGJldHRlcj9cbiAgICBpZihhZnRlcl9zb3VyY2UpIHtcbiAgICAgIGFmdGVyX3NvdXJjZV9kaWZmID0gYWZ0ZXJfc291cmNlLl9kaWZmKHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcbiAgICAgIC8vIG5lZWRzIHNvbWUgaGFuZGljYXAgb3RoZXJ3aXNlIGlucHV0cyBjb250YWluaW5nIHRoZSBjdXJyZW50IGZvY3VzXG4gICAgICAvLyBtaWdodCBiZSByZW1vdmVkXG4gICAgICBhZnRlcl9zb3VyY2VfY29zdCA9IGRpZmZDb3N0KGFmdGVyX3NvdXJjZV9kaWZmKSArIG1vZHVsZS5leHBvcnRzLmhhbmRpY2FwO1xuICAgIH1cbiAgICAvLyBkb2VzIHRoZSBuZXh0IHRhcmdldCBvbmUgZml0cyBiZXR0ZXI/XG4gICAgaWYoYWZ0ZXJfdGFyZ2V0KSB7XG4gICAgICBhZnRlcl90YXJnZXRfZGlmZiA9IHRoaXMuY2hpbGRyZW5baV0uX2RpZmYoYWZ0ZXJfdGFyZ2V0LCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG4gICAgICBhZnRlcl90YXJnZXRfY29zdCA9IGRpZmZDb3N0KGFmdGVyX3RhcmdldF9kaWZmKSArIG1vZHVsZS5leHBvcnRzLmhhbmRpY2FwO1xuICAgIH1cblxuICAgIGlmKCghYWZ0ZXJfdGFyZ2V0IHx8IGNvc3QgPD0gYWZ0ZXJfdGFyZ2V0X2Nvc3QpICYmICghYWZ0ZXJfc291cmNlIHx8IGNvc3QgPD0gYWZ0ZXJfc291cmNlX2Nvc3QpKSB7XG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoZGlmZik7XG4gICAgICBzb3VyY2VfcHQgKz0gMTtcbiAgICB9IGVsc2UgaWYoYWZ0ZXJfc291cmNlICYmICghYWZ0ZXJfdGFyZ2V0IHx8IGFmdGVyX3NvdXJjZV9jb3N0IDw9IGFmdGVyX3RhcmdldF9jb3N0KSkge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2FmdGVyX3NvdXJjZScsXG4gICAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICAgIG5vZGU6IHRoaXMuY2hpbGRyZW5baV0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyBzb3VyY2VfcHRcbiAgICAgIH0pO1xuICAgICAgYWNjdSA9IGFjY3UuY29uY2F0KGFmdGVyX3NvdXJjZV9kaWZmKTtcbiAgICAgIHNvdXJjZV9wdCArPSAxO1xuICAgICAgaSsrO1xuICAgIH0gZWxzZSBpZihhZnRlcl90YXJnZXQpIHtcbiAgICAgIC8vIGltcG9ydGFudCB0byBhZGQgdGhlIGRpZmYgYmVmb3JlXG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoYWZ0ZXJfdGFyZ2V0X2RpZmYpO1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2FmdGVyX3RhcmdldCcsXG4gICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyAoc291cmNlX3B0KVxuICAgICAgfSk7XG4gICAgICBzb3VyY2VfcHQgKz0gMjtcbiAgICAgIGorKztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgXCJTaG91bGQgbmV2ZXIgaGFwcGVuXCI7XG4gICAgfVxuICAgIGorKztcbiAgfVxuXG4gIC8vIG5ldyBub2RlcyB0byBiZSBhZGRlZCBhZnRlciB0aGUgZGlmZlxuICBmb3IoaT0wOyBpPChsMi1qKTsgaSsrKSB7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICBub2RlOiByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2oraV0sXG4gICAgICBwYXRoOiBwYXRoICsgJy4nICsgKHNvdXJjZV9wdCArIDEpXG4gICAgfSk7XG4gICAgc291cmNlX3B0ICs9IDE7XG4gIH1cblxuICByZXR1cm4gYWNjdTtcblxufTtcblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5kaWZmID0gZnVuY3Rpb24ocmVuZGVyZWRfbm9kZSkge1xuICB2YXIgYWNjdSA9IFtdO1xuICByZXR1cm4gdGhpcy5fZGlmZihyZW5kZXJlZF9ub2RlLCBhY2N1KTtcbn07XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZXNEaWZmKGEsIGIpIHtcbiAgdmFyIGNoYW5nZXMgPSBbXSwga2V5O1xuICBmb3Ioa2V5IGluIGEpIHtcbiAgICAgIGlmKGJba2V5XSA9PT0gZmFsc2UpIHtcbiAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJyZW1vdmVcIiwga2V5OmtleX0pO1xuICAgICAgfSBlbHNlIGlmKGJba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmKGJba2V5XSAhPSBhW2tleV0pIHtcbiAgICAgICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcIm11dGF0ZVwiLCBrZXk6a2V5LCB2YWx1ZTpiW2tleV19KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJyZW1vdmVcIiwga2V5OmtleX0pO1xuICAgICAgfVxuICB9XG4gIGZvcihrZXkgaW4gYikge1xuICAgIGlmKGFba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcImFkZFwiLCBrZXk6a2V5LCB2YWx1ZTpiW2tleV19KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNoYW5nZXM7XG59XG5cbmZ1bmN0aW9uIGdldERvbShkb20sIHBhdGgsIHN0b3ApIHtcbiAgdmFyIGksIHA9cGF0aC5zcGxpdCgnLicpLCBkPWRvbTtcbiAgaWYoc3RvcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RvcCA9IDA7XG4gIH1cbiAgZm9yKGk9MDsgaTwocC5sZW5ndGggLSBzdG9wKTsgaSsrKSB7XG4gICAgaWYocFtpXSkgeyAvLyBmaXJzdCBvbmUgaXMgXCJcIlxuICAgICAgZCA9IGQuY2hpbGROb2Rlc1twYXJzZUludChwW2ldLCAxMCldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZDtcbn1cblxuZnVuY3Rpb24gYXBwbHlEaWZmKGRpZmYsIGRvbSkge1xuICB2YXIgaSwgaiwgX2RpZmYsIF9kb20sIHBhcmVudDtcbiAgZm9yKGk9MDsgaTxkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgX2RpZmYgPSBkaWZmW2ldO1xuICAgIF9kb20gPSBnZXREb20oZG9tLCBfZGlmZi5wYXRoKTtcbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgX2RvbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKF9kb20pO1xuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgdmFyIG5ld05vZGUgPSBfZGlmZi5ub2RlLmRvbVRyZWUoKTtcbiAgICAgIGlmKF9kb20pIHtcbiAgICAgICAgX2RvbS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShuZXdOb2RlLCBfZG9tKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGdldCB0aGUgcGFyZW50XG4gICAgICAgIHBhcmVudCA9IGdldERvbShkb20sIF9kaWZmLnBhdGgsIDEpO1xuICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQobmV3Tm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICBmb3Ioaj0wOyBqPF9kaWZmLmF0dHJpYnV0ZXNEaWZmLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBhX2RpZmYgPSBfZGlmZi5hdHRyaWJ1dGVzRGlmZltqXTtcbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICAgICAgLy8gaW1wb3J0YW50IGZvciBzZWxlY3RcbiAgICAgICAgICBpZihcInZhbHVlLHNlbGVjdGVkLGNoZWNrZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBpZihfZG9tW2FfZGlmZi5rZXldICE9IGFfZGlmZi52YWx1ZSkge1xuICAgICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gYV9kaWZmLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBfZG9tLnNldEF0dHJpYnV0ZShhX2RpZmYua2V5LCBhX2RpZmYudmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgICAgIGlmKFwiY2hlY2tlZCxzZWxlY3RlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5yZW1vdmVBdHRyaWJ1dGUoYV9kaWZmLmtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICAgICAgaWYoXCJjaGVja2VkLHNlbGVjdGVkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGFfZGlmZi52YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5zZXRBdHRyaWJ1dGUoYV9kaWZmLmtleSwgYV9kaWZmLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJzdHJpbmdtdXRhdGVcIikge1xuICAgICAgX2RvbS5ub2RlVmFsdWUgPSBfZGlmZi52YWx1ZTtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFJlbmRlcmVkTm9kZTpSZW5kZXJlZE5vZGUsXG4gIGFwcGx5RGlmZjphcHBseURpZmYsXG4gIGF0dHJpYnV0ZXNEaWZmOmF0dHJpYnV0ZXNEaWZmLFxuICBkaWZmQ29zdDpkaWZmQ29zdCxcbiAgZ2V0RG9tOmdldERvbSxcbiAgaGFuZGljYXA6MVxufTsiLCIvKiBMaWtlbHkuanMgdmVyc2lvbiAwLjkuMSxcbiAgIFB5dGhvbiBzdHlsZSBIVE1MIHRlbXBsYXRlIGxhbmd1YWdlIHdpdGggYmktZGlyZWN0aW9ubmFsIGRhdGEgYmluZGluZ1xuICAgYmF0aXN0ZSBiaWVsZXIgMjAxNCAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJyk7XG52YXIgZXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vZXhwcmVzc2lvbicpO1xuXG52YXIgdGVtcGxhdGVDYWNoZSA9IHt9O1xudmFyIGNvbXBvbmVudENhY2hlID0ge307XG4vLyBhIG5hbWUgaGVyZSBpcyBhbHNvIGFueSB2YWxpZCBKUyBvYmplY3QgcHJvcGVydHlcbnZhciBWQVJOQU1FX1JFRyA9IC9eW2EtekEtWl8kXVswLTlhLXpBLVpfJF0qLztcbnZhciBIVE1MX0FUVFJfUkVHID0gL15bQS1aYS16XVtcXHctXXswLH0vO1xudmFyIERPVUJMRV9RVU9URURfU1RSSU5HX1JFRyA9IC9eXCIoXFxcXFwifFteXCJdKSpcIi87XG5cbmZ1bmN0aW9uIENvbnRleHQoZGF0YSwgcGFyZW50KSB7XG4gIHRoaXMuZGF0YSA9IGRhdGE7XG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB0aGlzLmFsaWFzZXMgPSB7fTtcbiAgdGhpcy53YXRjaGluZyA9IHt9O1xufVxuXG5Db250ZXh0LnByb3RvdHlwZS5hZGRBbGlhcyA9IGZ1bmN0aW9uKHNvdXJjZU5hbWUsIGFsaWFzTmFtZSkge1xuICAvLyBzb3VyY2UgbmFtZSBjYW4gYmUgJ25hbWUnIG9yICdsaXN0LmtleSdcbiAgaWYoc291cmNlTmFtZSA9PT0gYWxpYXNOYW1lKSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiQWxpYXMgd2l0aCB0aGUgc2FtZSBuYW1lIGFkZGVkIGluIHRoaXMgY29udGV4dC5cIik7XG4gIH1cbiAgdGhpcy5hbGlhc2VzW2FsaWFzTmFtZV0gPSBzb3VyY2VOYW1lO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUucmVzb2x2ZU5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIC8vIGdpdmVuIGEgbmFtZSwgcmV0dXJuIHRoZSBbQ29udGV4dCwgcmVzb2x2ZWQgcGF0aCwgdmFsdWVdIHdoZW5cbiAgLy8gdGhpcyBuYW1lIGlzIGZvdW5kIG9yIHVuZGVmaW5lZFxuXG4gIHZhciByZW1haW5pbmcgPSAnJywgbmFtZV9zdGFydCA9IG5hbWUsIGJpdHMgPSBbXTtcblxuICBpZihuYW1lX3N0YXJ0LmluZGV4T2YoXCIuXCIpICE9IC0xKSB7XG4gICAgYml0cyA9IG5hbWVfc3RhcnQuc3BsaXQoXCIuXCIpO1xuICAgIG5hbWVfc3RhcnQgPSBiaXRzWzBdO1xuICAgIHJlbWFpbmluZyA9ICcuJyArIGJpdHMuc2xpY2UoMSkuam9pbignLicpO1xuICB9XG4gIFxuICBpZih0aGlzLmFsaWFzZXMuaGFzT3duUHJvcGVydHkobmFtZV9zdGFydCkpIHtcbiAgICBuYW1lX3N0YXJ0ID0gdGhpcy5hbGlhc2VzW25hbWVfc3RhcnRdO1xuICAgIHJldHVybiB0aGlzLnJlc29sdmVOYW1lKG5hbWVfc3RhcnQgKyByZW1haW5pbmcpO1xuICB9XG5cbiAgaWYodGhpcy5kYXRhLmhhc093blByb3BlcnR5KG5hbWVfc3RhcnQpKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5kYXRhW25hbWVfc3RhcnRdO1xuICAgIHZhciBpID0gMTtcbiAgICB3aGlsZShpIDwgYml0cy5sZW5ndGgpIHtcbiAgICAgIGlmKCF2YWx1ZS5oYXNPd25Qcm9wZXJ0eShiaXRzW2ldKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSB2YWx1ZVtiaXRzW2ldXTtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgcmV0dXJuIFt0aGlzLCBuYW1lX3N0YXJ0ICsgcmVtYWluaW5nLCB2YWx1ZV07XG4gIH1cblxuICBpZih0aGlzLnBhcmVudCkge1xuICAgIHJldHVybiB0aGlzLnBhcmVudC5yZXNvbHZlTmFtZShuYW1lX3N0YXJ0ICsgcmVtYWluaW5nKTtcbiAgfVxuXG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5nZXROYW1lUGF0aCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHJlc29sdmVkID0gdGhpcy5yZXNvbHZlTmFtZShuYW1lKTtcbiAgaWYocmVzb2x2ZWQpIHtcbiAgICByZXR1cm4gJy4nICsgcmVzb2x2ZWRbMV07XG4gIH0gZWxzZSB7XG4gIH1cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAgY29uc29sZS5sb2coXCJ3YXRjaFwiLCB0aGlzLmFsaWFzZXMsIG5hbWUpO1xuICB0aGlzLndhdGNoaW5nW25hbWVdID0gY2FsbGJhY2s7XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG5cbiAgdmFyIHJlc29sdmVkID0gdGhpcy5yZXNvbHZlTmFtZShuYW1lKTtcbiAgaWYocmVzb2x2ZWQpIHtcbiAgICByZXR1cm4gcmVzb2x2ZWRbMl07XG4gIH1cblxuICAvLyBxdWljayBwYXRoXG4gIGlmKG5hbWUuaW5kZXhPZihcIi5cIikgPT0gLTEpIHtcbiAgICBpZih0aGlzLmRhdGEuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmRhdGFbbmFtZV07XG4gICAgfVxuICAgIGlmKHRoaXMucGFyZW50KSB7XG4gICAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0KG5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiaXRzID0gbmFtZS5zcGxpdChcIi5cIik7XG4gIHZhciBkYXRhID0gdGhpcy5kYXRhO1xuICAvLyB3ZSBnbyBpbiBmb3IgYSBzZWFyY2ggaWYgdGhlIGZpcnN0IHBhcnQgbWF0Y2hlc1xuICBpZihkYXRhLmhhc093blByb3BlcnR5KGJpdHNbMF0pKSB7XG4gICAgZGF0YSA9IGRhdGFbYml0c1swXV07XG4gICAgdmFyIGkgPSAxO1xuICAgIHdoaWxlKGkgPCBiaXRzLmxlbmd0aCkge1xuICAgICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYml0c1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGRhdGEgPSBkYXRhW2JpdHNbaV1dO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuICAvLyBkYXRhIG5vdCBmb3VuZCwgbGV0J3Mgc2VhcmNoIGluIHRoZSBwYXJlbnRcbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0KG5hbWUpO1xuICB9XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuXG4gIGNvbnNvbGUubG9nKHRoaXMsIG5hbWUsIHZhbHVlKVxuICBpZih0aGlzLndhdGNoaW5nLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgdGhpcy53YXRjaGluZ1tuYW1lXSh2YWx1ZSk7XG4gIH1cblxuICAvLyBxdWljayBwYXRoXG4gIGlmKG5hbWUuaW5kZXhPZihcIi5cIikgPT0gLTEpIHtcbiAgICBpZih0aGlzLmRhdGEuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgIHRoaXMuZGF0YVtuYW1lXSA9IHZhbHVlO1xuICAgIH1cbiAgICBpZih0aGlzLnBhcmVudCkge1xuICAgICAgdGhpcy5wYXJlbnQubW9kaWZ5KG5hbWUsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYml0cyA9IG5hbWUuc3BsaXQoXCIuXCIpO1xuICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcbiAgLy8gd2UgZ28gaW4gZm9yIGEgc2VhcmNoIGlmIHRoZSBmaXJzdCBwYXJ0IG1hdGNoZXNcbiAgaWYoZGF0YS5oYXNPd25Qcm9wZXJ0eShiaXRzWzBdKSkge1xuICAgIGRhdGEgPSBkYXRhW2JpdHNbMF1dO1xuICAgIHZhciBpID0gMTtcbiAgICB3aGlsZShpIDwgYml0cy5sZW5ndGggLSAxKSB7XG4gICAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShiaXRzW2ldKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBkYXRhID0gZGF0YVtiaXRzW2ldXTtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgZGF0YVtiaXRzW2ldXSA9IHZhbHVlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIC8vIGRhdGEgbm90IGZvdW5kLCBsZXQncyBzZWFyY2ggaW4gdGhlIHBhcmVudFxuICBpZih0aGlzLnBhcmVudCkge1xuICAgIHJldHVybiB0aGlzLnBhcmVudC5tb2RpZnkobmFtZSwgdmFsdWUpO1xuICB9XG5cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHRoaXMuZGF0YVtuYW1lXSA9IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZXModiwgbm9kZSkge1xuICAgIHZhciBhdHRycyA9IHt9LCBuLCBzO1xuICAgIHdoaWxlKHYpIHtcbiAgICAgICAgdiA9IHV0aWwudHJpbSh2KTtcbiAgICAgICAgbiA9IHYubWF0Y2goSFRNTF9BVFRSX1JFRyk7XG4gICAgICAgIGlmKCFuKSB7XG4gICAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIGF0dHJpYnV0ZSBuYW1lIGZvdW5kIGluIFwiK3YpO1xuICAgICAgICB9XG4gICAgICAgIHYgPSB2LnN1YnN0cihuWzBdLmxlbmd0aCk7XG4gICAgICAgIG4gPSBuWzBdO1xuICAgICAgICBpZih2WzBdICE9IFwiPVwiKSB7XG4gICAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIGVxdWFsIHNpZ24gYWZ0ZXIgbmFtZSBcIituKTtcbiAgICAgICAgfVxuICAgICAgICB2ID0gdi5zdWJzdHIoMSk7XG4gICAgICAgIHMgPSB2Lm1hdGNoKERPVUJMRV9RVU9URURfU1RSSU5HX1JFRyk7XG4gICAgICAgIGlmKHMpIHtcbiAgICAgICAgICBhdHRyc1tuXSA9IG5ldyBTdHJpbmdOb2RlKG51bGwsIHNbMF0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMgPSB2Lm1hdGNoKGV4cHJlc3Npb24uRVhQUkVTU0lPTl9SRUcpO1xuICAgICAgICAgIGlmKHMgPT09IG51bGwpIHtcbiAgICAgICAgICAgIG5vZGUuY2Vycm9yKFwicGFyc2VBdHRyaWJ1dGVzOiBObyBzdHJpbmcgb3IgZXhwcmVzc2lvbiBmb3VuZCBhZnRlciBuYW1lIFwiK24pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZXhwciA9IGV4cHJlc3Npb24uYnVpbGQoc1sxXSk7XG4gICAgICAgICAgICBhdHRyc1tuXSA9IGV4cHI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHYgPSB2LnN1YnN0cihzWzBdLmxlbmd0aCk7XG4gICAgfVxuICAgIHJldHVybiBhdHRycztcbn1cblxuLy8gYWxsIHRoZSBhdmFpbGFibGUgdGVtcGxhdGUgbm9kZVxuXG5mdW5jdGlvbiBOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgdGhpcy5saW5lID0gbGluZTtcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuY29udGVudCA9IGNvbnRlbnQ7XG4gIHRoaXMubGV2ZWwgPSBsZXZlbDtcbiAgdGhpcy5jaGlsZHJlbiA9IFtdO1xufVxuXG5Ob2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGlmKGxldmVsID09PSB1bmRlZmluZWQpIHtcbiAgICBsZXZlbCA9IDA7XG4gIH1cbiAgZm9yKGk9MDsgaTxsZXZlbDsgaSsrKSB7XG4gICAgc3RyICs9IFwiICBcIjtcbiAgfVxuICBzdHIgKz0gU3RyaW5nKHRoaXMpICsgXCJcXHJcXG5cIjtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgc3RyICs9IHRoaXMuY2hpbGRyZW5baV0ucmVwcihsZXZlbCArIDEpO1xuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIGlmKHBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHBhdGggPSAnJztcbiAgICBwb3MgPSAwO1xuICAgIHRoaXMuaXNSb290ID0gdHJ1ZTtcbiAgfVxuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsICcnLCBwYXRoKTtcbiAgdC5jaGlsZHJlbiA9IHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gIHJldHVybiB0O1xufTtcblxuTm9kZS5wcm90b3R5cGUuY2Vycm9yID0gZnVuY3Rpb24obXNnKSB7XG4gIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcih0aGlzLnRvU3RyaW5nKCkgKyBcIjogXCIgKyBtc2cpO1xufTtcblxuTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gW107XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50cmVlQ2hpbGRyZW4gPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBbXSwgaSwgcCwgaiwgY2hpbGRyZW4gPSBudWxsLCBjaGlsZCA9IG51bGw7XG4gIGogPSBwb3M7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHAgPSBwYXRoO1xuICAgIGNoaWxkID0gdGhpcy5jaGlsZHJlbltpXTtcbiAgICBpZihjaGlsZC5oYXNPd25Qcm9wZXJ0eSgnbm9kZU5hbWUnKSkge1xuICAgICAgcCArPSAnLicgKyBqO1xuICAgICAgaisrO1xuICAgICAgY2hpbGRyZW4gPSBjaGlsZC50cmVlKGNvbnRleHQsIHAsIDApO1xuICAgICAgdC5wdXNoKGNoaWxkcmVuKTtcbiAgICB9IGVsc2UgaWYgKCFjaGlsZC5yZW5kZXJFeGxjdWRlZCkge1xuICAgICAgY2hpbGRyZW4gPSBjaGlsZC50cmVlKGNvbnRleHQsIHAsIGopO1xuICAgICAgaWYoY2hpbGRyZW4pIHtcbiAgICAgICAgdCA9IHQuY29uY2F0KGNoaWxkcmVuKTtcbiAgICAgICAgaiArPSBjaGlsZHJlbi5sZW5ndGg7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0O1xufTtcblxuTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbihjaGlsZCkge1xuICB0aGlzLmNoaWxkcmVuLnB1c2goY2hpbGQpO1xufTtcblxuTm9kZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZSArIFwiKFwiK3RoaXMuY29udGVudC5yZXBsYWNlKFwiXFxuXCIsIFwiXCIpK1wiKSBhdCBsaW5lIFwiICsgdGhpcy5saW5lO1xufTtcblxuZnVuY3Rpb24gQ29tbWVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHBhcmVudC5jaGlsZHJlbi5wdXNoKHRoaXMpO1xuICB0aGlzLnJlbmRlckV4bGN1ZGVkID0gdHJ1ZTtcbn1cbnV0aWwuaW5oZXJpdHMoQ29tbWVudE5vZGUsIE5vZGUpO1xuXG5mdW5jdGlvbiBIdG1sTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IHRoaXMuY29udGVudC5zcGxpdChcIiBcIilbMF07XG4gIHRoaXMuYXR0cnMgPSBwYXJzZUF0dHJpYnV0ZXModGhpcy5jb250ZW50LnN1YnN0cih0aGlzLm5vZGVOYW1lLmxlbmd0aCksIHRoaXMpO1xuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEh0bWxOb2RlLCBOb2RlKTtcblxuSHRtbE5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCB0aGlzLmRvbU5vZGUoY29udGV4dCwgcGF0aCksIHBhdGgpO1xuICB0LmF0dHJzID0gdGhpcy5yZW5kZXJBdHRyaWJ1dGVzKGNvbnRleHQsIHBhdGgpO1xuICB0LmNoaWxkcmVuID0gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5mdW5jdGlvbiBiaW5kaW5nUGF0aE5hbWUobm9kZSwgY29udGV4dCkge1xuICB2YXIgbmFtZSA9IGJpbmRpbmdOYW1lKG5vZGUpO1xuICBpZihuYW1lKSB7XG4gICAgcmV0dXJuIGNvbnRleHQuZ2V0TmFtZVBhdGgoYmluZGluZ05hbWUobm9kZSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJpbmRpbmdOYW1lKG5vZGUpIHtcbiAgaWYobm9kZSBpbnN0YW5jZW9mIGV4cHJlc3Npb24uTmFtZSkge1xuICAgIHJldHVybiBub2RlLm5hbWU7XG4gIH1cbiAgaWYobm9kZSBpbnN0YW5jZW9mIFN0cmluZ05vZGUgJiYgbm9kZS5jb21waWxlZEV4cHJlc3Npb24ubGVuZ3RoID09IDEgJiZcbiAgICAgIG5vZGUuY29tcGlsZWRFeHByZXNzaW9uWzBdIGluc3RhbmNlb2YgZXhwcmVzc2lvbi5OYW1lKSB7XG4gICAgcmV0dXJuIG5vZGUuY29tcGlsZWRFeHByZXNzaW9uWzBdLm5hbWU7XG4gIH1cbn1cblxuSHRtbE5vZGUucHJvdG90eXBlLnJlbmRlckF0dHJpYnV0ZXMgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIHZhciByX2F0dHJzID0ge30sIGtleSwgYXR0ciwgcDtcbiAgZm9yKGtleSBpbiB0aGlzLmF0dHJzKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnNba2V5XTtcbiAgICAvLyB0b2RvLCBmaW5kIGEgYmV0dGVyIHdheSB0byBkaXNjcmltaW5hdGUgZXZlbnRzXG4gICAgaWYoa2V5LmluZGV4T2YoXCJsay1cIikgPT09IDApIHtcbiAgICAgIC8vIGFkZCB0aGUgcGF0aCB0byB0aGUgcmVuZGVyIG5vZGUgdG8gYW55IGxrLXRoaW5nIG5vZGVcbiAgICAgIHJfYXR0cnNbJ2xrLXBhdGgnXSA9IHBhdGg7XG4gICAgICByX2F0dHJzW2tleV0gPSBhdHRyO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmKGF0dHIuZXZhbHVhdGUpIHtcbiAgICAgIHZhciB2ID0gYXR0ci5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICAgIGlmKHYgPT09IGZhbHNlKSB7XG4gICAgICAgIC8vIG5vdGhpbmdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJfYXR0cnNba2V5XSA9IHY7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJfYXR0cnNba2V5XSA9IGF0dHI7XG4gICAgfVxuICB9XG4gIGlmKFwiaW5wdXQsc2VsZWN0LHRleHRhcmVhXCIuaW5kZXhPZih0aGlzLm5vZGVOYW1lKSAhPSAtMSAmJiB0aGlzLmF0dHJzLmhhc093blByb3BlcnR5KCd2YWx1ZScpKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnMudmFsdWU7XG4gICAgcCA9IGJpbmRpbmdQYXRoTmFtZShhdHRyLCBjb250ZXh0KTtcbiAgICBpZihwICYmIHRoaXMuYXR0cnNbJ2xrLWJpbmQnXSA9PT0gdW5kZWZpbmVkKXtcbiAgICAgIHJfYXR0cnNbJ2xrLWJpbmQnXSA9IHA7XG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgIH1cbiAgfVxuICBpZih0aGlzLm5vZGVOYW1lID09IFwidGV4dGFyZWFcIiAmJiB0aGlzLmNoaWxkcmVuLmxlbmd0aCA9PSAxKSB7XG4gICAgcCA9IGJpbmRpbmdQYXRoTmFtZSh0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIGlmKHAgJiYgdGhpcy5hdHRyc1snbGstYmluZCddID09PSB1bmRlZmluZWQpe1xuICAgICAgcl9hdHRyc1snbGstYmluZCddID0gcDtcbiAgICAgIHJfYXR0cnNbJ2xrLXBhdGgnXSA9IHBhdGg7XG4gICAgICAvLyBhcyBzb29uIGFzIHRoZSB1c2VyIGhhcyBhbHRlcmVkIHRoZSB2YWx1ZSBvZiB0aGUgdGV4dGFyZWEgb3Igc2NyaXB0IGhhcyBhbHRlcmVkXG4gICAgICAvLyB0aGUgdmFsdWUgcHJvcGVydHkgb2YgdGhlIHRleHRhcmVhLCB0aGUgdGV4dCBub2RlIGlzIG91dCBvZiB0aGUgcGljdHVyZSBhbmQgaXMgbm9cbiAgICAgIC8vIGxvbmdlciBib3VuZCB0byB0aGUgdGV4dGFyZWEncyB2YWx1ZSBpbiBhbnkgd2F5LlxuICAgICAgcl9hdHRycy52YWx1ZSA9IHRoaXMuY2hpbGRyZW5bMF0uZXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJfYXR0cnM7XG59O1xuXG5IdG1sTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRoaXMubm9kZU5hbWUpLCBrZXksIGF0dHJzPXRoaXMucmVuZGVyQXR0cmlidXRlcyhjb250ZXh0LCBwYXRoKTtcbiAgZm9yKGtleSBpbiBhdHRycykge1xuICAgIG5vZGUuc2V0QXR0cmlidXRlKGtleSwgYXR0cnNba2V5XSk7XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59O1xuXG5mdW5jdGlvbiBGb3JOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgLy8gc3ludGF4OiBmb3Iga2V5LCB2YWx1ZSBpbiBsaXN0XG4gIC8vICAgICAgICAgZm9yIHZhbHVlIGluIGxpc3RcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB2YXIgdmFyMSwgdmFyMiwgc291cmNlTmFtZTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cig0KSk7XG4gIHZhcjEgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgaWYoIXZhcjEpIHtcbiAgICB0aGlzLmNlcnJvcihcImZpcnN0IHZhcmlhYmxlIG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHZhcjFbMF0ubGVuZ3RoKSk7XG4gIGlmKGNvbnRlbnRbMF0gPT0gJywnKSB7XG4gICAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cigxKSk7XG4gICAgdmFyMiA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICAgIGlmKCF2YXIyKSB7XG4gICAgICB0aGlzLmNlcnJvcihcInNlY29uZCB2YXJpYWJsZSBhZnRlciBjb21tYSBpcyBtaXNzaW5nXCIpO1xuICAgIH1cbiAgICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHZhcjJbMF0ubGVuZ3RoKSk7XG4gIH1cbiAgaWYoIWNvbnRlbnQubWF0Y2goL15pbi8pKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJpbiBrZXl3b3JkIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cigyKSk7XG4gIHNvdXJjZU5hbWUgPSBjb250ZW50Lm1hdGNoKGV4cHJlc3Npb24uTmFtZS5yZWcpO1xuICBpZighc291cmNlTmFtZSkge1xuICAgIHRoaXMuY2Vycm9yKFwiaXRlcmFibGUgbmFtZSBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIHRoaXMuc291cmNlTmFtZSA9IHNvdXJjZU5hbWVbMF07XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoc291cmNlTmFtZVswXS5sZW5ndGgpKTtcbiAgaWYoY29udGVudCAhPT0gXCJcIikge1xuICAgIHRoaXMuY2Vycm9yKFwibGVmdCBvdmVyIHVucGFyc2FibGUgY29udGVudDogXCIgKyBjb250ZW50KTtcbiAgfVxuXG4gIGlmKHZhcjEgJiYgdmFyMikge1xuICAgIHRoaXMuaW5kZXhOYW1lID0gdmFyMTtcbiAgICB0aGlzLmFsaWFzID0gdmFyMlswXTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmFsaWFzID0gdmFyMVswXTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEZvck5vZGUsIE5vZGUpO1xuXG5Gb3JOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gW10sIGtleTtcbiAgdmFyIGQgPSBjb250ZXh0LmdldCh0aGlzLnNvdXJjZU5hbWUpO1xuICBmb3Ioa2V5IGluIGQpIHtcbiAgICAvLyBwdXR0aW5nIHRoZSBhbGlhcyBpbiB0aGUgY29udGV4dFxuICAgIHZhciBuZXdfZGF0YSA9IHt9O1xuICAgIG5ld19kYXRhW3RoaXMuYWxpYXNdID0gZFtrZXldO1xuICAgIC8vIGFkZCB0aGUga2V5IHRvIGFjY2VzcyB0aGUgY29udGV4dFxuICAgIGlmKHRoaXMuaW5kZXhOYW1lKSB7XG4gICAgICAgIG5ld19kYXRhW3RoaXMuaW5kZXhOYW1lXSA9IGtleTtcbiAgICB9XG4gICAgdmFyIG5ld19jb250ZXh0ID0gbmV3IENvbnRleHQobmV3X2RhdGEsIGNvbnRleHQpO1xuICAgIC8vIGtlZXAgdHJhY2sgb2Ygd2hlcmUgdGhlIGRhdGEgaXMgY29taW5nIGZyb21cbiAgICBuZXdfY29udGV4dC5hZGRBbGlhcyh0aGlzLnNvdXJjZU5hbWUgKyAnLicgKyBrZXksIHRoaXMuYWxpYXMpO1xuICAgIHQgPSB0LmNvbmNhdCh0aGlzLnRyZWVDaGlsZHJlbihuZXdfY29udGV4dCwgcGF0aCwgdC5sZW5ndGggKyBwb3MpKTtcbiAgfVxuICByZXR1cm4gdDtcbn07XG5cbmZ1bmN0aW9uIElmTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5idWlsZChjb250ZW50LnJlcGxhY2UoL15pZi9nLCBcIlwiKSk7XG4gIHBhcmVudC5jaGlsZHJlbi5wdXNoKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhJZk5vZGUsIE5vZGUpO1xuXG5JZk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgaWYoIXRoaXMuZXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KSkge1xuICAgIGlmKHRoaXMuZWxzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZWxzZS50cmVlKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICByZXR1cm4gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIEVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5zZWFyY2hJZihjdXJyZW50Tm9kZSk7XG59XG51dGlsLmluaGVyaXRzKEVsc2VOb2RlLCBOb2RlKTtcblxuRWxzZU5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgcmV0dXJuIHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5mdW5jdGlvbiBJZkVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5idWlsZChjb250ZW50LnJlcGxhY2UoL15lbHNlaWYvZywgXCJcIikpO1xuICB0aGlzLnNlYXJjaElmKGN1cnJlbnROb2RlKTtcbn1cbi8vIGltcG9ydGFudCB0byBiZSBhbiBJZk5vZGVcbnV0aWwuaW5oZXJpdHMoSWZFbHNlTm9kZSwgSWZOb2RlKTtcblxuSWZFbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWYgPSBmdW5jdGlvbiBzZWFyY2hJZihjdXJyZW50Tm9kZSkge1xuICAvLyBmaXJzdCBub2RlIG9uIHRoZSBzYW1lIGxldmVsIGhhcyB0byBiZSB0aGUgaWYvZWxzZWlmIG5vZGVcbiAgd2hpbGUoY3VycmVudE5vZGUpIHtcbiAgICBpZihjdXJyZW50Tm9kZS5sZXZlbCA8IHRoaXMubGV2ZWwpIHtcbiAgICAgIHRoaXMuY2Vycm9yKFwiY2Fubm90IGZpbmQgYSBjb3JyZXNwb25kaW5nIGlmLWxpa2Ugc3RhdGVtZW50IGF0IHRoZSBzYW1lIGxldmVsLlwiKTtcbiAgICB9XG4gICAgaWYoY3VycmVudE5vZGUubGV2ZWwgPT0gdGhpcy5sZXZlbCkge1xuICAgICAgaWYoIShjdXJyZW50Tm9kZSBpbnN0YW5jZW9mIElmTm9kZSkpIHtcbiAgICAgICAgdGhpcy5jZXJyb3IoXCJhdCB0aGUgc2FtZSBsZXZlbCBpcyBub3QgYSBpZi1saWtlIHN0YXRlbWVudC5cIik7XG4gICAgICB9XG4gICAgICBjdXJyZW50Tm9kZS5lbHNlID0gdGhpcztcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjdXJyZW50Tm9kZSA9IGN1cnJlbnROb2RlLnBhcmVudDtcbiAgfVxufTtcbkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZiA9IElmRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmO1xuXG5mdW5jdGlvbiBFeHByZXNzaW9uTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IFwic3RyaW5nXCI7XG4gIHZhciBtID0gY29udGVudC5tYXRjaChleHByZXNzaW9uLkVYUFJFU1NJT05fUkVHKTtcbiAgaWYoIW0pIHtcbiAgICB0aGlzLmNlcnJvcihcImRlY2xhcmVkIGltcHJvcGVybHlcIik7XG4gIH1cbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5idWlsZChtWzFdKTtcbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhFeHByZXNzaW9uTm9kZSwgTm9kZSk7XG5cbkV4cHJlc3Npb25Ob2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICAvLyByZW5kZXJlclxuICB2YXIgcmVuZGVyZXIgPSBTdHJpbmcodGhpcy5leHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpKTtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCk7XG4gIHJldHVybiB0O1xufTtcblxuRXhwcmVzc2lvbk5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0aGlzLmV4cHJlc3Npb24uZXZhbHVhdGUoY29udGV4dCkpO1xufTtcblxuZnVuY3Rpb24gU3RyaW5nTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IFwic3RyaW5nXCI7XG4gIHRoaXMuc3RyaW5nID0gdGhpcy5jb250ZW50LnJlcGxhY2UoL15cInxcIiQvZywgXCJcIikucmVwbGFjZSgvXFxcXFwiL2csICdcIicsICdnbScpO1xuICB0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uY29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyh0aGlzLnN0cmluZyk7XG4gIGlmKHBhcmVudCkge1xuICAgIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbiAgfVxufVxudXRpbC5pbmhlcml0cyhTdHJpbmdOb2RlLCBOb2RlKTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgLy8gcmVuZGVyZXIgc2hvdWxkIGJlIGFsbCBhdHRyaWJ1dGVzXG4gIHZhciByZW5kZXJlciA9IGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCk7XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgcmVuZGVyZXIsIHBhdGgpO1xuICByZXR1cm4gdDtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KTtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpKTtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24oY2hpbGQpIHtcbiAgdGhpcy5jZXJyb3IoXCJjYW5ub3QgaGF2ZSBjaGlsZHJlblwiKTtcbn07XG5cbmZ1bmN0aW9uIEluY2x1ZGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5hbWUgPSB1dGlsLnRyaW0oY29udGVudC5zcGxpdChcIiBcIilbMV0pO1xuICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZVt0aGlzLm5hbWVdO1xuICBpZih0aGlzLnRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLmNlcnJvcihcIlRlbXBsYXRlIHdpdGggbmFtZSBcIiArIHRoaXMubmFtZSArIFwiIGlzIG5vdCByZWdpc3RlcmVkXCIpO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSW5jbHVkZU5vZGUsIE5vZGUpO1xuXG5JbmNsdWRlTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZS50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIENvbXBvbmVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudCkuc3Vic3RyKDEwKTtcbiAgdmFyIG5hbWUgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgaWYoIW5hbWUpIHtcbiAgICB0aGlzLmNlcnJvcihcIkNvbXBvbmVudCBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cihuYW1lWzBdLmxlbmd0aCkpO1xuICB0aGlzLm5hbWUgPSBuYW1lWzBdO1xuICB0aGlzLmF0dHJzID0gcGFyc2VBdHRyaWJ1dGVzKGNvbnRlbnQsIHRoaXMpO1xuICB0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudENhY2hlW3RoaXMubmFtZV07XG4gIGlmKHRoaXMuY29tcG9uZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLmNlcnJvcihcIkNvbXBvbmVudCB3aXRoIG5hbWUgXCIgKyB0aGlzLm5hbWUgKyBcIiBpcyBub3QgcmVnaXN0ZXJlZFwiKTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKENvbXBvbmVudE5vZGUsIE5vZGUpO1xuXG5Db21wb25lbnROb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciBuZXdfY29udGV4dCA9IG5ldyBDb250ZXh0KHt9LCBjb250ZXh0KTtcbiAgdmFyIGtleSwgYXR0ciwgdmFsdWUsIHNvdXJjZTtcbiAgZm9yKGtleSBpbiB0aGlzLmF0dHJzKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnNba2V5XTtcbiAgICBpZihhdHRyLmV2YWx1YXRlKSB7XG4gICAgICB2YWx1ZSA9IGF0dHIuZXZhbHVhdGUoY29udGV4dCk7XG4gICAgICAvLyB0b2RvIDogaWYgZXhwcmVzc2lvbiBhdHRyaWJ1dGUsIGFkZCBhbiBhbGlhc1xuICAgICAgaWYodmFsdWUgPT09IGZhbHNlKSB7XG4gICAgICAgIC8vIG5vdGhpbmdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld19jb250ZXh0LnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgc291cmNlID0gYmluZGluZ05hbWUoYXR0cik7XG4gICAgICAgIGlmKHNvdXJjZSkge1xuICAgICAgICAgIG5ld19jb250ZXh0LmFkZEFsaWFzKHNvdXJjZSwga2V5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvL25ld19jb250ZXh0LnNldChrZXksIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgaWYodGhpcy5jb21wb25lbnQuY29udHJvbGxlcil7XG4gICAgdGhpcy5jb21wb25lbnQuY29udHJvbGxlcihuZXdfY29udGV4dCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuY29tcG9uZW50LnRlbXBsYXRlLnRyZWVDaGlsZHJlbihuZXdfY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgdmFyIG5vZGU7XG4gIGlmKGNvbnRlbnQubGVuZ3RoID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBTdHJpbmdOb2RlKHBhcmVudCwgXCJcXG5cIiwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJyMnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgQ29tbWVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignaWYgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IElmTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdlbHNlaWYgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IElmRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxLCBjdXJyZW50Tm9kZSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2Vsc2UnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxLCBjdXJyZW50Tm9kZSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2ZvciAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRm9yTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdpbmNsdWRlICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBJbmNsdWRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdjb21wb25lbnQgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IENvbXBvbmVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignXCInKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgU3RyaW5nTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoL15cXHcvLmV4ZWMoY29udGVudCkpIHtcbiAgICBub2RlID0gbmV3IEh0bWxOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ3t7JykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEV4cHJlc3Npb25Ob2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiY3JlYXRlTm9kZTogdW5rbm93IG5vZGUgdHlwZSBcIiArIGNvbnRlbnQpO1xuICB9XG4gIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBidWlsZFRlbXBsYXRlKHRwbCwgdGVtcGxhdGVOYW1lKSB7XG5cbiAgaWYodHlwZW9mIHRwbCA9PSAnb2JqZWN0Jykge1xuICAgIHRwbCA9IHRwbC5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHZhciByb290ID0gbmV3IE5vZGUobnVsbCwgXCJcIiwgMCksIGxpbmVzLCBsaW5lLCBsZXZlbCxcbiAgICBjb250ZW50LCBpLCBjdXJyZW50Tm9kZSA9IHJvb3QsIHBhcmVudCwgc2VhcmNoTm9kZTtcblxuICBsaW5lcyA9IHRwbC5zcGxpdChcIlxcblwiKTtcblxuICBmb3IoaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGluZSA9IGxpbmVzW2ldO1xuICAgIGxldmVsID0gbGluZS5tYXRjaCgvXFxzKi8pWzBdLmxlbmd0aCArIDE7XG4gICAgY29udGVudCA9IGxpbmUuc2xpY2UobGV2ZWwgLSAxKTtcblxuICAgIC8vIG11bHRpbGluZSBzdXBwb3J0OiBlbmRzIHdpdGggYSBcXFxuICAgIHZhciBqID0gMDtcbiAgICB3aGlsZShjb250ZW50Lm1hdGNoKC9cXFxcJC8pKSB7XG4gICAgICAgIGorKztcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXFxcXCQvLCAnJykgKyBsaW5lc1tpK2pdO1xuICAgIH1cbiAgICBpID0gaSArIGo7XG5cbiAgICAvLyBtdWx0aWxpbmUgc3RyaW5nc1xuICAgIGogPSAwO1xuICAgIGlmKGNvbnRlbnQubWF0Y2goL15cIlwiXCIvKSkge1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9eXCJcIlwiLywgJ1wiJyk7XG4gICAgICAgIHdoaWxlKCFjb250ZW50Lm1hdGNoKC9cIlwiXCIkLykpIHtcbiAgICAgICAgICAgIGorKztcbiAgICAgICAgICAgIGlmKGkraiA+IGxpbmVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJNdWx0aWxpbmUgc3RyaW5nIHN0YXJ0ZWQgYnV0IHVuZmluaXNoZWQgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQgKyBsaW5lc1tpK2pdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1wiXCJcIiQvLCAnXCInKTtcbiAgICB9XG4gICAgaSA9IGkgKyBqO1xuXG4gICAgc2VhcmNoTm9kZSA9IGN1cnJlbnROb2RlO1xuICAgIHBhcmVudCA9IG51bGw7XG5cbiAgICAvLyBzZWFyY2ggZm9yIHRoZSBwYXJlbnQgbm9kZVxuICAgIHdoaWxlKHRydWUpIHtcblxuICAgICAgaWYobGV2ZWwgPiBzZWFyY2hOb2RlLmxldmVsKSB7XG4gICAgICAgIHBhcmVudCA9IHNlYXJjaE5vZGU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZighc2VhcmNoTm9kZS5wYXJlbnQpIHtcbiAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW5kZW50YXRpb24gZXJyb3IgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgfVxuXG4gICAgICBpZihsZXZlbCA9PSBzZWFyY2hOb2RlLmxldmVsKSB7XG4gICAgICAgIHBhcmVudCA9IHNlYXJjaE5vZGUucGFyZW50O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgc2VhcmNoTm9kZSA9IHNlYXJjaE5vZGUucGFyZW50O1xuICAgIH1cblxuICAgIGlmKHBhcmVudC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIGlmKHBhcmVudC5jaGlsZHJlblswXS5sZXZlbCAhPSBsZXZlbCkge1xuICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJJbmRlbnRhdGlvbiBlcnJvciBhdCBsaW5lIFwiICsgKGkgKyAxKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG5vZGUgPSBjcmVhdGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGksIGN1cnJlbnROb2RlKTtcbiAgICBjdXJyZW50Tm9kZSA9IG5vZGU7XG5cbiAgfVxuICBpZih0ZW1wbGF0ZU5hbWUpIHtcbiAgICB0ZW1wbGF0ZUNhY2hlW3RlbXBsYXRlTmFtZV0gPSByb290O1xuICB9XG5cbiAgcmV0dXJuIHJvb3Q7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRidWlsZFRlbXBsYXRlOiBidWlsZFRlbXBsYXRlLFxuXHRwYXJzZUF0dHJpYnV0ZXM6IHBhcnNlQXR0cmlidXRlcyxcblx0Q29udGV4dDogQ29udGV4dCxcbiAgdGVtcGxhdGVDYWNoZTogdGVtcGxhdGVDYWNoZSxcbiAgY29tcG9uZW50Q2FjaGU6IGNvbXBvbmVudENhY2hlXG59OyIsIi8qIExpa2VseS5qcyB2ZXJzaW9uIDAuOS4xLFxuICAgUHl0aG9uIHN0eWxlIEhUTUwgdGVtcGxhdGUgbGFuZ3VhZ2Ugd2l0aCBiaS1kaXJlY3Rpb25uYWwgZGF0YSBiaW5kaW5nXG4gICBiYXRpc3RlIGJpZWxlciAyMDE0ICovXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gaW5oZXJpdHMoY2hpbGQsIHBhcmVudCkge1xuICBjaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUpO1xuICBjaGlsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjaGlsZDtcbn1cblxuZnVuY3Rpb24gQ29tcGlsZUVycm9yKG1zZykge1xuICB0aGlzLm5hbWUgPSBcIkNvbXBpbGVFcnJvclwiO1xuICB0aGlzLm1lc3NhZ2UgPSAobXNnIHx8IFwiXCIpO1xufVxuQ29tcGlsZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gUnVudGltZUVycm9yKG1zZykge1xuICB0aGlzLm5hbWUgPSBcIlJ1bnRpbWVFcnJvclwiO1xuICB0aGlzLm1lc3NhZ2UgPSAobXNnIHx8IFwiXCIpO1xufVxuUnVudGltZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gZXNjYXBlKHVuc2FmZSkge1xuICByZXR1cm4gdW5zYWZlXG4gICAgLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxuICAgIC5yZXBsYWNlKC88L2csIFwiJmx0O1wiKVxuICAgIC5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKVxuICAgIC5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKVxuICAgIC5yZXBsYWNlKC8nL2csIFwiJiMwMzk7XCIpO1xufVxuXG5mdW5jdGlvbiB0cmltKHR4dCkge1xuICByZXR1cm4gdHh0LnJlcGxhY2UoL15cXHMrfFxccyskL2cgLFwiXCIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5oZXJpdHM6aW5oZXJpdHMsXG5cdENvbXBpbGVFcnJvcjpDb21waWxlRXJyb3IsXG5cdFJ1bnRpbWVFcnJvcjpSdW50aW1lRXJyb3IsXG5cdGVzY2FwZTplc2NhcGUsXG5cdHRyaW06dHJpbVxufTsiXX0=
(2)
});
