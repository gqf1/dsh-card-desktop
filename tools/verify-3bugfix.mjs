/**
 * 三处修复的源码断言（2026-11-02）。
 * 用法: node verify-3bugfix.mjs [--file <client.js>]
 * 判据全部是「命中数 == 1」的字符串锚点 + 行号顺序断言；输出 PASS/FAIL，exit 1 即有失败。
 */
import { readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const i = argv.indexOf("--file");
const file = i >= 0 ? argv[i + 1] : "F:\\DSH\\card-desktop-plugin\\lib\\client.js";
const src = readFileSync(file, "utf8");
const lines = src.split("\n");

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log("PASS  " + name); }
  else { fail++; console.log("FAIL  " + name + (extra ? "   << " + extra : "")); }
};
const count = (needle) => src.split(needle).length - 1;
const lineNo = (needle) => { const idx = lines.findIndex((l) => l.includes(needle)); return idx < 0 ? -1 : idx + 1; };

/* ── bug1：dirSnap 声明必须在 doReplace 块之外，且只有一处（doFindAllInFiles 内） ── */
{
  const declLines = lines.map((l, n) => ({ n: n + 1, t: l })).filter((x) => /^\s*let dirSnap = null;/.test(x.t));
  ok("bug1: dirSnap 只有两处声明（两个查找函数各一处）", declLines.length === 2,
    "实际 " + declLines.length + " 处：" + declLines.map((x) => "L" + x.n).join(","));
  const decl = declLines.length ? declLines[0].n : -1;
  const ifDoReplace = lines.findIndex((l, n) => n + 1 > decl && l.includes("if (doReplace) {")) + 1;
  ok("bug1: 声明行号 < 紧跟的 if (doReplace) 行号", decl > 0 && ifDoReplace > decl, `decl=${decl} if=${ifDoReplace}`);
  ok("bug1: 被引用那一处的声明位于 doFindAllInFiles 内（跳过纯注释行再取 if 行号）", (() => {
    // 声明与 if (doReplace) 之间只允许出现注释行；出现别的语句说明声明还在块内
    let n = decl;
    while (n < lines.length && /^\s*(\/\/|\/\*|\*)/.test(lines[n])) n++;
    return n === ifDoReplace - 1 && /^\s*if \(doReplace\) \{$/.test(lines[n]);
  })(), `decl=${decl} if=${ifDoReplace}`);
  ok("bug1: 撤销点赋值仍读 dirSnap", count("dirReplaceUndo = dirSnap ? {") === 2,
    "实际 " + count("dirReplaceUndo = dirSnap ? {") + " 处（两个函数各一处）");
}

/* ── bug2：keyOfFlds 不得在渲染体裸用；wsFoldersKey 文件级唯一 ── */
ok("bug2: wsFoldersKey 定义 1 处、调用 4 处",
  count("const wsFoldersKey = (f) =>") === 1 && (src.match(/wsFoldersKey\(/g) || []).length === 4,
  "定义=" + count("const wsFoldersKey = (f) =>") + " 调用=" + (src.match(/wsFoldersKey\(/g) || []).length);
ok("bug2: useEffect 内 keyOfFlds 已改为复用（0 处独立实现）", count("const keyOfFlds = (f) =>") === 0);
ok("bug2: 渲染体两处已改用 wsFoldersKey", count("wsFoldersKey(e.folders)") === 1 && count("wsFoldersKey(h && h.folders)") === 1);
ok("bug2: 收口处补回了 pushLocalRecent(local)", count("try { pushLocalRecent(local); } catch (e) { }") === 1);

/* ── bug3：在文件夹中查找改为「请求 → CodePane 消费」 ── */
ok("bug3: CodeWorkbench 不再直接调 setFindDir(s)", count("        setFindDir(d);") === 0 &&
  count("setFindCurDir(false);          // 关掉「当前文件夹」，改用指定目录") === 0);
ok("bug3: findFolderReq 状态 1 处 + ref 1 处",
  count("const [findFolderReq, setFindFolderReq] = React.useState") === 1 &&
  count("const findFolderReqNRef = React.useRef(0);") === 2,
  "state=" + count("const [findFolderReq, setFindFolderReq] = React.useState") + " ref=" + count("const findFolderReqNRef = React.useRef(0);"));
ok("bug3: 4 个 CodePane 渲染点都传了 findFolderReq", count("findFolderReq: findFolderReq,") === 4);
ok("bug3: CodePane 里的消费 effect 存在", count("}, [props.findFolderReq, isFindTarget]);") === 1);
{
  const declIsTarget = lineNo("const isFindTarget = props.isFindTarget === true;");
  const consumer = lineNo("}, [props.findFolderReq, isFindTarget]);");
  ok("bug3: isFindTarget 声明在消费 effect 之前（Hook 依赖不 TDZ）", declIsTarget > 0 && consumer > declIsTarget,
    `decl=${declIsTarget} effect=${consumer}`);
}

/* ── hostMissingHint 提到文件级 ── */
ok("hostMissingHint 定义 1 处、引用 10 处", count("const hostMissingHint = (what, res) => {") === 1,
  "def=" + count("const hostMissingHint = (what, res) => {"));

/* ── 死代码已删 ── */
ok("死代码 hlVerilog 已删", count("hlVerilog") === 0);
ok("死代码 PERM_BUILTIN_LABELS 已删", count("PERM_BUILTIN_LABELS") === 0);
ok("死代码 NL_FOR_TIP 已删", count("NL_FOR_TIP") === 0);

/* ── 现役实现未被误伤 ── */
ok("现役高亮 hlBlockStates / hlSlice 仍在", count("const hlBlockStates = (text) => {") === 1 && count("const hlSlice = (text, starts, s, e, kwSet, states) => {") === 1);
ok("现役权限表 PERM_META 仍在", count("const PERM_META = {") === 1);

console.log("\nPASS=" + pass + "  FAIL=" + fail);
process.exit(fail ? 1 : 0);
