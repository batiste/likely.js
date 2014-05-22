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

test("Path with if/else", function() {

    var tpl = [
        'for v in list',
        ' p',
        '  if 0',
        '    "nop"',
        '  else',
        '    input lk-click={{ test() }} value={{ test }}'
    ];

    var tpl = template(tpl);
    var rt1 = tpl.tree(ctx({list:[1,2]}));

    equal(rt1.children[0].children[0].attrs['lk-click'], 'true');
    equal(rt1.children[0].children[0].attrs['lk-path'], '.0.0');

});

test("RenderNode path bug", function() {

    var tpl = [
    'div',
    ' div',
    ' for d in divs',
    '  div'
    ];

    tpl = template(tpl);
    var rt1 = tpl.tree(ctx({divs:[1,2,3]}));

    equal(rt1.children[0].path, '.0');
    equal(rt1.children[0].children[0].path, '.0.0');
    equal(rt1.children[0].children[1].path, '.0.1');
    equal(rt1.children[0].children[2].path, '.0.2');
    equal(rt1.children[0].children[3].path, '.0.3');

});

test("RenderNode path bug 2", function() {

    var tpl = [
    'div',
    '  if 1==1',
    '    div',
    '    div',
    '  else',
    '    div'
    ];

    tpl = template(tpl);
    var rt1 = tpl.tree(ctx({}));

    equal(rt1.children[0].path, '.0');
    equal(rt1.children[0].children[0].path, '.0.0');
    equal(rt1.children[0].children[1].path, '.0.1');

});

test("StringNode diff regression", function() {

    var tpl = [
    'p',
    ' "test1"',
    '"hello"',
    'p',
    ' "{{ v }}"'
    ];

    tpl = template(tpl);

    var rt1 = tpl.tree(ctx({v:"bla"}));
    var rt2 = tpl.tree(ctx({v:"bla 2"}));
    var div = document.createElement('div');
    rt1.domTree(div);

    equal(div.childNodes.length, 3);

    var diff = rt1.diff(rt2);
    equal(diff.length, 1);
    equal(diff[0].action, 'stringmutate');
    equal(diff[0].path, '.2.0');

    likely.applyDiff(diff, div);
    equal(div.childNodes[2].childNodes[0].textContent, 'bla 2');

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
    equal(diff[0].node.nodeName, "#text");


    var div = document.createElement('div');
    rt1.domTree(div);

    equal(div.childNodes.length, 2);
    equal(div.childNodes[0].childNodes.length, 1);
    equal(div.childNodes[0].nodeName, "P");
    equal(div.childNodes[0].childNodes[0].nodeName, "#text");

    likely.applyDiff(diff, div);

    equal(div.childNodes.length, 4);
    equal(div.childNodes[0].childNodes.length, 1);
    equal(div.childNodes[0].nodeName, "P");
    equal(div.childNodes[1].nodeName, "#text");
    equal(div.childNodes[2].nodeName, "P");
    equal(div.childNodes[3].nodeName, "#text");
    equal(div.childNodes[2].childNodes.length, 1);

    diff = rt2.diff(rt3);
    equal(likely.getDom(div, '.1').nodeName, "#text");

    likely.applyDiff(diff, div);

    equal(div.childNodes.length, 2);
    equal(div.childNodes[0].childNodes.length, 2);
    equal(div.childNodes[0].nodeName, "P");
    equal(div.childNodes[0].childNodes[0].nodeName, "#text");
    equal(div.childNodes[1].nodeName, "P");
    equal(div.childNodes[1].childNodes[0].nodeName, "#text");

});
