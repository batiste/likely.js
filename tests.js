

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
testRender(tpl, {test:3}, '<input value="hello" data-path=".test"/>');
testRender(tpl, {test:1}, '<input value="world" data-path=".test"/>');

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

test("Filters", function() {

testRender('{{ "hello"|fl }}', {'fl':function(v,c){return "world";}}, 'world');
testRender('{{ "HELLO"|lower }}', {'lower':function(v,c){return v.value.toLowerCase();}}, 'hello');


});


test("Lexer", function() {
    
    var COMMENT = {reg:/#[^\r]*/, name:"comment"};
    var KEYWORD = {reg:/(for |if |include |else|elif )/, name:"keyword"};
    var CONJUNCTION = {reg:/(in |=|\,)/, name:"conjunction"};
    var COMPARATOR = {reg:/(>|<|==|>=|<=)/, name:"comparator"};
    var MATH = {reg:/(\+|\*|\-)/, name:"math"};
    var MULTI_STRING = {reg:/""".*?"""/, name:"string"};
    var EXPRESSION = {reg:/\{\{.*?\}\}/, name:"expression"};
    var STRING = {reg:/"(?:[^"\\]|\\.)*"/, name:"string", m:1};
    var NUMBER = {reg:/[0-9]+(\.[0-9]*)?/, name:"number"};
    var LINE = {reg:/\r/, name:"endline"};
    var SPACE = {reg:/[\s]+/, name:"space"};
    var NAME = {reg:/[a-zA-Z][\w_\.]*/, name:"name"};
    
    var lexems = [COMMENT, KEYWORD, CONJUNCTION, COMPARATOR, MATH, MULTI_STRING, 
        EXPRESSION, STRING, NUMBER, LINE, SPACE, NAME];
    
    for(i = 0; i<lexems.length; i++) {
        lexems[i].sreg = new RegExp("^"+lexems[i].reg.source);
    }
    
    function tokenize(str) {
        var i, match, found, lexem, tokens = [];
        while(str) {
            found = false;
            for(i = 0; i<lexems.length; i++) {
                lexem = lexems[i];
                match = str.match(lexem.sreg);
                if(match) {
                    str = str.slice(match[0].length);
                    tokens.push({content:match[0], name:lexem.name});
                    found = true;
                    break;
                }
            }
            if(!found) {
                throw "Unexpected token:" + str;
            }
        }
        return tokens;
    }
    
    var tokens = tokenize("for a, baba.toto in 7.01\r  # my comment");
    equal(tokens[0].content, "for ");
    equal(tokens[1].content, "a");
    equal(tokens[2].content, ",");
    equal(tokens[4].content, "baba.toto");
    equal(tokens[6].content, "in ");
    equal(tokens[7].content, "7.01");
    equal(tokens[8].content, "\r");
    equal(tokens[8].name, "endline");
    equal(tokens[10].name, "comment");
    
    equal(tokens.length, 11);
    
    tokens = tokenize('"""\
    test\
    """');
    
    equal(tokens.length, 1);
    equal(tokens[0].name, "string");
    
    tokens = tokenize('""');
    equal(tokens.length, 1);
    equal(tokens[0].name, "string");
    equal(tokens[0].content, '""');
    
    tokens = tokenize('input type="submit"');
    
    equal(tokens[0].name, "name");
    equal(tokens[2].name, "name");
    equal(tokens[3].name, "conjunction");
    equal(tokens[4].name, "string");

    tokens = tokenize('{{ expression }}');
    equal(tokens[0].name, "expression");
    
    
    
});




