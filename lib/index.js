import { readdir, readFile, stat, writeFile, mkdir, access, rename, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, basename, sep, join, resolve } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const name = "dsh-card-desktop";
// webRuntime 只用于读取 trustedHosts（fence 的局域网信任名单），属**可选**依赖：
// 放进 inject 会在它未就绪时让整个 host 插件停在等待态，/desk/api 全部不可用。
// 改为 ctx.get("webRuntime") 可选获取（见 apply）。
export const inject = ["webServer"];

/* ------------------------------------------------------------------ */
/* 工具                                                               */
/* ------------------------------------------------------------------ */
const fail = (e) => {
  const msg = e && e.message ? e.message : String(e);
  const code = e && e.code ? e.code : "UNKNOWN";
  return { ok: false, error: msg, code };
};

const base = (path) => {
  const parts = String(path).split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(path);
};

let gbkDecoder = null;
try { gbkDecoder = new TextDecoder("gbk"); } catch (e) { gbkDecoder = null; }
// 严格版：只用于判断「这份字节是不是合法 GBK」。非严格版 decode 永不抛错（无效序列输出 U+FFFD），
// 会让所有非法字节都被当成 gbk、latin1 兜底成为死代码。建编码表仍用非严格版（要遍历含无效槽位的全区）。
let gbkDecoderStrict = null;
try { gbkDecoderStrict = new TextDecoder("gbk", { fatal: true }); } catch (e) { gbkDecoderStrict = null; }

const utf8Strict = new TextDecoder("utf-8", { fatal: true });
const utf8Loose = new TextDecoder("utf-8", { fatal: false });

/* 数一遍「非法 UTF-8 字节」有多少（宽松解码会把每个非法序列变成 U+FFFD，这里直接数字节，
   比数 U+FFFD 更准：文件里本来就可能存在合法的 U+FFFD 字符）。
   口径与 TextDecoder 一致：一个非法序列算它实际占用的起始字节，后续不合法字节逐个再算。 */
function countBadUtf8Bytes(bytes) {
  let i = 0, bad = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) { i++; continue; }
    let need = 0, min = 0;
    if (b >= 0xc2 && b <= 0xdf) { need = 1; min = 0x80; }
    else if (b >= 0xe0 && b <= 0xef) { need = 2; min = 0x800; }
    else if (b >= 0xf0 && b <= 0xf4) { need = 3; min = 0x10000; }
    else { bad++; i++; continue; }
    let ok = true, cp = b & (0x3f >> need);
    for (let k = 1; k <= need; k++) {
      const c = bytes[i + k];
      if (c === undefined || c < 0x80 || c > 0xbf) { ok = false; break; }
      cp = (cp << 6) | (c & 0x3f);
    }
    if (!ok || cp < min || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) { bad++; i++; continue; }
    i += 1 + need;
  }
  return bad;
}

/** 解码 bytes：先 UTF-8 严格，失败再按「坏字节占比」决定是否仍按 UTF-8，否则 GBK，最后 latin1。
    返回 {text, encoding, lossy?}
    ★ 为什么不能只看「严格 UTF-8 是否成功」：严格解码是**整份一次性**的，一个坏字节就会让整份失败。
      实测 RFSOC.v 的 1026 个非 ASCII 字节里只有 84 个非法（8.2%），却被整体判成 GBK —— 编辑器里
      中文注释全部变成「鏃堕挓」这种乱码（Vivado 按 GBK 读也是同样结果）。
      而真 GBK 文件的「非法 UTF-8 字节占比」实测在 55%~100%（中文双字节基本都不是合法 UTF-8）。
      所以按占比分流：低于阈值且样本充足 → 仍按 UTF-8（代价只是少量 U+FFFD），否则维持原回退。
      阈值 0.25 + 样本 64 字节，是用 E:\FPGA_study 下 5564 个源文件回归出来的：
      10 个文件判定改变，全部经人工确认为「修好了」，0 个误判。 */
function decodeBytes(bytes) {
  if (!bytes || bytes.length === 0) return { text: "", encoding: "utf8" };
  try {
    return { text: utf8Strict.decode(bytes), encoding: "utf8" };
  } catch (e) { /* not utf8 */ }
  let nonAscii = 0;
  for (let i = 0; i < bytes.length; i++) if (bytes[i] > 0x7f) nonAscii++;
  if (nonAscii >= 64 && countBadUtf8Bytes(bytes) / nonAscii < 0.25) {
    return { text: utf8Loose.decode(bytes), encoding: "utf8", lossy: true };
  }
  if (gbkDecoderStrict) {
    try { return { text: gbkDecoderStrict.decode(bytes), encoding: "gbk" }; } catch (e) { /* 非法 GBK → 走 latin1 兜底 */ }
  } else if (gbkDecoder) {
    try { return { text: gbkDecoder.decode(bytes), encoding: "gbk" }; } catch (e) { }
  }
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return { text: s, encoding: "latin1" };
}

/** 二进制启发：前 4096 字节 NUL 比例 > 1% */
function looksBinary(bytes) {
  if (!bytes || bytes.length === 0) return false;
  const sample = Math.min(bytes.length, 4096);
  let nul = 0;
  for (let i = 0; i < sample; i++) if (bytes[i] === 0) nul++;
  return nul > sample * 0.01;
}

/* GBK 编码表（懒构建）：遍历全部 GBK 双字节区解码出 char→bytes 映射 */
let gbkEncoder = null;
function buildGbkEncoder() {
  if (!gbkDecoder) return null;
  const map = {};
  for (let b = 0; b < 0x80; b++) map[String.fromCharCode(b)] = [b];
  const seqs = [];
  for (let lead = 0x81; lead <= 0xfe; lead++) {
    for (let trail = 0x40; trail <= 0xfe; trail++) {
      if (trail === 0x7f) continue;
      seqs.push([lead, trail]);
    }
  }
  const buf = new Uint8Array(seqs.length * 2);
  seqs.forEach(([a, b], i) => { buf[i * 2] = a; buf[i * 2 + 1] = b; });
  let decoded = "";
  try { decoded = gbkDecoder.decode(buf); } catch (e) { return null; }
  for (let i = 0; i < seqs.length; i++) {
    const ch = decoded[i];
    // 首次出现优先（不覆盖）：GBK 里存在多映射字符——例如全角空格 U+3000 同时对应
    // A1A1 与 A3A0。若让后出现的覆盖前者，写回时会把原文的 A1A1 变成 A3A0：
    // 文本没变、字节变了，却会让往返校验误判「不可无损回写」。取首个更规范的映射。
    if (ch !== "\uFFFD" && map[ch] === void 0) map[ch] = seqs[i];
  }
  return map;
}
function encodeGbk(text) {
  if (gbkEncoder === null) gbkEncoder = buildGbkEncoder();
  if (!gbkEncoder) return null;
  const out = [];
  let lost = 0;
  const lostChars = new Set();          // 去重后的表外字符（供客户端展示并让用户决定是否替换成 ?）
  for (const ch of text) {
    const bytes = gbkEncoder[ch];
    // 注意：ASCII 映射是单字节 [b]，双字节区字符是 [lead, trail]——必须按实际长度 push，
    // 否则 bytes[1] 为 undefined 会被 Uint8Array 变成 0，导致每个 ASCII 字符后多一个 0 字节（破坏文件）
    if (bytes) {
      if (bytes.length === 1) out.push(bytes[0]);
      else out.push(bytes[0], bytes[1]);
    } else { lost++; if (lostChars.size < 24) lostChars.add(ch); out.push(0x3f); /* '?' */ }
  }
  // lost = 表外字符数（emoji / GB18030 四字节区）：写盘前必须让调用方知道，
  // 否则这些字符会被静默写成 '?' 且不可逆。
  return { bytes: Uint8Array.from(out), lost, lostChars: Array.from(lostChars).join("") };
}

/* ------------------------------------------------------------------ */
/* RTL 扫描（自 pkg-7 host 逻辑）                                      */
/* ------------------------------------------------------------------ */
const skipDirSuffixes = [".runs", ".cache", ".hw", ".ip_user_files", ".xil", ".hbs", ".data", ".remote_cache", ".hw_handoff", ".sim", ".gen", ".ipdefs", ".srcs"];
const skipDirExact = ["node_modules", ".git", ".svn", "build", "dist", ".next", "target", "bin", "obj", "__pycache__"];
// 查找（findInFiles/replaceInFiles）专用：只避开版本库/依赖等真正无意义的目录。
// 注意：不要复用 skipDirSuffixes——那里为了 Ctrl+P/层级扫描 避开了 .srcs/.gen/.runs 等，
// 而那些正是 Vivado 工程存放 RTL 的目录，查找时若跳过就会"扫描 0 个文件"。
const findSkipDirExact = ["node_modules", ".git", ".svn", ".hg", "__pycache__", ".idea", ".vscode"];
// Vivado/ISE 工程目录（以 "." 开头但属于正常工程结构，不算"隐藏目录"，查找时应进入）
const VIVADO_PROJ_DIRS = new Set([".srcs", ".gen", ".runs", ".sim", ".cache", ".hw", ".ip_user_files", ".ipdefs", ".xil", ".hbs", ".data", ".remote_cache", ".hw_handoff"]);
const shouldSkipDir = (n) => {
  const lower = n.toLowerCase();
  if (skipDirExact.includes(lower)) return true;
  return skipDirSuffixes.some((s) => lower.endsWith(s));
};

async function collectRtlFiles(dirPath, out, depth) {
  if (depth > 30 || out.length >= 8000) return;
  let entries;
  try { entries = await readdir(dirPath, { withFileTypes: true }); } catch (e) { return; }
  for (const entry of entries) {
    if (out.length >= 8000) return;
    const name = entry.name;
    const full = dirPath + "\\" + name;
    if (entry.isDirectory()) {
      if (name.startsWith(".") || shouldSkipDir(name)) continue;
      await collectRtlFiles(full, out, depth + 1);
    } else if (entry.isFile()) {
      const lower = name.toLowerCase();
      if (lower.endsWith(".v") || lower.endsWith(".sv") || lower.endsWith(".vh")) {
        out.push({ path: full, name });
      }
    }
  }
}

async function findXpr(dirPath, depth) {
  if (depth > 2) return null;
  let entries;
  try { entries = await readdir(dirPath, { withFileTypes: true }); } catch (e) { return null; }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".xpr")) return dirPath + "\\" + entry.name;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith(".") && !shouldSkipDir(entry.name)) {
      const found = await findXpr(dirPath + "\\" + entry.name, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** 解析 .xpr：FileSet 按 Type 聚合为 4 类；$PSRCDIR 等宏展开为绝对路径（反斜杠） */
function parseXpr(text, xprDir, xprName) {
  const srcDir = xprDir + "\\" + xprName + ".srcs";
  const genDir = xprDir + "\\" + xprName + ".gen";
  // 聚合容器：同一 Type 的多个 FileSet（尤其大量 BlockSrcs IP）合并到一组
  const groups = {
    design: { kind: "design", label: "Design Sources", top: "", files: [] },
    constraints: { kind: "constraints", label: "Constraints", top: "", files: [] },
    simulation: { kind: "simulation", label: "Simulation Sources", top: "", files: [] },
    utility: { kind: "utility", label: "Utility Sources", top: "", files: [] }
  };
  const fsRe = /<FileSet\s+Name="([^"]+)"\s+Type="([^"]+)"[^>]*>([\s\S]*?)<\/FileSet>/g;
  let m;
  while ((m = fsRe.exec(text))) {
    const name = m[1];
    const type = m[2];
    const body = m[3];
    const topM = body.match(/<Option\s+Name="(?:TopModule|Top)"\s+Val="([^"]*)"/);
    const top = topM ? topM[1] : "";
    // 按 Type 归类；DesignSrcs 与 BlockSrcs（IP/BD）都进 Design Sources
    let kind;
    if (type === "Constrs") kind = "constraints";
    else if (type === "SimulationSrcs") kind = "simulation";
    else if (type === "Utils") kind = "utility";
    else kind = "design";
    const g = groups[kind];
    if (type === "DesignSrcs" && top) g.top = top; // TopModule 只存在于 sources_1
    const fRe = /<File\s+Path="([^"]+)"/g;
    let f;
    while ((f = fRe.exec(body))) {
      let path = f[1];
      path = path.replace(/\$PSRCDIR/g, srcDir).replace(/\$PPRDIR/g, xprDir).replace(/\$PGENDIR/g, genDir);
      path = path.replace(/\//g, "\\");
      if (!g.files.includes(path)) g.files.push(path);
    }
  }
  return [groups.design, groups.constraints, groups.simulation, groups.utility];
}

const isExcludedTop = (n) => {
  const lower = n.toLowerCase();
  return lower.includes("_exdes") || lower.includes("_tb") || lower.includes("_testbench") || lower.includes("_sim") || lower.includes("example") || lower.includes("tb_");
};

/** 去注释（保留行数对齐）：// 与 /* *\/ */
function stripComments(lines) {
  let inBlock = false;
  return lines.map((line) => {
    let out = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inBlock) {
        if (ch === "*" && line[i + 1] === "/") { inBlock = false; i++; }
      } else if (ch === "/" && line[i + 1] === "/") {
        break;
      } else if (ch === "/" && line[i + 1] === "*") {
        inBlock = true; i++;
      } else {
        out += ch;
      }
    }
    return out;
  });
}

/**
 * 在单模块体文本（去注释后）内扫描实例化声明。
 * 支持：模块名 [ #( 参数跨行嵌套括号 ) ] 实例名 (|[  单行或多行混合。
 * 返回 [{ module, name, line }]，line 为相对文本首行的 1 基行号。
 */
function extractInstances(text, known) {
  const out = [];
  const isIdStart = (c) => /[A-Za-z_]/.test(c || "");
  const isIdChar = (c) => /[A-Za-z0-9_$]/.test(c || "");
  const n = text.length;
  const ws = (k) => { while (k < n && /\s/.test(text[k])) k++; return k; };
  const lineOf = (pos) => {
    let ln = 1;
    for (let k2 = 0; k2 < pos && k2 < n; k2++) if (text[k2] === "\n") ln++;
    return ln;
  };
  // 从 pos（须指向开括号）配平，返回闭括号之后的索引；失败返回 -1
  const balancedEnd = (pos, open, close) => {
    let depth = 0;
    for (let k = pos; k < n; k++) {
      const c = text[k];
      if (c === '"') { // 双引号字符串；Verilog 单引号是数字基数标记（12'h004），非字符串
        k++;
        while (k < n && text[k] !== '"') { if (text[k] === "\\") k++; k++; }
        continue;
      }
      if (c === open) depth++;
      else if (c === close) { depth--; if (depth === 0) return k + 1; }
    }
    return -1;
  };
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (c === '"') { // 双引号字符串整体跳过；单引号是数字基数（'b/'h），不算字符串
      i++;
      while (i < n && text[i] !== '"') { if (text[i] === "\\") i++; i++; }
      if (i < n) i++;
      continue;
    }
    if (!isIdStart(c)) { i++; continue; }
    let j = i;
    while (j < n && isIdChar(text[j])) j++;
    const modTok = text.slice(i, j);
    i = j; // 主游标推进到 token 末尾
    if (!known.has(modTok)) continue;
    // 尝试解析完整实例模式（全部用局部游标，失败不影响主游标 i）
    let k = j;
    // 可选 #(...)
    let afterParam = k;
    {
      let k2 = ws(k);
      if (text[k2] === "#") {
        k2 = ws(k2 + 1);
        if (text[k2] === "(") {
          const end = balancedEnd(k2, "(", ")");
          if (end >= 0) afterParam = end;
          else continue; // 括号永不闭合（截断文件），放弃
        }
      }
    }
    // 读实例名
    let k3 = ws(afterParam);
    if (k3 >= n || !isIdStart(text[k3])) continue;
    let k4 = k3;
    while (k4 < n && isIdChar(text[k4])) k4++;
    const instTok = text.slice(k3, k4);
    // 实例名后须紧跟 ( 或 [
    let k5 = ws(k4);
    if (k5 >= n || (text[k5] !== "(" && text[k5] !== "[")) continue;
    out.push({ module: modTok, name: instTok, line: lineOf(i - modTok.length) });
    // 跳过整个实例连接体，防止端口映射中的标识符误报
    const endBody = balancedEnd(k5, text[k5] === "(" ? "(" : "[", text[k5] === "(" ? ")" : "]");
    if (endBody >= 0) {
      i = endBody;
      const semi = ws(endBody);
      if (semi < n && text[semi] === ";") i = semi + 1;
    }
  }
  return out;
}

/* 没有 .xpr 的目录只能「递归收集 RTL → 逐个读取解析」，一个 16 GB / 2.7 万文件的
   目录会把 host 卡住几分钟（实测用户的 E:\FPGA_study：27261 个 RTL / 16.1 GB）。
   所以默认只解析前 NOXPR_LIMIT 个文件并在返回里标明被截断；
   用户显式要求（allowLarge=true）时才做全量。 */
const NOXPR_LIMIT = 400;
async function scanRtl(rootPath, opts) {
  const allowLarge = !!(opts && opts.allowLarge);
  const xprPath = await findXpr(rootPath, 0);
  let fileSets = [];
  let designFiles = [];
  let xprTop = "";
  let xprFound = false;
  if (xprPath) {
    let xprText = "";
    try {
      const st = await stat(xprPath);
      if (st.size <= 4 * 1024 * 1024) {
        const buf = await readFile(xprPath);
        xprText = decodeBytes(buf).text;
      }
    } catch (e) { }
    if (xprText) {
      xprFound = true;
      const xprDir = xprPath.replace(/[\\/][^\\/]+$/g, "");
      const xprName = base(xprPath).replace(/\.xpr$/i, "");
      fileSets = parseXpr(xprText, xprDir, xprName);
      for (const fsItem of fileSets) {
        if (fsItem.kind === "design") xprTop = fsItem.top;
        fsItem.files.forEach((fp) => {
          const lower = fp.toLowerCase();
          if (lower.endsWith(".v") || lower.endsWith(".sv") || lower.endsWith(".vh")) {
            designFiles.push({ path: fp, name: base(fp) });
          }
        });
      }
    }
  }
  if (!xprFound) await collectRtlFiles(rootPath, designFiles, 0);

  /* 无工程文件时的截断闸门：先记下总数，再按上限裁剪（fileCount 报的是实际解析数） */
  let noXprTotal = 0;
  let noXprTruncated = false;
  if (!xprFound) {
    noXprTotal = designFiles.length;
    if (!allowLarge && designFiles.length > NOXPR_LIMIT) {
      designFiles = designFiles.slice(0, NOXPR_LIMIT);
      noXprTruncated = true;
    }
  }

  const moduleDefs = new Map();
  const fileTexts = new Map();
  const skipped = [];
  for (const f of designFiles) {
    let text;
    try {
      const st = await stat(f.path);
      if (st.size > 8 * 1024 * 1024) { skipped.push(f.path); continue; }
      const buf = await readFile(f.path);
      text = decodeBytes(buf).text;
    } catch (e) { skipped.push(f.path); continue; }
    const lines = text.split("\n");
    const cleanLines = stripComments(lines);
    fileTexts.set(f.path, { lines, cleanLines });
    for (let i = 0; i < cleanLines.length; i++) {
      const mm = cleanLines[i].match(/^\s*module\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (mm && !moduleDefs.has(mm[1])) moduleDefs.set(mm[1], { file: f.path, line: i + 1 });
    }
  }

  const known = new Set(moduleDefs.keys());
  const modules = {};
  moduleDefs.forEach((def, nm) => { modules[nm] = { file: def.file, line: def.line, instances: [] }; });

  // 跨行实例收集：先定位每个 module 的起止区间，再在区间文本上做 token + 括号配平扫描
  // 识别  known模块名 [ #(配平括号) ] 实例名 (|[   —— 参数可跨行、可嵌套
  for (const f of designFiles) {
    const rec = fileTexts.get(f.path);
    if (!rec) continue;
    const cleanLines = rec.cleanLines;
    // 模块区间定位（Verilog module 不嵌套）
    const ranges = [];
    const stk = [];
    for (let i = 0; i < cleanLines.length; i++) {
      const md = cleanLines[i].match(/^\s*module\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (md) { stk.push({ name: md[1], start: i }); continue; }
      if (/^\s*endmodule\b/.test(cleanLines[i])) {
        const top = stk.pop();
        if (top) ranges.push({ name: top.name, start: top.start, end: i });
      }
    }
    for (const r of ranges) {
      const body = cleanLines.slice(r.start, r.end + 1).join("\n");
      const insts = extractInstances(body, known);
      insts.forEach((inst) => {
        const parentMod = modules[r.name];
        if (parentMod) parentMod.instances.push({ name: inst.name, module: inst.module, file: f.path, line: r.start + inst.line });
      });
    }
  }

  const instantiated = new Set();
  Object.values(modules).forEach((mm) => mm.instances.forEach((inst) => instantiated.add(inst.module)));
  let topNames = [];
  if (xprTop && modules[xprTop]) topNames = [xprTop];
  else topNames = Array.from(moduleDefs.keys()).filter((nm) => !instantiated.has(nm) && !isExcludedTop(nm));

  // 节点预算：buildTree 只防环、不防菱形依赖——k 层扇出会让节点数按 k^h 展开（大工程内存暴涨/卡死）。
  // 超出预算的分支直接截断，宁可少展开几层，也不把 host 拖死。
  let treeBudget = 20000;
  let treeTruncated = false;
  const buildTree = (nm, visited) => {
    if (visited.has(nm)) return { module: nm, name: "", file: (modules[nm] && modules[nm].file) || "", line: (modules[nm] && modules[nm].line) || 0, cycle: true, instances: [] };
    if (--treeBudget <= 0) { treeTruncated = true; return { module: nm, name: "", file: (modules[nm] && modules[nm].file) || "", line: (modules[nm] && modules[nm].line) || 0, truncated: true, instances: [] }; }
    const next = new Set(visited);
    next.add(nm);
    const mm = modules[nm];
    if (!mm) return { module: nm, name: "", file: "", line: 0, instances: [] };
    return {
      module: nm,
      name: "",
      file: mm.file,
      line: mm.line,
      instances: mm.instances.map((inst) => {
        const sub = buildTree(inst.module, next);
        return {
          name: inst.name,
          module: inst.module,
          file: (modules[inst.module] && modules[inst.module].file) || inst.file,
          line: (modules[inst.module] && modules[inst.module].line) || inst.line,
          cycle: false,
          instances: sub.instances
        };
      })
    };
  };
  const tops = topNames.map((nm) => buildTree(nm, new Set()));
  return {
    ok: true,
    xprFound,
    xprPath: xprPath || "",
    topModule: xprTop,
    fileCount: designFiles.length,
    moduleCount: moduleDefs.size,
    topCount: tops.length,
    skipped,
    treeTruncated,   // 模块树是否因节点预算被截断（大扇出工程）
    noXprTruncated,  // 无工程文件且超出 NOXPR_LIMIT：只解析了前一段
    noXprTotal,      // 无工程文件时收集到的 RTL 总数（用于提示「扫了多少 / 共多少」）
    tops,
    fileSets
  };
}

/* ------------------------------------------------------------------ */
/* 运行中 Vivado 工程探测                                              */
/* ------------------------------------------------------------------ */
/**
 * 用 PowerShell 的 Win32_Process 查询运行中 vivado.exe 的命令行，
 * 提取其中的 .xpr 绝对路径（GUI 打开时命令行形如 `vivado -mode gui D:\proj\x.xpr`，
 * 也可能是 `vivado D:\proj\x.xpr`）。
 */
async function detectVivadoProjects() {
  try {
    const psScript = "Get-CimInstance Win32_Process -Filter \"name='vivado.exe'\" | Select-Object -ExpandProperty CommandLine";
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript], { timeout: 8000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    const lines = String(stdout || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const projects = new Map();
    for (const line of lines) {
      const m = line.match(/[A-Za-z]:[\\/][^\s"']+\.xpr/);
      if (m) {
        const p = m[0].replace(/\//g, "\\");
        if (!projects.has(p)) projects.set(p, basename(p).replace(/\.xpr$/i, ""));
      }
    }
    return { ok: true, projects: Array.from(projects, ([path, name]) => ({ path, name })) };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e), projects: [] };
  }
}

/* ------------------------------------------------------------------ */
/* 工作区持久化（VSCode .code-workspace 格式，存用户目录）             */
/* ------------------------------------------------------------------ */
const WORKSPACE_DIR = join(homedir(), ".dsh", "card-desktop-workspace");
const WORKSPACE_FILE = join(WORKSPACE_DIR, "workspace.code-workspace");
const RECENTS_FILE = join(WORKSPACE_DIR, "recents.json");
/* 工作区文件夹清单的滚动历史：每次清单发生变化（含被写空）前，先把旧清单存进这里。
   这是一个纯保险：即使将来再出现「工作区被写空」，清单也一定能捞回来。 */
const HISTORY_FILE = join(WORKSPACE_DIR, "workspace-history.json");
// 会话状态（打开的标签/布局）宿主持久化文件：让 QQ 浏览器与 DSH.exe 等
// 不同浏览器配置共享同一份状态（localStorage 是按浏览器隔离的，换入口会像重置）
const SESSION_FILE = join(WORKSPACE_DIR, "session.json");
const SESSION_MAX_BYTES = 8 * 1024 * 1024;   // 8MB：热退出的未保存正文也走这份会话文件（原先 1MB 装不下几个 RTL 文件）

/* ⑦ 最近工作区：条目有两种——「.code-workspace 文件」与「文件夹集合快照」。
   后者是必须的：用户只打开文件夹、从没另存过工作区时，也必须能从最近列表重新打开。
   normRecent 兼容老数据（纯字符串数组），升级后旧 recents.json 仍可用。 */
function sanitizeFolders(v) {
  return (Array.isArray(v) ? v : [])
    .filter((f) => f && typeof f.path === "string" && f.path)
    .map((f) => ({ name: f.name || basename(f.path), path: f.path }));
}
function normRecent(x) {
  if (typeof x === "string" && x) return { kind: "file", path: x, label: basename(x) || x };
  if (x && typeof x === "object") {
    if (x.kind === "folders" || Array.isArray(x.folders)) {
      const flds = sanitizeFolders(x.folders);
      if (flds.length) return { kind: "folders", folders: flds, label: String(x.label || "") || flds.map((f) => f.name).join(" + ") };
    }
    if (typeof x.path === "string" && x.path) return { kind: "file", path: x.path, label: String(x.label || "") || basename(x.path) || x.path };
  }
  return null;
}
const recentKey = (e) => (e.kind === "folders"
  ? ("d:" + e.folders.map((f) => normPathKey(f.path)).join("|"))
  : ("f:" + normPathKey(e.path)));
async function readRecents() {
  try {
    await access(RECENTS_FILE);
    const text = await readFile(RECENTS_FILE, "utf8");
    const d = JSON.parse(text);
    const arr = Array.isArray(d) ? d : (d && Array.isArray(d.recents) ? d.recents : []);
    return arr.map(normRecent).filter(Boolean);
  } catch (e) { return []; }
}
async function pushRecent(entry) {
  try {
    if (!entry) return;
    const list = await readRecents();
    const key = recentKey(entry);
    const next = [entry].concat(list.filter((x) => recentKey(x) !== key)).slice(0, 12);
    await mkdir(WORKSPACE_DIR, { recursive: true });
    await writeFile(RECENTS_FILE, JSON.stringify(next, null, 2), "utf8");
  } catch (e) { /* 记录失败不阻塞主流程 */ }
}
async function recordWorkspaceVisit(p) {
  if (!p) return;
  await pushRecent({ kind: "file", path: p, label: basename(p) || p });
}
/* 记录一份「文件夹集合」快照：关闭工作区、重新打开时都用它，
   这样「刚关掉的工作区」总能从最近列表里找回来（VSCode 同语义）。 */
async function recordFoldersVisit(folders, label) {
  const flds = sanitizeFolders(folders);
  if (!flds.length) return;
  await pushRecent({ kind: "folders", folders: flds, label: String(label || "") || flds.map((f) => f.name).join(" + ") });
}
const foldersKeyOf = (flds) => sanitizeFolders(flds).map((f) => normPathKey(f.path)).join("|");
async function readWorkspaceHistory() {
  try {
    const d = JSON.parse(await readFile(HISTORY_FILE, "utf8"));
    return Array.isArray(d) ? d : [];
  } catch (e) { return []; }
}
/* 把一份（非空）文件夹清单追加进历史，同一组合只留最新一条，最多 30 条 */
async function pushWorkspaceHistory(folders) {
  try {
    const flds = sanitizeFolders(folders);
    if (!flds.length) return;
    const key = foldersKeyOf(flds);
    const list = await readWorkspaceHistory();
    const next = [{ at: new Date().toISOString(), folders: flds }]
      .concat(list.filter((x) => x && foldersKeyOf(x.folders) !== key))
      .slice(0, 30);
    await mkdir(WORKSPACE_DIR, { recursive: true });
    await writeFile(HISTORY_FILE, JSON.stringify(next, null, 2), "utf8");
  } catch (e) { /* 保险写失败不能影响保存本身 */ }
}

async function loadWorkspace() {
  try {
    await access(WORKSPACE_FILE);
    const text = await readFile(WORKSPACE_FILE, "utf8");
    const data = JSON.parse(text);
    /* lastFolders = 最近一次非空的文件夹集合。「关闭工作区」写的是 folders: []，
       但绝不能把用户的工作区内容抹掉——它留在 lastFolders 里，可供「打开最近」还原。
       VSCode 关闭文件夹同样不会删除工作区文件。 */
    return { ok: true, folders: sanitizeFolders(data && data.folders), lastFolders: sanitizeFolders(data && data.lastFolders) };
  } catch (e) {
    return { ok: true, folders: [], lastFolders: [] };
  }
}

async function saveWorkspace(args) {
  try {
    await mkdir(WORKSPACE_DIR, { recursive: true });
    const folders = sanitizeFolders(args && args.folders);
    /* 读回上一次的 lastFolders：本次写空（关闭工作区）时把它继承下来，
       这样工作区内容不会被一次「关闭」永久抹掉。 */
    let prevLast = [];
    let prevFolders = [];
    try {
      const raw = JSON.parse(await readFile(WORKSPACE_FILE, "utf8"));
      prevFolders = sanitizeFolders(raw && raw.folders);
      prevLast = sanitizeFolders(raw && raw.lastFolders);
      if (!prevLast.length) prevLast = prevFolders;
    } catch (e) { /* 首次保存或旧格式 */ }
    /* 清单发生变化（尤其是被写空）之前，先把旧清单存进滚动历史 —— 保险 */
    if (prevFolders.length && foldersKeyOf(prevFolders) !== foldersKeyOf(folders)) {
      await pushWorkspaceHistory(prevFolders);
    }
    const lastFolders = folders.length ? folders : prevLast;
    await writeFile(WORKSPACE_FILE, JSON.stringify({ folders, lastFolders }, null, 2), "utf8");
    /* 注意：不再把内部默认工作区文件写进「最近」——它对用户没有意义，
       最近列表里应该显示文件夹名（由客户端在打开/关闭时调用 workspaceRecordFolders）。 */
    return { ok: true, folders };
  } catch (e) { return fail(e); }
}

// ⑧ 会话状态宿主持久化：打开的标签、当前文件、左右栏与分栏布局等。
// 只做「整份 JSON 存取」，形状由客户端定义（客户端负责校验与回退）；
// 读失败一律返回空会话而不是抛错，保证客户端能回退 localStorage。
async function loadSession() {
  try {
    await access(SESSION_FILE);
    const text = await readFile(SESSION_FILE, "utf8");
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: true, session: null };
    return { ok: true, session: data };
  } catch (e) {
    return { ok: true, session: null };
  }
}

async function saveSession(args) {
  try {
    const session = args && args.session && typeof args.session === "object" && !Array.isArray(args.session)
      ? args.session
      : null;
    if (!session) return { ok: false, error: "未指定会话数据", code: "NO_TARGET" };
    const text = JSON.stringify(session);
    if (text.length > SESSION_MAX_BYTES) return { ok: false, error: "会话数据过大（超过 1MB），已放弃写入", code: "TOO_LARGE" };
    await mkdir(WORKSPACE_DIR, { recursive: true });
    await writeFile(SESSION_FILE, text, "utf8");
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ⑦ 将工作区另存为…（写任意 .code-workspace 目标路径，VSCode 菜单语义）
async function saveWorkspaceAs(args) {
  try {
    const target = args && typeof args.path === "string" && args.path ? args.path : null;
    if (!target) return { ok: false, error: "未指定目标路径", code: "NO_TARGET" };
    // 白名单必须覆盖**所有**写盘入口：漏掉这一个，整个写保护就能被自家 API 绕过
    // （POST /desk/api/workspaceSaveAs 会对任意路径覆盖写 JSON 并建目录）。
    if (!isWritablePath(target)) return outsideWriteError(target);
    const folders = Array.isArray(args.folders) ? args.folders.filter((f) => f && typeof f.path === "string" && f.path) : [];
    const payload = { folders: folders.map((f) => ({ name: f.name || basename(f.path), path: f.path })) };
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(payload, null, 2), "utf8");
    await recordWorkspaceVisit(target);
    return { ok: true, savedPath: target };
  } catch (e) { return fail(e); }
}

// ⑦ 从文件打开工作区…（读任意 .code-workspace 路径，返回其 folders）
async function loadWorkspaceFrom(args) {
  try {
    const p = args && typeof args.path === "string" && args.path ? args.path : null;
    if (!p) return { ok: false, error: "未指定工作区文件路径", code: "NO_TARGET" };
    const text = await readFile(p, "utf8");
    const data = JSON.parse(text);
    const folders = Array.isArray(data.folders) ? data.folders.filter((f) => f && typeof f.path === "string" && f.path) : [];
    await recordWorkspaceVisit(p);
    // 用户显式打开的工作区：把其所在目录与各工程目录纳入可写根，
    // 这样「打开工作区 → 编辑保存」这条主路径不受写白名单影响。
    registerWriteRoot(dirname(p));
    for (const f of folders) registerWriteRoot(f.path);
    return { ok: true, folders: folders.map((f) => ({ name: f.name || basename(f.path), path: f.path })) };
  } catch (e) {
    return { ok: false, error: (e && e.code === "ENOENT") ? "工作区文件不存在: " + (args && args.path) : ((e && e.message) || String(e)), code: "WORKSPACE_READ_FAIL" };
  }
}

// ⑦ 最近工作区列表（供客户端“打开最近工作区…”菜单）
async function listRecents() {
  try {
    const all = await readRecents();
    /* 内部默认工作区文件（~/.dsh/card-desktop-workspace/workspace.code-workspace）
       对用户没有意义：列表里要显示的是「文件夹名」，不是这个内部路径。 */
    const selfKey = normPathKey(WORKSPACE_FILE);
    const recents = all.filter((x) => !(x.kind === "file" && normPathKey(x.path) === selfKey));
    return { ok: true, recents };
  } catch (e) { return fail(e); }
}
/* ⑦ 重新打开一份「文件夹集合」快照：登记可写根（与打开 .code-workspace 同等对待） */
async function openWorkspaceFolders(args) {
  const folders = sanitizeFolders(args && args.folders);
  if (!folders.length) return { ok: false, error: "未指定文件夹", code: "NO_TARGET" };
  for (const f of folders) registerWriteRoot(f.path);
  await recordFoldersVisit(folders);
  return { ok: true, folders };
}

/* ------------------------------------------------------------------ */
/* 写路径白名单                                                         */
/* 读操作自由（浏览磁盘是本职），写操作限制在「已授权根」内，避免任意路径写入。  */
/* 授权来源：① 启动时登记主目录与进程 cwd；② 上次保存的工作区目录；           */
/*          ③ 用户打开工作区文件时其所在目录；④ 客户端在界面上确认后的显式授权。 */
/* 说明：同源页面内的脚本本就能调用 allowWriteRoot，因此这层白名单防的是       */
/* 「误写 / 第三方脚本随手写盘」，不是定向攻击者——真正的边界由 fence 提供。    */
/* ------------------------------------------------------------------ */
const writeRoots = new Set();
function normPathKey(p) {
  try { return resolve(String(p)).replace(/[\\/]+$/, "").toLowerCase(); } catch (e) { return null; }
}
/* 盘根（C:）与文件系统根不能作为可写根：normPathKey 会把 "C:\\" 归一成 "c:"，
   而 isWritablePath 用 startsWith(root + "\\") 判断，于是 "c:" 会让整盘（含
   C:\\Windows）全部可写 —— 一次「允许写入」就把护栏变成整盘通行证。
   实测：writeRoots=["c:"] 时 isWritablePath("C:\\Windows\\System32\\drivers\\etc\\hosts") === true。 */
const isTooBroadRoot = (key) => key === "" || key === "/" || /^[a-z]:$/.test(key);
function registerWriteRoot(p) {
  const key = normPathKey(p);
  if (key && !isTooBroadRoot(key)) writeRoots.add(key);
  return key;
}
function isWritablePath(p) {
  const key = normPathKey(p);
  if (key === null) return false;
  for (const root of writeRoots) {
    if (key === root || key.startsWith(root + "\\") || key.startsWith(root + "/")) return true;
  }
  return false;
}
const outsideWriteError = (p) => ({
  ok: false,
  error: "该路径不在可写范围内（工作区外写入已被拦截）：" + p,
  code: "FS_OUTSIDE_WRITE_ROOT",
  path: p
});
// 初始可写根：主目录 + 当前工作目录，覆盖绝大多数日常用法
registerWriteRoot(homedir());
try { registerWriteRoot(process.cwd()); } catch (e) { /* cwd 不可得时忽略 */ }

// ⑦ 新建文本文件（创建空文件，目录不存在则自动建目录；已存在则报错防覆盖）
async function createFile(args) {
  try {
    const p = args && typeof args.path === "string" && args.path ? args.path : null;
    if (!p) return { ok: false, error: "未指定新文件路径", code: "NO_TARGET" };
    if (!isWritablePath(p)) return outsideWriteError(p);
    try { await access(p); return { ok: false, error: "文件已存在，未覆盖: " + p, code: "FS_EXISTS" }; } catch (e) { /* 不存在 → 可创建 */ }
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, "", "utf8");
    return { ok: true, path: p };
  } catch (e) { return fail(e); }
}

/* ------------------------------------------------------------------ */
/* 版本控制（本地 Git）                                                */
/* 说明：只做本地仓库操作，命令走 execFile 数组传参（不经 shell，路径   */
/* 里的空格/中文/引号无需转义）。输出按字节捕获后用 decodeBytes 解码，  */
/* 避免中文 Windows 上 git 的 GBK 输出乱码。                          */
/* ------------------------------------------------------------------ */
let gitExeCache;   // undefined = 未探测；null = 探测失败；string = 可执行文件路径
const GIT_TIMEOUT_MS = 120000;

/* 定位 git.exe：优先 PATH（env.PATH 里已有 E:\Git\cmd），失败再试常见安装位置。
   探测结果缓存，避免每次请求都跑一次 --version。 */
async function resolveGitExe() {
  if (gitExeCache !== undefined) return gitExeCache;
  const env = process.env || {};
  const candidates = ["git"];
  try {
    const pf = env.ProgramFiles || env.PROGRAMFILES;
    const pf86 = env["ProgramFiles(x86)"] || env["PROGRAMFILES(X86)"];
    const la = env.LOCALAPPDATA;
    if (pf) candidates.push(join(pf, "Git", "cmd", "git.exe"));
    if (pf86) candidates.push(join(pf86, "Git", "cmd", "git.exe"));
    if (la) candidates.push(join(la, "Programs", "Git", "cmd", "git.exe"));
  } catch (e) { /* 环境变量异常时只用 PATH */ }
  for (const c of candidates) {
    try {
      const r = await execFileAsync(c, ["--version"], { timeout: 10000, windowsHide: true, encoding: "buffer" });
      const v = decodeBytes(r.stdout).text.trim();
      if (/^git version/i.test(v)) { gitExeCache = c; return gitExeCache; }
    } catch (e) { /* 试下一个候选 */ }
  }
  gitExeCache = null;
  return gitExeCache;
}

/* 跑一条 git 命令。返回 { ok, code, stdout, stderr }；不抛错，便于逐处判断。 */
async function gitRun(args, opts) {
  const o = opts || {};
  const exe = await resolveGitExe();
  if (!exe) return { ok: false, code: "GIT_NOT_FOUND", stdout: "", stderr: "未找到 git 可执行文件（PATH 与常见安装位置都没有）" };
  const full = ["-c", "core.quotepath=false", "--no-optional-locks"].concat(args);
  try {
    const r = await execFileAsync(exe, full, {
      cwd: o.cwd || undefined,
      timeout: Number(o.timeoutMs) > 0 ? Number(o.timeoutMs) : GIT_TIMEOUT_MS,
      windowsHide: true,
      encoding: "buffer",
      maxBuffer: 32 * 1024 * 1024,
      env: Object.assign({}, process.env, { GIT_TERMINAL_PROMPT: "0", GIT_PAGER: "cat", LC_ALL: "C.UTF-8" })
    });
    return { ok: true, code: 0, stdout: decodeBytes(r.stdout).text, stderr: decodeBytes(r.stderr).text };
  } catch (e) {
    const so = e && e.stdout ? decodeBytes(e.stdout).text : "";
    const se = e && e.stderr ? decodeBytes(e.stderr).text : String((e && e.message) || e);
    return { ok: false, code: (e && e.code != null) ? e.code : "GIT_FAIL", stdout: so, stderr: se };
  }
}

/* 从任意目录向上找仓库根。返回 { ok, root } 或 { ok:false, reason:"not-a-repo" } */
async function gitRepoRoot(startPath) {
  const p = startPath ? String(startPath) : "";
  if (!p) return { ok: false, reason: "no-path", error: "未指定路径" };
  const r = await gitRun(["rev-parse", "--show-toplevel"], { cwd: p, timeoutMs: 20000 });
  if (!r.ok) return { ok: false, reason: "not-a-repo", error: (r.stderr || "").trim() || "该目录不在 Git 仓库中" };
  const root = r.stdout.trim().replace(/\//g, "\\");
  return root ? { ok: true, root } : { ok: false, reason: "not-a-repo", error: "无法确定仓库根目录" };
}

/* git status --porcelain=v1 -z 解析。
   -z 形式下路径不做引号转义（中文/空格安全），记录之间用 NUL 分隔；
   重命名条目形如 "R  <新路径>\0<旧路径>\0"。
   返回 { branch, upstream, ahead, behind, files:[{path, x, y, origPath}] } */
async function parseGitStatus(root) {
  const out = { branch: "", upstream: "", ahead: 0, behind: 0, files: [], detached: false };
  const r = await gitRun(["status", "--porcelain=v1", "-z", "--untracked-files=all", "--branch"], { cwd: root });
  if (!r.ok) return { ok: false, error: (r.stderr || "").trim() || "git status 失败" };
  const parts = r.stdout.split("\0");
  for (let i = 0; i < parts.length; i++) {
    const rec = parts[i];
    if (!rec) continue;
    if (rec.startsWith("## ")) {
      const head = rec.slice(3).trim();
      const up = head.match(/\.\.\.(\S+)/);
      if (up) out.upstream = up[1];
      const ab = head.match(/\[(.*?)\]/);
      if (ab) {
        const a = ab[1].match(/ahead (\d+)/); if (a) out.ahead = Number(a[1]);
        const b = ab[1].match(/behind (\d+)/); if (b) out.behind = Number(b[1]);
      }
      const name = head.split("...")[0].replace(/^No commits yet on /, "").trim();
      out.branch = name;
      if (/^HEAD \(no branch/.test(head) || name === "HEAD") out.detached = true;
      continue;
    }
    if (rec.length < 3) continue;
    const x = rec[0], y = rec[1];
    let path = rec.slice(3);
    let origPath = "";
    if (x === "R" || x === "C" || y === "R" || y === "C") {
      /* -z 形式：重命名的「原路径」作为下一条 NUL 记录紧跟其后 */
      const next = parts[i + 1];
      if (next !== undefined && next !== "") { origPath = next; i += 1; }
    }
    out.files.push({ path: path.replace(/\//g, "\\"), origPath: origPath.replace(/\//g, "\\"), x: x, y: y });
  }
  return { ok: true, status: out };
}

/* 仓库是否已有提交（否则 log/checkout 都会失败） */
async function gitHasHead(root) {
  const r = await gitRun(["rev-parse", "--verify", "--quiet", "HEAD"], { cwd: root, timeoutMs: 20000 });
  return r.ok;
}

/* 单文件 diff。staged=true 看暂存区与 HEAD 的差异，否则看工作区与暂存区的差异。
   未跟踪文件（??）没有 diff，这里退回「全为新增行」的展示。 */
async function gitDiffText(root, relPath, staged) {
  const args = ["diff", "--no-color", "--no-ext-diff"];
  if (staged) args.push("--cached");
  args.push("--", relPath);
  const r = await gitRun(args, { cwd: root });
  if (!r.ok) return { ok: false, error: (r.stderr || "").trim() || "git diff 失败" };
  if (!r.stdout.trim() && !staged) {
    /* 可能是未跟踪文件：用 no-index 对比空文件，给出「全是新增」的 diff */
    const full = join(root, relPath);
    const nr = await gitRun(["diff", "--no-color", "--no-index", "--", process.platform === "win32" ? "NUL" : "/dev/null", full], { cwd: root });
    if (nr.stdout) return { ok: true, diff: nr.stdout };
  }
  return { ok: true, diff: r.stdout };
}

/* 缺省 .gitignore（Vivado/Xilinx 工程的通用排除项）。
   首次 init 时写入，避免把 GB 级生成物提交进历史（一旦写入历史就极难瘦身）。 */
const DEFAULT_GITIGNORE = [
  "# Vivado / Xilinx 工程：只纳入人写的源码，生成物全部排除",
  "*.cache/", "*.gen/", "*.runs/", "*.hw/", "*.sim/", "*.ip_user_files/", "*.ipdefs/", ".Xil/",
  "", "# 大型二进制与中间产物", "*.dcp", "*.bit", "*.bin", "*.ltx", "*.pb", "*.str",
  "", "# 日志与报告", "*.jou", "*.log", "*.rpt", "webtalk*.jou", "webtalk*.log",
  "", "# 仿真波形", "*.vcd", "*.wdb", "xsim.dir/",
  "", "# 编辑器/系统杂项", ".vscode/", ".idea/", "Thumbs.db", "Desktop.ini", "*~", "*.tmp", "*.bak", "*.bak-*"
].join("\n") + "\n";

/* 行尾原地不转换：Verilog 源文件常为 GBK + CRLF，必须字节级原样存储（否则每次 diff 全是整文件改动） */
const GITATTRIBUTES_TEXT = "# 禁止行尾/编码自动转换：Verilog 源文件多为 GBK + CRLF，须字节级原样存储\n* -text\n";

/* 仓库没有 user.name/user.email 时提交会失败。只写仓库级配置（不动用户全局配置）。 */
async function ensureGitIdentity(root) {
  const n = await gitRun(["config", "user.name"], { cwd: root, timeoutMs: 20000 });
  if (!n.ok || !n.stdout.trim()) {
    const g = await gitRun(["config", "--global", "user.name"], { cwd: root, timeoutMs: 20000 });
    if (!g.ok || !g.stdout.trim()) {
      await gitRun(["config", "user.name", "DSH Code Workbench"], { cwd: root, timeoutMs: 20000 });
    }
  }
  const e = await gitRun(["config", "user.email"], { cwd: root, timeoutMs: 20000 });
  if (!e.ok || !e.stdout.trim()) {
    const g = await gitRun(["config", "--global", "user.email"], { cwd: root, timeoutMs: 20000 });
    if (!g.ok || !g.stdout.trim()) {
      await gitRun(["config", "user.email", "dsh@localhost"], { cwd: root, timeoutMs: 20000 });
    }
  }
}

/* 把绝对路径转成仓库内的相对路径（git 只认相对路径，且必须是正斜杠）。
   越界（不在仓库内）返回 null —— 防止借 git 改动仓库外的文件。 */
function gitRelPath(root, absPath) {
  try {
    const r = resolve(String(root)).replace(/[\\/]+$/, "").toLowerCase();
    const p = resolve(String(absPath)).replace(/[\\/]+$/, "");
    if (!p.toLowerCase().startsWith(r + "\\") && p.toLowerCase() !== r) return null;
    return p.slice(r.length).replace(/^[\\/]+/, "").replace(/\\/g, "/");
  } catch (e) { return null; }
}

/* ------------------------------------------------------------------ */
/* API handlers                                                       */
/* ------------------------------------------------------------------ */
const api = {
  root: async () => ({ ok: true, path: homedir().replace(/\//g, "\\") }),
  vivadoProjects: async () => detectVivadoProjects(),
  workspaceLoad: async () => loadWorkspace(),
  workspaceSave: async (args) => saveWorkspace(args || {}),
  workspaceSaveAs: async (args) => saveWorkspaceAs(args || {}),
  workspaceOpenFrom: async (args) => loadWorkspaceFrom(args || {}),
  workspaceRecents: async () => listRecents(),
  /* 「关闭工作区」与「打开最近」用：记录/重新打开一份文件夹集合快照 */
  workspaceRecordFolders: async (args) => { await recordFoldersVisit(args && args.folders, args && args.label); return { ok: true }; },
  workspaceOpenFolders: async (args) => openWorkspaceFolders(args || {}),
  /* 工作区清单的滚动历史：万一再被写空，从这里捞 */
  workspaceHistory: async () => ({ ok: true, history: await readWorkspaceHistory() }),
  /* ⑧ 会话状态（打开的标签/布局）宿主存取：跨浏览器共享同一份 */
  sessionLoad: async () => loadSession(),
  sessionSave: async (args) => saveSession(args || {}),
  createFile: async (args) => createFile(args || {}),
  /* 写路径白名单：列出已授权根 / 用户显式授权某个目录（客户端在确认弹窗后调用） */
  writeRoots: async () => ({ ok: true, roots: Array.from(writeRoots) }),
  allowWriteRoot: async (args) => {
    const p = String((args && args.path) || "");
    if (!p) return { ok: false, error: "未指定路径", code: "NO_TARGET" };
    // 允许**尚不存在**的路径：客户端在「新建文件 / 新目录」被拒时传的就是这个还不存在的目录，
    // 若强制 stat 成功，用户点了"允许写入"仍然失败、还只能看到原始 ENOENT。
    let dir = p;
    try {
      const st = await stat(p);
      dir = st.isDirectory() ? p : dirname(p);
    } catch (e) { /* 不存在 → 按目录本身处理 */ }
    /* 盘根不能授权：那等于整盘可写，而弹窗文案还写着「该目录」。明确拒绝并说明原因，
       客户端会把 fail 原样回给用户（不会静默当成功）。 */
    const broadKey = normPathKey(dir);
    if (broadKey !== null && isTooBroadRoot(broadKey)) {
      return {
        ok: false,
        code: "WRITE_ROOT_TOO_BROAD",
        error: "不能把「" + dir + "」整个授权为可写根（那等于整个盘都可写）。请改选盘内的具体目录（例如 D:\\Projects\\myproj）。"
      };
    }
    registerWriteRoot(dir);
    return { ok: true, root: dir, roots: Array.from(writeRoots) };
  },
  revealPath: async (args) => {
    // Windows explorer 语法：explorer.exe /select,"C:\带空格 的路径\file.txt"
    // spawn 数组参数默认会被 Node 引号化，导致内嵌引号/空格路径解析错乱 → 保留 windowsVerbatimArguments 原样传参。
    // 安全边界：verbatim 意味着参数被原样拼进命令行，路径里的引号/换行就是命令注入面 → 先拒绝。
    const target = String((args && args.path) || "");
    if (!target) return { ok: false, error: "未指定路径", code: "NO_TARGET" };
    if (/["\r\n]/.test(target)) return { ok: false, error: "路径含非法字符（引号或换行）", code: "ARGS" };
    try {
      await new Promise((resolve) => {
        const child = spawn("explorer.exe", ['/select,"' + target + '"'], { windowsVerbatimArguments: true, windowsHide: false, detached: false });
        child.on("error", () => resolve());
        child.on("exit", () => resolve());
        // 保险：即使 explorer 未响应也 8s 后放行，避免请求挂死
        const t = setTimeout(() => resolve(), 8000);
        child.on("exit", () => clearTimeout(t));
      });
      return { ok: true };
    } catch (e) { return fail(e); }
  },

  listDir: async (args) => {
    try {
      const entries = await readdir(args.path, { withFileTypes: true });
      return { ok: true, entries: entries.map((x) => ({ name: x.name, type: x.isDirectory() ? "directory" : "file", path: args.path + "\\" + x.name })) };
    } catch (e) { return fail(e); }
  },

  // ⑪ 递归列出文本文件（Ctrl+P 快速打开用）：只收常见源码/文本扩展，避开 .git 等
  listTree: async (args) => {
    const SKIP_DIR = new Set([".git", ".hg", ".svn", "node_modules", ".next", "dist", "build", "ip_user_files", "sim_1", "synth_1", ".Xil", "hw_handoff", "runme.log"]);
    // Vivado 工程生成目录：带项目名前缀（如 RFSOC_48DR_0813.gen），精确匹配失效 → 用后缀判断。
    // 注意：.srcs 是源码目录，绝不能跳（源码在 .srcs/sources_1 下）。
    const SKIP_DIR_SUFFIX = [".cache", ".gen", ".hw", ".ip_user_files", ".ipdefs", ".runs", ".sim", ".xil", ".jou", ".str", ".backup", ".autosave"];
    const skipDir = (nm) => {
      if (SKIP_DIR.has(nm)) return true;
      const lower = String(nm).toLowerCase();
      for (const sfx of SKIP_DIR_SUFFIX) { if (lower.endsWith(sfx)) return true; }
      return false;
    };
    const EXT_OK = new Set(["v", "sv", "svh", "vh", "vhd", "vhdl", "xdc", "tcl", "md", "txt", "json", "py", "c", "h", "cpp", "hpp", "do", "f", "m", "asm", "log", "xml", "yaml", "yml", "toml", "cfg", "ini", "bat", "ps1", "vbs", "s", "coe", "mem", "csv"]);
    const walk = async (dir, depth, out) => {
      if (depth > 12 || out.length > 4000) return out;
      let entries = [];
      try { entries = await readdir(dir, { withFileTypes: true }); } catch (e) { return out; }
      entries.sort((a, b) => (a.isDirectory() === b.isDirectory()) ? a.name.localeCompare(b.name) : (a.isDirectory() ? -1 : 1));
      for (const x of entries) {
        const full = dir + "\\" + x.name;
        if (x.isDirectory()) {
          if (skipDir(x.name)) continue;
          await walk(full, depth + 1, out);
        } else if (x.isFile()) {
          const dot = x.name.lastIndexOf(".");
          const ext = dot >= 0 ? x.name.slice(dot + 1).toLowerCase() : "";
          if (EXT_OK.has(ext)) out.push(full);
        }
      }
      return out;
    };
    try {
      const roots = Array.isArray(args.paths) && args.paths.length ? args.paths : [args.path];
      const files = [];
      for (const r of roots) await walk(r, 0, files);
      return { ok: true, files };
    } catch (e) { return fail(e); }
  },

  stat: async (args) => {
    try {
      const st = await stat(args.path);
      return { ok: true, type: st.isDirectory() ? "directory" : "file", size: st.size || 0, mtimeMs: st.mtimeMs || 0 };
    } catch (e) { return fail(e); }
  },

  readFile: async (args) => {
    try {
      const st = await stat(args.path);
      if (!st.isFile()) return { ok: false, error: "不是文件", code: "FS_NOT_TEXT" };
      if (st.size > 8 * 1024 * 1024) return { ok: false, error: "文件过大", code: "FS_TOO_LARGE" };
      const buf = await readFile(args.path);
      if (looksBinary(buf)) return { ok: false, error: "binary file", code: "FS_NOT_TEXT" };
      const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
      /* 允许调用方指定编码重新解码（客户端「以 UTF-8 / 以 GBK 重新打开」用）。
         只认 utf8 / gbk；不支持或解码失败时回落到自动检测，并用 forced 如实告诉客户端
         本次覆盖到底有没有生效 —— 旧宿主会静默忽略该参数，用户会以为"点了没反应"。 */
      const body = hasBom ? buf.subarray(3) : buf;
      const wantEnc = (args && typeof args.encoding === "string") ? args.encoding.toLowerCase() : "";
      let text = null, encoding = "";
      let forced = false;
      let lossyDecode = false;
      if (wantEnc === "utf8" || wantEnc === "gbk") {
        try {
          if (wantEnc === "gbk" && gbkDecoder) { text = gbkDecoder.decode(body); encoding = "gbk"; forced = true; }
          else if (wantEnc === "utf8") { text = new TextDecoder("utf-8").decode(body); encoding = "utf8"; forced = true; }
        } catch (e) { text = null; encoding = ""; forced = false; }
      }
      if (text === null) { const d = decodeBytes(body); text = d.text; encoding = d.encoding; lossyDecode = d.lossy === true; }
      // 安全边界：往返校验——「按判断出的编码解码再编码」必须能还原原字节。
      // 不成立说明编码判断有损（GB18030 四字节字符、非完整 UTF-8 被判成 GBK），
      // 直接回写会把整文件编码翻转或丢字符，故标记 writable=false 由客户端拦截确认。
      let writable = true;
      if (forced && encoding === "utf8") {
        /* 指定 UTF-8 强行解码时补一次字节级往返校验：解不回去（例如把 GBK 文件当 UTF-8 读，
           中文位置变成 U+FFFD）就不允许直接保存，否则一次 Ctrl+S 会把原文件写成乱码。 */
        try { if (!Buffer.from(text, "utf8").equals(Buffer.from(body))) writable = false; } catch (e) { writable = false; }
      }
      if (encoding === "gbk") {
        const back = encodeGbk(text);
        if (!back || back.lost > 0) writable = false;
        else {
          // 字符级往返（而非字节级）：GBK 多映射字符会让写回字节与原文不同但文本一致，
          // 按字节比较会把这类文件误判为不可写。要求「写回后能读回同样的文本」。
          if (decodeBytes(back.bytes).text !== text) writable = false;
        }
      } else if (encoding === "latin1") {
        // latin1 是兜底分支：回写走 UTF-8 会让 ≥0x80 的字节膨胀成 2 字节，直接禁止
        writable = false;
      }
      if (lossyDecode) {
        /* 按 UTF-8 宽松解码、里面含无法解码的字节：保存会把那几处规范化成 EF BF BD（字节变了）。
           这类文件本来就已经被别的工具改坏过，让 saveFile 先弹一次确认，别静默改字节。 */
        writable = false;
      }
      return { ok: true, content: text, encoding, forced, hasBom, writable, mtimeMs: st.mtimeMs || 0, size: st.size || 0 };
    } catch (e) { return fail(e); }
  },

  writeFile: async (args) => {
    try {
      if (!isWritablePath(args.path)) return outsideWriteError(args.path);
      const enc = args.encoding || "utf8";
      let out;
      if (enc === "gbk") {
        const gb = encodeGbk(args.content);
        if (!gb) return { ok: false, error: "GBK 编码表不可用", code: "ENCODE_FAIL" };
        // 安全边界：表外字符写进去就是 '?' 且不可逆 → 拒绝写入并如实报错
        if (gb.lost > 0) {
          return {
            ok: false, code: "ENCODE_LOSSY",
            error: "内容含 " + gb.lost + " 个字符无法用 GBK 表示（保存后会变成 ?），已拒绝写入",
            lost: gb.lost, unencodable: gb.lostChars || ""
          };
        }
        out = gb.bytes;
      } else {
        out = Buffer.from(args.content, "utf8");
        // 原文件带 UTF-8 BOM 时补回，避免一次保存把 BOM 弄丢
        if (args.bom === true) out = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), out]);
      }
      // 原子写：与批量替换一致（先写同目录临时文件再 rename）。
      // 就地截断重写在保存中断（断电/被杀/盘满）时会留下半截源码。
      const tmp = args.path + ".desk-tmp-" + process.pid + "-" + Math.random().toString(36).slice(2, 8);
      try {
        await writeFile(tmp, out);
        await rename(tmp, args.path);
      } catch (e) {
        try { await unlink(tmp); } catch (e2) { /* 清理失败忽略 */ }
        throw e;
      }
      return { ok: true };
    } catch (e) { return fail(e); }
  },

  scanRtl: async (args) => {
    const a = args || {};
    try {
      /* allowLarge 只有客户端在用户确认后才会传（默认 false = 走 NOXPR_LIMIT 上限） */
      return await scanRtl(a.path, { allowLarge: a.allowLarge === true });
    } catch (e) { return fail(e); }
  },

  /* ㉔ 集成终端：执行一条命令并返回输出（非交互式；dev 工具/脚本够用）
     用 cmd.exe /d /s /c 执行，保证 .bat / tcl / 环境变量 / 管道等正常。
     限制：一次性返回输出（非流式）、有超时上限；交互式程序（需输入）不适用。 */
  runCommand: async (args) => {
    const a = args || {};
    const cmd = String(a.cmd || "").trim();
    if (!cmd) return { ok: false, error: "命令为空", code: "ARGS" };
    const timeoutMs = Math.min(Number(a.timeoutMs) > 0 ? Number(a.timeoutMs) : 300000, 1800000);
    const cwd = a.cwd ? String(a.cwd) : undefined;
    const MAX_OUT = 400000;
    return await new Promise((resolve) => {
      let child = null;
      try {
        child = spawn("cmd.exe", ["/d", "/s", "/c", cmd], { cwd, windowsHide: true });
      } catch (e) {
        resolve({ ok: false, error: String((e && e.message) || e), code: "SPAWN_FAIL" });
        return;
      }
      let outChunks = [], errChunks = [], outLen = 0, errLen = 0, settled = false, outTruncated = false, errTruncated = false;
      const finish = (code, note) => {
        if (settled) return;
        settled = true;
        try { clearTimeout(timer); } catch (e) { }
        // 终端输出在中文 Windows 默认是 CP936/GBK，逐块 utf8 解码会乱码 ——
        // 累积原始字节后统一用 decodeBytes（UTF-8 严格 → GBK → latin1）解码。
        const stdout = decodeBytes(Buffer.concat(outChunks)).text;
        const stderr = decodeBytes(Buffer.concat(errChunks)).text;
        const truncNote = (outTruncated ? "（stdout 已截断，仅保留末尾部分）" : "") + (errTruncated ? "（stderr 已截断）" : "");
        resolve({ ok: code === 0, exitCode: code, stdout, stderr, note: (note || "") + truncNote, stdoutTruncated: outTruncated, stderrTruncated: errTruncated });
      };
      const timer = setTimeout(() => {
        // 只 kill cmd.exe 会留下孙子进程（vivado.bat → java）继续占工程锁。
        // Windows 用 taskkill /T 杀整棵进程树；其它平台退回 child.kill()。
        try {
          if (process.platform === "win32" && child.pid) {
            spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
          } else {
            child.kill();
          }
        } catch (e) {
          try { child.kill(); } catch (e2) { /* 已退出 */ }
        }
        finish(-1, "命令超时已终止（" + Math.round(timeoutMs / 1000) + "s，含子进程）");
      }, timeoutMs);
      if (child.stdout) child.stdout.on("data", (d) => { outLen += d.length; outChunks.push(d); if (outLen > MAX_OUT) { outChunks = [d]; outLen = d.length; outTruncated = true; } });
      if (child.stderr) child.stderr.on("data", (d) => { errLen += d.length; errChunks.push(d); if (errLen > MAX_OUT) { errChunks = [d]; errLen = d.length; errTruncated = true; } });
      child.on("error", (e) => { errChunks.push(Buffer.from("\n" + String((e && e.message) || e), "utf8")); finish(-1, "启动失败"); });
      child.on("close", (code) => finish(code == null ? -1 : code, ""));
    });
  },

  /* ---------------- 版本控制（本地 Git） ---------------- */

  /* 仓库状态 + 变更清单。path 可以是仓库内任意目录或文件所在目录。 */
  gitStatus: async (args) => {
    const a = args || {};
    const start = String(a.path || "");
    if (!start) return { ok: false, error: "缺少路径", code: "ARGS" };
    const r = await gitRepoRoot(start);
    if (!r.ok) {
      /* 不是仓库不是错误：前端据此显示「启用版本控制」按钮 */
      return { ok: true, isRepo: false, path: start, reason: r.reason };
    }
    const st = await parseGitStatus(r.root);
    if (!st.ok) return { ok: false, error: st.error, root: r.root };
    return { ok: true, isRepo: true, root: r.root, hasHead: await gitHasHead(r.root), status: st.status };
  },

  /* 在指定目录启用版本控制：git init + 写 .gitignore / .gitattributes + 补齐提交身份。
     刻意**不自动提交** —— 交给用户在界面上看清变更清单后自己写提交信息。 */
  gitInit: async (args) => {
    const a = args || {};
    const dir = String(a.path || "");
    if (!dir) return { ok: false, error: "缺少路径", code: "ARGS" };
    if (!isWritablePath(dir)) return outsideWriteError(dir);
    try {
      const ig = join(dir, ".gitignore");
      const ga = join(dir, ".gitattributes");
      let wrote = [];
      try { await access(ig); } catch (e) { await writeFile(ig, DEFAULT_GITIGNORE, "utf8"); wrote.push(".gitignore"); }
      try { await access(ga); } catch (e) { await writeFile(ga, GITATTRIBUTES_TEXT, "utf8"); wrote.push(".gitattributes"); }
      const init = await gitRun(["init"], { cwd: dir });
      if (!init.ok) return { ok: false, error: (init.stderr || "").trim() || "git init 失败" };
      /* 中文文件名不要被转义成 \344\270\255 这种八进制显示 */
      await gitRun(["config", "core.quotepath", "false"], { cwd: dir, timeoutMs: 20000 });
      await ensureGitIdentity(dir);
      registerWriteRoot(dir);
      const st = await parseGitStatus(dir);
      return {
        ok: true, root: dir, wrote: wrote,
        hasHead: await gitHasHead(dir),
        status: st.ok ? st.status : null
      };
    } catch (e) { return fail(e); }
  },

  /* 提交历史。limit 默认 30，最多 200。 */
  gitLog: async (args) => {
    const a = args || {};
    const root = String(a.path || "");
    if (!root) return { ok: false, error: "缺少路径", code: "ARGS" };
    const rr = await gitRepoRoot(root);
    if (!rr.ok) return { ok: false, error: rr.error, code: "NOT_A_REPO" };
    if (!(await gitHasHead(rr.root))) return { ok: true, root: rr.root, commits: [], hasHead: false };
    const limit = Math.min(Math.max(Number(a.limit) > 0 ? Number(a.limit) : 30, 1), 200);
    const fmt = "%H%x1f%h%x1f%an%x1f%aI%x1f%s%x1e";
    const r = await gitRun(["log", "--max-count=" + limit, "--pretty=format:" + fmt], { cwd: rr.root });
    if (!r.ok) return { ok: false, error: (r.stderr || "").trim() || "git log 失败" };
    const commits = r.stdout.split("\x1e").map((s) => s.replace(/^\s+/, "")).filter(Boolean).map((rec) => {
      const p = rec.split("\x1f");
      return { hash: p[0] || "", short: p[1] || "", author: p[2] || "", date: p[3] || "", subject: p[4] || "" };
    });
    return { ok: true, root: rr.root, commits: commits, hasHead: true };
  },

  /* 单文件差异。staged=true 看暂存区，缺省看工作区。 */
  gitDiff: async (args) => {
    const a = args || {};
    const root = String(a.path || "");
    if (!root) return { ok: false, error: "缺少路径", code: "ARGS" };
    const rr = await gitRepoRoot(root);
    if (!rr.ok) return { ok: false, error: rr.error, code: "NOT_A_REPO" };
    const abs = String(a.file || "");
    if (!abs) return { ok: false, error: "缺少文件", code: "ARGS" };
    const rel = gitRelPath(rr.root, abs);
    if (!rel) return { ok: false, error: "该文件不在仓库内", code: "OUTSIDE_REPO" };
    const d = await gitDiffText(rr.root, rel, a.staged === true);
    if (!d.ok) return { ok: false, error: d.error };
    const MAX = 2000000;
    const truncated = d.diff.length > MAX;
    return { ok: true, root: rr.root, file: rel, diff: truncated ? d.diff.slice(0, MAX) : d.diff, truncated: truncated };
  },

  /* 某次提交改了什么：先给改动文件清单，再给指定文件的 diff。
     用于面板里点提交记录查看内容（此前那一行无点击处理，用户以为坏了）。 */
  gitShowCommit: async (args) => {
    const a = args || {};
    const root = String(a.path || "");
    if (!root) return { ok: false, error: "缺少路径", code: "ARGS" };
    const rr = await gitRepoRoot(root);
    if (!rr.ok) return { ok: false, error: rr.error, code: "NOT_A_REPO" };
    const hash = String(a.hash || "").trim();
    if (!/^[0-9a-fA-F]{4,40}$/.test(hash)) return { ok: false, error: "提交号不合法", code: "ARGS" };
    /* 先做安全校验：确认该对象是提交（避免把任意对象名喂给 git） */
    const t = await gitRun(["cat-file", "-t", hash], { cwd: rr.root, timeoutMs: 20000 });
    if (!t.ok || String(t.stdout).trim() !== "commit") {
      return { ok: false, error: "找不到这次提交", code: "NO_SUCH_COMMIT" };
    }
    const full = await gitRun(["rev-parse", hash], { cwd: rr.root, timeoutMs: 20000 });
    const fullHash = full.ok ? String(full.stdout).trim() : hash;
    /* 提交元信息 */
    const meta = await gitRun(["show", "-s", "--pretty=format:%H%x1f%h%x1f%an%x1f%aI%x1f%s%x1f%b", fullHash], { cwd: rr.root, timeoutMs: 20000 });
    let info = null;
    if (meta.ok) {
      const p = String(meta.stdout).split("\x1f");
      info = { hash: p[0] || fullHash, short: p[1] || "", author: p[2] || "", date: p[3] || "", subject: p[4] || "", body: (p[5] || "").trim() };
    }
    /* 改动文件清单（含状态字母） */
    const ns = await gitRun(["show", "--name-status", "--format=", "-M", fullHash], { cwd: rr.root, timeoutMs: 30000 });
    const files = [];
    if (ns.ok) {
      for (const line of String(ns.stdout).split(/\r?\n/)) {
        if (!line.trim()) continue;
        const parts = line.split("\t");
        const st = (parts[0] || "").trim();
        if (parts.length >= 3 && /^[RC]/.test(st)) {
          files.push({ status: st, path: parts[2], from: parts[1] });   // 重命名/复制带来源
        } else if (parts.length >= 2) {
          files.push({ status: st, path: parts[1], from: null });
        }
      }
    }
    /* 单文件 diff（未指定则只回清单） */
    let diff = null, truncated = false;
    const want = String(a.file || "").trim();
    if (want) {
      const rel = want.replace(/\\/g, "/");
      /* 用 -- 分隔，避免文件名被当成版本号；同时限定在该提交范围内 */
      const d = await gitRun(["show", "--format=", "-M", "--no-color", fullHash, "--", rel], { cwd: rr.root, timeoutMs: 30000 });
      if (d.ok) {
        const MAX = 2000000;
        truncated = d.diff === undefined && String(d.stdout).length > MAX;
        diff = truncated ? String(d.stdout).slice(0, MAX) : String(d.stdout);
      } else {
        diff = "";
      }
    }
    return { ok: true, root: rr.root, hash: fullHash, info: info, files: files, diff: diff, truncated: truncated };
  },

  /* 把整棵工作树回退到某次提交（git restore --source=<hash> --worktree -- .）。
     危险：会覆盖未提交改动；前端必须二次确认后才调用。 */
  gitRestoreCommit: async (args) => {
    const a = args || {};
    const root = String(a.path || "");
    if (!root) return { ok: false, error: "缺少路径", code: "ARGS" };
    const rr = await gitRepoRoot(root);
    if (!rr.ok) return { ok: false, error: rr.error, code: "NOT_A_REPO" };
    if (!isWritablePath(rr.root)) return outsideWriteError(rr.root);
    const hash = String(a.hash || "").trim();
    if (!/^[0-9a-fA-F]{4,40}$/.test(hash)) return { ok: false, error: "提交号不合法", code: "ARGS" };
    const t = await gitRun(["cat-file", "-t", hash], { cwd: rr.root, timeoutMs: 20000 });
    if (!t.ok || String(t.stdout).trim() !== "commit") {
      return { ok: false, error: "找不到这次提交", code: "NO_SUCH_COMMIT" };
    }
    /* 回退前/后各算一次「与目标提交不一致的文件」——让界面能如实报告改了什么。
       此前只返回 ok：工作区本就与该提交一致时（例如点的是最新提交）界面毫无变化，
       用户会以为「点了没反应」。 */
    const diffNames = async () => {
      const q = await gitRun(["diff", "--name-only", hash, "--"], { cwd: rr.root, timeoutMs: 60000 });
      return q.ok ? String(q.stdout).split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];
    };
    const before = await diffNames();
    const r = await gitRun(["restore", "--source=" + hash, "--worktree", "--", "."], { cwd: rr.root, timeoutMs: 120000 });
    if (!r.ok) return { ok: false, error: ((r.stderr || "") + (r.stdout || "")).trim() || "git restore 失败" };
    const after = await diffNames();
    /* 回报分支当前指向哪次提交：本操作只改工作区、不动分支，界面要把这点讲清楚，
       否则用户会以为「回退后为什么还显示一堆待提交改动」。 */
    const hs = await gitRun(["rev-parse", "--short", "HEAD"], { cwd: rr.root, timeoutMs: 20000 });
    const headShort = hs.ok ? String(hs.stdout).trim() : "";
    return {
      ok: true, root: rr.root, hash: hash, headShort: headShort,
      changedCount: before.length, changed: before.slice(0, 200),
      restoredCount: before.length - after.length,
      remainingCount: after.length, remaining: after.slice(0, 200)
    };
  },

  /* 重置分支到某次提交（git reset --hard）：分支指针移过去，之后的提交从分支上消失。
     危险操作，前端必须强警告 + 二次确认；重置前的位置会回报给调用方，便于撤回。 */
  gitResetToCommit: async (args) => {
    const a = args || {};
    const root = String(a.path || "");
    if (!root) return { ok: false, error: "缺少路径", code: "ARGS" };
    const rr = await gitRepoRoot(root);
    if (!rr.ok) return { ok: false, error: rr.error, code: "NOT_A_REPO" };
    if (!isWritablePath(rr.root)) return outsideWriteError(rr.root);
    const hash = String(a.hash || "").trim();
    if (!/^[0-9a-fA-F]{4,40}$/.test(hash)) return { ok: false, error: "提交号不合法", code: "ARGS" };
    const t = await gitRun(["cat-file", "-t", hash], { cwd: rr.root, timeoutMs: 20000 });
    if (!t.ok || String(t.stdout).trim() !== "commit") {
      return { ok: false, error: "找不到这次提交", code: "NO_SUCH_COMMIT" };
    }
    /* 重置前的位置 + 会被抛下的提交数（供界面警告与撤回） */
    const b = await gitRun(["rev-parse", "--short", "HEAD"], { cwd: rr.root, timeoutMs: 20000 });
    const beforeShort = b.ok ? String(b.stdout).trim() : "";
    const cnt = await gitRun(["rev-list", "--count", hash + "..HEAD"], { cwd: rr.root, timeoutMs: 30000 });
    const droppedCount = cnt.ok ? (Number(String(cnt.stdout).trim()) || 0) : 0;
    /* 可能变化的文件 = 两次提交之间的差异 ∪ 未提交改动（供前端重载已打开标签） */
    const nameSet = new Set();
    const q1 = await gitRun(["diff", "--name-only", hash, "HEAD", "--"], { cwd: rr.root, timeoutMs: 60000 });
    if (q1.ok) for (const s of String(q1.stdout).split(/\r?\n/)) { const v = s.trim(); if (v) nameSet.add(v); }
    const q2 = await gitRun(["diff", "--name-only", "HEAD", "--"], { cwd: rr.root, timeoutMs: 60000 });
    if (q2.ok) for (const s of String(q2.stdout).split(/\r?\n/)) { const v = s.trim(); if (v) nameSet.add(v); }
    const changed = Array.from(nameSet);
    const r = await gitRun(["reset", "--hard", hash], { cwd: rr.root, timeoutMs: 120000 });
    if (!r.ok) return { ok: false, error: ((r.stderr || "") + (r.stdout || "")).trim() || "git reset 失败" };
    const n = await gitRun(["rev-parse", "--short", "HEAD"], { cwd: rr.root, timeoutMs: 20000 });
    return {
      ok: true, root: rr.root, hash: hash,
      headShort: n.ok ? String(n.stdout).trim() : hash,
      beforeShort: beforeShort, droppedCount: droppedCount,
      changed: changed.slice(0, 200), changedCount: changed.length
    };
  },

  /* 提交。files 为绝对路径数组；省略则提交全部变更。 */
  gitCommit: async (args) => {
    const a = args || {};
    const root = String(a.path || "");
    if (!root) return { ok: false, error: "缺少路径", code: "ARGS" };
    const rr = await gitRepoRoot(root);
    if (!rr.ok) return { ok: false, error: rr.error, code: "NOT_A_REPO" };
    if (!isWritablePath(rr.root)) return outsideWriteError(rr.root);
    const msg = String(a.message || "").trim();
    if (!msg) return { ok: false, error: "请填写提交说明", code: "ARGS" };
    await ensureGitIdentity(rr.root);
    const list = Array.isArray(a.files) ? a.files.map((f) => gitRelPath(rr.root, f)).filter(Boolean) : [];
    let addR;
    if (list.length) addR = await gitRun(["add", "--"].concat(list), { cwd: rr.root });
    else addR = await gitRun(["add", "-A"], { cwd: rr.root });
    if (!addR.ok) return { ok: false, error: (addR.stderr || "").trim() || "git add 失败" };
    const cArgs = ["commit", "-m", msg];
    if (list.length) cArgs.push("--", ...list);
    const c = await gitRun(cArgs, { cwd: rr.root });
    if (!c.ok) {
      const text = ((c.stdout || "") + (c.stderr || "")).trim();
      if (/nothing to commit|无文件要提交|没有文件要提交/i.test(text)) {
        return { ok: false, error: "没有可提交的变更", code: "NOTHING_TO_COMMIT" };
      }
      return { ok: false, error: text || "git commit 失败" };
    }
    const h = await gitRun(["rev-parse", "--short", "HEAD"], { cwd: rr.root, timeoutMs: 20000 });
    const summary = ((c.stdout || "").trim().split("\n").pop() || "").trim();
    return { ok: true, root: rr.root, hash: (h.stdout || "").trim(), summary: summary };
  },

  /* 丢弃某个文件的工作区改动（回到 HEAD 版本）。
     已跟踪文件用 checkout HEAD 还原；未跟踪文件直接删除。
     返回原内容，供前端记录一次可撤销操作。 */
  gitDiscard: async (args) => {
    const a = args || {};
    const root = String(a.path || "");
    const abs = String(a.file || "");
    if (!root || !abs) return { ok: false, error: "缺少参数", code: "ARGS" };
    const rr = await gitRepoRoot(root);
    if (!rr.ok) return { ok: false, error: rr.error, code: "NOT_A_REPO" };
    if (!isWritablePath(rr.root)) return outsideWriteError(rr.root);
    const rel = gitRelPath(rr.root, abs);
    if (!rel) return { ok: false, error: "该文件不在仓库内", code: "OUTSIDE_REPO" };
    /* 备份当前内容：撤销一次写盘类操作要有回头路 */
    let prev = null;
    try {
      const buf = await readFile(abs);
      const d = decodeBytes(buf);
      prev = { content: d.text, encoding: d.encoding, existed: true };
    } catch (e) { prev = { content: "", encoding: "utf8", existed: false }; }
    const st = await parseGitStatus(rr.root);
    const entry = st.ok ? st.status.files.find((f) => f.path.replace(/\\/g, "/") === rel) : null;
    const untracked = entry && entry.x === "?" && entry.y === "?";
    if (untracked) {
      try { await unlink(abs); } catch (e) { return fail(e); }
      return { ok: true, root: rr.root, file: rel, action: "deleted-untracked", prev: prev };
    }
    const c = await gitRun(["checkout", "HEAD", "--", rel], { cwd: rr.root });
    if (!c.ok) return { ok: false, error: (c.stderr || "").trim() || "git checkout 失败" };
    return { ok: true, root: rr.root, file: rel, action: "restored-from-head", prev: prev };
  },

  /* 取某个版本的文件内容（只读，用于「旧版本预览」） */
  gitShowFile: async (args) => {
    const a = args || {};
    const root = String(a.path || "");
    const abs = String(a.file || "");
    const rev = String(a.rev || "HEAD");
    if (!root || !abs) return { ok: false, error: "缺少参数", code: "ARGS" };
    const rr = await gitRepoRoot(root);
    if (!rr.ok) return { ok: false, error: rr.error, code: "NOT_A_REPO" };
    const rel = gitRelPath(rr.root, abs);
    if (!rel) return { ok: false, error: "该文件不在仓库内", code: "OUTSIDE_REPO" };
    if (!/^[0-9a-fA-F]{4,40}$/.test(rev) && !/^(HEAD|HEAD[~^]\d*)$/.test(rev)) {
      return { ok: false, error: "版本号不合法", code: "ARGS" };
    }
    const r = await gitRun(["show", rev + ":" + rel], { cwd: rr.root });
    if (!r.ok) return { ok: false, error: (r.stderr || "").trim() || "该版本中不存在这个文件" };
    return { ok: true, root: rr.root, file: rel, rev: rev, content: r.stdout };
  },

  /* 把某个文件回退到指定版本（写盘）。返回回退前的内容供撤销。 */
  gitRestoreFile: async (args) => {
    const a = args || {};
    const root = String(a.path || "");
    const abs = String(a.file || "");
    const rev = String(a.rev || "HEAD");
    if (!root || !abs) return { ok: false, error: "缺少参数", code: "ARGS" };
    const rr = await gitRepoRoot(root);
    if (!rr.ok) return { ok: false, error: rr.error, code: "NOT_A_REPO" };
    if (!isWritablePath(rr.root)) return outsideWriteError(rr.root);
    const rel = gitRelPath(rr.root, abs);
    if (!rel) return { ok: false, error: "该文件不在仓库内", code: "OUTSIDE_REPO" };
    if (!/^[0-9a-fA-F]{4,40}$/.test(rev) && !/^(HEAD|HEAD[~^]\d*)$/.test(rev)) {
      return { ok: false, error: "版本号不合法", code: "ARGS" };
    }
    let prev = null;
    try {
      const buf = await readFile(abs);
      const d = decodeBytes(buf);
      prev = { content: d.text, encoding: d.encoding, existed: true };
    } catch (e) { prev = { content: "", encoding: "utf8", existed: false }; }
    const c = await gitRun(["checkout", rev, "--", rel], { cwd: rr.root });
    if (!c.ok) return { ok: false, error: (c.stderr || "").trim() || "回退失败" };
    return { ok: true, root: rr.root, file: rel, rev: rev, prev: prev };
  },

  /* ⑨ 按目录查找（真实现）：遍历目录 + 文件类型过滤 + 文本搜索，返回 {path,line,col,text} 列表 */
  findInFiles: async (args) => {
    const a = args || {};
    const dir = String(a.dir || "");
    const needle = String(a.needle || "");
    if (!dir) return { ok: false, error: "缺少目录", code: "ARGS" };
    if (!needle) return { ok: false, error: "缺少查找内容", code: "ARGS" };
    const recurse = a.recurse !== false;   // 默认包含子目录
    const hidden = a.hidden === true;      // 默认不含隐藏目录
    const cs = a.cs === true;              // 区分大小写
    const whole = a.whole === true;        // 全词匹配
    const search = a.search || "normal";   // normal | extended | regex
    const dotall = a.dotall === true;
    const MAX = Math.min(20000, Number(a.maxResults) || 2000); // 结果上限
    const MAX_FILES = 6000;                // 扫描文件数上限
    const MAX_BYTES = 8 * 1024 * 1024;     // 单文件大小上限
    // 文件类型过滤：支持 "*.*"（全部）、"*"（全部）、"*.v;*.sv"、"v;sv"（纯扩展名）、"g_gbk.v"（具体文件名）、含 ? 的通配
    const filterRaw = String(a.filter || "*.*").trim();
    const pats = []; // 每个元素是 RegExp（对文件名小写匹配）
    let allExt = false;
    for (const seg of filterRaw.split(/[;,]/)) {
      let s = seg.trim().toLowerCase();
      if (!s) continue;
      if (s === "*.*" || s === "*" || s === "*.*.*") { allExt = true; continue; }
      // 纯扩展名（无点、无通配）→ 当作 *.ext
      if (!s.includes(".") && !s.includes("*") && !s.includes("?")) s = "*." + s;
      // 只有一个点但无通配（如 g_gbk.v）→ 当作具体文件名 glob（原样）
      // 转成正则：* → .* ，? → . ，其它转义
      let re = "^";
      for (const ch of s) {
        if (ch === "*") re += ".*";
        else if (ch === "?") re += ".";
        else re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      }
      re += "$";
      try { pats.push(new RegExp(re)); } catch (e) { /* 忽略非法片段 */ }
    }
    const extOk = (name) => {
      if (allExt || pats.length === 0) return true;
      const n = name.toLowerCase();
      return pats.some((p) => p.test(n));
    };
    // 构建匹配器（与 client 端 computeMatches 的 normal/extended/regex 语义一致）
    const decodeExt = (s) => {
      let out = "";
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "\\" && i + 1 < s.length) {
          const n = s[i + 1];
          if (n === "t") { out += "\t"; i++; }
          else if (n === "n") { out += "\n"; i++; }
          else if (n === "r") { out += "\r"; i++; }
          else if (n === "\\") { out += "\\"; i++; }
          else if (n === "x" && i + 3 < s.length && /^[0-9a-fA-F]{2}$/.test(s.slice(i + 2, i + 4))) { out += String.fromCharCode(parseInt(s.slice(i + 2, i + 4), 16)); i += 3; }
          else if (n === "u" && i + 5 < s.length && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) { out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16)); i += 5; }
          else out += ch;
        } else out += ch;
      }
      return out;
    };
    const isWord = (ch) => /[A-Za-z0-9_]/.test(ch);
    // 正则模式：编译一次，供整篇匹配复用（dotall 控制 . 是否匹配换行）
    let re = null;
    if (search === "regex") {
      /* 灾难性回溯的第二道闸（第一道在客户端下发前）：这里同步 exec，一旦病态正则
         在某个长行上回溯，host 的单线程事件循环就被占住，GUI 与所有会话一起冻结且只能
         重启，所以宁可拒绝执行。 */
      if (/\([^()]*[+*][^()]*\)\s*[+*]/.test(needle)) return { ok: false, error: "正则含嵌套量词（如 (a+)+），可能造成灾难性回溯，已阻止执行", code: "REGEX_RISKY" };
      try { re = new RegExp(needle, "g" + (cs ? "" : "i") + (dotall ? "s" : "")); }
      catch (e) { return { ok: false, error: "正则表达式无效: " + e.message, code: "BAD_REGEX" }; }
    } else if (search !== "extended" && needle === "") {
      return { ok: false, error: "查找内容为空", code: "ARGS" };
    }
    // 从绝对偏移反推 0-based 行号（二分 lineStarts；lineStarts 是每行起始绝对偏移，升序）
    const lineOf = (lineStarts, off) => {
      let lo = 0, hi = lineStarts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1;
      }
      return lo;
    };
    // 整篇匹配：返回 [{line, col, len}]（line 1-based，col 0-based）
    // 与逐行匹配不同，这里能正确处理多行匹配（正则 dotall、扩展模式 \n），
    // 此前逐行 split 后再匹配，跨行匹配恒为 0 结果。
    const matchAll = (text) => {
      const lineStarts = [0];
      for (let i = 0; i < text.length; i++) {
        if (text[i] === "\n" || text[i] === "\r") {
          // 跳过 \r\n 的 \n（避免空行重复计数）
          if (text[i] === "\r" && text[i + 1] === "\n") i++;
          lineStarts.push(i + 1);
        }
      }
      const hits = [];
      const pushHit = (off, len) => {
        const line = lineOf(lineStarts, off) + 1;
        const col = off - lineStarts[line - 1];
        hits.push({ line, col, len });
        if (hits.length > 200) return true;   // 单文件命中上限
        return false;
      };
      if (search === "regex") {
        re.lastIndex = 0;
        let m, guard = 0;
        while ((m = re.exec(text)) !== null) {
          if (m[0].length === 0) { re.lastIndex++; if (++guard > 10000) break; continue; }
          if (pushHit(m.index, m[0].length)) break;
        }
      } else {
        const q = search === "extended" ? decodeExt(needle) : needle;
        const hay = cs ? text : text.toLowerCase();
        const qq = cs ? q : q.toLowerCase();
        let i = 0;
        while (i <= text.length) {
          const idx = hay.indexOf(qq, i);
          if (idx < 0) break;
          if (whole) {
            const before = idx > 0 ? text[idx - 1] : "";
            const after = idx + qq.length < text.length ? text[idx + qq.length] : "";
            if (isWord(before) || isWord(after)) { i = idx + Math.max(1, qq.length); continue; }
          }
          if (pushHit(idx, qq.length)) break;
          i = idx + Math.max(1, qq.length);
        }
      }
      return hits;
    };
    const results = [];
    let scanned = 0;
    let truncated = false;
    const walk = async (d, depth) => {
      if (truncated) return;
      if (depth > 20) return;
      if (!recurse && depth > 0) return;
      let entries = [];
      try { entries = await readdir(d, { withFileTypes: true }); } catch (e) { return; }
      for (const x of entries) {
        if (truncated) return;
        const name = x.name;
        if (x.isDirectory()) {
          const lower = name.toLowerCase();
          if (findSkipDirExact.includes(lower)) continue; // 只跳过版本库/依赖目录
          // 以 . 开头视为隐藏目录（受"包含隐藏目录"控制），但 Vivado 工程目录（.srcs/.gen/.runs 等）不算隐藏目录
          if (name.startsWith(".") && !hidden && !VIVADO_PROJ_DIRS.has(lower)) continue;
          await walk(d + "\\" + name, depth + 1);
        } else if (x.isFile()) {
          if (!hidden && name.startsWith(".")) continue; // 隐藏文件受控
          if (scanned >= MAX_FILES) { truncated = true; return; }
          /* 写盘用的临时文件（.desk-tmp-*）是"写到一半被强杀"的残留，不该被
             查找/替换当成源码扫描（否则会被当正文匹配、甚至被替换掉）。 */
          if (name.includes(".desk-tmp-")) continue;
          if (!extOk(name)) continue;
          scanned++;
          const full = d + "\\" + name;
          let bytes;
          try {
            const st = await stat(full);
            if (!st.isFile() || st.size > MAX_BYTES) continue;
            bytes = await readFile(full);
          } catch (e) { continue; }
          if (looksBinary(bytes)) continue;
          let text;
          try { text = decodeBytes(bytes).text; } catch (e) { continue; }
          // 整篇匹配（支持跨行）；命中行文本取整篇 split 的第 line 行
          const hits = matchAll(text);
          if (!hits.length) continue;
          const lines = text.split(/\r\n|\r|\n/);
          for (const h of hits) {
            const lineText = (h.line >= 1 && h.line <= lines.length) ? lines[h.line - 1] : "";
            results.push({ path: full, line: h.line, col: h.col + 1, len: h.len || 0, text: lineText });
            if (results.length >= MAX) { truncated = true; return; }
          }
        }
      }
    };
    try {
      await walk(dir, 0);
      return { ok: true, results, scanned, truncated };
    } catch (e) { return fail(e); }
  },

  /* ⑨ 在工程中替换（Find in Projects 的替换）：对多个目录批量替换并写回，保持原文件编码 */
  replaceInFiles: async (args) => {
    const a = args || {};
    const dirs = Array.isArray(a.dirs) ? a.dirs.filter(Boolean) : (a.dir ? [a.dir] : []);
    const needle = String(a.needle || "");
    const rep = a.rep != null ? String(a.rep) : "";
    if (!dirs.length) return { ok: false, error: "缺少目录", code: "ARGS" };
    if (!needle) return { ok: false, error: "缺少查找内容", code: "ARGS" };
    const cs = a.cs === true;
    const whole = a.whole === true;
    const search = a.search || "normal";
    const dotall = a.dotall === true;
    const hidden = a.hidden === true;
    const MAX_FILES = 6000;
    const MAX_BYTES = 8 * 1024 * 1024;
    const recurseAll = a.recurse !== false;   // 该接口也是公开 API：recurse:false 时不应进入子目录
    const MAX_REPL = Math.min(50000, Number(a.maxResults) || 20000);
    // 文件类型 glob（与 findInFiles 同规则）
    const filterRaw = String(a.filter || "*.*").trim();
    const pats = [];
    let allExt = false;
    for (const seg of filterRaw.split(/[;,]/)) {
      let s = seg.trim().toLowerCase();
      if (!s) continue;
      if (s === "*.*" || s === "*" || s === "*.*.*") { allExt = true; continue; }
      if (!s.includes(".") && !s.includes("*") && !s.includes("?")) s = "*." + s;
      let re = "^";
      for (const ch of s) {
        if (ch === "*") re += ".*"; else if (ch === "?") re += ".";
        else re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      }
      re += "$";
      try { pats.push(new RegExp(re)); } catch (e) { }
    }
    const extOk = (name) => { if (allExt || pats.length === 0) return true; const n = name.toLowerCase(); return pats.some((p) => p.test(n)); };
    // 扩展模式转义
    const decodeExt = (s) => {
      let out = "";
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "\\" && i + 1 < s.length) {
          const n = s[i + 1];
          if (n === "t") { out += "\t"; i++; }
          else if (n === "n") { out += "\n"; i++; }
          else if (n === "r") { out += "\r"; i++; }
          else if (n === "\\") { out += "\\"; i++; }
          else if (n === "x" && i + 3 < s.length && /^[0-9a-fA-F]{2}$/.test(s.slice(i + 2, i + 4))) { out += String.fromCharCode(parseInt(s.slice(i + 2, i + 4), 16)); i += 3; }
          else if (n === "u" && i + 5 < s.length && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) { out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16)); i += 5; }
          else out += ch;
        } else out += ch;
      }
      return out;
    };
    const isWord = (ch) => /[A-Za-z0-9_]/.test(ch);
    // 行内替换（返回 {text, count}）。与 findInFiles 的匹配语义一致
    let replaceLine;
    if (search === "regex") {
      let re;
      /* 灾难性回溯的第二道闸（第一道在客户端下发前）：这里同步 exec，一旦病态正则
         在某个长行上回溯，host 的单线程事件循环就被占住，GUI 与所有会话一起冻结且只能
         重启，所以宁可拒绝执行。 */
      if (/\([^()]*[+*][^()]*\)\s*[+*]/.test(needle)) return { ok: false, error: "正则含嵌套量词（如 (a+)+），可能造成灾难性回溯，已阻止执行", code: "REGEX_RISKY" };
      try { re = new RegExp(needle, "g" + (cs ? "" : "i") + (dotall ? "s" : "")); }
      catch (e) { return { ok: false, error: "正则表达式无效: " + e.message, code: "BAD_REGEX" }; }
      replaceLine = (line) => {
        re.lastIndex = 0;
        let n = 0;
        const out = line.replace(re, (...mm) => { n++; return String(rep).replace(/\$([1-9])/g, (g, d) => (mm[Number(d)] != null ? mm[Number(d)] : "")); });
        return { text: out, count: n };
      };
    } else {
      const q = search === "extended" ? decodeExt(needle) : needle;
      if (!q) return { ok: false, error: "查找内容为空", code: "ARGS" };
      replaceLine = (line) => {
        let out = "", i = 0, n = 0;
        const hay = cs ? line : line.toLowerCase();
        const qq = cs ? q : q.toLowerCase();
        while (i <= line.length) {
          const idx = hay.indexOf(qq, i);
          if (idx < 0) { out += line.slice(i); break; }
          out += line.slice(i, idx);
          if (whole) {
            const before = idx > 0 ? line[idx - 1] : "";
            const after = idx + qq.length < line.length ? line[idx + qq.length] : "";
            if (isWord(before) || isWord(after)) { out += line.slice(idx, idx + qq.length); i = idx + qq.length; continue; }
          }
          out += rep; n++;
          i = idx + Math.max(1, qq.length);
        }
        return { text: out, count: n };
      };
    }
    const results = [];
    let replaced = 0, files = 0, scanned = 0, truncated = false, lossySkipped = 0, outsideSkipped = 0, failedSkipped = 0;
    const walk = async (d, depth) => {
      if (truncated || depth > 20) return;
      if (!recurseAll && depth > 0) return;   // 与 findInFiles 的 recurse 语义对齐
      let entries = [];
      try { entries = await readdir(d, { withFileTypes: true }); } catch (e) { return; }
      for (const x of entries) {
        if (truncated) return;
        const name = x.name;
        if (x.isDirectory()) {
          const lower = name.toLowerCase();
          if (findSkipDirExact.includes(lower)) continue; // 只跳过版本库/依赖目录
          if (name.startsWith(".") && !hidden && !VIVADO_PROJ_DIRS.has(lower)) continue; // Vivado 工程目录不算隐藏目录
          await walk(d + "\\" + name, depth + 1);
        }
        else if (x.isFile()) {
          if (!hidden && name.startsWith(".")) continue;
          if (scanned >= MAX_FILES) { truncated = true; return; }
          /* 写盘用的临时文件（.desk-tmp-*）是"写到一半被强杀"的残留，不该被
             查找/替换当成源码扫描（否则会被当正文匹配、甚至被替换掉）。 */
          if (name.includes(".desk-tmp-")) continue;
          if (!extOk(name)) continue;
          scanned++;
          const full = d + "\\" + name;
          let bytes, enc;
          try { const st = await stat(full); if (!st.isFile() || st.size > MAX_BYTES) continue; bytes = await readFile(full); } catch (e) { continue; }
          if (looksBinary(bytes)) continue;
          let text;
          try { const dec = decodeBytes(bytes); text = dec.text; enc = dec.encoding; } catch (e) { continue; }
          const nlParts = text.split(/(\r\n|\r|\n)/); // 保留换行符
          let fileCount = 0;
          const hits = [];
          for (let li = 0; li < nlParts.length; li += 1) {
            if (nlParts[li] === "\r\n" || nlParts[li] === "\r" || nlParts[li] === "\n") continue;
            const r = replaceLine(nlParts[li]);
            if (r.count > 0) {
              nlParts[li] = r.text; fileCount += r.count;
              hits.push({ line: Math.floor(li / 2) + 1, text: r.text });
              if (replaced + fileCount >= MAX_REPL) { truncated = true; break; }
            }
          }
          if (fileCount > 0) {
            if (!isWritablePath(full)) { outsideSkipped += 1; continue; }
            const newText = nlParts.join("");
            let out = null;
            if (enc === "gbk") {
              const gb = encodeGbk(newText);
              // 表外字符，或「写回后读不回同样文本」→ 整文件拒写，避免静默变 '?' 或字节错乱
              if (!gb || gb.lost > 0 || decodeBytes(gb.bytes).text !== newText) { lossySkipped += 1; continue; }
              out = gb.bytes;
            } else {
              out = Buffer.from(newText, "utf8");
            }
            // 原子替换：先写同目录临时文件再 rename，避免中途失败留下半截源码。
            // 临时名带随机后缀：只用 pid 时两个并发请求替换同一文件会互相踩。
            const tmp = full + ".desk-tmp-" + process.pid + "-" + Math.random().toString(36).slice(2, 8);
            try {
              await writeFile(tmp, out);
              await rename(tmp, full);
              // 计数与结果只在**写盘成功之后**累加：否则会出现
              // 「已替换 37 处（0 个文件）」这种与实际不符、还掩盖失败的报告
              replaced += fileCount;
              files++;
              for (const h of hits) results.push({ path: full, line: h.line, col: 1, text: h.text });
            } catch (e) {
              failedSkipped += 1;
              try { await unlink(tmp); } catch (e2) { /* 清理失败忽略 */ }
            }
          }
        }
      }
    };
    try {
      for (const d of dirs) {
        if (truncated) break;
        await walk(d, 0);
      }
      return {
        ok: true, results, replaced, files, scanned, truncated, lossySkipped, outsideSkipped,
        // 查找用整篇匹配（支持跨行/dotall），替换却是逐行做：跨行匹配会被「查到但替换不到」，
        // 这里如实回报，让客户端提示用户，而不是静默显示「已替换 0 处」。
        crossLineNote: dotall ? "「.matches newline」模式下替换按行执行，跨行匹配不会被替换" : ""
      };
    } catch (e) { return fail(e); }
  }
};

/* ------------------------------------------------------------------ */
/* 浏览器信任 fence（同 better-sidebar 语义：loopback/trusted + 同源）  */
/* ------------------------------------------------------------------ */
function header(headers, name) {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key === void 0 ? void 0 : headers[key];
}
function parseAuthority(host) {
  try { return new URL(`http://${host}`); } catch (e) { return void 0; }
}
function isLoopbackHostname(hostname) {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  const parts = hostname.split(".");
  return parts.length === 4 && parts[0] === "127" && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}
function canonicalAuthority(entry, entryUrl) {
  const port = entryUrl.port !== "" ? entryUrl.port : new URL(`https://${entry}`).port;
  return port === "" ? entryUrl.hostname : `${entryUrl.hostname}:${port}`;
}
function isTrustedAuthority(hostUrl, trustedHosts) {
  return (trustedHosts || []).some((entry) => {
    const entryUrl = parseAuthority(entry);
    if (entryUrl === void 0) return false;
    return canonicalAuthority(entry, entryUrl) === entryUrl.hostname ? entryUrl.hostname === hostUrl.hostname : entryUrl.host === hostUrl.host;
  });
}
function isTrustedApiRequest(request, trustedHosts) {
  const host = header(request.headers, "host");
  if (host === void 0) return false;
  const hostUrl = parseAuthority(host);
  if (hostUrl === void 0) return false;
  const loopback = isLoopbackHostname(hostUrl.hostname);
  if (!loopback && !isTrustedAuthority(hostUrl, trustedHosts)) return false;
  if (header(request.headers, "sec-fetch-site") === "cross-site") return false;
  const origin = header(request.headers, "origin");
  if (origin === void 0) {
    // 无 Origin：浏览器发起的跨站请求一定带 Origin，只有工具型客户端（curl / 本机脚本）不带。
    // 因此这里只允许回环地址；LAN 受信主机必须携带同源 Origin 才能调用，
    // 否则「配了 trustedHosts 之后任何无 Origin 的请求都能读写文件」这个缺口就一直在。
    return loopback;
  }
  try { return new URL(origin).host === hostUrl.host; } catch (e) { return false; }
}

function writeJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}
const MAX_BODY_BYTES = 64 * 1024 * 1024;   // 64MB：足够整文件写入，同时避免无上限请求打爆 host 内存
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    // 只接受 JSON：避免把任意 content-type 当 JSON 解析，也拒绝明显不是本协议的请求
    const contentType = header(req.headers, "content-type") || "";
    if (!/^application\/json\b/i.test(contentType)) { reject(new Error("unsupported content-type")); return; }
    const chunks = [];
    let size = 0;
    let settled = false;
    // 空闲超时：只有总量上限时，慢速滴灌的请求能长期占住连接与内存
    try { req.setTimeout(30000, () => { if (settled) return; settled = true; reject(new Error("request body timeout")); }); } catch (e) { /* 环境不支持则忽略 */ }
    req.on("data", (c) => {
      if (settled) return;
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        settled = true;
        reject(new Error("request body too large"));
        // 不要 destroy：销毁 socket 会让随后的 413 响应发不出去（客户端只看到网络错误）
        try { req.resume(); } catch (e) { /* 消费并丢弃剩余请求体，让连接把响应写完 */ }
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (e) { reject(new Error("bad json body")); }
    });
    req.on("error", (e) => { if (!settled) { settled = true; reject(e); } });
  });
}

/* ------------------------------------------------------------------ */
/* apply                                                              */
/* ------------------------------------------------------------------ */
export function apply(ctx) {
  // 上次保存的工作区目录自动纳入可写根（用户之前打开过的工程不必再次授权）
  loadWorkspace().then((ws) => { for (const f of (ws && ws.folders) || []) registerWriteRoot(f.path); }).catch(() => { });
  // webRuntime 是可选依赖（不进 inject，避免插件停在等待态），且必须**每次请求重新取**：
  // 它在 dsh-web-app 里是「HTTP 服务绑定之后」才 provide 的，若本插件先 apply，
  // 一次性快照会把 trustedHosts 永久固化为 []，从局域网地址访问时 /desk/api 全部 403。
  const fence = (req) => {
    const rt = typeof ctx.get === "function" ? ctx.get("webRuntime") : null;
    return isTrustedApiRequest(req, (rt && rt.trustedHosts) || []);
  };
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/desk/api",
    handler: async (req, res) => {
      if (!fence(req)) { writeJson(res, 403, { ok: false, error: "forbidden" }); return; }
      if (req.method !== "POST") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
      // 安全边界：URL 解析必须包在 try 内。req.url 来自网络，畸形值（如 "//["）
      // 会让 new URL 抛错；handler 是 async，未捕获的拒绝会让 Node 终止进程。
      let pathname;
      try {
        pathname = new URL(req.url || "/", "http://dsh.internal").pathname;
      } catch (e) {
        writeJson(res, 400, { ok: false, error: "bad request url" });
        return;
      }
      const method = pathname.startsWith("/desk/api/") ? pathname.slice(10) : void 0;
      if (method === void 0 || method.includes("/")) { writeJson(res, 404, { ok: false, error: `unknown method "${method}"` }); return; }
      let payload;
      try {
        payload = await readJsonBody(req);
      } catch (error) {
        const m = (error && error.message) || "bad json body";
        const status = m === "unsupported content-type" ? 415 : (m === "request body too large" ? 413 : (m === "request body timeout" ? 408 : 400));
        writeJson(res, status, { ok: false, error: m });
        return;
      }
      try {
        // 只认自有属性：api["constructor"] / api["__proto__"] 会沿原型链取到非方法值
        const handler = Object.prototype.hasOwnProperty.call(api, method) ? api[method] : void 0;
        if (typeof handler !== "function") { writeJson(res, 404, { ok: false, error: `unknown method "${method}"` }); return; }
        writeJson(res, 200, await handler(payload));
      } catch (error) {
        writeJson(res, 500, fail(error));
      }
    }
  }), "dsh-card-desktop: /desk/api routes");
}
