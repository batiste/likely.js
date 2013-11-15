/*
Language: Likely template
*/

function(hljs) {
    var STRINGS = [
        {
        className: 'string',
        begin: /(u|b)?r?"""/, end: /"""/,
        relevance: 10
        },
        {
        className: 'string',
        begin: /(u|r|ur)"/, end: /"/,
        contains: [hljs.BACKSLASH_ESCAPE],
        relevance: 10
        }
    ];

    return {
        keywords: 'and in if for include else elseif',
        contains: [
            {
                className: 'variable',
                begin: /{{/, end: /}}/,
            },
            {
                className: 'string',
                begin: /"/, end: /"/,
                contains: [{
                    className: 'keyword',
                    begin: /{{/, end: /}}/,
                }]
            },
            {
                className: 'string',
                begin: /"""/, end: /"""/,
                contains: [{
                    className: 'keyword',
                    begin: /{{/, end: /}}/,
                }]
            }
        ]
    };
}