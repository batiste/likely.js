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
  if (this.constructor !== Binding) {
    return new Binding(dom, tpl, data);
  }
  // double data binding between some data and some dom
  this.dom = dom;
  this.data = data;
  this.context = new template.Context(this.data);
  this.template = tpl;
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

Binding.prototype.domInit = function() {
  // create an initial tree from the DOM
  this.currentTree = render.initialRenderFromDom(this.dom);
  this.currentTree.nodeName = undefined;
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
    this.dom.dispatchEvent(
      util.event('dataViewChanged'),
      {"name": name}
    );
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
  initialRenderFromDom:render.initialRenderFromDom,
  expression:expression,
  render:render,
  util:util,
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

  if(rendered_node.nodeName != this.nodeName) {
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
  if(this.nodeName == "#text" && this.renderer != rendered_node.renderer) {
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

function initialRenderFromDom(dom, path) {
  path = path || "";
  var i, child, children = [], attrs = {}, renderer = '';
  if(dom.attributes) {
    for(i=0; i < dom.attributes.length; i++) {
      var attr = dom.attributes[i];
      attrs[attr.name] = attr.value;
    }
  }
  if(dom.childNodes) {
    for(i=0; i < dom.childNodes.length; i++) {
      child = dom.childNodes[i];
      children.push(initialRenderFromDom(child, path + '.' + i));
    }
  }
  if(dom.textContent) {
    renderer = dom.textContent;
  }
  var rn = new RenderedNode(
    {nodeName: dom.nodeName.toLowerCase(), node:dom},
    undefined,
    renderer,
    path);
  rn.attrs = attrs;
  rn.children = children;
  return rn;
}

module.exports = {
  RenderedNode:RenderedNode,
  initialRenderFromDom:initialRenderFromDom,
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
    var new_data = {};
    // add the key to access the context's data
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
  this.nodeName = "#text";
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
  this.nodeName = "#text";
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

function event(name, data) {
  var evt = document.createEvent("CustomEvent");
  evt.initCustomEvent(name, false, false, data);
  return evt;
}

module.exports = {
  inherits:inherits,
  CompileError:CompileError,
  RuntimeError:RuntimeError,
  escape:escape,
  trim:trim,
  event:event
};
},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3cEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgRVhQUkVTU0lPTl9SRUcgPSAvXnt7KC4rPyl9fS87XG5cbi8vIEV4cHJlc3Npb24gZXZhbHVhdGlvbiBlbmdpbmVcbmZ1bmN0aW9uIFN0cmluZ1ZhbHVlKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcInZhbHVlXCI7XG4gIGlmKHR4dFswXSA9PSAnXCInKSB7XG4gICAgdGhpcy52YWx1ZSA9IHR4dC5yZXBsYWNlKC9eXCJ8XCIkL2csIFwiXCIpO1xuICB9IGVsc2UgaWYodHh0WzBdID09IFwiJ1wiKSB7XG4gICAgdGhpcy52YWx1ZSA9IHR4dC5yZXBsYWNlKC9eJ3wnJC9nLCBcIlwiKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJJbnZhbGlkIHN0cmluZyB2YWx1ZSBcIiArIHR4dCk7XG4gIH1cbn1cblN0cmluZ1ZhbHVlLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMudmFsdWU7XG59O1xuU3RyaW5nVmFsdWUucmVnID0gL15cIig/OlxcXFxcInxbXlwiXSkqXCJ8XicoPzpcXFxcJ3xbXiddKSonLztcblxuZnVuY3Rpb24gRXF1YWxPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbkVxdWFsT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpID09IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuRXF1YWxPcGVyYXRvci5yZWcgPSAvXj09LztcblxuZnVuY3Rpb24gTm90RXF1YWxPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbk5vdEVxdWFsT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpICE9IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuTm90RXF1YWxPcGVyYXRvci5yZWcgPSAvXiE9LztcblxuZnVuY3Rpb24gQmlnZ2VyT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5CaWdnZXJPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgPiB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbkJpZ2dlck9wZXJhdG9yLnJlZyA9IC9ePi87XG5cbmZ1bmN0aW9uIFNtYWxsZXJPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cblNtYWxsZXJPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgPCB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcblNtYWxsZXJPcGVyYXRvci5yZWcgPSAvXjwvO1xuXG5mdW5jdGlvbiBPck9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuT3JPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgfHwgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5Pck9wZXJhdG9yLnJlZyA9IC9eb3IvO1xuXG5mdW5jdGlvbiBBbmRPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbkFuZE9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSAmJiB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbkFuZE9wZXJhdG9yLnJlZyA9IC9eYW5kLztcblxuZnVuY3Rpb24gTmFtZSh0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJ2YWx1ZVwiO1xuICB0aGlzLm5hbWUgPSB0eHQ7XG59XG5OYW1lLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIHZhbHVlID0gY29udGV4dC5nZXQodGhpcy5uYW1lKTtcbiAgcmV0dXJuIHZhbHVlO1xufTtcbk5hbWUucmVnID0gL15bQS1aYS16XVtcXHdcXC5dezAsfS87XG5cbmZ1bmN0aW9uIEZpbHRlcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5GaWx0ZXIucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgZmN0ID0gY29udGV4dC5nZXQodGhpcy5yaWdodC5uYW1lKTtcbiAgcmV0dXJuIGZjdC5hcHBseSh0aGlzLCBbdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpLCBjb250ZXh0XSk7XG59O1xuRmlsdGVyLnJlZyA9IC9eXFx8LztcblxuLy8gbWF0aFxuXG5mdW5jdGlvbiBNdWx0aXBseU9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbk11bHRpcGx5T3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpICogdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5NdWx0aXBseU9wZXJhdG9yLnJlZyA9IC9eXFwqLztcblxuZnVuY3Rpb24gUGx1c09wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cblBsdXNPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgKyB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcblBsdXNPcGVyYXRvci5yZWcgPSAvXlxcKy87XG5cbmZ1bmN0aW9uIE1pbnVzT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9ICdvcGVyYXRvcic7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuTWludXNPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgLSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbk1pbnVzT3BlcmF0b3IucmVnID0gL15cXC0vO1xuXG5mdW5jdGlvbiBGdW5jdGlvbkNhbGwodHh0KSB7XG4gIHRoaXMudHlwZSA9ICd2YWx1ZSc7XG4gIHZhciBtID0gdHh0Lm1hdGNoKC9eKFthLXpBLVpdW2EtekEtWjAtOVxcLl0qKVxcKChbXlxcKV0qKVxcKS8pO1xuICB0aGlzLmZ1bmNOYW1lID0gbVsxXTtcbiAgdGhpcy5wYXJhbXMgPSBtWzJdLnNwbGl0KCcsJyk7XG59XG5GdW5jdGlvbkNhbGwucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgZnVuYyA9IGNvbnRleHQuZ2V0KHRoaXMuZnVuY05hbWUpLCBpLCBwYXJhbXM9W107XG4gIGZvcihpPTA7IGk8dGhpcy5wYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICBwYXJhbXMucHVzaChjb250ZXh0LmdldCh1dGlsLnRyaW0odGhpcy5wYXJhbXNbaV0pKSk7XG4gIH1cbiAgcmV0dXJuIGZ1bmMuYXBwbHkoY29udGV4dCwgcGFyYW1zKTtcbn07XG5GdW5jdGlvbkNhbGwucmVnID0gL15bYS16QS1aXVthLXpBLVowLTlcXC5dKlxcKFteXFwpXSpcXCkvO1xuXG5mdW5jdGlvbiBOdW1iZXJWYWx1ZSh0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJ2YWx1ZVwiO1xuICB0aGlzLm51bWJlciA9IHBhcnNlRmxvYXQodHh0LCAxMCk7XG4gIHRoaXMuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMubnVtYmVyO1xuICB9O1xufVxuTnVtYmVyVmFsdWUucmVnID0gL15bMC05XSsvO1xuXG5mdW5jdGlvbiBJZk9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbklmT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgcnYgPSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xuICBpZihydikge1xuICAgIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCk7XG4gIH1cbiAgcmV0dXJuIHJ2O1xufTtcbklmT3BlcmF0b3IucmVnID0gL15pZiAvO1xuXG5mdW5jdGlvbiBJbk9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbkluT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgbGVmdCA9IHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KTtcbiAgdmFyIHJpZ2h0ID0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbiAgaWYocmlnaHQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyB1dGlsLlJ1bnRpbWVFcnJvcigncmlnaHQgc2lkZSBvZiBpbiBvcGVyYXRvciBjYW5ub3QgYmUgdW5kZWZpbmVkJyk7XG4gIH1cbiAgaWYocmlnaHQuaW5kZXhPZikge1xuICAgIHJldHVybiByaWdodC5pbmRleE9mKGxlZnQpICE9IC0xO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByaWdodC5oYXNPd25Qcm9wZXJ0eShsZWZ0KTtcbiAgfVxufTtcbkluT3BlcmF0b3IucmVnID0gL15pbiAvO1xuXG5mdW5jdGlvbiBOb3RPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ3VuYXJ5JztcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5Ob3RPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiAhdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5Ob3RPcGVyYXRvci5yZWcgPSAvXm5vdCAvO1xuXG5mdW5jdGlvbiBjb21waWxlVGV4dEFuZEV4cHJlc3Npb25zKHR4dCkge1xuICAvLyBjb21waWxlIHRoZSBleHByZXNzaW9ucyBmb3VuZCBpbiB0aGUgdGV4dFxuICAvLyBhbmQgcmV0dXJuIGEgbGlzdCBvZiB0ZXh0K2V4cHJlc3Npb25cbiAgdmFyIGV4cHIsIGFyb3VuZDtcbiAgdmFyIGxpc3QgPSBbXTtcbiAgd2hpbGUodHJ1ZSkge1xuICAgIHZhciBtYXRjaCA9IC97eyguKz8pfX0vLmV4ZWModHh0KTtcbiAgICBpZighbWF0Y2gpIHtcbiAgICAgIGlmKHR4dCkge1xuICAgICAgICBsaXN0LnB1c2godHh0KTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBleHByID0gYnVpbGQobWF0Y2hbMV0pO1xuICAgIGFyb3VuZCA9IHR4dC5zcGxpdChtYXRjaFswXSwgMik7XG4gICAgaWYoYXJvdW5kWzBdLmxlbmd0aCkge1xuICAgICAgbGlzdC5wdXNoKGFyb3VuZFswXSk7XG4gICAgfVxuICAgIGxpc3QucHVzaChleHByKTtcbiAgICB0eHQgPSBhcm91bmRbMV07XG4gIH1cbiAgcmV0dXJuIGxpc3Q7XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlRXhwcmVzc2lvbkxpc3QoZXhwcmVzc2lvbnMsIGNvbnRleHQpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGZvcihpPTA7IGk8ZXhwcmVzc2lvbnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyYW0gPSBleHByZXNzaW9uc1tpXTtcbiAgICBpZihwYXJhbS5ldmFsdWF0ZSkge1xuICAgICAgc3RyICs9IHBhcmFtLmV2YWx1YXRlKGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gcGFyYW07XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59XG5cbi8vIGxpc3Qgb3JkZXIgZGVmaW5lIG9wZXJhdG9yIHByZWNlZGVuY2VcbnZhciBleHByZXNzaW9uX2xpc3QgPSBbXG4gIE11bHRpcGx5T3BlcmF0b3IsXG4gIFBsdXNPcGVyYXRvcixcbiAgTWludXNPcGVyYXRvcixcbiAgQmlnZ2VyT3BlcmF0b3IsXG4gIFNtYWxsZXJPcGVyYXRvcixcbiAgRXF1YWxPcGVyYXRvcixcbiAgTm90RXF1YWxPcGVyYXRvcixcbiAgRmlsdGVyLFxuICBJbk9wZXJhdG9yLFxuICBOb3RPcGVyYXRvcixcbiAgSWZPcGVyYXRvcixcbiAgT3JPcGVyYXRvcixcbiAgQW5kT3BlcmF0b3IsXG4gIFN0cmluZ1ZhbHVlLFxuICBOdW1iZXJWYWx1ZSxcbiAgRnVuY3Rpb25DYWxsLFxuICBOYW1lLFxuXTtcblxuZnVuY3Rpb24gYnVpbGQoaW5wdXQpIHtcbiAgcmV0dXJuIGJ1aWxkRXhwcmVzc2lvbnMocGFyc2VFeHByZXNzaW9ucyhpbnB1dCkpO1xufVxuXG5mdW5jdGlvbiBwYXJzZUV4cHJlc3Npb25zKGlucHV0KSB7XG4gIC8vIFJldHVybiBhIGxpc3Qgb2YgZXhwcmVzc2lvbnNcbiAgdmFyIGN1cnJlbnRFeHByID0gbnVsbCwgaSwgZXhwciwgbWF0Y2gsIGZvdW5kLCBwYXJzZWQgPSBbXTtcbiAgd2hpbGUoaW5wdXQpIHtcbiAgICBpbnB1dCA9IHV0aWwudHJpbShpbnB1dCk7XG4gICAgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IoaT0wOyBpPGV4cHJlc3Npb25fbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBleHByID0gZXhwcmVzc2lvbl9saXN0W2ldO1xuICAgICAgICBtYXRjaCA9IGV4cHIucmVnLmV4ZWMoaW5wdXQpO1xuICAgICAgICBpZihtYXRjaCkge1xuICAgICAgICAgIGlucHV0ID0gaW5wdXQuc2xpY2UobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgICBwYXJzZWQucHVzaChuZXcgZXhwcihtYXRjaFswXSwgY3VycmVudEV4cHIpKTtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgLy8gc3RhcnRpbmcgYWdhaW4gdG8gcmVzcGVjdCBwcmVjZWRlbmNlXG4gICAgICAgICAgaSA9IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYoZm91bmQgPT09IGZhbHNlKSB7XG4gICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJFeHByZXNzaW9uIHBhcnNlcjogSW1wb3NzaWJsZSB0byBwYXJzZSBmdXJ0aGVyIDogXCIgKyBpbnB1dCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwYXJzZWQ7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkRXhwcmVzc2lvbnMobGlzdCkge1xuICAvLyBidWlsZCBhIHRyZWUgb2YgZXhwcmVzc2lvbiByZXNwZWN0aW5nIHByZWNlZGVuY2VcbiAgdmFyIGksIGosIGV4cHI7XG4gIC8vIGEgZHVtYiBhbGdvIHRoYXQgd29ya3NcbiAgZm9yKGk9MDsgaTxleHByZXNzaW9uX2xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBmb3Ioaj0wOyBqPGxpc3QubGVuZ3RoOyBqKyspIHtcbiAgICAgIGlmKGxpc3QubGVuZ3RoID09IDEpIHtcbiAgICAgICAgcmV0dXJuIGxpc3RbMF07XG4gICAgICB9XG4gICAgICBleHByID0gbGlzdFtqXTtcbiAgICAgIGlmKGV4cHIgaW5zdGFuY2VvZiBleHByZXNzaW9uX2xpc3RbaV0pIHtcbiAgICAgICAgaWYoZXhwci50eXBlID09ICdvcGVyYXRvcicpIHtcbiAgICAgICAgICBleHByLmxlZnQgPSBsaXN0W2otMV07XG4gICAgICAgICAgZXhwci5yaWdodCA9IGxpc3RbaisxXTtcbiAgICAgICAgICBsaXN0LnNwbGljZShqLTEsIDIpO1xuICAgICAgICAgIGxpc3Rbai0xXSA9IGV4cHI7XG4gICAgICAgICAgaiA9IGogLSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmKGV4cHIudHlwZSA9PSAndW5hcnknKSB7XG4gICAgICAgICAgZXhwci5yaWdodCA9IGxpc3RbaisxXTtcbiAgICAgICAgICBsaXN0LnNwbGljZShqKzEsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGV4cHIudHlwZSA9PSAndmFsdWUnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiRXhwcmVzc2lvbiBidWlsZGVyOiBleHBlY3RlZCBhbiBvcGVyYXRvciBidXQgZ290IFwiICsgZXhwci5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGQ6YnVpbGQsXG4gIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnM6Y29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyxcbiAgYnVpbGRFeHByZXNzaW9uczpidWlsZEV4cHJlc3Npb25zLFxuICBwYXJzZUV4cHJlc3Npb25zOnBhcnNlRXhwcmVzc2lvbnMsXG4gIGV2YWx1YXRlRXhwcmVzc2lvbkxpc3Q6ZXZhbHVhdGVFeHByZXNzaW9uTGlzdCxcbiAgU3RyaW5nVmFsdWU6U3RyaW5nVmFsdWUsXG4gIE5hbWU6TmFtZSxcbiAgRVhQUkVTU0lPTl9SRUc6RVhQUkVTU0lPTl9SRUdcbn07IiwiLyogTGlrZWx5LmpzLFxuICAgUHl0aG9uIHN0eWxlIEhUTUwgdGVtcGxhdGUgbGFuZ3VhZ2Ugd2l0aCBiaS1kaXJlY3Rpb25uYWwgZGF0YSBiaW5kaW5nXG4gICBiYXRpc3RlIGJpZWxlciAyMDE0ICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpO1xudmFyIGV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKTtcblxuZnVuY3Rpb24gdXBkYXRlRGF0YShjb250ZXh0LCBkb20pIHtcbiAgdmFyIG5hbWUgPSBkb20uZ2V0QXR0cmlidXRlKFwibGstYmluZFwiKSwgdmFsdWU7XG4gIGlmKCFuYW1lKSB7XG4gICAgdGhyb3cgXCJObyBsay1iaW5kIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudFwiO1xuICB9XG4gIGlmKGRvbS50eXBlID09ICdjaGVja2JveCcgJiYgIWRvbS5jaGVja2VkKSB7XG4gICAgdmFsdWUgPSBcIlwiO1xuICB9IGVsc2Uge1xuICAgIHZhbHVlID0gZG9tLnZhbHVlOy8vIHx8IGRvbS5nZXRBdHRyaWJ1dGUoXCJ2YWx1ZVwiKTtcbiAgfVxuICAvLyB1cGRhdGUgdGhlIGNvbnRleHRcbiAgY29udGV4dC5tb2RpZnkobmFtZSwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBCaW5kaW5nKGRvbSwgdHBsLCBkYXRhKSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBCaW5kaW5nKSB7XG4gICAgcmV0dXJuIG5ldyBCaW5kaW5nKGRvbSwgdHBsLCBkYXRhKTtcbiAgfVxuICAvLyBkb3VibGUgZGF0YSBiaW5kaW5nIGJldHdlZW4gc29tZSBkYXRhIGFuZCBzb21lIGRvbVxuICB0aGlzLmRvbSA9IGRvbTtcbiAgdGhpcy5kYXRhID0gZGF0YTtcbiAgdGhpcy5jb250ZXh0ID0gbmV3IHRlbXBsYXRlLkNvbnRleHQodGhpcy5kYXRhKTtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRwbDtcbn1cblxuQmluZGluZy5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZS50cmVlKG5ldyB0ZW1wbGF0ZS5Db250ZXh0KHRoaXMuZGF0YSkpO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmRvbS5pbm5lckhUTUwgPSBcIlwiO1xuICB0aGlzLmN1cnJlbnRUcmVlID0gdGhpcy50cmVlKCk7XG4gIHRoaXMuY3VycmVudFRyZWUuZG9tVHJlZSh0aGlzLmRvbSk7XG4gIHRoaXMuYmluZEV2ZW50cygpO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuZG9tSW5pdCA9IGZ1bmN0aW9uKCkge1xuICAvLyBjcmVhdGUgYW4gaW5pdGlhbCB0cmVlIGZyb20gdGhlIERPTVxuICB0aGlzLmN1cnJlbnRUcmVlID0gcmVuZGVyLmluaXRpYWxSZW5kZXJGcm9tRG9tKHRoaXMuZG9tKTtcbiAgdGhpcy5jdXJyZW50VHJlZS5ub2RlTmFtZSA9IHVuZGVmaW5lZDtcbiAgdGhpcy5iaW5kRXZlbnRzKCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kaWZmID0gZnVuY3Rpb24oKSB7XG4gIHZhciBuZXdUcmVlID0gdGhpcy50cmVlKCk7XG4gIHZhciBkaWZmID0gdGhpcy5jdXJyZW50VHJlZS5kaWZmKG5ld1RyZWUpO1xuICByZW5kZXIuYXBwbHlEaWZmKGRpZmYsIHRoaXMuZG9tKTtcbiAgdGhpcy5jdXJyZW50VHJlZSA9IG5ld1RyZWU7XG4gIHRoaXMubG9jayA9IGZhbHNlO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuZGF0YUV2ZW50ID0gZnVuY3Rpb24oZSkge1xuICB2YXIgZG9tID0gZS50YXJnZXQ7XG4gIHZhciBuYW1lID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstYmluZCcpO1xuICBpZihuYW1lKSB7XG4gICAgdmFyIHJlbmRlck5vZGUgPSB0aGlzLmdldFJlbmRlck5vZGVGcm9tUGF0aChkb20pO1xuICAgIHVwZGF0ZURhdGEocmVuZGVyTm9kZS5jb250ZXh0LCBkb20pO1xuICAgIGlmKCF0aGlzLmxvY2spIHtcbiAgICAgIHRoaXMubG9jayA9IHRydWU7XG4gICAgICB0aGlzLmRpZmYoKTtcbiAgICB9XG4gICAgdGhpcy5kb20uZGlzcGF0Y2hFdmVudChcbiAgICAgIHV0aWwuZXZlbnQoJ2RhdGFWaWV3Q2hhbmdlZCcpLFxuICAgICAge1wibmFtZVwiOiBuYW1lfVxuICAgICk7XG4gIH1cbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmdldFJlbmRlck5vZGVGcm9tUGF0aCA9IGZ1bmN0aW9uKGRvbSkge1xuICB2YXIgcGF0aCA9IGRvbS5nZXRBdHRyaWJ1dGUoJ2xrLXBhdGgnKTtcbiAgdmFyIHJlbmRlck5vZGUgPSB0aGlzLmN1cnJlbnRUcmVlO1xuICB2YXIgYml0cyA9IHBhdGguc3BsaXQoXCIuXCIpLCBpO1xuICBmb3IoaT0xOyBpPGJpdHMubGVuZ3RoOyBpKyspIHtcbiAgICByZW5kZXJOb2RlID0gcmVuZGVyTm9kZS5jaGlsZHJlbltiaXRzW2ldXTtcbiAgfVxuICByZXR1cm4gcmVuZGVyTm9kZTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmFueUV2ZW50ID0gZnVuY3Rpb24oZSkge1xuICB2YXIgZG9tID0gZS50YXJnZXQ7XG4gIHZhciBsa0V2ZW50ID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstJyArIGUudHlwZSk7XG4gIGlmKCFsa0V2ZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciByZW5kZXJOb2RlID0gdGhpcy5nZXRSZW5kZXJOb2RlRnJvbVBhdGgoZG9tKTtcbiAgcmVuZGVyTm9kZS5ub2RlLmF0dHJzWydsay0nK2UudHlwZV0uZXZhbHVhdGUocmVuZGVyTm9kZS5jb250ZXh0KTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmJpbmRFdmVudHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGk7XG4gIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbihlKXsgdGhpcy5kYXRhRXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpeyB0aGlzLmRhdGFFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIHZhciBldmVudHMgPSBcImNsaWNrLGNoYW5nZSxtb3VzZW92ZXIsZm9jdXMsa2V5ZG93bixrZXl1cCxrZXlwcmVzcyxzdWJtaXQsYmx1clwiLnNwbGl0KCcsJyk7XG4gIGZvcihpPTA7IGk8ZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIGV2ZW50c1tpXSxcbiAgICAgIGZ1bmN0aW9uKGUpeyB0aGlzLmFueUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgfVxufTtcblxuQmluZGluZy5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5kaWZmKCk7XG59O1xuXG4vL1RPRE86IGF1dG9tYXRpYyBuZXcgb24gQ29udGV4dCwgVGVtcGxhdGUgYW5kIENvbXBvbmVudFxuZnVuY3Rpb24gQ29tcG9uZW50KG5hbWUsIHRwbCwgY29udHJvbGxlcikge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQ29tcG9uZW50KSB7XG4gICAgcmV0dXJuIG5ldyBDb21wb25lbnQobmFtZSwgdHBsLCBjb250cm9sbGVyKTtcbiAgfVxuICBpZih0ZW1wbGF0ZS5jb21wb25lbnRDYWNoZVtuYW1lXSkge1xuICAgIHV0aWwuQ29tcGlsZUVycm9yKFwiQ29tcG9uZW50IHdpdGggbmFtZSBcIiArIG5hbWUgKyBcIiBhbHJlYWR5IGV4aXN0XCIpO1xuICB9XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIHRoaXMudGVtcGxhdGUgPSB0cGw7XG4gIHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG4gIHRlbXBsYXRlLmNvbXBvbmVudENhY2hlW25hbWVdID0gdGhpcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFRlbXBsYXRlOnRlbXBsYXRlLmJ1aWxkVGVtcGxhdGUsXG4gIENvbnRleHROYW1lOnRlbXBsYXRlLkNvbnRleHROYW1lLFxuICB1cGRhdGVEYXRhOnVwZGF0ZURhdGEsXG4gIEJpbmRpbmc6QmluZGluZyxcbiAgQ29tcG9uZW50OkNvbXBvbmVudCxcbiAgZ2V0RG9tOnJlbmRlci5nZXREb20sXG4gIGNvbXBvbmVudENhY2hlOnRlbXBsYXRlLmNvbXBvbmVudENhY2hlLFxuICBwYXJzZUV4cHJlc3Npb25zOmV4cHJlc3Npb24ucGFyc2VFeHByZXNzaW9ucyxcbiAgY29tcGlsZVRleHRBbmRFeHByZXNzaW9uczpleHByZXNzaW9uLmNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnMsXG4gIGJ1aWxkRXhwcmVzc2lvbnM6ZXhwcmVzc2lvbi5idWlsZEV4cHJlc3Npb25zLFxuICBleHByZXNzaW9uczp7XG4gICAgU3RyaW5nVmFsdWU6ZXhwcmVzc2lvbi5TdHJpbmdWYWx1ZVxuICB9LFxuICBhcHBseURpZmY6cmVuZGVyLmFwcGx5RGlmZixcbiAgZGlmZkNvc3Q6cmVuZGVyLmRpZmZDb3N0LFxuICBwYXJzZUF0dHJpYnV0ZXM6dGVtcGxhdGUucGFyc2VBdHRyaWJ1dGVzLFxuICBhdHRyaWJ1dGVzRGlmZjpyZW5kZXIuYXR0cmlidXRlc0RpZmYsXG4gIENvbnRleHQ6dGVtcGxhdGUuQ29udGV4dCxcbiAgQ29tcGlsZUVycm9yOnV0aWwuQ29tcGlsZUVycm9yLFxuICBSdW50aW1lRXJyb3I6dXRpbC5SdW50aW1lRXJyb3IsXG4gIGVzY2FwZTp1dGlsLmVzY2FwZSxcbiAgaW5pdGlhbFJlbmRlckZyb21Eb206cmVuZGVyLmluaXRpYWxSZW5kZXJGcm9tRG9tLFxuICBleHByZXNzaW9uOmV4cHJlc3Npb24sXG4gIHJlbmRlcjpyZW5kZXIsXG4gIHV0aWw6dXRpbCxcbiAgc2V0SGFuZGljYXA6ZnVuY3Rpb24obil7cmVuZGVyLmhhbmRpY2FwID0gbjt9XG59O1xuIiwiXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gUmVuZGVyZWROb2RlKG5vZGUsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKSB7XG4gIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgdGhpcy5ub2RlID0gbm9kZTtcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5yZW5kZXJlciA9IHJlbmRlcmVyO1xuICB0aGlzLnBhdGggPSBwYXRoIHx8IFwiXCI7XG4gIC8vIHNob3J0Y3V0XG4gIHRoaXMubm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lO1xufVxuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLnJlcHIgPSBmdW5jdGlvbihsZXZlbCkge1xuICB2YXIgc3RyID0gXCJcIiwgaTtcbiAgaWYobGV2ZWwgPT09IHVuZGVmaW5lZCkge1xuICAgIGxldmVsID0gMDtcbiAgfVxuICBmb3IoaT0wOyBpPGxldmVsOyBpKyspIHtcbiAgICBzdHIgKz0gXCIgIFwiO1xuICB9XG4gIHN0ciArPSBTdHJpbmcodGhpcy5ub2RlKSArIFwiIHBhdGggXCIgKyB0aGlzLnBhdGggKyBcIlxcclxcblwiO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBzdHIgKz0gdGhpcy5jaGlsZHJlbltpXS5yZXByKGxldmVsICsgMSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZG9tVHJlZSA9IGZ1bmN0aW9uKGFwcGVuZF90bykge1xuICB2YXIgbm9kZSA9IGFwcGVuZF90byB8fCB0aGlzLm5vZGUuZG9tTm9kZSh0aGlzLmNvbnRleHQsIHRoaXMucGF0aCksIGksIGNoaWxkX3RyZWU7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIGNoaWxkX3RyZWUgPSB0aGlzLmNoaWxkcmVuW2ldLmRvbVRyZWUoKTtcbiAgICBpZihub2RlLnB1c2gpIHtcbiAgICAgIG5vZGUucHVzaChjaGlsZF90cmVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZF90cmVlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRvbUh0bWwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGk7XG4gIC8vdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gIHZhciBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjaGlsZCA9IHRoaXMuY2hpbGRyZW5baV0uZG9tVHJlZSgpO1xuICAgIGQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICB9XG4gIHJldHVybiBkLmlubmVySFRNTDtcbn07XG5cbmZ1bmN0aW9uIGRpZmZDb3N0KGRpZmYpIHtcbiAgdmFyIHZhbHVlPTAsIGk7XG4gIGZvcihpPTA7IGk8ZGlmZi5sZW5ndGg7IGkrKykge1xuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgIHZhbHVlICs9IDU7XG4gICAgfVxuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwiYWRkXCIpIHtcbiAgICAgIHZhbHVlICs9IDI7XG4gICAgfVxuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwibXV0YXRlXCIpIHtcbiAgICAgIHZhbHVlICs9IDE7XG4gICAgfVxuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwic3RyaW5nbXV0YXRlXCIpIHtcbiAgICAgIHZhbHVlICs9IDE7XG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5fZGlmZiA9IGZ1bmN0aW9uKHJlbmRlcmVkX25vZGUsIGFjY3UsIHBhdGgpIHtcbiAgdmFyIGksIGosIHNvdXJjZV9wdCA9IDA7XG4gIGlmKHBhdGggPT09IHVuZGVmaW5lZCkgeyBwYXRoID0gXCJcIjsgfVxuXG4gIGlmKCFyZW5kZXJlZF9ub2RlKSB7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICBub2RlOiB0aGlzLFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9XG5cbiAgaWYocmVuZGVyZWRfbm9kZS5ub2RlTmFtZSAhPSB0aGlzLm5vZGVOYW1lKSB7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICBub2RlOiB0aGlzLFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIGFjY3UucHVzaCh7XG4gICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZSxcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfVxuXG4gIC8vIENvdWxkIHVzZSBpbmhlcml0YW5jZSBmb3IgdGhpc1xuICBpZih0aGlzLm5vZGVOYW1lID09IFwiI3RleHRcIiAmJiB0aGlzLnJlbmRlcmVyICE9IHJlbmRlcmVkX25vZGUucmVuZGVyZXIpIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIGFjdGlvbjogJ3N0cmluZ211dGF0ZScsXG4gICAgICAgIG5vZGU6IHRoaXMsXG4gICAgICAgIHZhbHVlOiByZW5kZXJlZF9ub2RlLnJlbmRlcmVyLFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYV9kaWZmID0gYXR0cmlidXRlc0RpZmYodGhpcy5hdHRycywgcmVuZGVyZWRfbm9kZS5hdHRycyk7XG4gICAgaWYoYV9kaWZmLmxlbmd0aCkge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAnbXV0YXRlJyxcbiAgICAgICAgbm9kZTogdGhpcyxcbiAgICAgICAgYXR0cmlidXRlc0RpZmY6IGFfZGlmZixcbiAgICAgICAgcGF0aDogcGF0aFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGwxID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7XG4gIHZhciBsMiA9IHJlbmRlcmVkX25vZGUuY2hpbGRyZW4ubGVuZ3RoO1xuXG4gIC8vIG5vIHN3YXAgcG9zc2libGUsIGJ1dCBkZWxldGluZyBhIG5vZGUgaXMgcG9zc2libGVcbiAgaiA9IDA7IGkgPSAwOyBzb3VyY2VfcHQgPSAwO1xuICAvLyBsZXQncyBnb3QgdHJvdWdoIGFsbCB0aGUgY2hpbGRyZW5cbiAgZm9yKDsgaTxsMTsgaSsrKSB7XG4gICAgdmFyIGRpZmYgPSAwLCBhZnRlcl9zb3VyY2VfZGlmZiA9IDAsIGFmdGVyX3RhcmdldF9kaWZmID0gMCwgYWZ0ZXJfc291cmNlX2Nvc3Q9bnVsbCwgYWZ0ZXJfdGFyZ2V0X2Nvc3Q9bnVsbDtcbiAgICB2YXIgYWZ0ZXJfdGFyZ2V0ID0gcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqKzFdO1xuICAgIHZhciBhZnRlcl9zb3VyY2UgPSB0aGlzLmNoaWxkcmVuW2krMV07XG5cbiAgICBpZighcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSkge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgICAgbm9kZTogdGhpcy5jaGlsZHJlbltpXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIHNvdXJjZV9wdFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBkaWZmID0gdGhpcy5jaGlsZHJlbltpXS5fZGlmZihyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG5cbiAgICB2YXIgY29zdCA9IGRpZmZDb3N0KGRpZmYpO1xuICAgIC8vIGRvZXMgdGhlIG5leHQgc291cmNlIG9uZSBmaXRzIGJldHRlcj9cbiAgICBpZihhZnRlcl9zb3VyY2UpIHtcbiAgICAgIGFmdGVyX3NvdXJjZV9kaWZmID0gYWZ0ZXJfc291cmNlLl9kaWZmKHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcbiAgICAgIC8vIG5lZWRzIHNvbWUgaGFuZGljYXAgb3RoZXJ3aXNlIGlucHV0cyBjb250YWluaW5nIHRoZSBjdXJyZW50IGZvY3VzXG4gICAgICAvLyBtaWdodCBiZSByZW1vdmVkXG4gICAgICBhZnRlcl9zb3VyY2VfY29zdCA9IGRpZmZDb3N0KGFmdGVyX3NvdXJjZV9kaWZmKSArIG1vZHVsZS5leHBvcnRzLmhhbmRpY2FwO1xuICAgIH1cbiAgICAvLyBkb2VzIHRoZSBuZXh0IHRhcmdldCBvbmUgZml0cyBiZXR0ZXI/XG4gICAgaWYoYWZ0ZXJfdGFyZ2V0KSB7XG4gICAgICBhZnRlcl90YXJnZXRfZGlmZiA9IHRoaXMuY2hpbGRyZW5baV0uX2RpZmYoYWZ0ZXJfdGFyZ2V0LCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG4gICAgICBhZnRlcl90YXJnZXRfY29zdCA9IGRpZmZDb3N0KGFmdGVyX3RhcmdldF9kaWZmKSArIG1vZHVsZS5leHBvcnRzLmhhbmRpY2FwO1xuICAgIH1cblxuICAgIGlmKCghYWZ0ZXJfdGFyZ2V0IHx8IGNvc3QgPD0gYWZ0ZXJfdGFyZ2V0X2Nvc3QpICYmICghYWZ0ZXJfc291cmNlIHx8IGNvc3QgPD0gYWZ0ZXJfc291cmNlX2Nvc3QpKSB7XG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoZGlmZik7XG4gICAgICBzb3VyY2VfcHQgKz0gMTtcbiAgICB9IGVsc2UgaWYoYWZ0ZXJfc291cmNlICYmICghYWZ0ZXJfdGFyZ2V0IHx8IGFmdGVyX3NvdXJjZV9jb3N0IDw9IGFmdGVyX3RhcmdldF9jb3N0KSkge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2FmdGVyX3NvdXJjZScsXG4gICAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICAgIG5vZGU6IHRoaXMuY2hpbGRyZW5baV0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyBzb3VyY2VfcHRcbiAgICAgIH0pO1xuICAgICAgYWNjdSA9IGFjY3UuY29uY2F0KGFmdGVyX3NvdXJjZV9kaWZmKTtcbiAgICAgIHNvdXJjZV9wdCArPSAxO1xuICAgICAgaSsrO1xuICAgIH0gZWxzZSBpZihhZnRlcl90YXJnZXQpIHtcbiAgICAgIC8vIGltcG9ydGFudCB0byBhZGQgdGhlIGRpZmYgYmVmb3JlXG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoYWZ0ZXJfdGFyZ2V0X2RpZmYpO1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2FmdGVyX3RhcmdldCcsXG4gICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyAoc291cmNlX3B0KVxuICAgICAgfSk7XG4gICAgICBzb3VyY2VfcHQgKz0gMjtcbiAgICAgIGorKztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgXCJTaG91bGQgbmV2ZXIgaGFwcGVuXCI7XG4gICAgfVxuICAgIGorKztcbiAgfVxuXG4gIC8vIG5ldyBub2RlcyB0byBiZSBhZGRlZCBhZnRlciB0aGUgZGlmZlxuICBmb3IoaT0wOyBpPChsMi1qKTsgaSsrKSB7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICBub2RlOiByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2oraV0sXG4gICAgICBwYXRoOiBwYXRoICsgJy4nICsgKHNvdXJjZV9wdCArIDEpXG4gICAgfSk7XG4gICAgc291cmNlX3B0ICs9IDE7XG4gIH1cblxuICByZXR1cm4gYWNjdTtcblxufTtcblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5kaWZmID0gZnVuY3Rpb24ocmVuZGVyZWRfbm9kZSkge1xuICB2YXIgYWNjdSA9IFtdO1xuICByZXR1cm4gdGhpcy5fZGlmZihyZW5kZXJlZF9ub2RlLCBhY2N1KTtcbn07XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZXNEaWZmKGEsIGIpIHtcbiAgdmFyIGNoYW5nZXMgPSBbXSwga2V5O1xuICBmb3Ioa2V5IGluIGEpIHtcbiAgICAgIGlmKGJba2V5XSA9PT0gZmFsc2UpIHtcbiAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJyZW1vdmVcIiwga2V5OmtleX0pO1xuICAgICAgfSBlbHNlIGlmKGJba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmKGJba2V5XSAhPSBhW2tleV0pIHtcbiAgICAgICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcIm11dGF0ZVwiLCBrZXk6a2V5LCB2YWx1ZTpiW2tleV19KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJyZW1vdmVcIiwga2V5OmtleX0pO1xuICAgICAgfVxuICB9XG4gIGZvcihrZXkgaW4gYikge1xuICAgIGlmKGFba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcImFkZFwiLCBrZXk6a2V5LCB2YWx1ZTpiW2tleV19KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNoYW5nZXM7XG59XG5cbmZ1bmN0aW9uIGdldERvbShkb20sIHBhdGgsIHN0b3ApIHtcbiAgdmFyIGksIHA9cGF0aC5zcGxpdCgnLicpLCBkPWRvbTtcbiAgaWYoc3RvcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RvcCA9IDA7XG4gIH1cbiAgZm9yKGk9MDsgaTwocC5sZW5ndGggLSBzdG9wKTsgaSsrKSB7XG4gICAgaWYocFtpXSkgeyAvLyBmaXJzdCBvbmUgaXMgXCJcIlxuICAgICAgZCA9IGQuY2hpbGROb2Rlc1twYXJzZUludChwW2ldLCAxMCldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZDtcbn1cblxuZnVuY3Rpb24gYXBwbHlEaWZmKGRpZmYsIGRvbSkge1xuICB2YXIgaSwgaiwgX2RpZmYsIF9kb20sIHBhcmVudDtcbiAgZm9yKGk9MDsgaTxkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgX2RpZmYgPSBkaWZmW2ldO1xuICAgIF9kb20gPSBnZXREb20oZG9tLCBfZGlmZi5wYXRoKTtcbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgX2RvbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKF9kb20pO1xuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgdmFyIG5ld05vZGUgPSBfZGlmZi5ub2RlLmRvbVRyZWUoKTtcbiAgICAgIGlmKF9kb20pIHtcbiAgICAgICAgX2RvbS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShuZXdOb2RlLCBfZG9tKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGdldCB0aGUgcGFyZW50XG4gICAgICAgIHBhcmVudCA9IGdldERvbShkb20sIF9kaWZmLnBhdGgsIDEpO1xuICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQobmV3Tm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICBmb3Ioaj0wOyBqPF9kaWZmLmF0dHJpYnV0ZXNEaWZmLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBhX2RpZmYgPSBfZGlmZi5hdHRyaWJ1dGVzRGlmZltqXTtcbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICAgICAgLy8gaW1wb3J0YW50IGZvciBzZWxlY3RcbiAgICAgICAgICBpZihcInZhbHVlLHNlbGVjdGVkLGNoZWNrZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBpZihfZG9tW2FfZGlmZi5rZXldICE9IGFfZGlmZi52YWx1ZSkge1xuICAgICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gYV9kaWZmLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBfZG9tLnNldEF0dHJpYnV0ZShhX2RpZmYua2V5LCBhX2RpZmYudmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgICAgIGlmKFwiY2hlY2tlZCxzZWxlY3RlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5yZW1vdmVBdHRyaWJ1dGUoYV9kaWZmLmtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICAgICAgaWYoXCJjaGVja2VkLHNlbGVjdGVkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGFfZGlmZi52YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5zZXRBdHRyaWJ1dGUoYV9kaWZmLmtleSwgYV9kaWZmLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJzdHJpbmdtdXRhdGVcIikge1xuICAgICAgX2RvbS5ub2RlVmFsdWUgPSBfZGlmZi52YWx1ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdGlhbFJlbmRlckZyb21Eb20oZG9tLCBwYXRoKSB7XG4gIHBhdGggPSBwYXRoIHx8IFwiXCI7XG4gIHZhciBpLCBjaGlsZCwgY2hpbGRyZW4gPSBbXSwgYXR0cnMgPSB7fSwgcmVuZGVyZXIgPSAnJztcbiAgaWYoZG9tLmF0dHJpYnV0ZXMpIHtcbiAgICBmb3IoaT0wOyBpIDwgZG9tLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBhdHRyID0gZG9tLmF0dHJpYnV0ZXNbaV07XG4gICAgICBhdHRyc1thdHRyLm5hbWVdID0gYXR0ci52YWx1ZTtcbiAgICB9XG4gIH1cbiAgaWYoZG9tLmNoaWxkTm9kZXMpIHtcbiAgICBmb3IoaT0wOyBpIDwgZG9tLmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoaWxkID0gZG9tLmNoaWxkTm9kZXNbaV07XG4gICAgICBjaGlsZHJlbi5wdXNoKGluaXRpYWxSZW5kZXJGcm9tRG9tKGNoaWxkLCBwYXRoICsgJy4nICsgaSkpO1xuICAgIH1cbiAgfVxuICBpZihkb20udGV4dENvbnRlbnQpIHtcbiAgICByZW5kZXJlciA9IGRvbS50ZXh0Q29udGVudDtcbiAgfVxuICB2YXIgcm4gPSBuZXcgUmVuZGVyZWROb2RlKFxuICAgIHtub2RlTmFtZTogZG9tLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCksIG5vZGU6ZG9tfSxcbiAgICB1bmRlZmluZWQsXG4gICAgcmVuZGVyZXIsXG4gICAgcGF0aCk7XG4gIHJuLmF0dHJzID0gYXR0cnM7XG4gIHJuLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gIHJldHVybiBybjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFJlbmRlcmVkTm9kZTpSZW5kZXJlZE5vZGUsXG4gIGluaXRpYWxSZW5kZXJGcm9tRG9tOmluaXRpYWxSZW5kZXJGcm9tRG9tLFxuICBhcHBseURpZmY6YXBwbHlEaWZmLFxuICBhdHRyaWJ1dGVzRGlmZjphdHRyaWJ1dGVzRGlmZixcbiAgZGlmZkNvc3Q6ZGlmZkNvc3QsXG4gIGdldERvbTpnZXREb20sXG4gIGhhbmRpY2FwOjFcbn07IiwiXG5cInVzZSBzdHJpY3RcIjtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKTtcbnZhciBleHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJyk7XG5cbnZhciB0ZW1wbGF0ZUNhY2hlID0ge307XG52YXIgY29tcG9uZW50Q2FjaGUgPSB7fTtcbi8vIGEgbmFtZSBoZXJlIGlzIGFsc28gYW55IHZhbGlkIEpTIG9iamVjdCBwcm9wZXJ0eVxudmFyIFZBUk5BTUVfUkVHID0gL15bYS16QS1aXyRdWzAtOWEtekEtWl8kXSovO1xudmFyIEhUTUxfQVRUUl9SRUcgPSAvXltBLVphLXpdW1xcdy1dezAsfS87XG52YXIgRE9VQkxFX1FVT1RFRF9TVFJJTkdfUkVHID0gL15cIihcXFxcXCJ8W15cIl0pKlwiLztcblxuZnVuY3Rpb24gQ29udGV4dE5hbWUobmFtZSkge1xuICB0aGlzLmJpdHMgPSBuYW1lLnNwbGl0KCcuJyk7XG59XG5cbkNvbnRleHROYW1lLnByb3RvdHlwZS5zdWJzdGl0dXRlQWxpYXMgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIGlmKGNvbnRleHQuYWxpYXNlcy5oYXNPd25Qcm9wZXJ0eSh0aGlzLmJpdHNbMF0pKSB7XG4gICAgdmFyIG5ld0JpdHMgPSBjb250ZXh0LmFsaWFzZXNbdGhpcy5iaXRzWzBdXS5zcGxpdCgnLicpO1xuICAgIHRoaXMuYml0cy5zaGlmdCgpO1xuICAgIHRoaXMuYml0cyA9IG5ld0JpdHMuY29uY2F0KHRoaXMuYml0cyk7XG4gIH1cbn07XG5cbkNvbnRleHROYW1lLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5iaXRzWzBdO1xufTtcblxuQ29udGV4dE5hbWUucHJvdG90eXBlLnN0ciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5iaXRzLmpvaW4oJy4nKTtcbn07XG5cbmZ1bmN0aW9uIENvbnRleHQoZGF0YSwgcGFyZW50KSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBDb250ZXh0KSB7XG4gICAgcmV0dXJuIG5ldyBDb250ZXh0KGRhdGEsIHBhcmVudCk7XG4gIH1cbiAgdGhpcy5kYXRhID0gZGF0YTtcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuYWxpYXNlcyA9IHt9O1xuICB0aGlzLndhdGNoaW5nID0ge307XG59XG5cbkNvbnRleHQucHJvdG90eXBlLmFkZEFsaWFzID0gZnVuY3Rpb24oc291cmNlTmFtZSwgYWxpYXNOYW1lKSB7XG4gIC8vIHNvdXJjZSBuYW1lIGNhbiBiZSAnbmFtZScgb3IgJ2xpc3Qua2V5J1xuICBpZihzb3VyY2VOYW1lID09PSBhbGlhc05hbWUpIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJBbGlhcyB3aXRoIHRoZSBuYW1lIFwiICsgYWxpYXNOYW1lICsgXCIgYWxyZWFkeSBwcmVzZW50IGluIHRoaXMgY29udGV4dC5cIik7XG4gIH1cbiAgdGhpcy5hbGlhc2VzW2FsaWFzTmFtZV0gPSBzb3VyY2VOYW1lO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUucmVzb2x2ZU5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIC8vIGdpdmVuIGEgbmFtZSwgcmV0dXJuIHRoZSBbQ29udGV4dCwgcmVzb2x2ZWQgcGF0aCwgdmFsdWVdIHdoZW5cbiAgLy8gdGhpcyBuYW1lIGlzIGZvdW5kIG9yIHVuZGVmaW5lZCBvdGhlcndpc2VcbiAgbmFtZS5zdWJzdGl0dXRlQWxpYXModGhpcyk7XG5cbiAgaWYodGhpcy5kYXRhLmhhc093blByb3BlcnR5KG5hbWUuc3RhcnQoKSkpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLmRhdGFbbmFtZS5zdGFydCgpXTtcbiAgICB2YXIgaSA9IDE7XG4gICAgd2hpbGUoaSA8IG5hbWUuYml0cy5sZW5ndGgpIHtcbiAgICAgIGlmKCF2YWx1ZS5oYXNPd25Qcm9wZXJ0eShuYW1lLmJpdHNbaV0pKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICB2YWx1ZSA9IHZhbHVlW25hbWUuYml0c1tpXV07XG4gICAgICBpKys7XG4gICAgfVxuICAgIHJldHVybiBbdGhpcywgbmFtZS5zdHIoKSwgdmFsdWVdO1xuICB9XG5cbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZU5hbWUobmFtZSk7XG4gIH1cblxufTtcblxuQ29udGV4dC5wcm90b3R5cGUuZ2V0TmFtZVBhdGggPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZU5hbWUobmV3IENvbnRleHROYW1lKG5hbWUpKTtcbiAgaWYocmVzb2x2ZWQpIHtcbiAgICByZXR1cm4gcmVzb2x2ZWRbMV07XG4gIH1cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAgdGhpcy53YXRjaGluZ1tuYW1lXSA9IGNhbGxiYWNrO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVOYW1lKG5ldyBDb250ZXh0TmFtZShuYW1lKSk7XG4gIGlmKHJlc29sdmVkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVkWzJdO1xuICB9XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB0aGlzLl9tb2RpZnkobmV3IENvbnRleHROYW1lKG5hbWUpLCB2YWx1ZSk7XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5fbW9kaWZ5ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcblxuICBpZih0aGlzLndhdGNoaW5nLmhhc093blByb3BlcnR5KG5hbWUuc3RyKCkpKSB7XG4gICAgdGhpcy53YXRjaGluZ1tuYW1lLnN0cigpXSh2YWx1ZSk7XG4gIH1cblxuICBuYW1lLnN1YnN0aXR1dGVBbGlhcyh0aGlzKTtcblxuICAvLyB3ZSBnbyBpbiBmb3IgYSBzZWFyY2ggaWYgdGhlIGZpcnN0IHBhcnQgbWF0Y2hlc1xuICBpZih0aGlzLmRhdGEuaGFzT3duUHJvcGVydHkobmFtZS5zdGFydCgpKSkge1xuICAgIHZhciBkYXRhID0gdGhpcy5kYXRhO1xuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZShpIDwgbmFtZS5iaXRzLmxlbmd0aCAtIDEpIHtcbiAgICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KG5hbWUuYml0c1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGRhdGEgPSBkYXRhW25hbWUuYml0c1tpXV07XG4gICAgICBpKys7XG4gICAgfVxuICAgIGRhdGFbbmFtZS5iaXRzW2ldXSA9IHZhbHVlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIC8vIGRhdGEgbm90IGZvdW5kLCBsZXQncyBzZWFyY2ggaW4gdGhlIHBhcmVudFxuICBpZih0aGlzLnBhcmVudCkge1xuICAgIHJldHVybiB0aGlzLnBhcmVudC5fbW9kaWZ5KG5hbWUsIHZhbHVlKTtcbiAgfVxuXG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB0aGlzLmRhdGFbbmFtZV0gPSB2YWx1ZTtcbn07XG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlcyh2LCBub2RlKSB7XG4gIHZhciBhdHRycyA9IHt9LCBuLCBzO1xuICB3aGlsZSh2KSB7XG4gICAgICB2ID0gdXRpbC50cmltKHYpO1xuICAgICAgbiA9IHYubWF0Y2goSFRNTF9BVFRSX1JFRyk7XG4gICAgICBpZighbikge1xuICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gYXR0cmlidXRlIG5hbWUgZm91bmQgaW4gXCIrdik7XG4gICAgICB9XG4gICAgICB2ID0gdi5zdWJzdHIoblswXS5sZW5ndGgpO1xuICAgICAgbiA9IG5bMF07XG4gICAgICBpZih2WzBdICE9IFwiPVwiKSB7XG4gICAgICAgIG5vZGUuY2Vycm9yKFwicGFyc2VBdHRyaWJ1dGVzOiBObyBlcXVhbCBzaWduIGFmdGVyIG5hbWUgXCIrbik7XG4gICAgICB9XG4gICAgICB2ID0gdi5zdWJzdHIoMSk7XG4gICAgICBzID0gdi5tYXRjaChET1VCTEVfUVVPVEVEX1NUUklOR19SRUcpO1xuICAgICAgaWYocykge1xuICAgICAgICBhdHRyc1tuXSA9IG5ldyBTdHJpbmdOb2RlKG51bGwsIHNbMF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcyA9IHYubWF0Y2goZXhwcmVzc2lvbi5FWFBSRVNTSU9OX1JFRyk7XG4gICAgICAgIGlmKHMgPT09IG51bGwpIHtcbiAgICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gc3RyaW5nIG9yIGV4cHJlc3Npb24gZm91bmQgYWZ0ZXIgbmFtZSBcIituKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgZXhwciA9IGV4cHJlc3Npb24uYnVpbGQoc1sxXSk7XG4gICAgICAgICAgYXR0cnNbbl0gPSBleHByO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2ID0gdi5zdWJzdHIoc1swXS5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBhdHRycztcbn1cblxuLy8gYWxsIHRoZSBhdmFpbGFibGUgdGVtcGxhdGUgbm9kZVxuXG5mdW5jdGlvbiBOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgdGhpcy5saW5lID0gbGluZTtcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuY29udGVudCA9IGNvbnRlbnQ7XG4gIHRoaXMubGV2ZWwgPSBsZXZlbDtcbiAgdGhpcy5jaGlsZHJlbiA9IFtdO1xufVxuXG5Ob2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGlmKGxldmVsID09PSB1bmRlZmluZWQpIHtcbiAgICBsZXZlbCA9IDA7XG4gIH1cbiAgZm9yKGk9MDsgaTxsZXZlbDsgaSsrKSB7XG4gICAgc3RyICs9IFwiICBcIjtcbiAgfVxuICBzdHIgKz0gU3RyaW5nKHRoaXMpICsgXCJcXHJcXG5cIjtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgc3RyICs9IHRoaXMuY2hpbGRyZW5baV0ucmVwcihsZXZlbCArIDEpO1xuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIGlmKHBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHBhdGggPSAnJztcbiAgICBwb3MgPSAwO1xuICAgIHRoaXMuaXNSb290ID0gdHJ1ZTtcbiAgfVxuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsICcnLCBwYXRoKTtcbiAgdC5jaGlsZHJlbiA9IHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gIHJldHVybiB0O1xufTtcblxuTm9kZS5wcm90b3R5cGUuY2Vycm9yID0gZnVuY3Rpb24obXNnKSB7XG4gIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcih0aGlzLnRvU3RyaW5nKCkgKyBcIjogXCIgKyBtc2cpO1xufTtcblxuTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gW107XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50cmVlQ2hpbGRyZW4gPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBbXSwgaSwgcCwgaiwgY2hpbGRyZW4gPSBudWxsLCBjaGlsZCA9IG51bGw7XG4gIGogPSBwb3M7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHAgPSBwYXRoO1xuICAgIGNoaWxkID0gdGhpcy5jaGlsZHJlbltpXTtcbiAgICBpZihjaGlsZC5oYXNPd25Qcm9wZXJ0eSgnbm9kZU5hbWUnKSkge1xuICAgICAgcCArPSAnLicgKyBqO1xuICAgICAgaisrO1xuICAgICAgY2hpbGRyZW4gPSBjaGlsZC50cmVlKGNvbnRleHQsIHAsIDApO1xuICAgICAgdC5wdXNoKGNoaWxkcmVuKTtcbiAgICB9IGVsc2UgaWYgKCFjaGlsZC5yZW5kZXJFeGxjdWRlZCkge1xuICAgICAgY2hpbGRyZW4gPSBjaGlsZC50cmVlKGNvbnRleHQsIHAsIGopO1xuICAgICAgaWYoY2hpbGRyZW4pIHtcbiAgICAgICAgdCA9IHQuY29uY2F0KGNoaWxkcmVuKTtcbiAgICAgICAgaiArPSBjaGlsZHJlbi5sZW5ndGg7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0O1xufTtcblxuTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbihjaGlsZCkge1xuICB0aGlzLmNoaWxkcmVuLnB1c2goY2hpbGQpO1xufTtcblxuTm9kZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZSArIFwiKFwiK3RoaXMuY29udGVudC5yZXBsYWNlKFwiXFxuXCIsIFwiXCIpK1wiKSBhdCBsaW5lIFwiICsgdGhpcy5saW5lO1xufTtcblxuZnVuY3Rpb24gQ29tbWVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHBhcmVudC5jaGlsZHJlbi5wdXNoKHRoaXMpO1xuICB0aGlzLnJlbmRlckV4bGN1ZGVkID0gdHJ1ZTtcbn1cbnV0aWwuaW5oZXJpdHMoQ29tbWVudE5vZGUsIE5vZGUpO1xuXG5mdW5jdGlvbiBIdG1sTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IHRoaXMuY29udGVudC5zcGxpdChcIiBcIilbMF07XG4gIHRoaXMuYXR0cnMgPSBwYXJzZUF0dHJpYnV0ZXModGhpcy5jb250ZW50LnN1YnN0cih0aGlzLm5vZGVOYW1lLmxlbmd0aCksIHRoaXMpO1xuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEh0bWxOb2RlLCBOb2RlKTtcblxuSHRtbE5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCB0aGlzLmRvbU5vZGUoY29udGV4dCwgcGF0aCksIHBhdGgpO1xuICB0LmF0dHJzID0gdGhpcy5yZW5kZXJBdHRyaWJ1dGVzKGNvbnRleHQsIHBhdGgpO1xuICB0LmNoaWxkcmVuID0gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5mdW5jdGlvbiBiaW5kaW5nTmFtZShub2RlKSB7XG4gIGlmKG5vZGUgaW5zdGFuY2VvZiBleHByZXNzaW9uLk5hbWUpIHtcbiAgICByZXR1cm4gbm9kZS5uYW1lO1xuICB9XG4gIGlmKG5vZGUgaW5zdGFuY2VvZiBTdHJpbmdOb2RlICYmIG5vZGUuY29tcGlsZWRFeHByZXNzaW9uLmxlbmd0aCA9PSAxICYmXG4gICAgICBub2RlLmNvbXBpbGVkRXhwcmVzc2lvblswXSBpbnN0YW5jZW9mIGV4cHJlc3Npb24uTmFtZSkge1xuICAgIHJldHVybiBub2RlLmNvbXBpbGVkRXhwcmVzc2lvblswXS5uYW1lO1xuICB9XG59XG5cbkh0bWxOb2RlLnByb3RvdHlwZS5yZW5kZXJBdHRyaWJ1dGVzID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICB2YXIgcl9hdHRycyA9IHt9LCBrZXksIGF0dHIsIG5hbWU7XG4gIGZvcihrZXkgaW4gdGhpcy5hdHRycykge1xuICAgIGF0dHIgPSB0aGlzLmF0dHJzW2tleV07XG4gICAgLy8gdG9kbywgZmluZCBhIGJldHRlciB3YXkgdG8gZGlzY3JpbWluYXRlIGV2ZW50c1xuICAgIGlmKGtleS5pbmRleE9mKFwibGstXCIpID09PSAwKSB7XG4gICAgICAvLyBhZGQgdGhlIHBhdGggdG8gdGhlIHJlbmRlciBub2RlIHRvIGFueSBsay10aGluZyBub2RlXG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgICAgaWYoa2V5ID09PSAnbGstYmluZCcpIHtcbiAgICAgICAgcl9hdHRyc1trZXldID0gYXR0ci5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJfYXR0cnNba2V5XSA9IFwidHJ1ZVwiO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmKGF0dHIuZXZhbHVhdGUpIHtcbiAgICAgIHZhciB2ID0gYXR0ci5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICAgIGlmKHYgPT09IGZhbHNlKSB7XG4gICAgICAgIC8vIG5vdGhpbmdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJfYXR0cnNba2V5XSA9IHY7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJfYXR0cnNba2V5XSA9IGF0dHI7XG4gICAgfVxuICB9XG4gIGlmKFwiaW5wdXQsc2VsZWN0LHRleHRhcmVhXCIuaW5kZXhPZih0aGlzLm5vZGVOYW1lKSAhPSAtMSAmJiB0aGlzLmF0dHJzLmhhc093blByb3BlcnR5KCd2YWx1ZScpKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnMudmFsdWU7XG4gICAgbmFtZSA9IGJpbmRpbmdOYW1lKGF0dHIpO1xuICAgIGlmKG5hbWUgJiYgdGhpcy5hdHRyc1snbGstYmluZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJfYXR0cnNbJ2xrLWJpbmQnXSA9IG5hbWU7XG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgIH1cbiAgfVxuICBpZih0aGlzLm5vZGVOYW1lID09IFwidGV4dGFyZWFcIiAmJiB0aGlzLmNoaWxkcmVuLmxlbmd0aCA9PSAxKSB7XG4gICAgbmFtZSA9IGJpbmRpbmdOYW1lKHRoaXMuY2hpbGRyZW5bMF0uZXhwcmVzc2lvbik7XG4gICAgaWYobmFtZSAmJiB0aGlzLmF0dHJzWydsay1iaW5kJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcl9hdHRyc1snbGstYmluZCddID0gbmFtZTtcbiAgICAgIHJfYXR0cnNbJ2xrLXBhdGgnXSA9IHBhdGg7XG4gICAgICAvLyBhcyBzb29uIGFzIHRoZSB1c2VyIGhhcyBhbHRlcmVkIHRoZSB2YWx1ZSBvZiB0aGUgdGV4dGFyZWEgb3Igc2NyaXB0IGhhcyBhbHRlcmVkXG4gICAgICAvLyB0aGUgdmFsdWUgcHJvcGVydHkgb2YgdGhlIHRleHRhcmVhLCB0aGUgdGV4dCBub2RlIGlzIG91dCBvZiB0aGUgcGljdHVyZSBhbmQgaXMgbm9cbiAgICAgIC8vIGxvbmdlciBib3VuZCB0byB0aGUgdGV4dGFyZWEncyB2YWx1ZSBpbiBhbnkgd2F5LlxuICAgICAgcl9hdHRycy52YWx1ZSA9IHRoaXMuY2hpbGRyZW5bMF0uZXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJfYXR0cnM7XG59O1xuXG5IdG1sTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRoaXMubm9kZU5hbWUpLCBrZXksIGF0dHJzPXRoaXMucmVuZGVyQXR0cmlidXRlcyhjb250ZXh0LCBwYXRoKTtcbiAgZm9yKGtleSBpbiBhdHRycykge1xuICAgIG5vZGUuc2V0QXR0cmlidXRlKGtleSwgYXR0cnNba2V5XSk7XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59O1xuXG5mdW5jdGlvbiBGb3JOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgLy8gc3ludGF4OiBmb3Iga2V5LCB2YWx1ZSBpbiBsaXN0XG4gIC8vICAgICAgICAgZm9yIHZhbHVlIGluIGxpc3RcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB2YXIgdmFyMSwgdmFyMiwgc291cmNlTmFtZTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cig0KSk7XG4gIHZhcjEgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgaWYoIXZhcjEpIHtcbiAgICB0aGlzLmNlcnJvcihcImZpcnN0IHZhcmlhYmxlIG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHZhcjFbMF0ubGVuZ3RoKSk7XG4gIGlmKGNvbnRlbnRbMF0gPT0gJywnKSB7XG4gICAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cigxKSk7XG4gICAgdmFyMiA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICAgIGlmKCF2YXIyKSB7XG4gICAgICB0aGlzLmNlcnJvcihcInNlY29uZCB2YXJpYWJsZSBhZnRlciBjb21tYSBpcyBtaXNzaW5nXCIpO1xuICAgIH1cbiAgICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHZhcjJbMF0ubGVuZ3RoKSk7XG4gIH1cbiAgaWYoIWNvbnRlbnQubWF0Y2goL15pbi8pKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJpbiBrZXl3b3JkIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cigyKSk7XG4gIHNvdXJjZU5hbWUgPSBjb250ZW50Lm1hdGNoKGV4cHJlc3Npb24uTmFtZS5yZWcpO1xuICBpZighc291cmNlTmFtZSkge1xuICAgIHRoaXMuY2Vycm9yKFwiaXRlcmFibGUgbmFtZSBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIHRoaXMuc291cmNlTmFtZSA9IHNvdXJjZU5hbWVbMF07XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoc291cmNlTmFtZVswXS5sZW5ndGgpKTtcbiAgaWYoY29udGVudCAhPT0gXCJcIikge1xuICAgIHRoaXMuY2Vycm9yKFwibGVmdCBvdmVyIHVucGFyc2FibGUgY29udGVudDogXCIgKyBjb250ZW50KTtcbiAgfVxuXG4gIGlmKHZhcjEgJiYgdmFyMikge1xuICAgIHRoaXMuaW5kZXhOYW1lID0gdmFyMTtcbiAgICB0aGlzLmFsaWFzID0gdmFyMlswXTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmFsaWFzID0gdmFyMVswXTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEZvck5vZGUsIE5vZGUpO1xuXG5Gb3JOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gW10sIGtleTtcbiAgdmFyIGQgPSBjb250ZXh0LmdldCh0aGlzLnNvdXJjZU5hbWUpO1xuICBmb3Ioa2V5IGluIGQpIHtcbiAgICB2YXIgbmV3X2RhdGEgPSB7fTtcbiAgICAvLyBhZGQgdGhlIGtleSB0byBhY2Nlc3MgdGhlIGNvbnRleHQncyBkYXRhXG4gICAgaWYodGhpcy5pbmRleE5hbWUpIHtcbiAgICAgIG5ld19kYXRhW3RoaXMuaW5kZXhOYW1lXSA9IGtleTtcbiAgICB9XG4gICAgdmFyIG5ld19jb250ZXh0ID0gbmV3IENvbnRleHQobmV3X2RhdGEsIGNvbnRleHQpO1xuICAgIC8vIGtlZXAgdHJhY2sgb2Ygd2hlcmUgdGhlIGRhdGEgaXMgY29taW5nIGZyb21cbiAgICBuZXdfY29udGV4dC5hZGRBbGlhcyh0aGlzLnNvdXJjZU5hbWUgKyAnLicgKyBrZXksIHRoaXMuYWxpYXMpO1xuICAgIHQgPSB0LmNvbmNhdCh0aGlzLnRyZWVDaGlsZHJlbihuZXdfY29udGV4dCwgcGF0aCwgdC5sZW5ndGggKyBwb3MpKTtcbiAgfVxuICByZXR1cm4gdDtcbn07XG5cbmZ1bmN0aW9uIElmTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5idWlsZChjb250ZW50LnJlcGxhY2UoL15pZi9nLCBcIlwiKSk7XG4gIHBhcmVudC5jaGlsZHJlbi5wdXNoKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhJZk5vZGUsIE5vZGUpO1xuXG5JZk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgaWYoIXRoaXMuZXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KSkge1xuICAgIGlmKHRoaXMuZWxzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZWxzZS50cmVlKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICByZXR1cm4gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIEVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5zZWFyY2hJZihjdXJyZW50Tm9kZSk7XG59XG51dGlsLmluaGVyaXRzKEVsc2VOb2RlLCBOb2RlKTtcblxuRWxzZU5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgcmV0dXJuIHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5mdW5jdGlvbiBJZkVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5idWlsZChjb250ZW50LnJlcGxhY2UoL15lbHNlaWYvZywgXCJcIikpO1xuICB0aGlzLnNlYXJjaElmKGN1cnJlbnROb2RlKTtcbn1cbi8vIGltcG9ydGFudCB0byBiZSBhbiBJZk5vZGVcbnV0aWwuaW5oZXJpdHMoSWZFbHNlTm9kZSwgSWZOb2RlKTtcblxuSWZFbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWYgPSBmdW5jdGlvbiBzZWFyY2hJZihjdXJyZW50Tm9kZSkge1xuICAvLyBmaXJzdCBub2RlIG9uIHRoZSBzYW1lIGxldmVsIGhhcyB0byBiZSB0aGUgaWYvZWxzZWlmIG5vZGVcbiAgd2hpbGUoY3VycmVudE5vZGUpIHtcbiAgICBpZihjdXJyZW50Tm9kZS5sZXZlbCA8IHRoaXMubGV2ZWwpIHtcbiAgICAgIHRoaXMuY2Vycm9yKFwiY2Fubm90IGZpbmQgYSBjb3JyZXNwb25kaW5nIGlmLWxpa2Ugc3RhdGVtZW50IGF0IHRoZSBzYW1lIGxldmVsLlwiKTtcbiAgICB9XG4gICAgaWYoY3VycmVudE5vZGUubGV2ZWwgPT0gdGhpcy5sZXZlbCkge1xuICAgICAgaWYoIShjdXJyZW50Tm9kZSBpbnN0YW5jZW9mIElmTm9kZSkpIHtcbiAgICAgICAgdGhpcy5jZXJyb3IoXCJhdCB0aGUgc2FtZSBsZXZlbCBpcyBub3QgYSBpZi1saWtlIHN0YXRlbWVudC5cIik7XG4gICAgICB9XG4gICAgICBjdXJyZW50Tm9kZS5lbHNlID0gdGhpcztcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjdXJyZW50Tm9kZSA9IGN1cnJlbnROb2RlLnBhcmVudDtcbiAgfVxufTtcbkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZiA9IElmRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmO1xuXG5mdW5jdGlvbiBFeHByZXNzaW9uTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IFwiI3RleHRcIjtcbiAgdmFyIG0gPSBjb250ZW50Lm1hdGNoKGV4cHJlc3Npb24uRVhQUkVTU0lPTl9SRUcpO1xuICBpZighbSkge1xuICAgIHRoaXMuY2Vycm9yKFwiZGVjbGFyZWQgaW1wcm9wZXJseVwiKTtcbiAgfVxuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmJ1aWxkKG1bMV0pO1xuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEV4cHJlc3Npb25Ob2RlLCBOb2RlKTtcblxuRXhwcmVzc2lvbk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIC8vIHJlbmRlcmVyXG4gIHZhciByZW5kZXJlciA9IFN0cmluZyh0aGlzLmV4cHJlc3Npb24uZXZhbHVhdGUoY29udGV4dCkpO1xuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5FeHByZXNzaW9uTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRoaXMuZXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KSk7XG59O1xuXG5mdW5jdGlvbiBTdHJpbmdOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gXCIjdGV4dFwiO1xuICB0aGlzLnN0cmluZyA9IHRoaXMuY29udGVudC5yZXBsYWNlKC9eXCJ8XCIkL2csIFwiXCIpLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInLCAnZ20nKTtcbiAgdGhpcy5jb21waWxlZEV4cHJlc3Npb24gPSBleHByZXNzaW9uLmNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnModGhpcy5zdHJpbmcpO1xuICBpZihwYXJlbnQpIHtcbiAgICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG4gIH1cbn1cbnV0aWwuaW5oZXJpdHMoU3RyaW5nTm9kZSwgTm9kZSk7XG5cblN0cmluZ05vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIC8vIHJlbmRlcmVyIHNob3VsZCBiZSBhbGwgYXR0cmlidXRlc1xuICB2YXIgcmVuZGVyZXIgPSBleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpO1xuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5TdHJpbmdOb2RlLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCk7XG59O1xuXG5TdHJpbmdOb2RlLnByb3RvdHlwZS5kb21Ob2RlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KSk7XG59O1xuXG5TdHJpbmdOb2RlLnByb3RvdHlwZS5hZGRDaGlsZCA9IGZ1bmN0aW9uKGNoaWxkKSB7XG4gIHRoaXMuY2Vycm9yKFwiY2Fubm90IGhhdmUgY2hpbGRyZW4gXCIgKyBjaGlsZCk7XG59O1xuXG5mdW5jdGlvbiBJbmNsdWRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5uYW1lID0gdXRpbC50cmltKGNvbnRlbnQuc3BsaXQoXCIgXCIpWzFdKTtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlQ2FjaGVbdGhpcy5uYW1lXTtcbiAgaWYodGhpcy50ZW1wbGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJUZW1wbGF0ZSB3aXRoIG5hbWUgXCIgKyB0aGlzLm5hbWUgKyBcIiBpcyBub3QgcmVnaXN0ZXJlZFwiKTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEluY2x1ZGVOb2RlLCBOb2RlKTtcblxuSW5jbHVkZU5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgcmV0dXJuIHRoaXMudGVtcGxhdGUudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5mdW5jdGlvbiBDb21wb25lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQpLnN1YnN0cigxMCk7XG4gIHZhciBuYW1lID0gY29udGVudC5tYXRjaChWQVJOQU1FX1JFRyk7XG4gIGlmKCFuYW1lKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJDb21wb25lbnQgbmFtZSBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIobmFtZVswXS5sZW5ndGgpKTtcbiAgdGhpcy5uYW1lID0gbmFtZVswXTtcbiAgdGhpcy5hdHRycyA9IHBhcnNlQXR0cmlidXRlcyhjb250ZW50LCB0aGlzKTtcbiAgdGhpcy5jb21wb25lbnQgPSBjb21wb25lbnRDYWNoZVt0aGlzLm5hbWVdO1xuICBpZih0aGlzLmNvbXBvbmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJDb21wb25lbnQgd2l0aCBuYW1lIFwiICsgdGhpcy5uYW1lICsgXCIgaXMgbm90IHJlZ2lzdGVyZWRcIik7XG4gIH1cbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhDb21wb25lbnROb2RlLCBOb2RlKTtcblxuQ29tcG9uZW50Tm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgbmV3X2NvbnRleHQgPSBuZXcgQ29udGV4dCh7fSwgY29udGV4dCk7XG4gIHZhciBrZXksIGF0dHIsIHZhbHVlLCBzb3VyY2U7XG4gIGZvcihrZXkgaW4gdGhpcy5hdHRycykge1xuICAgIGF0dHIgPSB0aGlzLmF0dHJzW2tleV07XG4gICAgaWYoYXR0ci5ldmFsdWF0ZSkge1xuICAgICAgdmFsdWUgPSBhdHRyLmV2YWx1YXRlKGNvbnRleHQpO1xuICAgICAgLy8gdG9kbyA6IGlmIGV4cHJlc3Npb24gYXR0cmlidXRlLCBhZGQgYW4gYWxpYXNcbiAgICAgIGlmKHZhbHVlID09PSBmYWxzZSkge1xuICAgICAgICAvLyBub3RoaW5nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdfY29udGV4dC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgIHNvdXJjZSA9IGJpbmRpbmdOYW1lKGF0dHIpO1xuICAgICAgICBpZihzb3VyY2UgJiYga2V5ICE9IHNvdXJjZSkge1xuICAgICAgICAgIG5ld19jb250ZXh0LmFkZEFsaWFzKHNvdXJjZSwga2V5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvL25ld19jb250ZXh0LnNldChrZXksIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgaWYodGhpcy5jb21wb25lbnQuY29udHJvbGxlcil7XG4gICAgdGhpcy5jb21wb25lbnQuY29udHJvbGxlcihuZXdfY29udGV4dCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuY29tcG9uZW50LnRlbXBsYXRlLnRyZWVDaGlsZHJlbihuZXdfY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbkNvbXBvbmVudE5vZGUucHJvdG90eXBlLnJlcHIgPSBmdW5jdGlvbihsZXZlbCkge1xuICByZXR1cm4gdGhpcy5jb21wb25lbnQudGVtcGxhdGUucmVwcihsZXZlbCArIDEpO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lLCBjdXJyZW50Tm9kZSkge1xuICB2YXIgbm9kZTtcbiAgaWYoY29udGVudC5sZW5ndGggPT09IDApIHtcbiAgICBub2RlID0gbmV3IFN0cmluZ05vZGUocGFyZW50LCBcIlxcblwiLCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignIycpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBDb21tZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdpZiAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgSWZOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2Vsc2VpZiAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgSWZFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEsIGN1cnJlbnROb2RlKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignZWxzZScpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEsIGN1cnJlbnROb2RlKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignZm9yICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBGb3JOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2luY2x1ZGUgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEluY2x1ZGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2NvbXBvbmVudCAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgQ29tcG9uZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdcIicpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBTdHJpbmdOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZigvXlxcdy8uZXhlYyhjb250ZW50KSkge1xuICAgIG5vZGUgPSBuZXcgSHRtbE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZigne3snKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRXhwcmVzc2lvbk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJjcmVhdGVOb2RlOiB1bmtub3cgbm9kZSB0eXBlIFwiICsgY29udGVudCk7XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkVGVtcGxhdGUodHBsLCB0ZW1wbGF0ZU5hbWUpIHtcblxuICBpZih0eXBlb2YgdHBsID09ICdvYmplY3QnKSB7XG4gICAgdHBsID0gdHBsLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgdmFyIHJvb3QgPSBuZXcgTm9kZShudWxsLCBcIlwiLCAwKSwgbGluZXMsIGxpbmUsIGxldmVsLFxuICAgIGNvbnRlbnQsIGksIGN1cnJlbnROb2RlID0gcm9vdCwgcGFyZW50LCBzZWFyY2hOb2RlO1xuXG4gIGxpbmVzID0gdHBsLnNwbGl0KFwiXFxuXCIpO1xuXG4gIGZvcihpPTA7IGk8bGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBsaW5lID0gbGluZXNbaV07XG4gICAgbGV2ZWwgPSBsaW5lLm1hdGNoKC9cXHMqLylbMF0ubGVuZ3RoICsgMTtcbiAgICBjb250ZW50ID0gbGluZS5zbGljZShsZXZlbCAtIDEpO1xuXG4gICAgLy8gbXVsdGlsaW5lIHN1cHBvcnQ6IGVuZHMgd2l0aCBhIFxcXG4gICAgdmFyIGogPSAwO1xuICAgIHdoaWxlKGNvbnRlbnQubWF0Y2goL1xcXFwkLykpIHtcbiAgICAgICAgaisrO1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cXFxcJC8sICcnKSArIGxpbmVzW2kral07XG4gICAgfVxuICAgIGkgPSBpICsgajtcblxuICAgIC8vIG11bHRpbGluZSBzdHJpbmdzXG4gICAgaiA9IDA7XG4gICAgaWYoY29udGVudC5tYXRjaCgvXlwiXCJcIi8pKSB7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL15cIlwiXCIvLCAnXCInKTtcbiAgICAgICAgd2hpbGUoIWNvbnRlbnQubWF0Y2goL1wiXCJcIiQvKSkge1xuICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgaWYoaStqID4gbGluZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIk11bHRpbGluZSBzdHJpbmcgc3RhcnRlZCBidXQgdW5maW5pc2hlZCBhdCBsaW5lIFwiICsgKGkgKyAxKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250ZW50ID0gY29udGVudCArIGxpbmVzW2kral07XG4gICAgICAgIH1cbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXCJcIlwiJC8sICdcIicpO1xuICAgIH1cbiAgICBpID0gaSArIGo7XG5cbiAgICBzZWFyY2hOb2RlID0gY3VycmVudE5vZGU7XG4gICAgcGFyZW50ID0gbnVsbDtcblxuICAgIC8vIHNlYXJjaCBmb3IgdGhlIHBhcmVudCBub2RlXG4gICAgd2hpbGUodHJ1ZSkge1xuXG4gICAgICBpZihsZXZlbCA+IHNlYXJjaE5vZGUubGV2ZWwpIHtcbiAgICAgICAgcGFyZW50ID0gc2VhcmNoTm9kZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmKCFzZWFyY2hOb2RlLnBhcmVudCkge1xuICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJJbmRlbnRhdGlvbiBlcnJvciBhdCBsaW5lIFwiICsgKGkgKyAxKSk7XG4gICAgICB9XG5cbiAgICAgIGlmKGxldmVsID09IHNlYXJjaE5vZGUubGV2ZWwpIHtcbiAgICAgICAgcGFyZW50ID0gc2VhcmNoTm9kZS5wYXJlbnQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBzZWFyY2hOb2RlID0gc2VhcmNoTm9kZS5wYXJlbnQ7XG4gICAgfVxuXG4gICAgaWYocGFyZW50LmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgaWYocGFyZW50LmNoaWxkcmVuWzBdLmxldmVsICE9IGxldmVsKSB7XG4gICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkluZGVudGF0aW9uIGVycm9yIGF0IGxpbmUgXCIgKyAoaSArIDEpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9IGNyZWF0ZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgaSwgY3VycmVudE5vZGUpO1xuICAgIGN1cnJlbnROb2RlID0gbm9kZTtcblxuICB9XG4gIGlmKHRlbXBsYXRlTmFtZSkge1xuICAgIHRlbXBsYXRlQ2FjaGVbdGVtcGxhdGVOYW1lXSA9IHJvb3Q7XG4gIH1cblxuICByZXR1cm4gcm9vdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGJ1aWxkVGVtcGxhdGU6IGJ1aWxkVGVtcGxhdGUsXG4gIHBhcnNlQXR0cmlidXRlczogcGFyc2VBdHRyaWJ1dGVzLFxuICBDb250ZXh0OiBDb250ZXh0LFxuICB0ZW1wbGF0ZUNhY2hlOiB0ZW1wbGF0ZUNhY2hlLFxuICBjb21wb25lbnRDYWNoZTogY29tcG9uZW50Q2FjaGUsXG4gIENvbnRleHROYW1lOiBDb250ZXh0TmFtZVxufTsiLCJcblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBpbmhlcml0cyhjaGlsZCwgcGFyZW50KSB7XG4gIGNoaWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUocGFyZW50LnByb3RvdHlwZSk7XG4gIGNoaWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGNoaWxkO1xufVxuXG5mdW5jdGlvbiBDb21waWxlRXJyb3IobXNnKSB7XG4gIHRoaXMubmFtZSA9IFwiQ29tcGlsZUVycm9yXCI7XG4gIHRoaXMubWVzc2FnZSA9IChtc2cgfHwgXCJcIik7XG59XG5Db21waWxlRXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBSdW50aW1lRXJyb3IobXNnKSB7XG4gIHRoaXMubmFtZSA9IFwiUnVudGltZUVycm9yXCI7XG4gIHRoaXMubWVzc2FnZSA9IChtc2cgfHwgXCJcIik7XG59XG5SdW50aW1lRXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBlc2NhcGUodW5zYWZlKSB7XG4gIHJldHVybiB1bnNhZmVcbiAgICAucmVwbGFjZSgvJi9nLCBcIiZhbXA7XCIpXG4gICAgLnJlcGxhY2UoLzwvZywgXCImbHQ7XCIpXG4gICAgLnJlcGxhY2UoLz4vZywgXCImZ3Q7XCIpXG4gICAgLnJlcGxhY2UoL1wiL2csIFwiJnF1b3Q7XCIpXG4gICAgLnJlcGxhY2UoLycvZywgXCImIzAzOTtcIik7XG59XG5cbmZ1bmN0aW9uIHRyaW0odHh0KSB7XG4gIHJldHVybiB0eHQucmVwbGFjZSgvXlxccyt8XFxzKyQvZyAsXCJcIik7XG59XG5cbmZ1bmN0aW9uIGV2ZW50KG5hbWUsIGRhdGEpIHtcbiAgdmFyIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiQ3VzdG9tRXZlbnRcIik7XG4gIGV2dC5pbml0Q3VzdG9tRXZlbnQobmFtZSwgZmFsc2UsIGZhbHNlLCBkYXRhKTtcbiAgcmV0dXJuIGV2dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaGVyaXRzOmluaGVyaXRzLFxuICBDb21waWxlRXJyb3I6Q29tcGlsZUVycm9yLFxuICBSdW50aW1lRXJyb3I6UnVudGltZUVycm9yLFxuICBlc2NhcGU6ZXNjYXBlLFxuICB0cmltOnRyaW0sXG4gIGV2ZW50OmV2ZW50XG59OyJdfQ==
(2)
});
