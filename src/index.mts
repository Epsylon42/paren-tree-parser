import { Surround, OpeningBracket, ClosingBracket, Token, StringToken, SpaceToken, StringLiteralToken, AnyToken, Character } from './types.mjs';
import * as escape from './escape.mjs';

interface IncompleteToken<T = StringToken> {
    type?: string;
    cursor: number;
    opening: OpeningBracket | '';
    closing?: ClosingBracket;
    inner: Token<T>[];
    outerStart: number;
    innerStart: number;
}

export function tokenize(input: string | StringToken, allowedBrackets?: OpeningBracket[]): Token<StringToken>[] {
    let data: string;
    if (typeof input == 'string') {
        data = input;
    } else {
        data = input.data;
    }

    const tokenStack: IncompleteToken[] = [];
    const currentToken = () => tokenStack[tokenStack.length - 1];

    tokenStack.push({
        inner: [],
        opening: '',
        cursor: 0,
        outerStart: 0,
        innerStart: 0,
    });

    const addSimpleToken = (i: number) => {
        const token = currentToken();
        if (i > token.cursor) {
            token.inner.push({
                type: 'string',
                data: data.slice(token.cursor, i)
            })
        }

        token.cursor = i + 1;
    };
    
    for (let i = 0; i < data.length; i++) {
        const c = data[i];
        if (isOpening(c) && (!allowedBrackets || allowedBrackets.includes(c))) {
            addSimpleToken(i);
            tokenStack.push({
                cursor: i + 1,
                opening: c,
                inner: [],
                outerStart: i,
                innerStart: i + 1,
            });
        } else if (isClosing(c) && currentToken().opening == opening(c)) {
            addSimpleToken(i);
            const token = tokenStack.pop() as IncompleteToken & { opening: OpeningBracket };
            token.type = 'tree';
            token.closing = c;

            currentToken().inner.push({
                type: 'tree',
                opening: token.opening,
                closing: c,
                surround: (token.opening + c) as Surround,
                inner: token.inner,
                outerSpan: {
                    start: token.outerStart,
                    end: i + 1,
                },
                innerSpan: {
                    start: token.innerStart,
                    end: i
                }
            });
            currentToken().cursor = token.cursor;
        }
    }

    addSimpleToken(data.length);

    while (tokenStack.length > 1) {
        const top = tokenStack.pop() as IncompleteToken;
        const current = currentToken();
        current.inner.push({
            type: 'string',
            data: top.opening,
        })
        current.inner.push(...top.inner)

        current.inner = current.inner.reduce((acc: Token<StringToken>[], value: Token<StringToken>) => {
            const last = acc[acc.length - 1];
            if (value.type == 'string' && last?.type == 'string') {
                last.data += value.data;
            } else {
                acc.push(value);
            }

            return acc;
        }, []);
    }

    const toplevelToken = tokenStack.pop() as IncompleteToken;
    return toplevelToken.inner;
}

export function traverse<T extends AnyToken, U>(
    input: Token<T>[],
    transformer: (token: StringToken) => Token<T | U>[]
): Token<T | U>[] {
    return input.flatMap((token): Token<T | U>[] => {
        if (token.type == 'tree') {
            return [{
                ...token,
                inner: traverse(token.inner, transformer),
            }]
        } else if (token.type == 'string') {
            return transformer(token);
        } else {
            return [token];
        }
    });
}

export function stringify(tokens: Token[] | Token, mode: 'default' | 'expandLiterals' = 'default'): string {
    const stringifyOne = (token: Token) => {
        if (token.type == 'string' || token.type == 'space') {
            return token.data;
        } else if (token.type == 'tree') {
            return token.opening + stringify(token.inner) + token.closing;
        } else if (token.type == 'sliteral') {
            if (mode == 'expandLiterals') {
                return escape.stringify(token.data, true);
            } else {
                return token.surround + escape.stringify(token.data) + token.surround;
            }
        } else {
            throw new Error('stringify: Unsupported token type');
        }
    }

    if (tokens instanceof Array) {
        return tokens.map(stringifyOne).join('');
    } else {
        return stringifyOne(tokens);
    }
}

function isOpening(bracket: string): bracket is OpeningBracket {
    return ['(', '[', '{'].includes(bracket);
}

function isClosing(bracket: string): bracket is ClosingBracket {
    return [')', ']', '}'].includes(bracket);
}

function closing(bracket: OpeningBracket): ClosingBracket {
    switch (bracket) {
        case '(':
            return ')';
        case '[':
            return ']';
        case '{':
            return '}';
    }
}

function opening(bracket: ClosingBracket): OpeningBracket {
    switch (bracket) {
        case ')':
            return '(';
        case ']':
            return '[';
        case '}':
            return '{';
    }
}


export class TokenizerChain<T extends AnyToken> {
    constructor(private data: Token<T>[]) {}

    public static new(data: string): TokenizerChain<StringToken> {
        return new TokenizerChain([{
            type: 'string',
            data,
        }]);
    }

    public traverse<U extends AnyToken>(
        transformer: (token: StringToken) => Token<T | U>[]
    ): TokenizerChain<T | U> {
        return new TokenizerChain(traverse(this.data, transformer));
    }

    public tokenize(...allowedBrackets: OpeningBracket[]): TokenizerChain<T | StringToken> {
        return this.traverse(x => tokenize(x, allowedBrackets.length == 0 ? undefined : allowedBrackets));
    }

    public get(): Token<T>[] {
        return this.data;
    }
}

export { extractLiteralsFromToken as separateStringLiterals } from './escape.mjs';
export function separateSpaces(token: StringToken): (StringToken | SpaceToken)[] {
    return token.data.split(/(?<=\s)(?=[^\s])|(?<=[^\s])(?=\s)/)
        .map(s => ({
            type: s[0].match(/\s/) ? 'space' : 'string',
            data: s,
        } as StringToken | SpaceToken));
}
