"use strict";

function template(tplArray) {
    return likely.Template(tplArray);
}

function ctx(data) {
    return new likely.Context(data);
}

test("Simple for loop diff", function() {

    var tpl = [
    'for line in lines',
    '  {{ line }}'
    ];

    var tpl = template(tpl);

    var rt1 = tpl.tree(ctx({lines:[1,2,3]}));
    var rt2 = tpl.tree(ctx({lines:[1,2]}));

    var diff = rt1.diff(rt2);
    equal(diff.length, 1);
    equal(diff[0].action, 'remove');
    equal(diff[0].path, '.2');
});


test("RenderNode path", function() {

    var tpl = [
    'for line in lines',
    '  p',
    '   {{ line }}',
    'p',
    ' "geek"',
    'p',
    ' span',
    '    "ge"',
    ' "geeko"'
    ];

    tpl = template(tpl);
    var rt1 = tpl.tree(ctx({lines:[1,2,3]}));

    equal(rt1.children[0].path, '.0');
    equal(rt1.children[0].children[0].path, '.0.0');
    equal(rt1.children[1].children[0].path, '.1.0');
    equal(rt1.children[2].children[0].path, '.2.0');
    equal(rt1.children[1].path, '.1');
    equal(rt1.children[1].children[0].path, '.1.0');
    equal(rt1.children[3].children[0].path, '.3.0');
    equal(rt1.children[4].children[1].path, '.4.1');
    equal(rt1.children[4].children[0].path, '.4.0');
    equal(rt1.children[4].children[0].children[0].path, '.4.0.0');

});

test("Attribute parser", function() {
    var tpl = template("");

    var attrs_string = 'toto="glup" other="glop"';
    var attrs = likely.template.parseAttributes(attrs_string, tpl);
    equal(attrs.toto.evaluate(), 'glup');
    equal(attrs.other.evaluate(), 'glop');

    attrs_string = 'toto="a \\"test"';
    attrs = likely.template.parseAttributes(attrs_string, tpl);
    equal(attrs.toto.evaluate(), 'a "test');

    attrs_string = 'toto="" other=""';
    attrs = likely.template.parseAttributes(attrs_string, tpl);
    equal(attrs.toto.evaluate(), '');
    equal(attrs.toto.evaluate(), '');
});

test("Node attributes", function() {
    var tpl = template('a href="test" to-to="123"');
    equal(tpl.children[0].attrs.href.evaluate(), 'test');
    equal(tpl.children[0].attrs["to-to"].evaluate(), '123');
});

test("Node attributes diff", function() {
    var at1 = {
        a:1,
        b:"h"
    };
    var at2 = {
        a:"1",
        b:"d",
        c:"2"
    };

    var diff = likely.attributesDiff(at1, at2);

    equal(diff[0].action, "mutate");
    equal(diff[0].key, "b");
    equal(diff[0].value, "d");

    equal(diff[1].action, "add");
    equal(diff[1].key, "c");
    equal(diff[1].value, "2");

});


test("Attribute diff on the render Nodes", function() {

    var tpl1 = template('p toto="oki" tata="test"');
    var tpl2 = template('p toto="oki"');
    var tpl3 = template('p toto="cha nge" bla="test"');

    var t1 = tpl1.tree(ctx({}));
    var t2 = tpl2.tree(ctx({}));
    var t3 = tpl3.tree(ctx({}));

    var diff1 = t1.diff(t2);
    equal(diff1[0].attributesDiff.length, 1);
    var attr_diff = diff1[0].attributesDiff[0];
    equal(attr_diff.action, "remove");
    equal(attr_diff.key, "tata");

    var diff2 = t2.diff(t3);
    equal(diff2[0].attributesDiff.length, 2);
    attr_diff = diff2[0].attributesDiff[0];
    equal(attr_diff.action, "mutate");
    equal(attr_diff.key, "toto");
    equal(attr_diff.value, 'cha nge');

    attr_diff = diff2[0].attributesDiff[1];
    equal(attr_diff.action, "add");
    equal(attr_diff.key, "bla");
    equal(attr_diff.value, 'test');

});

test("Incorrect diff cost create bad diff", function() {

    var tpl = [
    'ul',
    '  for line in lines',
    '    li',
    '      {{ line }}',
    ''
    ];

    var tpl = template(tpl);

    var t1 = tpl.tree(ctx({lines:[1,2,3,4,5]}));
    var t2 = tpl.tree(ctx({lines:[1,2,3]}));

    var diff = t1.diff(t2);

    equal(diff.length, 2);
    equal(diff[0].path, '.0.3');
    equal(diff[0].action, 'remove');
});

test("Testing the diffs", function() {

    var tpl = [
    'ul',
    '  for line in lines',
    '    li class="{{ line.cls }}"',
    '      for child in line.children',
    '        p',
    '          {{ child }}',
    ''
    ];

    var tpl = template(tpl);

    var lines1 = [
        {txt:'hello1', cls:'class1', children:[]},
        {txt:'hello2', cls:'class2', children:[]},
        {txt:'hello3', cls:'class3', children:[]},
    ];

    var lines2 = [
        {txt:'hello1', cls:'class1', children:[]},
        {txt:'hello2', cls:'class2', children:[1]},
        {txt:'hello3', cls:'class3', children:[]},
    ];

    var lines3 = [
        {txt:'hello1', cls:'class1', children:[]},
        {txt:'hello2', cls:'class2', children:[1,2]},
        {txt:'hello3', cls:'class3', children:[]},
    ];

    var t1 = tpl.tree(ctx({lines:lines1}));
    var t2 = tpl.tree(ctx({lines:lines2}));

    var diff = t1.diff(t2);

    equal(diff.length, 1);
    equal(diff[0].path, '.0.1.1');
    equal(diff[0].action, 'add');

    t2 = tpl.tree(ctx({lines:lines3}));
    var diff = t1.diff(t2);

    equal(diff.length, 2);
    equal(diff[0].path, '.0.1.1');
    equal(diff[0].action, 'add');
    equal(diff[1].path, '.0.1.2');
    equal(diff[1].action, 'add');
});

test("Attribute expression", function() {

    var tpl1 = template('p toto="{{hello}}"');
    var t1 = tpl1.tree(ctx({hello: "world"}));

    equal(t1.domHtml(), '<p toto="world"></p>');

    tpl1 = template('p toto="{{ 2 + 1 }}"');
    t1 = tpl1.tree(ctx({hello: "world"}));
    equal(t1.domHtml(), '<p toto="3"></p>');

});

test("Attribute expression diff", function() {

    var tpl1 = template('p toto="{{hello}}"');
    var t1 = tpl1.tree(ctx({hello: "world"}));
    var t2 = tpl1.tree(ctx({hello: "universe"}));
    var diff1 = t1.diff(t2);

    equal(diff1.length, 1);
    equal(diff1[0].attributesDiff.length, 1);
    var attr_diff = diff1[0].attributesDiff[0];
    equal(attr_diff.action, "mutate");
    equal(attr_diff.key, "toto");
    equal(attr_diff.value, "universe");

    tpl1 = template('p class={{ test && \'selected\' }}');
    t1 = tpl1.tree(ctx({test: true}));
    t2 = tpl1.tree(ctx({test: false}));
    diff1 = t1.diff(t2);
    equal(diff1.length, 1);
    attr_diff = diff1[0].attributesDiff[0];
    equal(attr_diff.action, "remove");
    equal(attr_diff.key, "class");
    //equal(attr_diff.value, "");

});

test("Diff removed node", function() {

    var tpl = [
    'for line in lines',
    '  {{ line }}'
    ];

    tpl = template(tpl);

    var rt1 = tpl.tree(ctx({lines:[1,2,3,4]}));
    var rt2 = tpl.tree(ctx({lines:[1,3,4]}));

    var diff = rt1.diff(rt2);
    equal(diff.length, 3);
    var attr_diff = diff[0];
    equal(attr_diff.action, "stringmutate");
    equal(attr_diff.path, ".1");

});

test("Diff added node", function() {

    var tpl = [
    'for line in lines',
    '  {{ line }}'
    ];

    tpl = template(tpl);

    var rt1 = tpl.tree(ctx({lines:[1,2,4]}));
    var rt2 = tpl.tree(ctx({lines:[1,2,3,4]}));

    var diff = rt1.diff(rt2);
    equal(diff.length, 2);
    equal(diff[0].action, "stringmutate");
    equal(diff[0].node.path, ".2");

    diff = rt2.diff(rt1);
    equal(diff.length, 2);
    equal(diff[0].action, "stringmutate");
    equal(diff[0].node.path, ".2");


});

test("Diff edge cases", function() {

    var tpl = [
    'for line in lines',
    ' p attr="value"',
    '  {{ line }}'
    ];


    tpl = template(tpl);

    var rt1 = tpl.tree(ctx({lines:[1,2,3]}));
    var rt2 = tpl.tree(ctx({lines:[0,1,2]}));

    var diff = rt1.diff(rt2);
    equal(diff.length, 3);
    equal(diff[0].action, "stringmutate");
    equal(diff[0].node.path, ".0.0");
    equal(diff[1].action, "stringmutate");
    equal(diff[1].node.path, ".1.0");

    diff = rt2.diff(rt1);
    equal(diff.length, 3);
    equal(diff[0].action, "stringmutate");
    equal(diff[0].node.path, ".0.0");
    equal(diff[1].action, "stringmutate");
    equal(diff[1].node.path, ".1.0");


});

test("HTML mutator : attributes", function() {
    var tpl = template('p at1="{{ at1 }}" at2="{{at2}}"');
    var div = document.createElement('div');
    var rt1 = tpl.tree(ctx({at1:1, at2:2}));
    div.innerHTML = rt1.domHtml();
    equal(div.childNodes[0].getAttribute("at1"), 1);

    var rt2 = tpl.tree(ctx({at1:10, at2:20}));
    var diff = rt1.diff(rt2);
    likely.applyDiff(diff, div);
    equal(diff.length, 1);
    equal(div.childNodes[0].getAttribute("at1"), 10);
    equal(div.childNodes[0].getAttribute("at2"), 20);
});

test("HTML mutator : node manipulation", function() {

    var tpl = [
    'for line in lines',
    ' p toto="{{ line }}"',
    '  {{ line }}'
    ];
    tpl = template(tpl);

    render.handicap = 0;

    var div = document.createElement('div');

    var rt1 = tpl.tree(ctx({lines:[1,2,3]}));
    div.innerHTML =  rt1.domHtml();
    equal(div.childNodes.length, 3);

    var rt2 = tpl.tree(ctx({lines:[1,3,4,5]}));

    var diff = rt1.diff(rt2);

    likely.applyDiff(diff, div);

    equal(div.childNodes.length, 4);
    equal(div.childNodes[0].textContent, 1);
    equal(div.childNodes[1].textContent, 3);
    equal(div.childNodes[2].textContent, 4);
    equal(div.childNodes[3].textContent, 5);

    diff = rt2.diff(rt1);

    likely.applyDiff(diff, div);
    equal(div.childNodes.length, 3);
    equal(div.childNodes[0].textContent, 1);
    equal(div.childNodes[0].getAttribute("toto"), 1);
    equal(div.childNodes[1].textContent, 2);
    equal(div.childNodes[2].textContent, 3);
    equal(div.childNodes[2].getAttribute("toto"), 3);

    render.handicap = 1;

});

test("HTML mutator : tag name change", function() {

    var tpl = [
    'for line in lines',
    ' if line > 2',
    '  p toto="{{ line }}"',
    ' else',
    '  a tata="{{ line }}"'
    ];
    tpl = template(tpl);

    var rt1 = tpl.tree(ctx({lines:[1]}));
    var rt2 = tpl.tree(ctx({lines:[3]}));

    var div = document.createElement('div');
    div.innerHTML = rt1.domHtml();
    equal(div.childNodes.length, 1);
    equal(div.childNodes[0].nodeName, 'A');

    var diff = rt1.diff(rt2);
    equal(diff.length, 2);
    likely.applyDiff(diff, div);
    equal(div.childNodes[0].nodeName, 'P');

});

test("HTML mutator : complex example", function() {

    var tpl = [
    'for key, value in lines',
    '  p class={{ value.name == selected && \'selected\' }}',
    '   for link in value.links',
    '    a href="{{ \'/page/\' + link }}"',
    '     "page {{ link }}"',
    ];
    tpl = template(tpl);

    var data = {
        selected:"line 2",
        lines: [
            {name:"line 1", links:[1,2,3]},
            {name:"line 2", links:[1,2]},
            {name:"line 3", links:[1,2,3]},
        ]
    };

    var rt1 = tpl.tree(ctx(data));
    var div = document.createElement('div');
    div.innerHTML = rt1.domHtml();
    equal(div.childNodes.length, 3);
    equal(div.childNodes[0].className, '');
    equal(div.childNodes[1].className, 'selected');
    equal(div.childNodes[1].childNodes[1].getAttribute('href'), '/page/2');

    var rt2 = tpl.tree(ctx(data));
    var diff = rt1.diff(rt2);
    equal(diff.length, 0);

    data.selected = 'line 3';
    rt2 = tpl.tree(ctx(data));
    diff = rt1.diff(rt2);
    equal(diff.length, 2);

    likely.applyDiff(diff, div);

    equal(div.childNodes[1].className, '');
    equal(div.childNodes[2].className, 'selected');
    equal(div.childNodes[0].className, '');

    data.lines[0].links = [1, 2, 3, 4];
    data.lines[1].links = [1, 56, 2];
    data.lines[2].links = [2, 3];
    data.lines[2].name = "new name";

    var rt3 = tpl.tree(ctx(data));
    diff = rt2.diff(rt3);

    likely.applyDiff(diff, div);

    equal(div.childNodes[1].className, '');
    equal(div.childNodes[2].className, '');
    equal(div.childNodes[0].className, '');

    data.lines.splice(1, 2);
    var rt4 = tpl.tree(ctx(data));
    diff = rt3.diff(rt4);
    equal(diff.length, 2);
    likely.applyDiff(diff, div);
    equal(div.childNodes.length, 1);

});

test("Render/Node tree repr functions", function() {
    var tpl = [
    'p',
    '  "hello"'
    ];
    tpl = template(tpl);
    equal(tpl.repr().indexOf("hello") != -1, true); 
    var rt1 = tpl.tree(ctx({}));
    equal(rt1.repr().indexOf("hello") != -1, true); 

});

test("Dom tree : constructor", function() {
    var tpl = [
    'for key, value in lines',
    ' p',
    '  {{ key }}',
    '  " : "',
    '  {{ value }}'
    ];
    tpl = template(tpl);
    var rt1 = tpl.tree(ctx({lines:["test1", "test2"]}));
    var dom_tree = rt1.domTree();

    equal(dom_tree[0].nodeName, 'P');
    equal(dom_tree[0].childNodes[0].nodeName, '#text');
    equal(dom_tree[0].childNodes[0].nodeValue, '0');
    equal(dom_tree[0].childNodes[1].nodeValue, ' : ');
    equal(dom_tree[0].childNodes[2].nodeValue, 'test1');

    equal(rt1.domHtml(), "<p>0 : test1</p><p>1 : test2</p>");

});

test("HTML mutator : string mutation", function() {

    var tpl = [
    'for key, value in lines',
    ' p',
    '  {{ key }}',
    '  " : "',
    '  {{ value }}'
    ];
    tpl = template(tpl);

    var rt1 = tpl.tree(ctx({lines:["test1", "test2"]}));
    var div = document.createElement('div');
    rt1.domTree(div);
    equal(div.childNodes.length, 2);
    equal(div.childNodes[0].textContent, "0 : test1");
    equal(div.childNodes[1].textContent, "1 : test2");

    var rt2 = tpl.tree(ctx({lines:["test1", "test changed"]}));
    var diff = rt1.diff(rt2);
    equal(diff.length, 1);
    equal(diff[0].action, "stringmutate");
    equal(diff[0].value, "test changed");

    likely.applyDiff(diff, div);
    equal(div.childNodes[1].childNodes[0].textContent, 1);
});


test("Attribute gets empty", function() {
    var tpl1 = template('p value="4"');
    var tpl2 = template('p value=""');
    var t1 = tpl1.tree(ctx({}));
    var t2 = tpl2.tree(ctx({}));
    var div = document.createElement('div');
    t1.domTree(div);
    equal(div.childNodes[0].getAttribute('value'), '4');
    var diff = t1.diff(t2);
    likely.applyDiff(diff, div);
    equal(div.childNodes[0].getAttribute('value'), '');
});

test("HTML mutator : template mutation", function() {

    var tpl1 = [
    'for value in lines',
    ' li',
    '  {{ value }}'
    ];
    tpl1 = template(tpl1);

    var tpl2 = [
    'ul',
    ' for value in lines',
    '  li',
    '   {{ value }}'
    ];
    tpl2 = template(tpl2);

    var rt1 = tpl1.tree(ctx({lines:["test1", "test2"]}));
    var rt2 = tpl2.tree(ctx({lines:["test1", "test2"]}));

    var diff = rt1.diff(rt2);

    equal(diff.length, 3);

    var div = document.createElement('div');
    rt1.domTree(div);
    equal(div.childNodes.length, 2);
    equal(div.childNodes[0].nodeName, "LI");

    likely.applyDiff(diff, div);

    equal(div.childNodes.length, 1);
    equal(div.childNodes[0].nodeName, "UL");
    equal(div.childNodes[0].childNodes[0].nodeName, "LI");
    equal(div.childNodes[0].childNodes[1].nodeName, "LI");

});

test("HTML mutator : databinding and attribute removal", function() {
    var tpl1 = template('input value={{ v }}');
    var rt1 = tpl1.tree(ctx({v:"test1"}));
    var div = document.createElement('div');
    rt1.domTree(div);
    equal(div.childNodes[0].getAttribute('lk-bind'), 'v');

    // data cannot be binded anymore
    var tpl2 = template('input value={{ v + 1 }}');
    var rt2 = tpl2.tree(ctx({v:"test"}));
    equal(rt2.domTree()[0].getAttribute('lk-bind'), null);

    var diff = rt1.diff(rt2);
    equal(diff.length, 1);
    equal(diff[0].action, "mutate");
    equal(diff[0].attributesDiff.length, 2);
    equal(diff[0].attributesDiff[0].action, "remove");
    equal(diff[0].attributesDiff[0].key, "lk-bind");

    likely.applyDiff(diff, div);
    equal(div.childNodes[0].getAttribute('lk-bind'), null);
});

test("HTML mutator : textarea", function() {
    var tpl = template(['textarea', ' "hello"']);
    var rt1 = tpl.tree(ctx({}));
    var div = document.createElement('div');
    rt1.domTree(div);
    equal(div.childNodes[0].childNodes[0].textContent, 'hello');
    equal(div.childNodes[0].value, 'hello');

    var tpl2 = template(['textarea', ' "world"']);
    var rt2 = tpl2.tree(ctx({}));

    var diff = rt1.diff(rt2);
    equal(diff.length, 1);
    equal(diff[0].action, "stringmutate");
    likely.applyDiff(diff, div);

    equal(div.childNodes[0].childNodes[0].textContent, 'world');
    equal(div.childNodes[0].value, 'world');
});

test("HTML mutator : select", function() {
  var tpl = template([
    'select',
    ' for key, value in options',
    '  if key == selected',
    '   option value={{ key }} selected="selected"',
    '    {{ value }}',
    '  else',
    '   option value={{ key }}',
    '    {{ value }}'
  ]);
  var data = {options:{k1:'test 1', k2:'test 2', k3:'test 3'}, selected:'k2'};
  var tree = tpl.tree(new likely.Context(data));
  var div = document.createElement('div');
  tree.domTree(div);

  equal(div.childNodes[0].value, "k2");

});

test("HTML mutator : change attribute name", function() {
  var tpl1 = template('p value="toto"');
  var tpl2 = template('p valu="tata"');
  var div = document.createElement('div');
  var binding = new likely.Binding(div, tpl1, {});
  binding.init();

  equal(div.childNodes[0].getAttribute('value'), 'toto');

  binding.template = tpl2;
  binding.update();

  equal(div.childNodes[0].getAttribute('value'), undefined);
  equal(div.childNodes[0].getAttribute('valu'), 'tata');
});

test("Binding should take div content when not provided with a template", function() {
  var div = document.createElement('div');
  div.innerHTML = "{{ 2 + ab }}";
  var binding = likely.Binding(div, {ab:3});
  binding.init();

  equal(div.childNodes[0].textContent, '5');

});

test("Binding input, textarea", function() {

    function test_binding(tpl, input_name) {
        var div = document.createElement('div');
        var data = {v:"test1"};
        var binding = new likely.Binding(div, tpl, data);
        binding.init();
        var el = div.childNodes[0];

        equal(div.childNodes[0].getAttribute('lk-bind'), 'v', input_name);

        equal(el.getAttribute('value'), 'test1', input_name);

        el.setAttribute('value', "test2");
        el.value = "test2";
        binding.dataEvent({target:el});

        equal(data.v , 'test2', input_name);

        data.v = "test3";
        binding.update();
        equal(el.getAttribute('value'), "test3", input_name);
    }

    var tpl = template('input value={{ v }}');
    test_binding(tpl, 'input');
    tpl = template(['textarea', ' {{ v }}']);
    test_binding(tpl, 'textarea');

});

test("Binding select", function() {
    var data = {list:[1,2,3,4], selected:1};
    var tpl = template([
    'select value={{ selected }}',
    ' for value in list',
    '  option value={{ value }} selected={{ value == selected && "selected" }}',
    '   test'
    ]);

    var div = document.createElement('div');
    var binding = new likely.Binding(div, tpl, data);
    binding.init();
    var select = div.childNodes[0];
    equal(select.childNodes.length, 4);

    equal(data.selected, 1);
    equal(select.childNodes[0].getAttribute('selected'), 'selected');
    equal(select.childNodes[1].getAttribute('selected'), null);

    binding.dataEvent({target:select});
    equal(data.selected, 1);

    select.childNodes[3].setAttribute('selected', 'selected');
    binding.dataEvent({target:select});
    equal(data.selected, 4);
    equal(select.childNodes[0].getAttribute('selected'), null);

    select.childNodes[2].setAttribute('selected', 'selected');
    binding.dataEvent({target:select});
    equal(data.selected, 3);

});


test("Test initialRenderFromDom", function() {

    var data = {list:[1,2,3]};
    var tpl = template([
    'for el in list',
    '  p id="{{ el }}"',
    '     {{ el }}',
    '     {{ el }}'
    ]);
    var html = tpl.tree(ctx(data)).domHtml();

    var div = document.createElement('div');
    div.innerHTML = html;
    var tree = likely.initialRenderFromDom(div);

    // expecting a normalisation of the text nodes
    equal(div.childNodes[0].childNodes[0].textContent, '11');

    equal(tree.children.length, 3);
    equal(tree.children[2].attrs.id, '3');
    equal(tree.children[0].children[0].nodeName, '#text');
    equal(tree.children[0].children.length, 1);
    equal(tree.children[2].attrs.id, '3');

    data = {list:[1,2,3,4]};
    var binding = likely.Binding(div, tpl, data);
    binding.domInit();

    binding.diff();

    equal(div.childNodes.length, 4);

    binding.data = {list:[2,3,4]};
    binding.update();

    equal(div.childNodes.length, 3);
    equal(div.childNodes[0].id, '2');

    binding.data = {list:[4]};
    binding.diff();

    equal(div.childNodes.length, 1);
    equal(div.childNodes[0].id, '4');
    equal(div.childNodes[0].childNodes[0].textContent, '4');

});



