function parse(text) {
  let result = [];
  let pos = 0;
  while (pos < text.length) {
    const [r, p] = parseExpressionOrAtom(text, pos);
    pos = p;
    result.push(r);
  }
  return result;
}

function skipWhitespace(text, pos) {
    ch = text.charAt(pos);
    while([' ', '\n', '\r', '\t'].includes(ch)) {
        pos++;
        ch = text.charAt(pos);
    }
    return pos;
}

function parseExpressionOrAtom(text, pos) {
  let result = {};
  pos = skipWhitespace(text, pos);
  console.log("at " + pos);
  if (['(','{', '['].includes(text.charAt(pos))) {
    console.log("exp");
  } else {
    const [atom, p] = readAtom(text, pos);
    console.log(" atom " + atom);
    pos = skipWhitespace(text, p);
    result = { type: "atom", value: atom}
  }
  return [result, pos];
}

function readAtom(text, pos) {
    let atom = text.charAt(pos);;
    while(![' ', '\n', '\r', '\t'].includes(ch) && pos != text.length) {
        pos++;
        ch = text.charAt(pos);
        atom += ch;
    }
    return [atom, pos];
}

exports.parse = parse;
