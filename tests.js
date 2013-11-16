

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
    var context = likely.Context(data);
    var tplc = likely.Template(tpl);
    return tplc.render(context);
}

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


test("Simple Expressions", function() {

    testRender('{{ 3 * 4 }}', {}, '12');
    testRender('{{ 3 - 4 }}', {}, '-1');
    testRender('{{ 3 + 4 }}', {}, '7');
    testRender('{{ 3 < 4 }}', {}, "true");
    testRender('{{ 3 == 4 }}', {}, "false");
    testRender('{{ 3 > 4 }}', {}, "false");

    testRender('{{ v > 4 }}', {v:2}, "false");
    testRender('{{ v > 0 }}', {v:2}, "true");
});

test("Names", function() {

    testRender('{{ v2 }}', {v2:'oki'}, 'oki');
    testRender('{{ v }}', {v:'oki'}, 'oki');

});


test("HTML render", function() {

var tpl = [
'input value="{{ test.value }}"'
];

testRender(tpl, {test:{value:2}}, '<input value="2" data-path=".test.value"/>');

var tpl = [
'for line in lines',
'  input value="{{ line.value }}"'
];

testRender(tpl, {lines:[{value:2}]}, '<input value="2" data-path=".lines.0.value"/>');

var tpl = [
'for line in lines',
'  input value="{{ line }}"'
];

testRender(tpl, {lines:[2]}, '<input value="2" data-path=".lines.0"/>');

var tpl = [
'for index,line in lines',
'  "{{ line }}:{{ index }},"'
];

testRender(tpl, {lines:["a","b","c"]}, 'a:0,b:1,c:2,');


var tpl = [
'textarea value="{{ txtvalue }}"',
];

testRender(tpl, {txtvalue:"hello world"}, '<textarea value="hello world" data-path=".txtvalue">hello world</textarea>');


var tpl = [
'input value="no path"',
];
testRender(tpl, {}, '<input value="no path"/>');

});

test("Expressions in value", function() {

var tpl = [
'input value="{{ test > 2 and "hello" or "world" }}"',
];
testRender(tpl, {test:3}, '<input value="hello"/>');
testRender(tpl, {test:1}, '<input value="world"/>');

});

test("Partial render", function() {

var tpl = [
'div id="t1" data-partial="true"',
'  {{ t1 }}',
'  div id="t2" data-partial="true"',
'    {{ t2 }}'
];
testRender(tpl, {t1:1,t2:2}, '<div id="t1" data-partial="true" data-hash=-1044877387>1<div id="t2" data-partial="true" data-hash=-1437693305>2</div></div>');
testRender(tpl, {t1:1,t2:3}, '<div id="t1" data-partial="true" data-hash=-2101052713>1<div id="t2" data-partial="true" data-hash=-744591608>3</div></div>');

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
testRender('include template1', {value:"world"}, 'hello world');

});

test("Multiline syntax", function() {

var tpl = [
'hello \\',
'world\\',
' all',
'end',
];

    
testRender(tpl, {}, '<hello world all></hello><end></end>');

var tpl = [
'p',
' """hello',
'    world"""',
];

testRender(tpl, {}, '<p>hello    world</p>');


});


test("Conditions in expression", function() {

testRender('p {{ "hello" if toto.tata or "world" }}', {toto:{tata:true}}, '<p hello></p>');
testRender('p {{ "hello" if toto.tata or "world" }}', {toto:{tata:false}}, '<p world></p>');

testRender('p {{ "green" if 3 > 2 or "red" }}', {}, 'green');


});


