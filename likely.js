/* Likely.js version 0.9.1,
   Python style HTML template language with bi-directionnal data binding
   batiste bieler 2014 */
"use strict";

var util = require('./util');
var render = require('./render');
var expression = require('./expression');
var template = require('./template');
var foo = require("./test-module.js");

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
  this.context = new template.Context(this.data);
  this.template = template;
  this.init();
}

Component.prototype.tree = function() {
  return this.template.tree(new template.Context(this.data));
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
  render.applyDiff(diff, this.dom);
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

Component.prototype.anyEvent = function(e) {
  var dom = e.target;
  var path = dom.getAttribute('lk-' + e.type);
  if(!path) {
    return;
  }
  var renderNode = this.currentTree;
  var bits = path.split("."), i;
  for(i=1; i<bits.length; i++) {
    renderNode = renderNode.children[bits[i]];
  }
  renderNode.node.attrs['lk-'+e.type].evaluate(renderNode.context);
};

Component.prototype.bindEvents = function() {
  var i;
  this.dom.addEventListener("keyup", function(e){ this.dataEvent(e); }.bind(this), false);
  this.dom.addEventListener("change", function(e){ this.dataEvent(e); }.bind(this), false);
  var events = "click,change,mouseover,focus,keydown,keyup,keypress,submit,blur".split(',');
  for(i=0; i<events.length; i++) {
    this.dom.addEventListener(
      events[i],
      function(e){ this.anyEvent(e); }.bind(this), false);
  }
};

Component.prototype.update = function(){
  this.diff();
};

module.exports = {
  Template:template.buildTemplate,
  updateData:updateData,
  Component:Component,
  getDom:render.getDom,
  parseExpressions:expression.parseExpressions,
  compileExpressions:expression.compileExpressions,
  build_expressions:expression.buildExpressions,
  expressions:{
    StringValue:expression.StringValue
  },
  handicap:1,
  apply_diff:render.applyDiff,
  diff_cost:render.diffCost,
  parse_attributes:template.parseAttributes,
  attributes_diff:render.attributesDiff,
  Context:template.Context,
  CompileError:util.CompileError,
  escape:util.escape,
  expression:expression
};
