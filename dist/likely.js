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
  var m = txt.match(/^([a-zA-Z][a-zA-Z0-9\.]*)\(([^\)]*)\)/), i;
  this.funcName = m[1];
  // TODO: this a weak way to parse things
  this.params = [];
  var params = m[2].split(',');
  for(i=0; i<params.length; i++) {
    if(params[i]) {
      this.params.push(build(params[i]));
    }
  }
}
FunctionCall.prototype.evaluate = function(context) {
  var func = context.get(this.funcName), i, params=[];
  for(i=0; i<this.params.length; i++) {
    params.push(this.params[i].evaluate(context));
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
    this.trigger('dataViewChanged', {"name": name});
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

Binding.prototype.trigger = function(name, obj) {
  this.dom.dispatchEvent(
    util.event(name),
    obj
  );
};

Binding.prototype.anyEvent = function(e) {
  var dom = e.target;
  var lkEvent = dom.getAttribute('lk-' + e.type);
  if(!lkEvent) {
    return;
  }
  var renderNode = this.getRenderNodeFromPath(dom);
  var ctx = template.Context({event: e}, renderNode.context);
  renderNode.node.attrs['lk-'+e.type].evaluate(ctx);
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
  // avoid 2 diffs at the same time
  // TODO: message or diff queue.
  if(!this.lock) {
    this.lock = true;
    this.diff();
    this.trigger('update');
  }
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
      type: 'diffent_nodeName',
      action: 'remove',
      node: this,
      path: path
    });
    accu.push({
      type: 'diffent_nodeName',
      action: 'add',
      node: rendered_node,
      // when a node is added, we point to the next node as insertBefore is used
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
      type: 'new_node',
      action: 'add',
      node: rendered_node.children[j+i],
      // when a node is added, we point to the next node as insertBefore is used
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcblwidXNlIHN0cmljdFwiO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIEVYUFJFU1NJT05fUkVHID0gL157eyguKz8pfX0vO1xuXG4vLyBFeHByZXNzaW9uIGV2YWx1YXRpb24gZW5naW5lXG5mdW5jdGlvbiBTdHJpbmdWYWx1ZSh0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJ2YWx1ZVwiO1xuICBpZih0eHRbMF0gPT0gJ1wiJykge1xuICAgIHRoaXMudmFsdWUgPSB0eHQucmVwbGFjZSgvXlwifFwiJC9nLCBcIlwiKTtcbiAgfSBlbHNlIGlmKHR4dFswXSA9PSBcIidcIikge1xuICAgIHRoaXMudmFsdWUgPSB0eHQucmVwbGFjZSgvXid8JyQvZywgXCJcIik7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW52YWxpZCBzdHJpbmcgdmFsdWUgXCIgKyB0eHQpO1xuICB9XG59XG5TdHJpbmdWYWx1ZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLnZhbHVlO1xufTtcblN0cmluZ1ZhbHVlLnJlZyA9IC9eXCIoPzpcXFxcXCJ8W15cIl0pKlwifF4nKD86XFxcXCd8W14nXSkqJy87XG5cbmZ1bmN0aW9uIEVxdWFsT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5FcXVhbE9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSA9PSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbkVxdWFsT3BlcmF0b3IucmVnID0gL149PS87XG5cbmZ1bmN0aW9uIE5vdEVxdWFsT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5Ob3RFcXVhbE9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSAhPSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbk5vdEVxdWFsT3BlcmF0b3IucmVnID0gL14hPS87XG5cbmZ1bmN0aW9uIEJpZ2dlck9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuQmlnZ2VyT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpID4gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5CaWdnZXJPcGVyYXRvci5yZWcgPSAvXj4vO1xuXG5mdW5jdGlvbiBTbWFsbGVyT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5TbWFsbGVyT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpIDwgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5TbWFsbGVyT3BlcmF0b3IucmVnID0gL148LztcblxuZnVuY3Rpb24gT3JPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbk9yT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpIHx8IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuT3JPcGVyYXRvci5yZWcgPSAvXm9yLztcblxuZnVuY3Rpb24gQW5kT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5BbmRPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgJiYgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5BbmRPcGVyYXRvci5yZWcgPSAvXmFuZC87XG5cbmZ1bmN0aW9uIE5hbWUodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwidmFsdWVcIjtcbiAgdGhpcy5uYW1lID0gdHh0O1xufVxuTmFtZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHZhciB2YWx1ZSA9IGNvbnRleHQuZ2V0KHRoaXMubmFtZSk7XG4gIHJldHVybiB2YWx1ZTtcbn07XG5OYW1lLnJlZyA9IC9eW0EtWmEtel1bXFx3XFwuXXswLH0vO1xuXG5mdW5jdGlvbiBGaWx0ZXIodHh0KSB7XG4gIHRoaXMudHlwZSA9ICdvcGVyYXRvcic7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuRmlsdGVyLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIGZjdCA9IGNvbnRleHQuZ2V0KHRoaXMucmlnaHQubmFtZSk7XG4gIHJldHVybiBmY3QuYXBwbHkodGhpcywgW3RoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSwgY29udGV4dF0pO1xufTtcbkZpbHRlci5yZWcgPSAvXlxcfC87XG5cbi8vIG1hdGhcblxuZnVuY3Rpb24gTXVsdGlwbHlPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5NdWx0aXBseU9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSAqIHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuTXVsdGlwbHlPcGVyYXRvci5yZWcgPSAvXlxcKi87XG5cbmZ1bmN0aW9uIFBsdXNPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5QbHVzT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpICsgdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5QbHVzT3BlcmF0b3IucmVnID0gL15cXCsvO1xuXG5mdW5jdGlvbiBNaW51c09wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbk1pbnVzT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpIC0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5NaW51c09wZXJhdG9yLnJlZyA9IC9eXFwtLztcblxuZnVuY3Rpb24gRnVuY3Rpb25DYWxsKHR4dCkge1xuICB0aGlzLnR5cGUgPSAndmFsdWUnO1xuICB2YXIgbSA9IHR4dC5tYXRjaCgvXihbYS16QS1aXVthLXpBLVowLTlcXC5dKilcXCgoW15cXCldKilcXCkvKSwgaTtcbiAgdGhpcy5mdW5jTmFtZSA9IG1bMV07XG4gIC8vIFRPRE86IHRoaXMgYSB3ZWFrIHdheSB0byBwYXJzZSB0aGluZ3NcbiAgdGhpcy5wYXJhbXMgPSBbXTtcbiAgdmFyIHBhcmFtcyA9IG1bMl0uc3BsaXQoJywnKTtcbiAgZm9yKGk9MDsgaTxwYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZihwYXJhbXNbaV0pIHtcbiAgICAgIHRoaXMucGFyYW1zLnB1c2goYnVpbGQocGFyYW1zW2ldKSk7XG4gICAgfVxuICB9XG59XG5GdW5jdGlvbkNhbGwucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgZnVuYyA9IGNvbnRleHQuZ2V0KHRoaXMuZnVuY05hbWUpLCBpLCBwYXJhbXM9W107XG4gIGZvcihpPTA7IGk8dGhpcy5wYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICBwYXJhbXMucHVzaCh0aGlzLnBhcmFtc1tpXS5ldmFsdWF0ZShjb250ZXh0KSk7XG4gIH1cbiAgcmV0dXJuIGZ1bmMuYXBwbHkoY29udGV4dCwgcGFyYW1zKTtcbn07XG5GdW5jdGlvbkNhbGwucmVnID0gL15bYS16QS1aXVthLXpBLVowLTlcXC5dKlxcKFteXFwpXSpcXCkvO1xuXG5mdW5jdGlvbiBOdW1iZXJWYWx1ZSh0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJ2YWx1ZVwiO1xuICB0aGlzLm51bWJlciA9IHBhcnNlRmxvYXQodHh0LCAxMCk7XG4gIHRoaXMuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMubnVtYmVyO1xuICB9O1xufVxuTnVtYmVyVmFsdWUucmVnID0gL15bMC05XSsvO1xuXG5mdW5jdGlvbiBJZk9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbklmT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgcnYgPSB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xuICBpZihydikge1xuICAgIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCk7XG4gIH1cbiAgcmV0dXJuIHJ2O1xufTtcbklmT3BlcmF0b3IucmVnID0gL15pZiAvO1xuXG5mdW5jdGlvbiBJbk9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbkluT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgbGVmdCA9IHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KTtcbiAgdmFyIHJpZ2h0ID0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbiAgaWYocmlnaHQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyB1dGlsLlJ1bnRpbWVFcnJvcigncmlnaHQgc2lkZSBvZiBpbiBvcGVyYXRvciBjYW5ub3QgYmUgdW5kZWZpbmVkJyk7XG4gIH1cbiAgaWYocmlnaHQuaW5kZXhPZikge1xuICAgIHJldHVybiByaWdodC5pbmRleE9mKGxlZnQpICE9IC0xO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByaWdodC5oYXNPd25Qcm9wZXJ0eShsZWZ0KTtcbiAgfVxufTtcbkluT3BlcmF0b3IucmVnID0gL15pbiAvO1xuXG5mdW5jdGlvbiBOb3RPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ3VuYXJ5JztcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5Ob3RPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiAhdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5Ob3RPcGVyYXRvci5yZWcgPSAvXm5vdCAvO1xuXG5mdW5jdGlvbiBjb21waWxlVGV4dEFuZEV4cHJlc3Npb25zKHR4dCkge1xuICAvLyBjb21waWxlIHRoZSBleHByZXNzaW9ucyBmb3VuZCBpbiB0aGUgdGV4dFxuICAvLyBhbmQgcmV0dXJuIGEgbGlzdCBvZiB0ZXh0K2V4cHJlc3Npb25cbiAgdmFyIGV4cHIsIGFyb3VuZDtcbiAgdmFyIGxpc3QgPSBbXTtcbiAgd2hpbGUodHJ1ZSkge1xuICAgIHZhciBtYXRjaCA9IC97eyguKz8pfX0vLmV4ZWModHh0KTtcbiAgICBpZighbWF0Y2gpIHtcbiAgICAgIGlmKHR4dCkge1xuICAgICAgICBsaXN0LnB1c2godHh0KTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBleHByID0gYnVpbGQobWF0Y2hbMV0pO1xuICAgIGFyb3VuZCA9IHR4dC5zcGxpdChtYXRjaFswXSwgMik7XG4gICAgaWYoYXJvdW5kWzBdLmxlbmd0aCkge1xuICAgICAgbGlzdC5wdXNoKGFyb3VuZFswXSk7XG4gICAgfVxuICAgIGxpc3QucHVzaChleHByKTtcbiAgICB0eHQgPSBhcm91bmRbMV07XG4gIH1cbiAgcmV0dXJuIGxpc3Q7XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlRXhwcmVzc2lvbkxpc3QoZXhwcmVzc2lvbnMsIGNvbnRleHQpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGZvcihpPTA7IGk8ZXhwcmVzc2lvbnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyYW0gPSBleHByZXNzaW9uc1tpXTtcbiAgICBpZihwYXJhbS5ldmFsdWF0ZSkge1xuICAgICAgc3RyICs9IHBhcmFtLmV2YWx1YXRlKGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gcGFyYW07XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59XG5cbi8vIGxpc3Qgb3JkZXIgZGVmaW5lIG9wZXJhdG9yIHByZWNlZGVuY2VcbnZhciBleHByZXNzaW9uX2xpc3QgPSBbXG4gIE11bHRpcGx5T3BlcmF0b3IsXG4gIFBsdXNPcGVyYXRvcixcbiAgTWludXNPcGVyYXRvcixcbiAgQmlnZ2VyT3BlcmF0b3IsXG4gIFNtYWxsZXJPcGVyYXRvcixcbiAgRXF1YWxPcGVyYXRvcixcbiAgTm90RXF1YWxPcGVyYXRvcixcbiAgRmlsdGVyLFxuICBJbk9wZXJhdG9yLFxuICBOb3RPcGVyYXRvcixcbiAgSWZPcGVyYXRvcixcbiAgT3JPcGVyYXRvcixcbiAgQW5kT3BlcmF0b3IsXG4gIFN0cmluZ1ZhbHVlLFxuICBOdW1iZXJWYWx1ZSxcbiAgRnVuY3Rpb25DYWxsLFxuICBOYW1lLFxuXTtcblxuZnVuY3Rpb24gYnVpbGQoaW5wdXQpIHtcbiAgcmV0dXJuIGJ1aWxkRXhwcmVzc2lvbnMocGFyc2VFeHByZXNzaW9ucyhpbnB1dCkpO1xufVxuXG5mdW5jdGlvbiBwYXJzZUV4cHJlc3Npb25zKGlucHV0KSB7XG4gIC8vIFJldHVybiBhIGxpc3Qgb2YgZXhwcmVzc2lvbnNcbiAgdmFyIGN1cnJlbnRFeHByID0gbnVsbCwgaSwgZXhwciwgbWF0Y2gsIGZvdW5kLCBwYXJzZWQgPSBbXTtcbiAgd2hpbGUoaW5wdXQpIHtcbiAgICBpbnB1dCA9IHV0aWwudHJpbShpbnB1dCk7XG4gICAgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IoaT0wOyBpPGV4cHJlc3Npb25fbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBleHByID0gZXhwcmVzc2lvbl9saXN0W2ldO1xuICAgICAgICBtYXRjaCA9IGV4cHIucmVnLmV4ZWMoaW5wdXQpO1xuICAgICAgICBpZihtYXRjaCkge1xuICAgICAgICAgIGlucHV0ID0gaW5wdXQuc2xpY2UobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgICBwYXJzZWQucHVzaChuZXcgZXhwcihtYXRjaFswXSwgY3VycmVudEV4cHIpKTtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgLy8gc3RhcnRpbmcgYWdhaW4gdG8gcmVzcGVjdCBwcmVjZWRlbmNlXG4gICAgICAgICAgaSA9IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYoZm91bmQgPT09IGZhbHNlKSB7XG4gICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJFeHByZXNzaW9uIHBhcnNlcjogSW1wb3NzaWJsZSB0byBwYXJzZSBmdXJ0aGVyIDogXCIgKyBpbnB1dCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwYXJzZWQ7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkRXhwcmVzc2lvbnMobGlzdCkge1xuICAvLyBidWlsZCBhIHRyZWUgb2YgZXhwcmVzc2lvbiByZXNwZWN0aW5nIHByZWNlZGVuY2VcbiAgdmFyIGksIGosIGV4cHI7XG4gIC8vIGEgZHVtYiBhbGdvIHRoYXQgd29ya3NcbiAgZm9yKGk9MDsgaTxleHByZXNzaW9uX2xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBmb3Ioaj0wOyBqPGxpc3QubGVuZ3RoOyBqKyspIHtcbiAgICAgIGlmKGxpc3QubGVuZ3RoID09IDEpIHtcbiAgICAgICAgcmV0dXJuIGxpc3RbMF07XG4gICAgICB9XG4gICAgICBleHByID0gbGlzdFtqXTtcbiAgICAgIGlmKGV4cHIgaW5zdGFuY2VvZiBleHByZXNzaW9uX2xpc3RbaV0pIHtcbiAgICAgICAgaWYoZXhwci50eXBlID09ICdvcGVyYXRvcicpIHtcbiAgICAgICAgICBleHByLmxlZnQgPSBsaXN0W2otMV07XG4gICAgICAgICAgZXhwci5yaWdodCA9IGxpc3RbaisxXTtcbiAgICAgICAgICBsaXN0LnNwbGljZShqLTEsIDIpO1xuICAgICAgICAgIGxpc3Rbai0xXSA9IGV4cHI7XG4gICAgICAgICAgaiA9IGogLSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmKGV4cHIudHlwZSA9PSAndW5hcnknKSB7XG4gICAgICAgICAgZXhwci5yaWdodCA9IGxpc3RbaisxXTtcbiAgICAgICAgICBsaXN0LnNwbGljZShqKzEsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGV4cHIudHlwZSA9PSAndmFsdWUnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiRXhwcmVzc2lvbiBidWlsZGVyOiBleHBlY3RlZCBhbiBvcGVyYXRvciBidXQgZ290IFwiICsgZXhwci5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGQ6YnVpbGQsXG4gIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnM6Y29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyxcbiAgYnVpbGRFeHByZXNzaW9uczpidWlsZEV4cHJlc3Npb25zLFxuICBwYXJzZUV4cHJlc3Npb25zOnBhcnNlRXhwcmVzc2lvbnMsXG4gIGV2YWx1YXRlRXhwcmVzc2lvbkxpc3Q6ZXZhbHVhdGVFeHByZXNzaW9uTGlzdCxcbiAgU3RyaW5nVmFsdWU6U3RyaW5nVmFsdWUsXG4gIE5hbWU6TmFtZSxcbiAgRVhQUkVTU0lPTl9SRUc6RVhQUkVTU0lPTl9SRUdcbn07IiwiLyogTGlrZWx5LmpzLFxuICAgUHl0aG9uIHN0eWxlIEhUTUwgdGVtcGxhdGUgbGFuZ3VhZ2Ugd2l0aCBiaS1kaXJlY3Rpb25uYWwgZGF0YSBiaW5kaW5nXG4gICBiYXRpc3RlIGJpZWxlciAyMDE0ICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpO1xudmFyIGV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKTtcblxuZnVuY3Rpb24gdXBkYXRlRGF0YShjb250ZXh0LCBkb20pIHtcbiAgdmFyIG5hbWUgPSBkb20uZ2V0QXR0cmlidXRlKFwibGstYmluZFwiKSwgdmFsdWU7XG4gIGlmKCFuYW1lKSB7XG4gICAgdGhyb3cgXCJObyBsay1iaW5kIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudFwiO1xuICB9XG4gIGlmKGRvbS50eXBlID09ICdjaGVja2JveCcgJiYgIWRvbS5jaGVja2VkKSB7XG4gICAgdmFsdWUgPSBcIlwiO1xuICB9IGVsc2Uge1xuICAgIHZhbHVlID0gZG9tLnZhbHVlOy8vIHx8IGRvbS5nZXRBdHRyaWJ1dGUoXCJ2YWx1ZVwiKTtcbiAgfVxuICAvLyB1cGRhdGUgdGhlIGNvbnRleHRcbiAgY29udGV4dC5tb2RpZnkobmFtZSwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBCaW5kaW5nKGRvbSwgdHBsLCBkYXRhKSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBCaW5kaW5nKSB7XG4gICAgcmV0dXJuIG5ldyBCaW5kaW5nKGRvbSwgdHBsLCBkYXRhKTtcbiAgfVxuICAvLyBkb3VibGUgZGF0YSBiaW5kaW5nIGJldHdlZW4gc29tZSBkYXRhIGFuZCBzb21lIGRvbVxuICB0aGlzLmRvbSA9IGRvbTtcbiAgdGhpcy5kYXRhID0gZGF0YTtcbiAgdGhpcy5jb250ZXh0ID0gbmV3IHRlbXBsYXRlLkNvbnRleHQodGhpcy5kYXRhKTtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRwbDtcbn1cblxuQmluZGluZy5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZS50cmVlKG5ldyB0ZW1wbGF0ZS5Db250ZXh0KHRoaXMuZGF0YSkpO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmRvbS5pbm5lckhUTUwgPSBcIlwiO1xuICB0aGlzLmN1cnJlbnRUcmVlID0gdGhpcy50cmVlKCk7XG4gIHRoaXMuY3VycmVudFRyZWUuZG9tVHJlZSh0aGlzLmRvbSk7XG4gIHRoaXMuYmluZEV2ZW50cygpO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuZG9tSW5pdCA9IGZ1bmN0aW9uKCkge1xuICAvLyBjcmVhdGUgYW4gaW5pdGlhbCB0cmVlIGZyb20gdGhlIERPTVxuICB0aGlzLmN1cnJlbnRUcmVlID0gcmVuZGVyLmluaXRpYWxSZW5kZXJGcm9tRG9tKHRoaXMuZG9tKTtcbiAgdGhpcy5jdXJyZW50VHJlZS5ub2RlTmFtZSA9IHVuZGVmaW5lZDtcbiAgdGhpcy5iaW5kRXZlbnRzKCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kaWZmID0gZnVuY3Rpb24oKSB7XG4gIHZhciBuZXdUcmVlID0gdGhpcy50cmVlKCk7XG4gIHZhciBkaWZmID0gdGhpcy5jdXJyZW50VHJlZS5kaWZmKG5ld1RyZWUpO1xuICByZW5kZXIuYXBwbHlEaWZmKGRpZmYsIHRoaXMuZG9tKTtcbiAgdGhpcy5jdXJyZW50VHJlZSA9IG5ld1RyZWU7XG4gIHRoaXMubG9jayA9IGZhbHNlO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuZGF0YUV2ZW50ID0gZnVuY3Rpb24oZSkge1xuICB2YXIgZG9tID0gZS50YXJnZXQ7XG4gIHZhciBuYW1lID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstYmluZCcpO1xuICBpZihuYW1lKSB7XG4gICAgdmFyIHJlbmRlck5vZGUgPSB0aGlzLmdldFJlbmRlck5vZGVGcm9tUGF0aChkb20pO1xuICAgIHVwZGF0ZURhdGEocmVuZGVyTm9kZS5jb250ZXh0LCBkb20pO1xuICAgIGlmKCF0aGlzLmxvY2spIHtcbiAgICAgIHRoaXMubG9jayA9IHRydWU7XG4gICAgICB0aGlzLmRpZmYoKTtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyKCdkYXRhVmlld0NoYW5nZWQnLCB7XCJuYW1lXCI6IG5hbWV9KTtcbiAgfVxufTtcblxuQmluZGluZy5wcm90b3R5cGUuZ2V0UmVuZGVyTm9kZUZyb21QYXRoID0gZnVuY3Rpb24oZG9tKSB7XG4gIHZhciBwYXRoID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstcGF0aCcpO1xuICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuY3VycmVudFRyZWU7XG4gIHZhciBiaXRzID0gcGF0aC5zcGxpdChcIi5cIiksIGk7XG4gIGZvcihpPTE7IGk8Yml0cy5sZW5ndGg7IGkrKykge1xuICAgIHJlbmRlck5vZGUgPSByZW5kZXJOb2RlLmNoaWxkcmVuW2JpdHNbaV1dO1xuICB9XG4gIHJldHVybiByZW5kZXJOb2RlO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKG5hbWUsIG9iaikge1xuICB0aGlzLmRvbS5kaXNwYXRjaEV2ZW50KFxuICAgIHV0aWwuZXZlbnQobmFtZSksXG4gICAgb2JqXG4gICk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5hbnlFdmVudCA9IGZ1bmN0aW9uKGUpIHtcbiAgdmFyIGRvbSA9IGUudGFyZ2V0O1xuICB2YXIgbGtFdmVudCA9IGRvbS5nZXRBdHRyaWJ1dGUoJ2xrLScgKyBlLnR5cGUpO1xuICBpZighbGtFdmVudCkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuZ2V0UmVuZGVyTm9kZUZyb21QYXRoKGRvbSk7XG4gIHZhciBjdHggPSB0ZW1wbGF0ZS5Db250ZXh0KHtldmVudDogZX0sIHJlbmRlck5vZGUuY29udGV4dCk7XG4gIHJlbmRlck5vZGUubm9kZS5hdHRyc1snbGstJytlLnR5cGVdLmV2YWx1YXRlKGN0eCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5iaW5kRXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpO1xuICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24oZSl7IHRoaXMuZGF0YUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXsgdGhpcy5kYXRhRXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB2YXIgZXZlbnRzID0gXCJjbGljayxjaGFuZ2UsbW91c2VvdmVyLGZvY3VzLGtleWRvd24sa2V5dXAsa2V5cHJlc3Msc3VibWl0LGJsdXJcIi5zcGxpdCgnLCcpO1xuICBmb3IoaT0wOyBpPGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBldmVudHNbaV0sXG4gICAgICBmdW5jdGlvbihlKXsgdGhpcy5hbnlFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIH1cbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCl7XG4gIC8vIGF2b2lkIDIgZGlmZnMgYXQgdGhlIHNhbWUgdGltZVxuICAvLyBUT0RPOiBtZXNzYWdlIG9yIGRpZmYgcXVldWUuXG4gIGlmKCF0aGlzLmxvY2spIHtcbiAgICB0aGlzLmxvY2sgPSB0cnVlO1xuICAgIHRoaXMuZGlmZigpO1xuICAgIHRoaXMudHJpZ2dlcigndXBkYXRlJyk7XG4gIH1cbn07XG5cbi8vVE9ETzogYXV0b21hdGljIG5ldyBvbiBDb250ZXh0LCBUZW1wbGF0ZSBhbmQgQ29tcG9uZW50XG5mdW5jdGlvbiBDb21wb25lbnQobmFtZSwgdHBsLCBjb250cm9sbGVyKSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBDb21wb25lbnQpIHtcbiAgICByZXR1cm4gbmV3IENvbXBvbmVudChuYW1lLCB0cGwsIGNvbnRyb2xsZXIpO1xuICB9XG4gIGlmKHRlbXBsYXRlLmNvbXBvbmVudENhY2hlW25hbWVdKSB7XG4gICAgdXRpbC5Db21waWxlRXJyb3IoXCJDb21wb25lbnQgd2l0aCBuYW1lIFwiICsgbmFtZSArIFwiIGFscmVhZHkgZXhpc3RcIik7XG4gIH1cbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRwbDtcbiAgdGhpcy5jb250cm9sbGVyID0gY29udHJvbGxlcjtcbiAgdGVtcGxhdGUuY29tcG9uZW50Q2FjaGVbbmFtZV0gPSB0aGlzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgVGVtcGxhdGU6dGVtcGxhdGUuYnVpbGRUZW1wbGF0ZSxcbiAgQ29udGV4dE5hbWU6dGVtcGxhdGUuQ29udGV4dE5hbWUsXG4gIHVwZGF0ZURhdGE6dXBkYXRlRGF0YSxcbiAgQmluZGluZzpCaW5kaW5nLFxuICBDb21wb25lbnQ6Q29tcG9uZW50LFxuICBnZXREb206cmVuZGVyLmdldERvbSxcbiAgY29tcG9uZW50Q2FjaGU6dGVtcGxhdGUuY29tcG9uZW50Q2FjaGUsXG4gIHBhcnNlRXhwcmVzc2lvbnM6ZXhwcmVzc2lvbi5wYXJzZUV4cHJlc3Npb25zLFxuICBjb21waWxlVGV4dEFuZEV4cHJlc3Npb25zOmV4cHJlc3Npb24uY29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyxcbiAgYnVpbGRFeHByZXNzaW9uczpleHByZXNzaW9uLmJ1aWxkRXhwcmVzc2lvbnMsXG4gIGV4cHJlc3Npb25zOntcbiAgICBTdHJpbmdWYWx1ZTpleHByZXNzaW9uLlN0cmluZ1ZhbHVlXG4gIH0sXG4gIGFwcGx5RGlmZjpyZW5kZXIuYXBwbHlEaWZmLFxuICBkaWZmQ29zdDpyZW5kZXIuZGlmZkNvc3QsXG4gIHBhcnNlQXR0cmlidXRlczp0ZW1wbGF0ZS5wYXJzZUF0dHJpYnV0ZXMsXG4gIGF0dHJpYnV0ZXNEaWZmOnJlbmRlci5hdHRyaWJ1dGVzRGlmZixcbiAgQ29udGV4dDp0ZW1wbGF0ZS5Db250ZXh0LFxuICBDb21waWxlRXJyb3I6dXRpbC5Db21waWxlRXJyb3IsXG4gIFJ1bnRpbWVFcnJvcjp1dGlsLlJ1bnRpbWVFcnJvcixcbiAgZXNjYXBlOnV0aWwuZXNjYXBlLFxuICBpbml0aWFsUmVuZGVyRnJvbURvbTpyZW5kZXIuaW5pdGlhbFJlbmRlckZyb21Eb20sXG4gIGV4cHJlc3Npb246ZXhwcmVzc2lvbixcbiAgcmVuZGVyOnJlbmRlcixcbiAgdXRpbDp1dGlsLFxuICBzZXRIYW5kaWNhcDpmdW5jdGlvbihuKXtyZW5kZXIuaGFuZGljYXAgPSBuO31cbn07XG4iLCJcblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBSZW5kZXJlZE5vZGUobm9kZSwgY29udGV4dCwgcmVuZGVyZXIsIHBhdGgpIHtcbiAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICB0aGlzLm5vZGUgPSBub2RlO1xuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLnJlbmRlcmVyID0gcmVuZGVyZXI7XG4gIHRoaXMucGF0aCA9IHBhdGggfHwgXCJcIjtcbiAgLy8gc2hvcnRjdXRcbiAgdGhpcy5ub2RlTmFtZSA9IG5vZGUubm9kZU5hbWU7XG59XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBpZihsZXZlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGV2ZWwgPSAwO1xuICB9XG4gIGZvcihpPTA7IGk8bGV2ZWw7IGkrKykge1xuICAgIHN0ciArPSBcIiAgXCI7XG4gIH1cbiAgc3RyICs9IFN0cmluZyh0aGlzLm5vZGUpICsgXCIgcGF0aCBcIiArIHRoaXMucGF0aCArIFwiXFxyXFxuXCI7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHN0ciArPSB0aGlzLmNoaWxkcmVuW2ldLnJlcHIobGV2ZWwgKyAxKTtcbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5kb21UcmVlID0gZnVuY3Rpb24oYXBwZW5kX3RvKSB7XG4gIHZhciBub2RlID0gYXBwZW5kX3RvIHx8IHRoaXMubm9kZS5kb21Ob2RlKHRoaXMuY29udGV4dCwgdGhpcy5wYXRoKSwgaSwgY2hpbGRfdHJlZTtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgY2hpbGRfdHJlZSA9IHRoaXMuY2hpbGRyZW5baV0uZG9tVHJlZSgpO1xuICAgIGlmKG5vZGUucHVzaCkge1xuICAgICAgbm9kZS5wdXNoKGNoaWxkX3RyZWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlLmFwcGVuZENoaWxkKGNoaWxkX3RyZWUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbm9kZTtcbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZG9tSHRtbCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaTtcbiAgLy92YXIgZCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGNoaWxkID0gdGhpcy5jaGlsZHJlbltpXS5kb21UcmVlKCk7XG4gICAgZC5hcHBlbmRDaGlsZChjaGlsZCk7XG4gIH1cbiAgcmV0dXJuIGQuaW5uZXJIVE1MO1xufTtcblxuZnVuY3Rpb24gZGlmZkNvc3QoZGlmZikge1xuICB2YXIgdmFsdWU9MCwgaTtcbiAgZm9yKGk9MDsgaTxkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgdmFsdWUgKz0gNTtcbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgdmFsdWUgKz0gMjtcbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgdmFsdWUgKz0gMTtcbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJzdHJpbmdtdXRhdGVcIikge1xuICAgICAgdmFsdWUgKz0gMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLl9kaWZmID0gZnVuY3Rpb24ocmVuZGVyZWRfbm9kZSwgYWNjdSwgcGF0aCkge1xuICB2YXIgaSwgaiwgc291cmNlX3B0ID0gMDtcbiAgaWYocGF0aCA9PT0gdW5kZWZpbmVkKSB7IHBhdGggPSBcIlwiOyB9XG5cbiAgaWYoIXJlbmRlcmVkX25vZGUpIHtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgIG5vZGU6IHRoaXMsXG4gICAgICBwYXRoOiBwYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIGFjY3U7XG4gIH1cblxuICBpZihyZW5kZXJlZF9ub2RlLm5vZGVOYW1lICE9IHRoaXMubm9kZU5hbWUpIHtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgdHlwZTogJ2RpZmZlbnRfbm9kZU5hbWUnLFxuICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgIG5vZGU6IHRoaXMsXG4gICAgICBwYXRoOiBwYXRoXG4gICAgfSk7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIHR5cGU6ICdkaWZmZW50X25vZGVOYW1lJyxcbiAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICBub2RlOiByZW5kZXJlZF9ub2RlLFxuICAgICAgLy8gd2hlbiBhIG5vZGUgaXMgYWRkZWQsIHdlIHBvaW50IHRvIHRoZSBuZXh0IG5vZGUgYXMgaW5zZXJ0QmVmb3JlIGlzIHVzZWRcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfVxuXG4gIC8vIENvdWxkIHVzZSBpbmhlcml0YW5jZSBmb3IgdGhpc1xuICBpZih0aGlzLm5vZGVOYW1lID09IFwiI3RleHRcIiAmJiB0aGlzLnJlbmRlcmVyICE9IHJlbmRlcmVkX25vZGUucmVuZGVyZXIpIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIGFjdGlvbjogJ3N0cmluZ211dGF0ZScsXG4gICAgICAgIG5vZGU6IHRoaXMsXG4gICAgICAgIHZhbHVlOiByZW5kZXJlZF9ub2RlLnJlbmRlcmVyLFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYV9kaWZmID0gYXR0cmlidXRlc0RpZmYodGhpcy5hdHRycywgcmVuZGVyZWRfbm9kZS5hdHRycyk7XG4gICAgaWYoYV9kaWZmLmxlbmd0aCkge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAnbXV0YXRlJyxcbiAgICAgICAgbm9kZTogdGhpcyxcbiAgICAgICAgYXR0cmlidXRlc0RpZmY6IGFfZGlmZixcbiAgICAgICAgcGF0aDogcGF0aFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGwxID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7XG4gIHZhciBsMiA9IHJlbmRlcmVkX25vZGUuY2hpbGRyZW4ubGVuZ3RoO1xuXG4gIC8vIG5vIHN3YXAgcG9zc2libGUsIGJ1dCBkZWxldGluZyBhIG5vZGUgaXMgcG9zc2libGVcbiAgaiA9IDA7IGkgPSAwOyBzb3VyY2VfcHQgPSAwO1xuICAvLyBsZXQncyBnb3QgdHJvdWdoIGFsbCB0aGUgY2hpbGRyZW5cbiAgZm9yKDsgaTxsMTsgaSsrKSB7XG4gICAgdmFyIGRpZmYgPSAwLCBhZnRlcl9zb3VyY2VfZGlmZiA9IDAsIGFmdGVyX3RhcmdldF9kaWZmID0gMCwgYWZ0ZXJfc291cmNlX2Nvc3Q9bnVsbCwgYWZ0ZXJfdGFyZ2V0X2Nvc3Q9bnVsbDtcbiAgICB2YXIgYWZ0ZXJfdGFyZ2V0ID0gcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqKzFdO1xuICAgIHZhciBhZnRlcl9zb3VyY2UgPSB0aGlzLmNoaWxkcmVuW2krMV07XG5cbiAgICBpZighcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSkge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgICAgbm9kZTogdGhpcy5jaGlsZHJlbltpXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIHNvdXJjZV9wdFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBkaWZmID0gdGhpcy5jaGlsZHJlbltpXS5fZGlmZihyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG5cbiAgICB2YXIgY29zdCA9IGRpZmZDb3N0KGRpZmYpO1xuICAgIC8vIGRvZXMgdGhlIG5leHQgc291cmNlIG9uZSBmaXRzIGJldHRlcj9cbiAgICBpZihhZnRlcl9zb3VyY2UpIHtcbiAgICAgIGFmdGVyX3NvdXJjZV9kaWZmID0gYWZ0ZXJfc291cmNlLl9kaWZmKHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcbiAgICAgIC8vIG5lZWRzIHNvbWUgaGFuZGljYXAgb3RoZXJ3aXNlIGlucHV0cyBjb250YWluaW5nIHRoZSBjdXJyZW50IGZvY3VzXG4gICAgICAvLyBtaWdodCBiZSByZW1vdmVkXG4gICAgICBhZnRlcl9zb3VyY2VfY29zdCA9IGRpZmZDb3N0KGFmdGVyX3NvdXJjZV9kaWZmKSArIG1vZHVsZS5leHBvcnRzLmhhbmRpY2FwO1xuICAgIH1cbiAgICAvLyBkb2VzIHRoZSBuZXh0IHRhcmdldCBvbmUgZml0cyBiZXR0ZXI/XG4gICAgaWYoYWZ0ZXJfdGFyZ2V0KSB7XG4gICAgICBhZnRlcl90YXJnZXRfZGlmZiA9IHRoaXMuY2hpbGRyZW5baV0uX2RpZmYoYWZ0ZXJfdGFyZ2V0LCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG4gICAgICBhZnRlcl90YXJnZXRfY29zdCA9IGRpZmZDb3N0KGFmdGVyX3RhcmdldF9kaWZmKSArIG1vZHVsZS5leHBvcnRzLmhhbmRpY2FwO1xuICAgIH1cblxuICAgIGlmKCghYWZ0ZXJfdGFyZ2V0IHx8IGNvc3QgPD0gYWZ0ZXJfdGFyZ2V0X2Nvc3QpICYmICghYWZ0ZXJfc291cmNlIHx8IGNvc3QgPD0gYWZ0ZXJfc291cmNlX2Nvc3QpKSB7XG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoZGlmZik7XG4gICAgICBzb3VyY2VfcHQgKz0gMTtcbiAgICB9IGVsc2UgaWYoYWZ0ZXJfc291cmNlICYmICghYWZ0ZXJfdGFyZ2V0IHx8IGFmdGVyX3NvdXJjZV9jb3N0IDw9IGFmdGVyX3RhcmdldF9jb3N0KSkge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2FmdGVyX3NvdXJjZScsXG4gICAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICAgIG5vZGU6IHRoaXMuY2hpbGRyZW5baV0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyBzb3VyY2VfcHRcbiAgICAgIH0pO1xuICAgICAgYWNjdSA9IGFjY3UuY29uY2F0KGFmdGVyX3NvdXJjZV9kaWZmKTtcbiAgICAgIHNvdXJjZV9wdCArPSAxO1xuICAgICAgaSsrO1xuICAgIH0gZWxzZSBpZihhZnRlcl90YXJnZXQpIHtcbiAgICAgIC8vIGltcG9ydGFudCB0byBhZGQgdGhlIGRpZmYgYmVmb3JlXG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoYWZ0ZXJfdGFyZ2V0X2RpZmYpO1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2FmdGVyX3RhcmdldCcsXG4gICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyAoc291cmNlX3B0KVxuICAgICAgfSk7XG4gICAgICBzb3VyY2VfcHQgKz0gMjtcbiAgICAgIGorKztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgXCJTaG91bGQgbmV2ZXIgaGFwcGVuXCI7XG4gICAgfVxuICAgIGorKztcbiAgfVxuXG4gIC8vIG5ldyBub2RlcyB0byBiZSBhZGRlZCBhZnRlciB0aGUgZGlmZlxuICBmb3IoaT0wOyBpPChsMi1qKTsgaSsrKSB7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIHR5cGU6ICduZXdfbm9kZScsXG4gICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqK2ldLFxuICAgICAgLy8gd2hlbiBhIG5vZGUgaXMgYWRkZWQsIHdlIHBvaW50IHRvIHRoZSBuZXh0IG5vZGUgYXMgaW5zZXJ0QmVmb3JlIGlzIHVzZWRcbiAgICAgIHBhdGg6IHBhdGggKyAnLicgKyAoc291cmNlX3B0ICsgMSlcbiAgICB9KTtcbiAgICBzb3VyY2VfcHQgKz0gMTtcbiAgfVxuXG4gIHJldHVybiBhY2N1O1xuXG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbihyZW5kZXJlZF9ub2RlKSB7XG4gIHZhciBhY2N1ID0gW107XG4gIHJldHVybiB0aGlzLl9kaWZmKHJlbmRlcmVkX25vZGUsIGFjY3UpO1xufTtcblxuZnVuY3Rpb24gYXR0cmlidXRlc0RpZmYoYSwgYikge1xuICB2YXIgY2hhbmdlcyA9IFtdLCBrZXk7XG4gIGZvcihrZXkgaW4gYSkge1xuICAgICAgaWYoYltrZXldID09PSBmYWxzZSkge1xuICAgICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcInJlbW92ZVwiLCBrZXk6a2V5fSk7XG4gICAgICB9IGVsc2UgaWYoYltrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYoYltrZXldICE9IGFba2V5XSkge1xuICAgICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwibXV0YXRlXCIsIGtleTprZXksIHZhbHVlOmJba2V5XX0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcInJlbW92ZVwiLCBrZXk6a2V5fSk7XG4gICAgICB9XG4gIH1cbiAgZm9yKGtleSBpbiBiKSB7XG4gICAgaWYoYVtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwiYWRkXCIsIGtleTprZXksIHZhbHVlOmJba2V5XX0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY2hhbmdlcztcbn1cblxuZnVuY3Rpb24gZ2V0RG9tKGRvbSwgcGF0aCwgc3RvcCkge1xuICB2YXIgaSwgcD1wYXRoLnNwbGl0KCcuJyksIGQ9ZG9tO1xuICBpZihzdG9wID09PSB1bmRlZmluZWQpIHtcbiAgICBzdG9wID0gMDtcbiAgfVxuICBmb3IoaT0wOyBpPChwLmxlbmd0aCAtIHN0b3ApOyBpKyspIHtcbiAgICBpZihwW2ldKSB7IC8vIGZpcnN0IG9uZSBpcyBcIlwiXG4gICAgICBkID0gZC5jaGlsZE5vZGVzW3BhcnNlSW50KHBbaV0sIDEwKV07XG4gICAgfVxuICB9XG4gIHJldHVybiBkO1xufVxuXG5mdW5jdGlvbiBhcHBseURpZmYoZGlmZiwgZG9tKSB7XG4gIHZhciBpLCBqLCBfZGlmZiwgX2RvbSwgcGFyZW50O1xuICBmb3IoaT0wOyBpPGRpZmYubGVuZ3RoOyBpKyspIHtcbiAgICBfZGlmZiA9IGRpZmZbaV07XG4gICAgX2RvbSA9IGdldERvbShkb20sIF9kaWZmLnBhdGgpO1xuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcInJlbW92ZVwiKSB7XG4gICAgICBfZG9tLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoX2RvbSk7XG4gICAgfVxuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICB2YXIgbmV3Tm9kZSA9IF9kaWZmLm5vZGUuZG9tVHJlZSgpO1xuICAgICAgaWYoX2RvbSkge1xuICAgICAgICBfZG9tLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5ld05vZGUsIF9kb20pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZ2V0IHRoZSBwYXJlbnRcbiAgICAgICAgcGFyZW50ID0gZ2V0RG9tKGRvbSwgX2RpZmYucGF0aCwgMSk7XG4gICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChuZXdOb2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwibXV0YXRlXCIpIHtcbiAgICAgIGZvcihqPTA7IGo8X2RpZmYuYXR0cmlidXRlc0RpZmYubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIGFfZGlmZiA9IF9kaWZmLmF0dHJpYnV0ZXNEaWZmW2pdO1xuICAgICAgICBpZihhX2RpZmYuYWN0aW9uID09IFwibXV0YXRlXCIpIHtcbiAgICAgICAgICAvLyBpbXBvcnRhbnQgZm9yIHNlbGVjdFxuICAgICAgICAgIGlmKFwidmFsdWUsc2VsZWN0ZWQsY2hlY2tlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIGlmKF9kb21bYV9kaWZmLmtleV0gIT0gYV9kaWZmLnZhbHVlKSB7XG4gICAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBhX2RpZmYudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIF9kb20uc2V0QXR0cmlidXRlKGFfZGlmZi5rZXksIGFfZGlmZi52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcInJlbW92ZVwiKSB7XG4gICAgICAgICAgaWYoXCJjaGVja2VkLHNlbGVjdGVkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfZG9tLnJlbW92ZUF0dHJpYnV0ZShhX2RpZmYua2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZihhX2RpZmYuYWN0aW9uID09IFwiYWRkXCIpIHtcbiAgICAgICAgICBpZihcImNoZWNrZWQsc2VsZWN0ZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gYV9kaWZmLnZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfZG9tLnNldEF0dHJpYnV0ZShhX2RpZmYua2V5LCBhX2RpZmYudmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcInN0cmluZ211dGF0ZVwiKSB7XG4gICAgICBfZG9tLm5vZGVWYWx1ZSA9IF9kaWZmLnZhbHVlO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0aWFsUmVuZGVyRnJvbURvbShkb20sIHBhdGgpIHtcbiAgcGF0aCA9IHBhdGggfHwgXCJcIjtcbiAgdmFyIGksIGNoaWxkLCBjaGlsZHJlbiA9IFtdLCBhdHRycyA9IHt9LCByZW5kZXJlciA9ICcnO1xuICBpZihkb20uYXR0cmlidXRlcykge1xuICAgIGZvcihpPTA7IGkgPCBkb20uYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGF0dHIgPSBkb20uYXR0cmlidXRlc1tpXTtcbiAgICAgIGF0dHJzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgIH1cbiAgfVxuICBpZihkb20uY2hpbGROb2Rlcykge1xuICAgIGZvcihpPTA7IGkgPCBkb20uY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hpbGQgPSBkb20uY2hpbGROb2Rlc1tpXTtcbiAgICAgIGNoaWxkcmVuLnB1c2goaW5pdGlhbFJlbmRlckZyb21Eb20oY2hpbGQsIHBhdGggKyAnLicgKyBpKSk7XG4gICAgfVxuICB9XG4gIGlmKGRvbS50ZXh0Q29udGVudCkge1xuICAgIHJlbmRlcmVyID0gZG9tLnRleHRDb250ZW50O1xuICB9XG4gIHZhciBybiA9IG5ldyBSZW5kZXJlZE5vZGUoXG4gICAge25vZGVOYW1lOiBkb20ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSwgbm9kZTpkb219LFxuICAgIHVuZGVmaW5lZCxcbiAgICByZW5kZXJlcixcbiAgICBwYXRoKTtcbiAgcm4uYXR0cnMgPSBhdHRycztcbiAgcm4uY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgcmV0dXJuIHJuO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgUmVuZGVyZWROb2RlOlJlbmRlcmVkTm9kZSxcbiAgaW5pdGlhbFJlbmRlckZyb21Eb206aW5pdGlhbFJlbmRlckZyb21Eb20sXG4gIGFwcGx5RGlmZjphcHBseURpZmYsXG4gIGF0dHJpYnV0ZXNEaWZmOmF0dHJpYnV0ZXNEaWZmLFxuICBkaWZmQ29zdDpkaWZmQ29zdCxcbiAgZ2V0RG9tOmdldERvbSxcbiAgaGFuZGljYXA6MVxufTsiLCJcblwidXNlIHN0cmljdFwiO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpO1xudmFyIGV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcblxudmFyIHRlbXBsYXRlQ2FjaGUgPSB7fTtcbnZhciBjb21wb25lbnRDYWNoZSA9IHt9O1xuLy8gYSBuYW1lIGhlcmUgaXMgYWxzbyBhbnkgdmFsaWQgSlMgb2JqZWN0IHByb3BlcnR5XG52YXIgVkFSTkFNRV9SRUcgPSAvXlthLXpBLVpfJF1bMC05YS16QS1aXyRdKi87XG52YXIgSFRNTF9BVFRSX1JFRyA9IC9eW0EtWmEtel1bXFx3LV17MCx9LztcbnZhciBET1VCTEVfUVVPVEVEX1NUUklOR19SRUcgPSAvXlwiKFxcXFxcInxbXlwiXSkqXCIvO1xuXG5mdW5jdGlvbiBDb250ZXh0TmFtZShuYW1lKSB7XG4gIHRoaXMuYml0cyA9IG5hbWUuc3BsaXQoJy4nKTtcbn1cblxuQ29udGV4dE5hbWUucHJvdG90eXBlLnN1YnN0aXR1dGVBbGlhcyA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgaWYoY29udGV4dC5hbGlhc2VzLmhhc093blByb3BlcnR5KHRoaXMuYml0c1swXSkpIHtcbiAgICB2YXIgbmV3Qml0cyA9IGNvbnRleHQuYWxpYXNlc1t0aGlzLmJpdHNbMF1dLnNwbGl0KCcuJyk7XG4gICAgdGhpcy5iaXRzLnNoaWZ0KCk7XG4gICAgdGhpcy5iaXRzID0gbmV3Qml0cy5jb25jYXQodGhpcy5iaXRzKTtcbiAgfVxufTtcblxuQ29udGV4dE5hbWUucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmJpdHNbMF07XG59O1xuXG5Db250ZXh0TmFtZS5wcm90b3R5cGUuc3RyID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmJpdHMuam9pbignLicpO1xufTtcblxuZnVuY3Rpb24gQ29udGV4dChkYXRhLCBwYXJlbnQpIHtcbiAgaWYgKHRoaXMuY29uc3RydWN0b3IgIT09IENvbnRleHQpIHtcbiAgICByZXR1cm4gbmV3IENvbnRleHQoZGF0YSwgcGFyZW50KTtcbiAgfVxuICB0aGlzLmRhdGEgPSBkYXRhO1xuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5hbGlhc2VzID0ge307XG4gIHRoaXMud2F0Y2hpbmcgPSB7fTtcbn1cblxuQ29udGV4dC5wcm90b3R5cGUuYWRkQWxpYXMgPSBmdW5jdGlvbihzb3VyY2VOYW1lLCBhbGlhc05hbWUpIHtcbiAgLy8gc291cmNlIG5hbWUgY2FuIGJlICduYW1lJyBvciAnbGlzdC5rZXknXG4gIGlmKHNvdXJjZU5hbWUgPT09IGFsaWFzTmFtZSkge1xuICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkFsaWFzIHdpdGggdGhlIG5hbWUgXCIgKyBhbGlhc05hbWUgKyBcIiBhbHJlYWR5IHByZXNlbnQgaW4gdGhpcyBjb250ZXh0LlwiKTtcbiAgfVxuICB0aGlzLmFsaWFzZXNbYWxpYXNOYW1lXSA9IHNvdXJjZU5hbWU7XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5yZXNvbHZlTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgLy8gZ2l2ZW4gYSBuYW1lLCByZXR1cm4gdGhlIFtDb250ZXh0LCByZXNvbHZlZCBwYXRoLCB2YWx1ZV0gd2hlblxuICAvLyB0aGlzIG5hbWUgaXMgZm91bmQgb3IgdW5kZWZpbmVkIG90aGVyd2lzZVxuICBuYW1lLnN1YnN0aXR1dGVBbGlhcyh0aGlzKTtcblxuICBpZih0aGlzLmRhdGEuaGFzT3duUHJvcGVydHkobmFtZS5zdGFydCgpKSkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuZGF0YVtuYW1lLnN0YXJ0KCldO1xuICAgIHZhciBpID0gMTtcbiAgICB3aGlsZShpIDwgbmFtZS5iaXRzLmxlbmd0aCkge1xuICAgICAgaWYoIXZhbHVlLmhhc093blByb3BlcnR5KG5hbWUuYml0c1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdmFsdWVbbmFtZS5iaXRzW2ldXTtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgcmV0dXJuIFt0aGlzLCBuYW1lLnN0cigpLCB2YWx1ZV07XG4gIH1cblxuICBpZih0aGlzLnBhcmVudCkge1xuICAgIHJldHVybiB0aGlzLnBhcmVudC5yZXNvbHZlTmFtZShuYW1lKTtcbiAgfVxuXG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5nZXROYW1lUGF0aCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHJlc29sdmVkID0gdGhpcy5yZXNvbHZlTmFtZShuZXcgQ29udGV4dE5hbWUobmFtZSkpO1xuICBpZihyZXNvbHZlZCkge1xuICAgIHJldHVybiByZXNvbHZlZFsxXTtcbiAgfVxufTtcblxuQ29udGV4dC5wcm90b3R5cGUud2F0Y2ggPSBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICB0aGlzLndhdGNoaW5nW25hbWVdID0gY2FsbGJhY2s7XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZU5hbWUobmV3IENvbnRleHROYW1lKG5hbWUpKTtcbiAgaWYocmVzb2x2ZWQpIHtcbiAgICByZXR1cm4gcmVzb2x2ZWRbMl07XG4gIH1cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHRoaXMuX21vZGlmeShuZXcgQ29udGV4dE5hbWUobmFtZSksIHZhbHVlKTtcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLl9tb2RpZnkgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuXG4gIGlmKHRoaXMud2F0Y2hpbmcuaGFzT3duUHJvcGVydHkobmFtZS5zdHIoKSkpIHtcbiAgICB0aGlzLndhdGNoaW5nW25hbWUuc3RyKCldKHZhbHVlKTtcbiAgfVxuXG4gIG5hbWUuc3Vic3RpdHV0ZUFsaWFzKHRoaXMpO1xuXG4gIC8vIHdlIGdvIGluIGZvciBhIHNlYXJjaCBpZiB0aGUgZmlyc3QgcGFydCBtYXRjaGVzXG4gIGlmKHRoaXMuZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lLnN0YXJ0KCkpKSB7XG4gICAgdmFyIGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlKGkgPCBuYW1lLmJpdHMubGVuZ3RoIC0gMSkge1xuICAgICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkobmFtZS5iaXRzW2ldKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgZGF0YSA9IGRhdGFbbmFtZS5iaXRzW2ldXTtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgZGF0YVtuYW1lLmJpdHNbaV1dID0gdmFsdWU7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgLy8gZGF0YSBub3QgZm91bmQsIGxldCdzIHNlYXJjaCBpbiB0aGUgcGFyZW50XG4gIGlmKHRoaXMucGFyZW50KSB7XG4gICAgcmV0dXJuIHRoaXMucGFyZW50Ll9tb2RpZnkobmFtZSwgdmFsdWUpO1xuICB9XG5cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHRoaXMuZGF0YVtuYW1lXSA9IHZhbHVlO1xufTtcblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGVzKHYsIG5vZGUpIHtcbiAgdmFyIGF0dHJzID0ge30sIG4sIHM7XG4gIHdoaWxlKHYpIHtcbiAgICAgIHYgPSB1dGlsLnRyaW0odik7XG4gICAgICBuID0gdi5tYXRjaChIVE1MX0FUVFJfUkVHKTtcbiAgICAgIGlmKCFuKSB7XG4gICAgICAgIG5vZGUuY2Vycm9yKFwicGFyc2VBdHRyaWJ1dGVzOiBObyBhdHRyaWJ1dGUgbmFtZSBmb3VuZCBpbiBcIit2KTtcbiAgICAgIH1cbiAgICAgIHYgPSB2LnN1YnN0cihuWzBdLmxlbmd0aCk7XG4gICAgICBuID0gblswXTtcbiAgICAgIGlmKHZbMF0gIT0gXCI9XCIpIHtcbiAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIGVxdWFsIHNpZ24gYWZ0ZXIgbmFtZSBcIituKTtcbiAgICAgIH1cbiAgICAgIHYgPSB2LnN1YnN0cigxKTtcbiAgICAgIHMgPSB2Lm1hdGNoKERPVUJMRV9RVU9URURfU1RSSU5HX1JFRyk7XG4gICAgICBpZihzKSB7XG4gICAgICAgIGF0dHJzW25dID0gbmV3IFN0cmluZ05vZGUobnVsbCwgc1swXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzID0gdi5tYXRjaChleHByZXNzaW9uLkVYUFJFU1NJT05fUkVHKTtcbiAgICAgICAgaWYocyA9PT0gbnVsbCkge1xuICAgICAgICAgIG5vZGUuY2Vycm9yKFwicGFyc2VBdHRyaWJ1dGVzOiBObyBzdHJpbmcgb3IgZXhwcmVzc2lvbiBmb3VuZCBhZnRlciBuYW1lIFwiK24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBleHByID0gZXhwcmVzc2lvbi5idWlsZChzWzFdKTtcbiAgICAgICAgICBhdHRyc1tuXSA9IGV4cHI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHYgPSB2LnN1YnN0cihzWzBdLmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGF0dHJzO1xufVxuXG4vLyBhbGwgdGhlIGF2YWlsYWJsZSB0ZW1wbGF0ZSBub2RlXG5cbmZ1bmN0aW9uIE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICB0aGlzLmxpbmUgPSBsaW5lO1xuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5jb250ZW50ID0gY29udGVudDtcbiAgdGhpcy5sZXZlbCA9IGxldmVsO1xuICB0aGlzLmNoaWxkcmVuID0gW107XG59XG5cbk5vZGUucHJvdG90eXBlLnJlcHIgPSBmdW5jdGlvbihsZXZlbCkge1xuICB2YXIgc3RyID0gXCJcIiwgaTtcbiAgaWYobGV2ZWwgPT09IHVuZGVmaW5lZCkge1xuICAgIGxldmVsID0gMDtcbiAgfVxuICBmb3IoaT0wOyBpPGxldmVsOyBpKyspIHtcbiAgICBzdHIgKz0gXCIgIFwiO1xuICB9XG4gIHN0ciArPSBTdHJpbmcodGhpcykgKyBcIlxcclxcblwiO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBzdHIgKz0gdGhpcy5jaGlsZHJlbltpXS5yZXByKGxldmVsICsgMSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgaWYocGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcGF0aCA9ICcnO1xuICAgIHBvcyA9IDA7XG4gICAgdGhpcy5pc1Jvb3QgPSB0cnVlO1xuICB9XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgJycsIHBhdGgpO1xuICB0LmNoaWxkcmVuID0gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5jZXJyb3IgPSBmdW5jdGlvbihtc2cpIHtcbiAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKHRoaXMudG9TdHJpbmcoKSArIFwiOiBcIiArIG1zZyk7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5kb21Ob2RlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbXTtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRyZWVDaGlsZHJlbiA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgdCA9IFtdLCBpLCBwLCBqLCBjaGlsZHJlbiA9IG51bGwsIGNoaWxkID0gbnVsbDtcbiAgaiA9IHBvcztcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgcCA9IHBhdGg7XG4gICAgY2hpbGQgPSB0aGlzLmNoaWxkcmVuW2ldO1xuICAgIGlmKGNoaWxkLmhhc093blByb3BlcnR5KCdub2RlTmFtZScpKSB7XG4gICAgICBwICs9ICcuJyArIGo7XG4gICAgICBqKys7XG4gICAgICBjaGlsZHJlbiA9IGNoaWxkLnRyZWUoY29udGV4dCwgcCwgMCk7XG4gICAgICB0LnB1c2goY2hpbGRyZW4pO1xuICAgIH0gZWxzZSBpZiAoIWNoaWxkLnJlbmRlckV4bGN1ZGVkKSB7XG4gICAgICBjaGlsZHJlbiA9IGNoaWxkLnRyZWUoY29udGV4dCwgcCwgaik7XG4gICAgICBpZihjaGlsZHJlbikge1xuICAgICAgICB0ID0gdC5jb25jYXQoY2hpbGRyZW4pO1xuICAgICAgICBqICs9IGNoaWxkcmVuLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHQ7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5hZGRDaGlsZCA9IGZ1bmN0aW9uKGNoaWxkKSB7XG4gIHRoaXMuY2hpbGRyZW4ucHVzaChjaGlsZCk7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICsgXCIoXCIrdGhpcy5jb250ZW50LnJlcGxhY2UoXCJcXG5cIiwgXCJcIikrXCIpIGF0IGxpbmUgXCIgKyB0aGlzLmxpbmU7XG59O1xuXG5mdW5jdGlvbiBDb21tZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgcGFyZW50LmNoaWxkcmVuLnB1c2godGhpcyk7XG4gIHRoaXMucmVuZGVyRXhsY3VkZWQgPSB0cnVlO1xufVxudXRpbC5pbmhlcml0cyhDb21tZW50Tm9kZSwgTm9kZSk7XG5cbmZ1bmN0aW9uIEh0bWxOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gdGhpcy5jb250ZW50LnNwbGl0KFwiIFwiKVswXTtcbiAgdGhpcy5hdHRycyA9IHBhcnNlQXR0cmlidXRlcyh0aGlzLmNvbnRlbnQuc3Vic3RyKHRoaXMubm9kZU5hbWUubGVuZ3RoKSwgdGhpcyk7XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSHRtbE5vZGUsIE5vZGUpO1xuXG5IdG1sTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsIHRoaXMuZG9tTm9kZShjb250ZXh0LCBwYXRoKSwgcGF0aCk7XG4gIHQuYXR0cnMgPSB0aGlzLnJlbmRlckF0dHJpYnV0ZXMoY29udGV4dCwgcGF0aCk7XG4gIHQuY2hpbGRyZW4gPSB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xuICByZXR1cm4gdDtcbn07XG5cbmZ1bmN0aW9uIGJpbmRpbmdOYW1lKG5vZGUpIHtcbiAgaWYobm9kZSBpbnN0YW5jZW9mIGV4cHJlc3Npb24uTmFtZSkge1xuICAgIHJldHVybiBub2RlLm5hbWU7XG4gIH1cbiAgaWYobm9kZSBpbnN0YW5jZW9mIFN0cmluZ05vZGUgJiYgbm9kZS5jb21waWxlZEV4cHJlc3Npb24ubGVuZ3RoID09IDEgJiZcbiAgICAgIG5vZGUuY29tcGlsZWRFeHByZXNzaW9uWzBdIGluc3RhbmNlb2YgZXhwcmVzc2lvbi5OYW1lKSB7XG4gICAgcmV0dXJuIG5vZGUuY29tcGlsZWRFeHByZXNzaW9uWzBdLm5hbWU7XG4gIH1cbn1cblxuSHRtbE5vZGUucHJvdG90eXBlLnJlbmRlckF0dHJpYnV0ZXMgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIHZhciByX2F0dHJzID0ge30sIGtleSwgYXR0ciwgbmFtZTtcbiAgZm9yKGtleSBpbiB0aGlzLmF0dHJzKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnNba2V5XTtcbiAgICAvLyB0b2RvLCBmaW5kIGEgYmV0dGVyIHdheSB0byBkaXNjcmltaW5hdGUgZXZlbnRzXG4gICAgaWYoa2V5LmluZGV4T2YoXCJsay1cIikgPT09IDApIHtcbiAgICAgIC8vIGFkZCB0aGUgcGF0aCB0byB0aGUgcmVuZGVyIG5vZGUgdG8gYW55IGxrLXRoaW5nIG5vZGVcbiAgICAgIHJfYXR0cnNbJ2xrLXBhdGgnXSA9IHBhdGg7XG4gICAgICBpZihrZXkgPT09ICdsay1iaW5kJykge1xuICAgICAgICByX2F0dHJzW2tleV0gPSBhdHRyLmV2YWx1YXRlKGNvbnRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcl9hdHRyc1trZXldID0gXCJ0cnVlXCI7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYoYXR0ci5ldmFsdWF0ZSkge1xuICAgICAgdmFyIHYgPSBhdHRyLmV2YWx1YXRlKGNvbnRleHQpO1xuICAgICAgaWYodiA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy8gbm90aGluZ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcl9hdHRyc1trZXldID0gdjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcl9hdHRyc1trZXldID0gYXR0cjtcbiAgICB9XG4gIH1cbiAgaWYoXCJpbnB1dCxzZWxlY3QsdGV4dGFyZWFcIi5pbmRleE9mKHRoaXMubm9kZU5hbWUpICE9IC0xICYmIHRoaXMuYXR0cnMuaGFzT3duUHJvcGVydHkoJ3ZhbHVlJykpIHtcbiAgICBhdHRyID0gdGhpcy5hdHRycy52YWx1ZTtcbiAgICBuYW1lID0gYmluZGluZ05hbWUoYXR0cik7XG4gICAgaWYobmFtZSAmJiB0aGlzLmF0dHJzWydsay1iaW5kJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcl9hdHRyc1snbGstYmluZCddID0gbmFtZTtcbiAgICAgIHJfYXR0cnNbJ2xrLXBhdGgnXSA9IHBhdGg7XG4gICAgfVxuICB9XG4gIGlmKHRoaXMubm9kZU5hbWUgPT0gXCJ0ZXh0YXJlYVwiICYmIHRoaXMuY2hpbGRyZW4ubGVuZ3RoID09IDEpIHtcbiAgICBuYW1lID0gYmluZGluZ05hbWUodGhpcy5jaGlsZHJlblswXS5leHByZXNzaW9uKTtcbiAgICBpZihuYW1lICYmIHRoaXMuYXR0cnNbJ2xrLWJpbmQnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByX2F0dHJzWydsay1iaW5kJ10gPSBuYW1lO1xuICAgICAgcl9hdHRyc1snbGstcGF0aCddID0gcGF0aDtcbiAgICAgIC8vIGFzIHNvb24gYXMgdGhlIHVzZXIgaGFzIGFsdGVyZWQgdGhlIHZhbHVlIG9mIHRoZSB0ZXh0YXJlYSBvciBzY3JpcHQgaGFzIGFsdGVyZWRcbiAgICAgIC8vIHRoZSB2YWx1ZSBwcm9wZXJ0eSBvZiB0aGUgdGV4dGFyZWEsIHRoZSB0ZXh0IG5vZGUgaXMgb3V0IG9mIHRoZSBwaWN0dXJlIGFuZCBpcyBub1xuICAgICAgLy8gbG9uZ2VyIGJvdW5kIHRvIHRoZSB0ZXh0YXJlYSdzIHZhbHVlIGluIGFueSB3YXkuXG4gICAgICByX2F0dHJzLnZhbHVlID0gdGhpcy5jaGlsZHJlblswXS5leHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcl9hdHRycztcbn07XG5cbkh0bWxOb2RlLnByb3RvdHlwZS5kb21Ob2RlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGhpcy5ub2RlTmFtZSksIGtleSwgYXR0cnM9dGhpcy5yZW5kZXJBdHRyaWJ1dGVzKGNvbnRleHQsIHBhdGgpO1xuICBmb3Ioa2V5IGluIGF0dHJzKSB7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGUoa2V5LCBhdHRyc1trZXldKTtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn07XG5cbmZ1bmN0aW9uIEZvck5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICAvLyBzeW50YXg6IGZvciBrZXksIHZhbHVlIGluIGxpc3RcbiAgLy8gICAgICAgICBmb3IgdmFsdWUgaW4gbGlzdFxuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHZhciB2YXIxLCB2YXIyLCBzb3VyY2VOYW1lO1xuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKDQpKTtcbiAgdmFyMSA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICBpZighdmFyMSkge1xuICAgIHRoaXMuY2Vycm9yKFwiZmlyc3QgdmFyaWFibGUgbmFtZSBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIodmFyMVswXS5sZW5ndGgpKTtcbiAgaWYoY29udGVudFswXSA9PSAnLCcpIHtcbiAgICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKDEpKTtcbiAgICB2YXIyID0gY29udGVudC5tYXRjaChWQVJOQU1FX1JFRyk7XG4gICAgaWYoIXZhcjIpIHtcbiAgICAgIHRoaXMuY2Vycm9yKFwic2Vjb25kIHZhcmlhYmxlIGFmdGVyIGNvbW1hIGlzIG1pc3NpbmdcIik7XG4gICAgfVxuICAgIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIodmFyMlswXS5sZW5ndGgpKTtcbiAgfVxuICBpZighY29udGVudC5tYXRjaCgvXmluLykpIHtcbiAgICB0aGlzLmNlcnJvcihcImluIGtleXdvcmQgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKDIpKTtcbiAgc291cmNlTmFtZSA9IGNvbnRlbnQubWF0Y2goZXhwcmVzc2lvbi5OYW1lLnJlZyk7XG4gIGlmKCFzb3VyY2VOYW1lKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJpdGVyYWJsZSBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgdGhpcy5zb3VyY2VOYW1lID0gc291cmNlTmFtZVswXTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cihzb3VyY2VOYW1lWzBdLmxlbmd0aCkpO1xuICBpZihjb250ZW50ICE9PSBcIlwiKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJsZWZ0IG92ZXIgdW5wYXJzYWJsZSBjb250ZW50OiBcIiArIGNvbnRlbnQpO1xuICB9XG5cbiAgaWYodmFyMSAmJiB2YXIyKSB7XG4gICAgdGhpcy5pbmRleE5hbWUgPSB2YXIxO1xuICAgIHRoaXMuYWxpYXMgPSB2YXIyWzBdO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYWxpYXMgPSB2YXIxWzBdO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoRm9yTm9kZSwgTm9kZSk7XG5cbkZvck5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBbXSwga2V5O1xuICB2YXIgZCA9IGNvbnRleHQuZ2V0KHRoaXMuc291cmNlTmFtZSk7XG4gIGZvcihrZXkgaW4gZCkge1xuICAgIHZhciBuZXdfZGF0YSA9IHt9O1xuICAgIC8vIGFkZCB0aGUga2V5IHRvIGFjY2VzcyB0aGUgY29udGV4dCdzIGRhdGFcbiAgICBpZih0aGlzLmluZGV4TmFtZSkge1xuICAgICAgbmV3X2RhdGFbdGhpcy5pbmRleE5hbWVdID0ga2V5O1xuICAgIH1cbiAgICB2YXIgbmV3X2NvbnRleHQgPSBuZXcgQ29udGV4dChuZXdfZGF0YSwgY29udGV4dCk7XG4gICAgLy8ga2VlcCB0cmFjayBvZiB3aGVyZSB0aGUgZGF0YSBpcyBjb21pbmcgZnJvbVxuICAgIG5ld19jb250ZXh0LmFkZEFsaWFzKHRoaXMuc291cmNlTmFtZSArICcuJyArIGtleSwgdGhpcy5hbGlhcyk7XG4gICAgdCA9IHQuY29uY2F0KHRoaXMudHJlZUNoaWxkcmVuKG5ld19jb250ZXh0LCBwYXRoLCB0Lmxlbmd0aCArIHBvcykpO1xuICB9XG4gIHJldHVybiB0O1xufTtcblxuZnVuY3Rpb24gSWZOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmJ1aWxkKGNvbnRlbnQucmVwbGFjZSgvXmlmL2csIFwiXCIpKTtcbiAgcGFyZW50LmNoaWxkcmVuLnB1c2godGhpcyk7XG59XG51dGlsLmluaGVyaXRzKElmTm9kZSwgTm9kZSk7XG5cbklmTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICBpZighdGhpcy5leHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpKSB7XG4gICAgaWYodGhpcy5lbHNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbHNlLnRyZWUoY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIHJldHVybiB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLnNlYXJjaElmKGN1cnJlbnROb2RlKTtcbn1cbnV0aWwuaW5oZXJpdHMoRWxzZU5vZGUsIE5vZGUpO1xuXG5FbHNlTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICByZXR1cm4gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIElmRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmJ1aWxkKGNvbnRlbnQucmVwbGFjZSgvXmVsc2VpZi9nLCBcIlwiKSk7XG4gIHRoaXMuc2VhcmNoSWYoY3VycmVudE5vZGUpO1xufVxuLy8gaW1wb3J0YW50IHRvIGJlIGFuIElmTm9kZVxudXRpbC5pbmhlcml0cyhJZkVsc2VOb2RlLCBJZk5vZGUpO1xuXG5JZkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZiA9IGZ1bmN0aW9uIHNlYXJjaElmKGN1cnJlbnROb2RlKSB7XG4gIC8vIGZpcnN0IG5vZGUgb24gdGhlIHNhbWUgbGV2ZWwgaGFzIHRvIGJlIHRoZSBpZi9lbHNlaWYgbm9kZVxuICB3aGlsZShjdXJyZW50Tm9kZSkge1xuICAgIGlmKGN1cnJlbnROb2RlLmxldmVsIDwgdGhpcy5sZXZlbCkge1xuICAgICAgdGhpcy5jZXJyb3IoXCJjYW5ub3QgZmluZCBhIGNvcnJlc3BvbmRpbmcgaWYtbGlrZSBzdGF0ZW1lbnQgYXQgdGhlIHNhbWUgbGV2ZWwuXCIpO1xuICAgIH1cbiAgICBpZihjdXJyZW50Tm9kZS5sZXZlbCA9PSB0aGlzLmxldmVsKSB7XG4gICAgICBpZighKGN1cnJlbnROb2RlIGluc3RhbmNlb2YgSWZOb2RlKSkge1xuICAgICAgICB0aGlzLmNlcnJvcihcImF0IHRoZSBzYW1lIGxldmVsIGlzIG5vdCBhIGlmLWxpa2Ugc3RhdGVtZW50LlwiKTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnROb2RlLmVsc2UgPSB0aGlzO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUucGFyZW50O1xuICB9XG59O1xuRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmID0gSWZFbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWY7XG5cbmZ1bmN0aW9uIEV4cHJlc3Npb25Ob2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gXCIjdGV4dFwiO1xuICB2YXIgbSA9IGNvbnRlbnQubWF0Y2goZXhwcmVzc2lvbi5FWFBSRVNTSU9OX1JFRyk7XG4gIGlmKCFtKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJkZWNsYXJlZCBpbXByb3Blcmx5XCIpO1xuICB9XG4gIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uYnVpbGQobVsxXSk7XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoRXhwcmVzc2lvbk5vZGUsIE5vZGUpO1xuXG5FeHByZXNzaW9uTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgLy8gcmVuZGVyZXJcbiAgdmFyIHJlbmRlcmVyID0gU3RyaW5nKHRoaXMuZXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KSk7XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgcmVuZGVyZXIsIHBhdGgpO1xuICByZXR1cm4gdDtcbn07XG5cbkV4cHJlc3Npb25Ob2RlLnByb3RvdHlwZS5kb21Ob2RlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGhpcy5leHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpKTtcbn07XG5cbmZ1bmN0aW9uIFN0cmluZ05vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubm9kZU5hbWUgPSBcIiN0ZXh0XCI7XG4gIHRoaXMuc3RyaW5nID0gdGhpcy5jb250ZW50LnJlcGxhY2UoL15cInxcIiQvZywgXCJcIikucmVwbGFjZSgvXFxcXFwiL2csICdcIicsICdnbScpO1xuICB0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uY29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyh0aGlzLnN0cmluZyk7XG4gIGlmKHBhcmVudCkge1xuICAgIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbiAgfVxufVxudXRpbC5pbmhlcml0cyhTdHJpbmdOb2RlLCBOb2RlKTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgLy8gcmVuZGVyZXIgc2hvdWxkIGJlIGFsbCBhdHRyaWJ1dGVzXG4gIHZhciByZW5kZXJlciA9IGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCk7XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgcmVuZGVyZXIsIHBhdGgpO1xuICByZXR1cm4gdDtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KTtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpKTtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24oY2hpbGQpIHtcbiAgdGhpcy5jZXJyb3IoXCJjYW5ub3QgaGF2ZSBjaGlsZHJlbiBcIiArIGNoaWxkKTtcbn07XG5cbmZ1bmN0aW9uIEluY2x1ZGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5hbWUgPSB1dGlsLnRyaW0oY29udGVudC5zcGxpdChcIiBcIilbMV0pO1xuICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZVt0aGlzLm5hbWVdO1xuICBpZih0aGlzLnRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLmNlcnJvcihcIlRlbXBsYXRlIHdpdGggbmFtZSBcIiArIHRoaXMubmFtZSArIFwiIGlzIG5vdCByZWdpc3RlcmVkXCIpO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSW5jbHVkZU5vZGUsIE5vZGUpO1xuXG5JbmNsdWRlTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZS50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIENvbXBvbmVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudCkuc3Vic3RyKDEwKTtcbiAgdmFyIG5hbWUgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgaWYoIW5hbWUpIHtcbiAgICB0aGlzLmNlcnJvcihcIkNvbXBvbmVudCBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cihuYW1lWzBdLmxlbmd0aCkpO1xuICB0aGlzLm5hbWUgPSBuYW1lWzBdO1xuICB0aGlzLmF0dHJzID0gcGFyc2VBdHRyaWJ1dGVzKGNvbnRlbnQsIHRoaXMpO1xuICB0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudENhY2hlW3RoaXMubmFtZV07XG4gIGlmKHRoaXMuY29tcG9uZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLmNlcnJvcihcIkNvbXBvbmVudCB3aXRoIG5hbWUgXCIgKyB0aGlzLm5hbWUgKyBcIiBpcyBub3QgcmVnaXN0ZXJlZFwiKTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKENvbXBvbmVudE5vZGUsIE5vZGUpO1xuXG5Db21wb25lbnROb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciBuZXdfY29udGV4dCA9IG5ldyBDb250ZXh0KHt9LCBjb250ZXh0KTtcbiAgdmFyIGtleSwgYXR0ciwgdmFsdWUsIHNvdXJjZTtcbiAgZm9yKGtleSBpbiB0aGlzLmF0dHJzKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnNba2V5XTtcbiAgICBpZihhdHRyLmV2YWx1YXRlKSB7XG4gICAgICB2YWx1ZSA9IGF0dHIuZXZhbHVhdGUoY29udGV4dCk7XG4gICAgICAvLyB0b2RvIDogaWYgZXhwcmVzc2lvbiBhdHRyaWJ1dGUsIGFkZCBhbiBhbGlhc1xuICAgICAgaWYodmFsdWUgPT09IGZhbHNlKSB7XG4gICAgICAgIC8vIG5vdGhpbmdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld19jb250ZXh0LnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgc291cmNlID0gYmluZGluZ05hbWUoYXR0cik7XG4gICAgICAgIGlmKHNvdXJjZSAmJiBrZXkgIT0gc291cmNlKSB7XG4gICAgICAgICAgbmV3X2NvbnRleHQuYWRkQWxpYXMoc291cmNlLCBrZXkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vbmV3X2NvbnRleHQuc2V0KGtleSwgdmFsdWUpO1xuICAgIH1cbiAgfVxuICBpZih0aGlzLmNvbXBvbmVudC5jb250cm9sbGVyKXtcbiAgICB0aGlzLmNvbXBvbmVudC5jb250cm9sbGVyKG5ld19jb250ZXh0KTtcbiAgfVxuICByZXR1cm4gdGhpcy5jb21wb25lbnQudGVtcGxhdGUudHJlZUNoaWxkcmVuKG5ld19jb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuQ29tcG9uZW50Tm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gIHJldHVybiB0aGlzLmNvbXBvbmVudC50ZW1wbGF0ZS5yZXByKGxldmVsICsgMSk7XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIHZhciBub2RlO1xuICBpZihjb250ZW50Lmxlbmd0aCA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgU3RyaW5nTm9kZShwYXJlbnQsIFwiXFxuXCIsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCcjJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IENvbW1lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2lmICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBJZk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignZWxzZWlmICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBJZkVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSwgY3VycmVudE5vZGUpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdlbHNlJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSwgY3VycmVudE5vZGUpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdmb3IgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEZvck5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignaW5jbHVkZSAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgSW5jbHVkZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignY29tcG9uZW50ICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBDb21wb25lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ1wiJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IFN0cmluZ05vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKC9eXFx3Ly5leGVjKGNvbnRlbnQpKSB7XG4gICAgbm9kZSA9IG5ldyBIdG1sTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCd7eycpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBFeHByZXNzaW9uTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcImNyZWF0ZU5vZGU6IHVua25vdyBub2RlIHR5cGUgXCIgKyBjb250ZW50KTtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gYnVpbGRUZW1wbGF0ZSh0cGwsIHRlbXBsYXRlTmFtZSkge1xuXG4gIGlmKHR5cGVvZiB0cGwgPT0gJ29iamVjdCcpIHtcbiAgICB0cGwgPSB0cGwuam9pbignXFxuJyk7XG4gIH1cblxuICB2YXIgcm9vdCA9IG5ldyBOb2RlKG51bGwsIFwiXCIsIDApLCBsaW5lcywgbGluZSwgbGV2ZWwsXG4gICAgY29udGVudCwgaSwgY3VycmVudE5vZGUgPSByb290LCBwYXJlbnQsIHNlYXJjaE5vZGU7XG5cbiAgbGluZXMgPSB0cGwuc3BsaXQoXCJcXG5cIik7XG5cbiAgZm9yKGk9MDsgaTxsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGxpbmUgPSBsaW5lc1tpXTtcbiAgICBsZXZlbCA9IGxpbmUubWF0Y2goL1xccyovKVswXS5sZW5ndGggKyAxO1xuICAgIGNvbnRlbnQgPSBsaW5lLnNsaWNlKGxldmVsIC0gMSk7XG5cbiAgICAvLyBtdWx0aWxpbmUgc3VwcG9ydDogZW5kcyB3aXRoIGEgXFxcbiAgICB2YXIgaiA9IDA7XG4gICAgd2hpbGUoY29udGVudC5tYXRjaCgvXFxcXCQvKSkge1xuICAgICAgICBqKys7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1xcXFwkLywgJycpICsgbGluZXNbaStqXTtcbiAgICB9XG4gICAgaSA9IGkgKyBqO1xuXG4gICAgLy8gbXVsdGlsaW5lIHN0cmluZ3NcbiAgICBqID0gMDtcbiAgICBpZihjb250ZW50Lm1hdGNoKC9eXCJcIlwiLykpIHtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXlwiXCJcIi8sICdcIicpO1xuICAgICAgICB3aGlsZSghY29udGVudC5tYXRjaCgvXCJcIlwiJC8pKSB7XG4gICAgICAgICAgICBqKys7XG4gICAgICAgICAgICBpZihpK2ogPiBsaW5lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiTXVsdGlsaW5lIHN0cmluZyBzdGFydGVkIGJ1dCB1bmZpbmlzaGVkIGF0IGxpbmUgXCIgKyAoaSArIDEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50ICsgbGluZXNbaStqXTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cIlwiXCIkLywgJ1wiJyk7XG4gICAgfVxuICAgIGkgPSBpICsgajtcblxuICAgIHNlYXJjaE5vZGUgPSBjdXJyZW50Tm9kZTtcbiAgICBwYXJlbnQgPSBudWxsO1xuXG4gICAgLy8gc2VhcmNoIGZvciB0aGUgcGFyZW50IG5vZGVcbiAgICB3aGlsZSh0cnVlKSB7XG5cbiAgICAgIGlmKGxldmVsID4gc2VhcmNoTm9kZS5sZXZlbCkge1xuICAgICAgICBwYXJlbnQgPSBzZWFyY2hOb2RlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYoIXNlYXJjaE5vZGUucGFyZW50KSB7XG4gICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkluZGVudGF0aW9uIGVycm9yIGF0IGxpbmUgXCIgKyAoaSArIDEpKTtcbiAgICAgIH1cblxuICAgICAgaWYobGV2ZWwgPT0gc2VhcmNoTm9kZS5sZXZlbCkge1xuICAgICAgICBwYXJlbnQgPSBzZWFyY2hOb2RlLnBhcmVudDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIHNlYXJjaE5vZGUgPSBzZWFyY2hOb2RlLnBhcmVudDtcbiAgICB9XG5cbiAgICBpZihwYXJlbnQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICBpZihwYXJlbnQuY2hpbGRyZW5bMF0ubGV2ZWwgIT0gbGV2ZWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW5kZW50YXRpb24gZXJyb3IgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBub2RlID0gY3JlYXRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBpLCBjdXJyZW50Tm9kZSk7XG4gICAgY3VycmVudE5vZGUgPSBub2RlO1xuXG4gIH1cbiAgaWYodGVtcGxhdGVOYW1lKSB7XG4gICAgdGVtcGxhdGVDYWNoZVt0ZW1wbGF0ZU5hbWVdID0gcm9vdDtcbiAgfVxuXG4gIHJldHVybiByb290O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGRUZW1wbGF0ZTogYnVpbGRUZW1wbGF0ZSxcbiAgcGFyc2VBdHRyaWJ1dGVzOiBwYXJzZUF0dHJpYnV0ZXMsXG4gIENvbnRleHQ6IENvbnRleHQsXG4gIHRlbXBsYXRlQ2FjaGU6IHRlbXBsYXRlQ2FjaGUsXG4gIGNvbXBvbmVudENhY2hlOiBjb21wb25lbnRDYWNoZSxcbiAgQ29udGV4dE5hbWU6IENvbnRleHROYW1lXG59OyIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGluaGVyaXRzKGNoaWxkLCBwYXJlbnQpIHtcbiAgY2hpbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlKTtcbiAgY2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY2hpbGQ7XG59XG5cbmZ1bmN0aW9uIENvbXBpbGVFcnJvcihtc2cpIHtcbiAgdGhpcy5uYW1lID0gXCJDb21waWxlRXJyb3JcIjtcbiAgdGhpcy5tZXNzYWdlID0gKG1zZyB8fCBcIlwiKTtcbn1cbkNvbXBpbGVFcnJvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGU7XG5cbmZ1bmN0aW9uIFJ1bnRpbWVFcnJvcihtc2cpIHtcbiAgdGhpcy5uYW1lID0gXCJSdW50aW1lRXJyb3JcIjtcbiAgdGhpcy5tZXNzYWdlID0gKG1zZyB8fCBcIlwiKTtcbn1cblJ1bnRpbWVFcnJvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGU7XG5cbmZ1bmN0aW9uIGVzY2FwZSh1bnNhZmUpIHtcbiAgcmV0dXJuIHVuc2FmZVxuICAgIC5yZXBsYWNlKC8mL2csIFwiJmFtcDtcIilcbiAgICAucmVwbGFjZSgvPC9nLCBcIiZsdDtcIilcbiAgICAucmVwbGFjZSgvPi9nLCBcIiZndDtcIilcbiAgICAucmVwbGFjZSgvXCIvZywgXCImcXVvdDtcIilcbiAgICAucmVwbGFjZSgvJy9nLCBcIiYjMDM5O1wiKTtcbn1cblxuZnVuY3Rpb24gdHJpbSh0eHQpIHtcbiAgcmV0dXJuIHR4dC5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nICxcIlwiKTtcbn1cblxuZnVuY3Rpb24gZXZlbnQobmFtZSwgZGF0YSkge1xuICB2YXIgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJDdXN0b21FdmVudFwiKTtcbiAgZXZ0LmluaXRDdXN0b21FdmVudChuYW1lLCBmYWxzZSwgZmFsc2UsIGRhdGEpO1xuICByZXR1cm4gZXZ0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5oZXJpdHM6aW5oZXJpdHMsXG4gIENvbXBpbGVFcnJvcjpDb21waWxlRXJyb3IsXG4gIFJ1bnRpbWVFcnJvcjpSdW50aW1lRXJyb3IsXG4gIGVzY2FwZTplc2NhcGUsXG4gIHRyaW06dHJpbSxcbiAgZXZlbnQ6ZXZlbnRcbn07Il19
(2)
});
