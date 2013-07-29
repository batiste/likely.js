/* Likely.js, batiste bieler 2013 */

"use strict";
(function() {

function Context(data, parent, sourceName, varName, key) {
  this.data = data;
  this.parent = parent;
  this.path = "";

  this.sourceName = sourceName;
  this.varName = varName;
  this.key = key;

  if(parent && parent.path) {
    this.path = parent.path + ".";
  }
  if(sourceName) {
    this.path = this.path + sourceName;
  }
}

Context.prototype.convertMappingToSource = function(name) {
  //list.number.hello -> list.key.hello
  return name.replace(this.varName, this.key)
}

Context.prototype.get = function(name) {
  var bits = name.split(".");
  var data = this.data;
  if(bits[0] in data) {
    data = data[bits[0]];
    var i = 1;
    while(i < bits.length) {
      data = data[bits[i]];
      i++;
    }
    return data;
  }
  
  if(this.parent) {
    return this.parent.get(name);
  }
}

function trim(txt) {
  return txt.replace(/^\s+|\s+$/g ,"");
}

function Node(parent, content, level) {
  this.parent = parent;
  this.content = content;
  this.level = level;
  this.children = [];
}

Node.prototype.render = function(context) {
  var str = "", i;
  for(i=0; i<this.children.length; i++) {
    str += this.children[i].render(context);
  }
  return str;
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
  }

  parent.children.push(this);
}
HtmlNode.prototype = new Node();
HtmlNode.prototype.render = function(context) {
  var copy = resolveExpressions(this.params, context), i;
  var paramStr = "";
  for(var i=0; i<this.compiledParams.length; i++) {
    var param = this.compiledParams[i];
    if(param.evaluate) {
      paramStr += param.evaluate(context);
    } else {
      paramStr += param;
    }
  }
  if(paramStr) {
    paramStr = " " + paramStr;
  }
  if(this.reflexible) {
    paramStr = paramStr + ' data-path="' + context.path + "." + context.convertMappingToSource(this.reflexibleName) + '"';
  }
  var str = "<"+ this.nodeName + paramStr + ">", i;
  for(i=0; i<this.children.length; i++) {
    str += this.children[i].render(context);
  }
  return str + "</"+ this.nodeName + ">";
}


function ForNode(parent, content, level) {
  Node.apply(this, arguments);
  var info = this.content.slice(3).split("in");
  this.varName = trim(info[0]);
  this.sourceName = trim(info[1]);
  parent.children.push(this);
}
ForNode.prototype = new Node();
ForNode.prototype.render = function(context) {
  var str = "", i, j, key;
  var d = context.get(this.sourceName);
  for(key in d) {
    // mapping of data, need to keep a bi-directionnal link
    var new_data = {};
    new_data[this.varName] = d[key];
    var new_context = new Context(new_data, context, this.sourceName, this.varName, key);
    for(i=0; i<this.children.length; i++) {
      str += this.children[i].render(new_context);
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
IfNode.prototype.render = function(context) {
  var i, str = "";
  if(this.expression.evaluate(context)) {
    for(i=0; i<this.children.length; i++) {
      str += this.children[i].render(context);
    }
  } else if(this.else) {
    str += this.else.render(context);
  }
  return str;
}

function ElseNode(parent, content, level, line, currentNode) {
  Node.apply(this, arguments);
  // first node on the same level has to be the if node
  while(currentNode) {
    if(currentNode.level < level) {
      throw "ElseNode at line " +line+ ": cannot find a corresponding if-like statement at the same level.";
    }
    if(currentNode.level == level) {
      if(!(currentNode instanceof IfNode)) {
        throw "ElseNode at line " +line+ ": node at the same level is not a if-like statement.";
      }
      currentNode.else = this;
      break;
    }
    currentNode = currentNode.parent;
  }
}
ElseNode.prototype = new Node();
ElseNode.prototype.render = function(context) {
  var i, str = "";
  for(i=0; i<this.children.length; i++) {
    str += this.children[i].render(context);
  }
  return str;
}


function IfElseNode(parent, content, level, line, currentNode) {
  Node.apply(this, arguments);
  this.expression = expression(this.content.replace(/^elseif/g, ""));

  // first node on the same level has to be a if-like node
  while(currentNode) {
    if(currentNode.level < level) {
      throw "IfElseNode at line " +line+ ": cannot find a corresponding if-like statement at the same level.";
    }
    if(currentNode.level == level) {
      if(!(currentNode instanceof IfNode)) {
        throw "IfElseNode at line " +line+ ": node at the same level is not a if-like statement.";
      }
      currentNode.else = this;
      break;
    }
    currentNode = currentNode.parent;
  }
}
IfElseNode.prototype = IfNode.prototype;

function ExpressionNode(parent, content, level) {
  Node.apply(this, arguments);
  this.expression = expression(this.content.replace(/^{{|}}$/g, ""));
  parent.children.push(this);
}
ExpressionNode.prototype = new Node();
ExpressionNode.prototype.render = function(context) {
  return this.expression.evaluate(context);
}


function StringNode(parent, content) {
  Node.apply(this, arguments);
  this.string = this.content.replace(/^"|"$/g, "");
  parent.children.push(this);
}
StringNode.prototype = new Node();
StringNode.prototype.render = function(context) {
  return resolveExpressions(this.string, context);
}

function createNode(parent, content, level, line, currentNode) {
  var node;
  if(content.indexOf('if ') == 0) {
    node = new IfNode(parent, content, level);
  } else if(content.indexOf('elseif ') == 0) {
    node = new IfElseNode(parent, content, level, line+1, currentNode);
  } else if(content.indexOf('else') == 0) {
    node = new ElseNode(parent, content, level, line+1, currentNode);
  } else if(content.indexOf('for ') == 0) {
    node = new ForNode(parent, content, level);
  } else if(content.indexOf('"') == 0) {
    var node = new StringNode(parent, content, level);
  } else if(/^\w/.exec(content)) {
    var node = new HtmlNode(parent, content, level);
  } else if(content.indexOf('{{') == 0) {
    var node = new ExpressionNode(parent, content, level);
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
    if(!content) {
      continue;
    }

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

function resolveExpressions(txt, context) {
  var expressReg = /{{[^}]+}}/;
  
  while(true) {  
    var match = expressReg.exec(txt);
    if(!match) {
      break;
    }
    // TODO: save the compiled expression in a list
    var m = match[0].replace(/^{{|}}$/g, '');
    var exp = expression(m);
    txt = txt.replace(match[0], exp.evaluate(context));
  }
  return txt;
}

function compileExpressions(txt, context) {
  // compile the expression in a text and return a list of text+expressions
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

var expression_list = [
  StringValue,
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
  for(i = 0; i<paths.length-1; i++) {
    searchData = searchData[paths[i]];
  }
  searchData[paths[i]] = value;
}

var likely = {
  Template:build,
  updateData:updateData,
  Context:function(data){ return new Context(data) }
}

// export
window.likely = likely;

})();
