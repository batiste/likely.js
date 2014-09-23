"use strict";

function testRender(tplArray, data, expected) {
    var result = render(tplArray, data);
    equal(result, expected);
}

function render(tpl, data) {
    var context = new likely.Context(data);
    var tplc = likely.Template(tpl);
    return tplc.tree(context).domHtml();
}

test("Context tests", function() {

    var ctx = new likely.Context({a:1, b:2, list:{g:{j:12}, k:20}});
    var ctx2 = new likely.Context({j:12, k:{l:13}, b:99}, ctx);

    ctx2.addAlias('list.g', 'value');

    equal(ctx2.getNamePath('value'), 'list.g');

    equal(ctx.get('b'), 2);

    equal(ctx2.getNamePath('value'), 'list.g');
    equal(ctx2.getNamePath('j'), 'j');
    equal(ctx2.getNamePath('list.g'), 'list.g');
    equal(ctx2.get('list.k'), 20);
    equal(ctx2.get('b'), 99);
    equal(ctx2.get('list.a'), undefined);
    // TODO: make this pass, maybe?
    // equal(ctx2.getNamePath('list.a'), undefined);
    equal(ctx2.getNamePath('a'), 'a');
    equal(ctx2.getNamePath('l'), undefined);
    equal(ctx2.getNamePath('k.l'), 'k.l');

});

test("Context modify", function() {

    var ctx = new likely.Context({a:1, b:{c:2}});

    ctx.modify('a', 2);
    equal(ctx.get('a'), 2);
    ctx.modify('b.c', 3);
    equal(ctx.get('b.c'), 3);

});


test("Context aliases", function() {

    var ctx = new likely.Context({a:1, b:3});
    var ctx2 = new likely.Context({}, ctx);
    equal(ctx2.get('a'), 1);
    ctx2.set('a', 2);
    equal(ctx2.get('a'), 2);

    equal(ctx2.getNamePath('a'), 'a');

    ctx2.addAlias('b', 'a');

    equal(ctx2.getNamePath('a'), 'b');

    throws(
        function() {
            ctx2.addAlias('a', 'a');
        },
        likely.CompileError,
        "raised error if alias == source name"
    );

    ctx2.addAlias('a', 'test');
    equal(ctx2.get('test'), 2);

});


test("Compile expressions containing }", function() {

    var expr = likely.expression.compileTextAndExpressions("{{ '}' }}");
    equal(expr[0](), "}");

});

test("Throw compile errors", function() {

    throws(
        function() {
            testRender("for v in");
        },
        likely.CompileError,
        "raised error is an instance of CompileError"
    );

    throws(
        function() {
            testRender("{{ 1 1 }}");
        },
        likely.CompileError,
        "raised error is an instance of CompileError"
    );

    throws(
        function() {
            testRender("{{ 'e }}");
        },
        likely.CompileError,
        "raised error is an instance of CompileError"
    );

    throws(
        function() {
            testRender("{{ for a in b }}");
        },
        likely.CompileError,
        "raised error is an instance of CompileError"
    );

});

function evaluate_expr(expr, data) {
    var expression = likely.expression.jsExpression(expr);
    var ctx = new likely.Context(data || {});
    return expression.call(ctx, ctx);
}

test("Expression precedence", function() {

    equal(evaluate_expr("3 == 2 + 1"), true);
    equal(evaluate_expr("3 == 3 + 1"), false);
    equal(evaluate_expr("0 || 3 + 1"), 4);
    equal(evaluate_expr("1 == 1 && 5 * 5"), 25);
});

test("Function Call Expression", function() {

    equal(
        evaluate_expr("test()",
        {test:function(){return 'oki';}}), 'oki');

    equal(
        evaluate_expr("test(var1, var2)",
            {test:function(v1, v2){return v1+v2;}, var1:1, var2:3}
        ),
        '4');

    equal(
        evaluate_expr("test(context)",
            {test:function(context){return context.get("var1");}, var1:18}
        ),
        '18');

    equal(
        evaluate_expr("test.toto()",
            {test:{toto:function(){return 1;}}}
        ),
        '1');

    // functions accept any expressions as parameters
    equal(
        evaluate_expr("test('test', 1 + 1)",
            {test:function(v1, v2){return v1+v2;}}
        ),
        'test2');


    equal(
        evaluate_expr("test('test1,test2')",
            {test:function(v1){return v1;}}
        ),
        'test1,test2');

});


test("jsExpression", function() {
    function js(expr, ctx) {
        return likely.expression.jsExpression(expr)(new likely.Context(ctx || {}));
    }
    equal(js("1 + 1"), 2);
    equal(js("(1 + 1) * 2"), 4);

    equal(js("abc + 2", {abc:2}), 4);
    equal(js("test(1 + 1, 2 + 2, var1)", {
        test:function(a, b, v){
            return a + b + v;
        },
        var1:10
    }), 16);

    equal(js("'hello' + ', ' + 'world'", {}), "hello, world");
    equal(js('"hello" + ", " + "world"', {}), "hello, world");

    equal(js('"\\""', {}), '\"');

    equal(evaluate_expr("1 == true"), true);
    equal(evaluate_expr("0 == false"), true);
    equal(evaluate_expr("undefined !== false"), true);
    equal(evaluate_expr("undefined"), undefined);
    equal(evaluate_expr("null"), null);
    equal(evaluate_expr("false"), false);


});


test("Simple ForNode test", function() {

    var tpl = [
    'for line in lines',
    '  {{ line }}'
    ];

    testRender(tpl, {}, '');
    testRender(tpl, {lines:[]}, '');
    testRender(tpl, {lines:[1,2,3]}, '123');

    tpl = [
    'for keyvalue in list',
    '  {{ line }}'
    ];
    testRender(tpl, {}, '');

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
    testRender(tpl, {lines:[2]}, 'two,');
    testRender(tpl, {lines:[0,1,2,3,4,5]}, '0,one,two,3,4,5,');

});

test("Strings escaping", function() {

    var tpl = [
    '"hello \\" world"',
    '"""hello \\" world"""'
    ];

    testRender(tpl, {}, 'hello " worldhello " world');

});

test("Nested ForNode", function() {

    var tpl = [
    'for line in lines',
    '  for line in line.lines',
    '     "{{ line }},"'
    ];

    testRender(tpl, {lines:[{lines:[1,2,3]}]}, '1,2,3,');

});

test("Comment node", function() {

    var tpl = [
    '# comment node',
    'p',
    '  "hello"'
    ];

    testRender(tpl, {}, '<p>hello</p>');

});

test("Attribute is not rendered if the expression return false", function() {

    var tpl1 = 'p class={{ 1 == 1 }}';
    var tpl2 = 'p class={{ 1 == 2 }}';
    testRender(tpl1, {}, '<p class="true"></p>');
    testRender(tpl2, {}, '<p></p>');

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


    testRender("{{ 'concat' + 'enation' }}", {}, "concatenation");
    testRender("{{ 'concat' + 'enation' + 5 }}", {}, "concatenation5");

});


test("Starting like if or in", function() {
    testRender('{{ into }}', {into:1}, '1');
    testRender('{{ iframe }}', {iframe:[42]}, '42');
});


test("Names", function() {
    testRender('{{ v2 }}', {v2:'oki'}, 'oki');
    testRender('{{ v }}', {v:'oki'}, 'oki');
    testRender('{{ v }}', {hello:{v:'oki'}}, 'undefined');
    testRender('{{ hello.v }}', {hello:{v:'oki'}}, 'oki');
    testRender('{{ hello.toto.tata }}', {hello:{v:'oki'}}, 'undefined');
});

test("Function call", function() {
    testRender('{{ test1() }}', {test1:function(){return 'oki';}}, 'oki');
    testRender('{{ test2(toto) }}', {test2:function(v){return 'oki'+v;}, toto:5}, 'oki5');
    testRender(['p', ' {{ xss() }}'], 
        {xss:function(v){return '<script>alert()</script>';}},
        '<p>&lt;script&gt;alert()&lt;/script&gt;</p>');
});

test("HTML render", function() {

    var tpl = [
    'for index, line in lines',
    '  "{{ line }}:{{ index }},"'
    ];
    testRender(tpl, {lines:["a","b","c"]}, 'a:0,b:1,c:2,');
});

test("Input data binding render", function() {

    var tpl = [
    'input value={{ test.value }}'
    ];

    var renderer = render(tpl, {test:{value:2}});
    equal(renderer.indexOf('lk-bind="test.value"') != -1, true);

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

test("Component Node", function() {
    var data = {list:[1,2]};
    var tpl = [
    'ul',
    '  for item in list',
    '    component ListItem value={{ item + 1 }} class="a"'
    ];

    var listItemTpl = template([
        'li t={{ new }}',
        '   {{ value }}'
    ]);

    likely.Component("ListItem", listItemTpl, function(context){
        context.set('new', context.get('class')+'b');
    });

    equal(render(tpl, data), '<ul><li t="ab">2</li><li t="ab">3</li></ul>');

});

test("Component binding", function() {
    var data = {test:"hello"};
    var tpl = [
    'component Test value={{ test }} cls="a"'
    ];

    var listItemTpl = template([
        'input value={{ value }} class={{ cls }}'
    ]);

    likely.Component("Test", listItemTpl);

    var renderer = render(tpl, data);

    equal(renderer.indexOf('value="hello"') != -1, true);
    equal(renderer.indexOf('class="a"') != -1, true);

});

test("Multiline syntax", function() {

    var tpl = [
    'hello \\',
    'world="1"\\',
    ' all="2"',
    'end'
    ];

    var renderer = render(tpl, {});

    equal(renderer.indexOf('world="1"') != -1, true);
    equal(renderer.indexOf('all="2"') != -1, true);

    tpl = [
    'p',
    ' """hello',
    '    world"""',
    ];

    testRender(tpl, {}, '<p>hello    world</p>');

});

test("Class selected use case", function() {

    testRender(
        'a class={{ selected == line && "selected" }}',
        {selected:4, line:4},
        '<a class="selected"></a>'
    );

    testRender(
        'a class="{{ selected == line && \\"selected\\" }}"',
        {selected:4, line:4},
        '<a class="selected"></a>'
    );

    testRender(
        "a class=\"{{ selected == line && 'selected' }}\"",
        {selected:4, line:4},
        '<a class="selected"></a>'
    );

});

function time(fct) {
    var start = (new Date()).getTime();
    fct();
    var diff = (new Date()).getTime() - start;
    return diff;
}

var number = 1000;

test("Performance with an array of "+number+" elements", function() {

    var tpl = [
        'ul',
        ' for key, value in list',
        '  li class="{{ key }}" a="1" b="1" c="1" d="1" e="1"',
        '    a href="http://example.com/{{ key }}/{{ value }}/"',
        '      "{{ key }} / {{ value }}"'
    ];

    var list = [];

    for(var i=0; i<number ; i++) {
        list.push('hello ' + i);
    }

    var tpl_build_time = time(function(){
        tpl = template(tpl);
    });

    var rt1;
    var render_time = time(function(){
        rt1 = tpl.tree(ctx({list:list}));
    });

    var diff_time = time(function(){
        rt1.diff(rt1);
    });

    ok(tpl_build_time < 20, 'Template build time should be under 20ms, was '+tpl_build_time);
    ok(render_time < (number / 5), 'Render time should be under '+(number / 5)+'ms, was '+render_time);
    ok(diff_time < (number / 10), 'Diff time should be under '+(number / 10)+'ms, was '+diff_time);
});

var number = 10000;
QUnit.asyncTest("Performance with an increasing array of "+number+" elements", function() {

    var tpl = [
        'ul',
        ' for key, value in list',
        '  li class="{{ key }}" a="1" b="1" c="1"',
        '    a href="http://example.com/{{ key }}/{{ value }}/"',
        '      "{{ key }} / {{ value }}"'
    ];

    var data = {list:[]};
    tpl = template(tpl);
    var frag = document.createDocumentFragment();

    var binding = likely.Binding(frag, tpl, data);
    binding.init();

    var start = (new Date()).getTime();

    for(var i=0; i<number; i++) {
        data.list.push('hello ' + i);
        binding.update();
    }

    binding.update(function() {
        var render_time = (new Date()).getTime() - start;
        equal(frag.childNodes[0].childNodes.length, number, 'should have '+number+' children');
        var wanted_time = (number / 5);
        ok(render_time < wanted_time, 'Template build time should be under '+wanted_time+', was '+render_time);
        QUnit.start();
    });

});

test("Binding events", function() {
    var tpl1 = template('input value={{ v }} lk-click={{ test() }}');
    var t = false;
    var data = {v:"first", test:function(){t = true;}};
    var div = document.createElement('div');
    document.body.appendChild(div);
    var binding = new likely.Binding(div, tpl1, data);
    binding.init();
    var input = div.childNodes[0];
    input.value = "second";
    equal(data.v, "first");
    var evt = likely.util.event("change");
    input.dispatchEvent(evt);
    equal(data.v, "second");

    var evt = likely.util.event("click");
    input.dispatchEvent(evt);
    equal(t, true);

    document.body.removeChild(div);
});

test("Test that template in HTML unescape entities", function() {
    var data = {};
    var div = document.createElement('div');
    div.innerHTML = 'p test="&test=1"';
    document.body.appendChild(div);
    var binding = new likely.Binding(div, data);
    binding.init();

    equal(div.childNodes[0].getAttribute('test'), "&test=1");

    document.body.removeChild(div);
});


