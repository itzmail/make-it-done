#!/usr/bin/env node
"use strict";

// src/commands/toon.ts
var import_fs = require("fs");

// node_modules/@toon-format/toon/dist/index.mjs
var LIST_ITEM_MARKER = "-";
var LIST_ITEM_PREFIX = "- ";
var COMMA = ",";
var COLON = ":";
var SPACE = " ";
var PIPE = "|";
var DOT = ".";
var OPEN_BRACKET = "[";
var CLOSE_BRACKET = "]";
var OPEN_BRACE = "{";
var CLOSE_BRACE = "}";
var NULL_LITERAL = "null";
var TRUE_LITERAL = "true";
var FALSE_LITERAL = "false";
var BACKSLASH = "\\";
var DOUBLE_QUOTE = '"';
var NEWLINE = "\n";
var CARRIAGE_RETURN = "\r";
var TAB = "	";
var DELIMITERS = {
  comma: COMMA,
  tab: TAB,
  pipe: PIPE
};
var DEFAULT_DELIMITER = DELIMITERS.comma;
function escapeString(value) {
  return value.replace(/\\/g, `${BACKSLASH}${BACKSLASH}`).replace(/"/g, `${BACKSLASH}${DOUBLE_QUOTE}`).replace(/\n/g, `${BACKSLASH}n`).replace(/\r/g, `${BACKSLASH}r`).replace(/\t/g, `${BACKSLASH}t`);
}
function unescapeString(value) {
  let unescaped = "";
  let i = 0;
  while (i < value.length) {
    if (value[i] === BACKSLASH) {
      if (i + 1 >= value.length)
        throw new SyntaxError("Invalid escape sequence: backslash at end of string");
      const next = value[i + 1];
      if (next === "n") {
        unescaped += NEWLINE;
        i += 2;
        continue;
      }
      if (next === "t") {
        unescaped += TAB;
        i += 2;
        continue;
      }
      if (next === "r") {
        unescaped += CARRIAGE_RETURN;
        i += 2;
        continue;
      }
      if (next === BACKSLASH) {
        unescaped += BACKSLASH;
        i += 2;
        continue;
      }
      if (next === DOUBLE_QUOTE) {
        unescaped += DOUBLE_QUOTE;
        i += 2;
        continue;
      }
      throw new SyntaxError(`Invalid escape sequence: \\${next}`);
    }
    unescaped += value[i];
    i++;
  }
  return unescaped;
}
function findClosingQuote(content, start) {
  let i = start + 1;
  while (i < content.length) {
    if (content[i] === BACKSLASH && i + 1 < content.length) {
      i += 2;
      continue;
    }
    if (content[i] === DOUBLE_QUOTE)
      return i;
    i++;
  }
  return -1;
}
function findUnquotedChar(content, char, start = 0) {
  let inQuotes = false;
  let i = start;
  while (i < content.length) {
    if (content[i] === BACKSLASH && i + 1 < content.length && inQuotes) {
      i += 2;
      continue;
    }
    if (content[i] === DOUBLE_QUOTE) {
      inQuotes = !inQuotes;
      i++;
      continue;
    }
    if (content[i] === char && !inQuotes)
      return i;
    i++;
  }
  return -1;
}
function isBooleanOrNullLiteral(token) {
  return token === TRUE_LITERAL || token === FALSE_LITERAL || token === NULL_LITERAL;
}
function isNumericLiteral(token) {
  if (!token)
    return false;
  if (token.length > 1 && token[0] === "0" && token[1] !== ".")
    return false;
  const numericValue = Number(token);
  return !Number.isNaN(numericValue) && Number.isFinite(numericValue);
}
function parseArrayHeaderLine(content, defaultDelimiter) {
  const trimmedToken = content.trimStart();
  let bracketStart = -1;
  if (trimmedToken.startsWith(DOUBLE_QUOTE)) {
    const closingQuoteIndex = findClosingQuote(trimmedToken, 0);
    if (closingQuoteIndex === -1)
      return;
    if (!trimmedToken.slice(closingQuoteIndex + 1).startsWith(OPEN_BRACKET))
      return;
    const keyEndIndex = content.length - trimmedToken.length + closingQuoteIndex + 1;
    bracketStart = content.indexOf(OPEN_BRACKET, keyEndIndex);
  } else
    bracketStart = content.indexOf(OPEN_BRACKET);
  if (bracketStart === -1)
    return;
  const bracketEnd = content.indexOf(CLOSE_BRACKET, bracketStart);
  if (bracketEnd === -1)
    return;
  let colonIndex = bracketEnd + 1;
  let braceEnd = colonIndex;
  const braceStart = content.indexOf(OPEN_BRACE, bracketEnd);
  if (braceStart !== -1 && braceStart < content.indexOf(COLON, bracketEnd)) {
    const foundBraceEnd = content.indexOf(CLOSE_BRACE, braceStart);
    if (foundBraceEnd !== -1)
      braceEnd = foundBraceEnd + 1;
  }
  colonIndex = content.indexOf(COLON, Math.max(bracketEnd, braceEnd));
  if (colonIndex === -1)
    return;
  let key;
  if (bracketStart > 0) {
    const rawKey = content.slice(0, bracketStart).trim();
    key = rawKey.startsWith(DOUBLE_QUOTE) ? parseStringLiteral(rawKey) : rawKey;
  }
  const afterColon = content.slice(colonIndex + 1).trim();
  const bracketContent = content.slice(bracketStart + 1, bracketEnd);
  let parsedBracket;
  try {
    parsedBracket = parseBracketSegment(bracketContent, defaultDelimiter);
  } catch {
    return;
  }
  const { length, delimiter } = parsedBracket;
  let fields;
  if (braceStart !== -1 && braceStart < colonIndex) {
    const foundBraceEnd = content.indexOf(CLOSE_BRACE, braceStart);
    if (foundBraceEnd !== -1 && foundBraceEnd < colonIndex)
      fields = parseDelimitedValues(content.slice(braceStart + 1, foundBraceEnd), delimiter).map((field) => parseStringLiteral(field.trim()));
  }
  return {
    header: {
      key,
      length,
      delimiter,
      fields
    },
    inlineValues: afterColon || void 0
  };
}
function parseBracketSegment(seg, defaultDelimiter) {
  let content = seg;
  let delimiter = defaultDelimiter;
  if (content.endsWith(TAB)) {
    delimiter = DELIMITERS.tab;
    content = content.slice(0, -1);
  } else if (content.endsWith(PIPE)) {
    delimiter = DELIMITERS.pipe;
    content = content.slice(0, -1);
  }
  const length = Number.parseInt(content, 10);
  if (Number.isNaN(length))
    throw new TypeError(`Invalid array length: ${seg}`);
  return {
    length,
    delimiter
  };
}
function parseDelimitedValues(input, delimiter) {
  const values = [];
  let valueBuffer = "";
  let inQuotes = false;
  let i = 0;
  while (i < input.length) {
    const char = input[i];
    if (char === BACKSLASH && i + 1 < input.length && inQuotes) {
      valueBuffer += char + input[i + 1];
      i += 2;
      continue;
    }
    if (char === DOUBLE_QUOTE) {
      inQuotes = !inQuotes;
      valueBuffer += char;
      i++;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(valueBuffer.trim());
      valueBuffer = "";
      i++;
      continue;
    }
    valueBuffer += char;
    i++;
  }
  if (valueBuffer || values.length > 0)
    values.push(valueBuffer.trim());
  return values;
}
function mapRowValuesToPrimitives(values) {
  return values.map((v) => parsePrimitiveToken(v));
}
function parsePrimitiveToken(token) {
  const trimmedToken = token.trim();
  if (!trimmedToken)
    return "";
  if (trimmedToken.startsWith(DOUBLE_QUOTE))
    return parseStringLiteral(trimmedToken);
  if (isBooleanOrNullLiteral(trimmedToken)) {
    if (trimmedToken === TRUE_LITERAL)
      return true;
    if (trimmedToken === FALSE_LITERAL)
      return false;
    if (trimmedToken === NULL_LITERAL)
      return null;
  }
  if (isNumericLiteral(trimmedToken)) {
    const parsedNumber = Number.parseFloat(trimmedToken);
    return Object.is(parsedNumber, -0) ? 0 : parsedNumber;
  }
  return trimmedToken;
}
function parseStringLiteral(token) {
  const trimmedToken = token.trim();
  if (trimmedToken.startsWith(DOUBLE_QUOTE)) {
    const closingQuoteIndex = findClosingQuote(trimmedToken, 0);
    if (closingQuoteIndex === -1)
      throw new SyntaxError("Unterminated string: missing closing quote");
    if (closingQuoteIndex !== trimmedToken.length - 1)
      throw new SyntaxError("Unexpected characters after closing quote");
    return unescapeString(trimmedToken.slice(1, closingQuoteIndex));
  }
  return trimmedToken;
}
function parseUnquotedKey(content, start) {
  let parsePosition = start;
  while (parsePosition < content.length && content[parsePosition] !== COLON)
    parsePosition++;
  if (parsePosition >= content.length || content[parsePosition] !== COLON)
    throw new SyntaxError("Missing colon after key");
  const key = content.slice(start, parsePosition).trim();
  parsePosition++;
  return {
    key,
    end: parsePosition
  };
}
function parseQuotedKey(content, start) {
  const closingQuoteIndex = findClosingQuote(content, start);
  if (closingQuoteIndex === -1)
    throw new SyntaxError("Unterminated quoted key");
  const key = unescapeString(content.slice(start + 1, closingQuoteIndex));
  let parsePosition = closingQuoteIndex + 1;
  if (parsePosition >= content.length || content[parsePosition] !== COLON)
    throw new SyntaxError("Missing colon after key");
  parsePosition++;
  return {
    key,
    end: parsePosition
  };
}
function parseKeyToken(content, start) {
  const isQuoted = content[start] === DOUBLE_QUOTE;
  return {
    ...isQuoted ? parseQuotedKey(content, start) : parseUnquotedKey(content, start),
    isQuoted
  };
}
function isArrayHeaderContent(content) {
  return content.trim().startsWith(OPEN_BRACKET) && findUnquotedChar(content, COLON) !== -1;
}
function isKeyValueContent(content) {
  return findUnquotedChar(content, COLON) !== -1;
}
function createScanState() {
  return {
    lineNumber: 0,
    blankLines: []
  };
}
function parseLineIncremental(raw, state, indentSize, strict) {
  state.lineNumber++;
  const lineNumber = state.lineNumber;
  let indent = 0;
  while (indent < raw.length && raw[indent] === SPACE)
    indent++;
  const content = raw.slice(indent);
  if (!content.trim()) {
    const depth$1 = computeDepthFromIndent(indent, indentSize);
    state.blankLines.push({
      lineNumber,
      indent,
      depth: depth$1
    });
    return;
  }
  const depth = computeDepthFromIndent(indent, indentSize);
  if (strict) {
    let whitespaceEndIndex = 0;
    while (whitespaceEndIndex < raw.length && (raw[whitespaceEndIndex] === SPACE || raw[whitespaceEndIndex] === TAB))
      whitespaceEndIndex++;
    if (raw.slice(0, whitespaceEndIndex).includes(TAB))
      throw new SyntaxError(`Line ${lineNumber}: Tabs are not allowed in indentation in strict mode`);
    if (indent > 0 && indent % indentSize !== 0)
      throw new SyntaxError(`Line ${lineNumber}: Indentation must be exact multiple of ${indentSize}, but found ${indent} spaces`);
  }
  return {
    raw,
    indent,
    content,
    depth,
    lineNumber
  };
}
function* parseLinesSync(source, indentSize, strict, state) {
  for (const raw of source) {
    const parsedLine = parseLineIncremental(raw, state, indentSize, strict);
    if (parsedLine !== void 0)
      yield parsedLine;
  }
}
function computeDepthFromIndent(indentSpaces, indentSize) {
  return Math.floor(indentSpaces / indentSize);
}
function assertExpectedCount(actual, expected, itemType, options) {
  if (options.strict && actual !== expected)
    throw new RangeError(`Expected ${expected} ${itemType}, but got ${actual}`);
}
function validateNoExtraListItems(nextLine, itemDepth, expectedCount) {
  if (nextLine?.depth === itemDepth && nextLine.content.startsWith(LIST_ITEM_PREFIX))
    throw new RangeError(`Expected ${expectedCount} list array items, but found more`);
}
function validateNoExtraTabularRows(nextLine, rowDepth, header) {
  if (nextLine?.depth === rowDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX) && isDataRow(nextLine.content, header.delimiter))
    throw new RangeError(`Expected ${header.length} tabular rows, but found more`);
}
function validateNoBlankLinesInRange(startLine, endLine, blankLines, strict, context) {
  if (!strict)
    return;
  const firstBlank = blankLines.find((blank) => blank.lineNumber > startLine && blank.lineNumber < endLine);
  if (firstBlank)
    throw new SyntaxError(`Line ${firstBlank.lineNumber}: Blank lines inside ${context} are not allowed in strict mode`);
}
function isDataRow(content, delimiter) {
  const colonPos = content.indexOf(COLON);
  const delimiterPos = content.indexOf(delimiter);
  if (colonPos === -1)
    return true;
  if (delimiterPos !== -1 && delimiterPos < colonPos)
    return true;
  return false;
}
var StreamingLineCursor = class {
  buffer = [];
  generator;
  done = false;
  lastLine;
  scanState;
  constructor(generator, scanState) {
    this.generator = generator;
    this.scanState = scanState;
  }
  getBlankLines() {
    return this.scanState.blankLines;
  }
  async peek() {
    if (this.buffer.length > 0)
      return this.buffer[0];
    if (this.done)
      return;
    const result = await this.generator.next();
    if (result.done) {
      this.done = true;
      return;
    }
    this.buffer.push(result.value);
    return result.value;
  }
  async next() {
    const line = await this.peek();
    if (line !== void 0) {
      this.buffer.shift();
      this.lastLine = line;
    }
    return line;
  }
  async advance() {
    await this.next();
  }
  current() {
    return this.lastLine;
  }
  async atEnd() {
    return await this.peek() === void 0;
  }
  peekSync() {
    if (this.buffer.length > 0)
      return this.buffer[0];
    if (this.done)
      return;
    const result = this.generator.next();
    if (result.done) {
      this.done = true;
      return;
    }
    this.buffer.push(result.value);
    return result.value;
  }
  nextSync() {
    const line = this.peekSync();
    if (line !== void 0) {
      this.buffer.shift();
      this.lastLine = line;
    }
    return line;
  }
  advanceSync() {
    this.nextSync();
  }
  atEndSync() {
    return this.peekSync() === void 0;
  }
};
function* decodeStreamSync$1(source, options) {
  if (options?.expandPaths !== void 0)
    throw new Error("expandPaths is not supported in streaming decode");
  const resolvedOptions = {
    indent: options?.indent ?? 2,
    strict: options?.strict ?? true
  };
  const scanState = createScanState();
  const cursor = new StreamingLineCursor(parseLinesSync(source, resolvedOptions.indent, resolvedOptions.strict, scanState), scanState);
  const first = cursor.peekSync();
  if (!first) {
    yield { type: "startObject" };
    yield { type: "endObject" };
    return;
  }
  if (isArrayHeaderContent(first.content)) {
    const headerInfo = parseArrayHeaderLine(first.content, DEFAULT_DELIMITER);
    if (headerInfo) {
      cursor.advanceSync();
      yield* decodeArrayFromHeaderSync(headerInfo.header, headerInfo.inlineValues, cursor, 0, resolvedOptions);
      return;
    }
  }
  cursor.advanceSync();
  if (!!cursor.atEndSync() && !isKeyValueLineSync(first)) {
    yield {
      type: "primitive",
      value: parsePrimitiveToken(first.content.trim())
    };
    return;
  }
  yield { type: "startObject" };
  yield* decodeKeyValueSync(first.content, cursor, 0, resolvedOptions);
  while (!cursor.atEndSync()) {
    const line = cursor.peekSync();
    if (!line || line.depth !== 0)
      break;
    cursor.advanceSync();
    yield* decodeKeyValueSync(line.content, cursor, 0, resolvedOptions);
  }
  yield { type: "endObject" };
}
function* decodeKeyValueSync(content, cursor, baseDepth, options) {
  const arrayHeader = parseArrayHeaderLine(content, DEFAULT_DELIMITER);
  if (arrayHeader && arrayHeader.header.key) {
    yield {
      type: "key",
      key: arrayHeader.header.key
    };
    yield* decodeArrayFromHeaderSync(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options);
    return;
  }
  const { key, isQuoted } = parseKeyToken(content, 0);
  const colonIndex = content.indexOf(COLON, key.length);
  const rest = colonIndex >= 0 ? content.slice(colonIndex + 1).trim() : "";
  yield isQuoted ? {
    type: "key",
    key,
    wasQuoted: true
  } : {
    type: "key",
    key
  };
  if (!rest) {
    const nextLine = cursor.peekSync();
    if (nextLine && nextLine.depth > baseDepth) {
      yield { type: "startObject" };
      yield* decodeObjectFieldsSync(cursor, baseDepth + 1, options);
      yield { type: "endObject" };
      return;
    }
    yield { type: "startObject" };
    yield { type: "endObject" };
    return;
  }
  yield {
    type: "primitive",
    value: parsePrimitiveToken(rest)
  };
}
function* decodeObjectFieldsSync(cursor, baseDepth, options) {
  let computedDepth;
  while (!cursor.atEndSync()) {
    const line = cursor.peekSync();
    if (!line || line.depth < baseDepth)
      break;
    if (computedDepth === void 0 && line.depth >= baseDepth)
      computedDepth = line.depth;
    if (line.depth === computedDepth) {
      cursor.advanceSync();
      yield* decodeKeyValueSync(line.content, cursor, computedDepth, options);
    } else
      break;
  }
}
function* decodeArrayFromHeaderSync(header, inlineValues, cursor, baseDepth, options) {
  yield {
    type: "startArray",
    length: header.length
  };
  if (inlineValues) {
    yield* decodeInlinePrimitiveArraySync(header, inlineValues, options);
    yield { type: "endArray" };
    return;
  }
  if (header.fields && header.fields.length > 0) {
    yield* decodeTabularArraySync(header, cursor, baseDepth, options);
    yield { type: "endArray" };
    return;
  }
  yield* decodeListArraySync(header, cursor, baseDepth, options);
  yield { type: "endArray" };
}
function* decodeInlinePrimitiveArraySync(header, inlineValues, options) {
  if (!inlineValues.trim()) {
    assertExpectedCount(0, header.length, "inline array items", options);
    return;
  }
  const primitives = mapRowValuesToPrimitives(parseDelimitedValues(inlineValues, header.delimiter));
  assertExpectedCount(primitives.length, header.length, "inline array items", options);
  for (const primitive of primitives)
    yield {
      type: "primitive",
      value: primitive
    };
}
function* decodeTabularArraySync(header, cursor, baseDepth, options) {
  const rowDepth = baseDepth + 1;
  let rowCount = 0;
  let startLine;
  let endLine;
  while (!cursor.atEndSync() && rowCount < header.length) {
    const line = cursor.peekSync();
    if (!line || line.depth < rowDepth)
      break;
    if (line.depth === rowDepth) {
      if (startLine === void 0)
        startLine = line.lineNumber;
      endLine = line.lineNumber;
      cursor.advanceSync();
      const values = parseDelimitedValues(line.content, header.delimiter);
      assertExpectedCount(values.length, header.fields.length, "tabular row values", options);
      const primitives = mapRowValuesToPrimitives(values);
      yield* yieldObjectFromFields(header.fields, primitives);
      rowCount++;
    } else
      break;
  }
  assertExpectedCount(rowCount, header.length, "tabular rows", options);
  if (options.strict && startLine !== void 0 && endLine !== void 0)
    validateNoBlankLinesInRange(startLine, endLine, cursor.getBlankLines(), options.strict, "tabular array");
  if (options.strict)
    validateNoExtraTabularRows(cursor.peekSync(), rowDepth, header);
}
function* decodeListArraySync(header, cursor, baseDepth, options) {
  const itemDepth = baseDepth + 1;
  let itemCount = 0;
  let startLine;
  let endLine;
  while (!cursor.atEndSync() && itemCount < header.length) {
    const line = cursor.peekSync();
    if (!line || line.depth < itemDepth)
      break;
    const isListItem = line.content.startsWith(LIST_ITEM_PREFIX) || line.content === LIST_ITEM_MARKER;
    if (line.depth === itemDepth && isListItem) {
      if (startLine === void 0)
        startLine = line.lineNumber;
      endLine = line.lineNumber;
      yield* decodeListItemSync(cursor, itemDepth, options);
      const currentLine = cursor.current();
      if (currentLine)
        endLine = currentLine.lineNumber;
      itemCount++;
    } else
      break;
  }
  assertExpectedCount(itemCount, header.length, "list array items", options);
  if (options.strict && startLine !== void 0 && endLine !== void 0)
    validateNoBlankLinesInRange(startLine, endLine, cursor.getBlankLines(), options.strict, "list array");
  if (options.strict)
    validateNoExtraListItems(cursor.peekSync(), itemDepth, header.length);
}
function* decodeListItemSync(cursor, baseDepth, options) {
  const line = cursor.nextSync();
  if (!line)
    throw new ReferenceError("Expected list item");
  let afterHyphen;
  if (line.content === LIST_ITEM_MARKER) {
    const followDepth = baseDepth + 1;
    const nextLine = cursor.peekSync();
    if (!nextLine || nextLine.depth < followDepth) {
      yield { type: "startObject" };
      yield { type: "endObject" };
      return;
    }
    if (nextLine.depth === followDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
      yield { type: "startObject" };
      while (!cursor.atEndSync()) {
        const fieldLine = cursor.peekSync();
        if (!fieldLine || fieldLine.depth < followDepth)
          break;
        if (fieldLine.depth === followDepth && !fieldLine.content.startsWith(LIST_ITEM_PREFIX)) {
          cursor.advanceSync();
          yield* decodeKeyValueSync(fieldLine.content, cursor, followDepth, options);
        } else
          break;
      }
      yield { type: "endObject" };
      return;
    } else {
      yield { type: "startObject" };
      yield { type: "endObject" };
      return;
    }
  } else if (line.content.startsWith(LIST_ITEM_PREFIX))
    afterHyphen = line.content.slice(LIST_ITEM_PREFIX.length);
  else
    throw new SyntaxError(`Expected list item to start with "${LIST_ITEM_PREFIX}"`);
  if (!afterHyphen.trim()) {
    yield { type: "startObject" };
    yield { type: "endObject" };
    return;
  }
  if (isArrayHeaderContent(afterHyphen)) {
    const arrayHeader = parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER);
    if (arrayHeader) {
      yield* decodeArrayFromHeaderSync(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options);
      return;
    }
  }
  const headerInfo = parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER);
  if (headerInfo && headerInfo.header.key && headerInfo.header.fields) {
    const header = headerInfo.header;
    yield { type: "startObject" };
    yield {
      type: "key",
      key: header.key
    };
    yield* decodeArrayFromHeaderSync(header, headerInfo.inlineValues, cursor, baseDepth + 1, options);
    const followDepth = baseDepth + 1;
    while (!cursor.atEndSync()) {
      const nextLine = cursor.peekSync();
      if (!nextLine || nextLine.depth < followDepth)
        break;
      if (nextLine.depth === followDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
        cursor.advanceSync();
        yield* decodeKeyValueSync(nextLine.content, cursor, followDepth, options);
      } else
        break;
    }
    yield { type: "endObject" };
    return;
  }
  if (isKeyValueContent(afterHyphen)) {
    yield { type: "startObject" };
    yield* decodeKeyValueSync(afterHyphen, cursor, baseDepth + 1, options);
    const followDepth = baseDepth + 1;
    while (!cursor.atEndSync()) {
      const nextLine = cursor.peekSync();
      if (!nextLine || nextLine.depth < followDepth)
        break;
      if (nextLine.depth === followDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
        cursor.advanceSync();
        yield* decodeKeyValueSync(nextLine.content, cursor, followDepth, options);
      } else
        break;
    }
    yield { type: "endObject" };
    return;
  }
  yield {
    type: "primitive",
    value: parsePrimitiveToken(afterHyphen)
  };
}
function isKeyValueLineSync(line) {
  const content = line.content;
  if (content.startsWith('"')) {
    const closingQuoteIndex = findClosingQuote(content, 0);
    if (closingQuoteIndex === -1)
      return false;
    return content.slice(closingQuoteIndex + 1).includes(COLON);
  } else
    return content.includes(COLON);
}
function* yieldObjectFromFields(fields, primitives) {
  yield { type: "startObject" };
  for (let i = 0; i < fields.length; i++) {
    yield {
      type: "key",
      key: fields[i]
    };
    yield {
      type: "primitive",
      value: primitives[i]
    };
  }
  yield { type: "endObject" };
}
function normalizeValue(value) {
  if (value === null)
    return null;
  if (typeof value === "object" && value !== null && "toJSON" in value && typeof value.toJSON === "function") {
    const next = value.toJSON();
    if (next !== value)
      return normalizeValue(next);
  }
  if (typeof value === "string" || typeof value === "boolean")
    return value;
  if (typeof value === "number") {
    if (Object.is(value, -0))
      return 0;
    if (!Number.isFinite(value))
      return null;
    return value;
  }
  if (typeof value === "bigint") {
    if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER)
      return Number(value);
    return value.toString();
  }
  if (value instanceof Date)
    return value.toISOString();
  if (Array.isArray(value))
    return value.map(normalizeValue);
  if (value instanceof Set)
    return Array.from(value).map(normalizeValue);
  if (value instanceof Map)
    return Object.fromEntries(Array.from(value, ([k, v]) => [String(k), normalizeValue(v)]));
  if (isPlainObject(value)) {
    const normalized = {};
    for (const key in value)
      if (Object.prototype.hasOwnProperty.call(value, key))
        normalized[key] = normalizeValue(value[key]);
    return normalized;
  }
  return null;
}
function isJsonPrimitive(value) {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function isJsonArray(value) {
  return Array.isArray(value);
}
function isJsonObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isEmptyObject(value) {
  return Object.keys(value).length === 0;
}
function isPlainObject(value) {
  if (value === null || typeof value !== "object")
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}
function isArrayOfPrimitives(value) {
  return value.length === 0 || value.every((item) => isJsonPrimitive(item));
}
function isArrayOfArrays(value) {
  return value.length === 0 || value.every((item) => isJsonArray(item));
}
function isArrayOfObjects(value) {
  return value.length === 0 || value.every((item) => isJsonObject(item));
}
function isValidUnquotedKey(key) {
  return /^[A-Z_][\w.]*$/i.test(key);
}
function isIdentifierSegment(key) {
  return /^[A-Z_]\w*$/i.test(key);
}
function isSafeUnquoted(value, delimiter = DEFAULT_DELIMITER) {
  if (!value)
    return false;
  if (value !== value.trim())
    return false;
  if (isBooleanOrNullLiteral(value) || isNumericLike(value))
    return false;
  if (value.includes(":"))
    return false;
  if (value.includes('"') || value.includes("\\"))
    return false;
  if (/[[\]{}]/.test(value))
    return false;
  if (/[\n\r\t]/.test(value))
    return false;
  if (value.includes(delimiter))
    return false;
  if (value.startsWith(LIST_ITEM_MARKER))
    return false;
  return true;
}
function isNumericLike(value) {
  return /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value) || /^0\d+$/.test(value);
}
var QUOTED_KEY_MARKER = Symbol("quotedKey");
function expandPathsSafe(value, strict) {
  if (Array.isArray(value))
    return value.map((item) => expandPathsSafe(item, strict));
  if (isJsonObject(value)) {
    const expandedObject = {};
    const quotedKeys = value[QUOTED_KEY_MARKER];
    for (const [key, keyValue] of Object.entries(value)) {
      const isQuoted = quotedKeys?.has(key);
      if (key.includes(DOT) && !isQuoted) {
        const segments = key.split(DOT);
        if (segments.every((seg) => isIdentifierSegment(seg))) {
          insertPathSafe(expandedObject, segments, expandPathsSafe(keyValue, strict), strict);
          continue;
        }
      }
      const expandedValue = expandPathsSafe(keyValue, strict);
      if (key in expandedObject) {
        const conflictingValue = expandedObject[key];
        if (canMerge(conflictingValue, expandedValue))
          mergeObjects(conflictingValue, expandedValue, strict);
        else {
          if (strict)
            throw new TypeError(`Path expansion conflict at key "${key}": cannot merge ${typeof conflictingValue} with ${typeof expandedValue}`);
          expandedObject[key] = expandedValue;
        }
      } else
        expandedObject[key] = expandedValue;
    }
    return expandedObject;
  }
  return value;
}
function insertPathSafe(target, segments, value, strict) {
  let currentNode = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const currentSegment = segments[i];
    const segmentValue = currentNode[currentSegment];
    if (segmentValue === void 0) {
      const newObj = {};
      currentNode[currentSegment] = newObj;
      currentNode = newObj;
    } else if (isJsonObject(segmentValue))
      currentNode = segmentValue;
    else {
      if (strict)
        throw new TypeError(`Path expansion conflict at segment "${currentSegment}": expected object but found ${typeof segmentValue}`);
      const newObj = {};
      currentNode[currentSegment] = newObj;
      currentNode = newObj;
    }
  }
  const lastSeg = segments[segments.length - 1];
  const destinationValue = currentNode[lastSeg];
  if (destinationValue === void 0)
    currentNode[lastSeg] = value;
  else if (canMerge(destinationValue, value))
    mergeObjects(destinationValue, value, strict);
  else {
    if (strict)
      throw new TypeError(`Path expansion conflict at key "${lastSeg}": cannot merge ${typeof destinationValue} with ${typeof value}`);
    currentNode[lastSeg] = value;
  }
}
function mergeObjects(target, source, strict) {
  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = target[key];
    if (targetValue === void 0)
      target[key] = sourceValue;
    else if (canMerge(targetValue, sourceValue))
      mergeObjects(targetValue, sourceValue, strict);
    else {
      if (strict)
        throw new TypeError(`Path expansion conflict at key "${key}": cannot merge ${typeof targetValue} with ${typeof sourceValue}`);
      target[key] = sourceValue;
    }
  }
}
function canMerge(a, b) {
  return isJsonObject(a) && isJsonObject(b);
}
function buildValueFromEvents(events) {
  const state = {
    stack: [],
    root: void 0
  };
  for (const event of events)
    applyEvent(state, event);
  return finalizeState(state);
}
function applyEvent(state, event) {
  const { stack } = state;
  switch (event.type) {
    case "startObject": {
      const obj = {};
      const quotedKeys = /* @__PURE__ */ new Set();
      if (stack.length === 0)
        stack.push({
          type: "object",
          obj,
          quotedKeys
        });
      else {
        const parent = stack[stack.length - 1];
        if (parent.type === "object") {
          if (parent.currentKey === void 0)
            throw new Error("Object startObject event without preceding key");
          parent.obj[parent.currentKey] = obj;
          parent.currentKey = void 0;
        } else if (parent.type === "array")
          parent.arr.push(obj);
        stack.push({
          type: "object",
          obj,
          quotedKeys
        });
      }
      break;
    }
    case "endObject": {
      if (stack.length === 0)
        throw new Error("Unexpected endObject event");
      const context = stack.pop();
      if (context.type !== "object")
        throw new Error("Mismatched endObject event");
      if (context.quotedKeys.size > 0)
        Object.defineProperty(context.obj, QUOTED_KEY_MARKER, {
          value: context.quotedKeys,
          enumerable: false,
          writable: false,
          configurable: false
        });
      if (stack.length === 0)
        state.root = context.obj;
      break;
    }
    case "startArray": {
      const arr = [];
      if (stack.length === 0)
        stack.push({
          type: "array",
          arr
        });
      else {
        const parent = stack[stack.length - 1];
        if (parent.type === "object") {
          if (parent.currentKey === void 0)
            throw new Error("Array startArray event without preceding key");
          parent.obj[parent.currentKey] = arr;
          parent.currentKey = void 0;
        } else if (parent.type === "array")
          parent.arr.push(arr);
        stack.push({
          type: "array",
          arr
        });
      }
      break;
    }
    case "endArray": {
      if (stack.length === 0)
        throw new Error("Unexpected endArray event");
      const context = stack.pop();
      if (context.type !== "array")
        throw new Error("Mismatched endArray event");
      if (stack.length === 0)
        state.root = context.arr;
      break;
    }
    case "key": {
      if (stack.length === 0)
        throw new Error("Key event outside of object context");
      const parent = stack[stack.length - 1];
      if (parent.type !== "object")
        throw new Error("Key event in non-object context");
      parent.currentKey = event.key;
      if (event.wasQuoted)
        parent.quotedKeys.add(event.key);
      break;
    }
    case "primitive":
      if (stack.length === 0)
        state.root = event.value;
      else {
        const parent = stack[stack.length - 1];
        if (parent.type === "object") {
          if (parent.currentKey === void 0)
            throw new Error("Primitive event without preceding key in object");
          parent.obj[parent.currentKey] = event.value;
          parent.currentKey = void 0;
        } else if (parent.type === "array")
          parent.arr.push(event.value);
      }
      break;
  }
}
function finalizeState(state) {
  if (state.stack.length !== 0)
    throw new Error("Incomplete event stream: stack not empty at end");
  if (state.root === void 0)
    throw new Error("No root value built from events");
  return state.root;
}
function tryFoldKeyChain(key, value, siblings, options, rootLiteralKeys, pathPrefix, flattenDepth) {
  if (options.keyFolding !== "safe")
    return;
  if (!isJsonObject(value))
    return;
  const { segments, tail, leafValue } = collectSingleKeyChain(key, value, flattenDepth ?? options.flattenDepth);
  if (segments.length < 2)
    return;
  if (!segments.every((seg) => isIdentifierSegment(seg)))
    return;
  const foldedKey = buildFoldedKey(segments);
  const absolutePath = pathPrefix ? `${pathPrefix}${DOT}${foldedKey}` : foldedKey;
  if (siblings.includes(foldedKey))
    return;
  if (rootLiteralKeys && rootLiteralKeys.has(absolutePath))
    return;
  return {
    foldedKey,
    remainder: tail,
    leafValue,
    segmentCount: segments.length
  };
}
function collectSingleKeyChain(startKey, startValue, maxDepth) {
  const segments = [startKey];
  let currentValue = startValue;
  while (segments.length < maxDepth) {
    if (!isJsonObject(currentValue))
      break;
    const keys = Object.keys(currentValue);
    if (keys.length !== 1)
      break;
    const nextKey = keys[0];
    const nextValue = currentValue[nextKey];
    segments.push(nextKey);
    currentValue = nextValue;
  }
  if (!isJsonObject(currentValue) || isEmptyObject(currentValue))
    return {
      segments,
      tail: void 0,
      leafValue: currentValue
    };
  return {
    segments,
    tail: currentValue,
    leafValue: currentValue
  };
}
function buildFoldedKey(segments) {
  return segments.join(DOT);
}
function encodePrimitive(value, delimiter) {
  if (value === null)
    return NULL_LITERAL;
  if (typeof value === "boolean")
    return String(value);
  if (typeof value === "number")
    return String(value);
  return encodeStringLiteral(value, delimiter);
}
function encodeStringLiteral(value, delimiter = DEFAULT_DELIMITER) {
  if (isSafeUnquoted(value, delimiter))
    return value;
  return `${DOUBLE_QUOTE}${escapeString(value)}${DOUBLE_QUOTE}`;
}
function encodeKey(key) {
  if (isValidUnquotedKey(key))
    return key;
  return `${DOUBLE_QUOTE}${escapeString(key)}${DOUBLE_QUOTE}`;
}
function encodeAndJoinPrimitives(values, delimiter = DEFAULT_DELIMITER) {
  return values.map((v) => encodePrimitive(v, delimiter)).join(delimiter);
}
function formatHeader(length, options) {
  const key = options?.key;
  const fields = options?.fields;
  const delimiter = options?.delimiter ?? COMMA;
  let header = "";
  if (key)
    header += encodeKey(key);
  header += `[${length}${delimiter !== DEFAULT_DELIMITER ? delimiter : ""}]`;
  if (fields) {
    const quotedFields = fields.map((f) => encodeKey(f));
    header += `{${quotedFields.join(delimiter)}}`;
  }
  header += ":";
  return header;
}
function* encodeJsonValue(value, options, depth) {
  if (isJsonPrimitive(value)) {
    const encodedPrimitive = encodePrimitive(value, options.delimiter);
    if (encodedPrimitive !== "")
      yield encodedPrimitive;
    return;
  }
  if (isJsonArray(value))
    yield* encodeArrayLines(void 0, value, depth, options);
  else if (isJsonObject(value))
    yield* encodeObjectLines(value, depth, options);
}
function* encodeObjectLines(value, depth, options, rootLiteralKeys, pathPrefix, remainingDepth) {
  const keys = Object.keys(value);
  if (depth === 0 && !rootLiteralKeys)
    rootLiteralKeys = new Set(keys.filter((k) => k.includes(".")));
  const effectiveFlattenDepth = remainingDepth ?? options.flattenDepth;
  for (const [key, val] of Object.entries(value))
    yield* encodeKeyValuePairLines(key, val, depth, options, keys, rootLiteralKeys, pathPrefix, effectiveFlattenDepth);
}
function* encodeKeyValuePairLines(key, value, depth, options, siblings, rootLiteralKeys, pathPrefix, flattenDepth) {
  const currentPath = pathPrefix ? `${pathPrefix}${DOT}${key}` : key;
  const effectiveFlattenDepth = flattenDepth ?? options.flattenDepth;
  if (options.keyFolding === "safe" && siblings) {
    const foldResult = tryFoldKeyChain(key, value, siblings, options, rootLiteralKeys, pathPrefix, effectiveFlattenDepth);
    if (foldResult) {
      const { foldedKey, remainder, leafValue, segmentCount } = foldResult;
      const encodedFoldedKey = encodeKey(foldedKey);
      if (remainder === void 0) {
        if (isJsonPrimitive(leafValue)) {
          yield indentedLine(depth, `${encodedFoldedKey}: ${encodePrimitive(leafValue, options.delimiter)}`, options.indent);
          return;
        } else if (isJsonArray(leafValue)) {
          yield* encodeArrayLines(foldedKey, leafValue, depth, options);
          return;
        } else if (isJsonObject(leafValue) && isEmptyObject(leafValue)) {
          yield indentedLine(depth, `${encodedFoldedKey}:`, options.indent);
          return;
        }
      }
      if (isJsonObject(remainder)) {
        yield indentedLine(depth, `${encodedFoldedKey}:`, options.indent);
        const remainingDepth = effectiveFlattenDepth - segmentCount;
        const foldedPath = pathPrefix ? `${pathPrefix}${DOT}${foldedKey}` : foldedKey;
        yield* encodeObjectLines(remainder, depth + 1, options, rootLiteralKeys, foldedPath, remainingDepth);
        return;
      }
    }
  }
  const encodedKey = encodeKey(key);
  if (isJsonPrimitive(value))
    yield indentedLine(depth, `${encodedKey}: ${encodePrimitive(value, options.delimiter)}`, options.indent);
  else if (isJsonArray(value))
    yield* encodeArrayLines(key, value, depth, options);
  else if (isJsonObject(value)) {
    yield indentedLine(depth, `${encodedKey}:`, options.indent);
    if (!isEmptyObject(value))
      yield* encodeObjectLines(value, depth + 1, options, rootLiteralKeys, currentPath, effectiveFlattenDepth);
  }
}
function* encodeArrayLines(key, value, depth, options) {
  if (value.length === 0) {
    yield indentedLine(depth, formatHeader(0, {
      key,
      delimiter: options.delimiter
    }), options.indent);
    return;
  }
  if (isArrayOfPrimitives(value)) {
    yield indentedLine(depth, encodeInlineArrayLine(value, options.delimiter, key), options.indent);
    return;
  }
  if (isArrayOfArrays(value)) {
    if (value.every((arr) => isArrayOfPrimitives(arr))) {
      yield* encodeArrayOfArraysAsListItemsLines(key, value, depth, options);
      return;
    }
  }
  if (isArrayOfObjects(value)) {
    const header = extractTabularHeader(value);
    if (header)
      yield* encodeArrayOfObjectsAsTabularLines(key, value, header, depth, options);
    else
      yield* encodeMixedArrayAsListItemsLines(key, value, depth, options);
    return;
  }
  yield* encodeMixedArrayAsListItemsLines(key, value, depth, options);
}
function* encodeArrayOfArraysAsListItemsLines(prefix, values, depth, options) {
  yield indentedLine(depth, formatHeader(values.length, {
    key: prefix,
    delimiter: options.delimiter
  }), options.indent);
  for (const arr of values)
    if (isArrayOfPrimitives(arr)) {
      const arrayLine = encodeInlineArrayLine(arr, options.delimiter);
      yield indentedListItem(depth + 1, arrayLine, options.indent);
    }
}
function encodeInlineArrayLine(values, delimiter, prefix) {
  const header = formatHeader(values.length, {
    key: prefix,
    delimiter
  });
  const joinedValue = encodeAndJoinPrimitives(values, delimiter);
  if (values.length === 0)
    return header;
  return `${header} ${joinedValue}`;
}
function* encodeArrayOfObjectsAsTabularLines(prefix, rows, header, depth, options) {
  yield indentedLine(depth, formatHeader(rows.length, {
    key: prefix,
    fields: header,
    delimiter: options.delimiter
  }), options.indent);
  yield* writeTabularRowsLines(rows, header, depth + 1, options);
}
function extractTabularHeader(rows) {
  if (rows.length === 0)
    return;
  const firstRow = rows[0];
  const firstKeys = Object.keys(firstRow);
  if (firstKeys.length === 0)
    return;
  if (isTabularArray(rows, firstKeys))
    return firstKeys;
}
function isTabularArray(rows, header) {
  for (const row of rows) {
    if (Object.keys(row).length !== header.length)
      return false;
    for (const key of header) {
      if (!(key in row))
        return false;
      if (!isJsonPrimitive(row[key]))
        return false;
    }
  }
  return true;
}
function* writeTabularRowsLines(rows, header, depth, options) {
  for (const row of rows)
    yield indentedLine(depth, encodeAndJoinPrimitives(header.map((key) => row[key]), options.delimiter), options.indent);
}
function* encodeMixedArrayAsListItemsLines(prefix, items, depth, options) {
  yield indentedLine(depth, formatHeader(items.length, {
    key: prefix,
    delimiter: options.delimiter
  }), options.indent);
  for (const item of items)
    yield* encodeListItemValueLines(item, depth + 1, options);
}
function* encodeObjectAsListItemLines(obj, depth, options) {
  if (isEmptyObject(obj)) {
    yield indentedLine(depth, LIST_ITEM_MARKER, options.indent);
    return;
  }
  const entries = Object.entries(obj);
  const [firstKey, firstValue] = entries[0];
  const restEntries = entries.slice(1);
  if (isJsonArray(firstValue) && isArrayOfObjects(firstValue)) {
    const header = extractTabularHeader(firstValue);
    if (header) {
      yield indentedListItem(depth, formatHeader(firstValue.length, {
        key: firstKey,
        fields: header,
        delimiter: options.delimiter
      }), options.indent);
      yield* writeTabularRowsLines(firstValue, header, depth + 2, options);
      if (restEntries.length > 0)
        yield* encodeObjectLines(Object.fromEntries(restEntries), depth + 1, options);
      return;
    }
  }
  const encodedKey = encodeKey(firstKey);
  if (isJsonPrimitive(firstValue))
    yield indentedListItem(depth, `${encodedKey}: ${encodePrimitive(firstValue, options.delimiter)}`, options.indent);
  else if (isJsonArray(firstValue))
    if (firstValue.length === 0)
      yield indentedListItem(depth, `${encodedKey}${formatHeader(0, { delimiter: options.delimiter })}`, options.indent);
    else if (isArrayOfPrimitives(firstValue))
      yield indentedListItem(depth, `${encodedKey}${encodeInlineArrayLine(firstValue, options.delimiter)}`, options.indent);
    else {
      yield indentedListItem(depth, `${encodedKey}${formatHeader(firstValue.length, { delimiter: options.delimiter })}`, options.indent);
      for (const item of firstValue)
        yield* encodeListItemValueLines(item, depth + 2, options);
    }
  else if (isJsonObject(firstValue)) {
    yield indentedListItem(depth, `${encodedKey}:`, options.indent);
    if (!isEmptyObject(firstValue))
      yield* encodeObjectLines(firstValue, depth + 2, options);
  }
  if (restEntries.length > 0)
    yield* encodeObjectLines(Object.fromEntries(restEntries), depth + 1, options);
}
function* encodeListItemValueLines(value, depth, options) {
  if (isJsonPrimitive(value))
    yield indentedListItem(depth, encodePrimitive(value, options.delimiter), options.indent);
  else if (isJsonArray(value))
    if (isArrayOfPrimitives(value))
      yield indentedListItem(depth, encodeInlineArrayLine(value, options.delimiter), options.indent);
    else {
      yield indentedListItem(depth, formatHeader(value.length, { delimiter: options.delimiter }), options.indent);
      for (const item of value)
        yield* encodeListItemValueLines(item, depth + 1, options);
    }
  else if (isJsonObject(value))
    yield* encodeObjectAsListItemLines(value, depth, options);
}
function indentedLine(depth, content, indentSize) {
  return " ".repeat(indentSize * depth) + content;
}
function indentedListItem(depth, content, indentSize) {
  return indentedLine(depth, LIST_ITEM_PREFIX + content, indentSize);
}
function applyReplacer(root, replacer) {
  const replacedRoot = replacer("", root, []);
  if (replacedRoot === void 0)
    return transformChildren(root, replacer, []);
  return transformChildren(normalizeValue(replacedRoot), replacer, []);
}
function transformChildren(value, replacer, path) {
  if (isJsonObject(value))
    return transformObject(value, replacer, path);
  if (isJsonArray(value))
    return transformArray(value, replacer, path);
  return value;
}
function transformObject(obj, replacer, path) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const childPath = [...path, key];
    const replacedValue = replacer(key, value, childPath);
    if (replacedValue === void 0)
      continue;
    result[key] = transformChildren(normalizeValue(replacedValue), replacer, childPath);
  }
  return result;
}
function transformArray(arr, replacer, path) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const value = arr[i];
    const childPath = [...path, i];
    const replacedValue = replacer(String(i), value, childPath);
    if (replacedValue === void 0)
      continue;
    const normalizedValue = normalizeValue(replacedValue);
    result.push(transformChildren(normalizedValue, replacer, childPath));
  }
  return result;
}
function encode(input, options) {
  return Array.from(encodeLines(input, options)).join("\n");
}
function decode(input, options) {
  return decodeFromLines(input.split("\n"), options);
}
function encodeLines(input, options) {
  const normalizedValue = normalizeValue(input);
  const resolvedOptions = resolveOptions(options);
  return encodeJsonValue(resolvedOptions.replacer ? applyReplacer(normalizedValue, resolvedOptions.replacer) : normalizedValue, resolvedOptions, 0);
}
function decodeFromLines(lines, options) {
  const resolvedOptions = resolveDecodeOptions(options);
  const decodedValue = buildValueFromEvents(decodeStreamSync$1(lines, {
    indent: resolvedOptions.indent,
    strict: resolvedOptions.strict
  }));
  if (resolvedOptions.expandPaths === "safe")
    return expandPathsSafe(decodedValue, resolvedOptions.strict);
  return decodedValue;
}
function resolveOptions(options) {
  return {
    indent: options?.indent ?? 2,
    delimiter: options?.delimiter ?? DEFAULT_DELIMITER,
    keyFolding: options?.keyFolding ?? "off",
    flattenDepth: options?.flattenDepth ?? Number.POSITIVE_INFINITY,
    replacer: options?.replacer
  };
}
function resolveDecodeOptions(options) {
  return {
    indent: options?.indent ?? 2,
    strict: options?.strict ?? true,
    expandPaths: options?.expandPaths ?? "off"
  };
}

// src/commands/toon.ts
async function toonEncode(args2) {
  const file = args2[0];
  if (!file || file === "--help" || file === "-h") {
    console.error(`USAGE: mid-tools toon <file|->`);
    process.exit(1);
  }
  let input;
  if (file === "-") {
    input = await readStdin();
  } else {
    input = (0, import_fs.readFileSync)(file, "utf-8");
  }
  const isToon = input.trim().split("\n")[0]?.includes(":") && !input.startsWith("{") && !input.startsWith("[");
  try {
    if (isToon) {
      const decoded = decode(input);
      console.log(JSON.stringify(decoded, null, 2));
    } else {
      const parsed = JSON.parse(input);
      const encoded = encode(parsed, {
        indent: 2
      });
      console.log(encoded);
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Parse error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}
async function readStdin() {
  return new Promise((resolve3, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("readable", () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });
    process.stdin.on("end", () => {
      resolve3(data);
    });
    process.stdin.on("error", reject);
  });
}

// src/commands/state.ts
var import_fs3 = require("fs");

// src/utils.ts
var import_fs2 = require("fs");
var import_path = require("path");
var import_process = require("process");
function getPlanningDir() {
  const local = (0, import_path.resolve)((0, import_process.cwd)(), ".planning");
  if ((0, import_fs2.existsSync)(local)) {
    return local;
  }
  return local;
}
function getConfigPath() {
  return (0, import_path.resolve)(getPlanningDir(), "config.json");
}
function getStateFile() {
  return (0, import_path.resolve)(getPlanningDir(), "STATE.md");
}
function getRoadmapFile() {
  return (0, import_path.resolve)(getPlanningDir(), "ROADMAP.md");
}
function readJSON(path) {
  if (!(0, import_fs2.existsSync)(path)) {
    return {};
  }
  try {
    return JSON.parse((0, import_fs2.readFileSync)(path, "utf-8"));
  } catch {
    return {};
  }
}
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {};
  }
  const fm = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1)
      continue;
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    if (value === "true") {
      fm[key] = true;
    } else if (value === "false") {
      fm[key] = false;
    } else if (value === "null" || value === "") {
      fm[key] = null;
    } else if (/^\d+$/.test(value)) {
      fm[key] = parseInt(value, 10);
    } else if (/^\d+\.\d+$/.test(value)) {
      fm[key] = parseFloat(value);
    } else if (value.startsWith("[") && value.endsWith("]")) {
      try {
        fm[key] = JSON.parse(value);
      } catch {
        fm[key] = value;
      }
    } else {
      fm[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return fm;
}
function getContextWindow() {
  try {
    const config = readJSON(getConfigPath());
    return config.context_window || 2e5;
  } catch {
    return 2e5;
  }
}
function getModelProfile() {
  try {
    const config = readJSON(getConfigPath());
    return config.model_profile || "balanced";
  } catch {
    return "balanced";
  }
}

// src/commands/state.ts
function stateCommand(args2) {
  const subcommand = args2[0];
  switch (subcommand) {
    case "get":
      stateGet();
      break;
    case "set":
      stateSet(args2[1], args2.slice(2).join(" "));
      break;
    case "advance":
      stateAdvance(args2[1]);
      break;
    default:
      console.error(`Unknown state command: ${subcommand}`);
      console.error(`Usage: mid-tools state <get|set|advance>`);
      process.exit(1);
  }
}
function stateGet() {
  const stateFile = getStateFile();
  if (!(0, import_fs3.existsSync)(stateFile)) {
    console.log(`phase_number: 0
status: uninitialized`);
    return;
  }
  const content = (0, import_fs3.readFileSync)(stateFile, "utf-8");
  const fm = extractFrontmatter(content);
  const toon = encode(fm, { keyFolding: "safe", indent: 2 });
  console.log(toon);
}
function stateSet(key, value) {
  const stateFile = getStateFile();
  const planningDir = getPlanningDir();
  if (!(0, import_fs3.existsSync)(planningDir)) {
    (0, import_fs3.mkdirSync)(planningDir, { recursive: true });
  }
  let content = "";
  let fm = {};
  if ((0, import_fs3.existsSync)(stateFile)) {
    content = (0, import_fs3.readFileSync)(stateFile, "utf-8");
    fm = extractFrontmatter(content);
    const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    content = match ? match[1] : "";
  }
  let parsedValue = value;
  if (value === "true")
    parsedValue = true;
  else if (value === "false")
    parsedValue = false;
  else if (value === "null")
    parsedValue = null;
  else if (/^\d+$/.test(value))
    parsedValue = parseInt(value, 10);
  else if (/^\d+\.\d+$/.test(value))
    parsedValue = parseFloat(value);
  else if ((value.startsWith("[") || value.startsWith("{")) && value.endsWith("]") || value.endsWith("}")) {
    try {
      parsedValue = JSON.parse(value);
    } catch {
    }
  }
  fm[key] = parsedValue;
  const fmLines = Object.entries(fm).map(([k, v]) => {
    if (typeof v === "string") {
      return `${k}: ${v}`;
    } else if (v === null) {
      return `${k}:`;
    } else if (typeof v === "object") {
      return `${k}: ${JSON.stringify(v)}`;
    } else {
      return `${k}: ${String(v)}`;
    }
  });
  const newContent = `---
${fmLines.join("\n")}
---
${content}`;
  (0, import_fs3.writeFileSync)(stateFile, newContent, "utf-8");
}
function stateAdvance(phase) {
  const stateFile = getStateFile();
  if (!(0, import_fs3.existsSync)(stateFile)) {
    console.error(`STATE.md not found at ${stateFile}`);
    process.exit(1);
  }
  stateSet("last_completed_phase", phase);
  console.log(`Advanced to phase: ${phase}`);
}

// src/commands/frontmatter.ts
var import_fs4 = require("fs");
function frontmatterCommand(args2) {
  const subcommand = args2[0];
  switch (subcommand) {
    case "get":
      frontmatterGet(args2.slice(1));
      break;
    case "list":
      frontmatterList(args2[1]);
      break;
    default:
      console.error(`Unknown frontmatter command: ${subcommand}`);
      console.error(`Usage: mid-tools fm <get|list>`);
      process.exit(1);
  }
}
function frontmatterGet(args2) {
  const file = args2[0];
  let field = null;
  for (let i = 0; i < args2.length; i++) {
    if (args2[i] === "--field" && i + 1 < args2.length) {
      field = args2[i + 1];
      break;
    }
  }
  if (!file) {
    console.error(`Usage: mid-tools fm get <file> --field <fieldname>`);
    process.exit(1);
  }
  if (!(0, import_fs4.existsSync)(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }
  const content = (0, import_fs4.readFileSync)(file, "utf-8");
  const fm = extractFrontmatter(content);
  if (!field) {
    console.error(`Usage: mid-tools fm get <file> --field <fieldname>`);
    process.exit(1);
  }
  const value = fm[field];
  if (value === void 0) {
    console.log(``);
  } else if (typeof value === "object") {
    console.log(JSON.stringify(value));
  } else {
    console.log(String(value));
  }
}
function frontmatterList(file) {
  if (!file) {
    console.error(`Usage: mid-tools fm list <file>`);
    process.exit(1);
  }
  if (!(0, import_fs4.existsSync)(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }
  const content = (0, import_fs4.readFileSync)(file, "utf-8");
  const fm = extractFrontmatter(content);
  const toon = encode(fm, { keyFolding: "safe", indent: 2 });
  console.log(toon);
}

// src/commands/roadmap.ts
var import_fs5 = require("fs");
function roadmapCommand(args2) {
  const subcommand = args2[0];
  switch (subcommand) {
    case "phases":
      roadmapPhases();
      break;
    case "current":
      roadmapCurrent();
      break;
    case "phase":
      roadmapPhase(args2[1]);
      break;
    default:
      console.error(`Unknown roadmap command: ${subcommand}`);
      console.error(`Usage: mid-tools roadmap <phases|current|phase>`);
      process.exit(1);
  }
}
function roadmapPhases() {
  const roadmapFile = getRoadmapFile();
  if (!(0, import_fs5.existsSync)(roadmapFile)) {
    console.log(`phases[0]:`);
    return;
  }
  const content = (0, import_fs5.readFileSync)(roadmapFile, "utf-8");
  const phases = extractPhases(content);
  const toon = encode({ phases }, { keyFolding: "safe", indent: 2 });
  console.log(toon);
}
function roadmapCurrent() {
  const roadmapFile = getRoadmapFile();
  if (!(0, import_fs5.existsSync)(roadmapFile)) {
    console.log(`phase_number: 0
phase_name: ""
status: pending`);
    return;
  }
  const content = (0, import_fs5.readFileSync)(roadmapFile, "utf-8");
  const phases = extractPhases(content);
  const currentPhase = phases.find((p) => p.status !== "complete") || phases[0];
  const toon = encode(currentPhase || {}, { keyFolding: "safe", indent: 2 });
  console.log(toon);
}
function roadmapPhase(phaseNumber) {
  if (!phaseNumber) {
    console.error(`Usage: mid-tools roadmap phase <number>`);
    process.exit(1);
  }
  const roadmapFile = getRoadmapFile();
  if (!(0, import_fs5.existsSync)(roadmapFile)) {
    console.error(`ROADMAP.md not found at ${roadmapFile}`);
    process.exit(1);
  }
  const content = (0, import_fs5.readFileSync)(roadmapFile, "utf-8");
  const phases = extractPhases(content);
  const num = parseInt(phaseNumber, 10);
  const phase = phases.find((p) => p.number === num);
  if (!phase) {
    console.error(`Phase ${num} not found`);
    process.exit(1);
  }
  const toon = encode(phase, { keyFolding: "safe", indent: 2 });
  console.log(toon);
}
function extractPhases(content) {
  const phases = [];
  const lines = content.split("\n");
  let phaseNumber = 0;
  let phaseName = "";
  let phaseStatus = "pending";
  for (const line of lines) {
    const phaseMatch = line.match(/^##\s+(\d+)\s*-\s*([^[\]]+)\s*\[([^\]]+)\]?/);
    if (phaseMatch) {
      if (phaseName) {
        phases.push({
          number: phaseNumber,
          name: phaseName,
          status: phaseStatus
        });
      }
      phaseNumber = parseInt(phaseMatch[1], 10);
      phaseName = phaseMatch[2].trim();
      phaseStatus = phaseMatch[3]?.toLowerCase() || "pending";
    }
  }
  if (phaseName) {
    phases.push({
      number: phaseNumber,
      name: phaseName,
      status: phaseStatus
    });
  }
  return phases;
}

// src/commands/config.ts
var import_fs6 = require("fs");
function configCommand(args2) {
  const subcommand = args2[0];
  switch (subcommand) {
    case "get":
      configGet(args2[1]);
      break;
    case "set":
      configSet(args2[1], args2.slice(2).join(" "));
      break;
    default:
      console.error(`Unknown config command: ${subcommand}`);
      console.error(`Usage: mid-tools config <get|set>`);
      process.exit(1);
  }
}
function configGet(key) {
  if (!key) {
    console.error(`Usage: mid-tools config get <key>`);
    process.exit(1);
  }
  const config = readJSON(getConfigPath());
  const value = config[key];
  if (value === void 0) {
    console.log(``);
  } else if (typeof value === "object") {
    console.log(JSON.stringify(value));
  } else {
    console.log(String(value));
  }
}
function configSet(key, value) {
  if (!key) {
    console.error(`Usage: mid-tools config set <key> <value>`);
    process.exit(1);
  }
  const configPath = getConfigPath();
  const planningDir = getPlanningDir();
  if (!(0, import_fs6.existsSync)(planningDir)) {
    (0, import_fs6.mkdirSync)(planningDir, { recursive: true });
  }
  const config = readJSON(configPath);
  let parsedValue = value;
  if (value === "true")
    parsedValue = true;
  else if (value === "false")
    parsedValue = false;
  else if (value === "null")
    parsedValue = null;
  else if (/^\d+$/.test(value))
    parsedValue = parseInt(value, 10);
  else if (/^\d+\.\d+$/.test(value))
    parsedValue = parseFloat(value);
  else if ((value.startsWith("[") || value.startsWith("{")) && (value.endsWith("]") || value.endsWith("}"))) {
    try {
      parsedValue = JSON.parse(value);
    } catch {
    }
  }
  config[key] = parsedValue;
  (0, import_fs6.writeFileSync)(configPath, JSON.stringify(config, null, 2), "utf-8");
}

// src/commands/init.ts
var import_fs7 = require("fs");
var import_path2 = require("path");
async function initCommand(args2) {
  const workflow = args2[0];
  const phaseArg = args2[1];
  if (!workflow) {
    console.error(`Usage: mid-tools init <workflow> [phase]`);
    process.exit(1);
  }
  const payload = getInitPayload(workflow, phaseArg);
  const toon = encode(payload, { keyFolding: "safe", indent: 2 });
  console.log(toon);
}
function getInitPayload(workflow, phaseArg) {
  const planningDir = getPlanningDir();
  const contextWindow = getContextWindow();
  const modelProfile = getModelProfile();
  let phaseNumber = 1;
  if (phaseArg) {
    phaseNumber = parseInt(phaseArg, 10) || 1;
  }
  const phaseName = `Phase ${phaseNumber}`;
  const phaseDir = (0, import_path2.resolve)(planningDir, `phases`, `0${phaseNumber}`);
  const branchName = `phase-${phaseNumber}`;
  const { executor, verifier } = routeModels(modelProfile);
  const { plans, incompletePlans } = getPlanList(phaseDir);
  const parallelization = incompletePlans.length > 1;
  return {
    workflow,
    phase_number: phaseNumber,
    phase_name: phaseName,
    phase_dir: phaseDir,
    plans,
    incomplete_plans: incompletePlans,
    branch_name: branchName,
    parallelization,
    executor_model: executor,
    verifier_model: verifier,
    context_window: contextWindow,
    model_profile: modelProfile
  };
}
function routeModels(profile) {
  switch (profile) {
    case "budget":
      return { executor: "claude-haiku-4-5", verifier: "claude-haiku-4-5" };
    case "balanced":
      return { executor: "claude-sonnet-4-6", verifier: "claude-haiku-4-5" };
    case "quality":
      return { executor: "claude-opus-4-6", verifier: "claude-sonnet-4-6" };
    default:
      return { executor: "claude-sonnet-4-6", verifier: "claude-haiku-4-5" };
  }
}
function getPlanList(phaseDir) {
  const plans = [];
  const incompletePlans = [];
  if (!(0, import_fs7.existsSync)(phaseDir)) {
    return { plans, incompletePlans };
  }
  const fs = require("fs");
  try {
    const files = fs.readdirSync(phaseDir);
    const planFiles = files.filter((f) => f.match(/^\d+-\d+-PLAN\.md$/));
    for (const file of planFiles) {
      plans.push(file);
      const summaryFile = file.replace("PLAN", "SUMMARY");
      if (!files.includes(summaryFile)) {
        incompletePlans.push(file);
      }
    }
  } catch {
  }
  return { plans, incompletePlans };
}

// src/index.ts
var args = process.argv.slice(2);
async function main() {
  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }
  const command = args[0];
  const commandArgs = args.slice(1);
  try {
    switch (command) {
      case "toon":
        await toonEncode(commandArgs);
        break;
      case "init":
        await initCommand(commandArgs);
        break;
      case "state":
        stateCommand(commandArgs);
        break;
      case "fm":
      case "frontmatter":
        frontmatterCommand(commandArgs);
        break;
      case "roadmap":
        roadmapCommand(commandArgs);
        break;
      case "config":
        configCommand(commandArgs);
        break;
      case "help":
      case "--help":
      case "-h":
        printHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Unknown error: ${error}`);
    }
    process.exit(1);
  }
}
function printHelp() {
  console.log(`
makeitdone tools \u2014 token-optimized utility for Claude Code orchestration

USAGE:
  mid-tools <command> [options]

COMMANDS:
  toon <file|->              Convert JSON to TOON or vice versa
                             Use '-' for stdin

  init <workflow> [phase]    Get workflow initialization payload (returns TOON)

  state <subcommand>         STATE.md operations
    get                      Read STATE.md as TOON
    set <key> <value>        Atomic field update
    advance <phase>          Mark phase as complete

  fm|frontmatter <subcommand>  YAML frontmatter operations
    get <file> --field <f>   Extract single frontmatter field
    list <file>              List all frontmatter fields (TOON)

  roadmap <subcommand>       ROADMAP.md queries
    phases                   List all phases (TOON)
    current                  Current active phase (TOON)
    phase <n>               Get phase details by number (TOON)

  config <subcommand>        .planning/config.json
    get <key>                Read config value
    set <key> <value>        Write config value

  help                       Show this help

EXAMPLES:
  node mid-tools.cjs toon data.json
  node mid-tools.cjs init execute 1
  node mid-tools.cjs state get
  node mid-tools.cjs roadmap phases
`);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
