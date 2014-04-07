"use strict";

function template(tplArray) {
    if(typeof tplArray == 'object') {
        var tpl = tplArray.join('\n');
    } else {
        var tpl = tplArray;
    }
    return likely.Template(tpl);
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
    equal(diff[0].node.path, '.lines.2');

    var diff = rt2.diff(rt1);
    equal(diff.length, 1);
    equal(diff[0].action, 'add');
    equal(diff[0].node.path, '.lines.2');
    //equal(diff[0].target.path, '.');

    var rt3 = tpl.tree(ctx({lines:[1,0,3]}));

    var diff = rt1.diff(rt3);
    equal(diff[0].action, 'stringmutate');
    equal(diff[0].node.path, '.lines.1');
    equal(diff[0].with.path, '.lines.1');
    equal(diff.length, 1);
});


test("Attribute parser", function() {
    var attrs_string = 'toto="glup" other="glop"';
    var attrs = likely.parse_attributes(attrs_string);
    equal(attrs.toto.evaluate(), 'glup');
    equal(attrs.other.evaluate(), 'glop');

    var attrs_string = 'toto="a \\"test"';
    var attrs = likely.parse_attributes(attrs_string);
    equal(attrs.toto.evaluate(), 'a "test');

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

    var diff = likely.attributes_diff(at1, at2);

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
    equal(diff1[0].attributes_diff.length, 1);
    var attr_diff = diff1[0].attributes_diff[0];
    equal(attr_diff.action, "remove");
    equal(attr_diff.key, "tata");

    var diff2 = t2.diff(t3);
    equal(diff2[0].attributes_diff.length, 2);
    var attr_diff = diff2[0].attributes_diff[0];
    equal(attr_diff.action, "mutate");
    equal(attr_diff.key, "toto");
    equal(attr_diff.value, 'cha nge');

    var attr_diff = diff2[0].attributes_diff[1];
    equal(attr_diff.action, "add");
    equal(attr_diff.key, "bla");
    equal(attr_diff.value, 'test');

});

test("Attribute expression", function() {

    var tpl1 = template('p toto="{{hello}}"');
    var t1 = tpl1.tree(ctx({hello: "world"}));

    equal(t1.dom_html(), '<p toto="world"></p>');

    var tpl1 = template('p toto="{{ 2 + 1 }}"');
    var t1 = tpl1.tree(ctx({hello: "world"}));
    equal(t1.dom_html(), '<p toto="3"></p>');

});

test("Attribute expression diff", function() {

    var tpl1 = template('p toto="{{hello}}"');
    var t1 = tpl1.tree(ctx({hello: "world"}));
    var t2 = tpl1.tree(ctx({hello: "universe"}));
    var diff1 = t1.diff(t2);

    equal(diff1.length, 1);
    equal(diff1[0].attributes_diff.length, 1);
    var attr_diff = diff1[0].attributes_diff[0];
    equal(attr_diff.action, "mutate");
    equal(attr_diff.key, "toto");
    equal(attr_diff.value, "universe");

    var tpl1 = template('p class="{{ \'selected\' if test }}"');
    var t1 = tpl1.tree(ctx({test: true}));
    var t2 = tpl1.tree(ctx({test: false}));
    var diff1 = t1.diff(t2);
    equal(diff1.length, 1);
    var attr_diff = diff1[0].attributes_diff[0];
    equal(attr_diff.action, "mutate");
    equal(attr_diff.key, "class");
    equal(attr_diff.value, "");

});


test("Diff removed node", function() {

    var tpl = [
    'for line in lines',
    '  {{ line }}'
    ];

    var tpl = template(tpl);

    var rt1 = tpl.tree(ctx({lines:[1,2,3,4]}));
    var rt2 = tpl.tree(ctx({lines:[1,3,4]}));

    var diff = rt1.diff(rt2);
    equal(diff.length, 1);
    var attr_diff = diff[0];
    equal(attr_diff.action, "remove");
    equal(attr_diff.node.path, ".lines.1");

});

test("Diff added node", function() {

    var tpl = [
    'for line in lines',
    '  {{ line }}'
    ];

    var tpl = template(tpl);

    var rt1 = tpl.tree(ctx({lines:[1,2,4]}));
    var rt2 = tpl.tree(ctx({lines:[1,2,3,4]}));

    var diff = rt1.diff(rt2);
    equal(diff.length, 1);
    equal(diff[0].action, "add");
    equal(diff[0].node.path, ".lines.2");

    var diff = rt2.diff(rt1);
    equal(diff.length, 1);
    equal(diff[0].action, "remove");
    equal(diff[0].node.path, ".lines.2");

});

test("Diff edge cases", function() {

    var tpl = [
    'for line in lines',
    ' p attr="value"',
    '  {{ line }}'
    ];

    var tpl = template(tpl);

    var rt1 = tpl.tree(ctx({lines:[1,2,3]}));
    var rt2 = tpl.tree(ctx({lines:[0,1,2]}));

    var diff = rt1.diff(rt2);
    equal(diff.length, 2);
    equal(diff[0].action, "add");
    equal(diff[0].node.path, ".lines.0");
    equal(diff[1].action, "remove");
    equal(diff[1].node.path, ".lines.2");

    var diff = rt2.diff(rt1);
    equal(diff.length, 2);
    equal(diff[0].action, "remove");
    equal(diff[0].node.path, ".lines.0");
    equal(diff[1].action, "add");
    equal(diff[1].node.path, ".lines.2");

});

test("HTML mutator : attributes", function() {
    var tpl = template('p at1="{{ at1 }}" at2="{{at2}}"');
    var div = document.createElement('div');
    var rt1 = tpl.tree(ctx({at1:1, at2:2}));
    div.innerHTML = rt1.dom_html();
    equal(div.childNodes[0].getAttribute("at1"), 1);

    var rt2 = tpl.tree(ctx({at1:10, at2:20}));
    var diff = rt1.diff(rt2);
    likely.apply_diff(diff, div);
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
    var tpl = template(tpl);

    var div = document.createElement('div');

    var rt1 = tpl.tree(ctx({lines:[1,2,3]}));
    div.innerHTML =  rt1.dom_html();
    equal(div.childNodes.length, 3);

    var rt2 = tpl.tree(ctx({lines:[1,3,4,5]}));

    var diff = rt1.diff(rt2);

    equal(diff.length, 3);
    equal(diff[0].action, "remove");
    equal(diff[0].path, ".1");

    equal(diff[1].action, "add");
    equal(diff[1].path, ".3", "add");

    equal(diff[2].action, "add");
    equal(diff[2].path, ".4");

    likely.apply_diff(diff, div);

    equal(div.childNodes.length, 4);
    equal(div.childNodes[0].textContent, 1);
    equal(div.childNodes[1].textContent, 3);
    equal(div.childNodes[2].textContent, 4);
    equal(div.childNodes[3].textContent, 5);

    var diff = rt2.diff(rt1);

    equal(diff.length, 3);
    equal(diff[0].action, "add");
    equal(diff[0].path, ".1");

    equal(diff[1].action, "remove");
    equal(diff[1].path, ".3");

    equal(diff[2].action, "remove");
    equal(diff[2].path, ".3");

    likely.apply_diff(diff, div);
    equal(div.childNodes.length, 3);
    equal(div.childNodes[0].textContent, 1);
    equal(div.childNodes[0].getAttribute("toto"), 1);
    equal(div.childNodes[1].textContent, 2);
    equal(div.childNodes[2].textContent, 3);
    equal(div.childNodes[2].getAttribute("toto"), 3);
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
    div.innerHTML = rt1.dom_html();
    equal(div.childNodes.length, 1);
    equal(div.childNodes[0].nodeName, 'A');

    var diff = rt1.diff(rt2);
    equal(diff.length, 2);
    likely.apply_diff(diff, div);
    equal(div.childNodes[0].nodeName, 'P');

});

test("HTML mutator : complex example", function() {

    var tpl = [
    'for key, value in lines',
    '  p class="{{ \'selected\' if value.name == selected }}"',
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
    div.innerHTML = rt1.dom_html();
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

    likely.apply_diff(diff, div);

    equal(div.childNodes[1].className, '');
    equal(div.childNodes[2].className, 'selected');
    equal(div.childNodes[0].className, '');

    data.lines[0].links = [1, 2, 3, 4];
    data.lines[1].links = [1, 56, 2];
    data.lines[2].links = [2, 3];
    data.lines[2].name = "new name";

    var rt3 = tpl.tree(ctx(data));
    diff = rt2.diff(rt3);

    equal(diff[0].action, 'add');
    equal(diff[1].action, 'add');
    equal(diff[2].action, 'mutate');
    equal(diff[3].action, 'remove');

    likely.apply_diff(diff, div);

    equal(div.childNodes[1].className, '');
    equal(div.childNodes[2].className, '');
    equal(div.childNodes[0].className, '');

    data.lines.splice(1, 2);
    var rt4 = tpl.tree(ctx(data));
    diff = rt3.diff(rt4);
    equal(diff.length, 2);
    likely.apply_diff(diff, div);
    equal(div.childNodes.length, 1);

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
    var dom_tree = rt1.dom_tree();

    equal(dom_tree[0].nodeName, 'P');
    equal(dom_tree[0].childNodes[0].nodeName, '#text');
    equal(dom_tree[0].childNodes[0].nodeValue, '0');
    equal(dom_tree[0].childNodes[1].nodeValue, ' : ');
    equal(dom_tree[0].childNodes[2].nodeValue, 'test1');

    equal(rt1.dom_html(), "<p>0 : test1</p><p>1 : test2</p>")

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
    rt1.dom_tree(div);
    equal(div.childNodes.length, 2);
    equal(div.childNodes[0].textContent, "0 : test1");
    equal(div.childNodes[1].textContent, "1 : test2");

    var rt2 = tpl.tree(ctx({lines:["test1", "test changed"]}));
    var diff = rt1.diff(rt2);
    equal(diff.length, 1);
    equal(diff[0].action, "stringmutate");
    equal(diff[0].value, "test changed");

    likely.apply_diff(diff, div);
    equal(div.childNodes[1].childNodes[0].textContent, 1);
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
    rt1.dom_tree(div);
    equal(div.childNodes.length, 2);
    equal(div.childNodes[0].nodeName, "LI");

    likely.apply_diff(diff, div);

    equal(div.childNodes.length, 1);
    equal(div.childNodes[0].nodeName, "UL");
    equal(div.childNodes[0].childNodes[0].nodeName, "LI");
    equal(div.childNodes[0].childNodes[1].nodeName, "LI");

});

test("HTML mutator : non regression test on diff algo", function() {

    var tpl1 = [
    'for value in lines',
    ' p',
    '  {{ value }}'
    ];
    tpl1 = template(tpl1);

    var tpl2 = [
    'for value in lines',
    ' p',
    '  {{ value }}',
    ' '
    ];
    tpl2 = template(tpl2);

    var tpl3 = [
    'for value in lines',
    ' p',
    '  {{ value }}',
    '  '
    ];
    tpl3 = template(tpl3);

    var rt1 = tpl1.tree(ctx({lines:["test1", "test2"]}));
    var rt2 = tpl2.tree(ctx({lines:["test1", "test2"]}));
    var rt3 = tpl3.tree(ctx({lines:["test1", "test2"]}));
    var diff = rt1.diff(rt2);

    equal(diff.length, 2);
    equal(diff[0].action, "add");
    equal(diff[0].node.nodeName, "string")


    var div = document.createElement('div');
    rt1.dom_tree(div);

    equal(div.childNodes.length, 2);
    equal(div.childNodes[0].childNodes.length, 1);
    equal(div.childNodes[0].nodeName, "P");
    equal(div.childNodes[0].childNodes[0].nodeName, "#text");

    likely.apply_diff(diff, div);

    equal(div.childNodes.length, 4);
    equal(div.childNodes[0].childNodes.length, 1);
    equal(div.childNodes[0].nodeName, "P");
    equal(div.childNodes[1].nodeName, "#text");
    equal(div.childNodes[2].nodeName, "P");
    equal(div.childNodes[3].nodeName, "#text");
    equal(div.childNodes[2].childNodes.length, 1);

    diff = rt2.diff(rt3);
    equal(likely.getDom(div, '.1').nodeName, "#text")

    likely.apply_diff(diff, div);

    equal(div.childNodes.length, 2);
    equal(div.childNodes[0].childNodes.length, 2);
    equal(div.childNodes[0].nodeName, "P");
    equal(div.childNodes[0].childNodes[0].nodeName, "#text");
    equal(div.childNodes[1].nodeName, "P");
    equal(div.childNodes[1].childNodes[0].nodeName, "#text");

});


test("HTML mutator : databinding and attribute removal", function() {
    var tpl1 = template('input value={{ v }}');
    var rt1 = tpl1.tree(ctx({v:"test1"}));
    var div = document.createElement('div');
    rt1.dom_tree(div);
    equal(div.childNodes[0].getAttribute('data-binding'), '.v');

    // data cannot be binded anymore
    var tpl2 = template('input value={{ v + 1 }}');
    var rt2 = tpl2.tree(ctx({v:"test"}));
    equal(rt2.dom_tree()[0].getAttribute('data-binding'), null);

    var diff = rt1.diff(rt2);
    equal(diff.length, 1);
    equal(diff[0].action, "mutate");
    equal(diff[0].attributes_diff.length, 1);
    equal(diff[0].attributes_diff[0].action, "remove");
    equal(diff[0].attributes_diff[0].key, "data-binding");

    likely.apply_diff(diff, div);
    equal(div.childNodes[0].getAttribute('data-binding'), null);
});

test("HTML mutator : textarea", function() {
    var tpl = template(['textarea', ' "hello"']);
    var rt1 = tpl.tree(ctx({}));
    var div = document.createElement('div');
    rt1.dom_tree(div);
    equal(div.childNodes[0].childNodes[0].textContent, 'hello');
    equal(div.childNodes[0].value, 'hello');

    var tpl2 = template(['textarea', ' "world"']);
    var rt2 = tpl2.tree(ctx({}));

    var diff = rt1.diff(rt2);
    equal(diff.length, 1);
    equal(diff[0].action, "stringmutate");
    likely.apply_diff(diff, div);

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
  tree.dom_tree(div);

  equal(div.childNodes[0].value, "k2");

});

test("HTML mutator : change attribute name", function() {
  var tpl1 = template('p value="toto"');
  var tpl2 = template('p valu="tata"');
  var div = document.createElement('div');
  var component = new likely.Component(div, tpl1, {});

  equal(div.childNodes[0].getAttribute('value'), 'toto');

  component.template = tpl2;
  component.update();

  equal(div.childNodes[0].getAttribute('value'), undefined);
  equal(div.childNodes[0].getAttribute('valu'), 'tata');
});

test("Component", function() {

    function test_component(tpl, component_name) {
        var div = document.createElement('div');
        var data = {v:"test1"};
        var component = new likely.Component(div, tpl, data);
        var el = div.childNodes[0];

        equal(div.childNodes[0].getAttribute('data-binding'), '.v', component_name);

        equal(el.getAttribute('value'), 'test1', component_name);

        el.setAttribute('value', "test2");
        el.value = "test2";
        component.domEvent({target:el});

        equal(data.v , 'test2', component_name);

        data.v = "test3";
        component.update();
        equal(el.getAttribute('value'), "test3", component_name);
    }

    var tpl = template('input value={{ v }}');
    test_component(tpl, 'input');
    tpl = template(['textarea', ' {{ v }}']);
    test_component(tpl, 'textarea');
    tpl = template('select value={{ v }}');
    test_component(tpl, 'select');

});


