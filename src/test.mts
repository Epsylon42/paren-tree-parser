import { tokenize, stringify, TokenizerChain, separateStringLiterals } from './index.mjs';

function check(data: string) {
    const tokens = tokenize(data);
    console.log(data + '\n');
    console.log(JSON.stringify(tokens, null, '  '));
    console.log(stringify(tokens));
    console.log('\n----\n');

    if (stringify(tokens) != data) {
        throw new Error();
    }
}

function checkTwoPass(data: string) {
    const tokens = TokenizerChain.new(data)
        .tokenize('[')
        .tokenize()
        .traverse(separateStringLiterals)
        .get();
    console.log(data + '\n');
    console.log(JSON.stringify(tokens, null, '  '));
    console.log(stringify(tokens));
    console.log('\n----\n');

    if (stringify(tokens) != data) {
        throw new Error();
    }
}

const examples = [
    '[hello, world!]',
    '[color=rgb(1,2,3)]',
    '[color=)]',
    '[color=(]',
    'a ( [color=abc]',
    'a ( [color=)abc]',
    'abc="def"',
    'abc="d\\"ef"',
];

examples.forEach(check);
console.log('\n=====\n');
examples.forEach(checkTwoPass);
