function parse(text) {
    let result = [];
    let pos = 0;
    while (pos < text.length) {
        const [r, p] = readExpressionOrAtom(text, pos);
        if (r.type === "error") {
            return [r];
        }
        if (r.type === "comment") {
            pos = p;
            continue;
        }
        if (r.type === "atom" && r.value === '') {
            pos = p;
            continue;
        }
        pos = p;
        result.push(r);
    }
    return result;
}

function skipWhitespace(text, pos) {
    ch = text.charAt(pos);
    while ([' ', '\n', '\r', '\t'].includes(ch) && pos !== text.length) {
        pos++;
        ch = text.charAt(pos);
    }
    return pos;
}

function readExpressionOrAtom(text, pos) {
    let result = {};
    pos = skipWhitespace(text, pos);
    let ch = text.charAt(pos);
    console.log("at " + pos);
    if (['(', '{', '['].includes(ch)) {
        console.log("expression");
        let exp = [];
        const bracket = ch;
        pos++;
        while (![')', '}', ']'].includes(text.charAt(pos)) && pos < text.length) {
            pos = skipWhitespace(text, pos);
            const [r, p] = readExpressionOrAtom(text, pos);
            if (r.type === "error") {
                return [r];
            }
            if (r.type === "comment") {
                pos = p;
                continue;
            }
            if (r.type === "atom" && r.value === '') {
                pos = p;
                continue;
            }
            pos = p;
            exp.push(r);
        }
        if (pos === text.length) {
            result = { type: "error", value: "Incomplete " + bracket + " expression at " + pos };
        } else {
            let err = null;
            switch (bracket) {
                case '(':
                    if (text.charAt(pos) !== ')') err = "Unbalanced (";
                    break;
                case '{':
                    if (text.charAt(pos) !== '{') err = "Unbalanced {";
                    break;
                case '[':
                    if (text.charAt(pos) !== '[') err = "Unbalanced [";
                    break;
            }
            if (err !== null) {
                result = { type: "error", value: err };
            } else {
                pos++;
                result = { type: "expression", value: exp };
            }
        }
    } else if (ch === '"') {
        const [str, p, error] = readString(text, pos);
        if (error) {
            result = { type: "error", value: str };
        } else {
            console.log(" string " + str);
            result = { type: "string", value: str };
            pos = skipWhitespace(text, p);
        }
    } else if (ch === ';') {
        pos = readComment(text, pos);
        return [{ type: "comment", value: "" }, pos];
    } else if (ch === '#' && pos + 1 < text.length) {
        const [r, p] = readObject(text, pos);
        result = r;
        pos = p;
    } else if (ch === "'") {
        const [r, p] = readExpressionOrAtom(text, ++pos);
        const quote = [{ type: "atom", value: "quote"}];
        quote.push(r);
        result = { type: "expression", value: quote }
        pos = p;
    } else if (ch === ",") {
        const [r, p] = readExpressionOrAtom(text, ++pos);
        const unquote = [{ type: "atom", value: "unquote"}];
        unquote.push(r);
        result = { type: "expression", value: unquote }
        pos = p;
    } else {
        if ([')',']','}'].includes(ch)) {
            return [{ type: "error", value: "Missing opening bracket for " + ch + " at " + pos}];
        }
        const [atom, p, error] = readAtom(text, pos);
        if (error) {
            result = { type: "error", value: atom }
        } else {
            const ch = atom.charAt(0);
            if ((['-', '+'].includes(ch) && atom.length !== 1) || (ch >= '0' && ch <= '9')) {
                const [r, next] = readNumber(atom, text, p);
                result = r;
                pos = next;
            } else {
                console.log(" atom " + atom);
                result = { type: "atom", value: atom };
                pos = skipWhitespace(text, p);
            }
        }
    }
    return [result, pos];
}

function readAtom(text, pos) {
    let ch = text.charAt(pos);
    let atom = "";
    while (![' ', '\n', '\r', '\t', ')', '}', ']', ","].includes(ch) && pos !== text.length) {
        if (ch === '"') {
            return ["No double quotes in identifiers allowed", pos, true];
        }
        atom += ch;
        pos++;
        ch = text.charAt(pos);
    }
    return [atom, pos, false];
}

function readString(text, pos) {
    let ch = text.charAt(++pos);
    let str = "";
    while (ch !== '"' && pos !== text.length) {
        if (ch === '\\') {
            if (pos + 1 === text.length) {
                return ["Incomplete string escape  " + pos, pos, true];
            }
            pos++;
            switch (text.charAt(pos)) {
                case 'n': str += '\n'; break;
                case 'r': str += '\r'; break;
                case 't': str += '\t'; break;
                case '\\': str += '\\'; break;
                case '"': str += '"'; break;
                case '\'': str += '`'; break;
                case '\b': str += '`\b'; break;
                case '\f': str += '`\f'; break;
                case '\v': str += '`\v'; break;
                default:
                    return ["Unknown string escape  " + pos, pos, true];
            }
            pos++;
            ch = text.charAt(pos);
            continue;
        }
        str += ch;
        pos++;
        ch = text.charAt(pos);
    }
    if (ch !== '"' && pos == text.length) {
        return ["Non terminated string at " + pos, pos, true];
    }
    return [str, ++pos, false];
}

function readComment(test, pos) {
    ch = text.charAt(pos);
    while (ch !== '\n' && ch != '\r' && pos !== text.length) {
        pos++;
        ch = text.charAt(pos);
    }
    return pos;
}

function readObject(text, pos) {
    if (text.charAt(pos + 1) === 'f') {
        pos += 2;
        result = { type: "boolean", value: false };
    } else if (text.charAt(pos + 1) === 't') {
        pos += 2;
        result = { type: "boolean", value: true };
    } else {
        result = { type: "error", value: "Unknown # object " + pos };
    }
    return [result, pos];
}

function readNumber(atom, text, pos) {
    const number = Number(atom);
    if (Number.isNaN(number)) {
        result = { type: "error", value: "Not a number " + pos };
    } else {
        console.log(" number " + atom);
        result = { type: "number", value: number };
        pos = skipWhitespace(text, pos);
    }
    return [result, pos];
}

exports.parse = parse;
