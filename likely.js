/* Likely.js version 0.9.0,
   Python style HTML template language with bi-directionnal data binding
   batiste bieler 2013 */

"use strict";
(function() {

var voidTags="br,img,input,";
var templateCache = {};
// a name here is also any valid JS object property
var VARNAME_REG = /^[A-Za-z][\w]{0,}/;
var PROPERTY_REG = /^[A-Za-z][\w\.]{0,}/;
var HTML_ATTR_REG = /^[A-Za-z][\w-]{0,}/;
var DOUBLE_QUOTED_STRING_REG = /^"(\\"|[^"])*"/;
var EXPRESSION_REG = /^{{([^}]+)}}/;

function inherits(child, parent) {
  function TempConstructor() {}
  // child.prototype = Object.create(parent.prototype);
  TempConstructor.prototype = parent.prototype;
  child.prototype = new TempConstructor();
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

function Context(data, parent, sourceName, alias, key) {
  this.data = data;
  this.parent = parent;
  this.path = "";

  this.sourceName = sourceName;
  this.alias = alias;
  this.key = key;

  if(parent && parent.path) {
    this.path = parent.path;
  }
  if(sourceName) {
    if(parent && parent.alias == sourceName) {
      this.path = this.path + "." + key;
    } else {
      this.path = this.path + "." + sourceName + "." + key;
    }
  }
}

Context.prototype.getPath = function() {
  return this.path || ".";
};

Context.prototype.getNamePath = function(name) {
  var remaining = '', name_start = name;
  if(name_start.indexOf(".") != -1) {
    var bits = name_start.split(".");
    name_start = bits[0];
    remaining = '.' + bits.slice(1).join('.');
  }
  if(name_start == this.alias) {
    return this.path + remaining;
  }
  if(this.data[name_start] !== undefined) {
    return this.path + '.' + name_start + remaining;
  }
  if(this.parent) {
    return this.parent.getNamePath(name);
  }
};

Context.prototype.get = function(name) {
  // quick path
  if(name.indexOf(".") == -1) {
    if(this.data.hasOwnProperty(name)) {
      return this.data[name];
    }
    return this.parent && this.parent.get(name);
  }

  var bits = name.split(".");
  var data = this.data;
  // we go in for a search if the first part matches
  if(data.hasOwnProperty(bits[0])) {
    data = data[bits[0]];
    var i = 1;
    while(i < bits.length) {
      data = data[bits[i]];
      if(data === undefined) {
        break;
      }
      i++;
    }
    return data;
  }
  // data not found, let's search in the parent
  if(this.parent) {
    return this.parent.get(name);
  }
};

function trim(txt) {
  return txt.replace(/^\s+|\s+$/g ,"");
}

function RenderedNode(node, context, renderer, path) {
  this.children = [];
  this.node = node;
  this.context = context;
  this.renderer = renderer;
  this.path = path || "";
}

RenderedNode.prototype.repr = function(level) {
  var str = "", i;
  if(level === undefined) {
    level = 0;
  }
  for(i=0; i<level; i++) {
    str += "  ";
  }
  str += String(this.node) + "\r\n";
  for(i=0; i<this.children.length; i++) {
    str += this.children[i].repr(level + 1);
  }
  return str;
};

RenderedNode.prototype.dom_tree = function(append_to) {
  var node = append_to || this.node.dom_node(this.context), i;
  for(i=0; i<this.children.length; i++) {
    if(node.push) {
      node.push(this.children[i].dom_tree());
    } else {
      node.appendChild(this.children[i].dom_tree());
    }
  }
  return node;
};

RenderedNode.prototype.dom_html = function() {
  var html = "", i;
  var d = document.createElement('div');
  for(i=0; i<this.children.length; i++) {
    d.appendChild(this.children[i].dom_tree());
  }
  return d.innerHTML;
};

function diff_cost(diff) {
  var value=0, i;
  for(i=0; i<diff.length; i++) {
    if(diff[i].action == "remove") {
      value += 10;
    }
    if(diff[i].action == "add") {
      value += 10;
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
    //throw "node type has changed"
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
    var a_diff = attributes_diff(this.attrs, rendered_node.attrs);
    if(a_diff.length) {
      accu.push({
        action: 'mutate',
        node: this,
        attributes_diff: a_diff,
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
    var diff = 0, after_source_diff = 0, after_target_diff = 0;
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

    var cost = diff_cost(diff);
    // does the next source one fits better?
    if(after_source) {
      after_source_diff = after_source._diff(rendered_node.children[j], [], path + '.' + source_pt);
      // needs some handicap otherwise similar nodes will be swapped needlessly
      var after_source_cost = diff_cost(after_source_diff) + 5;
    }
    // does the next target one fits better?
    if(after_target) {
      after_target_diff = this.children[i]._diff(after_target, [], path + '.' + source_pt);
      var after_target_cost = diff_cost(after_target_diff) + 5; // needs a big handicap
    }

    if(    (!after_target || cost <= after_target_cost)
        && (!after_source || cost <= after_source_cost)) {
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

Node.prototype.tree = function(context, path) {
  if(path === undefined) {
    path = '';
    this.isRoot = true;
  }
  var t = new RenderedNode(this, context, '', path), i;
  t.children = this.treeChildren(context, path, 0);
  return t;
};

Node.prototype.cerror = function(msg) {
  throw new CompileError(this.toString() + ": " + msg);
};

Node.prototype.dom_node = function() {
  return [];
};

Node.prototype.treeChildren = function(context, path, pos) {
  var t = [], i, p, j, k =0;
  j = pos;
  for(i=0; i<this.children.length; i++) {
    p = path;
    if(this.children[i].hasOwnProperty('nodeName')) {
      p += '.' + j;
      j++;
    }
    var children = this.children[i].tree(context, p, 0);
    if(children.hasOwnProperty('length')) {
      t = t.concat(children);
      j += children.length;
    } else {
      t.push(children);
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
}
inherits(CommentNode, Node);

function HtmlNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.nodeName = this.content.split(" ")[0];
  this.attrs = parse_attributes(this.content.substr(this.nodeName.length), this);
  this.isVoid = voidTags.indexOf(this.nodeName+',') != -1;
  parent.addChild(this);
}
inherits(HtmlNode, Node);

HtmlNode.prototype.tree = function(context, path, pos) {
  var t = new RenderedNode(this, context, this.dom_node(context), path);
  t.attrs = this.render_attributes(context, path);
  t.children = this.treeChildren(context, path, pos);
  return t;
};

function bindingPathName(node, context) {
  if(node instanceof Name) {
    return context.getNamePath(node.name);
  }
  if(node instanceof StringNode && node.compiledExpression.length == 1 && node.compiledExpression[0] instanceof Name) {
    return context.getNamePath(node.compiledExpression[0].name);
  }
}

HtmlNode.prototype.render_attributes = function(context) {
  var r_attrs = {}, key, attr, p;
  for(key in this.attrs) {
    attr = this.attrs[key];
    if(key === "lk-click") {
      // click is evaluated on event only
      r_attrs[key] = 'binded';
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
    p = bindingPathName(attr, context);
    if(p && this.attrs['lk-bind'] === undefined){
      r_attrs['lk-bind'] = p;
    }
  }
  if(this.nodeName == "textarea" && this.children.length == 1) {
    p = bindingPathName(this.children[0].expression, context);
    if(p && this.attrs['lk-bind'] === undefined){
      r_attrs['lk-bind'] = p;
      // as soon as the user has altered the value of the textarea or script has altered 
      // the value property of the textarea, the text node is out of the picture and is no 
      // longer bound to the textarea's value in any way.
      r_attrs.value = this.children[0].expression.evaluate(context);
    }
  }
  return r_attrs;
};

HtmlNode.prototype.dom_node = function(context) {
  var node = document.createElement(this.nodeName), key, v, attr, attrs=this.render_attributes(context);
  for(key in attrs) {
    node.setAttribute(key, attrs[key]);
  }
  return node;
};

function ForNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  // for key, value in list
  // for value in list
  var var1, var2, sourceName;
  content = trim(content.substr(4));
  var1 = content.match(VARNAME_REG);
  if(!var1) {
    this.cerror("first variable name is missing");
  }
  content = trim(content.substr(var1[0].length));
  if(content[0] == ',') {
    content = trim(content.substr(1));
    var2 = content.match(VARNAME_REG);
    if(!var2) {
      this.cerror("second variable after comma is missing");
    }
    content = trim(content.substr(var2[0].length));
  }
  if(!content.match(/^in/)) {
    this.cerror("in keyword is missing");
  }
  content = trim(content.substr(2));
  sourceName = content.match(PROPERTY_REG);
  if(!sourceName) {
    this.cerror("iterable name is missing");
  }
  this.sourceName = sourceName[0];
  content = trim(content.substr(sourceName[0].length));
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
inherits(ForNode, Node);

ForNode.prototype.tree = function(context, path) {
  var t = [], key;
  var d = context.get(this.sourceName);
  for(key in d) {
    // putting the alias in the context
    var new_data = {};
    new_data[this.alias] = d[key];
    // add the key to access the context
    if(this.indexName) {
        new_data[this.indexName] = key;
    }
    var new_context = new Context(new_data, context, this.sourceName, this.alias, key);
    t = t.concat(this.treeChildren(new_context, path, t.length));
  }
  return t;
};

function IfNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.expression = expression(content.replace(/^if/g, ""));
  parent.children.push(this);
}
inherits(IfNode, Node);

IfNode.prototype.tree = function(context, path, pos) {
  if(!this.expression.evaluate(context)) {
    if(this.else) {
      return this.else.tree(context, path);
    }
    return;
  }
  return this.treeChildren(context, path, pos);
};

function ElseNode(parent, content, level, line, currentNode) {
  Node.call(this, parent, content, level, line);
  this.searchIf(currentNode);
}
inherits(ElseNode, Node);

ElseNode.prototype.tree = function(context, path, pos) {
  return this.treeChildren(context, path, pos);
};

function IfElseNode(parent, content, level, line, currentNode) {
  Node.call(this, parent, content, level, line);
  this.expression = expression(content.replace(/^elseif/g, ""));
  this.searchIf(currentNode);
}
// important to be an IfNode
inherits(IfElseNode, IfNode);

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
  var m = content.match(EXPRESSION_REG);
  if(!m) {
    this.cerror("declared improperly");
  }
  this.expression = expression(m[1]);
  parent.addChild(this);
}
inherits(ExpressionNode, Node);

ExpressionNode.prototype.tree = function(context, path) {
  // renderer
  var renderer = String(this.expression.evaluate(context));
  var t = new RenderedNode(this, context, renderer, path);
  //t.nodeName = "string";
  return t;
};

ExpressionNode.prototype.dom_node = function(context) {
  return document.createTextNode(this.expression.evaluate(context));
};

function StringNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.nodeName = "string";
  this.string = this.content.replace(/^"|"$/g, "").replace(/\\"/g, '"', 'gm');
  this.compiledExpression = compileExpressions(this.string);
  if(parent) {
    parent.addChild(this);
  }
}
inherits(StringNode, Node);

StringNode.prototype.tree = function(context, path) {
  // renderer should be all attributes
  var renderer = evaluateExpressionList(this.compiledExpression, context);
  var t = new RenderedNode(this, context, renderer, path);
  t.nodeName = "string";
  return t;
};

StringNode.prototype.evaluate = function(context) {
  return evaluateExpressionList(this.compiledExpression, context);
};

StringNode.prototype.dom_node = function(context) {
  return document.createTextNode(evaluateExpressionList(this.compiledExpression, context));
};

StringNode.prototype.addChild = function(child) {
  this.cerror("cannot have children");
};

function IncludeNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.name = trim(content.split(" ")[1]);
  parent.addChild(this);
}
inherits(IncludeNode, Node);

IncludeNode.prototype.tree = function(context, path, pos) {
  return templateCache[this.name].treeChildren(context, path, pos);
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
  } else if(content.indexOf('"') === 0) {
    node = new StringNode(parent, content, level, line+1);
  } else if(/^\w/.exec(content)) {
    node = new HtmlNode(parent, content, level, line+1);
  } else if(content.indexOf('{{') === 0) {
    node = new ExpressionNode(parent, content, level, line+1);
  } else {
    throw new CompileError("createNode: unknow node type " + content);
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
        throw new CompileError("Indentation error at line " + (i + 1));
      }

      if(level == searchNode.level) {
        parent = searchNode.parent;
        break;
      }

      searchNode = searchNode.parent;
    }

    if(parent.children.length) {
      if(parent.children[0].level != level) {
        throw new CompileError("Indentation error at line " + (i + 1));
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

// Expression evaluation engine
function StringValue(txt) {
  this.type = "value";
  if(txt[0] == '"') {
    this.value = txt.replace(/^"|"$/g, "");
  } else if(txt[0] == "'") {
    this.value = txt.replace(/^'|'$/g, "");
  } else {
    throw new CompileError("Invalid string value " + txt);
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
  if(typeof(value) == "function") {
    return value.apply(this, [context.data]);
  }
  return value;
};
Name.reg = PROPERTY_REG;

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
  var m = txt.match(/^([a-zA-Z][a-zA-Z0-9]*)\(([^\)]*)\)/);
  this.funcName = m[1];
  this.params = m[2].split(',');
}
FunctionCall.prototype.evaluate = function(context) {
  var func = context.get(this.funcName), i, params=[];
  for(i=0; i<this.params.length; i++) {
    params.push(context.get(trim(this.params[i])));
  }
  return func.apply(context.data, params);
}
FunctionCall.reg = /^[a-zA-Z][a-zA-Z0-9]*\([^\)]*\)/;

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
    throw new RuntimeError('right side of in operator cannot be undefined');
  }
  if(right.indexOf) {
    return right.indexOf(left) != -1;
  } else {
    return right.hasOwnProperty(left);
  }
};
InOperator.reg = /^in /;

function AssignOperator(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
AssignOperator.prototype.evaluate = function(context) {
  context.setValue(this.left, this.right);
};
AssignOperator.reg = /^= /;


function NotOperator(txt) {
  this.type = 'unary';
  this.right = null;
}
NotOperator.prototype.evaluate = function(context) {
  return !this.right.evaluate(context);
};
NotOperator.reg = /^not /;

function compileExpressions(txt) {
  // compile the expressions found in the text
  // and return a list of text+expressions
  var expressReg = /{{[^}]+}}/;
  var list = [];
  while(true) {
    var match = expressReg.exec(txt);
    if(!match) {
      if(txt) {
        list.push(txt);
      }
      break;
    }

    var core = match[0].replace(/^{{|}}$/g, '');
    var exp = expression(core);
    var around = txt.split(match[0], 2);
    if(around[0].length) {
      list.push(around[0]);
    }
    list.push(exp);
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

var expression_list = [
  MultiplyOperator,
  PlusOperator,
  MinusOperator,
  BiggerOperator,
  SmallerOperator,
  EqualOperator,
  NotEqualOperator,
  Filter,
  NotOperator,
  IfOperator,
  InOperator,
  OrOperator,
  AndOperator,
  StringValue,
  NumberValue,
  FunctionCall,
  Name,
];

function expression(input) {
  return build_expressions(parse_all_expressions(input));
}

function parse_all_expressions(input) {
  // create a list of expressions
  var currentExpr = null, i, expr, match, found, parsed = [];
  while(input) {
    input = trim(input);
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
      throw new CompileError("Expression parser: Impossible to parse further : " + input);
    }
  }
  return parsed;
}

function build_expressions(list) {
  // build a tree of expression respecting precedence
  var i, j, precedence, expr;
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
        if(expr.type == 'pipe') {
          expr.left = list[j-1];
          list.splice(j-1, 1);
          list[j-1] = expr;
          j = j - 1;
        }
        if(expr.type == 'unary') {
          expr.right = list[j+1];
          list.splice(j+1, 1);
        }
        if(expr.type == 'value') {
          throw new CompileError("Expression builder: expected an operator but got " + expr.constructor.name);
        }
      }
    }
  }
  if(list.length == 1) {
    return list[0];
  } else {
    throw new CompileError("Expression builder: incorrect expression construction " + list);
  }
}

function escape(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parse_attributes(v, node) {
    var attrs = {}, n, s;
    while(v) {
        v = trim(v);
        n = v.match(HTML_ATTR_REG);
        if(!n) {
            node.cerror("parse_attributes: No attribute name found in "+v);
        }
        v = v.substr(n[0].length);
        n = n[0];
        if(v[0] != "=") {
            node.cerror("parse_attributes: No equal sign after name "+n);
        }
        v = v.substr(1);
        s = v.match(DOUBLE_QUOTED_STRING_REG);
        if(s) {
          attrs[n] = new StringNode(null, s[0]);
        } else {
          s = v.match(EXPRESSION_REG);
          if(s === null) {
            node.cerror("parse_attributes: No string or expression found after name "+n);
          } else {
            var expr = expression(s[1]);
            attrs[n] = expr;
          }
        }
        v = v.substr(s[0].length);
    }
    return attrs;
}

function attributes_diff(a, b) {
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
  if(stop === undefined)
    stop = 0;
  for(i=0; i<(p.length - stop); i++) {
    if(p[i]) { // first one is ""
      d = d.childNodes[parseInt(p[i], 10)];
    }
  }
  return d;
}

function apply_diff(diff, dom) {
  var i, j, _diff, _dom, parent;
  for(i=0; i<diff.length; i++) {
    _diff = diff[i];
    _dom = getDom(dom, _diff.path);
    if(_diff.action == "remove") {
      _dom.parentNode.removeChild(_dom);
    }
    if(_diff.action == "add") {
      var newNode = _diff.node.dom_tree();
      if(_dom) {
        _dom.parentNode.insertBefore(newNode, _dom);
      } else {
        // get the parent
        parent = getDom(dom, _diff.path, 1);
        parent.appendChild(newNode);
      }
    }
    if(_diff.action == "mutate") {
      for(j=0; j<_diff.attributes_diff.length; j++) {
        var a_diff = _diff.attributes_diff[j];
        if(a_diff.action == "mutate") {
          // important for select
          if("value,selected,checked".indexOf(a_diff.key) != -1) {
            _dom[a_diff.key] = a_diff.value;
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

function updateData(data, dom) {
  var path = dom.getAttribute("lk-bind"), value;
  if(!path) {
    throw "No data-path attribute on the element";
  }
  var paths = path.split("."), i;
  if(dom.type == 'checkbox' && !dom.checked) {
    value = "";
  } else {
    value = dom.value;// || dom.getAttribute("value");
  }
  var searchData = data;
  for(i = 1; i<paths.length-1; i++) {
    searchData = searchData[paths[i]];
  }
  searchData[paths[i]] = value;
}

function Component(dom, template, data) {
  // double data binding between some data and some dom
  this.dom = dom;
  this.data = data;
  this.context = new Context(this.data);
  this.template = template;
  this.init();
}

Component.prototype.tree = function() {
  return this.template.tree(new Context(this.data));
};

Component.prototype.init = function() {
  this.dom.innerHTML = "";
  this.currentTree = this.tree();
  this.currentTree.dom_tree(this.dom);
  this.bindEvents();
};

Component.prototype.diff = function() {
  var newTree = this.tree();
  var diff = this.currentTree.diff(newTree);
  apply_diff(diff, this.dom);
  this.currentTree = newTree;
  this.lock = false;
};

Component.prototype.dataEvent = function(e) {
  var dom = e.target;
  var path = dom.getAttribute('lk-bind');
  if(path) {
    updateData(this.data, dom);
    if(!this.lock) {
      this.lock = true;
      this.diff();
    }
    var event = new CustomEvent("dataViewChanged", {"path": path});
    this.dom.dispatchEvent(event);
  }
};

Component.prototype.clickEvent = function(e) {
  var dom = e.target;
  var name = dom.getAttribute('lk-click');
  var domPath = [];
  var p = dom;
  if(name) {
    var fct = this.context.get(name);
    if(typeof(fct) == "function") {
      return fct.apply(this, [e, this.context]);
    }
  }
};

Component.prototype.bindEvents = function() {
  var that = this;
  this.dom.addEventListener("keyup", function(e){ that.dataEvent(e); }, false);
  this.dom.addEventListener("change", function(e){ that.dataEvent(e); }, false);
  this.dom.addEventListener("click", function(e){ that.clickEvent(e); }, false);
};

Component.prototype.update = function(){
  this.diff();
};

var likely = {
  Template:buildTemplate,
  updateData:updateData,
  Component:Component,
  getDom:getDom,
  parse_all_expressions:parse_all_expressions,
  compileExpressions:compileExpressions,
  build_expressions:build_expressions,
  expressions:{
    StringValue:StringValue
  },
  apply_diff:apply_diff,
  diff_cost:diff_cost,
  parse_attributes:parse_attributes,
  attributes_diff:attributes_diff,
  Context:Context,
  CompileError:CompileError,
  escape:escape,
  expression:expression
};

// export
window.likely = likely;

})();
