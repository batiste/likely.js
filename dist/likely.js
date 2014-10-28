!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.likely=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

"use strict";
var util = _dereq_('./util');

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
  if(data === undefined && !(tpl instanceof template.Node)) {
    data = tpl;
    tpl = template.buildTemplate(dom.textContent);
  }
  this.data = data;
  this.template = tpl;
  this.context = new template.Context(this.data);
  this.scheduled = false;
  this.callbacks = [];
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
    if(!this.lock) {
      // do not update during a render
      updateData(renderNode.context, dom);
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
    util.event(name, obj)
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
  renderNode.node.attrs['lk-'+e.type](ctx);
};

Binding.prototype.bindEvents = function() {
  var i;
  this.dom.addEventListener("keyup", function(e){ this.dataEvent(e); }.bind(this), false);
  this.dom.addEventListener("change", function(e){ this.dataEvent(e); }.bind(this), false);
  var events = "click,change,mouseover,focusout,focusin,keydown,keyup,keypress,submit".split(',');
  for(i=0; i<events.length; i++) {
    this.dom.addEventListener(
      events[i],
      function(e){ this.anyEvent(e); }.bind(this), false);
  }
};

Binding.prototype.update = function(callback) {
  if(callback) {
    this.callbacks.push(callback);
  }
  if(this.scheduled) {
    return;
  }
  var now = (new Date()).getTime();
  if((this.lastUpdate && (now - this.lastUpdate) < 25) || this.lock) {
    this.scheduled = window.requestAnimationFrame(function() {
      this.scheduled = false;
      this.update();
    }.bind(this));
    return;
  }
  // avoid 2 diffs at the same time
  this.lock = true;
  this.lastUpdate = now;
  this.diff();
  this.trigger('update');
  while(this.callbacks.length) {
    this.callbacks.pop()();
  }
};

module.exports = {
  Template:template.buildTemplate,
  ContextName:template.ContextName,
  updateData:updateData,
  Binding:Binding,
  Component:template.Component,
  getDom:render.getDom,
  applyDiff:render.applyDiff,
  //diffCost:render.diffCost,
  attributesDiff:render.attributesDiff,
  Context:template.Context,
  CompileError:util.CompileError,
  RuntimeError:util.RuntimeError,
  escape:util.escape,
  initialRenderFromDom:render.initialRenderFromDom,
  expression:expression,
  render:render,
  template:template,
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

function countChildren(node) {
  var value = node.children.length, i;
  for(i=0; i<node.children.length; i++) {
    value = value + countChildren(node.children[i]);
  }
  return value;
}

function diffCost(diff) {
  var value=0, i;
  for(i=0; i<diff.length; i++) {
    if(diff[i].action == "remove") {
      value += 2;
      value += 2 * countChildren(diff[i].node);
    }
    if(diff[i].action == "add") {
      value += 2;
      value += 2 * countChildren(diff[i].node);
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
      type: 'different_nodeName',
      action: 'remove',
      node: this,
      path: path
    });
    accu.push({
      type: 'different_nodeName',
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
    var a_diff = attributesDiff(this.attrs || {}, rendered_node.attrs || {});
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
      after_source_cost = diffCost(after_source_diff) + diffCost([{action:'remove', node:this.children[i]}]);
    }
    // does the next target one fits better?
    if(after_target) {
      after_target_diff = this.children[i]._diff(after_target, [], path + '.' + source_pt);
      after_target_cost = diffCost(after_target_diff) + diffCost([{action:'add', node:rendered_node.children[j]}]);
    }

    if((!after_target || cost <= after_target_cost) && (!after_source || cost <= after_source_cost)) {
      accu = accu.concat(diff);
      source_pt += 1;
    } else if(after_source && (!after_target || after_source_cost <= after_target_cost)) {
      accu.push({
        type: 'after_source',
        cost: after_source_cost,
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
        cost: after_target_cost,
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
  var changes = [], key, keys, i;
  keys = Object.keys(a);
  for(i=0; i<keys.length; i++) {
      key = keys[i];
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
  keys = Object.keys(b);
  for(i=0; i<keys.length; i++) {
      key = keys[i];
    if(a[key] === undefined) {
      changes.push({action:"add", key:key, value:b[key]});
    }
  }
  return changes;
}

function getDom(dom, path, stop) {
  var i, p=path.split('.'), child=dom;
  if(stop === undefined) {
    stop = 0;
  }
  var boundary=p.length - stop;
  for(i=1; i<boundary; i++) {
    child = child.childNodes[p[i] | 0];
  }
  return child;
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
  handicap:6
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

function Component(name, tpl, controller) {
  if (this.constructor !== Component) {
    return new Component(name, tpl, controller);
  }
  if(componentCache[name]) {
    util.CompileError("Component with name " + name + " already exist");
  }
  componentCache[name] = this;
  this.name = name;
  this.template = buildTemplate(tpl);
  this.controller = controller;
}

function ContextName(name) {
  this.bits = name.split('.');
}

// this method is weirdly slow acording to Chrome
ContextName.prototype.substituteAlias = function(context) {
  if(context.aliases.hasOwnProperty(this.start())) {
    var newBits = context.aliases[this.start()].split('.');
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
          var expr = expression.jsExpression(s[1]);
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

Node.prototype.toStringLevel = function(level) {
  var str = "", i;
  for(i=0; i<level; i++) {
    str += "  ";
  }
  return str + String(this);
};

Node.prototype.repr = function(level, visited) {
  var str = "", i;
  if(level === undefined) {
    level = 0;
  }
  // avoid infite loop
  if(visited === undefined) {
    visited = [];
  } else if(visited.indexOf(this) != -1) {
    return this.toStringLevel(level) + " <-- Infinite recursion.\r\n";
  }
  visited.push(this);
  str = this.toStringLevel(level) + "\r\n";
  for(i=0; i<this.children.length; i++) {
    str += this.children[i].repr(level + 1, visited);
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

function RootNode() {
  Node.call(this, null, '', 0, null);
}
util.inherits(RootNode, Node);

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
  var t = new render.RenderedNode(this, context, this.nodeName, path);
  t.attrs = this.renderAttributes(context, path);
  t.children = this.treeChildren(context, path, pos);
  return t;
};

function bindingName(node) {
  if(node.binding) {
    return node.binding;
  }
}

function evaluate(item, context) {
  if(typeof item == "function") {
    return item(context);
  }
  if(item.evaluate) {
      return item.evaluate(context);
  }
  return item;
}

HtmlNode.prototype.renderAttributes = function(context, path) {
  var r_attrs = {}, key, attr, name, keys, i;
  keys = Object.keys(this.attrs);
  for(i=0; i<keys.length; i++) {
    key = keys[i];
    attr = this.attrs[key];
    // todo, find a better way to discriminate events
    if(key.indexOf("lk-") === 0) {
      // add the path to the render node to any lk-thing node
      r_attrs['lk-path'] = path;
      if(key === 'lk-bind') {
        r_attrs[key] = evaluate(attr, context);
      } else {
        r_attrs[key] = "true";
      }
      continue;
    }

    var v = evaluate(attr, context);

    if(v === false) {
      // nothing
    } else {
      r_attrs[key] = v;
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
  if(this.nodeName == "textarea" && this.children.length == 1 && this.children[0].expression) {
    name = bindingName(this.children[0].expression);
    if(name && this.attrs['lk-bind'] === undefined) {
      r_attrs['lk-bind'] = name;
      r_attrs['lk-path'] = path;
      // as soon as the user has altered the value of the textarea or script has altered
      // the value property of the textarea, the text node is out of the picture and is no
      // longer bound to the textarea's value in any way.
      r_attrs.value = this.children[0].expression(context);
    }
  }

  if(context.get('debug') === true) {
    r_attrs['lk-debug'] = String(this);
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
  sourceName = content.match(expression.nameReg);
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
  if(!d) {
    return t;
  }
  var keys = Object.keys(d), i;
  for(i = 0; i<keys.length; i++) {
    key = keys[i];
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
  this.expression = expression.jsExpression(content.replace(/^if/g, ""));
  parent.children.push(this);
}
util.inherits(IfNode, Node);

IfNode.prototype.tree = function(context, path, pos) {
  if(!this.expression(context)) {
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
  this.expression = expression.jsExpression(content.replace(/^elseif/g, ""));
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
  this.expression = expression.jsExpression(m[1]);
  parent.addChild(this);
}
util.inherits(ExpressionNode, Node);

ExpressionNode.prototype.tree = function(context, path) {
  // renderer
  var renderer = String(evaluate(this.expression, context));
  var t = new render.RenderedNode(this, context, renderer, path);
  return t;
};

ExpressionNode.prototype.domNode = function(context) {
  return document.createTextNode(evaluate(this.expression, context));
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
    value = evaluate(attr, context);
    new_context.set(key, value);
    if(typeof attr == 'function') {
      source = bindingName(attr);
      if(source && key != source) {
        new_context.addAlias(source, key);
      }
    }
  }
  if(this.component.controller){
    this.component.controller(new_context);
  }
  return this.component.template.treeChildren(new_context, path, pos);
};

ComponentNode.prototype.repr = function(level, visited) {
  visited.push(this);
  // cute the first node?
  return this.toStringLevel(level) + "\r\n" + this.component.template.repr(level + 1, visited);
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

  // already a template?
  if(tpl instanceof Node) {
    return tpl;
  }

  if(tpl instanceof Array) {
    tpl = tpl.join('\n');
  }

  var root = new RootNode(), lines, line, level,
    content, i, currentNode = root, parent, searchNode;

  // can useful in the inspector
  root.str = tpl;

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

function collectComponents() {
  var components = document.querySelectorAll('[type="likely/component"]'), i;
  for(i=0; i<components.length; i++) {
    if(!components[i].id) {
      throw new util.CompileError("Component is missing an id " + components[i].toString());
    }
    new Component(components[i].id, components[i].textContent);
  }
}

function collectTemplates() {
  var templates = document.querySelectorAll('[type="likely/template"]'), i;
  for(i=0; i<templates.length; i++) {
    if(!templates[i].id) {
      throw new util.CompileError("Template is missing an id " + templates[i].toString());
    }
    new buildTemplate(templates[i].textContent, templates[i].id);
  }
}

function collect(){
  collectComponents();
  collectTemplates();
}

module.exports = {
  buildTemplate: buildTemplate,
  parseAttributes: parseAttributes,
  Context: Context,
  templates: templateCache,
  components: componentCache,
  collectComponents: collectComponents,
  collectTemplates: collectTemplates,
  collect: collect,
  ContextName: ContextName,
  Component: Component,
  Node: Node
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
  var evt = new CustomEvent(name, {
    bubbles: true,
    cancelable: false,
    details: data
  });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL3VCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcblwidXNlIHN0cmljdFwiO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIEVYUFJFU1NJT05fUkVHID0gL157eyguKz8pfX0vO1xuXG5mdW5jdGlvbiBjb21waWxlVGV4dEFuZEV4cHJlc3Npb25zKHR4dCkge1xuICAvLyBjb21waWxlIHRoZSBleHByZXNzaW9ucyBmb3VuZCBpbiB0aGUgdGV4dFxuICAvLyBhbmQgcmV0dXJuIGEgbGlzdCBvZiB0ZXh0K2V4cHJlc3Npb25cbiAgdmFyIGV4cHIsIGFyb3VuZDtcbiAgdmFyIGxpc3QgPSBbXTtcbiAgd2hpbGUodHJ1ZSkge1xuICAgIHZhciBtYXRjaCA9IC97eyguKz8pfX0vLmV4ZWModHh0KTtcbiAgICBpZighbWF0Y2gpIHtcbiAgICAgIGlmKHR4dCkge1xuICAgICAgICBsaXN0LnB1c2godHh0KTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBleHByID0ganNFeHByZXNzaW9uKG1hdGNoWzFdKTtcbiAgICBhcm91bmQgPSB0eHQuc3BsaXQobWF0Y2hbMF0sIDIpO1xuICAgIGlmKGFyb3VuZFswXS5sZW5ndGgpIHtcbiAgICAgIGxpc3QucHVzaChhcm91bmRbMF0pO1xuICAgIH1cbiAgICBsaXN0LnB1c2goZXhwcik7XG4gICAgdHh0ID0gYXJvdW5kWzFdO1xuICB9XG4gIHJldHVybiBsaXN0O1xufVxuXG5mdW5jdGlvbiBldmFsdWF0ZUV4cHJlc3Npb25MaXN0KGV4cHJlc3Npb25zLCBjb250ZXh0KSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBmb3IoaT0wOyBpPGV4cHJlc3Npb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBleHByZXNzaW9uc1tpXTtcbiAgICBpZih0eXBlb2YgaXRlbSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHN0ciArPSBpdGVtKGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gaXRlbTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZU91dE9mU3RyaW5ncyhzdHIpIHtcbiAgdmFyIGluZGV4ID0gMCwgbGVuZ3RoID0gc3RyLmxlbmd0aCwgY2g7XG4gIHZhciBuZXdfc3RyID0gXCJcIiwgaW5TdHJpbmcgPSBudWxsLCBzdGFydCA9IDA7XG4gIHdoaWxlKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgY2ggPSBzdHIuY2hhckF0KGluZGV4KTtcbiAgICBpZihjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICBpbmRleCA9IGluZGV4ICsgMjtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZihjaCA9PT0gJ1wiJyB8fCBjaCA9PT0gXCInXCIpIHtcbiAgICAgIC8vIGNsb3NpbmcgYSBzdHJpbmdcbiAgICAgIGlmKGluU3RyaW5nID09PSBjaCkge1xuICAgICAgICBpblN0cmluZyA9IG51bGw7XG4gICAgICAgIG5ld19zdHIgPSBuZXdfc3RyICsgc3RyLnNsaWNlKHN0YXJ0LCBpbmRleCk7XG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBvcGVuaW5nIGEgc3RyaW5nXG4gICAgICAgIG5ld19zdHIgPSBuZXdfc3RyICsgcmVwbGFjZU5hbWVzKHN0ci5zbGljZShzdGFydCwgaW5kZXgpKTtcbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgaW5TdHJpbmcgPSBjaDtcbiAgICAgIH1cbiAgICB9XG4gICAgaW5kZXggPSBpbmRleCArIDE7XG4gIH1cbiAgbmV3X3N0ciArPSByZXBsYWNlTmFtZXMoc3RyLnNsaWNlKHN0YXJ0LCBpbmRleCkpO1xuICByZXR1cm4gbmV3X3N0cjtcbn1cblxudmFyIG5hbWVSZWcgPSAvW2EtekEtWl8kXVswLTlhLXpBLVpfJFxcLl0qL2dtO1xudmFyIGphdmFzY3JpcHRWYWx1ZXMgPSBbJ3RydWUnLCAnZmFsc2UnLCAndW5kZWZpbmVkJywgJ251bGwnXTtcblxuZnVuY3Rpb24gcmVwbGFjZU5hbWVzKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UobmFtZVJlZywgZnVuY3Rpb24oX25hbWUpIHtcbiAgICBpZihqYXZhc2NyaXB0VmFsdWVzLmluZGV4T2YoX25hbWUpID4gLTEpIHtcbiAgICAgIHJldHVybiBfbmFtZTtcbiAgICB9XG4gICAgaWYoIV9uYW1lLm1hdGNoKC9eY29udGV4dC8pICYmIChfbmFtZSAhPSAndHJ1ZScgJiYgX25hbWUgIT0gJ2ZhbHNlJykpIHtcbiAgICAgIHJldHVybiAnY29udGV4dC5nZXQoXCInK19uYW1lKydcIiknO1xuICAgIH1cbiAgICByZXR1cm4gX25hbWU7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBqc0V4cHJlc3Npb24oc291cmNlKSB7XG4gIHZhciBoYXNOYW1lID0gc291cmNlLm1hdGNoKG5hbWVSZWcpO1xuICB2YXIgbmV3U291cmNlID0gcmVwbGFjZU91dE9mU3RyaW5ncyhzb3VyY2UpO1xuICB2YXIgZmN0ID0gbmV3IEZ1bmN0aW9uKCdjb250ZXh0JywgJ3JldHVybiAnICsgbmV3U291cmNlKTtcbiAgLy8gb25seSBvbmUgbmFtZT8gdGhpcyBpcyBhIGNhbmRpZGF0ZSBmb3IgZGF0YSBiaW5kaW5nXG4gIGlmKGhhc05hbWUgJiYgaGFzTmFtZS5sZW5ndGggPT0gMSAmJiB1dGlsLnRyaW0oc291cmNlKSA9PSBoYXNOYW1lWzBdKSB7XG4gICAgZmN0LmJpbmRpbmcgPSBoYXNOYW1lWzBdO1xuICB9XG4gIHJldHVybiBmY3Q7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBuYW1lUmVnOm5hbWVSZWcsXG4gIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnM6Y29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyxcbiAgZXZhbHVhdGVFeHByZXNzaW9uTGlzdDpldmFsdWF0ZUV4cHJlc3Npb25MaXN0LFxuICBqc0V4cHJlc3Npb246anNFeHByZXNzaW9uLFxuICByZXBsYWNlTmFtZXM6cmVwbGFjZU5hbWVzLFxuICByZXBsYWNlT3V0T2ZTdHJpbmdzOnJlcGxhY2VPdXRPZlN0cmluZ3MsXG4gIEVYUFJFU1NJT05fUkVHOkVYUFJFU1NJT05fUkVHXG59OyIsIi8qIExpa2VseS5qcyxcbiAgIFB5dGhvbiBzdHlsZSBIVE1MIHRlbXBsYXRlIGxhbmd1YWdlIHdpdGggYmktZGlyZWN0aW9ubmFsIGRhdGEgYmluZGluZ1xuICAgYmF0aXN0ZSBiaWVsZXIgMjAxNCAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKTtcbnZhciBleHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJyk7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJyk7XG5cbmZ1bmN0aW9uIHVwZGF0ZURhdGEoY29udGV4dCwgZG9tKSB7XG4gIHZhciBuYW1lID0gZG9tLmdldEF0dHJpYnV0ZShcImxrLWJpbmRcIiksIHZhbHVlO1xuICBpZighbmFtZSkge1xuICAgIHRocm93IFwiTm8gbGstYmluZCBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnRcIjtcbiAgfVxuICBpZihkb20udHlwZSA9PSAnY2hlY2tib3gnICYmICFkb20uY2hlY2tlZCkge1xuICAgIHZhbHVlID0gXCJcIjtcbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRvbS52YWx1ZTsvLyB8fCBkb20uZ2V0QXR0cmlidXRlKFwidmFsdWVcIik7XG4gIH1cbiAgLy8gdXBkYXRlIHRoZSBjb250ZXh0XG4gIGNvbnRleHQubW9kaWZ5KG5hbWUsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gQmluZGluZyhkb20sIHRwbCwgZGF0YSkge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQmluZGluZykge1xuICAgIHJldHVybiBuZXcgQmluZGluZyhkb20sIHRwbCwgZGF0YSk7XG4gIH1cbiAgLy8gZG91YmxlIGRhdGEgYmluZGluZyBiZXR3ZWVuIHNvbWUgZGF0YSBhbmQgc29tZSBkb21cbiAgdGhpcy5kb20gPSBkb207XG4gIGlmKGRhdGEgPT09IHVuZGVmaW5lZCAmJiAhKHRwbCBpbnN0YW5jZW9mIHRlbXBsYXRlLk5vZGUpKSB7XG4gICAgZGF0YSA9IHRwbDtcbiAgICB0cGwgPSB0ZW1wbGF0ZS5idWlsZFRlbXBsYXRlKGRvbS50ZXh0Q29udGVudCk7XG4gIH1cbiAgdGhpcy5kYXRhID0gZGF0YTtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRwbDtcbiAgdGhpcy5jb250ZXh0ID0gbmV3IHRlbXBsYXRlLkNvbnRleHQodGhpcy5kYXRhKTtcbiAgdGhpcy5zY2hlZHVsZWQgPSBmYWxzZTtcbiAgdGhpcy5jYWxsYmFja3MgPSBbXTtcbn1cblxuQmluZGluZy5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZS50cmVlKG5ldyB0ZW1wbGF0ZS5Db250ZXh0KHRoaXMuZGF0YSkpO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmRvbS5pbm5lckhUTUwgPSBcIlwiO1xuICB0aGlzLmN1cnJlbnRUcmVlID0gdGhpcy50cmVlKCk7XG4gIHRoaXMuY3VycmVudFRyZWUuZG9tVHJlZSh0aGlzLmRvbSk7XG4gIHRoaXMuYmluZEV2ZW50cygpO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuZG9tSW5pdCA9IGZ1bmN0aW9uKCkge1xuICAvLyBjcmVhdGUgYW4gaW5pdGlhbCB0cmVlIGZyb20gdGhlIERPTVxuICB0aGlzLmN1cnJlbnRUcmVlID0gcmVuZGVyLmluaXRpYWxSZW5kZXJGcm9tRG9tKHRoaXMuZG9tKTtcbiAgdGhpcy5jdXJyZW50VHJlZS5ub2RlTmFtZSA9IHVuZGVmaW5lZDtcbiAgdGhpcy5iaW5kRXZlbnRzKCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kaWZmID0gZnVuY3Rpb24oKSB7XG4gIHZhciBuZXdUcmVlID0gdGhpcy50cmVlKCk7XG4gIHZhciBkaWZmID0gdGhpcy5jdXJyZW50VHJlZS5kaWZmKG5ld1RyZWUpO1xuICByZW5kZXIuYXBwbHlEaWZmKGRpZmYsIHRoaXMuZG9tKTtcbiAgdGhpcy5jdXJyZW50VHJlZSA9IG5ld1RyZWU7XG4gIHRoaXMubG9jayA9IGZhbHNlO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuZGF0YUV2ZW50ID0gZnVuY3Rpb24oZSkge1xuICB2YXIgZG9tID0gZS50YXJnZXQ7XG4gIHZhciBuYW1lID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstYmluZCcpO1xuICBpZihuYW1lKSB7XG4gICAgdmFyIHJlbmRlck5vZGUgPSB0aGlzLmdldFJlbmRlck5vZGVGcm9tUGF0aChkb20pO1xuICAgIGlmKCF0aGlzLmxvY2spIHtcbiAgICAgIC8vIGRvIG5vdCB1cGRhdGUgZHVyaW5nIGEgcmVuZGVyXG4gICAgICB1cGRhdGVEYXRhKHJlbmRlck5vZGUuY29udGV4dCwgZG9tKTtcbiAgICAgIHRoaXMubG9jayA9IHRydWU7XG4gICAgICB0aGlzLmRpZmYoKTtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyKCdkYXRhVmlld0NoYW5nZWQnLCB7XCJuYW1lXCI6IG5hbWV9KTtcbiAgfVxufTtcblxuQmluZGluZy5wcm90b3R5cGUuZ2V0UmVuZGVyTm9kZUZyb21QYXRoID0gZnVuY3Rpb24oZG9tKSB7XG4gIHZhciBwYXRoID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstcGF0aCcpO1xuICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuY3VycmVudFRyZWU7XG4gIHZhciBiaXRzID0gcGF0aC5zcGxpdChcIi5cIiksIGk7XG4gIGZvcihpPTE7IGk8Yml0cy5sZW5ndGg7IGkrKykge1xuICAgIHJlbmRlck5vZGUgPSByZW5kZXJOb2RlLmNoaWxkcmVuW2JpdHNbaV1dO1xuICB9XG4gIHJldHVybiByZW5kZXJOb2RlO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKG5hbWUsIG9iaikge1xuICB0aGlzLmRvbS5kaXNwYXRjaEV2ZW50KFxuICAgIHV0aWwuZXZlbnQobmFtZSwgb2JqKVxuICApO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuYW55RXZlbnQgPSBmdW5jdGlvbihlKSB7XG4gIHZhciBkb20gPSBlLnRhcmdldDtcbiAgdmFyIGxrRXZlbnQgPSBkb20uZ2V0QXR0cmlidXRlKCdsay0nICsgZS50eXBlKTtcbiAgaWYoIWxrRXZlbnQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHJlbmRlck5vZGUgPSB0aGlzLmdldFJlbmRlck5vZGVGcm9tUGF0aChkb20pO1xuICB2YXIgY3R4ID0gdGVtcGxhdGUuQ29udGV4dCh7ZXZlbnQ6IGV9LCByZW5kZXJOb2RlLmNvbnRleHQpO1xuICByZW5kZXJOb2RlLm5vZGUuYXR0cnNbJ2xrLScrZS50eXBlXShjdHgpO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuYmluZEV2ZW50cyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaTtcbiAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uKGUpeyB0aGlzLmRhdGFFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7IHRoaXMuZGF0YUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgdmFyIGV2ZW50cyA9IFwiY2xpY2ssY2hhbmdlLG1vdXNlb3Zlcixmb2N1c291dCxmb2N1c2luLGtleWRvd24sa2V5dXAsa2V5cHJlc3Msc3VibWl0XCIuc3BsaXQoJywnKTtcbiAgZm9yKGk9MDsgaTxldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgZXZlbnRzW2ldLFxuICAgICAgZnVuY3Rpb24oZSl7IHRoaXMuYW55RXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB9XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBpZihjYWxsYmFjaykge1xuICAgIHRoaXMuY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICB9XG4gIGlmKHRoaXMuc2NoZWR1bGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICBpZigodGhpcy5sYXN0VXBkYXRlICYmIChub3cgLSB0aGlzLmxhc3RVcGRhdGUpIDwgMjUpIHx8IHRoaXMubG9jaykge1xuICAgIHRoaXMuc2NoZWR1bGVkID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIGF2b2lkIDIgZGlmZnMgYXQgdGhlIHNhbWUgdGltZVxuICB0aGlzLmxvY2sgPSB0cnVlO1xuICB0aGlzLmxhc3RVcGRhdGUgPSBub3c7XG4gIHRoaXMuZGlmZigpO1xuICB0aGlzLnRyaWdnZXIoJ3VwZGF0ZScpO1xuICB3aGlsZSh0aGlzLmNhbGxiYWNrcy5sZW5ndGgpIHtcbiAgICB0aGlzLmNhbGxiYWNrcy5wb3AoKSgpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgVGVtcGxhdGU6dGVtcGxhdGUuYnVpbGRUZW1wbGF0ZSxcbiAgQ29udGV4dE5hbWU6dGVtcGxhdGUuQ29udGV4dE5hbWUsXG4gIHVwZGF0ZURhdGE6dXBkYXRlRGF0YSxcbiAgQmluZGluZzpCaW5kaW5nLFxuICBDb21wb25lbnQ6dGVtcGxhdGUuQ29tcG9uZW50LFxuICBnZXREb206cmVuZGVyLmdldERvbSxcbiAgYXBwbHlEaWZmOnJlbmRlci5hcHBseURpZmYsXG4gIC8vZGlmZkNvc3Q6cmVuZGVyLmRpZmZDb3N0LFxuICBhdHRyaWJ1dGVzRGlmZjpyZW5kZXIuYXR0cmlidXRlc0RpZmYsXG4gIENvbnRleHQ6dGVtcGxhdGUuQ29udGV4dCxcbiAgQ29tcGlsZUVycm9yOnV0aWwuQ29tcGlsZUVycm9yLFxuICBSdW50aW1lRXJyb3I6dXRpbC5SdW50aW1lRXJyb3IsXG4gIGVzY2FwZTp1dGlsLmVzY2FwZSxcbiAgaW5pdGlhbFJlbmRlckZyb21Eb206cmVuZGVyLmluaXRpYWxSZW5kZXJGcm9tRG9tLFxuICBleHByZXNzaW9uOmV4cHJlc3Npb24sXG4gIHJlbmRlcjpyZW5kZXIsXG4gIHRlbXBsYXRlOnRlbXBsYXRlLFxuICB1dGlsOnV0aWwsXG4gIHNldEhhbmRpY2FwOmZ1bmN0aW9uKG4pe3JlbmRlci5oYW5kaWNhcCA9IG47fVxufTtcbiIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIFJlbmRlcmVkTm9kZShub2RlLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCkge1xuICB0aGlzLmNoaWxkcmVuID0gW107XG4gIHRoaXMubm9kZSA9IG5vZGU7XG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMucmVuZGVyZXIgPSByZW5kZXJlcjtcbiAgdGhpcy5wYXRoID0gcGF0aCB8fCBcIlwiO1xuICAvLyBzaG9ydGN1dFxuICB0aGlzLm5vZGVOYW1lID0gbm9kZS5ub2RlTmFtZTtcbn1cblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGlmKGxldmVsID09PSB1bmRlZmluZWQpIHtcbiAgICBsZXZlbCA9IDA7XG4gIH1cbiAgZm9yKGk9MDsgaTxsZXZlbDsgaSsrKSB7XG4gICAgc3RyICs9IFwiICBcIjtcbiAgfVxuICBzdHIgKz0gU3RyaW5nKHRoaXMubm9kZSkgKyBcIiBwYXRoIFwiICsgdGhpcy5wYXRoICsgXCJcXHJcXG5cIjtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgc3RyICs9IHRoaXMuY2hpbGRyZW5baV0ucmVwcihsZXZlbCArIDEpO1xuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRvbVRyZWUgPSBmdW5jdGlvbihhcHBlbmRfdG8pIHtcbiAgdmFyIG5vZGUgPSBhcHBlbmRfdG8gfHwgdGhpcy5ub2RlLmRvbU5vZGUodGhpcy5jb250ZXh0LCB0aGlzLnBhdGgpLCBpLCBjaGlsZF90cmVlO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBjaGlsZF90cmVlID0gdGhpcy5jaGlsZHJlbltpXS5kb21UcmVlKCk7XG4gICAgaWYobm9kZS5wdXNoKSB7XG4gICAgICBub2RlLnB1c2goY2hpbGRfdHJlZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGRfdHJlZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBub2RlO1xufTtcblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5kb21IdG1sID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpO1xuICAvL3ZhciBkID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgY2hpbGQgPSB0aGlzLmNoaWxkcmVuW2ldLmRvbVRyZWUoKTtcbiAgICBkLmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgfVxuICByZXR1cm4gZC5pbm5lckhUTUw7XG59O1xuXG5mdW5jdGlvbiBjb3VudENoaWxkcmVuKG5vZGUpIHtcbiAgdmFyIHZhbHVlID0gbm9kZS5jaGlsZHJlbi5sZW5ndGgsIGk7XG4gIGZvcihpPTA7IGk8bm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHZhbHVlID0gdmFsdWUgKyBjb3VudENoaWxkcmVuKG5vZGUuY2hpbGRyZW5baV0pO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZGlmZkNvc3QoZGlmZikge1xuICB2YXIgdmFsdWU9MCwgaTtcbiAgZm9yKGk9MDsgaTxkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgdmFsdWUgKz0gMjtcbiAgICAgIHZhbHVlICs9IDIgKiBjb3VudENoaWxkcmVuKGRpZmZbaV0ubm9kZSk7XG4gICAgfVxuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwiYWRkXCIpIHtcbiAgICAgIHZhbHVlICs9IDI7XG4gICAgICB2YWx1ZSArPSAyICogY291bnRDaGlsZHJlbihkaWZmW2ldLm5vZGUpO1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICB2YWx1ZSArPSAxO1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcInN0cmluZ211dGF0ZVwiKSB7XG4gICAgICB2YWx1ZSArPSAxO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuX2RpZmYgPSBmdW5jdGlvbihyZW5kZXJlZF9ub2RlLCBhY2N1LCBwYXRoKSB7XG4gIHZhciBpLCBqLCBzb3VyY2VfcHQgPSAwO1xuICBpZihwYXRoID09PSB1bmRlZmluZWQpIHsgcGF0aCA9IFwiXCI7IH1cblxuICBpZighcmVuZGVyZWRfbm9kZSkge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgbm9kZTogdGhpcyxcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfVxuXG4gIGlmKHJlbmRlcmVkX25vZGUubm9kZU5hbWUgIT0gdGhpcy5ub2RlTmFtZSkge1xuXG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIHR5cGU6ICdkaWZmZXJlbnRfbm9kZU5hbWUnLFxuICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgIG5vZGU6IHRoaXMsXG4gICAgICBwYXRoOiBwYXRoXG4gICAgfSk7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIHR5cGU6ICdkaWZmZXJlbnRfbm9kZU5hbWUnLFxuICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUsXG4gICAgICAvLyB3aGVuIGEgbm9kZSBpcyBhZGRlZCwgd2UgcG9pbnQgdG8gdGhlIG5leHQgbm9kZSBhcyBpbnNlcnRCZWZvcmUgaXMgdXNlZFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9XG5cbiAgLy8gQ291bGQgdXNlIGluaGVyaXRhbmNlIGZvciB0aGlzXG4gIGlmKHRoaXMubm9kZU5hbWUgPT0gXCIjdGV4dFwiICYmIHRoaXMucmVuZGVyZXIgIT0gcmVuZGVyZWRfbm9kZS5yZW5kZXJlcikge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAnc3RyaW5nbXV0YXRlJyxcbiAgICAgICAgbm9kZTogdGhpcyxcbiAgICAgICAgdmFsdWU6IHJlbmRlcmVkX25vZGUucmVuZGVyZXIsXG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9IGVsc2Uge1xuICAgIHZhciBhX2RpZmYgPSBhdHRyaWJ1dGVzRGlmZih0aGlzLmF0dHJzIHx8IHt9LCByZW5kZXJlZF9ub2RlLmF0dHJzIHx8IHt9KTtcbiAgICBpZihhX2RpZmYubGVuZ3RoKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdtdXRhdGUnLFxuICAgICAgICBub2RlOiB0aGlzLFxuICAgICAgICBhdHRyaWJ1dGVzRGlmZjogYV9kaWZmLFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICB2YXIgbDEgPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDtcbiAgdmFyIGwyID0gcmVuZGVyZWRfbm9kZS5jaGlsZHJlbi5sZW5ndGg7XG5cbiAgLy8gbm8gc3dhcCBwb3NzaWJsZSwgYnV0IGRlbGV0aW5nIGEgbm9kZSBpcyBwb3NzaWJsZVxuICBqID0gMDsgaSA9IDA7IHNvdXJjZV9wdCA9IDA7XG4gIC8vIGxldCdzIGdvdCB0cm91Z2ggYWxsIHRoZSBjaGlsZHJlblxuICBmb3IoOyBpPGwxOyBpKyspIHtcblxuICAgIHZhciBkaWZmID0gMCwgYWZ0ZXJfc291cmNlX2RpZmYgPSAwLCBhZnRlcl90YXJnZXRfZGlmZiA9IDAsIGFmdGVyX3NvdXJjZV9jb3N0PW51bGwsIGFmdGVyX3RhcmdldF9jb3N0PW51bGw7XG4gICAgdmFyIGFmdGVyX3RhcmdldCA9IHJlbmRlcmVkX25vZGUuY2hpbGRyZW5baisxXTtcbiAgICB2YXIgYWZ0ZXJfc291cmNlID0gdGhpcy5jaGlsZHJlbltpKzFdO1xuXG4gICAgaWYoIXJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0pIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICAgIG5vZGU6IHRoaXMuY2hpbGRyZW5baV0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyBzb3VyY2VfcHRcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgZGlmZiA9IHRoaXMuY2hpbGRyZW5baV0uX2RpZmYocmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSwgW10sIHBhdGggKyAnLicgKyBzb3VyY2VfcHQpO1xuXG4gICAgdmFyIGNvc3QgPSBkaWZmQ29zdChkaWZmKTtcbiAgICAvLyBkb2VzIHRoZSBuZXh0IHNvdXJjZSBvbmUgZml0cyBiZXR0ZXI/XG4gICAgaWYoYWZ0ZXJfc291cmNlKSB7XG4gICAgICBhZnRlcl9zb3VyY2VfZGlmZiA9IGFmdGVyX3NvdXJjZS5fZGlmZihyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG4gICAgICAvLyBuZWVkcyBzb21lIGhhbmRpY2FwIG90aGVyd2lzZSBpbnB1dHMgY29udGFpbmluZyB0aGUgY3VycmVudCBmb2N1c1xuICAgICAgLy8gbWlnaHQgYmUgcmVtb3ZlZFxuICAgICAgYWZ0ZXJfc291cmNlX2Nvc3QgPSBkaWZmQ29zdChhZnRlcl9zb3VyY2VfZGlmZikgKyBkaWZmQ29zdChbe2FjdGlvbjoncmVtb3ZlJywgbm9kZTp0aGlzLmNoaWxkcmVuW2ldfV0pO1xuICAgIH1cbiAgICAvLyBkb2VzIHRoZSBuZXh0IHRhcmdldCBvbmUgZml0cyBiZXR0ZXI/XG4gICAgaWYoYWZ0ZXJfdGFyZ2V0KSB7XG4gICAgICBhZnRlcl90YXJnZXRfZGlmZiA9IHRoaXMuY2hpbGRyZW5baV0uX2RpZmYoYWZ0ZXJfdGFyZ2V0LCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG4gICAgICBhZnRlcl90YXJnZXRfY29zdCA9IGRpZmZDb3N0KGFmdGVyX3RhcmdldF9kaWZmKSArIGRpZmZDb3N0KFt7YWN0aW9uOidhZGQnLCBub2RlOnJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal19XSk7XG4gICAgfVxuXG4gICAgaWYoKCFhZnRlcl90YXJnZXQgfHwgY29zdCA8PSBhZnRlcl90YXJnZXRfY29zdCkgJiYgKCFhZnRlcl9zb3VyY2UgfHwgY29zdCA8PSBhZnRlcl9zb3VyY2VfY29zdCkpIHtcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChkaWZmKTtcbiAgICAgIHNvdXJjZV9wdCArPSAxO1xuICAgIH0gZWxzZSBpZihhZnRlcl9zb3VyY2UgJiYgKCFhZnRlcl90YXJnZXQgfHwgYWZ0ZXJfc291cmNlX2Nvc3QgPD0gYWZ0ZXJfdGFyZ2V0X2Nvc3QpKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICB0eXBlOiAnYWZ0ZXJfc291cmNlJyxcbiAgICAgICAgY29zdDogYWZ0ZXJfc291cmNlX2Nvc3QsXG4gICAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICAgIG5vZGU6IHRoaXMuY2hpbGRyZW5baV0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyBzb3VyY2VfcHRcbiAgICAgIH0pO1xuICAgICAgYWNjdSA9IGFjY3UuY29uY2F0KGFmdGVyX3NvdXJjZV9kaWZmKTtcbiAgICAgIHNvdXJjZV9wdCArPSAxO1xuICAgICAgaSsrO1xuICAgIH0gZWxzZSBpZihhZnRlcl90YXJnZXQpIHtcbiAgICAgIC8vIGltcG9ydGFudCB0byBhZGQgdGhlIGRpZmYgYmVmb3JlXG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoYWZ0ZXJfdGFyZ2V0X2RpZmYpO1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2FmdGVyX3RhcmdldCcsXG4gICAgICAgIGNvc3Q6IGFmdGVyX3RhcmdldF9jb3N0LFxuICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICBub2RlOiByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgKHNvdXJjZV9wdClcbiAgICAgIH0pO1xuICAgICAgc291cmNlX3B0ICs9IDI7XG4gICAgICBqKys7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IFwiU2hvdWxkIG5ldmVyIGhhcHBlblwiO1xuICAgIH1cbiAgICBqKys7XG4gIH1cblxuICAvLyBuZXcgbm9kZXMgdG8gYmUgYWRkZWQgYWZ0ZXIgdGhlIGRpZmZcbiAgZm9yKGk9MDsgaTwobDItaik7IGkrKykge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICB0eXBlOiAnbmV3X25vZGUnLFxuICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUuY2hpbGRyZW5baitpXSxcbiAgICAgIC8vIHdoZW4gYSBub2RlIGlzIGFkZGVkLCB3ZSBwb2ludCB0byB0aGUgbmV4dCBub2RlIGFzIGluc2VydEJlZm9yZSBpcyB1c2VkXG4gICAgICBwYXRoOiBwYXRoICsgJy4nICsgKHNvdXJjZV9wdCArIDEpXG4gICAgfSk7XG4gICAgc291cmNlX3B0ICs9IDE7XG4gIH1cblxuICByZXR1cm4gYWNjdTtcblxufTtcblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5kaWZmID0gZnVuY3Rpb24ocmVuZGVyZWRfbm9kZSkge1xuICB2YXIgYWNjdSA9IFtdO1xuICByZXR1cm4gdGhpcy5fZGlmZihyZW5kZXJlZF9ub2RlLCBhY2N1KTtcbn07XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZXNEaWZmKGEsIGIpIHtcbiAgdmFyIGNoYW5nZXMgPSBbXSwga2V5LCBrZXlzLCBpO1xuICBrZXlzID0gT2JqZWN0LmtleXMoYSk7XG4gIGZvcihpPTA7IGk8a2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgIGlmKGJba2V5XSA9PT0gZmFsc2UpIHtcbiAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJyZW1vdmVcIiwga2V5OmtleX0pO1xuICAgICAgfSBlbHNlIGlmKGJba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmKGJba2V5XSAhPSBhW2tleV0pIHtcbiAgICAgICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcIm11dGF0ZVwiLCBrZXk6a2V5LCB2YWx1ZTpiW2tleV19KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJyZW1vdmVcIiwga2V5OmtleX0pO1xuICAgICAgfVxuICB9XG4gIGtleXMgPSBPYmplY3Qua2V5cyhiKTtcbiAgZm9yKGk9MDsgaTxrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGlmKGFba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcImFkZFwiLCBrZXk6a2V5LCB2YWx1ZTpiW2tleV19KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNoYW5nZXM7XG59XG5cbmZ1bmN0aW9uIGdldERvbShkb20sIHBhdGgsIHN0b3ApIHtcbiAgdmFyIGksIHA9cGF0aC5zcGxpdCgnLicpLCBjaGlsZD1kb207XG4gIGlmKHN0b3AgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0b3AgPSAwO1xuICB9XG4gIHZhciBib3VuZGFyeT1wLmxlbmd0aCAtIHN0b3A7XG4gIGZvcihpPTE7IGk8Ym91bmRhcnk7IGkrKykge1xuICAgIGNoaWxkID0gY2hpbGQuY2hpbGROb2Rlc1twW2ldIHwgMF07XG4gIH1cbiAgcmV0dXJuIGNoaWxkO1xufVxuXG5mdW5jdGlvbiBhcHBseURpZmYoZGlmZiwgZG9tKSB7XG4gIHZhciBpLCBqLCBfZGlmZiwgX2RvbSwgcGFyZW50O1xuICBmb3IoaT0wOyBpPGRpZmYubGVuZ3RoOyBpKyspIHtcbiAgICBfZGlmZiA9IGRpZmZbaV07XG4gICAgX2RvbSA9IGdldERvbShkb20sIF9kaWZmLnBhdGgpO1xuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcInJlbW92ZVwiKSB7XG4gICAgICBfZG9tLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoX2RvbSk7XG4gICAgfVxuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICB2YXIgbmV3Tm9kZSA9IF9kaWZmLm5vZGUuZG9tVHJlZSgpO1xuICAgICAgaWYoX2RvbSkge1xuICAgICAgICBfZG9tLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5ld05vZGUsIF9kb20pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZ2V0IHRoZSBwYXJlbnRcbiAgICAgICAgcGFyZW50ID0gZ2V0RG9tKGRvbSwgX2RpZmYucGF0aCwgMSk7XG4gICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChuZXdOb2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwibXV0YXRlXCIpIHtcbiAgICAgIGZvcihqPTA7IGo8X2RpZmYuYXR0cmlidXRlc0RpZmYubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIGFfZGlmZiA9IF9kaWZmLmF0dHJpYnV0ZXNEaWZmW2pdO1xuICAgICAgICBpZihhX2RpZmYuYWN0aW9uID09IFwibXV0YXRlXCIpIHtcbiAgICAgICAgICAvLyBpbXBvcnRhbnQgZm9yIHNlbGVjdFxuICAgICAgICAgIGlmKFwidmFsdWUsc2VsZWN0ZWQsY2hlY2tlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIGlmKF9kb21bYV9kaWZmLmtleV0gIT0gYV9kaWZmLnZhbHVlKSB7XG4gICAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBhX2RpZmYudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIF9kb20uc2V0QXR0cmlidXRlKGFfZGlmZi5rZXksIGFfZGlmZi52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcInJlbW92ZVwiKSB7XG4gICAgICAgICAgaWYoXCJjaGVja2VkLHNlbGVjdGVkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfZG9tLnJlbW92ZUF0dHJpYnV0ZShhX2RpZmYua2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZihhX2RpZmYuYWN0aW9uID09IFwiYWRkXCIpIHtcbiAgICAgICAgICBpZihcImNoZWNrZWQsc2VsZWN0ZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gYV9kaWZmLnZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfZG9tLnNldEF0dHJpYnV0ZShhX2RpZmYua2V5LCBhX2RpZmYudmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcInN0cmluZ211dGF0ZVwiKSB7XG4gICAgICBfZG9tLm5vZGVWYWx1ZSA9IF9kaWZmLnZhbHVlO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0aWFsUmVuZGVyRnJvbURvbShkb20sIHBhdGgpIHtcbiAgcGF0aCA9IHBhdGggfHwgXCJcIjtcbiAgdmFyIGksIGNoaWxkLCBjaGlsZHJlbiA9IFtdLCBhdHRycyA9IHt9LCByZW5kZXJlciA9ICcnO1xuICBpZihkb20uYXR0cmlidXRlcykge1xuICAgIGZvcihpPTA7IGkgPCBkb20uYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGF0dHIgPSBkb20uYXR0cmlidXRlc1tpXTtcbiAgICAgIGF0dHJzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgIH1cbiAgfVxuICBpZihkb20uY2hpbGROb2Rlcykge1xuICAgIGZvcihpPTA7IGkgPCBkb20uY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hpbGQgPSBkb20uY2hpbGROb2Rlc1tpXTtcbiAgICAgIGNoaWxkcmVuLnB1c2goaW5pdGlhbFJlbmRlckZyb21Eb20oY2hpbGQsIHBhdGggKyAnLicgKyBpKSk7XG4gICAgfVxuICB9XG4gIGlmKGRvbS50ZXh0Q29udGVudCkge1xuICAgIHJlbmRlcmVyID0gZG9tLnRleHRDb250ZW50O1xuICB9XG4gIHZhciBybiA9IG5ldyBSZW5kZXJlZE5vZGUoXG4gICAge25vZGVOYW1lOiBkb20ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSwgbm9kZTpkb219LFxuICAgIHVuZGVmaW5lZCxcbiAgICByZW5kZXJlcixcbiAgICBwYXRoKTtcbiAgcm4uYXR0cnMgPSBhdHRycztcbiAgcm4uY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgcmV0dXJuIHJuO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgUmVuZGVyZWROb2RlOlJlbmRlcmVkTm9kZSxcbiAgaW5pdGlhbFJlbmRlckZyb21Eb206aW5pdGlhbFJlbmRlckZyb21Eb20sXG4gIGFwcGx5RGlmZjphcHBseURpZmYsXG4gIGF0dHJpYnV0ZXNEaWZmOmF0dHJpYnV0ZXNEaWZmLFxuICBkaWZmQ29zdDpkaWZmQ29zdCxcbiAgZ2V0RG9tOmdldERvbSxcbiAgaGFuZGljYXA6NlxufTsiLCJcblwidXNlIHN0cmljdFwiO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpO1xudmFyIGV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcblxudmFyIHRlbXBsYXRlQ2FjaGUgPSB7fTtcbnZhciBjb21wb25lbnRDYWNoZSA9IHt9O1xuLy8gYSBuYW1lIGhlcmUgaXMgYWxzbyBhbnkgdmFsaWQgSlMgb2JqZWN0IHByb3BlcnR5XG52YXIgVkFSTkFNRV9SRUcgPSAvXlthLXpBLVpfJF1bMC05YS16QS1aXyRdKi87XG52YXIgSFRNTF9BVFRSX1JFRyA9IC9eW0EtWmEtel1bXFx3LV17MCx9LztcbnZhciBET1VCTEVfUVVPVEVEX1NUUklOR19SRUcgPSAvXlwiKFxcXFxcInxbXlwiXSkqXCIvO1xuXG5mdW5jdGlvbiBDb21wb25lbnQobmFtZSwgdHBsLCBjb250cm9sbGVyKSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBDb21wb25lbnQpIHtcbiAgICByZXR1cm4gbmV3IENvbXBvbmVudChuYW1lLCB0cGwsIGNvbnRyb2xsZXIpO1xuICB9XG4gIGlmKGNvbXBvbmVudENhY2hlW25hbWVdKSB7XG4gICAgdXRpbC5Db21waWxlRXJyb3IoXCJDb21wb25lbnQgd2l0aCBuYW1lIFwiICsgbmFtZSArIFwiIGFscmVhZHkgZXhpc3RcIik7XG4gIH1cbiAgY29tcG9uZW50Q2FjaGVbbmFtZV0gPSB0aGlzO1xuICB0aGlzLm5hbWUgPSBuYW1lO1xuICB0aGlzLnRlbXBsYXRlID0gYnVpbGRUZW1wbGF0ZSh0cGwpO1xuICB0aGlzLmNvbnRyb2xsZXIgPSBjb250cm9sbGVyO1xufVxuXG5mdW5jdGlvbiBDb250ZXh0TmFtZShuYW1lKSB7XG4gIHRoaXMuYml0cyA9IG5hbWUuc3BsaXQoJy4nKTtcbn1cblxuLy8gdGhpcyBtZXRob2QgaXMgd2VpcmRseSBzbG93IGFjb3JkaW5nIHRvIENocm9tZVxuQ29udGV4dE5hbWUucHJvdG90eXBlLnN1YnN0aXR1dGVBbGlhcyA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgaWYoY29udGV4dC5hbGlhc2VzLmhhc093blByb3BlcnR5KHRoaXMuc3RhcnQoKSkpIHtcbiAgICB2YXIgbmV3Qml0cyA9IGNvbnRleHQuYWxpYXNlc1t0aGlzLnN0YXJ0KCldLnNwbGl0KCcuJyk7XG4gICAgdGhpcy5iaXRzLnNoaWZ0KCk7XG4gICAgdGhpcy5iaXRzID0gbmV3Qml0cy5jb25jYXQodGhpcy5iaXRzKTtcbiAgfVxufTtcblxuQ29udGV4dE5hbWUucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmJpdHNbMF07XG59O1xuXG5Db250ZXh0TmFtZS5wcm90b3R5cGUuc3RyID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmJpdHMuam9pbignLicpO1xufTtcblxuZnVuY3Rpb24gQ29udGV4dChkYXRhLCBwYXJlbnQpIHtcbiAgaWYgKHRoaXMuY29uc3RydWN0b3IgIT09IENvbnRleHQpIHtcbiAgICByZXR1cm4gbmV3IENvbnRleHQoZGF0YSwgcGFyZW50KTtcbiAgfVxuICB0aGlzLmRhdGEgPSBkYXRhO1xuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5hbGlhc2VzID0ge307XG4gIHRoaXMud2F0Y2hpbmcgPSB7fTtcbn1cblxuQ29udGV4dC5wcm90b3R5cGUuYWRkQWxpYXMgPSBmdW5jdGlvbihzb3VyY2VOYW1lLCBhbGlhc05hbWUpIHtcbiAgLy8gc291cmNlIG5hbWUgY2FuIGJlICduYW1lJyBvciAnbGlzdC5rZXknXG4gIGlmKHNvdXJjZU5hbWUgPT09IGFsaWFzTmFtZSkge1xuICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkFsaWFzIHdpdGggdGhlIG5hbWUgXCIgKyBhbGlhc05hbWUgKyBcIiBhbHJlYWR5IHByZXNlbnQgaW4gdGhpcyBjb250ZXh0LlwiKTtcbiAgfVxuICB0aGlzLmFsaWFzZXNbYWxpYXNOYW1lXSA9IHNvdXJjZU5hbWU7XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5yZXNvbHZlTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgLy8gZ2l2ZW4gYSBuYW1lLCByZXR1cm4gdGhlIFtDb250ZXh0LCByZXNvbHZlZCBwYXRoLCB2YWx1ZV0gd2hlblxuICAvLyB0aGlzIG5hbWUgaXMgZm91bmQgb3IgdW5kZWZpbmVkIG90aGVyd2lzZVxuXG4gIG5hbWUuc3Vic3RpdHV0ZUFsaWFzKHRoaXMpO1xuXG4gIGlmKHRoaXMuZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lLnN0YXJ0KCkpKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5kYXRhW25hbWUuc3RhcnQoKV07XG4gICAgdmFyIGkgPSAxO1xuICAgIHdoaWxlKGkgPCBuYW1lLmJpdHMubGVuZ3RoKSB7XG4gICAgICBpZighdmFsdWUuaGFzT3duUHJvcGVydHkobmFtZS5iaXRzW2ldKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSB2YWx1ZVtuYW1lLmJpdHNbaV1dO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICByZXR1cm4gW3RoaXMsIG5hbWUuc3RyKCksIHZhbHVlXTtcbiAgfVxuXG4gIGlmKHRoaXMucGFyZW50KSB7XG4gICAgcmV0dXJuIHRoaXMucGFyZW50LnJlc29sdmVOYW1lKG5hbWUpO1xuICB9XG5cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmdldE5hbWVQYXRoID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVOYW1lKG5ldyBDb250ZXh0TmFtZShuYW1lKSk7XG4gIGlmKHJlc29sdmVkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVkWzFdO1xuICB9XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gIHRoaXMud2F0Y2hpbmdbbmFtZV0gPSBjYWxsYmFjaztcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHJlc29sdmVkID0gdGhpcy5yZXNvbHZlTmFtZShuZXcgQ29udGV4dE5hbWUobmFtZSkpO1xuICBpZihyZXNvbHZlZCkge1xuICAgIHJldHVybiByZXNvbHZlZFsyXTtcbiAgfVxufTtcblxuQ29udGV4dC5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdGhpcy5fbW9kaWZ5KG5ldyBDb250ZXh0TmFtZShuYW1lKSwgdmFsdWUpO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUuX21vZGlmeSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG5cbiAgaWYodGhpcy53YXRjaGluZy5oYXNPd25Qcm9wZXJ0eShuYW1lLnN0cigpKSkge1xuICAgIHRoaXMud2F0Y2hpbmdbbmFtZS5zdHIoKV0odmFsdWUpO1xuICB9XG5cbiAgbmFtZS5zdWJzdGl0dXRlQWxpYXModGhpcyk7XG5cbiAgLy8gd2UgZ28gaW4gZm9yIGEgc2VhcmNoIGlmIHRoZSBmaXJzdCBwYXJ0IG1hdGNoZXNcbiAgaWYodGhpcy5kYXRhLmhhc093blByb3BlcnR5KG5hbWUuc3RhcnQoKSkpIHtcbiAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICB2YXIgaSA9IDA7XG4gICAgd2hpbGUoaSA8IG5hbWUuYml0cy5sZW5ndGggLSAxKSB7XG4gICAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lLmJpdHNbaV0pKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBkYXRhID0gZGF0YVtuYW1lLmJpdHNbaV1dO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICBkYXRhW25hbWUuYml0c1tpXV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICAvLyBkYXRhIG5vdCBmb3VuZCwgbGV0J3Mgc2VhcmNoIGluIHRoZSBwYXJlbnRcbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuX21vZGlmeShuYW1lLCB2YWx1ZSk7XG4gIH1cblxufTtcblxuQ29udGV4dC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdGhpcy5kYXRhW25hbWVdID0gdmFsdWU7XG59O1xuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZXModiwgbm9kZSkge1xuICB2YXIgYXR0cnMgPSB7fSwgbiwgcztcbiAgd2hpbGUodikge1xuICAgICAgdiA9IHV0aWwudHJpbSh2KTtcbiAgICAgIG4gPSB2Lm1hdGNoKEhUTUxfQVRUUl9SRUcpO1xuICAgICAgaWYoIW4pIHtcbiAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIGF0dHJpYnV0ZSBuYW1lIGZvdW5kIGluIFwiK3YpO1xuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKG5bMF0ubGVuZ3RoKTtcbiAgICAgIG4gPSBuWzBdO1xuICAgICAgaWYodlswXSAhPSBcIj1cIikge1xuICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gZXF1YWwgc2lnbiBhZnRlciBuYW1lIFwiK24pO1xuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKDEpO1xuICAgICAgcyA9IHYubWF0Y2goRE9VQkxFX1FVT1RFRF9TVFJJTkdfUkVHKTtcbiAgICAgIGlmKHMpIHtcbiAgICAgICAgYXR0cnNbbl0gPSBuZXcgU3RyaW5nTm9kZShudWxsLCBzWzBdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMgPSB2Lm1hdGNoKGV4cHJlc3Npb24uRVhQUkVTU0lPTl9SRUcpO1xuICAgICAgICBpZihzID09PSBudWxsKSB7XG4gICAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIHN0cmluZyBvciBleHByZXNzaW9uIGZvdW5kIGFmdGVyIG5hbWUgXCIrbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGV4cHIgPSBleHByZXNzaW9uLmpzRXhwcmVzc2lvbihzWzFdKTtcbiAgICAgICAgICBhdHRyc1tuXSA9IGV4cHI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHYgPSB2LnN1YnN0cihzWzBdLmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGF0dHJzO1xufVxuXG4vLyBhbGwgdGhlIGF2YWlsYWJsZSB0ZW1wbGF0ZSBub2RlXG5cbmZ1bmN0aW9uIE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICB0aGlzLmxpbmUgPSBsaW5lO1xuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5jb250ZW50ID0gY29udGVudDtcbiAgdGhpcy5sZXZlbCA9IGxldmVsO1xuICB0aGlzLmNoaWxkcmVuID0gW107XG59XG5cbk5vZGUucHJvdG90eXBlLnRvU3RyaW5nTGV2ZWwgPSBmdW5jdGlvbihsZXZlbCkge1xuICB2YXIgc3RyID0gXCJcIiwgaTtcbiAgZm9yKGk9MDsgaTxsZXZlbDsgaSsrKSB7XG4gICAgc3RyICs9IFwiICBcIjtcbiAgfVxuICByZXR1cm4gc3RyICsgU3RyaW5nKHRoaXMpO1xufTtcblxuTm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsLCB2aXNpdGVkKSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBpZihsZXZlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGV2ZWwgPSAwO1xuICB9XG4gIC8vIGF2b2lkIGluZml0ZSBsb29wXG4gIGlmKHZpc2l0ZWQgPT09IHVuZGVmaW5lZCkge1xuICAgIHZpc2l0ZWQgPSBbXTtcbiAgfSBlbHNlIGlmKHZpc2l0ZWQuaW5kZXhPZih0aGlzKSAhPSAtMSkge1xuICAgIHJldHVybiB0aGlzLnRvU3RyaW5nTGV2ZWwobGV2ZWwpICsgXCIgPC0tIEluZmluaXRlIHJlY3Vyc2lvbi5cXHJcXG5cIjtcbiAgfVxuICB2aXNpdGVkLnB1c2godGhpcyk7XG4gIHN0ciA9IHRoaXMudG9TdHJpbmdMZXZlbChsZXZlbCkgKyBcIlxcclxcblwiO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBzdHIgKz0gdGhpcy5jaGlsZHJlbltpXS5yZXByKGxldmVsICsgMSwgdmlzaXRlZCk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgaWYocGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcGF0aCA9ICcnO1xuICAgIHBvcyA9IDA7XG4gICAgdGhpcy5pc1Jvb3QgPSB0cnVlO1xuICB9XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgJycsIHBhdGgpO1xuICB0LmNoaWxkcmVuID0gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5jZXJyb3IgPSBmdW5jdGlvbihtc2cpIHtcbiAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKHRoaXMudG9TdHJpbmcoKSArIFwiOiBcIiArIG1zZyk7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5kb21Ob2RlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbXTtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRyZWVDaGlsZHJlbiA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgdCA9IFtdLCBpLCBwLCBqLCBjaGlsZHJlbiA9IG51bGwsIGNoaWxkID0gbnVsbDtcbiAgaiA9IHBvcztcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgcCA9IHBhdGg7XG4gICAgY2hpbGQgPSB0aGlzLmNoaWxkcmVuW2ldO1xuICAgIGlmKGNoaWxkLmhhc093blByb3BlcnR5KCdub2RlTmFtZScpKSB7XG4gICAgICBwICs9ICcuJyArIGo7XG4gICAgICBqKys7XG4gICAgICBjaGlsZHJlbiA9IGNoaWxkLnRyZWUoY29udGV4dCwgcCwgMCk7XG4gICAgICB0LnB1c2goY2hpbGRyZW4pO1xuICAgIH0gZWxzZSBpZiAoIWNoaWxkLnJlbmRlckV4bGN1ZGVkKSB7XG4gICAgICBjaGlsZHJlbiA9IGNoaWxkLnRyZWUoY29udGV4dCwgcCwgaik7XG4gICAgICBpZihjaGlsZHJlbikge1xuICAgICAgICB0ID0gdC5jb25jYXQoY2hpbGRyZW4pO1xuICAgICAgICBqICs9IGNoaWxkcmVuLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHQ7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5hZGRDaGlsZCA9IGZ1bmN0aW9uKGNoaWxkKSB7XG4gIHRoaXMuY2hpbGRyZW4ucHVzaChjaGlsZCk7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICsgXCIoXCIrdGhpcy5jb250ZW50LnJlcGxhY2UoXCJcXG5cIiwgXCJcIikrXCIpIGF0IGxpbmUgXCIgKyB0aGlzLmxpbmU7XG59O1xuXG5mdW5jdGlvbiBSb290Tm9kZSgpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIG51bGwsICcnLCAwLCBudWxsKTtcbn1cbnV0aWwuaW5oZXJpdHMoUm9vdE5vZGUsIE5vZGUpO1xuXG5mdW5jdGlvbiBDb21tZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgcGFyZW50LmNoaWxkcmVuLnB1c2godGhpcyk7XG4gIHRoaXMucmVuZGVyRXhsY3VkZWQgPSB0cnVlO1xufVxudXRpbC5pbmhlcml0cyhDb21tZW50Tm9kZSwgTm9kZSk7XG5cbmZ1bmN0aW9uIEh0bWxOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gdGhpcy5jb250ZW50LnNwbGl0KFwiIFwiKVswXTtcbiAgdGhpcy5hdHRycyA9IHBhcnNlQXR0cmlidXRlcyh0aGlzLmNvbnRlbnQuc3Vic3RyKHRoaXMubm9kZU5hbWUubGVuZ3RoKSwgdGhpcyk7XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSHRtbE5vZGUsIE5vZGUpO1xuXG5IdG1sTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsIHRoaXMubm9kZU5hbWUsIHBhdGgpO1xuICB0LmF0dHJzID0gdGhpcy5yZW5kZXJBdHRyaWJ1dGVzKGNvbnRleHQsIHBhdGgpO1xuICB0LmNoaWxkcmVuID0gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5mdW5jdGlvbiBiaW5kaW5nTmFtZShub2RlKSB7XG4gIGlmKG5vZGUuYmluZGluZykge1xuICAgIHJldHVybiBub2RlLmJpbmRpbmc7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXZhbHVhdGUoaXRlbSwgY29udGV4dCkge1xuICBpZih0eXBlb2YgaXRlbSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByZXR1cm4gaXRlbShjb250ZXh0KTtcbiAgfVxuICBpZihpdGVtLmV2YWx1YXRlKSB7XG4gICAgICByZXR1cm4gaXRlbS5ldmFsdWF0ZShjb250ZXh0KTtcbiAgfVxuICByZXR1cm4gaXRlbTtcbn1cblxuSHRtbE5vZGUucHJvdG90eXBlLnJlbmRlckF0dHJpYnV0ZXMgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIHZhciByX2F0dHJzID0ge30sIGtleSwgYXR0ciwgbmFtZSwga2V5cywgaTtcbiAga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuYXR0cnMpO1xuICBmb3IoaT0wOyBpPGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGF0dHIgPSB0aGlzLmF0dHJzW2tleV07XG4gICAgLy8gdG9kbywgZmluZCBhIGJldHRlciB3YXkgdG8gZGlzY3JpbWluYXRlIGV2ZW50c1xuICAgIGlmKGtleS5pbmRleE9mKFwibGstXCIpID09PSAwKSB7XG4gICAgICAvLyBhZGQgdGhlIHBhdGggdG8gdGhlIHJlbmRlciBub2RlIHRvIGFueSBsay10aGluZyBub2RlXG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgICAgaWYoa2V5ID09PSAnbGstYmluZCcpIHtcbiAgICAgICAgcl9hdHRyc1trZXldID0gZXZhbHVhdGUoYXR0ciwgY29udGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByX2F0dHJzW2tleV0gPSBcInRydWVcIjtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciB2ID0gZXZhbHVhdGUoYXR0ciwgY29udGV4dCk7XG5cbiAgICBpZih2ID09PSBmYWxzZSkge1xuICAgICAgLy8gbm90aGluZ1xuICAgIH0gZWxzZSB7XG4gICAgICByX2F0dHJzW2tleV0gPSB2O1xuICAgIH1cbiAgfVxuXG4gIGlmKFwiaW5wdXQsc2VsZWN0LHRleHRhcmVhXCIuaW5kZXhPZih0aGlzLm5vZGVOYW1lKSAhPSAtMSAmJiB0aGlzLmF0dHJzLmhhc093blByb3BlcnR5KCd2YWx1ZScpKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnMudmFsdWU7XG4gICAgbmFtZSA9IGJpbmRpbmdOYW1lKGF0dHIpO1xuICAgIGlmKG5hbWUgJiYgdGhpcy5hdHRyc1snbGstYmluZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJfYXR0cnNbJ2xrLWJpbmQnXSA9IG5hbWU7XG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgIH1cbiAgfVxuICBpZih0aGlzLm5vZGVOYW1lID09IFwidGV4dGFyZWFcIiAmJiB0aGlzLmNoaWxkcmVuLmxlbmd0aCA9PSAxICYmIHRoaXMuY2hpbGRyZW5bMF0uZXhwcmVzc2lvbikge1xuICAgIG5hbWUgPSBiaW5kaW5nTmFtZSh0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24pO1xuICAgIGlmKG5hbWUgJiYgdGhpcy5hdHRyc1snbGstYmluZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJfYXR0cnNbJ2xrLWJpbmQnXSA9IG5hbWU7XG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgICAgLy8gYXMgc29vbiBhcyB0aGUgdXNlciBoYXMgYWx0ZXJlZCB0aGUgdmFsdWUgb2YgdGhlIHRleHRhcmVhIG9yIHNjcmlwdCBoYXMgYWx0ZXJlZFxuICAgICAgLy8gdGhlIHZhbHVlIHByb3BlcnR5IG9mIHRoZSB0ZXh0YXJlYSwgdGhlIHRleHQgbm9kZSBpcyBvdXQgb2YgdGhlIHBpY3R1cmUgYW5kIGlzIG5vXG4gICAgICAvLyBsb25nZXIgYm91bmQgdG8gdGhlIHRleHRhcmVhJ3MgdmFsdWUgaW4gYW55IHdheS5cbiAgICAgIHJfYXR0cnMudmFsdWUgPSB0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24oY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgaWYoY29udGV4dC5nZXQoJ2RlYnVnJykgPT09IHRydWUpIHtcbiAgICByX2F0dHJzWydsay1kZWJ1ZyddID0gU3RyaW5nKHRoaXMpO1xuICB9XG5cbiAgcmV0dXJuIHJfYXR0cnM7XG59O1xuXG5IdG1sTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRoaXMubm9kZU5hbWUpLCBrZXksIGF0dHJzPXRoaXMucmVuZGVyQXR0cmlidXRlcyhjb250ZXh0LCBwYXRoKTtcbiAgZm9yKGtleSBpbiBhdHRycykge1xuICAgIG5vZGUuc2V0QXR0cmlidXRlKGtleSwgYXR0cnNba2V5XSk7XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59O1xuXG5mdW5jdGlvbiBGb3JOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgLy8gc3ludGF4OiBmb3Iga2V5LCB2YWx1ZSBpbiBsaXN0XG4gIC8vICAgICAgICAgZm9yIHZhbHVlIGluIGxpc3RcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB2YXIgdmFyMSwgdmFyMiwgc291cmNlTmFtZTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cig0KSk7XG4gIHZhcjEgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgaWYoIXZhcjEpIHtcbiAgICB0aGlzLmNlcnJvcihcImZpcnN0IHZhcmlhYmxlIG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHZhcjFbMF0ubGVuZ3RoKSk7XG4gIGlmKGNvbnRlbnRbMF0gPT0gJywnKSB7XG4gICAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cigxKSk7XG4gICAgdmFyMiA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICAgIGlmKCF2YXIyKSB7XG4gICAgICB0aGlzLmNlcnJvcihcInNlY29uZCB2YXJpYWJsZSBhZnRlciBjb21tYSBpcyBtaXNzaW5nXCIpO1xuICAgIH1cbiAgICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHZhcjJbMF0ubGVuZ3RoKSk7XG4gIH1cbiAgaWYoIWNvbnRlbnQubWF0Y2goL15pbi8pKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJpbiBrZXl3b3JkIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cigyKSk7XG4gIHNvdXJjZU5hbWUgPSBjb250ZW50Lm1hdGNoKGV4cHJlc3Npb24ubmFtZVJlZyk7XG4gIGlmKCFzb3VyY2VOYW1lKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJpdGVyYWJsZSBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgdGhpcy5zb3VyY2VOYW1lID0gc291cmNlTmFtZVswXTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cihzb3VyY2VOYW1lWzBdLmxlbmd0aCkpO1xuICBpZihjb250ZW50ICE9PSBcIlwiKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJsZWZ0IG92ZXIgdW5wYXJzYWJsZSBjb250ZW50OiBcIiArIGNvbnRlbnQpO1xuICB9XG5cbiAgaWYodmFyMSAmJiB2YXIyKSB7XG4gICAgdGhpcy5pbmRleE5hbWUgPSB2YXIxO1xuICAgIHRoaXMuYWxpYXMgPSB2YXIyWzBdO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYWxpYXMgPSB2YXIxWzBdO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoRm9yTm9kZSwgTm9kZSk7XG5cbkZvck5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBbXSwga2V5O1xuICB2YXIgZCA9IGNvbnRleHQuZ2V0KHRoaXMuc291cmNlTmFtZSk7XG4gIGlmKCFkKSB7XG4gICAgcmV0dXJuIHQ7XG4gIH1cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhkKSwgaTtcbiAgZm9yKGkgPSAwOyBpPGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIHZhciBuZXdfZGF0YSA9IHt9O1xuICAgIC8vIGFkZCB0aGUga2V5IHRvIGFjY2VzcyB0aGUgY29udGV4dCdzIGRhdGFcbiAgICBpZih0aGlzLmluZGV4TmFtZSkge1xuICAgICAgbmV3X2RhdGFbdGhpcy5pbmRleE5hbWVdID0ga2V5O1xuICAgIH1cbiAgICB2YXIgbmV3X2NvbnRleHQgPSBuZXcgQ29udGV4dChuZXdfZGF0YSwgY29udGV4dCk7XG4gICAgLy8ga2VlcCB0cmFjayBvZiB3aGVyZSB0aGUgZGF0YSBpcyBjb21pbmcgZnJvbVxuICAgIG5ld19jb250ZXh0LmFkZEFsaWFzKHRoaXMuc291cmNlTmFtZSArICcuJyArIGtleSwgdGhpcy5hbGlhcyk7XG4gICAgdCA9IHQuY29uY2F0KHRoaXMudHJlZUNoaWxkcmVuKG5ld19jb250ZXh0LCBwYXRoLCB0Lmxlbmd0aCArIHBvcykpO1xuICB9XG4gIHJldHVybiB0O1xufTtcblxuZnVuY3Rpb24gSWZOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmpzRXhwcmVzc2lvbihjb250ZW50LnJlcGxhY2UoL15pZi9nLCBcIlwiKSk7XG4gIHBhcmVudC5jaGlsZHJlbi5wdXNoKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhJZk5vZGUsIE5vZGUpO1xuXG5JZk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgaWYoIXRoaXMuZXhwcmVzc2lvbihjb250ZXh0KSkge1xuICAgIGlmKHRoaXMuZWxzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZWxzZS50cmVlKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICByZXR1cm4gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIEVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5zZWFyY2hJZihjdXJyZW50Tm9kZSk7XG59XG51dGlsLmluaGVyaXRzKEVsc2VOb2RlLCBOb2RlKTtcblxuRWxzZU5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgcmV0dXJuIHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5mdW5jdGlvbiBJZkVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5qc0V4cHJlc3Npb24oY29udGVudC5yZXBsYWNlKC9eZWxzZWlmL2csIFwiXCIpKTtcbiAgdGhpcy5zZWFyY2hJZihjdXJyZW50Tm9kZSk7XG59XG4vLyBpbXBvcnRhbnQgdG8gYmUgYW4gSWZOb2RlXG51dGlsLmluaGVyaXRzKElmRWxzZU5vZGUsIElmTm9kZSk7XG5cbklmRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmID0gZnVuY3Rpb24gc2VhcmNoSWYoY3VycmVudE5vZGUpIHtcbiAgLy8gZmlyc3Qgbm9kZSBvbiB0aGUgc2FtZSBsZXZlbCBoYXMgdG8gYmUgdGhlIGlmL2Vsc2VpZiBub2RlXG4gIHdoaWxlKGN1cnJlbnROb2RlKSB7XG4gICAgaWYoY3VycmVudE5vZGUubGV2ZWwgPCB0aGlzLmxldmVsKSB7XG4gICAgICB0aGlzLmNlcnJvcihcImNhbm5vdCBmaW5kIGEgY29ycmVzcG9uZGluZyBpZi1saWtlIHN0YXRlbWVudCBhdCB0aGUgc2FtZSBsZXZlbC5cIik7XG4gICAgfVxuICAgIGlmKGN1cnJlbnROb2RlLmxldmVsID09IHRoaXMubGV2ZWwpIHtcbiAgICAgIGlmKCEoY3VycmVudE5vZGUgaW5zdGFuY2VvZiBJZk5vZGUpKSB7XG4gICAgICAgIHRoaXMuY2Vycm9yKFwiYXQgdGhlIHNhbWUgbGV2ZWwgaXMgbm90IGEgaWYtbGlrZSBzdGF0ZW1lbnQuXCIpO1xuICAgICAgfVxuICAgICAgY3VycmVudE5vZGUuZWxzZSA9IHRoaXM7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY3VycmVudE5vZGUgPSBjdXJyZW50Tm9kZS5wYXJlbnQ7XG4gIH1cbn07XG5FbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWYgPSBJZkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZjtcblxuZnVuY3Rpb24gRXhwcmVzc2lvbk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubm9kZU5hbWUgPSBcIiN0ZXh0XCI7XG4gIHZhciBtID0gY29udGVudC5tYXRjaChleHByZXNzaW9uLkVYUFJFU1NJT05fUkVHKTtcbiAgaWYoIW0pIHtcbiAgICB0aGlzLmNlcnJvcihcImRlY2xhcmVkIGltcHJvcGVybHlcIik7XG4gIH1cbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5qc0V4cHJlc3Npb24obVsxXSk7XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoRXhwcmVzc2lvbk5vZGUsIE5vZGUpO1xuXG5FeHByZXNzaW9uTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgLy8gcmVuZGVyZXJcbiAgdmFyIHJlbmRlcmVyID0gU3RyaW5nKGV2YWx1YXRlKHRoaXMuZXhwcmVzc2lvbiwgY29udGV4dCkpO1xuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5FeHByZXNzaW9uTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGV2YWx1YXRlKHRoaXMuZXhwcmVzc2lvbiwgY29udGV4dCkpO1xufTtcblxuZnVuY3Rpb24gU3RyaW5nTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IFwiI3RleHRcIjtcbiAgdGhpcy5zdHJpbmcgPSB0aGlzLmNvbnRlbnQucmVwbGFjZSgvXlwifFwiJC9nLCBcIlwiKS5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJywgJ2dtJyk7XG4gIHRoaXMuY29tcGlsZWRFeHByZXNzaW9uID0gZXhwcmVzc2lvbi5jb21waWxlVGV4dEFuZEV4cHJlc3Npb25zKHRoaXMuc3RyaW5nKTtcbiAgaWYocGFyZW50KSB7XG4gICAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xuICB9XG59XG51dGlsLmluaGVyaXRzKFN0cmluZ05vZGUsIE5vZGUpO1xuXG5TdHJpbmdOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICAvLyByZW5kZXJlciBzaG91bGQgYmUgYWxsIGF0dHJpYnV0ZXNcbiAgdmFyIHJlbmRlcmVyID0gZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KTtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCk7XG4gIHJldHVybiB0O1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpO1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCkpO1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbihjaGlsZCkge1xuICB0aGlzLmNlcnJvcihcImNhbm5vdCBoYXZlIGNoaWxkcmVuIFwiICsgY2hpbGQpO1xufTtcblxuZnVuY3Rpb24gSW5jbHVkZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubmFtZSA9IHV0aWwudHJpbShjb250ZW50LnNwbGl0KFwiIFwiKVsxXSk7XG4gIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlW3RoaXMubmFtZV07XG4gIGlmKHRoaXMudGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuY2Vycm9yKFwiVGVtcGxhdGUgd2l0aCBuYW1lIFwiICsgdGhpcy5uYW1lICsgXCIgaXMgbm90IHJlZ2lzdGVyZWRcIik7XG4gIH1cbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhJbmNsdWRlTm9kZSwgTm9kZSk7XG5cbkluY2x1ZGVOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHJldHVybiB0aGlzLnRlbXBsYXRlLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gQ29tcG9uZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50KS5zdWJzdHIoMTApO1xuICB2YXIgbmFtZSA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICBpZighbmFtZSkge1xuICAgIHRoaXMuY2Vycm9yKFwiQ29tcG9uZW50IG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKG5hbWVbMF0ubGVuZ3RoKSk7XG4gIHRoaXMubmFtZSA9IG5hbWVbMF07XG4gIHRoaXMuYXR0cnMgPSBwYXJzZUF0dHJpYnV0ZXMoY29udGVudCwgdGhpcyk7XG4gIHRoaXMuY29tcG9uZW50ID0gY29tcG9uZW50Q2FjaGVbdGhpcy5uYW1lXTtcbiAgaWYodGhpcy5jb21wb25lbnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuY2Vycm9yKFwiQ29tcG9uZW50IHdpdGggbmFtZSBcIiArIHRoaXMubmFtZSArIFwiIGlzIG5vdCByZWdpc3RlcmVkXCIpO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoQ29tcG9uZW50Tm9kZSwgTm9kZSk7XG5cbkNvbXBvbmVudE5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIG5ld19jb250ZXh0ID0gbmV3IENvbnRleHQoe30sIGNvbnRleHQpO1xuICB2YXIga2V5LCBhdHRyLCB2YWx1ZSwgc291cmNlO1xuICBmb3Ioa2V5IGluIHRoaXMuYXR0cnMpIHtcbiAgICBhdHRyID0gdGhpcy5hdHRyc1trZXldO1xuICAgIHZhbHVlID0gZXZhbHVhdGUoYXR0ciwgY29udGV4dCk7XG4gICAgbmV3X2NvbnRleHQuc2V0KGtleSwgdmFsdWUpO1xuICAgIGlmKHR5cGVvZiBhdHRyID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHNvdXJjZSA9IGJpbmRpbmdOYW1lKGF0dHIpO1xuICAgICAgaWYoc291cmNlICYmIGtleSAhPSBzb3VyY2UpIHtcbiAgICAgICAgbmV3X2NvbnRleHQuYWRkQWxpYXMoc291cmNlLCBrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZih0aGlzLmNvbXBvbmVudC5jb250cm9sbGVyKXtcbiAgICB0aGlzLmNvbXBvbmVudC5jb250cm9sbGVyKG5ld19jb250ZXh0KTtcbiAgfVxuICByZXR1cm4gdGhpcy5jb21wb25lbnQudGVtcGxhdGUudHJlZUNoaWxkcmVuKG5ld19jb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuQ29tcG9uZW50Tm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsLCB2aXNpdGVkKSB7XG4gIHZpc2l0ZWQucHVzaCh0aGlzKTtcbiAgLy8gY3V0ZSB0aGUgZmlyc3Qgbm9kZT9cbiAgcmV0dXJuIHRoaXMudG9TdHJpbmdMZXZlbChsZXZlbCkgKyBcIlxcclxcblwiICsgdGhpcy5jb21wb25lbnQudGVtcGxhdGUucmVwcihsZXZlbCArIDEsIHZpc2l0ZWQpO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lLCBjdXJyZW50Tm9kZSkge1xuICB2YXIgbm9kZTtcbiAgaWYoY29udGVudC5sZW5ndGggPT09IDApIHtcbiAgICBub2RlID0gbmV3IFN0cmluZ05vZGUocGFyZW50LCBcIlxcblwiLCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignIycpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBDb21tZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdpZiAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgSWZOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2Vsc2VpZiAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgSWZFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEsIGN1cnJlbnROb2RlKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignZWxzZScpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEsIGN1cnJlbnROb2RlKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignZm9yICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBGb3JOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2luY2x1ZGUgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEluY2x1ZGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2NvbXBvbmVudCAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgQ29tcG9uZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdcIicpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBTdHJpbmdOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZigvXlxcdy8uZXhlYyhjb250ZW50KSkge1xuICAgIG5vZGUgPSBuZXcgSHRtbE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZigne3snKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRXhwcmVzc2lvbk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJjcmVhdGVOb2RlOiB1bmtub3cgbm9kZSB0eXBlIFwiICsgY29udGVudCk7XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkVGVtcGxhdGUodHBsLCB0ZW1wbGF0ZU5hbWUpIHtcblxuICAvLyBhbHJlYWR5IGEgdGVtcGxhdGU/XG4gIGlmKHRwbCBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICByZXR1cm4gdHBsO1xuICB9XG5cbiAgaWYodHBsIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICB0cGwgPSB0cGwuam9pbignXFxuJyk7XG4gIH1cblxuICB2YXIgcm9vdCA9IG5ldyBSb290Tm9kZSgpLCBsaW5lcywgbGluZSwgbGV2ZWwsXG4gICAgY29udGVudCwgaSwgY3VycmVudE5vZGUgPSByb290LCBwYXJlbnQsIHNlYXJjaE5vZGU7XG5cbiAgLy8gY2FuIHVzZWZ1bCBpbiB0aGUgaW5zcGVjdG9yXG4gIHJvb3Quc3RyID0gdHBsO1xuXG4gIGxpbmVzID0gdHBsLnNwbGl0KFwiXFxuXCIpO1xuXG4gIGZvcihpPTA7IGk8bGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBsaW5lID0gbGluZXNbaV07XG4gICAgbGV2ZWwgPSBsaW5lLm1hdGNoKC9cXHMqLylbMF0ubGVuZ3RoICsgMTtcbiAgICBjb250ZW50ID0gbGluZS5zbGljZShsZXZlbCAtIDEpO1xuXG4gICAgLy8gbXVsdGlsaW5lIHN1cHBvcnQ6IGVuZHMgd2l0aCBhIFxcXG4gICAgdmFyIGogPSAwO1xuICAgIHdoaWxlKGNvbnRlbnQubWF0Y2goL1xcXFwkLykpIHtcbiAgICAgICAgaisrO1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cXFxcJC8sICcnKSArIGxpbmVzW2kral07XG4gICAgfVxuICAgIGkgPSBpICsgajtcblxuICAgIC8vIG11bHRpbGluZSBzdHJpbmdzXG4gICAgaiA9IDA7XG4gICAgaWYoY29udGVudC5tYXRjaCgvXlwiXCJcIi8pKSB7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL15cIlwiXCIvLCAnXCInKTtcbiAgICAgICAgd2hpbGUoIWNvbnRlbnQubWF0Y2goL1wiXCJcIiQvKSkge1xuICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgaWYoaStqID4gbGluZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIk11bHRpbGluZSBzdHJpbmcgc3RhcnRlZCBidXQgdW5maW5pc2hlZCBhdCBsaW5lIFwiICsgKGkgKyAxKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250ZW50ID0gY29udGVudCArIGxpbmVzW2kral07XG4gICAgICAgIH1cbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXCJcIlwiJC8sICdcIicpO1xuICAgIH1cbiAgICBpID0gaSArIGo7XG5cbiAgICBzZWFyY2hOb2RlID0gY3VycmVudE5vZGU7XG4gICAgcGFyZW50ID0gbnVsbDtcblxuICAgIC8vIHNlYXJjaCBmb3IgdGhlIHBhcmVudCBub2RlXG4gICAgd2hpbGUodHJ1ZSkge1xuXG4gICAgICBpZihsZXZlbCA+IHNlYXJjaE5vZGUubGV2ZWwpIHtcbiAgICAgICAgcGFyZW50ID0gc2VhcmNoTm9kZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmKCFzZWFyY2hOb2RlLnBhcmVudCkge1xuICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJJbmRlbnRhdGlvbiBlcnJvciBhdCBsaW5lIFwiICsgKGkgKyAxKSk7XG4gICAgICB9XG5cbiAgICAgIGlmKGxldmVsID09IHNlYXJjaE5vZGUubGV2ZWwpIHtcbiAgICAgICAgcGFyZW50ID0gc2VhcmNoTm9kZS5wYXJlbnQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBzZWFyY2hOb2RlID0gc2VhcmNoTm9kZS5wYXJlbnQ7XG4gICAgfVxuXG4gICAgaWYocGFyZW50LmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgaWYocGFyZW50LmNoaWxkcmVuWzBdLmxldmVsICE9IGxldmVsKSB7XG4gICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkluZGVudGF0aW9uIGVycm9yIGF0IGxpbmUgXCIgKyAoaSArIDEpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9IGNyZWF0ZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgaSwgY3VycmVudE5vZGUpO1xuICAgIGN1cnJlbnROb2RlID0gbm9kZTtcblxuICB9XG4gIGlmKHRlbXBsYXRlTmFtZSkge1xuICAgIHRlbXBsYXRlQ2FjaGVbdGVtcGxhdGVOYW1lXSA9IHJvb3Q7XG4gIH1cblxuICByZXR1cm4gcm9vdDtcbn1cblxuZnVuY3Rpb24gY29sbGVjdENvbXBvbmVudHMoKSB7XG4gIHZhciBjb21wb25lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW3R5cGU9XCJsaWtlbHkvY29tcG9uZW50XCJdJyksIGk7XG4gIGZvcihpPTA7IGk8Y29tcG9uZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGlmKCFjb21wb25lbnRzW2ldLmlkKSB7XG4gICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJDb21wb25lbnQgaXMgbWlzc2luZyBhbiBpZCBcIiArIGNvbXBvbmVudHNbaV0udG9TdHJpbmcoKSk7XG4gICAgfVxuICAgIG5ldyBDb21wb25lbnQoY29tcG9uZW50c1tpXS5pZCwgY29tcG9uZW50c1tpXS50ZXh0Q29udGVudCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY29sbGVjdFRlbXBsYXRlcygpIHtcbiAgdmFyIHRlbXBsYXRlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1t0eXBlPVwibGlrZWx5L3RlbXBsYXRlXCJdJyksIGk7XG4gIGZvcihpPTA7IGk8dGVtcGxhdGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYoIXRlbXBsYXRlc1tpXS5pZCkge1xuICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiVGVtcGxhdGUgaXMgbWlzc2luZyBhbiBpZCBcIiArIHRlbXBsYXRlc1tpXS50b1N0cmluZygpKTtcbiAgICB9XG4gICAgbmV3IGJ1aWxkVGVtcGxhdGUodGVtcGxhdGVzW2ldLnRleHRDb250ZW50LCB0ZW1wbGF0ZXNbaV0uaWQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3QoKXtcbiAgY29sbGVjdENvbXBvbmVudHMoKTtcbiAgY29sbGVjdFRlbXBsYXRlcygpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGRUZW1wbGF0ZTogYnVpbGRUZW1wbGF0ZSxcbiAgcGFyc2VBdHRyaWJ1dGVzOiBwYXJzZUF0dHJpYnV0ZXMsXG4gIENvbnRleHQ6IENvbnRleHQsXG4gIHRlbXBsYXRlczogdGVtcGxhdGVDYWNoZSxcbiAgY29tcG9uZW50czogY29tcG9uZW50Q2FjaGUsXG4gIGNvbGxlY3RDb21wb25lbnRzOiBjb2xsZWN0Q29tcG9uZW50cyxcbiAgY29sbGVjdFRlbXBsYXRlczogY29sbGVjdFRlbXBsYXRlcyxcbiAgY29sbGVjdDogY29sbGVjdCxcbiAgQ29udGV4dE5hbWU6IENvbnRleHROYW1lLFxuICBDb21wb25lbnQ6IENvbXBvbmVudCxcbiAgTm9kZTogTm9kZVxufTsiLCJcblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBpbmhlcml0cyhjaGlsZCwgcGFyZW50KSB7XG4gIGNoaWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUocGFyZW50LnByb3RvdHlwZSk7XG4gIGNoaWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGNoaWxkO1xufVxuXG5mdW5jdGlvbiBDb21waWxlRXJyb3IobXNnKSB7XG4gIHRoaXMubmFtZSA9IFwiQ29tcGlsZUVycm9yXCI7XG4gIHRoaXMubWVzc2FnZSA9IChtc2cgfHwgXCJcIik7XG59XG5Db21waWxlRXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBSdW50aW1lRXJyb3IobXNnKSB7XG4gIHRoaXMubmFtZSA9IFwiUnVudGltZUVycm9yXCI7XG4gIHRoaXMubWVzc2FnZSA9IChtc2cgfHwgXCJcIik7XG59XG5SdW50aW1lRXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBlc2NhcGUodW5zYWZlKSB7XG4gIHJldHVybiB1bnNhZmVcbiAgICAucmVwbGFjZSgvJi9nLCBcIiZhbXA7XCIpXG4gICAgLnJlcGxhY2UoLzwvZywgXCImbHQ7XCIpXG4gICAgLnJlcGxhY2UoLz4vZywgXCImZ3Q7XCIpXG4gICAgLnJlcGxhY2UoL1wiL2csIFwiJnF1b3Q7XCIpXG4gICAgLnJlcGxhY2UoLycvZywgXCImIzAzOTtcIik7XG59XG5cbmZ1bmN0aW9uIHRyaW0odHh0KSB7XG4gIHJldHVybiB0eHQucmVwbGFjZSgvXlxccyt8XFxzKyQvZyAsXCJcIik7XG59XG5cbmZ1bmN0aW9uIGV2ZW50KG5hbWUsIGRhdGEpIHtcbiAgdmFyIGV2dCA9IG5ldyBDdXN0b21FdmVudChuYW1lLCB7XG4gICAgYnViYmxlczogdHJ1ZSxcbiAgICBjYW5jZWxhYmxlOiBmYWxzZSxcbiAgICBkZXRhaWxzOiBkYXRhXG4gIH0pO1xuICByZXR1cm4gZXZ0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5oZXJpdHM6aW5oZXJpdHMsXG4gIENvbXBpbGVFcnJvcjpDb21waWxlRXJyb3IsXG4gIFJ1bnRpbWVFcnJvcjpSdW50aW1lRXJyb3IsXG4gIGVzY2FwZTplc2NhcGUsXG4gIHRyaW06dHJpbSxcbiAgZXZlbnQ6ZXZlbnRcbn07Il19
(2)
});
