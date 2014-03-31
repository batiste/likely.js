"use strict";

function testRender(tplArray, data, expected) {
    var result = render(tplArray, data);
    equal(result, expected);
}

function render(tplArray, data) {
    if(typeof tplArray == 'object') {
        var tpl = tplArray.join('\n');
    } else {
        var tpl = tplArray;
    }
    var context = new likely.Context(data);
    var tplc = likely.Template(tpl);
    return tplc.tree(context).dom_html();
}


test("Context tests", function() {

    var ctx = new likely.Context({a:1, b:2, list:{g:{j:12}, k:20}});
    equal(ctx.getPath(), '.');
    var ctx2 = new likely.Context({j:12, k:{l:13}, b:99}, ctx, 'list', 'value', 'g');
    equal(ctx2.getPath(), '.list.g');

    equal(ctx.get('b'), 2);

    equal(ctx2.getNamePath('value'), '.list.g');
    equal(ctx2.getNamePath('j'), '.list.g.j');
    equal(ctx2.getNamePath('list.g'), '.list.g');
    equal(ctx2.get('list.k'), 20);
    equal(ctx2.get('b'), 99);
    equal(ctx2.get('list.a'), undefined);
    // TODO: make this pass, maybe?
    // equal(ctx2.getNamePath('list.a'), undefined);
    equal(ctx2.getNamePath('a'), '.a');
    equal(ctx2.getNamePath('l'), undefined);
    equal(ctx2.getNamePath('k.l'), '.list.g.k.l');

});


test("Strong compile expressions", function() {

    var expr = likely.compileExpressions("{{ test }}");
    equal(expr[0].name, "test")

});



test("Expression parser", function() {

    var expressions = likely.parse_all_expressions("1 == 2");
    equal(expressions.length, 3);
    equal(expressions[0].evaluate(), 1);
    equal(expressions[1].type, 'operator');
    equal(expressions[2].evaluate(), 2);

    var tree = likely.build_expressions(expressions);
    equal(tree.type, 'operator');
    equal(tree.left.evaluate(), '1');
    equal(tree.right.evaluate(), '2');
    equal(tree.evaluate(), false);

});

test("Expression precedence", function() {

    function evaluate(expr, data) {
        var expressions = likely.parse_all_expressions(expr);
        var tree = likely.build_expressions(expressions);
        return tree.evaluate(data);
    }

    equal(evaluate("3 == 2 + 1"), true);
    equal(evaluate("3 == 3 + 1"), false);
    equal(evaluate("0 or 3 + 1"), 4);
    equal(evaluate("5 if 3 == 3"), 5);
    equal(evaluate("5 if 3 != 3"), '');
    equal(evaluate("5 * 5 if 3 == 3"), 25);

});

test("Simple ForNode test", function() {

    var tpl = [
    'for line in lines',
    '  {{ line }}'
    ];

    testRender(tpl, {}, '');
    testRender(tpl, {lines:[]}, '');
    testRender(tpl, {lines:[1,2,3]}, '123');

});

test("ForNode with conditions", function() {

    var tpl = [
    'for line in lines',
    '  if line == 1',
    '    "one,"',
    '  elseif line == 2',
    '    "two,"',
    '  else',
    '    "{{ line }},"'
    ];

    testRender(tpl, {lines:[1]}, 'one,');
    testRender(tpl, {lines:[1,3]}, 'one,3,');
    testRender(tpl, {lines:[3]}, '3,');
    testRender(tpl, {lines:[0,1,2,3,4,5]}, '0,one,two,3,4,5,');

});

test("Nested ForNode", function() {

    var tpl = [
    'for line in lines',
    '  for line in line.lines',
    '     "{{ line }},"'
    ];

    testRender(tpl, {lines:[{lines:[1,2,3]}]}, '1,2,3,');

});

test("StringValue regexp works with single or double quotes", function() {

    var reg = likely.expressions.StringValue.reg;
    equal(reg.exec('"test" hello" bla')[0], '"test"')
    equal(reg.exec('"test\\" hello" bla')[0], '"test\\" hello"')
    equal(reg.exec("'test' hello' bla")[0], "'test'")
    equal(reg.exec("'test\\' hello' bla")[0], "'test\\' hello'")

});

test("Simple Expressions", function() {

    testRender('{{ 3 * 4 }}', {}, '12');
    testRender('{{ 3 - 4 }}', {}, '-1');
    testRender('{{ 3 + 4 }}', {}, '7');
    testRender('{{ 3 < 4 }}', {}, "true");
    testRender('{{ 3 == 4 }}', {}, "false");
    testRender('{{ 3 > 4 }}', {}, "false");

    testRender('{{ v > 4 }}', {v:2}, "false");
    testRender('{{ v > 0 }}', {v:2}, "true");

    testRender('{{ 5 if 1 == 1 }}', {}, 5);

    testRender("{{ 'concat' + 'enation' }}", {}, "concatenation");
    testRender("{{ 'concat' + 'enation' + 5 }}", {}, "concatenation5");
});

test("Names", function() {
    testRender('{{ v2 }}', {v2:'oki'}, 'oki');
    testRender('{{ v }}', {v:'oki'}, 'oki');
    testRender('{{ v }}', {hello:{v:'oki'}}, 'undefined');
    testRender('{{ hello.v }}', {hello:{v:'oki'}}, 'oki');
    testRender('{{ hello.toto.tata }}', {hello:{v:'oki'}}, 'undefined');
});


test("HTML render", function() {

var tpl = [
'for index,line in lines',
'  "{{ line }}:{{ index }},"'
];
testRender(tpl, {lines:["a","b","c"]}, 'a:0,b:1,c:2,');



});

test("Input data binding render", function() {

var tpl = [
'input value={{ test.value }}'
];
testRender(tpl, {test:{value:2}}, '<input value="2" data-binding=".test.value">');

var tpl = [
'input value="{{ test.value }}"'
];
testRender(tpl, {test:{value:2}}, '<input value="2" data-binding=".test.value">');

});




test("ForNode index, value syntax", function() {

var tpl = [
'for index, value in data',
'  "{{ index }}:{{ value }},"',
];

testRender(tpl, {data:[5,10]}, '0:5,1:10,');

});

test("Include syntax", function() {

likely.Template('"hello {{ value }}"', "template1");
var tpl = likely.Template("include template1");

testRender('include template1', {value:"world"}, 'hello world');

});

test("Multiline syntax", function() {

var tpl = [
'hello \\',
'world="1"\\',
' all="2"',
'end'
];

testRender(tpl, {}, '<hello world="1" all="2"></hello><end></end>');

var tpl = [
'p',
' """hello',
'    world"""',
];

testRender(tpl, {}, '<p>hello    world</p>');

});

test("Filters", function() {

testRender('{{ "hello"|fl }}', {'fl':function(v,c){return "world";}}, 'world');
testRender('{{ "HELLO"|lower }}', {'lower':function(v,c){return v.toLowerCase();}}, 'hello');
testRender('{{ "HELLO" | lower }}', {'lower':function(v,c){return v.toLowerCase();}}, 'hello');

testRender('{{ "oki" if "HELLO" | lower }}', {'lower':function(v,c){return v.toLowerCase();}}, 'oki');
testRender('{{ "oki" if 1 | minus1 }}', {'minus1':function(v,c){console.log(v);return v-1}}, '');

});

test("ForNode filter", function() {

var tpl = [
'for value in lines | lowpass',
'  "{{ value }},"',
];

var tplc = likely.Template(tpl.join('\n'));

testRender(tpl, {
    'lines':[1,5,9,12,13],
    'lowpass':function(array,c) {
        return arr.filter(function(c){
            return c<10;
    });
    }
}, "1,5,9,");

});


test("Class selected use case", function() {

testRender(
    'a class={{ selected == line and "selected" }}',
    {selected:4, line:4},
    '<a class="selected"></a>'
);

testRender(
    'a class="{{ selected == line and \\"selected\\" }}"',
    {selected:4, line:4},
    '<a class="selected"></a>'
);

testRender(
    "a class=\"{{ selected == line and 'selected' }}\"",
    {selected:4, line:4},
    '<a class="selected"></a>'
);

});


