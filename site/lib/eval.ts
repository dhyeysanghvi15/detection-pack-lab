export type CompiledRule = NonNullable<import("./types").RuleDetail["compiled"]>;

export type Why = {
  matched_fields: Array<{ field: string; value: string }>;
  failed_clause: string | null;
  missing_fields: string[];
};

type SelectionResult = {
  matched: boolean;
  matched_fields: Array<{ field: string; value: string }>;
  missing_fields: string[];
  failed_clause: string | null;
};

function getPath(event: Record<string, any>, dotted: string): any {
  if (Object.prototype.hasOwnProperty.call(event, dotted)) return event[dotted];
  let cur: any = event;
  for (const part of dotted.split(".")) {
    if (cur == null || typeof cur !== "object" || !(part in cur)) return null;
    cur = cur[part];
  }
  return cur;
}

function stringify(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function asList(v: any): any[] {
  return Array.isArray(v) ? v : [v];
}

function coerceNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : null;
}

function matchOp(fieldValue: any, op: string, expected: any): boolean {
  const values = asList(fieldValue);

  if (op === "eq") return values.some((v) => v === expected);

  if (op === "contains") {
    const exp = stringify(expected).toLowerCase();
    return values.some((v) => stringify(v).toLowerCase().includes(exp));
  }
  if (op === "startswith") {
    const exp = stringify(expected).toLowerCase();
    return values.some((v) => stringify(v).toLowerCase().startsWith(exp));
  }
  if (op === "endswith") {
    const exp = stringify(expected).toLowerCase();
    return values.some((v) => stringify(v).toLowerCase().endsWith(exp));
  }
  if (op === "re") {
    const re = new RegExp(String(expected));
    return values.some((v) => re.test(stringify(v)));
  }

  if (op === "gt" || op === "gte" || op === "lt" || op === "lte") {
    const exp = coerceNumber(expected);
    if (exp == null) return false;
    for (const v of values) {
      const n = coerceNumber(v);
      if (n == null) continue;
      if (op === "gt" && n > exp) return true;
      if (op === "gte" && n >= exp) return true;
      if (op === "lt" && n < exp) return true;
      if (op === "lte" && n <= exp) return true;
    }
    return false;
  }

  return false;
}

function evaluateSelection(
  compiled: CompiledRule,
  selectionName: string,
  event: Record<string, any>
): SelectionResult {
  const clauses = compiled.selections[selectionName] || [];
  const matched_fields: Array<{ field: string; value: string }> = [];
  const missing_fields: string[] = [];

  for (const c of clauses) {
    const actual = getPath(event, c.field);
    if (actual == null) {
      missing_fields.push(c.field);
      return {
        matched: false,
        matched_fields,
        missing_fields,
        failed_clause: `missing field: ${c.field}`,
      };
    }
    const ok = c.values.some((v) => matchOp(actual, c.op, v));
    if (!ok) {
      return {
        matched: false,
        matched_fields,
        missing_fields,
        failed_clause: `${c.field} ${c.op} ${JSON.stringify(c.values)}`,
      };
    }
    matched_fields.push({ field: c.field, value: stringify(actual) });
  }

  return { matched: true, matched_fields, missing_fields, failed_clause: null };
}

type Node =
  | { t: "name"; name: string }
  | { t: "not"; child: Node }
  | { t: "and"; left: Node; right: Node }
  | { t: "or"; left: Node; right: Node };

function tokenizeCondition(text: string): string[] {
  const raw = text.match(/\(|\)|[A-Za-z0-9_]+/g) || [];
  return raw.map((t) => {
    const low = t.toLowerCase();
    return low === "and" || low === "or" || low === "not" ? low : t;
  });
}

class Parser {
  private tokens: string[];
  private pos = 0;
  constructor(text: string) {
    this.tokens = tokenizeCondition(text);
  }
  private peek() {
    return this.pos >= this.tokens.length ? null : this.tokens[this.pos];
  }
  private eat(expected?: string) {
    const tok = this.peek();
    if (tok == null) throw new Error("unexpected end of condition");
    if (expected && tok !== expected) throw new Error(`expected '${expected}' got '${tok}'`);
    this.pos += 1;
    return tok;
  }
  parse(): Node {
    const node = this.parseOr();
    if (this.peek() != null) throw new Error(`unexpected token: ${this.peek()}`);
    return node;
  }
  private parseOr(): Node {
    let node = this.parseAnd();
    while (this.peek() === "or") {
      this.eat("or");
      node = { t: "or", left: node, right: this.parseAnd() };
    }
    return node;
  }
  private parseAnd(): Node {
    let node = this.parseUnary();
    while (this.peek() === "and") {
      this.eat("and");
      node = { t: "and", left: node, right: this.parseUnary() };
    }
    return node;
  }
  private parseUnary(): Node {
    if (this.peek() === "not") {
      this.eat("not");
      return { t: "not", child: this.parseUnary() };
    }
    return this.parsePrimary();
  }
  private parsePrimary(): Node {
    const tok = this.peek();
    if (tok === "(") {
      this.eat("(");
      const node = this.parseOr();
      this.eat(")");
      return node;
    }
    if (tok == null) throw new Error("unexpected end of condition");
    this.eat();
    return { t: "name", name: tok };
  }
}

function evalNode(node: Node, mapping: Record<string, SelectionResult>): { ok: boolean; failed: string | null } {
  if (node.t === "name") {
    const r = mapping[node.name];
    if (!r) return { ok: false, failed: `unknown selection: ${node.name}` };
    return r.matched ? { ok: true, failed: null } : { ok: false, failed: node.name };
  }
  if (node.t === "not") {
    const inner = evalNode(node.child, mapping);
    return inner.ok ? { ok: false, failed: `not(${inner.failed || "true"})` } : { ok: true, failed: null };
  }
  if (node.t === "and") {
    const l = evalNode(node.left, mapping);
    if (!l.ok) return l;
    return evalNode(node.right, mapping);
  }
  if (node.t === "or") {
    const l = evalNode(node.left, mapping);
    if (l.ok) return { ok: true, failed: null };
    const r = evalNode(node.right, mapping);
    if (r.ok) return { ok: true, failed: null };
    return { ok: false, failed: l.failed || r.failed };
  }
  return { ok: false, failed: "unknown node" };
}

function primarySelection(condition: string, compiled: CompiledRule): string | null {
  for (const tok of tokenizeCondition(condition)) {
    if (tok === "and" || tok === "or" || tok === "not" || tok === "(" || tok === ")") continue;
    if (tok in compiled.selections) return tok;
  }
  return null;
}

export function evaluateCompiledRule(compiled: CompiledRule, event: Record<string, any>) {
  const mapping: Record<string, SelectionResult> = {};
  for (const name of Object.keys(compiled.selections)) {
    mapping[name] = evaluateSelection(compiled, name, event);
  }

  try {
    const ast = new Parser(compiled.condition).parse();
    const res = evalNode(ast, mapping);
    if (res.ok) {
      const p = primarySelection(compiled.condition, compiled);
      const mf = p ? mapping[p]?.matched_fields || [] : [];
      return { matched: true, why: { matched_fields: mf, failed_clause: null, missing_fields: [] } satisfies Why };
    }
    if (res.failed && mapping[res.failed]) {
      const r = mapping[res.failed];
      return {
        matched: false,
        why: {
          matched_fields: r.matched_fields,
          failed_clause: r.failed_clause || res.failed,
          missing_fields: r.missing_fields,
        } satisfies Why,
      };
    }
    const missing = Array.from(new Set(Object.values(mapping).flatMap((m) => m.missing_fields))).sort();
    return { matched: false, why: { matched_fields: [], failed_clause: res.failed, missing_fields: missing } satisfies Why };
  } catch (e: any) {
    return {
      matched: false,
      why: { matched_fields: [], failed_clause: `bad condition: ${String(e?.message || e)}`, missing_fields: [] } satisfies Why,
    };
  }
}

