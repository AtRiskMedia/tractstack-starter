//import type { LispTokens } from "../../types.ts";

const DOUBLEQUOTE = [`"`];
const BRACKETLEFT = `(`;
const BRACKETRIGHT = `)`;
const SEMICOLON = `;`;
const NEWLINE = `\n`;
const WHITESPACE = [` `, `\n`, `\t`];

type LispToken = string | number | LispToken[];

export function lispLexer(
  payload: string = ``,
  inString: boolean = false
  /* eslint-disable @typescript-eslint/no-explicit-any */
): [LispToken[], string] {
  const tokens: LispToken[] = [];
  let curToken = ``;

  for (let i = 0; i < payload.length; i++) {
    const char = payload.charAt(i);
    if (DOUBLEQUOTE.includes(char) && inString === false) {
      const [tokenized, remaining] = lispLexer(payload.substring(i + 1), true);
      tokens.push(tokenized);
      payload = remaining;
      i = -1;
    } else if (DOUBLEQUOTE.includes(char)) {
      if (curToken.length) {
        tokens.push(+curToken || curToken);
      }
      return [tokens, payload.substring(i + 1)];
    } else if (char === BRACKETLEFT) {
      // if (inString && payload?.charAt(i - 1) === ESCAPED) throw "PARSING ERROR"
      const [tokenized, remaining] = lispLexer(payload.substring(i + 1));
      tokens.push(tokenized);
      payload = remaining;
      i = -1;
    } else if (char === BRACKETRIGHT) {
      // if (inString && payload?.charAt(i - 1) === ESCAPED) throw "PARSING ERROR"
      if (curToken.length) {
        tokens.push(+curToken || curToken);
      }
      return [tokens, payload.substring(i + 1)];
    } else if (char === SEMICOLON) {
      // skip comments
      while (payload.charAt(i) !== NEWLINE) {
        i++;
      }
    } else if (WHITESPACE.includes(char) && inString !== true) {
      if (curToken.length) {
        tokens.push(+curToken || curToken);
      }
      curToken = ``;
    } else {
      curToken += char;
    }
  }
  return [tokens, ``];
}
