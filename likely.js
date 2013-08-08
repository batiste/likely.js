/* Likely.js,
   Python style HTML template language with bi-directionnal data binding
   batiste bieler 2013 */

"use strict";
(function() {

// find a way to cleanup the cache
var partialCache = {};

// simple hash to avoid to store big HTML chunks
// in the cache
function sdbmHash(str) {
    var hash = 0, i;
    for (i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = char + (hash << 6) + (hash << 16) - hash;
    }
    return hash;
}

function Context(data, parent, sourceName, varName, key) {
  this.data = data;
  this.parent = parent;
  this.path = "";

  this.sourceName = sourceName;
  this.varName = varName;
  this.key = key;

  this.data["index"] = key

  if(parent && parent.path) {
    this.path = parent.path;
  }
  if(sourceName) {
    if(parent && sourceName == parent.varName) {
      this.path = this.path + "." + parent.key;
    } else {
      this.path = this.path + "." + sourceName;
    }
  }
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
  }
  dom.setAttribute("data-partial-ids", String(partialInfos.ids));
  
  for(i=0; i<partialIds.length; i++) {
    // not found, needs to be removed
    if(String(partialInfos.ids).indexOf(partialIds[i]) == -1) {
      var el = document.getElementById(partialIds[i]);
      el.parentNode.removeChild(el);
    }
  }

  return str;
}

Node.prototype.toString = function() {
  return this.constructor.name + "("+this.content+") at line " + this.line;
}

function HtmlNode(parent, content, level) {
  Node.apply(this, arguments);
  this.nodeName = this.content.split(" ")[0];
  this.params = trim(this.content.slice(this.nodeName.length));
  
  this.compiledParams = compileExpressions(this.params);

  // search for a reflexible value
  for(var i=0; i<this.compiledParams.length; i++) {
    var param = this.compiledParams[i];
    if(param.evaluate  && 
      i > 0 && 
      this.compiledParams[i-1].indexOf &&
      this.compiledParams[i-1].indexOf("value=") != -1
    ) {
      this.reflexible = true;
      this.reflexibleName = param.name;
    }
    if(param.indexOf && param.indexOf("data-partial") != -1) {
      this.partial = true;
    }
  }

  parent.addChild(this);
}

function PartialRenderFailed () {}
PartialRenderFailed.prototype = new Error();
var idReg = /id="([\w_-]+)"/
HtmlNode.prototype = new Node();
HtmlNode.prototype.constructor = HtmlNode;
HtmlNode.prototype.render = function(context, partialInfos) {
  var paramStr = evaluateExpressionList(this.compiledParams, context), i, inner;
  if(this.reflexible) {
    paramStr = paramStr + ' data-path="' + context.path + '.' + context.key + '"';
  }
  if(paramStr) {
    paramStr = " " + paramStr;
  }
  this.paramStr = paramStr;
  var inner = "";
  for(i=0; i<this.children.length; i++) {
    inner += this.children[i].render(context, partialInfos);
  }

  var elStr = "<"+ this.nodeName + paramStr + ">" 
    + inner + "</"+ this.nodeName + ">";

  if(this.partial) {
    var match = idReg.exec(paramStr);
    if(match && partialInfos) {
      partialInfos.ids.push(match[1]);
      // we are rendering partially
      if(partialInfos.partialRender) {
        var el = document.getElementById(match[1]);
        if(!el) {
          this.insertInParent(elStr);
          partialCache[match[1]] = sdbmHash(elStr);
        }
        if(partialCache[match[1]] === undefined) {
          throw new PartialRenderFailed("Element not in cache");
        }
        if(partialCache[match[1]] != sdbmHash(elStr)) {
          var newNode = document.createElement("div");
          newNode.innerHTML = elStr;
          el.parentNode.replaceChild(newNode.childNodes[0], el);
        }
      }
      partialCache[match[1]] = sdbmHash(elStr);
    }
  }
  return elStr;
}

HtmlNode.prototype.insertInParent = function(elStr) {
  // search search for a suitable insert point
  var p = this.parent;
  var foundSuitableParent = false;
  while(p) {
    if(p instanceof HtmlNode) {
      var match = idReg.exec(p.paramStr);
      if(match) {
        var parentDom = document.getElementById(match[1]);
        if(!parentDom){ 
          throw new PartialRenderFailed("Suitable " +p+ " doesn't exist anymore in the dom");
        }
        var newNode = document.createElement("div");
        newNode.innerHTML = elStr;
        parentDom.appendChild(newNode.childNodes[0]);
        foundSuitableParent = true;        
      }
      break;
    }
    p = p.parent;
  }
  if(!foundSuitableParent) {
    throw new PartialRenderFailed("Element "+ this +" cannot be created without a suitable parent");
  }
}


function ForNode(parent, content, level) {
  Node.apply(this, arguments);
  var info = this.content.slice(3).split("in");
  this.varName = trim(info[0]);
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
    new_data[this.varName] = d[key];
    var new_context = new Context(new_data, context, this.sourceName, this.varName, key);
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
  var i, str = "";
  if(this.expression.evaluate(context)) {
    for(i=0; i<this.children.length; i++) {
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
      throw this.toString() + ": cannot find a corresponding if-like statement at the same level.";
    }
    if(currentNode.level == this.level) {
      if(!(currentNode instanceof IfNode)) {
        throw this.toString()+ ": " + currentNode.toString() + " at the same level is not a if-like statement.";
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
  throw  child.toString() + " cannot be a child of "+this.toString();
}

function createNode(parent, content, level, line, currentNode) {
  var node; 
  if(content.length == 0) {
    node = new StringNode(parent, "\n", level, line+1);
  } else if(content.indexOf('if ') == 0) {
    node = new IfNode(parent, content, level, line+1);
  } else if(content.indexOf('elseif ') == 0) {
    node = new IfElseNode(parent, content, level, line+1, currentNode);
  } else if(content.indexOf('else') == 0) {
    node = new ElseNode(parent, content, level, line+1, currentNode);
  } else if(content.indexOf('for ') == 0) {
    node = new ForNode(parent, content, level, line+1);
  } else if(content.indexOf('"') == 0) {
    var node = new StringNode(parent, content, level, line+1);
  } else if(/^\w/.exec(content)) {
    var node = new HtmlNode(parent, content, level, line+1);
  } else if(content.indexOf('{{') == 0) {
    var node = new ExpressionNode(parent, content, level, line+1);
  } else {
    throw "createNode: unknow node type " + content;
  }
  return node;
}

function build(tpl) {
  var root = new Node(null, "", 0), lines, line, level, 
    content, i, currentNode = root, parent, searchNode;
  
  lines = tpl.split("\n");

  for(i=0; i<lines.length; i++) {
    line = lines[i];
    level = line.match(/\s*/)[0].length + 1;
    content = line.slice(level - 1);

    searchNode = currentNode;
    parent = null;

    // search for the parent node
    while(true) {
    
      if(level > searchNode.level) {
        parent = searchNode;
        break;
      }

      if(!searchNode.parent) {
        throw "Indentation error at line " + i;
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
  return root;
}

// Expression evaluation engine

function StringValue(txt, left) {
  this.type = "value";
  this.value = txt.replace(/^"|"$/g, "");
  this.evaluate = function(context) {
    return this.value;
  }
}
StringValue.reg = /^"(?:[^"\\]|\\.)*"/;

function EqualOperator(txt, left) {
  this.type = "operator";
  this.left = left;
  this.right = null;
  this.evaluate = function(context) {
    return this.left.evaluate(context) == this.right.evaluate(context);
  }
}
EqualOperator.reg = /^==/;

function BiggerOperator(txt, left) {
  this.type = "operator";
  this.left = left;
  this.right = null;
  this.evaluate = function(context) {
    return this.left.evaluate(context) > this.right.evaluate(context);
  }
}
BiggerOperator.reg = /^>/;

function SmallerOperator(txt, left) {
  this.type = "operator";
  this.left = left;
  this.right = null;
  this.evaluate = function(context) {
    return this.left.evaluate(context) < this.right.evaluate(context);
  }
}
SmallerOperator.reg = /^</;

function OrOperator(txt, left) {
  this.type = "operator";
  this.left = left;
  this.right = null;
  this.evaluate = function(context) {
    return this.left.evaluate(context) || this.right.evaluate(context);
  }
}
OrOperator.reg = /^or/;

function AndOperator(txt, left) {
  this.type = "operator";
  this.left = left;
  this.right = null;
  this.evaluate = function(context) {
    return this.left.evaluate(context) && this.right.evaluate(context);
  }
}
AndOperator.reg = /^and/;

function Name(txt, left) {
  this.type = "value";
  this.name = txt;
  this.evaluate = function(context) {
    return context.get(this.name);
  }
}
Name.reg = /^\w[\w\.]+/;

function NumberValue(txt, left) {
  this.type = "value";
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
      if(txt)
        list.push(txt);
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
  SmallerOperator
];

function expression(input) {
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
        throw "Impossible to parse further " + input;
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
  searchData[paths[i]] = value;
}


var likely = {
  Template:build,
  sdbmHash:sdbmHash,
  updateData:updateData,
  Context:function(data){ return new Context(data) },
  PartialRenderFailed:PartialRenderFailed
}

// export
window.likely = likely;

})();
