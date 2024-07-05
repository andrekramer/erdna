function parse(text) {
  pos = parseExpressionOrAtom(text, 0);
  return text;
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
  
  pos = skipWhitespace(text, pos);
  console.log("at " + pos);
  return pos;
}

exports.parse = parse;
