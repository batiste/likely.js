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
var DOUBLE_QUOTED_STRING_REG = /^"(\\"|[^"])+"/;
var EXPRESSION_REG = /^{{([^}]+)}}/;

function CompileError(msg) {
  this.name = "CompileError";
  this.message = (msg || "");
}
CompileError.prototype = Error.prototype;

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
}

Context.prototype.getNamePath = function(name) {
  var remaining = '', name_start = name;
  if(name_start.indexOf(".") != -1) {
    var bits = name_start.split(".");
    name_start = bits[0];
    var remaining = '.' + bits.slice(1).join('.');
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
}

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
}

function trim(txt) {
  return txt.replace(/^\s+|\s+$/g ,"");
}

function RenderedNode(node, context, renderer) {
  this.children = [];
  this.node = node;
  this.context = context;
  this.renderer = renderer;
  this.path = context.getPath();
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
}

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
}

RenderedNode.prototype.dom_html = function() {
  var html = "", i;
  var d = document.createElement('div');
  for(i=0; i<this.children.length; i++) {
    d.appendChild(this.children[i].dom_tree());
  }
  return d.innerHTML;
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
        with: rendered_node,
        value: rendered_node.renderer,
        path: path
      });
  } else {
    var a_diff = attributes_diff(this.attrs, rendered_node.attrs);
    if(a_diff.length) {
      accu.push({
        action: 'mutate',
        node: this,
        with: rendered_node,
        attributes_diff: a_diff,
        path: path
      });
    }
  }

  var l1 = this.children.length;
  var l2 = rendered_node.children.length;

  // no swap possible, but deleting a node is possible

  j = 0, i = 0, source_pt = 0;
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
    // does the next source one fits better?
    if(after_source) {
      var after_source_diff = after_source._diff(rendered_node.children[j], [], path + '.' + source_pt);
    }
    // does the next target one fits better?
    if(after_target) {
      var after_target_diff = this.children[i]._diff(after_target, [], path + '.' + source_pt);
    }

    if(    (!after_target || diff.length <= after_target_diff.length)
        && (!after_source || diff.length <= after_source_diff.length)) {
      accu = accu.concat(diff);
      source_pt += 1;
    } else if(after_source && (!after_target || after_source_diff.length <= after_target_diff.length)) {
      accu.push({
        action: 'remove',
        node: this.children[i],
        path: path + '.' + source_pt
      });
      //source_pt = source_pt - 1;
      accu = accu.concat(after_source_diff);
      // source_pt is untouched
      source_pt = source_pt + 1;
      i++;
    } else if(after_target) {
      accu.push({
        action: 'add',
        node: rendered_node.children[j],
        path: path + '.' + (source_pt)
      });
      source_pt += 2;
      accu = accu.concat(after_target_diff);
      j++;
    } else {
      throw "Should not happen"
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

}

RenderedNode.prototype.diff = function(rendered_node) {
  var accu = [];
  return this._diff(rendered_node, accu);
}

function Node(parent, content, level, line) {
  this.line = line;
  this.parent = parent;
  this.content = content;
  this.level = level;
  this.children = [];
}

function inherits(child, parent) {
  function tempConstructor() {};
  tempConstructor.prototype = parent.prototype;
  child.prototype = new tempConstructor();
  child.prototype.constructor = child;
}

Node.prototype.tree = function(context) {
  var t = new RenderedNode(this, context), i;
  t.children = this.treeChildren(context);
  return t;
}

Node.prototype.dom_node = function() {
  return [];
}

Node.prototype.treeChildren = function(context) {
  var t = [], i;
  for(i=0; i<this.children.length; i++) {
    var child = this.children[i].tree(context, parent);
    if(child) {
      t = t.concat(child);
    }
  }
  return t;
}

Node.prototype.addChild = function(child) {
  this.children.push(child);
}

Node.prototype.toString = function() {
  return this.constructor.name + "("+this.content.replace("\n", "")+") at line " + this.line;
}

function CommentNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  parent.children.push(this);
}
inherits(CommentNode, Node);

function HtmlNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.nodeName = this.content.split(" ")[0];
  this.attrs = parse_attributes(this.content.substr(this.nodeName.length));
  this.isVoid = voidTags.indexOf(this.nodeName+',') != -1;
  parent.addChild(this);
}
inherits(HtmlNode, Node);

HtmlNode.prototype.tree = function(context) {
  var t = new RenderedNode(this, context, this.dom_node(context)), i;
  t.attrs = this.render_attributes(context);
  t.children = this.treeChildren(context);
  return t;
}

HtmlNode.prototype.render_attributes = function(context) {
  var r_attrs = {}, key, attr;
  for(key in this.attrs) {
    attr = this.attrs[key];
    if(attr.evaluate) {
      r_attrs[key] = attr.evaluate(context);
    } else {
      r_attrs[key] = attr;
    }
  }
  if(this.attrs.hasOwnProperty('value') && this.nodeName == 'input') {
    attr = this.attrs['value'];
    if(attr instanceof Name) {
      r_attrs['data-binding'] = context.getNamePath(attr.name);
    }
    if(attr instanceof StringNode && attr.compiledExpression.length == 1 && attr.compiledExpression[0] instanceof Name) {
      r_attrs['data-binding'] = context.getNamePath(attr.compiledExpression[0].name);
    }
  }
  return r_attrs;
}

HtmlNode.prototype.dom_node = function(context) {
  var node = document.createElement(this.nodeName), key, v, attr, attrs=this.render_attributes(context);
  for(key in attrs) {
    node.setAttribute(key, attrs[key])
  }
  return node;
}

function ForNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  // for key, value in list
  // for value in list
  var info = this.content.slice(3).split(" in ");
  // do we have a key, value?

  var keyvalue = info[0].split(",");
  if(keyvalue.length == 2) {
    this.indexName = trim(keyvalue[0]);
    this.alias = trim(keyvalue[1]);
  } else if(keyvalue.length == 1) {
    this.alias = trim(info[0]);
  } else {
    throw new CompileError(this.toString() + ": Only one comma is allowed.");
  }
  this.sourceName = trim(info[1]);
  parent.addChild(this);
}
inherits(ForNode, Node);

ForNode.prototype.tree = function(context, parent) {
  var t = [], i, key;
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
    t = t.concat(this.treeChildren(new_context, parent));
  }
  return t;
}

function IfNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.expression = expression(content.replace(/^if/g, ""));
  parent.children.push(this);
}
inherits(IfNode, Node);

IfNode.prototype.tree = function(context, parent) {
  if(!this.expression.evaluate(context)) {
    if(this.else) {
      return this.else.tree(context, parent);
    }
    return
  }
  return this.treeChildren(context, parent);
}

function ElseNode(parent, content, level, line, currentNode) {
  Node.call(this, parent, content, level, line);
  this.searchIf(currentNode);
}
inherits(ElseNode, Node);

ElseNode.prototype.tree = function(context) {
  return this.treeChildren(context, parent);
}

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
      throw new CompileError(this.toString() + ": cannot find a corresponding if-like statement at the same level.");
    }
    if(currentNode.level == this.level) {
      if(!(currentNode instanceof IfNode)) {
        throw new CompileError(this.toString() + ": " + currentNode.toString() + " at the same level is not a if-like statement.");
      }
      currentNode.else = this;
      break;
    }
    currentNode = currentNode.parent;
  }
}
ElseNode.prototype.searchIf = IfElseNode.prototype.searchIf;

function ExpressionNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  var m = content.match(EXPRESSION_REG);
  if(!m) {
    throw CompileError("ExpressionNode declared improperly")
  }
  this.expression = expression(m[1]);
  parent.addChild(this);
}
inherits(ExpressionNode, Node);

ExpressionNode.prototype.tree = function(context, parent) {
  // renderer
  var renderer = String(this.expression.evaluate(context));
  var t = new RenderedNode(this, context, renderer);
  t.nodeName = "string";
  return t;
}

ExpressionNode.prototype.dom_node = function(context) {
  return document.createTextNode(this.expression.evaluate(context));
}

function StringNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.string = this.content.replace(/^"|"$/g, "").replace(/\\"/g, '"', 'gm');
  this.compiledExpression = compileExpressions(this.string);
  if(parent) {
    parent.addChild(this);
  }
}
inherits(StringNode, Node);

StringNode.prototype.tree = function(context) {
  // renderer should be all attributes
  var renderer = evaluateExpressionList(this.compiledExpression, context);
  var t = new RenderedNode(this, context, renderer);
  t.nodeName = "string";
  return t;
}

StringNode.prototype.evaluate = function(context) {
  return evaluateExpressionList(this.compiledExpression, context);
}

StringNode.prototype.dom_node = function(context) {
  return document.createTextNode(evaluateExpressionList(this.compiledExpression, context));
}

StringNode.prototype.addChild = function(child) {
  throw new CompileError(child.toString() + " cannot be a child of " + this.toString());
}

function IncludeNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.name = trim(content.split(" ")[1]);
  parent.addChild(this);
}
inherits(IncludeNode, Node);

IncludeNode.prototype.tree = function(context) {
  return templateCache[this.name].treeChildren(context);
}

function createNode(parent, content, level, line, currentNode) {
  var node;
  if(content.length == 0) {
    node = new StringNode(parent, "\n", level, line+1);
  } else if(content.indexOf('#') == 0) {
    node = new CommentNode(parent, content, level, line+1);
  } else if(content.indexOf('if ') == 0) {
    node = new IfNode(parent, content, level, line+1);
  } else if(content.indexOf('elseif ') == 0) {
    node = new IfElseNode(parent, content, level, line+1, currentNode);
  } else if(content.indexOf('else') == 0) {
    node = new ElseNode(parent, content, level, line+1, currentNode);
  } else if(content.indexOf('for ') == 0) {
    node = new ForNode(parent, content, level, line+1);
  } else if(content.indexOf('include ') == 0) {
    node = new IncludeNode(parent, content, level, line+1);
  } else if(content.indexOf('"') == 0) {
    var node = new StringNode(parent, content, level, line+1);
  } else if(/^\w/.exec(content)) {
    var node = new HtmlNode(parent, content, level, line+1);
  } else if(content.indexOf('{{') == 0) {
    var node = new ExpressionNode(parent, content, level, line+1);
  } else {
    throw new CompileError("createNode: unknow node type " + content);
  }
  return node;
}

function build(tpl, templateName) {
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
        throw new CompileError("Indentation error at line " + i);
      }

      if(level == searchNode.level) {
        parent = searchNode.parent;
        break;
      }

      searchNode = searchNode.parent;
    }

    if(parent.children.length) {
      if(parent.children[0].level != level) {
        throw new CompileError("Indentation error at line " + i);
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
    throw "Invalid string value "+txt;
  }
}
StringValue.prototype.evaluate = function(context) {
  return this.value;
}
StringValue.reg = /^"(?:\\"|[^"])+"|^'(?:\\'|[^'])+'/;

function EqualOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
}
EqualOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) == this.right.evaluate(context);
}
EqualOperator.reg = /^==/;

function NotEqualOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
}
NotEqualOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) != this.right.evaluate(context);
}
NotEqualOperator.reg = /^!=/;

function BiggerOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
}
BiggerOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) > this.right.evaluate(context);
}
BiggerOperator.reg = /^>/;

function SmallerOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
  this.evaluate = function(context) {
    return this.left.evaluate(context) < this.right.evaluate(context);
  }
}
SmallerOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) < this.right.evaluate(context);
}
SmallerOperator.reg = /^</;

function OrOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
}
OrOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) || this.right.evaluate(context);
}
OrOperator.reg = /^or/;

function AndOperator(txt) {
  this.type = "operator";
  this.left = null;
  this.right = null;
}
AndOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) && this.right.evaluate(context);
}
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
}
Name.reg = PROPERTY_REG;

function Filter(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
Filter.prototype.evaluate = function(context) {
  var fct = context.get(this.right.name);
  return fct.apply({}, [this.left.evaluate(context)]);
}
Filter.reg = /^\|/;

// math

function MultiplyOperator(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
MultiplyOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) * this.right.evaluate(context);
}
MultiplyOperator.reg = /^\*/;

function PlusOperator(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
PlusOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) + this.right.evaluate(context);
}
PlusOperator.reg = /^\+/;

function MinusOperator(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
MinusOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) - this.right.evaluate(context);
}
MinusOperator.reg = /^\-/;

function NumberValue(txt) {
  this.type = "value";
  this.number = parseFloat(txt, 10);
  this.evaluate = function(context) {
    return this.number;
  }
}
NumberValue.reg = /^[0-9]+/;

function IfOperator(txt) {
  this.type = 'operator';
  this.left = null;
  this.right = null;
}
IfOperator.prototype.evaluate = function(context) {
  if(this.right.evaluate(context)) {
    return this.left.evaluate(context);
  }
  return "";
}
IfOperator.reg = /^if/;

function NotOperator(txt) {
  this.type = 'unary';
  this.right = null;
}
NotOperator.prototype.evaluate = function(context) {
  return !this.right.evaluate(context);
}
NotOperator.reg = /^!/;

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
  for(var i=0; i<expressions.length; i++) {
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
  OrOperator,
  AndOperator,
  Filter,
  IfOperator,
  StringValue,
  NumberValue,
  Name,
];

function expression(input) {
    return build_expressions(parse_all_expressions(input));
}

function parse_all_expressions(input) {
  // expression are built like trees as well, a sort
  // of parser in the parser.
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
        }
    }
    if(found == false) {
      throw new CompileError("Expression parser: Impossible to parse further : " + input);
    }
  }
  return parsed;
}

function build_expressions(list) {
  // build a tree of expression respecting precedence
  var i, j, precedence, expr;
  // a realy dumb algo
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
          throw new CompileError("Expression builder: found a value when an operator was expected " + (expr.prototype));
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

function parse_attributes(v) {
    var attrs = {}, n, v, s;
    while(v) {
        v = trim(v);
        n = v.match(HTML_ATTR_REG);
        if(!n) {
            throw "parse_attributes: No attribute name found in "+v;
        }
        v = v.substr(n[0].length);
        n = n[0];
        if(v[0] != "=") {
            throw "parse_attributes: No equal sign after name "+n;
        }
        v = v.substr(1);
        s = v.match(DOUBLE_QUOTED_STRING_REG);
        if(s) {
          attrs[n] = new StringNode(null, s[0]);
        } else {
          s = v.match(EXPRESSION_REG);
          if(s) {
            var expr = expression(s[1]);
            attrs[n] = expr;
          } else {
            throw "parse_attributes: No string or expression found after name "+n;
          }
        }
        v = v.substr(s[0].length);
    }
    return attrs;
}

function attributes_diff(a, b) {
  var changes = [], key;
  for(key in a) {
      if(b[key] !== undefined) {
        if(b[key] != a[key]) {
          changes.push({action:"mutate", key:key, value:b[key]});
        }
      } else {
        changes.push({action:"removed", key:key});
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
  var i, j, _diff, _dom;
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
        _dom = getDom(dom, _diff.path, 1);
        _dom.appendChild(newNode);
      }
    }
    if(_diff.action == "mutate") {
      _dom = getDom(dom, _diff.path);
      for(j=0; j<_diff.attributes_diff.length; j++) {
        var a_diff = _diff.attributes_diff[j];
        if(a_diff.action == "mutate") {
          if(a_diff.key == "value") {
            if(_dom.value != a_diff.value) {
              _dom.value = a_diff.value;
            }
          }
          _dom.setAttribute(a_diff.key, a_diff.value);
        }
      }
    }
    if(_diff.action == "stringmutate") {
      _dom = getDom(dom, _diff.path);
      _dom.nodeValue = _diff.value;
    }
  }
}

function updateData(data, dom) {
  var path = dom.getAttribute("data-binding");
  if(!path) {
    throw "No data-path attribute on the element";
  }
  var paths = path.split("."), i;
  var value = dom.value;
  var searchData = data;
  for(i = 1; i<paths.length-1; i++) {
    searchData = searchData[paths[i]];
  }
  searchData[paths[i]] = value;
}

function bind(dom, data, template) {
  // double data binding between some data and some dom
  var binding = {dom:dom, data:data, template:template};
  binding.currentTree = tree(data);
  var newTree;

  function tree() {
    var context = new Context(binding.data);
    return binding.template.tree(context);
  }

  // create the dom
  dom.innerHTML = "";
  binding.currentTree.dom_tree(dom);

  function diff() {
    newTree = tree();
    var diff = binding.currentTree.diff(newTree);
    apply_diff(diff, binding.dom);
    binding.currentTree = newTree;
  }

  function change(e) {
    var item = e.target;
    var path = item.getAttribute('data-binding');
    if(path) {
      updateData(binding.data, item);
      var event = new CustomEvent("dataViewChanged", {"path": path});
      dom.dispatchEvent(event);
    }
  }

  dom.addEventListener("keyup", change);

  binding.dataModelChanged = function() {
    diff();
  }

  return binding;
}

var likely = {
  Template:build,
  updateData:updateData,
  bind:bind,
  getDom:getDom,
  parse_all_expressions:parse_all_expressions,
  compileExpressions:compileExpressions,
  build_expressions:build_expressions,
  expressions:{
    StringValue:StringValue
  },
  apply_diff:apply_diff,
  parse_attributes:parse_attributes,
  attributes_diff:attributes_diff,
  Context:Context,
  CompileError:CompileError,
  escape:escape,
  expression:expression
}

// export
window.likely = likely;

})();
