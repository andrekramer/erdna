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
    pos = p;
    result.push(r);
  }
  return result;
}

function skipWhitespace(text, pos) {
    ch = text.charAt(pos);
    while([' ', '\n', '\r', '\t'].includes(ch) && pos !== text.length) {
        pos++;
        ch = text.charAt(pos);
    }
    return pos;
}

function readExpressionOrAtom(text, pos) {
  let result = {};
  pos = skipWhitespace(text, pos);
  console.log("at " + pos);
  if (['(','{', '['].includes(text.charAt(pos))) {
    console.log("exp");
  } else {
    let ch = text.charAt(pos);
    if (ch === '"') {
        const [str, p, error] = readString(text, pos);
        if (error) {
          result = { type: "error", value: str }
        } else {
          console.log(" string " + str);
          result = { type: "string", value: str}
          pos = skipWhitespace(text, p);
        }
    } else if (ch === ';') {
        pos = readComment(text, pos);
        return [{type: "comment", value: ""}, pos];
    } else {
        const [atom, p, error] = readAtom(text, pos);
        if (error) {
          result = { type: "error", value: atom }
        } else {
          console.log(" atom " + atom);
          result = { type: "atom", value: atom }
          pos = skipWhitespace(text, p);
        }
    }
  }
  return [result, pos];
}

function readAtom(text, pos) {
    let ch = text.charAt(pos);
    let atom = ""
    while(![' ', '\n', '\r', '\t', ')', '}', ']', ","].includes(ch) && pos !== text.length) {
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
    let str = ""
    while(ch !== '"' && pos !== text.length) {
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
    while(ch !== '\n' && ch != '\r' && pos !== text.length) {
        pos++;
        ch = text.charAt(pos);
    }
    return pos;
}

exports.parse = parse;
