/**
 * 大 bundle 静态门禁 v2：作用域解析（未声明标识符 + TDZ 先用后声明）
 * 用法: node _gate_scope.mjs <bundle.js> <out.txt>
 *
 * 判据要点（来自 hand-bundle-static-gates 技能）：
 *  1. 立即求值位置才判 TDZ；跨过函数边界的引用是惰性的，不算。
 *  2. 惰性函数体内的「未声明标识符」仍然要报（技能里 callJS 那类只在点击时炸的错就是它）。
 *  3. 必须先拿带缺陷的夹具做反向验证，确认门禁不是空转绿灯。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let acorn;
try { acorn = require("acorn"); } catch (e) { acorn = require("C:\\Users\\Administrator\\.dsh\\profiles\\desktop\\node_modules\\acorn"); }

const target = process.argv[2];
const outPath = process.argv[3];
const src = readFileSync(target, "utf8");

let ast;
try {
  ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "script", allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
} catch (e) {
  ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module", allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
}

const GLOBALS = new Set([
  "window","document","console","localStorage","sessionStorage","navigator","location","history",
  "fetch","setTimeout","clearTimeout","setInterval","clearInterval","requestAnimationFrame","cancelAnimationFrame",
  "Promise","Object","Array","String","Number","Boolean","JSON","Math","Date","RegExp","Error","TypeError",
  "RangeError","SyntaxError","ReferenceError","EvalError","URIError","Map","Set","WeakMap","WeakSet","Symbol",
  "Proxy","Reflect","Intl","URL","URLSearchParams","Blob","File","FileReader","FormData","Headers","Request",
  "Response","AbortController","AbortSignal","TextEncoder","TextDecoder","atob","btoa","parseInt","parseFloat",
  "isNaN","isFinite","encodeURIComponent","decodeURIComponent","encodeURI","decodeURI","structuredClone",
  "queueMicrotask","globalThis","undefined","NaN","Infinity","arguments","ResizeObserver","IntersectionObserver",
  "MutationObserver","performance","crypto","Event","CustomEvent","KeyboardEvent","MouseEvent","DragEvent",
  "DataTransfer","ClipboardEvent","HTMLElement","Element","Node","XMLHttpRequest","WebSocket","Image","Audio",
  "Option","DOMParser","CSS","getComputedStyle","matchMedia","scrollTo","alert","confirm","prompt","open","close",
  "print","postMessage","addEventListener","removeEventListener","dispatchEvent","self","top","parent","frames",
  "indexedDB","caches","Notification","MessageChannel","MessagePort","ArrayBuffer","Uint8Array","Uint16Array",
  "Uint32Array","Int8Array","Int16Array","Int32Array","Float32Array","Float64Array","DataView","BigInt",
  "FinalizationRegistry","WeakRef","AggregateError","Function","process","require","module","exports","Buffer",
  "setImmediate","clearImmediate","Icon","SharedWorker","Worker","PerformanceObserver","CSSStyleSheet",
  "MediaQueryList","DomParser","Text","Comment","DocumentFragment","Range","Selection","FileList","TouchEvent",
  "WheelEvent","PointerEvent","FocusEvent","InputEvent","CompositionEvent","MediaStream","AudioContext",
  "webkitURL","DOMMatrix","Path2D","CanvasRenderingContext2D","OffscreenCanvas","readline","global",
]);

const decls = [];   // { name, scope, tdzPos, lazyFrom? }
const refs = [];    // { name, scope, pos }
const scopeOf = new WeakMap();

class Scope {
  constructor(kind, parent, fnStart) { this.kind = kind; this.parent = parent; this.names = new Map(); this.fnStart = fnStart || null; }
  add(name, tdzPos) { if (!this.names.has(name)) this.names.set(name, tdzPos); }
  find(name) {
    let s = this;
    while (s) { if (s.names.has(name)) return { scope: s, tdzPos: s.names.get(name) }; s = s.parent; }
    return null;
  }
  chain() {
    const out = [];
    for (let s = this; s; s = s.parent) if (s.kind === "function") out.push(s.fnStart);
    return out;
  }
}

const lineOf = (pos) => { let n = 1; for (let i = 0; i < pos && i < src.length; i++) if (src[i] === "\n") n++; return n; };

function patNames(p, out = []) {
  if (!p) return out;
  switch (p.type) {
    case "Identifier": out.push(p.name); break;
    case "ObjectPattern": for (const pr of p.properties) { if (pr.type === "RestElement") patNames(pr.argument, out); else patNames(pr.value, out); } break;
    case "ArrayPattern": for (const el of p.elements) if (el) patNames(el, out); break;
    case "AssignmentPattern": patNames(p.left, out); break;
    case "RestElement": patNames(p.argument, out); break;
    default: break;
  }
  return out;
}

/* ---- 第一遍：建作用域树 + 登记声明 ---- */
function declare(stmts, scope) {
  for (const st of stmts) {
    if (st.type === "FunctionDeclaration" && st.id) { scope.add(st.id.name, null); continue; }
    if (st.type === "ImportDeclaration") {
      for (const sp of st.specifiers) if (sp.local) scope.add(sp.local.name, null);
      continue;
    }
    if (st.type === "ClassDeclaration" && st.id) { scope.add(st.id.name, st.start); continue; }
    if (st.type === "VariableDeclaration") {
      for (const d of st.declarations) for (const n of patNames(d.id)) scope.add(n, st.kind === "var" ? null : d.start);
      continue;
    }
    if ((st.type === "ExportNamedDeclaration" || st.type === "ExportDefaultDeclaration") && st.declaration) {
      declare([st.declaration], scope);
    }
  }
}

/* var / function 提升到最近的函数作用域；遍历时遇到嵌套函数就停 */
function hoist(stmts, fnScope) {
  const visit = (n) => {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "FunctionDeclaration") { if (n.id) fnScope.add(n.id.name, null); return; }
    if (n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression" || n.type === "ClassDeclaration" || n.type === "ClassExpression") return;
    if (n.type === "VariableDeclaration") {
      if (n.kind === "var") for (const d of n.declarations) for (const nm of patNames(d.id)) fnScope.add(nm, null);
      return;
    }
    for (const k of Object.keys(n)) {
      if (k === "type" || k === "start" || k === "end") continue;
      const v = n[k];
      if (Array.isArray(v)) for (const c of v) if (c && c.type) visit(c);
      else if (v && v.type) visit(v);
    }
  };
  for (const st of stmts) visit(st);
}

/* ---- 单遍遍历：同时建 scope、登记声明、收集引用 ---- */
function visit(node, scope) {
  if (!node || typeof node.type !== "string") return;
  const T = node.type;

  if (T === "Program") {
    const s = new Scope("program", null);
    declare(node.body, s);
    for (const st of node.body) visit(st, s);
    scopeOf.set(node, s);
    return s;
  }

  if (T === "FunctionDeclaration" || T === "FunctionExpression" || T === "ArrowFunctionExpression") {
    const fnS = new Scope("function", scope);
    for (const p of node.params) for (const n of patNames(p)) fnS.add(n, null);
    if (T === "FunctionExpression" && node.id) fnS.add(node.id.name, null);
    if (node.body.type === "BlockStatement") {
      hoist(node.body.body, fnS);
      const bs = new Scope("block", fnS);
      declare(node.body.body, bs);
      for (const p of node.params) patRefs(p, fnS);
      for (const st of node.body.body) visit(st, bs);
    } else {
      for (const p of node.params) patRefs(p, fnS);
      visit(node.body, fnS);
    }
    return;
  }

  if (T === "BlockStatement") {
    const s = new Scope("block", scope);
    declare(node.body, s);
    for (const st of node.body) visit(st, s);
    return;
  }

  if (T === "ForStatement" || T === "ForInStatement" || T === "ForOfStatement") {
    let s = scope;
    const head = T === "ForStatement" ? node.init : node.left;
    if (head && head.type === "VariableDeclaration" && head.kind !== "var") {
      s = new Scope("block", scope);
      for (const d of head.declarations) for (const n of patNames(d.id)) s.add(n, d.start);
    }
    if (T === "ForStatement") {
      if (node.init) visit(node.init, s);
      if (node.test) visit(node.test, s);
      if (node.update) visit(node.update, s);
    } else {
      visit(node.left, s);
      visit(node.right, s);
    }
    visit(node.body, s);
    return;
  }

  if (T === "CatchClause") {
    const s = new Scope("block", scope);
    if (node.param) for (const n of patNames(node.param)) s.add(n, null);
    visit(node.body, s);
    return;
  }

  if (T === "ClassDeclaration" || T === "ClassExpression") {
    const s = new Scope("block", scope);
    if (node.id) s.add(node.id.name, null);
    if (node.superClass) visit(node.superClass, scope);
    for (const b of node.body.body) { if (b.computed && b.key) visit(b.key, s); if (b.value) visit(b.value, s); }
    return;
  }

  if (T === "VariableDeclaration") {
    for (const d of node.declarations) { patRefs(d.id, scope); if (d.init) visit(d.init, scope); }
    return;
  }

  if (T === "Identifier") { refs.push({ name: node.name, scope, pos: node.start }); return; }

  if (T === "MemberExpression") { visit(node.object, scope); if (node.computed) visit(node.property, scope); return; }
  if (T === "Property") { if (node.computed) visit(node.key, scope); visit(node.value, scope); return; }
  if (T === "PropertyDefinition" || T === "MethodDefinition") { if (node.computed && node.key) visit(node.key, scope); if (node.value) visit(node.value, scope); return; }
  if (T === "LabeledStatement") { visit(node.body, scope); return; }
  if (T === "BreakStatement" || T === "ContinueStatement" || T === "MetaProperty" || T === "PrivateIdentifier") return;
  if (T === "ImportDeclaration" || T === "ExportAllDeclaration") return;
  if (T === "ExportNamedDeclaration") { if (node.declaration) visit(node.declaration, scope); if (node.source) return; for (const sp of node.specifiers || []) if (sp.local) visit(sp.local, scope); return; }
  if (T === "ExportDefaultDeclaration") { visit(node.declaration, scope); return; }

  for (const k of Object.keys(node)) {
    if (k === "type" || k === "start" || k === "end") continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) if (c && c.type) visit(c, scope); }
    else if (v && v.type) visit(v, scope);
  }
}

function patRefs(p, scope) {
  if (!p) return;
  switch (p.type) {
    case "Identifier": return;
    case "AssignmentPattern": patRefs(p.left, scope); visit(p.right, scope); return;
    case "ObjectPattern": for (const pr of p.properties) { if (pr.type === "RestElement") patRefs(pr.argument, scope); else { if (pr.computed) visit(pr.key, scope); patRefs(pr.value, scope); } } return;
    case "ArrayPattern": for (const el of p.elements) if (el) patRefs(el, scope); return;
    case "RestElement": patRefs(p.argument, scope); return;
    default: visit(p, scope);
  }
}

const programScope = visit(ast, null);

/* ---- 判定 ---- */
const undeclared = [];
const tdz = [];
for (const r of refs) {
  const hit = r.scope.find(r.name);
  if (!hit) {
    if (!GLOBALS.has(r.name)) undeclared.push(`UNDECLARED ${r.name} @line ${lineOf(r.pos)}`);
    continue;
  }
  if (hit.tdzPos === null) continue;
  if (hit.tdzPos > r.pos) {
    // 跨函数边界即惰性，不算 TDZ
    let crossed = false;
    for (let s = r.scope; s && s !== hit.scope; s = s.parent) if (s.kind === "function") { crossed = true; break; }
    if (!crossed) tdz.push(`TDZ ${r.name} @line ${lineOf(r.pos)} decl@line ${lineOf(hit.tdzPos)}`);
  }
}

const uniq = (a) => [...new Set(a)];
writeFileSync(outPath, [
  "FILE=" + target,
  "lines=" + src.split("\n").length,
  "refs=" + refs.length,
  "UNDECLARED=" + uniq(undeclared).length,
  ...uniq(undeclared),
  "",
  "TDZ=" + uniq(tdz).length,
  ...uniq(tdz),
].join("\n"), "utf8");
console.log("written " + outPath + " refs=" + refs.length + " undeclared=" + uniq(undeclared).length + " tdz=" + uniq(tdz).length);
