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
      value += countChildren(diff[i].node);
    }
    if(diff[i].action == "add") {
      value += 2;
      value += countChildren(diff[i].node);
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
      debugger
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
  var r_attrs = {}, key, attr, name;
  for(key in this.attrs) {
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

  // already a template?
  if(tpl instanceof Node) {
    return tpl;
  }

  if(tpl instanceof Array) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNodEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgRVhQUkVTU0lPTl9SRUcgPSAvXnt7KC4rPyl9fS87XG5cbmZ1bmN0aW9uIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnModHh0KSB7XG4gIC8vIGNvbXBpbGUgdGhlIGV4cHJlc3Npb25zIGZvdW5kIGluIHRoZSB0ZXh0XG4gIC8vIGFuZCByZXR1cm4gYSBsaXN0IG9mIHRleHQrZXhwcmVzc2lvblxuICB2YXIgZXhwciwgYXJvdW5kO1xuICB2YXIgbGlzdCA9IFtdO1xuICB3aGlsZSh0cnVlKSB7XG4gICAgdmFyIG1hdGNoID0gL3t7KC4rPyl9fS8uZXhlYyh0eHQpO1xuICAgIGlmKCFtYXRjaCkge1xuICAgICAgaWYodHh0KSB7XG4gICAgICAgIGxpc3QucHVzaCh0eHQpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGV4cHIgPSBqc0V4cHJlc3Npb24obWF0Y2hbMV0pO1xuICAgIGFyb3VuZCA9IHR4dC5zcGxpdChtYXRjaFswXSwgMik7XG4gICAgaWYoYXJvdW5kWzBdLmxlbmd0aCkge1xuICAgICAgbGlzdC5wdXNoKGFyb3VuZFswXSk7XG4gICAgfVxuICAgIGxpc3QucHVzaChleHByKTtcbiAgICB0eHQgPSBhcm91bmRbMV07XG4gIH1cbiAgcmV0dXJuIGxpc3Q7XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlRXhwcmVzc2lvbkxpc3QoZXhwcmVzc2lvbnMsIGNvbnRleHQpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGZvcihpPTA7IGk8ZXhwcmVzc2lvbnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGV4cHJlc3Npb25zW2ldO1xuICAgIGlmKHR5cGVvZiBpdGVtID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgc3RyICs9IGl0ZW0oY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSBpdGVtO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlT3V0T2ZTdHJpbmdzKHN0cikge1xuICB2YXIgaW5kZXggPSAwLCBsZW5ndGggPSBzdHIubGVuZ3RoLCBjaDtcbiAgdmFyIG5ld19zdHIgPSBcIlwiLCBpblN0cmluZyA9IG51bGwsIHN0YXJ0ID0gMDtcbiAgd2hpbGUoaW5kZXggPCBsZW5ndGgpIHtcbiAgICBjaCA9IHN0ci5jaGFyQXQoaW5kZXgpO1xuICAgIGlmKGNoID09PSAnXFxcXCcpIHtcbiAgICAgIGluZGV4ID0gaW5kZXggKyAyO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmKGNoID09PSAnXCInIHx8IGNoID09PSBcIidcIikge1xuICAgICAgLy8gY2xvc2luZyBhIHN0cmluZ1xuICAgICAgaWYoaW5TdHJpbmcgPT09IGNoKSB7XG4gICAgICAgIGluU3RyaW5nID0gbnVsbDtcbiAgICAgICAgbmV3X3N0ciA9IG5ld19zdHIgKyBzdHIuc2xpY2Uoc3RhcnQsIGluZGV4KTtcbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG9wZW5pbmcgYSBzdHJpbmdcbiAgICAgICAgbmV3X3N0ciA9IG5ld19zdHIgKyByZXBsYWNlTmFtZXMoc3RyLnNsaWNlKHN0YXJ0LCBpbmRleCkpO1xuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICBpblN0cmluZyA9IGNoO1xuICAgICAgfVxuICAgIH1cbiAgICBpbmRleCA9IGluZGV4ICsgMTtcbiAgfVxuICBuZXdfc3RyICs9IHJlcGxhY2VOYW1lcyhzdHIuc2xpY2Uoc3RhcnQsIGluZGV4KSk7XG4gIHJldHVybiBuZXdfc3RyO1xufVxuXG52YXIgbmFtZVJlZyA9IC9bYS16QS1aXyRdWzAtOWEtekEtWl8kXFwuXSovZ207XG52YXIgamF2YXNjcmlwdFZhbHVlcyA9IFsndHJ1ZScsICdmYWxzZScsICd1bmRlZmluZWQnLCAnbnVsbCddO1xuXG5mdW5jdGlvbiByZXBsYWNlTmFtZXMoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZShuYW1lUmVnLCBmdW5jdGlvbihfbmFtZSkge1xuICAgIGlmKGphdmFzY3JpcHRWYWx1ZXMuaW5kZXhPZihfbmFtZSkgPiAtMSkge1xuICAgICAgcmV0dXJuIF9uYW1lO1xuICAgIH1cbiAgICBpZighX25hbWUubWF0Y2goL15jb250ZXh0LykgJiYgKF9uYW1lICE9ICd0cnVlJyAmJiBfbmFtZSAhPSAnZmFsc2UnKSkge1xuICAgICAgcmV0dXJuICdjb250ZXh0LmdldChcIicrX25hbWUrJ1wiKSc7XG4gICAgfVxuICAgIHJldHVybiBfbmFtZTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGpzRXhwcmVzc2lvbihzb3VyY2UpIHtcbiAgdmFyIGhhc05hbWUgPSBzb3VyY2UubWF0Y2gobmFtZVJlZyk7XG4gIHZhciBuZXdTb3VyY2UgPSByZXBsYWNlT3V0T2ZTdHJpbmdzKHNvdXJjZSk7XG4gIHZhciBmY3QgPSBuZXcgRnVuY3Rpb24oJ2NvbnRleHQnLCAncmV0dXJuICcgKyBuZXdTb3VyY2UpO1xuICAvLyBvbmx5IG9uZSBuYW1lPyB0aGlzIGlzIGEgY2FuZGlkYXRlIGZvciBkYXRhIGJpbmRpbmdcbiAgaWYoaGFzTmFtZSAmJiBoYXNOYW1lLmxlbmd0aCA9PSAxICYmIHV0aWwudHJpbShzb3VyY2UpID09IGhhc05hbWVbMF0pIHtcbiAgICBmY3QuYmluZGluZyA9IGhhc05hbWVbMF07XG4gIH1cbiAgcmV0dXJuIGZjdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG5hbWVSZWc6bmFtZVJlZyxcbiAgY29tcGlsZVRleHRBbmRFeHByZXNzaW9uczpjb21waWxlVGV4dEFuZEV4cHJlc3Npb25zLFxuICBldmFsdWF0ZUV4cHJlc3Npb25MaXN0OmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QsXG4gIGpzRXhwcmVzc2lvbjpqc0V4cHJlc3Npb24sXG4gIHJlcGxhY2VOYW1lczpyZXBsYWNlTmFtZXMsXG4gIHJlcGxhY2VPdXRPZlN0cmluZ3M6cmVwbGFjZU91dE9mU3RyaW5ncyxcbiAgRVhQUkVTU0lPTl9SRUc6RVhQUkVTU0lPTl9SRUdcbn07IiwiLyogTGlrZWx5LmpzLFxuICAgUHl0aG9uIHN0eWxlIEhUTUwgdGVtcGxhdGUgbGFuZ3VhZ2Ugd2l0aCBiaS1kaXJlY3Rpb25uYWwgZGF0YSBiaW5kaW5nXG4gICBiYXRpc3RlIGJpZWxlciAyMDE0ICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpO1xudmFyIGV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKTtcblxuZnVuY3Rpb24gdXBkYXRlRGF0YShjb250ZXh0LCBkb20pIHtcbiAgdmFyIG5hbWUgPSBkb20uZ2V0QXR0cmlidXRlKFwibGstYmluZFwiKSwgdmFsdWU7XG4gIGlmKCFuYW1lKSB7XG4gICAgdGhyb3cgXCJObyBsay1iaW5kIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudFwiO1xuICB9XG4gIGlmKGRvbS50eXBlID09ICdjaGVja2JveCcgJiYgIWRvbS5jaGVja2VkKSB7XG4gICAgdmFsdWUgPSBcIlwiO1xuICB9IGVsc2Uge1xuICAgIHZhbHVlID0gZG9tLnZhbHVlOy8vIHx8IGRvbS5nZXRBdHRyaWJ1dGUoXCJ2YWx1ZVwiKTtcbiAgfVxuICAvLyB1cGRhdGUgdGhlIGNvbnRleHRcbiAgY29udGV4dC5tb2RpZnkobmFtZSwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBCaW5kaW5nKGRvbSwgdHBsLCBkYXRhKSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBCaW5kaW5nKSB7XG4gICAgcmV0dXJuIG5ldyBCaW5kaW5nKGRvbSwgdHBsLCBkYXRhKTtcbiAgfVxuICAvLyBkb3VibGUgZGF0YSBiaW5kaW5nIGJldHdlZW4gc29tZSBkYXRhIGFuZCBzb21lIGRvbVxuICB0aGlzLmRvbSA9IGRvbTtcbiAgaWYoZGF0YSA9PT0gdW5kZWZpbmVkICYmICEodHBsIGluc3RhbmNlb2YgdGVtcGxhdGUuTm9kZSkpIHtcbiAgICBkYXRhID0gdHBsO1xuICAgIHRwbCA9IHRlbXBsYXRlLmJ1aWxkVGVtcGxhdGUoZG9tLnRleHRDb250ZW50KTtcbiAgfVxuICB0aGlzLmRhdGEgPSBkYXRhO1xuICB0aGlzLnRlbXBsYXRlID0gdHBsO1xuICB0aGlzLmNvbnRleHQgPSBuZXcgdGVtcGxhdGUuQ29udGV4dCh0aGlzLmRhdGEpO1xuICB0aGlzLnNjaGVkdWxlZCA9IGZhbHNlO1xuICB0aGlzLmNhbGxiYWNrcyA9IFtdO1xufVxuXG5CaW5kaW5nLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRlbXBsYXRlLnRyZWUobmV3IHRlbXBsYXRlLkNvbnRleHQodGhpcy5kYXRhKSk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZG9tLmlubmVySFRNTCA9IFwiXCI7XG4gIHRoaXMuY3VycmVudFRyZWUgPSB0aGlzLnRyZWUoKTtcbiAgdGhpcy5jdXJyZW50VHJlZS5kb21UcmVlKHRoaXMuZG9tKTtcbiAgdGhpcy5iaW5kRXZlbnRzKCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kb21Jbml0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIGNyZWF0ZSBhbiBpbml0aWFsIHRyZWUgZnJvbSB0aGUgRE9NXG4gIHRoaXMuY3VycmVudFRyZWUgPSByZW5kZXIuaW5pdGlhbFJlbmRlckZyb21Eb20odGhpcy5kb20pO1xuICB0aGlzLmN1cnJlbnRUcmVlLm5vZGVOYW1lID0gdW5kZWZpbmVkO1xuICB0aGlzLmJpbmRFdmVudHMoKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5ld1RyZWUgPSB0aGlzLnRyZWUoKTtcbiAgdmFyIGRpZmYgPSB0aGlzLmN1cnJlbnRUcmVlLmRpZmYobmV3VHJlZSk7XG4gIHJlbmRlci5hcHBseURpZmYoZGlmZiwgdGhpcy5kb20pO1xuICB0aGlzLmN1cnJlbnRUcmVlID0gbmV3VHJlZTtcbiAgdGhpcy5sb2NrID0gZmFsc2U7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kYXRhRXZlbnQgPSBmdW5jdGlvbihlKSB7XG4gIHZhciBkb20gPSBlLnRhcmdldDtcbiAgdmFyIG5hbWUgPSBkb20uZ2V0QXR0cmlidXRlKCdsay1iaW5kJyk7XG4gIGlmKG5hbWUpIHtcbiAgICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuZ2V0UmVuZGVyTm9kZUZyb21QYXRoKGRvbSk7XG4gICAgaWYoIXRoaXMubG9jaykge1xuICAgICAgLy8gZG8gbm90IHVwZGF0ZSBkdXJpbmcgYSByZW5kZXJcbiAgICAgIHVwZGF0ZURhdGEocmVuZGVyTm9kZS5jb250ZXh0LCBkb20pO1xuICAgICAgdGhpcy5sb2NrID0gdHJ1ZTtcbiAgICAgIHRoaXMuZGlmZigpO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXIoJ2RhdGFWaWV3Q2hhbmdlZCcsIHtcIm5hbWVcIjogbmFtZX0pO1xuICB9XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5nZXRSZW5kZXJOb2RlRnJvbVBhdGggPSBmdW5jdGlvbihkb20pIHtcbiAgdmFyIHBhdGggPSBkb20uZ2V0QXR0cmlidXRlKCdsay1wYXRoJyk7XG4gIHZhciByZW5kZXJOb2RlID0gdGhpcy5jdXJyZW50VHJlZTtcbiAgdmFyIGJpdHMgPSBwYXRoLnNwbGl0KFwiLlwiKSwgaTtcbiAgZm9yKGk9MTsgaTxiaXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgcmVuZGVyTm9kZSA9IHJlbmRlck5vZGUuY2hpbGRyZW5bYml0c1tpXV07XG4gIH1cbiAgcmV0dXJuIHJlbmRlck5vZGU7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24obmFtZSwgb2JqKSB7XG4gIHRoaXMuZG9tLmRpc3BhdGNoRXZlbnQoXG4gICAgdXRpbC5ldmVudChuYW1lLCBvYmopXG4gICk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5hbnlFdmVudCA9IGZ1bmN0aW9uKGUpIHtcbiAgdmFyIGRvbSA9IGUudGFyZ2V0O1xuICB2YXIgbGtFdmVudCA9IGRvbS5nZXRBdHRyaWJ1dGUoJ2xrLScgKyBlLnR5cGUpO1xuICBpZighbGtFdmVudCkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuZ2V0UmVuZGVyTm9kZUZyb21QYXRoKGRvbSk7XG4gIHZhciBjdHggPSB0ZW1wbGF0ZS5Db250ZXh0KHtldmVudDogZX0sIHJlbmRlck5vZGUuY29udGV4dCk7XG4gIHJlbmRlck5vZGUubm9kZS5hdHRyc1snbGstJytlLnR5cGVdKGN0eCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5iaW5kRXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpO1xuICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24oZSl7IHRoaXMuZGF0YUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXsgdGhpcy5kYXRhRXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB2YXIgZXZlbnRzID0gXCJjbGljayxjaGFuZ2UsbW91c2VvdmVyLGZvY3Vzb3V0LGZvY3VzaW4sa2V5ZG93bixrZXl1cCxrZXlwcmVzcyxzdWJtaXRcIi5zcGxpdCgnLCcpO1xuICBmb3IoaT0wOyBpPGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBldmVudHNbaV0sXG4gICAgICBmdW5jdGlvbihlKXsgdGhpcy5hbnlFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIH1cbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIGlmKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gIH1cbiAgaWYodGhpcy5zY2hlZHVsZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG4gIGlmKCh0aGlzLmxhc3RVcGRhdGUgJiYgKG5vdyAtIHRoaXMubGFzdFVwZGF0ZSkgPCAyNSkgfHwgdGhpcy5sb2NrKSB7XG4gICAgdGhpcy5zY2hlZHVsZWQgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zY2hlZHVsZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8gYXZvaWQgMiBkaWZmcyBhdCB0aGUgc2FtZSB0aW1lXG4gIHRoaXMubG9jayA9IHRydWU7XG4gIHRoaXMubGFzdFVwZGF0ZSA9IG5vdztcbiAgdGhpcy5kaWZmKCk7XG4gIHRoaXMudHJpZ2dlcigndXBkYXRlJyk7XG4gIHdoaWxlKHRoaXMuY2FsbGJhY2tzLmxlbmd0aCkge1xuICAgIHRoaXMuY2FsbGJhY2tzLnBvcCgpKCk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBUZW1wbGF0ZTp0ZW1wbGF0ZS5idWlsZFRlbXBsYXRlLFxuICBDb250ZXh0TmFtZTp0ZW1wbGF0ZS5Db250ZXh0TmFtZSxcbiAgdXBkYXRlRGF0YTp1cGRhdGVEYXRhLFxuICBCaW5kaW5nOkJpbmRpbmcsXG4gIENvbXBvbmVudDp0ZW1wbGF0ZS5Db21wb25lbnQsXG4gIGdldERvbTpyZW5kZXIuZ2V0RG9tLFxuICBhcHBseURpZmY6cmVuZGVyLmFwcGx5RGlmZixcbiAgLy9kaWZmQ29zdDpyZW5kZXIuZGlmZkNvc3QsXG4gIGF0dHJpYnV0ZXNEaWZmOnJlbmRlci5hdHRyaWJ1dGVzRGlmZixcbiAgQ29udGV4dDp0ZW1wbGF0ZS5Db250ZXh0LFxuICBDb21waWxlRXJyb3I6dXRpbC5Db21waWxlRXJyb3IsXG4gIFJ1bnRpbWVFcnJvcjp1dGlsLlJ1bnRpbWVFcnJvcixcbiAgZXNjYXBlOnV0aWwuZXNjYXBlLFxuICBpbml0aWFsUmVuZGVyRnJvbURvbTpyZW5kZXIuaW5pdGlhbFJlbmRlckZyb21Eb20sXG4gIGV4cHJlc3Npb246ZXhwcmVzc2lvbixcbiAgcmVuZGVyOnJlbmRlcixcbiAgdGVtcGxhdGU6dGVtcGxhdGUsXG4gIHV0aWw6dXRpbCxcbiAgc2V0SGFuZGljYXA6ZnVuY3Rpb24obil7cmVuZGVyLmhhbmRpY2FwID0gbjt9XG59O1xuIiwiXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gUmVuZGVyZWROb2RlKG5vZGUsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKSB7XG4gIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgdGhpcy5ub2RlID0gbm9kZTtcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5yZW5kZXJlciA9IHJlbmRlcmVyO1xuICB0aGlzLnBhdGggPSBwYXRoIHx8IFwiXCI7XG4gIC8vIHNob3J0Y3V0XG4gIHRoaXMubm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lO1xufVxuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLnJlcHIgPSBmdW5jdGlvbihsZXZlbCkge1xuICB2YXIgc3RyID0gXCJcIiwgaTtcbiAgaWYobGV2ZWwgPT09IHVuZGVmaW5lZCkge1xuICAgIGxldmVsID0gMDtcbiAgfVxuICBmb3IoaT0wOyBpPGxldmVsOyBpKyspIHtcbiAgICBzdHIgKz0gXCIgIFwiO1xuICB9XG4gIHN0ciArPSBTdHJpbmcodGhpcy5ub2RlKSArIFwiIHBhdGggXCIgKyB0aGlzLnBhdGggKyBcIlxcclxcblwiO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBzdHIgKz0gdGhpcy5jaGlsZHJlbltpXS5yZXByKGxldmVsICsgMSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZG9tVHJlZSA9IGZ1bmN0aW9uKGFwcGVuZF90bykge1xuICB2YXIgbm9kZSA9IGFwcGVuZF90byB8fCB0aGlzLm5vZGUuZG9tTm9kZSh0aGlzLmNvbnRleHQsIHRoaXMucGF0aCksIGksIGNoaWxkX3RyZWU7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIGNoaWxkX3RyZWUgPSB0aGlzLmNoaWxkcmVuW2ldLmRvbVRyZWUoKTtcbiAgICBpZihub2RlLnB1c2gpIHtcbiAgICAgIG5vZGUucHVzaChjaGlsZF90cmVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZF90cmVlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRvbUh0bWwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGk7XG4gIC8vdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gIHZhciBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjaGlsZCA9IHRoaXMuY2hpbGRyZW5baV0uZG9tVHJlZSgpO1xuICAgIGQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICB9XG4gIHJldHVybiBkLmlubmVySFRNTDtcbn07XG5cbmZ1bmN0aW9uIGNvdW50Q2hpbGRyZW4obm9kZSkge1xuICB2YXIgdmFsdWUgPSBub2RlLmNoaWxkcmVuLmxlbmd0aCwgaTtcbiAgZm9yKGk9MDsgaTxub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFsdWUgPSB2YWx1ZSArIGNvdW50Q2hpbGRyZW4obm9kZS5jaGlsZHJlbltpXSk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBkaWZmQ29zdChkaWZmKSB7XG4gIHZhciB2YWx1ZT0wLCBpO1xuICBmb3IoaT0wOyBpPGRpZmYubGVuZ3RoOyBpKyspIHtcbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcInJlbW92ZVwiKSB7XG4gICAgICB2YWx1ZSArPSAyO1xuICAgICAgdmFsdWUgKz0gY291bnRDaGlsZHJlbihkaWZmW2ldLm5vZGUpO1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICB2YWx1ZSArPSAyO1xuICAgICAgdmFsdWUgKz0gY291bnRDaGlsZHJlbihkaWZmW2ldLm5vZGUpO1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICB2YWx1ZSArPSAxO1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcInN0cmluZ211dGF0ZVwiKSB7XG4gICAgICB2YWx1ZSArPSAxO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuX2RpZmYgPSBmdW5jdGlvbihyZW5kZXJlZF9ub2RlLCBhY2N1LCBwYXRoKSB7XG4gIHZhciBpLCBqLCBzb3VyY2VfcHQgPSAwO1xuICBpZihwYXRoID09PSB1bmRlZmluZWQpIHsgcGF0aCA9IFwiXCI7IH1cblxuICBpZighcmVuZGVyZWRfbm9kZSkge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgbm9kZTogdGhpcyxcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfVxuXG4gIGlmKHJlbmRlcmVkX25vZGUubm9kZU5hbWUgIT0gdGhpcy5ub2RlTmFtZSkge1xuXG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIHR5cGU6ICdkaWZmZXJlbnRfbm9kZU5hbWUnLFxuICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgIG5vZGU6IHRoaXMsXG4gICAgICBwYXRoOiBwYXRoXG4gICAgfSk7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIHR5cGU6ICdkaWZmZXJlbnRfbm9kZU5hbWUnLFxuICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUsXG4gICAgICAvLyB3aGVuIGEgbm9kZSBpcyBhZGRlZCwgd2UgcG9pbnQgdG8gdGhlIG5leHQgbm9kZSBhcyBpbnNlcnRCZWZvcmUgaXMgdXNlZFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9XG5cbiAgLy8gQ291bGQgdXNlIGluaGVyaXRhbmNlIGZvciB0aGlzXG4gIGlmKHRoaXMubm9kZU5hbWUgPT0gXCIjdGV4dFwiICYmIHRoaXMucmVuZGVyZXIgIT0gcmVuZGVyZWRfbm9kZS5yZW5kZXJlcikge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAnc3RyaW5nbXV0YXRlJyxcbiAgICAgICAgbm9kZTogdGhpcyxcbiAgICAgICAgdmFsdWU6IHJlbmRlcmVkX25vZGUucmVuZGVyZXIsXG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9IGVsc2Uge1xuICAgIHZhciBhX2RpZmYgPSBhdHRyaWJ1dGVzRGlmZih0aGlzLmF0dHJzLCByZW5kZXJlZF9ub2RlLmF0dHJzKTtcbiAgICBpZihhX2RpZmYubGVuZ3RoKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdtdXRhdGUnLFxuICAgICAgICBub2RlOiB0aGlzLFxuICAgICAgICBhdHRyaWJ1dGVzRGlmZjogYV9kaWZmLFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICB2YXIgbDEgPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDtcbiAgdmFyIGwyID0gcmVuZGVyZWRfbm9kZS5jaGlsZHJlbi5sZW5ndGg7XG5cbiAgLy8gbm8gc3dhcCBwb3NzaWJsZSwgYnV0IGRlbGV0aW5nIGEgbm9kZSBpcyBwb3NzaWJsZVxuICBqID0gMDsgaSA9IDA7IHNvdXJjZV9wdCA9IDA7XG4gIC8vIGxldCdzIGdvdCB0cm91Z2ggYWxsIHRoZSBjaGlsZHJlblxuICBmb3IoOyBpPGwxOyBpKyspIHtcbiAgICB2YXIgZGlmZiA9IDAsIGFmdGVyX3NvdXJjZV9kaWZmID0gMCwgYWZ0ZXJfdGFyZ2V0X2RpZmYgPSAwLCBhZnRlcl9zb3VyY2VfY29zdD1udWxsLCBhZnRlcl90YXJnZXRfY29zdD1udWxsO1xuICAgIHZhciBhZnRlcl90YXJnZXQgPSByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2orMV07XG4gICAgdmFyIGFmdGVyX3NvdXJjZSA9IHRoaXMuY2hpbGRyZW5baSsxXTtcblxuICAgIGlmKCFyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgICBub2RlOiB0aGlzLmNoaWxkcmVuW2ldLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgc291cmNlX3B0XG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGRpZmYgPSB0aGlzLmNoaWxkcmVuW2ldLl9kaWZmKHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcblxuICAgIHZhciBjb3N0ID0gZGlmZkNvc3QoZGlmZik7XG4gICAgLy8gZG9lcyB0aGUgbmV4dCBzb3VyY2Ugb25lIGZpdHMgYmV0dGVyP1xuICAgIGlmKGFmdGVyX3NvdXJjZSkge1xuICAgICAgYWZ0ZXJfc291cmNlX2RpZmYgPSBhZnRlcl9zb3VyY2UuX2RpZmYocmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSwgW10sIHBhdGggKyAnLicgKyBzb3VyY2VfcHQpO1xuICAgICAgLy8gbmVlZHMgc29tZSBoYW5kaWNhcCBvdGhlcndpc2UgaW5wdXRzIGNvbnRhaW5pbmcgdGhlIGN1cnJlbnQgZm9jdXNcbiAgICAgIC8vIG1pZ2h0IGJlIHJlbW92ZWRcbiAgICAgIGFmdGVyX3NvdXJjZV9jb3N0ID0gZGlmZkNvc3QoYWZ0ZXJfc291cmNlX2RpZmYpICsgbW9kdWxlLmV4cG9ydHMuaGFuZGljYXA7XG4gICAgfVxuICAgIC8vIGRvZXMgdGhlIG5leHQgdGFyZ2V0IG9uZSBmaXRzIGJldHRlcj9cbiAgICBpZihhZnRlcl90YXJnZXQpIHtcbiAgICAgIGFmdGVyX3RhcmdldF9kaWZmID0gdGhpcy5jaGlsZHJlbltpXS5fZGlmZihhZnRlcl90YXJnZXQsIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcbiAgICAgIGFmdGVyX3RhcmdldF9jb3N0ID0gZGlmZkNvc3QoYWZ0ZXJfdGFyZ2V0X2RpZmYpICsgbW9kdWxlLmV4cG9ydHMuaGFuZGljYXA7XG4gICAgfVxuXG4gICAgaWYoKCFhZnRlcl90YXJnZXQgfHwgY29zdCA8PSBhZnRlcl90YXJnZXRfY29zdCkgJiYgKCFhZnRlcl9zb3VyY2UgfHwgY29zdCA8PSBhZnRlcl9zb3VyY2VfY29zdCkpIHtcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChkaWZmKTtcbiAgICAgIHNvdXJjZV9wdCArPSAxO1xuICAgIH0gZWxzZSBpZihhZnRlcl9zb3VyY2UgJiYgKCFhZnRlcl90YXJnZXQgfHwgYWZ0ZXJfc291cmNlX2Nvc3QgPD0gYWZ0ZXJfdGFyZ2V0X2Nvc3QpKSB7XG4gICAgICBkZWJ1Z2dlclxuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2FmdGVyX3NvdXJjZScsXG4gICAgICAgIGNvc3Q6IGFmdGVyX3NvdXJjZV9jb3N0LFxuICAgICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgICBub2RlOiB0aGlzLmNoaWxkcmVuW2ldLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgc291cmNlX3B0XG4gICAgICB9KTtcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChhZnRlcl9zb3VyY2VfZGlmZik7XG4gICAgICBzb3VyY2VfcHQgKz0gMTtcbiAgICAgIGkrKztcbiAgICB9IGVsc2UgaWYoYWZ0ZXJfdGFyZ2V0KSB7XG4gICAgICAvLyBpbXBvcnRhbnQgdG8gYWRkIHRoZSBkaWZmIGJlZm9yZVxuICAgICAgYWNjdSA9IGFjY3UuY29uY2F0KGFmdGVyX3RhcmdldF9kaWZmKTtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhZnRlcl90YXJnZXQnLFxuICAgICAgICBjb3N0OiBhZnRlcl90YXJnZXRfY29zdCxcbiAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIChzb3VyY2VfcHQpXG4gICAgICB9KTtcbiAgICAgIHNvdXJjZV9wdCArPSAyO1xuICAgICAgaisrO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBcIlNob3VsZCBuZXZlciBoYXBwZW5cIjtcbiAgICB9XG4gICAgaisrO1xuICB9XG5cbiAgLy8gbmV3IG5vZGVzIHRvIGJlIGFkZGVkIGFmdGVyIHRoZSBkaWZmXG4gIGZvcihpPTA7IGk8KGwyLWopOyBpKyspIHtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgdHlwZTogJ25ld19ub2RlJyxcbiAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICBub2RlOiByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2oraV0sXG4gICAgICAvLyB3aGVuIGEgbm9kZSBpcyBhZGRlZCwgd2UgcG9pbnQgdG8gdGhlIG5leHQgbm9kZSBhcyBpbnNlcnRCZWZvcmUgaXMgdXNlZFxuICAgICAgcGF0aDogcGF0aCArICcuJyArIChzb3VyY2VfcHQgKyAxKVxuICAgIH0pO1xuICAgIHNvdXJjZV9wdCArPSAxO1xuICB9XG5cbiAgcmV0dXJuIGFjY3U7XG5cbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uKHJlbmRlcmVkX25vZGUpIHtcbiAgdmFyIGFjY3UgPSBbXTtcbiAgcmV0dXJuIHRoaXMuX2RpZmYocmVuZGVyZWRfbm9kZSwgYWNjdSk7XG59O1xuXG5mdW5jdGlvbiBhdHRyaWJ1dGVzRGlmZihhLCBiKSB7XG4gIHZhciBjaGFuZ2VzID0gW10sIGtleTtcbiAgZm9yKGtleSBpbiBhKSB7XG4gICAgICBpZihiW2tleV0gPT09IGZhbHNlKSB7XG4gICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwicmVtb3ZlXCIsIGtleTprZXl9KTtcbiAgICAgIH0gZWxzZSBpZihiW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZihiW2tleV0gIT0gYVtrZXldKSB7XG4gICAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJtdXRhdGVcIiwga2V5OmtleSwgdmFsdWU6YltrZXldfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwicmVtb3ZlXCIsIGtleTprZXl9KTtcbiAgICAgIH1cbiAgfVxuICBmb3Ioa2V5IGluIGIpIHtcbiAgICBpZihhW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJhZGRcIiwga2V5OmtleSwgdmFsdWU6YltrZXldfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBjaGFuZ2VzO1xufVxuXG5mdW5jdGlvbiBnZXREb20oZG9tLCBwYXRoLCBzdG9wKSB7XG4gIHZhciBpLCBwPXBhdGguc3BsaXQoJy4nKSwgY2hpbGQ9ZG9tO1xuICBpZihzdG9wID09PSB1bmRlZmluZWQpIHtcbiAgICBzdG9wID0gMDtcbiAgfVxuICB2YXIgYm91bmRhcnk9cC5sZW5ndGggLSBzdG9wO1xuICBmb3IoaT0xOyBpPGJvdW5kYXJ5OyBpKyspIHtcbiAgICBjaGlsZCA9IGNoaWxkLmNoaWxkTm9kZXNbcFtpXSB8IDBdO1xuICB9XG4gIHJldHVybiBjaGlsZDtcbn1cblxuZnVuY3Rpb24gYXBwbHlEaWZmKGRpZmYsIGRvbSkge1xuICB2YXIgaSwgaiwgX2RpZmYsIF9kb20sIHBhcmVudDtcbiAgZm9yKGk9MDsgaTxkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgX2RpZmYgPSBkaWZmW2ldO1xuICAgIF9kb20gPSBnZXREb20oZG9tLCBfZGlmZi5wYXRoKTtcbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgX2RvbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKF9kb20pO1xuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgdmFyIG5ld05vZGUgPSBfZGlmZi5ub2RlLmRvbVRyZWUoKTtcbiAgICAgIGlmKF9kb20pIHtcbiAgICAgICAgX2RvbS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShuZXdOb2RlLCBfZG9tKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGdldCB0aGUgcGFyZW50XG4gICAgICAgIHBhcmVudCA9IGdldERvbShkb20sIF9kaWZmLnBhdGgsIDEpO1xuICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQobmV3Tm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICBmb3Ioaj0wOyBqPF9kaWZmLmF0dHJpYnV0ZXNEaWZmLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBhX2RpZmYgPSBfZGlmZi5hdHRyaWJ1dGVzRGlmZltqXTtcbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICAgICAgLy8gaW1wb3J0YW50IGZvciBzZWxlY3RcbiAgICAgICAgICBpZihcInZhbHVlLHNlbGVjdGVkLGNoZWNrZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBpZihfZG9tW2FfZGlmZi5rZXldICE9IGFfZGlmZi52YWx1ZSkge1xuICAgICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gYV9kaWZmLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBfZG9tLnNldEF0dHJpYnV0ZShhX2RpZmYua2V5LCBhX2RpZmYudmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgICAgIGlmKFwiY2hlY2tlZCxzZWxlY3RlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5yZW1vdmVBdHRyaWJ1dGUoYV9kaWZmLmtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICAgICAgaWYoXCJjaGVja2VkLHNlbGVjdGVkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGFfZGlmZi52YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5zZXRBdHRyaWJ1dGUoYV9kaWZmLmtleSwgYV9kaWZmLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJzdHJpbmdtdXRhdGVcIikge1xuICAgICAgX2RvbS5ub2RlVmFsdWUgPSBfZGlmZi52YWx1ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdGlhbFJlbmRlckZyb21Eb20oZG9tLCBwYXRoKSB7XG4gIHBhdGggPSBwYXRoIHx8IFwiXCI7XG4gIHZhciBpLCBjaGlsZCwgY2hpbGRyZW4gPSBbXSwgYXR0cnMgPSB7fSwgcmVuZGVyZXIgPSAnJztcbiAgaWYoZG9tLmF0dHJpYnV0ZXMpIHtcbiAgICBmb3IoaT0wOyBpIDwgZG9tLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBhdHRyID0gZG9tLmF0dHJpYnV0ZXNbaV07XG4gICAgICBhdHRyc1thdHRyLm5hbWVdID0gYXR0ci52YWx1ZTtcbiAgICB9XG4gIH1cbiAgaWYoZG9tLmNoaWxkTm9kZXMpIHtcbiAgICBmb3IoaT0wOyBpIDwgZG9tLmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoaWxkID0gZG9tLmNoaWxkTm9kZXNbaV07XG4gICAgICBjaGlsZHJlbi5wdXNoKGluaXRpYWxSZW5kZXJGcm9tRG9tKGNoaWxkLCBwYXRoICsgJy4nICsgaSkpO1xuICAgIH1cbiAgfVxuICBpZihkb20udGV4dENvbnRlbnQpIHtcbiAgICByZW5kZXJlciA9IGRvbS50ZXh0Q29udGVudDtcbiAgfVxuICB2YXIgcm4gPSBuZXcgUmVuZGVyZWROb2RlKFxuICAgIHtub2RlTmFtZTogZG9tLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCksIG5vZGU6ZG9tfSxcbiAgICB1bmRlZmluZWQsXG4gICAgcmVuZGVyZXIsXG4gICAgcGF0aCk7XG4gIHJuLmF0dHJzID0gYXR0cnM7XG4gIHJuLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gIHJldHVybiBybjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFJlbmRlcmVkTm9kZTpSZW5kZXJlZE5vZGUsXG4gIGluaXRpYWxSZW5kZXJGcm9tRG9tOmluaXRpYWxSZW5kZXJGcm9tRG9tLFxuICBhcHBseURpZmY6YXBwbHlEaWZmLFxuICBhdHRyaWJ1dGVzRGlmZjphdHRyaWJ1dGVzRGlmZixcbiAgZGlmZkNvc3Q6ZGlmZkNvc3QsXG4gIGdldERvbTpnZXREb20sXG4gIGhhbmRpY2FwOjFcbn07IiwiXG5cInVzZSBzdHJpY3RcIjtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKTtcbnZhciBleHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJyk7XG5cbnZhciB0ZW1wbGF0ZUNhY2hlID0ge307XG52YXIgY29tcG9uZW50Q2FjaGUgPSB7fTtcbi8vIGEgbmFtZSBoZXJlIGlzIGFsc28gYW55IHZhbGlkIEpTIG9iamVjdCBwcm9wZXJ0eVxudmFyIFZBUk5BTUVfUkVHID0gL15bYS16QS1aXyRdWzAtOWEtekEtWl8kXSovO1xudmFyIEhUTUxfQVRUUl9SRUcgPSAvXltBLVphLXpdW1xcdy1dezAsfS87XG52YXIgRE9VQkxFX1FVT1RFRF9TVFJJTkdfUkVHID0gL15cIihcXFxcXCJ8W15cIl0pKlwiLztcblxuZnVuY3Rpb24gQ29tcG9uZW50KG5hbWUsIHRwbCwgY29udHJvbGxlcikge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQ29tcG9uZW50KSB7XG4gICAgcmV0dXJuIG5ldyBDb21wb25lbnQobmFtZSwgdHBsLCBjb250cm9sbGVyKTtcbiAgfVxuICBpZihjb21wb25lbnRDYWNoZVtuYW1lXSkge1xuICAgIHV0aWwuQ29tcGlsZUVycm9yKFwiQ29tcG9uZW50IHdpdGggbmFtZSBcIiArIG5hbWUgKyBcIiBhbHJlYWR5IGV4aXN0XCIpO1xuICB9XG4gIGNvbXBvbmVudENhY2hlW25hbWVdID0gdGhpcztcbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy50ZW1wbGF0ZSA9IGJ1aWxkVGVtcGxhdGUodHBsKTtcbiAgdGhpcy5jb250cm9sbGVyID0gY29udHJvbGxlcjtcbn1cblxuZnVuY3Rpb24gQ29udGV4dE5hbWUobmFtZSkge1xuICB0aGlzLmJpdHMgPSBuYW1lLnNwbGl0KCcuJyk7XG59XG5cbkNvbnRleHROYW1lLnByb3RvdHlwZS5zdWJzdGl0dXRlQWxpYXMgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIGlmKGNvbnRleHQuYWxpYXNlcy5oYXNPd25Qcm9wZXJ0eSh0aGlzLmJpdHNbMF0pKSB7XG4gICAgdmFyIG5ld0JpdHMgPSBjb250ZXh0LmFsaWFzZXNbdGhpcy5iaXRzWzBdXS5zcGxpdCgnLicpO1xuICAgIHRoaXMuYml0cy5zaGlmdCgpO1xuICAgIHRoaXMuYml0cyA9IG5ld0JpdHMuY29uY2F0KHRoaXMuYml0cyk7XG4gIH1cbn07XG5cbkNvbnRleHROYW1lLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5iaXRzWzBdO1xufTtcblxuQ29udGV4dE5hbWUucHJvdG90eXBlLnN0ciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5iaXRzLmpvaW4oJy4nKTtcbn07XG5cbmZ1bmN0aW9uIENvbnRleHQoZGF0YSwgcGFyZW50KSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBDb250ZXh0KSB7XG4gICAgcmV0dXJuIG5ldyBDb250ZXh0KGRhdGEsIHBhcmVudCk7XG4gIH1cbiAgdGhpcy5kYXRhID0gZGF0YTtcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuYWxpYXNlcyA9IHt9O1xuICB0aGlzLndhdGNoaW5nID0ge307XG59XG5cbkNvbnRleHQucHJvdG90eXBlLmFkZEFsaWFzID0gZnVuY3Rpb24oc291cmNlTmFtZSwgYWxpYXNOYW1lKSB7XG4gIC8vIHNvdXJjZSBuYW1lIGNhbiBiZSAnbmFtZScgb3IgJ2xpc3Qua2V5J1xuICBpZihzb3VyY2VOYW1lID09PSBhbGlhc05hbWUpIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJBbGlhcyB3aXRoIHRoZSBuYW1lIFwiICsgYWxpYXNOYW1lICsgXCIgYWxyZWFkeSBwcmVzZW50IGluIHRoaXMgY29udGV4dC5cIik7XG4gIH1cbiAgdGhpcy5hbGlhc2VzW2FsaWFzTmFtZV0gPSBzb3VyY2VOYW1lO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUucmVzb2x2ZU5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIC8vIGdpdmVuIGEgbmFtZSwgcmV0dXJuIHRoZSBbQ29udGV4dCwgcmVzb2x2ZWQgcGF0aCwgdmFsdWVdIHdoZW5cbiAgLy8gdGhpcyBuYW1lIGlzIGZvdW5kIG9yIHVuZGVmaW5lZCBvdGhlcndpc2VcbiAgbmFtZS5zdWJzdGl0dXRlQWxpYXModGhpcyk7XG5cbiAgaWYodGhpcy5kYXRhLmhhc093blByb3BlcnR5KG5hbWUuc3RhcnQoKSkpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLmRhdGFbbmFtZS5zdGFydCgpXTtcbiAgICB2YXIgaSA9IDE7XG4gICAgd2hpbGUoaSA8IG5hbWUuYml0cy5sZW5ndGgpIHtcbiAgICAgIGlmKCF2YWx1ZS5oYXNPd25Qcm9wZXJ0eShuYW1lLmJpdHNbaV0pKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICB2YWx1ZSA9IHZhbHVlW25hbWUuYml0c1tpXV07XG4gICAgICBpKys7XG4gICAgfVxuICAgIHJldHVybiBbdGhpcywgbmFtZS5zdHIoKSwgdmFsdWVdO1xuICB9XG5cbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZU5hbWUobmFtZSk7XG4gIH1cblxufTtcblxuQ29udGV4dC5wcm90b3R5cGUuZ2V0TmFtZVBhdGggPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZU5hbWUobmV3IENvbnRleHROYW1lKG5hbWUpKTtcbiAgaWYocmVzb2x2ZWQpIHtcbiAgICByZXR1cm4gcmVzb2x2ZWRbMV07XG4gIH1cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAgdGhpcy53YXRjaGluZ1tuYW1lXSA9IGNhbGxiYWNrO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVOYW1lKG5ldyBDb250ZXh0TmFtZShuYW1lKSk7XG4gIGlmKHJlc29sdmVkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVkWzJdO1xuICB9XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB0aGlzLl9tb2RpZnkobmV3IENvbnRleHROYW1lKG5hbWUpLCB2YWx1ZSk7XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5fbW9kaWZ5ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcblxuICBpZih0aGlzLndhdGNoaW5nLmhhc093blByb3BlcnR5KG5hbWUuc3RyKCkpKSB7XG4gICAgdGhpcy53YXRjaGluZ1tuYW1lLnN0cigpXSh2YWx1ZSk7XG4gIH1cblxuICBuYW1lLnN1YnN0aXR1dGVBbGlhcyh0aGlzKTtcblxuICAvLyB3ZSBnbyBpbiBmb3IgYSBzZWFyY2ggaWYgdGhlIGZpcnN0IHBhcnQgbWF0Y2hlc1xuICBpZih0aGlzLmRhdGEuaGFzT3duUHJvcGVydHkobmFtZS5zdGFydCgpKSkge1xuICAgIHZhciBkYXRhID0gdGhpcy5kYXRhO1xuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZShpIDwgbmFtZS5iaXRzLmxlbmd0aCAtIDEpIHtcbiAgICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KG5hbWUuYml0c1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGRhdGEgPSBkYXRhW25hbWUuYml0c1tpXV07XG4gICAgICBpKys7XG4gICAgfVxuICAgIGRhdGFbbmFtZS5iaXRzW2ldXSA9IHZhbHVlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIC8vIGRhdGEgbm90IGZvdW5kLCBsZXQncyBzZWFyY2ggaW4gdGhlIHBhcmVudFxuICBpZih0aGlzLnBhcmVudCkge1xuICAgIHJldHVybiB0aGlzLnBhcmVudC5fbW9kaWZ5KG5hbWUsIHZhbHVlKTtcbiAgfVxuXG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB0aGlzLmRhdGFbbmFtZV0gPSB2YWx1ZTtcbn07XG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlcyh2LCBub2RlKSB7XG4gIHZhciBhdHRycyA9IHt9LCBuLCBzO1xuICB3aGlsZSh2KSB7XG4gICAgICB2ID0gdXRpbC50cmltKHYpO1xuICAgICAgbiA9IHYubWF0Y2goSFRNTF9BVFRSX1JFRyk7XG4gICAgICBpZighbikge1xuICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gYXR0cmlidXRlIG5hbWUgZm91bmQgaW4gXCIrdik7XG4gICAgICB9XG4gICAgICB2ID0gdi5zdWJzdHIoblswXS5sZW5ndGgpO1xuICAgICAgbiA9IG5bMF07XG4gICAgICBpZih2WzBdICE9IFwiPVwiKSB7XG4gICAgICAgIG5vZGUuY2Vycm9yKFwicGFyc2VBdHRyaWJ1dGVzOiBObyBlcXVhbCBzaWduIGFmdGVyIG5hbWUgXCIrbik7XG4gICAgICB9XG4gICAgICB2ID0gdi5zdWJzdHIoMSk7XG4gICAgICBzID0gdi5tYXRjaChET1VCTEVfUVVPVEVEX1NUUklOR19SRUcpO1xuICAgICAgaWYocykge1xuICAgICAgICBhdHRyc1tuXSA9IG5ldyBTdHJpbmdOb2RlKG51bGwsIHNbMF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcyA9IHYubWF0Y2goZXhwcmVzc2lvbi5FWFBSRVNTSU9OX1JFRyk7XG4gICAgICAgIGlmKHMgPT09IG51bGwpIHtcbiAgICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gc3RyaW5nIG9yIGV4cHJlc3Npb24gZm91bmQgYWZ0ZXIgbmFtZSBcIituKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgZXhwciA9IGV4cHJlc3Npb24uanNFeHByZXNzaW9uKHNbMV0pO1xuICAgICAgICAgIGF0dHJzW25dID0gZXhwcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKHNbMF0ubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gYXR0cnM7XG59XG5cbi8vIGFsbCB0aGUgYXZhaWxhYmxlIHRlbXBsYXRlIG5vZGVcblxuZnVuY3Rpb24gTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIHRoaXMubGluZSA9IGxpbmU7XG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB0aGlzLmNvbnRlbnQgPSBjb250ZW50O1xuICB0aGlzLmxldmVsID0gbGV2ZWw7XG4gIHRoaXMuY2hpbGRyZW4gPSBbXTtcbn1cblxuTm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBpZihsZXZlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGV2ZWwgPSAwO1xuICB9XG4gIGZvcihpPTA7IGk8bGV2ZWw7IGkrKykge1xuICAgIHN0ciArPSBcIiAgXCI7XG4gIH1cbiAgc3RyICs9IFN0cmluZyh0aGlzKSArIFwiXFxyXFxuXCI7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHN0ciArPSB0aGlzLmNoaWxkcmVuW2ldLnJlcHIobGV2ZWwgKyAxKTtcbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICBpZihwYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICBwYXRoID0gJyc7XG4gICAgcG9zID0gMDtcbiAgICB0aGlzLmlzUm9vdCA9IHRydWU7XG4gIH1cbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCAnJywgcGF0aCk7XG4gIHQuY2hpbGRyZW4gPSB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xuICByZXR1cm4gdDtcbn07XG5cbk5vZGUucHJvdG90eXBlLmNlcnJvciA9IGZ1bmN0aW9uKG1zZykge1xuICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IodGhpcy50b1N0cmluZygpICsgXCI6IFwiICsgbXNnKTtcbn07XG5cbk5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtdO1xufTtcblxuTm9kZS5wcm90b3R5cGUudHJlZUNoaWxkcmVuID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gW10sIGksIHAsIGosIGNoaWxkcmVuID0gbnVsbCwgY2hpbGQgPSBudWxsO1xuICBqID0gcG9zO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBwID0gcGF0aDtcbiAgICBjaGlsZCA9IHRoaXMuY2hpbGRyZW5baV07XG4gICAgaWYoY2hpbGQuaGFzT3duUHJvcGVydHkoJ25vZGVOYW1lJykpIHtcbiAgICAgIHAgKz0gJy4nICsgajtcbiAgICAgIGorKztcbiAgICAgIGNoaWxkcmVuID0gY2hpbGQudHJlZShjb250ZXh0LCBwLCAwKTtcbiAgICAgIHQucHVzaChjaGlsZHJlbik7XG4gICAgfSBlbHNlIGlmICghY2hpbGQucmVuZGVyRXhsY3VkZWQpIHtcbiAgICAgIGNoaWxkcmVuID0gY2hpbGQudHJlZShjb250ZXh0LCBwLCBqKTtcbiAgICAgIGlmKGNoaWxkcmVuKSB7XG4gICAgICAgIHQgPSB0LmNvbmNhdChjaGlsZHJlbik7XG4gICAgICAgIGogKz0gY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdDtcbn07XG5cbk5vZGUucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24oY2hpbGQpIHtcbiAgdGhpcy5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyBcIihcIit0aGlzLmNvbnRlbnQucmVwbGFjZShcIlxcblwiLCBcIlwiKStcIikgYXQgbGluZSBcIiArIHRoaXMubGluZTtcbn07XG5cbmZ1bmN0aW9uIENvbW1lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICBwYXJlbnQuY2hpbGRyZW4ucHVzaCh0aGlzKTtcbiAgdGhpcy5yZW5kZXJFeGxjdWRlZCA9IHRydWU7XG59XG51dGlsLmluaGVyaXRzKENvbW1lbnROb2RlLCBOb2RlKTtcblxuZnVuY3Rpb24gSHRtbE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubm9kZU5hbWUgPSB0aGlzLmNvbnRlbnQuc3BsaXQoXCIgXCIpWzBdO1xuICB0aGlzLmF0dHJzID0gcGFyc2VBdHRyaWJ1dGVzKHRoaXMuY29udGVudC5zdWJzdHIodGhpcy5ub2RlTmFtZS5sZW5ndGgpLCB0aGlzKTtcbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhIdG1sTm9kZSwgTm9kZSk7XG5cbkh0bWxOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgdGhpcy5ub2RlTmFtZSwgcGF0aCk7XG4gIHQuYXR0cnMgPSB0aGlzLnJlbmRlckF0dHJpYnV0ZXMoY29udGV4dCwgcGF0aCk7XG4gIHQuY2hpbGRyZW4gPSB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xuICByZXR1cm4gdDtcbn07XG5cbmZ1bmN0aW9uIGJpbmRpbmdOYW1lKG5vZGUpIHtcbiAgaWYobm9kZS5iaW5kaW5nKSB7XG4gICAgcmV0dXJuIG5vZGUuYmluZGluZztcbiAgfVxufVxuXG5mdW5jdGlvbiBldmFsdWF0ZShpdGVtLCBjb250ZXh0KSB7XG4gIGlmKHR5cGVvZiBpdGVtID09IFwiZnVuY3Rpb25cIikge1xuICAgIHJldHVybiBpdGVtKGNvbnRleHQpO1xuICB9XG4gIGlmKGl0ZW0uZXZhbHVhdGUpIHtcbiAgICAgIHJldHVybiBpdGVtLmV2YWx1YXRlKGNvbnRleHQpO1xuICB9XG4gIHJldHVybiBpdGVtO1xufVxuXG5IdG1sTm9kZS5wcm90b3R5cGUucmVuZGVyQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgdmFyIHJfYXR0cnMgPSB7fSwga2V5LCBhdHRyLCBuYW1lO1xuICBmb3Ioa2V5IGluIHRoaXMuYXR0cnMpIHtcbiAgICBhdHRyID0gdGhpcy5hdHRyc1trZXldO1xuICAgIC8vIHRvZG8sIGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGRpc2NyaW1pbmF0ZSBldmVudHNcbiAgICBpZihrZXkuaW5kZXhPZihcImxrLVwiKSA9PT0gMCkge1xuICAgICAgLy8gYWRkIHRoZSBwYXRoIHRvIHRoZSByZW5kZXIgbm9kZSB0byBhbnkgbGstdGhpbmcgbm9kZVxuICAgICAgcl9hdHRyc1snbGstcGF0aCddID0gcGF0aDtcbiAgICAgIGlmKGtleSA9PT0gJ2xrLWJpbmQnKSB7XG4gICAgICAgIHJfYXR0cnNba2V5XSA9IGV2YWx1YXRlKGF0dHIsIGNvbnRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcl9hdHRyc1trZXldID0gXCJ0cnVlXCI7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB2YXIgdiA9IGV2YWx1YXRlKGF0dHIsIGNvbnRleHQpO1xuXG4gICAgaWYodiA9PT0gZmFsc2UpIHtcbiAgICAgIC8vIG5vdGhpbmdcbiAgICB9IGVsc2Uge1xuICAgICAgcl9hdHRyc1trZXldID0gdjtcbiAgICB9XG4gIH1cblxuICBpZihcImlucHV0LHNlbGVjdCx0ZXh0YXJlYVwiLmluZGV4T2YodGhpcy5ub2RlTmFtZSkgIT0gLTEgJiYgdGhpcy5hdHRycy5oYXNPd25Qcm9wZXJ0eSgndmFsdWUnKSkge1xuICAgIGF0dHIgPSB0aGlzLmF0dHJzLnZhbHVlO1xuICAgIG5hbWUgPSBiaW5kaW5nTmFtZShhdHRyKTtcbiAgICBpZihuYW1lICYmIHRoaXMuYXR0cnNbJ2xrLWJpbmQnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByX2F0dHJzWydsay1iaW5kJ10gPSBuYW1lO1xuICAgICAgcl9hdHRyc1snbGstcGF0aCddID0gcGF0aDtcbiAgICB9XG4gIH1cbiAgaWYodGhpcy5ub2RlTmFtZSA9PSBcInRleHRhcmVhXCIgJiYgdGhpcy5jaGlsZHJlbi5sZW5ndGggPT0gMSAmJiB0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24pIHtcbiAgICBuYW1lID0gYmluZGluZ05hbWUodGhpcy5jaGlsZHJlblswXS5leHByZXNzaW9uKTtcbiAgICBpZihuYW1lICYmIHRoaXMuYXR0cnNbJ2xrLWJpbmQnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByX2F0dHJzWydsay1iaW5kJ10gPSBuYW1lO1xuICAgICAgcl9hdHRyc1snbGstcGF0aCddID0gcGF0aDtcbiAgICAgIC8vIGFzIHNvb24gYXMgdGhlIHVzZXIgaGFzIGFsdGVyZWQgdGhlIHZhbHVlIG9mIHRoZSB0ZXh0YXJlYSBvciBzY3JpcHQgaGFzIGFsdGVyZWRcbiAgICAgIC8vIHRoZSB2YWx1ZSBwcm9wZXJ0eSBvZiB0aGUgdGV4dGFyZWEsIHRoZSB0ZXh0IG5vZGUgaXMgb3V0IG9mIHRoZSBwaWN0dXJlIGFuZCBpcyBub1xuICAgICAgLy8gbG9uZ2VyIGJvdW5kIHRvIHRoZSB0ZXh0YXJlYSdzIHZhbHVlIGluIGFueSB3YXkuXG4gICAgICByX2F0dHJzLnZhbHVlID0gdGhpcy5jaGlsZHJlblswXS5leHByZXNzaW9uKGNvbnRleHQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcl9hdHRycztcbn07XG5cbkh0bWxOb2RlLnByb3RvdHlwZS5kb21Ob2RlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGhpcy5ub2RlTmFtZSksIGtleSwgYXR0cnM9dGhpcy5yZW5kZXJBdHRyaWJ1dGVzKGNvbnRleHQsIHBhdGgpO1xuICBmb3Ioa2V5IGluIGF0dHJzKSB7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGUoa2V5LCBhdHRyc1trZXldKTtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn07XG5cbmZ1bmN0aW9uIEZvck5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICAvLyBzeW50YXg6IGZvciBrZXksIHZhbHVlIGluIGxpc3RcbiAgLy8gICAgICAgICBmb3IgdmFsdWUgaW4gbGlzdFxuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHZhciB2YXIxLCB2YXIyLCBzb3VyY2VOYW1lO1xuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKDQpKTtcbiAgdmFyMSA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICBpZighdmFyMSkge1xuICAgIHRoaXMuY2Vycm9yKFwiZmlyc3QgdmFyaWFibGUgbmFtZSBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIodmFyMVswXS5sZW5ndGgpKTtcbiAgaWYoY29udGVudFswXSA9PSAnLCcpIHtcbiAgICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKDEpKTtcbiAgICB2YXIyID0gY29udGVudC5tYXRjaChWQVJOQU1FX1JFRyk7XG4gICAgaWYoIXZhcjIpIHtcbiAgICAgIHRoaXMuY2Vycm9yKFwic2Vjb25kIHZhcmlhYmxlIGFmdGVyIGNvbW1hIGlzIG1pc3NpbmdcIik7XG4gICAgfVxuICAgIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIodmFyMlswXS5sZW5ndGgpKTtcbiAgfVxuICBpZighY29udGVudC5tYXRjaCgvXmluLykpIHtcbiAgICB0aGlzLmNlcnJvcihcImluIGtleXdvcmQgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKDIpKTtcbiAgc291cmNlTmFtZSA9IGNvbnRlbnQubWF0Y2goZXhwcmVzc2lvbi5uYW1lUmVnKTtcbiAgaWYoIXNvdXJjZU5hbWUpIHtcbiAgICB0aGlzLmNlcnJvcihcIml0ZXJhYmxlIG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICB0aGlzLnNvdXJjZU5hbWUgPSBzb3VyY2VOYW1lWzBdO1xuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHNvdXJjZU5hbWVbMF0ubGVuZ3RoKSk7XG4gIGlmKGNvbnRlbnQgIT09IFwiXCIpIHtcbiAgICB0aGlzLmNlcnJvcihcImxlZnQgb3ZlciB1bnBhcnNhYmxlIGNvbnRlbnQ6IFwiICsgY29udGVudCk7XG4gIH1cblxuICBpZih2YXIxICYmIHZhcjIpIHtcbiAgICB0aGlzLmluZGV4TmFtZSA9IHZhcjE7XG4gICAgdGhpcy5hbGlhcyA9IHZhcjJbMF07XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5hbGlhcyA9IHZhcjFbMF07XG4gIH1cbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhGb3JOb2RlLCBOb2RlKTtcblxuRm9yTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgdCA9IFtdLCBrZXk7XG4gIHZhciBkID0gY29udGV4dC5nZXQodGhpcy5zb3VyY2VOYW1lKTtcbiAgaWYoIWQpIHtcbiAgICByZXR1cm4gdDtcbiAgfVxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGQpLCBpO1xuICBmb3IoaSA9IDA7IGk8a2V5cy5sZW5ndGg7IGkrKykge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgdmFyIG5ld19kYXRhID0ge307XG4gICAgLy8gYWRkIHRoZSBrZXkgdG8gYWNjZXNzIHRoZSBjb250ZXh0J3MgZGF0YVxuICAgIGlmKHRoaXMuaW5kZXhOYW1lKSB7XG4gICAgICBuZXdfZGF0YVt0aGlzLmluZGV4TmFtZV0gPSBrZXk7XG4gICAgfVxuICAgIHZhciBuZXdfY29udGV4dCA9IG5ldyBDb250ZXh0KG5ld19kYXRhLCBjb250ZXh0KTtcbiAgICAvLyBrZWVwIHRyYWNrIG9mIHdoZXJlIHRoZSBkYXRhIGlzIGNvbWluZyBmcm9tXG4gICAgbmV3X2NvbnRleHQuYWRkQWxpYXModGhpcy5zb3VyY2VOYW1lICsgJy4nICsga2V5LCB0aGlzLmFsaWFzKTtcbiAgICB0ID0gdC5jb25jYXQodGhpcy50cmVlQ2hpbGRyZW4obmV3X2NvbnRleHQsIHBhdGgsIHQubGVuZ3RoICsgcG9zKSk7XG4gIH1cbiAgcmV0dXJuIHQ7XG59O1xuXG5mdW5jdGlvbiBJZk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uanNFeHByZXNzaW9uKGNvbnRlbnQucmVwbGFjZSgvXmlmL2csIFwiXCIpKTtcbiAgcGFyZW50LmNoaWxkcmVuLnB1c2godGhpcyk7XG59XG51dGlsLmluaGVyaXRzKElmTm9kZSwgTm9kZSk7XG5cbklmTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICBpZighdGhpcy5leHByZXNzaW9uKGNvbnRleHQpKSB7XG4gICAgaWYodGhpcy5lbHNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbHNlLnRyZWUoY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIHJldHVybiB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLnNlYXJjaElmKGN1cnJlbnROb2RlKTtcbn1cbnV0aWwuaW5oZXJpdHMoRWxzZU5vZGUsIE5vZGUpO1xuXG5FbHNlTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICByZXR1cm4gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIElmRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmpzRXhwcmVzc2lvbihjb250ZW50LnJlcGxhY2UoL15lbHNlaWYvZywgXCJcIikpO1xuICB0aGlzLnNlYXJjaElmKGN1cnJlbnROb2RlKTtcbn1cbi8vIGltcG9ydGFudCB0byBiZSBhbiBJZk5vZGVcbnV0aWwuaW5oZXJpdHMoSWZFbHNlTm9kZSwgSWZOb2RlKTtcblxuSWZFbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWYgPSBmdW5jdGlvbiBzZWFyY2hJZihjdXJyZW50Tm9kZSkge1xuICAvLyBmaXJzdCBub2RlIG9uIHRoZSBzYW1lIGxldmVsIGhhcyB0byBiZSB0aGUgaWYvZWxzZWlmIG5vZGVcbiAgd2hpbGUoY3VycmVudE5vZGUpIHtcbiAgICBpZihjdXJyZW50Tm9kZS5sZXZlbCA8IHRoaXMubGV2ZWwpIHtcbiAgICAgIHRoaXMuY2Vycm9yKFwiY2Fubm90IGZpbmQgYSBjb3JyZXNwb25kaW5nIGlmLWxpa2Ugc3RhdGVtZW50IGF0IHRoZSBzYW1lIGxldmVsLlwiKTtcbiAgICB9XG4gICAgaWYoY3VycmVudE5vZGUubGV2ZWwgPT0gdGhpcy5sZXZlbCkge1xuICAgICAgaWYoIShjdXJyZW50Tm9kZSBpbnN0YW5jZW9mIElmTm9kZSkpIHtcbiAgICAgICAgdGhpcy5jZXJyb3IoXCJhdCB0aGUgc2FtZSBsZXZlbCBpcyBub3QgYSBpZi1saWtlIHN0YXRlbWVudC5cIik7XG4gICAgICB9XG4gICAgICBjdXJyZW50Tm9kZS5lbHNlID0gdGhpcztcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjdXJyZW50Tm9kZSA9IGN1cnJlbnROb2RlLnBhcmVudDtcbiAgfVxufTtcbkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZiA9IElmRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmO1xuXG5mdW5jdGlvbiBFeHByZXNzaW9uTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IFwiI3RleHRcIjtcbiAgdmFyIG0gPSBjb250ZW50Lm1hdGNoKGV4cHJlc3Npb24uRVhQUkVTU0lPTl9SRUcpO1xuICBpZighbSkge1xuICAgIHRoaXMuY2Vycm9yKFwiZGVjbGFyZWQgaW1wcm9wZXJseVwiKTtcbiAgfVxuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmpzRXhwcmVzc2lvbihtWzFdKTtcbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhFeHByZXNzaW9uTm9kZSwgTm9kZSk7XG5cbkV4cHJlc3Npb25Ob2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICAvLyByZW5kZXJlclxuICB2YXIgcmVuZGVyZXIgPSBTdHJpbmcoZXZhbHVhdGUodGhpcy5leHByZXNzaW9uLCBjb250ZXh0KSk7XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgcmVuZGVyZXIsIHBhdGgpO1xuICByZXR1cm4gdDtcbn07XG5cbkV4cHJlc3Npb25Ob2RlLnByb3RvdHlwZS5kb21Ob2RlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZXZhbHVhdGUodGhpcy5leHByZXNzaW9uLCBjb250ZXh0KSk7XG59O1xuXG5mdW5jdGlvbiBTdHJpbmdOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gXCIjdGV4dFwiO1xuICB0aGlzLnN0cmluZyA9IHRoaXMuY29udGVudC5yZXBsYWNlKC9eXCJ8XCIkL2csIFwiXCIpLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInLCAnZ20nKTtcbiAgdGhpcy5jb21waWxlZEV4cHJlc3Npb24gPSBleHByZXNzaW9uLmNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnModGhpcy5zdHJpbmcpO1xuICBpZihwYXJlbnQpIHtcbiAgICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG4gIH1cbn1cbnV0aWwuaW5oZXJpdHMoU3RyaW5nTm9kZSwgTm9kZSk7XG5cblN0cmluZ05vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIC8vIHJlbmRlcmVyIHNob3VsZCBiZSBhbGwgYXR0cmlidXRlc1xuICB2YXIgcmVuZGVyZXIgPSBleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpO1xuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5TdHJpbmdOb2RlLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCk7XG59O1xuXG5TdHJpbmdOb2RlLnByb3RvdHlwZS5kb21Ob2RlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KSk7XG59O1xuXG5TdHJpbmdOb2RlLnByb3RvdHlwZS5hZGRDaGlsZCA9IGZ1bmN0aW9uKGNoaWxkKSB7XG4gIHRoaXMuY2Vycm9yKFwiY2Fubm90IGhhdmUgY2hpbGRyZW4gXCIgKyBjaGlsZCk7XG59O1xuXG5mdW5jdGlvbiBJbmNsdWRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5uYW1lID0gdXRpbC50cmltKGNvbnRlbnQuc3BsaXQoXCIgXCIpWzFdKTtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlQ2FjaGVbdGhpcy5uYW1lXTtcbiAgaWYodGhpcy50ZW1wbGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJUZW1wbGF0ZSB3aXRoIG5hbWUgXCIgKyB0aGlzLm5hbWUgKyBcIiBpcyBub3QgcmVnaXN0ZXJlZFwiKTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEluY2x1ZGVOb2RlLCBOb2RlKTtcblxuSW5jbHVkZU5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgcmV0dXJuIHRoaXMudGVtcGxhdGUudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5mdW5jdGlvbiBDb21wb25lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQpLnN1YnN0cigxMCk7XG4gIHZhciBuYW1lID0gY29udGVudC5tYXRjaChWQVJOQU1FX1JFRyk7XG4gIGlmKCFuYW1lKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJDb21wb25lbnQgbmFtZSBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIobmFtZVswXS5sZW5ndGgpKTtcbiAgdGhpcy5uYW1lID0gbmFtZVswXTtcbiAgdGhpcy5hdHRycyA9IHBhcnNlQXR0cmlidXRlcyhjb250ZW50LCB0aGlzKTtcbiAgdGhpcy5jb21wb25lbnQgPSBjb21wb25lbnRDYWNoZVt0aGlzLm5hbWVdO1xuICBpZih0aGlzLmNvbXBvbmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJDb21wb25lbnQgd2l0aCBuYW1lIFwiICsgdGhpcy5uYW1lICsgXCIgaXMgbm90IHJlZ2lzdGVyZWRcIik7XG4gIH1cbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhDb21wb25lbnROb2RlLCBOb2RlKTtcblxuQ29tcG9uZW50Tm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgbmV3X2NvbnRleHQgPSBuZXcgQ29udGV4dCh7fSwgY29udGV4dCk7XG4gIHZhciBrZXksIGF0dHIsIHZhbHVlLCBzb3VyY2U7XG4gIGZvcihrZXkgaW4gdGhpcy5hdHRycykge1xuICAgIGF0dHIgPSB0aGlzLmF0dHJzW2tleV07XG4gICAgdmFsdWUgPSBldmFsdWF0ZShhdHRyLCBjb250ZXh0KTtcbiAgICBuZXdfY29udGV4dC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgaWYodHlwZW9mIGF0dHIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgc291cmNlID0gYmluZGluZ05hbWUoYXR0cik7XG4gICAgICBpZihzb3VyY2UgJiYga2V5ICE9IHNvdXJjZSkge1xuICAgICAgICBuZXdfY29udGV4dC5hZGRBbGlhcyhzb3VyY2UsIGtleSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmKHRoaXMuY29tcG9uZW50LmNvbnRyb2xsZXIpe1xuICAgIHRoaXMuY29tcG9uZW50LmNvbnRyb2xsZXIobmV3X2NvbnRleHQpO1xuICB9XG4gIHJldHVybiB0aGlzLmNvbXBvbmVudC50ZW1wbGF0ZS50cmVlQ2hpbGRyZW4obmV3X2NvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5Db21wb25lbnROb2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgcmV0dXJuIHRoaXMuY29tcG9uZW50LnRlbXBsYXRlLnJlcHIobGV2ZWwgKyAxKTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSwgY3VycmVudE5vZGUpIHtcbiAgdmFyIG5vZGU7XG4gIGlmKGNvbnRlbnQubGVuZ3RoID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBTdHJpbmdOb2RlKHBhcmVudCwgXCJcXG5cIiwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJyMnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgQ29tbWVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignaWYgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IElmTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdlbHNlaWYgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IElmRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxLCBjdXJyZW50Tm9kZSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2Vsc2UnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRWxzZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxLCBjdXJyZW50Tm9kZSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2ZvciAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRm9yTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdpbmNsdWRlICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBJbmNsdWRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdjb21wb25lbnQgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IENvbXBvbmVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignXCInKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgU3RyaW5nTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoL15cXHcvLmV4ZWMoY29udGVudCkpIHtcbiAgICBub2RlID0gbmV3IEh0bWxOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ3t7JykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEV4cHJlc3Npb25Ob2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiY3JlYXRlTm9kZTogdW5rbm93IG5vZGUgdHlwZSBcIiArIGNvbnRlbnQpO1xuICB9XG4gIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBidWlsZFRlbXBsYXRlKHRwbCwgdGVtcGxhdGVOYW1lKSB7XG5cbiAgLy8gYWxyZWFkeSBhIHRlbXBsYXRlP1xuICBpZih0cGwgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgcmV0dXJuIHRwbDtcbiAgfVxuXG4gIGlmKHRwbCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgdHBsID0gdHBsLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgdmFyIHJvb3QgPSBuZXcgTm9kZShudWxsLCBcIlwiLCAwKSwgbGluZXMsIGxpbmUsIGxldmVsLFxuICAgIGNvbnRlbnQsIGksIGN1cnJlbnROb2RlID0gcm9vdCwgcGFyZW50LCBzZWFyY2hOb2RlO1xuXG4gIGxpbmVzID0gdHBsLnNwbGl0KFwiXFxuXCIpO1xuXG4gIGZvcihpPTA7IGk8bGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBsaW5lID0gbGluZXNbaV07XG4gICAgbGV2ZWwgPSBsaW5lLm1hdGNoKC9cXHMqLylbMF0ubGVuZ3RoICsgMTtcbiAgICBjb250ZW50ID0gbGluZS5zbGljZShsZXZlbCAtIDEpO1xuXG4gICAgLy8gbXVsdGlsaW5lIHN1cHBvcnQ6IGVuZHMgd2l0aCBhIFxcXG4gICAgdmFyIGogPSAwO1xuICAgIHdoaWxlKGNvbnRlbnQubWF0Y2goL1xcXFwkLykpIHtcbiAgICAgICAgaisrO1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cXFxcJC8sICcnKSArIGxpbmVzW2kral07XG4gICAgfVxuICAgIGkgPSBpICsgajtcblxuICAgIC8vIG11bHRpbGluZSBzdHJpbmdzXG4gICAgaiA9IDA7XG4gICAgaWYoY29udGVudC5tYXRjaCgvXlwiXCJcIi8pKSB7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL15cIlwiXCIvLCAnXCInKTtcbiAgICAgICAgd2hpbGUoIWNvbnRlbnQubWF0Y2goL1wiXCJcIiQvKSkge1xuICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgaWYoaStqID4gbGluZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIk11bHRpbGluZSBzdHJpbmcgc3RhcnRlZCBidXQgdW5maW5pc2hlZCBhdCBsaW5lIFwiICsgKGkgKyAxKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250ZW50ID0gY29udGVudCArIGxpbmVzW2kral07XG4gICAgICAgIH1cbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXCJcIlwiJC8sICdcIicpO1xuICAgIH1cbiAgICBpID0gaSArIGo7XG5cbiAgICBzZWFyY2hOb2RlID0gY3VycmVudE5vZGU7XG4gICAgcGFyZW50ID0gbnVsbDtcblxuICAgIC8vIHNlYXJjaCBmb3IgdGhlIHBhcmVudCBub2RlXG4gICAgd2hpbGUodHJ1ZSkge1xuXG4gICAgICBpZihsZXZlbCA+IHNlYXJjaE5vZGUubGV2ZWwpIHtcbiAgICAgICAgcGFyZW50ID0gc2VhcmNoTm9kZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmKCFzZWFyY2hOb2RlLnBhcmVudCkge1xuICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJJbmRlbnRhdGlvbiBlcnJvciBhdCBsaW5lIFwiICsgKGkgKyAxKSk7XG4gICAgICB9XG5cbiAgICAgIGlmKGxldmVsID09IHNlYXJjaE5vZGUubGV2ZWwpIHtcbiAgICAgICAgcGFyZW50ID0gc2VhcmNoTm9kZS5wYXJlbnQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBzZWFyY2hOb2RlID0gc2VhcmNoTm9kZS5wYXJlbnQ7XG4gICAgfVxuXG4gICAgaWYocGFyZW50LmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgaWYocGFyZW50LmNoaWxkcmVuWzBdLmxldmVsICE9IGxldmVsKSB7XG4gICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkluZGVudGF0aW9uIGVycm9yIGF0IGxpbmUgXCIgKyAoaSArIDEpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9IGNyZWF0ZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgaSwgY3VycmVudE5vZGUpO1xuICAgIGN1cnJlbnROb2RlID0gbm9kZTtcblxuICB9XG4gIGlmKHRlbXBsYXRlTmFtZSkge1xuICAgIHRlbXBsYXRlQ2FjaGVbdGVtcGxhdGVOYW1lXSA9IHJvb3Q7XG4gIH1cblxuICByZXR1cm4gcm9vdDtcbn1cblxuZnVuY3Rpb24gY29sbGVjdENvbXBvbmVudHMoKSB7XG4gIHZhciBjb21wb25lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW3R5cGU9XCJsaWtlbHkvY29tcG9uZW50XCJdJyksIGk7XG4gIGZvcihpPTA7IGk8Y29tcG9uZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGlmKCFjb21wb25lbnRzW2ldLmlkKSB7XG4gICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJDb21wb25lbnQgaXMgbWlzc2luZyBhbiBpZCBcIiArIGNvbXBvbmVudHNbaV0udG9TdHJpbmcoKSk7XG4gICAgfVxuICAgIG5ldyBDb21wb25lbnQoY29tcG9uZW50c1tpXS5pZCwgY29tcG9uZW50c1tpXS50ZXh0Q29udGVudCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY29sbGVjdFRlbXBsYXRlcygpIHtcbiAgdmFyIHRlbXBsYXRlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1t0eXBlPVwibGlrZWx5L3RlbXBsYXRlXCJdJyksIGk7XG4gIGZvcihpPTA7IGk8dGVtcGxhdGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYoIXRlbXBsYXRlc1tpXS5pZCkge1xuICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiVGVtcGxhdGUgaXMgbWlzc2luZyBhbiBpZCBcIiArIHRlbXBsYXRlc1tpXS50b1N0cmluZygpKTtcbiAgICB9XG4gICAgbmV3IGJ1aWxkVGVtcGxhdGUodGVtcGxhdGVzW2ldLnRleHRDb250ZW50LCB0ZW1wbGF0ZXNbaV0uaWQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3QoKXtcbiAgY29sbGVjdENvbXBvbmVudHMoKTtcbiAgY29sbGVjdFRlbXBsYXRlcygpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGRUZW1wbGF0ZTogYnVpbGRUZW1wbGF0ZSxcbiAgcGFyc2VBdHRyaWJ1dGVzOiBwYXJzZUF0dHJpYnV0ZXMsXG4gIENvbnRleHQ6IENvbnRleHQsXG4gIHRlbXBsYXRlczogdGVtcGxhdGVDYWNoZSxcbiAgY29tcG9uZW50czogY29tcG9uZW50Q2FjaGUsXG4gIGNvbGxlY3RDb21wb25lbnRzOiBjb2xsZWN0Q29tcG9uZW50cyxcbiAgY29sbGVjdFRlbXBsYXRlczogY29sbGVjdFRlbXBsYXRlcyxcbiAgY29sbGVjdDogY29sbGVjdCxcbiAgQ29udGV4dE5hbWU6IENvbnRleHROYW1lLFxuICBDb21wb25lbnQ6IENvbXBvbmVudCxcbiAgTm9kZTogTm9kZVxufTsiLCJcblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBpbmhlcml0cyhjaGlsZCwgcGFyZW50KSB7XG4gIGNoaWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUocGFyZW50LnByb3RvdHlwZSk7XG4gIGNoaWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGNoaWxkO1xufVxuXG5mdW5jdGlvbiBDb21waWxlRXJyb3IobXNnKSB7XG4gIHRoaXMubmFtZSA9IFwiQ29tcGlsZUVycm9yXCI7XG4gIHRoaXMubWVzc2FnZSA9IChtc2cgfHwgXCJcIik7XG59XG5Db21waWxlRXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBSdW50aW1lRXJyb3IobXNnKSB7XG4gIHRoaXMubmFtZSA9IFwiUnVudGltZUVycm9yXCI7XG4gIHRoaXMubWVzc2FnZSA9IChtc2cgfHwgXCJcIik7XG59XG5SdW50aW1lRXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBlc2NhcGUodW5zYWZlKSB7XG4gIHJldHVybiB1bnNhZmVcbiAgICAucmVwbGFjZSgvJi9nLCBcIiZhbXA7XCIpXG4gICAgLnJlcGxhY2UoLzwvZywgXCImbHQ7XCIpXG4gICAgLnJlcGxhY2UoLz4vZywgXCImZ3Q7XCIpXG4gICAgLnJlcGxhY2UoL1wiL2csIFwiJnF1b3Q7XCIpXG4gICAgLnJlcGxhY2UoLycvZywgXCImIzAzOTtcIik7XG59XG5cbmZ1bmN0aW9uIHRyaW0odHh0KSB7XG4gIHJldHVybiB0eHQucmVwbGFjZSgvXlxccyt8XFxzKyQvZyAsXCJcIik7XG59XG5cbmZ1bmN0aW9uIGV2ZW50KG5hbWUsIGRhdGEpIHtcbiAgdmFyIGV2dCA9IG5ldyBDdXN0b21FdmVudChuYW1lLCB7XG4gICAgYnViYmxlczogdHJ1ZSxcbiAgICBjYW5jZWxhYmxlOiBmYWxzZSxcbiAgICBkZXRhaWxzOiBkYXRhXG4gIH0pO1xuICByZXR1cm4gZXZ0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5oZXJpdHM6aW5oZXJpdHMsXG4gIENvbXBpbGVFcnJvcjpDb21waWxlRXJyb3IsXG4gIFJ1bnRpbWVFcnJvcjpSdW50aW1lRXJyb3IsXG4gIGVzY2FwZTplc2NhcGUsXG4gIHRyaW06dHJpbSxcbiAgZXZlbnQ6ZXZlbnRcbn07Il19
(2)
});
