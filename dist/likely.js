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

function diffCost(diff) {
  var value=0, i, j;
  for(i=0; i<diff.length; i++) {
    if(diff[i].action == "remove") {
      value += 2;

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNodEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgRVhQUkVTU0lPTl9SRUcgPSAvXnt7KC4rPyl9fS87XG5cbmZ1bmN0aW9uIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnModHh0KSB7XG4gIC8vIGNvbXBpbGUgdGhlIGV4cHJlc3Npb25zIGZvdW5kIGluIHRoZSB0ZXh0XG4gIC8vIGFuZCByZXR1cm4gYSBsaXN0IG9mIHRleHQrZXhwcmVzc2lvblxuICB2YXIgZXhwciwgYXJvdW5kO1xuICB2YXIgbGlzdCA9IFtdO1xuICB3aGlsZSh0cnVlKSB7XG4gICAgdmFyIG1hdGNoID0gL3t7KC4rPyl9fS8uZXhlYyh0eHQpO1xuICAgIGlmKCFtYXRjaCkge1xuICAgICAgaWYodHh0KSB7XG4gICAgICAgIGxpc3QucHVzaCh0eHQpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGV4cHIgPSBqc0V4cHJlc3Npb24obWF0Y2hbMV0pO1xuICAgIGFyb3VuZCA9IHR4dC5zcGxpdChtYXRjaFswXSwgMik7XG4gICAgaWYoYXJvdW5kWzBdLmxlbmd0aCkge1xuICAgICAgbGlzdC5wdXNoKGFyb3VuZFswXSk7XG4gICAgfVxuICAgIGxpc3QucHVzaChleHByKTtcbiAgICB0eHQgPSBhcm91bmRbMV07XG4gIH1cbiAgcmV0dXJuIGxpc3Q7XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlRXhwcmVzc2lvbkxpc3QoZXhwcmVzc2lvbnMsIGNvbnRleHQpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGZvcihpPTA7IGk8ZXhwcmVzc2lvbnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGV4cHJlc3Npb25zW2ldO1xuICAgIGlmKHR5cGVvZiBpdGVtID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgc3RyICs9IGl0ZW0oY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSBpdGVtO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlT3V0T2ZTdHJpbmdzKHN0cikge1xuICB2YXIgaW5kZXggPSAwLCBsZW5ndGggPSBzdHIubGVuZ3RoLCBjaDtcbiAgdmFyIG5ld19zdHIgPSBcIlwiLCBpblN0cmluZyA9IG51bGwsIHN0YXJ0ID0gMDtcbiAgd2hpbGUoaW5kZXggPCBsZW5ndGgpIHtcbiAgICBjaCA9IHN0ci5jaGFyQXQoaW5kZXgpO1xuICAgIGlmKGNoID09PSAnXFxcXCcpIHtcbiAgICAgIGluZGV4ID0gaW5kZXggKyAyO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmKGNoID09PSAnXCInIHx8IGNoID09PSBcIidcIikge1xuICAgICAgLy8gY2xvc2luZyBhIHN0cmluZ1xuICAgICAgaWYoaW5TdHJpbmcgPT09IGNoKSB7XG4gICAgICAgIGluU3RyaW5nID0gbnVsbDtcbiAgICAgICAgbmV3X3N0ciA9IG5ld19zdHIgKyBzdHIuc2xpY2Uoc3RhcnQsIGluZGV4KTtcbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG9wZW5pbmcgYSBzdHJpbmdcbiAgICAgICAgbmV3X3N0ciA9IG5ld19zdHIgKyByZXBsYWNlTmFtZXMoc3RyLnNsaWNlKHN0YXJ0LCBpbmRleCkpO1xuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICBpblN0cmluZyA9IGNoO1xuICAgICAgfVxuICAgIH1cbiAgICBpbmRleCA9IGluZGV4ICsgMTtcbiAgfVxuICBuZXdfc3RyICs9IHJlcGxhY2VOYW1lcyhzdHIuc2xpY2Uoc3RhcnQsIGluZGV4KSk7XG4gIHJldHVybiBuZXdfc3RyO1xufVxuXG52YXIgbmFtZVJlZyA9IC9bYS16QS1aXyRdWzAtOWEtekEtWl8kXFwuXSovZ207XG52YXIgamF2YXNjcmlwdFZhbHVlcyA9IFsndHJ1ZScsICdmYWxzZScsICd1bmRlZmluZWQnLCAnbnVsbCddO1xuXG5mdW5jdGlvbiByZXBsYWNlTmFtZXMoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZShuYW1lUmVnLCBmdW5jdGlvbihfbmFtZSkge1xuICAgIGlmKGphdmFzY3JpcHRWYWx1ZXMuaW5kZXhPZihfbmFtZSkgPiAtMSkge1xuICAgICAgcmV0dXJuIF9uYW1lO1xuICAgIH1cbiAgICBpZighX25hbWUubWF0Y2goL15jb250ZXh0LykgJiYgKF9uYW1lICE9ICd0cnVlJyAmJiBfbmFtZSAhPSAnZmFsc2UnKSkge1xuICAgICAgcmV0dXJuICdjb250ZXh0LmdldChcIicrX25hbWUrJ1wiKSc7XG4gICAgfVxuICAgIHJldHVybiBfbmFtZTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGpzRXhwcmVzc2lvbihzb3VyY2UpIHtcbiAgdmFyIGhhc05hbWUgPSBzb3VyY2UubWF0Y2gobmFtZVJlZyk7XG4gIHZhciBuZXdTb3VyY2UgPSByZXBsYWNlT3V0T2ZTdHJpbmdzKHNvdXJjZSk7XG4gIHZhciBmY3QgPSBuZXcgRnVuY3Rpb24oJ2NvbnRleHQnLCAncmV0dXJuICcgKyBuZXdTb3VyY2UpO1xuICAvLyBvbmx5IG9uZSBuYW1lPyB0aGlzIGlzIGEgY2FuZGlkYXRlIGZvciBkYXRhIGJpbmRpbmdcbiAgaWYoaGFzTmFtZSAmJiBoYXNOYW1lLmxlbmd0aCA9PSAxICYmIHV0aWwudHJpbShzb3VyY2UpID09IGhhc05hbWVbMF0pIHtcbiAgICBmY3QuYmluZGluZyA9IGhhc05hbWVbMF07XG4gIH1cbiAgcmV0dXJuIGZjdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG5hbWVSZWc6bmFtZVJlZyxcbiAgY29tcGlsZVRleHRBbmRFeHByZXNzaW9uczpjb21waWxlVGV4dEFuZEV4cHJlc3Npb25zLFxuICBldmFsdWF0ZUV4cHJlc3Npb25MaXN0OmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QsXG4gIGpzRXhwcmVzc2lvbjpqc0V4cHJlc3Npb24sXG4gIHJlcGxhY2VOYW1lczpyZXBsYWNlTmFtZXMsXG4gIHJlcGxhY2VPdXRPZlN0cmluZ3M6cmVwbGFjZU91dE9mU3RyaW5ncyxcbiAgRVhQUkVTU0lPTl9SRUc6RVhQUkVTU0lPTl9SRUdcbn07IiwiLyogTGlrZWx5LmpzLFxuICAgUHl0aG9uIHN0eWxlIEhUTUwgdGVtcGxhdGUgbGFuZ3VhZ2Ugd2l0aCBiaS1kaXJlY3Rpb25uYWwgZGF0YSBiaW5kaW5nXG4gICBiYXRpc3RlIGJpZWxlciAyMDE0ICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpO1xudmFyIGV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKTtcblxuZnVuY3Rpb24gdXBkYXRlRGF0YShjb250ZXh0LCBkb20pIHtcbiAgdmFyIG5hbWUgPSBkb20uZ2V0QXR0cmlidXRlKFwibGstYmluZFwiKSwgdmFsdWU7XG4gIGlmKCFuYW1lKSB7XG4gICAgdGhyb3cgXCJObyBsay1iaW5kIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudFwiO1xuICB9XG4gIGlmKGRvbS50eXBlID09ICdjaGVja2JveCcgJiYgIWRvbS5jaGVja2VkKSB7XG4gICAgdmFsdWUgPSBcIlwiO1xuICB9IGVsc2Uge1xuICAgIHZhbHVlID0gZG9tLnZhbHVlOy8vIHx8IGRvbS5nZXRBdHRyaWJ1dGUoXCJ2YWx1ZVwiKTtcbiAgfVxuICAvLyB1cGRhdGUgdGhlIGNvbnRleHRcbiAgY29udGV4dC5tb2RpZnkobmFtZSwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBCaW5kaW5nKGRvbSwgdHBsLCBkYXRhKSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBCaW5kaW5nKSB7XG4gICAgcmV0dXJuIG5ldyBCaW5kaW5nKGRvbSwgdHBsLCBkYXRhKTtcbiAgfVxuICAvLyBkb3VibGUgZGF0YSBiaW5kaW5nIGJldHdlZW4gc29tZSBkYXRhIGFuZCBzb21lIGRvbVxuICB0aGlzLmRvbSA9IGRvbTtcbiAgaWYoZGF0YSA9PT0gdW5kZWZpbmVkICYmICEodHBsIGluc3RhbmNlb2YgdGVtcGxhdGUuTm9kZSkpIHtcbiAgICBkYXRhID0gdHBsO1xuICAgIHRwbCA9IHRlbXBsYXRlLmJ1aWxkVGVtcGxhdGUoZG9tLnRleHRDb250ZW50KTtcbiAgfVxuICB0aGlzLmRhdGEgPSBkYXRhO1xuICB0aGlzLnRlbXBsYXRlID0gdHBsO1xuICB0aGlzLmNvbnRleHQgPSBuZXcgdGVtcGxhdGUuQ29udGV4dCh0aGlzLmRhdGEpO1xuICB0aGlzLnNjaGVkdWxlZCA9IGZhbHNlO1xuICB0aGlzLmNhbGxiYWNrcyA9IFtdO1xufVxuXG5CaW5kaW5nLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRlbXBsYXRlLnRyZWUobmV3IHRlbXBsYXRlLkNvbnRleHQodGhpcy5kYXRhKSk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZG9tLmlubmVySFRNTCA9IFwiXCI7XG4gIHRoaXMuY3VycmVudFRyZWUgPSB0aGlzLnRyZWUoKTtcbiAgdGhpcy5jdXJyZW50VHJlZS5kb21UcmVlKHRoaXMuZG9tKTtcbiAgdGhpcy5iaW5kRXZlbnRzKCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kb21Jbml0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIGNyZWF0ZSBhbiBpbml0aWFsIHRyZWUgZnJvbSB0aGUgRE9NXG4gIHRoaXMuY3VycmVudFRyZWUgPSByZW5kZXIuaW5pdGlhbFJlbmRlckZyb21Eb20odGhpcy5kb20pO1xuICB0aGlzLmN1cnJlbnRUcmVlLm5vZGVOYW1lID0gdW5kZWZpbmVkO1xuICB0aGlzLmJpbmRFdmVudHMoKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5ld1RyZWUgPSB0aGlzLnRyZWUoKTtcbiAgdmFyIGRpZmYgPSB0aGlzLmN1cnJlbnRUcmVlLmRpZmYobmV3VHJlZSk7XG4gIHJlbmRlci5hcHBseURpZmYoZGlmZiwgdGhpcy5kb20pO1xuICB0aGlzLmN1cnJlbnRUcmVlID0gbmV3VHJlZTtcbiAgdGhpcy5sb2NrID0gZmFsc2U7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kYXRhRXZlbnQgPSBmdW5jdGlvbihlKSB7XG4gIHZhciBkb20gPSBlLnRhcmdldDtcbiAgdmFyIG5hbWUgPSBkb20uZ2V0QXR0cmlidXRlKCdsay1iaW5kJyk7XG4gIGlmKG5hbWUpIHtcbiAgICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuZ2V0UmVuZGVyTm9kZUZyb21QYXRoKGRvbSk7XG4gICAgaWYoIXRoaXMubG9jaykge1xuICAgICAgLy8gZG8gbm90IHVwZGF0ZSBkdXJpbmcgYSByZW5kZXJcbiAgICAgIHVwZGF0ZURhdGEocmVuZGVyTm9kZS5jb250ZXh0LCBkb20pO1xuICAgICAgdGhpcy5sb2NrID0gdHJ1ZTtcbiAgICAgIHRoaXMuZGlmZigpO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXIoJ2RhdGFWaWV3Q2hhbmdlZCcsIHtcIm5hbWVcIjogbmFtZX0pO1xuICB9XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5nZXRSZW5kZXJOb2RlRnJvbVBhdGggPSBmdW5jdGlvbihkb20pIHtcbiAgdmFyIHBhdGggPSBkb20uZ2V0QXR0cmlidXRlKCdsay1wYXRoJyk7XG4gIHZhciByZW5kZXJOb2RlID0gdGhpcy5jdXJyZW50VHJlZTtcbiAgdmFyIGJpdHMgPSBwYXRoLnNwbGl0KFwiLlwiKSwgaTtcbiAgZm9yKGk9MTsgaTxiaXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgcmVuZGVyTm9kZSA9IHJlbmRlck5vZGUuY2hpbGRyZW5bYml0c1tpXV07XG4gIH1cbiAgcmV0dXJuIHJlbmRlck5vZGU7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24obmFtZSwgb2JqKSB7XG4gIHRoaXMuZG9tLmRpc3BhdGNoRXZlbnQoXG4gICAgdXRpbC5ldmVudChuYW1lLCBvYmopXG4gICk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5hbnlFdmVudCA9IGZ1bmN0aW9uKGUpIHtcbiAgdmFyIGRvbSA9IGUudGFyZ2V0O1xuICB2YXIgbGtFdmVudCA9IGRvbS5nZXRBdHRyaWJ1dGUoJ2xrLScgKyBlLnR5cGUpO1xuICBpZighbGtFdmVudCkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuZ2V0UmVuZGVyTm9kZUZyb21QYXRoKGRvbSk7XG4gIHZhciBjdHggPSB0ZW1wbGF0ZS5Db250ZXh0KHtldmVudDogZX0sIHJlbmRlck5vZGUuY29udGV4dCk7XG4gIHJlbmRlck5vZGUubm9kZS5hdHRyc1snbGstJytlLnR5cGVdKGN0eCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5iaW5kRXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpO1xuICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24oZSl7IHRoaXMuZGF0YUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXsgdGhpcy5kYXRhRXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB2YXIgZXZlbnRzID0gXCJjbGljayxjaGFuZ2UsbW91c2VvdmVyLGZvY3Vzb3V0LGZvY3VzaW4sa2V5ZG93bixrZXl1cCxrZXlwcmVzcyxzdWJtaXRcIi5zcGxpdCgnLCcpO1xuICBmb3IoaT0wOyBpPGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBldmVudHNbaV0sXG4gICAgICBmdW5jdGlvbihlKXsgdGhpcy5hbnlFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIH1cbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIGlmKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gIH1cbiAgaWYodGhpcy5zY2hlZHVsZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG4gIGlmKCh0aGlzLmxhc3RVcGRhdGUgJiYgKG5vdyAtIHRoaXMubGFzdFVwZGF0ZSkgPCAyNSkgfHwgdGhpcy5sb2NrKSB7XG4gICAgdGhpcy5zY2hlZHVsZWQgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zY2hlZHVsZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8gYXZvaWQgMiBkaWZmcyBhdCB0aGUgc2FtZSB0aW1lXG4gIHRoaXMubG9jayA9IHRydWU7XG4gIHRoaXMubGFzdFVwZGF0ZSA9IG5vdztcbiAgdGhpcy5kaWZmKCk7XG4gIHRoaXMudHJpZ2dlcigndXBkYXRlJyk7XG4gIHdoaWxlKHRoaXMuY2FsbGJhY2tzLmxlbmd0aCkge1xuICAgIHRoaXMuY2FsbGJhY2tzLnBvcCgpKCk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBUZW1wbGF0ZTp0ZW1wbGF0ZS5idWlsZFRlbXBsYXRlLFxuICBDb250ZXh0TmFtZTp0ZW1wbGF0ZS5Db250ZXh0TmFtZSxcbiAgdXBkYXRlRGF0YTp1cGRhdGVEYXRhLFxuICBCaW5kaW5nOkJpbmRpbmcsXG4gIENvbXBvbmVudDp0ZW1wbGF0ZS5Db21wb25lbnQsXG4gIGdldERvbTpyZW5kZXIuZ2V0RG9tLFxuICBhcHBseURpZmY6cmVuZGVyLmFwcGx5RGlmZixcbiAgLy9kaWZmQ29zdDpyZW5kZXIuZGlmZkNvc3QsXG4gIGF0dHJpYnV0ZXNEaWZmOnJlbmRlci5hdHRyaWJ1dGVzRGlmZixcbiAgQ29udGV4dDp0ZW1wbGF0ZS5Db250ZXh0LFxuICBDb21waWxlRXJyb3I6dXRpbC5Db21waWxlRXJyb3IsXG4gIFJ1bnRpbWVFcnJvcjp1dGlsLlJ1bnRpbWVFcnJvcixcbiAgZXNjYXBlOnV0aWwuZXNjYXBlLFxuICBpbml0aWFsUmVuZGVyRnJvbURvbTpyZW5kZXIuaW5pdGlhbFJlbmRlckZyb21Eb20sXG4gIGV4cHJlc3Npb246ZXhwcmVzc2lvbixcbiAgcmVuZGVyOnJlbmRlcixcbiAgdGVtcGxhdGU6dGVtcGxhdGUsXG4gIHV0aWw6dXRpbCxcbiAgc2V0SGFuZGljYXA6ZnVuY3Rpb24obil7cmVuZGVyLmhhbmRpY2FwID0gbjt9XG59O1xuIiwiXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gUmVuZGVyZWROb2RlKG5vZGUsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKSB7XG4gIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgdGhpcy5ub2RlID0gbm9kZTtcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5yZW5kZXJlciA9IHJlbmRlcmVyO1xuICB0aGlzLnBhdGggPSBwYXRoIHx8IFwiXCI7XG4gIC8vIHNob3J0Y3V0XG4gIHRoaXMubm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lO1xufVxuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLnJlcHIgPSBmdW5jdGlvbihsZXZlbCkge1xuICB2YXIgc3RyID0gXCJcIiwgaTtcbiAgaWYobGV2ZWwgPT09IHVuZGVmaW5lZCkge1xuICAgIGxldmVsID0gMDtcbiAgfVxuICBmb3IoaT0wOyBpPGxldmVsOyBpKyspIHtcbiAgICBzdHIgKz0gXCIgIFwiO1xuICB9XG4gIHN0ciArPSBTdHJpbmcodGhpcy5ub2RlKSArIFwiIHBhdGggXCIgKyB0aGlzLnBhdGggKyBcIlxcclxcblwiO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBzdHIgKz0gdGhpcy5jaGlsZHJlbltpXS5yZXByKGxldmVsICsgMSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZG9tVHJlZSA9IGZ1bmN0aW9uKGFwcGVuZF90bykge1xuICB2YXIgbm9kZSA9IGFwcGVuZF90byB8fCB0aGlzLm5vZGUuZG9tTm9kZSh0aGlzLmNvbnRleHQsIHRoaXMucGF0aCksIGksIGNoaWxkX3RyZWU7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIGNoaWxkX3RyZWUgPSB0aGlzLmNoaWxkcmVuW2ldLmRvbVRyZWUoKTtcbiAgICBpZihub2RlLnB1c2gpIHtcbiAgICAgIG5vZGUucHVzaChjaGlsZF90cmVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZF90cmVlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRvbUh0bWwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGk7XG4gIC8vdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gIHZhciBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjaGlsZCA9IHRoaXMuY2hpbGRyZW5baV0uZG9tVHJlZSgpO1xuICAgIGQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICB9XG4gIHJldHVybiBkLmlubmVySFRNTDtcbn07XG5cbmZ1bmN0aW9uIGRpZmZDb3N0KGRpZmYpIHtcbiAgdmFyIHZhbHVlPTAsIGksIGo7XG4gIGZvcihpPTA7IGk8ZGlmZi5sZW5ndGg7IGkrKykge1xuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgIHZhbHVlICs9IDI7XG5cbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgdmFsdWUgKz0gMjtcbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgdmFsdWUgKz0gMTtcbiAgICB9XG4gICAgaWYoZGlmZltpXS5hY3Rpb24gPT0gXCJzdHJpbmdtdXRhdGVcIikge1xuICAgICAgdmFsdWUgKz0gMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLl9kaWZmID0gZnVuY3Rpb24ocmVuZGVyZWRfbm9kZSwgYWNjdSwgcGF0aCkge1xuICB2YXIgaSwgaiwgc291cmNlX3B0ID0gMDtcbiAgaWYocGF0aCA9PT0gdW5kZWZpbmVkKSB7IHBhdGggPSBcIlwiOyB9XG5cbiAgaWYoIXJlbmRlcmVkX25vZGUpIHtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgIG5vZGU6IHRoaXMsXG4gICAgICBwYXRoOiBwYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIGFjY3U7XG4gIH1cblxuICBpZihyZW5kZXJlZF9ub2RlLm5vZGVOYW1lICE9IHRoaXMubm9kZU5hbWUpIHtcblxuICAgIGFjY3UucHVzaCh7XG4gICAgICB0eXBlOiAnZGlmZmVyZW50X25vZGVOYW1lJyxcbiAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICBub2RlOiB0aGlzLFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIGFjY3UucHVzaCh7XG4gICAgICB0eXBlOiAnZGlmZmVyZW50X25vZGVOYW1lJyxcbiAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICBub2RlOiByZW5kZXJlZF9ub2RlLFxuICAgICAgLy8gd2hlbiBhIG5vZGUgaXMgYWRkZWQsIHdlIHBvaW50IHRvIHRoZSBuZXh0IG5vZGUgYXMgaW5zZXJ0QmVmb3JlIGlzIHVzZWRcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfVxuXG4gIC8vIENvdWxkIHVzZSBpbmhlcml0YW5jZSBmb3IgdGhpc1xuICBpZih0aGlzLm5vZGVOYW1lID09IFwiI3RleHRcIiAmJiB0aGlzLnJlbmRlcmVyICE9IHJlbmRlcmVkX25vZGUucmVuZGVyZXIpIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIGFjdGlvbjogJ3N0cmluZ211dGF0ZScsXG4gICAgICAgIG5vZGU6IHRoaXMsXG4gICAgICAgIHZhbHVlOiByZW5kZXJlZF9ub2RlLnJlbmRlcmVyLFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYV9kaWZmID0gYXR0cmlidXRlc0RpZmYodGhpcy5hdHRycywgcmVuZGVyZWRfbm9kZS5hdHRycyk7XG4gICAgaWYoYV9kaWZmLmxlbmd0aCkge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAnbXV0YXRlJyxcbiAgICAgICAgbm9kZTogdGhpcyxcbiAgICAgICAgYXR0cmlidXRlc0RpZmY6IGFfZGlmZixcbiAgICAgICAgcGF0aDogcGF0aFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGwxID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7XG4gIHZhciBsMiA9IHJlbmRlcmVkX25vZGUuY2hpbGRyZW4ubGVuZ3RoO1xuXG4gIC8vIG5vIHN3YXAgcG9zc2libGUsIGJ1dCBkZWxldGluZyBhIG5vZGUgaXMgcG9zc2libGVcbiAgaiA9IDA7IGkgPSAwOyBzb3VyY2VfcHQgPSAwO1xuICAvLyBsZXQncyBnb3QgdHJvdWdoIGFsbCB0aGUgY2hpbGRyZW5cbiAgZm9yKDsgaTxsMTsgaSsrKSB7XG4gICAgdmFyIGRpZmYgPSAwLCBhZnRlcl9zb3VyY2VfZGlmZiA9IDAsIGFmdGVyX3RhcmdldF9kaWZmID0gMCwgYWZ0ZXJfc291cmNlX2Nvc3Q9bnVsbCwgYWZ0ZXJfdGFyZ2V0X2Nvc3Q9bnVsbDtcbiAgICB2YXIgYWZ0ZXJfdGFyZ2V0ID0gcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqKzFdO1xuICAgIHZhciBhZnRlcl9zb3VyY2UgPSB0aGlzLmNoaWxkcmVuW2krMV07XG5cbiAgICBpZighcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSkge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgICAgbm9kZTogdGhpcy5jaGlsZHJlbltpXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIHNvdXJjZV9wdFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBkaWZmID0gdGhpcy5jaGlsZHJlbltpXS5fZGlmZihyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG5cbiAgICB2YXIgY29zdCA9IGRpZmZDb3N0KGRpZmYpO1xuICAgIC8vIGRvZXMgdGhlIG5leHQgc291cmNlIG9uZSBmaXRzIGJldHRlcj9cbiAgICBpZihhZnRlcl9zb3VyY2UpIHtcbiAgICAgIGFmdGVyX3NvdXJjZV9kaWZmID0gYWZ0ZXJfc291cmNlLl9kaWZmKHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcbiAgICAgIC8vIG5lZWRzIHNvbWUgaGFuZGljYXAgb3RoZXJ3aXNlIGlucHV0cyBjb250YWluaW5nIHRoZSBjdXJyZW50IGZvY3VzXG4gICAgICAvLyBtaWdodCBiZSByZW1vdmVkXG4gICAgICBhZnRlcl9zb3VyY2VfY29zdCA9IGRpZmZDb3N0KGFmdGVyX3NvdXJjZV9kaWZmKSArIG1vZHVsZS5leHBvcnRzLmhhbmRpY2FwO1xuICAgIH1cbiAgICAvLyBkb2VzIHRoZSBuZXh0IHRhcmdldCBvbmUgZml0cyBiZXR0ZXI/XG4gICAgaWYoYWZ0ZXJfdGFyZ2V0KSB7XG4gICAgICBhZnRlcl90YXJnZXRfZGlmZiA9IHRoaXMuY2hpbGRyZW5baV0uX2RpZmYoYWZ0ZXJfdGFyZ2V0LCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG4gICAgICBhZnRlcl90YXJnZXRfY29zdCA9IGRpZmZDb3N0KGFmdGVyX3RhcmdldF9kaWZmKSArIG1vZHVsZS5leHBvcnRzLmhhbmRpY2FwO1xuICAgIH1cblxuICAgIGlmKCghYWZ0ZXJfdGFyZ2V0IHx8IGNvc3QgPD0gYWZ0ZXJfdGFyZ2V0X2Nvc3QpICYmICghYWZ0ZXJfc291cmNlIHx8IGNvc3QgPD0gYWZ0ZXJfc291cmNlX2Nvc3QpKSB7XG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoZGlmZik7XG4gICAgICBzb3VyY2VfcHQgKz0gMTtcbiAgICB9IGVsc2UgaWYoYWZ0ZXJfc291cmNlICYmICghYWZ0ZXJfdGFyZ2V0IHx8IGFmdGVyX3NvdXJjZV9jb3N0IDw9IGFmdGVyX3RhcmdldF9jb3N0KSkge1xuICAgICAgZGVidWdnZXJcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhZnRlcl9zb3VyY2UnLFxuICAgICAgICBjb3N0OiBhZnRlcl9zb3VyY2VfY29zdCxcbiAgICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgICAgbm9kZTogdGhpcy5jaGlsZHJlbltpXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIHNvdXJjZV9wdFxuICAgICAgfSk7XG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoYWZ0ZXJfc291cmNlX2RpZmYpO1xuICAgICAgc291cmNlX3B0ICs9IDE7XG4gICAgICBpKys7XG4gICAgfSBlbHNlIGlmKGFmdGVyX3RhcmdldCkge1xuICAgICAgLy8gaW1wb3J0YW50IHRvIGFkZCB0aGUgZGlmZiBiZWZvcmVcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChhZnRlcl90YXJnZXRfZGlmZik7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICB0eXBlOiAnYWZ0ZXJfdGFyZ2V0JyxcbiAgICAgICAgY29zdDogYWZ0ZXJfdGFyZ2V0X2Nvc3QsXG4gICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyAoc291cmNlX3B0KVxuICAgICAgfSk7XG4gICAgICBzb3VyY2VfcHQgKz0gMjtcbiAgICAgIGorKztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgXCJTaG91bGQgbmV2ZXIgaGFwcGVuXCI7XG4gICAgfVxuICAgIGorKztcbiAgfVxuXG4gIC8vIG5ldyBub2RlcyB0byBiZSBhZGRlZCBhZnRlciB0aGUgZGlmZlxuICBmb3IoaT0wOyBpPChsMi1qKTsgaSsrKSB7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIHR5cGU6ICduZXdfbm9kZScsXG4gICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqK2ldLFxuICAgICAgLy8gd2hlbiBhIG5vZGUgaXMgYWRkZWQsIHdlIHBvaW50IHRvIHRoZSBuZXh0IG5vZGUgYXMgaW5zZXJ0QmVmb3JlIGlzIHVzZWRcbiAgICAgIHBhdGg6IHBhdGggKyAnLicgKyAoc291cmNlX3B0ICsgMSlcbiAgICB9KTtcbiAgICBzb3VyY2VfcHQgKz0gMTtcbiAgfVxuXG4gIHJldHVybiBhY2N1O1xuXG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbihyZW5kZXJlZF9ub2RlKSB7XG4gIHZhciBhY2N1ID0gW107XG4gIHJldHVybiB0aGlzLl9kaWZmKHJlbmRlcmVkX25vZGUsIGFjY3UpO1xufTtcblxuZnVuY3Rpb24gYXR0cmlidXRlc0RpZmYoYSwgYikge1xuICB2YXIgY2hhbmdlcyA9IFtdLCBrZXk7XG4gIGZvcihrZXkgaW4gYSkge1xuICAgICAgaWYoYltrZXldID09PSBmYWxzZSkge1xuICAgICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcInJlbW92ZVwiLCBrZXk6a2V5fSk7XG4gICAgICB9IGVsc2UgaWYoYltrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYoYltrZXldICE9IGFba2V5XSkge1xuICAgICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwibXV0YXRlXCIsIGtleTprZXksIHZhbHVlOmJba2V5XX0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcInJlbW92ZVwiLCBrZXk6a2V5fSk7XG4gICAgICB9XG4gIH1cbiAgZm9yKGtleSBpbiBiKSB7XG4gICAgaWYoYVtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwiYWRkXCIsIGtleTprZXksIHZhbHVlOmJba2V5XX0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY2hhbmdlcztcbn1cblxuZnVuY3Rpb24gZ2V0RG9tKGRvbSwgcGF0aCwgc3RvcCkge1xuICB2YXIgaSwgcD1wYXRoLnNwbGl0KCcuJyksIGNoaWxkPWRvbTtcbiAgaWYoc3RvcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RvcCA9IDA7XG4gIH1cbiAgdmFyIGJvdW5kYXJ5PXAubGVuZ3RoIC0gc3RvcDtcbiAgZm9yKGk9MTsgaTxib3VuZGFyeTsgaSsrKSB7XG4gICAgY2hpbGQgPSBjaGlsZC5jaGlsZE5vZGVzW3BbaV0gfCAwXTtcbiAgfVxuICByZXR1cm4gY2hpbGQ7XG59XG5cbmZ1bmN0aW9uIGFwcGx5RGlmZihkaWZmLCBkb20pIHtcbiAgdmFyIGksIGosIF9kaWZmLCBfZG9tLCBwYXJlbnQ7XG4gIGZvcihpPTA7IGk8ZGlmZi5sZW5ndGg7IGkrKykge1xuICAgIF9kaWZmID0gZGlmZltpXTtcbiAgICBfZG9tID0gZ2V0RG9tKGRvbSwgX2RpZmYucGF0aCk7XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgIF9kb20ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChfZG9tKTtcbiAgICB9XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwiYWRkXCIpIHtcbiAgICAgIHZhciBuZXdOb2RlID0gX2RpZmYubm9kZS5kb21UcmVlKCk7XG4gICAgICBpZihfZG9tKSB7XG4gICAgICAgIF9kb20ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobmV3Tm9kZSwgX2RvbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBnZXQgdGhlIHBhcmVudFxuICAgICAgICBwYXJlbnQgPSBnZXREb20oZG9tLCBfZGlmZi5wYXRoLCAxKTtcbiAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKG5ld05vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgZm9yKGo9MDsgajxfZGlmZi5hdHRyaWJ1dGVzRGlmZi5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgYV9kaWZmID0gX2RpZmYuYXR0cmlidXRlc0RpZmZbal07XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJtdXRhdGVcIikge1xuICAgICAgICAgIC8vIGltcG9ydGFudCBmb3Igc2VsZWN0XG4gICAgICAgICAgaWYoXCJ2YWx1ZSxzZWxlY3RlZCxjaGVja2VkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgaWYoX2RvbVthX2RpZmYua2V5XSAhPSBhX2RpZmYudmFsdWUpIHtcbiAgICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGFfZGlmZi52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5zZXRBdHRyaWJ1dGUoYV9kaWZmLmtleSwgYV9kaWZmLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZihhX2RpZmYuYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgICAgICBpZihcImNoZWNrZWQsc2VsZWN0ZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9kb20ucmVtb3ZlQXR0cmlidXRlKGFfZGlmZi5rZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgICAgIGlmKFwiY2hlY2tlZCxzZWxlY3RlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBhX2RpZmYudmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9kb20uc2V0QXR0cmlidXRlKGFfZGlmZi5rZXksIGFfZGlmZi52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYoX2RpZmYuYWN0aW9uID09IFwic3RyaW5nbXV0YXRlXCIpIHtcbiAgICAgIF9kb20ubm9kZVZhbHVlID0gX2RpZmYudmFsdWU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxSZW5kZXJGcm9tRG9tKGRvbSwgcGF0aCkge1xuICBwYXRoID0gcGF0aCB8fCBcIlwiO1xuICB2YXIgaSwgY2hpbGQsIGNoaWxkcmVuID0gW10sIGF0dHJzID0ge30sIHJlbmRlcmVyID0gJyc7XG4gIGlmKGRvbS5hdHRyaWJ1dGVzKSB7XG4gICAgZm9yKGk9MDsgaSA8IGRvbS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgYXR0ciA9IGRvbS5hdHRyaWJ1dGVzW2ldO1xuICAgICAgYXR0cnNbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWU7XG4gICAgfVxuICB9XG4gIGlmKGRvbS5jaGlsZE5vZGVzKSB7XG4gICAgZm9yKGk9MDsgaSA8IGRvbS5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGlsZCA9IGRvbS5jaGlsZE5vZGVzW2ldO1xuICAgICAgY2hpbGRyZW4ucHVzaChpbml0aWFsUmVuZGVyRnJvbURvbShjaGlsZCwgcGF0aCArICcuJyArIGkpKTtcbiAgICB9XG4gIH1cbiAgaWYoZG9tLnRleHRDb250ZW50KSB7XG4gICAgcmVuZGVyZXIgPSBkb20udGV4dENvbnRlbnQ7XG4gIH1cbiAgdmFyIHJuID0gbmV3IFJlbmRlcmVkTm9kZShcbiAgICB7bm9kZU5hbWU6IGRvbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpLCBub2RlOmRvbX0sXG4gICAgdW5kZWZpbmVkLFxuICAgIHJlbmRlcmVyLFxuICAgIHBhdGgpO1xuICBybi5hdHRycyA9IGF0dHJzO1xuICBybi5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICByZXR1cm4gcm47XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBSZW5kZXJlZE5vZGU6UmVuZGVyZWROb2RlLFxuICBpbml0aWFsUmVuZGVyRnJvbURvbTppbml0aWFsUmVuZGVyRnJvbURvbSxcbiAgYXBwbHlEaWZmOmFwcGx5RGlmZixcbiAgYXR0cmlidXRlc0RpZmY6YXR0cmlidXRlc0RpZmYsXG4gIGRpZmZDb3N0OmRpZmZDb3N0LFxuICBnZXREb206Z2V0RG9tLFxuICBoYW5kaWNhcDoxXG59OyIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJyk7XG52YXIgZXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vZXhwcmVzc2lvbicpO1xuXG52YXIgdGVtcGxhdGVDYWNoZSA9IHt9O1xudmFyIGNvbXBvbmVudENhY2hlID0ge307XG4vLyBhIG5hbWUgaGVyZSBpcyBhbHNvIGFueSB2YWxpZCBKUyBvYmplY3QgcHJvcGVydHlcbnZhciBWQVJOQU1FX1JFRyA9IC9eW2EtekEtWl8kXVswLTlhLXpBLVpfJF0qLztcbnZhciBIVE1MX0FUVFJfUkVHID0gL15bQS1aYS16XVtcXHctXXswLH0vO1xudmFyIERPVUJMRV9RVU9URURfU1RSSU5HX1JFRyA9IC9eXCIoXFxcXFwifFteXCJdKSpcIi87XG5cbmZ1bmN0aW9uIENvbXBvbmVudChuYW1lLCB0cGwsIGNvbnRyb2xsZXIpIHtcbiAgaWYgKHRoaXMuY29uc3RydWN0b3IgIT09IENvbXBvbmVudCkge1xuICAgIHJldHVybiBuZXcgQ29tcG9uZW50KG5hbWUsIHRwbCwgY29udHJvbGxlcik7XG4gIH1cbiAgaWYoY29tcG9uZW50Q2FjaGVbbmFtZV0pIHtcbiAgICB1dGlsLkNvbXBpbGVFcnJvcihcIkNvbXBvbmVudCB3aXRoIG5hbWUgXCIgKyBuYW1lICsgXCIgYWxyZWFkeSBleGlzdFwiKTtcbiAgfVxuICBjb21wb25lbnRDYWNoZVtuYW1lXSA9IHRoaXM7XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIHRoaXMudGVtcGxhdGUgPSBidWlsZFRlbXBsYXRlKHRwbCk7XG4gIHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG59XG5cbmZ1bmN0aW9uIENvbnRleHROYW1lKG5hbWUpIHtcbiAgdGhpcy5iaXRzID0gbmFtZS5zcGxpdCgnLicpO1xufVxuXG5Db250ZXh0TmFtZS5wcm90b3R5cGUuc3Vic3RpdHV0ZUFsaWFzID0gZnVuY3Rpb24oY29udGV4dCkge1xuICBpZihjb250ZXh0LmFsaWFzZXMuaGFzT3duUHJvcGVydHkodGhpcy5iaXRzWzBdKSkge1xuICAgIHZhciBuZXdCaXRzID0gY29udGV4dC5hbGlhc2VzW3RoaXMuYml0c1swXV0uc3BsaXQoJy4nKTtcbiAgICB0aGlzLmJpdHMuc2hpZnQoKTtcbiAgICB0aGlzLmJpdHMgPSBuZXdCaXRzLmNvbmNhdCh0aGlzLmJpdHMpO1xuICB9XG59O1xuXG5Db250ZXh0TmFtZS5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYml0c1swXTtcbn07XG5cbkNvbnRleHROYW1lLnByb3RvdHlwZS5zdHIgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYml0cy5qb2luKCcuJyk7XG59O1xuXG5mdW5jdGlvbiBDb250ZXh0KGRhdGEsIHBhcmVudCkge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQ29udGV4dCkge1xuICAgIHJldHVybiBuZXcgQ29udGV4dChkYXRhLCBwYXJlbnQpO1xuICB9XG4gIHRoaXMuZGF0YSA9IGRhdGE7XG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB0aGlzLmFsaWFzZXMgPSB7fTtcbiAgdGhpcy53YXRjaGluZyA9IHt9O1xufVxuXG5Db250ZXh0LnByb3RvdHlwZS5hZGRBbGlhcyA9IGZ1bmN0aW9uKHNvdXJjZU5hbWUsIGFsaWFzTmFtZSkge1xuICAvLyBzb3VyY2UgbmFtZSBjYW4gYmUgJ25hbWUnIG9yICdsaXN0LmtleSdcbiAgaWYoc291cmNlTmFtZSA9PT0gYWxpYXNOYW1lKSB7XG4gICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiQWxpYXMgd2l0aCB0aGUgbmFtZSBcIiArIGFsaWFzTmFtZSArIFwiIGFscmVhZHkgcHJlc2VudCBpbiB0aGlzIGNvbnRleHQuXCIpO1xuICB9XG4gIHRoaXMuYWxpYXNlc1thbGlhc05hbWVdID0gc291cmNlTmFtZTtcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLnJlc29sdmVOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAvLyBnaXZlbiBhIG5hbWUsIHJldHVybiB0aGUgW0NvbnRleHQsIHJlc29sdmVkIHBhdGgsIHZhbHVlXSB3aGVuXG4gIC8vIHRoaXMgbmFtZSBpcyBmb3VuZCBvciB1bmRlZmluZWQgb3RoZXJ3aXNlXG4gIG5hbWUuc3Vic3RpdHV0ZUFsaWFzKHRoaXMpO1xuXG4gIGlmKHRoaXMuZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lLnN0YXJ0KCkpKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5kYXRhW25hbWUuc3RhcnQoKV07XG4gICAgdmFyIGkgPSAxO1xuICAgIHdoaWxlKGkgPCBuYW1lLmJpdHMubGVuZ3RoKSB7XG4gICAgICBpZighdmFsdWUuaGFzT3duUHJvcGVydHkobmFtZS5iaXRzW2ldKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSB2YWx1ZVtuYW1lLmJpdHNbaV1dO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICByZXR1cm4gW3RoaXMsIG5hbWUuc3RyKCksIHZhbHVlXTtcbiAgfVxuXG4gIGlmKHRoaXMucGFyZW50KSB7XG4gICAgcmV0dXJuIHRoaXMucGFyZW50LnJlc29sdmVOYW1lKG5hbWUpO1xuICB9XG5cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmdldE5hbWVQYXRoID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVOYW1lKG5ldyBDb250ZXh0TmFtZShuYW1lKSk7XG4gIGlmKHJlc29sdmVkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVkWzFdO1xuICB9XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gIHRoaXMud2F0Y2hpbmdbbmFtZV0gPSBjYWxsYmFjaztcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHJlc29sdmVkID0gdGhpcy5yZXNvbHZlTmFtZShuZXcgQ29udGV4dE5hbWUobmFtZSkpO1xuICBpZihyZXNvbHZlZCkge1xuICAgIHJldHVybiByZXNvbHZlZFsyXTtcbiAgfVxufTtcblxuQ29udGV4dC5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdGhpcy5fbW9kaWZ5KG5ldyBDb250ZXh0TmFtZShuYW1lKSwgdmFsdWUpO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUuX21vZGlmeSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG5cbiAgaWYodGhpcy53YXRjaGluZy5oYXNPd25Qcm9wZXJ0eShuYW1lLnN0cigpKSkge1xuICAgIHRoaXMud2F0Y2hpbmdbbmFtZS5zdHIoKV0odmFsdWUpO1xuICB9XG5cbiAgbmFtZS5zdWJzdGl0dXRlQWxpYXModGhpcyk7XG5cbiAgLy8gd2UgZ28gaW4gZm9yIGEgc2VhcmNoIGlmIHRoZSBmaXJzdCBwYXJ0IG1hdGNoZXNcbiAgaWYodGhpcy5kYXRhLmhhc093blByb3BlcnR5KG5hbWUuc3RhcnQoKSkpIHtcbiAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICB2YXIgaSA9IDA7XG4gICAgd2hpbGUoaSA8IG5hbWUuYml0cy5sZW5ndGggLSAxKSB7XG4gICAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lLmJpdHNbaV0pKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBkYXRhID0gZGF0YVtuYW1lLmJpdHNbaV1dO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICBkYXRhW25hbWUuYml0c1tpXV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICAvLyBkYXRhIG5vdCBmb3VuZCwgbGV0J3Mgc2VhcmNoIGluIHRoZSBwYXJlbnRcbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuX21vZGlmeShuYW1lLCB2YWx1ZSk7XG4gIH1cblxufTtcblxuQ29udGV4dC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdGhpcy5kYXRhW25hbWVdID0gdmFsdWU7XG59O1xuXG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZXModiwgbm9kZSkge1xuICB2YXIgYXR0cnMgPSB7fSwgbiwgcztcbiAgd2hpbGUodikge1xuICAgICAgdiA9IHV0aWwudHJpbSh2KTtcbiAgICAgIG4gPSB2Lm1hdGNoKEhUTUxfQVRUUl9SRUcpO1xuICAgICAgaWYoIW4pIHtcbiAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIGF0dHJpYnV0ZSBuYW1lIGZvdW5kIGluIFwiK3YpO1xuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKG5bMF0ubGVuZ3RoKTtcbiAgICAgIG4gPSBuWzBdO1xuICAgICAgaWYodlswXSAhPSBcIj1cIikge1xuICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gZXF1YWwgc2lnbiBhZnRlciBuYW1lIFwiK24pO1xuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKDEpO1xuICAgICAgcyA9IHYubWF0Y2goRE9VQkxFX1FVT1RFRF9TVFJJTkdfUkVHKTtcbiAgICAgIGlmKHMpIHtcbiAgICAgICAgYXR0cnNbbl0gPSBuZXcgU3RyaW5nTm9kZShudWxsLCBzWzBdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMgPSB2Lm1hdGNoKGV4cHJlc3Npb24uRVhQUkVTU0lPTl9SRUcpO1xuICAgICAgICBpZihzID09PSBudWxsKSB7XG4gICAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIHN0cmluZyBvciBleHByZXNzaW9uIGZvdW5kIGFmdGVyIG5hbWUgXCIrbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGV4cHIgPSBleHByZXNzaW9uLmpzRXhwcmVzc2lvbihzWzFdKTtcbiAgICAgICAgICBhdHRyc1tuXSA9IGV4cHI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHYgPSB2LnN1YnN0cihzWzBdLmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGF0dHJzO1xufVxuXG4vLyBhbGwgdGhlIGF2YWlsYWJsZSB0ZW1wbGF0ZSBub2RlXG5cbmZ1bmN0aW9uIE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICB0aGlzLmxpbmUgPSBsaW5lO1xuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5jb250ZW50ID0gY29udGVudDtcbiAgdGhpcy5sZXZlbCA9IGxldmVsO1xuICB0aGlzLmNoaWxkcmVuID0gW107XG59XG5cbk5vZGUucHJvdG90eXBlLnJlcHIgPSBmdW5jdGlvbihsZXZlbCkge1xuICB2YXIgc3RyID0gXCJcIiwgaTtcbiAgaWYobGV2ZWwgPT09IHVuZGVmaW5lZCkge1xuICAgIGxldmVsID0gMDtcbiAgfVxuICBmb3IoaT0wOyBpPGxldmVsOyBpKyspIHtcbiAgICBzdHIgKz0gXCIgIFwiO1xuICB9XG4gIHN0ciArPSBTdHJpbmcodGhpcykgKyBcIlxcclxcblwiO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBzdHIgKz0gdGhpcy5jaGlsZHJlbltpXS5yZXByKGxldmVsICsgMSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgaWYocGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcGF0aCA9ICcnO1xuICAgIHBvcyA9IDA7XG4gICAgdGhpcy5pc1Jvb3QgPSB0cnVlO1xuICB9XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgJycsIHBhdGgpO1xuICB0LmNoaWxkcmVuID0gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5jZXJyb3IgPSBmdW5jdGlvbihtc2cpIHtcbiAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKHRoaXMudG9TdHJpbmcoKSArIFwiOiBcIiArIG1zZyk7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5kb21Ob2RlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbXTtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRyZWVDaGlsZHJlbiA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgdCA9IFtdLCBpLCBwLCBqLCBjaGlsZHJlbiA9IG51bGwsIGNoaWxkID0gbnVsbDtcbiAgaiA9IHBvcztcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgcCA9IHBhdGg7XG4gICAgY2hpbGQgPSB0aGlzLmNoaWxkcmVuW2ldO1xuICAgIGlmKGNoaWxkLmhhc093blByb3BlcnR5KCdub2RlTmFtZScpKSB7XG4gICAgICBwICs9ICcuJyArIGo7XG4gICAgICBqKys7XG4gICAgICBjaGlsZHJlbiA9IGNoaWxkLnRyZWUoY29udGV4dCwgcCwgMCk7XG4gICAgICB0LnB1c2goY2hpbGRyZW4pO1xuICAgIH0gZWxzZSBpZiAoIWNoaWxkLnJlbmRlckV4bGN1ZGVkKSB7XG4gICAgICBjaGlsZHJlbiA9IGNoaWxkLnRyZWUoY29udGV4dCwgcCwgaik7XG4gICAgICBpZihjaGlsZHJlbikge1xuICAgICAgICB0ID0gdC5jb25jYXQoY2hpbGRyZW4pO1xuICAgICAgICBqICs9IGNoaWxkcmVuLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHQ7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5hZGRDaGlsZCA9IGZ1bmN0aW9uKGNoaWxkKSB7XG4gIHRoaXMuY2hpbGRyZW4ucHVzaChjaGlsZCk7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICsgXCIoXCIrdGhpcy5jb250ZW50LnJlcGxhY2UoXCJcXG5cIiwgXCJcIikrXCIpIGF0IGxpbmUgXCIgKyB0aGlzLmxpbmU7XG59O1xuXG5mdW5jdGlvbiBDb21tZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgcGFyZW50LmNoaWxkcmVuLnB1c2godGhpcyk7XG4gIHRoaXMucmVuZGVyRXhsY3VkZWQgPSB0cnVlO1xufVxudXRpbC5pbmhlcml0cyhDb21tZW50Tm9kZSwgTm9kZSk7XG5cbmZ1bmN0aW9uIEh0bWxOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gdGhpcy5jb250ZW50LnNwbGl0KFwiIFwiKVswXTtcbiAgdGhpcy5hdHRycyA9IHBhcnNlQXR0cmlidXRlcyh0aGlzLmNvbnRlbnQuc3Vic3RyKHRoaXMubm9kZU5hbWUubGVuZ3RoKSwgdGhpcyk7XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSHRtbE5vZGUsIE5vZGUpO1xuXG5IdG1sTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsIHRoaXMubm9kZU5hbWUsIHBhdGgpO1xuICB0LmF0dHJzID0gdGhpcy5yZW5kZXJBdHRyaWJ1dGVzKGNvbnRleHQsIHBhdGgpO1xuICB0LmNoaWxkcmVuID0gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5mdW5jdGlvbiBiaW5kaW5nTmFtZShub2RlKSB7XG4gIGlmKG5vZGUuYmluZGluZykge1xuICAgIHJldHVybiBub2RlLmJpbmRpbmc7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXZhbHVhdGUoaXRlbSwgY29udGV4dCkge1xuICBpZih0eXBlb2YgaXRlbSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByZXR1cm4gaXRlbShjb250ZXh0KTtcbiAgfVxuICBpZihpdGVtLmV2YWx1YXRlKSB7XG4gICAgICByZXR1cm4gaXRlbS5ldmFsdWF0ZShjb250ZXh0KTtcbiAgfVxuICByZXR1cm4gaXRlbTtcbn1cblxuSHRtbE5vZGUucHJvdG90eXBlLnJlbmRlckF0dHJpYnV0ZXMgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIHZhciByX2F0dHJzID0ge30sIGtleSwgYXR0ciwgbmFtZTtcbiAgZm9yKGtleSBpbiB0aGlzLmF0dHJzKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnNba2V5XTtcbiAgICAvLyB0b2RvLCBmaW5kIGEgYmV0dGVyIHdheSB0byBkaXNjcmltaW5hdGUgZXZlbnRzXG4gICAgaWYoa2V5LmluZGV4T2YoXCJsay1cIikgPT09IDApIHtcbiAgICAgIC8vIGFkZCB0aGUgcGF0aCB0byB0aGUgcmVuZGVyIG5vZGUgdG8gYW55IGxrLXRoaW5nIG5vZGVcbiAgICAgIHJfYXR0cnNbJ2xrLXBhdGgnXSA9IHBhdGg7XG4gICAgICBpZihrZXkgPT09ICdsay1iaW5kJykge1xuICAgICAgICByX2F0dHJzW2tleV0gPSBldmFsdWF0ZShhdHRyLCBjb250ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJfYXR0cnNba2V5XSA9IFwidHJ1ZVwiO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFyIHYgPSBldmFsdWF0ZShhdHRyLCBjb250ZXh0KTtcblxuICAgIGlmKHYgPT09IGZhbHNlKSB7XG4gICAgICAvLyBub3RoaW5nXG4gICAgfSBlbHNlIHtcbiAgICAgIHJfYXR0cnNba2V5XSA9IHY7XG4gICAgfVxuICB9XG5cbiAgaWYoXCJpbnB1dCxzZWxlY3QsdGV4dGFyZWFcIi5pbmRleE9mKHRoaXMubm9kZU5hbWUpICE9IC0xICYmIHRoaXMuYXR0cnMuaGFzT3duUHJvcGVydHkoJ3ZhbHVlJykpIHtcbiAgICBhdHRyID0gdGhpcy5hdHRycy52YWx1ZTtcbiAgICBuYW1lID0gYmluZGluZ05hbWUoYXR0cik7XG4gICAgaWYobmFtZSAmJiB0aGlzLmF0dHJzWydsay1iaW5kJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcl9hdHRyc1snbGstYmluZCddID0gbmFtZTtcbiAgICAgIHJfYXR0cnNbJ2xrLXBhdGgnXSA9IHBhdGg7XG4gICAgfVxuICB9XG4gIGlmKHRoaXMubm9kZU5hbWUgPT0gXCJ0ZXh0YXJlYVwiICYmIHRoaXMuY2hpbGRyZW4ubGVuZ3RoID09IDEgJiYgdGhpcy5jaGlsZHJlblswXS5leHByZXNzaW9uKSB7XG4gICAgbmFtZSA9IGJpbmRpbmdOYW1lKHRoaXMuY2hpbGRyZW5bMF0uZXhwcmVzc2lvbik7XG4gICAgaWYobmFtZSAmJiB0aGlzLmF0dHJzWydsay1iaW5kJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcl9hdHRyc1snbGstYmluZCddID0gbmFtZTtcbiAgICAgIHJfYXR0cnNbJ2xrLXBhdGgnXSA9IHBhdGg7XG4gICAgICAvLyBhcyBzb29uIGFzIHRoZSB1c2VyIGhhcyBhbHRlcmVkIHRoZSB2YWx1ZSBvZiB0aGUgdGV4dGFyZWEgb3Igc2NyaXB0IGhhcyBhbHRlcmVkXG4gICAgICAvLyB0aGUgdmFsdWUgcHJvcGVydHkgb2YgdGhlIHRleHRhcmVhLCB0aGUgdGV4dCBub2RlIGlzIG91dCBvZiB0aGUgcGljdHVyZSBhbmQgaXMgbm9cbiAgICAgIC8vIGxvbmdlciBib3VuZCB0byB0aGUgdGV4dGFyZWEncyB2YWx1ZSBpbiBhbnkgd2F5LlxuICAgICAgcl9hdHRycy52YWx1ZSA9IHRoaXMuY2hpbGRyZW5bMF0uZXhwcmVzc2lvbihjb250ZXh0KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJfYXR0cnM7XG59O1xuXG5IdG1sTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRoaXMubm9kZU5hbWUpLCBrZXksIGF0dHJzPXRoaXMucmVuZGVyQXR0cmlidXRlcyhjb250ZXh0LCBwYXRoKTtcbiAgZm9yKGtleSBpbiBhdHRycykge1xuICAgIG5vZGUuc2V0QXR0cmlidXRlKGtleSwgYXR0cnNba2V5XSk7XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59O1xuXG5mdW5jdGlvbiBGb3JOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgLy8gc3ludGF4OiBmb3Iga2V5LCB2YWx1ZSBpbiBsaXN0XG4gIC8vICAgICAgICAgZm9yIHZhbHVlIGluIGxpc3RcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB2YXIgdmFyMSwgdmFyMiwgc291cmNlTmFtZTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cig0KSk7XG4gIHZhcjEgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgaWYoIXZhcjEpIHtcbiAgICB0aGlzLmNlcnJvcihcImZpcnN0IHZhcmlhYmxlIG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHZhcjFbMF0ubGVuZ3RoKSk7XG4gIGlmKGNvbnRlbnRbMF0gPT0gJywnKSB7XG4gICAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cigxKSk7XG4gICAgdmFyMiA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICAgIGlmKCF2YXIyKSB7XG4gICAgICB0aGlzLmNlcnJvcihcInNlY29uZCB2YXJpYWJsZSBhZnRlciBjb21tYSBpcyBtaXNzaW5nXCIpO1xuICAgIH1cbiAgICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKHZhcjJbMF0ubGVuZ3RoKSk7XG4gIH1cbiAgaWYoIWNvbnRlbnQubWF0Y2goL15pbi8pKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJpbiBrZXl3b3JkIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cigyKSk7XG4gIHNvdXJjZU5hbWUgPSBjb250ZW50Lm1hdGNoKGV4cHJlc3Npb24ubmFtZVJlZyk7XG4gIGlmKCFzb3VyY2VOYW1lKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJpdGVyYWJsZSBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgdGhpcy5zb3VyY2VOYW1lID0gc291cmNlTmFtZVswXTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cihzb3VyY2VOYW1lWzBdLmxlbmd0aCkpO1xuICBpZihjb250ZW50ICE9PSBcIlwiKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJsZWZ0IG92ZXIgdW5wYXJzYWJsZSBjb250ZW50OiBcIiArIGNvbnRlbnQpO1xuICB9XG5cbiAgaWYodmFyMSAmJiB2YXIyKSB7XG4gICAgdGhpcy5pbmRleE5hbWUgPSB2YXIxO1xuICAgIHRoaXMuYWxpYXMgPSB2YXIyWzBdO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYWxpYXMgPSB2YXIxWzBdO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoRm9yTm9kZSwgTm9kZSk7XG5cbkZvck5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBbXSwga2V5O1xuICB2YXIgZCA9IGNvbnRleHQuZ2V0KHRoaXMuc291cmNlTmFtZSk7XG4gIGlmKCFkKSB7XG4gICAgcmV0dXJuIHQ7XG4gIH1cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhkKSwgaTtcbiAgZm9yKGkgPSAwOyBpPGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIHZhciBuZXdfZGF0YSA9IHt9O1xuICAgIC8vIGFkZCB0aGUga2V5IHRvIGFjY2VzcyB0aGUgY29udGV4dCdzIGRhdGFcbiAgICBpZih0aGlzLmluZGV4TmFtZSkge1xuICAgICAgbmV3X2RhdGFbdGhpcy5pbmRleE5hbWVdID0ga2V5O1xuICAgIH1cbiAgICB2YXIgbmV3X2NvbnRleHQgPSBuZXcgQ29udGV4dChuZXdfZGF0YSwgY29udGV4dCk7XG4gICAgLy8ga2VlcCB0cmFjayBvZiB3aGVyZSB0aGUgZGF0YSBpcyBjb21pbmcgZnJvbVxuICAgIG5ld19jb250ZXh0LmFkZEFsaWFzKHRoaXMuc291cmNlTmFtZSArICcuJyArIGtleSwgdGhpcy5hbGlhcyk7XG4gICAgdCA9IHQuY29uY2F0KHRoaXMudHJlZUNoaWxkcmVuKG5ld19jb250ZXh0LCBwYXRoLCB0Lmxlbmd0aCArIHBvcykpO1xuICB9XG4gIHJldHVybiB0O1xufTtcblxuZnVuY3Rpb24gSWZOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9uLmpzRXhwcmVzc2lvbihjb250ZW50LnJlcGxhY2UoL15pZi9nLCBcIlwiKSk7XG4gIHBhcmVudC5jaGlsZHJlbi5wdXNoKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhJZk5vZGUsIE5vZGUpO1xuXG5JZk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgaWYoIXRoaXMuZXhwcmVzc2lvbihjb250ZXh0KSkge1xuICAgIGlmKHRoaXMuZWxzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZWxzZS50cmVlKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICByZXR1cm4gdGhpcy50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIEVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5zZWFyY2hJZihjdXJyZW50Tm9kZSk7XG59XG51dGlsLmluaGVyaXRzKEVsc2VOb2RlLCBOb2RlKTtcblxuRWxzZU5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgcmV0dXJuIHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5mdW5jdGlvbiBJZkVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5qc0V4cHJlc3Npb24oY29udGVudC5yZXBsYWNlKC9eZWxzZWlmL2csIFwiXCIpKTtcbiAgdGhpcy5zZWFyY2hJZihjdXJyZW50Tm9kZSk7XG59XG4vLyBpbXBvcnRhbnQgdG8gYmUgYW4gSWZOb2RlXG51dGlsLmluaGVyaXRzKElmRWxzZU5vZGUsIElmTm9kZSk7XG5cbklmRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmID0gZnVuY3Rpb24gc2VhcmNoSWYoY3VycmVudE5vZGUpIHtcbiAgLy8gZmlyc3Qgbm9kZSBvbiB0aGUgc2FtZSBsZXZlbCBoYXMgdG8gYmUgdGhlIGlmL2Vsc2VpZiBub2RlXG4gIHdoaWxlKGN1cnJlbnROb2RlKSB7XG4gICAgaWYoY3VycmVudE5vZGUubGV2ZWwgPCB0aGlzLmxldmVsKSB7XG4gICAgICB0aGlzLmNlcnJvcihcImNhbm5vdCBmaW5kIGEgY29ycmVzcG9uZGluZyBpZi1saWtlIHN0YXRlbWVudCBhdCB0aGUgc2FtZSBsZXZlbC5cIik7XG4gICAgfVxuICAgIGlmKGN1cnJlbnROb2RlLmxldmVsID09IHRoaXMubGV2ZWwpIHtcbiAgICAgIGlmKCEoY3VycmVudE5vZGUgaW5zdGFuY2VvZiBJZk5vZGUpKSB7XG4gICAgICAgIHRoaXMuY2Vycm9yKFwiYXQgdGhlIHNhbWUgbGV2ZWwgaXMgbm90IGEgaWYtbGlrZSBzdGF0ZW1lbnQuXCIpO1xuICAgICAgfVxuICAgICAgY3VycmVudE5vZGUuZWxzZSA9IHRoaXM7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY3VycmVudE5vZGUgPSBjdXJyZW50Tm9kZS5wYXJlbnQ7XG4gIH1cbn07XG5FbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWYgPSBJZkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZjtcblxuZnVuY3Rpb24gRXhwcmVzc2lvbk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubm9kZU5hbWUgPSBcIiN0ZXh0XCI7XG4gIHZhciBtID0gY29udGVudC5tYXRjaChleHByZXNzaW9uLkVYUFJFU1NJT05fUkVHKTtcbiAgaWYoIW0pIHtcbiAgICB0aGlzLmNlcnJvcihcImRlY2xhcmVkIGltcHJvcGVybHlcIik7XG4gIH1cbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5qc0V4cHJlc3Npb24obVsxXSk7XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoRXhwcmVzc2lvbk5vZGUsIE5vZGUpO1xuXG5FeHByZXNzaW9uTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgLy8gcmVuZGVyZXJcbiAgdmFyIHJlbmRlcmVyID0gU3RyaW5nKGV2YWx1YXRlKHRoaXMuZXhwcmVzc2lvbiwgY29udGV4dCkpO1xuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKTtcbiAgcmV0dXJuIHQ7XG59O1xuXG5FeHByZXNzaW9uTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGV2YWx1YXRlKHRoaXMuZXhwcmVzc2lvbiwgY29udGV4dCkpO1xufTtcblxuZnVuY3Rpb24gU3RyaW5nTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IFwiI3RleHRcIjtcbiAgdGhpcy5zdHJpbmcgPSB0aGlzLmNvbnRlbnQucmVwbGFjZSgvXlwifFwiJC9nLCBcIlwiKS5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJywgJ2dtJyk7XG4gIHRoaXMuY29tcGlsZWRFeHByZXNzaW9uID0gZXhwcmVzc2lvbi5jb21waWxlVGV4dEFuZEV4cHJlc3Npb25zKHRoaXMuc3RyaW5nKTtcbiAgaWYocGFyZW50KSB7XG4gICAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xuICB9XG59XG51dGlsLmluaGVyaXRzKFN0cmluZ05vZGUsIE5vZGUpO1xuXG5TdHJpbmdOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICAvLyByZW5kZXJlciBzaG91bGQgYmUgYWxsIGF0dHJpYnV0ZXNcbiAgdmFyIHJlbmRlcmVyID0gZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KTtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCk7XG4gIHJldHVybiB0O1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpO1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCkpO1xufTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbihjaGlsZCkge1xuICB0aGlzLmNlcnJvcihcImNhbm5vdCBoYXZlIGNoaWxkcmVuIFwiICsgY2hpbGQpO1xufTtcblxuZnVuY3Rpb24gSW5jbHVkZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubmFtZSA9IHV0aWwudHJpbShjb250ZW50LnNwbGl0KFwiIFwiKVsxXSk7XG4gIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlW3RoaXMubmFtZV07XG4gIGlmKHRoaXMudGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuY2Vycm9yKFwiVGVtcGxhdGUgd2l0aCBuYW1lIFwiICsgdGhpcy5uYW1lICsgXCIgaXMgbm90IHJlZ2lzdGVyZWRcIik7XG4gIH1cbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhJbmNsdWRlTm9kZSwgTm9kZSk7XG5cbkluY2x1ZGVOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHJldHVybiB0aGlzLnRlbXBsYXRlLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gQ29tcG9uZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50KS5zdWJzdHIoMTApO1xuICB2YXIgbmFtZSA9IGNvbnRlbnQubWF0Y2goVkFSTkFNRV9SRUcpO1xuICBpZighbmFtZSkge1xuICAgIHRoaXMuY2Vycm9yKFwiQ29tcG9uZW50IG5hbWUgaXMgbWlzc2luZ1wiKTtcbiAgfVxuICBjb250ZW50ID0gdXRpbC50cmltKGNvbnRlbnQuc3Vic3RyKG5hbWVbMF0ubGVuZ3RoKSk7XG4gIHRoaXMubmFtZSA9IG5hbWVbMF07XG4gIHRoaXMuYXR0cnMgPSBwYXJzZUF0dHJpYnV0ZXMoY29udGVudCwgdGhpcyk7XG4gIHRoaXMuY29tcG9uZW50ID0gY29tcG9uZW50Q2FjaGVbdGhpcy5uYW1lXTtcbiAgaWYodGhpcy5jb21wb25lbnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuY2Vycm9yKFwiQ29tcG9uZW50IHdpdGggbmFtZSBcIiArIHRoaXMubmFtZSArIFwiIGlzIG5vdCByZWdpc3RlcmVkXCIpO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoQ29tcG9uZW50Tm9kZSwgTm9kZSk7XG5cbkNvbXBvbmVudE5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIG5ld19jb250ZXh0ID0gbmV3IENvbnRleHQoe30sIGNvbnRleHQpO1xuICB2YXIga2V5LCBhdHRyLCB2YWx1ZSwgc291cmNlO1xuICBmb3Ioa2V5IGluIHRoaXMuYXR0cnMpIHtcbiAgICBhdHRyID0gdGhpcy5hdHRyc1trZXldO1xuICAgIHZhbHVlID0gZXZhbHVhdGUoYXR0ciwgY29udGV4dCk7XG4gICAgbmV3X2NvbnRleHQuc2V0KGtleSwgdmFsdWUpO1xuICAgIGlmKHR5cGVvZiBhdHRyID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHNvdXJjZSA9IGJpbmRpbmdOYW1lKGF0dHIpO1xuICAgICAgaWYoc291cmNlICYmIGtleSAhPSBzb3VyY2UpIHtcbiAgICAgICAgbmV3X2NvbnRleHQuYWRkQWxpYXMoc291cmNlLCBrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZih0aGlzLmNvbXBvbmVudC5jb250cm9sbGVyKXtcbiAgICB0aGlzLmNvbXBvbmVudC5jb250cm9sbGVyKG5ld19jb250ZXh0KTtcbiAgfVxuICByZXR1cm4gdGhpcy5jb21wb25lbnQudGVtcGxhdGUudHJlZUNoaWxkcmVuKG5ld19jb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuQ29tcG9uZW50Tm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gIHJldHVybiB0aGlzLmNvbXBvbmVudC50ZW1wbGF0ZS5yZXByKGxldmVsICsgMSk7XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUsIGN1cnJlbnROb2RlKSB7XG4gIHZhciBub2RlO1xuICBpZihjb250ZW50Lmxlbmd0aCA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgU3RyaW5nTm9kZShwYXJlbnQsIFwiXFxuXCIsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCcjJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IENvbW1lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2lmICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBJZk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignZWxzZWlmICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBJZkVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSwgY3VycmVudE5vZGUpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdlbHNlJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEVsc2VOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSwgY3VycmVudE5vZGUpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdmb3IgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEZvck5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignaW5jbHVkZSAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgSW5jbHVkZU5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignY29tcG9uZW50ICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBDb21wb25lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ1wiJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IFN0cmluZ05vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKC9eXFx3Ly5leGVjKGNvbnRlbnQpKSB7XG4gICAgbm9kZSA9IG5ldyBIdG1sTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCd7eycpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBFeHByZXNzaW9uTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcImNyZWF0ZU5vZGU6IHVua25vdyBub2RlIHR5cGUgXCIgKyBjb250ZW50KTtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gYnVpbGRUZW1wbGF0ZSh0cGwsIHRlbXBsYXRlTmFtZSkge1xuXG4gIC8vIGFscmVhZHkgYSB0ZW1wbGF0ZT9cbiAgaWYodHBsIGluc3RhbmNlb2YgTm9kZSkge1xuICAgIHJldHVybiB0cGw7XG4gIH1cblxuICBpZih0cGwgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIHRwbCA9IHRwbC5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHZhciByb290ID0gbmV3IE5vZGUobnVsbCwgXCJcIiwgMCksIGxpbmVzLCBsaW5lLCBsZXZlbCxcbiAgICBjb250ZW50LCBpLCBjdXJyZW50Tm9kZSA9IHJvb3QsIHBhcmVudCwgc2VhcmNoTm9kZTtcblxuICBsaW5lcyA9IHRwbC5zcGxpdChcIlxcblwiKTtcblxuICBmb3IoaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGluZSA9IGxpbmVzW2ldO1xuICAgIGxldmVsID0gbGluZS5tYXRjaCgvXFxzKi8pWzBdLmxlbmd0aCArIDE7XG4gICAgY29udGVudCA9IGxpbmUuc2xpY2UobGV2ZWwgLSAxKTtcblxuICAgIC8vIG11bHRpbGluZSBzdXBwb3J0OiBlbmRzIHdpdGggYSBcXFxuICAgIHZhciBqID0gMDtcbiAgICB3aGlsZShjb250ZW50Lm1hdGNoKC9cXFxcJC8pKSB7XG4gICAgICAgIGorKztcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXFxcXCQvLCAnJykgKyBsaW5lc1tpK2pdO1xuICAgIH1cbiAgICBpID0gaSArIGo7XG5cbiAgICAvLyBtdWx0aWxpbmUgc3RyaW5nc1xuICAgIGogPSAwO1xuICAgIGlmKGNvbnRlbnQubWF0Y2goL15cIlwiXCIvKSkge1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9eXCJcIlwiLywgJ1wiJyk7XG4gICAgICAgIHdoaWxlKCFjb250ZW50Lm1hdGNoKC9cIlwiXCIkLykpIHtcbiAgICAgICAgICAgIGorKztcbiAgICAgICAgICAgIGlmKGkraiA+IGxpbmVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJNdWx0aWxpbmUgc3RyaW5nIHN0YXJ0ZWQgYnV0IHVuZmluaXNoZWQgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQgKyBsaW5lc1tpK2pdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1wiXCJcIiQvLCAnXCInKTtcbiAgICB9XG4gICAgaSA9IGkgKyBqO1xuXG4gICAgc2VhcmNoTm9kZSA9IGN1cnJlbnROb2RlO1xuICAgIHBhcmVudCA9IG51bGw7XG5cbiAgICAvLyBzZWFyY2ggZm9yIHRoZSBwYXJlbnQgbm9kZVxuICAgIHdoaWxlKHRydWUpIHtcblxuICAgICAgaWYobGV2ZWwgPiBzZWFyY2hOb2RlLmxldmVsKSB7XG4gICAgICAgIHBhcmVudCA9IHNlYXJjaE5vZGU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZighc2VhcmNoTm9kZS5wYXJlbnQpIHtcbiAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW5kZW50YXRpb24gZXJyb3IgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgfVxuXG4gICAgICBpZihsZXZlbCA9PSBzZWFyY2hOb2RlLmxldmVsKSB7XG4gICAgICAgIHBhcmVudCA9IHNlYXJjaE5vZGUucGFyZW50O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgc2VhcmNoTm9kZSA9IHNlYXJjaE5vZGUucGFyZW50O1xuICAgIH1cblxuICAgIGlmKHBhcmVudC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIGlmKHBhcmVudC5jaGlsZHJlblswXS5sZXZlbCAhPSBsZXZlbCkge1xuICAgICAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJJbmRlbnRhdGlvbiBlcnJvciBhdCBsaW5lIFwiICsgKGkgKyAxKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG5vZGUgPSBjcmVhdGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGksIGN1cnJlbnROb2RlKTtcbiAgICBjdXJyZW50Tm9kZSA9IG5vZGU7XG5cbiAgfVxuICBpZih0ZW1wbGF0ZU5hbWUpIHtcbiAgICB0ZW1wbGF0ZUNhY2hlW3RlbXBsYXRlTmFtZV0gPSByb290O1xuICB9XG5cbiAgcmV0dXJuIHJvb3Q7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RDb21wb25lbnRzKCkge1xuICB2YXIgY29tcG9uZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1t0eXBlPVwibGlrZWx5L2NvbXBvbmVudFwiXScpLCBpO1xuICBmb3IoaT0wOyBpPGNvbXBvbmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZighY29tcG9uZW50c1tpXS5pZCkge1xuICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiQ29tcG9uZW50IGlzIG1pc3NpbmcgYW4gaWQgXCIgKyBjb21wb25lbnRzW2ldLnRvU3RyaW5nKCkpO1xuICAgIH1cbiAgICBuZXcgQ29tcG9uZW50KGNvbXBvbmVudHNbaV0uaWQsIGNvbXBvbmVudHNbaV0udGV4dENvbnRlbnQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RUZW1wbGF0ZXMoKSB7XG4gIHZhciB0ZW1wbGF0ZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbdHlwZT1cImxpa2VseS90ZW1wbGF0ZVwiXScpLCBpO1xuICBmb3IoaT0wOyBpPHRlbXBsYXRlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmKCF0ZW1wbGF0ZXNbaV0uaWQpIHtcbiAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIlRlbXBsYXRlIGlzIG1pc3NpbmcgYW4gaWQgXCIgKyB0ZW1wbGF0ZXNbaV0udG9TdHJpbmcoKSk7XG4gICAgfVxuICAgIG5ldyBidWlsZFRlbXBsYXRlKHRlbXBsYXRlc1tpXS50ZXh0Q29udGVudCwgdGVtcGxhdGVzW2ldLmlkKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb2xsZWN0KCl7XG4gIGNvbGxlY3RDb21wb25lbnRzKCk7XG4gIGNvbGxlY3RUZW1wbGF0ZXMoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGJ1aWxkVGVtcGxhdGU6IGJ1aWxkVGVtcGxhdGUsXG4gIHBhcnNlQXR0cmlidXRlczogcGFyc2VBdHRyaWJ1dGVzLFxuICBDb250ZXh0OiBDb250ZXh0LFxuICB0ZW1wbGF0ZXM6IHRlbXBsYXRlQ2FjaGUsXG4gIGNvbXBvbmVudHM6IGNvbXBvbmVudENhY2hlLFxuICBjb2xsZWN0Q29tcG9uZW50czogY29sbGVjdENvbXBvbmVudHMsXG4gIGNvbGxlY3RUZW1wbGF0ZXM6IGNvbGxlY3RUZW1wbGF0ZXMsXG4gIGNvbGxlY3Q6IGNvbGxlY3QsXG4gIENvbnRleHROYW1lOiBDb250ZXh0TmFtZSxcbiAgQ29tcG9uZW50OiBDb21wb25lbnQsXG4gIE5vZGU6IE5vZGVcbn07IiwiXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gaW5oZXJpdHMoY2hpbGQsIHBhcmVudCkge1xuICBjaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUpO1xuICBjaGlsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjaGlsZDtcbn1cblxuZnVuY3Rpb24gQ29tcGlsZUVycm9yKG1zZykge1xuICB0aGlzLm5hbWUgPSBcIkNvbXBpbGVFcnJvclwiO1xuICB0aGlzLm1lc3NhZ2UgPSAobXNnIHx8IFwiXCIpO1xufVxuQ29tcGlsZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gUnVudGltZUVycm9yKG1zZykge1xuICB0aGlzLm5hbWUgPSBcIlJ1bnRpbWVFcnJvclwiO1xuICB0aGlzLm1lc3NhZ2UgPSAobXNnIHx8IFwiXCIpO1xufVxuUnVudGltZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gZXNjYXBlKHVuc2FmZSkge1xuICByZXR1cm4gdW5zYWZlXG4gICAgLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxuICAgIC5yZXBsYWNlKC88L2csIFwiJmx0O1wiKVxuICAgIC5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKVxuICAgIC5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKVxuICAgIC5yZXBsYWNlKC8nL2csIFwiJiMwMzk7XCIpO1xufVxuXG5mdW5jdGlvbiB0cmltKHR4dCkge1xuICByZXR1cm4gdHh0LnJlcGxhY2UoL15cXHMrfFxccyskL2cgLFwiXCIpO1xufVxuXG5mdW5jdGlvbiBldmVudChuYW1lLCBkYXRhKSB7XG4gIHZhciBldnQgPSBuZXcgQ3VzdG9tRXZlbnQobmFtZSwge1xuICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgY2FuY2VsYWJsZTogZmFsc2UsXG4gICAgZGV0YWlsczogZGF0YVxuICB9KTtcbiAgcmV0dXJuIGV2dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaGVyaXRzOmluaGVyaXRzLFxuICBDb21waWxlRXJyb3I6Q29tcGlsZUVycm9yLFxuICBSdW50aW1lRXJyb3I6UnVudGltZUVycm9yLFxuICBlc2NhcGU6ZXNjYXBlLFxuICB0cmltOnRyaW0sXG4gIGV2ZW50OmV2ZW50XG59OyJdfQ==
(2)
});
