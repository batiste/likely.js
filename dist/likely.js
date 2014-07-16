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

Binding.prototype.update = function(){
  // avoid 2 diffs at the same time
  // TODO: message or diff queue.
  if(!this.lock) {
    this.lock = true;
    this.diff();
    this.trigger('update');
  }
};

function Component(name, tpl, controller) {
  if (this.constructor !== Component) {
    return new Component(name, tpl, controller);
  }
  if(template.componentCache[name]) {
    util.CompileError("Component with name " + name + " already exist");
  }
  template.componentCache[name] = this;
  this.name = name;
  this.template = likely.Template(tpl);
  this.controller = controller;
}

module.exports = {
  Template:template.buildTemplate,
  ContextName:template.ContextName,
  updateData:updateData,
  Binding:Binding,
  Component:Component,
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
  var t = new render.RenderedNode(this, context, this.domNode(context, path), path);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9leHByZXNzaW9uLmpzIiwiL1VzZXJzL0JhdGlzdGUvUHJvamVjdHMvbGlrZWx5LmpzL2xpa2VseS5qcyIsIi9Vc2Vycy9CYXRpc3RlL1Byb2plY3RzL2xpa2VseS5qcy9yZW5kZXIuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvQmF0aXN0ZS9Qcm9qZWN0cy9saWtlbHkuanMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNycUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgRVhQUkVTU0lPTl9SRUcgPSAvXnt7KC4rPyl9fS87XG5cbmZ1bmN0aW9uIGNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnModHh0KSB7XG4gIC8vIGNvbXBpbGUgdGhlIGV4cHJlc3Npb25zIGZvdW5kIGluIHRoZSB0ZXh0XG4gIC8vIGFuZCByZXR1cm4gYSBsaXN0IG9mIHRleHQrZXhwcmVzc2lvblxuICB2YXIgZXhwciwgYXJvdW5kO1xuICB2YXIgbGlzdCA9IFtdO1xuICB3aGlsZSh0cnVlKSB7XG4gICAgdmFyIG1hdGNoID0gL3t7KC4rPyl9fS8uZXhlYyh0eHQpO1xuICAgIGlmKCFtYXRjaCkge1xuICAgICAgaWYodHh0KSB7XG4gICAgICAgIGxpc3QucHVzaCh0eHQpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGV4cHIgPSBqc0V4cHJlc3Npb24obWF0Y2hbMV0pO1xuICAgIGFyb3VuZCA9IHR4dC5zcGxpdChtYXRjaFswXSwgMik7XG4gICAgaWYoYXJvdW5kWzBdLmxlbmd0aCkge1xuICAgICAgbGlzdC5wdXNoKGFyb3VuZFswXSk7XG4gICAgfVxuICAgIGxpc3QucHVzaChleHByKTtcbiAgICB0eHQgPSBhcm91bmRbMV07XG4gIH1cbiAgcmV0dXJuIGxpc3Q7XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlRXhwcmVzc2lvbkxpc3QoZXhwcmVzc2lvbnMsIGNvbnRleHQpIHtcbiAgdmFyIHN0ciA9IFwiXCIsIGk7XG4gIGZvcihpPTA7IGk8ZXhwcmVzc2lvbnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGV4cHJlc3Npb25zW2ldO1xuICAgIGlmKHR5cGVvZiBpdGVtID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgc3RyICs9IGl0ZW0oY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSBpdGVtO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlT3V0T2ZTdHJpbmdzKHN0cikge1xuICB2YXIgaW5kZXggPSAwLCBsZW5ndGggPSBzdHIubGVuZ3RoLCBjaDtcbiAgdmFyIG5ld19zdHIgPSBcIlwiLCBpblN0cmluZyA9IG51bGwsIHN0YXJ0ID0gMDtcbiAgd2hpbGUoaW5kZXggPCBsZW5ndGgpIHtcbiAgICBjaCA9IHN0ci5jaGFyQXQoaW5kZXgpO1xuICAgIGlmKGNoID09PSAnXFxcXCcpIHtcbiAgICAgIGluZGV4ID0gaW5kZXggKyAyO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmKGNoID09PSAnXCInIHx8IGNoID09PSBcIidcIikge1xuICAgICAgLy8gY2xvc2luZyBhIHN0cmluZ1xuICAgICAgaWYoaW5TdHJpbmcgPT09IGNoKSB7XG4gICAgICAgIGluU3RyaW5nID0gbnVsbDtcbiAgICAgICAgbmV3X3N0ciA9IG5ld19zdHIgKyBzdHIuc2xpY2Uoc3RhcnQsIGluZGV4KTtcbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG9wZW5pbmcgYSBzdHJpbmdcbiAgICAgICAgbmV3X3N0ciA9IG5ld19zdHIgKyByZXBsYWNlTmFtZXMoc3RyLnNsaWNlKHN0YXJ0LCBpbmRleCkpO1xuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICBpblN0cmluZyA9IGNoO1xuICAgICAgfVxuICAgIH1cbiAgICBpbmRleCA9IGluZGV4ICsgMTtcbiAgfVxuICBuZXdfc3RyICs9IHJlcGxhY2VOYW1lcyhzdHIuc2xpY2Uoc3RhcnQsIGluZGV4KSk7XG4gIHJldHVybiBuZXdfc3RyO1xufVxuXG52YXIgbmFtZVJlZyA9IC9bYS16QS1aXyRdWzAtOWEtekEtWl8kXFwuXSovZ207XG5cbmZ1bmN0aW9uIHJlcGxhY2VOYW1lcyhzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKG5hbWVSZWcsIGZ1bmN0aW9uKF9uYW1lKSB7XG4gICAgaWYoIV9uYW1lLm1hdGNoKC9eY29udGV4dC8pKSB7XG4gICAgICByZXR1cm4gJ2NvbnRleHQuZ2V0KFwiJytfbmFtZSsnXCIpJztcbiAgICB9XG4gICAgcmV0dXJuIF9uYW1lO1xuICB9KTtcbn1cblxuZnVuY3Rpb24ganNFeHByZXNzaW9uKHNvdXJjZSkge1xuICB2YXIgaGFzTmFtZSA9IHNvdXJjZS5tYXRjaChuYW1lUmVnKTtcbiAgdmFyIG5ld1NvdXJjZSA9IHJlcGxhY2VPdXRPZlN0cmluZ3Moc291cmNlKTtcbiAgdmFyIGZjdCA9IG5ldyBGdW5jdGlvbignY29udGV4dCcsICdyZXR1cm4gJyArIG5ld1NvdXJjZSk7XG4gIC8vIG9ubHkgb25lIG5hbWU/IHRoaXMgaXMgYSBjYW5kaWRhdGUgZm9yIGRhdGEgYmluZGluZ1xuICBpZihoYXNOYW1lICYmIGhhc05hbWUubGVuZ3RoID09IDEgJiYgdXRpbC50cmltKHNvdXJjZSkgPT0gaGFzTmFtZVswXSkge1xuICAgIGZjdC5iaW5kaW5nID0gaGFzTmFtZVswXTtcbiAgfVxuICByZXR1cm4gZmN0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbmFtZVJlZzpuYW1lUmVnLFxuICBjb21waWxlVGV4dEFuZEV4cHJlc3Npb25zOmNvbXBpbGVUZXh0QW5kRXhwcmVzc2lvbnMsXG4gIGV2YWx1YXRlRXhwcmVzc2lvbkxpc3Q6ZXZhbHVhdGVFeHByZXNzaW9uTGlzdCxcbiAganNFeHByZXNzaW9uOmpzRXhwcmVzc2lvbixcbiAgcmVwbGFjZU5hbWVzOnJlcGxhY2VOYW1lcyxcbiAgcmVwbGFjZU91dE9mU3RyaW5nczpyZXBsYWNlT3V0T2ZTdHJpbmdzLFxuICBFWFBSRVNTSU9OX1JFRzpFWFBSRVNTSU9OX1JFR1xufTsiLCIvKiBMaWtlbHkuanMsXG4gICBQeXRob24gc3R5bGUgSFRNTCB0ZW1wbGF0ZSBsYW5ndWFnZSB3aXRoIGJpLWRpcmVjdGlvbm5hbCBkYXRhIGJpbmRpbmdcbiAgIGJhdGlzdGUgYmllbGVyIDIwMTQgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJyk7XG52YXIgZXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vZXhwcmVzc2lvbicpO1xudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZScpO1xuXG5mdW5jdGlvbiB1cGRhdGVEYXRhKGNvbnRleHQsIGRvbSkge1xuICB2YXIgbmFtZSA9IGRvbS5nZXRBdHRyaWJ1dGUoXCJsay1iaW5kXCIpLCB2YWx1ZTtcbiAgaWYoIW5hbWUpIHtcbiAgICB0aHJvdyBcIk5vIGxrLWJpbmQgYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50XCI7XG4gIH1cbiAgaWYoZG9tLnR5cGUgPT0gJ2NoZWNrYm94JyAmJiAhZG9tLmNoZWNrZWQpIHtcbiAgICB2YWx1ZSA9IFwiXCI7XG4gIH0gZWxzZSB7XG4gICAgdmFsdWUgPSBkb20udmFsdWU7Ly8gfHwgZG9tLmdldEF0dHJpYnV0ZShcInZhbHVlXCIpO1xuICB9XG4gIC8vIHVwZGF0ZSB0aGUgY29udGV4dFxuICBjb250ZXh0Lm1vZGlmeShuYW1lLCB2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIEJpbmRpbmcoZG9tLCB0cGwsIGRhdGEpIHtcbiAgaWYgKHRoaXMuY29uc3RydWN0b3IgIT09IEJpbmRpbmcpIHtcbiAgICByZXR1cm4gbmV3IEJpbmRpbmcoZG9tLCB0cGwsIGRhdGEpO1xuICB9XG4gIC8vIGRvdWJsZSBkYXRhIGJpbmRpbmcgYmV0d2VlbiBzb21lIGRhdGEgYW5kIHNvbWUgZG9tXG4gIHRoaXMuZG9tID0gZG9tO1xuICB0aGlzLmRhdGEgPSBkYXRhO1xuICB0aGlzLmNvbnRleHQgPSBuZXcgdGVtcGxhdGUuQ29udGV4dCh0aGlzLmRhdGEpO1xuICB0aGlzLnRlbXBsYXRlID0gdHBsO1xufVxuXG5CaW5kaW5nLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRlbXBsYXRlLnRyZWUobmV3IHRlbXBsYXRlLkNvbnRleHQodGhpcy5kYXRhKSk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZG9tLmlubmVySFRNTCA9IFwiXCI7XG4gIHRoaXMuY3VycmVudFRyZWUgPSB0aGlzLnRyZWUoKTtcbiAgdGhpcy5jdXJyZW50VHJlZS5kb21UcmVlKHRoaXMuZG9tKTtcbiAgdGhpcy5iaW5kRXZlbnRzKCk7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kb21Jbml0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIGNyZWF0ZSBhbiBpbml0aWFsIHRyZWUgZnJvbSB0aGUgRE9NXG4gIHRoaXMuY3VycmVudFRyZWUgPSByZW5kZXIuaW5pdGlhbFJlbmRlckZyb21Eb20odGhpcy5kb20pO1xuICB0aGlzLmN1cnJlbnRUcmVlLm5vZGVOYW1lID0gdW5kZWZpbmVkO1xuICB0aGlzLmJpbmRFdmVudHMoKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5ld1RyZWUgPSB0aGlzLnRyZWUoKTtcbiAgdmFyIGRpZmYgPSB0aGlzLmN1cnJlbnRUcmVlLmRpZmYobmV3VHJlZSk7XG4gIHJlbmRlci5hcHBseURpZmYoZGlmZiwgdGhpcy5kb20pO1xuICB0aGlzLmN1cnJlbnRUcmVlID0gbmV3VHJlZTtcbiAgdGhpcy5sb2NrID0gZmFsc2U7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5kYXRhRXZlbnQgPSBmdW5jdGlvbihlKSB7XG4gIHZhciBkb20gPSBlLnRhcmdldDtcbiAgdmFyIG5hbWUgPSBkb20uZ2V0QXR0cmlidXRlKCdsay1iaW5kJyk7XG4gIGlmKG5hbWUpIHtcbiAgICB2YXIgcmVuZGVyTm9kZSA9IHRoaXMuZ2V0UmVuZGVyTm9kZUZyb21QYXRoKGRvbSk7XG4gICAgaWYoIXRoaXMubG9jaykge1xuICAgICAgLy8gZG8gbm90IHVwZGF0ZSBkdXJpbmcgYSByZW5kZXJcbiAgICAgIHVwZGF0ZURhdGEocmVuZGVyTm9kZS5jb250ZXh0LCBkb20pO1xuICAgICAgdGhpcy5sb2NrID0gdHJ1ZTtcbiAgICAgIHRoaXMuZGlmZigpO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXIoJ2RhdGFWaWV3Q2hhbmdlZCcsIHtcIm5hbWVcIjogbmFtZX0pO1xuICB9XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS5nZXRSZW5kZXJOb2RlRnJvbVBhdGggPSBmdW5jdGlvbihkb20pIHtcbiAgdmFyIHBhdGggPSBkb20uZ2V0QXR0cmlidXRlKCdsay1wYXRoJyk7XG4gIHZhciByZW5kZXJOb2RlID0gdGhpcy5jdXJyZW50VHJlZTtcbiAgdmFyIGJpdHMgPSBwYXRoLnNwbGl0KFwiLlwiKSwgaTtcbiAgZm9yKGk9MTsgaTxiaXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgcmVuZGVyTm9kZSA9IHJlbmRlck5vZGUuY2hpbGRyZW5bYml0c1tpXV07XG4gIH1cbiAgcmV0dXJuIHJlbmRlck5vZGU7XG59O1xuXG5CaW5kaW5nLnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24obmFtZSwgb2JqKSB7XG4gIHRoaXMuZG9tLmRpc3BhdGNoRXZlbnQoXG4gICAgdXRpbC5ldmVudChuYW1lKSxcbiAgICBvYmpcbiAgKTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmFueUV2ZW50ID0gZnVuY3Rpb24oZSkge1xuICB2YXIgZG9tID0gZS50YXJnZXQ7XG4gIHZhciBsa0V2ZW50ID0gZG9tLmdldEF0dHJpYnV0ZSgnbGstJyArIGUudHlwZSk7XG4gIGlmKCFsa0V2ZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciByZW5kZXJOb2RlID0gdGhpcy5nZXRSZW5kZXJOb2RlRnJvbVBhdGgoZG9tKTtcbiAgdmFyIGN0eCA9IHRlbXBsYXRlLkNvbnRleHQoe2V2ZW50OiBlfSwgcmVuZGVyTm9kZS5jb250ZXh0KTtcbiAgcmVuZGVyTm9kZS5ub2RlLmF0dHJzWydsay0nK2UudHlwZV0oY3R4KTtcbn07XG5cbkJpbmRpbmcucHJvdG90eXBlLmJpbmRFdmVudHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGk7XG4gIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbihlKXsgdGhpcy5kYXRhRXZlbnQoZSk7IH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpeyB0aGlzLmRhdGFFdmVudChlKTsgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIHZhciBldmVudHMgPSBcImNsaWNrLGNoYW5nZSxtb3VzZW92ZXIsZm9jdXNvdXQsZm9jdXNpbixrZXlkb3duLGtleXVwLGtleXByZXNzLHN1Ym1pdFwiLnNwbGl0KCcsJyk7XG4gIGZvcihpPTA7IGk8ZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIGV2ZW50c1tpXSxcbiAgICAgIGZ1bmN0aW9uKGUpeyB0aGlzLmFueUV2ZW50KGUpOyB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgfVxufTtcblxuQmluZGluZy5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKXtcbiAgLy8gYXZvaWQgMiBkaWZmcyBhdCB0aGUgc2FtZSB0aW1lXG4gIC8vIFRPRE86IG1lc3NhZ2Ugb3IgZGlmZiBxdWV1ZS5cbiAgaWYoIXRoaXMubG9jaykge1xuICAgIHRoaXMubG9jayA9IHRydWU7XG4gICAgdGhpcy5kaWZmKCk7XG4gICAgdGhpcy50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gQ29tcG9uZW50KG5hbWUsIHRwbCwgY29udHJvbGxlcikge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQ29tcG9uZW50KSB7XG4gICAgcmV0dXJuIG5ldyBDb21wb25lbnQobmFtZSwgdHBsLCBjb250cm9sbGVyKTtcbiAgfVxuICBpZih0ZW1wbGF0ZS5jb21wb25lbnRDYWNoZVtuYW1lXSkge1xuICAgIHV0aWwuQ29tcGlsZUVycm9yKFwiQ29tcG9uZW50IHdpdGggbmFtZSBcIiArIG5hbWUgKyBcIiBhbHJlYWR5IGV4aXN0XCIpO1xuICB9XG4gIHRlbXBsYXRlLmNvbXBvbmVudENhY2hlW25hbWVdID0gdGhpcztcbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy50ZW1wbGF0ZSA9IGxpa2VseS5UZW1wbGF0ZSh0cGwpO1xuICB0aGlzLmNvbnRyb2xsZXIgPSBjb250cm9sbGVyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgVGVtcGxhdGU6dGVtcGxhdGUuYnVpbGRUZW1wbGF0ZSxcbiAgQ29udGV4dE5hbWU6dGVtcGxhdGUuQ29udGV4dE5hbWUsXG4gIHVwZGF0ZURhdGE6dXBkYXRlRGF0YSxcbiAgQmluZGluZzpCaW5kaW5nLFxuICBDb21wb25lbnQ6Q29tcG9uZW50LFxuICBnZXREb206cmVuZGVyLmdldERvbSxcbiAgY29tcG9uZW50Q2FjaGU6dGVtcGxhdGUuY29tcG9uZW50Q2FjaGUsXG4gIGFwcGx5RGlmZjpyZW5kZXIuYXBwbHlEaWZmLFxuICBkaWZmQ29zdDpyZW5kZXIuZGlmZkNvc3QsXG4gIGF0dHJpYnV0ZXNEaWZmOnJlbmRlci5hdHRyaWJ1dGVzRGlmZixcbiAgQ29udGV4dDp0ZW1wbGF0ZS5Db250ZXh0LFxuICBDb21waWxlRXJyb3I6dXRpbC5Db21waWxlRXJyb3IsXG4gIFJ1bnRpbWVFcnJvcjp1dGlsLlJ1bnRpbWVFcnJvcixcbiAgZXNjYXBlOnV0aWwuZXNjYXBlLFxuICBpbml0aWFsUmVuZGVyRnJvbURvbTpyZW5kZXIuaW5pdGlhbFJlbmRlckZyb21Eb20sXG4gIGV4cHJlc3Npb246ZXhwcmVzc2lvbixcbiAgcmVuZGVyOnJlbmRlcixcbiAgdGVtcGxhdGU6dGVtcGxhdGUsXG4gIHV0aWw6dXRpbCxcbiAgc2V0SGFuZGljYXA6ZnVuY3Rpb24obil7cmVuZGVyLmhhbmRpY2FwID0gbjt9XG59O1xuIiwiXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gUmVuZGVyZWROb2RlKG5vZGUsIGNvbnRleHQsIHJlbmRlcmVyLCBwYXRoKSB7XG4gIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgdGhpcy5ub2RlID0gbm9kZTtcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5yZW5kZXJlciA9IHJlbmRlcmVyO1xuICB0aGlzLnBhdGggPSBwYXRoIHx8IFwiXCI7XG4gIC8vIHNob3J0Y3V0XG4gIHRoaXMubm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lO1xufVxuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLnJlcHIgPSBmdW5jdGlvbihsZXZlbCkge1xuICB2YXIgc3RyID0gXCJcIiwgaTtcbiAgaWYobGV2ZWwgPT09IHVuZGVmaW5lZCkge1xuICAgIGxldmVsID0gMDtcbiAgfVxuICBmb3IoaT0wOyBpPGxldmVsOyBpKyspIHtcbiAgICBzdHIgKz0gXCIgIFwiO1xuICB9XG4gIHN0ciArPSBTdHJpbmcodGhpcy5ub2RlKSArIFwiIHBhdGggXCIgKyB0aGlzLnBhdGggKyBcIlxcclxcblwiO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBzdHIgKz0gdGhpcy5jaGlsZHJlbltpXS5yZXByKGxldmVsICsgMSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblJlbmRlcmVkTm9kZS5wcm90b3R5cGUuZG9tVHJlZSA9IGZ1bmN0aW9uKGFwcGVuZF90bykge1xuICB2YXIgbm9kZSA9IGFwcGVuZF90byB8fCB0aGlzLm5vZGUuZG9tTm9kZSh0aGlzLmNvbnRleHQsIHRoaXMucGF0aCksIGksIGNoaWxkX3RyZWU7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIGNoaWxkX3RyZWUgPSB0aGlzLmNoaWxkcmVuW2ldLmRvbVRyZWUoKTtcbiAgICBpZihub2RlLnB1c2gpIHtcbiAgICAgIG5vZGUucHVzaChjaGlsZF90cmVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZF90cmVlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59O1xuXG5SZW5kZXJlZE5vZGUucHJvdG90eXBlLmRvbUh0bWwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGk7XG4gIC8vdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gIHZhciBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjaGlsZCA9IHRoaXMuY2hpbGRyZW5baV0uZG9tVHJlZSgpO1xuICAgIGQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICB9XG4gIHJldHVybiBkLmlubmVySFRNTDtcbn07XG5cbmZ1bmN0aW9uIGRpZmZDb3N0KGRpZmYpIHtcbiAgdmFyIHZhbHVlPTAsIGk7XG4gIGZvcihpPTA7IGk8ZGlmZi5sZW5ndGg7IGkrKykge1xuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwicmVtb3ZlXCIpIHtcbiAgICAgIHZhbHVlICs9IDU7XG4gICAgfVxuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwiYWRkXCIpIHtcbiAgICAgIHZhbHVlICs9IDI7XG4gICAgfVxuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwibXV0YXRlXCIpIHtcbiAgICAgIHZhbHVlICs9IDE7XG4gICAgfVxuICAgIGlmKGRpZmZbaV0uYWN0aW9uID09IFwic3RyaW5nbXV0YXRlXCIpIHtcbiAgICAgIHZhbHVlICs9IDE7XG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5fZGlmZiA9IGZ1bmN0aW9uKHJlbmRlcmVkX25vZGUsIGFjY3UsIHBhdGgpIHtcbiAgdmFyIGksIGosIHNvdXJjZV9wdCA9IDA7XG4gIGlmKHBhdGggPT09IHVuZGVmaW5lZCkgeyBwYXRoID0gXCJcIjsgfVxuXG4gIGlmKCFyZW5kZXJlZF9ub2RlKSB7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICBub2RlOiB0aGlzLFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIHJldHVybiBhY2N1O1xuICB9XG5cbiAgaWYocmVuZGVyZWRfbm9kZS5ub2RlTmFtZSAhPSB0aGlzLm5vZGVOYW1lKSB7XG4gICAgYWNjdS5wdXNoKHtcbiAgICAgIHR5cGU6ICdkaWZmZW50X25vZGVOYW1lJyxcbiAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICBub2RlOiB0aGlzLFxuICAgICAgcGF0aDogcGF0aFxuICAgIH0pO1xuICAgIGFjY3UucHVzaCh7XG4gICAgICB0eXBlOiAnZGlmZmVudF9ub2RlTmFtZScsXG4gICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgbm9kZTogcmVuZGVyZWRfbm9kZSxcbiAgICAgIC8vIHdoZW4gYSBub2RlIGlzIGFkZGVkLCB3ZSBwb2ludCB0byB0aGUgbmV4dCBub2RlIGFzIGluc2VydEJlZm9yZSBpcyB1c2VkXG4gICAgICBwYXRoOiBwYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIGFjY3U7XG4gIH1cblxuICAvLyBDb3VsZCB1c2UgaW5oZXJpdGFuY2UgZm9yIHRoaXNcbiAgaWYodGhpcy5ub2RlTmFtZSA9PSBcIiN0ZXh0XCIgJiYgdGhpcy5yZW5kZXJlciAhPSByZW5kZXJlZF9ub2RlLnJlbmRlcmVyKSB7XG4gICAgICBhY2N1LnB1c2goe1xuICAgICAgICBhY3Rpb246ICdzdHJpbmdtdXRhdGUnLFxuICAgICAgICBub2RlOiB0aGlzLFxuICAgICAgICB2YWx1ZTogcmVuZGVyZWRfbm9kZS5yZW5kZXJlcixcbiAgICAgICAgcGF0aDogcGF0aFxuICAgICAgfSk7XG4gICAgcmV0dXJuIGFjY3U7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGFfZGlmZiA9IGF0dHJpYnV0ZXNEaWZmKHRoaXMuYXR0cnMsIHJlbmRlcmVkX25vZGUuYXR0cnMpO1xuICAgIGlmKGFfZGlmZi5sZW5ndGgpIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIGFjdGlvbjogJ211dGF0ZScsXG4gICAgICAgIG5vZGU6IHRoaXMsXG4gICAgICAgIGF0dHJpYnV0ZXNEaWZmOiBhX2RpZmYsXG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHZhciBsMSA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoO1xuICB2YXIgbDIgPSByZW5kZXJlZF9ub2RlLmNoaWxkcmVuLmxlbmd0aDtcblxuICAvLyBubyBzd2FwIHBvc3NpYmxlLCBidXQgZGVsZXRpbmcgYSBub2RlIGlzIHBvc3NpYmxlXG4gIGogPSAwOyBpID0gMDsgc291cmNlX3B0ID0gMDtcbiAgLy8gbGV0J3MgZ290IHRyb3VnaCBhbGwgdGhlIGNoaWxkcmVuXG4gIGZvcig7IGk8bDE7IGkrKykge1xuICAgIHZhciBkaWZmID0gMCwgYWZ0ZXJfc291cmNlX2RpZmYgPSAwLCBhZnRlcl90YXJnZXRfZGlmZiA9IDAsIGFmdGVyX3NvdXJjZV9jb3N0PW51bGwsIGFmdGVyX3RhcmdldF9jb3N0PW51bGw7XG4gICAgdmFyIGFmdGVyX3RhcmdldCA9IHJlbmRlcmVkX25vZGUuY2hpbGRyZW5baisxXTtcbiAgICB2YXIgYWZ0ZXJfc291cmNlID0gdGhpcy5jaGlsZHJlbltpKzFdO1xuXG4gICAgaWYoIXJlbmRlcmVkX25vZGUuY2hpbGRyZW5bal0pIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIGFjdGlvbjogJ3JlbW92ZScsXG4gICAgICAgIG5vZGU6IHRoaXMuY2hpbGRyZW5baV0sXG4gICAgICAgIHBhdGg6IHBhdGggKyAnLicgKyBzb3VyY2VfcHRcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgZGlmZiA9IHRoaXMuY2hpbGRyZW5baV0uX2RpZmYocmVuZGVyZWRfbm9kZS5jaGlsZHJlbltqXSwgW10sIHBhdGggKyAnLicgKyBzb3VyY2VfcHQpO1xuXG4gICAgdmFyIGNvc3QgPSBkaWZmQ29zdChkaWZmKTtcbiAgICAvLyBkb2VzIHRoZSBuZXh0IHNvdXJjZSBvbmUgZml0cyBiZXR0ZXI/XG4gICAgaWYoYWZ0ZXJfc291cmNlKSB7XG4gICAgICBhZnRlcl9zb3VyY2VfZGlmZiA9IGFmdGVyX3NvdXJjZS5fZGlmZihyZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLCBbXSwgcGF0aCArICcuJyArIHNvdXJjZV9wdCk7XG4gICAgICAvLyBuZWVkcyBzb21lIGhhbmRpY2FwIG90aGVyd2lzZSBpbnB1dHMgY29udGFpbmluZyB0aGUgY3VycmVudCBmb2N1c1xuICAgICAgLy8gbWlnaHQgYmUgcmVtb3ZlZFxuICAgICAgYWZ0ZXJfc291cmNlX2Nvc3QgPSBkaWZmQ29zdChhZnRlcl9zb3VyY2VfZGlmZikgKyBtb2R1bGUuZXhwb3J0cy5oYW5kaWNhcDtcbiAgICB9XG4gICAgLy8gZG9lcyB0aGUgbmV4dCB0YXJnZXQgb25lIGZpdHMgYmV0dGVyP1xuICAgIGlmKGFmdGVyX3RhcmdldCkge1xuICAgICAgYWZ0ZXJfdGFyZ2V0X2RpZmYgPSB0aGlzLmNoaWxkcmVuW2ldLl9kaWZmKGFmdGVyX3RhcmdldCwgW10sIHBhdGggKyAnLicgKyBzb3VyY2VfcHQpO1xuICAgICAgYWZ0ZXJfdGFyZ2V0X2Nvc3QgPSBkaWZmQ29zdChhZnRlcl90YXJnZXRfZGlmZikgKyBtb2R1bGUuZXhwb3J0cy5oYW5kaWNhcDtcbiAgICB9XG5cbiAgICBpZigoIWFmdGVyX3RhcmdldCB8fCBjb3N0IDw9IGFmdGVyX3RhcmdldF9jb3N0KSAmJiAoIWFmdGVyX3NvdXJjZSB8fCBjb3N0IDw9IGFmdGVyX3NvdXJjZV9jb3N0KSkge1xuICAgICAgYWNjdSA9IGFjY3UuY29uY2F0KGRpZmYpO1xuICAgICAgc291cmNlX3B0ICs9IDE7XG4gICAgfSBlbHNlIGlmKGFmdGVyX3NvdXJjZSAmJiAoIWFmdGVyX3RhcmdldCB8fCBhZnRlcl9zb3VyY2VfY29zdCA8PSBhZnRlcl90YXJnZXRfY29zdCkpIHtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhZnRlcl9zb3VyY2UnLFxuICAgICAgICBhY3Rpb246ICdyZW1vdmUnLFxuICAgICAgICBub2RlOiB0aGlzLmNoaWxkcmVuW2ldLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgc291cmNlX3B0XG4gICAgICB9KTtcbiAgICAgIGFjY3UgPSBhY2N1LmNvbmNhdChhZnRlcl9zb3VyY2VfZGlmZik7XG4gICAgICBzb3VyY2VfcHQgKz0gMTtcbiAgICAgIGkrKztcbiAgICB9IGVsc2UgaWYoYWZ0ZXJfdGFyZ2V0KSB7XG4gICAgICAvLyBpbXBvcnRhbnQgdG8gYWRkIHRoZSBkaWZmIGJlZm9yZVxuICAgICAgYWNjdSA9IGFjY3UuY29uY2F0KGFmdGVyX3RhcmdldF9kaWZmKTtcbiAgICAgIGFjY3UucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhZnRlcl90YXJnZXQnLFxuICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICBub2RlOiByZW5kZXJlZF9ub2RlLmNoaWxkcmVuW2pdLFxuICAgICAgICBwYXRoOiBwYXRoICsgJy4nICsgKHNvdXJjZV9wdClcbiAgICAgIH0pO1xuICAgICAgc291cmNlX3B0ICs9IDI7XG4gICAgICBqKys7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IFwiU2hvdWxkIG5ldmVyIGhhcHBlblwiO1xuICAgIH1cbiAgICBqKys7XG4gIH1cblxuICAvLyBuZXcgbm9kZXMgdG8gYmUgYWRkZWQgYWZ0ZXIgdGhlIGRpZmZcbiAgZm9yKGk9MDsgaTwobDItaik7IGkrKykge1xuICAgIGFjY3UucHVzaCh7XG4gICAgICB0eXBlOiAnbmV3X25vZGUnLFxuICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgIG5vZGU6IHJlbmRlcmVkX25vZGUuY2hpbGRyZW5baitpXSxcbiAgICAgIC8vIHdoZW4gYSBub2RlIGlzIGFkZGVkLCB3ZSBwb2ludCB0byB0aGUgbmV4dCBub2RlIGFzIGluc2VydEJlZm9yZSBpcyB1c2VkXG4gICAgICBwYXRoOiBwYXRoICsgJy4nICsgKHNvdXJjZV9wdCArIDEpXG4gICAgfSk7XG4gICAgc291cmNlX3B0ICs9IDE7XG4gIH1cblxuICByZXR1cm4gYWNjdTtcblxufTtcblxuUmVuZGVyZWROb2RlLnByb3RvdHlwZS5kaWZmID0gZnVuY3Rpb24ocmVuZGVyZWRfbm9kZSkge1xuICB2YXIgYWNjdSA9IFtdO1xuICByZXR1cm4gdGhpcy5fZGlmZihyZW5kZXJlZF9ub2RlLCBhY2N1KTtcbn07XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZXNEaWZmKGEsIGIpIHtcbiAgdmFyIGNoYW5nZXMgPSBbXSwga2V5O1xuICBmb3Ioa2V5IGluIGEpIHtcbiAgICAgIGlmKGJba2V5XSA9PT0gZmFsc2UpIHtcbiAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJyZW1vdmVcIiwga2V5OmtleX0pO1xuICAgICAgfSBlbHNlIGlmKGJba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmKGJba2V5XSAhPSBhW2tleV0pIHtcbiAgICAgICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcIm11dGF0ZVwiLCBrZXk6a2V5LCB2YWx1ZTpiW2tleV19KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hhbmdlcy5wdXNoKHthY3Rpb246XCJyZW1vdmVcIiwga2V5OmtleX0pO1xuICAgICAgfVxuICB9XG4gIGZvcihrZXkgaW4gYikge1xuICAgIGlmKGFba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjaGFuZ2VzLnB1c2goe2FjdGlvbjpcImFkZFwiLCBrZXk6a2V5LCB2YWx1ZTpiW2tleV19KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNoYW5nZXM7XG59XG5cbmZ1bmN0aW9uIGdldERvbShkb20sIHBhdGgsIHN0b3ApIHtcbiAgdmFyIGksIHA9cGF0aC5zcGxpdCgnLicpLCBkPWRvbTtcbiAgaWYoc3RvcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RvcCA9IDA7XG4gIH1cbiAgZm9yKGk9MDsgaTwocC5sZW5ndGggLSBzdG9wKTsgaSsrKSB7XG4gICAgaWYocFtpXSkgeyAvLyBmaXJzdCBvbmUgaXMgXCJcIlxuICAgICAgZCA9IGQuY2hpbGROb2Rlc1twYXJzZUludChwW2ldLCAxMCldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZDtcbn1cblxuZnVuY3Rpb24gYXBwbHlEaWZmKGRpZmYsIGRvbSkge1xuICB2YXIgaSwgaiwgX2RpZmYsIF9kb20sIHBhcmVudDtcbiAgZm9yKGk9MDsgaTxkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgX2RpZmYgPSBkaWZmW2ldO1xuICAgIF9kb20gPSBnZXREb20oZG9tLCBfZGlmZi5wYXRoKTtcbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgX2RvbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKF9kb20pO1xuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJhZGRcIikge1xuICAgICAgdmFyIG5ld05vZGUgPSBfZGlmZi5ub2RlLmRvbVRyZWUoKTtcbiAgICAgIGlmKF9kb20pIHtcbiAgICAgICAgX2RvbS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShuZXdOb2RlLCBfZG9tKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGdldCB0aGUgcGFyZW50XG4gICAgICAgIHBhcmVudCA9IGdldERvbShkb20sIF9kaWZmLnBhdGgsIDEpO1xuICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQobmV3Tm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmKF9kaWZmLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICBmb3Ioaj0wOyBqPF9kaWZmLmF0dHJpYnV0ZXNEaWZmLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBhX2RpZmYgPSBfZGlmZi5hdHRyaWJ1dGVzRGlmZltqXTtcbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcIm11dGF0ZVwiKSB7XG4gICAgICAgICAgLy8gaW1wb3J0YW50IGZvciBzZWxlY3RcbiAgICAgICAgICBpZihcInZhbHVlLHNlbGVjdGVkLGNoZWNrZWRcIi5pbmRleE9mKGFfZGlmZi5rZXkpICE9IC0xKSB7XG4gICAgICAgICAgICBpZihfZG9tW2FfZGlmZi5rZXldICE9IGFfZGlmZi52YWx1ZSkge1xuICAgICAgICAgICAgICBfZG9tW2FfZGlmZi5rZXldID0gYV9kaWZmLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBfZG9tLnNldEF0dHJpYnV0ZShhX2RpZmYua2V5LCBhX2RpZmYudmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGFfZGlmZi5hY3Rpb24gPT0gXCJyZW1vdmVcIikge1xuICAgICAgICAgIGlmKFwiY2hlY2tlZCxzZWxlY3RlZFwiLmluZGV4T2YoYV9kaWZmLmtleSkgIT0gLTEpIHtcbiAgICAgICAgICAgIF9kb21bYV9kaWZmLmtleV0gPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5yZW1vdmVBdHRyaWJ1dGUoYV9kaWZmLmtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoYV9kaWZmLmFjdGlvbiA9PSBcImFkZFwiKSB7XG4gICAgICAgICAgaWYoXCJjaGVja2VkLHNlbGVjdGVkXCIuaW5kZXhPZihhX2RpZmYua2V5KSAhPSAtMSkge1xuICAgICAgICAgICAgX2RvbVthX2RpZmYua2V5XSA9IGFfZGlmZi52YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2RvbS5zZXRBdHRyaWJ1dGUoYV9kaWZmLmtleSwgYV9kaWZmLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZihfZGlmZi5hY3Rpb24gPT0gXCJzdHJpbmdtdXRhdGVcIikge1xuICAgICAgX2RvbS5ub2RlVmFsdWUgPSBfZGlmZi52YWx1ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdGlhbFJlbmRlckZyb21Eb20oZG9tLCBwYXRoKSB7XG4gIHBhdGggPSBwYXRoIHx8IFwiXCI7XG4gIHZhciBpLCBjaGlsZCwgY2hpbGRyZW4gPSBbXSwgYXR0cnMgPSB7fSwgcmVuZGVyZXIgPSAnJztcbiAgaWYoZG9tLmF0dHJpYnV0ZXMpIHtcbiAgICBmb3IoaT0wOyBpIDwgZG9tLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBhdHRyID0gZG9tLmF0dHJpYnV0ZXNbaV07XG4gICAgICBhdHRyc1thdHRyLm5hbWVdID0gYXR0ci52YWx1ZTtcbiAgICB9XG4gIH1cbiAgaWYoZG9tLmNoaWxkTm9kZXMpIHtcbiAgICBmb3IoaT0wOyBpIDwgZG9tLmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoaWxkID0gZG9tLmNoaWxkTm9kZXNbaV07XG4gICAgICBjaGlsZHJlbi5wdXNoKGluaXRpYWxSZW5kZXJGcm9tRG9tKGNoaWxkLCBwYXRoICsgJy4nICsgaSkpO1xuICAgIH1cbiAgfVxuICBpZihkb20udGV4dENvbnRlbnQpIHtcbiAgICByZW5kZXJlciA9IGRvbS50ZXh0Q29udGVudDtcbiAgfVxuICB2YXIgcm4gPSBuZXcgUmVuZGVyZWROb2RlKFxuICAgIHtub2RlTmFtZTogZG9tLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCksIG5vZGU6ZG9tfSxcbiAgICB1bmRlZmluZWQsXG4gICAgcmVuZGVyZXIsXG4gICAgcGF0aCk7XG4gIHJuLmF0dHJzID0gYXR0cnM7XG4gIHJuLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gIHJldHVybiBybjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFJlbmRlcmVkTm9kZTpSZW5kZXJlZE5vZGUsXG4gIGluaXRpYWxSZW5kZXJGcm9tRG9tOmluaXRpYWxSZW5kZXJGcm9tRG9tLFxuICBhcHBseURpZmY6YXBwbHlEaWZmLFxuICBhdHRyaWJ1dGVzRGlmZjphdHRyaWJ1dGVzRGlmZixcbiAgZGlmZkNvc3Q6ZGlmZkNvc3QsXG4gIGdldERvbTpnZXREb20sXG4gIGhhbmRpY2FwOjFcbn07IiwiXG5cInVzZSBzdHJpY3RcIjtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKTtcbnZhciBleHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJyk7XG5cbnZhciB0ZW1wbGF0ZUNhY2hlID0ge307XG52YXIgY29tcG9uZW50Q2FjaGUgPSB7fTtcbi8vIGEgbmFtZSBoZXJlIGlzIGFsc28gYW55IHZhbGlkIEpTIG9iamVjdCBwcm9wZXJ0eVxudmFyIFZBUk5BTUVfUkVHID0gL15bYS16QS1aXyRdWzAtOWEtekEtWl8kXSovO1xudmFyIEhUTUxfQVRUUl9SRUcgPSAvXltBLVphLXpdW1xcdy1dezAsfS87XG52YXIgRE9VQkxFX1FVT1RFRF9TVFJJTkdfUkVHID0gL15cIihcXFxcXCJ8W15cIl0pKlwiLztcblxuZnVuY3Rpb24gQ29udGV4dE5hbWUobmFtZSkge1xuICB0aGlzLmJpdHMgPSBuYW1lLnNwbGl0KCcuJyk7XG59XG5cbkNvbnRleHROYW1lLnByb3RvdHlwZS5zdWJzdGl0dXRlQWxpYXMgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIGlmKGNvbnRleHQuYWxpYXNlcy5oYXNPd25Qcm9wZXJ0eSh0aGlzLmJpdHNbMF0pKSB7XG4gICAgdmFyIG5ld0JpdHMgPSBjb250ZXh0LmFsaWFzZXNbdGhpcy5iaXRzWzBdXS5zcGxpdCgnLicpO1xuICAgIHRoaXMuYml0cy5zaGlmdCgpO1xuICAgIHRoaXMuYml0cyA9IG5ld0JpdHMuY29uY2F0KHRoaXMuYml0cyk7XG4gIH1cbn07XG5cbkNvbnRleHROYW1lLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5iaXRzWzBdO1xufTtcblxuQ29udGV4dE5hbWUucHJvdG90eXBlLnN0ciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5iaXRzLmpvaW4oJy4nKTtcbn07XG5cbmZ1bmN0aW9uIENvbnRleHQoZGF0YSwgcGFyZW50KSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBDb250ZXh0KSB7XG4gICAgcmV0dXJuIG5ldyBDb250ZXh0KGRhdGEsIHBhcmVudCk7XG4gIH1cbiAgdGhpcy5kYXRhID0gZGF0YTtcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuYWxpYXNlcyA9IHt9O1xuICB0aGlzLndhdGNoaW5nID0ge307XG59XG5cbkNvbnRleHQucHJvdG90eXBlLmFkZEFsaWFzID0gZnVuY3Rpb24oc291cmNlTmFtZSwgYWxpYXNOYW1lKSB7XG4gIC8vIHNvdXJjZSBuYW1lIGNhbiBiZSAnbmFtZScgb3IgJ2xpc3Qua2V5J1xuICBpZihzb3VyY2VOYW1lID09PSBhbGlhc05hbWUpIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJBbGlhcyB3aXRoIHRoZSBuYW1lIFwiICsgYWxpYXNOYW1lICsgXCIgYWxyZWFkeSBwcmVzZW50IGluIHRoaXMgY29udGV4dC5cIik7XG4gIH1cbiAgdGhpcy5hbGlhc2VzW2FsaWFzTmFtZV0gPSBzb3VyY2VOYW1lO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUucmVzb2x2ZU5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIC8vIGdpdmVuIGEgbmFtZSwgcmV0dXJuIHRoZSBbQ29udGV4dCwgcmVzb2x2ZWQgcGF0aCwgdmFsdWVdIHdoZW5cbiAgLy8gdGhpcyBuYW1lIGlzIGZvdW5kIG9yIHVuZGVmaW5lZCBvdGhlcndpc2VcbiAgbmFtZS5zdWJzdGl0dXRlQWxpYXModGhpcyk7XG5cbiAgaWYodGhpcy5kYXRhLmhhc093blByb3BlcnR5KG5hbWUuc3RhcnQoKSkpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLmRhdGFbbmFtZS5zdGFydCgpXTtcbiAgICB2YXIgaSA9IDE7XG4gICAgd2hpbGUoaSA8IG5hbWUuYml0cy5sZW5ndGgpIHtcbiAgICAgIGlmKCF2YWx1ZS5oYXNPd25Qcm9wZXJ0eShuYW1lLmJpdHNbaV0pKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICB2YWx1ZSA9IHZhbHVlW25hbWUuYml0c1tpXV07XG4gICAgICBpKys7XG4gICAgfVxuICAgIHJldHVybiBbdGhpcywgbmFtZS5zdHIoKSwgdmFsdWVdO1xuICB9XG5cbiAgaWYodGhpcy5wYXJlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZU5hbWUobmFtZSk7XG4gIH1cblxufTtcblxuQ29udGV4dC5wcm90b3R5cGUuZ2V0TmFtZVBhdGggPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZU5hbWUobmV3IENvbnRleHROYW1lKG5hbWUpKTtcbiAgaWYocmVzb2x2ZWQpIHtcbiAgICByZXR1cm4gcmVzb2x2ZWRbMV07XG4gIH1cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAgdGhpcy53YXRjaGluZ1tuYW1lXSA9IGNhbGxiYWNrO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVOYW1lKG5ldyBDb250ZXh0TmFtZShuYW1lKSk7XG4gIGlmKHJlc29sdmVkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVkWzJdO1xuICB9XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB0aGlzLl9tb2RpZnkobmV3IENvbnRleHROYW1lKG5hbWUpLCB2YWx1ZSk7XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5fbW9kaWZ5ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcblxuICBpZih0aGlzLndhdGNoaW5nLmhhc093blByb3BlcnR5KG5hbWUuc3RyKCkpKSB7XG4gICAgdGhpcy53YXRjaGluZ1tuYW1lLnN0cigpXSh2YWx1ZSk7XG4gIH1cblxuICBuYW1lLnN1YnN0aXR1dGVBbGlhcyh0aGlzKTtcblxuICAvLyB3ZSBnbyBpbiBmb3IgYSBzZWFyY2ggaWYgdGhlIGZpcnN0IHBhcnQgbWF0Y2hlc1xuICBpZih0aGlzLmRhdGEuaGFzT3duUHJvcGVydHkobmFtZS5zdGFydCgpKSkge1xuICAgIHZhciBkYXRhID0gdGhpcy5kYXRhO1xuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZShpIDwgbmFtZS5iaXRzLmxlbmd0aCAtIDEpIHtcbiAgICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KG5hbWUuYml0c1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGRhdGEgPSBkYXRhW25hbWUuYml0c1tpXV07XG4gICAgICBpKys7XG4gICAgfVxuICAgIGRhdGFbbmFtZS5iaXRzW2ldXSA9IHZhbHVlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIC8vIGRhdGEgbm90IGZvdW5kLCBsZXQncyBzZWFyY2ggaW4gdGhlIHBhcmVudFxuICBpZih0aGlzLnBhcmVudCkge1xuICAgIHJldHVybiB0aGlzLnBhcmVudC5fbW9kaWZ5KG5hbWUsIHZhbHVlKTtcbiAgfVxuXG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB0aGlzLmRhdGFbbmFtZV0gPSB2YWx1ZTtcbn07XG5cbmZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlcyh2LCBub2RlKSB7XG4gIHZhciBhdHRycyA9IHt9LCBuLCBzO1xuICB3aGlsZSh2KSB7XG4gICAgICB2ID0gdXRpbC50cmltKHYpO1xuICAgICAgbiA9IHYubWF0Y2goSFRNTF9BVFRSX1JFRyk7XG4gICAgICBpZighbikge1xuICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gYXR0cmlidXRlIG5hbWUgZm91bmQgaW4gXCIrdik7XG4gICAgICB9XG4gICAgICB2ID0gdi5zdWJzdHIoblswXS5sZW5ndGgpO1xuICAgICAgbiA9IG5bMF07XG4gICAgICBpZih2WzBdICE9IFwiPVwiKSB7XG4gICAgICAgIG5vZGUuY2Vycm9yKFwicGFyc2VBdHRyaWJ1dGVzOiBObyBlcXVhbCBzaWduIGFmdGVyIG5hbWUgXCIrbik7XG4gICAgICB9XG4gICAgICB2ID0gdi5zdWJzdHIoMSk7XG4gICAgICBzID0gdi5tYXRjaChET1VCTEVfUVVPVEVEX1NUUklOR19SRUcpO1xuICAgICAgaWYocykge1xuICAgICAgICBhdHRyc1tuXSA9IG5ldyBTdHJpbmdOb2RlKG51bGwsIHNbMF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcyA9IHYubWF0Y2goZXhwcmVzc2lvbi5FWFBSRVNTSU9OX1JFRyk7XG4gICAgICAgIGlmKHMgPT09IG51bGwpIHtcbiAgICAgICAgICBub2RlLmNlcnJvcihcInBhcnNlQXR0cmlidXRlczogTm8gc3RyaW5nIG9yIGV4cHJlc3Npb24gZm91bmQgYWZ0ZXIgbmFtZSBcIituKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgZXhwciA9IGV4cHJlc3Npb24uanNFeHByZXNzaW9uKHNbMV0pO1xuICAgICAgICAgIGF0dHJzW25dID0gZXhwcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdiA9IHYuc3Vic3RyKHNbMF0ubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gYXR0cnM7XG59XG5cbi8vIGFsbCB0aGUgYXZhaWxhYmxlIHRlbXBsYXRlIG5vZGVcblxuZnVuY3Rpb24gTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIHRoaXMubGluZSA9IGxpbmU7XG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB0aGlzLmNvbnRlbnQgPSBjb250ZW50O1xuICB0aGlzLmxldmVsID0gbGV2ZWw7XG4gIHRoaXMuY2hpbGRyZW4gPSBbXTtcbn1cblxuTm9kZS5wcm90b3R5cGUucmVwciA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gIHZhciBzdHIgPSBcIlwiLCBpO1xuICBpZihsZXZlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGV2ZWwgPSAwO1xuICB9XG4gIGZvcihpPTA7IGk8bGV2ZWw7IGkrKykge1xuICAgIHN0ciArPSBcIiAgXCI7XG4gIH1cbiAgc3RyICs9IFN0cmluZyh0aGlzKSArIFwiXFxyXFxuXCI7XG4gIGZvcihpPTA7IGk8dGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHN0ciArPSB0aGlzLmNoaWxkcmVuW2ldLnJlcHIobGV2ZWwgKyAxKTtcbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICBpZihwYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICBwYXRoID0gJyc7XG4gICAgcG9zID0gMDtcbiAgICB0aGlzLmlzUm9vdCA9IHRydWU7XG4gIH1cbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCAnJywgcGF0aCk7XG4gIHQuY2hpbGRyZW4gPSB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xuICByZXR1cm4gdDtcbn07XG5cbk5vZGUucHJvdG90eXBlLmNlcnJvciA9IGZ1bmN0aW9uKG1zZykge1xuICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IodGhpcy50b1N0cmluZygpICsgXCI6IFwiICsgbXNnKTtcbn07XG5cbk5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtdO1xufTtcblxuTm9kZS5wcm90b3R5cGUudHJlZUNoaWxkcmVuID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gW10sIGksIHAsIGosIGNoaWxkcmVuID0gbnVsbCwgY2hpbGQgPSBudWxsO1xuICBqID0gcG9zO1xuICBmb3IoaT0wOyBpPHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBwID0gcGF0aDtcbiAgICBjaGlsZCA9IHRoaXMuY2hpbGRyZW5baV07XG4gICAgaWYoY2hpbGQuaGFzT3duUHJvcGVydHkoJ25vZGVOYW1lJykpIHtcbiAgICAgIHAgKz0gJy4nICsgajtcbiAgICAgIGorKztcbiAgICAgIGNoaWxkcmVuID0gY2hpbGQudHJlZShjb250ZXh0LCBwLCAwKTtcbiAgICAgIHQucHVzaChjaGlsZHJlbik7XG4gICAgfSBlbHNlIGlmICghY2hpbGQucmVuZGVyRXhsY3VkZWQpIHtcbiAgICAgIGNoaWxkcmVuID0gY2hpbGQudHJlZShjb250ZXh0LCBwLCBqKTtcbiAgICAgIGlmKGNoaWxkcmVuKSB7XG4gICAgICAgIHQgPSB0LmNvbmNhdChjaGlsZHJlbik7XG4gICAgICAgIGogKz0gY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdDtcbn07XG5cbk5vZGUucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24oY2hpbGQpIHtcbiAgdGhpcy5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbn07XG5cbk5vZGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyBcIihcIit0aGlzLmNvbnRlbnQucmVwbGFjZShcIlxcblwiLCBcIlwiKStcIikgYXQgbGluZSBcIiArIHRoaXMubGluZTtcbn07XG5cbmZ1bmN0aW9uIENvbW1lbnROb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICBwYXJlbnQuY2hpbGRyZW4ucHVzaCh0aGlzKTtcbiAgdGhpcy5yZW5kZXJFeGxjdWRlZCA9IHRydWU7XG59XG51dGlsLmluaGVyaXRzKENvbW1lbnROb2RlLCBOb2RlKTtcblxuZnVuY3Rpb24gSHRtbE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubm9kZU5hbWUgPSB0aGlzLmNvbnRlbnQuc3BsaXQoXCIgXCIpWzBdO1xuICB0aGlzLmF0dHJzID0gcGFyc2VBdHRyaWJ1dGVzKHRoaXMuY29udGVudC5zdWJzdHIodGhpcy5ub2RlTmFtZS5sZW5ndGgpLCB0aGlzKTtcbiAgcGFyZW50LmFkZENoaWxkKHRoaXMpO1xufVxudXRpbC5pbmhlcml0cyhIdG1sTm9kZSwgTm9kZSk7XG5cbkh0bWxOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgdGhpcy5kb21Ob2RlKGNvbnRleHQsIHBhdGgpLCBwYXRoKTtcbiAgdC5hdHRycyA9IHRoaXMucmVuZGVyQXR0cmlidXRlcyhjb250ZXh0LCBwYXRoKTtcbiAgdC5jaGlsZHJlbiA9IHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG4gIHJldHVybiB0O1xufTtcblxuZnVuY3Rpb24gYmluZGluZ05hbWUobm9kZSkge1xuICBpZihub2RlLmJpbmRpbmcpIHtcbiAgICByZXR1cm4gbm9kZS5iaW5kaW5nO1xuICB9XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlKGl0ZW0sIGNvbnRleHQpIHtcbiAgaWYodHlwZW9mIGl0ZW0gPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcmV0dXJuIGl0ZW0oY29udGV4dCk7XG4gIH1cbiAgaWYoaXRlbS5ldmFsdWF0ZSkge1xuICAgICAgcmV0dXJuIGl0ZW0uZXZhbHVhdGUoY29udGV4dCk7XG4gIH1cbiAgcmV0dXJuIGl0ZW07XG59XG5cbkh0bWxOb2RlLnByb3RvdHlwZS5yZW5kZXJBdHRyaWJ1dGVzID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCkge1xuICB2YXIgcl9hdHRycyA9IHt9LCBrZXksIGF0dHIsIG5hbWU7XG4gIGZvcihrZXkgaW4gdGhpcy5hdHRycykge1xuICAgIGF0dHIgPSB0aGlzLmF0dHJzW2tleV07XG4gICAgLy8gdG9kbywgZmluZCBhIGJldHRlciB3YXkgdG8gZGlzY3JpbWluYXRlIGV2ZW50c1xuICAgIGlmKGtleS5pbmRleE9mKFwibGstXCIpID09PSAwKSB7XG4gICAgICAvLyBhZGQgdGhlIHBhdGggdG8gdGhlIHJlbmRlciBub2RlIHRvIGFueSBsay10aGluZyBub2RlXG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgICAgaWYoa2V5ID09PSAnbGstYmluZCcpIHtcbiAgICAgICAgcl9hdHRyc1trZXldID0gZXZhbHVhdGUoYXR0ciwgY29udGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByX2F0dHJzW2tleV0gPSBcInRydWVcIjtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciB2ID0gZXZhbHVhdGUoYXR0ciwgY29udGV4dCk7XG5cbiAgICBpZih2ID09PSBmYWxzZSkge1xuICAgICAgLy8gbm90aGluZ1xuICAgIH0gZWxzZSB7XG4gICAgICByX2F0dHJzW2tleV0gPSB2O1xuICAgIH1cbiAgfVxuXG4gIGlmKFwiaW5wdXQsc2VsZWN0LHRleHRhcmVhXCIuaW5kZXhPZih0aGlzLm5vZGVOYW1lKSAhPSAtMSAmJiB0aGlzLmF0dHJzLmhhc093blByb3BlcnR5KCd2YWx1ZScpKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnMudmFsdWU7XG4gICAgbmFtZSA9IGJpbmRpbmdOYW1lKGF0dHIpO1xuICAgIGlmKG5hbWUgJiYgdGhpcy5hdHRyc1snbGstYmluZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJfYXR0cnNbJ2xrLWJpbmQnXSA9IG5hbWU7XG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgIH1cbiAgfVxuICBpZih0aGlzLm5vZGVOYW1lID09IFwidGV4dGFyZWFcIiAmJiB0aGlzLmNoaWxkcmVuLmxlbmd0aCA9PSAxICYmIHRoaXMuY2hpbGRyZW5bMF0uZXhwcmVzc2lvbikge1xuICAgIG5hbWUgPSBiaW5kaW5nTmFtZSh0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24pO1xuICAgIGlmKG5hbWUgJiYgdGhpcy5hdHRyc1snbGstYmluZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJfYXR0cnNbJ2xrLWJpbmQnXSA9IG5hbWU7XG4gICAgICByX2F0dHJzWydsay1wYXRoJ10gPSBwYXRoO1xuICAgICAgLy8gYXMgc29vbiBhcyB0aGUgdXNlciBoYXMgYWx0ZXJlZCB0aGUgdmFsdWUgb2YgdGhlIHRleHRhcmVhIG9yIHNjcmlwdCBoYXMgYWx0ZXJlZFxuICAgICAgLy8gdGhlIHZhbHVlIHByb3BlcnR5IG9mIHRoZSB0ZXh0YXJlYSwgdGhlIHRleHQgbm9kZSBpcyBvdXQgb2YgdGhlIHBpY3R1cmUgYW5kIGlzIG5vXG4gICAgICAvLyBsb25nZXIgYm91bmQgdG8gdGhlIHRleHRhcmVhJ3MgdmFsdWUgaW4gYW55IHdheS5cbiAgICAgIHJfYXR0cnMudmFsdWUgPSB0aGlzLmNoaWxkcmVuWzBdLmV4cHJlc3Npb24oY29udGV4dCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByX2F0dHJzO1xufTtcblxuSHRtbE5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0aGlzLm5vZGVOYW1lKSwga2V5LCBhdHRycz10aGlzLnJlbmRlckF0dHJpYnV0ZXMoY29udGV4dCwgcGF0aCk7XG4gIGZvcihrZXkgaW4gYXR0cnMpIHtcbiAgICBub2RlLnNldEF0dHJpYnV0ZShrZXksIGF0dHJzW2tleV0pO1xuICB9XG4gIHJldHVybiBub2RlO1xufTtcblxuZnVuY3Rpb24gRm9yTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIC8vIHN5bnRheDogZm9yIGtleSwgdmFsdWUgaW4gbGlzdFxuICAvLyAgICAgICAgIGZvciB2YWx1ZSBpbiBsaXN0XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdmFyIHZhcjEsIHZhcjIsIHNvdXJjZU5hbWU7XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoNCkpO1xuICB2YXIxID0gY29udGVudC5tYXRjaChWQVJOQU1FX1JFRyk7XG4gIGlmKCF2YXIxKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJmaXJzdCB2YXJpYWJsZSBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cih2YXIxWzBdLmxlbmd0aCkpO1xuICBpZihjb250ZW50WzBdID09ICcsJykge1xuICAgIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoMSkpO1xuICAgIHZhcjIgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgICBpZighdmFyMikge1xuICAgICAgdGhpcy5jZXJyb3IoXCJzZWNvbmQgdmFyaWFibGUgYWZ0ZXIgY29tbWEgaXMgbWlzc2luZ1wiKTtcbiAgICB9XG4gICAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cih2YXIyWzBdLmxlbmd0aCkpO1xuICB9XG4gIGlmKCFjb250ZW50Lm1hdGNoKC9eaW4vKSkge1xuICAgIHRoaXMuY2Vycm9yKFwiaW4ga2V5d29yZCBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoMikpO1xuICBzb3VyY2VOYW1lID0gY29udGVudC5tYXRjaChleHByZXNzaW9uLm5hbWVSZWcpO1xuICBpZighc291cmNlTmFtZSkge1xuICAgIHRoaXMuY2Vycm9yKFwiaXRlcmFibGUgbmFtZSBpcyBtaXNzaW5nXCIpO1xuICB9XG4gIHRoaXMuc291cmNlTmFtZSA9IHNvdXJjZU5hbWVbMF07XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudC5zdWJzdHIoc291cmNlTmFtZVswXS5sZW5ndGgpKTtcbiAgaWYoY29udGVudCAhPT0gXCJcIikge1xuICAgIHRoaXMuY2Vycm9yKFwibGVmdCBvdmVyIHVucGFyc2FibGUgY29udGVudDogXCIgKyBjb250ZW50KTtcbiAgfVxuXG4gIGlmKHZhcjEgJiYgdmFyMikge1xuICAgIHRoaXMuaW5kZXhOYW1lID0gdmFyMTtcbiAgICB0aGlzLmFsaWFzID0gdmFyMlswXTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmFsaWFzID0gdmFyMVswXTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEZvck5vZGUsIE5vZGUpO1xuXG5Gb3JOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciB0ID0gW10sIGtleTtcbiAgdmFyIGQgPSBjb250ZXh0LmdldCh0aGlzLnNvdXJjZU5hbWUpO1xuICBpZighZCkge1xuICAgIHJldHVybiB0O1xuICB9XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZCksIGk7XG4gIGZvcihpID0gMDsgaTxrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICB2YXIgbmV3X2RhdGEgPSB7fTtcbiAgICAvLyBhZGQgdGhlIGtleSB0byBhY2Nlc3MgdGhlIGNvbnRleHQncyBkYXRhXG4gICAgaWYodGhpcy5pbmRleE5hbWUpIHtcbiAgICAgIG5ld19kYXRhW3RoaXMuaW5kZXhOYW1lXSA9IGtleTtcbiAgICB9XG4gICAgdmFyIG5ld19jb250ZXh0ID0gbmV3IENvbnRleHQobmV3X2RhdGEsIGNvbnRleHQpO1xuICAgIC8vIGtlZXAgdHJhY2sgb2Ygd2hlcmUgdGhlIGRhdGEgaXMgY29taW5nIGZyb21cbiAgICBuZXdfY29udGV4dC5hZGRBbGlhcyh0aGlzLnNvdXJjZU5hbWUgKyAnLicgKyBrZXksIHRoaXMuYWxpYXMpO1xuICAgIHQgPSB0LmNvbmNhdCh0aGlzLnRyZWVDaGlsZHJlbihuZXdfY29udGV4dCwgcGF0aCwgdC5sZW5ndGggKyBwb3MpKTtcbiAgfVxuICByZXR1cm4gdDtcbn07XG5cbmZ1bmN0aW9uIElmTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKSB7XG4gIE5vZGUuY2FsbCh0aGlzLCBwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKTtcbiAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbi5qc0V4cHJlc3Npb24oY29udGVudC5yZXBsYWNlKC9eaWYvZywgXCJcIikpO1xuICBwYXJlbnQuY2hpbGRyZW4ucHVzaCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSWZOb2RlLCBOb2RlKTtcblxuSWZOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIGlmKCF0aGlzLmV4cHJlc3Npb24oY29udGV4dCkpIHtcbiAgICBpZih0aGlzLmVsc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmVsc2UudHJlZShjb250ZXh0LCBwYXRoLCBwb3MpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cbiAgcmV0dXJuIHRoaXMudHJlZUNoaWxkcmVuKGNvbnRleHQsIHBhdGgsIHBvcyk7XG59O1xuXG5mdW5jdGlvbiBFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lLCBjdXJyZW50Tm9kZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMuc2VhcmNoSWYoY3VycmVudE5vZGUpO1xufVxudXRpbC5pbmhlcml0cyhFbHNlTm9kZSwgTm9kZSk7XG5cbkVsc2VOb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHJldHVybiB0aGlzLnRyZWVDaGlsZHJlbihjb250ZXh0LCBwYXRoLCBwb3MpO1xufTtcblxuZnVuY3Rpb24gSWZFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lLCBjdXJyZW50Tm9kZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uanNFeHByZXNzaW9uKGNvbnRlbnQucmVwbGFjZSgvXmVsc2VpZi9nLCBcIlwiKSk7XG4gIHRoaXMuc2VhcmNoSWYoY3VycmVudE5vZGUpO1xufVxuLy8gaW1wb3J0YW50IHRvIGJlIGFuIElmTm9kZVxudXRpbC5pbmhlcml0cyhJZkVsc2VOb2RlLCBJZk5vZGUpO1xuXG5JZkVsc2VOb2RlLnByb3RvdHlwZS5zZWFyY2hJZiA9IGZ1bmN0aW9uIHNlYXJjaElmKGN1cnJlbnROb2RlKSB7XG4gIC8vIGZpcnN0IG5vZGUgb24gdGhlIHNhbWUgbGV2ZWwgaGFzIHRvIGJlIHRoZSBpZi9lbHNlaWYgbm9kZVxuICB3aGlsZShjdXJyZW50Tm9kZSkge1xuICAgIGlmKGN1cnJlbnROb2RlLmxldmVsIDwgdGhpcy5sZXZlbCkge1xuICAgICAgdGhpcy5jZXJyb3IoXCJjYW5ub3QgZmluZCBhIGNvcnJlc3BvbmRpbmcgaWYtbGlrZSBzdGF0ZW1lbnQgYXQgdGhlIHNhbWUgbGV2ZWwuXCIpO1xuICAgIH1cbiAgICBpZihjdXJyZW50Tm9kZS5sZXZlbCA9PSB0aGlzLmxldmVsKSB7XG4gICAgICBpZighKGN1cnJlbnROb2RlIGluc3RhbmNlb2YgSWZOb2RlKSkge1xuICAgICAgICB0aGlzLmNlcnJvcihcImF0IHRoZSBzYW1lIGxldmVsIGlzIG5vdCBhIGlmLWxpa2Ugc3RhdGVtZW50LlwiKTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnROb2RlLmVsc2UgPSB0aGlzO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUucGFyZW50O1xuICB9XG59O1xuRWxzZU5vZGUucHJvdG90eXBlLnNlYXJjaElmID0gSWZFbHNlTm9kZS5wcm90b3R5cGUuc2VhcmNoSWY7XG5cbmZ1bmN0aW9uIEV4cHJlc3Npb25Ob2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5vZGVOYW1lID0gXCIjdGV4dFwiO1xuICB2YXIgbSA9IGNvbnRlbnQubWF0Y2goZXhwcmVzc2lvbi5FWFBSRVNTSU9OX1JFRyk7XG4gIGlmKCFtKSB7XG4gICAgdGhpcy5jZXJyb3IoXCJkZWNsYXJlZCBpbXByb3Blcmx5XCIpO1xuICB9XG4gIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uanNFeHByZXNzaW9uKG1bMV0pO1xuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKEV4cHJlc3Npb25Ob2RlLCBOb2RlKTtcblxuRXhwcmVzc2lvbk5vZGUucHJvdG90eXBlLnRyZWUgPSBmdW5jdGlvbihjb250ZXh0LCBwYXRoKSB7XG4gIC8vIHJlbmRlcmVyXG4gIHZhciByZW5kZXJlciA9IFN0cmluZyhldmFsdWF0ZSh0aGlzLmV4cHJlc3Npb24sIGNvbnRleHQpKTtcbiAgdmFyIHQgPSBuZXcgcmVuZGVyLlJlbmRlcmVkTm9kZSh0aGlzLCBjb250ZXh0LCByZW5kZXJlciwgcGF0aCk7XG4gIHJldHVybiB0O1xufTtcblxuRXhwcmVzc2lvbk5vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShldmFsdWF0ZSh0aGlzLmV4cHJlc3Npb24sIGNvbnRleHQpKTtcbn07XG5cbmZ1bmN0aW9uIFN0cmluZ05vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIHRoaXMubm9kZU5hbWUgPSBcIiN0ZXh0XCI7XG4gIHRoaXMuc3RyaW5nID0gdGhpcy5jb250ZW50LnJlcGxhY2UoL15cInxcIiQvZywgXCJcIikucmVwbGFjZSgvXFxcXFwiL2csICdcIicsICdnbScpO1xuICB0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uY29tcGlsZVRleHRBbmRFeHByZXNzaW9ucyh0aGlzLnN0cmluZyk7XG4gIGlmKHBhcmVudCkge1xuICAgIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbiAgfVxufVxudXRpbC5pbmhlcml0cyhTdHJpbmdOb2RlLCBOb2RlKTtcblxuU3RyaW5nTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgpIHtcbiAgLy8gcmVuZGVyZXIgc2hvdWxkIGJlIGFsbCBhdHRyaWJ1dGVzXG4gIHZhciByZW5kZXJlciA9IGV4cHJlc3Npb24uZXZhbHVhdGVFeHByZXNzaW9uTGlzdCh0aGlzLmNvbXBpbGVkRXhwcmVzc2lvbiwgY29udGV4dCk7XG4gIHZhciB0ID0gbmV3IHJlbmRlci5SZW5kZXJlZE5vZGUodGhpcywgY29udGV4dCwgcmVuZGVyZXIsIHBhdGgpO1xuICByZXR1cm4gdDtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gZXhwcmVzc2lvbi5ldmFsdWF0ZUV4cHJlc3Npb25MaXN0KHRoaXMuY29tcGlsZWRFeHByZXNzaW9uLCBjb250ZXh0KTtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmRvbU5vZGUgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShleHByZXNzaW9uLmV2YWx1YXRlRXhwcmVzc2lvbkxpc3QodGhpcy5jb21waWxlZEV4cHJlc3Npb24sIGNvbnRleHQpKTtcbn07XG5cblN0cmluZ05vZGUucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24oY2hpbGQpIHtcbiAgdGhpcy5jZXJyb3IoXCJjYW5ub3QgaGF2ZSBjaGlsZHJlbiBcIiArIGNoaWxkKTtcbn07XG5cbmZ1bmN0aW9uIEluY2x1ZGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpIHtcbiAgTm9kZS5jYWxsKHRoaXMsIHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUpO1xuICB0aGlzLm5hbWUgPSB1dGlsLnRyaW0oY29udGVudC5zcGxpdChcIiBcIilbMV0pO1xuICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZVt0aGlzLm5hbWVdO1xuICBpZih0aGlzLnRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLmNlcnJvcihcIlRlbXBsYXRlIHdpdGggbmFtZSBcIiArIHRoaXMubmFtZSArIFwiIGlzIG5vdCByZWdpc3RlcmVkXCIpO1xuICB9XG4gIHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoSW5jbHVkZU5vZGUsIE5vZGUpO1xuXG5JbmNsdWRlTm9kZS5wcm90b3R5cGUudHJlZSA9IGZ1bmN0aW9uKGNvbnRleHQsIHBhdGgsIHBvcykge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZS50cmVlQ2hpbGRyZW4oY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbmZ1bmN0aW9uIENvbXBvbmVudE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSkge1xuICBOb2RlLmNhbGwodGhpcywgcGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSk7XG4gIGNvbnRlbnQgPSB1dGlsLnRyaW0oY29udGVudCkuc3Vic3RyKDEwKTtcbiAgdmFyIG5hbWUgPSBjb250ZW50Lm1hdGNoKFZBUk5BTUVfUkVHKTtcbiAgaWYoIW5hbWUpIHtcbiAgICB0aGlzLmNlcnJvcihcIkNvbXBvbmVudCBuYW1lIGlzIG1pc3NpbmdcIik7XG4gIH1cbiAgY29udGVudCA9IHV0aWwudHJpbShjb250ZW50LnN1YnN0cihuYW1lWzBdLmxlbmd0aCkpO1xuICB0aGlzLm5hbWUgPSBuYW1lWzBdO1xuICB0aGlzLmF0dHJzID0gcGFyc2VBdHRyaWJ1dGVzKGNvbnRlbnQsIHRoaXMpO1xuICB0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudENhY2hlW3RoaXMubmFtZV07XG4gIGlmKHRoaXMuY29tcG9uZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLmNlcnJvcihcIkNvbXBvbmVudCB3aXRoIG5hbWUgXCIgKyB0aGlzLm5hbWUgKyBcIiBpcyBub3QgcmVnaXN0ZXJlZFwiKTtcbiAgfVxuICBwYXJlbnQuYWRkQ2hpbGQodGhpcyk7XG59XG51dGlsLmluaGVyaXRzKENvbXBvbmVudE5vZGUsIE5vZGUpO1xuXG5Db21wb25lbnROb2RlLnByb3RvdHlwZS50cmVlID0gZnVuY3Rpb24oY29udGV4dCwgcGF0aCwgcG9zKSB7XG4gIHZhciBuZXdfY29udGV4dCA9IG5ldyBDb250ZXh0KHt9LCBjb250ZXh0KTtcbiAgdmFyIGtleSwgYXR0ciwgdmFsdWUsIHNvdXJjZTtcbiAgZm9yKGtleSBpbiB0aGlzLmF0dHJzKSB7XG4gICAgYXR0ciA9IHRoaXMuYXR0cnNba2V5XTtcbiAgICB2YWx1ZSA9IGV2YWx1YXRlKGF0dHIsIGNvbnRleHQpO1xuICAgIG5ld19jb250ZXh0LnNldChrZXksIHZhbHVlKTtcbiAgICBpZih0eXBlb2YgYXR0ciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBzb3VyY2UgPSBiaW5kaW5nTmFtZShhdHRyKTtcbiAgICAgIGlmKHNvdXJjZSAmJiBrZXkgIT0gc291cmNlKSB7XG4gICAgICAgIG5ld19jb250ZXh0LmFkZEFsaWFzKHNvdXJjZSwga2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYodGhpcy5jb21wb25lbnQuY29udHJvbGxlcil7XG4gICAgdGhpcy5jb21wb25lbnQuY29udHJvbGxlcihuZXdfY29udGV4dCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuY29tcG9uZW50LnRlbXBsYXRlLnRyZWVDaGlsZHJlbihuZXdfY29udGV4dCwgcGF0aCwgcG9zKTtcbn07XG5cbkNvbXBvbmVudE5vZGUucHJvdG90eXBlLnJlcHIgPSBmdW5jdGlvbihsZXZlbCkge1xuICByZXR1cm4gdGhpcy5jb21wb25lbnQudGVtcGxhdGUucmVwcihsZXZlbCArIDEpO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lLCBjdXJyZW50Tm9kZSkge1xuICB2YXIgbm9kZTtcbiAgaWYoY29udGVudC5sZW5ndGggPT09IDApIHtcbiAgICBub2RlID0gbmV3IFN0cmluZ05vZGUocGFyZW50LCBcIlxcblwiLCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignIycpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBDb21tZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdpZiAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgSWZOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2Vsc2VpZiAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgSWZFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEsIGN1cnJlbnROb2RlKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignZWxzZScpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBFbHNlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEsIGN1cnJlbnROb2RlKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZignZm9yICcpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBGb3JOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2luY2x1ZGUgJykgPT09IDApIHtcbiAgICBub2RlID0gbmV3IEluY2x1ZGVOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZihjb250ZW50LmluZGV4T2YoJ2NvbXBvbmVudCAnKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgQ29tcG9uZW50Tm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBsaW5lKzEpO1xuICB9IGVsc2UgaWYoY29udGVudC5pbmRleE9mKCdcIicpID09PSAwKSB7XG4gICAgbm9kZSA9IG5ldyBTdHJpbmdOb2RlKHBhcmVudCwgY29udGVudCwgbGV2ZWwsIGxpbmUrMSk7XG4gIH0gZWxzZSBpZigvXlxcdy8uZXhlYyhjb250ZW50KSkge1xuICAgIG5vZGUgPSBuZXcgSHRtbE5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIGlmKGNvbnRlbnQuaW5kZXhPZigne3snKSA9PT0gMCkge1xuICAgIG5vZGUgPSBuZXcgRXhwcmVzc2lvbk5vZGUocGFyZW50LCBjb250ZW50LCBsZXZlbCwgbGluZSsxKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgdXRpbC5Db21waWxlRXJyb3IoXCJjcmVhdGVOb2RlOiB1bmtub3cgbm9kZSB0eXBlIFwiICsgY29udGVudCk7XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkVGVtcGxhdGUodHBsLCB0ZW1wbGF0ZU5hbWUpIHtcblxuICAvLyBhbHJlYWR5IGEgdGVtcGxhdGU/XG4gIGlmKHRwbCBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICByZXR1cm4gdHBsO1xuICB9XG5cbiAgaWYodHBsIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICB0cGwgPSB0cGwuam9pbignXFxuJyk7XG4gIH1cblxuICB2YXIgcm9vdCA9IG5ldyBOb2RlKG51bGwsIFwiXCIsIDApLCBsaW5lcywgbGluZSwgbGV2ZWwsXG4gICAgY29udGVudCwgaSwgY3VycmVudE5vZGUgPSByb290LCBwYXJlbnQsIHNlYXJjaE5vZGU7XG5cbiAgbGluZXMgPSB0cGwuc3BsaXQoXCJcXG5cIik7XG5cbiAgZm9yKGk9MDsgaTxsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGxpbmUgPSBsaW5lc1tpXTtcbiAgICBsZXZlbCA9IGxpbmUubWF0Y2goL1xccyovKVswXS5sZW5ndGggKyAxO1xuICAgIGNvbnRlbnQgPSBsaW5lLnNsaWNlKGxldmVsIC0gMSk7XG5cbiAgICAvLyBtdWx0aWxpbmUgc3VwcG9ydDogZW5kcyB3aXRoIGEgXFxcbiAgICB2YXIgaiA9IDA7XG4gICAgd2hpbGUoY29udGVudC5tYXRjaCgvXFxcXCQvKSkge1xuICAgICAgICBqKys7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1xcXFwkLywgJycpICsgbGluZXNbaStqXTtcbiAgICB9XG4gICAgaSA9IGkgKyBqO1xuXG4gICAgLy8gbXVsdGlsaW5lIHN0cmluZ3NcbiAgICBqID0gMDtcbiAgICBpZihjb250ZW50Lm1hdGNoKC9eXCJcIlwiLykpIHtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXlwiXCJcIi8sICdcIicpO1xuICAgICAgICB3aGlsZSghY29udGVudC5tYXRjaCgvXCJcIlwiJC8pKSB7XG4gICAgICAgICAgICBqKys7XG4gICAgICAgICAgICBpZihpK2ogPiBsaW5lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiTXVsdGlsaW5lIHN0cmluZyBzdGFydGVkIGJ1dCB1bmZpbmlzaGVkIGF0IGxpbmUgXCIgKyAoaSArIDEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50ICsgbGluZXNbaStqXTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cIlwiXCIkLywgJ1wiJyk7XG4gICAgfVxuICAgIGkgPSBpICsgajtcblxuICAgIHNlYXJjaE5vZGUgPSBjdXJyZW50Tm9kZTtcbiAgICBwYXJlbnQgPSBudWxsO1xuXG4gICAgLy8gc2VhcmNoIGZvciB0aGUgcGFyZW50IG5vZGVcbiAgICB3aGlsZSh0cnVlKSB7XG5cbiAgICAgIGlmKGxldmVsID4gc2VhcmNoTm9kZS5sZXZlbCkge1xuICAgICAgICBwYXJlbnQgPSBzZWFyY2hOb2RlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYoIXNlYXJjaE5vZGUucGFyZW50KSB7XG4gICAgICAgIHRocm93IG5ldyB1dGlsLkNvbXBpbGVFcnJvcihcIkluZGVudGF0aW9uIGVycm9yIGF0IGxpbmUgXCIgKyAoaSArIDEpKTtcbiAgICAgIH1cblxuICAgICAgaWYobGV2ZWwgPT0gc2VhcmNoTm9kZS5sZXZlbCkge1xuICAgICAgICBwYXJlbnQgPSBzZWFyY2hOb2RlLnBhcmVudDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIHNlYXJjaE5vZGUgPSBzZWFyY2hOb2RlLnBhcmVudDtcbiAgICB9XG5cbiAgICBpZihwYXJlbnQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICBpZihwYXJlbnQuY2hpbGRyZW5bMF0ubGV2ZWwgIT0gbGV2ZWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IHV0aWwuQ29tcGlsZUVycm9yKFwiSW5kZW50YXRpb24gZXJyb3IgYXQgbGluZSBcIiArIChpICsgMSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBub2RlID0gY3JlYXRlTm9kZShwYXJlbnQsIGNvbnRlbnQsIGxldmVsLCBpLCBjdXJyZW50Tm9kZSk7XG4gICAgY3VycmVudE5vZGUgPSBub2RlO1xuXG4gIH1cbiAgaWYodGVtcGxhdGVOYW1lKSB7XG4gICAgdGVtcGxhdGVDYWNoZVt0ZW1wbGF0ZU5hbWVdID0gcm9vdDtcbiAgfVxuXG4gIHJldHVybiByb290O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGRUZW1wbGF0ZTogYnVpbGRUZW1wbGF0ZSxcbiAgcGFyc2VBdHRyaWJ1dGVzOiBwYXJzZUF0dHJpYnV0ZXMsXG4gIENvbnRleHQ6IENvbnRleHQsXG4gIHRlbXBsYXRlQ2FjaGU6IHRlbXBsYXRlQ2FjaGUsXG4gIGNvbXBvbmVudENhY2hlOiBjb21wb25lbnRDYWNoZSxcbiAgQ29udGV4dE5hbWU6IENvbnRleHROYW1lXG59OyIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGluaGVyaXRzKGNoaWxkLCBwYXJlbnQpIHtcbiAgY2hpbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlKTtcbiAgY2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY2hpbGQ7XG59XG5cbmZ1bmN0aW9uIENvbXBpbGVFcnJvcihtc2cpIHtcbiAgdGhpcy5uYW1lID0gXCJDb21waWxlRXJyb3JcIjtcbiAgdGhpcy5tZXNzYWdlID0gKG1zZyB8fCBcIlwiKTtcbn1cbkNvbXBpbGVFcnJvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGU7XG5cbmZ1bmN0aW9uIFJ1bnRpbWVFcnJvcihtc2cpIHtcbiAgdGhpcy5uYW1lID0gXCJSdW50aW1lRXJyb3JcIjtcbiAgdGhpcy5tZXNzYWdlID0gKG1zZyB8fCBcIlwiKTtcbn1cblJ1bnRpbWVFcnJvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGU7XG5cbmZ1bmN0aW9uIGVzY2FwZSh1bnNhZmUpIHtcbiAgcmV0dXJuIHVuc2FmZVxuICAgIC5yZXBsYWNlKC8mL2csIFwiJmFtcDtcIilcbiAgICAucmVwbGFjZSgvPC9nLCBcIiZsdDtcIilcbiAgICAucmVwbGFjZSgvPi9nLCBcIiZndDtcIilcbiAgICAucmVwbGFjZSgvXCIvZywgXCImcXVvdDtcIilcbiAgICAucmVwbGFjZSgvJy9nLCBcIiYjMDM5O1wiKTtcbn1cblxuZnVuY3Rpb24gdHJpbSh0eHQpIHtcbiAgcmV0dXJuIHR4dC5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nICxcIlwiKTtcbn1cblxuZnVuY3Rpb24gZXZlbnQobmFtZSwgZGF0YSkge1xuICB2YXIgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJDdXN0b21FdmVudFwiKTtcbiAgZXZ0LmluaXRDdXN0b21FdmVudChuYW1lLCBmYWxzZSwgZmFsc2UsIGRhdGEpO1xuICByZXR1cm4gZXZ0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5oZXJpdHM6aW5oZXJpdHMsXG4gIENvbXBpbGVFcnJvcjpDb21waWxlRXJyb3IsXG4gIFJ1bnRpbWVFcnJvcjpSdW50aW1lRXJyb3IsXG4gIGVzY2FwZTplc2NhcGUsXG4gIHRyaW06dHJpbSxcbiAgZXZlbnQ6ZXZlbnRcbn07Il19
(2)
});
