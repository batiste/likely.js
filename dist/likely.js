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

function replaceNames(str) {
  return str.replace(nameReg, function(_name) {
    if(!_name.match(/^context/)) {
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
  this.data = data;
  this.context = new template.Context(this.data);
  this.template = tpl;
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
  componentCache:template.componentCache,
  applyDiff:render.applyDiff,
  diffCost:render.diffCost,
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
  this.template = likely.Template(tpl);
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

module.exports = {
  buildTemplate: buildTemplate,
  parseAttributes: parseAttributes,
  Context: Context,
  templateCache: templateCache,
  componentCache: componentCache,
  ContextName: ContextName,
  Component: Component
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25yQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5cInVzZSBzdHJpY3RcIjtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBFWFBSRVNTSU9OX1JFRyA9IC9ee3soLis/KX19LztcblxuZnVuY3Rpb24gY29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyh0eHQpIHtcbiAgLy8gY29tcGlsZSB0aGUgZXhwcmVzc2lvbnMgZm91bmQgaW4gdGhlIHRleHRcbiAgLy8gYW5kIHJldHVybiBhIGxpc3Qgb2YgdGV4dCtleHByZXNzaW9uXG4gIHZhciBleHByLCBhcm91bmQ7XG4gIHZhciBsaXN0ID0gW107XG4gIHdoaWxlKHRydWUpIHtcbiAgICB2YXIgbWF0Y2ggPSAve3soLis/KX19Ly5leGVjKHR4dCk7XG4gICAgaWYoIW1hdGNoKSB7XG4gICAgICBpZih0eHQpIHtcbiAgICAgICAgbGlzdC5wdXNoKHR4dCk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZXhwciA9IGpzRXhwcmVzc2lvbihtYXRjaFsxXSk7XG4gICAgYXJvdW5kID0gdHh0LnNwbGl0KG1hdGNoWzBdLCAyKTtcbiAgICBpZihhcm91bmRbMF0ubGVuZ3RoKSB7XG4gICAgICBsaXN0LnB1c2goYXJvdW5kWzBdKTtcbiAgICB9XG4gICAgbGlzdC5wdXNoKGV4cHIpO1xuICAgIHR4dCA9IGFyb3VuZFsxXTtcbiAgfVxuICByZXR1cm4gbGlzdDtcbn1cblxuZnVuY3Rpb24gZXZhbHVhdGVFeHByZXNzaW9uTGlzdChleHByZXNzaW9ucywgY29udGV4dCkge1xuICB2YXIgc3RyID0gXCJcIiwgaTtcbiAgZm9yKGk9MDsgaTxleHByZXNzaW9ucy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gZXhwcmVzc2lvbnNbaV07XG4gICAgaWYodHlwZW9mIGl0ZW0gPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBzdHIgKz0gaXRlbShjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9IGl0ZW07XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VPdXRPZlN0cmluZ3Moc3RyKSB7XG4gIHZhciBpbmRleCA9IDAsIGxlbmd0aCA9IHN0ci5sZW5ndGgsIGNoO1xuICB2YXIgbmV3X3N0ciA9IFwiXCIsIGluU3RyaW5nID0gbnVsbCwgc3RhcnQgPSAwO1xuICB3aGlsZShpbmRleCA8IGxlbmd0aCkge1xuICAgIGNoID0gc3RyLmNoYXJBdChpbmRleCk7XG4gICAgaWYoY2ggPT09ICdcXFxcJykge1xuICAgICAgaW5kZXggPSBpbmRleCArIDI7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYoY2ggPT09ICdcIicgfHwgY2ggPT09IFwiJ1wiKSB7XG4gICAgICAvLyBjbG9zaW5nIGEgc3RyaW5nXG4gICAgICBpZihpblN0cmluZyA9PT0gY2gpIHtcbiAgICAgICAgaW5TdHJpbmcgPSBudWxsO1xuICAgICAgICBuZXdfc3RyID0gbmV3X3N0ciArIHN0ci5zbGljZShzdGFydCwgaW5kZXgpO1xuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gb3BlbmluZyBhIHN0cmluZ1xuICAgICAgICBuZXdfc3RyID0gbmV3X3N0ciArIHJlcGxhY2VOYW1lcyhzdHIuc2xpY2Uoc3RhcnQsIGluZGV4KSk7XG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGluU3RyaW5nID0gY2g7XG4gICAgICB9XG4gICAgfVxuICAgIGluZGV4ID0gaW5kZXggKyAxO1xuICB9XG4gIG5ld19zdHIgKz0gcmVwbGFjZU5hbWVzKHN0ci5zbGljZShzdGFydCwgaW5kZXgpKTtcbiAgcmV0dXJuIG5ld19zdHI7XG59XG5cbnZhciBuYW1lUmVnID0gL1thLXpBLVpfJF1bMC05YS16QS1aXyRcXC5dKi9nbTtcblxuZnVuY3Rpb24gcmVwbGFjZU5hbWVzKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UobmFtZVJlZywgZnVuY3Rpb24oX25hbWUpIHtcbiAgICBpZighX25hbWUubWF0Y2goL15jb250ZXh0LykpIHtcbiAgICAgIHJldHVybiAnY29udGV4dC5nZXQoXCInK19uYW1lKydcIiknO1xuICAgIH1cbiAgICByZXR1cm4gX25hbWU7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBqc0V4cHJlc3Npb24oc291cmNlKSB7XG4gIHZhciBoYXNOYW1lID0gc291cmNlLm1hdGNoKG5hbWVSZWcpO1xuICB2YXIgbmV3U291cmNlID0gcmVwbGFjZU91dE9mU3RyaW5ncyhzb3VyY2UpO1xuICB2YXIgZmN0ID0gbmV3IEZ1bmN0aW9uKCdjb250ZXh0JywgJ3JldHVybiAnICsgbmV3U291cmNlKTtcbiAgLy8gb25seSBvbmUgbmFtZT8gdGhpcyBpcyBhIGNhbmRpZGF0ZSBmb3IgZGF0YSBiaW5kaW5nXG4gIGlmKGhhc05hbWUgJiYgaGFzTmFtZS5sZW5ndGggPT0gMSAmJiB1dGlsLnRyaW0oc291cmNlKSA9PSBoYXNOYW1lWzBdKSB7XG4gICAgZmN0LmJpbmRpbmcgPSBoYXNOYW1lWzBdO1xuICB9XG4gIHJldHVybiBmY3Q7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBuYW1lUmVnOm5hbWVSZWcsXG4gIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnM6Y29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyxcbiAgZXZhbHVhdGVFeHByZXNzaW9uTGlzdDpldmFsdWF0ZUV4cHJlc3Npb25MaXN0LFxuICBqc0V4cHJlc3Npb246anNFeHByZXNzaW9uLFxuICByZXBsYWNlTmFtZXM6cmVwbGFjZU5hbWVzLFxuICByZXBsYWNlT3V0T2ZTdHJpbmdzOnJlcGxhY2VPdXRPZlN0cmluZ3MsXG4gIEVYUFJFU1NJT05fUkVHOkVYUFJFU1NJT05fUkVHXG59OyIsIi8qIExpa2VseS5qcyxcbiAgIFB5dGhvbiBzdHlsZSBIVE1MIHRlbXBsYXRlIGxhbmd1YWdlIHdpdGggYmktZGlyZWN0aW9ubmFsIGRhdGEgYmluZGluZ1xuICAgYmF0aXN0ZSBiaWVsZXIgMjAxNCAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKTtcbnZhciBleHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJyk7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJyk7XG5cbmZ1bmN0aW9uIHVwZGF0ZURhdGEoY29udGV4dCwgZG9tKSB7XG4gIHZhciBuYW1lID0gZG9tLmdldEF0dHJpYnV0ZShcImxrLWJpbmRcIiksIHZhbHVlO1xuICBpZighbmFtZSkge1xuICAgIHRocm93IFwiTm8gbGstYmluZCBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnRcIjtcbiAgfVxuICBpZihkb20udHlwZSA9PSAnY2hlY2tib3gnICYmICFkb20uY2hlY2tlZCkge1xuICAgIHZhbHVlID0gXCJcIjtcbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRvbS52YWx1ZTsvLyB8fCBkb20uZ2V0QXR0cmlidXRlKFwidmFsdWVcIik7XG4gIH1cbiAgLy8gdXBkYXRlIHRoZSBjb250ZXh0XG4gIGNvbnRleHQubW9kaWZ5KG5hbWUsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gQmluZGluZyhkb20sIHRwbCwgZGF0YSkge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQmluZGluZykge1xuICAgIHJldHVybiBuZXcgQmluZGluZyhkb20sIHRwbCwgZGF0YSk7XG4gIH1cbiAgLy8gZG91YmxlIGRhdGEgYmluZGluZyBiZXR3ZWVuIHNvbWUgZGF0YSBhbmQgc29tZSBkb21cbiAgdGhpcy5kb20gPSBkb207XG4gIHRoaXMuZGF0YSA9IGRhdGE7XG4gIHRoaXMuY29udGV4dCA9IG5ldyB0ZW1wbGF0ZS5Db250ZXh0KHRoaXMuZGF0YSk7XG4gIHRoaXMudGVtcGxhdGUgPSB0cGw7XG4gIHRoaXMuc2NoZWR1bGVkID0gZmFsc2U7XG4gIHRoaXMuY2FsbGJhY2tzID0gW107XG59XG5cbkJpbmRpbmcucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudGVtcGxhdGUudHJlZShuZXcgdGVtcGxhdGUuQ29udGV4dCh0aGlzLmRhdGEpKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5kb20uaW5uZXJIVE1MID0gXCJcIjtcbiAgdGhpcy5jdXJyZW50VHJlZSA9IHRoaXMudHJlZSgpO1xuICB0aGlzLmN1cnJlbnRUcmVlLmRvbVRyZWUodGhpcy5kb20pO1xuICB0aGlzLmJpbmRFdmVudHMoKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmRvbUluaXQgPSBmdW5jdGlvbigpIHtcbiAgLy8gY3JlYXRlIGFuIGluaXRpYWwgdHJlZSBmcm9tIHRoZSBET01cbiAgdGhpcy5jdXJyZW50VHJlZSA9IHJlbmRlci5pbml0aWFsUmVuZGVyRnJvbURvbSh0aGlzLmRvbSk7XG4gIHRoaXMuY3VycmVudFRyZWUubm9kZU5hbWUgPSB1bmRlZmluZWQ7XG4gIHRoaXMuYmluZEV2ZW50cygpO1xufTtcblxuQmluZGluZy5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbmV3VHJlZSA9IHRoaXMudHJlZSgpO1xuICB2YXIgZGlmZiA9IHRoaXMuY3VycmVudFRyZWUuZGlmZihuZXdUcmVlKTtcbiAgcmVuZGVyLmFwcGx5RGlmZihkaWZmLCB0aGlzLmRvbSk7XG4gIHRoaXMuY3VycmVudFRyZWUgPSBuZXdUcmVlO1xuICB0aGlzLmxvY2sgPSBmYWxzZTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmRhdGFFdmVudCA9IGZ1bmN0aW9uKGUpIHtcbiAgdmFyIGRvbSA9IGUudGFyZ2V0O1xuICB2YXIgbmFtZSA9IGRvbS5nZXRBdHRyaWJ1dGUoJ2xrLWJpbmQnKTtcbiAgaWYobmFtZSkge1xuICAgIHZhciByZW5kZXJOb2RlID0gdGhpcy5nZXRSZW5kZXJOb2RlRnJvbVBhdGgoZG9tKTtcbiAgICBpZighdGhpcy5sb2NrKSB7XG4gICAgICAvLyBkbyBub3QgdXBkYXRlIGR1cmluZyBhIHJlbmRlclxuICAgICAgdXBkYXRlRGF0YShyZW5kZXJOb2RlLmNvbnRleHQsIGRvbSk7XG4gICAgICB0aGlzLmxvY2sgPSB0cnVlO1xuICAgICAgdGhpcy5kaWZmKCk7XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcignZGF0YVZpZXdDaGFuZ2VkJywge1wibmFtZVwiOiBuYW1lfSk7XG4gIH1cbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmdldFJlbmRlck5vZGVGcm9tUGF0aCA9IGZ1bmN0aW9uKGRvbSkge1xuICB2YXIgcGF0aCA9IGRvbS5nZXRBdHRyaWJ1dGUoJ2xrLXBhdGgnKTtcbiAgdmFyIHJlbmRlck5vZGUgPSB0aGlzLmN1cnJlbnRUcmVlO1xuICB2YXIgYml0cyA9IHBhdGguc3BsaXQoXCIuXCIpLCBpO1xuICBmb3IoaT0xOyBpPGJpdHMubGVuZ3RoOyBpKyspIHtcbiAgICByZW5kZXJOb2RlID0gcmVuZGVyTm9kZS5jaGlsZHJlbltiaXRzW2ldXTtcbiAgfVxuICByZXR1cm4gcmVuZGVyTm9kZTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbihuYW1lLCBvYmopIHtcbiAgdGhpcy5kb20uZGlzcGF0Y2hFdmVudChcbiAgICB1dGlsLmV2ZW50KG5hbWUsIG9iailcbiAgKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmFueUV2ZW50ID0gZnVuY3Rpb24oZSkge1xuICB2YXIgZG9tID0gZS50YXJnZXQ7XG4gIHZhciBsa0V2ZW50ID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstJyArIGUudHlwZSk7XG4gIGlmKCFsa0V2ZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciByZW5kZXJOb2RlID0gdGhpcy5nZXRSZW5kZXJOb2RlRnJvbVBhdGgoZG9tKTtcbiAgdmFyIGN0eCA9IHRlbXBsYXRlLkNvbnRleHQoe2V2ZW50OiBlfSwgcmVuZGVyTm9kZS5jb250ZXh0KTtcbiAgcmVuZGVyTm9kZS5ub2RlLmF0dHJzWydsay0nK2UudHlwZV0oY3R4KTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmJpbmRFdmVudHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGk7XG4gIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbihlKXsgdGhpcy5kYXRhRXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpeyB0aGlzLmRhdGFFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIHZhciBldmVudHMgPSBcImNsaWNrLGNoYW5nZSxtb3VzZW92ZXIsZm9jdXNvdXQsZm9jdXNpbixrZXlkb3duLGtleXVwLGtleXByZXNzLHN1Ym1pdFwiLnNwbGl0KCcsJyk7XG4gIGZvcihpPTA7IGk8ZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIGV2ZW50c1tpXSxcbiAgICAgIGZ1bmN0aW9uKGUpeyB0aGlzLmFueUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgfVxufTtcblxuQmluZGluZy5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgaWYoY2FsbGJhY2spIHtcbiAgICB0aGlzLmNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgfVxuICBpZih0aGlzLnNjaGVkdWxlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcbiAgaWYoKHRoaXMubGFzdFVwZGF0ZSAmJiAobm93IC0gdGhpcy5sYXN0VXBkYXRlKSA8IDI1KSB8fCB0aGlzLmxvY2spIHtcbiAgICB0aGlzLnNjaGVkdWxlZCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnNjaGVkdWxlZCA9IGZhbHNlO1xuICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICB9LmJpbmQodGhpcykpO1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBhdm9pZCAyIGRpZmZzIGF0IHRoZSBzYW1lIHRpbWVcbiAgdGhpcy5sb2NrID0gdHJ1ZTtcbiAgdGhpcy5sYXN0VXBkYXRlID0gbm93O1xuICB0aGlzLmRpZmYoKTtcbiAgdGhpcy50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgd2hpbGUodGhpcy5jYWxsYmFja3MubGVuZ3RoKSB7XG4gICAgdGhpcy5jYWxsYmFja3MucG9wKCkoKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFRlbXBsYXRlOnRlbXBsYXRlLmJ1aWxkVGVtcGxhdGUsXG4gIENvbnRleHROYW1lOnRlbXBsYXRlLkNvbnRleHROYW1lLFxuICB1cGRhdGVEYXRhOnVwZGF0ZURhdGEsXG4gIEJpbmRpbmc6QmluZGluZyxcbiAgQ29tcG9uZW50OnRlbXBsYXRlLkNvbXBvbmVudCxcbiAgZ2V0RG9tOnJlbmRlci5nZXREb20sXG4gIGNvbXBvbmVudENhY2hlOnRlbXBsYXRlLmNvbXBvbmVudENhY2hlLFxuICBhcHBseURpZmY6cmVuZGVyLmFwcGx5RGlmZixcbiAgZGlmZkNvc3Q6cmVuZGVyLmRpZmZDb3N0LFxuICBhdHRyaWJ1dGVzRGlmZjpyZW5kZXIuYXR0cmlidXRlc0RpZmYsXG4gIENvbnRleHQ6dGVtcGxhdGUuQ29udGV4dCxcbiAgQ29tcGlsZUVycm9yOnV0aWwuQ29tcGlsZUVycm9yLFxuICBSdW50aW1lRXJyb3I6dXRpbC5SdW50aW1lRXJyb3IsXG4gIGVzY2FwZTp1dGlsLmVzY2FwZSxcbiAgaW5pdGlhbFJlbmRlckZyb21Eb206cmVuZGVyLmluaXRpYWxSZW5kZXJGcm9tRG9tLFxuICBleHByZXNzaW9uOmV4cHJlc3Npb24sXG4gIHJlbmRlcjpyZW5kZXIsXG4gIHRlbXBsYXRlOnRlbXBsYXRlLFxuICB1dGlsOnV0aWwsXG4gIHNldEhhbmRpY2FwOmZ1bmN0aW9uKG4pe3JlbmRlci5oYW5kaWNhcCA9IG47fVxufTtcbiIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIFJlbmRlcmVkTm9kZShub2RlLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCkge1xuICB0aGlzLmNoaWxkcmVuID0gW107XG4gIHRoaXMubm9kZSA9IG5vZGU7XG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMucmVuZGVyZXIgPSByZW5kZXJlcjtcbiAgdGhpcy5wYXRoID0gcGF0aCB8fCBcIlwiO1xuICAvLyBzaG9ydGN1dFxuICB0aGlzLm5vZGVOYW1lID0gbm9kZS5ub2RlTmFtZTtcbn1cblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGlmKGxldmVsID09PSB1bmRlZmluZWQpIHtcbiAgICBsZXZlbCA9IDA7XG4gIH1cbiAgZm9yKGk9MDsgaTxsZXZlbDsgaSsrKSB7XG4gICAgc3RyICs9IFwiICBcIjtcbiAgfVxuICBzdHIgKz0gU3RyaW5nKHRoaXMubm9kZSkgKyBcIiBwYXRoIFwiICsgdGhpcy5wYXRoICsgXCJcXHJcXG5cIjtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgc3RyICs9IHRoaXMuY2hpbGRyZW5baV0ucmVwcihsZXZlbCArIDEpO1xuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRvbVRyZWUgPSBmdW5jdGlvbihhcHBlbmRfdG8pIHtcbiAgdmFyIG5vZGUgPSBhcHBlbmRfdG8gfHwgdGhpcy5ub2RlLmRvbU5vZGUodGhpcy5jb250ZXh0LCB0aGlzLnBhdGgpLCBpLCBjaGlsZF90cmVlO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBjaGlsZF90cmVlID0gdGhpcy5jaGlsZHJlbltpXS5kb21UcmVlKCk7XG4gICAgaWYobm9kZS5wdXNoKSB7XG4gICAgICBub2RlLnB1c2goY2hpbGRfdHJlZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGRfdHJlZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBub2RlO1xufTtcblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5kb21IdG1sID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpO1xuICAvL3ZhciBkID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgY2hpbGQgPSB0aGlzLmNoaWxkcmVuW2ldLmRvbVRyZWUoKTtcbiAgICBkLmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgfVxuICByZXR1cm4gZC5pbm5lckhUTUw7XG59O1xuXG5mdW5jdGlvbiBkaWZmQ29zdChkaWZmKSB7XG4gIHZhciB2YWx1ZT0wLCBpO1xuICBmb3IoaT0wOyBpPGRpZmYubGVuZ3RoOyBpKyspIHtcbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcInJlbW92ZVwiKSB7XG4gICAgICB2YWx1ZSArPSA1O1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICB2YWx1ZSArPSAyO1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICB2YWx1ZSArPSAxO1xuICAgIH1cbiAgICBpZihkaWZmW2ldLmFjdGlvbiA9PSBcInN0cmluZ211dGF0ZVwiKSB7XG4gICAgICB2YWx1ZSArPSAxO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuX2RpZmYgPSBmdW5jdGlvbihyZW5kZXJlZF9ub2RlLCBhY2N1LCBwYXRoKSB7XG4gIHZhciBpLCBqLCBzb3VyY2VfcHQgPSAwO1xuICBpZihwYXRoID09PSB1bmRlZmluZWQpIHsgcGF0aCA9IFwiXCI7IH1cblxuICBpZighcmVuZGVyZWRfbm9kZSkge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgbm9kZTogdGhpcyxcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdTtcbiAgfVxuXG4gIGlmKHJlbmRlcmVkX25vZGUubm9kZU5hbWUgIT0gdGhpcy5ub2RlTmFtZSkge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICB0eXBlOiAnZGlmZmVudF9ub2RlTmFtZScsXG4gICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgbm9kZTogdGhpcyxcbiAgICAgIHBhdGg6IHBhdGhcbiAgICB9KTtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgdHlwZTogJ2RpZmZlbnRfbm9kZU5hbWUnLFxuICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUsXG4gICAgICAvLyB3aGVuIGEgbm9kZSBpcyBhZGRlZCwgd2UgcG9pbnQgdG8gdGhlIG5leHQgbm9kZSBhcyBpbnNlcnRCZWZvcmUgaXMgdXNlZFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9XG5cbiAgLy8gQ291bGQgdXNlIGluaGVyaXRhbmNlIGZvciB0aGlzXG4gIGlmKHRoaXMubm9kZU5hbWUgPT0gXCIjdGV4dFwiICYmIHRoaXMucmVuZGVyZXIgIT0gcmVuZGVyZWRfbm9kZS5yZW5kZXJlcikge1xuICAgICAgYWNjdS5wdXNoKHtcbiAgICAgICAgYWN0aW9uOiAnc3RyaW5nbXV0YXRlJyxcbiAgICAgICAgbm9kZTogdGhpcyxcbiAgICAgICAgdmFsdWU6IHJlbmRlcmVkX25vZGUucmVuZGVyZXIsXG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9IGVsc2Uge1xuICAgIHZhciBhX2RpZmYgPSBhdHRyaWJ1dGVzRGlmZih0aGlzLmF0dHJzLCByZW5kZXJlZF9ub2RlLmF0dHJzKTtcbiAgICBpZihhX2RpZmYubGVuZ3RoKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdtdXRhdGUnLFxuICAgICAgICBub2RlOiB0aGlzLFxuICAgICAgICBhdHRyaWJ1dGVzRGlmZjogYV9kaWZmLFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICB2YXIgbDEgPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDtcbiAgdmFyIGwyID0gcmVuZGVyZWRfbm9kZS5jaGlsZHJlbi5sZW5ndGg7XG5cbiAgLy8gbm8gc3dhcCBwb3NzaWJsZSwgYnV0IGRlbGV0aW5nIGEgbm9kZSBpcyBwb3NzaWJsZVxuICBqID0gMDsgaSA9IDA7IHNvdXJjZV9wdCA9IDA7XG4gIC8vIGxldCdzIGdvdCB0cm91Z2ggYWxsIHRoZSBjaGlsZHJlblxuICBmb3IoOyBpPGwxOyBpKyspIHtcbiAgICB2YXIgZGlmZiA9IDAsIGFmdGVyX3NvdXJjZV9kaWZmID0gMCwgYWZ0ZXJfdGFyZ2V0X2RpZmYgPSAwLCBhZnRlcl9zb3VyY2VfY29zdD1udWxsLCBhZnRlcl90YXJnZXRfY29zdD1udWxsO1xuICAgIHZhciBhZnRlcl90YXJnZXQgPSByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2orMV07XG4gICAgdmFyIGFmdGVyX3NvdXJjZSA9IHRoaXMuY2hpbGRyZW5baSsxXTtcblxuICAgIGlmKCFyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgICBub2RlOiB0aGlzLmNoaWxkcmVuW2ldLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgc291cmNlX3B0XG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGRpZmYgPSB0aGlzLmNoaWxkcmVuW2ldLl9kaWZmKHJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0sIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcblxuICAgIHZhciBjb3N0ID0gZGlmZkNvc3QoZGlmZik7XG4gICAgLy8gZG9lcyB0aGUgbmV4dCBzb3VyY2Ugb25lIGZpdHMgYmV0dGVyP1xuICAgIGlmKGFmdGVyX3NvdXJjZSkge1xuICAgICAgYWZ0ZXJfc291cmNlX2RpZmYgPSBhZnRlcl9zb3VyY2UuX2RpZmYocmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSwgW10sIHBhdGggKyAnLicgKyBzb3VyY2VfcHQpO1xuICAgICAgLy8gbmVlZHMgc29tZSBoYW5kaWNhcCBvdGhlcndpc2UgaW5wdXRzIGNvbnRhaW5pbmcgdGhlIGN1cnJlbnQgZm9jdXNcbiAgICAgIC8vIG1pZ2h0IGJlIHJlbW92ZWRcbiAgICAgIGFmdGVyX3NvdXJjZV9jb3N0ID0gZGlmZkNvc3QoYWZ0ZXJfc291cmNlX2RpZmYpICsgbW9kdWxlLmV4cG9ydHMuaGFuZGljYXA7XG4gICAgfVxuICAgIC8vIGRvZXMgdGhlIG5leHQgdGFyZ2V0IG9uZSBmaXRzIGJldHRlcj9cbiAgICBpZihhZnRlcl90YXJnZXQpIHtcbiAgICAgIGFmdGVyX3RhcmdldF9kaWZmID0gdGhpcy5jaGlsZHJlbltpXS5fZGlmZihhZnRlcl90YXJnZXQsIFtdLCBwYXRoICsgJy4nICsgc291cmNlX3B0KTtcbiAgICAgIGFmdGVyX3RhcmdldF9jb3N0ID0gZGlmZkNvc3QoYWZ0ZXJfdGFyZ2V0X2RpZmYpICsgbW9kdWxlLmV4cG9ydHMuaGFuZGljYXA7XG4gICAgfVxuXG4gICAgaWYoKCFhZnRlcl90YXJnZXQgfHwgY29zdCA8PSBhZnRlcl90YXJnZXRfY29zdCkgJiYgKCFhZnRlcl9zb3VyY2UgfHwgY29zdCA8PSBhZnRlcl9zb3VyY2VfY29zdCkpIHtcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChkaWZmKTtcbiAgICAgIHNvdXJjZV9wdCArPSAxO1xuICAgIH0gZWxzZSBpZihhZnRlcl9zb3VyY2UgJiYgKCFhZnRlcl90YXJnZXQgfHwgYWZ0ZXJfc291cmNlX2Nvc3QgPD0gYWZ0ZXJfdGFyZ2V0X2Nvc3QpKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICB0eXBlOiAnYWZ0ZXJfc291cmNlJyxcbiAgICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgICAgbm9kZTogdGhpcy5jaGlsZHJlbltpXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIHNvdXJjZV9wdFxuICAgICAgfSk7XG4gICAgICBhY2N1ID0gYWNjdS5jb25jYXQoYWZ0ZXJfc291cmNlX2RpZmYpO1xuICAgICAgc291cmNlX3B0ICs9IDE7XG4gICAgICBpKys7XG4gICAgfSBlbHNlIGlmKGFmdGVyX3RhcmdldCkge1xuICAgICAgLy8gaW1wb3J0YW50IHRvIGFkZCB0aGUgZGlmZiBiZWZvcmVcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChhZnRlcl90YXJnZXRfZGlmZik7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICB0eXBlOiAnYWZ0ZXJfdGFyZ2V0JyxcbiAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSxcbiAgICAgICAgcGF0aDogcGF0aCArICcuJyArIChzb3VyY2VfcHQpXG4gICAgICB9KTtcbiAgICAgIHNvdXJjZV9wdCArPSAyO1xuICAgICAgaisrO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBcIlNob3VsZCBuZXZlciBoYXBwZW5cIjtcbiAgICB9XG4gICAgaisrO1xuICB9XG5cbiAgLy8gbmV3IG5vZGVzIHRvIGJlIGFkZGVkIGFmdGVyIHRoZSBkaWZmXG4gIGZvcihpPTA7IGk8KGwyLWopOyBpKyspIHtcbiAgICBhY2N1LnB1c2goe1xuICAgICAgdHlwZTogJ25ld19ub2RlJyxcbiAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICBub2RlOiByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2oraV0sXG4gICAgICAvLyB3aGVuIGEgbm9kZSBpcyBhZGRlZCwgd2UgcG9pbnQgdG8gdGhlIG5leHQgbm9kZSBhcyBpbnNlcnRCZWZvcmUgaXMgdXNlZFxuICAgICAgcGF0aDogcGF0aCArICcuJyArIChzb3VyY2VfcHQgKyAxKVxuICAgIH0pO1xuICAgIHNvdXJjZV9wdCArPSAxO1xuICB9XG5cbiAgcmV0dXJuIGFjY3U7XG5cbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uKHJlbmRlcmVkX25vZGUpIHtcbiAgdmFyIGFjY3UgPSBbXTtcbiAgcmV0dXJuIHRoaXMuX2RpZmYocmVuZGVyZWRfbm9kZSwgYWNjdSk7XG59O1xuXG5mdW5jdGlvbiBhdHRyaWJ1dGVzRGlmZihhLCBiKSB7XG4gIHZhciBjaGFuZ2VzID0gW10sIGtleTtcbiAgZm9yKGtleSBpbiBhKSB7XG4gICAgICBpZihiW2tleV0gPT09IGZhbHNlKSB7XG4gICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwicmVtb3ZlXCIsIGtleTprZXl9KTtcbiAgICAgIH0gZWxzZSBpZihiW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZihiW2tleV0gIT0gYVtrZXldKSB7XG4gICAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJtdXRhdGVcIiwga2V5OmtleSwgdmFsdWU6YltrZXldfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoYW5nZXMucHVzaCh7YWN0aW9uOlwicmVtb3ZlXCIsIGtleTprZXl9KTtcbiAgICAgIH1cbiAgfVxuICBmb3Ioa2V5IGluIGIpIHtcbiAgICBpZihhW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJhZGRcIiwga2V5OmtleSwgdmFsdWU6YltrZXldfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBjaGFuZ2VzO1xufVxuXG5mdW5jdGlvbiBnZXREb20oZG9tLCBwYXRoLCBzdG9wKSB7XG4gIHZhciBpLCBwPXBhdGguc3BsaXQoJy4nKSwgY2hpbGQ9ZG9tO1xuICBpZihzdG9wID09PSB1bmRlZmluZWQpIHtcbiAgICBzdG9wID0gMDtcbiAgfVxuICB2YXIgYm91bmRhcnk9cC5sZW5ndGggLSBzdG9wO1xuICBmb3IoaT0xOyBpPGJvdW5kYXJ5OyBpKyspIHtcbiAgICBjaGlsZCA9IGNoaWxkLmNoaWxkTm9kZXNbcFtpXSB8IDBdO1xuICB9XG4gIHJldHVybiBjaGlsZDtcbn1cblxuZnVuY3Rpb24gYXBwbHlEaWZmKGRpZmYsIGRvbSkge1xuICB2YXIgaSwgaiwgX2RpZmYsIF9kb20sIHBhcmVudDtcbiAgZm9yKGk9MDsgaTxkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgX2RpZmYgPSBkaWZmW2ldO1xuICAgIF9kb20gPSBnZXREb20oZG9tLCBfZGlmZi5wYXRoKTtcbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgX2RvbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKF9kb20pO1xuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgdmFyIG5ld05vZGUgPSBfZGlmZi5ub2RlLmRvbVRyZWUoKTtcbiAgICAgIGlmKF9kb20pIHtcbiAgICAgICAgX2RvbS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShuZXdOb2RlLCBfZG9tKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGdldCB0aGUgcGFyZW50XG4gICAgICAgIHBhcmVudCA9IGdldERvbShkb20sIF9kaWZmLnBhdGgsIDEpO1xuICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQobmV3Tm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICBmb3Ioaj0wOyBqPF9kaWZmLmF0dHJpYnV0ZXNEaWZmLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBhX2RpZmYgPSBfZGlmZi5hdHRyaWJ1dGVzRGlmZltqXTtcbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICAgICAgLy8gaW1wb3J0YW50IGZvciBzZWxlY3RcbiAgICAgICAgICBpZihcInZhbHVlLHNlbGVjdGVkLGNoZWNrZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBpZihfZG9tW2FfZGlmZi5rZXldICE9IGFfZGlmZi52YWx1ZSkge1xuICAgICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gYV9kaWZmLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBfZG9tLnNldEF0dHJpYnV0ZShhX2RpZmYua2V5LCBhX2RpZmYudmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgICAgIGlmKFwiY2hlY2tlZCxzZWxlY3RlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5yZW1vdmVBdHRyaWJ1dGUoYV9kaWZmLmtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICAgICAgaWYoXCJjaGVja2VkLHNlbGVjdGVkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGFfZGlmZi52YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5zZXRBdHRyaWJ1dGUoYV9kaWZmLmtleSwgYV9kaWZmLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJzdHJpbmdtdXRhdGVcIikge1xuICAgICAgX2RvbS5ub2RlVmFsdWUgPSBfZGlmZi52YWx1ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdGlhbFJlbmRlckZyb21Eb20oZG9tLCBwYXRoKSB7XG4gIHBhdGggPSBwYXRoIHx8IFwiXCI7XG4gIHZhciBpLCBjaGlsZCwgY2hpbGRyZW4gPSBbXSwgYXR0cnMgPSB7fSwgcmVuZGVyZXIgPSAnJztcbiAgaWYoZG9tLmF0dHJpYnV0ZXMpIHtcbiAgICBmb3IoaT0wOyBpIDwgZG9tLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBhdHRyID0gZG9tLmF0dHJpYnV0ZXNbaV07XG4gICAgICBhdHRyc1thdHRyLm5hbWVdID0gYXR0ci52YWx1ZTtcbiAgICB9XG4gIH1cbiAgaWYoZG9tLmNoaWxkTm9kZXMpIHtcbiAgICBmb3IoaT0wOyBpIDwgZG9tLmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoaWxkID0gZG9tLmNoaWxkTm9kZXNbaV07XG4gICAgICBjaGlsZHJlbi5wdXNoKGluaXRpYWxSZW5kZXJGcm9tRG9tKGNoaWxkLCBwYXRoICsgJy4nICsgaSkpO1xuICAgIH1cbiAgfVxuICBpZihkb20udGV4dENvbnRlbnQpIHtcbiAgICByZW5kZXJlciA9IGRvbS50ZXh0Q29udGVudDtcbiAgfVxuICB2YXIgcm4gPSBuZXcgUmVuZGVyZWROb2RlKFxuICAgIHtub2RlTmFtZTogZG9tLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCksIG5vZGU6ZG9tfSxcbiAgICB1bmRlZmluZWQsXG4gICAgcmVuZGVyZXIsXG4gICAgcGF0aCk7XG4gIHJuLmF0dHJzID0gYXR0cnM7XG4gIHJuLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gIHJldHVybiBybjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFJlbmRlcmVkTm9kZTpSZW5kZXJlZE5vZGUsXG4gIGluaXRpYWxSZW5kZXJGcm9tRG9tOmluaXRpYWxSZW5kZXJGcm9tRG9tLFxuICBhcHBseURpZmY6YXBwbHlEaWZmLFxuICBhdHRyaWJ1dGVzRGlmZjphdHRyaWJ1dGVzRGlmZixcbiAgZGlmZkNvc3Q6ZGlmZkNvc3QsXG4gIGdldERvbTpnZXREb20sXG4gIGhhbmRpY2FwOjFcbn07IiwiXG5cInVzZSBzdHJpY3RcIjtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKTtcbnZhciBleHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJyk7XG5cbnZhciB0ZW1wbGF0ZUNhY2hlID0ge307XG52YXIgY29tcG9uZW50Q2FjaGUgPSB7fTtcbi8vIGEgbmFtZSBoZXJlIGlzIGFsc28gYW55IHZhbGlkIEpTIG9iamVjdCBwcm9wZXJ0eVxudmFyIFZBUk5BTUVfUkVHID0gL15bYS16QS1aXyRdWzAtOWEtekEtWl8kXSovO1xudmFyIEhUTUxfQVRUUl9SRUcgPSAvXltBLVphLXpdW1xcdy1dezAsfS87XG52YXIgRE9VQkxFX1FVT1RFRF9TVFJJTkdfUkVHID0gL15cIihcXFxcXCJ8W15cIl0pKlwiLztcblxuZnVuY3Rpb24gQ29tcG9uZW50KG5hbWUsIHRwbCwgY29udHJvbGxlcikge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQ29tcG9uZW50KSB7XG4gICAgcmV0dXJuIG5ldyBDb21wb25lbnQobmFtZSwgdHBsLCBjb250cm9sbGVyKTtcbiAgfVxuICBpZihjb21wb25lbnRDYWNoZVtuYW1lXSkge1xuICAgIHV0aWwuQ29tcGlsZUVycm9yKFwiQ29tcG9uZW50IHdpdGggbmFtZSBcIiArIG5hbWUgKyBcIiBhbHJlYWR5IGV4aXN0XCIpO1xuICB9XG4gIGNvbXBvbmVudENhY2hlW25hbWVdID0gdGhpcztcbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy50ZW1wbGF0ZSA9IGxpa2VseS5UZW1wbGF0ZSh0cGwpO1xuICB0aGlzLmNvbnRyb2xsZXIgPSBjb250cm9sbGVyO1xufVxuXG5mdW5jdGlvbiBDb250ZXh0TmFtZShuYW1lKSB7XG4gIHRoaXMuYml0cyA9IG5hbWUuc3BsaXQoJy4nKTtcbn1cblxuQ29udGV4dE5hbWUucHJvdG90eXBlLnN1YnN0aXR1dGVBbGlhcyA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgaWYoY29udGV4dC5hbGlhc2VzLmhhc093blByb3BlcnR5KHRoaXMuYml0c1swXSkpIHtcbiAgICB2YXIgbmV3Qml0cyA9IGNvbnRleHQuYWxpYXNlc1t0aGlzLmJpdHNbMF1dLnNwbGl0KCcuJyk7XG4gICAgdGhpcy5iaXRzLnNoaWZ0KCk7XG4gICAgdGhpcy5iaXRzID0gbmV3Qml0cy5jb25jYXQodGhpcy5iaXRzKTtcbiAgfVxufTtcblxuQ29udGV4dE5hbWUucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmJpdHNbMF07XG59O1xuXG5Db250ZXh0TmFtZS5wcm90b3R5cGUuc3RyID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmJpdHMuam9pbignLicpO1xufTtcblxuZnVuY3Rpb24gQ29udGV4dChkYXRhLCBwYXJlbnQpIHtcbiAgaWYgKHRoaXMuY29uc3RydWN0b3IgIT09IENvbnRleHQpIHtcbiAgICByZXR1cm4gbmV3IENvbnRleHQoZGF0YSwgcGFyZW50KTtcbiAgfVxuICB0aGlzLmRhdGEgPSBkYXRhO1xuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5hbGlhc2VzID0ge307XG4gIHRoaXMud2F0Y2hpbmcgPSB7fTtcbn1cblxuQ29udGV4dC5wcm90b3R5cGUuYWRkQWxpYXMgPSBmdW5jdGlvbihzb3VyY2VOYW1lLCBhbGlhc05hbWUpIHtcbiAgLy8gc291cmNlIG5hbWUgY2FuIGJlICduYW1lJyBvciAnbGlzdC5rZXknXG4gIGlmKHNvdXJjZU5hbWUgPT09IGFsaWFzTmFtZSkge1xuICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkFsaWFzIHdpdGggdGhlIG5hbWUgXCIgKyBhbGlhc05hbWUgKyBcIiBhbHJlYWR5IHByZXNlbnQgaW4gdGhpcyBjb250ZXh0LlwiKTtcbiAgfVxuICB0aGlzLmFsaWFzZXNbYWxpYXNOYW1lXSA9IHNvdXJjZU5hbWU7XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5yZXNvbHZlTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgLy8gZ2l2ZW4gYSBuYW1lLCByZXR1cm4gdGhlIFtDb250ZXh0LCByZXNvbHZlZCBwYXRoLCB2YWx1ZV0gd2hlblxuICAvLyB0aGlzIG5hbWUgaXMgZm91bmQgb3IgdW5kZWZpbmVkIG90aGVyd2lzZVxuICBuYW1lLnN1YnN0aXR1dGVBbGlhcyh0aGlzKTtcblxuICBpZih0aGlzLmRhdGEuaGFzT3duUHJvcGVydHkobmFtZS5zdGFydCgpKSkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuZGF0YVtuYW1lLnN0YXJ0KCldO1xuICAgIHZhciBpID0gMTtcbiAgICB3aGlsZShpIDwgbmFtZS5iaXRzLmxlbmd0aCkge1xuICAgICAgaWYoIXZhbHVlLmhhc093blByb3BlcnR5KG5hbWUuYml0c1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdmFsdWVbbmFtZS5iaXRzW2ldXTtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgcmV0dXJuIFt0aGlzLCBuYW1lLnN0cigpLCB2YWx1ZV07XG4gIH1cblxuICBpZih0aGlzLnBhcmVudCkge1xuICAgIHJldHVybiB0aGlzLnBhcmVudC5yZXNvbHZlTmFtZShuYW1lKTtcbiAgfVxuXG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5nZXROYW1lUGF0aCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHJlc29sdmVkID0gdGhpcy5yZXNvbHZlTmFtZShuZXcgQ29udGV4dE5hbWUobmFtZSkpO1xuICBpZihyZXNvbHZlZCkge1xuICAgIHJldHVybiByZXNvbHZlZFsxXTtcbiAgfVxufTtcblxuQ29udGV4dC5wcm90b3R5cGUud2F0Y2ggPSBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICB0aGlzLndhdGNoaW5nW25hbWVdID0gY2FsbGJhY2s7XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZU5hbWUobmV3IENvbnRleHROYW1lKG5hbWUpKTtcbiAgaWYocmVzb2x2ZWQpIHtcbiAgICByZXR1cm4gcmVzb2x2ZWRbMl07XG4gIH1cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHRoaXMuX21vZGlmeShuZXcgQ29udGV4dE5hbWUobmFtZSksIHZhbHVlKTtcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLl9tb2RpZnkgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuXG4gIGlmKHRoaXMud2F0Y2hpbmcuaGFzT3duUHJvcGVydHkobmFtZS5zdHIoKSkpIHtcbiAgICB0aGlzLndhdGNoaW5nW25hbWUuc3RyKCldKHZhbHVlKTtcbiAgfVxuXG4gIG5hbWUuc3Vic3RpdHV0ZUFsaWFzKHRoaXMpO1xuXG4gIC8vIHdlIGdvIGluIGZvciBhIHNlYXJjaCBpZiB0aGUgZmlyc3QgcGFydCBtYXRjaGVzXG4gIGlmKHRoaXMuZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lLnN0YXJ0KCkpKSB7XG4gICAgdmFyIGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlKGkgPCBuYW1lLmJpdHMubGVuZ3RoIC0gMSkge1xuICAgICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkobmFtZS5iaXRzW2ldKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgZGF0YSA9IGRhdGFbbmFtZS5iaXRzW2ldXTtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgZGF0YVtuYW1lLmJpdHNbaV1dID0gdmFsdWU7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgLy8gZGF0YSBub3QgZm91bmQsIGxldCdzIHNlYXJjaCBpbiB0aGUgcGFyZW50XG4gIGlmKHRoaXMucGFyZW50KSB7XG4gICAgcmV0dXJuIHRoaXMucGFyZW50Ll9tb2RpZnkobmFtZSwgdmFsdWUpO1xuICB9XG5cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHRoaXMuZGF0YVtuYW1lXSA9IHZhbHVlO1xufTtcblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGVzKHYsIG5vZGUpIHtcbiAgdmFyIGF0dHJzID0ge30sIG4sIHM7XG4gIHdoaWxlKHYpIHtcbiAgICAgIHYgPSB1dGlsLnRyaW0odik7XG4gICAgICBuID0gdi5tYXRjaChIVE1MX0FUVFJfUkVHKTtcbiAgICAgIGlmKCFuKSB7XG4gICAgICAgIG5vZGUuY2Vycm9yKFwicGFyc2VBdHRyaWJ1dGVzOiBObyBhdHRyaWJ1dGUgbmFtZSBmb3VuZCBpbiBcIit2KTtcbiAgICAgIH1cbiAgICAgIHYgPSB2LnN1YnN0cihuWzBdLmxlbmd0aCk7XG4gICAgICBuID0gblswXTtcbiAgICAgIGlmKHZbMF0gIT0gXCI9XCIpIHtcbiAgICAgICAgbm9kZS5jZXJyb3IoXCJwYXJzZUF0dHJpYnV0ZXM6IE5vIGVxdWFsIHNpZ24gYWZ0ZXIgbmFtZSBcIituKTtcbiAgICAgIH1cbiAgICAgIHYgPSB2LnN1YnN0cigxKTtcbiAgICAgIHMgPSB2Lm1hdGNoKERPVUJMRV9RVU9URURfU1RSSU5HX1JFRyk7XG4gICAgICBpZihzKSB7XG4gICAgICAgIGF0dHJzW25dID0gbmV3IFN0cmluZ05vZGUobnVsbCwgc1swXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzID0gdi5tYXRjaChleHByZXNzaW9uLkVYUFJFU1NJT05fUkVHKTtcbiAgICAgICAgaWYocyA9PT0gbnVsbCkge1xuICAgICAgICAgIG5vZGUuY2Vycm9yKFwicGFyc2VBdHRyaWJ1dGVzOiBObyBzdHJpbmcgb3IgZXhwcmVzc2lvbiBmb3VuZCBhZnRlciBuYW1lIFwiK24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBleHByID0gZXhwcmVzc2lvbi5qc0V4cHJlc3Npb24oc1sxXSk7XG4gICAgICAgICAgYXR0cnNbbl0gPSBleHByO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2ID0gdi5zdWJzdHIoc1swXS5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBhdHRycztcbn1cblxuLy8gYWxsIHRoZSBhdmFpbGFibGUgdGVtcGxhdGUgbm9kZVxuXG5mdW5jdGlvbiBOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgdGhpcy5saW5lID0gbGluZTtcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuY29udGVudCA9IGNvbnRlbnQ7XG4gIHRoaXMubGV2ZWwgPSBsZXZlbDtcbiAgdGhpcy5jaGlsZHJlbiA9IFtdO1xufVxuXG5Ob2RlLnByb3RvdHlwZS5yZXByID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGlmKGxldmVsID09PSB1bmRlZmluZWQpIHtcbiAgICBsZXZlbCA9IDA7XG4gIH1cbiAgZm9yKGk9MDsgaTxsZXZlbDsgaSsrKSB7XG4gICAgc3RyICs9IFwiICBcIjtcbiAgfVxuICBzdHIgKz0gU3RyaW5nKHRoaXMpICsgXCJcXHJcXG5cIjtcbiAgZm9yKGk9MDsgaTx0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgc3RyICs9IHRoaXMuY2hpbGRyZW5baV0ucmVwcihsZXZlbCArIDEpO1xuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIGlmKHBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHBhdGggPSAnJztcbiAgICBwb3MgPSAwO1xuICAgIHRoaXMuaXNSb290ID0gdHJ1ZTtcbiAgfVxuICB2YXIgdCA9IG5ldyByZW5kZXIuUmVuZGVyZWROb2RlKHRoaXMsIGNvbnRleHQsICcnLCBwYXRoKTtcbiAgdC5jaGlsZHJlbiA9IHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gIHJldHVybiB0O1xufTtcblxuTm9kZS5wcm90b3R5cGUuY2Vycm9yID0gZnVuY3Rpb24obXNnKSB7XG4gIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcih0aGlzLnRvU3RyaW5nKCkgKyBcIjogXCIgKyBtc2cpO1xufTtcblxuTm9kZS5wcm90b3R5cGUuZG9tTm9kZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gW107XG59O1xuXG5Ob2RlLnByb3RvdHlwZS50cmVlQ2hpbGRyZW4gPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBbXSwgaSwgcCwgaiwgY2hpbGRyZW4gPSBudWxsLCBjaGlsZCA9IG51bGw7XG4gIGogPSBwb3M7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHAgPSBwYXRoO1xuICAgIGNoaWxkID0gdGhpcy5jaGlsZHJlbltpXTtcbiAgICBpZihjaGlsZC5oYXNPd25Qcm9wZXJ0eSgnbm9kZU5hbWUnKSkge1xuICAgICAgcCArPSAnLicgKyBqO1xuICAgICAgaisrO1xuICAgICAgY2hpbGRyZW4gPSBjaGlsZC50cmVlKGNvbnRleHQsIHAsIDApO1xuICAgICAgdC5wdXNoKGNoaWxkcmVuKTtcbiAgICB9IGVsc2UgaWYgKCFjaGlsZC5yZW5kZXJFeGxjdWRlZCkge1xuICAgICAgY2hpbGRyZW4gPSBjaGlsZC50cmVlKGNvbnRleHQsIHAsIGopO1xuICAgICAgaWYoY2hpbGRyZW4pIHtcbiAgICAgICAgdCA9IHQuY29uY2F0KGNoaWxkcmVuKTtcbiAgICAgICAgaiArPSBjaGlsZHJlbi5sZW5ndGg7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0O1xufTtcblxuTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbihjaGlsZCkge1xuICB0aGlzLmNoaWxkcmVuLnB1c2goY2hpbGQpO1xufTtcblxuTm9kZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZSArIFwiKFwiK3RoaXMuY29udGVudC5yZXBsYWNlKFwiXFxuXCIsIFwiXCIpK1wiKSBhdCBsaW5lIFwiICsgdGhpcy5saW5lO1xufTtcblxuZnVuY3Rpb24gQ29tbWVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHBhcmVudC5jaGlsZHJlbi5wdXNoKHRoaXMpO1xuICB0aGlzLnJlbmRlckV4bGN1ZGVkID0gdHJ1ZTtcbn1cbnV0aWwuaW5oZXJpdHMoQ29tbWVudE5vZGUsIE5vZGUpO1xuXG5mdW5jdGlvbiBIdG1sTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5ub2RlTmFtZSA9IHRoaXMuY29udGVudC5zcGxpdChcIiBcIilbMF07XG4gIHRoaXMuYXR0cnMgPSBwYXJzZUF0dHJpYnV0ZXModGhpcy5jb250ZW50LnN1YnN0cih0aGlzLm5vZGVOYW1lLmxlbmd0aCksIHRoaXMpO1xuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEh0bWxOb2RlLCBOb2RlKTtcblxuSHRtbE5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoLCBwb3MpIHtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCB0aGlzLm5vZGVOYW1lLCBwYXRoKTtcbiAgdC5hdHRycyA9IHRoaXMucmVuZGVyQXR0cmlidXRlcyhjb250ZXh0LCBwYXRoKTtcbiAgdC5jaGlsZHJlbiA9IHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gIHJldHVybiB0O1xufTtcblxuZnVuY3Rpb24gYmluZGluZ05hbWUobm9kZSkge1xuICBpZihub2RlLmJpbmRpbmcpIHtcbiAgICByZXR1cm4gbm9kZS5iaW5kaW5nO1xuICB9XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlKGl0ZW0sIGNvbnRleHQpIHtcbiAgaWYodHlwZW9mIGl0ZW0gPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcmV0dXJuIGl0ZW0oY29udGV4dCk7XG4gIH1cbiAgaWYoaXRlbS5ldmFsdWF0ZSkge1xuICAgICAgcmV0dXJuIGl0ZW0uZXZhbHVhdGUoY29udGV4dCk7XG4gIH1cbiAgcmV0dXJuIGl0ZW07XG59XG5cbkh0bWxOb2RlLnByb3RvdHlwZS5yZW5kZXJBdHRyaWJ1dGVzID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICB2YXIgcl9hdHRycyA9IHt9LCBrZXksIGF0dHIsIG5hbWU7XG4gIGZvcihrZXkgaW4gdGhpcy5hdHRycykge1xuICAgIGF0dHIgPSB0aGlzLmF0dHJzW2tleV07XG4gICAgLy8gdG9kbywgZmluZCBhIGJldHRlciB3YXkgdG8gZGlzY3JpbWluYXRlIGV2ZW50c1xuICAgIGlmKGtleS5pbmRleE9mKFwibGstXCIpID09PSAwKSB7XG4gICAgICAvLyBhZGQgdGhlIHBhdGggdG8gdGhlIHJlbmRlciBub2RlIHRvIGFueSBsay10aGluZyBub2RlXG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgICAgaWYoa2V5ID09PSAnbGstYmluZCcpIHtcbiAgICAgICAgcl9hdHRyc1trZXldID0gZXZhbHVhdGUoYXR0ciwgY29udGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByX2F0dHJzW2tleV0gPSBcInRydWVcIjtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciB2ID0gZXZhbHVhdGUoYXR0ciwgY29udGV4dCk7XG5cbiAgICBpZih2ID09PSBmYWxzZSkge1xuICAgICAgLy8gbm90aGluZ1xuICAgIH0gZWxzZSB7XG4gICAgICByX2F0dHJzW2tleV0gPSB2O1xuICAgIH1cbiAgfVxuXG4gIGlmKFwiaW5wdXQsc2VsZWN0LHRleHRhcmVhXCIuaW5kZXhPZih0aGlzLm5vZGVOYW1lKSAhPSAtMSAmJiB0aGlzLmF0dHJzLmhhc093blByb3BlcnR5KCd2YWx1ZScpKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnMudmFsdWU7XG4gICAgbmFtZSA9IGJpbmRpbmdOYW1lKGF0dHIpO1xuICAgIGlmKG5hbWUgJiYgdGhpcy5hdHRyc1snbGstYmluZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJfYXR0cnNbJ2xrLWJpbmQnXSA9IG5hbWU7XG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgIH1cbiAgfVxuICBpZih0aGlzLm5vZGVOYW1lID09IFwidGV4dGFyZWFcIiAmJiB0aGlzLmNoaWxkcmVuLmxlbmd0aCA9PSAxICYmIHRoaXMuY2hpbGRyZW5bMF0uZXhwcmVzc2lvbikge1xuICAgIG5hbWUgPSBiaW5kaW5nTmFtZSh0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24pO1xuICAgIGlmKG5hbWUgJiYgdGhpcy5hdHRyc1snbGstYmluZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJfYXR0cnNbJ2xrLWJpbmQnXSA9IG5hbWU7XG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgICAgLy8gYXMgc29vbiBhcyB0aGUgdXNlciBoYXMgYWx0ZXJlZCB0aGUgdmFsdWUgb2YgdGhlIHRleHRhcmVhIG9yIHNjcmlwdCBoYXMgYWx0ZXJlZFxuICAgICAgLy8gdGhlIHZhbHVlIHByb3BlcnR5IG9mIHRoZSB0ZXh0YXJlYSwgdGhlIHRleHQgbm9kZSBpcyBvdXQgb2YgdGhlIHBpY3R1cmUgYW5kIGlzIG5vXG4gICAgICAvLyBsb25nZXIgYm91bmQgdG8gdGhlIHRleHRhcmVhJ3MgdmFsdWUgaW4gYW55IHdheS5cbiAgICAgIHJfYXR0cnMudmFsdWUgPSB0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24oY29udGV4dCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByX2F0dHJzO1xufTtcblxuSHRtbE5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0aGlzLm5vZGVOYW1lKSwga2V5LCBhdHRycz10aGlzLnJlbmRlckF0dHJpYnV0ZXMoY29udGV4dCwgcGF0aCk7XG4gIGZvcihrZXkgaW4gYXR0cnMpIHtcbiAgICBub2RlLnNldEF0dHJpYnV0ZShrZXksIGF0dHJzW2tleV0pO1xuICB9XG4gIHJldHVybiBub2RlO1xufTtcblxuZnVuY3Rpb24gRm9yTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIC8vIHN5bnRheDogZm9yIGtleSwgdmFsdWUgaW4gbGlzdFxuICAvLyAgICAgICAgIGZvciB2YWx1ZSBpbiBsaXN0XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdmFyIHZhcjEsIHZhcjIsIHNvdXJjZU5hbWU7XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoNCkpO1xuICB2YXIxID0gY29udGVudC5tYXRjaChWQVJOQU1FX1JFRyk7XG4gIGlmKCF2YXIxKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJmaXJzdCB2YXJpYWJsZSBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cih2YXIxWzBdLmxlbmd0aCkpO1xuICBpZihjb250ZW50WzBdID09ICcsJykge1xuICAgIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoMSkpO1xuICAgIHZhcjIgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgICBpZighdmFyMikge1xuICAgICAgdGhpcy5jZXJyb3IoXCJzZWNvbmQgdmFyaWFibGUgYWZ0ZXIgY29tbWEgaXMgbWlzc2luZ1wiKTtcbiAgICB9XG4gICAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cih2YXIyWzBdLmxlbmd0aCkpO1xuICB9XG4gIGlmKCFjb250ZW50Lm1hdGNoKC9eaW4vKSkge1xuICAgIHRoaXMuY2Vycm9yKFwiaW4ga2V5d29yZCBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoMikpO1xuICBzb3VyY2VOYW1lID0gY29udGVudC5tYXRjaChleHByZXNzaW9uLm5hbWVSZWcpO1xuICBpZighc291cmNlTmFtZSkge1xuICAgIHRoaXMuY2Vycm9yKFwiaXRlcmFibGUgbmFtZSBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIHRoaXMuc291cmNlTmFtZSA9IHNvdXJjZU5hbWVbMF07XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoc291cmNlTmFtZVswXS5sZW5ndGgpKTtcbiAgaWYoY29udGVudCAhPT0gXCJcIikge1xuICAgIHRoaXMuY2Vycm9yKFwibGVmdCBvdmVyIHVucGFyc2FibGUgY29udGVudDogXCIgKyBjb250ZW50KTtcbiAgfVxuXG4gIGlmKHZhcjEgJiYgdmFyMikge1xuICAgIHRoaXMuaW5kZXhOYW1lID0gdmFyMTtcbiAgICB0aGlzLmFsaWFzID0gdmFyMlswXTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmFsaWFzID0gdmFyMVswXTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEZvck5vZGUsIE5vZGUpO1xuXG5Gb3JOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gW10sIGtleTtcbiAgdmFyIGQgPSBjb250ZXh0LmdldCh0aGlzLnNvdXJjZU5hbWUpO1xuICBpZighZCkge1xuICAgIHJldHVybiB0O1xuICB9XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZCksIGk7XG4gIGZvcihpID0gMDsgaTxrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICB2YXIgbmV3X2RhdGEgPSB7fTtcbiAgICAvLyBhZGQgdGhlIGtleSB0byBhY2Nlc3MgdGhlIGNvbnRleHQncyBkYXRhXG4gICAgaWYodGhpcy5pbmRleE5hbWUpIHtcbiAgICAgIG5ld19kYXRhW3RoaXMuaW5kZXhOYW1lXSA9IGtleTtcbiAgICB9XG4gICAgdmFyIG5ld19jb250ZXh0ID0gbmV3IENvbnRleHQobmV3X2RhdGEsIGNvbnRleHQpO1xuICAgIC8vIGtlZXAgdHJhY2sgb2Ygd2hlcmUgdGhlIGRhdGEgaXMgY29taW5nIGZyb21cbiAgICBuZXdfY29udGV4dC5hZGRBbGlhcyh0aGlzLnNvdXJjZU5hbWUgKyAnLicgKyBrZXksIHRoaXMuYWxpYXMpO1xuICAgIHQgPSB0LmNvbmNhdCh0aGlzLnRyZWVDaGlsZHJlbihuZXdfY29udGV4dCwgcGF0aCwgdC5sZW5ndGggKyBwb3MpKTtcbiAgfVxuICByZXR1cm4gdDtcbn07XG5cbmZ1bmN0aW9uIElmTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5qc0V4cHJlc3Npb24oY29udGVudC5yZXBsYWNlKC9eaWYvZywgXCJcIikpO1xuICBwYXJlbnQuY2hpbGRyZW4ucHVzaCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSWZOb2RlLCBOb2RlKTtcblxuSWZOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIGlmKCF0aGlzLmV4cHJlc3Npb24oY29udGV4dCkpIHtcbiAgICBpZih0aGlzLmVsc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmVsc2UudHJlZShjb250ZXh0LCBwYXRoLCBwb3MpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cbiAgcmV0dXJuIHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5mdW5jdGlvbiBFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lLCBjdXJyZW50Tm9kZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMuc2VhcmNoSWYoY3VycmVudE5vZGUpO1xufVxudXRpbC5pbmhlcml0cyhFbHNlTm9kZSwgTm9kZSk7XG5cbkVsc2VOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHJldHVybiB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gSWZFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lLCBjdXJyZW50Tm9kZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uanNFeHByZXNzaW9uKGNvbnRlbnQucmVwbGFjZSgvXmVsc2VpZi9nLCBcIlwiKSk7XG4gIHRoaXMuc2VhcmNoSWYoY3VycmVudE5vZGUpO1xufVxuLy8gaW1wb3J0YW50IHRvIGJlIGFuIElmTm9kZVxudXRpbC5pbmhlcml0cyhJZkVsc2VOb2RlLCBJZk5vZGUpO1xuXG5JZkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZiA9IGZ1bmN0aW9uIHNlYXJjaElmKGN1cnJlbnROb2RlKSB7XG4gIC8vIGZpcnN0IG5vZGUgb24gdGhlIHNhbWUgbGV2ZWwgaGFzIHRvIGJlIHRoZSBpZi9lbHNlaWYgbm9kZVxuICB3aGlsZShjdXJyZW50Tm9kZSkge1xuICAgIGlmKGN1cnJlbnROb2RlLmxldmVsIDwgdGhpcy5sZXZlbCkge1xuICAgICAgdGhpcy5jZXJyb3IoXCJjYW5ub3QgZmluZCBhIGNvcnJlc3BvbmRpbmcgaWYtbGlrZSBzdGF0ZW1lbnQgYXQgdGhlIHNhbWUgbGV2ZWwuXCIpO1xuICAgIH1cbiAgICBpZihjdXJyZW50Tm9kZS5sZXZlbCA9PSB0aGlzLmxldmVsKSB7XG4gICAgICBpZighKGN1cnJlbnROb2RlIGluc3RhbmNlb2YgSWZOb2RlKSkge1xuICAgICAgICB0aGlzLmNlcnJvcihcImF0IHRoZSBzYW1lIGxldmVsIGlzIG5vdCBhIGlmLWxpa2Ugc3RhdGVtZW50LlwiKTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnROb2RlLmVsc2UgPSB0aGlzO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUucGFyZW50O1xuICB9XG59O1xuRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmID0gSWZFbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWY7XG5cbmZ1bmN0aW9uIEV4cHJlc3Npb25Ob2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gXCIjdGV4dFwiO1xuICB2YXIgbSA9IGNvbnRlbnQubWF0Y2goZXhwcmVzc2lvbi5FWFBSRVNTSU9OX1JFRyk7XG4gIGlmKCFtKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJkZWNsYXJlZCBpbXByb3Blcmx5XCIpO1xuICB9XG4gIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uanNFeHByZXNzaW9uKG1bMV0pO1xuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEV4cHJlc3Npb25Ob2RlLCBOb2RlKTtcblxuRXhwcmVzc2lvbk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIC8vIHJlbmRlcmVyXG4gIHZhciByZW5kZXJlciA9IFN0cmluZyhldmFsdWF0ZSh0aGlzLmV4cHJlc3Npb24sIGNvbnRleHQpKTtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCk7XG4gIHJldHVybiB0O1xufTtcblxuRXhwcmVzc2lvbk5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShldmFsdWF0ZSh0aGlzLmV4cHJlc3Npb24sIGNvbnRleHQpKTtcbn07XG5cbmZ1bmN0aW9uIFN0cmluZ05vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubm9kZU5hbWUgPSBcIiN0ZXh0XCI7XG4gIHRoaXMuc3RyaW5nID0gdGhpcy5jb250ZW50LnJlcGxhY2UoL15cInxcIiQvZywgXCJcIikucmVwbGFjZSgvXFxcXFwiL2csICdcIicsICdnbScpO1xuICB0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uY29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyh0aGlzLnN0cmluZyk7XG4gIGlmKHBhcmVudCkge1xuICAgIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbiAgfVxufVxudXRpbC5pbmhlcml0cyhTdHJpbmdOb2RlLCBOb2RlKTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgLy8gcmVuZGVyZXIgc2hvdWxkIGJlIGFsbCBhdHRyaWJ1dGVzXG4gIHZhciByZW5kZXJlciA9IGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCk7XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgcmVuZGVyZXIsIHBhdGgpO1xuICByZXR1cm4gdDtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KTtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpKTtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24oY2hpbGQpIHtcbiAgdGhpcy5jZXJyb3IoXCJjYW5ub3QgaGF2ZSBjaGlsZHJlbiBcIiArIGNoaWxkKTtcbn07XG5cbmZ1bmN0aW9uIEluY2x1ZGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5hbWUgPSB1dGlsLnRyaW0oY29udGVudC5zcGxpdChcIiBcIilbMV0pO1xuICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZVt0aGlzLm5hbWVdO1xuICBpZih0aGlzLnRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLmNlcnJvcihcIlRlbXBsYXRlIHdpdGggbmFtZSBcIiArIHRoaXMubmFtZSArIFwiIGlzIG5vdCByZWdpc3RlcmVkXCIpO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSW5jbHVkZU5vZGUsIE5vZGUpO1xuXG5JbmNsdWRlTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZS50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIENvbXBvbmVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudCkuc3Vic3RyKDEwKTtcbiAgdmFyIG5hbWUgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgaWYoIW5hbWUpIHtcbiAgICB0aGlzLmNlcnJvcihcIkNvbXBvbmVudCBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cihuYW1lWzBdLmxlbmd0aCkpO1xuICB0aGlzLm5hbWUgPSBuYW1lWzBdO1xuICB0aGlzLmF0dHJzID0gcGFyc2VBdHRyaWJ1dGVzKGNvbnRlbnQsIHRoaXMpO1xuICB0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudENhY2hlW3RoaXMubmFtZV07XG4gIGlmKHRoaXMuY29tcG9uZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLmNlcnJvcihcIkNvbXBvbmVudCB3aXRoIG5hbWUgXCIgKyB0aGlzLm5hbWUgKyBcIiBpcyBub3QgcmVnaXN0ZXJlZFwiKTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKENvbXBvbmVudE5vZGUsIE5vZGUpO1xuXG5Db21wb25lbnROb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciBuZXdfY29udGV4dCA9IG5ldyBDb250ZXh0KHt9LCBjb250ZXh0KTtcbiAgdmFyIGtleSwgYXR0ciwgdmFsdWUsIHNvdXJjZTtcbiAgZm9yKGtleSBpbiB0aGlzLmF0dHJzKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnNba2V5XTtcbiAgICB2YWx1ZSA9IGV2YWx1YXRlKGF0dHIsIGNvbnRleHQpO1xuICAgIG5ld19jb250ZXh0LnNldChrZXksIHZhbHVlKTtcbiAgICBpZih0eXBlb2YgYXR0ciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBzb3VyY2UgPSBiaW5kaW5nTmFtZShhdHRyKTtcbiAgICAgIGlmKHNvdXJjZSAmJiBrZXkgIT0gc291cmNlKSB7XG4gICAgICAgIG5ld19jb250ZXh0LmFkZEFsaWFzKHNvdXJjZSwga2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYodGhpcy5jb21wb25lbnQuY29udHJvbGxlcil7XG4gICAgdGhpcy5jb21wb25lbnQuY29udHJvbGxlcihuZXdfY29udGV4dCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuY29tcG9uZW50LnRlbXBsYXRlLnRyZWVDaGlsZHJlbihuZXdfY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbkNvbXBvbmVudE5vZGUucHJvdG90eXBlLnJlcHIgPSBmdW5jdGlvbihsZXZlbCkge1xuICByZXR1cm4gdGhpcy5jb21wb25lbnQudGVtcGxhdGUucmVwcihsZXZlbCArIDEpO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lLCBjdXJyZW50Tm9kZSkge1xuICB2YXIgbm9kZTtcbiAgaWYoY29udGVudC5sZW5ndGggPT09IDApIHtcbiAgICBub2RlID0gbmV3IFN0cmluZ05vZGUocGFyZW50LCBcIlxcblwiLCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignIycpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBDb21tZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdpZiAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgSWZOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2Vsc2VpZiAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgSWZFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEsIGN1cnJlbnROb2RlKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignZWxzZScpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEsIGN1cnJlbnROb2RlKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignZm9yICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBGb3JOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2luY2x1ZGUgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEluY2x1ZGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2NvbXBvbmVudCAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgQ29tcG9uZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdcIicpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBTdHJpbmdOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZigvXlxcdy8uZXhlYyhjb250ZW50KSkge1xuICAgIG5vZGUgPSBuZXcgSHRtbE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZigne3snKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRXhwcmVzc2lvbk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJjcmVhdGVOb2RlOiB1bmtub3cgbm9kZSB0eXBlIFwiICsgY29udGVudCk7XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkVGVtcGxhdGUodHBsLCB0ZW1wbGF0ZU5hbWUpIHtcblxuICAvLyBhbHJlYWR5IGEgdGVtcGxhdGU/XG4gIGlmKHRwbCBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICByZXR1cm4gdHBsO1xuICB9XG5cbiAgaWYodHBsIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICB0cGwgPSB0cGwuam9pbignXFxuJyk7XG4gIH1cblxuICB2YXIgcm9vdCA9IG5ldyBOb2RlKG51bGwsIFwiXCIsIDApLCBsaW5lcywgbGluZSwgbGV2ZWwsXG4gICAgY29udGVudCwgaSwgY3VycmVudE5vZGUgPSByb290LCBwYXJlbnQsIHNlYXJjaE5vZGU7XG5cbiAgbGluZXMgPSB0cGwuc3BsaXQoXCJcXG5cIik7XG5cbiAgZm9yKGk9MDsgaTxsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGxpbmUgPSBsaW5lc1tpXTtcbiAgICBsZXZlbCA9IGxpbmUubWF0Y2goL1xccyovKVswXS5sZW5ndGggKyAxO1xuICAgIGNvbnRlbnQgPSBsaW5lLnNsaWNlKGxldmVsIC0gMSk7XG5cbiAgICAvLyBtdWx0aWxpbmUgc3VwcG9ydDogZW5kcyB3aXRoIGEgXFxcbiAgICB2YXIgaiA9IDA7XG4gICAgd2hpbGUoY29udGVudC5tYXRjaCgvXFxcXCQvKSkge1xuICAgICAgICBqKys7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1xcXFwkLywgJycpICsgbGluZXNbaStqXTtcbiAgICB9XG4gICAgaSA9IGkgKyBqO1xuXG4gICAgLy8gbXVsdGlsaW5lIHN0cmluZ3NcbiAgICBqID0gMDtcbiAgICBpZihjb250ZW50Lm1hdGNoKC9eXCJcIlwiLykpIHtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXlwiXCJcIi8sICdcIicpO1xuICAgICAgICB3aGlsZSghY29udGVudC5tYXRjaCgvXCJcIlwiJC8pKSB7XG4gICAgICAgICAgICBqKys7XG4gICAgICAgICAgICBpZihpK2ogPiBsaW5lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiTXVsdGlsaW5lIHN0cmluZyBzdGFydGVkIGJ1dCB1bmZpbmlzaGVkIGF0IGxpbmUgXCIgKyAoaSArIDEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50ICsgbGluZXNbaStqXTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cIlwiXCIkLywgJ1wiJyk7XG4gICAgfVxuICAgIGkgPSBpICsgajtcblxuICAgIHNlYXJjaE5vZGUgPSBjdXJyZW50Tm9kZTtcbiAgICBwYXJlbnQgPSBudWxsO1xuXG4gICAgLy8gc2VhcmNoIGZvciB0aGUgcGFyZW50IG5vZGVcbiAgICB3aGlsZSh0cnVlKSB7XG5cbiAgICAgIGlmKGxldmVsID4gc2VhcmNoTm9kZS5sZXZlbCkge1xuICAgICAgICBwYXJlbnQgPSBzZWFyY2hOb2RlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYoIXNlYXJjaE5vZGUucGFyZW50KSB7XG4gICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkluZGVudGF0aW9uIGVycm9yIGF0IGxpbmUgXCIgKyAoaSArIDEpKTtcbiAgICAgIH1cblxuICAgICAgaWYobGV2ZWwgPT0gc2VhcmNoTm9kZS5sZXZlbCkge1xuICAgICAgICBwYXJlbnQgPSBzZWFyY2hOb2RlLnBhcmVudDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIHNlYXJjaE5vZGUgPSBzZWFyY2hOb2RlLnBhcmVudDtcbiAgICB9XG5cbiAgICBpZihwYXJlbnQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICBpZihwYXJlbnQuY2hpbGRyZW5bMF0ubGV2ZWwgIT0gbGV2ZWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW5kZW50YXRpb24gZXJyb3IgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBub2RlID0gY3JlYXRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBpLCBjdXJyZW50Tm9kZSk7XG4gICAgY3VycmVudE5vZGUgPSBub2RlO1xuXG4gIH1cbiAgaWYodGVtcGxhdGVOYW1lKSB7XG4gICAgdGVtcGxhdGVDYWNoZVt0ZW1wbGF0ZU5hbWVdID0gcm9vdDtcbiAgfVxuXG4gIHJldHVybiByb290O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGRUZW1wbGF0ZTogYnVpbGRUZW1wbGF0ZSxcbiAgcGFyc2VBdHRyaWJ1dGVzOiBwYXJzZUF0dHJpYnV0ZXMsXG4gIENvbnRleHQ6IENvbnRleHQsXG4gIHRlbXBsYXRlQ2FjaGU6IHRlbXBsYXRlQ2FjaGUsXG4gIGNvbXBvbmVudENhY2hlOiBjb21wb25lbnRDYWNoZSxcbiAgQ29udGV4dE5hbWU6IENvbnRleHROYW1lLFxuICBDb21wb25lbnQ6IENvbXBvbmVudFxufTsiLCJcblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBpbmhlcml0cyhjaGlsZCwgcGFyZW50KSB7XG4gIGNoaWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUocGFyZW50LnByb3RvdHlwZSk7XG4gIGNoaWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGNoaWxkO1xufVxuXG5mdW5jdGlvbiBDb21waWxlRXJyb3IobXNnKSB7XG4gIHRoaXMubmFtZSA9IFwiQ29tcGlsZUVycm9yXCI7XG4gIHRoaXMubWVzc2FnZSA9IChtc2cgfHwgXCJcIik7XG59XG5Db21waWxlRXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBSdW50aW1lRXJyb3IobXNnKSB7XG4gIHRoaXMubmFtZSA9IFwiUnVudGltZUVycm9yXCI7XG4gIHRoaXMubWVzc2FnZSA9IChtc2cgfHwgXCJcIik7XG59XG5SdW50aW1lRXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBlc2NhcGUodW5zYWZlKSB7XG4gIHJldHVybiB1bnNhZmVcbiAgICAucmVwbGFjZSgvJi9nLCBcIiZhbXA7XCIpXG4gICAgLnJlcGxhY2UoLzwvZywgXCImbHQ7XCIpXG4gICAgLnJlcGxhY2UoLz4vZywgXCImZ3Q7XCIpXG4gICAgLnJlcGxhY2UoL1wiL2csIFwiJnF1b3Q7XCIpXG4gICAgLnJlcGxhY2UoLycvZywgXCImIzAzOTtcIik7XG59XG5cbmZ1bmN0aW9uIHRyaW0odHh0KSB7XG4gIHJldHVybiB0eHQucmVwbGFjZSgvXlxccyt8XFxzKyQvZyAsXCJcIik7XG59XG5cbmZ1bmN0aW9uIGV2ZW50KG5hbWUsIGRhdGEpIHtcbiAgdmFyIGV2dCA9IG5ldyBDdXN0b21FdmVudChuYW1lLCB7XG4gICAgYnViYmxlczogdHJ1ZSxcbiAgICBjYW5jZWxhYmxlOiBmYWxzZSxcbiAgICBkZXRhaWxzOiBkYXRhXG4gIH0pO1xuICByZXR1cm4gZXZ0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5oZXJpdHM6aW5oZXJpdHMsXG4gIENvbXBpbGVFcnJvcjpDb21waWxlRXJyb3IsXG4gIFJ1bnRpbWVFcnJvcjpSdW50aW1lRXJyb3IsXG4gIGVzY2FwZTplc2NhcGUsXG4gIHRyaW06dHJpbSxcbiAgZXZlbnQ6ZXZlbnRcbn07Il19
(2)
});
