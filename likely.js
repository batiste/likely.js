/* Likely.js version 0.9.0,
   Python style HTML template language with bi-directionnal data binding
   batiste bieler 2013 */

"use strict";
(function() {

var voidTags="br,img,input,";
var templateCache = {};
var NAME_REG = /^[A-z][\w\.]*/;

// simple hash to avoid to store big HTML chunks
// in the cache
function sdbmHash(str) {
  var hash = 0, i, l, char;
  if (str.length == 0) return hash;
  for (i = 0, l = str.length; i < l; i++) {
    char  = str.charCodeAt(i);
    hash  = ((hash<<5)-hash)+char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

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

// TODO: this function is incorrect and need some work
Context.prototype.getPath = function() {
  return this.path || ".";
}

Context.prototype.get = function(name) {
  // quick path
  if(name.indexOf(".") == -1) {
    if(name in this.data) {
      return this.data[name];
    }
    return this.parent && this.parent.get(name);
  }

  var bits = name.split(".");
  var data = this.data;
  // we go in for a search if the first part matches
  if(bits[0] in data) {
    data = data[bits[0]];
    var i = 1;
    while(i < bits.length) {
      data = data[bits[i]];
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
  this.path = undefined;
  //this.htmlPath = "";
}

RenderedNode.prototype.repr = function(level) {
  var str = "", i;
  if(level === undefined) {
    level = 0;
  }
  for(i=0; i<level; i++) {
    str += "  ";
  }
  str += String(this.node) + " (path:" + this.path + ") \r\n";
  for(i=0; i<this.children.length; i++) {
    str += this.children[i].repr(level + 1);
  }
  return str;
}

RenderedNode.prototype.html = function() {
  var html = "", i;
  html = this.node.start_html(this.context);
  for(i=0; i<this.children.length; i++) {
    html += this.children[i].html();
  }
  html += this.node.end_html(this.context);
  return html;
}

//Array.prototype.diff = function(a) {
//  return this.filter(function(i) {return !(a.indexOf(i) > -1);});
//};

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
    throw "node type has changed"
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
      path: path + '.' + (source_pt + 1),
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
  t.path = context.getPath();
  t.children = this.treeChildren(context);
  return t;
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

Node.prototype.start_html = function(context) {
  return "";
}

Node.prototype.end_html = function(context) {
  return "";
}

Node.prototype.addChild = function(child) {
  this.children.push(child);
}

Node.prototype.render = function(context) {
  var str = "", i;
  for(i=0; i<this.children.length; i++) {
    str += this.children[i].render(context, false);
  }
  return str;
}

Node.prototype.renderTo = Node.prototype.render;

Node.prototype.toString = function() {
  return this.constructor.name + "("+this.content.replace("\n", "")+") at line " + this.line;
}

function CommentNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  parent.children.push(this);
}
inherits(CommentNode, Node);
CommentNode.prototype.render = function(context) {
  return "";
}

function HtmlNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.nodeName = this.content.split(" ")[0];
  this.attrs = parse_attributes(this.content.substr(this.nodeName.length));
  this.isVoid = voidTags.indexOf(this.nodeName+',') != -1;
  parent.addChild(this);
}
inherits(HtmlNode, Node);

HtmlNode.prototype.tree = function(context) {
  // renderer should be all attributes
  var renderer = this.start_html(context) + this.end_html(context);
  var t = new RenderedNode(this, context, renderer), i;
  t.path = context.getPath();
  t.attrs = this.render_attributes(context);
  //if(this.nodeName == 'input') {
  //  t.attrs['data-path'] = new StringNode(null, context.getPath());
  //}
  t.children = this.treeChildren(context);
  return t;
}

HtmlNode.prototype.render_attributes = function(context) {
  var r_attrs = {}, key;
  for(key in this.attrs) {
    if(this.attrs[key].evaluate) {
      r_attrs[key] = this.attrs[key].evaluate(context);
    } else {
      r_attrs[key] = this.attrs[key];
    }
  }
  return r_attrs;
}

HtmlNode.prototype.start_html = function(context) {
  var key, v, attrs_renderer = "";
  for(key in this.attrs) {
    if(this.attrs[key].evaluate) {
      v = '"' + this.attrs[key].evaluate(context) + '"';
    } else {
      // should probably be a string expression here
      v = this.attrs[key];
    }
    attrs_renderer += " " + key + "=" + v;
  }

  if(this.isVoid) {
    return "<"+ this.nodeName + attrs_renderer + "/>";
  }
  return "<"+ this.nodeName + attrs_renderer + ">";
}

HtmlNode.prototype.end_html = function(context) {
  if(!this.isVoid) {
    return "</"+ this.nodeName + ">";
  }
  return "";
}

function ForNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
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

  // Non rendered node are excluded
  //var t = new RenderedNode(this, context), i, key;
  //t.path = context.getPath();
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
  this.expression = expression(this.content.replace(/^{{|}}$/g, ""));
  parent.addChild(this);
}
inherits(ExpressionNode, Node);

ExpressionNode.prototype.tree = function(context, parent) {
  // renderer
  var renderer = String(this.expression.evaluate(context));
  var t = new RenderedNode(this, context, renderer);
  t.path = context.getPath();
  t.nodeName = "string";
  return t;
}

ExpressionNode.prototype.start_html = function(context) {
  return this.expression.evaluate(context);
}

function StringNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.string = this.content.replace(/^"|"$/g, "");
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
  t.path = context.getPath();
  return t;
}

StringNode.prototype.evaluate = function(context) {
  return evaluateExpressionList(this.compiledExpression, context);
}

StringNode.prototype.start_html = function(context) {
  return evaluateExpressionList(this.compiledExpression, context);
}

StringNode.prototype.addChild = function(child) {
  throw new CompileError(child.toString() + " cannot be a child of "+this.toString());
}

function IncludeNode(parent, content, level, line) {
  Node.call(this, parent, content, level, line);
  this.name = trim(content.split(" ")[1]);
  parent.addChild(this);
}
inherits(IncludeNode, Node);

IncludeNode.prototype.tree = function(context) {
  return templateCache[this.name].tree(context, parent);
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

    var node = createNode(parent, content, level, i, currentNode);
    currentNode = node;

  }
  if(templateName) {
    templateCache[templateName] = root;
  }

  return root;
}

// Expression evaluation engine

function StringValue(txt, left) {
  this.type = "value";
  this.value = txt.replace(/^"|"$/g, "");
}
StringValue.prototype.evaluate = function(context) {
  return this.value;
}
StringValue.reg = /^"(?:[^"\\]|\\.)*"/;

function EqualOperator(txt, left) {
  this.type = "boolean";
  this.left = left;
  this.right = null;
}
EqualOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) == this.right.evaluate(context);
}
EqualOperator.reg = /^==/;

function BiggerOperator(txt, left) {
  this.type = "boolean";
  this.left = left;
  this.right = null;
}
BiggerOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) > this.right.evaluate(context);
}
BiggerOperator.reg = /^>/;

function SmallerOperator(txt, left) {
  this.type = "boolean";
  this.left = left;
  this.right = null;
  this.evaluate = function(context) {
    return this.left.evaluate(context) < this.right.evaluate(context);
  }
}
SmallerOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) < this.right.evaluate(context);
}
SmallerOperator.reg = /^</;

function OrOperator(txt, left) {
  this.type = "operator";
  this.left = left;
  this.right = null;
}
OrOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) || this.right.evaluate(context);
}
OrOperator.reg = /^or/;

function AndOperator(txt, left) {
  this.type = "operator";
  this.left = left;
  this.right = null;
}
AndOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) && this.right.evaluate(context);
}
AndOperator.reg = /^and/;

function Name(txt, left) {
  this.name = txt;
}
Name.prototype.evaluate = function(context) {
  var value = context.get(this.name);
  if(typeof(value) == "function") {
    return value.apply(this, [context.data]);
  }
  return value;
}
Name.reg = NAME_REG;

function Filter(txt, left) {
  this.left = left;
  this.name = txt.split("|")[1];
}
Filter.prototype.evaluate = function(context) {
  var fct = context.get(this.name);
  return fct.apply(this, [this.left, context]);
  return value;
}
Filter.reg = /^\|[A-z][\w]*/;

// math

function MultiplyOperator(txt, left) {
  this.left = left;
  this.right = null;
}
MultiplyOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) * this.right.evaluate(context);
}
MultiplyOperator.reg = /^\*/;

function PlusOperator(txt, left) {
  this.left = left;
  this.right = null;
}
PlusOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) + this.right.evaluate(context);
}
PlusOperator.reg = /^\+/;

function MinusOperator(txt, left) {
  this.left = left;
  this.right = null;
}
MinusOperator.prototype.evaluate = function(context) {
  return this.left.evaluate(context) - this.right.evaluate(context);
}
MinusOperator.reg = /^\-/;

function NumberValue(txt, left) {
  this.number = parseFloat(txt, 10);
  this.evaluate = function(context) {
    return this.number;
  }
}
NumberValue.reg = /^[0-9]+/;

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
    list.push(around[0]);
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
  StringValue,
  OrOperator,
  AndOperator,
  EqualOperator,
  Filter,
  Name,
  NumberValue,
  BiggerOperator,
  SmallerOperator,
  MultiplyOperator,
  PlusOperator,
  MinusOperator,
];

function expression(input) {
    // expression are built like trees as well, a sort
    // of parser in the parser.
    var currentExpr = null, i, expr, match, newExpr, found;
    while(input) {
      input = trim(input);
      found = false;
      for(i=0; i<expression_list.length; i++) {
        expr = expression_list[i];
        match = expr.reg.exec(input);
        if(match) {
          input = input.slice(match[0].length);
          newExpr = new expr(match[0], currentExpr);
          if(currentExpr && currentExpr.right === null) {
            currentExpr.right = newExpr;
          } else {
            currentExpr = newExpr;
          }
          found = true;
        }
      }
      if(found == false) {
        throw new CompileError("Expression parser: Impossible to parse further : " + input);
      }
    }
  return currentExpr;
}

function updateData(data, input, value) {
  var path = input.getAttribute("data-path"), value;
  if(!path) {
    throw "No data-path attribute on the element";
  }
  var paths = path.split("."), i;
  if(value === undefined) {
    value = input.value;
  }
  var searchData = data;
  for(i = 1; i<paths.length-1; i++) {
    searchData = searchData[paths[i]];
  }
  if(typeof searchData[paths[i]] == "number") {
     searchData[paths[i]] = parseFloat(value, 10);
  } else {
    searchData[paths[i]] = value;
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


var name_reg = /^\s*([a-zA-Z][a-zA-Z-\d]*)/;
var string_reg = /^"(?:\\"|[^"])+"/;

function parse_attributes(v) {
    var attrs = {}, n, v, s;
    while(v) {
        //v = v.replace(/\s*/, "");
        n = v.match(name_reg);
        if(!n) {
            throw "No attribute name found in "+v;
        }
        v = v.substr(n[0].length);
        n = n[1];
        if(v[0] != "=") {
            throw "No equal sign after name "+n;
        }
        v = v.substr(1);
        s = v.match(string_reg);
        if(!s) {
            throw "No value found after name "+n;
        }
        var expr = s[0].match(/{{([^}]+)}}/);
        if(expr) {
          var expr = expression(expr[1]);
          attrs[n] = expr;
        } else {
          // for now, no StringNode in the attributes
          attrs[n] = new StringNode(null, s[0]);
        }
        v = v.substr(s[0].length);
    }
    return attrs;
}

function attributes_diff(a, b) {
  var changes = [], key;
  for(key in a) {
      if(b[key]) {
          if(b[key]!= a[key]) {
              changes.push({action:"mutate", key:key, value:b[key]});
          }
      } else {
          changes.push({action:"removed", key:key});
      }
  }
  for(key in b) {
      if(!a[key]) {
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
  var i, _diff, _dom;
  for(i=0; i<diff.length; i++) {
    _diff = diff[i];
    _dom = getDom(dom, _diff.path);
    if(_diff.action == "remove") {
      _dom.parentNode.removeChild(_dom);
    }
    if(_diff.action == "add") {
      _dom = getDom(dom, _diff.path);
      var newNode = document.createElement('div');
      newNode.innerHTML = _diff.node.html();
      if(_dom) {
        _dom.parentNode.insertBefore(newNode.firstChild, _dom);
      } else {
        // get the parent
        _dom = getDom(dom, _diff.path, 1);
        _dom.appendChild(newNode);
      }
    }
  }
}

var likely = {
  Template:build,
  apply_diff:apply_diff,
  parse_attributes:parse_attributes,
  attributes_diff:attributes_diff,
  updateData:updateData,
  Context:function(data){ return new Context(data) },
  CompileError:CompileError,
  escape:escape,
  expression:expression
}

// export
window.likely = likely;

})();
