import { Surround, OpeningBracket, ClosingBracket, Token, StringToken, SpaceToken, StringLiteralToken, AnyToken } from './types.mjs';
import * as escape from './escape.mjs';

interface IncompleteToken<T = StringToken> {
    type?: string;
    cursor: number;
    opening: OpeningBracket | '';
    closing?: ClosingBracket;
    inner: Token<T>[];
}

export function tokenize(data: string): Token<StringToken>[] {
    const tokenStack: IncompleteToken[] = [];
    const currentToken = () => tokenStack[tokenStack.length - 1];

    tokenStack.push({
        inner: [],
        opening: '',
        cursor: 0,
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
        if (isOpening(c)) {
            addSimpleToken(i);
            tokenStack.push({
                cursor: i + 1,
                opening: c,
                inner: []
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
            });
            currentToken().cursor = token.cursor;
        }
    }

    addSimpleToken(data.length);

    const toplevelToken = tokenStack.pop() as IncompleteToken;

    return toplevelToken.inner;
}

export function separateStringLiterals<T extends AnyToken>(tokens: Token<T>[]): Token<T | StringToken | StringLiteralToken>[] {
    return tokens.flatMap((token): Token<T | StringToken | StringLiteralToken>[] => {
        if (token.type == 'tree') {
            return [{
                ...token,
                inner: separateStringLiterals(token.inner),
            }]
        } else if (token.type == 'string') {
            return escape.extractLiteralsFromToken(token);
        } else {
            return [token];
        }
    });
}

export function separateSpaces<T extends AnyToken>(tokens: Token<T>[]): Token<T | StringToken | SpaceToken>[] {
    return tokens.flatMap((token): Token<T | StringToken | SpaceToken>[] => {
        if (token.type == 'tree') {
            return [{
                ...token,
                inner: separateSpaces(token.inner),
            }];
        } else if (token.type == 'string') {
            return token.data.split(/(?<=\s)(?=[^\s])|(?<=[^\s])(?=\s)/)
                .map(s => ({
                    type: s[0].match(/\s/) ? 'space' : 'string',
                    data: s,
                }));
        } else {
            return [token];
        }
    })
}

export function stringify(tokens: Token[]): string {
    return tokens
        .map(token => {
            if (token.type == 'string' || token.type == 'space') {
                return token.data;
            } else if (token.type == 'tree') {
                return token.opening + stringify(token.inner) + token.closing;
            } else if (token.type == 'sliteral') {
                return token.surround + escape.stringify(token.data) + token.surround;
            }
        })
        .join('');
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
