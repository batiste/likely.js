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

var nameReg = /[a-zA-Z_$][0-9a-zA-Z_$]*/gm;

function replaceNames(str) {
  return str.replace(nameReg, function(_name) {
    if(!_name.match(/^_ctx./)) {
      return '_ctx.get("'+_name+'")';
    }
    return _name;
  });
}

function jsExpression(source) {
  var newSource = replaceOutOfStrings(source);
  return new Function('_ctx', 'return ' + newSource);
}

module.exports = {
  build:build,
  compileTextAndExpressions:compileTextAndExpressions,
  buildExpressions:buildExpressions,
  parseExpressions:parseExpressions,
  evaluateExpressionList:evaluateExpressionList,
  StringValue:StringValue,
  Name:Name,
  jsExpression:jsExpression,
  replaceNames:replaceNames,
  replaceOutOfStrings:replaceOutOfStrings,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5cInVzZSBzdHJpY3RcIjtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBFWFBSRVNTSU9OX1JFRyA9IC9ee3soLis/KX19LztcblxuLy8gRXhwcmVzc2lvbiBldmFsdWF0aW9uIGVuZ2luZVxuZnVuY3Rpb24gU3RyaW5nVmFsdWUodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwidmFsdWVcIjtcbiAgaWYodHh0WzBdID09ICdcIicpIHtcbiAgICB0aGlzLnZhbHVlID0gdHh0LnJlcGxhY2UoL15cInxcIiQvZywgXCJcIik7XG4gIH0gZWxzZSBpZih0eHRbMF0gPT0gXCInXCIpIHtcbiAgICB0aGlzLnZhbHVlID0gdHh0LnJlcGxhY2UoL14nfCckL2csIFwiXCIpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkludmFsaWQgc3RyaW5nIHZhbHVlIFwiICsgdHh0KTtcbiAgfVxufVxuU3RyaW5nVmFsdWUucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy52YWx1ZTtcbn07XG5TdHJpbmdWYWx1ZS5yZWcgPSAvXlwiKD86XFxcXFwifFteXCJdKSpcInxeJyg/OlxcXFwnfFteJ10pKicvO1xuXG5mdW5jdGlvbiBFcXVhbE9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuRXF1YWxPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgPT0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5FcXVhbE9wZXJhdG9yLnJlZyA9IC9ePT0vO1xuXG5mdW5jdGlvbiBOb3RFcXVhbE9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuTm90RXF1YWxPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgIT0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbn07XG5Ob3RFcXVhbE9wZXJhdG9yLnJlZyA9IC9eIT0vO1xuXG5mdW5jdGlvbiBCaWdnZXJPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gXCJvcGVyYXRvclwiO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbkJpZ2dlck9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSA+IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuQmlnZ2VyT3BlcmF0b3IucmVnID0gL14+LztcblxuZnVuY3Rpb24gU21hbGxlck9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuU21hbGxlck9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSA8IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuU21hbGxlck9wZXJhdG9yLnJlZyA9IC9ePC87XG5cbmZ1bmN0aW9uIE9yT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwib3BlcmF0b3JcIjtcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5Pck9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSB8fCB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbk9yT3BlcmF0b3IucmVnID0gL15vci87XG5cbmZ1bmN0aW9uIEFuZE9wZXJhdG9yKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcIm9wZXJhdG9yXCI7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuQW5kT3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpICYmIHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuQW5kT3BlcmF0b3IucmVnID0gL15hbmQvO1xuXG5mdW5jdGlvbiBOYW1lKHR4dCkge1xuICB0aGlzLnR5cGUgPSBcInZhbHVlXCI7XG4gIHRoaXMubmFtZSA9IHR4dDtcbn1cbk5hbWUucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgdmFsdWUgPSBjb250ZXh0LmdldCh0aGlzLm5hbWUpO1xuICByZXR1cm4gdmFsdWU7XG59O1xuTmFtZS5yZWcgPSAvXltBLVphLXpdW1xcd1xcLl17MCx9LztcblxuZnVuY3Rpb24gRmlsdGVyKHR4dCkge1xuICB0aGlzLnR5cGUgPSAnb3BlcmF0b3InO1xuICB0aGlzLmxlZnQgPSBudWxsO1xuICB0aGlzLnJpZ2h0ID0gbnVsbDtcbn1cbkZpbHRlci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHZhciBmY3QgPSBjb250ZXh0LmdldCh0aGlzLnJpZ2h0Lm5hbWUpO1xuICByZXR1cm4gZmN0LmFwcGx5KHRoaXMsIFt0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCksIGNvbnRleHRdKTtcbn07XG5GaWx0ZXIucmVnID0gL15cXHwvO1xuXG4vLyBtYXRoXG5cbmZ1bmN0aW9uIE11bHRpcGx5T3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9ICdvcGVyYXRvcic7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuTXVsdGlwbHlPcGVyYXRvci5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCkgKiB0aGlzLnJpZ2h0LmV2YWx1YXRlKGNvbnRleHQpO1xufTtcbk11bHRpcGx5T3BlcmF0b3IucmVnID0gL15cXCovO1xuXG5mdW5jdGlvbiBQbHVzT3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9ICdvcGVyYXRvcic7XG4gIHRoaXMubGVmdCA9IG51bGw7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuUGx1c09wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSArIHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuUGx1c09wZXJhdG9yLnJlZyA9IC9eXFwrLztcblxuZnVuY3Rpb24gTWludXNPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5NaW51c09wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIHRoaXMubGVmdC5ldmFsdWF0ZShjb250ZXh0KSAtIHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuTWludXNPcGVyYXRvci5yZWcgPSAvXlxcLS87XG5cbmZ1bmN0aW9uIEZ1bmN0aW9uQ2FsbCh0eHQpIHtcbiAgdGhpcy50eXBlID0gJ3ZhbHVlJztcbiAgdmFyIG0gPSB0eHQubWF0Y2goL14oW2EtekEtWl1bYS16QS1aMC05XFwuXSopXFwoKFteXFwpXSopXFwpLyksIGk7XG4gIHRoaXMuZnVuY05hbWUgPSBtWzFdO1xuICAvLyBUT0RPOiB0aGlzIGEgd2VhayB3YXkgdG8gcGFyc2UgdGhpbmdzXG4gIHRoaXMucGFyYW1zID0gW107XG4gIHZhciBwYXJhbXMgPSBtWzJdLnNwbGl0KCcsJyk7XG4gIGZvcihpPTA7IGk8cGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYocGFyYW1zW2ldKSB7XG4gICAgICB0aGlzLnBhcmFtcy5wdXNoKGJ1aWxkKHBhcmFtc1tpXSkpO1xuICAgIH1cbiAgfVxufVxuRnVuY3Rpb25DYWxsLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIGZ1bmMgPSBjb250ZXh0LmdldCh0aGlzLmZ1bmNOYW1lKSwgaSwgcGFyYW1zPVtdO1xuICBmb3IoaT0wOyBpPHRoaXMucGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgcGFyYW1zLnB1c2godGhpcy5wYXJhbXNbaV0uZXZhbHVhdGUoY29udGV4dCkpO1xuICB9XG4gIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIHBhcmFtcyk7XG59O1xuRnVuY3Rpb25DYWxsLnJlZyA9IC9eW2EtekEtWl1bYS16QS1aMC05XFwuXSpcXChbXlxcKV0qXFwpLztcblxuZnVuY3Rpb24gTnVtYmVyVmFsdWUodHh0KSB7XG4gIHRoaXMudHlwZSA9IFwidmFsdWVcIjtcbiAgdGhpcy5udW1iZXIgPSBwYXJzZUZsb2F0KHR4dCwgMTApO1xuICB0aGlzLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLm51bWJlcjtcbiAgfTtcbn1cbk51bWJlclZhbHVlLnJlZyA9IC9eWzAtOV0rLztcblxuZnVuY3Rpb24gSWZPcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5JZk9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIHJ2ID0gdGhpcy5yaWdodC5ldmFsdWF0ZShjb250ZXh0KTtcbiAgaWYocnYpIHtcbiAgICByZXR1cm4gdGhpcy5sZWZ0LmV2YWx1YXRlKGNvbnRleHQpO1xuICB9XG4gIHJldHVybiBydjtcbn07XG5JZk9wZXJhdG9yLnJlZyA9IC9eaWYgLztcblxuZnVuY3Rpb24gSW5PcGVyYXRvcih0eHQpIHtcbiAgdGhpcy50eXBlID0gJ29wZXJhdG9yJztcbiAgdGhpcy5sZWZ0ID0gbnVsbDtcbiAgdGhpcy5yaWdodCA9IG51bGw7XG59XG5Jbk9wZXJhdG9yLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIGxlZnQgPSB0aGlzLmxlZnQuZXZhbHVhdGUoY29udGV4dCk7XG4gIHZhciByaWdodCA9IHRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG4gIGlmKHJpZ2h0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5SdW50aW1lRXJyb3IoJ3JpZ2h0IHNpZGUgb2YgaW4gb3BlcmF0b3IgY2Fubm90IGJlIHVuZGVmaW5lZCcpO1xuICB9XG4gIGlmKHJpZ2h0LmluZGV4T2YpIHtcbiAgICByZXR1cm4gcmlnaHQuaW5kZXhPZihsZWZ0KSAhPSAtMTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmlnaHQuaGFzT3duUHJvcGVydHkobGVmdCk7XG4gIH1cbn07XG5Jbk9wZXJhdG9yLnJlZyA9IC9eaW4gLztcblxuZnVuY3Rpb24gTm90T3BlcmF0b3IodHh0KSB7XG4gIHRoaXMudHlwZSA9ICd1bmFyeSc7XG4gIHRoaXMucmlnaHQgPSBudWxsO1xufVxuTm90T3BlcmF0b3IucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gIXRoaXMucmlnaHQuZXZhbHVhdGUoY29udGV4dCk7XG59O1xuTm90T3BlcmF0b3IucmVnID0gL15ub3QgLztcblxuZnVuY3Rpb24gY29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyh0eHQpIHtcbiAgLy8gY29tcGlsZSB0aGUgZXhwcmVzc2lvbnMgZm91bmQgaW4gdGhlIHRleHRcbiAgLy8gYW5kIHJldHVybiBhIGxpc3Qgb2YgdGV4dCtleHByZXNzaW9uXG4gIHZhciBleHByLCBhcm91bmQ7XG4gIHZhciBsaXN0ID0gW107XG4gIHdoaWxlKHRydWUpIHtcbiAgICB2YXIgbWF0Y2ggPSAve3soLis/KX19Ly5leGVjKHR4dCk7XG4gICAgaWYoIW1hdGNoKSB7XG4gICAgICBpZih0eHQpIHtcbiAgICAgICAgbGlzdC5wdXNoKHR4dCk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZXhwciA9IGJ1aWxkKG1hdGNoWzFdKTtcbiAgICBhcm91bmQgPSB0eHQuc3BsaXQobWF0Y2hbMF0sIDIpO1xuICAgIGlmKGFyb3VuZFswXS5sZW5ndGgpIHtcbiAgICAgIGxpc3QucHVzaChhcm91bmRbMF0pO1xuICAgIH1cbiAgICBsaXN0LnB1c2goZXhwcik7XG4gICAgdHh0ID0gYXJvdW5kWzFdO1xuICB9XG4gIHJldHVybiBsaXN0O1xufVxuXG5mdW5jdGlvbiBldmFsdWF0ZUV4cHJlc3Npb25MaXN0KGV4cHJlc3Npb25zLCBjb250ZXh0KSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBmb3IoaT0wOyBpPGV4cHJlc3Npb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHBhcmFtID0gZXhwcmVzc2lvbnNbaV07XG4gICAgaWYocGFyYW0uZXZhbHVhdGUpIHtcbiAgICAgIHN0ciArPSBwYXJhbS5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9IHBhcmFtO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufVxuXG4vLyBsaXN0IG9yZGVyIGRlZmluZSBvcGVyYXRvciBwcmVjZWRlbmNlXG52YXIgZXhwcmVzc2lvbl9saXN0ID0gW1xuICBNdWx0aXBseU9wZXJhdG9yLFxuICBQbHVzT3BlcmF0b3IsXG4gIE1pbnVzT3BlcmF0b3IsXG4gIEJpZ2dlck9wZXJhdG9yLFxuICBTbWFsbGVyT3BlcmF0b3IsXG4gIEVxdWFsT3BlcmF0b3IsXG4gIE5vdEVxdWFsT3BlcmF0b3IsXG4gIEZpbHRlcixcbiAgSW5PcGVyYXRvcixcbiAgTm90T3BlcmF0b3IsXG4gIElmT3BlcmF0b3IsXG4gIE9yT3BlcmF0b3IsXG4gIEFuZE9wZXJhdG9yLFxuICBTdHJpbmdWYWx1ZSxcbiAgTnVtYmVyVmFsdWUsXG4gIEZ1bmN0aW9uQ2FsbCxcbiAgTmFtZSxcbl07XG5cbmZ1bmN0aW9uIGJ1aWxkKGlucHV0KSB7XG4gIHJldHVybiBidWlsZEV4cHJlc3Npb25zKHBhcnNlRXhwcmVzc2lvbnMoaW5wdXQpKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VFeHByZXNzaW9ucyhpbnB1dCkge1xuICAvLyBSZXR1cm4gYSBsaXN0IG9mIGV4cHJlc3Npb25zXG4gIHZhciBjdXJyZW50RXhwciA9IG51bGwsIGksIGV4cHIsIG1hdGNoLCBmb3VuZCwgcGFyc2VkID0gW107XG4gIHdoaWxlKGlucHV0KSB7XG4gICAgaW5wdXQgPSB1dGlsLnRyaW0oaW5wdXQpO1xuICAgIGZvdW5kID0gZmFsc2U7XG4gICAgZm9yKGk9MDsgaTxleHByZXNzaW9uX2xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZXhwciA9IGV4cHJlc3Npb25fbGlzdFtpXTtcbiAgICAgICAgbWF0Y2ggPSBleHByLnJlZy5leGVjKGlucHV0KTtcbiAgICAgICAgaWYobWF0Y2gpIHtcbiAgICAgICAgICBpbnB1dCA9IGlucHV0LnNsaWNlKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgICAgcGFyc2VkLnB1c2gobmV3IGV4cHIobWF0Y2hbMF0sIGN1cnJlbnRFeHByKSk7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIC8vIHN0YXJ0aW5nIGFnYWluIHRvIHJlc3BlY3QgcHJlY2VkZW5jZVxuICAgICAgICAgIGkgPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmKGZvdW5kID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiRXhwcmVzc2lvbiBwYXJzZXI6IEltcG9zc2libGUgdG8gcGFyc2UgZnVydGhlciA6IFwiICsgaW5wdXQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcGFyc2VkO1xufVxuXG5mdW5jdGlvbiBidWlsZEV4cHJlc3Npb25zKGxpc3QpIHtcbiAgLy8gYnVpbGQgYSB0cmVlIG9mIGV4cHJlc3Npb24gcmVzcGVjdGluZyBwcmVjZWRlbmNlXG4gIHZhciBpLCBqLCBleHByO1xuICAvLyBhIGR1bWIgYWxnbyB0aGF0IHdvcmtzXG4gIGZvcihpPTA7IGk8ZXhwcmVzc2lvbl9saXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yKGo9MDsgajxsaXN0Lmxlbmd0aDsgaisrKSB7XG4gICAgICBpZihsaXN0Lmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIHJldHVybiBsaXN0WzBdO1xuICAgICAgfVxuICAgICAgZXhwciA9IGxpc3Rbal07XG4gICAgICBpZihleHByIGluc3RhbmNlb2YgZXhwcmVzc2lvbl9saXN0W2ldKSB7XG4gICAgICAgIGlmKGV4cHIudHlwZSA9PSAnb3BlcmF0b3InKSB7XG4gICAgICAgICAgZXhwci5sZWZ0ID0gbGlzdFtqLTFdO1xuICAgICAgICAgIGV4cHIucmlnaHQgPSBsaXN0W2orMV07XG4gICAgICAgICAgbGlzdC5zcGxpY2Uoai0xLCAyKTtcbiAgICAgICAgICBsaXN0W2otMV0gPSBleHByO1xuICAgICAgICAgIGogPSBqIC0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZihleHByLnR5cGUgPT0gJ3VuYXJ5Jykge1xuICAgICAgICAgIGV4cHIucmlnaHQgPSBsaXN0W2orMV07XG4gICAgICAgICAgbGlzdC5zcGxpY2UoaisxLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBpZihleHByLnR5cGUgPT0gJ3ZhbHVlJykge1xuICAgICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkV4cHJlc3Npb24gYnVpbGRlcjogZXhwZWN0ZWQgYW4gb3BlcmF0b3IgYnV0IGdvdCBcIiArIGV4cHIuY29uc3RydWN0b3IubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVwbGFjZU91dE9mU3RyaW5ncyhzdHIpIHtcbiAgdmFyIGluZGV4ID0gMCwgbGVuZ3RoID0gc3RyLmxlbmd0aCwgY2g7XG4gIHZhciBuZXdfc3RyID0gXCJcIiwgaW5TdHJpbmcgPSBudWxsLCBzdGFydCA9IDA7XG4gIHdoaWxlKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgY2ggPSBzdHIuY2hhckF0KGluZGV4KTtcbiAgICBpZihjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICBpbmRleCA9IGluZGV4ICsgMjtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZihjaCA9PT0gJ1wiJyB8fCBjaCA9PT0gXCInXCIpIHtcbiAgICAgIC8vIGNsb3NpbmcgYSBzdHJpbmdcbiAgICAgIGlmKGluU3RyaW5nID09PSBjaCkge1xuICAgICAgICBpblN0cmluZyA9IG51bGw7XG4gICAgICAgIG5ld19zdHIgPSBuZXdfc3RyICsgc3RyLnNsaWNlKHN0YXJ0LCBpbmRleCk7XG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBvcGVuaW5nIGEgc3RyaW5nXG4gICAgICAgIG5ld19zdHIgPSBuZXdfc3RyICsgcmVwbGFjZU5hbWVzKHN0ci5zbGljZShzdGFydCwgaW5kZXgpKTtcbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgaW5TdHJpbmcgPSBjaDtcbiAgICAgIH1cbiAgICB9XG4gICAgaW5kZXggPSBpbmRleCArIDE7XG4gIH1cbiAgbmV3X3N0ciArPSByZXBsYWNlTmFtZXMoc3RyLnNsaWNlKHN0YXJ0LCBpbmRleCkpO1xuICByZXR1cm4gbmV3X3N0cjtcbn1cblxudmFyIG5hbWVSZWcgPSAvW2EtekEtWl8kXVswLTlhLXpBLVpfJF0qL2dtO1xuXG5mdW5jdGlvbiByZXBsYWNlTmFtZXMoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZShuYW1lUmVnLCBmdW5jdGlvbihfbmFtZSkge1xuICAgIGlmKCFfbmFtZS5tYXRjaCgvXl9jdHguLykpIHtcbiAgICAgIHJldHVybiAnX2N0eC5nZXQoXCInK19uYW1lKydcIiknO1xuICAgIH1cbiAgICByZXR1cm4gX25hbWU7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBqc0V4cHJlc3Npb24oc291cmNlKSB7XG4gIHZhciBuZXdTb3VyY2UgPSByZXBsYWNlT3V0T2ZTdHJpbmdzKHNvdXJjZSk7XG4gIHJldHVybiBuZXcgRnVuY3Rpb24oJ19jdHgnLCAncmV0dXJuICcgKyBuZXdTb3VyY2UpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGQ6YnVpbGQsXG4gIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnM6Y29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyxcbiAgYnVpbGRFeHByZXNzaW9uczpidWlsZEV4cHJlc3Npb25zLFxuICBwYXJzZUV4cHJlc3Npb25zOnBhcnNlRXhwcmVzc2lvbnMsXG4gIGV2YWx1YXRlRXhwcmVzc2lvbkxpc3Q6ZXZhbHVhdGVFeHByZXNzaW9uTGlzdCxcbiAgU3RyaW5nVmFsdWU6U3RyaW5nVmFsdWUsXG4gIE5hbWU6TmFtZSxcbiAganNFeHByZXNzaW9uOmpzRXhwcmVzc2lvbixcbiAgcmVwbGFjZU5hbWVzOnJlcGxhY2VOYW1lcyxcbiAgcmVwbGFjZU91dE9mU3RyaW5nczpyZXBsYWNlT3V0T2ZTdHJpbmdzLFxuICBFWFBSRVNTSU9OX1JFRzpFWFBSRVNTSU9OX1JFR1xufTsiLCIvKiBMaWtlbHkuanMsXG4gICBQeXRob24gc3R5bGUgSFRNTCB0ZW1wbGF0ZSBsYW5ndWFnZSB3aXRoIGJpLWRpcmVjdGlvbm5hbCBkYXRhIGJpbmRpbmdcbiAgIGJhdGlzdGUgYmllbGVyIDIwMTQgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJyk7XG52YXIgZXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vZXhwcmVzc2lvbicpO1xudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZScpO1xuXG5mdW5jdGlvbiB1cGRhdGVEYXRhKGNvbnRleHQsIGRvbSkge1xuICB2YXIgbmFtZSA9IGRvbS5nZXRBdHRyaWJ1dGUoXCJsay1iaW5kXCIpLCB2YWx1ZTtcbiAgaWYoIW5hbWUpIHtcbiAgICB0aHJvdyBcIk5vIGxrLWJpbmQgYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50XCI7XG4gIH1cbiAgaWYoZG9tLnR5cGUgPT0gJ2NoZWNrYm94JyAmJiAhZG9tLmNoZWNrZWQpIHtcbiAgICB2YWx1ZSA9IFwiXCI7XG4gIH0gZWxzZSB7XG4gICAgdmFsdWUgPSBkb20udmFsdWU7Ly8gfHwgZG9tLmdldEF0dHJpYnV0ZShcInZhbHVlXCIpO1xuICB9XG4gIC8vIHVwZGF0ZSB0aGUgY29udGV4dFxuICBjb250ZXh0Lm1vZGlmeShuYW1lLCB2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIEJpbmRpbmcoZG9tLCB0cGwsIGRhdGEpIHtcbiAgaWYgKHRoaXMuY29uc3RydWN0b3IgIT09IEJpbmRpbmcpIHtcbiAgICByZXR1cm4gbmV3IEJpbmRpbmcoZG9tLCB0cGwsIGRhdGEpO1xuICB9XG4gIC8vIGRvdWJsZSBkYXRhIGJpbmRpbmcgYmV0d2VlbiBzb21lIGRhdGEgYW5kIHNvbWUgZG9tXG4gIHRoaXMuZG9tID0gZG9tO1xuICB0aGlzLmRhdGEgPSBkYXRhO1xuICB0aGlzLmNvbnRleHQgPSBuZXcgdGVtcGxhdGUuQ29udGV4dCh0aGlzLmRhdGEpO1xuICB0aGlzLnRlbXBsYXRlID0gdHBsO1xufVxuXG5CaW5kaW5nLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRlbXBsYXRlLnRyZWUobmV3IHRlbXBsYXRlLkNvbnRleHQodGhpcy5kYXRhKSk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZG9tLmlubmVySFRNTCA9IFwiXCI7XG4gIHRoaXMuY3VycmVudFRyZWUgPSB0aGlzLnRyZWUoKTtcbiAgdGhpcy5jdXJyZW50VHJlZS5kb21UcmVlKHRoaXMuZG9tKTtcbiAgdGhpcy5iaW5kRXZlbnRzKCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kb21Jbml0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIGNyZWF0ZSBhbiBpbml0aWFsIHRyZWUgZnJvbSB0aGUgRE9NXG4gIHRoaXMuY3VycmVudFRyZWUgPSByZW5kZXIuaW5pdGlhbFJlbmRlckZyb21Eb20odGhpcy5kb20pO1xuICB0aGlzLmN1cnJlbnRUcmVlLm5vZGVOYW1lID0gdW5kZWZpbmVkO1xuICB0aGlzLmJpbmRFdmVudHMoKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5ld1RyZWUgPSB0aGlzLnRyZWUoKTtcbiAgdmFyIGRpZmYgPSB0aGlzLmN1cnJlbnRUcmVlLmRpZmYobmV3VHJlZSk7XG4gIHJlbmRlci5hcHBseURpZmYoZGlmZiwgdGhpcy5kb20pO1xuICB0aGlzLmN1cnJlbnRUcmVlID0gbmV3VHJlZTtcbiAgdGhpcy5sb2NrID0gZmFsc2U7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kYXRhRXZlbnQgPSBmdW5jdGlvbihlKSB7XG4gIHZhciBkb20gPSBlLnRhcmdldDtcbiAgdmFyIG5hbWUgPSBkb20uZ2V0QXR0cmlidXRlKCdsay1iaW5kJyk7XG4gIGlmKG5hbWUpIHtcbiAgICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuZ2V0UmVuZGVyTm9kZUZyb21QYXRoKGRvbSk7XG4gICAgdXBkYXRlRGF0YShyZW5kZXJOb2RlLmNvbnRleHQsIGRvbSk7XG4gICAgaWYoIXRoaXMubG9jaykge1xuICAgICAgdGhpcy5sb2NrID0gdHJ1ZTtcbiAgICAgIHRoaXMuZGlmZigpO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXIoJ2RhdGFWaWV3Q2hhbmdlZCcsIHtcIm5hbWVcIjogbmFtZX0pO1xuICB9XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5nZXRSZW5kZXJOb2RlRnJvbVBhdGggPSBmdW5jdGlvbihkb20pIHtcbiAgdmFyIHBhdGggPSBkb20uZ2V0QXR0cmlidXRlKCdsay1wYXRoJyk7XG4gIHZhciByZW5kZXJOb2RlID0gdGhpcy5jdXJyZW50VHJlZTtcbiAgdmFyIGJpdHMgPSBwYXRoLnNwbGl0KFwiLlwiKSwgaTtcbiAgZm9yKGk9MTsgaTxiaXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgcmVuZGVyTm9kZSA9IHJlbmRlck5vZGUuY2hpbGRyZW5bYml0c1tpXV07XG4gIH1cbiAgcmV0dXJuIHJlbmRlck5vZGU7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24obmFtZSwgb2JqKSB7XG4gIHRoaXMuZG9tLmRpc3BhdGNoRXZlbnQoXG4gICAgdXRpbC5ldmVudChuYW1lKSxcbiAgICBvYmpcbiAgKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmFueUV2ZW50ID0gZnVuY3Rpb24oZSkge1xuICB2YXIgZG9tID0gZS50YXJnZXQ7XG4gIHZhciBsa0V2ZW50ID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstJyArIGUudHlwZSk7XG4gIGlmKCFsa0V2ZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciByZW5kZXJOb2RlID0gdGhpcy5nZXRSZW5kZXJOb2RlRnJvbVBhdGgoZG9tKTtcbiAgdmFyIGN0eCA9IHRlbXBsYXRlLkNvbnRleHQoe2V2ZW50OiBlfSwgcmVuZGVyTm9kZS5jb250ZXh0KTtcbiAgcmVuZGVyTm9kZS5ub2RlLmF0dHJzWydsay0nK2UudHlwZV0uZXZhbHVhdGUoY3R4KTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmJpbmRFdmVudHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGk7XG4gIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbihlKXsgdGhpcy5kYXRhRXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpeyB0aGlzLmRhdGFFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIHZhciBldmVudHMgPSBcImNsaWNrLGNoYW5nZSxtb3VzZW92ZXIsZm9jdXMsa2V5ZG93bixrZXl1cCxrZXlwcmVzcyxzdWJtaXQsYmx1clwiLnNwbGl0KCcsJyk7XG4gIGZvcihpPTA7IGk8ZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIGV2ZW50c1tpXSxcbiAgICAgIGZ1bmN0aW9uKGUpeyB0aGlzLmFueUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgfVxufTtcblxuQmluZGluZy5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKXtcbiAgLy8gYXZvaWQgMiBkaWZmcyBhdCB0aGUgc2FtZSB0aW1lXG4gIC8vIFRPRE86IG1lc3NhZ2Ugb3IgZGlmZiBxdWV1ZS5cbiAgaWYoIXRoaXMubG9jaykge1xuICAgIHRoaXMubG9jayA9IHRydWU7XG4gICAgdGhpcy5kaWZmKCk7XG4gICAgdGhpcy50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgfVxufTtcblxuLy9UT0RPOiBhdXRvbWF0aWMgbmV3IG9uIENvbnRleHQsIFRlbXBsYXRlIGFuZCBDb21wb25lbnRcbmZ1bmN0aW9uIENvbXBvbmVudChuYW1lLCB0cGwsIGNvbnRyb2xsZXIpIHtcbiAgaWYgKHRoaXMuY29uc3RydWN0b3IgIT09IENvbXBvbmVudCkge1xuICAgIHJldHVybiBuZXcgQ29tcG9uZW50KG5hbWUsIHRwbCwgY29udHJvbGxlcik7XG4gIH1cbiAgaWYodGVtcGxhdGUuY29tcG9uZW50Q2FjaGVbbmFtZV0pIHtcbiAgICB1dGlsLkNvbXBpbGVFcnJvcihcIkNvbXBvbmVudCB3aXRoIG5hbWUgXCIgKyBuYW1lICsgXCIgYWxyZWFkeSBleGlzdFwiKTtcbiAgfVxuICB0aGlzLm5hbWUgPSBuYW1lO1xuICB0aGlzLnRlbXBsYXRlID0gdHBsO1xuICB0aGlzLmNvbnRyb2xsZXIgPSBjb250cm9sbGVyO1xuICB0ZW1wbGF0ZS5jb21wb25lbnRDYWNoZVtuYW1lXSA9IHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBUZW1wbGF0ZTp0ZW1wbGF0ZS5idWlsZFRlbXBsYXRlLFxuICBDb250ZXh0TmFtZTp0ZW1wbGF0ZS5Db250ZXh0TmFtZSxcbiAgdXBkYXRlRGF0YTp1cGRhdGVEYXRhLFxuICBCaW5kaW5nOkJpbmRpbmcsXG4gIENvbXBvbmVudDpDb21wb25lbnQsXG4gIGdldERvbTpyZW5kZXIuZ2V0RG9tLFxuICBjb21wb25lbnRDYWNoZTp0ZW1wbGF0ZS5jb21wb25lbnRDYWNoZSxcbiAgcGFyc2VFeHByZXNzaW9uczpleHByZXNzaW9uLnBhcnNlRXhwcmVzc2lvbnMsXG4gIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnM6ZXhwcmVzc2lvbi5jb21waWxlVGV4dEFuZEV4cHJlc3Npb25zLFxuICBidWlsZEV4cHJlc3Npb25zOmV4cHJlc3Npb24uYnVpbGRFeHByZXNzaW9ucyxcbiAgZXhwcmVzc2lvbnM6e1xuICAgIFN0cmluZ1ZhbHVlOmV4cHJlc3Npb24uU3RyaW5nVmFsdWVcbiAgfSxcbiAgYXBwbHlEaWZmOnJlbmRlci5hcHBseURpZmYsXG4gIGRpZmZDb3N0OnJlbmRlci5kaWZmQ29zdCxcbiAgcGFyc2VBdHRyaWJ1dGVzOnRlbXBsYXRlLnBhcnNlQXR0cmlidXRlcyxcbiAgYXR0cmlidXRlc0RpZmY6cmVuZGVyLmF0dHJpYnV0ZXNEaWZmLFxuICBDb250ZXh0OnRlbXBsYXRlLkNvbnRleHQsXG4gIENvbXBpbGVFcnJvcjp1dGlsLkNvbXBpbGVFcnJvcixcbiAgUnVudGltZUVycm9yOnV0aWwuUnVudGltZUVycm9yLFxuICBlc2NhcGU6dXRpbC5lc2NhcGUsXG4gIGluaXRpYWxSZW5kZXJGcm9tRG9tOnJlbmRlci5pbml0aWFsUmVuZGVyRnJvbURvbSxcbiAgZXhwcmVzc2lvbjpleHByZXNzaW9uLFxuICByZW5kZXI6cmVuZGVyLFxuICB1dGlsOnV0aWwsXG4gIHNldEhhbmRpY2FwOmZ1bmN0aW9uKG4pe3JlbmRlci5oYW5kaWNhcCA9IG47fVxufTtcbiIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIFJlbmRlcmVkTm9kZShub2RlLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCkge1xuICB0aGlzLmNoaWxkcmVuID0gW107XG4gIHRoaXMubm9kZSA9IG5vZGU7XG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMucmVuZGVyZXIgPSByZW5kZXJlcjtcbiAgdGhpcy5wYXRoID0gcGF0aCB8fCBcIlwiO1xuICAvLyBzaG9ydGN1dFxuICB0aGlzLm5vZGVOYW1lID0gbm9kZS5ub2RlTmFtZTtcbn1cblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGlmKGxldmVsID09PSB1bmRlZmluZWQpIHtcbiAgICBsZXZlbCA9IDA7XG4gIH1cbiAgZm9yKGk9MDsgaTxsZXZlbDsgaSsrKSB7XG4gICAgc3RyICs9IFwiICBcIjtcbiAgfVxuICBzdHIgKz0gU3RyaW5nKHRoaXMubm9kZSkgKyBcIiBwYXRoIFwiICsgdGhpcy5wYXRoICsgXCJcXHJcXG5cIjtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgc3RyICs9IHRoaXMuY2hpbGRyZW5baV0ucmVwcihsZXZlbCArIDEpO1xuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRvbVRyZWUgPSBmdW5jdGlvbihhcHBlbmRfdG8pIHtcbiAgdmFyIG5vZGUgPSBhcHBlbmRfdG8gfHwgdGhpcy5ub2RlLmRvbU5vZGUodGhpcy5jb250ZXh0LCB0aGlzLnBhdGgpLCBpLCBjaGlsZF90cmVlO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBjaGlsZF90cmVlID0gdGhpcy5jaGlsZHJlbltpXS5kb21UcmVlKCk7XG4gICAgaWYobm9kZS5wdXNoKSB7XG4gICAgICBub2RlLnB1c2goY2hpbGRfdHJlZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGRfdHJlZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBub2RlO1xufTtcblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5kb21IdG1sID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpO1xuICAvL3ZhciBkID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgY2hpbGQgPSB0aGlzLmNoaWxkcmVuW2ldLmRvbVRyZWUoKTtcbiAgICBkLmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgfVxuICByZXR1cm4gZC5pbm5lckhUTUw7XG59O1xuXG5mdW5jdGlvbiBkaWZmQ29zdChkaWZmKSB7XG4gIHZhciB2YWx1ZT0wLCBpO1xuICBmb3IoaT0wOyBpPGRpZmYubGVuZ3RoOyBpKyspIHtcbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcInJlbW92ZVwiKSB7XG4gICAgICB2YWx1ZSArPSA1O1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICB2YWx1ZSArPSAyO1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICB2YWx1ZSArPSAxO1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcInN0cmluZ211dGF0ZVwiKSB7XG4gICAgICB2YWx1ZSArPSAxO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuX2RpZmYgPSBmdW5jdGlvbihyZW5kZXJlZF9ub2RlLCBhY2N1LCBwYXRoKSB7XG4gIHZhciBpLCBqLCBzb3VyY2VfcHQgPSAwO1xuICBpZihwYXRoID09PSB1bmRlZmluZWQpIHsgcGF0aCA9IFwiXCI7IH1cblxuICBpZighcmVuZGVyZWRfbm9kZSkge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgbm9kZTogdGhpcyxcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfVxuXG4gIGlmKHJlbmRlcmVkX25vZGUubm9kZU5hbWUgIT0gdGhpcy5ub2RlTmFtZSkge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICB0eXBlOiAnZGlmZmVudF9ub2RlTmFtZScsXG4gICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgbm9kZTogdGhpcyxcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgdHlwZTogJ2RpZmZlbnRfbm9kZU5hbWUnLFxuICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUsXG4gICAgICAvLyB3aGVuIGEgbm9kZSBpcyBhZGRlZCwgd2UgcG9pbnQgdG8gdGhlIG5leHQgbm9kZSBhcyBpbnNlcnRCZWZvcmUgaXMgdXNlZFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9XG5cbiAgLy8gQ291bGQgdXNlIGluaGVyaXRhbmNlIGZvciB0aGlzXG4gIGlmKHRoaXMubm9kZU5hbWUgPT0gXCIjdGV4dFwiICYmIHRoaXMucmVuZGVyZXIgIT0gcmVuZGVyZWRfbm9kZS5yZW5kZXJlcikge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAnc3RyaW5nbXV0YXRlJyxcbiAgICAgICAgbm9kZTogdGhpcyxcbiAgICAgICAgdmFsdWU6IHJlbmRlcmVkX25vZGUucmVuZGVyZXIsXG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9IGVsc2Uge1xuICAgIHZhciBhX2RpZmYgPSBhdHRyaWJ1dGVzRGlmZih0aGlzLmF0dHJzLCByZW5kZXJlZF9ub2RlLmF0dHJzKTtcbiAgICBpZihhX2RpZmYubGVuZ3RoKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdtdXRhdGUnLFxuICAgICAgICBub2RlOiB0aGlzLFxuICAgICAgICBhdHRyaWJ1dGVzRGlmZjogYV9kaWZmLFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICB2YXIgbDEgPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDtcbiAgdmFyIGwyID0gcmVuZGVyZWRfbm9kZS5jaGlsZHJlbi5sZW5ndGg7XG5cbiAgLy8gbm8gc3dhcCBwb3NzaWJsZSwgYnV0IGRlbGV0aW5nIGEgbm9kZSBpcyBwb3NzaWJsZVxuICBqID0gMDsgaSA9IDA7IHNvdXJjZV9wdCA9IDA7XG4gIC8vIGxldCdzIGdvdCB0cm91Z2ggYWxsIHRoZSBjaGlsZHJlblxuICBmb3IoOyBpPGwxOyBpKyspIHtcbiAgICB2YXIgZGlmZiA9IDAsIGFmdGVyX3NvdXJjZV9kaWZmID0gMCwgYWZ0ZXJfdGFyZ2V0X2RpZmYgPSAwLCBhZnRlcl9zb3VyY2VfY29zdD1udWxsLCBhZnRlcl90YXJnZXRfY29zdD1udWxsO1xuICAgIHZhciBhZnRlcl90YXJnZXQgPSByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2orMV07XG4gICAgdmFyIGFmdGVyX3NvdXJjZSA9IHRoaXMuY2hpbGRyZW5baSsxXTtcblxuICAgIGlmKCFyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgICBub2RlOiB0aGlzLmNoaWxkcmVuW2ldLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgc291cmNlX3B0XG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGRpZmYgPSB0aGlzLmNoaWxkcmVuW2ldLl9kaWZmKHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcblxuICAgIHZhciBjb3N0ID0gZGlmZkNvc3QoZGlmZik7XG4gICAgLy8gZG9lcyB0aGUgbmV4dCBzb3VyY2Ugb25lIGZpdHMgYmV0dGVyP1xuICAgIGlmKGFmdGVyX3NvdXJjZSkge1xuICAgICAgYWZ0ZXJfc291cmNlX2RpZmYgPSBhZnRlcl9zb3VyY2UuX2RpZmYocmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSwgW10sIHBhdGggKyAnLicgKyBzb3VyY2VfcHQpO1xuICAgICAgLy8gbmVlZHMgc29tZSBoYW5kaWNhcCBvdGhlcndpc2UgaW5wdXRzIGNvbnRhaW5pbmcgdGhlIGN1cnJlbnQgZm9jdXNcbiAgICAgIC8vIG1pZ2h0IGJlIHJlbW92ZWRcbiAgICAgIGFmdGVyX3NvdXJjZV9jb3N0ID0gZGlmZkNvc3QoYWZ0ZXJfc291cmNlX2RpZmYpICsgbW9kdWxlLmV4cG9ydHMuaGFuZGljYXA7XG4gICAgfVxuICAgIC8vIGRvZXMgdGhlIG5leHQgdGFyZ2V0IG9uZSBmaXRzIGJldHRlcj9cbiAgICBpZihhZnRlcl90YXJnZXQpIHtcbiAgICAgIGFmdGVyX3RhcmdldF9kaWZmID0gdGhpcy5jaGlsZHJlbltpXS5fZGlmZihhZnRlcl90YXJnZXQsIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcbiAgICAgIGFmdGVyX3RhcmdldF9jb3N0ID0gZGlmZkNvc3QoYWZ0ZXJfdGFyZ2V0X2RpZmYpICsgbW9kdWxlLmV4cG9ydHMuaGFuZGljYXA7XG4gICAgfVxuXG4gICAgaWYoKCFhZnRlcl90YXJnZXQgfHwgY29zdCA8PSBhZnRlcl90YXJnZXRfY29zdCkgJiYgKCFhZnRlcl9zb3VyY2UgfHwgY29zdCA8PSBhZnRlcl9zb3VyY2VfY29zdCkpIHtcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChkaWZmKTtcbiAgICAgIHNvdXJjZV9wdCArPSAxO1xuICAgIH0gZWxzZSBpZihhZnRlcl9zb3VyY2UgJiYgKCFhZnRlcl90YXJnZXQgfHwgYWZ0ZXJfc291cmNlX2Nvc3QgPD0gYWZ0ZXJfdGFyZ2V0X2Nvc3QpKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICB0eXBlOiAnYWZ0ZXJfc291cmNlJyxcbiAgICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgICAgbm9kZTogdGhpcy5jaGlsZHJlbltpXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIHNvdXJjZV9wdFxuICAgICAgfSk7XG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoYWZ0ZXJfc291cmNlX2RpZmYpO1xuICAgICAgc291cmNlX3B0ICs9IDE7XG4gICAgICBpKys7XG4gICAgfSBlbHNlIGlmKGFmdGVyX3RhcmdldCkge1xuICAgICAgLy8gaW1wb3J0YW50IHRvIGFkZCB0aGUgZGlmZiBiZWZvcmVcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChhZnRlcl90YXJnZXRfZGlmZik7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICB0eXBlOiAnYWZ0ZXJfdGFyZ2V0JyxcbiAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIChzb3VyY2VfcHQpXG4gICAgICB9KTtcbiAgICAgIHNvdXJjZV9wdCArPSAyO1xuICAgICAgaisrO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBcIlNob3VsZCBuZXZlciBoYXBwZW5cIjtcbiAgICB9XG4gICAgaisrO1xuICB9XG5cbiAgLy8gbmV3IG5vZGVzIHRvIGJlIGFkZGVkIGFmdGVyIHRoZSBkaWZmXG4gIGZvcihpPTA7IGk8KGwyLWopOyBpKyspIHtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgdHlwZTogJ25ld19ub2RlJyxcbiAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICBub2RlOiByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2oraV0sXG4gICAgICAvLyB3aGVuIGEgbm9kZSBpcyBhZGRlZCwgd2UgcG9pbnQgdG8gdGhlIG5leHQgbm9kZSBhcyBpbnNlcnRCZWZvcmUgaXMgdXNlZFxuICAgICAgcGF0aDogcGF0aCArICcuJyArIChzb3VyY2VfcHQgKyAxKVxuICAgIH0pO1xuICAgIHNvdXJjZV9wdCArPSAxO1xuICB9XG5cbiAgcmV0dXJuIGFjY3U7XG5cbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uKHJlbmRlcmVkX25vZGUpIHtcbiAgdmFyIGFjY3UgPSBbXTtcbiAgcmV0dXJuIHRoaXMuX2RpZmYocmVuZGVyZWRfbm9kZSwgYWNjdSk7XG59O1xuXG5mdW5jdGlvbiBhdHRyaWJ1dGVzRGlmZihhLCBiKSB7XG4gIHZhciBjaGFuZ2VzID0gW10sIGtleTtcbiAgZm9yKGtleSBpbiBhKSB7XG4gICAgICBpZihiW2tleV0gPT09IGZhbHNlKSB7XG4gICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwicmVtb3ZlXCIsIGtleTprZXl9KTtcbiAgICAgIH0gZWxzZSBpZihiW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZihiW2tleV0gIT0gYVtrZXldKSB7XG4gICAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJtdXRhdGVcIiwga2V5OmtleSwgdmFsdWU6YltrZXldfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwicmVtb3ZlXCIsIGtleTprZXl9KTtcbiAgICAgIH1cbiAgfVxuICBmb3Ioa2V5IGluIGIpIHtcbiAgICBpZihhW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJhZGRcIiwga2V5OmtleSwgdmFsdWU6YltrZXldfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBjaGFuZ2VzO1xufVxuXG5mdW5jdGlvbiBnZXREb20oZG9tLCBwYXRoLCBzdG9wKSB7XG4gIHZhciBpLCBwPXBhdGguc3BsaXQoJy4nKSwgZD1kb207XG4gIGlmKHN0b3AgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0b3AgPSAwO1xuICB9XG4gIGZvcihpPTA7IGk8KHAubGVuZ3RoIC0gc3RvcCk7IGkrKykge1xuICAgIGlmKHBbaV0pIHsgLy8gZmlyc3Qgb25lIGlzIFwiXCJcbiAgICAgIGQgPSBkLmNoaWxkTm9kZXNbcGFyc2VJbnQocFtpXSwgMTApXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGQ7XG59XG5cbmZ1bmN0aW9uIGFwcGx5RGlmZihkaWZmLCBkb20pIHtcbiAgdmFyIGksIGosIF9kaWZmLCBfZG9tLCBwYXJlbnQ7XG4gIGZvcihpPTA7IGk8ZGlmZi5sZW5ndGg7IGkrKykge1xuICAgIF9kaWZmID0gZGlmZltpXTtcbiAgICBfZG9tID0gZ2V0RG9tKGRvbSwgX2RpZmYucGF0aCk7XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgIF9kb20ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChfZG9tKTtcbiAgICB9XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwiYWRkXCIpIHtcbiAgICAgIHZhciBuZXdOb2RlID0gX2RpZmYubm9kZS5kb21UcmVlKCk7XG4gICAgICBpZihfZG9tKSB7XG4gICAgICAgIF9kb20ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobmV3Tm9kZSwgX2RvbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBnZXQgdGhlIHBhcmVudFxuICAgICAgICBwYXJlbnQgPSBnZXREb20oZG9tLCBfZGlmZi5wYXRoLCAxKTtcbiAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKG5ld05vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgZm9yKGo9MDsgajxfZGlmZi5hdHRyaWJ1dGVzRGlmZi5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgYV9kaWZmID0gX2RpZmYuYXR0cmlidXRlc0RpZmZbal07XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgICAgIC8vIGltcG9ydGFudCBmb3Igc2VsZWN0XG4gICAgICAgICAgaWYoXCJ2YWx1ZSxzZWxlY3RlZCxjaGVja2VkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgaWYoX2RvbVthX2RpZmYua2V5XSAhPSBhX2RpZmYudmFsdWUpIHtcbiAgICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGFfZGlmZi52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5zZXRBdHRyaWJ1dGUoYV9kaWZmLmtleSwgYV9kaWZmLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZihhX2RpZmYuYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgICAgICBpZihcImNoZWNrZWQsc2VsZWN0ZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9kb20ucmVtb3ZlQXR0cmlidXRlKGFfZGlmZi5rZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgICAgIGlmKFwiY2hlY2tlZCxzZWxlY3RlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBhX2RpZmYudmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9kb20uc2V0QXR0cmlidXRlKGFfZGlmZi5rZXksIGFfZGlmZi52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwic3RyaW5nbXV0YXRlXCIpIHtcbiAgICAgIF9kb20ubm9kZVZhbHVlID0gX2RpZmYudmFsdWU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxSZW5kZXJGcm9tRG9tKGRvbSwgcGF0aCkge1xuICBwYXRoID0gcGF0aCB8fCBcIlwiO1xuICB2YXIgaSwgY2hpbGQsIGNoaWxkcmVuID0gW10sIGF0dHJzID0ge30sIHJlbmRlcmVyID0gJyc7XG4gIGlmKGRvbS5hdHRyaWJ1dGVzKSB7XG4gICAgZm9yKGk9MDsgaSA8IGRvbS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgYXR0ciA9IGRvbS5hdHRyaWJ1dGVzW2ldO1xuICAgICAgYXR0cnNbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWU7XG4gICAgfVxuICB9XG4gIGlmKGRvbS5jaGlsZE5vZGVzKSB7XG4gICAgZm9yKGk9MDsgaSA8IGRvbS5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGlsZCA9IGRvbS5jaGlsZE5vZGVzW2ldO1xuICAgICAgY2hpbGRyZW4ucHVzaChpbml0aWFsUmVuZGVyRnJvbURvbShjaGlsZCwgcGF0aCArICcuJyArIGkpKTtcbiAgICB9XG4gIH1cbiAgaWYoZG9tLnRleHRDb250ZW50KSB7XG4gICAgcmVuZGVyZXIgPSBkb20udGV4dENvbnRlbnQ7XG4gIH1cbiAgdmFyIHJuID0gbmV3IFJlbmRlcmVkTm9kZShcbiAgICB7bm9kZU5hbWU6IGRvbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpLCBub2RlOmRvbX0sXG4gICAgdW5kZWZpbmVkLFxuICAgIHJlbmRlcmVyLFxuICAgIHBhdGgpO1xuICBybi5hdHRycyA9IGF0dHJzO1xuICBybi5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICByZXR1cm4gcm47XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBSZW5kZXJlZE5vZGU6UmVuZGVyZWROb2RlLFxuICBpbml0aWFsUmVuZGVyRnJvbURvbTppbml0aWFsUmVuZGVyRnJvbURvbSxcbiAgYXBwbHlEaWZmOmFwcGx5RGlmZixcbiAgYXR0cmlidXRlc0RpZmY6YXR0cmlidXRlc0RpZmYsXG4gIGRpZmZDb3N0OmRpZmZDb3N0LFxuICBnZXREb206Z2V0RG9tLFxuICBoYW5kaWNhcDoxXG59OyIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJyk7XG52YXIgZXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vZXhwcmVzc2lvbicpO1xuXG52YXIgdGVtcGxhdGVDYWNoZSA9IHt9O1xudmFyIGNvbXBvbmVudENhY2hlID0ge307XG4vLyBhIG5hbWUgaGVyZSBpcyBhbHNvIGFueSB2YWxpZCBKUyBvYmplY3QgcHJvcGVydHlcbnZhciBWQVJOQU1FX1JFRyA9IC9eW2EtekEtWl8kXVswLTlhLXpBLVpfJF0qLztcbnZhciBIVE1MX0FUVFJfUkVHID0gL15bQS1aYS16XVtcXHctXXswLH0vO1xudmFyIERPVUJMRV9RVU9URURfU1RSSU5HX1JFRyA9IC9eXCIoXFxcXFwifFteXCJdKSpcIi87XG5cbmZ1bmN0aW9uIENvbnRleHROYW1lKG5hbWUpIHtcbiAgdGhpcy5iaXRzID0gbmFtZS5zcGxpdCgnLicpO1xufVxuXG5Db250ZXh0TmFtZS5wcm90b3R5cGUuc3Vic3RpdHV0ZUFsaWFzID0gZnVuY3Rpb24oY29udGV4dCkge1xuICBpZihjb250ZXh0LmFsaWFzZXMuaGFzT3duUHJvcGVydHkodGhpcy5iaXRzWzBdKSkge1xuICAgIHZhciBuZXdCaXRzID0gY29udGV4dC5hbGlhc2VzW3RoaXMuYml0c1swXV0uc3BsaXQoJy4nKTtcbiAgICB0aGlzLmJpdHMuc2hpZnQoKTtcbiAgICB0aGlzLmJpdHMgPSBuZXdCaXRzLmNvbmNhdCh0aGlzLmJpdHMpO1xuICB9XG59O1xuXG5Db250ZXh0TmFtZS5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYml0c1swXTtcbn07XG5cbkNvbnRleHROYW1lLnByb3RvdHlwZS5zdHIgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYml0cy5qb2luKCcuJyk7XG59O1xuXG5mdW5jdGlvbiBDb250ZXh0KGRhdGEsIHBhcmVudCkge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQ29udGV4dCkge1xuICAgIHJldHVybiBuZXcgQ29udGV4dChkYXRhLCBwYXJlbnQpO1xuICB9XG4gIHRoaXMuZGF0YSA9IGRhdGE7XG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB0aGlzLmFsaWFzZXMgPSB7fTtcbiAgdGhpcy53YXRjaGluZyA9IHt9O1xufVxuXG5Db250ZXh0LnByb3RvdHlwZS5hZGRBbGlhcyA9IGZ1bmN0aW9uKHNvdXJjZU5hbWUsIGFsaWFzTmFtZSkge1xuICAvLyBzb3VyY2UgbmFtZSBjYW4gYmUgJ25hbWUnIG9yICdsaXN0LmtleSdcbiAgaWYoc291cmNlTmFtZSA9PT0gYWxpYXNOYW1lKSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiQWxpYXMgd2l0aCB0aGUgbmFtZSBcIiArIGFsaWFzTmFtZSArIFwiIGFscmVhZHkgcHJlc2VudCBpbiB0aGlzIGNvbnRleHQuXCIpO1xuICB9XG4gIHRoaXMuYWxpYXNlc1thbGlhc05hbWVdID0gc291cmNlTmFtZTtcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLnJlc29sdmVOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAvLyBnaXZlbiBhIG5hbWUsIHJldHVybiB0aGUgW0NvbnRleHQsIHJlc29sdmVkIHBhdGgsIHZhbHVlXSB3aGVuXG4gIC8vIHRoaXMgbmFtZSBpcyBmb3VuZCBvciB1bmRlZmluZWQgb3RoZXJ3aXNlXG4gIG5hbWUuc3Vic3RpdHV0ZUFsaWFzKHRoaXMpO1xuXG4gIGlmKHRoaXMuZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lLnN0YXJ0KCkpKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5kYXRhW25hbWUuc3RhcnQoKV07XG4gICAgdmFyIGkgPSAxO1xuICAgIHdoaWxlKGkgPCBuYW1lLmJpdHMubGVuZ3RoKSB7XG4gICAgICBpZighdmFsdWUuaGFzT3duUHJvcGVydHkobmFtZS5iaXRzW2ldKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSB2YWx1ZVtuYW1lLmJpdHNbaV1dO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICByZXR1cm4gW3RoaXMsIG5hbWUuc3RyKCksIHZhbHVlXTtcbiAgfVxuXG4gIGlmKHRoaXMucGFyZW50KSB7XG4gICAgcmV0dXJuIHRoaXMucGFyZW50LnJlc29sdmVOYW1lKG5hbWUpO1xuICB9XG5cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmdldE5hbWVQYXRoID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVOYW1lKG5ldyBDb250ZXh0TmFtZShuYW1lKSk7XG4gIGlmKHJlc29sdmVkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVkWzFdO1xuICB9XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gIHRoaXMud2F0Y2hpbmdbbmFtZV0gPSBjYWxsYmFjaztcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHJlc29sdmVkID0gdGhpcy5yZXNvbHZlTmFtZShuZXcgQ29udGV4dE5hbWUobmFtZSkpO1xuICBpZihyZXNvbHZlZCkge1xuICAgIHJldHVybiByZXNvbHZlZFsyXTtcbiAgfVxufTtcblxuQ29udGV4dC5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdGhpcy5fbW9kaWZ5KG5ldyBDb250ZXh0TmFtZShuYW1lKSwgdmFsdWUpO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUuX21vZGlmeSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG5cbiAgaWYodGhpcy53YXRjaGluZy5oYXNPd25Qcm9wZXJ0eShuYW1lLnN0cigpKSkge1xuICAgIHRoaXMud2F0Y2hpbmdbbmFtZS5zdHIoKV0odmFsdWUpO1xuICB9XG5cbiAgbmFtZS5zdWJzdGl0dXRlQWxpYXModGhpcyk7XG5cbiAgLy8gd2UgZ28gaW4gZm9yIGEgc2VhcmNoIGlmIHRoZSBmaXJzdCBwYXJ0IG1hdGNoZXNcbiAgaWYodGhpcy5kYXRhLmhhc093blByb3BlcnR5KG5hbWUuc3RhcnQoKSkpIHtcbiAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICB2YXIgaSA9IDA7XG4gICAgd2hpbGUoaSA8IG5hbWUuYml0cy5sZW5ndGggLSAxKSB7XG4gICAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lLmJpdHNbaV0pKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBkYXRhID0gZGF0YVtuYW1lLmJpdHNbaV1dO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICBkYXRhW25hbWUuYml0c1tpXV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICAvLyBkYXRhIG5vdCBmb3VuZCwgbGV0J3Mgc2VhcmNoIGluIHRoZSBwYXJlbnRcbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuX21vZGlmeShuYW1lLCB2YWx1ZSk7XG4gIH1cblxufTtcblxuQ29udGV4dC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdGhpcy5kYXRhW25hbWVdID0gdmFsdWU7XG59O1xuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZXModiwgbm9kZSkge1xuICB2YXIgYXR0cnMgPSB7fSwgbiwgcztcbiAgd2hpbGUodikge1xuICAgICAgdiA9IHV0aWwudHJpbSh2KTtcbiAgICAgIG4gPSB2Lm1hdGNoKEhUTUxfQVRUUl9SRUcpO1xuICAgICAgaWYoIW4pIHtcbiAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIGF0dHJpYnV0ZSBuYW1lIGZvdW5kIGluIFwiK3YpO1xuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKG5bMF0ubGVuZ3RoKTtcbiAgICAgIG4gPSBuWzBdO1xuICAgICAgaWYodlswXSAhPSBcIj1cIikge1xuICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gZXF1YWwgc2lnbiBhZnRlciBuYW1lIFwiK24pO1xuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKDEpO1xuICAgICAgcyA9IHYubWF0Y2goRE9VQkxFX1FVT1RFRF9TVFJJTkdfUkVHKTtcbiAgICAgIGlmKHMpIHtcbiAgICAgICAgYXR0cnNbbl0gPSBuZXcgU3RyaW5nTm9kZShudWxsLCBzWzBdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMgPSB2Lm1hdGNoKGV4cHJlc3Npb24uRVhQUkVTU0lPTl9SRUcpO1xuICAgICAgICBpZihzID09PSBudWxsKSB7XG4gICAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIHN0cmluZyBvciBleHByZXNzaW9uIGZvdW5kIGFmdGVyIG5hbWUgXCIrbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGV4cHIgPSBleHByZXNzaW9uLmJ1aWxkKHNbMV0pO1xuICAgICAgICAgIGF0dHJzW25dID0gZXhwcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKHNbMF0ubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gYXR0cnM7XG59XG5cbi8vIGFsbCB0aGUgYXZhaWxhYmxlIHRlbXBsYXRlIG5vZGVcblxuZnVuY3Rpb24gTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIHRoaXMubGluZSA9IGxpbmU7XG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB0aGlzLmNvbnRlbnQgPSBjb250ZW50O1xuICB0aGlzLmxldmVsID0gbGV2ZWw7XG4gIHRoaXMuY2hpbGRyZW4gPSBbXTtcbn1cblxuTm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBpZihsZXZlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGV2ZWwgPSAwO1xuICB9XG4gIGZvcihpPTA7IGk8bGV2ZWw7IGkrKykge1xuICAgIHN0ciArPSBcIiAgXCI7XG4gIH1cbiAgc3RyICs9IFN0cmluZyh0aGlzKSArIFwiXFxyXFxuXCI7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHN0ciArPSB0aGlzLmNoaWxkcmVuW2ldLnJlcHIobGV2ZWwgKyAxKTtcbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICBpZihwYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICBwYXRoID0gJyc7XG4gICAgcG9zID0gMDtcbiAgICB0aGlzLmlzUm9vdCA9IHRydWU7XG4gIH1cbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCAnJywgcGF0aCk7XG4gIHQuY2hpbGRyZW4gPSB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xuICByZXR1cm4gdDtcbn07XG5cbk5vZGUucHJvdG90eXBlLmNlcnJvciA9IGZ1bmN0aW9uKG1zZykge1xuICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IodGhpcy50b1N0cmluZygpICsgXCI6IFwiICsgbXNnKTtcbn07XG5cbk5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtdO1xufTtcblxuTm9kZS5wcm90b3R5cGUudHJlZUNoaWxkcmVuID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gW10sIGksIHAsIGosIGNoaWxkcmVuID0gbnVsbCwgY2hpbGQgPSBudWxsO1xuICBqID0gcG9zO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBwID0gcGF0aDtcbiAgICBjaGlsZCA9IHRoaXMuY2hpbGRyZW5baV07XG4gICAgaWYoY2hpbGQuaGFzT3duUHJvcGVydHkoJ25vZGVOYW1lJykpIHtcbiAgICAgIHAgKz0gJy4nICsgajtcbiAgICAgIGorKztcbiAgICAgIGNoaWxkcmVuID0gY2hpbGQudHJlZShjb250ZXh0LCBwLCAwKTtcbiAgICAgIHQucHVzaChjaGlsZHJlbik7XG4gICAgfSBlbHNlIGlmICghY2hpbGQucmVuZGVyRXhsY3VkZWQpIHtcbiAgICAgIGNoaWxkcmVuID0gY2hpbGQudHJlZShjb250ZXh0LCBwLCBqKTtcbiAgICAgIGlmKGNoaWxkcmVuKSB7XG4gICAgICAgIHQgPSB0LmNvbmNhdChjaGlsZHJlbik7XG4gICAgICAgIGogKz0gY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdDtcbn07XG5cbk5vZGUucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24oY2hpbGQpIHtcbiAgdGhpcy5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyBcIihcIit0aGlzLmNvbnRlbnQucmVwbGFjZShcIlxcblwiLCBcIlwiKStcIikgYXQgbGluZSBcIiArIHRoaXMubGluZTtcbn07XG5cbmZ1bmN0aW9uIENvbW1lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICBwYXJlbnQuY2hpbGRyZW4ucHVzaCh0aGlzKTtcbiAgdGhpcy5yZW5kZXJFeGxjdWRlZCA9IHRydWU7XG59XG51dGlsLmluaGVyaXRzKENvbW1lbnROb2RlLCBOb2RlKTtcblxuZnVuY3Rpb24gSHRtbE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubm9kZU5hbWUgPSB0aGlzLmNvbnRlbnQuc3BsaXQoXCIgXCIpWzBdO1xuICB0aGlzLmF0dHJzID0gcGFyc2VBdHRyaWJ1dGVzKHRoaXMuY29udGVudC5zdWJzdHIodGhpcy5ub2RlTmFtZS5sZW5ndGgpLCB0aGlzKTtcbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhIdG1sTm9kZSwgTm9kZSk7XG5cbkh0bWxOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgdGhpcy5kb21Ob2RlKGNvbnRleHQsIHBhdGgpLCBwYXRoKTtcbiAgdC5hdHRycyA9IHRoaXMucmVuZGVyQXR0cmlidXRlcyhjb250ZXh0LCBwYXRoKTtcbiAgdC5jaGlsZHJlbiA9IHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gIHJldHVybiB0O1xufTtcblxuZnVuY3Rpb24gYmluZGluZ05hbWUobm9kZSkge1xuICBpZihub2RlIGluc3RhbmNlb2YgZXhwcmVzc2lvbi5OYW1lKSB7XG4gICAgcmV0dXJuIG5vZGUubmFtZTtcbiAgfVxuICBpZihub2RlIGluc3RhbmNlb2YgU3RyaW5nTm9kZSAmJiBub2RlLmNvbXBpbGVkRXhwcmVzc2lvbi5sZW5ndGggPT0gMSAmJlxuICAgICAgbm9kZS5jb21waWxlZEV4cHJlc3Npb25bMF0gaW5zdGFuY2VvZiBleHByZXNzaW9uLk5hbWUpIHtcbiAgICByZXR1cm4gbm9kZS5jb21waWxlZEV4cHJlc3Npb25bMF0ubmFtZTtcbiAgfVxufVxuXG5IdG1sTm9kZS5wcm90b3R5cGUucmVuZGVyQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgdmFyIHJfYXR0cnMgPSB7fSwga2V5LCBhdHRyLCBuYW1lO1xuICBmb3Ioa2V5IGluIHRoaXMuYXR0cnMpIHtcbiAgICBhdHRyID0gdGhpcy5hdHRyc1trZXldO1xuICAgIC8vIHRvZG8sIGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGRpc2NyaW1pbmF0ZSBldmVudHNcbiAgICBpZihrZXkuaW5kZXhPZihcImxrLVwiKSA9PT0gMCkge1xuICAgICAgLy8gYWRkIHRoZSBwYXRoIHRvIHRoZSByZW5kZXIgbm9kZSB0byBhbnkgbGstdGhpbmcgbm9kZVxuICAgICAgcl9hdHRyc1snbGstcGF0aCddID0gcGF0aDtcbiAgICAgIGlmKGtleSA9PT0gJ2xrLWJpbmQnKSB7XG4gICAgICAgIHJfYXR0cnNba2V5XSA9IGF0dHIuZXZhbHVhdGUoY29udGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByX2F0dHJzW2tleV0gPSBcInRydWVcIjtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZihhdHRyLmV2YWx1YXRlKSB7XG4gICAgICB2YXIgdiA9IGF0dHIuZXZhbHVhdGUoY29udGV4dCk7XG4gICAgICBpZih2ID09PSBmYWxzZSkge1xuICAgICAgICAvLyBub3RoaW5nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByX2F0dHJzW2tleV0gPSB2O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByX2F0dHJzW2tleV0gPSBhdHRyO1xuICAgIH1cbiAgfVxuICBpZihcImlucHV0LHNlbGVjdCx0ZXh0YXJlYVwiLmluZGV4T2YodGhpcy5ub2RlTmFtZSkgIT0gLTEgJiYgdGhpcy5hdHRycy5oYXNPd25Qcm9wZXJ0eSgndmFsdWUnKSkge1xuICAgIGF0dHIgPSB0aGlzLmF0dHJzLnZhbHVlO1xuICAgIG5hbWUgPSBiaW5kaW5nTmFtZShhdHRyKTtcbiAgICBpZihuYW1lICYmIHRoaXMuYXR0cnNbJ2xrLWJpbmQnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByX2F0dHJzWydsay1iaW5kJ10gPSBuYW1lO1xuICAgICAgcl9hdHRyc1snbGstcGF0aCddID0gcGF0aDtcbiAgICB9XG4gIH1cbiAgaWYodGhpcy5ub2RlTmFtZSA9PSBcInRleHRhcmVhXCIgJiYgdGhpcy5jaGlsZHJlbi5sZW5ndGggPT0gMSkge1xuICAgIG5hbWUgPSBiaW5kaW5nTmFtZSh0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24pO1xuICAgIGlmKG5hbWUgJiYgdGhpcy5hdHRyc1snbGstYmluZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJfYXR0cnNbJ2xrLWJpbmQnXSA9IG5hbWU7XG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgICAgLy8gYXMgc29vbiBhcyB0aGUgdXNlciBoYXMgYWx0ZXJlZCB0aGUgdmFsdWUgb2YgdGhlIHRleHRhcmVhIG9yIHNjcmlwdCBoYXMgYWx0ZXJlZFxuICAgICAgLy8gdGhlIHZhbHVlIHByb3BlcnR5IG9mIHRoZSB0ZXh0YXJlYSwgdGhlIHRleHQgbm9kZSBpcyBvdXQgb2YgdGhlIHBpY3R1cmUgYW5kIGlzIG5vXG4gICAgICAvLyBsb25nZXIgYm91bmQgdG8gdGhlIHRleHRhcmVhJ3MgdmFsdWUgaW4gYW55IHdheS5cbiAgICAgIHJfYXR0cnMudmFsdWUgPSB0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24uZXZhbHVhdGUoY29udGV4dCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByX2F0dHJzO1xufTtcblxuSHRtbE5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0aGlzLm5vZGVOYW1lKSwga2V5LCBhdHRycz10aGlzLnJlbmRlckF0dHJpYnV0ZXMoY29udGV4dCwgcGF0aCk7XG4gIGZvcihrZXkgaW4gYXR0cnMpIHtcbiAgICBub2RlLnNldEF0dHJpYnV0ZShrZXksIGF0dHJzW2tleV0pO1xuICB9XG4gIHJldHVybiBub2RlO1xufTtcblxuZnVuY3Rpb24gRm9yTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIC8vIHN5bnRheDogZm9yIGtleSwgdmFsdWUgaW4gbGlzdFxuICAvLyAgICAgICAgIGZvciB2YWx1ZSBpbiBsaXN0XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdmFyIHZhcjEsIHZhcjIsIHNvdXJjZU5hbWU7XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoNCkpO1xuICB2YXIxID0gY29udGVudC5tYXRjaChWQVJOQU1FX1JFRyk7XG4gIGlmKCF2YXIxKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJmaXJzdCB2YXJpYWJsZSBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cih2YXIxWzBdLmxlbmd0aCkpO1xuICBpZihjb250ZW50WzBdID09ICcsJykge1xuICAgIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoMSkpO1xuICAgIHZhcjIgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgICBpZighdmFyMikge1xuICAgICAgdGhpcy5jZXJyb3IoXCJzZWNvbmQgdmFyaWFibGUgYWZ0ZXIgY29tbWEgaXMgbWlzc2luZ1wiKTtcbiAgICB9XG4gICAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cih2YXIyWzBdLmxlbmd0aCkpO1xuICB9XG4gIGlmKCFjb250ZW50Lm1hdGNoKC9eaW4vKSkge1xuICAgIHRoaXMuY2Vycm9yKFwiaW4ga2V5d29yZCBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoMikpO1xuICBzb3VyY2VOYW1lID0gY29udGVudC5tYXRjaChleHByZXNzaW9uLk5hbWUucmVnKTtcbiAgaWYoIXNvdXJjZU5hbWUpIHtcbiAgICB0aGlzLmNlcnJvcihcIml0ZXJhYmxlIG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICB0aGlzLnNvdXJjZU5hbWUgPSBzb3VyY2VOYW1lWzBdO1xuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHNvdXJjZU5hbWVbMF0ubGVuZ3RoKSk7XG4gIGlmKGNvbnRlbnQgIT09IFwiXCIpIHtcbiAgICB0aGlzLmNlcnJvcihcImxlZnQgb3ZlciB1bnBhcnNhYmxlIGNvbnRlbnQ6IFwiICsgY29udGVudCk7XG4gIH1cblxuICBpZih2YXIxICYmIHZhcjIpIHtcbiAgICB0aGlzLmluZGV4TmFtZSA9IHZhcjE7XG4gICAgdGhpcy5hbGlhcyA9IHZhcjJbMF07XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5hbGlhcyA9IHZhcjFbMF07XG4gIH1cbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhGb3JOb2RlLCBOb2RlKTtcblxuRm9yTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgdCA9IFtdLCBrZXk7XG4gIHZhciBkID0gY29udGV4dC5nZXQodGhpcy5zb3VyY2VOYW1lKTtcbiAgZm9yKGtleSBpbiBkKSB7XG4gICAgdmFyIG5ld19kYXRhID0ge307XG4gICAgLy8gYWRkIHRoZSBrZXkgdG8gYWNjZXNzIHRoZSBjb250ZXh0J3MgZGF0YVxuICAgIGlmKHRoaXMuaW5kZXhOYW1lKSB7XG4gICAgICBuZXdfZGF0YVt0aGlzLmluZGV4TmFtZV0gPSBrZXk7XG4gICAgfVxuICAgIHZhciBuZXdfY29udGV4dCA9IG5ldyBDb250ZXh0KG5ld19kYXRhLCBjb250ZXh0KTtcbiAgICAvLyBrZWVwIHRyYWNrIG9mIHdoZXJlIHRoZSBkYXRhIGlzIGNvbWluZyBmcm9tXG4gICAgbmV3X2NvbnRleHQuYWRkQWxpYXModGhpcy5zb3VyY2VOYW1lICsgJy4nICsga2V5LCB0aGlzLmFsaWFzKTtcbiAgICB0ID0gdC5jb25jYXQodGhpcy50cmVlQ2hpbGRyZW4obmV3X2NvbnRleHQsIHBhdGgsIHQubGVuZ3RoICsgcG9zKSk7XG4gIH1cbiAgcmV0dXJuIHQ7XG59O1xuXG5mdW5jdGlvbiBJZk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uYnVpbGQoY29udGVudC5yZXBsYWNlKC9eaWYvZywgXCJcIikpO1xuICBwYXJlbnQuY2hpbGRyZW4ucHVzaCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSWZOb2RlLCBOb2RlKTtcblxuSWZOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIGlmKCF0aGlzLmV4cHJlc3Npb24uZXZhbHVhdGUoY29udGV4dCkpIHtcbiAgICBpZih0aGlzLmVsc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmVsc2UudHJlZShjb250ZXh0LCBwYXRoLCBwb3MpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cbiAgcmV0dXJuIHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5mdW5jdGlvbiBFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lLCBjdXJyZW50Tm9kZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMuc2VhcmNoSWYoY3VycmVudE5vZGUpO1xufVxudXRpbC5pbmhlcml0cyhFbHNlTm9kZSwgTm9kZSk7XG5cbkVsc2VOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHJldHVybiB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gSWZFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lLCBjdXJyZW50Tm9kZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uYnVpbGQoY29udGVudC5yZXBsYWNlKC9eZWxzZWlmL2csIFwiXCIpKTtcbiAgdGhpcy5zZWFyY2hJZihjdXJyZW50Tm9kZSk7XG59XG4vLyBpbXBvcnRhbnQgdG8gYmUgYW4gSWZOb2RlXG51dGlsLmluaGVyaXRzKElmRWxzZU5vZGUsIElmTm9kZSk7XG5cbklmRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmID0gZnVuY3Rpb24gc2VhcmNoSWYoY3VycmVudE5vZGUpIHtcbiAgLy8gZmlyc3Qgbm9kZSBvbiB0aGUgc2FtZSBsZXZlbCBoYXMgdG8gYmUgdGhlIGlmL2Vsc2VpZiBub2RlXG4gIHdoaWxlKGN1cnJlbnROb2RlKSB7XG4gICAgaWYoY3VycmVudE5vZGUubGV2ZWwgPCB0aGlzLmxldmVsKSB7XG4gICAgICB0aGlzLmNlcnJvcihcImNhbm5vdCBmaW5kIGEgY29ycmVzcG9uZGluZyBpZi1saWtlIHN0YXRlbWVudCBhdCB0aGUgc2FtZSBsZXZlbC5cIik7XG4gICAgfVxuICAgIGlmKGN1cnJlbnROb2RlLmxldmVsID09IHRoaXMubGV2ZWwpIHtcbiAgICAgIGlmKCEoY3VycmVudE5vZGUgaW5zdGFuY2VvZiBJZk5vZGUpKSB7XG4gICAgICAgIHRoaXMuY2Vycm9yKFwiYXQgdGhlIHNhbWUgbGV2ZWwgaXMgbm90IGEgaWYtbGlrZSBzdGF0ZW1lbnQuXCIpO1xuICAgICAgfVxuICAgICAgY3VycmVudE5vZGUuZWxzZSA9IHRoaXM7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY3VycmVudE5vZGUgPSBjdXJyZW50Tm9kZS5wYXJlbnQ7XG4gIH1cbn07XG5FbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWYgPSBJZkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZjtcblxuZnVuY3Rpb24gRXhwcmVzc2lvbk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubm9kZU5hbWUgPSBcIiN0ZXh0XCI7XG4gIHZhciBtID0gY29udGVudC5tYXRjaChleHByZXNzaW9uLkVYUFJFU1NJT05fUkVHKTtcbiAgaWYoIW0pIHtcbiAgICB0aGlzLmNlcnJvcihcImRlY2xhcmVkIGltcHJvcGVybHlcIik7XG4gIH1cbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5idWlsZChtWzFdKTtcbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhFeHByZXNzaW9uTm9kZSwgTm9kZSk7XG5cbkV4cHJlc3Npb25Ob2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICAvLyByZW5kZXJlclxuICB2YXIgcmVuZGVyZXIgPSBTdHJpbmcodGhpcy5leHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpKTtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCk7XG4gIHJldHVybiB0O1xufTtcblxuRXhwcmVzc2lvbk5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0aGlzLmV4cHJlc3Npb24uZXZhbHVhdGUoY29udGV4dCkpO1xufTtcblxuZnVuY3Rpb24gU3RyaW5nTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IFwiI3RleHRcIjtcbiAgdGhpcy5zdHJpbmcgPSB0aGlzLmNvbnRlbnQucmVwbGFjZSgvXlwifFwiJC9nLCBcIlwiKS5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJywgJ2dtJyk7XG4gIHRoaXMuY29tcGlsZWRFeHByZXNzaW9uID0gZXhwcmVzc2lvbi5jb21waWxlVGV4dEFuZEV4cHJlc3Npb25zKHRoaXMuc3RyaW5nKTtcbiAgaWYocGFyZW50KSB7XG4gICAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xuICB9XG59XG51dGlsLmluaGVyaXRzKFN0cmluZ05vZGUsIE5vZGUpO1xuXG5TdHJpbmdOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICAvLyByZW5kZXJlciBzaG91bGQgYmUgYWxsIGF0dHJpYnV0ZXNcbiAgdmFyIHJlbmRlcmVyID0gZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KTtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCk7XG4gIHJldHVybiB0O1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpO1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCkpO1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbihjaGlsZCkge1xuICB0aGlzLmNlcnJvcihcImNhbm5vdCBoYXZlIGNoaWxkcmVuIFwiICsgY2hpbGQpO1xufTtcblxuZnVuY3Rpb24gSW5jbHVkZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubmFtZSA9IHV0aWwudHJpbShjb250ZW50LnNwbGl0KFwiIFwiKVsxXSk7XG4gIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlW3RoaXMubmFtZV07XG4gIGlmKHRoaXMudGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuY2Vycm9yKFwiVGVtcGxhdGUgd2l0aCBuYW1lIFwiICsgdGhpcy5uYW1lICsgXCIgaXMgbm90IHJlZ2lzdGVyZWRcIik7XG4gIH1cbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhJbmNsdWRlTm9kZSwgTm9kZSk7XG5cbkluY2x1ZGVOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHJldHVybiB0aGlzLnRlbXBsYXRlLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gQ29tcG9uZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50KS5zdWJzdHIoMTApO1xuICB2YXIgbmFtZSA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICBpZighbmFtZSkge1xuICAgIHRoaXMuY2Vycm9yKFwiQ29tcG9uZW50IG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKG5hbWVbMF0ubGVuZ3RoKSk7XG4gIHRoaXMubmFtZSA9IG5hbWVbMF07XG4gIHRoaXMuYXR0cnMgPSBwYXJzZUF0dHJpYnV0ZXMoY29udGVudCwgdGhpcyk7XG4gIHRoaXMuY29tcG9uZW50ID0gY29tcG9uZW50Q2FjaGVbdGhpcy5uYW1lXTtcbiAgaWYodGhpcy5jb21wb25lbnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuY2Vycm9yKFwiQ29tcG9uZW50IHdpdGggbmFtZSBcIiArIHRoaXMubmFtZSArIFwiIGlzIG5vdCByZWdpc3RlcmVkXCIpO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoQ29tcG9uZW50Tm9kZSwgTm9kZSk7XG5cbkNvbXBvbmVudE5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIG5ld19jb250ZXh0ID0gbmV3IENvbnRleHQoe30sIGNvbnRleHQpO1xuICB2YXIga2V5LCBhdHRyLCB2YWx1ZSwgc291cmNlO1xuICBmb3Ioa2V5IGluIHRoaXMuYXR0cnMpIHtcbiAgICBhdHRyID0gdGhpcy5hdHRyc1trZXldO1xuICAgIGlmKGF0dHIuZXZhbHVhdGUpIHtcbiAgICAgIHZhbHVlID0gYXR0ci5ldmFsdWF0ZShjb250ZXh0KTtcbiAgICAgIC8vIHRvZG8gOiBpZiBleHByZXNzaW9uIGF0dHJpYnV0ZSwgYWRkIGFuIGFsaWFzXG4gICAgICBpZih2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy8gbm90aGluZ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3X2NvbnRleHQuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICBzb3VyY2UgPSBiaW5kaW5nTmFtZShhdHRyKTtcbiAgICAgICAgaWYoc291cmNlICYmIGtleSAhPSBzb3VyY2UpIHtcbiAgICAgICAgICBuZXdfY29udGV4dC5hZGRBbGlhcyhzb3VyY2UsIGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy9uZXdfY29udGV4dC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGlmKHRoaXMuY29tcG9uZW50LmNvbnRyb2xsZXIpe1xuICAgIHRoaXMuY29tcG9uZW50LmNvbnRyb2xsZXIobmV3X2NvbnRleHQpO1xuICB9XG4gIHJldHVybiB0aGlzLmNvbXBvbmVudC50ZW1wbGF0ZS50cmVlQ2hpbGRyZW4obmV3X2NvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5Db21wb25lbnROb2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgcmV0dXJuIHRoaXMuY29tcG9uZW50LnRlbXBsYXRlLnJlcHIobGV2ZWwgKyAxKTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgdmFyIG5vZGU7XG4gIGlmKGNvbnRlbnQubGVuZ3RoID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBTdHJpbmdOb2RlKHBhcmVudCwgXCJcXG5cIiwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJyMnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgQ29tbWVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignaWYgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IElmTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdlbHNlaWYgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IElmRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxLCBjdXJyZW50Tm9kZSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2Vsc2UnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxLCBjdXJyZW50Tm9kZSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2ZvciAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRm9yTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdpbmNsdWRlICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBJbmNsdWRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdjb21wb25lbnQgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IENvbXBvbmVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignXCInKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgU3RyaW5nTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoL15cXHcvLmV4ZWMoY29udGVudCkpIHtcbiAgICBub2RlID0gbmV3IEh0bWxOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ3t7JykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEV4cHJlc3Npb25Ob2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiY3JlYXRlTm9kZTogdW5rbm93IG5vZGUgdHlwZSBcIiArIGNvbnRlbnQpO1xuICB9XG4gIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBidWlsZFRlbXBsYXRlKHRwbCwgdGVtcGxhdGVOYW1lKSB7XG5cbiAgaWYodHlwZW9mIHRwbCA9PSAnb2JqZWN0Jykge1xuICAgIHRwbCA9IHRwbC5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHZhciByb290ID0gbmV3IE5vZGUobnVsbCwgXCJcIiwgMCksIGxpbmVzLCBsaW5lLCBsZXZlbCxcbiAgICBjb250ZW50LCBpLCBjdXJyZW50Tm9kZSA9IHJvb3QsIHBhcmVudCwgc2VhcmNoTm9kZTtcblxuICBsaW5lcyA9IHRwbC5zcGxpdChcIlxcblwiKTtcblxuICBmb3IoaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGluZSA9IGxpbmVzW2ldO1xuICAgIGxldmVsID0gbGluZS5tYXRjaCgvXFxzKi8pWzBdLmxlbmd0aCArIDE7XG4gICAgY29udGVudCA9IGxpbmUuc2xpY2UobGV2ZWwgLSAxKTtcblxuICAgIC8vIG11bHRpbGluZSBzdXBwb3J0OiBlbmRzIHdpdGggYSBcXFxuICAgIHZhciBqID0gMDtcbiAgICB3aGlsZShjb250ZW50Lm1hdGNoKC9cXFxcJC8pKSB7XG4gICAgICAgIGorKztcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXFxcXCQvLCAnJykgKyBsaW5lc1tpK2pdO1xuICAgIH1cbiAgICBpID0gaSArIGo7XG5cbiAgICAvLyBtdWx0aWxpbmUgc3RyaW5nc1xuICAgIGogPSAwO1xuICAgIGlmKGNvbnRlbnQubWF0Y2goL15cIlwiXCIvKSkge1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9eXCJcIlwiLywgJ1wiJyk7XG4gICAgICAgIHdoaWxlKCFjb250ZW50Lm1hdGNoKC9cIlwiXCIkLykpIHtcbiAgICAgICAgICAgIGorKztcbiAgICAgICAgICAgIGlmKGkraiA+IGxpbmVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJNdWx0aWxpbmUgc3RyaW5nIHN0YXJ0ZWQgYnV0IHVuZmluaXNoZWQgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQgKyBsaW5lc1tpK2pdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1wiXCJcIiQvLCAnXCInKTtcbiAgICB9XG4gICAgaSA9IGkgKyBqO1xuXG4gICAgc2VhcmNoTm9kZSA9IGN1cnJlbnROb2RlO1xuICAgIHBhcmVudCA9IG51bGw7XG5cbiAgICAvLyBzZWFyY2ggZm9yIHRoZSBwYXJlbnQgbm9kZVxuICAgIHdoaWxlKHRydWUpIHtcblxuICAgICAgaWYobGV2ZWwgPiBzZWFyY2hOb2RlLmxldmVsKSB7XG4gICAgICAgIHBhcmVudCA9IHNlYXJjaE5vZGU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZighc2VhcmNoTm9kZS5wYXJlbnQpIHtcbiAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW5kZW50YXRpb24gZXJyb3IgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgfVxuXG4gICAgICBpZihsZXZlbCA9PSBzZWFyY2hOb2RlLmxldmVsKSB7XG4gICAgICAgIHBhcmVudCA9IHNlYXJjaE5vZGUucGFyZW50O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgc2VhcmNoTm9kZSA9IHNlYXJjaE5vZGUucGFyZW50O1xuICAgIH1cblxuICAgIGlmKHBhcmVudC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIGlmKHBhcmVudC5jaGlsZHJlblswXS5sZXZlbCAhPSBsZXZlbCkge1xuICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJJbmRlbnRhdGlvbiBlcnJvciBhdCBsaW5lIFwiICsgKGkgKyAxKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG5vZGUgPSBjcmVhdGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGksIGN1cnJlbnROb2RlKTtcbiAgICBjdXJyZW50Tm9kZSA9IG5vZGU7XG5cbiAgfVxuICBpZih0ZW1wbGF0ZU5hbWUpIHtcbiAgICB0ZW1wbGF0ZUNhY2hlW3RlbXBsYXRlTmFtZV0gPSByb290O1xuICB9XG5cbiAgcmV0dXJuIHJvb3Q7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBidWlsZFRlbXBsYXRlOiBidWlsZFRlbXBsYXRlLFxuICBwYXJzZUF0dHJpYnV0ZXM6IHBhcnNlQXR0cmlidXRlcyxcbiAgQ29udGV4dDogQ29udGV4dCxcbiAgdGVtcGxhdGVDYWNoZTogdGVtcGxhdGVDYWNoZSxcbiAgY29tcG9uZW50Q2FjaGU6IGNvbXBvbmVudENhY2hlLFxuICBDb250ZXh0TmFtZTogQ29udGV4dE5hbWVcbn07IiwiXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gaW5oZXJpdHMoY2hpbGQsIHBhcmVudCkge1xuICBjaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUpO1xuICBjaGlsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjaGlsZDtcbn1cblxuZnVuY3Rpb24gQ29tcGlsZUVycm9yKG1zZykge1xuICB0aGlzLm5hbWUgPSBcIkNvbXBpbGVFcnJvclwiO1xuICB0aGlzLm1lc3NhZ2UgPSAobXNnIHx8IFwiXCIpO1xufVxuQ29tcGlsZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gUnVudGltZUVycm9yKG1zZykge1xuICB0aGlzLm5hbWUgPSBcIlJ1bnRpbWVFcnJvclwiO1xuICB0aGlzLm1lc3NhZ2UgPSAobXNnIHx8IFwiXCIpO1xufVxuUnVudGltZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gZXNjYXBlKHVuc2FmZSkge1xuICByZXR1cm4gdW5zYWZlXG4gICAgLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxuICAgIC5yZXBsYWNlKC88L2csIFwiJmx0O1wiKVxuICAgIC5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKVxuICAgIC5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKVxuICAgIC5yZXBsYWNlKC8nL2csIFwiJiMwMzk7XCIpO1xufVxuXG5mdW5jdGlvbiB0cmltKHR4dCkge1xuICByZXR1cm4gdHh0LnJlcGxhY2UoL15cXHMrfFxccyskL2cgLFwiXCIpO1xufVxuXG5mdW5jdGlvbiBldmVudChuYW1lLCBkYXRhKSB7XG4gIHZhciBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkN1c3RvbUV2ZW50XCIpO1xuICBldnQuaW5pdEN1c3RvbUV2ZW50KG5hbWUsIGZhbHNlLCBmYWxzZSwgZGF0YSk7XG4gIHJldHVybiBldnQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpbmhlcml0czppbmhlcml0cyxcbiAgQ29tcGlsZUVycm9yOkNvbXBpbGVFcnJvcixcbiAgUnVudGltZUVycm9yOlJ1bnRpbWVFcnJvcixcbiAgZXNjYXBlOmVzY2FwZSxcbiAgdHJpbTp0cmltLFxuICBldmVudDpldmVudFxufTsiXX0=
(2)
});
