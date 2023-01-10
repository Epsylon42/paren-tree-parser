export type OpeningBracket = '(' | '[' | '{';
export type ClosingBracket = ')' | ']' | '}';
export type Surround = '()' | '[]' | '{}';
export type Quote = '\'' | '"';

export interface StringToken {
    type: 'string';
    data: string;
}

export interface SpaceToken {
    type: 'space';
    data: string;
}

export interface StringLiteralToken {
    type: 'sliteral';
    surround: Quote;
    data: Character[];
}

export type AnyToken = StringToken | StringLiteralToken | SpaceToken;

export interface TreeToken<T = AnyToken> {
    type: 'tree';
    surround: Surround;
    opening: OpeningBracket;
    closing: ClosingBracket;
    inner: Token<T>[];
}

export type Token<T = AnyToken> = T | TreeToken<T>;

export class Character {
    constructor(
        public type: 'regular' | 'escaped',
        public data: string
    ) {}

    public static regular(c: string): Character & { type: 'regular' } {
        return new Character('regular', c) as Character & { type: 'regular' };
    }

    public static escaped(c: string): Character & { type: 'escaped' } {
        return new Character('escaped', c) as Character & { type: 'escaped' };
    }

    public isRegular(c: string): boolean {
        return this.type == 'regular' && this.data == c;
    }

    public isEscaped(c: string): boolean {
        return this.type == 'escaped' && this.data == c;
    }

    public eq(other: Character): boolean {
        return this.type == other.type && this.data == other.data;
    }

    public static eq(other: Character): (this_: Character) => boolean {
        return (this_: Character) => this_.eq(other);
    }
}
