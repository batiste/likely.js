/* Likely.js version 0.9.0,
   Python style HTML template language with bi-directionnal data binding
   batiste bieler 2013 */

"use strict";
(function() {

var orphanTags="br,img,input,";
var templateCache = {};

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
Context.prototype.getPath = function(reflexibleName) {
  if(this.alias == reflexibleName) {
    reflexibleName = "";
  }
  if(this.alias && reflexibleName.indexOf(this.alias+".") == 0) {
    reflexibleName = reflexibleName.substr(this.alias.length+1);
  }
  var path = this.path || "";
  if(reflexibleName) {
    path = path + "." + reflexibleName;
  }
  return path;
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

function Node(parent, content, level, line) {
  this.line = line;
  this.parent = parent;
  this.content = content;
  this.level = level;
  this.children = [];
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

// TODO: switch the order of dom and context
Node.prototype.renderTo = function(context, dom, partialRender) {
  var str = "", i;
  var ids = dom.getAttribute("data-partial-ids");
  var partialIds = ids && ids.split(",") || [];
  
  var partialInfos = {ids:[], partialRender:partialRender};
  for(i=0; i<this.children.length; i++) {
    str += this.children[i].render(context, partialInfos);
  }
  if(!partialRender) {
    dom.innerHTML = str;
  } else {
    for(i=0; i<partialIds.length; i++) {
      // not found, needs to be removed
      if(String(partialInfos.ids).indexOf(partialIds[i]) == -1) {
        var el = document.getElementById(partialIds[i]);
        el.parentNode.removeChild(el);
      }
    }
  }
  dom.setAttribute("data-partial-ids", String(partialInfos.ids));

  return str;
}

Node.prototype.toString = function() {
  return this.constructor.name + "("+this.content+") at line " + this.line;
}

function CommentNode(parent, content, level) {
  Node.apply(this, arguments);
  parent.children.push(this);
}

CommentNode.prototype.render = function(context) {
  return "";
}

function HtmlNode(parent, content, level) {
  Node.apply(this, arguments);
  this.nodeName = this.content.split(" ")[0];
  this.params = trim(this.content.slice(this.nodeName.length));
  this.isOrphan = orphanTags.indexOf(this.nodeName+',') != -1;
  
  this.compiledParams = compileExpressions(this.params);

  // search for a value for the bi-directional binding
  for(var i=0; i<this.compiledParams.length; i++) {
    var param = this.compiledParams[i];
    if(param.evaluate  && 
      i > 0 && 
      this.compiledParams[i-1].indexOf &&
      this.compiledParams[i-1].indexOf("value=") != -1
    ) {
      this.reflexible = true;
      this.reflexibleName = param.name;
      this.reflexibleExpression = param;
    }
    // this is separate from the binding
    if(param.indexOf && param.indexOf("data-partial") != -1) {
      this.partial = true;
    }
  }

  parent.addChild(this);
}

function PartialRenderFailed(msg) { 
    this.name = "PartialRenderFailed";
    this.message = msg;
}
PartialRenderFailed.prototype = Error.prototype;

var idReg = /id="([\w_-]+)"/
HtmlNode.prototype = new Node();
HtmlNode.prototype.constructor = HtmlNode;
HtmlNode.prototype.render = function(context, partialInfos) {
  var paramStr = evaluateExpressionList(this.compiledParams, context), i, inner=false;
  if(this.reflexible) {
    var dataPath = context.getPath(this.reflexibleName);
    if(dataPath) {
      paramStr = paramStr + ' data-path="' + context.getPath(this.reflexibleName) + '"';
    }
    if(this.nodeName == "textarea") {
      inner = this.reflexibleExpression.evaluate(context);
    }
  }
  if(paramStr) {
    paramStr = " " + paramStr;
  }
  // necessary for insertInParent
  this.paramStr = paramStr;
  
  if(inner === false) {
    inner = "";
    for(i=0; i<this.children.length; i++) {
      inner += this.children[i].render(context, partialInfos);
    }
  }
  
  if(this.partial) {
    var match = idReg.exec(paramStr);
    if(match === null) {
      throw new PartialRenderFailed(this.toString() + " does not have an ID but is a partial");
    }
    var hash = sdbmHash(inner + paramStr);
    paramStr = paramStr + " data-hash=" + hash;
    if(match && partialInfos) {
      partialInfos.ids.push(match[1]);
      // we are rendering partially
      if(partialInfos.partialRender) {
        var el = document.getElementById(match[1]);
        if(!el) {
          el = this.insertInParent(this.html(paramStr, inner));
          el.setAttribute('data-hash', hash);
        }
        if(el.getAttribute('data-hash') != hash) {
          // tr get destroyed by a div
          var newNode = document.createElement(el.parentNode.nodeName);
          newNode.innerHTML = this.html(paramStr, inner);
          el.parentNode.replaceChild(newNode.childNodes[0], el);
        }
      }
    }
  }
  // cleanup
  this.paramStr = "";
  
  return this.html(paramStr, inner);
}

HtmlNode.prototype.html = function(paramStr, inner) {
  if(this.isOrphan) {
    return "<"+ this.nodeName + paramStr + "/>";
  }
  return "<"+ this.nodeName + paramStr + ">" 
    + inner + "</"+ this.nodeName + ">";
}

HtmlNode.prototype.insertInParent = function(elStr, inner) {
  // search for the first HTML parent
  var p = this.parent;
  while(p) {
    if(p instanceof HtmlNode) {
      var match = idReg.exec(p.paramStr);
      if(match) {
        var parentDom = document.getElementById(match[1]);
        if(!parentDom) { 
          throw new PartialRenderFailed("Suitable parent " + p.toString() + " for " +this.toString()+ " doesn't exist in the DOM");
        }
        var newNode = document.createElement(parentDom.nodeName);
        newNode.innerHTML = elStr;
        var node = newNode.childNodes[0];
        parentDom.appendChild(node);
        return node;
      } else {
        throw new PartialRenderFailed("First HTML parent "+ p.toString() + " for " + this.toString() +" doesn't have an ID.");
      }
    }
    p = p.parent;
  }
  throw new PartialRenderFailed("Element "+ this.toString() +" cannot be created without a suitable parent.");
}


function ForNode(parent, content, level) {
  Node.apply(this, arguments);
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
ForNode.prototype = new Node();
ForNode.prototype.constructor = ForNode;
ForNode.prototype.render = function(context, partialInfos) {
  var str = "", i, j, key;
  var d = context.get(this.sourceName);
  for(key in d) {
    // mapping of data, need to keep a bi-directionnal link
    var new_data = {};
    new_data[this.alias] = d[key];
    if(this.indexName) {
        new_data[this.indexName] = key;   
    }
    var new_context = new Context(new_data, context, this.sourceName, this.alias, key);
    for(i=0; i<this.children.length; i++) {
      str += this.children[i].render(new_context, partialInfos);
    }
  }
  return str;
}

function IfNode(parent, content, level) {
  Node.apply(this, arguments);
  this.expression = expression(this.content.replace(/^if/g, ""));
  parent.children.push(this);
}
IfNode.prototype = new Node();
IfNode.prototype.constructor = IfNode;
IfNode.prototype.render = function(context, partialInfos) {
  var i, str = "", len = this.children.length;
  if(this.expression.evaluate(context)) {
    for(i=0; i<len; i++) {
      str += this.children[i].render(context, partialInfos);
    }
  } else if(this.else) {
    str += this.else.render(context, partialInfos);
  }
  return str;
}

function ElseNode(parent, content, level, line, currentNode) {
  Node.apply(this, arguments);
  this.searchIf(currentNode);
}
ElseNode.prototype = new Node();
ElseNode.prototype.constructor = ElseNode;
ElseNode.prototype.render = function(context, partialInfos) {
  var i, str = "";
  for(i=0; i<this.children.length; i++) {
    str += this.children[i].render(context, partialInfos);
  }
  return str;
}

function IfElseNode(parent, content, level, line, currentNode) {
  Node.apply(this, arguments);
  this.expression = expression(this.content.replace(/^elseif/g, ""));
  this.searchIf(currentNode);
}
IfElseNode.prototype = IfNode.prototype;
IfElseNode.prototype.constructor = IfElseNode;

IfElseNode.prototype.searchIf = function searchIf(currentNode) {
  // first node on the same level has to be the if node
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

function ExpressionNode(parent, content, level) {
  Node.apply(this, arguments);
  this.expression = expression(this.content.replace(/^{{|}}$/g, ""));
  parent.addChild(this);
}
ExpressionNode.prototype = new Node();
ExpressionNode.prototype.constructor = ExpressionNode;
ExpressionNode.prototype.render = function(context, partialInfos) {
  return this.expression.evaluate(context);
}

function StringNode(parent, content) {
  Node.apply(this, arguments);
  this.string = this.content.replace(/^"|"$/g, "");
  this.compiledExpression = compileExpressions(this.string);
  parent.addChild(this);
}
StringNode.prototype = new Node();
StringNode.prototype.constructor = StringNode;
StringNode.prototype.render = function(context, partialInfos) {
  return evaluateExpressionList(this.compiledExpression, context);
}

StringNode.prototype.addChild = function(child) {
  throw new CompileError(child.toString() + " cannot be a child of "+this.toString());
}

function IncludeNode(parent, content) {
  Node.apply(this, arguments);
  this.name = trim(content.split(" ")[1]);
  parent.addChild(this);
}
IncludeNode.prototype.constructor = IncludeNode;
IncludeNode.prototype.render = function(context, partialInfos) {
  return templateCache[this.name].render(context, partialInfos);
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
    return value.apply(context.data);
  }
  return value;
}
Name.reg = /^[A-z][\w\.]*/;

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

function compileExpressions(txt, context) {
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

function updateData(data, input) {
  var path = input.getAttribute("data-path");
  if(!path) {
    throw "No data-path attribute on the element";
  }
  var paths = path.split("."), i;
  var value = input.value;
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

var likely = {
  Template:build,
  updateData:updateData,
  Context:function(data){ return new Context(data) },
  PartialRenderFailed:PartialRenderFailed,
  CompileError:CompileError,
  escape:escape
}

// export
window.likely = likely;

})();
