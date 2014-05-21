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
  var arrays = [], key, l=0, array;
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
    array = this.treeChildren(new_context, path, l + pos);
    l += array.length;
    arrays.push(array);
  }
  return [].concat.apply([], arrays);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDanFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5cInVzZSBzdHJpY3RcIjtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBFWFBSRVNTSU9OX1JFRyA9IC9ee3soLis/KX19LztcblxuLy8gRXhwcmVzc2lvbiBldmFsdWF0aW9uIGVuZ2luZVxuZnVuY3Rpb24gU3RyaW5nVmFsdWUodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwidmFsdWVcIjtcbiAgaWYodHh0WzBdID09ICdcIicpIHtcbiAgICB0aGlzLnZhbHVlID0gdHh0LnJlcGxhY2UoL15cInxcIiQvZywgXCJcIik7XG4gIH0gZWxzZSBpZih0eHRbMF0gPT0gXCInXCIpIHtcbiAgICB0aGlzLnZhbHVlID0gdHh0LnJlcGxhY2UoL14nfCckL2csIFwiXCIpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkludmFsaWQgc3RyaW5nIHZhbHVlIFwiICsgdHh0KTtcbiAgfVxufVxuU3RyaW5nVmFsdWUucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy52YWx1ZTtcbn07XG5TdHJpbmdWYWx1ZS5yZWcgPSAvXlwiKD86XFxcXFwifFteXCJdKSpcInxeJyg/OlxcXFwnfFteJ10pKicvO1xuXG5mdW5jdGlvbiBFcXVhbE9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuRXF1YWxPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgPT0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5FcXVhbE9wZXJhdG9yLnJlZyA9IC9ePT0vO1xuXG5mdW5jdGlvbiBOb3RFcXVhbE9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuTm90RXF1YWxPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgIT0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5Ob3RFcXVhbE9wZXJhdG9yLnJlZyA9IC9eIT0vO1xuXG5mdW5jdGlvbiBCaWdnZXJPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbkJpZ2dlck9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSA+IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuQmlnZ2VyT3BlcmF0b3IucmVnID0gL14+LztcblxuZnVuY3Rpb24gU21hbGxlck9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xuICB0aGlzLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgPCB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xuICB9O1xufVxuU21hbGxlck9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSA8IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuU21hbGxlck9wZXJhdG9yLnJlZyA9IC9ePC87XG5cbmZ1bmN0aW9uIE9yT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5Pck9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSB8fCB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbk9yT3BlcmF0b3IucmVnID0gL15vci87XG5cbmZ1bmN0aW9uIEFuZE9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuQW5kT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpICYmIHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuQW5kT3BlcmF0b3IucmVnID0gL15hbmQvO1xuXG5mdW5jdGlvbiBOYW1lKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcInZhbHVlXCI7XG4gIHRoaXMubmFtZSA9IHR4dDtcbn1cbk5hbWUucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgdmFsdWUgPSBjb250ZXh0LmdldCh0aGlzLm5hbWUpO1xuICByZXR1cm4gdmFsdWU7XG59O1xuTmFtZS5yZWcgPSAvXltBLVphLXpdW1xcd1xcLl17MCx9LztcblxuZnVuY3Rpb24gRmlsdGVyKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbkZpbHRlci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHZhciBmY3QgPSBjb250ZXh0LmdldCh0aGlzLnJpZ2h0Lm5hbWUpO1xuICByZXR1cm4gZmN0LmFwcGx5KHRoaXMsIFt0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCksIGNvbnRleHRdKTtcbn07XG5GaWx0ZXIucmVnID0gL15cXHwvO1xuXG4vLyBtYXRoXG5cbmZ1bmN0aW9uIE11bHRpcGx5T3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9ICdvcGVyYXRvcic7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuTXVsdGlwbHlPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgKiB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbk11bHRpcGx5T3BlcmF0b3IucmVnID0gL15cXCovO1xuXG5mdW5jdGlvbiBQbHVzT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9ICdvcGVyYXRvcic7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuUGx1c09wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSArIHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuUGx1c09wZXJhdG9yLnJlZyA9IC9eXFwrLztcblxuZnVuY3Rpb24gTWludXNPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5NaW51c09wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSAtIHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuTWludXNPcGVyYXRvci5yZWcgPSAvXlxcLS87XG5cbmZ1bmN0aW9uIEZ1bmN0aW9uQ2FsbCh0eHQpIHtcbiAgdGhpcy50eXBlID0gJ3ZhbHVlJztcbiAgdmFyIG0gPSB0eHQubWF0Y2goL14oW2EtekEtWl1bYS16QS1aMC05XFwuXSopXFwoKFteXFwpXSopXFwpLyk7XG4gIHRoaXMuZnVuY05hbWUgPSBtWzFdO1xuICB0aGlzLnBhcmFtcyA9IG1bMl0uc3BsaXQoJywnKTtcbn1cbkZ1bmN0aW9uQ2FsbC5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHZhciBmdW5jID0gY29udGV4dC5nZXQodGhpcy5mdW5jTmFtZSksIGksIHBhcmFtcz1bXTtcbiAgZm9yKGk9MDsgaTx0aGlzLnBhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgIHBhcmFtcy5wdXNoKGNvbnRleHQuZ2V0KHV0aWwudHJpbSh0aGlzLnBhcmFtc1tpXSkpKTtcbiAgfVxuICByZXR1cm4gZnVuYy5hcHBseShjb250ZXh0LCBwYXJhbXMpO1xufTtcbkZ1bmN0aW9uQ2FsbC5yZWcgPSAvXlthLXpBLVpdW2EtekEtWjAtOVxcLl0qXFwoW15cXCldKlxcKS87XG5cbmZ1bmN0aW9uIE51bWJlclZhbHVlKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcInZhbHVlXCI7XG4gIHRoaXMubnVtYmVyID0gcGFyc2VGbG9hdCh0eHQsIDEwKTtcbiAgdGhpcy5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICByZXR1cm4gdGhpcy5udW1iZXI7XG4gIH07XG59XG5OdW1iZXJWYWx1ZS5yZWcgPSAvXlswLTldKy87XG5cbmZ1bmN0aW9uIElmT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9ICdvcGVyYXRvcic7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuSWZPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHZhciBydiA9IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG4gIGlmKHJ2KSB7XG4gICAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KTtcbiAgfVxuICByZXR1cm4gcnY7XG59O1xuSWZPcGVyYXRvci5yZWcgPSAvXmlmIC87XG5cbmZ1bmN0aW9uIEluT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9ICdvcGVyYXRvcic7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuSW5PcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHZhciBsZWZ0ID0gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpO1xuICB2YXIgcmlnaHQgPSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xuICBpZihyaWdodCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuUnVudGltZUVycm9yKCdyaWdodCBzaWRlIG9mIGluIG9wZXJhdG9yIGNhbm5vdCBiZSB1bmRlZmluZWQnKTtcbiAgfVxuICBpZihyaWdodC5pbmRleE9mKSB7XG4gICAgcmV0dXJuIHJpZ2h0LmluZGV4T2YobGVmdCkgIT0gLTE7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJpZ2h0Lmhhc093blByb3BlcnR5KGxlZnQpO1xuICB9XG59O1xuSW5PcGVyYXRvci5yZWcgPSAvXmluIC87XG5cbmZ1bmN0aW9uIE5vdE9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAndW5hcnknO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbk5vdE9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuICF0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbk5vdE9wZXJhdG9yLnJlZyA9IC9ebm90IC87XG5cbmZ1bmN0aW9uIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnModHh0KSB7XG4gIC8vIGNvbXBpbGUgdGhlIGV4cHJlc3Npb25zIGZvdW5kIGluIHRoZSB0ZXh0XG4gIC8vIGFuZCByZXR1cm4gYSBsaXN0IG9mIHRleHQrZXhwcmVzc2lvblxuICB2YXIgZXhwciwgYXJvdW5kO1xuICB2YXIgbGlzdCA9IFtdO1xuICB3aGlsZSh0cnVlKSB7XG4gICAgdmFyIG1hdGNoID0gL3t7KC4rPyl9fS8uZXhlYyh0eHQpO1xuICAgIGlmKCFtYXRjaCkge1xuICAgICAgaWYodHh0KSB7XG4gICAgICAgIGxpc3QucHVzaCh0eHQpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGV4cHIgPSBidWlsZChtYXRjaFsxXSk7XG4gICAgYXJvdW5kID0gdHh0LnNwbGl0KG1hdGNoWzBdLCAyKTtcbiAgICBpZihhcm91bmRbMF0ubGVuZ3RoKSB7XG4gICAgICBsaXN0LnB1c2goYXJvdW5kWzBdKTtcbiAgICB9XG4gICAgbGlzdC5wdXNoKGV4cHIpO1xuICAgIHR4dCA9IGFyb3VuZFsxXTtcbiAgfVxuICByZXR1cm4gbGlzdDtcbn1cblxuZnVuY3Rpb24gZXZhbHVhdGVFeHByZXNzaW9uTGlzdChleHByZXNzaW9ucywgY29udGV4dCkge1xuICB2YXIgc3RyID0gXCJcIiwgaTtcbiAgZm9yKGk9MDsgaTxleHByZXNzaW9ucy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwYXJhbSA9IGV4cHJlc3Npb25zW2ldO1xuICAgIGlmKHBhcmFtLmV2YWx1YXRlKSB7XG4gICAgICBzdHIgKz0gcGFyYW0uZXZhbHVhdGUoY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSBwYXJhbTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn1cblxuLy8gbGlzdCBvcmRlciBkZWZpbmUgb3BlcmF0b3IgcHJlY2VkZW5jZVxudmFyIGV4cHJlc3Npb25fbGlzdCA9IFtcbiAgTXVsdGlwbHlPcGVyYXRvcixcbiAgUGx1c09wZXJhdG9yLFxuICBNaW51c09wZXJhdG9yLFxuICBCaWdnZXJPcGVyYXRvcixcbiAgU21hbGxlck9wZXJhdG9yLFxuICBFcXVhbE9wZXJhdG9yLFxuICBOb3RFcXVhbE9wZXJhdG9yLFxuICBGaWx0ZXIsXG4gIEluT3BlcmF0b3IsXG4gIE5vdE9wZXJhdG9yLFxuICBJZk9wZXJhdG9yLFxuICBPck9wZXJhdG9yLFxuICBBbmRPcGVyYXRvcixcbiAgU3RyaW5nVmFsdWUsXG4gIE51bWJlclZhbHVlLFxuICBGdW5jdGlvbkNhbGwsXG4gIE5hbWUsXG5dO1xuXG5mdW5jdGlvbiBidWlsZChpbnB1dCkge1xuICByZXR1cm4gYnVpbGRFeHByZXNzaW9ucyhwYXJzZUV4cHJlc3Npb25zKGlucHV0KSk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbnMoaW5wdXQpIHtcbiAgLy8gUmV0dXJuIGEgbGlzdCBvZiBleHByZXNzaW9uc1xuICB2YXIgY3VycmVudEV4cHIgPSBudWxsLCBpLCBleHByLCBtYXRjaCwgZm91bmQsIHBhcnNlZCA9IFtdO1xuICB3aGlsZShpbnB1dCkge1xuICAgIGlucHV0ID0gdXRpbC50cmltKGlucHV0KTtcbiAgICBmb3VuZCA9IGZhbHNlO1xuICAgIGZvcihpPTA7IGk8ZXhwcmVzc2lvbl9saXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGV4cHIgPSBleHByZXNzaW9uX2xpc3RbaV07XG4gICAgICAgIG1hdGNoID0gZXhwci5yZWcuZXhlYyhpbnB1dCk7XG4gICAgICAgIGlmKG1hdGNoKSB7XG4gICAgICAgICAgaW5wdXQgPSBpbnB1dC5zbGljZShtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICAgIHBhcnNlZC5wdXNoKG5ldyBleHByKG1hdGNoWzBdLCBjdXJyZW50RXhwcikpO1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAvLyBzdGFydGluZyBhZ2FpbiB0byByZXNwZWN0IHByZWNlZGVuY2VcbiAgICAgICAgICBpID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZihmb3VuZCA9PT0gZmFsc2UpIHtcbiAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkV4cHJlc3Npb24gcGFyc2VyOiBJbXBvc3NpYmxlIHRvIHBhcnNlIGZ1cnRoZXIgOiBcIiArIGlucHV0KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHBhcnNlZDtcbn1cblxuZnVuY3Rpb24gYnVpbGRFeHByZXNzaW9ucyhsaXN0KSB7XG4gIC8vIGJ1aWxkIGEgdHJlZSBvZiBleHByZXNzaW9uIHJlc3BlY3RpbmcgcHJlY2VkZW5jZVxuICB2YXIgaSwgaiwgZXhwcjtcbiAgLy8gYSBkdW1iIGFsZ28gdGhhdCB3b3Jrc1xuICBmb3IoaT0wOyBpPGV4cHJlc3Npb25fbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGZvcihqPTA7IGo8bGlzdC5sZW5ndGg7IGorKykge1xuICAgICAgaWYobGlzdC5sZW5ndGggPT0gMSkge1xuICAgICAgICByZXR1cm4gbGlzdFswXTtcbiAgICAgIH1cbiAgICAgIGV4cHIgPSBsaXN0W2pdO1xuICAgICAgaWYoZXhwciBpbnN0YW5jZW9mIGV4cHJlc3Npb25fbGlzdFtpXSkge1xuICAgICAgICBpZihleHByLnR5cGUgPT0gJ29wZXJhdG9yJykge1xuICAgICAgICAgIGV4cHIubGVmdCA9IGxpc3Rbai0xXTtcbiAgICAgICAgICBleHByLnJpZ2h0ID0gbGlzdFtqKzFdO1xuICAgICAgICAgIGxpc3Quc3BsaWNlKGotMSwgMik7XG4gICAgICAgICAgbGlzdFtqLTFdID0gZXhwcjtcbiAgICAgICAgICBqID0gaiAtIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYoZXhwci50eXBlID09ICd1bmFyeScpIHtcbiAgICAgICAgICBleHByLnJpZ2h0ID0gbGlzdFtqKzFdO1xuICAgICAgICAgIGxpc3Quc3BsaWNlKGorMSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoZXhwci50eXBlID09ICd2YWx1ZScpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJFeHByZXNzaW9uIGJ1aWxkZXI6IGV4cGVjdGVkIGFuIG9wZXJhdG9yIGJ1dCBnb3QgXCIgKyBleHByLmNvbnN0cnVjdG9yLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmKGxpc3QubGVuZ3RoID09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJFeHByZXNzaW9uIGJ1aWxkZXI6IGluY29ycmVjdCBleHByZXNzaW9uIGNvbnN0cnVjdGlvbiBcIiArIGxpc3QpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBidWlsZDpidWlsZCxcbiAgY29tcGlsZVRleHRBbmRFeHByZXNzaW9uczpjb21waWxlVGV4dEFuZEV4cHJlc3Npb25zLFxuICBidWlsZEV4cHJlc3Npb25zOmJ1aWxkRXhwcmVzc2lvbnMsXG4gIHBhcnNlRXhwcmVzc2lvbnM6cGFyc2VFeHByZXNzaW9ucyxcbiAgZXZhbHVhdGVFeHByZXNzaW9uTGlzdDpldmFsdWF0ZUV4cHJlc3Npb25MaXN0LFxuICBTdHJpbmdWYWx1ZTpTdHJpbmdWYWx1ZSxcbiAgTmFtZTpOYW1lLFxuICBFWFBSRVNTSU9OX1JFRzpFWFBSRVNTSU9OX1JFR1xufTsiLCIvKiBMaWtlbHkuanMsXG4gICBQeXRob24gc3R5bGUgSFRNTCB0ZW1wbGF0ZSBsYW5ndWFnZSB3aXRoIGJpLWRpcmVjdGlvbm5hbCBkYXRhIGJpbmRpbmdcbiAgIGJhdGlzdGUgYmllbGVyIDIwMTQgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJyk7XG52YXIgZXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vZXhwcmVzc2lvbicpO1xudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZScpO1xuXG5mdW5jdGlvbiB1cGRhdGVEYXRhKGNvbnRleHQsIGRvbSkge1xuICB2YXIgbmFtZSA9IGRvbS5nZXRBdHRyaWJ1dGUoXCJsay1iaW5kXCIpLCB2YWx1ZTtcbiAgaWYoIW5hbWUpIHtcbiAgICB0aHJvdyBcIk5vIGxrLWJpbmQgYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50XCI7XG4gIH1cbiAgaWYoZG9tLnR5cGUgPT0gJ2NoZWNrYm94JyAmJiAhZG9tLmNoZWNrZWQpIHtcbiAgICB2YWx1ZSA9IFwiXCI7XG4gIH0gZWxzZSB7XG4gICAgdmFsdWUgPSBkb20udmFsdWU7Ly8gfHwgZG9tLmdldEF0dHJpYnV0ZShcInZhbHVlXCIpO1xuICB9XG4gIC8vIHVwZGF0ZSB0aGUgY29udGV4dFxuICBjb250ZXh0Lm1vZGlmeShuYW1lLCB2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIEJpbmRpbmcoZG9tLCB0cGwsIGRhdGEpIHtcbiAgLy8gZG91YmxlIGRhdGEgYmluZGluZyBiZXR3ZWVuIHNvbWUgZGF0YSBhbmQgc29tZSBkb21cbiAgdGhpcy5kb20gPSBkb207XG4gIHRoaXMuZGF0YSA9IGRhdGE7XG4gIHRoaXMuY29udGV4dCA9IG5ldyB0ZW1wbGF0ZS5Db250ZXh0KHRoaXMuZGF0YSk7XG4gIHRoaXMudGVtcGxhdGUgPSB0cGw7XG4gIHRoaXMuaW5pdCgpO1xufVxuXG5CaW5kaW5nLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRlbXBsYXRlLnRyZWUobmV3IHRlbXBsYXRlLkNvbnRleHQodGhpcy5kYXRhKSk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZG9tLmlubmVySFRNTCA9IFwiXCI7XG4gIHRoaXMuY3VycmVudFRyZWUgPSB0aGlzLnRyZWUoKTtcbiAgdGhpcy5jdXJyZW50VHJlZS5kb21UcmVlKHRoaXMuZG9tKTtcbiAgdGhpcy5iaW5kRXZlbnRzKCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kaWZmID0gZnVuY3Rpb24oKSB7XG4gIHZhciBuZXdUcmVlID0gdGhpcy50cmVlKCk7XG4gIHZhciBkaWZmID0gdGhpcy5jdXJyZW50VHJlZS5kaWZmKG5ld1RyZWUpO1xuICByZW5kZXIuYXBwbHlEaWZmKGRpZmYsIHRoaXMuZG9tKTtcbiAgdGhpcy5jdXJyZW50VHJlZSA9IG5ld1RyZWU7XG4gIHRoaXMubG9jayA9IGZhbHNlO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuZGF0YUV2ZW50ID0gZnVuY3Rpb24oZSkge1xuICB2YXIgZG9tID0gZS50YXJnZXQ7XG4gIHZhciBuYW1lID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstYmluZCcpO1xuICBpZihuYW1lKSB7XG4gICAgdmFyIHJlbmRlck5vZGUgPSB0aGlzLmdldFJlbmRlck5vZGVGcm9tUGF0aChkb20pO1xuICAgIHVwZGF0ZURhdGEocmVuZGVyTm9kZS5jb250ZXh0LCBkb20pO1xuICAgIGlmKCF0aGlzLmxvY2spIHtcbiAgICAgIHRoaXMubG9jayA9IHRydWU7XG4gICAgICB0aGlzLmRpZmYoKTtcbiAgICB9XG4gICAgdmFyIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KFwiZGF0YVZpZXdDaGFuZ2VkXCIsIHtcIm5hbWVcIjogbmFtZX0pO1xuICAgIHRoaXMuZG9tLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5nZXRSZW5kZXJOb2RlRnJvbVBhdGggPSBmdW5jdGlvbihkb20pIHtcbiAgdmFyIHBhdGggPSBkb20uZ2V0QXR0cmlidXRlKCdsay1wYXRoJyk7XG4gIHZhciByZW5kZXJOb2RlID0gdGhpcy5jdXJyZW50VHJlZTtcbiAgdmFyIGJpdHMgPSBwYXRoLnNwbGl0KFwiLlwiKSwgaTtcbiAgZm9yKGk9MTsgaTxiaXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgcmVuZGVyTm9kZSA9IHJlbmRlck5vZGUuY2hpbGRyZW5bYml0c1tpXV07XG4gIH1cbiAgcmV0dXJuIHJlbmRlck5vZGU7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5hbnlFdmVudCA9IGZ1bmN0aW9uKGUpIHtcbiAgdmFyIGRvbSA9IGUudGFyZ2V0O1xuICB2YXIgbGtFdmVudCA9IGRvbS5nZXRBdHRyaWJ1dGUoJ2xrLScgKyBlLnR5cGUpO1xuICBpZighbGtFdmVudCkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuZ2V0UmVuZGVyTm9kZUZyb21QYXRoKGRvbSk7XG4gIHJlbmRlck5vZGUubm9kZS5hdHRyc1snbGstJytlLnR5cGVdLmV2YWx1YXRlKHJlbmRlck5vZGUuY29udGV4dCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5iaW5kRXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpO1xuICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24oZSl7IHRoaXMuZGF0YUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXsgdGhpcy5kYXRhRXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB2YXIgZXZlbnRzID0gXCJjbGljayxjaGFuZ2UsbW91c2VvdmVyLGZvY3VzLGtleWRvd24sa2V5dXAsa2V5cHJlc3Msc3VibWl0LGJsdXJcIi5zcGxpdCgnLCcpO1xuICBmb3IoaT0wOyBpPGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBldmVudHNbaV0sXG4gICAgICBmdW5jdGlvbihlKXsgdGhpcy5hbnlFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIH1cbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuZGlmZigpO1xufTtcblxuLy9UT0RPOiBhdXRvbWF0aWMgbmV3IG9uIENvbnRleHQsIFRlbXBsYXRlIGFuZCBDb21wb25lbnRcbmZ1bmN0aW9uIENvbXBvbmVudChuYW1lLCB0cGwsIGNvbnRyb2xsZXIpIHtcbiAgaWYgKHRoaXMuY29uc3RydWN0b3IgIT09IENvbXBvbmVudCkge1xuICAgIHJldHVybiBuZXcgQ29tcG9uZW50KG5hbWUsIHRwbCwgY29udHJvbGxlcik7XG4gIH1cbiAgaWYodGVtcGxhdGUuY29tcG9uZW50Q2FjaGVbbmFtZV0pIHtcbiAgICB1dGlsLkNvbXBpbGVFcnJvcihcIkNvbXBvbmVudCB3aXRoIG5hbWUgXCIgKyBuYW1lICsgXCIgYWxyZWFkeSBleGlzdFwiKTtcbiAgfVxuICB0aGlzLm5hbWUgPSBuYW1lO1xuICB0aGlzLnRlbXBsYXRlID0gdHBsO1xuICB0aGlzLmNvbnRyb2xsZXIgPSBjb250cm9sbGVyO1xuICB0ZW1wbGF0ZS5jb21wb25lbnRDYWNoZVtuYW1lXSA9IHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBUZW1wbGF0ZTp0ZW1wbGF0ZS5idWlsZFRlbXBsYXRlLFxuICBDb250ZXh0TmFtZTp0ZW1wbGF0ZS5Db250ZXh0TmFtZSxcbiAgdXBkYXRlRGF0YTp1cGRhdGVEYXRhLFxuICBCaW5kaW5nOkJpbmRpbmcsXG4gIENvbXBvbmVudDpDb21wb25lbnQsXG4gIGdldERvbTpyZW5kZXIuZ2V0RG9tLFxuICBjb21wb25lbnRDYWNoZTp0ZW1wbGF0ZS5jb21wb25lbnRDYWNoZSxcbiAgcGFyc2VFeHByZXNzaW9uczpleHByZXNzaW9uLnBhcnNlRXhwcmVzc2lvbnMsXG4gIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnM6ZXhwcmVzc2lvbi5jb21waWxlVGV4dEFuZEV4cHJlc3Npb25zLFxuICBidWlsZEV4cHJlc3Npb25zOmV4cHJlc3Npb24uYnVpbGRFeHByZXNzaW9ucyxcbiAgZXhwcmVzc2lvbnM6e1xuICAgIFN0cmluZ1ZhbHVlOmV4cHJlc3Npb24uU3RyaW5nVmFsdWVcbiAgfSxcbiAgYXBwbHlEaWZmOnJlbmRlci5hcHBseURpZmYsXG4gIGRpZmZDb3N0OnJlbmRlci5kaWZmQ29zdCxcbiAgcGFyc2VBdHRyaWJ1dGVzOnRlbXBsYXRlLnBhcnNlQXR0cmlidXRlcyxcbiAgYXR0cmlidXRlc0RpZmY6cmVuZGVyLmF0dHJpYnV0ZXNEaWZmLFxuICBDb250ZXh0OnRlbXBsYXRlLkNvbnRleHQsXG4gIENvbXBpbGVFcnJvcjp1dGlsLkNvbXBpbGVFcnJvcixcbiAgUnVudGltZUVycm9yOnV0aWwuUnVudGltZUVycm9yLFxuICBlc2NhcGU6dXRpbC5lc2NhcGUsXG4gIGV4cHJlc3Npb246ZXhwcmVzc2lvbixcbiAgc2V0SGFuZGljYXA6ZnVuY3Rpb24obil7cmVuZGVyLmhhbmRpY2FwID0gbjt9XG59O1xuIiwiXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gUmVuZGVyZWROb2RlKG5vZGUsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKSB7XG4gIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgdGhpcy5ub2RlID0gbm9kZTtcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5yZW5kZXJlciA9IHJlbmRlcmVyO1xuICB0aGlzLnBhdGggPSBwYXRoIHx8IFwiXCI7XG4gIC8vIHNob3J0Y3V0XG4gIHRoaXMubm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lO1xufVxuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLnJlcHIgPSBmdW5jdGlvbihsZXZlbCkge1xuICB2YXIgc3RyID0gXCJcIiwgaTtcbiAgaWYobGV2ZWwgPT09IHVuZGVmaW5lZCkge1xuICAgIGxldmVsID0gMDtcbiAgfVxuICBmb3IoaT0wOyBpPGxldmVsOyBpKyspIHtcbiAgICBzdHIgKz0gXCIgIFwiO1xuICB9XG4gIHN0ciArPSBTdHJpbmcodGhpcy5ub2RlKSArIFwiIHBhdGggXCIgKyB0aGlzLnBhdGggKyBcIlxcclxcblwiO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBzdHIgKz0gdGhpcy5jaGlsZHJlbltpXS5yZXByKGxldmVsICsgMSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZG9tVHJlZSA9IGZ1bmN0aW9uKGFwcGVuZF90bykge1xuICB2YXIgbm9kZSA9IGFwcGVuZF90byB8fCB0aGlzLm5vZGUuZG9tTm9kZSh0aGlzLmNvbnRleHQsIHRoaXMucGF0aCksIGksIGNoaWxkX3RyZWU7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIGNoaWxkX3RyZWUgPSB0aGlzLmNoaWxkcmVuW2ldLmRvbVRyZWUoKTtcbiAgICBpZihub2RlLnB1c2gpIHtcbiAgICAgIG5vZGUucHVzaChjaGlsZF90cmVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZF90cmVlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRvbUh0bWwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGk7XG4gIC8vdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gIHZhciBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjaGlsZCA9IHRoaXMuY2hpbGRyZW5baV0uZG9tVHJlZSgpO1xuICAgIGQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICB9XG4gIHJldHVybiBkLmlubmVySFRNTDtcbn07XG5cbmZ1bmN0aW9uIGRpZmZDb3N0KGRpZmYpIHtcbiAgdmFyIHZhbHVlPTAsIGk7XG4gIGZvcihpPTA7IGk8ZGlmZi5sZW5ndGg7IGkrKykge1xuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgIHZhbHVlICs9IDU7XG4gICAgfVxuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwiYWRkXCIpIHtcbiAgICAgIHZhbHVlICs9IDI7XG4gICAgfVxuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwibXV0YXRlXCIpIHtcbiAgICAgIHZhbHVlICs9IDE7XG4gICAgfVxuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwic3RyaW5nbXV0YXRlXCIpIHtcbiAgICAgIHZhbHVlICs9IDE7XG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5fZGlmZiA9IGZ1bmN0aW9uKHJlbmRlcmVkX25vZGUsIGFjY3UsIHBhdGgpIHtcbiAgdmFyIGksIGosIHNvdXJjZV9wdCA9IDA7XG4gIGlmKHBhdGggPT09IHVuZGVmaW5lZCkgeyBwYXRoID0gXCJcIjsgfVxuXG4gIGlmKCFyZW5kZXJlZF9ub2RlKSB7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICBub2RlOiB0aGlzLFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9XG5cbiAgaWYocmVuZGVyZWRfbm9kZS5ub2RlLm5vZGVOYW1lICE9IHRoaXMubm9kZS5ub2RlTmFtZSkge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgbm9kZTogdGhpcyxcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUsXG4gICAgICBwYXRoOiBwYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIGFjY3U7XG4gIH1cblxuICAvLyBDb3VsZCB1c2UgaW5oZXJpdGFuY2UgZm9yIHRoaXNcbiAgaWYodGhpcy5ub2RlTmFtZSA9PSBcInN0cmluZ1wiICYmIHRoaXMucmVuZGVyZXIgIT0gcmVuZGVyZWRfbm9kZS5yZW5kZXJlcikge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAnc3RyaW5nbXV0YXRlJyxcbiAgICAgICAgbm9kZTogdGhpcyxcbiAgICAgICAgdmFsdWU6IHJlbmRlcmVkX25vZGUucmVuZGVyZXIsXG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9IGVsc2Uge1xuICAgIHZhciBhX2RpZmYgPSBhdHRyaWJ1dGVzRGlmZih0aGlzLmF0dHJzLCByZW5kZXJlZF9ub2RlLmF0dHJzKTtcbiAgICBpZihhX2RpZmYubGVuZ3RoKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdtdXRhdGUnLFxuICAgICAgICBub2RlOiB0aGlzLFxuICAgICAgICBhdHRyaWJ1dGVzRGlmZjogYV9kaWZmLFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICB2YXIgbDEgPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDtcbiAgdmFyIGwyID0gcmVuZGVyZWRfbm9kZS5jaGlsZHJlbi5sZW5ndGg7XG5cbiAgLy8gbm8gc3dhcCBwb3NzaWJsZSwgYnV0IGRlbGV0aW5nIGEgbm9kZSBpcyBwb3NzaWJsZVxuICBqID0gMDsgaSA9IDA7IHNvdXJjZV9wdCA9IDA7XG4gIC8vIGxldCdzIGdvdCB0cm91Z2ggYWxsIHRoZSBjaGlsZHJlblxuICBmb3IoOyBpPGwxOyBpKyspIHtcbiAgICB2YXIgZGlmZiA9IDAsIGFmdGVyX3NvdXJjZV9kaWZmID0gMCwgYWZ0ZXJfdGFyZ2V0X2RpZmYgPSAwLCBhZnRlcl9zb3VyY2VfY29zdD1udWxsLCBhZnRlcl90YXJnZXRfY29zdD1udWxsO1xuICAgIHZhciBhZnRlcl90YXJnZXQgPSByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2orMV07XG4gICAgdmFyIGFmdGVyX3NvdXJjZSA9IHRoaXMuY2hpbGRyZW5baSsxXTtcblxuICAgIGlmKCFyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgICBub2RlOiB0aGlzLmNoaWxkcmVuW2ldLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgc291cmNlX3B0XG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGRpZmYgPSB0aGlzLmNoaWxkcmVuW2ldLl9kaWZmKHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcblxuICAgIHZhciBjb3N0ID0gZGlmZkNvc3QoZGlmZik7XG4gICAgLy8gZG9lcyB0aGUgbmV4dCBzb3VyY2Ugb25lIGZpdHMgYmV0dGVyP1xuICAgIGlmKGFmdGVyX3NvdXJjZSkge1xuICAgICAgYWZ0ZXJfc291cmNlX2RpZmYgPSBhZnRlcl9zb3VyY2UuX2RpZmYocmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSwgW10sIHBhdGggKyAnLicgKyBzb3VyY2VfcHQpO1xuICAgICAgLy8gbmVlZHMgc29tZSBoYW5kaWNhcCBvdGhlcndpc2UgaW5wdXRzIGNvbnRhaW5pbmcgdGhlIGN1cnJlbnQgZm9jdXNcbiAgICAgIC8vIG1pZ2h0IGJlIHJlbW92ZWRcbiAgICAgIGFmdGVyX3NvdXJjZV9jb3N0ID0gZGlmZkNvc3QoYWZ0ZXJfc291cmNlX2RpZmYpICsgbW9kdWxlLmV4cG9ydHMuaGFuZGljYXA7XG4gICAgfVxuICAgIC8vIGRvZXMgdGhlIG5leHQgdGFyZ2V0IG9uZSBmaXRzIGJldHRlcj9cbiAgICBpZihhZnRlcl90YXJnZXQpIHtcbiAgICAgIGFmdGVyX3RhcmdldF9kaWZmID0gdGhpcy5jaGlsZHJlbltpXS5fZGlmZihhZnRlcl90YXJnZXQsIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcbiAgICAgIGFmdGVyX3RhcmdldF9jb3N0ID0gZGlmZkNvc3QoYWZ0ZXJfdGFyZ2V0X2RpZmYpICsgbW9kdWxlLmV4cG9ydHMuaGFuZGljYXA7XG4gICAgfVxuXG4gICAgaWYoKCFhZnRlcl90YXJnZXQgfHwgY29zdCA8PSBhZnRlcl90YXJnZXRfY29zdCkgJiYgKCFhZnRlcl9zb3VyY2UgfHwgY29zdCA8PSBhZnRlcl9zb3VyY2VfY29zdCkpIHtcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChkaWZmKTtcbiAgICAgIHNvdXJjZV9wdCArPSAxO1xuICAgIH0gZWxzZSBpZihhZnRlcl9zb3VyY2UgJiYgKCFhZnRlcl90YXJnZXQgfHwgYWZ0ZXJfc291cmNlX2Nvc3QgPD0gYWZ0ZXJfdGFyZ2V0X2Nvc3QpKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICB0eXBlOiAnYWZ0ZXJfc291cmNlJyxcbiAgICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgICAgbm9kZTogdGhpcy5jaGlsZHJlbltpXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIHNvdXJjZV9wdFxuICAgICAgfSk7XG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoYWZ0ZXJfc291cmNlX2RpZmYpO1xuICAgICAgc291cmNlX3B0ICs9IDE7XG4gICAgICBpKys7XG4gICAgfSBlbHNlIGlmKGFmdGVyX3RhcmdldCkge1xuICAgICAgLy8gaW1wb3J0YW50IHRvIGFkZCB0aGUgZGlmZiBiZWZvcmVcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChhZnRlcl90YXJnZXRfZGlmZik7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICB0eXBlOiAnYWZ0ZXJfdGFyZ2V0JyxcbiAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIChzb3VyY2VfcHQpXG4gICAgICB9KTtcbiAgICAgIHNvdXJjZV9wdCArPSAyO1xuICAgICAgaisrO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBcIlNob3VsZCBuZXZlciBoYXBwZW5cIjtcbiAgICB9XG4gICAgaisrO1xuICB9XG5cbiAgLy8gbmV3IG5vZGVzIHRvIGJlIGFkZGVkIGFmdGVyIHRoZSBkaWZmXG4gIGZvcihpPTA7IGk8KGwyLWopOyBpKyspIHtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUuY2hpbGRyZW5baitpXSxcbiAgICAgIHBhdGg6IHBhdGggKyAnLicgKyAoc291cmNlX3B0ICsgMSlcbiAgICB9KTtcbiAgICBzb3VyY2VfcHQgKz0gMTtcbiAgfVxuXG4gIHJldHVybiBhY2N1O1xuXG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbihyZW5kZXJlZF9ub2RlKSB7XG4gIHZhciBhY2N1ID0gW107XG4gIHJldHVybiB0aGlzLl9kaWZmKHJlbmRlcmVkX25vZGUsIGFjY3UpO1xufTtcblxuZnVuY3Rpb24gYXR0cmlidXRlc0RpZmYoYSwgYikge1xuICB2YXIgY2hhbmdlcyA9IFtdLCBrZXk7XG4gIGZvcihrZXkgaW4gYSkge1xuICAgICAgaWYoYltrZXldID09PSBmYWxzZSkge1xuICAgICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcInJlbW92ZVwiLCBrZXk6a2V5fSk7XG4gICAgICB9IGVsc2UgaWYoYltrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYoYltrZXldICE9IGFba2V5XSkge1xuICAgICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwibXV0YXRlXCIsIGtleTprZXksIHZhbHVlOmJba2V5XX0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcInJlbW92ZVwiLCBrZXk6a2V5fSk7XG4gICAgICB9XG4gIH1cbiAgZm9yKGtleSBpbiBiKSB7XG4gICAgaWYoYVtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwiYWRkXCIsIGtleTprZXksIHZhbHVlOmJba2V5XX0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY2hhbmdlcztcbn1cblxuZnVuY3Rpb24gZ2V0RG9tKGRvbSwgcGF0aCwgc3RvcCkge1xuICB2YXIgaSwgcD1wYXRoLnNwbGl0KCcuJyksIGQ9ZG9tO1xuICBpZihzdG9wID09PSB1bmRlZmluZWQpIHtcbiAgICBzdG9wID0gMDtcbiAgfVxuICBmb3IoaT0wOyBpPChwLmxlbmd0aCAtIHN0b3ApOyBpKyspIHtcbiAgICBpZihwW2ldKSB7IC8vIGZpcnN0IG9uZSBpcyBcIlwiXG4gICAgICBkID0gZC5jaGlsZE5vZGVzW3BhcnNlSW50KHBbaV0sIDEwKV07XG4gICAgfVxuICB9XG4gIHJldHVybiBkO1xufVxuXG5mdW5jdGlvbiBhcHBseURpZmYoZGlmZiwgZG9tKSB7XG4gIHZhciBpLCBqLCBfZGlmZiwgX2RvbSwgcGFyZW50O1xuICBmb3IoaT0wOyBpPGRpZmYubGVuZ3RoOyBpKyspIHtcbiAgICBfZGlmZiA9IGRpZmZbaV07XG4gICAgX2RvbSA9IGdldERvbShkb20sIF9kaWZmLnBhdGgpO1xuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcInJlbW92ZVwiKSB7XG4gICAgICBfZG9tLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoX2RvbSk7XG4gICAgfVxuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICB2YXIgbmV3Tm9kZSA9IF9kaWZmLm5vZGUuZG9tVHJlZSgpO1xuICAgICAgaWYoX2RvbSkge1xuICAgICAgICBfZG9tLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5ld05vZGUsIF9kb20pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZ2V0IHRoZSBwYXJlbnRcbiAgICAgICAgcGFyZW50ID0gZ2V0RG9tKGRvbSwgX2RpZmYucGF0aCwgMSk7XG4gICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChuZXdOb2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwibXV0YXRlXCIpIHtcbiAgICAgIGZvcihqPTA7IGo8X2RpZmYuYXR0cmlidXRlc0RpZmYubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIGFfZGlmZiA9IF9kaWZmLmF0dHJpYnV0ZXNEaWZmW2pdO1xuICAgICAgICBpZihhX2RpZmYuYWN0aW9uID09IFwibXV0YXRlXCIpIHtcbiAgICAgICAgICAvLyBpbXBvcnRhbnQgZm9yIHNlbGVjdFxuICAgICAgICAgIGlmKFwidmFsdWUsc2VsZWN0ZWQsY2hlY2tlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIGlmKF9kb21bYV9kaWZmLmtleV0gIT0gYV9kaWZmLnZhbHVlKSB7XG4gICAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBhX2RpZmYudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIF9kb20uc2V0QXR0cmlidXRlKGFfZGlmZi5rZXksIGFfZGlmZi52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcInJlbW92ZVwiKSB7XG4gICAgICAgICAgaWYoXCJjaGVja2VkLHNlbGVjdGVkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfZG9tLnJlbW92ZUF0dHJpYnV0ZShhX2RpZmYua2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZihhX2RpZmYuYWN0aW9uID09IFwiYWRkXCIpIHtcbiAgICAgICAgICBpZihcImNoZWNrZWQsc2VsZWN0ZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gYV9kaWZmLnZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfZG9tLnNldEF0dHJpYnV0ZShhX2RpZmYua2V5LCBhX2RpZmYudmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcInN0cmluZ211dGF0ZVwiKSB7XG4gICAgICBfZG9tLm5vZGVWYWx1ZSA9IF9kaWZmLnZhbHVlO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgUmVuZGVyZWROb2RlOlJlbmRlcmVkTm9kZSxcbiAgYXBwbHlEaWZmOmFwcGx5RGlmZixcbiAgYXR0cmlidXRlc0RpZmY6YXR0cmlidXRlc0RpZmYsXG4gIGRpZmZDb3N0OmRpZmZDb3N0LFxuICBnZXREb206Z2V0RG9tLFxuICBoYW5kaWNhcDoxXG59OyIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJyk7XG52YXIgZXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vZXhwcmVzc2lvbicpO1xuXG52YXIgdGVtcGxhdGVDYWNoZSA9IHt9O1xudmFyIGNvbXBvbmVudENhY2hlID0ge307XG4vLyBhIG5hbWUgaGVyZSBpcyBhbHNvIGFueSB2YWxpZCBKUyBvYmplY3QgcHJvcGVydHlcbnZhciBWQVJOQU1FX1JFRyA9IC9eW2EtekEtWl8kXVswLTlhLXpBLVpfJF0qLztcbnZhciBIVE1MX0FUVFJfUkVHID0gL15bQS1aYS16XVtcXHctXXswLH0vO1xudmFyIERPVUJMRV9RVU9URURfU1RSSU5HX1JFRyA9IC9eXCIoXFxcXFwifFteXCJdKSpcIi87XG5cbmZ1bmN0aW9uIENvbnRleHROYW1lKG5hbWUpIHtcbiAgdGhpcy5iaXRzID0gbmFtZS5zcGxpdCgnLicpO1xufVxuXG5Db250ZXh0TmFtZS5wcm90b3R5cGUuc3Vic3RpdHV0ZUFsaWFzID0gZnVuY3Rpb24oY29udGV4dCkge1xuICBpZihjb250ZXh0LmFsaWFzZXMuaGFzT3duUHJvcGVydHkodGhpcy5iaXRzWzBdKSkge1xuICAgIHZhciBuZXdCaXRzID0gY29udGV4dC5hbGlhc2VzW3RoaXMuYml0c1swXV0uc3BsaXQoJy4nKTtcbiAgICB0aGlzLmJpdHMuc2hpZnQoKTtcbiAgICB0aGlzLmJpdHMgPSBuZXdCaXRzLmNvbmNhdCh0aGlzLmJpdHMpO1xuICB9XG59O1xuXG5Db250ZXh0TmFtZS5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYml0c1swXTtcbn07XG5cbkNvbnRleHROYW1lLnByb3RvdHlwZS5zdHIgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYml0cy5qb2luKCcuJyk7XG59O1xuXG5mdW5jdGlvbiBDb250ZXh0KGRhdGEsIHBhcmVudCkge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQ29udGV4dCkge1xuICAgIHJldHVybiBuZXcgQ29udGV4dChkYXRhLCBwYXJlbnQpO1xuICB9XG4gIHRoaXMuZGF0YSA9IGRhdGE7XG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB0aGlzLmFsaWFzZXMgPSB7fTtcbiAgdGhpcy53YXRjaGluZyA9IHt9O1xufVxuXG5Db250ZXh0LnByb3RvdHlwZS5hZGRBbGlhcyA9IGZ1bmN0aW9uKHNvdXJjZU5hbWUsIGFsaWFzTmFtZSkge1xuICAvLyBzb3VyY2UgbmFtZSBjYW4gYmUgJ25hbWUnIG9yICdsaXN0LmtleSdcbiAgaWYoc291cmNlTmFtZSA9PT0gYWxpYXNOYW1lKSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiQWxpYXMgd2l0aCB0aGUgbmFtZSBcIiArIGFsaWFzTmFtZSArIFwiIGFscmVhZHkgcHJlc2VudCBpbiB0aGlzIGNvbnRleHQuXCIpO1xuICB9XG4gIHRoaXMuYWxpYXNlc1thbGlhc05hbWVdID0gc291cmNlTmFtZTtcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLnJlc29sdmVOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAvLyBnaXZlbiBhIG5hbWUsIHJldHVybiB0aGUgW0NvbnRleHQsIHJlc29sdmVkIHBhdGgsIHZhbHVlXSB3aGVuXG4gIC8vIHRoaXMgbmFtZSBpcyBmb3VuZCBvciB1bmRlZmluZWQgb3RoZXJ3aXNlXG4gIG5hbWUuc3Vic3RpdHV0ZUFsaWFzKHRoaXMpO1xuXG4gIGlmKHRoaXMuZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lLnN0YXJ0KCkpKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5kYXRhW25hbWUuc3RhcnQoKV07XG4gICAgdmFyIGkgPSAxO1xuICAgIHdoaWxlKGkgPCBuYW1lLmJpdHMubGVuZ3RoKSB7XG4gICAgICBpZighdmFsdWUuaGFzT3duUHJvcGVydHkobmFtZS5iaXRzW2ldKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSB2YWx1ZVtuYW1lLmJpdHNbaV1dO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICByZXR1cm4gW3RoaXMsIG5hbWUuc3RyKCksIHZhbHVlXTtcbiAgfVxuXG4gIGlmKHRoaXMucGFyZW50KSB7XG4gICAgcmV0dXJuIHRoaXMucGFyZW50LnJlc29sdmVOYW1lKG5hbWUpO1xuICB9XG5cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmdldE5hbWVQYXRoID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVOYW1lKG5ldyBDb250ZXh0TmFtZShuYW1lKSk7XG4gIGlmKHJlc29sdmVkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVkWzFdO1xuICB9XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gIHRoaXMud2F0Y2hpbmdbbmFtZV0gPSBjYWxsYmFjaztcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHJlc29sdmVkID0gdGhpcy5yZXNvbHZlTmFtZShuZXcgQ29udGV4dE5hbWUobmFtZSkpO1xuICBpZihyZXNvbHZlZCkge1xuICAgIHJldHVybiByZXNvbHZlZFsyXTtcbiAgfVxufTtcblxuQ29udGV4dC5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdGhpcy5fbW9kaWZ5KG5ldyBDb250ZXh0TmFtZShuYW1lKSwgdmFsdWUpO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUuX21vZGlmeSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG5cbiAgaWYodGhpcy53YXRjaGluZy5oYXNPd25Qcm9wZXJ0eShuYW1lLnN0cigpKSkge1xuICAgIHRoaXMud2F0Y2hpbmdbbmFtZS5zdHIoKV0odmFsdWUpO1xuICB9XG5cbiAgbmFtZS5zdWJzdGl0dXRlQWxpYXModGhpcyk7XG5cbiAgLy8gd2UgZ28gaW4gZm9yIGEgc2VhcmNoIGlmIHRoZSBmaXJzdCBwYXJ0IG1hdGNoZXNcbiAgaWYodGhpcy5kYXRhLmhhc093blByb3BlcnR5KG5hbWUuc3RhcnQoKSkpIHtcbiAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICB2YXIgaSA9IDA7XG4gICAgd2hpbGUoaSA8IG5hbWUuYml0cy5sZW5ndGggLSAxKSB7XG4gICAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lLmJpdHNbaV0pKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBkYXRhID0gZGF0YVtuYW1lLmJpdHNbaV1dO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICBkYXRhW25hbWUuYml0c1tpXV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICAvLyBkYXRhIG5vdCBmb3VuZCwgbGV0J3Mgc2VhcmNoIGluIHRoZSBwYXJlbnRcbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuX21vZGlmeShuYW1lLCB2YWx1ZSk7XG4gIH1cblxufTtcblxuQ29udGV4dC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdGhpcy5kYXRhW25hbWVdID0gdmFsdWU7XG59O1xuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZXModiwgbm9kZSkge1xuICB2YXIgYXR0cnMgPSB7fSwgbiwgcztcbiAgd2hpbGUodikge1xuICAgICAgdiA9IHV0aWwudHJpbSh2KTtcbiAgICAgIG4gPSB2Lm1hdGNoKEhUTUxfQVRUUl9SRUcpO1xuICAgICAgaWYoIW4pIHtcbiAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIGF0dHJpYnV0ZSBuYW1lIGZvdW5kIGluIFwiK3YpO1xuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKG5bMF0ubGVuZ3RoKTtcbiAgICAgIG4gPSBuWzBdO1xuICAgICAgaWYodlswXSAhPSBcIj1cIikge1xuICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gZXF1YWwgc2lnbiBhZnRlciBuYW1lIFwiK24pO1xuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKDEpO1xuICAgICAgcyA9IHYubWF0Y2goRE9VQkxFX1FVT1RFRF9TVFJJTkdfUkVHKTtcbiAgICAgIGlmKHMpIHtcbiAgICAgICAgYXR0cnNbbl0gPSBuZXcgU3RyaW5nTm9kZShudWxsLCBzWzBdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMgPSB2Lm1hdGNoKGV4cHJlc3Npb24uRVhQUkVTU0lPTl9SRUcpO1xuICAgICAgICBpZihzID09PSBudWxsKSB7XG4gICAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIHN0cmluZyBvciBleHByZXNzaW9uIGZvdW5kIGFmdGVyIG5hbWUgXCIrbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGV4cHIgPSBleHByZXNzaW9uLmJ1aWxkKHNbMV0pO1xuICAgICAgICAgIGF0dHJzW25dID0gZXhwcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKHNbMF0ubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gYXR0cnM7XG59XG5cbi8vIGFsbCB0aGUgYXZhaWxhYmxlIHRlbXBsYXRlIG5vZGVcblxuZnVuY3Rpb24gTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIHRoaXMubGluZSA9IGxpbmU7XG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB0aGlzLmNvbnRlbnQgPSBjb250ZW50O1xuICB0aGlzLmxldmVsID0gbGV2ZWw7XG4gIHRoaXMuY2hpbGRyZW4gPSBbXTtcbn1cblxuTm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBpZihsZXZlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGV2ZWwgPSAwO1xuICB9XG4gIGZvcihpPTA7IGk8bGV2ZWw7IGkrKykge1xuICAgIHN0ciArPSBcIiAgXCI7XG4gIH1cbiAgc3RyICs9IFN0cmluZyh0aGlzKSArIFwiXFxyXFxuXCI7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHN0ciArPSB0aGlzLmNoaWxkcmVuW2ldLnJlcHIobGV2ZWwgKyAxKTtcbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICBpZihwYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICBwYXRoID0gJyc7XG4gICAgcG9zID0gMDtcbiAgICB0aGlzLmlzUm9vdCA9IHRydWU7XG4gIH1cbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCAnJywgcGF0aCk7XG4gIHQuY2hpbGRyZW4gPSB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xuICByZXR1cm4gdDtcbn07XG5cbk5vZGUucHJvdG90eXBlLmNlcnJvciA9IGZ1bmN0aW9uKG1zZykge1xuICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IodGhpcy50b1N0cmluZygpICsgXCI6IFwiICsgbXNnKTtcbn07XG5cbk5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtdO1xufTtcblxuTm9kZS5wcm90b3R5cGUudHJlZUNoaWxkcmVuID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gW10sIGksIHAsIGosIGNoaWxkcmVuID0gbnVsbCwgY2hpbGQgPSBudWxsO1xuICBqID0gcG9zO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBwID0gcGF0aDtcbiAgICBjaGlsZCA9IHRoaXMuY2hpbGRyZW5baV07XG4gICAgaWYoY2hpbGQuaGFzT3duUHJvcGVydHkoJ25vZGVOYW1lJykpIHtcbiAgICAgIHAgKz0gJy4nICsgajtcbiAgICAgIGorKztcbiAgICAgIGNoaWxkcmVuID0gY2hpbGQudHJlZShjb250ZXh0LCBwLCAwKTtcbiAgICAgIHQucHVzaChjaGlsZHJlbik7XG4gICAgfSBlbHNlIGlmICghY2hpbGQucmVuZGVyRXhsY3VkZWQpIHtcbiAgICAgIGNoaWxkcmVuID0gY2hpbGQudHJlZShjb250ZXh0LCBwLCBqKTtcbiAgICAgIGlmKGNoaWxkcmVuKSB7XG4gICAgICAgIHQgPSB0LmNvbmNhdChjaGlsZHJlbik7XG4gICAgICAgIGogKz0gY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdDtcbn07XG5cbk5vZGUucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24oY2hpbGQpIHtcbiAgdGhpcy5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyBcIihcIit0aGlzLmNvbnRlbnQucmVwbGFjZShcIlxcblwiLCBcIlwiKStcIikgYXQgbGluZSBcIiArIHRoaXMubGluZTtcbn07XG5cbmZ1bmN0aW9uIENvbW1lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICBwYXJlbnQuY2hpbGRyZW4ucHVzaCh0aGlzKTtcbiAgdGhpcy5yZW5kZXJFeGxjdWRlZCA9IHRydWU7XG59XG51dGlsLmluaGVyaXRzKENvbW1lbnROb2RlLCBOb2RlKTtcblxuZnVuY3Rpb24gSHRtbE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubm9kZU5hbWUgPSB0aGlzLmNvbnRlbnQuc3BsaXQoXCIgXCIpWzBdO1xuICB0aGlzLmF0dHJzID0gcGFyc2VBdHRyaWJ1dGVzKHRoaXMuY29udGVudC5zdWJzdHIodGhpcy5ub2RlTmFtZS5sZW5ndGgpLCB0aGlzKTtcbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhIdG1sTm9kZSwgTm9kZSk7XG5cbkh0bWxOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgdGhpcy5kb21Ob2RlKGNvbnRleHQsIHBhdGgpLCBwYXRoKTtcbiAgdC5hdHRycyA9IHRoaXMucmVuZGVyQXR0cmlidXRlcyhjb250ZXh0LCBwYXRoKTtcbiAgdC5jaGlsZHJlbiA9IHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gIHJldHVybiB0O1xufTtcblxuZnVuY3Rpb24gYmluZGluZ05hbWUobm9kZSkge1xuICBpZihub2RlIGluc3RhbmNlb2YgZXhwcmVzc2lvbi5OYW1lKSB7XG4gICAgcmV0dXJuIG5vZGUubmFtZTtcbiAgfVxuICBpZihub2RlIGluc3RhbmNlb2YgU3RyaW5nTm9kZSAmJiBub2RlLmNvbXBpbGVkRXhwcmVzc2lvbi5sZW5ndGggPT0gMSAmJlxuICAgICAgbm9kZS5jb21waWxlZEV4cHJlc3Npb25bMF0gaW5zdGFuY2VvZiBleHByZXNzaW9uLk5hbWUpIHtcbiAgICByZXR1cm4gbm9kZS5jb21waWxlZEV4cHJlc3Npb25bMF0ubmFtZTtcbiAgfVxufVxuXG5IdG1sTm9kZS5wcm90b3R5cGUucmVuZGVyQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgdmFyIHJfYXR0cnMgPSB7fSwga2V5LCBhdHRyLCBuYW1lO1xuICBmb3Ioa2V5IGluIHRoaXMuYXR0cnMpIHtcbiAgICBhdHRyID0gdGhpcy5hdHRyc1trZXldO1xuICAgIC8vIHRvZG8sIGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGRpc2NyaW1pbmF0ZSBldmVudHNcbiAgICBpZihrZXkuaW5kZXhPZihcImxrLVwiKSA9PT0gMCkge1xuICAgICAgLy8gYWRkIHRoZSBwYXRoIHRvIHRoZSByZW5kZXIgbm9kZSB0byBhbnkgbGstdGhpbmcgbm9kZVxuICAgICAgcl9hdHRyc1snbGstcGF0aCddID0gcGF0aDtcbiAgICAgIGlmKGtleSA9PT0gJ2xrLWJpbmQnKSB7XG4gICAgICAgIHJfYXR0cnNba2V5XSA9IGF0dHIuZXZhbHVhdGUoY29udGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByX2F0dHJzW2tleV0gPSBcInRydWVcIjtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZihhdHRyLmV2YWx1YXRlKSB7XG4gICAgICB2YXIgdiA9IGF0dHIuZXZhbHVhdGUoY29udGV4dCk7XG4gICAgICBpZih2ID09PSBmYWxzZSkge1xuICAgICAgICAvLyBub3RoaW5nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByX2F0dHJzW2tleV0gPSB2O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByX2F0dHJzW2tleV0gPSBhdHRyO1xuICAgIH1cbiAgfVxuICBpZihcImlucHV0LHNlbGVjdCx0ZXh0YXJlYVwiLmluZGV4T2YodGhpcy5ub2RlTmFtZSkgIT0gLTEgJiYgdGhpcy5hdHRycy5oYXNPd25Qcm9wZXJ0eSgndmFsdWUnKSkge1xuICAgIGF0dHIgPSB0aGlzLmF0dHJzLnZhbHVlO1xuICAgIG5hbWUgPSBiaW5kaW5nTmFtZShhdHRyKTtcbiAgICBpZihuYW1lICYmIHRoaXMuYXR0cnNbJ2xrLWJpbmQnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByX2F0dHJzWydsay1iaW5kJ10gPSBuYW1lO1xuICAgICAgcl9hdHRyc1snbGstcGF0aCddID0gcGF0aDtcbiAgICB9XG4gIH1cbiAgaWYodGhpcy5ub2RlTmFtZSA9PSBcInRleHRhcmVhXCIgJiYgdGhpcy5jaGlsZHJlbi5sZW5ndGggPT0gMSkge1xuICAgIG5hbWUgPSBiaW5kaW5nTmFtZSh0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24pO1xuICAgIGlmKG5hbWUgJiYgdGhpcy5hdHRyc1snbGstYmluZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJfYXR0cnNbJ2xrLWJpbmQnXSA9IG5hbWU7XG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgICAgLy8gYXMgc29vbiBhcyB0aGUgdXNlciBoYXMgYWx0ZXJlZCB0aGUgdmFsdWUgb2YgdGhlIHRleHRhcmVhIG9yIHNjcmlwdCBoYXMgYWx0ZXJlZFxuICAgICAgLy8gdGhlIHZhbHVlIHByb3BlcnR5IG9mIHRoZSB0ZXh0YXJlYSwgdGhlIHRleHQgbm9kZSBpcyBvdXQgb2YgdGhlIHBpY3R1cmUgYW5kIGlzIG5vXG4gICAgICAvLyBsb25nZXIgYm91bmQgdG8gdGhlIHRleHRhcmVhJ3MgdmFsdWUgaW4gYW55IHdheS5cbiAgICAgIHJfYXR0cnMudmFsdWUgPSB0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24uZXZhbHVhdGUoY29udGV4dCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByX2F0dHJzO1xufTtcblxuSHRtbE5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0aGlzLm5vZGVOYW1lKSwga2V5LCBhdHRycz10aGlzLnJlbmRlckF0dHJpYnV0ZXMoY29udGV4dCwgcGF0aCk7XG4gIGZvcihrZXkgaW4gYXR0cnMpIHtcbiAgICBub2RlLnNldEF0dHJpYnV0ZShrZXksIGF0dHJzW2tleV0pO1xuICB9XG4gIHJldHVybiBub2RlO1xufTtcblxuZnVuY3Rpb24gRm9yTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIC8vIHN5bnRheDogZm9yIGtleSwgdmFsdWUgaW4gbGlzdFxuICAvLyAgICAgICAgIGZvciB2YWx1ZSBpbiBsaXN0XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdmFyIHZhcjEsIHZhcjIsIHNvdXJjZU5hbWU7XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoNCkpO1xuICB2YXIxID0gY29udGVudC5tYXRjaChWQVJOQU1FX1JFRyk7XG4gIGlmKCF2YXIxKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJmaXJzdCB2YXJpYWJsZSBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cih2YXIxWzBdLmxlbmd0aCkpO1xuICBpZihjb250ZW50WzBdID09ICcsJykge1xuICAgIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoMSkpO1xuICAgIHZhcjIgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgICBpZighdmFyMikge1xuICAgICAgdGhpcy5jZXJyb3IoXCJzZWNvbmQgdmFyaWFibGUgYWZ0ZXIgY29tbWEgaXMgbWlzc2luZ1wiKTtcbiAgICB9XG4gICAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cih2YXIyWzBdLmxlbmd0aCkpO1xuICB9XG4gIGlmKCFjb250ZW50Lm1hdGNoKC9eaW4vKSkge1xuICAgIHRoaXMuY2Vycm9yKFwiaW4ga2V5d29yZCBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoMikpO1xuICBzb3VyY2VOYW1lID0gY29udGVudC5tYXRjaChleHByZXNzaW9uLk5hbWUucmVnKTtcbiAgaWYoIXNvdXJjZU5hbWUpIHtcbiAgICB0aGlzLmNlcnJvcihcIml0ZXJhYmxlIG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICB0aGlzLnNvdXJjZU5hbWUgPSBzb3VyY2VOYW1lWzBdO1xuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHNvdXJjZU5hbWVbMF0ubGVuZ3RoKSk7XG4gIGlmKGNvbnRlbnQgIT09IFwiXCIpIHtcbiAgICB0aGlzLmNlcnJvcihcImxlZnQgb3ZlciB1bnBhcnNhYmxlIGNvbnRlbnQ6IFwiICsgY29udGVudCk7XG4gIH1cblxuICBpZih2YXIxICYmIHZhcjIpIHtcbiAgICB0aGlzLmluZGV4TmFtZSA9IHZhcjE7XG4gICAgdGhpcy5hbGlhcyA9IHZhcjJbMF07XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5hbGlhcyA9IHZhcjFbMF07XG4gIH1cbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhGb3JOb2RlLCBOb2RlKTtcblxuRm9yTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgYXJyYXlzID0gW10sIGtleSwgbD0wLCBhcnJheTtcbiAgdmFyIGQgPSBjb250ZXh0LmdldCh0aGlzLnNvdXJjZU5hbWUpO1xuICBmb3Ioa2V5IGluIGQpIHtcbiAgICAvLyBwdXR0aW5nIHRoZSBhbGlhcyBpbiB0aGUgY29udGV4dFxuICAgIHZhciBuZXdfZGF0YSA9IHt9O1xuICAgIC8vIG5ld19kYXRhW3RoaXMuYWxpYXNdID0gZFtrZXldO1xuICAgIC8vIGFkZCB0aGUga2V5IHRvIGFjY2VzcyB0aGUgY29udGV4dFxuICAgIGlmKHRoaXMuaW5kZXhOYW1lKSB7XG4gICAgICAgIG5ld19kYXRhW3RoaXMuaW5kZXhOYW1lXSA9IGtleTtcbiAgICB9XG4gICAgdmFyIG5ld19jb250ZXh0ID0gbmV3IENvbnRleHQobmV3X2RhdGEsIGNvbnRleHQpO1xuICAgIC8vIGtlZXAgdHJhY2sgb2Ygd2hlcmUgdGhlIGRhdGEgaXMgY29taW5nIGZyb21cbiAgICBuZXdfY29udGV4dC5hZGRBbGlhcyh0aGlzLnNvdXJjZU5hbWUgKyAnLicgKyBrZXksIHRoaXMuYWxpYXMpO1xuICAgIGFycmF5ID0gdGhpcy50cmVlQ2hpbGRyZW4obmV3X2NvbnRleHQsIHBhdGgsIGwgKyBwb3MpO1xuICAgIGwgKz0gYXJyYXkubGVuZ3RoO1xuICAgIGFycmF5cy5wdXNoKGFycmF5KTtcbiAgfVxuICByZXR1cm4gW10uY29uY2F0LmFwcGx5KFtdLCBhcnJheXMpO1xufTtcblxuZnVuY3Rpb24gSWZOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmJ1aWxkKGNvbnRlbnQucmVwbGFjZSgvXmlmL2csIFwiXCIpKTtcbiAgcGFyZW50LmNoaWxkcmVuLnB1c2godGhpcyk7XG59XG51dGlsLmluaGVyaXRzKElmTm9kZSwgTm9kZSk7XG5cbklmTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICBpZighdGhpcy5leHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpKSB7XG4gICAgaWYodGhpcy5lbHNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbHNlLnRyZWUoY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIHJldHVybiB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLnNlYXJjaElmKGN1cnJlbnROb2RlKTtcbn1cbnV0aWwuaW5oZXJpdHMoRWxzZU5vZGUsIE5vZGUpO1xuXG5FbHNlTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICByZXR1cm4gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIElmRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmJ1aWxkKGNvbnRlbnQucmVwbGFjZSgvXmVsc2VpZi9nLCBcIlwiKSk7XG4gIHRoaXMuc2VhcmNoSWYoY3VycmVudE5vZGUpO1xufVxuLy8gaW1wb3J0YW50IHRvIGJlIGFuIElmTm9kZVxudXRpbC5pbmhlcml0cyhJZkVsc2VOb2RlLCBJZk5vZGUpO1xuXG5JZkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZiA9IGZ1bmN0aW9uIHNlYXJjaElmKGN1cnJlbnROb2RlKSB7XG4gIC8vIGZpcnN0IG5vZGUgb24gdGhlIHNhbWUgbGV2ZWwgaGFzIHRvIGJlIHRoZSBpZi9lbHNlaWYgbm9kZVxuICB3aGlsZShjdXJyZW50Tm9kZSkge1xuICAgIGlmKGN1cnJlbnROb2RlLmxldmVsIDwgdGhpcy5sZXZlbCkge1xuICAgICAgdGhpcy5jZXJyb3IoXCJjYW5ub3QgZmluZCBhIGNvcnJlc3BvbmRpbmcgaWYtbGlrZSBzdGF0ZW1lbnQgYXQgdGhlIHNhbWUgbGV2ZWwuXCIpO1xuICAgIH1cbiAgICBpZihjdXJyZW50Tm9kZS5sZXZlbCA9PSB0aGlzLmxldmVsKSB7XG4gICAgICBpZighKGN1cnJlbnROb2RlIGluc3RhbmNlb2YgSWZOb2RlKSkge1xuICAgICAgICB0aGlzLmNlcnJvcihcImF0IHRoZSBzYW1lIGxldmVsIGlzIG5vdCBhIGlmLWxpa2Ugc3RhdGVtZW50LlwiKTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnROb2RlLmVsc2UgPSB0aGlzO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUucGFyZW50O1xuICB9XG59O1xuRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmID0gSWZFbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWY7XG5cbmZ1bmN0aW9uIEV4cHJlc3Npb25Ob2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gXCJzdHJpbmdcIjtcbiAgdmFyIG0gPSBjb250ZW50Lm1hdGNoKGV4cHJlc3Npb24uRVhQUkVTU0lPTl9SRUcpO1xuICBpZighbSkge1xuICAgIHRoaXMuY2Vycm9yKFwiZGVjbGFyZWQgaW1wcm9wZXJseVwiKTtcbiAgfVxuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmJ1aWxkKG1bMV0pO1xuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEV4cHJlc3Npb25Ob2RlLCBOb2RlKTtcblxuRXhwcmVzc2lvbk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIC8vIHJlbmRlcmVyXG4gIHZhciByZW5kZXJlciA9IFN0cmluZyh0aGlzLmV4cHJlc3Npb24uZXZhbHVhdGUoY29udGV4dCkpO1xuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5FeHByZXNzaW9uTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRoaXMuZXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KSk7XG59O1xuXG5mdW5jdGlvbiBTdHJpbmdOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gXCJzdHJpbmdcIjtcbiAgdGhpcy5zdHJpbmcgPSB0aGlzLmNvbnRlbnQucmVwbGFjZSgvXlwifFwiJC9nLCBcIlwiKS5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJywgJ2dtJyk7XG4gIHRoaXMuY29tcGlsZWRFeHByZXNzaW9uID0gZXhwcmVzc2lvbi5jb21waWxlVGV4dEFuZEV4cHJlc3Npb25zKHRoaXMuc3RyaW5nKTtcbiAgaWYocGFyZW50KSB7XG4gICAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xuICB9XG59XG51dGlsLmluaGVyaXRzKFN0cmluZ05vZGUsIE5vZGUpO1xuXG5TdHJpbmdOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICAvLyByZW5kZXJlciBzaG91bGQgYmUgYWxsIGF0dHJpYnV0ZXNcbiAgdmFyIHJlbmRlcmVyID0gZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KTtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCk7XG4gIHJldHVybiB0O1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpO1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCkpO1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbihjaGlsZCkge1xuICB0aGlzLmNlcnJvcihcImNhbm5vdCBoYXZlIGNoaWxkcmVuIFwiICsgY2hpbGQpO1xufTtcblxuZnVuY3Rpb24gSW5jbHVkZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubmFtZSA9IHV0aWwudHJpbShjb250ZW50LnNwbGl0KFwiIFwiKVsxXSk7XG4gIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlW3RoaXMubmFtZV07XG4gIGlmKHRoaXMudGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuY2Vycm9yKFwiVGVtcGxhdGUgd2l0aCBuYW1lIFwiICsgdGhpcy5uYW1lICsgXCIgaXMgbm90IHJlZ2lzdGVyZWRcIik7XG4gIH1cbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhJbmNsdWRlTm9kZSwgTm9kZSk7XG5cbkluY2x1ZGVOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHJldHVybiB0aGlzLnRlbXBsYXRlLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gQ29tcG9uZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50KS5zdWJzdHIoMTApO1xuICB2YXIgbmFtZSA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICBpZighbmFtZSkge1xuICAgIHRoaXMuY2Vycm9yKFwiQ29tcG9uZW50IG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKG5hbWVbMF0ubGVuZ3RoKSk7XG4gIHRoaXMubmFtZSA9IG5hbWVbMF07XG4gIHRoaXMuYXR0cnMgPSBwYXJzZUF0dHJpYnV0ZXMoY29udGVudCwgdGhpcyk7XG4gIHRoaXMuY29tcG9uZW50ID0gY29tcG9uZW50Q2FjaGVbdGhpcy5uYW1lXTtcbiAgaWYodGhpcy5jb21wb25lbnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuY2Vycm9yKFwiQ29tcG9uZW50IHdpdGggbmFtZSBcIiArIHRoaXMubmFtZSArIFwiIGlzIG5vdCByZWdpc3RlcmVkXCIpO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoQ29tcG9uZW50Tm9kZSwgTm9kZSk7XG5cbkNvbXBvbmVudE5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIG5ld19jb250ZXh0ID0gbmV3IENvbnRleHQoe30sIGNvbnRleHQpO1xuICB2YXIga2V5LCBhdHRyLCB2YWx1ZSwgc291cmNlO1xuICBmb3Ioa2V5IGluIHRoaXMuYXR0cnMpIHtcbiAgICBhdHRyID0gdGhpcy5hdHRyc1trZXldO1xuICAgIGlmKGF0dHIuZXZhbHVhdGUpIHtcbiAgICAgIHZhbHVlID0gYXR0ci5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICAgIC8vIHRvZG8gOiBpZiBleHByZXNzaW9uIGF0dHJpYnV0ZSwgYWRkIGFuIGFsaWFzXG4gICAgICBpZih2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy8gbm90aGluZ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3X2NvbnRleHQuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICBzb3VyY2UgPSBiaW5kaW5nTmFtZShhdHRyKTtcbiAgICAgICAgaWYoc291cmNlICYmIGtleSAhPSBzb3VyY2UpIHtcbiAgICAgICAgICBuZXdfY29udGV4dC5hZGRBbGlhcyhzb3VyY2UsIGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy9uZXdfY29udGV4dC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGlmKHRoaXMuY29tcG9uZW50LmNvbnRyb2xsZXIpe1xuICAgIHRoaXMuY29tcG9uZW50LmNvbnRyb2xsZXIobmV3X2NvbnRleHQpO1xuICB9XG4gIHJldHVybiB0aGlzLmNvbXBvbmVudC50ZW1wbGF0ZS50cmVlQ2hpbGRyZW4obmV3X2NvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5Db21wb25lbnROb2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgcmV0dXJuIHRoaXMuY29tcG9uZW50LnRlbXBsYXRlLnJlcHIobGV2ZWwgKyAxKTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgdmFyIG5vZGU7XG4gIGlmKGNvbnRlbnQubGVuZ3RoID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBTdHJpbmdOb2RlKHBhcmVudCwgXCJcXG5cIiwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJyMnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgQ29tbWVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignaWYgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IElmTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdlbHNlaWYgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IElmRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxLCBjdXJyZW50Tm9kZSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2Vsc2UnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxLCBjdXJyZW50Tm9kZSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2ZvciAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRm9yTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdpbmNsdWRlICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBJbmNsdWRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdjb21wb25lbnQgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IENvbXBvbmVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignXCInKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgU3RyaW5nTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoL15cXHcvLmV4ZWMoY29udGVudCkpIHtcbiAgICBub2RlID0gbmV3IEh0bWxOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ3t7JykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEV4cHJlc3Npb25Ob2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiY3JlYXRlTm9kZTogdW5rbm93IG5vZGUgdHlwZSBcIiArIGNvbnRlbnQpO1xuICB9XG4gIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBidWlsZFRlbXBsYXRlKHRwbCwgdGVtcGxhdGVOYW1lKSB7XG5cbiAgaWYodHlwZW9mIHRwbCA9PSAnb2JqZWN0Jykge1xuICAgIHRwbCA9IHRwbC5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHZhciByb290ID0gbmV3IE5vZGUobnVsbCwgXCJcIiwgMCksIGxpbmVzLCBsaW5lLCBsZXZlbCxcbiAgICBjb250ZW50LCBpLCBjdXJyZW50Tm9kZSA9IHJvb3QsIHBhcmVudCwgc2VhcmNoTm9kZTtcblxuICBsaW5lcyA9IHRwbC5zcGxpdChcIlxcblwiKTtcblxuICBmb3IoaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGluZSA9IGxpbmVzW2ldO1xuICAgIGxldmVsID0gbGluZS5tYXRjaCgvXFxzKi8pWzBdLmxlbmd0aCArIDE7XG4gICAgY29udGVudCA9IGxpbmUuc2xpY2UobGV2ZWwgLSAxKTtcblxuICAgIC8vIG11bHRpbGluZSBzdXBwb3J0OiBlbmRzIHdpdGggYSBcXFxuICAgIHZhciBqID0gMDtcbiAgICB3aGlsZShjb250ZW50Lm1hdGNoKC9cXFxcJC8pKSB7XG4gICAgICAgIGorKztcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXFxcXCQvLCAnJykgKyBsaW5lc1tpK2pdO1xuICAgIH1cbiAgICBpID0gaSArIGo7XG5cbiAgICAvLyBtdWx0aWxpbmUgc3RyaW5nc1xuICAgIGogPSAwO1xuICAgIGlmKGNvbnRlbnQubWF0Y2goL15cIlwiXCIvKSkge1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9eXCJcIlwiLywgJ1wiJyk7XG4gICAgICAgIHdoaWxlKCFjb250ZW50Lm1hdGNoKC9cIlwiXCIkLykpIHtcbiAgICAgICAgICAgIGorKztcbiAgICAgICAgICAgIGlmKGkraiA+IGxpbmVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJNdWx0aWxpbmUgc3RyaW5nIHN0YXJ0ZWQgYnV0IHVuZmluaXNoZWQgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQgKyBsaW5lc1tpK2pdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1wiXCJcIiQvLCAnXCInKTtcbiAgICB9XG4gICAgaSA9IGkgKyBqO1xuXG4gICAgc2VhcmNoTm9kZSA9IGN1cnJlbnROb2RlO1xuICAgIHBhcmVudCA9IG51bGw7XG5cbiAgICAvLyBzZWFyY2ggZm9yIHRoZSBwYXJlbnQgbm9kZVxuICAgIHdoaWxlKHRydWUpIHtcblxuICAgICAgaWYobGV2ZWwgPiBzZWFyY2hOb2RlLmxldmVsKSB7XG4gICAgICAgIHBhcmVudCA9IHNlYXJjaE5vZGU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZighc2VhcmNoTm9kZS5wYXJlbnQpIHtcbiAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW5kZW50YXRpb24gZXJyb3IgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgfVxuXG4gICAgICBpZihsZXZlbCA9PSBzZWFyY2hOb2RlLmxldmVsKSB7XG4gICAgICAgIHBhcmVudCA9IHNlYXJjaE5vZGUucGFyZW50O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgc2VhcmNoTm9kZSA9IHNlYXJjaE5vZGUucGFyZW50O1xuICAgIH1cblxuICAgIGlmKHBhcmVudC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIGlmKHBhcmVudC5jaGlsZHJlblswXS5sZXZlbCAhPSBsZXZlbCkge1xuICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJJbmRlbnRhdGlvbiBlcnJvciBhdCBsaW5lIFwiICsgKGkgKyAxKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG5vZGUgPSBjcmVhdGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGksIGN1cnJlbnROb2RlKTtcbiAgICBjdXJyZW50Tm9kZSA9IG5vZGU7XG5cbiAgfVxuICBpZih0ZW1wbGF0ZU5hbWUpIHtcbiAgICB0ZW1wbGF0ZUNhY2hlW3RlbXBsYXRlTmFtZV0gPSByb290O1xuICB9XG5cbiAgcmV0dXJuIHJvb3Q7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBidWlsZFRlbXBsYXRlOiBidWlsZFRlbXBsYXRlLFxuICBwYXJzZUF0dHJpYnV0ZXM6IHBhcnNlQXR0cmlidXRlcyxcbiAgQ29udGV4dDogQ29udGV4dCxcbiAgdGVtcGxhdGVDYWNoZTogdGVtcGxhdGVDYWNoZSxcbiAgY29tcG9uZW50Q2FjaGU6IGNvbXBvbmVudENhY2hlLFxuICBDb250ZXh0TmFtZTogQ29udGV4dE5hbWVcbn07IiwiXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gaW5oZXJpdHMoY2hpbGQsIHBhcmVudCkge1xuICBjaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUpO1xuICBjaGlsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjaGlsZDtcbn1cblxuZnVuY3Rpb24gQ29tcGlsZUVycm9yKG1zZykge1xuICB0aGlzLm5hbWUgPSBcIkNvbXBpbGVFcnJvclwiO1xuICB0aGlzLm1lc3NhZ2UgPSAobXNnIHx8IFwiXCIpO1xufVxuQ29tcGlsZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gUnVudGltZUVycm9yKG1zZykge1xuICB0aGlzLm5hbWUgPSBcIlJ1bnRpbWVFcnJvclwiO1xuICB0aGlzLm1lc3NhZ2UgPSAobXNnIHx8IFwiXCIpO1xufVxuUnVudGltZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gZXNjYXBlKHVuc2FmZSkge1xuICByZXR1cm4gdW5zYWZlXG4gICAgLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxuICAgIC5yZXBsYWNlKC88L2csIFwiJmx0O1wiKVxuICAgIC5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKVxuICAgIC5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKVxuICAgIC5yZXBsYWNlKC8nL2csIFwiJiMwMzk7XCIpO1xufVxuXG5mdW5jdGlvbiB0cmltKHR4dCkge1xuICByZXR1cm4gdHh0LnJlcGxhY2UoL15cXHMrfFxccyskL2cgLFwiXCIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5oZXJpdHM6aW5oZXJpdHMsXG4gIENvbXBpbGVFcnJvcjpDb21waWxlRXJyb3IsXG4gIFJ1bnRpbWVFcnJvcjpSdW50aW1lRXJyb3IsXG4gIGVzY2FwZTplc2NhcGUsXG4gIHRyaW06dHJpbVxufTsiXX0=
(2)
});
