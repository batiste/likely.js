!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.likely=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

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
  InOperator,
  NotOperator,
  IfOperator,
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
/* Likely.js,
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
  var name = dom.getAttribute('lk-bind');
  if(name) {
    var renderNode = this.getRenderNodeFromPath(dom);
    updateData(renderNode.context, dom);
    if(!this.lock) {
      this.lock = true;
      this.diff();
    }
    var event = new CustomEvent("dataViewChanged", {"name": name});
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
  if (this.constructor !== Component) {
    return new Component(name, tpl, controller);
  }
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
  ContextName:template.ContextName,
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
  //var d = document.createDocumentFragment();
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

function ContextName(name) {
  this.bits = name.split('.');
}

ContextName.prototype.substituteAlias = function(context) {
  if(context.aliases.hasOwnProperty(this.bits[0])) {
    var newBits = context.aliases[this.bits[0]].split('.');
    this.bits.shift();
    this.bits = newBits.concat(this.bits);
  }
};

ContextName.prototype.start = function() {
  return this.bits[0];
};

ContextName.prototype.str = function() {
  return this.bits.join('.');
};

function Context(data, parent) {
  if (this.constructor !== Context) {
    return new Context(data, parent);
  }
  this.data = data;
  this.parent = parent;
  this.aliases = {};
  this.watching = {};
}

Context.prototype.addAlias = function(sourceName, aliasName) {
  // source name can be 'name' or 'list.key'
  if(sourceName === aliasName) {
    throw new util.CompileError("Alias with the name " + aliasName + " already present in this context.");
  }
  this.aliases[aliasName] = sourceName;
};

Context.prototype.resolveName = function(name) {
  // given a name, return the [Context, resolved path, value] when
  // this name is found or undefined otherwise
  name.substituteAlias(this);

  if(this.data.hasOwnProperty(name.start())) {
    var value = this.data[name.start()];
    var i = 1;
    while(i < name.bits.length) {
      if(!value.hasOwnProperty(name.bits[i])) {
        return undefined;
      }
      value = value[name.bits[i]];
      i++;
    }
    return [this, name.str(), value];
  }

  if(this.parent) {
    return this.parent.resolveName(name);
  }

};

Context.prototype.getNamePath = function(name) {
  var resolved = this.resolveName(new ContextName(name));
  if(resolved) {
    return resolved[1];
  }
};

Context.prototype.watch = function(name, callback) {
  this.watching[name] = callback;
};

Context.prototype.get = function(name) {
  var resolved = this.resolveName(new ContextName(name));
  if(resolved) {
    return resolved[2];
  }
};

Context.prototype.modify = function(name, value) {
  this._modify(new ContextName(name), value);
};

Context.prototype._modify = function(name, value) {

  if(this.watching.hasOwnProperty(name.str())) {
    this.watching[name.str()](value);
  }

  name.substituteAlias(this);

  // we go in for a search if the first part matches
  if(this.data.hasOwnProperty(name.start())) {
    var data = this.data;
    var i = 0;
    while(i < name.bits.length - 1) {
      if(!data.hasOwnProperty(name.bits[i])) {
        return undefined;
      }
      data = data[name.bits[i]];
      i++;
    }
    data[name.bits[i]] = value;
    return true;
  }
  // data not found, let's search in the parent
  if(this.parent) {
    return this.parent._modify(name, value);
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
    // new_data[this.alias] = d[key];
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
  this.cerror("cannot have children " + child);
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
  componentCache: componentCache,
  ContextName: ContextName
};
},{"./expression":1,"./render":3,"./util":5}],5:[function(_dereq_,module,exports){

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcblwidXNlIHN0cmljdFwiO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIEVYUFJFU1NJT05fUkVHID0gL157eyguKz8pfX0vO1xuXG4vLyBFeHByZXNzaW9uIGV2YWx1YXRpb24gZW5naW5lXG5mdW5jdGlvbiBTdHJpbmdWYWx1ZSh0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJ2YWx1ZVwiO1xuICBpZih0eHRbMF0gPT0gJ1wiJykge1xuICAgIHRoaXMudmFsdWUgPSB0eHQucmVwbGFjZSgvXlwifFwiJC9nLCBcIlwiKTtcbiAgfSBlbHNlIGlmKHR4dFswXSA9PSBcIidcIikge1xuICAgIHRoaXMudmFsdWUgPSB0eHQucmVwbGFjZSgvXid8JyQvZywgXCJcIik7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW52YWxpZCBzdHJpbmcgdmFsdWUgXCIgKyB0eHQpO1xuICB9XG59XG5TdHJpbmdWYWx1ZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLnZhbHVlO1xufTtcblN0cmluZ1ZhbHVlLnJlZyA9IC9eXCIoPzpcXFxcXCJ8W15cIl0pKlwifF4nKD86XFxcXCd8W14nXSkqJy87XG5cbmZ1bmN0aW9uIEVxdWFsT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5FcXVhbE9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSA9PSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbkVxdWFsT3BlcmF0b3IucmVnID0gL149PS87XG5cbmZ1bmN0aW9uIE5vdEVxdWFsT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5Ob3RFcXVhbE9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSAhPSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbk5vdEVxdWFsT3BlcmF0b3IucmVnID0gL14hPS87XG5cbmZ1bmN0aW9uIEJpZ2dlck9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuQmlnZ2VyT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpID4gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5CaWdnZXJPcGVyYXRvci5yZWcgPSAvXj4vO1xuXG5mdW5jdGlvbiBTbWFsbGVyT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG4gIHRoaXMuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSA8IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG4gIH07XG59XG5TbWFsbGVyT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpIDwgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5TbWFsbGVyT3BlcmF0b3IucmVnID0gL148LztcblxuZnVuY3Rpb24gT3JPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbk9yT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpIHx8IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuT3JPcGVyYXRvci5yZWcgPSAvXm9yLztcblxuZnVuY3Rpb24gQW5kT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5BbmRPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgJiYgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5BbmRPcGVyYXRvci5yZWcgPSAvXmFuZC87XG5cbmZ1bmN0aW9uIE5hbWUodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwidmFsdWVcIjtcbiAgdGhpcy5uYW1lID0gdHh0O1xufVxuTmFtZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHZhciB2YWx1ZSA9IGNvbnRleHQuZ2V0KHRoaXMubmFtZSk7XG4gIHJldHVybiB2YWx1ZTtcbn07XG5OYW1lLnJlZyA9IC9eW0EtWmEtel1bXFx3XFwuXXswLH0vO1xuXG5mdW5jdGlvbiBGaWx0ZXIodHh0KSB7XG4gIHRoaXMudHlwZSA9ICdvcGVyYXRvcic7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuRmlsdGVyLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIGZjdCA9IGNvbnRleHQuZ2V0KHRoaXMucmlnaHQubmFtZSk7XG4gIHJldHVybiBmY3QuYXBwbHkodGhpcywgW3RoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSwgY29udGV4dF0pO1xufTtcbkZpbHRlci5yZWcgPSAvXlxcfC87XG5cbi8vIG1hdGhcblxuZnVuY3Rpb24gTXVsdGlwbHlPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5NdWx0aXBseU9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSAqIHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuTXVsdGlwbHlPcGVyYXRvci5yZWcgPSAvXlxcKi87XG5cbmZ1bmN0aW9uIFBsdXNPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5QbHVzT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpICsgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5QbHVzT3BlcmF0b3IucmVnID0gL15cXCsvO1xuXG5mdW5jdGlvbiBNaW51c09wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbk1pbnVzT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpIC0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5NaW51c09wZXJhdG9yLnJlZyA9IC9eXFwtLztcblxuZnVuY3Rpb24gRnVuY3Rpb25DYWxsKHR4dCkge1xuICB0aGlzLnR5cGUgPSAndmFsdWUnO1xuICB2YXIgbSA9IHR4dC5tYXRjaCgvXihbYS16QS1aXVthLXpBLVowLTlcXC5dKilcXCgoW15cXCldKilcXCkvKTtcbiAgdGhpcy5mdW5jTmFtZSA9IG1bMV07XG4gIHRoaXMucGFyYW1zID0gbVsyXS5zcGxpdCgnLCcpO1xufVxuRnVuY3Rpb25DYWxsLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIGZ1bmMgPSBjb250ZXh0LmdldCh0aGlzLmZ1bmNOYW1lKSwgaSwgcGFyYW1zPVtdO1xuICBmb3IoaT0wOyBpPHRoaXMucGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgcGFyYW1zLnB1c2goY29udGV4dC5nZXQodXRpbC50cmltKHRoaXMucGFyYW1zW2ldKSkpO1xuICB9XG4gIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIHBhcmFtcyk7XG59O1xuRnVuY3Rpb25DYWxsLnJlZyA9IC9eW2EtekEtWl1bYS16QS1aMC05XFwuXSpcXChbXlxcKV0qXFwpLztcblxuZnVuY3Rpb24gTnVtYmVyVmFsdWUodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwidmFsdWVcIjtcbiAgdGhpcy5udW1iZXIgPSBwYXJzZUZsb2F0KHR4dCwgMTApO1xuICB0aGlzLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLm51bWJlcjtcbiAgfTtcbn1cbk51bWJlclZhbHVlLnJlZyA9IC9eWzAtOV0rLztcblxuZnVuY3Rpb24gSWZPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5JZk9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIHJ2ID0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbiAgaWYocnYpIHtcbiAgICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpO1xuICB9XG4gIHJldHVybiBydjtcbn07XG5JZk9wZXJhdG9yLnJlZyA9IC9eaWYgLztcblxuZnVuY3Rpb24gSW5PcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5Jbk9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIGxlZnQgPSB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCk7XG4gIHZhciByaWdodCA9IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG4gIGlmKHJpZ2h0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5SdW50aW1lRXJyb3IoJ3JpZ2h0IHNpZGUgb2YgaW4gb3BlcmF0b3IgY2Fubm90IGJlIHVuZGVmaW5lZCcpO1xuICB9XG4gIGlmKHJpZ2h0LmluZGV4T2YpIHtcbiAgICByZXR1cm4gcmlnaHQuaW5kZXhPZihsZWZ0KSAhPSAtMTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmlnaHQuaGFzT3duUHJvcGVydHkobGVmdCk7XG4gIH1cbn07XG5Jbk9wZXJhdG9yLnJlZyA9IC9eaW4gLztcblxuZnVuY3Rpb24gTm90T3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9ICd1bmFyeSc7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuTm90T3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gIXRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuTm90T3BlcmF0b3IucmVnID0gL15ub3QgLztcblxuZnVuY3Rpb24gY29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyh0eHQpIHtcbiAgLy8gY29tcGlsZSB0aGUgZXhwcmVzc2lvbnMgZm91bmQgaW4gdGhlIHRleHRcbiAgLy8gYW5kIHJldHVybiBhIGxpc3Qgb2YgdGV4dCtleHByZXNzaW9uXG4gIHZhciBleHByLCBhcm91bmQ7XG4gIHZhciBsaXN0ID0gW107XG4gIHdoaWxlKHRydWUpIHtcbiAgICB2YXIgbWF0Y2ggPSAve3soLis/KX19Ly5leGVjKHR4dCk7XG4gICAgaWYoIW1hdGNoKSB7XG4gICAgICBpZih0eHQpIHtcbiAgICAgICAgbGlzdC5wdXNoKHR4dCk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZXhwciA9IGJ1aWxkKG1hdGNoWzFdKTtcbiAgICBhcm91bmQgPSB0eHQuc3BsaXQobWF0Y2hbMF0sIDIpO1xuICAgIGlmKGFyb3VuZFswXS5sZW5ndGgpIHtcbiAgICAgIGxpc3QucHVzaChhcm91bmRbMF0pO1xuICAgIH1cbiAgICBsaXN0LnB1c2goZXhwcik7XG4gICAgdHh0ID0gYXJvdW5kWzFdO1xuICB9XG4gIHJldHVybiBsaXN0O1xufVxuXG5mdW5jdGlvbiBldmFsdWF0ZUV4cHJlc3Npb25MaXN0KGV4cHJlc3Npb25zLCBjb250ZXh0KSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBmb3IoaT0wOyBpPGV4cHJlc3Npb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHBhcmFtID0gZXhwcmVzc2lvbnNbaV07XG4gICAgaWYocGFyYW0uZXZhbHVhdGUpIHtcbiAgICAgIHN0ciArPSBwYXJhbS5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9IHBhcmFtO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufVxuXG4vLyBsaXN0IG9yZGVyIGRlZmluZSBvcGVyYXRvciBwcmVjZWRlbmNlXG52YXIgZXhwcmVzc2lvbl9saXN0ID0gW1xuICBNdWx0aXBseU9wZXJhdG9yLFxuICBQbHVzT3BlcmF0b3IsXG4gIE1pbnVzT3BlcmF0b3IsXG4gIEJpZ2dlck9wZXJhdG9yLFxuICBTbWFsbGVyT3BlcmF0b3IsXG4gIEVxdWFsT3BlcmF0b3IsXG4gIE5vdEVxdWFsT3BlcmF0b3IsXG4gIEZpbHRlcixcbiAgSW5PcGVyYXRvcixcbiAgTm90T3BlcmF0b3IsXG4gIElmT3BlcmF0b3IsXG4gIE9yT3BlcmF0b3IsXG4gIEFuZE9wZXJhdG9yLFxuICBTdHJpbmdWYWx1ZSxcbiAgTnVtYmVyVmFsdWUsXG4gIEZ1bmN0aW9uQ2FsbCxcbiAgTmFtZSxcbl07XG5cbmZ1bmN0aW9uIGJ1aWxkKGlucHV0KSB7XG4gIHJldHVybiBidWlsZEV4cHJlc3Npb25zKHBhcnNlRXhwcmVzc2lvbnMoaW5wdXQpKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VFeHByZXNzaW9ucyhpbnB1dCkge1xuICAvLyBSZXR1cm4gYSBsaXN0IG9mIGV4cHJlc3Npb25zXG4gIHZhciBjdXJyZW50RXhwciA9IG51bGwsIGksIGV4cHIsIG1hdGNoLCBmb3VuZCwgcGFyc2VkID0gW107XG4gIHdoaWxlKGlucHV0KSB7XG4gICAgaW5wdXQgPSB1dGlsLnRyaW0oaW5wdXQpO1xuICAgIGZvdW5kID0gZmFsc2U7XG4gICAgZm9yKGk9MDsgaTxleHByZXNzaW9uX2xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZXhwciA9IGV4cHJlc3Npb25fbGlzdFtpXTtcbiAgICAgICAgbWF0Y2ggPSBleHByLnJlZy5leGVjKGlucHV0KTtcbiAgICAgICAgaWYobWF0Y2gpIHtcbiAgICAgICAgICBpbnB1dCA9IGlucHV0LnNsaWNlKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgICAgcGFyc2VkLnB1c2gobmV3IGV4cHIobWF0Y2hbMF0sIGN1cnJlbnRFeHByKSk7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIC8vIHN0YXJ0aW5nIGFnYWluIHRvIHJlc3BlY3QgcHJlY2VkZW5jZVxuICAgICAgICAgIGkgPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmKGZvdW5kID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiRXhwcmVzc2lvbiBwYXJzZXI6IEltcG9zc2libGUgdG8gcGFyc2UgZnVydGhlciA6IFwiICsgaW5wdXQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcGFyc2VkO1xufVxuXG5mdW5jdGlvbiBidWlsZEV4cHJlc3Npb25zKGxpc3QpIHtcbiAgLy8gYnVpbGQgYSB0cmVlIG9mIGV4cHJlc3Npb24gcmVzcGVjdGluZyBwcmVjZWRlbmNlXG4gIHZhciBpLCBqLCBleHByO1xuICAvLyBhIGR1bWIgYWxnbyB0aGF0IHdvcmtzXG4gIGZvcihpPTA7IGk8ZXhwcmVzc2lvbl9saXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yKGo9MDsgajxsaXN0Lmxlbmd0aDsgaisrKSB7XG4gICAgICBpZihsaXN0Lmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIHJldHVybiBsaXN0WzBdO1xuICAgICAgfVxuICAgICAgZXhwciA9IGxpc3Rbal07XG4gICAgICBpZihleHByIGluc3RhbmNlb2YgZXhwcmVzc2lvbl9saXN0W2ldKSB7XG4gICAgICAgIGlmKGV4cHIudHlwZSA9PSAnb3BlcmF0b3InKSB7XG4gICAgICAgICAgZXhwci5sZWZ0ID0gbGlzdFtqLTFdO1xuICAgICAgICAgIGV4cHIucmlnaHQgPSBsaXN0W2orMV07XG4gICAgICAgICAgbGlzdC5zcGxpY2Uoai0xLCAyKTtcbiAgICAgICAgICBsaXN0W2otMV0gPSBleHByO1xuICAgICAgICAgIGogPSBqIC0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZihleHByLnR5cGUgPT0gJ3VuYXJ5Jykge1xuICAgICAgICAgIGV4cHIucmlnaHQgPSBsaXN0W2orMV07XG4gICAgICAgICAgbGlzdC5zcGxpY2UoaisxLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBpZihleHByLnR5cGUgPT0gJ3ZhbHVlJykge1xuICAgICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkV4cHJlc3Npb24gYnVpbGRlcjogZXhwZWN0ZWQgYW4gb3BlcmF0b3IgYnV0IGdvdCBcIiArIGV4cHIuY29uc3RydWN0b3IubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYobGlzdC5sZW5ndGggPT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkV4cHJlc3Npb24gYnVpbGRlcjogaW5jb3JyZWN0IGV4cHJlc3Npb24gY29uc3RydWN0aW9uIFwiICsgbGlzdCk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGJ1aWxkOmJ1aWxkLFxuICBjb21waWxlVGV4dEFuZEV4cHJlc3Npb25zOmNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnMsXG4gIGJ1aWxkRXhwcmVzc2lvbnM6YnVpbGRFeHByZXNzaW9ucyxcbiAgcGFyc2VFeHByZXNzaW9uczpwYXJzZUV4cHJlc3Npb25zLFxuICBldmFsdWF0ZUV4cHJlc3Npb25MaXN0OmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QsXG4gIFN0cmluZ1ZhbHVlOlN0cmluZ1ZhbHVlLFxuICBOYW1lOk5hbWUsXG4gIEVYUFJFU1NJT05fUkVHOkVYUFJFU1NJT05fUkVHXG59OyIsIi8qIExpa2VseS5qcyxcbiAgIFB5dGhvbiBzdHlsZSBIVE1MIHRlbXBsYXRlIGxhbmd1YWdlIHdpdGggYmktZGlyZWN0aW9ubmFsIGRhdGEgYmluZGluZ1xuICAgYmF0aXN0ZSBiaWVsZXIgMjAxNCAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKTtcbnZhciBleHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJyk7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJyk7XG5cbmZ1bmN0aW9uIHVwZGF0ZURhdGEoY29udGV4dCwgZG9tKSB7XG4gIHZhciBuYW1lID0gZG9tLmdldEF0dHJpYnV0ZShcImxrLWJpbmRcIiksIHZhbHVlO1xuICBpZighbmFtZSkge1xuICAgIHRocm93IFwiTm8gbGstYmluZCBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnRcIjtcbiAgfVxuICBpZihkb20udHlwZSA9PSAnY2hlY2tib3gnICYmICFkb20uY2hlY2tlZCkge1xuICAgIHZhbHVlID0gXCJcIjtcbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRvbS52YWx1ZTsvLyB8fCBkb20uZ2V0QXR0cmlidXRlKFwidmFsdWVcIik7XG4gIH1cbiAgLy8gdXBkYXRlIHRoZSBjb250ZXh0XG4gIGNvbnRleHQubW9kaWZ5KG5hbWUsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gQmluZGluZyhkb20sIHRwbCwgZGF0YSkge1xuICAvLyBkb3VibGUgZGF0YSBiaW5kaW5nIGJldHdlZW4gc29tZSBkYXRhIGFuZCBzb21lIGRvbVxuICB0aGlzLmRvbSA9IGRvbTtcbiAgdGhpcy5kYXRhID0gZGF0YTtcbiAgdGhpcy5jb250ZXh0ID0gbmV3IHRlbXBsYXRlLkNvbnRleHQodGhpcy5kYXRhKTtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRwbDtcbiAgdGhpcy5pbml0KCk7XG59XG5cbkJpbmRpbmcucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudGVtcGxhdGUudHJlZShuZXcgdGVtcGxhdGUuQ29udGV4dCh0aGlzLmRhdGEpKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5kb20uaW5uZXJIVE1MID0gXCJcIjtcbiAgdGhpcy5jdXJyZW50VHJlZSA9IHRoaXMudHJlZSgpO1xuICB0aGlzLmN1cnJlbnRUcmVlLmRvbVRyZWUodGhpcy5kb20pO1xuICB0aGlzLmJpbmRFdmVudHMoKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5ld1RyZWUgPSB0aGlzLnRyZWUoKTtcbiAgdmFyIGRpZmYgPSB0aGlzLmN1cnJlbnRUcmVlLmRpZmYobmV3VHJlZSk7XG4gIHJlbmRlci5hcHBseURpZmYoZGlmZiwgdGhpcy5kb20pO1xuICB0aGlzLmN1cnJlbnRUcmVlID0gbmV3VHJlZTtcbiAgdGhpcy5sb2NrID0gZmFsc2U7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kYXRhRXZlbnQgPSBmdW5jdGlvbihlKSB7XG4gIHZhciBkb20gPSBlLnRhcmdldDtcbiAgdmFyIG5hbWUgPSBkb20uZ2V0QXR0cmlidXRlKCdsay1iaW5kJyk7XG4gIGlmKG5hbWUpIHtcbiAgICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuZ2V0UmVuZGVyTm9kZUZyb21QYXRoKGRvbSk7XG4gICAgdXBkYXRlRGF0YShyZW5kZXJOb2RlLmNvbnRleHQsIGRvbSk7XG4gICAgaWYoIXRoaXMubG9jaykge1xuICAgICAgdGhpcy5sb2NrID0gdHJ1ZTtcbiAgICAgIHRoaXMuZGlmZigpO1xuICAgIH1cbiAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoXCJkYXRhVmlld0NoYW5nZWRcIiwge1wibmFtZVwiOiBuYW1lfSk7XG4gICAgdGhpcy5kb20uZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIH1cbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmdldFJlbmRlck5vZGVGcm9tUGF0aCA9IGZ1bmN0aW9uKGRvbSkge1xuICB2YXIgcGF0aCA9IGRvbS5nZXRBdHRyaWJ1dGUoJ2xrLXBhdGgnKTtcbiAgdmFyIHJlbmRlck5vZGUgPSB0aGlzLmN1cnJlbnRUcmVlO1xuICB2YXIgYml0cyA9IHBhdGguc3BsaXQoXCIuXCIpLCBpO1xuICBmb3IoaT0xOyBpPGJpdHMubGVuZ3RoOyBpKyspIHtcbiAgICByZW5kZXJOb2RlID0gcmVuZGVyTm9kZS5jaGlsZHJlbltiaXRzW2ldXTtcbiAgfVxuICByZXR1cm4gcmVuZGVyTm9kZTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmFueUV2ZW50ID0gZnVuY3Rpb24oZSkge1xuICB2YXIgZG9tID0gZS50YXJnZXQ7XG4gIHZhciBsa0V2ZW50ID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstJyArIGUudHlwZSk7XG4gIGlmKCFsa0V2ZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciByZW5kZXJOb2RlID0gdGhpcy5nZXRSZW5kZXJOb2RlRnJvbVBhdGgoZG9tKTtcbiAgcmVuZGVyTm9kZS5ub2RlLmF0dHJzWydsay0nK2UudHlwZV0uZXZhbHVhdGUocmVuZGVyTm9kZS5jb250ZXh0KTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmJpbmRFdmVudHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGk7XG4gIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbihlKXsgdGhpcy5kYXRhRXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpeyB0aGlzLmRhdGFFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIHZhciBldmVudHMgPSBcImNsaWNrLGNoYW5nZSxtb3VzZW92ZXIsZm9jdXMsa2V5ZG93bixrZXl1cCxrZXlwcmVzcyxzdWJtaXQsYmx1clwiLnNwbGl0KCcsJyk7XG4gIGZvcihpPTA7IGk8ZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIGV2ZW50c1tpXSxcbiAgICAgIGZ1bmN0aW9uKGUpeyB0aGlzLmFueUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgfVxufTtcblxuQmluZGluZy5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5kaWZmKCk7XG59O1xuXG4vL1RPRE86IGF1dG9tYXRpYyBuZXcgb24gQ29udGV4dCwgVGVtcGxhdGUgYW5kIENvbXBvbmVudFxuZnVuY3Rpb24gQ29tcG9uZW50KG5hbWUsIHRwbCwgY29udHJvbGxlcikge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQ29tcG9uZW50KSB7XG4gICAgcmV0dXJuIG5ldyBDb21wb25lbnQobmFtZSwgdHBsLCBjb250cm9sbGVyKTtcbiAgfVxuICBpZih0ZW1wbGF0ZS5jb21wb25lbnRDYWNoZVtuYW1lXSkge1xuICAgIHV0aWwuQ29tcGlsZUVycm9yKFwiQ29tcG9uZW50IHdpdGggbmFtZSBcIiArIG5hbWUgKyBcIiBhbHJlYWR5IGV4aXN0XCIpO1xuICB9XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIHRoaXMudGVtcGxhdGUgPSB0cGw7XG4gIHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG4gIHRlbXBsYXRlLmNvbXBvbmVudENhY2hlW25hbWVdID0gdGhpcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFRlbXBsYXRlOnRlbXBsYXRlLmJ1aWxkVGVtcGxhdGUsXG4gIENvbnRleHROYW1lOnRlbXBsYXRlLkNvbnRleHROYW1lLFxuICB1cGRhdGVEYXRhOnVwZGF0ZURhdGEsXG4gIEJpbmRpbmc6QmluZGluZyxcbiAgQ29tcG9uZW50OkNvbXBvbmVudCxcbiAgZ2V0RG9tOnJlbmRlci5nZXREb20sXG4gIGNvbXBvbmVudENhY2hlOnRlbXBsYXRlLmNvbXBvbmVudENhY2hlLFxuICBwYXJzZUV4cHJlc3Npb25zOmV4cHJlc3Npb24ucGFyc2VFeHByZXNzaW9ucyxcbiAgY29tcGlsZVRleHRBbmRFeHByZXNzaW9uczpleHByZXNzaW9uLmNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnMsXG4gIGJ1aWxkRXhwcmVzc2lvbnM6ZXhwcmVzc2lvbi5idWlsZEV4cHJlc3Npb25zLFxuICBleHByZXNzaW9uczp7XG4gICAgU3RyaW5nVmFsdWU6ZXhwcmVzc2lvbi5TdHJpbmdWYWx1ZVxuICB9LFxuICBhcHBseURpZmY6cmVuZGVyLmFwcGx5RGlmZixcbiAgZGlmZkNvc3Q6cmVuZGVyLmRpZmZDb3N0LFxuICBwYXJzZUF0dHJpYnV0ZXM6dGVtcGxhdGUucGFyc2VBdHRyaWJ1dGVzLFxuICBhdHRyaWJ1dGVzRGlmZjpyZW5kZXIuYXR0cmlidXRlc0RpZmYsXG4gIENvbnRleHQ6dGVtcGxhdGUuQ29udGV4dCxcbiAgQ29tcGlsZUVycm9yOnV0aWwuQ29tcGlsZUVycm9yLFxuICBSdW50aW1lRXJyb3I6dXRpbC5SdW50aW1lRXJyb3IsXG4gIGVzY2FwZTp1dGlsLmVzY2FwZSxcbiAgZXhwcmVzc2lvbjpleHByZXNzaW9uLFxuICBzZXRIYW5kaWNhcDpmdW5jdGlvbihuKXtyZW5kZXIuaGFuZGljYXAgPSBuO31cbn07XG4iLCJcblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBSZW5kZXJlZE5vZGUobm9kZSwgY29udGV4dCwgcmVuZGVyZXIsIHBhdGgpIHtcbiAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICB0aGlzLm5vZGUgPSBub2RlO1xuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLnJlbmRlcmVyID0gcmVuZGVyZXI7XG4gIHRoaXMucGF0aCA9IHBhdGggfHwgXCJcIjtcbiAgLy8gc2hvcnRjdXRcbiAgdGhpcy5ub2RlTmFtZSA9IG5vZGUubm9kZU5hbWU7XG59XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBpZihsZXZlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGV2ZWwgPSAwO1xuICB9XG4gIGZvcihpPTA7IGk8bGV2ZWw7IGkrKykge1xuICAgIHN0ciArPSBcIiAgXCI7XG4gIH1cbiAgc3RyICs9IFN0cmluZyh0aGlzLm5vZGUpICsgXCIgcGF0aCBcIiArIHRoaXMucGF0aCArIFwiXFxyXFxuXCI7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHN0ciArPSB0aGlzLmNoaWxkcmVuW2ldLnJlcHIobGV2ZWwgKyAxKTtcbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5kb21UcmVlID0gZnVuY3Rpb24oYXBwZW5kX3RvKSB7XG4gIHZhciBub2RlID0gYXBwZW5kX3RvIHx8IHRoaXMubm9kZS5kb21Ob2RlKHRoaXMuY29udGV4dCwgdGhpcy5wYXRoKSwgaSwgY2hpbGRfdHJlZTtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgY2hpbGRfdHJlZSA9IHRoaXMuY2hpbGRyZW5baV0uZG9tVHJlZSgpO1xuICAgIGlmKG5vZGUucHVzaCkge1xuICAgICAgbm9kZS5wdXNoKGNoaWxkX3RyZWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlLmFwcGVuZENoaWxkKGNoaWxkX3RyZWUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbm9kZTtcbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZG9tSHRtbCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaTtcbiAgLy92YXIgZCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGNoaWxkID0gdGhpcy5jaGlsZHJlbltpXS5kb21UcmVlKCk7XG4gICAgZC5hcHBlbmRDaGlsZChjaGlsZCk7XG4gIH1cbiAgcmV0dXJuIGQuaW5uZXJIVE1MO1xufTtcblxuZnVuY3Rpb24gZGlmZkNvc3QoZGlmZikge1xuICB2YXIgdmFsdWU9MCwgaTtcbiAgZm9yKGk9MDsgaTxkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgdmFsdWUgKz0gNTtcbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgdmFsdWUgKz0gMjtcbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgdmFsdWUgKz0gMTtcbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJzdHJpbmdtdXRhdGVcIikge1xuICAgICAgdmFsdWUgKz0gMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLl9kaWZmID0gZnVuY3Rpb24ocmVuZGVyZWRfbm9kZSwgYWNjdSwgcGF0aCkge1xuICB2YXIgaSwgaiwgc291cmNlX3B0ID0gMDtcbiAgaWYocGF0aCA9PT0gdW5kZWZpbmVkKSB7IHBhdGggPSBcIlwiOyB9XG5cbiAgaWYoIXJlbmRlcmVkX25vZGUpIHtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgIG5vZGU6IHRoaXMsXG4gICAgICBwYXRoOiBwYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIGFjY3U7XG4gIH1cblxuICBpZihyZW5kZXJlZF9ub2RlLm5vZGUubm9kZU5hbWUgIT0gdGhpcy5ub2RlLm5vZGVOYW1lKSB7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICBub2RlOiB0aGlzLFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIGFjY3UucHVzaCh7XG4gICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZSxcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfVxuXG4gIC8vIENvdWxkIHVzZSBpbmhlcml0YW5jZSBmb3IgdGhpc1xuICBpZih0aGlzLm5vZGVOYW1lID09IFwic3RyaW5nXCIgJiYgdGhpcy5yZW5kZXJlciAhPSByZW5kZXJlZF9ub2RlLnJlbmRlcmVyKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdzdHJpbmdtdXRhdGUnLFxuICAgICAgICBub2RlOiB0aGlzLFxuICAgICAgICB2YWx1ZTogcmVuZGVyZWRfbm9kZS5yZW5kZXJlcixcbiAgICAgICAgcGF0aDogcGF0aFxuICAgICAgfSk7XG4gICAgcmV0dXJuIGFjY3U7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGFfZGlmZiA9IGF0dHJpYnV0ZXNEaWZmKHRoaXMuYXR0cnMsIHJlbmRlcmVkX25vZGUuYXR0cnMpO1xuICAgIGlmKGFfZGlmZi5sZW5ndGgpIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIGFjdGlvbjogJ211dGF0ZScsXG4gICAgICAgIG5vZGU6IHRoaXMsXG4gICAgICAgIGF0dHJpYnV0ZXNEaWZmOiBhX2RpZmYsXG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHZhciBsMSA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoO1xuICB2YXIgbDIgPSByZW5kZXJlZF9ub2RlLmNoaWxkcmVuLmxlbmd0aDtcblxuICAvLyBubyBzd2FwIHBvc3NpYmxlLCBidXQgZGVsZXRpbmcgYSBub2RlIGlzIHBvc3NpYmxlXG4gIGogPSAwOyBpID0gMDsgc291cmNlX3B0ID0gMDtcbiAgLy8gbGV0J3MgZ290IHRyb3VnaCBhbGwgdGhlIGNoaWxkcmVuXG4gIGZvcig7IGk8bDE7IGkrKykge1xuICAgIHZhciBkaWZmID0gMCwgYWZ0ZXJfc291cmNlX2RpZmYgPSAwLCBhZnRlcl90YXJnZXRfZGlmZiA9IDAsIGFmdGVyX3NvdXJjZV9jb3N0PW51bGwsIGFmdGVyX3RhcmdldF9jb3N0PW51bGw7XG4gICAgdmFyIGFmdGVyX3RhcmdldCA9IHJlbmRlcmVkX25vZGUuY2hpbGRyZW5baisxXTtcbiAgICB2YXIgYWZ0ZXJfc291cmNlID0gdGhpcy5jaGlsZHJlbltpKzFdO1xuXG4gICAgaWYoIXJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0pIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICAgIG5vZGU6IHRoaXMuY2hpbGRyZW5baV0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyBzb3VyY2VfcHRcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgZGlmZiA9IHRoaXMuY2hpbGRyZW5baV0uX2RpZmYocmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSwgW10sIHBhdGggKyAnLicgKyBzb3VyY2VfcHQpO1xuXG4gICAgdmFyIGNvc3QgPSBkaWZmQ29zdChkaWZmKTtcbiAgICAvLyBkb2VzIHRoZSBuZXh0IHNvdXJjZSBvbmUgZml0cyBiZXR0ZXI/XG4gICAgaWYoYWZ0ZXJfc291cmNlKSB7XG4gICAgICBhZnRlcl9zb3VyY2VfZGlmZiA9IGFmdGVyX3NvdXJjZS5fZGlmZihyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG4gICAgICAvLyBuZWVkcyBzb21lIGhhbmRpY2FwIG90aGVyd2lzZSBpbnB1dHMgY29udGFpbmluZyB0aGUgY3VycmVudCBmb2N1c1xuICAgICAgLy8gbWlnaHQgYmUgcmVtb3ZlZFxuICAgICAgYWZ0ZXJfc291cmNlX2Nvc3QgPSBkaWZmQ29zdChhZnRlcl9zb3VyY2VfZGlmZikgKyBtb2R1bGUuZXhwb3J0cy5oYW5kaWNhcDtcbiAgICB9XG4gICAgLy8gZG9lcyB0aGUgbmV4dCB0YXJnZXQgb25lIGZpdHMgYmV0dGVyP1xuICAgIGlmKGFmdGVyX3RhcmdldCkge1xuICAgICAgYWZ0ZXJfdGFyZ2V0X2RpZmYgPSB0aGlzLmNoaWxkcmVuW2ldLl9kaWZmKGFmdGVyX3RhcmdldCwgW10sIHBhdGggKyAnLicgKyBzb3VyY2VfcHQpO1xuICAgICAgYWZ0ZXJfdGFyZ2V0X2Nvc3QgPSBkaWZmQ29zdChhZnRlcl90YXJnZXRfZGlmZikgKyBtb2R1bGUuZXhwb3J0cy5oYW5kaWNhcDtcbiAgICB9XG5cbiAgICBpZigoIWFmdGVyX3RhcmdldCB8fCBjb3N0IDw9IGFmdGVyX3RhcmdldF9jb3N0KSAmJiAoIWFmdGVyX3NvdXJjZSB8fCBjb3N0IDw9IGFmdGVyX3NvdXJjZV9jb3N0KSkge1xuICAgICAgYWNjdSA9IGFjY3UuY29uY2F0KGRpZmYpO1xuICAgICAgc291cmNlX3B0ICs9IDE7XG4gICAgfSBlbHNlIGlmKGFmdGVyX3NvdXJjZSAmJiAoIWFmdGVyX3RhcmdldCB8fCBhZnRlcl9zb3VyY2VfY29zdCA8PSBhZnRlcl90YXJnZXRfY29zdCkpIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhZnRlcl9zb3VyY2UnLFxuICAgICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgICBub2RlOiB0aGlzLmNoaWxkcmVuW2ldLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgc291cmNlX3B0XG4gICAgICB9KTtcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChhZnRlcl9zb3VyY2VfZGlmZik7XG4gICAgICBzb3VyY2VfcHQgKz0gMTtcbiAgICAgIGkrKztcbiAgICB9IGVsc2UgaWYoYWZ0ZXJfdGFyZ2V0KSB7XG4gICAgICAvLyBpbXBvcnRhbnQgdG8gYWRkIHRoZSBkaWZmIGJlZm9yZVxuICAgICAgYWNjdSA9IGFjY3UuY29uY2F0KGFmdGVyX3RhcmdldF9kaWZmKTtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhZnRlcl90YXJnZXQnLFxuICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICBub2RlOiByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgKHNvdXJjZV9wdClcbiAgICAgIH0pO1xuICAgICAgc291cmNlX3B0ICs9IDI7XG4gICAgICBqKys7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IFwiU2hvdWxkIG5ldmVyIGhhcHBlblwiO1xuICAgIH1cbiAgICBqKys7XG4gIH1cblxuICAvLyBuZXcgbm9kZXMgdG8gYmUgYWRkZWQgYWZ0ZXIgdGhlIGRpZmZcbiAgZm9yKGk9MDsgaTwobDItaik7IGkrKykge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqK2ldLFxuICAgICAgcGF0aDogcGF0aCArICcuJyArIChzb3VyY2VfcHQgKyAxKVxuICAgIH0pO1xuICAgIHNvdXJjZV9wdCArPSAxO1xuICB9XG5cbiAgcmV0dXJuIGFjY3U7XG5cbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uKHJlbmRlcmVkX25vZGUpIHtcbiAgdmFyIGFjY3UgPSBbXTtcbiAgcmV0dXJuIHRoaXMuX2RpZmYocmVuZGVyZWRfbm9kZSwgYWNjdSk7XG59O1xuXG5mdW5jdGlvbiBhdHRyaWJ1dGVzRGlmZihhLCBiKSB7XG4gIHZhciBjaGFuZ2VzID0gW10sIGtleTtcbiAgZm9yKGtleSBpbiBhKSB7XG4gICAgICBpZihiW2tleV0gPT09IGZhbHNlKSB7XG4gICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwicmVtb3ZlXCIsIGtleTprZXl9KTtcbiAgICAgIH0gZWxzZSBpZihiW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZihiW2tleV0gIT0gYVtrZXldKSB7XG4gICAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJtdXRhdGVcIiwga2V5OmtleSwgdmFsdWU6YltrZXldfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwicmVtb3ZlXCIsIGtleTprZXl9KTtcbiAgICAgIH1cbiAgfVxuICBmb3Ioa2V5IGluIGIpIHtcbiAgICBpZihhW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJhZGRcIiwga2V5OmtleSwgdmFsdWU6YltrZXldfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBjaGFuZ2VzO1xufVxuXG5mdW5jdGlvbiBnZXREb20oZG9tLCBwYXRoLCBzdG9wKSB7XG4gIHZhciBpLCBwPXBhdGguc3BsaXQoJy4nKSwgZD1kb207XG4gIGlmKHN0b3AgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0b3AgPSAwO1xuICB9XG4gIGZvcihpPTA7IGk8KHAubGVuZ3RoIC0gc3RvcCk7IGkrKykge1xuICAgIGlmKHBbaV0pIHsgLy8gZmlyc3Qgb25lIGlzIFwiXCJcbiAgICAgIGQgPSBkLmNoaWxkTm9kZXNbcGFyc2VJbnQocFtpXSwgMTApXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGQ7XG59XG5cbmZ1bmN0aW9uIGFwcGx5RGlmZihkaWZmLCBkb20pIHtcbiAgdmFyIGksIGosIF9kaWZmLCBfZG9tLCBwYXJlbnQ7XG4gIGZvcihpPTA7IGk8ZGlmZi5sZW5ndGg7IGkrKykge1xuICAgIF9kaWZmID0gZGlmZltpXTtcbiAgICBfZG9tID0gZ2V0RG9tKGRvbSwgX2RpZmYucGF0aCk7XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgIF9kb20ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChfZG9tKTtcbiAgICB9XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwiYWRkXCIpIHtcbiAgICAgIHZhciBuZXdOb2RlID0gX2RpZmYubm9kZS5kb21UcmVlKCk7XG4gICAgICBpZihfZG9tKSB7XG4gICAgICAgIF9kb20ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobmV3Tm9kZSwgX2RvbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBnZXQgdGhlIHBhcmVudFxuICAgICAgICBwYXJlbnQgPSBnZXREb20oZG9tLCBfZGlmZi5wYXRoLCAxKTtcbiAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKG5ld05vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgZm9yKGo9MDsgajxfZGlmZi5hdHRyaWJ1dGVzRGlmZi5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgYV9kaWZmID0gX2RpZmYuYXR0cmlidXRlc0RpZmZbal07XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgICAgIC8vIGltcG9ydGFudCBmb3Igc2VsZWN0XG4gICAgICAgICAgaWYoXCJ2YWx1ZSxzZWxlY3RlZCxjaGVja2VkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgaWYoX2RvbVthX2RpZmYua2V5XSAhPSBhX2RpZmYudmFsdWUpIHtcbiAgICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGFfZGlmZi52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5zZXRBdHRyaWJ1dGUoYV9kaWZmLmtleSwgYV9kaWZmLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZihhX2RpZmYuYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgICAgICBpZihcImNoZWNrZWQsc2VsZWN0ZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9kb20ucmVtb3ZlQXR0cmlidXRlKGFfZGlmZi5rZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgICAgIGlmKFwiY2hlY2tlZCxzZWxlY3RlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBhX2RpZmYudmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9kb20uc2V0QXR0cmlidXRlKGFfZGlmZi5rZXksIGFfZGlmZi52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwic3RyaW5nbXV0YXRlXCIpIHtcbiAgICAgIF9kb20ubm9kZVZhbHVlID0gX2RpZmYudmFsdWU7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBSZW5kZXJlZE5vZGU6UmVuZGVyZWROb2RlLFxuICBhcHBseURpZmY6YXBwbHlEaWZmLFxuICBhdHRyaWJ1dGVzRGlmZjphdHRyaWJ1dGVzRGlmZixcbiAgZGlmZkNvc3Q6ZGlmZkNvc3QsXG4gIGdldERvbTpnZXREb20sXG4gIGhhbmRpY2FwOjFcbn07IiwiXG5cInVzZSBzdHJpY3RcIjtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKTtcbnZhciBleHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJyk7XG5cbnZhciB0ZW1wbGF0ZUNhY2hlID0ge307XG52YXIgY29tcG9uZW50Q2FjaGUgPSB7fTtcbi8vIGEgbmFtZSBoZXJlIGlzIGFsc28gYW55IHZhbGlkIEpTIG9iamVjdCBwcm9wZXJ0eVxudmFyIFZBUk5BTUVfUkVHID0gL15bYS16QS1aXyRdWzAtOWEtekEtWl8kXSovO1xudmFyIEhUTUxfQVRUUl9SRUcgPSAvXltBLVphLXpdW1xcdy1dezAsfS87XG52YXIgRE9VQkxFX1FVT1RFRF9TVFJJTkdfUkVHID0gL15cIihcXFxcXCJ8W15cIl0pKlwiLztcblxuZnVuY3Rpb24gQ29udGV4dE5hbWUobmFtZSkge1xuICB0aGlzLmJpdHMgPSBuYW1lLnNwbGl0KCcuJyk7XG59XG5cbkNvbnRleHROYW1lLnByb3RvdHlwZS5zdWJzdGl0dXRlQWxpYXMgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIGlmKGNvbnRleHQuYWxpYXNlcy5oYXNPd25Qcm9wZXJ0eSh0aGlzLmJpdHNbMF0pKSB7XG4gICAgdmFyIG5ld0JpdHMgPSBjb250ZXh0LmFsaWFzZXNbdGhpcy5iaXRzWzBdXS5zcGxpdCgnLicpO1xuICAgIHRoaXMuYml0cy5zaGlmdCgpO1xuICAgIHRoaXMuYml0cyA9IG5ld0JpdHMuY29uY2F0KHRoaXMuYml0cyk7XG4gIH1cbn07XG5cbkNvbnRleHROYW1lLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5iaXRzWzBdO1xufTtcblxuQ29udGV4dE5hbWUucHJvdG90eXBlLnN0ciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5iaXRzLmpvaW4oJy4nKTtcbn07XG5cbmZ1bmN0aW9uIENvbnRleHQoZGF0YSwgcGFyZW50KSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBDb250ZXh0KSB7XG4gICAgcmV0dXJuIG5ldyBDb250ZXh0KGRhdGEsIHBhcmVudCk7XG4gIH1cbiAgdGhpcy5kYXRhID0gZGF0YTtcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuYWxpYXNlcyA9IHt9O1xuICB0aGlzLndhdGNoaW5nID0ge307XG59XG5cbkNvbnRleHQucHJvdG90eXBlLmFkZEFsaWFzID0gZnVuY3Rpb24oc291cmNlTmFtZSwgYWxpYXNOYW1lKSB7XG4gIC8vIHNvdXJjZSBuYW1lIGNhbiBiZSAnbmFtZScgb3IgJ2xpc3Qua2V5J1xuICBpZihzb3VyY2VOYW1lID09PSBhbGlhc05hbWUpIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJBbGlhcyB3aXRoIHRoZSBuYW1lIFwiICsgYWxpYXNOYW1lICsgXCIgYWxyZWFkeSBwcmVzZW50IGluIHRoaXMgY29udGV4dC5cIik7XG4gIH1cbiAgdGhpcy5hbGlhc2VzW2FsaWFzTmFtZV0gPSBzb3VyY2VOYW1lO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUucmVzb2x2ZU5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIC8vIGdpdmVuIGEgbmFtZSwgcmV0dXJuIHRoZSBbQ29udGV4dCwgcmVzb2x2ZWQgcGF0aCwgdmFsdWVdIHdoZW5cbiAgLy8gdGhpcyBuYW1lIGlzIGZvdW5kIG9yIHVuZGVmaW5lZCBvdGhlcndpc2VcbiAgbmFtZS5zdWJzdGl0dXRlQWxpYXModGhpcyk7XG5cbiAgaWYodGhpcy5kYXRhLmhhc093blByb3BlcnR5KG5hbWUuc3RhcnQoKSkpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLmRhdGFbbmFtZS5zdGFydCgpXTtcbiAgICB2YXIgaSA9IDE7XG4gICAgd2hpbGUoaSA8IG5hbWUuYml0cy5sZW5ndGgpIHtcbiAgICAgIGlmKCF2YWx1ZS5oYXNPd25Qcm9wZXJ0eShuYW1lLmJpdHNbaV0pKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICB2YWx1ZSA9IHZhbHVlW25hbWUuYml0c1tpXV07XG4gICAgICBpKys7XG4gICAgfVxuICAgIHJldHVybiBbdGhpcywgbmFtZS5zdHIoKSwgdmFsdWVdO1xuICB9XG5cbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZU5hbWUobmFtZSk7XG4gIH1cblxufTtcblxuQ29udGV4dC5wcm90b3R5cGUuZ2V0TmFtZVBhdGggPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZU5hbWUobmV3IENvbnRleHROYW1lKG5hbWUpKTtcbiAgaWYocmVzb2x2ZWQpIHtcbiAgICByZXR1cm4gcmVzb2x2ZWRbMV07XG4gIH1cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAgdGhpcy53YXRjaGluZ1tuYW1lXSA9IGNhbGxiYWNrO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVOYW1lKG5ldyBDb250ZXh0TmFtZShuYW1lKSk7XG4gIGlmKHJlc29sdmVkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVkWzJdO1xuICB9XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB0aGlzLl9tb2RpZnkobmV3IENvbnRleHROYW1lKG5hbWUpLCB2YWx1ZSk7XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5fbW9kaWZ5ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcblxuICBpZih0aGlzLndhdGNoaW5nLmhhc093blByb3BlcnR5KG5hbWUuc3RyKCkpKSB7XG4gICAgdGhpcy53YXRjaGluZ1tuYW1lLnN0cigpXSh2YWx1ZSk7XG4gIH1cblxuICBuYW1lLnN1YnN0aXR1dGVBbGlhcyh0aGlzKTtcblxuICAvLyB3ZSBnbyBpbiBmb3IgYSBzZWFyY2ggaWYgdGhlIGZpcnN0IHBhcnQgbWF0Y2hlc1xuICBpZih0aGlzLmRhdGEuaGFzT3duUHJvcGVydHkobmFtZS5zdGFydCgpKSkge1xuICAgIHZhciBkYXRhID0gdGhpcy5kYXRhO1xuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZShpIDwgbmFtZS5iaXRzLmxlbmd0aCAtIDEpIHtcbiAgICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KG5hbWUuYml0c1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGRhdGEgPSBkYXRhW25hbWUuYml0c1tpXV07XG4gICAgICBpKys7XG4gICAgfVxuICAgIGRhdGFbbmFtZS5iaXRzW2ldXSA9IHZhbHVlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIC8vIGRhdGEgbm90IGZvdW5kLCBsZXQncyBzZWFyY2ggaW4gdGhlIHBhcmVudFxuICBpZih0aGlzLnBhcmVudCkge1xuICAgIHJldHVybiB0aGlzLnBhcmVudC5fbW9kaWZ5KG5hbWUsIHZhbHVlKTtcbiAgfVxuXG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB0aGlzLmRhdGFbbmFtZV0gPSB2YWx1ZTtcbn07XG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlcyh2LCBub2RlKSB7XG4gIHZhciBhdHRycyA9IHt9LCBuLCBzO1xuICB3aGlsZSh2KSB7XG4gICAgICB2ID0gdXRpbC50cmltKHYpO1xuICAgICAgbiA9IHYubWF0Y2goSFRNTF9BVFRSX1JFRyk7XG4gICAgICBpZighbikge1xuICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gYXR0cmlidXRlIG5hbWUgZm91bmQgaW4gXCIrdik7XG4gICAgICB9XG4gICAgICB2ID0gdi5zdWJzdHIoblswXS5sZW5ndGgpO1xuICAgICAgbiA9IG5bMF07XG4gICAgICBpZih2WzBdICE9IFwiPVwiKSB7XG4gICAgICAgIG5vZGUuY2Vycm9yKFwicGFyc2VBdHRyaWJ1dGVzOiBObyBlcXVhbCBzaWduIGFmdGVyIG5hbWUgXCIrbik7XG4gICAgICB9XG4gICAgICB2ID0gdi5zdWJzdHIoMSk7XG4gICAgICBzID0gdi5tYXRjaChET1VCTEVfUVVPVEVEX1NUUklOR19SRUcpO1xuICAgICAgaWYocykge1xuICAgICAgICBhdHRyc1tuXSA9IG5ldyBTdHJpbmdOb2RlKG51bGwsIHNbMF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcyA9IHYubWF0Y2goZXhwcmVzc2lvbi5FWFBSRVNTSU9OX1JFRyk7XG4gICAgICAgIGlmKHMgPT09IG51bGwpIHtcbiAgICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gc3RyaW5nIG9yIGV4cHJlc3Npb24gZm91bmQgYWZ0ZXIgbmFtZSBcIituKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgZXhwciA9IGV4cHJlc3Npb24uYnVpbGQoc1sxXSk7XG4gICAgICAgICAgYXR0cnNbbl0gPSBleHByO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2ID0gdi5zdWJzdHIoc1swXS5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBhdHRycztcbn1cblxuLy8gYWxsIHRoZSBhdmFpbGFibGUgdGVtcGxhdGUgbm9kZVxuXG5mdW5jdGlvbiBOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgdGhpcy5saW5lID0gbGluZTtcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuY29udGVudCA9IGNvbnRlbnQ7XG4gIHRoaXMubGV2ZWwgPSBsZXZlbDtcbiAgdGhpcy5jaGlsZHJlbiA9IFtdO1xufVxuXG5Ob2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGlmKGxldmVsID09PSB1bmRlZmluZWQpIHtcbiAgICBsZXZlbCA9IDA7XG4gIH1cbiAgZm9yKGk9MDsgaTxsZXZlbDsgaSsrKSB7XG4gICAgc3RyICs9IFwiICBcIjtcbiAgfVxuICBzdHIgKz0gU3RyaW5nKHRoaXMpICsgXCJcXHJcXG5cIjtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgc3RyICs9IHRoaXMuY2hpbGRyZW5baV0ucmVwcihsZXZlbCArIDEpO1xuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIGlmKHBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHBhdGggPSAnJztcbiAgICBwb3MgPSAwO1xuICAgIHRoaXMuaXNSb290ID0gdHJ1ZTtcbiAgfVxuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsICcnLCBwYXRoKTtcbiAgdC5jaGlsZHJlbiA9IHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gIHJldHVybiB0O1xufTtcblxuTm9kZS5wcm90b3R5cGUuY2Vycm9yID0gZnVuY3Rpb24obXNnKSB7XG4gIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcih0aGlzLnRvU3RyaW5nKCkgKyBcIjogXCIgKyBtc2cpO1xufTtcblxuTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gW107XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50cmVlQ2hpbGRyZW4gPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBbXSwgaSwgcCwgaiwgY2hpbGRyZW4gPSBudWxsLCBjaGlsZCA9IG51bGw7XG4gIGogPSBwb3M7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHAgPSBwYXRoO1xuICAgIGNoaWxkID0gdGhpcy5jaGlsZHJlbltpXTtcbiAgICBpZihjaGlsZC5oYXNPd25Qcm9wZXJ0eSgnbm9kZU5hbWUnKSkge1xuICAgICAgcCArPSAnLicgKyBqO1xuICAgICAgaisrO1xuICAgICAgY2hpbGRyZW4gPSBjaGlsZC50cmVlKGNvbnRleHQsIHAsIDApO1xuICAgICAgdC5wdXNoKGNoaWxkcmVuKTtcbiAgICB9IGVsc2UgaWYgKCFjaGlsZC5yZW5kZXJFeGxjdWRlZCkge1xuICAgICAgY2hpbGRyZW4gPSBjaGlsZC50cmVlKGNvbnRleHQsIHAsIGopO1xuICAgICAgaWYoY2hpbGRyZW4pIHtcbiAgICAgICAgdCA9IHQuY29uY2F0KGNoaWxkcmVuKTtcbiAgICAgICAgaiArPSBjaGlsZHJlbi5sZW5ndGg7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0O1xufTtcblxuTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbihjaGlsZCkge1xuICB0aGlzLmNoaWxkcmVuLnB1c2goY2hpbGQpO1xufTtcblxuTm9kZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZSArIFwiKFwiK3RoaXMuY29udGVudC5yZXBsYWNlKFwiXFxuXCIsIFwiXCIpK1wiKSBhdCBsaW5lIFwiICsgdGhpcy5saW5lO1xufTtcblxuZnVuY3Rpb24gQ29tbWVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHBhcmVudC5jaGlsZHJlbi5wdXNoKHRoaXMpO1xuICB0aGlzLnJlbmRlckV4bGN1ZGVkID0gdHJ1ZTtcbn1cbnV0aWwuaW5oZXJpdHMoQ29tbWVudE5vZGUsIE5vZGUpO1xuXG5mdW5jdGlvbiBIdG1sTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IHRoaXMuY29udGVudC5zcGxpdChcIiBcIilbMF07XG4gIHRoaXMuYXR0cnMgPSBwYXJzZUF0dHJpYnV0ZXModGhpcy5jb250ZW50LnN1YnN0cih0aGlzLm5vZGVOYW1lLmxlbmd0aCksIHRoaXMpO1xuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEh0bWxOb2RlLCBOb2RlKTtcblxuSHRtbE5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCB0aGlzLmRvbU5vZGUoY29udGV4dCwgcGF0aCksIHBhdGgpO1xuICB0LmF0dHJzID0gdGhpcy5yZW5kZXJBdHRyaWJ1dGVzKGNvbnRleHQsIHBhdGgpO1xuICB0LmNoaWxkcmVuID0gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5mdW5jdGlvbiBiaW5kaW5nTmFtZShub2RlKSB7XG4gIGlmKG5vZGUgaW5zdGFuY2VvZiBleHByZXNzaW9uLk5hbWUpIHtcbiAgICByZXR1cm4gbm9kZS5uYW1lO1xuICB9XG4gIGlmKG5vZGUgaW5zdGFuY2VvZiBTdHJpbmdOb2RlICYmIG5vZGUuY29tcGlsZWRFeHByZXNzaW9uLmxlbmd0aCA9PSAxICYmXG4gICAgICBub2RlLmNvbXBpbGVkRXhwcmVzc2lvblswXSBpbnN0YW5jZW9mIGV4cHJlc3Npb24uTmFtZSkge1xuICAgIHJldHVybiBub2RlLmNvbXBpbGVkRXhwcmVzc2lvblswXS5uYW1lO1xuICB9XG59XG5cbkh0bWxOb2RlLnByb3RvdHlwZS5yZW5kZXJBdHRyaWJ1dGVzID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICB2YXIgcl9hdHRycyA9IHt9LCBrZXksIGF0dHIsIG5hbWU7XG4gIGZvcihrZXkgaW4gdGhpcy5hdHRycykge1xuICAgIGF0dHIgPSB0aGlzLmF0dHJzW2tleV07XG4gICAgLy8gdG9kbywgZmluZCBhIGJldHRlciB3YXkgdG8gZGlzY3JpbWluYXRlIGV2ZW50c1xuICAgIGlmKGtleS5pbmRleE9mKFwibGstXCIpID09PSAwKSB7XG4gICAgICAvLyBhZGQgdGhlIHBhdGggdG8gdGhlIHJlbmRlciBub2RlIHRvIGFueSBsay10aGluZyBub2RlXG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgICAgaWYoa2V5ID09PSAnbGstYmluZCcpIHtcbiAgICAgICAgcl9hdHRyc1trZXldID0gYXR0ci5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJfYXR0cnNba2V5XSA9IFwidHJ1ZVwiO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmKGF0dHIuZXZhbHVhdGUpIHtcbiAgICAgIHZhciB2ID0gYXR0ci5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICAgIGlmKHYgPT09IGZhbHNlKSB7XG4gICAgICAgIC8vIG5vdGhpbmdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJfYXR0cnNba2V5XSA9IHY7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJfYXR0cnNba2V5XSA9IGF0dHI7XG4gICAgfVxuICB9XG4gIGlmKFwiaW5wdXQsc2VsZWN0LHRleHRhcmVhXCIuaW5kZXhPZih0aGlzLm5vZGVOYW1lKSAhPSAtMSAmJiB0aGlzLmF0dHJzLmhhc093blByb3BlcnR5KCd2YWx1ZScpKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnMudmFsdWU7XG4gICAgbmFtZSA9IGJpbmRpbmdOYW1lKGF0dHIpO1xuICAgIGlmKG5hbWUgJiYgdGhpcy5hdHRyc1snbGstYmluZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJfYXR0cnNbJ2xrLWJpbmQnXSA9IG5hbWU7XG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgIH1cbiAgfVxuICBpZih0aGlzLm5vZGVOYW1lID09IFwidGV4dGFyZWFcIiAmJiB0aGlzLmNoaWxkcmVuLmxlbmd0aCA9PSAxKSB7XG4gICAgbmFtZSA9IGJpbmRpbmdOYW1lKHRoaXMuY2hpbGRyZW5bMF0uZXhwcmVzc2lvbik7XG4gICAgaWYobmFtZSAmJiB0aGlzLmF0dHJzWydsay1iaW5kJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcl9hdHRyc1snbGstYmluZCddID0gbmFtZTtcbiAgICAgIHJfYXR0cnNbJ2xrLXBhdGgnXSA9IHBhdGg7XG4gICAgICAvLyBhcyBzb29uIGFzIHRoZSB1c2VyIGhhcyBhbHRlcmVkIHRoZSB2YWx1ZSBvZiB0aGUgdGV4dGFyZWEgb3Igc2NyaXB0IGhhcyBhbHRlcmVkXG4gICAgICAvLyB0aGUgdmFsdWUgcHJvcGVydHkgb2YgdGhlIHRleHRhcmVhLCB0aGUgdGV4dCBub2RlIGlzIG91dCBvZiB0aGUgcGljdHVyZSBhbmQgaXMgbm9cbiAgICAgIC8vIGxvbmdlciBib3VuZCB0byB0aGUgdGV4dGFyZWEncyB2YWx1ZSBpbiBhbnkgd2F5LlxuICAgICAgcl9hdHRycy52YWx1ZSA9IHRoaXMuY2hpbGRyZW5bMF0uZXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJfYXR0cnM7XG59O1xuXG5IdG1sTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRoaXMubm9kZU5hbWUpLCBrZXksIGF0dHJzPXRoaXMucmVuZGVyQXR0cmlidXRlcyhjb250ZXh0LCBwYXRoKTtcbiAgZm9yKGtleSBpbiBhdHRycykge1xuICAgIG5vZGUuc2V0QXR0cmlidXRlKGtleSwgYXR0cnNba2V5XSk7XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59O1xuXG5mdW5jdGlvbiBGb3JOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgLy8gc3ludGF4OiBmb3Iga2V5LCB2YWx1ZSBpbiBsaXN0XG4gIC8vICAgICAgICAgZm9yIHZhbHVlIGluIGxpc3RcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB2YXIgdmFyMSwgdmFyMiwgc291cmNlTmFtZTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cig0KSk7XG4gIHZhcjEgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgaWYoIXZhcjEpIHtcbiAgICB0aGlzLmNlcnJvcihcImZpcnN0IHZhcmlhYmxlIG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHZhcjFbMF0ubGVuZ3RoKSk7XG4gIGlmKGNvbnRlbnRbMF0gPT0gJywnKSB7XG4gICAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cigxKSk7XG4gICAgdmFyMiA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICAgIGlmKCF2YXIyKSB7XG4gICAgICB0aGlzLmNlcnJvcihcInNlY29uZCB2YXJpYWJsZSBhZnRlciBjb21tYSBpcyBtaXNzaW5nXCIpO1xuICAgIH1cbiAgICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHZhcjJbMF0ubGVuZ3RoKSk7XG4gIH1cbiAgaWYoIWNvbnRlbnQubWF0Y2goL15pbi8pKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJpbiBrZXl3b3JkIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cigyKSk7XG4gIHNvdXJjZU5hbWUgPSBjb250ZW50Lm1hdGNoKGV4cHJlc3Npb24uTmFtZS5yZWcpO1xuICBpZighc291cmNlTmFtZSkge1xuICAgIHRoaXMuY2Vycm9yKFwiaXRlcmFibGUgbmFtZSBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIHRoaXMuc291cmNlTmFtZSA9IHNvdXJjZU5hbWVbMF07XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoc291cmNlTmFtZVswXS5sZW5ndGgpKTtcbiAgaWYoY29udGVudCAhPT0gXCJcIikge1xuICAgIHRoaXMuY2Vycm9yKFwibGVmdCBvdmVyIHVucGFyc2FibGUgY29udGVudDogXCIgKyBjb250ZW50KTtcbiAgfVxuXG4gIGlmKHZhcjEgJiYgdmFyMikge1xuICAgIHRoaXMuaW5kZXhOYW1lID0gdmFyMTtcbiAgICB0aGlzLmFsaWFzID0gdmFyMlswXTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmFsaWFzID0gdmFyMVswXTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEZvck5vZGUsIE5vZGUpO1xuXG5Gb3JOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gW10sIGtleTtcbiAgdmFyIGQgPSBjb250ZXh0LmdldCh0aGlzLnNvdXJjZU5hbWUpO1xuICBmb3Ioa2V5IGluIGQpIHtcbiAgICAvLyBwdXR0aW5nIHRoZSBhbGlhcyBpbiB0aGUgY29udGV4dFxuICAgIHZhciBuZXdfZGF0YSA9IHt9O1xuICAgIC8vIG5ld19kYXRhW3RoaXMuYWxpYXNdID0gZFtrZXldO1xuICAgIC8vIGFkZCB0aGUga2V5IHRvIGFjY2VzcyB0aGUgY29udGV4dFxuICAgIGlmKHRoaXMuaW5kZXhOYW1lKSB7XG4gICAgICAgIG5ld19kYXRhW3RoaXMuaW5kZXhOYW1lXSA9IGtleTtcbiAgICB9XG4gICAgdmFyIG5ld19jb250ZXh0ID0gbmV3IENvbnRleHQobmV3X2RhdGEsIGNvbnRleHQpO1xuICAgIC8vIGtlZXAgdHJhY2sgb2Ygd2hlcmUgdGhlIGRhdGEgaXMgY29taW5nIGZyb21cbiAgICBuZXdfY29udGV4dC5hZGRBbGlhcyh0aGlzLnNvdXJjZU5hbWUgKyAnLicgKyBrZXksIHRoaXMuYWxpYXMpO1xuICAgIHQgPSB0LmNvbmNhdCh0aGlzLnRyZWVDaGlsZHJlbihuZXdfY29udGV4dCwgcGF0aCwgdC5sZW5ndGggKyBwb3MpKTtcbiAgfVxuICByZXR1cm4gdDtcbn07XG5cbmZ1bmN0aW9uIElmTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5idWlsZChjb250ZW50LnJlcGxhY2UoL15pZi9nLCBcIlwiKSk7XG4gIHBhcmVudC5jaGlsZHJlbi5wdXNoKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhJZk5vZGUsIE5vZGUpO1xuXG5JZk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgaWYoIXRoaXMuZXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KSkge1xuICAgIGlmKHRoaXMuZWxzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZWxzZS50cmVlKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICByZXR1cm4gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIEVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5zZWFyY2hJZihjdXJyZW50Tm9kZSk7XG59XG51dGlsLmluaGVyaXRzKEVsc2VOb2RlLCBOb2RlKTtcblxuRWxzZU5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgcmV0dXJuIHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5mdW5jdGlvbiBJZkVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5idWlsZChjb250ZW50LnJlcGxhY2UoL15lbHNlaWYvZywgXCJcIikpO1xuICB0aGlzLnNlYXJjaElmKGN1cnJlbnROb2RlKTtcbn1cbi8vIGltcG9ydGFudCB0byBiZSBhbiBJZk5vZGVcbnV0aWwuaW5oZXJpdHMoSWZFbHNlTm9kZSwgSWZOb2RlKTtcblxuSWZFbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWYgPSBmdW5jdGlvbiBzZWFyY2hJZihjdXJyZW50Tm9kZSkge1xuICAvLyBmaXJzdCBub2RlIG9uIHRoZSBzYW1lIGxldmVsIGhhcyB0byBiZSB0aGUgaWYvZWxzZWlmIG5vZGVcbiAgd2hpbGUoY3VycmVudE5vZGUpIHtcbiAgICBpZihjdXJyZW50Tm9kZS5sZXZlbCA8IHRoaXMubGV2ZWwpIHtcbiAgICAgIHRoaXMuY2Vycm9yKFwiY2Fubm90IGZpbmQgYSBjb3JyZXNwb25kaW5nIGlmLWxpa2Ugc3RhdGVtZW50IGF0IHRoZSBzYW1lIGxldmVsLlwiKTtcbiAgICB9XG4gICAgaWYoY3VycmVudE5vZGUubGV2ZWwgPT0gdGhpcy5sZXZlbCkge1xuICAgICAgaWYoIShjdXJyZW50Tm9kZSBpbnN0YW5jZW9mIElmTm9kZSkpIHtcbiAgICAgICAgdGhpcy5jZXJyb3IoXCJhdCB0aGUgc2FtZSBsZXZlbCBpcyBub3QgYSBpZi1saWtlIHN0YXRlbWVudC5cIik7XG4gICAgICB9XG4gICAgICBjdXJyZW50Tm9kZS5lbHNlID0gdGhpcztcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjdXJyZW50Tm9kZSA9IGN1cnJlbnROb2RlLnBhcmVudDtcbiAgfVxufTtcbkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZiA9IElmRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmO1xuXG5mdW5jdGlvbiBFeHByZXNzaW9uTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IFwic3RyaW5nXCI7XG4gIHZhciBtID0gY29udGVudC5tYXRjaChleHByZXNzaW9uLkVYUFJFU1NJT05fUkVHKTtcbiAgaWYoIW0pIHtcbiAgICB0aGlzLmNlcnJvcihcImRlY2xhcmVkIGltcHJvcGVybHlcIik7XG4gIH1cbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5idWlsZChtWzFdKTtcbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhFeHByZXNzaW9uTm9kZSwgTm9kZSk7XG5cbkV4cHJlc3Npb25Ob2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICAvLyByZW5kZXJlclxuICB2YXIgcmVuZGVyZXIgPSBTdHJpbmcodGhpcy5leHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpKTtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCk7XG4gIHJldHVybiB0O1xufTtcblxuRXhwcmVzc2lvbk5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0aGlzLmV4cHJlc3Npb24uZXZhbHVhdGUoY29udGV4dCkpO1xufTtcblxuZnVuY3Rpb24gU3RyaW5nTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IFwic3RyaW5nXCI7XG4gIHRoaXMuc3RyaW5nID0gdGhpcy5jb250ZW50LnJlcGxhY2UoL15cInxcIiQvZywgXCJcIikucmVwbGFjZSgvXFxcXFwiL2csICdcIicsICdnbScpO1xuICB0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uY29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyh0aGlzLnN0cmluZyk7XG4gIGlmKHBhcmVudCkge1xuICAgIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbiAgfVxufVxudXRpbC5pbmhlcml0cyhTdHJpbmdOb2RlLCBOb2RlKTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgLy8gcmVuZGVyZXIgc2hvdWxkIGJlIGFsbCBhdHRyaWJ1dGVzXG4gIHZhciByZW5kZXJlciA9IGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCk7XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgcmVuZGVyZXIsIHBhdGgpO1xuICByZXR1cm4gdDtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KTtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpKTtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24oY2hpbGQpIHtcbiAgdGhpcy5jZXJyb3IoXCJjYW5ub3QgaGF2ZSBjaGlsZHJlbiBcIiArIGNoaWxkKTtcbn07XG5cbmZ1bmN0aW9uIEluY2x1ZGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5hbWUgPSB1dGlsLnRyaW0oY29udGVudC5zcGxpdChcIiBcIilbMV0pO1xuICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZVt0aGlzLm5hbWVdO1xuICBpZih0aGlzLnRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLmNlcnJvcihcIlRlbXBsYXRlIHdpdGggbmFtZSBcIiArIHRoaXMubmFtZSArIFwiIGlzIG5vdCByZWdpc3RlcmVkXCIpO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSW5jbHVkZU5vZGUsIE5vZGUpO1xuXG5JbmNsdWRlTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZS50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIENvbXBvbmVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudCkuc3Vic3RyKDEwKTtcbiAgdmFyIG5hbWUgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgaWYoIW5hbWUpIHtcbiAgICB0aGlzLmNlcnJvcihcIkNvbXBvbmVudCBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cihuYW1lWzBdLmxlbmd0aCkpO1xuICB0aGlzLm5hbWUgPSBuYW1lWzBdO1xuICB0aGlzLmF0dHJzID0gcGFyc2VBdHRyaWJ1dGVzKGNvbnRlbnQsIHRoaXMpO1xuICB0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudENhY2hlW3RoaXMubmFtZV07XG4gIGlmKHRoaXMuY29tcG9uZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLmNlcnJvcihcIkNvbXBvbmVudCB3aXRoIG5hbWUgXCIgKyB0aGlzLm5hbWUgKyBcIiBpcyBub3QgcmVnaXN0ZXJlZFwiKTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKENvbXBvbmVudE5vZGUsIE5vZGUpO1xuXG5Db21wb25lbnROb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciBuZXdfY29udGV4dCA9IG5ldyBDb250ZXh0KHt9LCBjb250ZXh0KTtcbiAgdmFyIGtleSwgYXR0ciwgdmFsdWUsIHNvdXJjZTtcbiAgZm9yKGtleSBpbiB0aGlzLmF0dHJzKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnNba2V5XTtcbiAgICBpZihhdHRyLmV2YWx1YXRlKSB7XG4gICAgICB2YWx1ZSA9IGF0dHIuZXZhbHVhdGUoY29udGV4dCk7XG4gICAgICAvLyB0b2RvIDogaWYgZXhwcmVzc2lvbiBhdHRyaWJ1dGUsIGFkZCBhbiBhbGlhc1xuICAgICAgaWYodmFsdWUgPT09IGZhbHNlKSB7XG4gICAgICAgIC8vIG5vdGhpbmdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld19jb250ZXh0LnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgc291cmNlID0gYmluZGluZ05hbWUoYXR0cik7XG4gICAgICAgIGlmKHNvdXJjZSAmJiBrZXkgIT0gc291cmNlKSB7XG4gICAgICAgICAgbmV3X2NvbnRleHQuYWRkQWxpYXMoc291cmNlLCBrZXkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vbmV3X2NvbnRleHQuc2V0KGtleSwgdmFsdWUpO1xuICAgIH1cbiAgfVxuICBpZih0aGlzLmNvbXBvbmVudC5jb250cm9sbGVyKXtcbiAgICB0aGlzLmNvbXBvbmVudC5jb250cm9sbGVyKG5ld19jb250ZXh0KTtcbiAgfVxuICByZXR1cm4gdGhpcy5jb21wb25lbnQudGVtcGxhdGUudHJlZUNoaWxkcmVuKG5ld19jb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuQ29tcG9uZW50Tm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gIHJldHVybiB0aGlzLmNvbXBvbmVudC50ZW1wbGF0ZS5yZXByKGxldmVsICsgMSk7XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIHZhciBub2RlO1xuICBpZihjb250ZW50Lmxlbmd0aCA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgU3RyaW5nTm9kZShwYXJlbnQsIFwiXFxuXCIsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCcjJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IENvbW1lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2lmICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBJZk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignZWxzZWlmICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBJZkVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSwgY3VycmVudE5vZGUpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdlbHNlJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSwgY3VycmVudE5vZGUpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdmb3IgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEZvck5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignaW5jbHVkZSAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgSW5jbHVkZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignY29tcG9uZW50ICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBDb21wb25lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ1wiJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IFN0cmluZ05vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKC9eXFx3Ly5leGVjKGNvbnRlbnQpKSB7XG4gICAgbm9kZSA9IG5ldyBIdG1sTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCd7eycpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBFeHByZXNzaW9uTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcImNyZWF0ZU5vZGU6IHVua25vdyBub2RlIHR5cGUgXCIgKyBjb250ZW50KTtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gYnVpbGRUZW1wbGF0ZSh0cGwsIHRlbXBsYXRlTmFtZSkge1xuXG4gIGlmKHR5cGVvZiB0cGwgPT0gJ29iamVjdCcpIHtcbiAgICB0cGwgPSB0cGwuam9pbignXFxuJyk7XG4gIH1cblxuICB2YXIgcm9vdCA9IG5ldyBOb2RlKG51bGwsIFwiXCIsIDApLCBsaW5lcywgbGluZSwgbGV2ZWwsXG4gICAgY29udGVudCwgaSwgY3VycmVudE5vZGUgPSByb290LCBwYXJlbnQsIHNlYXJjaE5vZGU7XG5cbiAgbGluZXMgPSB0cGwuc3BsaXQoXCJcXG5cIik7XG5cbiAgZm9yKGk9MDsgaTxsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGxpbmUgPSBsaW5lc1tpXTtcbiAgICBsZXZlbCA9IGxpbmUubWF0Y2goL1xccyovKVswXS5sZW5ndGggKyAxO1xuICAgIGNvbnRlbnQgPSBsaW5lLnNsaWNlKGxldmVsIC0gMSk7XG5cbiAgICAvLyBtdWx0aWxpbmUgc3VwcG9ydDogZW5kcyB3aXRoIGEgXFxcbiAgICB2YXIgaiA9IDA7XG4gICAgd2hpbGUoY29udGVudC5tYXRjaCgvXFxcXCQvKSkge1xuICAgICAgICBqKys7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1xcXFwkLywgJycpICsgbGluZXNbaStqXTtcbiAgICB9XG4gICAgaSA9IGkgKyBqO1xuXG4gICAgLy8gbXVsdGlsaW5lIHN0cmluZ3NcbiAgICBqID0gMDtcbiAgICBpZihjb250ZW50Lm1hdGNoKC9eXCJcIlwiLykpIHtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXlwiXCJcIi8sICdcIicpO1xuICAgICAgICB3aGlsZSghY29udGVudC5tYXRjaCgvXCJcIlwiJC8pKSB7XG4gICAgICAgICAgICBqKys7XG4gICAgICAgICAgICBpZihpK2ogPiBsaW5lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiTXVsdGlsaW5lIHN0cmluZyBzdGFydGVkIGJ1dCB1bmZpbmlzaGVkIGF0IGxpbmUgXCIgKyAoaSArIDEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50ICsgbGluZXNbaStqXTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cIlwiXCIkLywgJ1wiJyk7XG4gICAgfVxuICAgIGkgPSBpICsgajtcblxuICAgIHNlYXJjaE5vZGUgPSBjdXJyZW50Tm9kZTtcbiAgICBwYXJlbnQgPSBudWxsO1xuXG4gICAgLy8gc2VhcmNoIGZvciB0aGUgcGFyZW50IG5vZGVcbiAgICB3aGlsZSh0cnVlKSB7XG5cbiAgICAgIGlmKGxldmVsID4gc2VhcmNoTm9kZS5sZXZlbCkge1xuICAgICAgICBwYXJlbnQgPSBzZWFyY2hOb2RlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYoIXNlYXJjaE5vZGUucGFyZW50KSB7XG4gICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkluZGVudGF0aW9uIGVycm9yIGF0IGxpbmUgXCIgKyAoaSArIDEpKTtcbiAgICAgIH1cblxuICAgICAgaWYobGV2ZWwgPT0gc2VhcmNoTm9kZS5sZXZlbCkge1xuICAgICAgICBwYXJlbnQgPSBzZWFyY2hOb2RlLnBhcmVudDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIHNlYXJjaE5vZGUgPSBzZWFyY2hOb2RlLnBhcmVudDtcbiAgICB9XG5cbiAgICBpZihwYXJlbnQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICBpZihwYXJlbnQuY2hpbGRyZW5bMF0ubGV2ZWwgIT0gbGV2ZWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW5kZW50YXRpb24gZXJyb3IgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBub2RlID0gY3JlYXRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBpLCBjdXJyZW50Tm9kZSk7XG4gICAgY3VycmVudE5vZGUgPSBub2RlO1xuXG4gIH1cbiAgaWYodGVtcGxhdGVOYW1lKSB7XG4gICAgdGVtcGxhdGVDYWNoZVt0ZW1wbGF0ZU5hbWVdID0gcm9vdDtcbiAgfVxuXG4gIHJldHVybiByb290O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGRUZW1wbGF0ZTogYnVpbGRUZW1wbGF0ZSxcbiAgcGFyc2VBdHRyaWJ1dGVzOiBwYXJzZUF0dHJpYnV0ZXMsXG4gIENvbnRleHQ6IENvbnRleHQsXG4gIHRlbXBsYXRlQ2FjaGU6IHRlbXBsYXRlQ2FjaGUsXG4gIGNvbXBvbmVudENhY2hlOiBjb21wb25lbnRDYWNoZSxcbiAgQ29udGV4dE5hbWU6IENvbnRleHROYW1lXG59OyIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGluaGVyaXRzKGNoaWxkLCBwYXJlbnQpIHtcbiAgY2hpbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlKTtcbiAgY2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY2hpbGQ7XG59XG5cbmZ1bmN0aW9uIENvbXBpbGVFcnJvcihtc2cpIHtcbiAgdGhpcy5uYW1lID0gXCJDb21waWxlRXJyb3JcIjtcbiAgdGhpcy5tZXNzYWdlID0gKG1zZyB8fCBcIlwiKTtcbn1cbkNvbXBpbGVFcnJvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGU7XG5cbmZ1bmN0aW9uIFJ1bnRpbWVFcnJvcihtc2cpIHtcbiAgdGhpcy5uYW1lID0gXCJSdW50aW1lRXJyb3JcIjtcbiAgdGhpcy5tZXNzYWdlID0gKG1zZyB8fCBcIlwiKTtcbn1cblJ1bnRpbWVFcnJvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGU7XG5cbmZ1bmN0aW9uIGVzY2FwZSh1bnNhZmUpIHtcbiAgcmV0dXJuIHVuc2FmZVxuICAgIC5yZXBsYWNlKC8mL2csIFwiJmFtcDtcIilcbiAgICAucmVwbGFjZSgvPC9nLCBcIiZsdDtcIilcbiAgICAucmVwbGFjZSgvPi9nLCBcIiZndDtcIilcbiAgICAucmVwbGFjZSgvXCIvZywgXCImcXVvdDtcIilcbiAgICAucmVwbGFjZSgvJy9nLCBcIiYjMDM5O1wiKTtcbn1cblxuZnVuY3Rpb24gdHJpbSh0eHQpIHtcbiAgcmV0dXJuIHR4dC5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nICxcIlwiKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaGVyaXRzOmluaGVyaXRzLFxuICBDb21waWxlRXJyb3I6Q29tcGlsZUVycm9yLFxuICBSdW50aW1lRXJyb3I6UnVudGltZUVycm9yLFxuICBlc2NhcGU6ZXNjYXBlLFxuICB0cmltOnRyaW1cbn07Il19
(2)
});
