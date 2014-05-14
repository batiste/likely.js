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
  var name = dom.getAttribute("lk-bind"), value;
  if(!name) {
    throw "No lk-bind attribute on the element";
  }
  if(dom.type == 'checkbox' && !dom.checked) {
    value = "";
  } else {
    value = dom.value;// || dom.getAttribute("value");
  }
  // update the context
  context.modify(name, value);
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

//TODO: automatic new on Context, Template and Component
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
  componentCache:template.componentCache,
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

Context.prototype.substituteAlias = function(name) {
  var remaining = '', name_start = name, bits = [];

  if(name.indexOf(".") != -1) {
    bits = name_start.split(".");
    name_start = bits[0];
    remaining = '.' + bits.slice(1).join('.');
  }

  if(this.aliases.hasOwnProperty(name_start)) {
    name_start = this.aliases[name_start];
  }

  return name_start + remaining;
};

Context.prototype.resolveName = function(name) {
  // given a name, return the [Context, resolved path, value] when
  // this name is found or undefined otherwise

  var remaining = '', name_start = name, bits = [];

  if(name_start.indexOf(".") != -1) {
    bits = name_start.split(".");
    name_start = bits[0];
    remaining = '.' + bits.slice(1).join('.');
  }

  if(this.aliases.hasOwnProperty(name_start)) {
    name_start = this.aliases[name_start];
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
    return resolved[1];
  }
};

Context.prototype.watch = function(name, callback) {
  this.watching[name] = callback;
};

Context.prototype.get = function(name) {
  var resolved = this.resolveName(name);
  if(resolved) {
    return resolved[2];
  }
};

Context.prototype.bubbleWatch = function(name, value) {
  if(this.watching.hasOwnProperty(name)) {
    this.watching[name](value);
  }
  name = this.substituteAlias(name);
  if(this.parent) {
    this.parent.bubbleWatch(name, value);
  }
};

Context.prototype.modify = function(name, value) {

  this.bubbleWatch(name, value);

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
};

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
  var r_attrs = {}, key, attr, name;
  for(key in this.attrs) {
    attr = this.attrs[key];
    // todo, find a better way to discriminate events
    if(key.indexOf("lk-") === 0) {
      // add the path to the render node to any lk-thing node
      r_attrs['lk-path'] = path;
      if(key === 'lk-bind') {
        r_attrs[key] = attr.evaluate(context);
      } else {
        r_attrs[key] = "true";
      }
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
    name = bindingName(attr);
    if(name && this.attrs['lk-bind'] === undefined) {
      r_attrs['lk-bind'] = name;
      r_attrs['lk-path'] = path;
    }
  }
  if(this.nodeName == "textarea" && this.children.length == 1) {
    name = bindingName(this.children[0].expression);
    if(name && this.attrs['lk-bind'] === undefined) {
      r_attrs['lk-bind'] = name;
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
        if(source && key != source) {
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

ComponentNode.prototype.repr = function(level) {
  return this.component.template.repr(level + 1);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyogTGlrZWx5LmpzIHZlcnNpb24gMC45LjEsXG4gICBQeXRob24gc3R5bGUgSFRNTCB0ZW1wbGF0ZSBsYW5ndWFnZSB3aXRoIGJpLWRpcmVjdGlvbm5hbCBkYXRhIGJpbmRpbmdcbiAgIGJhdGlzdGUgYmllbGVyIDIwMTQgKi9cblwidXNlIHN0cmljdFwiO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIEVYUFJFU1NJT05fUkVHID0gL157eyguKz8pfX0vO1xuXG4vLyBFeHByZXNzaW9uIGV2YWx1YXRpb24gZW5naW5lXG5mdW5jdGlvbiBTdHJpbmdWYWx1ZSh0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJ2YWx1ZVwiO1xuICBpZih0eHRbMF0gPT0gJ1wiJykge1xuICAgIHRoaXMudmFsdWUgPSB0eHQucmVwbGFjZSgvXlwifFwiJC9nLCBcIlwiKTtcbiAgfSBlbHNlIGlmKHR4dFswXSA9PSBcIidcIikge1xuICAgIHRoaXMudmFsdWUgPSB0eHQucmVwbGFjZSgvXid8JyQvZywgXCJcIik7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW52YWxpZCBzdHJpbmcgdmFsdWUgXCIgKyB0eHQpO1xuICB9XG59XG5TdHJpbmdWYWx1ZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLnZhbHVlO1xufTtcblN0cmluZ1ZhbHVlLnJlZyA9IC9eXCIoPzpcXFxcXCJ8W15cIl0pKlwifF4nKD86XFxcXCd8W14nXSkqJy87XG5cbmZ1bmN0aW9uIEVxdWFsT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5FcXVhbE9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSA9PSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbkVxdWFsT3BlcmF0b3IucmVnID0gL149PS87XG5cbmZ1bmN0aW9uIE5vdEVxdWFsT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5Ob3RFcXVhbE9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSAhPSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbk5vdEVxdWFsT3BlcmF0b3IucmVnID0gL14hPS87XG5cbmZ1bmN0aW9uIEJpZ2dlck9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuQmlnZ2VyT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpID4gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5CaWdnZXJPcGVyYXRvci5yZWcgPSAvXj4vO1xuXG5mdW5jdGlvbiBTbWFsbGVyT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG4gIHRoaXMuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSA8IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG4gIH07XG59XG5TbWFsbGVyT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpIDwgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5TbWFsbGVyT3BlcmF0b3IucmVnID0gL148LztcblxuZnVuY3Rpb24gT3JPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbk9yT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpIHx8IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuT3JPcGVyYXRvci5yZWcgPSAvXm9yLztcblxuZnVuY3Rpb24gQW5kT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5BbmRPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgJiYgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5BbmRPcGVyYXRvci5yZWcgPSAvXmFuZC87XG5cbmZ1bmN0aW9uIE5hbWUodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwidmFsdWVcIjtcbiAgdGhpcy5uYW1lID0gdHh0O1xufVxuTmFtZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHZhciB2YWx1ZSA9IGNvbnRleHQuZ2V0KHRoaXMubmFtZSk7XG4gIHJldHVybiB2YWx1ZTtcbn07XG5OYW1lLnJlZyA9IC9eW0EtWmEtel1bXFx3XFwuXXswLH0vO1xuXG5mdW5jdGlvbiBGaWx0ZXIodHh0KSB7XG4gIHRoaXMudHlwZSA9ICdvcGVyYXRvcic7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuRmlsdGVyLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIGZjdCA9IGNvbnRleHQuZ2V0KHRoaXMucmlnaHQubmFtZSk7XG4gIHJldHVybiBmY3QuYXBwbHkodGhpcywgW3RoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSwgY29udGV4dF0pO1xufTtcbkZpbHRlci5yZWcgPSAvXlxcfC87XG5cbi8vIG1hdGhcblxuZnVuY3Rpb24gTXVsdGlwbHlPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5NdWx0aXBseU9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSAqIHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuTXVsdGlwbHlPcGVyYXRvci5yZWcgPSAvXlxcKi87XG5cbmZ1bmN0aW9uIFBsdXNPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5QbHVzT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpICsgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5QbHVzT3BlcmF0b3IucmVnID0gL15cXCsvO1xuXG5mdW5jdGlvbiBNaW51c09wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbk1pbnVzT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpIC0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5NaW51c09wZXJhdG9yLnJlZyA9IC9eXFwtLztcblxuZnVuY3Rpb24gRnVuY3Rpb25DYWxsKHR4dCkge1xuICB0aGlzLnR5cGUgPSAndmFsdWUnO1xuICB2YXIgbSA9IHR4dC5tYXRjaCgvXihbYS16QS1aXVthLXpBLVowLTlcXC5dKilcXCgoW15cXCldKilcXCkvKTtcbiAgdGhpcy5mdW5jTmFtZSA9IG1bMV07XG4gIHRoaXMucGFyYW1zID0gbVsyXS5zcGxpdCgnLCcpO1xufVxuRnVuY3Rpb25DYWxsLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIGZ1bmMgPSBjb250ZXh0LmdldCh0aGlzLmZ1bmNOYW1lKSwgaSwgcGFyYW1zPVtdO1xuICBmb3IoaT0wOyBpPHRoaXMucGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgcGFyYW1zLnB1c2goY29udGV4dC5nZXQodXRpbC50cmltKHRoaXMucGFyYW1zW2ldKSkpO1xuICB9XG4gIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIHBhcmFtcyk7XG59O1xuRnVuY3Rpb25DYWxsLnJlZyA9IC9eW2EtekEtWl1bYS16QS1aMC05XFwuXSpcXChbXlxcKV0qXFwpLztcblxuZnVuY3Rpb24gTnVtYmVyVmFsdWUodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwidmFsdWVcIjtcbiAgdGhpcy5udW1iZXIgPSBwYXJzZUZsb2F0KHR4dCwgMTApO1xuICB0aGlzLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLm51bWJlcjtcbiAgfTtcbn1cbk51bWJlclZhbHVlLnJlZyA9IC9eWzAtOV0rLztcblxuZnVuY3Rpb24gSWZPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5JZk9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIHJ2ID0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbiAgaWYocnYpIHtcbiAgICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpO1xuICB9XG4gIHJldHVybiBydjtcbn07XG5JZk9wZXJhdG9yLnJlZyA9IC9eaWYgLztcblxuZnVuY3Rpb24gSW5PcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5Jbk9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIGxlZnQgPSB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCk7XG4gIHZhciByaWdodCA9IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG4gIGlmKHJpZ2h0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5SdW50aW1lRXJyb3IoJ3JpZ2h0IHNpZGUgb2YgaW4gb3BlcmF0b3IgY2Fubm90IGJlIHVuZGVmaW5lZCcpO1xuICB9XG4gIGlmKHJpZ2h0LmluZGV4T2YpIHtcbiAgICByZXR1cm4gcmlnaHQuaW5kZXhPZihsZWZ0KSAhPSAtMTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmlnaHQuaGFzT3duUHJvcGVydHkobGVmdCk7XG4gIH1cbn07XG5Jbk9wZXJhdG9yLnJlZyA9IC9eaW4gLztcblxuZnVuY3Rpb24gTm90T3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9ICd1bmFyeSc7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuTm90T3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gIXRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuTm90T3BlcmF0b3IucmVnID0gL15ub3QgLztcblxuZnVuY3Rpb24gY29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyh0eHQpIHtcbiAgLy8gY29tcGlsZSB0aGUgZXhwcmVzc2lvbnMgZm91bmQgaW4gdGhlIHRleHRcbiAgLy8gYW5kIHJldHVybiBhIGxpc3Qgb2YgdGV4dCtleHByZXNzaW9uXG4gIHZhciBleHByLCBhcm91bmQ7XG4gIHZhciBsaXN0ID0gW107XG4gIHdoaWxlKHRydWUpIHtcbiAgICB2YXIgbWF0Y2ggPSAve3soLis/KX19Ly5leGVjKHR4dCk7XG4gICAgaWYoIW1hdGNoKSB7XG4gICAgICBpZih0eHQpIHtcbiAgICAgICAgbGlzdC5wdXNoKHR4dCk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZXhwciA9IGJ1aWxkKG1hdGNoWzFdKTtcbiAgICBhcm91bmQgPSB0eHQuc3BsaXQobWF0Y2hbMF0sIDIpO1xuICAgIGlmKGFyb3VuZFswXS5sZW5ndGgpIHtcbiAgICAgIGxpc3QucHVzaChhcm91bmRbMF0pO1xuICAgIH1cbiAgICBsaXN0LnB1c2goZXhwcik7XG4gICAgdHh0ID0gYXJvdW5kWzFdO1xuICB9XG4gIHJldHVybiBsaXN0O1xufVxuXG5mdW5jdGlvbiBldmFsdWF0ZUV4cHJlc3Npb25MaXN0KGV4cHJlc3Npb25zLCBjb250ZXh0KSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBmb3IoaT0wOyBpPGV4cHJlc3Npb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHBhcmFtID0gZXhwcmVzc2lvbnNbaV07XG4gICAgaWYocGFyYW0uZXZhbHVhdGUpIHtcbiAgICAgIHN0ciArPSBwYXJhbS5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9IHBhcmFtO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufVxuXG4vLyBsaXN0IG9yZGVyIGRlZmluZSBvcGVyYXRvciBwcmVjZWRlbmNlXG52YXIgZXhwcmVzc2lvbl9saXN0ID0gW1xuICBNdWx0aXBseU9wZXJhdG9yLFxuICBQbHVzT3BlcmF0b3IsXG4gIE1pbnVzT3BlcmF0b3IsXG4gIEJpZ2dlck9wZXJhdG9yLFxuICBTbWFsbGVyT3BlcmF0b3IsXG4gIEVxdWFsT3BlcmF0b3IsXG4gIE5vdEVxdWFsT3BlcmF0b3IsXG4gIEZpbHRlcixcbiAgTm90T3BlcmF0b3IsXG4gIElmT3BlcmF0b3IsXG4gIEluT3BlcmF0b3IsXG4gIE9yT3BlcmF0b3IsXG4gIEFuZE9wZXJhdG9yLFxuICBTdHJpbmdWYWx1ZSxcbiAgTnVtYmVyVmFsdWUsXG4gIEZ1bmN0aW9uQ2FsbCxcbiAgTmFtZSxcbl07XG5cbmZ1bmN0aW9uIGJ1aWxkKGlucHV0KSB7XG4gIHJldHVybiBidWlsZEV4cHJlc3Npb25zKHBhcnNlRXhwcmVzc2lvbnMoaW5wdXQpKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VFeHByZXNzaW9ucyhpbnB1dCkge1xuICAvLyBSZXR1cm4gYSBsaXN0IG9mIGV4cHJlc3Npb25zXG4gIHZhciBjdXJyZW50RXhwciA9IG51bGwsIGksIGV4cHIsIG1hdGNoLCBmb3VuZCwgcGFyc2VkID0gW107XG4gIHdoaWxlKGlucHV0KSB7XG4gICAgaW5wdXQgPSB1dGlsLnRyaW0oaW5wdXQpO1xuICAgIGZvdW5kID0gZmFsc2U7XG4gICAgZm9yKGk9MDsgaTxleHByZXNzaW9uX2xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZXhwciA9IGV4cHJlc3Npb25fbGlzdFtpXTtcbiAgICAgICAgbWF0Y2ggPSBleHByLnJlZy5leGVjKGlucHV0KTtcbiAgICAgICAgaWYobWF0Y2gpIHtcbiAgICAgICAgICBpbnB1dCA9IGlucHV0LnNsaWNlKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgICAgcGFyc2VkLnB1c2gobmV3IGV4cHIobWF0Y2hbMF0sIGN1cnJlbnRFeHByKSk7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIC8vIHN0YXJ0aW5nIGFnYWluIHRvIHJlc3BlY3QgcHJlY2VkZW5jZVxuICAgICAgICAgIGkgPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmKGZvdW5kID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiRXhwcmVzc2lvbiBwYXJzZXI6IEltcG9zc2libGUgdG8gcGFyc2UgZnVydGhlciA6IFwiICsgaW5wdXQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcGFyc2VkO1xufVxuXG5mdW5jdGlvbiBidWlsZEV4cHJlc3Npb25zKGxpc3QpIHtcbiAgLy8gYnVpbGQgYSB0cmVlIG9mIGV4cHJlc3Npb24gcmVzcGVjdGluZyBwcmVjZWRlbmNlXG4gIHZhciBpLCBqLCBleHByO1xuICAvLyBhIGR1bWIgYWxnbyB0aGF0IHdvcmtzXG4gIGZvcihpPTA7IGk8ZXhwcmVzc2lvbl9saXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yKGo9MDsgajxsaXN0Lmxlbmd0aDsgaisrKSB7XG4gICAgICBpZihsaXN0Lmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIHJldHVybiBsaXN0WzBdO1xuICAgICAgfVxuICAgICAgZXhwciA9IGxpc3Rbal07XG4gICAgICBpZihleHByIGluc3RhbmNlb2YgZXhwcmVzc2lvbl9saXN0W2ldKSB7XG4gICAgICAgIGlmKGV4cHIudHlwZSA9PSAnb3BlcmF0b3InKSB7XG4gICAgICAgICAgZXhwci5sZWZ0ID0gbGlzdFtqLTFdO1xuICAgICAgICAgIGV4cHIucmlnaHQgPSBsaXN0W2orMV07XG4gICAgICAgICAgbGlzdC5zcGxpY2Uoai0xLCAyKTtcbiAgICAgICAgICBsaXN0W2otMV0gPSBleHByO1xuICAgICAgICAgIGogPSBqIC0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZihleHByLnR5cGUgPT0gJ3VuYXJ5Jykge1xuICAgICAgICAgIGV4cHIucmlnaHQgPSBsaXN0W2orMV07XG4gICAgICAgICAgbGlzdC5zcGxpY2UoaisxLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBpZihleHByLnR5cGUgPT0gJ3ZhbHVlJykge1xuICAgICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkV4cHJlc3Npb24gYnVpbGRlcjogZXhwZWN0ZWQgYW4gb3BlcmF0b3IgYnV0IGdvdCBcIiArIGV4cHIuY29uc3RydWN0b3IubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYobGlzdC5sZW5ndGggPT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkV4cHJlc3Npb24gYnVpbGRlcjogaW5jb3JyZWN0IGV4cHJlc3Npb24gY29uc3RydWN0aW9uIFwiICsgbGlzdCk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGJ1aWxkOmJ1aWxkLFxuICBjb21waWxlVGV4dEFuZEV4cHJlc3Npb25zOmNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnMsXG4gIGJ1aWxkRXhwcmVzc2lvbnM6YnVpbGRFeHByZXNzaW9ucyxcbiAgcGFyc2VFeHByZXNzaW9uczpwYXJzZUV4cHJlc3Npb25zLFxuICBldmFsdWF0ZUV4cHJlc3Npb25MaXN0OmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QsXG4gIFN0cmluZ1ZhbHVlOlN0cmluZ1ZhbHVlLFxuICBOYW1lOk5hbWUsXG4gIEVYUFJFU1NJT05fUkVHOkVYUFJFU1NJT05fUkVHXG59OyIsIi8qIExpa2VseS5qcyB2ZXJzaW9uIDAuOS4xLFxuICAgUHl0aG9uIHN0eWxlIEhUTUwgdGVtcGxhdGUgbGFuZ3VhZ2Ugd2l0aCBiaS1kaXJlY3Rpb25uYWwgZGF0YSBiaW5kaW5nXG4gICBiYXRpc3RlIGJpZWxlciAyMDE0ICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpO1xudmFyIGV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKTtcblxuZnVuY3Rpb24gdXBkYXRlRGF0YShjb250ZXh0LCBkb20pIHtcbiAgdmFyIG5hbWUgPSBkb20uZ2V0QXR0cmlidXRlKFwibGstYmluZFwiKSwgdmFsdWU7XG4gIGlmKCFuYW1lKSB7XG4gICAgdGhyb3cgXCJObyBsay1iaW5kIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudFwiO1xuICB9XG4gIGlmKGRvbS50eXBlID09ICdjaGVja2JveCcgJiYgIWRvbS5jaGVja2VkKSB7XG4gICAgdmFsdWUgPSBcIlwiO1xuICB9IGVsc2Uge1xuICAgIHZhbHVlID0gZG9tLnZhbHVlOy8vIHx8IGRvbS5nZXRBdHRyaWJ1dGUoXCJ2YWx1ZVwiKTtcbiAgfVxuICAvLyB1cGRhdGUgdGhlIGNvbnRleHRcbiAgY29udGV4dC5tb2RpZnkobmFtZSwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBCaW5kaW5nKGRvbSwgdHBsLCBkYXRhKSB7XG4gIC8vIGRvdWJsZSBkYXRhIGJpbmRpbmcgYmV0d2VlbiBzb21lIGRhdGEgYW5kIHNvbWUgZG9tXG4gIHRoaXMuZG9tID0gZG9tO1xuICB0aGlzLmRhdGEgPSBkYXRhO1xuICB0aGlzLmNvbnRleHQgPSBuZXcgdGVtcGxhdGUuQ29udGV4dCh0aGlzLmRhdGEpO1xuICB0aGlzLnRlbXBsYXRlID0gdHBsO1xuICB0aGlzLmluaXQoKTtcbn1cblxuQmluZGluZy5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZS50cmVlKG5ldyB0ZW1wbGF0ZS5Db250ZXh0KHRoaXMuZGF0YSkpO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmRvbS5pbm5lckhUTUwgPSBcIlwiO1xuICB0aGlzLmN1cnJlbnRUcmVlID0gdGhpcy50cmVlKCk7XG4gIHRoaXMuY3VycmVudFRyZWUuZG9tVHJlZSh0aGlzLmRvbSk7XG4gIHRoaXMuYmluZEV2ZW50cygpO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbmV3VHJlZSA9IHRoaXMudHJlZSgpO1xuICB2YXIgZGlmZiA9IHRoaXMuY3VycmVudFRyZWUuZGlmZihuZXdUcmVlKTtcbiAgcmVuZGVyLmFwcGx5RGlmZihkaWZmLCB0aGlzLmRvbSk7XG4gIHRoaXMuY3VycmVudFRyZWUgPSBuZXdUcmVlO1xuICB0aGlzLmxvY2sgPSBmYWxzZTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmRhdGFFdmVudCA9IGZ1bmN0aW9uKGUpIHtcbiAgdmFyIGRvbSA9IGUudGFyZ2V0O1xuICB2YXIgcGF0aCA9IGRvbS5nZXRBdHRyaWJ1dGUoJ2xrLWJpbmQnKTtcbiAgaWYocGF0aCkge1xuICAgIHZhciByZW5kZXJOb2RlID0gdGhpcy5nZXRSZW5kZXJOb2RlRnJvbVBhdGgoZG9tKTtcbiAgICB1cGRhdGVEYXRhKHJlbmRlck5vZGUuY29udGV4dCwgZG9tKTtcbiAgICBpZighdGhpcy5sb2NrKSB7XG4gICAgICB0aGlzLmxvY2sgPSB0cnVlO1xuICAgICAgdGhpcy5kaWZmKCk7XG4gICAgfVxuICAgIHZhciBldmVudCA9IG5ldyBDdXN0b21FdmVudChcImRhdGFWaWV3Q2hhbmdlZFwiLCB7XCJwYXRoXCI6IHBhdGh9KTtcbiAgICB0aGlzLmRvbS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgfVxufTtcblxuQmluZGluZy5wcm90b3R5cGUuZ2V0UmVuZGVyTm9kZUZyb21QYXRoID0gZnVuY3Rpb24oZG9tKSB7XG4gIHZhciBwYXRoID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstcGF0aCcpO1xuICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuY3VycmVudFRyZWU7XG4gIHZhciBiaXRzID0gcGF0aC5zcGxpdChcIi5cIiksIGk7XG4gIGZvcihpPTE7IGk8Yml0cy5sZW5ndGg7IGkrKykge1xuICAgIHJlbmRlck5vZGUgPSByZW5kZXJOb2RlLmNoaWxkcmVuW2JpdHNbaV1dO1xuICB9XG4gIHJldHVybiByZW5kZXJOb2RlO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuYW55RXZlbnQgPSBmdW5jdGlvbihlKSB7XG4gIHZhciBkb20gPSBlLnRhcmdldDtcbiAgdmFyIGxrRXZlbnQgPSBkb20uZ2V0QXR0cmlidXRlKCdsay0nICsgZS50eXBlKTtcbiAgaWYoIWxrRXZlbnQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHJlbmRlck5vZGUgPSB0aGlzLmdldFJlbmRlck5vZGVGcm9tUGF0aChkb20pO1xuICByZW5kZXJOb2RlLm5vZGUuYXR0cnNbJ2xrLScrZS50eXBlXS5ldmFsdWF0ZShyZW5kZXJOb2RlLmNvbnRleHQpO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuYmluZEV2ZW50cyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaTtcbiAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uKGUpeyB0aGlzLmRhdGFFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7IHRoaXMuZGF0YUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgdmFyIGV2ZW50cyA9IFwiY2xpY2ssY2hhbmdlLG1vdXNlb3Zlcixmb2N1cyxrZXlkb3duLGtleXVwLGtleXByZXNzLHN1Ym1pdCxibHVyXCIuc3BsaXQoJywnKTtcbiAgZm9yKGk9MDsgaTxldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgZXZlbnRzW2ldLFxuICAgICAgZnVuY3Rpb24oZSl7IHRoaXMuYW55RXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB9XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpe1xuICB0aGlzLmRpZmYoKTtcbn07XG5cbi8vVE9ETzogYXV0b21hdGljIG5ldyBvbiBDb250ZXh0LCBUZW1wbGF0ZSBhbmQgQ29tcG9uZW50XG5mdW5jdGlvbiBDb21wb25lbnQobmFtZSwgdHBsLCBjb250cm9sbGVyKSB7XG4gIGlmKHRlbXBsYXRlLmNvbXBvbmVudENhY2hlW25hbWVdKSB7XG4gICAgdXRpbC5Db21waWxlRXJyb3IoXCJDb21wb25lbnQgd2l0aCBuYW1lIFwiICsgbmFtZSArIFwiIGFscmVhZHkgZXhpc3RcIik7XG4gIH1cbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRwbDtcbiAgdGhpcy5jb250cm9sbGVyID0gY29udHJvbGxlcjtcbiAgdGVtcGxhdGUuY29tcG9uZW50Q2FjaGVbbmFtZV0gPSB0aGlzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgVGVtcGxhdGU6dGVtcGxhdGUuYnVpbGRUZW1wbGF0ZSxcbiAgdXBkYXRlRGF0YTp1cGRhdGVEYXRhLFxuICBCaW5kaW5nOkJpbmRpbmcsXG4gIENvbXBvbmVudDpDb21wb25lbnQsXG4gIGdldERvbTpyZW5kZXIuZ2V0RG9tLFxuICBjb21wb25lbnRDYWNoZTp0ZW1wbGF0ZS5jb21wb25lbnRDYWNoZSxcbiAgcGFyc2VFeHByZXNzaW9uczpleHByZXNzaW9uLnBhcnNlRXhwcmVzc2lvbnMsXG4gIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnM6ZXhwcmVzc2lvbi5jb21waWxlVGV4dEFuZEV4cHJlc3Npb25zLFxuICBidWlsZEV4cHJlc3Npb25zOmV4cHJlc3Npb24uYnVpbGRFeHByZXNzaW9ucyxcbiAgZXhwcmVzc2lvbnM6e1xuICAgIFN0cmluZ1ZhbHVlOmV4cHJlc3Npb24uU3RyaW5nVmFsdWVcbiAgfSxcbiAgYXBwbHlEaWZmOnJlbmRlci5hcHBseURpZmYsXG4gIGRpZmZDb3N0OnJlbmRlci5kaWZmQ29zdCxcbiAgcGFyc2VBdHRyaWJ1dGVzOnRlbXBsYXRlLnBhcnNlQXR0cmlidXRlcyxcbiAgYXR0cmlidXRlc0RpZmY6cmVuZGVyLmF0dHJpYnV0ZXNEaWZmLFxuICBDb250ZXh0OnRlbXBsYXRlLkNvbnRleHQsXG4gIENvbXBpbGVFcnJvcjp1dGlsLkNvbXBpbGVFcnJvcixcbiAgUnVudGltZUVycm9yOnV0aWwuUnVudGltZUVycm9yLFxuICBlc2NhcGU6dXRpbC5lc2NhcGUsXG4gIGV4cHJlc3Npb246ZXhwcmVzc2lvbixcbiAgc2V0SGFuZGljYXA6ZnVuY3Rpb24obil7cmVuZGVyLmhhbmRpY2FwID0gbjt9XG59O1xuIiwiLyogTGlrZWx5LmpzIHZlcnNpb24gMC45LjEsXG4gICBQeXRob24gc3R5bGUgSFRNTCB0ZW1wbGF0ZSBsYW5ndWFnZSB3aXRoIGJpLWRpcmVjdGlvbm5hbCBkYXRhIGJpbmRpbmdcbiAgIGJhdGlzdGUgYmllbGVyIDIwMTQgKi9cblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBSZW5kZXJlZE5vZGUobm9kZSwgY29udGV4dCwgcmVuZGVyZXIsIHBhdGgpIHtcbiAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICB0aGlzLm5vZGUgPSBub2RlO1xuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLnJlbmRlcmVyID0gcmVuZGVyZXI7XG4gIHRoaXMucGF0aCA9IHBhdGggfHwgXCJcIjtcbiAgLy8gc2hvcnRjdXRcbiAgdGhpcy5ub2RlTmFtZSA9IG5vZGUubm9kZU5hbWU7XG59XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBpZihsZXZlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGV2ZWwgPSAwO1xuICB9XG4gIGZvcihpPTA7IGk8bGV2ZWw7IGkrKykge1xuICAgIHN0ciArPSBcIiAgXCI7XG4gIH1cbiAgc3RyICs9IFN0cmluZyh0aGlzLm5vZGUpICsgXCIgcGF0aCBcIiArIHRoaXMucGF0aCArIFwiXFxyXFxuXCI7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHN0ciArPSB0aGlzLmNoaWxkcmVuW2ldLnJlcHIobGV2ZWwgKyAxKTtcbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5kb21UcmVlID0gZnVuY3Rpb24oYXBwZW5kX3RvKSB7XG4gIHZhciBub2RlID0gYXBwZW5kX3RvIHx8IHRoaXMubm9kZS5kb21Ob2RlKHRoaXMuY29udGV4dCwgdGhpcy5wYXRoKSwgaSwgY2hpbGRfdHJlZTtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgY2hpbGRfdHJlZSA9IHRoaXMuY2hpbGRyZW5baV0uZG9tVHJlZSgpO1xuICAgIGlmKG5vZGUucHVzaCkge1xuICAgICAgbm9kZS5wdXNoKGNoaWxkX3RyZWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlLmFwcGVuZENoaWxkKGNoaWxkX3RyZWUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbm9kZTtcbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZG9tSHRtbCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaTtcbiAgdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGNoaWxkID0gdGhpcy5jaGlsZHJlbltpXS5kb21UcmVlKCk7XG4gICAgZC5hcHBlbmRDaGlsZChjaGlsZCk7XG4gIH1cbiAgcmV0dXJuIGQuaW5uZXJIVE1MO1xufTtcblxuZnVuY3Rpb24gZGlmZkNvc3QoZGlmZikge1xuICB2YXIgdmFsdWU9MCwgaTtcbiAgZm9yKGk9MDsgaTxkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgdmFsdWUgKz0gNTtcbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgdmFsdWUgKz0gMjtcbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgdmFsdWUgKz0gMTtcbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJzdHJpbmdtdXRhdGVcIikge1xuICAgICAgdmFsdWUgKz0gMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLl9kaWZmID0gZnVuY3Rpb24ocmVuZGVyZWRfbm9kZSwgYWNjdSwgcGF0aCkge1xuICB2YXIgaSwgaiwgc291cmNlX3B0ID0gMDtcbiAgaWYocGF0aCA9PT0gdW5kZWZpbmVkKSB7IHBhdGggPSBcIlwiOyB9XG5cbiAgaWYoIXJlbmRlcmVkX25vZGUpIHtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgIG5vZGU6IHRoaXMsXG4gICAgICBwYXRoOiBwYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIGFjY3U7XG4gIH1cblxuICBpZihyZW5kZXJlZF9ub2RlLm5vZGUubm9kZU5hbWUgIT0gdGhpcy5ub2RlLm5vZGVOYW1lKSB7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICBub2RlOiB0aGlzLFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIGFjY3UucHVzaCh7XG4gICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZSxcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfVxuXG4gIC8vIENvdWxkIHVzZSBpbmhlcml0YW5jZSBmb3IgdGhpc1xuICBpZih0aGlzLm5vZGVOYW1lID09IFwic3RyaW5nXCIgJiYgdGhpcy5yZW5kZXJlciAhPSByZW5kZXJlZF9ub2RlLnJlbmRlcmVyKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdzdHJpbmdtdXRhdGUnLFxuICAgICAgICBub2RlOiB0aGlzLFxuICAgICAgICB2YWx1ZTogcmVuZGVyZWRfbm9kZS5yZW5kZXJlcixcbiAgICAgICAgcGF0aDogcGF0aFxuICAgICAgfSk7XG4gICAgcmV0dXJuIGFjY3U7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGFfZGlmZiA9IGF0dHJpYnV0ZXNEaWZmKHRoaXMuYXR0cnMsIHJlbmRlcmVkX25vZGUuYXR0cnMpO1xuICAgIGlmKGFfZGlmZi5sZW5ndGgpIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIGFjdGlvbjogJ211dGF0ZScsXG4gICAgICAgIG5vZGU6IHRoaXMsXG4gICAgICAgIGF0dHJpYnV0ZXNEaWZmOiBhX2RpZmYsXG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHZhciBsMSA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoO1xuICB2YXIgbDIgPSByZW5kZXJlZF9ub2RlLmNoaWxkcmVuLmxlbmd0aDtcblxuICAvLyBubyBzd2FwIHBvc3NpYmxlLCBidXQgZGVsZXRpbmcgYSBub2RlIGlzIHBvc3NpYmxlXG4gIGogPSAwOyBpID0gMDsgc291cmNlX3B0ID0gMDtcbiAgLy8gbGV0J3MgZ290IHRyb3VnaCBhbGwgdGhlIGNoaWxkcmVuXG4gIGZvcig7IGk8bDE7IGkrKykge1xuICAgIHZhciBkaWZmID0gMCwgYWZ0ZXJfc291cmNlX2RpZmYgPSAwLCBhZnRlcl90YXJnZXRfZGlmZiA9IDAsIGFmdGVyX3NvdXJjZV9jb3N0PW51bGwsIGFmdGVyX3RhcmdldF9jb3N0PW51bGw7XG4gICAgdmFyIGFmdGVyX3RhcmdldCA9IHJlbmRlcmVkX25vZGUuY2hpbGRyZW5baisxXTtcbiAgICB2YXIgYWZ0ZXJfc291cmNlID0gdGhpcy5jaGlsZHJlbltpKzFdO1xuXG4gICAgaWYoIXJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0pIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICAgIG5vZGU6IHRoaXMuY2hpbGRyZW5baV0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyBzb3VyY2VfcHRcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgZGlmZiA9IHRoaXMuY2hpbGRyZW5baV0uX2RpZmYocmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSwgW10sIHBhdGggKyAnLicgKyBzb3VyY2VfcHQpO1xuXG4gICAgdmFyIGNvc3QgPSBkaWZmQ29zdChkaWZmKTtcbiAgICAvLyBkb2VzIHRoZSBuZXh0IHNvdXJjZSBvbmUgZml0cyBiZXR0ZXI/XG4gICAgaWYoYWZ0ZXJfc291cmNlKSB7XG4gICAgICBhZnRlcl9zb3VyY2VfZGlmZiA9IGFmdGVyX3NvdXJjZS5fZGlmZihyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG4gICAgICAvLyBuZWVkcyBzb21lIGhhbmRpY2FwIG90aGVyd2lzZSBpbnB1dHMgY29udGFpbmluZyB0aGUgY3VycmVudCBmb2N1c1xuICAgICAgLy8gbWlnaHQgYmUgcmVtb3ZlZFxuICAgICAgYWZ0ZXJfc291cmNlX2Nvc3QgPSBkaWZmQ29zdChhZnRlcl9zb3VyY2VfZGlmZikgKyBtb2R1bGUuZXhwb3J0cy5oYW5kaWNhcDtcbiAgICB9XG4gICAgLy8gZG9lcyB0aGUgbmV4dCB0YXJnZXQgb25lIGZpdHMgYmV0dGVyP1xuICAgIGlmKGFmdGVyX3RhcmdldCkge1xuICAgICAgYWZ0ZXJfdGFyZ2V0X2RpZmYgPSB0aGlzLmNoaWxkcmVuW2ldLl9kaWZmKGFmdGVyX3RhcmdldCwgW10sIHBhdGggKyAnLicgKyBzb3VyY2VfcHQpO1xuICAgICAgYWZ0ZXJfdGFyZ2V0X2Nvc3QgPSBkaWZmQ29zdChhZnRlcl90YXJnZXRfZGlmZikgKyBtb2R1bGUuZXhwb3J0cy5oYW5kaWNhcDtcbiAgICB9XG5cbiAgICBpZigoIWFmdGVyX3RhcmdldCB8fCBjb3N0IDw9IGFmdGVyX3RhcmdldF9jb3N0KSAmJiAoIWFmdGVyX3NvdXJjZSB8fCBjb3N0IDw9IGFmdGVyX3NvdXJjZV9jb3N0KSkge1xuICAgICAgYWNjdSA9IGFjY3UuY29uY2F0KGRpZmYpO1xuICAgICAgc291cmNlX3B0ICs9IDE7XG4gICAgfSBlbHNlIGlmKGFmdGVyX3NvdXJjZSAmJiAoIWFmdGVyX3RhcmdldCB8fCBhZnRlcl9zb3VyY2VfY29zdCA8PSBhZnRlcl90YXJnZXRfY29zdCkpIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhZnRlcl9zb3VyY2UnLFxuICAgICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgICBub2RlOiB0aGlzLmNoaWxkcmVuW2ldLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgc291cmNlX3B0XG4gICAgICB9KTtcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChhZnRlcl9zb3VyY2VfZGlmZik7XG4gICAgICBzb3VyY2VfcHQgKz0gMTtcbiAgICAgIGkrKztcbiAgICB9IGVsc2UgaWYoYWZ0ZXJfdGFyZ2V0KSB7XG4gICAgICAvLyBpbXBvcnRhbnQgdG8gYWRkIHRoZSBkaWZmIGJlZm9yZVxuICAgICAgYWNjdSA9IGFjY3UuY29uY2F0KGFmdGVyX3RhcmdldF9kaWZmKTtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhZnRlcl90YXJnZXQnLFxuICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICBub2RlOiByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgKHNvdXJjZV9wdClcbiAgICAgIH0pO1xuICAgICAgc291cmNlX3B0ICs9IDI7XG4gICAgICBqKys7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IFwiU2hvdWxkIG5ldmVyIGhhcHBlblwiO1xuICAgIH1cbiAgICBqKys7XG4gIH1cblxuICAvLyBuZXcgbm9kZXMgdG8gYmUgYWRkZWQgYWZ0ZXIgdGhlIGRpZmZcbiAgZm9yKGk9MDsgaTwobDItaik7IGkrKykge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqK2ldLFxuICAgICAgcGF0aDogcGF0aCArICcuJyArIChzb3VyY2VfcHQgKyAxKVxuICAgIH0pO1xuICAgIHNvdXJjZV9wdCArPSAxO1xuICB9XG5cbiAgcmV0dXJuIGFjY3U7XG5cbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uKHJlbmRlcmVkX25vZGUpIHtcbiAgdmFyIGFjY3UgPSBbXTtcbiAgcmV0dXJuIHRoaXMuX2RpZmYocmVuZGVyZWRfbm9kZSwgYWNjdSk7XG59O1xuXG5mdW5jdGlvbiBhdHRyaWJ1dGVzRGlmZihhLCBiKSB7XG4gIHZhciBjaGFuZ2VzID0gW10sIGtleTtcbiAgZm9yKGtleSBpbiBhKSB7XG4gICAgICBpZihiW2tleV0gPT09IGZhbHNlKSB7XG4gICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwicmVtb3ZlXCIsIGtleTprZXl9KTtcbiAgICAgIH0gZWxzZSBpZihiW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZihiW2tleV0gIT0gYVtrZXldKSB7XG4gICAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJtdXRhdGVcIiwga2V5OmtleSwgdmFsdWU6YltrZXldfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwicmVtb3ZlXCIsIGtleTprZXl9KTtcbiAgICAgIH1cbiAgfVxuICBmb3Ioa2V5IGluIGIpIHtcbiAgICBpZihhW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJhZGRcIiwga2V5OmtleSwgdmFsdWU6YltrZXldfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBjaGFuZ2VzO1xufVxuXG5mdW5jdGlvbiBnZXREb20oZG9tLCBwYXRoLCBzdG9wKSB7XG4gIHZhciBpLCBwPXBhdGguc3BsaXQoJy4nKSwgZD1kb207XG4gIGlmKHN0b3AgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0b3AgPSAwO1xuICB9XG4gIGZvcihpPTA7IGk8KHAubGVuZ3RoIC0gc3RvcCk7IGkrKykge1xuICAgIGlmKHBbaV0pIHsgLy8gZmlyc3Qgb25lIGlzIFwiXCJcbiAgICAgIGQgPSBkLmNoaWxkTm9kZXNbcGFyc2VJbnQocFtpXSwgMTApXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGQ7XG59XG5cbmZ1bmN0aW9uIGFwcGx5RGlmZihkaWZmLCBkb20pIHtcbiAgdmFyIGksIGosIF9kaWZmLCBfZG9tLCBwYXJlbnQ7XG4gIGZvcihpPTA7IGk8ZGlmZi5sZW5ndGg7IGkrKykge1xuICAgIF9kaWZmID0gZGlmZltpXTtcbiAgICBfZG9tID0gZ2V0RG9tKGRvbSwgX2RpZmYucGF0aCk7XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgIF9kb20ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChfZG9tKTtcbiAgICB9XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwiYWRkXCIpIHtcbiAgICAgIHZhciBuZXdOb2RlID0gX2RpZmYubm9kZS5kb21UcmVlKCk7XG4gICAgICBpZihfZG9tKSB7XG4gICAgICAgIF9kb20ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobmV3Tm9kZSwgX2RvbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBnZXQgdGhlIHBhcmVudFxuICAgICAgICBwYXJlbnQgPSBnZXREb20oZG9tLCBfZGlmZi5wYXRoLCAxKTtcbiAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKG5ld05vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgZm9yKGo9MDsgajxfZGlmZi5hdHRyaWJ1dGVzRGlmZi5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgYV9kaWZmID0gX2RpZmYuYXR0cmlidXRlc0RpZmZbal07XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgICAgIC8vIGltcG9ydGFudCBmb3Igc2VsZWN0XG4gICAgICAgICAgaWYoXCJ2YWx1ZSxzZWxlY3RlZCxjaGVja2VkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgaWYoX2RvbVthX2RpZmYua2V5XSAhPSBhX2RpZmYudmFsdWUpIHtcbiAgICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGFfZGlmZi52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5zZXRBdHRyaWJ1dGUoYV9kaWZmLmtleSwgYV9kaWZmLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZihhX2RpZmYuYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgICAgICBpZihcImNoZWNrZWQsc2VsZWN0ZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9kb20ucmVtb3ZlQXR0cmlidXRlKGFfZGlmZi5rZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgICAgIGlmKFwiY2hlY2tlZCxzZWxlY3RlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBhX2RpZmYudmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9kb20uc2V0QXR0cmlidXRlKGFfZGlmZi5rZXksIGFfZGlmZi52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwic3RyaW5nbXV0YXRlXCIpIHtcbiAgICAgIF9kb20ubm9kZVZhbHVlID0gX2RpZmYudmFsdWU7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBSZW5kZXJlZE5vZGU6UmVuZGVyZWROb2RlLFxuICBhcHBseURpZmY6YXBwbHlEaWZmLFxuICBhdHRyaWJ1dGVzRGlmZjphdHRyaWJ1dGVzRGlmZixcbiAgZGlmZkNvc3Q6ZGlmZkNvc3QsXG4gIGdldERvbTpnZXREb20sXG4gIGhhbmRpY2FwOjFcbn07IiwiLyogTGlrZWx5LmpzIHZlcnNpb24gMC45LjEsXG4gICBQeXRob24gc3R5bGUgSFRNTCB0ZW1wbGF0ZSBsYW5ndWFnZSB3aXRoIGJpLWRpcmVjdGlvbm5hbCBkYXRhIGJpbmRpbmdcbiAgIGJhdGlzdGUgYmllbGVyIDIwMTQgKi9cblwidXNlIHN0cmljdFwiO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpO1xudmFyIGV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcblxudmFyIHRlbXBsYXRlQ2FjaGUgPSB7fTtcbnZhciBjb21wb25lbnRDYWNoZSA9IHt9O1xuLy8gYSBuYW1lIGhlcmUgaXMgYWxzbyBhbnkgdmFsaWQgSlMgb2JqZWN0IHByb3BlcnR5XG52YXIgVkFSTkFNRV9SRUcgPSAvXlthLXpBLVpfJF1bMC05YS16QS1aXyRdKi87XG52YXIgSFRNTF9BVFRSX1JFRyA9IC9eW0EtWmEtel1bXFx3LV17MCx9LztcbnZhciBET1VCTEVfUVVPVEVEX1NUUklOR19SRUcgPSAvXlwiKFxcXFxcInxbXlwiXSkqXCIvO1xuXG5mdW5jdGlvbiBDb250ZXh0KGRhdGEsIHBhcmVudCkge1xuICB0aGlzLmRhdGEgPSBkYXRhO1xuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5hbGlhc2VzID0ge307XG4gIHRoaXMud2F0Y2hpbmcgPSB7fTtcbn1cblxuQ29udGV4dC5wcm90b3R5cGUuYWRkQWxpYXMgPSBmdW5jdGlvbihzb3VyY2VOYW1lLCBhbGlhc05hbWUpIHtcbiAgLy8gc291cmNlIG5hbWUgY2FuIGJlICduYW1lJyBvciAnbGlzdC5rZXknXG4gIGlmKHNvdXJjZU5hbWUgPT09IGFsaWFzTmFtZSkge1xuICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkFsaWFzIHdpdGggdGhlIHNhbWUgbmFtZSBhZGRlZCBpbiB0aGlzIGNvbnRleHQuXCIpO1xuICB9XG4gIHRoaXMuYWxpYXNlc1thbGlhc05hbWVdID0gc291cmNlTmFtZTtcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLnN1YnN0aXR1dGVBbGlhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHJlbWFpbmluZyA9ICcnLCBuYW1lX3N0YXJ0ID0gbmFtZSwgYml0cyA9IFtdO1xuXG4gIGlmKG5hbWUuaW5kZXhPZihcIi5cIikgIT0gLTEpIHtcbiAgICBiaXRzID0gbmFtZV9zdGFydC5zcGxpdChcIi5cIik7XG4gICAgbmFtZV9zdGFydCA9IGJpdHNbMF07XG4gICAgcmVtYWluaW5nID0gJy4nICsgYml0cy5zbGljZSgxKS5qb2luKCcuJyk7XG4gIH1cblxuICBpZih0aGlzLmFsaWFzZXMuaGFzT3duUHJvcGVydHkobmFtZV9zdGFydCkpIHtcbiAgICBuYW1lX3N0YXJ0ID0gdGhpcy5hbGlhc2VzW25hbWVfc3RhcnRdO1xuICB9XG5cbiAgcmV0dXJuIG5hbWVfc3RhcnQgKyByZW1haW5pbmc7XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5yZXNvbHZlTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgLy8gZ2l2ZW4gYSBuYW1lLCByZXR1cm4gdGhlIFtDb250ZXh0LCByZXNvbHZlZCBwYXRoLCB2YWx1ZV0gd2hlblxuICAvLyB0aGlzIG5hbWUgaXMgZm91bmQgb3IgdW5kZWZpbmVkIG90aGVyd2lzZVxuXG4gIHZhciByZW1haW5pbmcgPSAnJywgbmFtZV9zdGFydCA9IG5hbWUsIGJpdHMgPSBbXTtcblxuICBpZihuYW1lX3N0YXJ0LmluZGV4T2YoXCIuXCIpICE9IC0xKSB7XG4gICAgYml0cyA9IG5hbWVfc3RhcnQuc3BsaXQoXCIuXCIpO1xuICAgIG5hbWVfc3RhcnQgPSBiaXRzWzBdO1xuICAgIHJlbWFpbmluZyA9ICcuJyArIGJpdHMuc2xpY2UoMSkuam9pbignLicpO1xuICB9XG5cbiAgaWYodGhpcy5hbGlhc2VzLmhhc093blByb3BlcnR5KG5hbWVfc3RhcnQpKSB7XG4gICAgbmFtZV9zdGFydCA9IHRoaXMuYWxpYXNlc1tuYW1lX3N0YXJ0XTtcbiAgfVxuXG4gIGlmKHRoaXMuZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lX3N0YXJ0KSkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuZGF0YVtuYW1lX3N0YXJ0XTtcbiAgICB2YXIgaSA9IDE7XG4gICAgd2hpbGUoaSA8IGJpdHMubGVuZ3RoKSB7XG4gICAgICBpZighdmFsdWUuaGFzT3duUHJvcGVydHkoYml0c1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdmFsdWVbYml0c1tpXV07XG4gICAgICBpKys7XG4gICAgfVxuICAgIHJldHVybiBbdGhpcywgbmFtZV9zdGFydCArIHJlbWFpbmluZywgdmFsdWVdO1xuICB9XG5cbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZU5hbWUobmFtZV9zdGFydCArIHJlbWFpbmluZyk7XG4gIH1cblxufTtcblxuQ29udGV4dC5wcm90b3R5cGUuZ2V0TmFtZVBhdGggPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZU5hbWUobmFtZSk7XG4gIGlmKHJlc29sdmVkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVkWzFdO1xuICB9XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gIHRoaXMud2F0Y2hpbmdbbmFtZV0gPSBjYWxsYmFjaztcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHJlc29sdmVkID0gdGhpcy5yZXNvbHZlTmFtZShuYW1lKTtcbiAgaWYocmVzb2x2ZWQpIHtcbiAgICByZXR1cm4gcmVzb2x2ZWRbMl07XG4gIH1cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmJ1YmJsZVdhdGNoID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgaWYodGhpcy53YXRjaGluZy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgIHRoaXMud2F0Y2hpbmdbbmFtZV0odmFsdWUpO1xuICB9XG4gIG5hbWUgPSB0aGlzLnN1YnN0aXR1dGVBbGlhcyhuYW1lKTtcbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICB0aGlzLnBhcmVudC5idWJibGVXYXRjaChuYW1lLCB2YWx1ZSk7XG4gIH1cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG5cbiAgdGhpcy5idWJibGVXYXRjaChuYW1lLCB2YWx1ZSk7XG5cbiAgLy8gcXVpY2sgcGF0aFxuICBpZihuYW1lLmluZGV4T2YoXCIuXCIpID09IC0xKSB7XG4gICAgaWYodGhpcy5kYXRhLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICB0aGlzLmRhdGFbbmFtZV0gPSB2YWx1ZTtcbiAgICB9XG4gICAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICAgIHRoaXMucGFyZW50Lm1vZGlmeShuYW1lLCB2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJpdHMgPSBuYW1lLnNwbGl0KFwiLlwiKTtcbiAgdmFyIGRhdGEgPSB0aGlzLmRhdGE7XG4gIC8vIHdlIGdvIGluIGZvciBhIHNlYXJjaCBpZiB0aGUgZmlyc3QgcGFydCBtYXRjaGVzXG4gIGlmKGRhdGEuaGFzT3duUHJvcGVydHkoYml0c1swXSkpIHtcbiAgICBkYXRhID0gZGF0YVtiaXRzWzBdXTtcbiAgICB2YXIgaSA9IDE7XG4gICAgd2hpbGUoaSA8IGJpdHMubGVuZ3RoIC0gMSkge1xuICAgICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYml0c1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgZGF0YSA9IGRhdGFbYml0c1tpXV07XG4gICAgICBpKys7XG4gICAgfVxuICAgIGRhdGFbYml0c1tpXV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICAvLyBkYXRhIG5vdCBmb3VuZCwgbGV0J3Mgc2VhcmNoIGluIHRoZSBwYXJlbnRcbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQubW9kaWZ5KG5hbWUsIHZhbHVlKTtcbiAgfVxuXG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB0aGlzLmRhdGFbbmFtZV0gPSB2YWx1ZTtcbn07XG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlcyh2LCBub2RlKSB7XG4gICAgdmFyIGF0dHJzID0ge30sIG4sIHM7XG4gICAgd2hpbGUodikge1xuICAgICAgICB2ID0gdXRpbC50cmltKHYpO1xuICAgICAgICBuID0gdi5tYXRjaChIVE1MX0FUVFJfUkVHKTtcbiAgICAgICAgaWYoIW4pIHtcbiAgICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gYXR0cmlidXRlIG5hbWUgZm91bmQgaW4gXCIrdik7XG4gICAgICAgIH1cbiAgICAgICAgdiA9IHYuc3Vic3RyKG5bMF0ubGVuZ3RoKTtcbiAgICAgICAgbiA9IG5bMF07XG4gICAgICAgIGlmKHZbMF0gIT0gXCI9XCIpIHtcbiAgICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gZXF1YWwgc2lnbiBhZnRlciBuYW1lIFwiK24pO1xuICAgICAgICB9XG4gICAgICAgIHYgPSB2LnN1YnN0cigxKTtcbiAgICAgICAgcyA9IHYubWF0Y2goRE9VQkxFX1FVT1RFRF9TVFJJTkdfUkVHKTtcbiAgICAgICAgaWYocykge1xuICAgICAgICAgIGF0dHJzW25dID0gbmV3IFN0cmluZ05vZGUobnVsbCwgc1swXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcyA9IHYubWF0Y2goZXhwcmVzc2lvbi5FWFBSRVNTSU9OX1JFRyk7XG4gICAgICAgICAgaWYocyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIHN0cmluZyBvciBleHByZXNzaW9uIGZvdW5kIGFmdGVyIG5hbWUgXCIrbik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBleHByID0gZXhwcmVzc2lvbi5idWlsZChzWzFdKTtcbiAgICAgICAgICAgIGF0dHJzW25dID0gZXhwcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdiA9IHYuc3Vic3RyKHNbMF0ubGVuZ3RoKTtcbiAgICB9XG4gICAgcmV0dXJuIGF0dHJzO1xufVxuXG4vLyBhbGwgdGhlIGF2YWlsYWJsZSB0ZW1wbGF0ZSBub2RlXG5cbmZ1bmN0aW9uIE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICB0aGlzLmxpbmUgPSBsaW5lO1xuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5jb250ZW50ID0gY29udGVudDtcbiAgdGhpcy5sZXZlbCA9IGxldmVsO1xuICB0aGlzLmNoaWxkcmVuID0gW107XG59XG5cbk5vZGUucHJvdG90eXBlLnJlcHIgPSBmdW5jdGlvbihsZXZlbCkge1xuICB2YXIgc3RyID0gXCJcIiwgaTtcbiAgaWYobGV2ZWwgPT09IHVuZGVmaW5lZCkge1xuICAgIGxldmVsID0gMDtcbiAgfVxuICBmb3IoaT0wOyBpPGxldmVsOyBpKyspIHtcbiAgICBzdHIgKz0gXCIgIFwiO1xuICB9XG4gIHN0ciArPSBTdHJpbmcodGhpcykgKyBcIlxcclxcblwiO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBzdHIgKz0gdGhpcy5jaGlsZHJlbltpXS5yZXByKGxldmVsICsgMSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgaWYocGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcGF0aCA9ICcnO1xuICAgIHBvcyA9IDA7XG4gICAgdGhpcy5pc1Jvb3QgPSB0cnVlO1xuICB9XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgJycsIHBhdGgpO1xuICB0LmNoaWxkcmVuID0gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5jZXJyb3IgPSBmdW5jdGlvbihtc2cpIHtcbiAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKHRoaXMudG9TdHJpbmcoKSArIFwiOiBcIiArIG1zZyk7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5kb21Ob2RlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbXTtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRyZWVDaGlsZHJlbiA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgdCA9IFtdLCBpLCBwLCBqLCBjaGlsZHJlbiA9IG51bGwsIGNoaWxkID0gbnVsbDtcbiAgaiA9IHBvcztcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgcCA9IHBhdGg7XG4gICAgY2hpbGQgPSB0aGlzLmNoaWxkcmVuW2ldO1xuICAgIGlmKGNoaWxkLmhhc093blByb3BlcnR5KCdub2RlTmFtZScpKSB7XG4gICAgICBwICs9ICcuJyArIGo7XG4gICAgICBqKys7XG4gICAgICBjaGlsZHJlbiA9IGNoaWxkLnRyZWUoY29udGV4dCwgcCwgMCk7XG4gICAgICB0LnB1c2goY2hpbGRyZW4pO1xuICAgIH0gZWxzZSBpZiAoIWNoaWxkLnJlbmRlckV4bGN1ZGVkKSB7XG4gICAgICBjaGlsZHJlbiA9IGNoaWxkLnRyZWUoY29udGV4dCwgcCwgaik7XG4gICAgICBpZihjaGlsZHJlbikge1xuICAgICAgICB0ID0gdC5jb25jYXQoY2hpbGRyZW4pO1xuICAgICAgICBqICs9IGNoaWxkcmVuLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHQ7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5hZGRDaGlsZCA9IGZ1bmN0aW9uKGNoaWxkKSB7XG4gIHRoaXMuY2hpbGRyZW4ucHVzaChjaGlsZCk7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICsgXCIoXCIrdGhpcy5jb250ZW50LnJlcGxhY2UoXCJcXG5cIiwgXCJcIikrXCIpIGF0IGxpbmUgXCIgKyB0aGlzLmxpbmU7XG59O1xuXG5mdW5jdGlvbiBDb21tZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgcGFyZW50LmNoaWxkcmVuLnB1c2godGhpcyk7XG4gIHRoaXMucmVuZGVyRXhsY3VkZWQgPSB0cnVlO1xufVxudXRpbC5pbmhlcml0cyhDb21tZW50Tm9kZSwgTm9kZSk7XG5cbmZ1bmN0aW9uIEh0bWxOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gdGhpcy5jb250ZW50LnNwbGl0KFwiIFwiKVswXTtcbiAgdGhpcy5hdHRycyA9IHBhcnNlQXR0cmlidXRlcyh0aGlzLmNvbnRlbnQuc3Vic3RyKHRoaXMubm9kZU5hbWUubGVuZ3RoKSwgdGhpcyk7XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSHRtbE5vZGUsIE5vZGUpO1xuXG5IdG1sTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsIHRoaXMuZG9tTm9kZShjb250ZXh0LCBwYXRoKSwgcGF0aCk7XG4gIHQuYXR0cnMgPSB0aGlzLnJlbmRlckF0dHJpYnV0ZXMoY29udGV4dCwgcGF0aCk7XG4gIHQuY2hpbGRyZW4gPSB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xuICByZXR1cm4gdDtcbn07XG5cbmZ1bmN0aW9uIGJpbmRpbmdOYW1lKG5vZGUpIHtcbiAgaWYobm9kZSBpbnN0YW5jZW9mIGV4cHJlc3Npb24uTmFtZSkge1xuICAgIHJldHVybiBub2RlLm5hbWU7XG4gIH1cbiAgaWYobm9kZSBpbnN0YW5jZW9mIFN0cmluZ05vZGUgJiYgbm9kZS5jb21waWxlZEV4cHJlc3Npb24ubGVuZ3RoID09IDEgJiZcbiAgICAgIG5vZGUuY29tcGlsZWRFeHByZXNzaW9uWzBdIGluc3RhbmNlb2YgZXhwcmVzc2lvbi5OYW1lKSB7XG4gICAgcmV0dXJuIG5vZGUuY29tcGlsZWRFeHByZXNzaW9uWzBdLm5hbWU7XG4gIH1cbn1cblxuSHRtbE5vZGUucHJvdG90eXBlLnJlbmRlckF0dHJpYnV0ZXMgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIHZhciByX2F0dHJzID0ge30sIGtleSwgYXR0ciwgbmFtZTtcbiAgZm9yKGtleSBpbiB0aGlzLmF0dHJzKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnNba2V5XTtcbiAgICAvLyB0b2RvLCBmaW5kIGEgYmV0dGVyIHdheSB0byBkaXNjcmltaW5hdGUgZXZlbnRzXG4gICAgaWYoa2V5LmluZGV4T2YoXCJsay1cIikgPT09IDApIHtcbiAgICAgIC8vIGFkZCB0aGUgcGF0aCB0byB0aGUgcmVuZGVyIG5vZGUgdG8gYW55IGxrLXRoaW5nIG5vZGVcbiAgICAgIHJfYXR0cnNbJ2xrLXBhdGgnXSA9IHBhdGg7XG4gICAgICBpZihrZXkgPT09ICdsay1iaW5kJykge1xuICAgICAgICByX2F0dHJzW2tleV0gPSBhdHRyLmV2YWx1YXRlKGNvbnRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcl9hdHRyc1trZXldID0gXCJ0cnVlXCI7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYoYXR0ci5ldmFsdWF0ZSkge1xuICAgICAgdmFyIHYgPSBhdHRyLmV2YWx1YXRlKGNvbnRleHQpO1xuICAgICAgaWYodiA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy8gbm90aGluZ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcl9hdHRyc1trZXldID0gdjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcl9hdHRyc1trZXldID0gYXR0cjtcbiAgICB9XG4gIH1cbiAgaWYoXCJpbnB1dCxzZWxlY3QsdGV4dGFyZWFcIi5pbmRleE9mKHRoaXMubm9kZU5hbWUpICE9IC0xICYmIHRoaXMuYXR0cnMuaGFzT3duUHJvcGVydHkoJ3ZhbHVlJykpIHtcbiAgICBhdHRyID0gdGhpcy5hdHRycy52YWx1ZTtcbiAgICBuYW1lID0gYmluZGluZ05hbWUoYXR0cik7XG4gICAgaWYobmFtZSAmJiB0aGlzLmF0dHJzWydsay1iaW5kJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcl9hdHRyc1snbGstYmluZCddID0gbmFtZTtcbiAgICAgIHJfYXR0cnNbJ2xrLXBhdGgnXSA9IHBhdGg7XG4gICAgfVxuICB9XG4gIGlmKHRoaXMubm9kZU5hbWUgPT0gXCJ0ZXh0YXJlYVwiICYmIHRoaXMuY2hpbGRyZW4ubGVuZ3RoID09IDEpIHtcbiAgICBuYW1lID0gYmluZGluZ05hbWUodGhpcy5jaGlsZHJlblswXS5leHByZXNzaW9uKTtcbiAgICBpZihuYW1lICYmIHRoaXMuYXR0cnNbJ2xrLWJpbmQnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByX2F0dHJzWydsay1iaW5kJ10gPSBuYW1lO1xuICAgICAgcl9hdHRyc1snbGstcGF0aCddID0gcGF0aDtcbiAgICAgIC8vIGFzIHNvb24gYXMgdGhlIHVzZXIgaGFzIGFsdGVyZWQgdGhlIHZhbHVlIG9mIHRoZSB0ZXh0YXJlYSBvciBzY3JpcHQgaGFzIGFsdGVyZWRcbiAgICAgIC8vIHRoZSB2YWx1ZSBwcm9wZXJ0eSBvZiB0aGUgdGV4dGFyZWEsIHRoZSB0ZXh0IG5vZGUgaXMgb3V0IG9mIHRoZSBwaWN0dXJlIGFuZCBpcyBub1xuICAgICAgLy8gbG9uZ2VyIGJvdW5kIHRvIHRoZSB0ZXh0YXJlYSdzIHZhbHVlIGluIGFueSB3YXkuXG4gICAgICByX2F0dHJzLnZhbHVlID0gdGhpcy5jaGlsZHJlblswXS5leHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcl9hdHRycztcbn07XG5cbkh0bWxOb2RlLnByb3RvdHlwZS5kb21Ob2RlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGhpcy5ub2RlTmFtZSksIGtleSwgYXR0cnM9dGhpcy5yZW5kZXJBdHRyaWJ1dGVzKGNvbnRleHQsIHBhdGgpO1xuICBmb3Ioa2V5IGluIGF0dHJzKSB7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGUoa2V5LCBhdHRyc1trZXldKTtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn07XG5cbmZ1bmN0aW9uIEZvck5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICAvLyBzeW50YXg6IGZvciBrZXksIHZhbHVlIGluIGxpc3RcbiAgLy8gICAgICAgICBmb3IgdmFsdWUgaW4gbGlzdFxuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHZhciB2YXIxLCB2YXIyLCBzb3VyY2VOYW1lO1xuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKDQpKTtcbiAgdmFyMSA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICBpZighdmFyMSkge1xuICAgIHRoaXMuY2Vycm9yKFwiZmlyc3QgdmFyaWFibGUgbmFtZSBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIodmFyMVswXS5sZW5ndGgpKTtcbiAgaWYoY29udGVudFswXSA9PSAnLCcpIHtcbiAgICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKDEpKTtcbiAgICB2YXIyID0gY29udGVudC5tYXRjaChWQVJOQU1FX1JFRyk7XG4gICAgaWYoIXZhcjIpIHtcbiAgICAgIHRoaXMuY2Vycm9yKFwic2Vjb25kIHZhcmlhYmxlIGFmdGVyIGNvbW1hIGlzIG1pc3NpbmdcIik7XG4gICAgfVxuICAgIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIodmFyMlswXS5sZW5ndGgpKTtcbiAgfVxuICBpZighY29udGVudC5tYXRjaCgvXmluLykpIHtcbiAgICB0aGlzLmNlcnJvcihcImluIGtleXdvcmQgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKDIpKTtcbiAgc291cmNlTmFtZSA9IGNvbnRlbnQubWF0Y2goZXhwcmVzc2lvbi5OYW1lLnJlZyk7XG4gIGlmKCFzb3VyY2VOYW1lKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJpdGVyYWJsZSBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgdGhpcy5zb3VyY2VOYW1lID0gc291cmNlTmFtZVswXTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cihzb3VyY2VOYW1lWzBdLmxlbmd0aCkpO1xuICBpZihjb250ZW50ICE9PSBcIlwiKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJsZWZ0IG92ZXIgdW5wYXJzYWJsZSBjb250ZW50OiBcIiArIGNvbnRlbnQpO1xuICB9XG5cbiAgaWYodmFyMSAmJiB2YXIyKSB7XG4gICAgdGhpcy5pbmRleE5hbWUgPSB2YXIxO1xuICAgIHRoaXMuYWxpYXMgPSB2YXIyWzBdO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYWxpYXMgPSB2YXIxWzBdO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoRm9yTm9kZSwgTm9kZSk7XG5cbkZvck5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBbXSwga2V5O1xuICB2YXIgZCA9IGNvbnRleHQuZ2V0KHRoaXMuc291cmNlTmFtZSk7XG4gIGZvcihrZXkgaW4gZCkge1xuICAgIC8vIHB1dHRpbmcgdGhlIGFsaWFzIGluIHRoZSBjb250ZXh0XG4gICAgdmFyIG5ld19kYXRhID0ge307XG4gICAgbmV3X2RhdGFbdGhpcy5hbGlhc10gPSBkW2tleV07XG4gICAgLy8gYWRkIHRoZSBrZXkgdG8gYWNjZXNzIHRoZSBjb250ZXh0XG4gICAgaWYodGhpcy5pbmRleE5hbWUpIHtcbiAgICAgICAgbmV3X2RhdGFbdGhpcy5pbmRleE5hbWVdID0ga2V5O1xuICAgIH1cbiAgICB2YXIgbmV3X2NvbnRleHQgPSBuZXcgQ29udGV4dChuZXdfZGF0YSwgY29udGV4dCk7XG4gICAgLy8ga2VlcCB0cmFjayBvZiB3aGVyZSB0aGUgZGF0YSBpcyBjb21pbmcgZnJvbVxuICAgIG5ld19jb250ZXh0LmFkZEFsaWFzKHRoaXMuc291cmNlTmFtZSArICcuJyArIGtleSwgdGhpcy5hbGlhcyk7XG4gICAgdCA9IHQuY29uY2F0KHRoaXMudHJlZUNoaWxkcmVuKG5ld19jb250ZXh0LCBwYXRoLCB0Lmxlbmd0aCArIHBvcykpO1xuICB9XG4gIHJldHVybiB0O1xufTtcblxuZnVuY3Rpb24gSWZOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmJ1aWxkKGNvbnRlbnQucmVwbGFjZSgvXmlmL2csIFwiXCIpKTtcbiAgcGFyZW50LmNoaWxkcmVuLnB1c2godGhpcyk7XG59XG51dGlsLmluaGVyaXRzKElmTm9kZSwgTm9kZSk7XG5cbklmTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICBpZighdGhpcy5leHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpKSB7XG4gICAgaWYodGhpcy5lbHNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbHNlLnRyZWUoY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIHJldHVybiB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLnNlYXJjaElmKGN1cnJlbnROb2RlKTtcbn1cbnV0aWwuaW5oZXJpdHMoRWxzZU5vZGUsIE5vZGUpO1xuXG5FbHNlTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICByZXR1cm4gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIElmRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmJ1aWxkKGNvbnRlbnQucmVwbGFjZSgvXmVsc2VpZi9nLCBcIlwiKSk7XG4gIHRoaXMuc2VhcmNoSWYoY3VycmVudE5vZGUpO1xufVxuLy8gaW1wb3J0YW50IHRvIGJlIGFuIElmTm9kZVxudXRpbC5pbmhlcml0cyhJZkVsc2VOb2RlLCBJZk5vZGUpO1xuXG5JZkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZiA9IGZ1bmN0aW9uIHNlYXJjaElmKGN1cnJlbnROb2RlKSB7XG4gIC8vIGZpcnN0IG5vZGUgb24gdGhlIHNhbWUgbGV2ZWwgaGFzIHRvIGJlIHRoZSBpZi9lbHNlaWYgbm9kZVxuICB3aGlsZShjdXJyZW50Tm9kZSkge1xuICAgIGlmKGN1cnJlbnROb2RlLmxldmVsIDwgdGhpcy5sZXZlbCkge1xuICAgICAgdGhpcy5jZXJyb3IoXCJjYW5ub3QgZmluZCBhIGNvcnJlc3BvbmRpbmcgaWYtbGlrZSBzdGF0ZW1lbnQgYXQgdGhlIHNhbWUgbGV2ZWwuXCIpO1xuICAgIH1cbiAgICBpZihjdXJyZW50Tm9kZS5sZXZlbCA9PSB0aGlzLmxldmVsKSB7XG4gICAgICBpZighKGN1cnJlbnROb2RlIGluc3RhbmNlb2YgSWZOb2RlKSkge1xuICAgICAgICB0aGlzLmNlcnJvcihcImF0IHRoZSBzYW1lIGxldmVsIGlzIG5vdCBhIGlmLWxpa2Ugc3RhdGVtZW50LlwiKTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnROb2RlLmVsc2UgPSB0aGlzO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUucGFyZW50O1xuICB9XG59O1xuRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmID0gSWZFbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWY7XG5cbmZ1bmN0aW9uIEV4cHJlc3Npb25Ob2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gXCJzdHJpbmdcIjtcbiAgdmFyIG0gPSBjb250ZW50Lm1hdGNoKGV4cHJlc3Npb24uRVhQUkVTU0lPTl9SRUcpO1xuICBpZighbSkge1xuICAgIHRoaXMuY2Vycm9yKFwiZGVjbGFyZWQgaW1wcm9wZXJseVwiKTtcbiAgfVxuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmJ1aWxkKG1bMV0pO1xuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEV4cHJlc3Npb25Ob2RlLCBOb2RlKTtcblxuRXhwcmVzc2lvbk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIC8vIHJlbmRlcmVyXG4gIHZhciByZW5kZXJlciA9IFN0cmluZyh0aGlzLmV4cHJlc3Npb24uZXZhbHVhdGUoY29udGV4dCkpO1xuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5FeHByZXNzaW9uTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRoaXMuZXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KSk7XG59O1xuXG5mdW5jdGlvbiBTdHJpbmdOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gXCJzdHJpbmdcIjtcbiAgdGhpcy5zdHJpbmcgPSB0aGlzLmNvbnRlbnQucmVwbGFjZSgvXlwifFwiJC9nLCBcIlwiKS5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJywgJ2dtJyk7XG4gIHRoaXMuY29tcGlsZWRFeHByZXNzaW9uID0gZXhwcmVzc2lvbi5jb21waWxlVGV4dEFuZEV4cHJlc3Npb25zKHRoaXMuc3RyaW5nKTtcbiAgaWYocGFyZW50KSB7XG4gICAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xuICB9XG59XG51dGlsLmluaGVyaXRzKFN0cmluZ05vZGUsIE5vZGUpO1xuXG5TdHJpbmdOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICAvLyByZW5kZXJlciBzaG91bGQgYmUgYWxsIGF0dHJpYnV0ZXNcbiAgdmFyIHJlbmRlcmVyID0gZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KTtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCk7XG4gIHJldHVybiB0O1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpO1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCkpO1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbihjaGlsZCkge1xuICB0aGlzLmNlcnJvcihcImNhbm5vdCBoYXZlIGNoaWxkcmVuXCIpO1xufTtcblxuZnVuY3Rpb24gSW5jbHVkZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubmFtZSA9IHV0aWwudHJpbShjb250ZW50LnNwbGl0KFwiIFwiKVsxXSk7XG4gIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlW3RoaXMubmFtZV07XG4gIGlmKHRoaXMudGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuY2Vycm9yKFwiVGVtcGxhdGUgd2l0aCBuYW1lIFwiICsgdGhpcy5uYW1lICsgXCIgaXMgbm90IHJlZ2lzdGVyZWRcIik7XG4gIH1cbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhJbmNsdWRlTm9kZSwgTm9kZSk7XG5cbkluY2x1ZGVOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHJldHVybiB0aGlzLnRlbXBsYXRlLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gQ29tcG9uZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50KS5zdWJzdHIoMTApO1xuICB2YXIgbmFtZSA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICBpZighbmFtZSkge1xuICAgIHRoaXMuY2Vycm9yKFwiQ29tcG9uZW50IG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKG5hbWVbMF0ubGVuZ3RoKSk7XG4gIHRoaXMubmFtZSA9IG5hbWVbMF07XG4gIHRoaXMuYXR0cnMgPSBwYXJzZUF0dHJpYnV0ZXMoY29udGVudCwgdGhpcyk7XG4gIHRoaXMuY29tcG9uZW50ID0gY29tcG9uZW50Q2FjaGVbdGhpcy5uYW1lXTtcbiAgaWYodGhpcy5jb21wb25lbnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuY2Vycm9yKFwiQ29tcG9uZW50IHdpdGggbmFtZSBcIiArIHRoaXMubmFtZSArIFwiIGlzIG5vdCByZWdpc3RlcmVkXCIpO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoQ29tcG9uZW50Tm9kZSwgTm9kZSk7XG5cbkNvbXBvbmVudE5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIG5ld19jb250ZXh0ID0gbmV3IENvbnRleHQoe30sIGNvbnRleHQpO1xuICB2YXIga2V5LCBhdHRyLCB2YWx1ZSwgc291cmNlO1xuICBmb3Ioa2V5IGluIHRoaXMuYXR0cnMpIHtcbiAgICBhdHRyID0gdGhpcy5hdHRyc1trZXldO1xuICAgIGlmKGF0dHIuZXZhbHVhdGUpIHtcbiAgICAgIHZhbHVlID0gYXR0ci5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICAgIC8vIHRvZG8gOiBpZiBleHByZXNzaW9uIGF0dHJpYnV0ZSwgYWRkIGFuIGFsaWFzXG4gICAgICBpZih2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy8gbm90aGluZ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3X2NvbnRleHQuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICBzb3VyY2UgPSBiaW5kaW5nTmFtZShhdHRyKTtcbiAgICAgICAgaWYoc291cmNlICYmIGtleSAhPSBzb3VyY2UpIHtcbiAgICAgICAgICBuZXdfY29udGV4dC5hZGRBbGlhcyhzb3VyY2UsIGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy9uZXdfY29udGV4dC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGlmKHRoaXMuY29tcG9uZW50LmNvbnRyb2xsZXIpe1xuICAgIHRoaXMuY29tcG9uZW50LmNvbnRyb2xsZXIobmV3X2NvbnRleHQpO1xuICB9XG4gIHJldHVybiB0aGlzLmNvbXBvbmVudC50ZW1wbGF0ZS50cmVlQ2hpbGRyZW4obmV3X2NvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5Db21wb25lbnROb2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgcmV0dXJuIHRoaXMuY29tcG9uZW50LnRlbXBsYXRlLnJlcHIobGV2ZWwgKyAxKTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgdmFyIG5vZGU7XG4gIGlmKGNvbnRlbnQubGVuZ3RoID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBTdHJpbmdOb2RlKHBhcmVudCwgXCJcXG5cIiwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJyMnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgQ29tbWVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignaWYgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IElmTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdlbHNlaWYgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IElmRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxLCBjdXJyZW50Tm9kZSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2Vsc2UnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxLCBjdXJyZW50Tm9kZSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2ZvciAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRm9yTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdpbmNsdWRlICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBJbmNsdWRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdjb21wb25lbnQgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IENvbXBvbmVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignXCInKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgU3RyaW5nTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoL15cXHcvLmV4ZWMoY29udGVudCkpIHtcbiAgICBub2RlID0gbmV3IEh0bWxOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ3t7JykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEV4cHJlc3Npb25Ob2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiY3JlYXRlTm9kZTogdW5rbm93IG5vZGUgdHlwZSBcIiArIGNvbnRlbnQpO1xuICB9XG4gIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBidWlsZFRlbXBsYXRlKHRwbCwgdGVtcGxhdGVOYW1lKSB7XG5cbiAgaWYodHlwZW9mIHRwbCA9PSAnb2JqZWN0Jykge1xuICAgIHRwbCA9IHRwbC5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHZhciByb290ID0gbmV3IE5vZGUobnVsbCwgXCJcIiwgMCksIGxpbmVzLCBsaW5lLCBsZXZlbCxcbiAgICBjb250ZW50LCBpLCBjdXJyZW50Tm9kZSA9IHJvb3QsIHBhcmVudCwgc2VhcmNoTm9kZTtcblxuICBsaW5lcyA9IHRwbC5zcGxpdChcIlxcblwiKTtcblxuICBmb3IoaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGluZSA9IGxpbmVzW2ldO1xuICAgIGxldmVsID0gbGluZS5tYXRjaCgvXFxzKi8pWzBdLmxlbmd0aCArIDE7XG4gICAgY29udGVudCA9IGxpbmUuc2xpY2UobGV2ZWwgLSAxKTtcblxuICAgIC8vIG11bHRpbGluZSBzdXBwb3J0OiBlbmRzIHdpdGggYSBcXFxuICAgIHZhciBqID0gMDtcbiAgICB3aGlsZShjb250ZW50Lm1hdGNoKC9cXFxcJC8pKSB7XG4gICAgICAgIGorKztcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXFxcXCQvLCAnJykgKyBsaW5lc1tpK2pdO1xuICAgIH1cbiAgICBpID0gaSArIGo7XG5cbiAgICAvLyBtdWx0aWxpbmUgc3RyaW5nc1xuICAgIGogPSAwO1xuICAgIGlmKGNvbnRlbnQubWF0Y2goL15cIlwiXCIvKSkge1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9eXCJcIlwiLywgJ1wiJyk7XG4gICAgICAgIHdoaWxlKCFjb250ZW50Lm1hdGNoKC9cIlwiXCIkLykpIHtcbiAgICAgICAgICAgIGorKztcbiAgICAgICAgICAgIGlmKGkraiA+IGxpbmVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJNdWx0aWxpbmUgc3RyaW5nIHN0YXJ0ZWQgYnV0IHVuZmluaXNoZWQgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQgKyBsaW5lc1tpK2pdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1wiXCJcIiQvLCAnXCInKTtcbiAgICB9XG4gICAgaSA9IGkgKyBqO1xuXG4gICAgc2VhcmNoTm9kZSA9IGN1cnJlbnROb2RlO1xuICAgIHBhcmVudCA9IG51bGw7XG5cbiAgICAvLyBzZWFyY2ggZm9yIHRoZSBwYXJlbnQgbm9kZVxuICAgIHdoaWxlKHRydWUpIHtcblxuICAgICAgaWYobGV2ZWwgPiBzZWFyY2hOb2RlLmxldmVsKSB7XG4gICAgICAgIHBhcmVudCA9IHNlYXJjaE5vZGU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZighc2VhcmNoTm9kZS5wYXJlbnQpIHtcbiAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW5kZW50YXRpb24gZXJyb3IgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgfVxuXG4gICAgICBpZihsZXZlbCA9PSBzZWFyY2hOb2RlLmxldmVsKSB7XG4gICAgICAgIHBhcmVudCA9IHNlYXJjaE5vZGUucGFyZW50O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgc2VhcmNoTm9kZSA9IHNlYXJjaE5vZGUucGFyZW50O1xuICAgIH1cblxuICAgIGlmKHBhcmVudC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIGlmKHBhcmVudC5jaGlsZHJlblswXS5sZXZlbCAhPSBsZXZlbCkge1xuICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJJbmRlbnRhdGlvbiBlcnJvciBhdCBsaW5lIFwiICsgKGkgKyAxKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG5vZGUgPSBjcmVhdGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGksIGN1cnJlbnROb2RlKTtcbiAgICBjdXJyZW50Tm9kZSA9IG5vZGU7XG5cbiAgfVxuICBpZih0ZW1wbGF0ZU5hbWUpIHtcbiAgICB0ZW1wbGF0ZUNhY2hlW3RlbXBsYXRlTmFtZV0gPSByb290O1xuICB9XG5cbiAgcmV0dXJuIHJvb3Q7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRidWlsZFRlbXBsYXRlOiBidWlsZFRlbXBsYXRlLFxuXHRwYXJzZUF0dHJpYnV0ZXM6IHBhcnNlQXR0cmlidXRlcyxcblx0Q29udGV4dDogQ29udGV4dCxcbiAgdGVtcGxhdGVDYWNoZTogdGVtcGxhdGVDYWNoZSxcbiAgY29tcG9uZW50Q2FjaGU6IGNvbXBvbmVudENhY2hlXG59OyIsIi8qIExpa2VseS5qcyB2ZXJzaW9uIDAuOS4xLFxuICAgUHl0aG9uIHN0eWxlIEhUTUwgdGVtcGxhdGUgbGFuZ3VhZ2Ugd2l0aCBiaS1kaXJlY3Rpb25uYWwgZGF0YSBiaW5kaW5nXG4gICBiYXRpc3RlIGJpZWxlciAyMDE0ICovXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gaW5oZXJpdHMoY2hpbGQsIHBhcmVudCkge1xuICBjaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUpO1xuICBjaGlsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjaGlsZDtcbn1cblxuZnVuY3Rpb24gQ29tcGlsZUVycm9yKG1zZykge1xuICB0aGlzLm5hbWUgPSBcIkNvbXBpbGVFcnJvclwiO1xuICB0aGlzLm1lc3NhZ2UgPSAobXNnIHx8IFwiXCIpO1xufVxuQ29tcGlsZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gUnVudGltZUVycm9yKG1zZykge1xuICB0aGlzLm5hbWUgPSBcIlJ1bnRpbWVFcnJvclwiO1xuICB0aGlzLm1lc3NhZ2UgPSAobXNnIHx8IFwiXCIpO1xufVxuUnVudGltZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gZXNjYXBlKHVuc2FmZSkge1xuICByZXR1cm4gdW5zYWZlXG4gICAgLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxuICAgIC5yZXBsYWNlKC88L2csIFwiJmx0O1wiKVxuICAgIC5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKVxuICAgIC5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKVxuICAgIC5yZXBsYWNlKC8nL2csIFwiJiMwMzk7XCIpO1xufVxuXG5mdW5jdGlvbiB0cmltKHR4dCkge1xuICByZXR1cm4gdHh0LnJlcGxhY2UoL15cXHMrfFxccyskL2cgLFwiXCIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5oZXJpdHM6aW5oZXJpdHMsXG5cdENvbXBpbGVFcnJvcjpDb21waWxlRXJyb3IsXG5cdFJ1bnRpbWVFcnJvcjpSdW50aW1lRXJyb3IsXG5cdGVzY2FwZTplc2NhcGUsXG5cdHRyaW06dHJpbVxufTsiXX0=
(2)
});
