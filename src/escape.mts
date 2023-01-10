import { Character, StringLiteralToken, StringToken, Quote } from "./types.mjs";

export function parse(data: string): Character[] {
    const characters: Character[] = [];

    for (let i = 0; i < data.length; i++) {
        if (data[i] == '\\' && data[i + 1] != undefined) {
            characters.push(Character.escaped(data[i + 1]));
        } else {
            characters.push(Character.regular(data[i]));
        }
    }

    return characters;
}

export function stringify(chars: Character[]): string {
    return chars.map(ch => {
        if (ch.type == 'regular') {
            return ch.data;
        } else {
            return '\\' + ch.data;
        }
    })
    .join('');
}

export function extractLiteralsFromToken(token: StringToken): (StringToken | StringLiteralToken)[] {
    const tokens: (StringToken | StringLiteralToken)[] = [];
    const chars = parse(token.data);

    let chunkStart = 0;
    for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (c.isRegular('"') || c.isRegular("'")) {
            let closing = chars.slice(i + 1).findIndex(Character.eq(c));
            if (closing == -1) {
                break;
            }
            closing += i + 1;

            tokens.push({
                type: 'string',
                data: stringify(chars.slice(chunkStart, i))
            })
            tokens.push({
                type: 'sliteral',
                data: chars.slice(i + 1, closing),
                surround: c.data as '\'' | '"',
            });
            chunkStart = closing + 1;
            i = closing;
        }
    }

    if (chunkStart != chars.length) {
        tokens.push({
            type: 'string',
            data: stringify(chars.slice(chunkStart))
        })
    }

    return tokens;
}
