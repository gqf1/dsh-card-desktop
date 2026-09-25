window.__ModuleLoader__.load({
  id: "dsh-card-desktop",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    let reactMod = require("react");
    const React = reactMod && reactMod.default && !reactMod.createElement ? reactMod.default : reactMod;
    // Portal：把查找框渲染到 document.body，彻底脱离编辑器/分栏的层叠上下文，避免被右栏盖住
    let reactDomMod = null;
    try { reactDomMod = require("react-dom"); } catch (e) { reactDomMod = null; }
    const createPortal = reactDomMod && reactDomMod.default && reactDomMod.default.createPortal ? reactDomMod.default.createPortal : (reactDomMod && reactDomMod.createPortal ? reactDomMod.createPortal : null);

    // 主界面同款 Markdown 渲染（标题加粗加大、行内代码/代码块等宽字体）——
    // primitives 是 dsh 客户端运行时的全局内置模块，可直接 require（无需 inject 声明）。
    let primitivesMod = null;
    try { primitivesMod = require("@deepseek-ai/dsh-client-ui-primitives"); } catch (e) { primitivesMod = null; }
    const MarkdownText = primitivesMod && primitivesMod.MarkdownText ? primitivesMod.MarkdownText : null;
    /* MarkdownText 的 labels 形状（在 web shell 产物里穷举过，只读这三处）：
         labels.code.copyLabel / labels.code.copiedLabel —— 代码块右上角复制按钮
         labels.footnotes                          —— 脚注区标题（sr-only）
       少传 labels 会在渲染到代码块时抛 Cannot read properties of undefined (reading 'code')，
       把整个对话面板打成错误框（实测）。prop 名就是 labels，不是 codeLabels。 */
    const MD_LABELS = { code: { copyLabel: "复制", copiedLabel: "已复制" }, footnotes: "脚注" };
    /* 对话区图片：把附件变成可显示 URL。
       官方 uiConversation.imageUrl(sessionId, attachment) 会做 readAttachment + blob URL 并缓存；
       peekImageUrl 是同步取已缓存 URL 的版本，命中就不用等异步。
       任何失败只降级成一行提示，绝不抛错打断消息渲染。 */
    const ChatImg = (props) => {
      const { uiConversation, sessionId, attachment } = props;
      const [url, setUrl] = React.useState("");
      const [err, setErr] = React.useState("");
      React.useEffect(() => {
        let live = true;
        try {
          if (uiConversation && typeof uiConversation.peekImageUrl === "function") {
            const hit = uiConversation.peekImageUrl(sessionId, attachment);
            if (hit) { setUrl(hit); return () => { live = false; }; }
          }
          if (uiConversation && typeof uiConversation.imageUrl === "function") {
            Promise.resolve(uiConversation.imageUrl(sessionId, attachment))
              .then((u) => { if (live && u) setUrl(String(u)); })
              .catch((e) => { if (live) setErr(String((e && e.message) || e)); });
          } else if (live) setErr("图片服务不可用");
        } catch (e) { if (live) setErr(String((e && e.message) || e)); }
        return () => { live = false; };
      }, [uiConversation, sessionId, attachment]);
      const tag = "（" + (((attachment && (attachment.name || attachment.attachmentId)) || "附件")) + "）";
      if (err) return React.createElement("div", { style: { fontSize: 11, color: "#d19a66", wordBreak: "break-all" }, title: err }, "［图片］无法显示" + tag + "：" + err);
      if (!url) return React.createElement("div", { style: { fontSize: 11, color: "#858889" } }, "［图片］加载中…" + tag);
      return React.createElement("img", {
        src: url, alt: "图片",
        style: { maxWidth: "100%", maxHeight: 280, borderRadius: 8, border: "1px solid #2A2B2C", display: "block", background: "#191A1B" }
      });
    };
    /* markdown 渲染失败时降级为纯文本：官方组件将来再加新键也不会让对话区整块报错 */
    class MdSafe extends React.Component {
      constructor(props) { super(props); this.state = { bad: false }; }
      static getDerivedStateFromError() { return { bad: true }; }
      componentDidCatch(e) { try { console.error("[card-desktop] markdown", e); } catch (e2) { } }
      render() {
        if (this.state.bad) return React.createElement("div", { style: { whiteSpace: "pre-wrap" } }, this.props.text);
        return this.props.children;
      }
    }

    /* ---------- 图标：取自用户 VSCode 的 Material Icon Theme（pkief.material-icon-theme 5.38.1） ---------- */
    const MAT_ICON = {
      folder: '<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="m6.922 3.768-.644-.536A1 1 0 0 0 5.638 3H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H7.562a1 1 0 0 1-.64-.232" fill="#90a4ae" /></svg>',
      folderOpen: '<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14.483 6H4.721a1 1 0 0 0-.949.684L2 12V5h12a1 1 0 0 0-1-1H7.562a1 1 0 0 1-.64-.232l-.644-.536A1 1 0 0 0 5.638 3H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h11l2.403-5.606A1 1 0 0 0 14.483 6" fill="#90a4ae" /></svg>',
      file: '<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="m8.668 6h3.6641l-3.6641-3.668v3.668m-4.668-4.668h5.332l4 4v8c0 0.73828-0.59375 1.3359-1.332 1.3359h-8c-0.73828 0-1.332-0.59766-1.332-1.3359v-10.664c0-0.74219 0.59375-1.3359 1.332-1.3359m3.332 1.3359h-3.332v10.664h8v-6h-4.668z" fill="#90a4ae" /></svg>',
      // Material 把 .v 映射给 V 语言（vlang），与原 VSCode 观感一致
      vlang: '<svg width="16" height="16" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg"><path fill="#546e7a" d="m311.64 433.372 130.885-363.97c2.22-6.173-1.28-10.674-7.809-10.044l-102.93 9.915c-6.529.63-13.582 6.17-15.739 12.363L194.901 429.48c-2.158 6.194 1.416 11.223 7.975 11.223h100.191c3.28 0 6.843-2.505 7.953-5.592z"/><path fill="#039be5" d="m65.278 59.359 102.93 9.915c6.529.63 13.59 6.167 15.757 12.358l123.714 353.456c1.083 3.097-.7 5.608-3.98 5.608H202.877c-6.56 0-13.688-5.01-15.907-11.183L57.472 69.398c-2.22-6.173 1.28-10.674 7.809-10.044z"/></svg>',
      verilog: '<svg width="16" height="16" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill="#ff7043" d="M21.833 8A2.17 2.17 0 0 1 24 10.167v11.666A2.17 2.17 0 0 1 21.833 24H10.167A2.17 2.17 0 0 1 8 21.833V10.167A2.17 2.17 0 0 1 10.167 8zm0-2H10.167A4.167 4.167 0 0 0 6 10.167v11.666A4.167 4.167 0 0 0 10.167 26h11.666A4.167 4.167 0 0 0 26 21.833V10.167A4.167 4.167 0 0 0 21.833 6"/><path fill="#ff7043" d="M18 14v4h-4v-4zm2-2h-8v8h8zM2 12h4v2H2zm0 6h4v2H2zm24-6h4v2h-4zm0 6h4v2h-4zm-8 8h2v4h-2zm-6 0h2v4h-2zm6-24h2v4h-2zm-6 0h2v4h-2z"/></svg>',
      tcl: '<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#ef5350" d="M21.492 2.51S14.24 2.157 8.526 9.988c-4.385 6.008-6.018 11.504-6.018 11.504l1.842-.95c1.366-2.372 2.078-3.35 3.417-4.745 2.401.702 4.907.617 7.08-1.899-1.898-.53-3.416-.408-5.657-.18C11.706 12 13.424 11.62 15.797 12l.949-1.898c-1.709-.323-2.848-.352-4.537.038 1.87-1.32 3.17-2.06 5.486-1.937l1.148-1.832c-1.48-.104-2.372.057-4.072.475C16.3 5.46 17.695 4.834 19.726 4.71c0 0 .997-1.793 1.766-2.202z"/></svg>'
    };
    /** 按名字/类型选图标 SVG（对齐 Material Icon Theme 的映射规则） */
    const matIconOf = (name, isDir, expanded) => {
      if (isDir) return expanded ? MAT_ICON.folderOpen : MAT_ICON.folder;
      const ext = (String(name || "").split(".").pop() || "").toLowerCase();
      if (ext === "v") return MAT_ICON.vlang;
      if (ext === "sv" || ext === "svh" || ext === "vh") return MAT_ICON.verilog;
      if (ext === "tcl" || ext === "do" || ext === "xdc") return MAT_ICON.tcl;
      return MAT_ICON.file;
    };
    /** 渲染图标 span（SVG 内联） */
    const matIcon = (name, isDir, expanded) => React.createElement("span", {
      style: { width: 16, height: 16, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" },
      dangerouslySetInnerHTML: { __html: matIconOf(name, isDir, expanded) }
    });

    /* ---------------- 常量（对齐 VSCode 1.127 默认主题 Dark Modern） ---------------- */
    /* ---------------- 常量（对齐用户 VSCode 实际主题 Dark 2026 / "2026 Dark"） ---------------- */
    const C = {
      editorBg: "#121314",        // editor.background（Dark 2026：比 Dark Modern 暗很多）
      sideBg: "#191A1B",          // sideBar.background
      titleBg: "#191A1B",         // titleBar.activeBackground
      tabBg: "#191A1B",           // tab.inactiveBackground
      tabActive: "#121314",       // tab.activeBackground
      tabBorder: "#2A2B2C",       // tab.border
      border: "#2A2B2C",          // sideBar.border / panel.border
      controlBorder: "#3C3C3C",   // input.border / dropdown.border（继承 dark_modern）
      text: "#BBBEBF",            // editor.foreground
      dim: "#8C8C8C",             // tab.inactiveForeground
      lineNo: "#858889",          // editorLineNumber.foreground
      accent: "#3994BC",          // focusBorder / tab.activeBorderTop（青）
      buttonBg: "#297AA0",        // button.background
      hover: "rgba(57,148,188,.2)",
      warn: "#D19A66",
      green: "#2EA043",           // editorGutter.addedBackground
      menuBg: "#202122",          // menu.background / editorWidget.background
      activeLine: "#242526",      // editor.lineHighlightBackground
      topbarBg: "rgba(25,26,27,.96)"
    };
    /* 卡片桌面「外壳」色板：跟随宿主主题 token（亮/暗自动切换，带旧值兜底）。
       编辑器区刻意保持复刻 VSCode Dark 2026，不参与主题化。 */
    /* ============ Verilog 静态检查（lint）引擎：纯函数、O(n) 词法扫描 ============
       规则 1-8，只报"能确定"的问题（7/8 尤其保守），避免误报淹没真问题。
       与格式化引擎一样先做代码区掩码：注释与字符串内部一律不参与判定。 */
    const LINT_PUNCT = { "，": ",", "；": ";", "：": ":", "（": "(", "）": ")", "【": "[", "】": "]", "“": "\"", "”": "\"", "‘": "'", "’": "'", "、": ",", "。": ".", "？": "?", "！": "!", "《": "<", "》": ">", "　": " " };
    const lintOnRef = { current: true };   // 静态检查总开关（FPGA 菜单 → 静态检查 → 当前文件）
    /* 纯风格/文件级提示，默认不显示：用户实测「工程里根本没写 `default_nettype none 的习惯」，
       这类 info 只会把真问题淹掉（他工程里 1485 条 info 中这 3 条规则占 327 条）。
       需要时在 FPGA 菜单里勾选「风格提示」即可显示。 */
    const LINT_STYLE_RULES = { timescale: 1, "default-nettype": 1, "line-width": 1 };
    const lintStyleRef = { current: false };
    const NL_FOR_TIP = String.fromCharCode(10);   // 提示文本里的换行
    /* 代码区掩码：// 与块注释、字符串内部替换为空格（保留长度以便算列号） */
    const lintMaskCode = (lines) => {
      const out = []; let inBlock = false, inAttr = false;
      for (const raw of lines) {
        let t = "", i = 0, inStr = false;
        while (i < raw.length) {
          const c = raw[i], c2 = raw[i + 1];
          if (inBlock) { if (c === "*" && c2 === "/") { inBlock = false; t += "  "; i += 2; continue; } t += " "; i++; continue; }
          if (inStr) { if (c === "\\") { t += "  "; i += 2; continue; } if (c === "\"") inStr = false; t += " "; i++; continue; }
          if (inAttr) { if (c === "*" && c2 === ")") { inAttr = false; t += "  "; i += 2; continue; } t += " "; i++; continue; }
          if (c === "/" && c2 === "/") { t += " ".repeat(raw.length - i); i = raw.length; continue; }
          if (c === "/" && c2 === "*") { inBlock = true; t += "  "; i += 2; continue; }
          /* 属性块 (* ... *) 整体抹掉：里面的 ASYNC_REG = "TRUE" 会被赋值正则当成赋值目标（实测误报）。
             @(*) 通配符（( * ) 三连）不是属性，必须原样保留 —— 组合 always 的判定依赖它。 */
          if (c === "(" && c2 === "*" && raw[i + 2] !== ")") { inAttr = true; t += "  "; i += 2; continue; }
          if (c === "\"") { inStr = true; t += " "; i++; continue; }
          t += c; i++;
        }
        out.push(t);
      }
      return out;
    };
    const lintWidthOf = (br) => {
      const m = /^\[\s*(\d+)\s*:\s*(\d+)\s*\]$/.exec(String(br || "").trim());
      if (!m) return 0;
      return Math.abs((+m[1]) - (+m[2])) + 1;
    };
    const lintVerilog = (text) => {
      const issues = [];
      const src = String(text || "");
      if (!src) return issues;
      const code = lintMaskCode(src.split("\n"));
      const add = (line, col, len, sev, rule, msg) => { issues.push({ line, col, len: Math.max(1, len | 0), sev, rule, msg }); };
      /* ④ 代码区全角标点 */
      for (let i = 0; i < code.length; i++) {
        const t = code[i];
        for (let k = 0; k < t.length; k++) {
          const rep = LINT_PUNCT[t[k]];
          if (rep !== undefined) add(i + 1, k + 1, 1, "error", "punct", "代码区出现全角标点「" + t[k] + "」，应为半角「" + rep + "」");
        }
      }
      /* ① 块关键字配对 + ⑥ case 缺 default */
      const KW = /\b(default|endmodule|endfunction|endtask|endgenerate|endcase|begin|end|casex|casez|case|module|function|task|generate|fork|join)\b/g;
      const PAIR = { endmodule: "module", endfunction: "function", endtask: "task", endgenerate: "generate", endcase: "case", end: "begin", join: "fork" };
      const CLOSE_OF = { begin: "end", case: "endcase", module: "endmodule", function: "endfunction", task: "endtask", generate: "endgenerate", fork: "join" };
      const stack = [];
      for (let i = 0; i < code.length; i++) {
        KW.lastIndex = 0; let m;
        while ((m = KW.exec(code[i])) !== null) {
          const w = m[1];
          if (w === "default") { for (let k = stack.length - 1; k >= 0; k--) { if (stack[k].w === "case") { stack[k].hasDefault = true; break; } } continue; }
          if (w === "case" || w === "casex" || w === "casez") { stack.push({ w: "case", kw: w, line: i + 1, col: m.index + 1, hasDefault: false }); continue; }
          if (w === "begin" || w === "module" || w === "function" || w === "task" || w === "generate" || w === "fork") { stack.push({ w, kw: w, line: i + 1, col: m.index + 1 }); continue; }
          const want = PAIR[w];
          if (!want) continue;
          let found = -1;
          for (let k = stack.length - 1; k >= 0; k--) { if (stack[k].w === want) { found = k; break; } }
          if (found < 0) { add(i + 1, m.index + 1, w.length, "error", "block", "多出的 " + w + "：找不到与之配对的 " + want); continue; }
          for (let k = found + 1; k < stack.length; k++) {
            const mm = stack[k];
            add(mm.line, mm.col, mm.kw.length, "error", "block", "缺少与第 " + mm.line + " 行「" + mm.kw + "」配对的 " + (CLOSE_OF[mm.w] || "end"));
          }
          const open = stack[found];
          stack.length = found;   // 丢弃 open 及其之后（后面那些已在上面报过"缺少配对"）
          if (open && open.w === "case" && open.hasDefault !== true) add(open.line, open.col, open.kw.length, "info", "case-default", "case 没有 default 分支（建议补上，避免锁存器/仿真不确定）");
        }
      }
      for (const st of stack) add(st.line, st.col, st.kw.length, "error", "block", "缺少与「" + st.kw + "」配对的 " + (CLOSE_OF[st.w] || "end"));
      /* 声明表（含位宽） */
      const decl = Object.create(null);
      const declMany = (names, kind, width, line, dir, explicit) => {
        for (let nm of String(names || "").split(",")) {
          nm = nm.replace(/\s*=.*$/, "").replace(/^[^A-Za-z_]*/, "");
          const id = /^([A-Za-z_]\w*)/.exec(nm);
          if (!id) continue;
          const pv = decl[id[1]];
          /* 已登记过且本次不是显式类型 → 只补位宽；显式类型可以覆盖默认类型。
             典型：Verilog-2001 的 `output x;`（默认 wire）+ 后面的 `reg x;`，
             旧实现「先到先得」会把 x 记成 wire，于是过程块里赋值被误报成 wire-reg。 */
          if (pv && !(explicit && !pv.explicit)) { if (!pv.width && width) pv.width = width; continue; }
          decl[id[1]] = { kind, width: width || (pv ? pv.width : 0), line, dir: dir || (pv ? pv.dir : ""), explicit: !!explicit };
        }
      };
      for (let i = 0; i < code.length; i++) {
        const t = code[i]; let m;
        if ((m = /\b(input|output|inout)\b\s*(wire|reg|logic)?\s*(\[[^\]]*\])?\s*([^;]*)/.exec(t))) declMany(m[4], m[2] || "wire", lintWidthOf(m[3]), i + 1, m[1], !!m[2]);
        if ((m = /\b(wire|reg|logic|integer|genvar)\b\s*(?:signed\s+)?(\[[^\]]*\])?\s*([^;=]*)/.exec(t))) declMany(m[3], m[1], lintWidthOf(m[2]), i + 1, "", true);
        if ((m = /\b(parameter|localparam)\b\s*(?:integer\s+|signed\s+)?(\[[^\]]*\])?\s*([A-Za-z_]\w*)\s*=\s*([^,;]+)/.exec(t))) {
          if (!decl[m[3]]) decl[m[3]] = { kind: "param", width: lintWidthOf(m[2]), line: i + 1, dir: "" };
        }
      }
      /* always 行位置（⑤ 多驱动用） */
      const alwaysAt = [];
      for (let i = 0; i < code.length; i++) if (/\balways\b/.test(code[i])) alwaysAt.push(i + 1);
      const alwaysIdxOf = (line) => { let r = -1; for (let k = 0; k < alwaysAt.length; k++) { if (alwaysAt[k] <= line) r = k; else break; } return r; };
      /* —— 过程块范围 / 声明行判定（静态检查共用）——
         历史误报（用户实测）：①「正常的时序逻辑被报阻塞/非阻塞混用」②「localparam 被报漏复位」。
         真因不是赋值判断错，而是块范围错：以前用「下一行 always 之前」当块尾，
         于是两条 always 之间的模块级语句（localparam / assign / 声明）被算进了块内。
         现在按 begin/end 深度收缩到配对的 end，并显式排除声明/参数/连续赋值行。 */
      const isDeclOnly = (t) => /^\s*(wire|reg|logic|integer|genvar|parameter|localparam|input|output|inout|module|endmodule)\b/.test(t);
      const isProcAssign = (t) => !isDeclOnly(t) && !/^\s*assign\b/.test(t);
      const procRange = (k) => {
        const b0 = alwaysAt[k] - 1;
        const limit = (k + 1 < alwaysAt.length ? alwaysAt[k + 1] - 2 : code.length - 1);
        let depth = 0, started = false;
        for (let i = b0; i <= limit; i++) {
          const t = code[i];
          if (/\bendmodule\b/.test(t)) return Math.max(b0, i - 1);
          if (!started && i > b0 && /\S/.test(t) && /;/.test(t)) return i;   // 单行体：always @(*) a = b;
          const ob = (t.match(/\bbegin\b/g) || []).length;
          const cb = (t.match(/\bend\b/g) || []).length;
          if (ob) { started = true; depth += ob; }
          if (cb) { depth -= cb; if (started && depth <= 0) return i; }
        }
        return limit;
      };
      const colOfWord = (lineNo, word) => {
        const m = new RegExp("\\b" + word + "\\b").exec(code[lineNo - 1] || "");
        return m ? m.index + 1 : 1;
      };
      /* 没有 module/interface/program/package 的文件是 `include 片段（Vivado 的 timing_tasks.sv 就是），
         它里面的声明与 task/function 端口都在包含它的文件里 —— 本文件无从判定，
         这类文件只保留与作用域无关的规则，否则会成片误报「赋值目标未声明」「wire 被过程赋值」。 */
      const hasModuleScope = /\b(module|interface|program|package)\b/.test(src);
      const isTaskFnLine = (t) => /^\s*(task|function)\b/.test(t);
      /* 命中位置落在 for/if/while 的条件头里时不算过程赋值：
         ① for (int i=0;…) 的 i 不是信号；
         ② 更要紧的是 if (cnt <= DATA_W) —— Verilog 里 <= 同时是「小于等于」比较符，
            旧实现把它当成对 cnt 的赋值，于是同一信号被算成在两个 always 里被赋值（multi-drive 误报）
            且落在复位分支之外（no-reset 误报）。实测 uart_rx.v 两条误报都是这一个原因。 */
      const inForHeader = (t, idx) => {
        for (const kw of ["for", "if", "while", "repeat"]) {
          let from = idx, fi = -1;
          for (;;) {
            const k = t.lastIndexOf(kw, from);
            if (k < 0) break;
            if (k === 0 || !/[A-Za-z0-9_$]/.test(t[k - 1])) { fi = k; break; }
            from = k - 1;
          }
          if (fi < 0) continue;
          const op = t.indexOf("(", fi + kw.length);
          if (op < 0) continue;
          const cp = t.indexOf(")", op);
          if (op <= idx && (cp < 0 || cp > idx)) return true;
        }
        return false;
      };
      /* 跨行声明的续行：localparam A = 1, / B = 2, / C = 3; 里只有第一行有声明关键字，
         续行看起来就像过程赋值（实测 ddc_data_pkt_128.v 一次误报 6 条「未声明」）。 */
      const declCont = new Set();
      {
        let open = false;
        for (let i = 0; i < code.length; i++) {
          const t = code[i];
          if (!open) { if (/^\s*(localparam|parameter|specparam)\b/.test(t) && !/;/.test(t)) open = true; continue; }
          if (!t.trim()) continue;
          /* 参数表结束行（`) (` / `)`）之后就不是声明续行了，否则会把后续代码一起吞掉 */
          if (/^\s*[)(]/.test(t)) { open = false; continue; }
          declCont.add(i);
          if (/;/.test(t)) open = false;
        }
      }
      const procTargets = Object.create(null);
      /* ② ③ ⑦ 赋值检查 */
      for (let i = 0; i < code.length; i++) {
        const t = code[i], line = i + 1;
        if (isDeclOnly(t) || declCont.has(i)) continue;
        let m = /\bassign\s+([A-Za-z_]\w*)\s*=/.exec(t);
        if (m) {
          const d = decl[m[1]];
          if (hasModuleScope && d && (d.kind === "reg" || d.kind === "logic")) add(line, t.indexOf(m[1]) + 1, m[1].length, "warn", "net-reg", "「" + m[1] + "」声明为 " + d.kind + "，却被 assign 连续赋值驱动；连续赋值应驱动 wire");
          continue;
        }
        /* 一行可能有多条赋值（reset 分支常见的 `a<=0; b<=0;`），必须取全部：
           只取第一条会让第二个信号既进不了复位集合、又被误判成「漏复位」。 */
        const reAsg = /(^|[;)\s])([A-Za-z_]\w*)\s*(<=|=)\s*(?!=)/g;
        while ((m = reAsg.exec(t)) !== null) {
        if (isTaskFnLine(t) || inForHeader(t, m.index)) continue;   // task/function 头、条件头不是过程赋值
        const name = m[2], op = m[3], colAt = m.index + m[0].indexOf(name) + 1;
        const ai = alwaysIdxOf(line), d = decl[name];
        if (ai >= 0) {
          if (!procTargets[name]) procTargets[name] = { idx: new Set(), line, col: colAt };
          procTargets[name].idx.add(ai);
        }
        if (hasModuleScope && d && d.kind === "wire") add(line, colAt, name.length, "error", "wire-reg", "「" + name + "」声明为 wire，却在过程块里被赋值（" + op + "）；应改为 reg/logic");
        if (hasModuleScope && !d && ai >= 0) add(line, colAt, name.length, "error", "undeclared", "赋值目标「" + name + "」在本文件中没有声明、也不是端口；请补 wire/reg 声明");
        }
      }
      /* ⑤ 多驱动 */
      for (const nm in procTargets) {
        if (hasModuleScope && procTargets[nm].idx.size > 1) add(procTargets[nm].line, procTargets[nm].col || colOfWord(procTargets[nm].line, nm), nm.length, "warn", "multi-drive", "「" + nm + "」在 " + procTargets[nm].idx.size + " 个不同的 always 块里被赋值（多驱动）");
      }
      /* ⑧ 常量超位宽：只报目标位宽已知、右侧无拼接/复制的情形 */
      for (let i = 0; i < code.length; i++) {
        const t = code[i];
        const am = /\b(?:assign\s+)?([A-Za-z_]\w*)\s*(?:<=|=)\s*([^;]+)/.exec(t);
        if (!am) continue;
        const tgt = am[1], rhs = am[2], d = decl[tgt];
        if (!d || !d.width) continue;
        if (/[{}]/.test(rhs)) continue;
        const litRe = /(\d+)'([hbodHBOD])([0-9a-fA-FxXzZ_?]+)/g;
        let lm;
        while ((lm = litRe.exec(rhs)) !== null) {
          const declared = +lm[1], base = lm[2].toLowerCase(), digits = lm[3].replace(/_/g, "");
          let need = digits.length;
          if (base === "h") need = digits.length * 4;
          else if (base === "o") need = digits.length * 3;
          else if (base === "d") need = (+digits >= 0 && +digits < 1e15) ? Math.max(1, Math.ceil(Math.log2(+digits + 1))) : 64;
          const w = Math.max(declared, need);
          if (w > d.width) add(i + 1, t.indexOf(lm[0]) + 1, lm[0].length, "warn", "width", "常量 " + lm[0] + " 至少需要 " + w + " 位，而「" + tgt + "」只有 " + d.width + " 位（高位会被截断）");
        }
      }
      /* ⑨ 括号/方括号配对（符号级检查，不止语法） */
      const BR = { ")": "(", "]": "[", "}": "{" };
      const brStack = [];
      for (let i = 0; i < code.length; i++) {
        const t = code[i];
        for (let k = 0; k < t.length; k++) {
          const ch = t[k];
          if (ch === "(" || ch === "[" || ch === "{") { brStack.push({ ch, line: i + 1, col: k + 1 }); continue; }
          if (ch === ")" || ch === "]" || ch === "}") {
            const want = BR[ch];
            if (!brStack.length || brStack[brStack.length - 1].ch !== want) {
              add(i + 1, k + 1, 1, "error", "bracket", "多出的「" + ch + "」：找不到与之配对的「" + want + "」");
              continue;
            }
            brStack.pop();
          }
        }
      }
      for (const b of brStack) add(b.line, b.col, 1, "error", "bracket", "「" + b.ch + "」没有闭合");
      /* ⑩ 端口/信号声明末尾疑似缺逗号（用户实测：删掉端口行尾的 , 没有报错）
            判据：input/output/inout 声明行结尾既不是 , 也不是 ; 或 ) ，而下一非空代码行又是同类声明 → 缺逗号 */
      const isPortLine = (t) => /^\s*(input|output|inout)\b/.test(t);
      for (let i = 0; i < code.length; i++) {
        if (!isPortLine(code[i])) continue;
        const cur = code[i].replace(/\s+$/, "");
        if (!cur || /[;,)]$/.test(cur)) continue;
        let j = i + 1;
        while (j < code.length && !code[j].trim()) j++;
        if (j >= code.length) continue;
        if (isPortLine(code[j])) {   // 只在下一条还是端口声明时才报：最后一个端口本来就不需要逗号（否则误报）
          add(i + 1, cur.length, 1, "error", "comma", "端口声明末尾疑似缺少逗号「,」（下一行还是端口声明）");
        }
      }
      /* ⑪ 括号收尾缺分号：单独一行的 ")"（例化 / 端口列表结尾）后面没有分号。
            掩码后能匹配 ^\s*\)\s*$ 说明该行只有 ")"；正常写法是 ");" → 不会命中。 */
      for (let i = 0; i < code.length; i++) {
        const cur = code[i].replace(/\s+$/, "");
        if (!/^\s*\)\s*$/.test(cur)) continue;
        /* 模块头写法：module x #( ... ) 后面接 "(" —— 这个 ")" 本来就不需要分号（实测误报过） */
        let jj = i + 1;
        while (jj < code.length && !code[jj].trim()) jj++;
        if (jj < code.length && /^\s*\(/.test(code[jj])) continue;
        /* `MOD #( … )` 的参数表收尾：这个 ")" 后面跟的是实例名，本来就不需要分号。
           实测 attenuation_ctrl.v / fifo_async.v / uart_top.v / CLK_RST_Top.v 都被误报成缺分号。 */
        let dep = 1, openLine = -1, openIdx = -1;
        for (let j = i; j >= 0 && openLine < 0; j--) {
          const t = code[j];
          for (let k = (j === i ? cur.indexOf(")") - 1 : t.length - 1); k >= 0; k--) {
            if (t[k] === ")") dep++;
            else if (t[k] === "(") { dep--; if (dep === 0) { openLine = j; openIdx = k; break; } }
          }
        }
        if (openLine >= 0 && /#\s*$/.test(code[openLine].slice(0, openIdx))) continue;
        add(i + 1, cur.length, 1, "error", "semicolon", "括号收尾后缺少分号「;」（例化 / 端口列表结尾应为 );）");
      }
      /* ⑫ 最后一个端口后多余的逗号：合法但多余，很多工具会告警 */
      for (let i = 0; i < code.length; i++) {
        if (!isPortLine(code[i])) continue;
        const cur = code[i].replace(/\s+$/, "");
        if (!/,$/.test(cur)) continue;
        let j = i + 1;
        while (j < code.length && !code[j].trim()) j++;
        if (j < code.length && /^\s*\)/.test(code[j])) add(i + 1, cur.length, 1, "warn", "comma-extra", "最后一个端口后多余的逗号「,」（不是错误，但不规范）");
      }
      /* ===== Verilog 静态检查规则集（多批累积） ===== */
      /* ⑥ assign 与过程块同时驱动同一信号（综合直接报错） */
      const assignLhs = new Set();
      for (let i = 0; i < code.length; i++) { const m = /\bassign\s+([A-Za-z_]\w*)\s*=/.exec(code[i]); if (m) assignLhs.add(m[1]); }
      for (const nm in procTargets) {
        if (hasModuleScope && assignLhs.has(nm)) add(procTargets[nm].line, procTargets[nm].col || colOfWord(procTargets[nm].line, nm), nm.length, "error", "multi-drive2", "「" + nm + "」同时被 assign 与 always 驱动（多驱动，综合会报错）");
      }
      /* ⑨ 同一 always 块里阻塞 / 非阻塞混用（只在真正的块体内判断，声明/参数/连续赋值不算） */
      for (let k = 0; k < alwaysAt.length; k++) {
        const b0 = alwaysAt[k] - 1, b1 = procRange(k);
        let hasBlk = false, hasNon = false;
        for (let i = b0; i <= b1; i++) {
          if (!isProcAssign(code[i]) || declCont.has(i)) continue;
          const reMix = /(?:^|[;)\s])([A-Za-z_]\w*)\s*(<=|=)\s*(?!=)/g;
          let m;
          while ((m = reMix.exec(code[i])) !== null) {
            if (isTaskFnLine(code[i]) || inForHeader(code[i], m.index)) continue;
            if (m[2] === "<=") hasNon = true; else hasBlk = true;
          }
        }
        if (hasBlk && hasNon) add(b0 + 1, colOfWord(b0 + 1, "always"), 6, "info", "blocking-mix", "同一 always 里混用了阻塞(=)与非阻塞(<=)赋值；时序逻辑建议统一用 <=");
      }
      /* ⑩ 缺 `timescale / `default_nettype（文件级；对每行只提示一次） */
      /* 文件级提示不要锚在第 1 行：那样看起来像在报那一行（实测用户第 1 行就是正常的 `timescale）。
         改为锚到 module 行，并在文案里标明【文件级】。 */
      let moduleLine = 1;
      for (let i = 0; i < code.length; i++) if (/\bmodule\b/.test(code[i])) { moduleLine = i + 1; break; }
      const moduleCol = /\bmodule\b/.test(code[moduleLine - 1] || "") ? colOfWord(moduleLine, "module") : 1;
      if (!/`timescale/.test(src)) add(moduleLine, moduleCol, 6, "info", "timescale", "【文件级】缺少 `timescale 定义（仿真时间单位不确定）");
      if (!/`default_nettype/.test(src)) add(moduleLine, moduleCol, 6, "info", "default-nettype", "【文件级】未设置 `default_nettype none（拼错的信号名会被当成隐式网线静默通过）");
      /* ⑪ 行宽超 100 字符（lowRISC 规范；只算代码区长度，中文注释不计入） */
      for (let i = 0; i < code.length; i++) if (code[i].replace(/\s+$/, "").length > 100) add(i + 1, 101, 1, "info", "line-width", "该行超过 100 字符（lowRISC 编码规范）");
      /* ===== 批次 A：① 漏复位 / ② 组合缺 else / ④ 位宽截断 / ⑤ 未使用 / ⑧ 下标越界 ===== */
      const nameLinesA = Object.create(null);
      for (const nm of Object.keys(decl)) {
        const re = new RegExp("\\b" + nm + "\\b");
        const arr = [];
        for (let i = 0; i < code.length; i++) if (re.test(code[i])) arr.push(i);
        nameLinesA[nm] = arr;
      }
      for (let k = 0; k < alwaysAt.length; k++) {
        const b0 = alwaysAt[k] - 1, b1 = procRange(k);
        const head = code[b0] || "";
        const isComb = /@\s*\(\s*\*\s*\)|@\s*\*/.test(head);
        const lhsA = [];
        for (let i = b0; i <= b1; i++) {
          if (!isProcAssign(code[i]) || declCont.has(i)) continue;
          const reLhs = /(?:^|[;)\s])([A-Za-z_]\w*)\s*(<=|=)\s*(?!=)/g;
          let mA;
          while ((mA = reLhs.exec(code[i])) !== null) {
            if (isTaskFnLine(code[i]) || inForHeader(code[i], mA.index)) continue;
            lhsA.push({ name: mA[1], line: i + 1, idx: i, col: mA.index + mA[0].indexOf(mA[1]) + 1 });
          }
        }
        if (isComb) {
          let ifN = 0, elseN = 0;
          for (let i = b0; i <= b1; i++) {
            const g = code[i].match(/\bif\s*\(/g);
            if (g) ifN += g.length;
            const h = code[i].match(/\belse\b/g);
            if (h) elseN += h.length;
          }
          if (ifN > 0 && elseN === 0) add(b0 + 1, colOfWord(b0 + 1, "always"), 6, "warn", "latch", "组合 always 里有 if 但完全没有 else，未覆盖分支会产生锁存器");
        }
        let rstLine = -1, elseLine = -1;
        for (let i = b0; i <= b1 && rstLine < 0; i++) {
          if (/\bif\s*\([^)]*\b(rst|reset|rst_n|n_rst|resetn|areset)\b/i.test(code[i])) rstLine = i;
        }
        if (rstLine >= 0) {
          for (let i = rstLine + 1; i <= b1; i++) if (/\belse\b/.test(code[i])) { elseLine = i; break; }
        }
        if (rstLine >= 0 && elseLine > rstLine) {
          const inRst = new Set();
          const after = [];
          for (const a of lhsA) {
            if (a.idx >= rstLine && a.idx < elseLine) inRst.add(a.name);
            else if (a.idx >= elseLine) after.push(a);
          }
          for (const a of after) if (!inRst.has(a.name)) add(a.line, a.col, a.name.length, "warn", "no-reset", "「" + a.name + "」在时钟分支被赋值，但复位分支没有复位它（疑似漏复位）");
        }
      }
      for (let i = 0; i < code.length; i++) {
        if (isDeclOnly(code[i]) || isTaskFnLine(code[i]) || declCont.has(i)) continue;
        const m = /\b(?:assign\s+)?([A-Za-z_]\w*)\s*(?:<=|=)\s*([A-Za-z_]\w*)\s*[;,)]/.exec(code[i]);
        if (!m) continue;
        const L = decl[m[1]], R = decl[m[2]];
        if (!L || !R || !L.width || !R.width) continue;
        if (R.width > L.width) add(i + 1, m.index + m[0].indexOf(m[1]) + 1, m[1].length, "warn", "width-trunc", "「" + m[1] + "」（" + L.width + " 位）被「" + m[2] + "」（" + R.width + " 位）赋值，高位会被截断");
      }
      for (const nm of Object.keys(decl)) {
        const d = decl[nm];
        if (d.dir) continue;
        if (d.kind !== "wire" && d.kind !== "reg" && d.kind !== "logic") continue;
        if (hasModuleScope && (nameLinesA[nm] || []).length <= 1) add(d.line, colOfWord(d.line, nm), nm.length, "info", "unused", "「" + nm + "」声明后未使用（综合会被优化掉）");
      }
      for (let i = 0; i < code.length; i++) {
        const reI = /\b([A-Za-z_]\w*)\s*\[\s*(\d+)\s*(?::\s*(\d+)\s*)?\]/g;
        let mi;
        while ((mi = reI.exec(code[i])) !== null) {
          const d = decl[mi[1]];
          if (!d || !d.width) continue;
          const hi = +mi[2], lo = mi[3] === undefined ? hi : +mi[3];
          if (hi >= d.width || lo >= d.width) add(i + 1, mi.index + 1, mi[0].length, "error", "index", "「" + mi[1] + "」只有 " + d.width + " 位，下标却用到 [" + hi + (mi[3] === undefined ? "" : ":" + lo) + "]，越界");
        }
      }
      /* ===== 批次 B：③ 跨时钟域嫌疑（建议级；每信号只报一次） ===== */
      const blkClkB = (k) => { const m = /@\s*\(\s*(?:posedge|negedge)\s+([A-Za-z_]\w*)/.exec(code[alwaysAt[k] - 1] || ""); return m ? m[1] : ""; };
      for (const nm of Object.keys(procTargets)) {
        const pt = procTargets[nm];
        let ca = "", ka = -1;
        for (const k of pt.idx) { const c = blkClkB(k); if (c) { ca = c; ka = k; break; } }
        if (!ca) continue;
        for (let b = 0; b < alwaysAt.length; b++) {
          if (b === ka) continue;
          const cb = blkClkB(b);
          if (!cb || cb === ca) continue;
          const c0 = alwaysAt[b] - 1, c1 = (b + 1 < alwaysAt.length ? alwaysAt[b + 1] - 2 : code.length - 1);
          const hit = (nameLinesA[nm] || []).filter((li) => li >= c0 && li <= c1);
          if (hasModuleScope && hit.length) {
            add(hit[0] + 1, colOfWord(hit[0] + 1, nm), nm.length, "info", "cdc", "「" + nm + "」在 " + ca + " 域被赋值、却在 " + cb + " 域的块里被读（疑似跨时钟域，请确认是否有同步器）");
            break;
          }
        }
      }
      return issues;
    };

    const S = {
      bg: "var(--dsw-alias-bg-layer-2, #202122)",
      panel: "var(--dsw-alias-bg-layer-1, #191A1B)",
      border: "var(--dsw-alias-border-l3, #2A2B2C)",
      ctrlBorder: "var(--dsw-alias-border-l3, #3C3C3C)",
      text: "var(--dsw-alias-label-primary, #BBBEBF)",
      title: "var(--dsw-alias-label-primary, #ffffff)",
      sub: "var(--dsw-alias-label-secondary, #d2dae6)",
      accent: "var(--dsw-alias-brand-primary, #3994BC)",
      danger: "var(--dsw-alias-state-error-primary, #a1260d)"
    };
    /* =====================================================================
       Verilog 格式化引擎（纯函数、无副作用）
       核心原则：① 例化【整组对齐】—— ( 按整组最长端口名：够得着 34 就用 34，
                   否则整组用「最长 + 4」，所有行统一推后（纵向整齐）；
                 ② ) 同理（标准列 75，取最长非拼接信号名）；
                 ③ 拼接值 ({...}) 不参与列宽计算，自己以内容收尾（不连坐）。
        ① 声明：端口关键字 4 | reg/wire 12 | 位宽 [ 19 | 信号名 41
           行尾 ,/; → 名字后至 76 还留得下 1 格则用 76；顶穿则本行 +4
        ② 自然类（localparam / assign / 模块体内 parameter）—— 紧凑对齐
        ③ 例化：头行【模块名顶格 + 2 空格 + 实例名】( ；端口列固定 4；
           块内注释行与端口列同步对齐
       端口尾行 output xxx ); → 自动拆为「端口行 + 独立 );」
       安全边界：只动空白；内容零增删；不改名、不改数值、不改连接；幂等。
       ===================================================================== */
    /**
     * verilog-format.js —— Verilog/SystemVerilog 声明对齐格式化引擎（纯函数，无副作用）
     *
     * ═══ 一、两类布局 ═══
     *  ① 网格类（端口 / reg·wire 定义 / parameter）—— 绝对列：
     *       端口关键字 4，端口 reg/wire 12（output 后 2 空格），
     *       位宽 [ 19（reg 后 4 空格），信号名 41（[ 后 16 空格），行尾 ,/; 76
     *     wire/reg 定义行关键字顶格（列 0），但 [ 、信号名 、; 与上面端口同列：
     *         input       [ 3:0]                 BRAM_PORT_we                    ,
     *         output reg  [31:0]                 ddc1_inc                        ,
     *     wire            [255:0]                ff_param_din                    ;
     *     reg                                    ff_param_rd                     ;
     *  ② 自然类（localparam / assign）—— 不套用上面的网格，按组内内容紧凑对齐：
     *     关键字后紧接名字、等号纵向对齐、行尾符紧跟最长内容。
     *   两类在内容超宽时都右移该列（组内一致），绝不重叠。
     *
     * ═══ 二、缩进规则 ═══
     *   · 端口行（input/output/inout）→ 强制缩进到第 4 列（原文件顶格也补上）
     *   · reg/wire/parameter/assign 定义行 → 按原始缩进宽度（通常顶格）
     *   缩进用空格而非 Tab：Tab 宽度随环境变（编辑器 4 / 浏览器 8），会让同一份文件
     *   在两处看起来不一样；空格宽度恒定，到哪都一致。
     *
     * ═══ 三、其余约定 ═══
     *   · 列填充一律用空格
     *   · 位宽规范为 [MSB:LSB]，组内 MSB 右对齐（[ 3:0] / [11:0] / [31:0]）
     *   · 行尾注释原样保留；行尾 ,/; 同列；行尾多余空白清除
     *
     * ═══ 四、安全边界 ═══
     *   · 只处理声明类行；always / if / case / 实例化 / 注释 / 预处理 行一字不动
     *   · 块注释（跨行注释）内部整段跳过
     *   · 只动空白：不增删字符、不改名、不改位宽数值、不重排语句
     */

    /**
     * 固定列位（【绝对列】）—— 仅用于「网格类」声明：
     *   端口行（input/output/inout）与 reg/wire 定义行
     *   间距依据：output + 2 空格 → reg；reg + 4 空格 → [；[ 后 16 空格 → 信号名
     */
    const COL = {
      portKw: 4,    // 端口行关键字起始列
      portKind: 12, // 端口行的 reg/wire 起始列（output 后 2 个空格）
      range: 19,    // 位宽 [ 起始列（reg 后 4 个空格）—— 端口与 reg/wire 共用
      name: 41,     // 信号名起始列（[ 后 16 个空格）—— 端口与 reg/wire 共用
      tail: 76,     // 行尾 , / ; 列 —— 端口与 reg/wire 共用
      /* ---- 例化相关列位 ---- */
      instOpen: 34,     // 端口连接行的 "(" 列
      instHeadInst: 16  // 例化头行的实例名起始列
      // 例化的 "," 与端口声明的 , / ; 同列 —— 直接复用 COL.tail(76)
    };

    /** 渲染顺序 */
    const ROLE_ORDER = ["kw", "kind", "range", "name", "eq", "value"];

    const DIRECTIONS = ["input", "output", "inout"];
    const KINDS = ["reg", "wire", "logic", "integer", "genvar", "bit", "byte"];

    /** 把任意缩进前缀折算成空格数（按 tab=4 的视觉宽度），保证跨环境一致 */
    function indentToSpaces(indent) {
      let w = 0;
      for (const ch of String(indent || "")) {
        if (ch === "\t") w = (Math.floor(w / 4) + 1) * 4;
        else w += 1;
      }
      return w;
    }

    /** 行首缩进（原始） */
    function leadingIndent(line) {
      const m = /^[ \t]*/.exec(line);
      return m ? m[0] : "";
    }

    /** 是否可格式化的声明行 */
    function isFormattableLine(line) {
      const t = line.trim();
      if (t === "") return false;
      if (t.startsWith("//")) return false;
      if (t.startsWith("/*") || t.startsWith("*")) return false;
      if (t.startsWith("`")) return false;
      return true;
    }

    /** 位宽规范化：[5 :0] / [5: 0] / [ 5 : 0 ] → [5:0] */
    function normalizeRange(text) {
      const m = /^\[\s*(.+?)\s*:\s*(.+?)\s*\]$/.exec(String(text).trim());
      if (!m) return null;
      return "[" + m[1] + ":" + m[2] + "]";
    }

    /** 折叠内部多余空白 —— 只折叠【字符串外】的连续空白，字符串字面量原样保留。
        （否则 `localparam S = "a  b"` 会被改成 "a b"，破坏字符串内容，违反零增删承诺） */
    function tidyString(text) {
      const s = String(text);
      // 按字符串切分：偶数段是字符串外、奇数段是字符串内；只对偶数段折叠空白
      const parts = s.split(/("(?:[^"\\]|\\.)*")/);
      let out = "";
      for (let i = 0; i < parts.length; i++) {
        out += (i % 2 === 1) ? parts[i] : parts[i].replace(/[ \t]+/g, " ");
      }
      return out.trim();
    }

    /** 剥离行尾 ; 或 , */
    function splitTail(body) {
      const m = /([;,])[ \t]*$/.exec(body);
      if (!m) return { body: body.trimEnd(), tail: "" };
      return { body: body.slice(0, m.index).trimEnd(), tail: m[1] };
    }

    /** 剥离行尾注释（原样保留）—— 跳过字符串字面量里的 // 与 /* */
    function splitComment(s) {
      let inStr = false;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (inStr) { if (c === "\\") { i++; continue; } if (c === '"') inStr = false; continue; }
        if (c === '"') { inStr = true; continue; }
        if (c === "/" && s[i + 1] === "/") return { body: s.slice(0, i).trimEnd(), comment: s.slice(i) };
        if (c === "/" && s[i + 1] === "*") return { body: s.slice(0, i).trimEnd(), comment: s.slice(i) };
      }
      return { body: s, comment: "" };
    }

    /**
     * 解析一条声明行 → { indent, roles, tail, comment, type } 或 null
     *   port  : kw(方向) kind(reg/wire) range name [value]
     *   decl  : kw(reg/wire)  range name [value]
     *   param : kw(localparam/parameter) [range] name eq value
     *   assign: kw(assign) name eq value
     */
    function parseDeclaration(line) {
      const indent = leadingIndent(line);
      const raw = line.slice(indent.length).trim();
      if (raw === "") return null;

      /* 注释要从【原始行】取：上面这句 .trim() 会把注释行尾的空白一并吃掉，
         而注释正文（含尾随空格/制表符）是内容 —— 匹配时可以忽略，输出里不能改。 */
      const { body: noComment } = splitComment(raw);
      const comment = splitComment(line).comment;
      const { body, tail } = splitTail(noComment);
      if (body === "") return null;

      const mk = (type, roles) => ({ indent, roles, tail, comment, type });

      /* ---- 端口：方向 [reg|wire] [位宽] 名字 [= 默认值] ---- */
      const dirM = new RegExp("^(" + DIRECTIONS.join("|") + ")\\b").exec(body);
      if (dirM) {
        const direction = dirM[1];
        let rest = body.slice(dirM[0].length).trim();
        let kind = "";
        const kindM = new RegExp("^(" + KINDS.join("|") + ")\\b").exec(rest);
        if (kindM) { kind = kindM[1]; rest = rest.slice(kindM[0].length).trim(); }
        let range = "";
        const rM = /^(\[[^\]]*\])/.exec(rest);
        if (rM) { range = normalizeRange(rM[1]) || rM[1].replace(/[ \t]+/g, ""); rest = rest.slice(rM[0].length).trim(); }
        const nameM = /^([A-Za-z_][A-Za-z0-9_$]*)[ \t]*(=[ \t]*[^,;]+)?$/.exec(rest);
        if (!nameM) return null;
        const roles = { kw: direction, range, name: nameM[1] };
        if (kind) roles.kind = kind;
        if (nameM[2]) roles.value = "= " + tidyString(nameM[2].replace(/^=[ \t]*/, ""));
        return mk("port", roles);
      }

      /* ---- reg / wire / logic：类型 [位宽] 名字 [= 初值] ---- */
      const kindHead = new RegExp("^(" + KINDS.join("|") + ")\\b").exec(body);
      if (kindHead) {
        let rest = body.slice(kindHead[0].length).trim();
        let range = "";
        const rM = /^(\[[^\]]*\])/.exec(rest);
        if (rM) { range = normalizeRange(rM[1]) || rM[1].replace(/[ \t]+/g, ""); rest = rest.slice(rM[0].length).trim(); }
        const nameM = /^([A-Za-z_][A-Za-z0-9_$]*)[ \t]*(=[ \t]*[^,;]+)?$/.exec(rest);
        if (!nameM) return null;
        const roles = { kw: kindHead[1], range, name: nameM[1] };
        if (nameM[2]) roles.value = "= " + tidyString(nameM[2].replace(/^=[ \t]*/, ""));
        return mk("decl", roles);
      }

      /* ---- parameter / localparam：关键字 [位宽] 名字 = 值 ---- */
      const pmM = /^(localparam|parameter)\b/.exec(body);
      if (pmM) {
        let rest = body.slice(pmM[0].length).trim();
        let range = "";
        const rM = /^(\[[^\]]*\])/.exec(rest);
        if (rM) { range = normalizeRange(rM[1]) || rM[1].replace(/[ \t]+/g, ""); rest = rest.slice(rM[0].length).trim(); }
        const nameM = /^([A-Za-z_][A-Za-z0-9_$]*)[ \t]*=[ \t]*(.+)$/.exec(rest);
        if (!nameM) return null;
        return mk("param", { kw: pmM[1], range, name: nameM[1], eq: "=", value: tidyString(nameM[2]) });
      }

      /* ---- assign：assign 左值 = 表达式 ---- */
      if (/^assign\b/.test(body)) {
        const rest = body.slice("assign".length).trim();
        const m = /^([A-Za-z_][A-Za-z0-9_$]*)[ \t]*=[ \t]*(.+)$/.exec(rest);
        if (!m) return null;
        return mk("assign", { kw: "assign", name: m[1], eq: "=", value: tidyString(m[2]) });
      }

      return null;
    }

    /**
     * 解析「声明续行」——一个声明跨多行的写法，续行不带关键字：
     *     localparam     IDEL            = 4'b0000 ,
     *                 HEAD            = 4'b0001 ,
     *                 TAIL            = 4'b1111 ;
     * 续行形如 `名字 = 表达式` 且必须以 , 或 ; 结尾（据此与块内赋值语句区分）。
     * 只有当上一行是以 , 结尾的声明时才调用（见 planGroups）。
     */
    function parseContinuation(line) {
      const indent = leadingIndent(line);
      const raw = line.slice(indent.length).trim();
      if (raw === "") return null;
      const { body: noComment, comment } = splitComment(raw);
      const { body, tail } = splitTail(noComment);
      if (!tail) return null;                       // 必须带 , 或 ; 才算声明延续
      const m = /^([A-Za-z_][A-Za-z0-9_$]*)[ \t]*=[ \t]*(.+)$/.exec(body);
      if (!m) return null;
      // 值为未闭合的拼接（跨行 { ）时跳过，避免误动拼接内容
      const opens = (m[2].match(/\{/g) || []).length;
      const closes = (m[2].match(/\}/g) || []).length;
      if (opens !== closes) return null;
      return {
        indent, roles: { name: m[1], eq: "=", value: tidyString(m[2]) },
        tail, comment, type: "cont"
      };
    }

    /** 位宽列组内等宽：MSB 右对齐（[ 3:0] / [11:0] / [31:0]） */
    function padRanges(rows) {
      let maxLen = 0;
      for (const r of rows) {
        const v = r.roles.range;
        if (v && v.startsWith("[")) maxLen = Math.max(maxLen, v.length);
      }
      if (maxLen === 0) return;
      for (const r of rows) {
        const v = r.roles.range;
        if (v && v.startsWith("[") && v.length < maxLen) {
          r.roles.range = "[" + " ".repeat(maxLen - v.length) + v.slice(1);
        }
      }
    }

    /**
     * 计算一个组的列位方案。
     *
     * 两类布局：
     *  ① 网格类（端口 / reg·wire 定义 / parameter）—— 用【绝对列】：
     *     端口组与 reg/wire 组共用同一套列，于是 wire/reg 顶格写，
     *     但它们的 [ 、信号名 、; 与上面 input/output 的 [ 、名字 、, 严格同列。
     *  ② 自然类（localparam / assign）—— 不套用上面的网格，按组内内容紧凑对齐：
     *     关键字后紧接名字，等号对齐，行尾符紧跟在最长内容之后。
     * 两类都在内容超宽时右移该列（组内一致），绝不重叠。
     */
    function planGroup(group) {
      const rows = group.map((x) => x.p);
      padRanges(rows);

      const present = new Set();
      const maxLen = {};
      for (const r of rows) {
        for (const role of ROLE_ORDER) {
          const v = r.roles[role];
          if (v === undefined) continue;
          present.add(role);
          maxLen[role] = Math.max(maxLen[role] || 0, String(v).length);
        }
      }

      const pos = {};

      /* 判定布局类别：
           · 端口行 / reg·wire 定义行 → 网格
           · parameter 位于【模块头 #(...) 内】→ 网格；位于模块体内 → 自然
           · localparam / assign → 自然 */
      const kw0 = String(rows[0].roles.kw === undefined ? "" : rows[0].roles.kw);
      const baseIndent = Math.min(...rows.map((r) => indentToSpaces(r.indent)));
      const grid = rows[0].type === "port" || rows[0].type === "decl"
        || (kw0 === "parameter" && !!rows[0].inHeader);

      /* 关键字起始列：由【组语义】决定，不依赖原文缩进 —— 否则首次格式化会改变
         下一轮的计算基准，导致二次格式化结果不同（非幂等）。 */
      // decl 组（reg/wire/logic）与模块体内的 parameter 保留**原始缩进**：
      // 旧行为把关键字强制到第 0 列，会把 always/generate 块内的声明拉到行首、块缩进崩塌。
      const declIndent = (rows[0].type === "decl") ? baseIndent : 0;
      let kwCol;
      if (rows[0].type === "port") kwCol = COL.portKw;
      else if (rows[0].type === "decl") kwCol = declIndent;
      else if (kw0 === "parameter") kwCol = rows[0].inHeader ? COL.portKw : baseIndent;
      else kwCol = baseIndent;
      pos.kwCol = kwCol;

      if (grid) {
        /* ---- ① 网格类：绝对列（组内共享，超宽时整组右移，保证纵向对齐）---- */
        pos.kind = COL.portKind + declIndent;
        pos.range = COL.range + declIndent;
        // 名字列：固定 41；若组内某个位宽过长（如 [WRITE_DATA_WIDTH-1:0]），整组一起右移
        pos.name = Math.max(COL.name + declIndent, COL.range + declIndent + (maxLen.range || 0) + 1);
        if (present.has("eq")) pos.eq = pos.name + (maxLen.name || 0) + 2;
        if (present.has("value")) {
          pos.value = present.has("eq") ? pos.eq + 2 : pos.name + (maxLen.name || 0) + 2;
        }
        // 行尾符基准列 = 76。实际渲染时逐行取
        //   max(76, 本行名字结束列 + 4)  —— 名字不长则保持 76，过长才该行自己右伸。
        pos.tail = COL.tail + declIndent;
      } else {
        /* ---- ② 自然类：按内容紧凑排（各列之间恰好 1 个空格）---- */
        let cur = kwCol + (maxLen.kw || 0);
        pos.kind = cur + 1;
        if (present.has("kind")) cur = pos.kind + (maxLen.kind || 0);
        if (present.has("range")) { pos.range = cur + 1; cur = pos.range + (maxLen.range || 0); }
        pos.name = cur + 1;
        cur = pos.name + (maxLen.name || 0);
        if (present.has("eq")) { pos.eq = cur + 1; cur = pos.eq + (maxLen.eq || 0); }
        if (present.has("value")) { pos.value = cur + 1; cur = pos.value + (maxLen.value || 0); }
        pos.tail = cur + 1;
      }

      return { present, pos, maxLen, grid };
    }

    /**
     * 渲染一行：
     *   网格类：端口行关键字固定第 4 列（强制缩进）；reg/wire 定义行固定第 0 列（不缩进）；
     *           parameter 按原始缩进
     *   自然类：localparam / assign 按原始缩进
     */
    function renderRow(p, plan) {
      const kw = String(p.roles.kw === undefined ? "" : p.roles.kw);
      // 关键字起始列由组统一决定（plan.pos.kwCol），保证幂等：
      //   端口行 → 4；reg/wire 定义行 → 0；parameter → 模块头内 4、模块体内 0；
      //   localparam/assign/续行 → 组的基础缩进
      const kwCol = plan.pos.kwCol === undefined ? indentToSpaces(p.indent) : plan.pos.kwCol;

      let out = "";
      let cur = 0;

      // 关键字
      if (kw) {
        if (kwCol > cur) { out += " ".repeat(kwCol - cur); cur = kwCol; }
        out += kw;
        cur += kw.length;
      }

      // 其余各列：摆到目标列（至少留 1 空格兜底）
      const place = (text, target) => {
        const t = String(text === undefined ? "" : text);
        if (t === "") return;
        const to = Math.max(target, cur + 1);
        if (to > cur) { out += " ".repeat(to - cur); cur = to; }
        out += t;
        cur += t.length;
      };
      place(p.roles.kind, plan.pos.kind);
      place(p.roles.range, plan.pos.range);
      place(p.roles.name, plan.pos.name);
      place(p.roles.eq, plan.pos.eq);
      place(p.roles.value, plan.pos.value);

      if (p.tail) {
        // 声明尾符列（网格类）：
        //   名字够得着标准列(76) → 用标准列（与组内其它行对齐，无需特殊处理）
        //   名字顶穿标准列       → 本行右伸到「名字后空 4 格」
        // 自然类（localparam/assign）保持紧凑，紧跟内容。
        const std = plan.pos.tail;   // 76
        const t = plan.grid
          ? (cur <= std ? std : cur + 4)
          : Math.max(std, cur + 1);
        if (t > cur) { out += " ".repeat(t - cur); cur = t; }
        out += p.tail;
      }
      if (p.comment) out += " " + p.comment;
      return out;
    }

    /**
     * 切分对齐组（格式化与校验共用判据）。
     * 连续 + 类型相同；空行不断组；块注释整段跳过；其它非声明行断组。
     */

    /* ========================================================================
       例化（module instantiation）格式化
       目标格式（风格 A）：
           ddc_ch0_top u_ddc0_ch_top (
               .clk             ( clk        ),
               .dds_inc         ( ddc0_inc   ),
           );
       规则：
         · 例化头行：<模块名> <实例名> (          —— 模块名缩进、实例名、开括号列
         · 端口连接行：.端口名 | ( | 信号名 | ) | ,  —— 端口名列、括号列固定，
           ) 列按【该例化内最长信号名】自适应，保证同实例内 ) 纵向对齐
         · 端口名与 ( 之间用空格补齐；信号名左对齐；) 右对齐
         · 行尾注释原样保留；位置连接（无 . 前缀）保持原样不动
       安全边界：只动空白；不改名、不改连接顺序、不增删连接。
       ======================================================================== */

    /** 连接行（端口或参数）： [缩进].名字  空格  (  值  )  [,]  [//注释] */
    function parseInstPortLine(line) {
      const indent = leadingIndent(line);
      const raw = line.slice(indent.length);
      if (raw.trimStart().startsWith("//")) return null;
      const { body: noComment, comment } = splitComment(raw);
      const { body, tail } = splitTail(noComment);
      const m = /^(\.[A-Za-z_][A-Za-z0-9_$]*)[ \t]*\([ \t]*(.*?)[ \t]*\)$/.exec(body.trim());
      if (!m) return null;
      const port = m[1];
      const sig = tidyString(m[2]);
      // 允许空连接：.almost_empty ( )   —— sig 为空串也合法
      return { indent, port, sig, tail, comment, tag: "instPort" };
    }

    /** 头行：模块名 + 实例名 + ( （最简写法） */
    function parseInstHeadLine(line) {
      const indent = leadingIndent(line);
      const raw = line.slice(indent.length).trim();
      if (raw === "") return null;
      if (raw.startsWith("//")) return null;
      const { body: noComment, comment } = splitComment(raw);
      const m = /^([A-Za-z_][A-Za-z0-9_$]*)[ \t]+([A-Za-z_][A-Za-z0-9_$]*)[ \t]*\($/.exec(noComment.trim());
      if (!m) return null;
      return { indent, moduleName: m[1], instName: m[2], comment, tag: "instHead" };
    }

    /** 头行（写法⑤）：模块名 + 实例名，开括号在下一行 */
    function parseInstHeadNoParen(line) {
      const indent = leadingIndent(line);
      const raw = line.slice(indent.length).trim();
      if (raw.startsWith("//")) return null;
      const m = /^([A-Za-z_][A-Za-z0-9_$]*)[ \t]+([A-Za-z_][A-Za-z0-9_$]*)$/.exec(raw);
      if (!m) return null;
      if (KINDS.indexOf(m[1]) >= 0 || DIRECTIONS.indexOf(m[1]) >= 0) return null;
      return { indent, moduleName: m[1], instName: m[2], tag: "instHeadNoParen" };
    }

    /** 开括号单独成行的检测（写法⑤） */
    function isOpenParenOnlyLine(line) {
      const t = line.trim().replace(/\/\/.*$/, "").trim();
      return t === "(";
    }

    /** 参数列表开头行：模块名 + #( */
    function parseInstParamOpen(line) {
      const indent = leadingIndent(line);
      const raw = line.slice(indent.length).trim();
      if (raw.startsWith("//")) return null;
      const m = /^([A-Za-z_][A-Za-z0-9_$]*)[ \t]*#[ \t]*\($/.exec(raw);
      if (!m) return null;
      return { indent, moduleName: m[1], tag: "instParamOpen" };
    }

    /** 参数列表结束行：) + 实例名 + ( */
    function parseInstParamClose(line) {
      const indent = leadingIndent(line);
      const raw = line.slice(indent.length).trim();
      if (raw.startsWith("//")) return null;
      const m = /^\)[ \t]*([A-Za-z_][A-Za-z0-9_$]*)[ \t]*\($/.exec(raw);
      if (!m) return null;
      return { indent, instName: m[1], tag: "instParamClose" };
    }

    /** 实例名行（写法④：参数列表 ) 单独一行后，实例名 + ( 在下一行） */
    function parseInstNameLine(line) {
      const indent = leadingIndent(line);
      const raw = line.slice(indent.length).trim();
      if (raw.startsWith("//")) return null;
      const m = /^([A-Za-z_][A-Za-z0-9_$]*)[ \t]*\($/.exec(raw);
      if (!m) return null;
      if (KINDS.indexOf(m[1]) >= 0 || DIRECTIONS.indexOf(m[1]) >= 0) return null;
      return { indent, instName: m[1], tag: "instNameLine" };
    }

    /**
     * 跨行拼接起始行： .probe0 ({ 或 .probe0 ({xxx
     * （值以 { 开头且本行未闭合，拼接内容与 }) 在后续行）
     */
    function parseInstConcatStart(line) {
      const indent = leadingIndent(line);
      const raw = line.slice(indent.length);
      if (raw.trimStart().startsWith("//")) return null;
      const code = raw.split("//")[0].trimEnd();
      const m = /^(\.[A-Za-z_][A-Za-z0-9_$]*)[ \t]*\([ \t]*(\{[\s\S]*)$/.exec(code.trim());
      if (!m) return null;
      const val = m[2];
      if (val.indexOf("}") >= 0) return null;   // 本行已闭合 → 不是跨行拼接
      return { indent, port: m[1], headVal: val.trimEnd(), tag: "instConcat" };
    }

    /** 参数列表结束行（写法④：仅一个 ) 单独成行） */
    function isParamCloseOnlyLine(line) {
      const t = line.trim().replace(/\/\/.*$/, "").trim();
      return t === ")";
    }

    /** 结束行： ); 或 ) ; */
    function isInstCloseLine(line) {
      const t = line.trim().replace(/\/\/.*$/, "").trim();
      return t === ");" || t === ") ;";
    }

    /** 未配对括号增量（忽略字符串与注释） */
    function openParenDelta(line) {
      let d = 0;
      let inStr = false;
      const s = line.split("//")[0];
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === String.fromCharCode(34)) { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === "(") d++;
        else if (ch === ")") d--;
      }
      return d;
    }

    /**
     * 格式化一组「连接行」（端口连接或参数连接），列位规则相同：
     *   .名字 | ( | 值 | ) | ,      ( 固定第 34 列；, 与端口声明尾符同列 76
     * 返回处理条数。
     */
    function renderConnLines(lines, idxs, baseIndent, out, changed) {
      const conns = [];
      for (const i of idxs) {
        const pl = parseInstPortLine(lines[i]);
        if (pl) { conns.push({ i, pl }); continue; }
        const cc = parseInstConcatStart(lines[i]);
        if (cc) conns.push({ i, pl: { indent: cc.indent, port: cc.port, sig: "", tail: "", comment: "" } });
      }
      if (conns.length === 0) return 0;

      /* ---- 跨行拼接识别： .probe0 ({'d0   /   ,sig   /   ,sig   /   }) ----
         这类连接的值是跨多行的拼接（{ 在本行、} 在后面的行），单独处理：
         起点列 = "(" 所在列；每行拼接元素前导 ","；以 }) 收尾。 */
      const concatStart = new Map();   // 行号 -> {headIdx, elemIdxs, closeIdx}
      const concatRows = new Set();
      for (const c of conns) {
        const i = c.i;
        if (concatRows.has(i)) continue;
        const raw = lines[i].split("//")[0].trimEnd();
        // 该行的值以 { 开头且 { 未在本行闭合
        const mVal = /\{[ \t]*\S*$/.test(raw) || /\(\s*\{[^}]*$/.test(raw);
        if (!mVal) continue;
        if (!/\(\s*\{\s*[^}]*$/.test(raw)) continue;
        // 向下找收尾行（含 }) ）
        let j = i + 1, closeIdx = -1;
        while (j < lines.length) {
          if (/\}\s*\)/.test(lines[j])) { closeIdx = j; break; }
          if (isInstCloseLine(lines[j])) break;
          j++;
        }
        if (closeIdx < 0) continue;
        const elems = [];
        for (let k = i + 1; k < closeIdx; k++) {
          const t = lines[k].trim();
          if (t === "") continue;
          if (t.startsWith(",")) elems.push(k);
        }
        concatStart.set(i, { elems, closeIdx });
        concatRows.add(i);
        for (const k of elems) concatRows.add(k);
        concatRows.add(closeIdx);
      }

      const portCol = baseIndent + 4;

      /* ---- 列位计算：整个例化【整组对齐】----
         ① ( 列：够得着标准列(34) 就全用 34；否则（有顶穿者）全组用「最长端口名 + 4」。
         ② ) 列：同理（标准列 75，取全组最长【非拼接】信号名）。
         ③ 拼接值（含 {）不参与计算，自己以内容收尾（避免一条超长拼接拖垮整组）。 */
      const GAP = 4;
      const commaCol = COL.tail + baseIndent;   // 块内例化整块右移
      const STD_OPEN = COL.instOpen;      // 34
      const STD_CLOSE = COL.tail - 1;     // 75
      // 档1 要求「端口名后至少留 1 格才到标准列」，故用严格比较
      const topsThrough = (pl) => portCol + pl.port.length + 1 > STD_OPEN;

      // 整组统一列位：全例化作为一组
      const sel = conns.filter((c) => !concatRows.has(c.i));
      let overPort = 0;
      for (const c of sel) {
        if (topsThrough(c.pl)) overPort = Math.max(overPort, portCol + c.pl.port.length);
      }
      const tier2 = overPort > 0;
      const open2 = tier2 ? overPort + GAP : STD_OPEN;

      // 全组 ) 列：取最长【非拼接】信号名
      let overSig = 0;
      for (const c of sel) {
        const pl = c.pl;
        if (pl.sig.indexOf("{") >= 0) continue;          // 拼接不参与
        overSig = Math.max(overSig, open2 + 2 + pl.sig.length);
      }
      const close2 = (overSig + 1 > STD_CLOSE) ? (overSig + GAP) : STD_CLOSE;

      const colsOf = new Map();   // 行号 -> {oc, cc}
      for (const c of conns) {
        const pl = c.pl;
        const oc = open2;
        let cc;
        if (pl.sig.indexOf("{") >= 0) {
          // 拼接值：自己收尾
          cc = Math.max(STD_CLOSE, oc + 2 + pl.sig.length + 1);
        } else {
          cc = close2;
        }
        colsOf.set(c.i, { oc, cc });
      }

      /** 取某行的 ( 列与 ) 列 */
      const colsFor = (pl, i) => colsOf.get(i) || { oc: STD_OPEN, cc: STD_CLOSE };

      /* ---- 块内「纯注释行」：缩进对齐到端口名列（与端口行一致，避免参差）----
         只改行首缩进：注释正文（含尾随空白/制表符）必须原样保留，所以这里用
         trimStart 而不是 trim —— 用 trim 会把注释行尾一并吃掉（实测 Xilinx 生成
         文件的例化端口表注释 "// Clock out ports  " 被改成 "// Clock out ports"）。 */
      for (const i of idxs) {
        const body = lines[i].replace(/^[ \t]+/, "");
        if (body === "" || !body.startsWith("//")) continue;
        const want = " ".repeat(portCol) + body;
        if (want !== lines[i]) { out[i] = want; changed.push(i); }
      }

      for (const c of conns) {
        const i = c.i, pl = c.pl;

        /* ---- 跨行拼接：.probe0 ({'d0 / ,sig / }) ---- */
        if (concatStart.has(i)) {
          const info = concatStart.get(i);
          const ind = indentToSpaces(pl.indent);
          const lead = portCol;   // 端口名列一律用标准列（不继承原文缩进，避免头部顶格而端口缩进过长）
          const cOpen = colsFor(pl, i).oc;   // 按两档规则取本行 ( 列
          // 必须用引号感知的 splitComment：split("//") 会把字符串字面量里的 "//" 当注释切开，
          // 重建时该行字符串的剩余部分被吞（"a//b" → "a）——属静默的内容破坏。
          const headSplit = splitComment(lines[i]);
          const vm = /\(\s*(\{[\s\S]*)$/.exec(headSplit.body.trimEnd());
          const headVal = vm ? vm[1].trimEnd() : "{";
          const headCmt = headSplit.comment || "";   // 注释正文（含尾随空白）原样保留
          let line = " ".repeat(lead) + pl.port;
          const afterPort = lead + pl.port.length;
          line += " ".repeat(Math.max(1, cOpen - afterPort)) + "(" + headVal;
          if (headCmt) line += " " + headCmt;
          if (line !== lines[i]) { out[i] = line; changed.push(i); }
          // 拼接元素行 + 收尾行：对齐到本拼接行的 ( 列
          for (const k of info.elems) {
            const t = lines[k].trim().replace(/^,\s*/, "");
            const el = " ".repeat(cOpen) + "," + t;
            if (el !== lines[k]) { out[k] = el; changed.push(k); }
          }
          // 先剥注释再匹配（引号感知的 splitComment），最后原样拼回：
          // 旧实现只在 cm[1] 非空时才带上 [,;]，导致最常见的“收尾行 }),”逗号丢失、
          // “}) // note” 更是完全不匹配正则、注释被删。
          const closeSplit = splitComment(lines[info.closeIdx]);
          const closeCode = closeSplit.body.trim();
          const closeComment = closeSplit.comment || "";   // 同上
          const cm = /^([\s\S]*?)\}\s*\)\s*([,;]?)$/.exec(closeCode);
          if (cm !== null) {
            let cl = " ".repeat(cOpen) + cm[1].trim() + "})" + (cm[2] || "");
            if (closeComment) cl += " " + closeComment;
            if (cl !== lines[info.closeIdx]) { out[info.closeIdx] = cl; changed.push(info.closeIdx); }
          }
          // 匹配失败 → 保持原样（宁可不格式化，也不破坏内容）
          continue;
        }
        if (concatRows.has(i)) continue;   // 已随拼接整体处理

        /* ---- 普通连接：按两档规则取本行 ( 与 ) 列 ---- */
        const ind = indentToSpaces(pl.indent);
        const lead = portCol;   // 端口名列一律用标准列（不继承原文缩进，避免头部顶格而端口缩进过长）
        // 空连接（.p ()）：紧凑输出，不按列填充（原来会被填到 ~76 列）
        if (!pl.sig) {
          let emptyLine = " ".repeat(lead) + pl.port + " ()";
          if (pl.tail) emptyLine += " ".repeat(Math.max(0, commaCol - emptyLine.length)) + pl.tail;
          if (pl.comment) emptyLine += " " + pl.comment;
          if (emptyLine !== lines[i]) { out[i] = emptyLine; changed.push(i); }
          continue;
        }
        const { oc: ocRaw, cc: ccRaw } = colsFor(pl, i);
        const oc = ocRaw + baseIndent, cc = ccRaw + baseIndent;
        let line = " ".repeat(lead) + pl.port;
        const afterPort = lead + pl.port.length;
        line += " ".repeat(Math.max(1, oc - afterPort)) + "( " + pl.sig;
        const afterSig = oc + 2 + pl.sig.length;
        line += " ".repeat(Math.max(1, cc - afterSig)) + ")";
        const afterParen = cc + 1;
        if (pl.tail) line += " ".repeat(Math.max(0, commaCol - afterParen)) + pl.tail;
        if (pl.comment) line += " " + pl.comment;
        if (line !== lines[i]) { out[i] = line; changed.push(i); }
      }
      return conns.length;
    }

    /**
     * 格式化一个例化块。支持三种写法：
     *   ① 模块名 实例名 (
     *   ② 模块名 #( ... ) 实例名 (        （参数同行）
     *   ③ 模块名#(  参数跨行  ) 实例名 (   （参数跨行）
     */
    function formatInstBlock(block) {
      // 本块原始缩进：模块级例化=0（行为不变），generate/begin 块内例化保留缩进
      const blockIndent = indentToSpaces(leadingIndent(block[0]));
      const out = block.slice();
      const changed = [];

      for (let i = 0; i < block.length; i++) {
        if (block[i].trim() === "" && block[i] !== "") { out[i] = ""; changed.push(i); }
      }

      const head = parseInstHeadLine(block[0]);
      const headNoParen = head ? null : parseInstHeadNoParen(block[0]);
      if (head) {
        // 例化头：模块名【顶格不缩进】+ 恰好 2 个空格 + 实例名 + 空格 + (
        //   例：ddc_ch0_top  u_ddc0_ch_top (
        let line = " ".repeat(blockIndent) + head.moduleName + "  " + head.instName;
        const cur = line.length;
        line += " ".repeat(Math.max(1, Math.max(COL.instOpen, cur + 1) - cur)) + "(";
        if (head.comment) line += " " + head.comment;
        if (line !== block[0]) { out[0] = line; changed.push(0); }
        const idxs = [];
        for (let i = 1; i < block.length - 1; i++) idxs.push(i);
        // 头行顶格（不缩进）→ 端口名列固定第 4 列，故基准缩进取 0
        renderConnLines(block, idxs, blockIndent, out, changed);
      } else if (headNoParen && isOpenParenOnlyLine(block[1])) {
        // 写法⑤：模块名 实例名 / ( / 端口列表 —— 保持原两行结构，只对齐端口连接行
        let line = " ".repeat(blockIndent) + headNoParen.moduleName + "  " + headNoParen.instName;
        if (line !== block[0]) { out[0] = line; changed.push(0); }
        const openLine = " ".repeat(blockIndent) + "(";
        if (openLine !== block[1]) { out[1] = openLine; changed.push(1); }
        const idxs2 = [];
        for (let i = 2; i < block.length - 1; i++) idxs2.push(i);
        renderConnLines(block, idxs2, blockIndent, out, changed);
      } else {
        const po = parseInstParamOpen(block[0]);
        if (!po) return null;
        const baseIndent = blockIndent;   // 整块缩进（模块级为 0）
        let pcIdx = -1;
        for (let i = 1; i < block.length; i++) {
          // 参数列表结束行：写法③ 为「) 实例名 (」；写法④ 为「单独 )」
          if (parseInstParamClose(block[i]) || isParamCloseOnlyLine(block[i])) { pcIdx = i; break; }
        }
        if (pcIdx < 0) return null;
        const pc = block[pcIdx];
        const pcParsed = parseInstParamClose(pc);
        const pcOnly = isParamCloseOnlyLine(pc);
        const headLine = " ".repeat(blockIndent) + po.moduleName + " #(";   // 保留 #( 前的空格
        if (headLine !== block[0]) { out[0] = headLine; changed.push(0); }
        const pIdx = [];
        for (let i = 1; i < pcIdx; i++) pIdx.push(i);
        renderConnLines(block, pIdx, baseIndent, out, changed);
        let bodyStart = pcIdx + 1;   // 端口连接行起始下标
        if (pcParsed && !pcOnly) {
          // 写法③： ) 实例名 ( 紧凑写在参数列表结束行
          const closeHead = " ".repeat(baseIndent) + ") " + pcParsed.instName + " (";
          if (closeHead !== block[pcIdx]) { out[pcIdx] = closeHead; changed.push(pcIdx); }
        } else if (pcOnly) {
          // 写法④： ) 单独一行，实例名 + ( 在下一行
          const onlyLine = " ".repeat(baseIndent) + ")";
          if (onlyLine !== block[pcIdx]) { out[pcIdx] = onlyLine; changed.push(pcIdx); }
          const nameLine = parseInstNameLine(block[pcIdx + 1]);
          if (nameLine) {
            const nl = " ".repeat(baseIndent) + nameLine.instName + " (";
            if (nl !== block[pcIdx + 1]) { out[pcIdx + 1] = nl; changed.push(pcIdx + 1); }
            bodyStart = pcIdx + 2;
          } else {
            return null;
          }
        } else {
          return null;
        }
        const cIdx = [];
        for (let i = bodyStart; i < block.length - 1; i++) cIdx.push(i);
        renderConnLines(block, cIdx, baseIndent, out, changed);
      }

      const last = block.length - 1;
      if (isInstCloseLine(block[last])) {
        // 只重写「纯 );」形式：isInstCloseLine 会先剥注释再判断，
        // 若无条件写死 ");" 会把带行尾注释的收尾行整行注释删掉。
        if (/^\)\s*;\s*$/.test(block[last].trim())) {
          const line = " ".repeat(blockIndent) + ");";
          if (line !== block[last]) { out[last] = line; changed.push(last); }
        }
      }

      return { lines: out, changed };
    }

    /** 扫描全文例化块，返回 [{start, end}]（0-based 含端点） */
    /**
     * 扫描全文例化块，返回 [{start, end}]（0-based 含端点）。
     * 统一状态机：从例化起始行开始累计括号深度，深度归零所在行即块尾。
     * 兼容写法：
     *   ① 模块名 实例名 (
     *   ② 模块名 #( ... ) 实例名 (        （参数同行）
     *   ③ 模块名#( 参数跨行 ) 实例名 (     （参数跨行，) 与实例名同行）
     *   ④ 模块名 #( 参数跨行 ) / 实例名 (  （) 与实例名分行）
     */
    function findInstBlocks(lines) {
      const blocks = [];
      for (let i = 0; i < lines.length; i++) {
        const head = parseInstHeadLine(lines[i]);
        const paramOpen = head ? null : parseInstParamOpen(lines[i]);
        const headNoParen = (!head && !paramOpen) ? parseInstHeadNoParen(lines[i]) : null;
        if (!head && !paramOpen && !headNoParen) continue;

        // 从起始行开始累计括号深度；深度<=0 且该行为 ); / ) 即块尾
        let depth = 0;
        let end = -1;
        // 扫描窗口上限：正常例化块远短于此。“大量未闭合例化头”的输入会让每个候选行
        // 一直扫到文件末尾 → O(n²)（实测 4000 行 20.7 秒，编辑器直接卡死）。
        const SCAN_LIMIT = 500;
        for (let j = i; j < lines.length && j - i <= SCAN_LIMIT; j++) {
          depth += openParenDelta(lines[j]);
          if (j > i && depth <= 0) {
            const t = lines[j].trim().replace(/\/\/.*$/, "").trim();
            // 仅 ); / ) ; 视为例化结束。单独的 ) 是「参数列表闭合」，
            // 例化尚未结束（后面还会有 实例名 ( 与端口列表），应继续扫描。
            if (t === ");" || t === ") ;") { end = j; break; }
            if (t === ")") { continue; }
            if (!/\(/.test(lines[j])) break;
          }
        }
        if (end < 0) continue;

        // 块内必须至少有一条连接行（.名字 ( 值 ) 或跨行拼接 .名字 ({）
        let has = false;
        for (let k = i + 1; k < end; k++) {
          if (parseInstPortLine(lines[k]) || parseInstConcatStart(lines[k])) { has = true; break; }
        }
        if (!has) continue;

        blocks.push({ start: i, end });
        i = end;
      }
      return blocks;
    }


    function planGroups(lines, splitFix) {
      // 例化块内的行不参与声明对齐（由 formatInstBlock 单独处理）
      const instRows = new Set();
      for (const b of findInstBlocks(lines)) {
        for (let k = b.start; k <= b.end; k++) instRows.add(k);
      }
      const groups = [];
      let cur = [], curKey = null, inBlock = false;
      const flush = () => { if (cur.length) groups.push(cur); cur = []; curKey = null; };

      // 模块头上下文跟踪：标记每一行是否位于 `module xxx #( ... )` 的参数列表内。
      // 兼容三种写法：
      //   ① module foo #(        ← # 与 ( 同行
      //   ② module foo #         ← # 与 ( 分行
      //     (
      //   ③ module foo #(parameter A=1)   ← 全在一行
      const inHeaderFlags = new Array(lines.length).fill(false);
      {
        let depth = 0, inHeader = false, pendingHash = false, sawOpen = false;
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          const isModule = /^\s*module\b/.test(l);
          if (isModule && l.includes("#")) {
            if (l.includes("(")) { inHeader = true; sawOpen = false; }
            else { pendingHash = true; }   // 形如 `module foo #`，等下一行的 (
          }
          if (!isModule && pendingHash && l.trim() !== "") {
            if (/^\s*\(/.test(l)) { inHeader = true; sawOpen = false; }
            pendingHash = false;
          }
          if (inHeader) inHeaderFlags[i] = true;
          for (let j = 0; j < l.length; j++) {
            if (l[j] === "(") { depth++; if (inHeader) sawOpen = true; }
            else if (l[j] === ")") depth--;
          }
          // 括号补偿：预处理把「output x );」拆成「output x」+「);」时，work 里这一行少一个 )。
          // 不补回来，模块头内的 depth 永不归零 → inHeader 泄漏到模块体，其 parameter 会被当成端口网格。
          if (splitFix && splitFix.has(i)) depth--;
          if (inHeader && sawOpen && depth <= 0) inHeader = false;
        }
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (instRows.has(i)) { flush(); continue; }   // 例化块交给例化格式化处理
        // 上一行被拆分（其 ); 会作为独立一行输出）→ 当前行另起一组，保证两次格式化分组一致
        if (splitFix && i > 0 && splitFix.has(i - 1)) flush();

        if (inBlock) {
          if (line.indexOf("*/") >= 0) inBlock = false;
          flush();
          continue;
        }
        {
          let j = 0, opened = false;
          while (j < line.length) {
            if (line[j] === '"') {
              j++;
              while (j < line.length && line[j] !== '"') { if (line[j] === "\\") j++; j++; }
              j++;
              continue;
            }
            if (line[j] === "/" && line[j + 1] === "*") {
              const end = line.indexOf("*/", j + 2);
              if (end < 0) { opened = true; break; }
              j = end + 2;
              continue;
            }
            j++;
          }
          if (opened) { inBlock = true; flush(); continue; }
        }

        const p0 = isFormattableLine(line) ? parseDeclaration(line) : null;
        let p = p0;
        if (p) p.inHeader = !!inHeaderFlags[i];   // 是否位于 module #( ... ) 参数列表内

        // 声明续行：上一行是以 , 结尾的声明时，本行若非关键字声明，尝试按续行解析
        // （一个声明跨多行的写法，续行不带关键字），并入【同一个组】共享列位。
        if (!p && !p0 && isFormattableLine(line) && cur.length && cur[cur.length - 1].p.tail === ",") {
          const c = parseContinuation(line);
          if (c) {
            c.inHeader = !!inHeaderFlags[i];
            cur.push({ index: i, p: c });
            continue;
          }
        }

        if (!p) {
          if (line.trim() === "") continue; // 空行不断组
          flush();
          continue;
        }
        // 组键：类型 + 布局类别。parameter 位于模块头（跟随端口网格）与位于模块体
        // （自然排布）布局不同，必须分成两组，否则列宽互相污染。
        const kw = String(p.roles.kw === undefined ? "" : p.roles.kw);
        const isGridCls = p.type === "port" || p.type === "decl"
          || (kw === "parameter" && p.inHeader);
        const key = p.type + "\u0000" + (isGridCls ? "grid" : "natural");
        if (curKey !== null && key !== curKey) flush();
        curKey = key;
        cur.push({ index: i, p });
      }
      flush();
      return groups;
    }

    /**
     * 主入口：格式化一段 Verilog 文本。
     * @param {string} text 原始文本
     * @returns {{formatted: string, changedLines: number[], totalChanges: number}}
     */
    /* ================= always 语句规范化 =================
       现有阶段只处理"声明类行"（端口 / reg|wire / parameter / assign / 例化），
       always、if/else、case、赋值语句、begin/end 一律不动。本阶段补上这块：
         ① 块内缩进统一为 4 空格（原文件 Tab 2485 行 / 空格 2793 行 / 混用 243 行，是最大乱源）
         ② 关键字空格统一：always@( → always @(、if( → if (、case( → case ( …
         ③ 清除行尾空白（原文件大量 `;→→→` 尾随空白）
         ④ case 项对齐（同一 case 块内，标签后的语句对齐到同一列）
         ⑤ 连续非阻塞赋值 <= 对齐（原文件 <= 有 59 种不同列位置）
       硬约束：只改空白字符，不增删任何非空白内容；幂等。
       作用范围仅限 always 块内，与声明阶段完全隔离，互不干扰。 */

    /* 剥离行尾注释（跳过字符串里的 //，如 $display("http://x")） */
    const stripLineComment = (s) => {
      let inStr = false;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (inStr) { if (c === "\\") { i++; continue; } if (c === '"') inStr = false; continue; }
        if (c === '"') { inStr = true; continue; }
        if (c === "/" && s[i + 1] === "/") return { body: s.slice(0, i), comment: s.slice(i) };
      }
      return { body: s, comment: "" };
    };

    /* 块注释区间标记：mask[i] === true 表示第 i 行【行首】已处于块注释内部。
       用途：连续空行压缩时必须跳过块注释内部，否则会把头部注释框里的空行吃掉。
       Verilog 块注释不可嵌套，故一次线性扫描即可；字符串常量与行注释里出现的
       块注释起止符都不算数。 */
    const blockCommentMask = (lines) => {
      const mask = new Array(lines.length).fill(false);
      let open = false;
      for (let i = 0; i < lines.length; i++) {
        mask[i] = open;
        const s = lines[i];
        let j = 0;
        while (j < s.length) {
          if (open) {
            const e = s.indexOf("*/", j);
            if (e < 0) break;
            open = false; j = e + 2;
          } else {
            const b = s.indexOf("/*", j), q = s.indexOf('"', j), lc = s.indexOf("//", j);
            if (lc >= 0 && (b < 0 || lc < b)) break;          // // 之后不再有块注释起点
            if (q >= 0 && (b < 0 || q < b)) {                  // 跳过字符串常量
              const e2 = s.indexOf('"', q + 1);
              j = e2 < 0 ? s.length : e2 + 1;
              continue;
            }
            if (b < 0) break;
            open = true; j = b + 2;
          }
        }
      }
      return mask;
    };
    /* 把一行切成类型化片段：code（可规范化）/ str（字符串字面量）/ cmt（注释正文）。
       inBlock = 本行行首已处于块注释内部（由 blockCommentMask 给出）。
       所有"改写字符"的规范化（Tab 展开 / 关键字空格 / 行尾空白）只作用于 code 片段：
       注释正文与字符串值是内容，必须原样保留 —— 这是本引擎"只动排版空白"的边界。 */
    const splitSegments = (line, inBlock, inStr) => {
      const segs = [];
      const n = line.length;
      let i = 0, inBlk = !!inBlock, sOpen = !!inStr;
      /* 从 from 扫到闭引号（\\ 转义跳过两个字符）；未闭合时扫到行尾并返回 > n。
         注意调用方必须【跳过开引号本身】再进来，否则开引号会被当成闭引号 ——
         这正是把续行字符串（"text if(x)\\ 换行 续行）漏出保护的原因。 */
      const scanStr = (from) => {
        let j = from;
        while (j < n) {
          if (line[j] === "\\") { j += 2; continue; }
          if (line[j] === '"') { j++; break; }
          j++;
        }
        return j;
      };
      while (i < n) {
        const start = i;
        if (inBlk) {
          while (i < n) { if (line[i] === "*" && line[i + 1] === "/") { i += 2; inBlk = false; break; } i++; }
          segs.push({ t: "cmt", s: line.slice(start, i) });
          continue;
        }
        if (sOpen) {                      // 行首已处于字符串内部（上一行 \\ 续行）
          i = scanStr(i);
          sOpen = false;
          segs.push({ t: "str", s: line.slice(start, i) });
          continue;
        }
        while (i < n && line[i] !== '"' && !(line[i] === "/" && (line[i + 1] === "*" || line[i + 1] === "/"))) i++;
        if (i > start) segs.push({ t: "code", s: line.slice(start, i) });
        if (i >= n) break;
        if (line[i] === '"') {            // 字符串段：含开引号，扫到闭引号或行尾
          const j = scanStr(i + 1);
          segs.push({ t: "str", s: line.slice(i, j) });
          i = j;
          continue;
        }
        if (line[i + 1] === "/") { segs.push({ t: "cmt", s: line.slice(i) }); break; }
        inBlk = true;
      }
      return segs;
    };

    /* 逐行"不可改写"标记：① 行首已处于块注释内部；② 本行是上一行未闭合字符串（\\ 续行）的延续。
       这两类行的字符全是内容，规范化必须整行跳过 —— 否则块注释正文里的 if(x) 会被加空格，
       if (x)，续行字符串 "text if(x)\\ 也会被改。 */
    const protectedLineMask = (lines) => {
      const bc = blockCommentMask(lines);
      const mask = new Array(lines.length).fill(false);
      let inStr = false;
      for (let i = 0; i < lines.length; i++) {
        mask[i] = bc[i] || inStr;
        if (bc[i]) continue;                 // 块注释内部不参与字符串判定
        const segs = splitSegments(lines[i], false, inStr);
        const lastSeg = segs.length ? segs[segs.length - 1] : null;
        // 只有"最后一个片段是未闭合字符串"才说明字符串延续到下一行
        inStr = !!(lastSeg && lastSeg.t === "str" && lastSeg.s.slice(-1) !== '"');
      }
      return mask;
    };
    /* 关键字与 '(' 之间【留一个空格】—— 对齐 lowRISC Verilog Coding Style Guide
       （Basics「Default to C-like Formatting」，原文：Place a space between `if` and
        the parenthesis in conditional expressions）：
         always@( → always @( ；if( → if ( ；case( → case ( ；for( → for ( …
       特例：always 与 @ 之间留一个空格，@ 与 ( 之间【不留】——规范原文示例为
       `always_ff @(posedge clk) begin`，@( 是事件控制符，不是函数调用。
       按字符串切分后只改字符串外的部分 —— 否则 $display("if (x)") 这类字符串内容会被改写。 */
    const KW_SRC = /(\balways(?:_ff|_comb|_latch)?)\s*@\s*\(|\b(if|case|casez|casex|for|while|foreach|repeat)\s*\(/g;
    const normKeywordSpace = (line, inBlock) => {
      /* 只改 code 片段：注释正文（行注释与块注释）与字符串值都不是代码，
         以前块注释正文里的 if(x) 会被加空格，续行字符串也会被改。 */
      let changed = false;
      const b = splitSegments(line, inBlock).map((seg) => {
        if (seg.t !== "code") return seg.s;
        const q = seg.s
          .replace(KW_SRC, (m, kw1, kw2) => (kw1 ? (kw1 + " @(") : (kw2 + " (")))
          .replace(/\belse\s+if\b/g, "else if");   // else 与 if 之间保留一个空格
        if (q !== seg.s) changed = true;
        return q;
      }).join("");
      return changed ? b : line;
    };

    /* Tab 按制表位展开为空格（保持视觉列宽不变）——缩进与行中间都要展开，
       原文件里 `dds_freq_inc\t<=\t'd0;` 这类行中间的 Tab 占大多数。 */
    const expandTabsAt = (line, tabSize, inBlock) => {
      const ts = tabSize || 4;
      let out = "", col = 0;
      /* 只展开 code 片段里的 Tab：字符串值与注释正文里的 Tab 是内容。
         实测 $display("a\tb") 曾被展开成 "a   b"（运行期输出都变了）。 */
      for (const seg of splitSegments(line, inBlock)) {
        if (seg.t !== "code") { out += seg.s; col += seg.s.length; continue; }
        for (const ch of seg.s) {
          if (ch === "\t") { const n = ts - (col % ts); out += " ".repeat(n); col += n; }
          else { out += ch; col++; }
        }
      }
      return out;
    };

    /* 缩进统一为 4 空格 + 清行尾空白；纯空白行归一成空行 */
    const normIndentAndTail = (line, inBlock) => {
      const expanded = expandTabsAt(line, 4, inBlock);
      const segs = splitSegments(expanded, inBlock);
      const last = segs.length ? segs[segs.length - 1] : null;
      const m = /^( *)/.exec(expanded);
      const raw = m ? m[1] : "";
      let body = expanded.slice(raw.length);
      /* 行尾空白只在"行尾仍处于代码区"时清理：字符串与注释内部的尾随空格是内容。 */
      if (!last || last.t === "code") body = body.replace(/[ \t]+$/, "");
      if (!body.trim()) return "";
      return raw + body;
    };

    /* always 块的结束行：按 begin/end 配平；单语句 always 则以分号结尾 */
    const findAlwaysEnd = (lines, start) => {
      let depth = 0, started = false;
      for (let i = start; i < lines.length; i++) {
        const { body } = stripLineComment(lines[i]);
        const toks = body.match(/\b(begin|end)\b/g) || [];
        for (const t of toks) {
          if (t === "begin") { depth++; started = true; }
          else if (started) { depth--; }
        }
        if (started && depth <= 0 && i > start) return i;
        if (!started && i > start && /;/.test(body)) return i;   // 无 begin 的单语句 always
        if (!started && i === start && /;/.test(body)) return i;
      }
      return Math.min(start + 1, lines.length - 1);
    };

    /* case 块内：标签后的语句对齐到同一列 */
    const alignCaseItems = (lines, from, to) => {
      const items = [];
      for (let i = from; i <= to; i++) {
        const { body, comment } = stripLineComment(lines[i]);
        const m = /^([ \t]*)([^:]+?)\s*:\s*(\S[\s\S]*)$/.exec(body);
        if (!m) continue;
        const label = m[2].trim();
        // 排除三元表达式 / 赋值 / 函数调用等"含冒号但不是 case 标签"的行
        if (!label || /[?=(){}]/.test(label)) continue;
        if (!/^[A-Za-z0-9_'\[\]$]+$/.test(label)) continue;
        items.push({ idx: i, indent: m[1], label, rest: m[3].replace(/[ \t]+$/, ""), comment });
      }
      if (items.length < 2) return;
      const w = Math.max(...items.map((x) => x.label.length));
      for (const it of items) {
        lines[it.idx] = it.indent + it.label + ":" + " ".repeat(w - it.label.length + 1) + it.rest + it.comment;
      }
    };

    /* 连续的非阻塞赋值 <= 对齐（同缩进层级、相邻行成组） */
    const alignNonblocking = (lines, from, to) => {
      let group = [];
      const flush = () => {
        if (group.length < 2) { group = []; return; }
        const w = Math.max(...group.map((g) => g.lhs.length));
        if (w > 48) { group = []; return; }   // 左值过长不对齐，避免行超宽
        for (const g of group) {
          lines[g.idx] = g.indent + g.lhs + " ".repeat(w - g.lhs.length + 1) + "<= " + g.rhs + g.comment;
        }
        group = [];
      };
      for (let i = from; i <= to; i++) {
        const { body, comment } = stripLineComment(lines[i]);
        const m = /^([ \t]*)([A-Za-z_][\w$]*(?:\s*\[[^\]]*\])*)\s*<=\s*(\S[\s\S]*)$/.exec(body);
        if (!m) { flush(); continue; }
        group.push({ idx: i, indent: m[1], lhs: m[2].trim(), rhs: m[3].replace(/[ \t]+$/, ""), comment });
      }
      flush();
    };

    /* 对一段行区间做基础规范化（缩进 / 行尾 / 关键字空格） */
    const normalizeBaseRange = (lines, from, to) => {
      /* 行首已处于块注释内部、或是上一行未闭合字符串的续行 → 整行原样保留。
         这类行的字符要么是注释正文、要么是字符串值，任何规范化都是改内容。 */
      const pmask = protectedLineMask(lines);
      for (let i = from; i <= to; i++) {
        if (pmask[i]) continue;
        let l = normIndentAndTail(lines[i]);
        l = normKeywordSpace(l);
        lines[i] = normIndentAndTail(l);   // 关键字规范化后可能多出/少掉空格，再归一一次行尾
      }
    };

    /* 对一段行区间做对齐（case 项 / 连续 <=），必须在基础规范化之后调用 */
    const normalizeAlignRange = (lines, from, to) => {
      for (let i = from; i <= to; i++) {
        const { body } = stripLineComment(lines[i]);
        if (!/^\s*(case|casez|casex)\b/.test(body)) continue;
        // 找对应 endcase
        let depth = 0, end = to;
        for (let j = i; j <= to; j++) {
          const b2 = stripLineComment(lines[j]).body;
          if (/\b(case|casez|casex)\b/.test(b2)) depth++;
          if (/\bendcase\b/.test(b2)) { depth--; if (depth <= 0) { end = j; break; } }
        }
        alignCaseItems(lines, i, end);
      }
      alignNonblocking(lines, from, to);
    };

    /* 结构合并（会改变行数，用 drop 集合记录被并入上一行的行号，组装时跳过）：
       lowRISC Verilog Coding Style Guide「Begin / End」节原文（措辞为 must）：
         ① "begin must be on the same line as the preceding keyword, and ends the line."
            always @(…) / begin      →  always @(…) begin
            if (…) / begin           →  if (…) begin
            end else / begin         →  end else begin
         ② "end else begin must be together on one line."
            end / else if (…) begin  →  end else if (…) begin
       两条例外（规范原文许可）：
         · end 带标签时 else 另起一行（"if end has a label, a following else
           should be on a new line"）——本实现只在 end 后无标签时合并；
         · end 行带行尾注释时不合并，否则注释会把 else 整段吞掉。
       注意：本步必须在 findAlwaysEnd 之后做 —— 合并 begin 会让块边界计数失效。 */
    const mergeStructLines = (lines) => {
      const drop = new Set();   // 被并入上一行、组装时需跳过的行号
      const BEGIN_PARENT = /(\)|\belse\b|\binitial\b|\bfinal\b)[ \t]*$/;
      const cmt = (c) => (c ? " " + c : "");   // stripLineComment 返回的注释从 // 开始，需补回前导空格
      for (let i = 0; i < lines.length; i++) {
        if (drop.has(i)) continue;
        /* 用游标 k 而非 i+1 逐行向前吞并 —— 并掉一行后必须继续看下一行，
           否则 `end` / `else if (…)` / `begin` 三行的链式合并会断在中间。 */
        for (let k = i + 1; k < lines.length; k++) {
          const { body: cb, comment: cc } = stripLineComment(lines[i]);
          const ct = cb.replace(/[ \t]+$/, "");
          if (!ct.trim()) break;                       // 整行注释不跨越
          const { body: nb, comment: nc } = stripLineComment(lines[k]);
          const nt = nb.trim();
          if (!nt) break;                              // 空行不跨越
          // ① end + else…  → end else…
          if (/^[ \t]*end[ \t]*$/.test(ct) && /^else\b/.test(nt) && !cc) {
            lines[i] = ct + " " + nt + cmt(nc);
            drop.add(k); continue;
          }
          // ② <控制头> + begin → <控制头> begin
          if (/^begin\b/.test(nt) && BEGIN_PARENT.test(ct)) {
            // 头行若带行尾注释，begin 必须插在注释【之前】，否则 begin 会被注释掉
            lines[i] = ct + " " + nt + cmt(nc) + cmt(cc);
            drop.add(k); continue;
          }
          break;
        }
      }
      return drop;
    };

    /* 全文入口：基础规范化作用于全文件，对齐只作用于 always 块内
       （case 项与 <= 对齐若放到全文，会误伤模块级声明与例化块的列位） */
    function formatAlwaysBlocks(lines) {
      const out = lines.slice();
      normalizeBaseRange(out, 0, out.length - 1);
      const HDR = /^\s*always(?:_ff|_comb|_latch)?\b/;
      for (let i = 0; i < out.length; i++) {
        const { body } = stripLineComment(out[i]);
        if (!HDR.test(body)) continue;
        // 区间上限放宽到「下一个 always 起点 / endmodule 之前」：
        // findAlwaysEnd 对 “always + if/else begin…end” 结构会停在第一个 end（漏掉 else 分支），
        // 于是 else 里的 <= 第一次不对齐、结构合并后的第二次才对齐 —— 表现为非幂等。
        // 放宽后 alignNonblocking / alignCaseItems 只作用于各自匹配的行，不影响模块级声明。
        let limit = out.length - 1;
        for (let k = i + 1; k < out.length; k++) {
          const b2 = stripLineComment(out[k]).body;
          if (HDR.test(b2) || /^\s*endmodule\b/.test(b2)) { limit = k - 1; break; }
        }
        const end = Math.max(findAlwaysEnd(out, i), limit);
        normalizeAlignRange(out, i, end);
        i = end;   // 跳过已处理的块，避免嵌套重复处理
      }
      // 结构合并放在最后：上面的块边界计算依赖 begin/end 的原始行分布
      return { lines: out, drop: mergeStructLines(out) };
    }

    function formatVerilog(text) {
      if (typeof text !== "string" || text === "") {
        return { formatted: typeof text === "string" ? text : "", changedLines: [], totalChanges: 0 };
      }
      // 行尾策略：统一行尾保持统一；**混合行尾**逐行保留原分隔符，
      // 避免“只格式化一下就把整文件的裸 \n 变成 CRLF”这种全文件级 diff。
      const rawParts = text.split(/(\r\n|\n|\r)/);
      const lines = [];
      const seps = [];
      for (let i = 0; i < rawParts.length; i += 2) {
        lines.push(rawParts[i]);
        if (i + 1 < rawParts.length) seps.push(rawParts[i + 1]);
      }
      const uniformEol = seps.length === 0 ? true : seps.every((s) => s === seps[0]);
      const eol = seps.length ? seps[0] : "\n";
      const sepAt = (i) => (uniformEol ? eol : (seps[i] !== void 0 ? seps[i] : eol));

      /* ---- 预处理：端口声明的结束括号若与最后一个端口同行，先拆到独立一行 ----
         形如  output [15:0] dout0_40M_q0 );   →   output [15:0] dout0_40M_q0
                                                  );
         拆出的 ); 用占位符记下，最后插回。预处理必须在分组之前，
         否则带 ); 的端口行无法被 parseDeclaration 识别（会漏掉格式化）。 */
      const splitAt = new Map();   // 原行号 -> 拆出的第二行文本（");"）
      const work = lines.slice();
      for (let i = 0; i < work.length; i++) {
        const line = work[i];
        const t = line.trim();
        if (t.startsWith("//") || t.startsWith("/*")) continue;
        if (!/^(input|output|inout)\b/.test(t)) continue;
        /* 判据与裁剪都只能作用在【代码部分】。此前直接拿整行做 /\)\s*;\s*$/ 与 replace，
           于是行尾注释里的 ");" 会被当成端口表的结束括号剪出来、当成真代码行插回 —— 实测
             output [7:0] dout, // 例: dout = q);
           会变成端口表在 dout 后就地闭合（还带多余逗号），后续端口全部掉到模块头外，
           文件变非法 Verilog。以前只有 cut.includes("(") 偶然挡住“注释里含 (”的情形。 */
        const sc = splitComment(line);
        const code = sc.body.replace(/\s+$/, "");
        if (!/\)\s*;\s*$/.test(code)) continue;
        const cut = code.replace(/\)\s*;\s*$/, "").trimEnd();
        if (cut.includes("(")) continue;   // 含未配对括号（如默认值），跳过
        work[i] = sc.comment ? (cut + " " + sc.comment) : cut;
        splitAt.set(i, ");");
      }

      const groups = planGroups(work, splitAt);

      const out = work.slice();
      const changedLines = [];
      for (const k of splitAt.keys()) changedLines.push(k + 1);

      /* ---- 先处理例化块（例化行不参与声明对齐，二者互不干扰）---- */
      const instBlocks = findInstBlocks(work);
      for (const b of instBlocks) {
        const res2 = formatInstBlock(work.slice(b.start, b.end + 1));
        if (!res2) continue;
        for (let k = 0; k <= b.end - b.start; k++) {
          if (res2.lines[k] !== work[b.start + k]) {
            out[b.start + k] = res2.lines[k];
            changedLines.push(b.start + k + 1);
          }
        }
      }

      for (const g of groups) {
        const plan = planGroup(g);
        for (const item of g) {
          const rendered = renderRow(item.p, plan);
          if (rendered !== work[item.index]) {
            out[item.index] = rendered;
            changedLines.push(item.index + 1);
          }
        }
      }

      /* ---- always 语句规范化（缩进 / 关键字空格 / 行尾 / case 对齐 / <= 对齐）
              + 结构合并（begin 与前一关键字同行、end else 同行）----
         放在声明与例化之后：这两者输出的行已是纯空格且列位固定，互不干扰。 */
      let structDrop = new Set();
      {
        const aw = formatAlwaysBlocks(out);
        for (let i = 0; i < aw.lines.length; i++) {
          if (aw.lines[i] !== out[i]) { out[i] = aw.lines[i]; changedLines.push(i + 1); }
        }
        structDrop = aw.drop;
      }

      /* 组装：把拆出的 ); 行插回，跳过已被合并进上一行的行，并把连续空行压缩为最多 1 行。
         空行压缩放在组装阶段（而不是改写 out）是为了不动行索引 —— 上面几步
         （声明分组 / 例化块 / always 规范化 / 结构合并）全部按 out 的原始索引定位。
         依据 Google C++ Style Guide（lowRISC 声明继承其格式化条款）：don't put more
         than one or two blank lines；systemverilog.io：sparingly, to indicate
         logical sections。块注释内部的空行不压缩，否则会吃掉头部注释框里排好的空行。 */
      const blkMask = blockCommentMask(out);
      const finalLines = [];
      const finalSeps = [];   // 与 finalLines 一一对应的行尾分隔符（混合行尾时逐行保留）
      let prevBlank = false;
      for (let i = 0; i < out.length; i++) {
        if (structDrop.has(i)) { changedLines.push(i + 1); continue; }
        const isBlank = out[i].trim() === "";
        if (isBlank && prevBlank && !blkMask[i]) { changedLines.push(i + 1); continue; }
        finalLines.push(out[i]);
        finalSeps.push(sepAt(i));
        if (splitAt.has(i)) {
          finalLines.push(splitAt.get(i));   // 顶格的 );
          finalSeps.push(sepAt(i));          // 新行沿用原行的行尾
          changedLines.push(i + 1);
        }
        prevBlank = isBlank;
      }

      let formatted = "";
      for (let i = 0; i < finalLines.length; i++) {
        if (i > 0) formatted += finalSeps[i - 1] !== void 0 ? finalSeps[i - 1] : eol;
        formatted += finalLines[i];
      }

      return {
        formatted,
        changedLines: [...new Set(changedLines)].sort((a, b) => a - b),
        totalChanges: new Set(changedLines).size
      };
    }


    /* ---- 仅供测试脚本抽取校验使用，不参与运行时逻辑 ---- */

    const BG = 'url("/api/skin-center/v2/skins/dragon-heir/assets/dark-art.webp")';
    const WS_KEY = "dsh-card-desktop.workspace";

/* ---------- 每个文件的撤销/重做历史（内存版） ----------
   用户实测要求："我退出前输入的东西没保存，再进来内容还在（对），但是不能撤销到上一步（不对）"。
   撤销栈原来是 CodePane 实例级的：退出工作台（组件卸载）或切标签就没了。这里按文件路径存一份内存历史，
   卸载时存、挂载时接回，切标签时存旧取新 —— 于是"退出再进来还能接着 Ctrl+Z"。
   为什么不落盘：每个撤销单元存的是一整份文本快照，落 localStorage 会撑爆配额；
   页面刷新（F5）后仍会丢 —— 与 VSCode 重新加载窗口的语义一致。 */
/* 连按两次 Esc（默认 700ms 内）= 强制退出卡片桌面：给"卡在桌面里出不来"留一个键盘出口。
   为什么需要：工作台内部有一层"点空白关闭菜单"的全屏 catcher（position:fixed; inset:0; zIndex:25），
   它盖在顶栏按钮之上；万一层状态卡住，桌面里所有鼠标点击都会失效（连"退出"都点不到），
   而键盘事件不会被 catcher 吃掉 —— 所以留一个纯键盘的出口。单次 Esc 的语义完全不变。 */
const DOUBLE_ESC_MS = 700;
const isDoubleEsc = (prevAt, now) => !!(prevAt > 0 && (now - prevAt) <= DOUBLE_ESC_MS);
/* 清掉本插件 append 到 body 的残留（缩略图右键菜单、turn-rail 隐藏样式）。
   这些元素不在 React 树里，桌面卸载时不会被自动收走。 */
const deskCleanupTransient = () => {
  try { const g = document.getElementById("carddesk-mm-menu"); if (g && g.parentNode) g.parentNode.removeChild(g); } catch (e) { }
  try { const st = document.getElementById("card-desktop-hide-turnrail"); if (st && st.parentNode) st.parentNode.removeChild(st); } catch (e) { }
  /* 还有没关闭的确认框：按「取消」结算并收走，别让等待方永远挂着 */
  try {
    const ns = document.querySelectorAll("[data-carddesk-confirm]");
    for (let i = 0; i < ns.length; i++) {
      const fin = ns[i].__carddeskFinish;
      if (typeof fin === "function") fin(false);
      else if (ns[i].parentNode) ns[i].parentNode.removeChild(ns[i]);
    }
  } catch (e) { }
};

const UNDO_MEM = new Map();                       // path(小写) → { undo: [...], redo: [...], at }
const UNDO_MEM_MAX_FILES = 20;                    // 最多记 20 个文件
const UNDO_MEM_PER_FILE = 4 * 1024 * 1024;        // 单文件历史字节上限（超了从最旧的丢）
const UNDO_MEM_TOTAL = 24 * 1024 * 1024;          // 全部文件合计上限
const undoMemKey = (p) => String(p == null ? "" : p).toLowerCase();
const undoMemBytes = (arr) => {
  let n = 0;
  for (const u of (arr || [])) n += String(u && u.text != null ? u.text : "").length;
  return n;
};
const undoMemTrim = (arr, maxBytes) => {
  const list = (arr || []).slice();
  let total = undoMemBytes(list);
  while (list.length > 1 && total > maxBytes) {
    total -= String(list[0] && list[0].text != null ? list[0].text : "").length;
    list.shift();
  }
  return list;
};
const undoMemSave = (path, undo, redo) => {
  const k = undoMemKey(path);
  if (!k) return;
  const u = undoMemTrim(undo, UNDO_MEM_PER_FILE);
  const r = undoMemTrim(redo, UNDO_MEM_PER_FILE);
  if (!u.length && !r.length) { UNDO_MEM.delete(k); return; }
  UNDO_MEM.set(k, { undo: u, redo: r, at: Date.now() });
  let total = 0;
  for (const rec of UNDO_MEM.values()) total += undoMemBytes(rec.undo) + undoMemBytes(rec.redo);
  while (UNDO_MEM.size > UNDO_MEM_MAX_FILES || total > UNDO_MEM_TOTAL) {
    let oldK = null, oldAt = Infinity;
    for (const [kk, rec] of UNDO_MEM) { if (kk === k) continue; if (rec.at < oldAt) { oldAt = rec.at; oldK = kk; } }
    if (!oldK) break;
    const rec = UNDO_MEM.get(oldK);
    total -= undoMemBytes(rec.undo) + undoMemBytes(rec.redo);
    UNDO_MEM.delete(oldK);
  }
};
const undoMemLoad = (path) => {
  const k = undoMemKey(path);
  const rec = k ? UNDO_MEM.get(k) : null;
  if (!rec) return null;
  rec.at = Date.now();
  return { undo: rec.undo.slice(), redo: rec.redo.slice() };
};
/* 隐藏编辑器 textarea 原生滚动条（改用自绘滚动条），并给自绘滚动条定样式 */
(function injectEditorCss() {
  try {
    let s = document.getElementById("carddesk-editor-css");
    if (!s) { s = document.createElement("style"); s.id = "carddesk-editor-css"; document.head.appendChild(s); }
    s.textContent = `
    .carddesk-editor textarea { scrollbar-width: none; -ms-overflow-style: none; }
    .carddesk-editor textarea::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    /* 隐藏 textarea 原生选区背景，避免与自绘选区高亮叠加成虚影 */
    .carddesk-editor textarea::selection { background: transparent !important; color: transparent !important; }
    .carddesk-editor textarea::-moz-selection { background: transparent !important; color: transparent !important; }
    /* 流式生成中的呼吸圆点 */
    @keyframes carddesk-pulse { 0%,100% { opacity: 1 } 50% { opacity: .25 } }
    .carddesk-blink { animation: carddesk-pulse 1s ease-in-out infinite; }
    /* 列模式下的块光标（原生光标到不了行尾之后的虚拟空格，改用自绘竖条） */
    @keyframes carddesk-blkblink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
    .carddesk-blkcaret { animation: carddesk-blkblink 1.06s step-end infinite; }
    /* 标签栏横向溢出时用细滚动条：默认 15px 的原生滚动条会吃掉标签高度 */
    .carddesk-tabstrip { scrollbar-width: thin; }
    .carddesk-tabstrip::-webkit-scrollbar { height: 4px; }
    .carddesk-tabstrip::-webkit-scrollbar-track { background: transparent; }
    .carddesk-tabstrip::-webkit-scrollbar-thumb { background: #3C3C3C; border-radius: 2px; }
    .carddesk-tabstrip::-webkit-scrollbar-thumb:hover { background: #4A4A4A; }
    `;
  } catch (e) { }
})();
/* ---------- 插件内确认框：替代原生 window.confirm ----------
   为什么不能用原生 modal：Electron/Windows 上的 window.confirm 是「弹窗期间禁用父窗口」的模态框，
   本机实测出过两次同一故障（转码路径两个确认框、还原文件一个确认框）：确认之后整个窗口的鼠标输入
   失效 —— 代码区点不动、文本光标不出现、连主界面输入框也点不了，必须最小化/还原窗口才恢复
   （Windows 的 EnableWindow；渲染进程没有任何 API 能重新启用自己的窗口）。
   所以插件内部一律不再弹原生框：这里在页面里画一个同款确认框，返回 Promise<boolean>。
   行为对齐原生：Enter=确定 / Esc=取消 / 点按钮；弹出期间吞掉其它按键（不穿透到编辑器打字）。
   取不到 DOM 时按「取消」结算（返回 false）：宁可什么都不做，也绝不退回会锁窗口的原生框。 */
const deskConfirmStack = [];
const deskConfirm = (text) => new Promise((resolve) => {
  let host = null;
  let done = false;
  const finish = (ok) => {
    if (done) return;
    done = true;
    try { document.removeEventListener("keydown", onKey, true); } catch (e) { }
    const i = deskConfirmStack.indexOf(host);
    if (i >= 0) deskConfirmStack.splice(i, 1);
    try { if (host && host.parentNode) host.parentNode.removeChild(host); } catch (e) { }
    resolve(ok === true);
  };
  const onKey = (e) => {
    /* 只处理最上面那个框（正常不会有第二个） */
    if (deskConfirmStack[deskConfirmStack.length - 1] !== host) return;
    const k = String(e.key || "");
    /* 放行刷新与开发者工具：万一界面异常，用户还能 F5 自救 */
    if (k === "F5" || k === "F12" || ((e.ctrlKey || e.metaKey) && (k === "r" || k === "R"))) return;
    e.preventDefault();
    e.stopPropagation();
    if (k === "Enter") { finish(true); return; }
    if (k === "Escape") { finish(false); return; }
  };
  try {
    host = document.createElement("div");
    host.setAttribute("data-carddesk-confirm", "1");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,0.42);display:flex;align-items:center;justify-content:center;cursor:default;";
    const box = document.createElement("div");
    box.style.cssText = "min-width:320px;max-width:min(640px,86vw);max-height:74vh;overflow:auto;background:#252526;color:#d4d4d4;border:1px solid #454545;border-radius:6px;box-shadow:0 12px 40px rgba(0,0,0,0.6);padding:14px 16px 12px;font:13px/1.65 Consolas,Menlo,monospace;";
    const msg = document.createElement("div");
    msg.style.cssText = "white-space:pre-wrap;word-break:break-word;";
    msg.textContent = String(text == null ? "" : text);
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:14px;";
    const mkBtn = (label, isPrimary) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText = "min-width:74px;padding:4px 14px;border-radius:3px;cursor:pointer;font:12px Consolas,Menlo,monospace;"
        + (isPrimary ? "background:#0e639c;color:#fff;border:1px solid #1177bb;" : "background:#3a3d41;color:#e0e0e0;border:1px solid #555;");
      b.onclick = () => finish(isPrimary === true);
      return b;
    };
    row.appendChild(mkBtn("取消", false));
    row.appendChild(mkBtn("确定", true));
    box.appendChild(msg);
    box.appendChild(row);
    host.appendChild(box);
    document.body.appendChild(host);
    host.__carddeskFinish = finish;
    deskConfirmStack.push(host);
    document.addEventListener("keydown", onKey, true);
  } catch (e) {
    finish(false);
  }
});
    /* ---------- 提问里附带的「选中代码」：发送照发，显示折成引用 ----------
       发送时把选中的代码作为上下文拼在问题前面（模型需要看到完整代码），
       但**对话里不该把整段代码贴出来**（用户实测："显得对话很长"）。
       VSCode 那套只显示一个引用（如 e#329-334）—— 这里把那段固定前缀折成一个引用芯片，
       代码本身不再显示；发给模型的内容一个字都没变。 */
    const SEL_CTX_RE = /^以下是我在编辑器中选中的代码（([^）]*)）：\r?\n```\r?\n[\s\S]*?\r?\n```\r?\n\r?\n/;
    const splitSelCtx = (txt) => {
      const s = String(txt == null ? "" : txt);
      const m = SEL_CTX_RE.exec(s);
      if (!m) return { ref: "", rest: s };
      return { ref: m[1], rest: s.slice(m[0].length) };
    };
    const basename = (p) => {
      const parts = String(p).split(/[\\/]/).filter(Boolean);
      return parts.length ? parts[parts.length - 1] : String(p);
    };
    // 显示层文本统一 \n；写盘时按文件原行尾还原 CRLF
    const eolEncode = (text, eol) => (eol === "crlf" ? String(text).replace(/\n/g, "\r\n") : String(text));
    /* 编码名的显示写法（与状态栏/转码提示保持一致：UTF-8 而不是 UTF8） */
    const encLabel = (e) => { const s = String(e || "utf8").toLowerCase(); return s === "gbk" ? "GBK" : (s === "utf8" ? "UTF-8" : s.toUpperCase()); };
    const sortEntries = (entries) => entries.slice().sort((a, b) => {
      const ad = a.type === "directory" ? 0 : 1;
      const bd = b.type === "directory" ? 0 : 1;
      if (ad !== bd) return ad - bd;
      return String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" });
    });
    const shouldHide = (nm) => {
      if (nm.startsWith(".")) return true;
      const lower = nm.toLowerCase();
      if (["node_modules", ".git", ".svn", "__pycache__", "vendor", ".next", ".nuxt", "dist", "build", ".cache", "target", "bin", "obj"].includes(lower)) return true;
      if (lower.startsWith("ntuser.dat") || lower === "pagefile.sys" || lower === "swapfile.sys" || lower === "hiberfil.sys" || lower.endsWith(".tm.blf") || lower.endsWith(".tmcontainer") || lower.endsWith(".regtrans-ms")) return true;
      return false;
    };
    const friendlyError = (code) => {
      if (code === "FS_NOT_TEXT") return "二进制文件，无法预览";
      if (code === "FS_NOT_FOUND") return "文件不存在";
      if (code === "FS_TOO_LARGE") return "文件过大，无法打开";
      if (code === "FS_PERMISSION_DENIED") return "无权限访问";
      return null;
    };
    const fmtErr = (e) => (e && e.message) ? e.message : String(e);
    const copyText = (txt) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt); return true; }
      } catch (e) { }
      try {
        const ta = document.createElement("textarea");
        ta.value = txt;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch (e) { }
      return false;
    };
    // 相对路径：以工作区内某根目录前缀去除
    const relPathOf = (path, folders) => {
      const p = String(path).replace(/\//g, "\\");
      let best = null;
      (folders || []).forEach((f) => {
        const root = String(f.path).replace(/[\\/]$/, "").replace(/\//g, "\\");
        if (p === root) { best = { root, rel: "" }; return; }
        if (p.toLowerCase().startsWith((root + "\\").toLowerCase())) {
          const cand = p.slice(root.length + 1);
          if (!best || root.length > best.root.length) best = { root, rel: cand };
        }
      });
      return best ? best.rel : p;
    };

    /* ---------------- 高亮（VSCode Dark+ 配色） ---------------- */
    const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    /* 关键字表：严格按用户 VSCode 安装的 msrh-h.veriloghdl 语法文件拆分
       - KW_V  ：verilog.tmLanguage.json → keyword.other.verilog（Verilog-2001 保留字，含 wire/reg/input/output）
       - KW_SV ：在 KW_V 基础上并上 systemverilog.tmLanguage.json 的 SV 专有关键字
       这样 .v 文件里 logic/always_ff/typedef 等 SV 词不再被着色成黄色。 */
    const KW_V = {
      // —— Verilog-2001 语言结构 ——
      module: 1, endmodule: 1, macromodule: 1, begin: 1, end: 1, if: 1, ifnone: 1, else: 1,
      for: 1, while: 1, forever: 1, repeat: 1, wait: 1, disable: 1,
      always: 1, initial: 1, assign: 1, deassign: 1, force: 1, release: 1, fork: 1, join: 1,
      case: 1, casez: 1, casex: 1, endcase: 1, default: 1,
      parameter: 1, localparam: 1, defparam: 1, specparam: 1, genvar: 1,
      generate: 1, endgenerate: 1, function: 1, endfunction: 1, task: 1, endtask: 1,
      posedge: 1, negedge: 1, edge: 1, event: 1,
      // —— 门原语 ——
      and: 1, nand: 1, or: 1, nor: 1, xor: 1, xnor: 1, not: 1, buf: 1,
      bufif0: 1, bufif1: 1, notif0: 1, notif1: 1, nmos: 1, pmos: 1, cmos: 1, rcmos: 1,
      rnmos: 1, rpmos: 1, tran: 1, rtran: 1, tranif0: 1, tranif1: 1, rtranif0: 1, rtranif1: 1,
      pullup: 1, pulldown: 1,
      // —— 驱动强度 ——
      highz0: 1, highz1: 1, large: 1, medium: 1, small: 1, strong0: 1, strong1: 1,
      pull0: 1, pull1: 1, weak0: 1, weak1: 1, supply0: 1, supply1: 1,
      // —— 数据类型 / 网线 ——
      wire: 1, reg: 1, integer: 1, real: 1, realtime: 1, time: 1,
      tri: 1, tri0: 1, tri1: 1, triand: 1, trior: 1, trireg: 1, wand: 1, wor: 1,
      signed: 1, unsigned: 1, scalared: 1, vectored: 1, automatic: 1,
      // —— 端口方向 ——
      input: 1, output: 1, inout: 1,
      // —— specify 块 ——
      specify: 1, endspecify: 1, primitive: 1, endprimitive: 1, table: 1, endtable: 1,
      attribute: 1, endattribute: 1
    };
    const KW_SV = Object.assign({}, KW_V, {
      // —— SV 控制流 / 断言 ——
      always_ff: 1, always_comb: 1, always_latch: 1, final: 1, do: 1, foreach: 1,
      return: 1, break: 1, continue: 1, join_any: 1, join_none: 1, wait_order: 1,
      assert: 1, assume: 1, cover: 1, expect: 1, restrict: 1, property: 1, endproperty: 1,
      sequence: 1, endsequence: 1, first_match: 1, throughout: 1, within: 1,
      matched: 1, matches: 1, intersect: 1, intersect_with: 1,
      // —— SV 面向对象 / 类型系统 ——
      class: 1, endclass: 1, extends: 1, implements: 1, virtual: 1, pure: 1,
      local: 1, protected: 1, extern: 1, new: 1, super: 1, this: 1, null: 1,
      typedef: 1, struct: 1, union: 1, enum: 1, packed: 1, tagged: 1, type: 1,
      interface: 1, endinterface: 1, modport: 1, package: 1, endpackage: 1,
      program: 1, endprogram: 1, checker: 1, endchecker: 1, clocking: 1, endclocking: 1,
      covergroup: 1, endgroup: 1, coverpoint: 1, bins: 1, binsof: 1, cross: 1,
      ignore_bins: 1, illegal_bins: 1, wildcard: 1, randsequence: 1, randcase: 1,
      import: 1, export: 1, bind: 1, alias: 1, let: 1, nettype: 1, interconnect: 1,
      constraint: 1, solve: 1, before: 1, dist: 1, inside: 1, with: 1,
      rand: 1, randc: 1,
      // —— SV 数据类型 / 修饰 ——
      logic: 1, bit: 1, byte: 1, int: 1, shortint: 1, longint: 1, shortreal: 1,
      void: 1, chandle: 1, string: 1, var: 1, static: 1, const: 1, ref: 1,
      uwire: 1, timeunit: 1, timeprecision: 1, default_nettype: 1, timescale: 1,
      unique: 1, unique0: 1, priority: 1, soft: 1, global: 1, context: 1,
      accept_on: 1, reject_on: 1, sync_accept_on: 1, sync_reject_on: 1,
      nexttime: 1, s_always: 1, s_eventually: 1, s_nexttime: 1, s_until: 1,
      s_until_with: 1, until: 1, until_with: 1, implies: 1, iff: 1, untyped: 1,
      strong: 1, weak: 1, forkjoin: 1
    });
    // 语法高亮配色：完全按用户 VSCode settings.json 的 editor.tokenColorCustomizations（Verilog/SystemVerilog）
    const HL = {
      keyword: "#DFC47D",      // keyword.other.verilog / storage.type.* / support.type.direction.*  (+bold)
      directive: "#FFCFAF",    // keyword.other.compiler.directive.verilog（`define 等）
      operator: "#9F9D6D",     // keyword.operator.*  (+bold)
      number: "#8CD0D3",       // constant.numeric.*
      sysfunc: "#E3CEAB",      // support.function.system.*（$display 等）(+bold)
      string: "#CC9393",       // string.quoted.double.*
      comment: "#7F9F7F",      // comment.line.double-slash / comment.block  (+bold)
      constant: "#7F9F7F"      // variable.other.constant.verilog (+italic)
    };
    // 关键字/类型统一取 HL.keyword（用户配置里 keyword.other.verilog 与 storage.type.* 同为 #DFC47D）
    // 操作符集合（Verilog/SV）：用户配置为 #9F9D6D + bold
    const OP_CHARS = "+-*/%=<>!&|^~?:";
    const hlLine = (line, inBlockRef, kwSet) => {
      const KWS = kwSet || KW_V;
      const l = line;
      let i = 0;
      const out = [];
      while (i < l.length) {
        const ch = l[i];
        if (inBlockRef.v) {
          const e = l.indexOf("*/", i);
          if (e < 0) { out.push(`<span style="color:${HL.comment};font-weight:bold">${escHtml(l.slice(i))}</span>`); i = l.length; }
          else { out.push(`<span style="color:${HL.comment};font-weight:bold">${escHtml(l.slice(i, e + 2))}</span>`); i = e + 2; inBlockRef.v = false; }
          continue;
        }
        if (ch === "/" && l[i + 1] === "/") { out.push(`<span style="color:${HL.comment};font-weight:bold">${escHtml(l.slice(i))}</span>`); break; }
        // 注意：这里必须输出字面 `/*`（曾误写成 `*/`，导致渲染层显示与磁盘内容不一致）
        if (ch === "/" && l[i + 1] === "*") { inBlockRef.v = true; out.push(`<span style="color:${HL.comment};font-weight:bold">/*</span>`); i += 2; continue; }
        // 字符串：Verilog/SV 只有双引号是字符串（单引号是基数/字符，不能当定界符）
        if (ch === '"') {
          let j = i + 1;
          while (j < l.length && l[j] !== '"' && l[j] !== "\\") j++;
          const end = j < l.length ? (l[j] === "\\" ? Math.min(j + 2, l.length) : j + 1) : l.length;
          out.push(`<span style="color:${HL.string}">${escHtml(l.slice(i, end))}</span>`);
          i = end;
          continue;
        }
        // 编译指令/宏：`define `include `ifdef …
        if (ch === "`") {
          let j = i + 1;
          while (j < l.length && /[A-Za-z0-9_$]/.test(l[j])) j++;
          if (j > i + 1) { out.push(`<span style="color:${HL.directive}">${escHtml(l.slice(i, j))}</span>`); i = j; continue; }
        }
        // 系统任务/函数：$display $clog2 $signed …
        if (ch === "$") {
          let j = i + 1;
          while (j < l.length && /[A-Za-z0-9_$]/.test(l[j])) j++;
          if (j > i + 1) { out.push(`<span style="color:${HL.sysfunc};font-weight:bold">${escHtml(l.slice(i, j))}</span>`); i = j; continue; }
        }
        // 基数数字：'d0 / 'hFF / 'sb1（单独出现的 Verilog 单引号也在这里着色，不误判为字符串）
        if (ch === "'") {
          const m = /^'[sS]?[bBoOdDhH][0-9a-fA-FxXzZ_?]+/.exec(l.slice(i));
          if (m) { out.push(`<span style="color:${HL.number}">${escHtml(m[0])}</span>`); i += m[0].length; continue; }
        }
        if (/[A-Za-z_]/.test(ch)) {
          let j = i + 1;
          while (j < l.length && /[A-Za-z0-9_$]/.test(l[j])) j++;
          const w = l.slice(i, j);
          const k = KWS[w];
          if (k) out.push(`<span style="color:${HL.keyword};font-weight:bold">${w}</span>`);
          else out.push(escHtml(w));
          i = j;
          continue;
        }
        if (/[0-9]/.test(ch)) {
          let j = i + 1;
          while (j < l.length && /[0-9a-zA-Z_'#()]/.test(l[j])) j++;
          out.push(`<span style="color:${HL.number}">${escHtml(l.slice(i, j))}</span>`);
          i = j;
          continue;
        }
        if (OP_CHARS.indexOf(ch) >= 0) {
          out.push(`<span style="color:${HL.operator};font-weight:bold">${escHtml(ch)}</span>`);
          i++;
          continue;
        }
        out.push(escHtml(ch));
        i++;
      }
      return out.join("");
    };
    const hlVerilog = (text, kwSet) => {
      const state = { v: false };
      const lines = String(text).split("\n");
      const html = [];
      for (let n = 0; n < lines.length; n++) html.push(hlLine(lines[n], state, kwSet));
      return html.join("\n");
    };
    // 按文件扩展名选关键字表：.sv/.svh 用 SV 表，其余（.v/.vh）只用 Verilog 表
    const isSVPath = (p) => {
      const m = /\.([A-Za-z0-9]+)$/.exec(String(p || ""));
      if (!m) return false;
      const e = m[1].toLowerCase();
      return e === "sv" || e === "svh";
    };

    /* ---- ㉓ Diff：行级差异（LCS），返回 { a, b, rows:[{t:'same'|'add'|'del', l, r}] }
       eqFn 可选：判断两行是否等价（默认精确相等；格式化预览传"忽略空白"版本） ---- */
    const diffLines = (aText, bText, eqFn, normFn) => {
      const aRaw = String(aText == null ? "" : aText).split("\n");
      const bRaw = String(bText == null ? "" : bText).split("\n");
      /* normFn 可选：先把每行 O(n+m) 归一化一次，再在 LCS 的 n×m 内层循环里做纯字符串比较。
         此前是把"忽略空白"的比较函数（内部跑正则 + 两次字符串分配）直接塞进内层循环，
         实测 3002 行的对比要 8.4 秒；归一化前置后 70 毫秒（约 120 倍）。
         传了 normFn 时不要再传 eqFn，让归一化后的精确相等生效。 */
      const a = (typeof normFn === "function") ? aRaw.map(normFn) : aRaw;
      const b = (typeof normFn === "function") ? bRaw.map(normFn) : bRaw;
      const n = a.length, m = b.length;
      // eqFn 可选：自定义"两行是否等价"。文件对比用默认的精确相等；
      // 格式化预览传 normFn 做"忽略空白"的等价判定 —— 否则格式化改的是每一行的空白，
      // 精确比较会判定"没有一行相同"，整篇变成 del+add 交错，左右完全错开。
      const eq = (typeof eqFn === "function") ? eqFn : ((x, y) => x === y);
      const MAX = 4000;
      if (n > MAX || m > MAX) return { a: aRaw, b: bRaw, rows: null, tooBig: true };
      /* 公共前后缀不进 DP：真实对比里绝大多数行是相同的，剥掉后 DP 只跑在真正不同的中段
         （3000 行只差几处时接近 O(n)，此前恒为 O(n·m)）。 */
      let lo = 0;
      while (lo < n && lo < m && eq(a[lo], b[lo])) lo++;
      let hiA = n, hiB = m;
      while (hiA > lo && hiB > lo && eq(a[hiA - 1], b[hiB - 1])) { hiA--; hiB--; }
      const na = hiA - lo, mb = hiB - lo;
      const rows = [];
      for (let k = 0; k < lo; k++) rows.push({ t: "same", l: k, r: k });
      // LCS 长度表（从右下往左上填），只覆盖中段 [lo, hiA) × [lo, hiB)
      const dp = [];
      for (let i = 0; i <= na; i++) dp.push(new Int32Array(mb + 1));
      for (let i = na - 1; i >= 0; i--) {
        for (let j = mb - 1; j >= 0; j--) {
          dp[i][j] = eq(a[lo + i], b[lo + j]) ? (dp[i + 1][j + 1] + 1) : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
      let i = 0, j = 0;
      while (i < na && j < mb) {
        if (eq(a[lo + i], b[lo + j])) { rows.push({ t: "same", l: lo + i, r: lo + j }); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { rows.push({ t: "del", l: lo + i, r: -1 }); i++; }
        else { rows.push({ t: "add", l: -1, r: lo + j }); j++; }
      }
      while (i < na) { rows.push({ t: "del", l: lo + i, r: -1 }); i++; }
      while (j < mb) { rows.push({ t: "add", l: -1, r: lo + j }); j++; }
      // 尾部公共行（前后缀按同一个 eq 剥离，故 n - hiA === m - hiB）
      const tail = n - hiA;
      for (let k = 0; k < tail; k++) rows.push({ t: "same", l: hiA + k, r: hiB + k });
      return { a: aRaw, b: bRaw, rows, tooBig: false };
    };

    /* 折叠 del/add 块为"改动行对"（并排预览用）。
       为什么必须折叠：LCS 把"删 N 行 + 增 M 行"排成【先 N 条删除、后 M 条新增】，
       于是被删区域在对侧渲染成一整段条纹占位行。
       实测（DDC_Top.v 端口表）：原文 `dout0_40M_q0 );` 是一行、其后还有 5 个空行，
       格式化把它拆成 `...q0` / `);` 两行、空行压成 1 行 —— 原始行对是 del×6 紧接
       add×2，于是"格式化预览"栏在 dout0_40M_i0 与 dout0_40M_q0 之间凭空插进 5 条
       条纹，被直接读成"格式化凭空多出空行"。
       折叠后 del 与 add 按顺序一一配对成 chg 行（两侧都有内容，不画条纹），
       只有数量不等的尾巴才留占位 —— 条纹只出现在"真的多一行/少一行"的地方。 */
    const foldDiff = (rows) => {
      const list = Array.isArray(rows) ? rows : [];
      const out = [];
      let i = 0;
      while (i < list.length) {
        if (list[i].t !== "del") { out.push(list[i]); i++; continue; }
        let j = i;
        while (j < list.length && list[j].t === "del") j++;
        let k = j;
        while (k < list.length && list[k].t === "add") k++;
        const dels = list.slice(i, j);
        const adds = list.slice(j, k);
        const pair = Math.min(dels.length, adds.length);
        for (let x = 0; x < pair; x++) out.push({ t: "chg", l: dels[x].l, r: adds[x].r });
        for (let x = pair; x < dels.length; x++) out.push(dels[x]);
        for (let x = pair; x < adds.length; x++) out.push(adds[x]);
        i = k;
      }
      return out;
    };

    /* 状态栏缩进显示：按文件内容探测（首个缩进行），探测不到就标注格式化默认值 */
    const indentLabelOf = (text) => {
      const m = /^([ \t]+)\S/m.exec(String(text || "").slice(0, 65536));   // 只看前 64KB：状态栏探测不该为大文件扫全文
      if (!m) return "空格: 4（格式化默认）";
      if (m[1][0] === "\t") return "Tab";
      return "空格: " + m[1].length;
    };

    /* 写白名单拦截后的统一处理：确认 → 授权目录 → 重试一次 */
    const deskWriteRetry = async (res, targetPath, retry) => {
      if (!res || res.ok || res.code !== "FS_OUTSIDE_WRITE_ROOT") return res;
      const dir = String(targetPath || "").replace(/[\\/][^\\/]*$/, "");
      if (!dir) return res;
      if (!await deskConfirm("该目录不在可写范围内：\n" + dir + "\n\n是否允许写入该目录？（授权后该目录下的文件都能写入）")) return res;
      const allow = await apiCall("allowWriteRoot", { path: dir });
      if (!allow || !allow.ok) return res;
      return await retry();
    };

    /* 会话状态写宿主的防抖器（模块级：组件每次渲染不重建定时器）。
   换浏览器（QQ浏览器 ↔ DSH.exe）打开时靠宿主这份共享状态；localStorage 仍保留作回退。 */
let sessionHostSaveTimer = null;
let sessionHostLastPayload = null;
function saveSessionToHost(session) {
  sessionHostLastPayload = session;
  if (sessionHostSaveTimer !== null) clearTimeout(sessionHostSaveTimer);
  sessionHostSaveTimer = setTimeout(() => {
    sessionHostSaveTimer = null;
    try { apiCall("sessionSave", { session: sessionHostLastPayload }).catch(() => { }); } catch (e) { }
  }, 600);
}
/* 立即把待发的会话写到宿主：退出工作台/页面隐藏时调用，别让 600ms 防抖把最后的未保存正文丢掉 */
function flushSessionToHost(extra) {
  if (sessionHostSaveTimer === null && !extra) return;
  if (sessionHostSaveTimer !== null) { clearTimeout(sessionHostSaveTimer); sessionHostSaveTimer = null; }
  const payload = Object.assign({}, sessionHostLastPayload || {}, extra || {});
  try { apiCall("sessionSave", { session: payload }).catch(() => { }); } catch (e) { }
}
/* ---------------- fetch API ---------------- */
    async function apiCall(method, args, timeoutMs) {
      const ctrl = new AbortController();
      // 默认 60s；长命令（runCommand 等）由调用方显式传更长的超时，避免前端过早失败而后端仍在跑
      const t = setTimeout(() => ctrl.abort(), Number(timeoutMs) > 0 ? Number(timeoutMs) : 60000);
      try {
        const r = await fetch("/desk/api/" + method, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args || {}),
          signal: ctrl.signal
        });
        let data = null;
        try { data = await r.json(); } catch (e) { data = null; }
        if (!r.ok) return { ok: false, error: (data && data.error) || ("HTTP " + r.status) };
        /* 写盘类调用成功后：让源代码管理面板立刻重读状态。
           否则刚保存/新建/批量替换的文件要手点「刷新」才出现在面板里（用户实测）。 */
        if (method === "writeFile" || method === "createFile" || method === "replaceInFiles") {
          refreshScmPanelNow();
        }
        return data;
      } catch (e) {
        return { ok: false, error: fmtErr(e) };
      } finally {
        clearTimeout(t);
      }
    }

    /* ---------------- CodePane：行号 + 高亮编辑器（VSC 配色） ---------------- */
    // 行高与字体：对齐用户 VSCode 配置（editor.fontFamily: "Consolas, monospace"，editor.fontSize: 10）
// 行高随字号变化（VSCode 默认约 fontSize × 1.5），支持 Ctrl+滚轮缩放（editor.mouseWheelZoom）
let LINE_H = 20;          // 可变：由 CodePane 渲染时按当前字号更新
/** 编辑器默认字号（用户 VSCode 配置为 10，浏览器观感偏小，取 13；可 Ctrl+滚轮自调并记忆） */
const EDITOR_FONT_DEFAULT = 13;
const EDITOR_FONT_KEY = "card-desk.editor-font-size";
const loadEditorFont = () => {
  try { const v = parseInt(localStorage.getItem(EDITOR_FONT_KEY) || "", 10); if (v >= 8 && v <= 40) return v; } catch (e) { }
  return EDITOR_FONT_DEFAULT;
};
// 状态栏：按扩展名显示语言名（VSCode 状态栏右侧）
const langOf = (path) => {
  const ext = basename(path).split(".").pop().toLowerCase();
  const map = { v: "Verilog", sv: "SystemVerilog", svh: "SystemVerilog", vh: "Verilog Header", vhd: "VHDL", vhdl: "VHDL", xdc: "XDC", tcl: "TCL", md: "Markdown", txt: "Plain Text", json: "JSON", py: "Python", c: "C", h: "C", cpp: "C++", hpp: "C++", m: "MATLAB", do: "TCL", asm: "Assembly", log: "Log" };
  return map[ext] || "Plain Text";
};
// 行尾由打开文件时记录的 tab.eol 提供（状态栏直接读 tab.eol，无需再从文本探测）
/* ⑫ 大纲解析：列出【本文件的 module 定义】与【本文件例化的子模块】（VSCode Outline 语义）。
   两个关键点（旧实现都踩了，导致 FPGA 工程里实例几乎一条都列不出来）：
   ① 不要求类型名在本文件定义过 —— 子模块绝大多数在别的文件里，改用"外部模块"标记而不是丢弃；
   ② 支持 #(参数) 跨行书写 —— 工程里的例化普遍是
          Multiply_complex1 #(
              .CUT_HBIT ( 28 )
          )
          MC1(
      类型名、参数列表、实例名分处三行，必须允许跨行匹配。 */
/* 剥离 Verilog 注释（保留换行，避免影响后续按行/按逗号切分）。
   必须做：端口表与连接列表里普遍带行尾中文注释，而注释里常含逗号与括号
   （例：`dds_inv , // DDS正交相位反转: 1=Q取反(负频/下边带), 0=正常(上边带)`），
   不剥离就会把这些逗号当成分隔符，导致后面的端口名被并进注释残留段而丢失，
   最终表现为大面积"端口未连接"的误报。
   实现要点：用【等长替换】（非换行字符换空格、换行保留），这样剥离后的字符串
   与原文偏移一一对应，端口解析才能回溯出准确的定义行号。 */
const stripVerilogComments = (s) => String(s == null ? "" : s)
  .replace(/\/\*[\s\S]*?\*\//g, (mm) => mm.replace(/[^\n]/g, " "))
  .replace(/\/\/[^\n]*/g, (mm) => " ".repeat(mm.length));

const parseOutline = (txt) => {
  const out = [];
  if (!txt) return out;
  const lines = String(txt).split("\n");
  // 第一遍：本文件定义的 module（作为"内部/外部"判据）
  const modules = new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\/\/.*$/, "").trim();
    const m = line.match(/^(?:module|macromodule)\s+([A-Za-z_]\w*)/);
    if (m) { modules.add(m[1]); out.push({ kind: "module", name: m[1], line: i + 1, extra: "", ext: false }); }
  }
  // 第二遍：例化。形态 = <类型名> [#(参数)] <实例名> ( ，允许跨行（最多向后看 150 行 / 6000 字符）。
  // 注意两点：捕获组只有 2 个（#(...) 用非捕获组）；片段必须以去缩进的 head 起头，否则 ^ 锚不住带缩进的例化行。
  const RX_INST = /^([A-Za-z_]\w*)\s*(?:#\s*\([\s\S]*?\)\s*)?([A-Za-z_]\w*)\s*\(/;
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i].replace(/\/\/.*$/, "").replace(/^\s+/, "");
    if (!head) continue;
    const c0 = head.charAt(0);
    // 快速排除：注释/宏调用/系统任务/端口连接(.xxx)/预处理指令/延时(#10)
    if (c0 === "." || c0 === "`" || c0 === "$" || c0 === "/" || c0 === "#" || c0 === "*" || c0 === "(" || c0 === ")") continue;
    // 快速排除：完整赋值或声明语句（含 = 或 ; 的行不可能是例化的起始行）
    if (head.indexOf("=") >= 0 || head.indexOf(";") >= 0) continue;
    const typeName = /^([A-Za-z_]\w*)/.exec(head);
    if (!typeName) continue;
    if (KW_SV[typeName[1]]) continue;                       // 行首是关键字（module/always/if/wire/reg…）
    const frag = head + "\n" + lines.slice(i + 1, i + 150).join("\n");
    const m = RX_INST.exec(frag.slice(0, 6000));
    if (!m) continue;
    const tn = m[1], instName = m[2];
    if (tn !== typeName[1]) continue;                       // 必须与本行行首标识符一致
    if (KW_SV[tn] || tn === instName) continue;
    const key = instName + "@" + (i + 1);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: "instance", name: instName, line: i + 1, extra: tn, ext: !modules.has(tn) });
  }
  out.sort((a, b) => a.line - b.line);
  return out;
};
/* ㉜ Verilog 结构树（代码折叠的等价物）：
   栈式配对 module/function/task/generate/begin/case/fork/interface/package/class…
   产出 [{kind, line, endLine, depth, label}]，供"结构导航"面板点击跳转。
   说明：编辑器是 textarea+pre 双图层，无法真折叠（隐藏行会让光标/点击错位），
   因此以"嵌套结构 + 跳转"提供等价定位能力。 */
const parseStructure = (txt) => {
  const lines = String(txt == null ? "" : txt).split("\n");
  const PAIR = {
    module: "endmodule", macromodule: "endmodule", program: "endprogram",
    function: "endfunction", task: "endtask", generate: "endgenerate",
    begin: "end", case: "endcase", casex: "endcase", casez: "endcase",
    fork: "join", specify: "endspecify", interface: "endinterface",
    package: "endpackage", class: "endclass", property: "endproperty",
    sequence: "endsequence", covergroup: "endgroup", clocking: "endclocking",
    checker: "endchecker", table: "endtable", primitive: "endprimitive"
  };
  const OPEN = Object.keys(PAIR);
  const RX = new RegExp("\\b(" + OPEN.concat(["endmodule", "endprogram", "endfunction", "endtask", "endgenerate", "end", "endcase", "join", "join_any", "join_none", "endspecify", "endinterface", "endpackage", "endclass", "endproperty", "endsequence", "endgroup", "endclocking", "endchecker", "endtable", "endprimitive"]).join("|") + ")\\b", "g");
  const out = [];
  const stack = [];
  for (let i = 0; i < lines.length; i++) {
    const clean = lines[i].replace(/\/\/.*$/, "");      // 去行注释（块注释跨行不处理，容错优先）
    let m;
    RX.lastIndex = 0;
    while ((m = RX.exec(clean)) !== null) {
      const w = m[1];
      if (Object.prototype.hasOwnProperty.call(PAIR, w)) {
        let label = clean.trim();
        // begin 单独成行时，用上方最近的语句行做标签（如 always @(posedge clk)），更直观
        if (w === "begin" && /^begin\b/.test(label)) {
          for (let k = i - 1; k >= 0 && k >= i - 4; k--) {
            const t = lines[k].replace(/\/\/.*$/, "").trim();
            if (t && !/^(begin|end)\b/.test(t)) { label = t; break; }
          }
        }
        const rec = { kind: w, line: i + 1, endLine: 0, depth: stack.length + 1, label: label.slice(0, 70) };
        stack.push(rec);
        out.push(rec);
      } else {
        // 闭合：从栈顶向下找第一个匹配的 opener
        for (let k = stack.length - 1; k >= 0; k--) {
          const top = stack[k];
          const want = PAIR[top.kind];
          const ok = (want === w) || (top.kind === "fork" && (w === "join_any" || w === "join_none"));
          if (ok) { top.endLine = i + 1; stack.length = k; break; }
        }
      }
    }
  }
  return out;
};
// ⑨ 查找匹配高亮层 HTML：把 text 中所有匹配子串包上背景色（当前匹配高亮，其余弱高亮）。
// matches = [{start, end}]（end 支持正则变长匹配）；文本先 escHtml 转义再插 span，渲染后与底层高亮 pre 逐字对齐。
// 高亮配色：完全取 VSCode Dark 2026 主题（editor.findMatch* / selectionHighlight / selection）
const HL_BG = {
  /* 当前匹配必须与"其余匹配/选词高亮"一眼分得开：原来四种高亮都是同一个蓝 #276782 只差透明度
     （A8/80/60/DD），深色底上几乎无法区分 —— 用户反馈"点查找下一个后全都高亮，看不出跳到哪"。
     现在当前匹配用暖色 + 描边（VSCode 的 editor.findMatchBackground 本就是 #9E6A03 这一档），其余保持蓝色。 */
  findCur: "#9E6A03CC",   // 当前匹配：暖色，与蓝色系高亮明显区分
  findCurEdge: "#f0b429", // 当前匹配的描边（与其它高亮同底色时也能看清落点）
  find: "#27678280",      // editor.findMatchHighlightBackground（其余匹配）
  selWord: "#27678260",   // editor.selectionHighlightBackground（Ctrl+D 选词全部出现）
  selection: "#276782DD", // editor.selectionBackground（真实选区）
  mark: "#3994BC40"       // 标记（Mark All）：用 accent 的淡色，与查找蓝区分开
};
// 高亮区间【只加背景、不写文字】：高亮层位于语法文字层下方，文字颜色一律透明，
// 让上层语法着色完整显示（与 VSCode 的分层一致，避免高亮盖住/染污文字）。
const buildMatchHtml = (txt, matches, curIdx) => {
  const mArr = matches || [];
  if (!mArr.length) return escHtml(txt);
  let html = "";
  let i = 0;
  for (let k = 0; k < mArr.length; k++) {
    const m = mArr[k];
    const s = m.start, e = m.end;
    if (e <= i) continue; // 完全被前面区间覆盖，跳过
    if (s > i) html += escHtml(txt.slice(i, s));
    const ss = Math.max(s, i); // 重叠时只渲染未覆盖部分，保留先前颜色
    const hit = txt.slice(ss, e);
    const bg = m.bg || ((k === curIdx) ? HL_BG.findCur : HL_BG.find);
    /* outline 可选：当前查找匹配加一圈描边，即使与选词高亮/标记同底色也能一眼看出落点 */
    const edge = m.outline ? (";box-shadow:inset 0 0 0 1px " + m.outline) : "";
    html += '<span style="background:' + bg + edge + ';color:transparent;border-radius:2px">' + escHtml(hit) + "</span>";
    i = Math.max(i, e);
  }
  html += escHtml(txt.slice(i));
  return html;
};
/* ---------- 列（矩形）选择：Notepad++ / Scintilla 同款 ----------
   Notepad++ 的列模式键位（照着搬）：
     · Alt + 鼠标拖拽         拉出矩形块
     · Alt+Shift+方向键       按列(←/→) / 按行(↑/↓) 扩块；Home/End 拉到行首/行尾
     · 块存在时直接打字/退格   逐行同时生效（多光标语义）
     · Esc 或普通方向键       退出列选择
     · Ctrl+C / Ctrl+X        整块复制 / 剪切（按行拼回，Notepad++ 即此行为）
   textarea 只有一段线性选区、无法表达矩形，所以这里自己维护矩形状态：
     ① 矩形按行拆成 [start, end] 区间交给高亮层（与查找高亮同一套渲染，不会错位）；
     ② 打字/删除按行改写文本，然后写回线性光标；矩形继续保留 → 可以连续输入。
     ③ **列宽按"显示列"算（Tab 展开到 4 的倍数）**，与 Notepad++/Scintilla 一致 ——
        按字符下标算的话，Tab 对齐的文件会行行错位（用户实测踩过：乱跑乱选）。
   本段全部是纯函数，便于离线单测（regression/tmp-verify-colsel.mjs）。 */
/* 绝对偏移 → {line,col}（**0-based**，矩形计算用；注意与文件上方那套 1-based 的 lineColAt 区分开） */
const blkLineColAt = (starts, off) => {
  let lo = 0, hi = Math.max(0, starts.length - 1);
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= off) lo = mid; else hi = mid - 1; }
  return { line: lo, col: Math.max(0, off - starts[lo]) };
};
/* 编辑器三层共用的内边距（与样式 padding: 12px 96px 22px 16px 一致）：像素 → 行列 换算要用 */
const ED_PAD_TOP = 12;
const ED_PAD_LEFT = 16;
/* 等宽字体的单字符宽度：在【真实文档里】用一个隐藏 span 量（canvas 手写 font 串一旦与 CSS 实际字体
   不一致，像素 → 显示列 的换算就会系统性偏移）。测不到退回 canvas，最后按 0.55em 估。 */
let MONO_ADV_CACHE = { font: "", w: 0 };
const measureMonoW = (fontSz, host) => {
  const key = String(fontSz);
  if (MONO_ADV_CACHE.font === key && MONO_ADV_CACHE.w > 0) return MONO_ADV_CACHE.w;
  let w = 0;
  try {
    const probe = document.createElement("span");
    probe.textContent = "0000000000000000000000000000000000000000";
    probe.style.cssText = "position:absolute;left:-99999px;top:0;visibility:hidden;white-space:pre;font-family:Consolas, monospace;font-size:" + fontSz + "px;line-height:normal;letter-spacing:normal";
    const box = host || document.body;
    box.appendChild(probe);
    w = probe.getBoundingClientRect().width / 40;
    box.removeChild(probe);
  } catch (err) { w = 0; }
  if (!(w > 0)) w = fontSz * 0.55;
  MONO_ADV_CACHE = { font: key, w: w };
  return w;
};

/* ---------- 显示列（Notepad++/Scintilla 的矩形选择就是按「显示列」算的，不是字符下标） ----------
   为什么必须这样：Verilog 文件普遍用 Tab 对齐（本机用户的文件正是如此），
   同一个「字符下标」在 Tab 数不同的行上会落在完全不同的显示列（实测：下标 13 → 显示列 32 / 20 / 20），
   于是矩形行行错位、打字/删除也会削到别的字符上。按显示列算，每行自动落到同一条竖线上。 */
const VIS_TAB = 4;                                  // 与编辑器 tabSize 一致
/* 一个字符占几个显示列：中日韩/全角 = 2（终端与 Scintilla 的显示列口径），其余 = 1。
   为什么要区分：中文在等宽字体下实际渲染宽度约 1.7 个字符宽，旧模型一律按 1 列算，
   于是按"显示列"补出来的空格不够 —— 含中文的行右边缘被字形顶出去，矩形每行参差不齐（用户截图实测）。 */
const visCharW = (ch) => {
  const c = ch.charCodeAt(0);
  if (!(c >= 0x1100)) return 1;
  if ((c >= 0x1100 && c <= 0x115F) || (c >= 0x2E80 && c <= 0x303E) || (c >= 0x3041 && c <= 0x33FF) ||
      (c >= 0x3400 && c <= 0x4DBF) || (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0xA000 && c <= 0xA4CF) ||
      (c >= 0xA960 && c <= 0xA97F) || (c >= 0xAC00 && c <= 0xD7A3) || (c >= 0xF900 && c <= 0xFAFF) ||
      (c >= 0xFE10 && c <= 0xFE19) || (c >= 0xFE30 && c <= 0xFE6F) || (c >= 0xFF00 && c <= 0xFF60) ||
      (c >= 0xFFE0 && c <= 0xFFE6)) return 2;
  return 1;
};
const visColsOfLine = (line) => {
  const s = String(line == null ? "" : line);
  const spans = [];
  let col = 0;
  for (let i = 0; i < s.length; i++) {
    const w = (s.charAt(i) === "\t") ? (VIS_TAB - (col % VIS_TAB)) : visCharW(s.charAt(i));
    spans.push({ c: col, w: w });
    col += w;
  }
  return { spans: spans, len: col };
};
/* 显示列 v 落在哪个字符上（超出行宽 → 行尾） */
const visToChar = (line, v) => {
  const s = String(line == null ? "" : line);
  const sp = visColsOfLine(s);
  if (v >= sp.len) return s.length;
  for (let i = 0; i < sp.spans.length; i++) if (v < sp.spans[i].c + sp.spans[i].w) return i;
  return sp.spans.length;
};
/* 显示列 v 之前的字符个数：区间右端点用它，保证把"跨到 v 以内"的整个 Tab 一起覆盖 */
const visEndChar = (line, v) => {
  const sp = visColsOfLine(line);
  for (let i = 0; i < sp.spans.length; i++) if (sp.spans[i].c >= v) return i;
  return sp.spans.length;
};
/* 字符下标 → 显示列 */
const visOfChar = (line, idx) => {
  const sp = visColsOfLine(line);
  return (idx >= sp.spans.length) ? sp.len : sp.spans[idx].c;
};
/* 某一行在【显示列】区间 [c0,c1] 内覆盖到的绝对字符区间（自动夹到该行范围，行尾不含换行符） */
const blkLineRange = (starts, text, ln, c0, c1) => {
  const s = starts[ln];
  const e = (ln + 1 < starts.length) ? starts[ln + 1] - 1 : text.length;
  const line = text.slice(s, e);
  const v0 = Math.max(0, c0 || 0);
  const v1 = Math.max(v0, (c1 == null) ? v0 : c1);
  const a = s + visToChar(line, v0);
  const b = s + Math.max(visToChar(line, v0), visEndChar(line, v1));
  return [Math.min(a, e), Math.min(Math.max(a, b), e)];
};
const blkNorm = (a, h) => ({
  l0: Math.min(a.line, h.line), l1: Math.max(a.line, h.line),
  c0: Math.min(a.col, h.col), c1: Math.max(a.col, h.col)
});
const blkEmpty = (a, h) => a.line === h.line && a.col === h.col;
/* 矩形扩块：活动端 h 按 dLine/dCol 移动（Home/End 传 ±1e5，靠夹紧落到行首/行尾） */
const blkExtend = (blk, dLine, dCol, text, starts) => {
  const n = starts.length;
  const line = Math.max(0, Math.min(n - 1, blk.h.line + (dLine || 0)));
  const s = starts[line];
  const e = (line + 1 < n) ? starts[line + 1] - 1 : text.length;
  /* 显示列宽（Tab 展开后的宽度），不是字符数 */
  const visLen = visColsOfLine(text.slice(s, e)).len;
  const col = Math.max(0, Math.min(visLen, blk.h.col + (dCol || 0)));
  return { a: blk.a, h: { line: line, col: col } };
};
/* 把矩形按行替换成 ins：每行删掉 [c0, c1] 再在该列插入 ins（行不够长且有内容要插时补空格，与 Scintilla 一致）。
   返回 { text, rect, changed }；rect 是操作后的新矩形（右移到插入内容之后，ins 为空则收拢到 c0）。
   注意 ins 不含换行符 —— Enter 由调用方单独处理：插入换行后行结构变了，直接退出列模式。 */
const blkApply = (text, starts, rect, ins) => {
  const n = starts.length;
  const l0 = Math.max(0, rect.l0), l1 = Math.min(rect.l1, n - 1);
  const add = String(ins == null ? "" : ins);
  if (l1 < l0) return { text: text, rect: rect, changed: false };
  const pieces = [];
  let changed = false;
  for (let ln = 0; ln < n; ln++) {
    const s = starts[ln];
    const seg = text.slice(s, (ln + 1 < n) ? starts[ln + 1] : text.length);
    if (ln < l0 || ln > l1) { pieces.push(seg); continue; }
    const nl = seg.slice(-1) === "\n" ? "\n" : "";
    const raw = nl ? seg.slice(0, -1) : seg;
    /* 按【显示列】删：区间内的 Tab 整体删除（与 Scintilla 一致），右端点会覆盖跨界的 Tab */
    const delA = visToChar(raw, Math.max(0, rect.c0));
    const delB = Math.max(delA, visEndChar(raw, Math.max(0, rect.c1)));
    let head = raw.slice(0, delA);
    /* 行不够长（或落点在 Tab 中间）又要插内容时，补空格补到目标显示列 —— 对应 Scintilla 的虚拟空格 */
    if (add) {
      const pad = Math.max(0, rect.c0) - visOfChar(raw, delA);
      if (pad > 0) head += new Array(pad + 1).join(" ");
    }
    const next = head + add + raw.slice(delB);
    if (next !== raw) changed = true;
    pieces.push(next + nl);
  }
  const nc = rect.c0 + add.length;
  return { text: pieces.join(""), rect: { l0: rect.l0, l1: rect.l1, c0: nc, c1: nc }, changed: changed };
};
/* 矩形（列）粘贴：把剪贴板的第 i 行填进矩形的第 i 行，插在矩形左边界，该行原有内容整体右移。
   这是 Scintilla / Notepad++ 的矩形粘贴语义，也正是"把本行内容排到后面"：
   列模式下光标被放在矩形的右下角，若按"在光标处插一整段"处理，整块会跑到最后一行末尾，
   本行内容（例如刚打的 111）反而被甩到粘贴块最后一行之后（用户实测）。
   - 剪贴板行数 < 矩形行数：只填前几行，其余行原样；
   - 剪贴板行数 > 矩形行数：块往下长（文件末尾补行），新矩形跟着变高；
   - 行不够长：补空格补到矩形左边界（虚拟空格，与 blkApply 同口径）。
   返回 { text, rect, changed }。 */
const blkPasteRect = (text, starts, rect, rows) => {
  const n = starts ? starts.length : 0;
  if (!n) return { text: text, rect: rect, changed: false };
  const l0 = Math.max(0, rect.l0 || 0);
  const l1 = Math.min(Math.max(rect.l0 || 0, rect.l1 == null ? rect.l0 || 0 : rect.l1), n - 1);
  const c0 = Math.max(0, rect.c0 || 0);
  const list = (rows || []).map((r) => String(r == null ? "" : r));
  if (!list.length || l1 < l0) return { text: text, rect: rect, changed: false };
  const map = {};
  for (let i = 0; i < list.length; i++) map[l0 + i] = list[i];
  const lastFill = l0 + list.length - 1;
  const origEndNl = text.length > 0 && text.charAt(text.length - 1) === "\n";
  let changed = false;
  const pieces = [];
  for (let ln = 0; ln < n; ln++) {
    const s = starts[ln];
    const seg = text.slice(s, (ln + 1 < n) ? starts[ln + 1] : text.length);
    if (map[ln] === undefined) { pieces.push(seg); continue; }
    const nl = seg.slice(-1) === "\n" ? "\n" : "";
    const raw = nl ? seg.slice(0, -1) : seg;
    const at = visToChar(raw, c0);
    const pad = c0 - visOfChar(raw, at);
    const next = raw.slice(0, at) + (pad > 0 ? new Array(pad + 1).join(" ") : "") + map[ln] + raw.slice(at);
    if (next !== raw) changed = true;
    pieces.push(next + nl);
  }
  let out = pieces.join("");
  if (lastFill > n - 1) {
    /* 块比文件长：多出来的行按同样的左内边距补在末尾（文件末尾没有换行就先补一个） */
    const add = [];
    for (let ln = n; ln <= lastFill; ln++) {
      add.push((c0 > 0 ? new Array(c0 + 1).join(" ") : "") + map[ln]);
    }
    let body = out;
    if (body.length && body.charAt(body.length - 1) !== "\n") body += "\n";
    body += add.join("\n");
    if (origEndNl) body += "\n";
    out = body;
    changed = true;
  }
  let wMax = 0;
  for (const r of list) wMax = Math.max(wMax, visColsOfLine(r).len);
  return { text: out, rect: { l0: l0, l1: lastFill, c0: c0, c1: c0 + wMax }, changed: changed };
};
/* 列块复制：每行取矩形 [c0, c1] 的片段，**行不够长的补空格补到矩形右边界**，再用换行拼回。
   为什么要补：用户的矩形常常"选到右边的空白"（虚拟空格），而那些位置在本行里没有字符；
   不补的话粘过去空白就丢了（用户实测："我列选了后面的空白区域，但粘贴过去没把空白粘贴上"）。
   补空格的口径与矩形高亮一致（按显示列算，Tab 展开 4 列，汉字 2 列）。 */
const blkCopyRows = (text, starts, rect) => {
  const n = starts ? starts.length : 0;
  if (!n) return "";
  const c0 = Math.max(0, rect.c0 || 0);
  const c1 = Math.max(c0, rect.c1 == null ? c0 : rect.c1);
  const want = c1 - c0;
  const l0 = Math.max(0, rect.l0 || 0);
  const l1 = Math.min(Math.max(rect.l0 || 0, rect.l1 == null ? rect.l0 || 0 : rect.l1), n - 1);
  const rows = [];
  for (let ln = l0; ln <= l1; ln++) {
    const s0 = starts[ln];
    const e0 = (ln + 1 < n) ? starts[ln + 1] - 1 : text.length;
    const line = text.slice(s0, e0);
    const a = visToChar(line, c0);
    const b = Math.max(a, visEndChar(line, c1));
    const seg = line.slice(a, b);
    const w = visOfChar(line, b) - visOfChar(line, a);
    rows.push(w >= want ? seg : seg + new Array(Math.round(want - w) + 1).join(" "));
  }
  return rows.join("\n");
};
/* 矩形左下角（块首行块首列）对应的绝对偏移：写回线性光标用 */
const blkCaretOff = (starts, text, rect) =>
  blkLineRange(starts, text, Math.max(0, Math.min(starts.length - 1, rect.l0)), rect.c0, rect.c0)[0];
/* 列选择的矩形高亮：按【像素矩形】画，不靠给文字加底色。
   为什么必须这样：给文字加底色时，矩形右边缘 = "这段文字实际渲染出来的宽度 + 补的空格"，
   而中日韩字符渲染宽度大于一个等宽列 → 含中文的行右边缘被顶出去，每行参差不齐（用户截图实测）。
   改成矩形后，左右边缘只由（显示列 × 等宽字宽）决定，与这一行有多少字、是中文还是英文无关 → 天然对齐。
   字宽用的是 measureMonoW（与 blkPosFromPoint 同一把尺子），所以右边缘正好落在鼠标那一列。
   零宽矩形（打字后的多光标）画一根细竖条：行尾之后也看得见（旧的"给某个字符加底色"在行尾外画不出来）。 */
const blkRectsHtml = (rects, o) => {
  const cfg = o || {};
  const pw = cfg.pw > 0 ? cfg.pw : 8;
  const rowH = cfg.rowH > 0 ? cfg.rowH : LINE_H;
  const padTop = (cfg.padTop == null) ? ED_PAD_TOP : cfg.padTop;
  const padLeft = (cfg.padLeft == null) ? ED_PAD_LEFT : cfg.padLeft;
  const bg = cfg.bg || HL_BG.selection;
  const zbg = cfg.zeroBg || "rgba(174,175,173,.26)";
  let out = "";
  const list = rects || [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const l0 = Math.max(0, r.c0);
    const l1 = Math.max(l0, r.c1);
    const zero = l1 <= l0;
    const left = padLeft + l0 * pw;
    const w = zero ? Math.max(2, Math.round(pw * 0.16)) : (l1 - l0) * pw;
    out += '<div style="position:absolute;left:' + left + "px;top:" + (padTop + Math.max(0, r.ln) * rowH) +
      "px;width:" + w + "px;height:" + rowH + "px;background:" + (zero ? zbg : bg) + ';pointer-events:none"></div>';
  }
  return out;
};
/* 列模式下的"块光标"：一根会闪的竖条，画在矩形的活动端（右下角）。
   为什么需要：原生 textarea 的光标只能停在真实字符上，拖到行尾之后（右边空白 = 虚拟空格）它就到不了，
   会停在最后一个字符后面（用户实测："光标为什么在列选最后一行最后一个字符后面"）。
   所以列模式时把原生光标设成透明（见 textarea 的 caretColor），用这根竖条表示"当前落点"。 */
const blkCaretHtml = (ln, col, o) => {
  const cfg = o || {};
  const pw = cfg.pw > 0 ? cfg.pw : 8;
  const rowH = cfg.rowH > 0 ? cfg.rowH : LINE_H;
  const padTop = (cfg.padTop == null) ? ED_PAD_TOP : cfg.padTop;
  const padLeft = (cfg.padLeft == null) ? ED_PAD_LEFT : cfg.padLeft;
  const color = cfg.color || "#aeafad";
  return '<div class="carddesk-blkcaret" style="position:absolute;left:' + (padLeft + Math.max(0, col) * pw) +
    "px;top:" + (padTop + Math.max(0, ln) * rowH) + "px;width:2px;height:" + rowH + "px;background:" + color +
    ';pointer-events:none"></div>';
};
const BLK_DIR = {
  arrowleft: [0, -1], arrowright: [0, 1], arrowup: [-1, 0], arrowdown: [1, 0],
  home: [0, -100000], end: [0, 100000]
};
/* 列模式下按键 → 动作计划（纯函数）。返回 null = 不归列模式管，调用方走原逻辑。
   {op:"exit"} 退出列选择；{op:"apply",ins,exit,del} 按行改写；{op:"copy"}/{op:"cut"} 整块复制/剪切。
   pd=true 表示调用方要 preventDefault：可打印字符/退格/复制必须拦，普通方向键不能拦（要放行让光标移动）。 */
const blkKeyPlan = (blk, k, e) => {
  if (!blk) return null;
  if (e.altKey) return null;
  const raw = String(e.key == null ? "" : e.key);
  if (k === "escape") return { op: "exit", pd: true };
  if (e.ctrlKey || e.metaKey) {
    if (k === "c") return { op: "copy", pd: true };
    if (k === "x") return { op: "cut", pd: true };
    return null;                                   // Ctrl+S/Z/F… 照常走原逻辑（块保留）
  }
  if (k === "backspace" || k === "delete") return { op: "apply", ins: "", del: k, pd: true };
  if (k === "enter") return { op: "apply", ins: "\n", exit: true, pd: true };
  if (k === "tab") return e.shiftKey ? { op: "exit", pd: false } : { op: "apply", ins: "    ", pd: true };
  /* 可打印字符必须用原始 e.key（不能用小写化的 k）：Shift+A 要插入 "A"，不能插入 "a" */
  if (raw.length === 1) return { op: "apply", ins: raw, pd: true };
  if (/^(arrow|home|end|page)/.test(k)) return { op: "exit", pd: false };
  return null;
};
/* Ctrl+D：把给定行区间整行复制到下方（Notepad++ 的 Duplicate Current Line）。
   末行没有换行符时先补一个换行再插复制体，否则复制体会和原行粘成一行。返回 { text }。 */
const dupLines = (text, starts, l0, l1) => {
  const n = starts.length;
  const a = Math.max(0, Math.min(l0 | 0, n - 1));
  const b = Math.max(a, Math.min(l1 | 0, n - 1));
  const from = starts[a];
  const to = (b + 1 < n) ? starts[b + 1] : text.length;
  const blk = text.slice(from, to);
  const ins = (blk.slice(-1) === "\n") ? blk : ("\n" + blk);
  return { text: text.slice(0, to) + ins + text.slice(to) };
};
/* 水平滚动条的几何（纯函数，便于离线单测）：给定 textarea 视口宽 / 内容宽 / 当前 scrollLeft / 轨道宽，
   算出滑块的宽与左偏移。vw 最小 24px（太窄抓不住），vx 夹在 [0, W-vw]。 */
const hbarGeom = (clientW, scrollW, scrollLeft, trackW) => {
  const maxScroll = Math.max(0, (scrollW || 0) - (clientW || 0));
  const W = Math.max(1, trackW || 1);
  if (maxScroll <= 0) return { maxScroll: 0, vw: W, vx: 0 };
  const ratio = Math.min(1, (clientW || 0) / Math.max(1, scrollW || 1));
  const vw = Math.max(24, Math.min(W, ratio * W));
  const frac = Math.min(1, Math.max(0, (scrollLeft || 0) / maxScroll));
  const vx = Math.min(W - vw, frac * (W - vw));
  return { maxScroll: maxScroll, vw: vw, vx: vx };
};
/* 横向滚动到最右端时额外留出的空白（px）：让行尾还能再往右看一点，不卡着最后一个字符。
   数值由用户按手感调（48 → 400 → 150）；这段空白靠给三层加 translateX 实现（原生 scrollLeft 到不了）。
   注意：只要用 translateX，代码区容器就必须 overflow:hidden，否则会溢出到行号栏/左侧面板。 */
const HB_MARGIN = 150;
/* 每个文件一份的编辑器视图状态（滚动位置 + 光标选区）：退出工作台再进来（CodePane 会重建）、
   甚至整页刷新，都要回到原来看的地方。localStorage 持久化，内存里做镜像，限量 200 个文件防无限增长。 */
const VIEW_LS_KEY = "card-desk.editor-view-v1";
const viewStore = {
  mem: null,
  all: function () {
    if (this.mem) return this.mem;
    let m = {};
    try { m = JSON.parse(localStorage.getItem(VIEW_LS_KEY) || "{}") || {}; } catch (e) { m = {}; }
    this.mem = m;
    return m;
  },
  keyOf: function (p) { return String(p || "").toLowerCase(); },
  get: function (p) {
    if (!p) return null;
    const v = this.all()[this.keyOf(p)];
    return (v && typeof v === "object") ? v : null;
  },
  save: function (p, v) {
    if (!p || !v) return;
    const m = this.all();
    m[this.keyOf(p)] = v;
    const ks = Object.keys(m);
    if (ks.length > 200) { for (let i = 0; i < ks.length - 200; i++) delete m[ks[i]]; }
    try { localStorage.setItem(VIEW_LS_KEY, JSON.stringify(m)); } catch (e) { }
  }
};
/* 未保存内容的热退出存储（hot exit）：退出工作台 / 刷新页面后，未保存的改动不能丢。
   背景：会话恢复只存「路径 + 布局」，正文是重新从磁盘读的 —— 没 Ctrl+S 就切走，敲的内容会静默消失。
   这里把 dirty 标签的正文单独存一份：只存脏的、总量 2MB / 20 个文件封顶（超限丢最旧），
   用「当前脏集合整体替换」→ 保存成功或关闭文件后自动消失，不留陈旧副本。
   注意：localStorage 按浏览器配置隔离（QQ 浏览器与 DSH.exe 各一份）。 */
const DIRTY_LS_KEY = "card-desk.dirty-buffers-v1";
const DIRTY_MAX_TOTAL = 2 * 1024 * 1024;
const DIRTY_MAX_FILES = 20;
const dirtyStore = {
  mem: null,
  keyOf: function (p) { return String(p || "").toLowerCase(); },
  all: function () {
    if (this.mem) return this.mem;
    let m = {};
    try { m = JSON.parse(localStorage.getItem(DIRTY_LS_KEY) || "{}") || {}; } catch (e) { m = {}; }
    this.mem = m;
    return m;
  },
  get: function (p) {
    if (!p) return null;
    const v = this.all()[this.keyOf(p)];
    return (v && typeof v === "object" && typeof v.text === "string") ? v : null;
  },
  /* 用当前脏集合替换（bounded）：新的优先保留，超限的丢最旧。
     openPaths = 本次真正打开的路径集合：
       · 已经不在打开列表里的旧记录（孤儿）一律保留 —— 会话数据丢失/为空时不会误删用户没保存的东西；
       · 打开着但已保存（不脏）的文件不在 map 里，于是它的记录自然消失，不留陈旧副本。 */
  replaceAll: function (map, openPaths) {
    const src = map || {};
    const open = {};
    for (const p of (openPaths || [])) open[this.keyOf(p)] = true;
    const prev = this.all();
    const merged = Object.assign({}, src);
    for (const k of Object.keys(prev)) {
      if (!src[k] && !open[k]) merged[k] = prev[k];   // 孤儿：保留（宁可多留，也不能丢用户没保存的内容）
    }
    const ks = Object.keys(merged).sort((a, b) => ((merged[b] && merged[b].at) || 0) - ((merged[a] && merged[a].at) || 0));
    const out = {};
    let total = 0, n = 0;
    for (const k of ks) {
      const t = (merged[k] && typeof merged[k].text === "string") ? merged[k].text : "";
      if (!t) continue;
      if (n >= DIRTY_MAX_FILES || total + t.length > DIRTY_MAX_TOTAL) break;
      out[k] = merged[k];
      total += t.length; n++;
    }
    this.mem = out;
    try { localStorage.setItem(DIRTY_LS_KEY, JSON.stringify(out)); } catch (e) { }
    return { files: n, bytes: total };
  },
  drop: function (p) {
    if (!p) return;
    const m = this.all(), k = this.keyOf(p);
    if (!m[k]) return;
    delete m[k];
    try { localStorage.setItem(DIRTY_LS_KEY, JSON.stringify(m)); } catch (e) { }
  }
};
/* 统计非 ASCII 字符：返回 { chars, lines }（lines 为出现非 ASCII 的行号，从 1 开始）。
   「注释编码修复」写盘前先让用户看清要动多少内容 —— Verilog 代码本身是 ASCII，
   所以转码影响的基本就是注释与字符串。 */
const countNonAscii = (text) => {
  const s = String(text == null ? "" : text);
  const arr = s.split("\n");
  const lines = [];
  let chars = 0;
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i].match(/[^\x00-\x7F]/g);
    if (m) { chars += m.length; lines.push(i + 1); }
  }
  return { chars: chars, lines: lines };
};
/* 滑块拖动映射：给定滑块左端在轨道上的 x → 新的 scrollLeft。
   分母是 (轨道宽 - 滑块宽)，因为滑块本身有宽度、左端最多只能走到那里。 */
const hbarScrollFromThumb = (thumbX, trackW, vw, clientW, scrollW) => {
  const maxScroll = Math.max(0, (scrollW || 0) - (clientW || 0));
  const span = Math.max(1, (trackW || 1) - (vw || 0));
  const frac = Math.min(1, Math.max(0, (thumbX || 0) / span));
  return frac * maxScroll;
};
const hbarScrollFromX = (x, trackW, clientW, scrollW) => {
  const maxScroll = Math.max(0, (scrollW || 0) - (clientW || 0));
  const W = Math.max(1, trackW || 1);
  const frac = Math.min(1, Math.max(0, (x || 0) / W));
  return frac * maxScroll;
};
// 词字符判定（整词匹配边界用）：含 $（SystemVerilog 标识符/系统任务前缀），
// 不含 ' （8'hFF 里 ' 是数字基数符，不是标识符字符）。与编辑器选词 [A-Za-z0-9_$'] 近似
// 但少 ' ，避免 $clk 搜 clk（整词）时把 $ 当边界而误报。
const isWordCh = (ch) => /[A-Za-z0-9_$]/.test(ch);
// Notepad++ 扩展(Extended)搜索模式转义：\t \n \r \\ \xHH \uHHHH
const decodeExtended = (s) => {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === "t") { out += "\t"; i++; }
      else if (n === "n") { out += "\n"; i++; }
      else if (n === "r") { out += "\r"; i++; }
      else if (n === "0") { out += "\0"; i++; }          // Notepad++ 扩展模式支持 \0
      else if (n === "a") { out += "\x07"; i++; }
      else if (n === "f") { out += "\f"; i++; }
      else if (n === "v") { out += "\v"; i++; }
      else if (n === "\\") { out += "\\"; i++; }
      else if (n === "x" && i + 3 < s.length && /^[0-9a-fA-F]{2}$/.test(s.slice(i + 2, i + 4))) { out += String.fromCharCode(parseInt(s.slice(i + 2, i + 4), 16)); i += 3; }
      else if (n === "u" && i + 5 < s.length && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) { out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16)); i += 5; }
      else out += c;
    } else out += c;
  }
  return out;
};
// 行起始偏移表：把字符偏移快速换算为 行/列，避免对每个匹配做 split
const lineStartsOf = (s) => {
  const a = [0];
  for (let i = 0; i < s.length; i++) if (s[i] === "\n") a.push(i + 1);
  return a;
};
const lineColAt = (lineStarts, pos) => {
  let lo = 0, hi = lineStarts.length - 1, ans = 0;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (lineStarts[mid] <= pos) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return { line: ans + 1, col: pos - lineStarts[ans] + 1 };
};
/* 灾难性回溯的统一判据（编辑器内查找与跨文件查找共用）。
   `(a+)+` 这类嵌套量词一旦匹配失败会指数级回溯，而且发生在**单次 exec 内部**，
   循环里的计数与时间预算都拦不住（实测 26 个字符就超过 1 秒）。
   返回 null = 通过；否则返回可直接展示给用户的原因。
   跨文件查找（host findInFiles / replaceInFiles）也必须在**下发之前**用它拦一道：
   那里的正则由 host 单线程同步执行，一旦卡住，GUI 与所有会话会一起冻结、只能重启。 */
const regexRiskReason = (q) => {
  const s = String(q == null ? "" : q);
  if (/\([^()]*[+*][^()]*\)\s*[+*]/.test(s)) return "正则含嵌套量词（如 (a+)+），可能造成灾难性回溯，已阻止执行";
  return null;
};
// 计算所有匹配：opts = { cs(区分大小写), whole(整词), search(normal|extended|regex) }；
// range = [start, end] 可选（In selection 限制在选区）。返回 [{start,end,len,line,col,m(正则exec数组或null)}]
const computeMatches = (txt, q, opts, range) => {
  const src = String(txt);
  const out = [];
  if (!q) return out;
  opts = opts || {};
  const cs = !!opts.cs;
  const whole = !!opts.whole;
  const mode = opts.search || "normal";
  const lo = range ? range[0] : 0;
  const hi = range ? range[1] : src.length;
  const bound = Math.max(lo, Math.min(hi, src.length));
  const scan = src.slice(lo, bound);
  if (!scan) return out;
  const ls = lineStartsOf(src);
  const pushHit = (s, e, m) => {
    if (whole) {
      // 整词边界必须按【全文绝对位置】判断：用 scan[s-1] 会在 In-selection 范围边界上
      // 误把范围外紧邻的词字符当成"词首/词尾没有字符"，从而多报匹配。
      const gp = lo + s, gq = lo + e;
      const before = gp > 0 ? src[gp - 1] : "";
      const after = gq < src.length ? src[gq] : "";
      if (isWordCh(before) || isWordCh(after)) return;
    }
    const absS = lo + s;
    const lc = lineColAt(ls, absS);
    out.push({ start: absS, end: lo + e, len: e - s, line: lc.line, col: lc.col, m: m || null });
  };
  if (mode === "regex") {
    // 灾难性回溯防护：`(a+)+` 这类嵌套量词一旦匹配失败会指数级回溯，
    // 且发生在**单次 exec 内部**，循环里的计时/计数都拦不住（实测 26 字符就 1 秒以上）。
    // 因此直接拒绝执行，并把原因挂在返回数组上供 UI 提示。
    const risk = regexRiskReason(q);
    if (risk) {
      out.__error = risk;
      return out;
    }
    let re;
    try { re = new RegExp(q, "g" + (cs ? "" : "i") + "m" + (opts.dotall ? "s" : "")); } catch (e) {
      out.__error = "正则表达式无效：" + ((e && e.message) || "语法错误");
      return out;
    }
    let m;
    const MAX = 20000; // 防超大结果集把主线程占死：超过则停止收集
    const t0 = Date.now();
    const BUDGET = 400; // 单次查找的总时间预算（毫秒），超时即停止收集
    while ((m = re.exec(scan)) !== null && out.length < MAX) {
      if (m[0].length === 0) { re.lastIndex++; continue; } // 防死循环
      pushHit(m.index, m.index + m[0].length, m);
      if ((out.length & 0x3f) === 0 && Date.now() - t0 > BUDGET) { out.__error = "表达式过于复杂，结果已截断"; break; }
    }
  } else {
    const query = mode === "extended" ? decodeExtended(q) : q;
    const qq = cs ? query : query.toLowerCase();
    if (!qq) return out;
    const hay = cs ? scan : scan.toLowerCase();
    let i = 0;
    const MAX = 5000; // 防超大匹配集把主线程/渲染占死：超过则停止收集（高亮层只显示前若干）
    while (i <= scan.length && out.length < MAX) {
      const idx = hay.indexOf(qq, i);
      if (idx < 0) break;
      pushHit(idx, idx + qq.length, null);
      i = idx + Math.max(1, qq.length);
    }
  }
  return out;
};

/* ---------- ⑨ 多 Tab 查找对话框（Notepad++ Ctrl+F 语义） ---------- */
// type 定义（纯 JS 注释性）：find|replace|files|projects|mark
// 布局参照 Notepad++ 8.x「查找」对话框：顶栏 5 Tab；主体 = 左侧动作按钮列 + 右侧输入/勾选列；
// 底部 = 查找模式单选组（普通/扩展/正则表达式 + . 匹配新行）+ 透明度滑条 + 失去焦点后单选。
let lastFindDialogPos = null; // 跨实例共享查找框位置：所有权在面板间转移时不跳回居中
// 全局共享的"查找状态容器"：为全局单一查找框提供跨面板持久化（查找词/设置/历史）。
// 查找框只由"当前查找目标"面板渲染；当目标面板切换（用户点击了另一栏编辑器）时，
// 接替面板从这里读回查找词/设置，实现"查找框全局一个、作用域跟随最后焦点编辑器"。
// 注意：cnt/marked/results/selRange 等与"某个编辑器文本"强绑定的状态不共享，留在各自面板。
const findShared = {
  open: false,
  mode: "find", tab: "find",
  q: "", rep: "", idx: 0,
  cs: false, whole: true, back: false, wrap: true, inSel: false,
  mode2: "normal",
  qHist: [], repHist: [],
  matchNL: false, opacity: 100, loseFocus: true,
  dir: "当前文件夹", filter: "*.*", recurse: true, hidden: false, curDir: true, proj: "p1", markLine: false
};
/* 查找框设置的持久化：findShared 就是「全局一个查找框」的共享容器，
   把查询与勾选项（全词/大小写/正则/反向/换行/失焦/目录/过滤件…）存一份，
   退出工作台或刷新后再打开查找框，还是上次那套设置（不必重填）。 */
const FIND_LS_KEY = "card-desk.find-prefs-v1";
const FIND_PREF_KEYS = ["q", "rep", "cs", "whole", "back", "wrap", "inSel", "mode2", "matchNL", "opacity", "loseFocus", "qHist", "repHist", "dir", "filter", "recurse", "hidden", "curDir", "proj", "markLine"];
const loadFindPrefs = () => {
  try {
    const d = JSON.parse(localStorage.getItem(FIND_LS_KEY) || "null");
    if (d && typeof d === "object") for (const k of FIND_PREF_KEYS) if (d[k] !== undefined) findShared[k] = d[k];
  } catch (e) { }
};
const saveFindPrefs = () => {
  try {
    const o = {};
    for (const k of FIND_PREF_KEYS) o[k] = findShared[k];
    localStorage.setItem(FIND_LS_KEY, JSON.stringify(o));
  } catch (e) { }
};
try { loadFindPrefs(); } catch (e) { }
const FindDialog = (props) => {
  const {
    findMode, setFindMode, findTab, setFindTab,
    findQ, setFindQ, findRep, setFindRep, findIdx, setFindIdx,
    findCS, setFindCS, findWhole, setFindWhole, findBack, setFindBack,
    findWrap, setFindWrap, findInSel, setFindInSel,
    findMode2, setFindMode2,
    findQHist, setFindQHist, findRepHist, setFindRepHist,
    cnt, setCnt,
    findMatches, effFindMatches,
    flex, op
  } = props;
  // 可拖动：始终用 left/top 定位（初始居中），避免 right 吸附 + rect 换算导致跳变
  const [fdPos, setFdPos] = React.useState(() => (lastFindDialogPos || { x: Math.max(0, ((window.innerWidth || 1280) - 580) / 2), y: Math.max(0, ((window.innerHeight || 800) - 440) / 2) }));
  const fdDragRef = React.useRef(null);
  const fdBoxRef = React.useRef(null); // 查找框容器引用（判断失焦透明度用）
  // 透明度启用开关：勾选"透明度"复选框后才可操作框内控件/拖透明条（默认勾选启用）
  const [transOn, setTransOn] = React.useState(true);
  // 对话框焦点状态："失去焦点后"开启时，失焦按透明度百分比变透明
  const [fdFocused, setFdFocused] = React.useState(true);
  // 记录当前查找框位置供下次实例复用（面板间转移所有权时保持位置）
  React.useEffect(() => { lastFindDialogPos = fdPos; }, [fdPos]);
  const onDragStart = (e) => {
    const cont = e.currentTarget.parentElement || e.currentTarget;
    const r = cont.getBoundingClientRect();
    // 以当前实际 left/top 为拖动起点（right 吸附时也能换算成 left）
    fdDragRef.current = { lastX: e.clientX, lastY: e.clientY, cur: { x: r.left, y: r.top }, first: true };
    const move = (ev) => {
      const d = fdDragRef.current;
      if (!d) return;
      if (d.first) { d.first = false; d.lastX = ev.clientX; d.lastY = ev.clientY; return; } // 首帧只更新基准，避免跳
      const nx = Math.max(0, d.cur.x + (ev.clientX - d.lastX));
      const ny = Math.max(0, d.cur.y + (ev.clientY - d.lastY));
      d.cur = { x: nx, y: ny };
      d.lastX = ev.clientX; d.lastY = ev.clientY;
      setFdPos({ x: nx, y: ny });
    };
    const up = () => { fdDragRef.current = null; document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); window.removeEventListener("blur", up); };
    document.addEventListener("mousemove", move);
    window.addEventListener("blur", up);   // 鼠标在窗口外松开时浏览器不派发 mouseup，这里兜底清理
    document.addEventListener("mouseup", up);
    e.preventDefault(); e.stopPropagation();
  };
  const pushHist = (arr, setArr, v) => {
    const cur = [...arr];
    const i = cur.indexOf(v);
    if (i >= 0) cur.splice(i, 1);
    cur.unshift(v);
    setArr(cur.slice(0, 20));
  };
  const C = props.C || { text: "#BBBEBF", dim: "#9d9d9d", accent: "#3994BC", border: "#2A2B2C" };
  const IN = { background: "#2A2B2C", border: "1px solid #3C3C3C", color: "#BBBEBF", borderRadius: 3, padding: "3px 6px", outline: "none", fontSize: 12, fontFamily: "Consolas, 'Courier New', monospace" };
  const LBL = { color: "#9d9d9d", fontSize: 11, whiteSpace: "nowrap" };
  const BTN = { background: "#2A2B2C", color: "#BBBEBF", border: "1px solid #3C3C3C", borderRadius: 3, cursor: "pointer", padding: "3px 6px", fontSize: 11, whiteSpace: "nowrap", textAlign: "center", boxSizing: "border-box" };
  const BTN_ACC = { background: "#3994BC", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", padding: "3px 6px", fontSize: 11, whiteSpace: "nowrap", textAlign: "center", boxSizing: "border-box" };
  // Tab 标题（中文原词，参照 Notepad++）
  const tabs = [
    { id: "find", label: "查找" },
    { id: "replace", label: "替换" },
    { id: "files", label: "在文件中查找" },
    { id: "projects", label: "在工程中查找" },
    { id: "mark", label: "标记" }
  ];
  // 选择当前 tab
  const goTab = (id) => { setFindTab(id); setFindMode(id); };
  // 查找输入框 onKeyDown：Enter=Find Next（含历史），Esc=关闭
  const onFindKey = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); if (findQ) pushHist(findQHist, setFindQHist, findQ); op.findJump(e.shiftKey ? -1 : 1); }
    else if (e.key === "Escape") { e.preventDefault(); op.findClose(); }
  };
  const onRepKey = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); if (findRep) pushHist(findRepHist, setFindRepHist, findRep); op.findReplaceOnce(); }
    else if (e.key === "Escape") { e.preventDefault(); op.findClose(); }
  };
  const onFixKey = (e) => {
    e.stopPropagation();
    if (e.key === "Escape") { e.preventDefault(); op.findClose(); }
  };
  // 复选框样式（Notepad++ 中文文案）
  const chk = (label, val, set, disabled) => React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 3, color: disabled ? "#858889" : "#9d9d9d", fontSize: 11, cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap" } },
    React.createElement("input", { type: "checkbox", checked: val, disabled: !!disabled, onChange: (e) => set(e.target.checked) }), label);
  // 单选按钮样式（Notepad++ 用 ● 单选，非按钮高亮）
  const radio = (group, id, labelTxt, cur, set, disabled) => React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 3, color: disabled ? "#858889" : "#9d9d9d", fontSize: 11, cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap" } },
    React.createElement("input", { type: "radio", name: group, checked: cur === id, disabled: !!disabled, onChange: () => set(id) }), labelTxt);
  // Find what 输入（带历史 datalist）
  const findWhatInput = (inputRef) => React.createElement(React.Fragment, null,
    React.createElement("input", {
      ref: inputRef || op.findInputRef, value: findQ, list: "carddesk-find-hist", spellCheck: false, placeholder: "查找目标",
      onChange: (e) => { setFindQ(e.target.value); setFindIdx(0); setCnt(null); },
      onKeyDown: onFindKey,
      onFocus: () => { op.findFocusRef.current = "find"; },
      style: Object.assign({ flex: 1, minWidth: 140 }, IN)
    }),
    React.createElement("datalist", { id: "carddesk-find-hist" }, (findQHist || []).map((h, i) => React.createElement("option", { key: i, value: h }))));
  const replaceWithInput = (inputRef) => React.createElement(React.Fragment, null,
    React.createElement("input", {
      ref: inputRef || op.repInputRef, value: findRep, list: "carddesk-rep-hist", spellCheck: false, placeholder: "替换为",
      onChange: (e) => { setFindRep(e.target.value); },
      onKeyDown: onRepKey,
      onFocus: () => { op.findFocusRef.current = "replace"; },
      style: Object.assign({ flex: 1, minWidth: 140 }, IN)
    }),
    React.createElement("datalist", { id: "carddesk-rep-hist" }, (findRepHist || []).map((h, i) => React.createElement("option", { key: i, value: h }))));
  // 带中文标签的行输入：<label> 文本 + 输入框（右栏统一用）
  const labeledInput = (labelTxt, inputEl, lbw) => React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4 } },
    React.createElement("span", { style: Object.assign({}, LBL, { width: lbw || 64, textAlign: "right", flexShrink: 0 }) }, labelTxt), inputEl);
  // 透明度分组框：标题"透明度"在左上角边线上（fieldset legend）；框内 失去焦点后/始终 + 底部进度条
  const transparencyRow = React.createElement("fieldset", { style: { border: "1px solid #A8A9AA85", borderRadius: 3, padding: "4px 8px 6px", margin: "0", width: "fit-content", minWidth: 136, maxWidth: "100%", height: "100%", color: "#9d9d9d", fontSize: 11, userSelect: "text", boxSizing: "border-box" } },
    /* legend：☐ 透明度（勾选才启用框内透明度调节） */
    React.createElement("legend", { style: { color: "#9d9d9d", fontSize: 11, padding: "0 4px", userSelect: "text", display: "flex", alignItems: "center", gap: 3, cursor: "pointer" } },
      React.createElement("input", { type: "checkbox", checked: transOn, onChange: (e) => setTransOn(e.target.checked) }),
      "透明度"),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 } },
      chk("失去焦点后", op.findLoseFocus != null ? op.findLoseFocus : false, (v) => op.setFindLoseFocus && op.setFindLoseFocus(v), !transOn),
      radio("fxop", "always", "始终", op.findLoseFocus != null ? (op.findLoseFocus ? "lose" : "always") : "always", (v) => op.setFindLoseFocus && op.setFindLoseFocus(v === "lose"), !transOn),
      /* 进度条宽度用 100%，随分组框内容宽自适应，不再溢出框外 */
      React.createElement("input", { type: "range", min: 0, max: 100, value: op.findOpacity != null ? op.findOpacity : 100, disabled: !transOn, onChange: (e) => op.setFindOpacity && op.setFindOpacity(parseInt(e.target.value, 10)), style: { width: "100%", marginTop: 6, boxSizing: "border-box" } })));
  // 主区域两栏：左=输入/勾选（弹性），右=按钮列（固定宽）；Notepad++ 布局
  const twoCol = (leftEl, rightEl) => React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "flex-start" } },
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 0 } }, leftEl),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, minWidth: 150 } }, rightEl));
  // 两列两行网格：上下两块各自成行；
  // 下半行两个单元格 alignSelf:stretch → 单元格高度 = 行高（两者取高），内部再用 flex 定位，
  // 从而"查找模式"与"透明度"两框的顶边/底边都能严格对齐
  const twoColAligned = (leftTop, rightTop, leftBottom, rightBottom) => React.createElement("div", { style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(150px, auto)", columnGap: 12, rowGap: 5, alignItems: "start" } },
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 } }, leftTop),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5 } }, rightTop),
    /* 下半行左单元格：拉伸到行高，内部列向 flex，内容可贴底对齐 */
    React.createElement("div", { style: { minWidth: 0, alignSelf: "stretch", display: "flex", flexDirection: "column" } }, leftBottom),
    /* 下半行右单元格：拉伸到行高 */
    React.createElement("div", { style: { alignSelf: "stretch", display: "flex", flexDirection: "column" } }, rightBottom));
  // 关闭按钮（各 tab 共用）
  const closeBtn = React.createElement("button", { onClick: op.findClose, style: { background: "transparent", color: "#9d9d9d", border: "none", cursor: "pointer", padding: "1px 6px", fontSize: 13 }, title: "关闭 (Esc)" }, "✕");
  const cancelBtn = React.createElement("button", { onClick: op.findClose, style: Object.assign({}, BTN, { width: "100%" }) }, "取消");

  /* ============ 查找 Tab ============ */
  // 左列：查找目标 + 空两行 + 勾选(反向/全词/大小写/循环) + 查找模式分组框（fieldset，标题在边框线上）
  /* 当次实际生效的查找选项 + 当前文档匹配数：
     "全词匹配勾了到底生效没有"这类疑问不该靠猜 —— 这里直接写出来（全词/Aa/正则/扩展）。 */
  const effFlagText = [
    findWhole ? "全词" : null,
    findCS ? "Aa" : null,
    findMode2 === "regex" ? "正则" : (findMode2 === "extended" ? "扩展" : null)
  ].filter(Boolean).join("·") || "普通（非全词、不分大小写）";
  const effLine = React.createElement("div", {
    style: { fontSize: 11, color: "#858889", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    title: "生成匹配时实际使用的选项（与上面的勾选一致）"
  }, "生效：" + effFlagText + "　匹配 " + findMatches.length + " 个");
  const findLeft = React.createElement(React.Fragment, null,
    labeledInput("查找目标：", findWhatInput(op.findInputRef), 64),
    effLine,
    React.createElement("div", { style: { height: 18 } }), // 查找目标与勾选之间留一行间距
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
      chk("反向查找", findBack, setFindBack),
      chk("全词匹配", findWhole, setFindWhole),
      chk("匹配大小写", findCS, setFindCS),
      chk("循环查找", findWrap, setFindWrap)),
    /* 查找模式分组框：标题"查找模式"跨在边框线上（fieldset legend 样式）；fit-content 防止框拉满整列变宽 */
    React.createElement("fieldset", { style: { border: "1px solid #A8A9AA85", borderRadius: 3, padding: "4px 8px 5px", margin: "10px 0 0", width: "fit-content", minWidth: 168, color: "#9d9d9d", fontSize: 11 } },
      React.createElement("legend", { style: { color: "#9d9d9d", fontSize: 11, padding: "0 4px" } }, "查找模式"),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
        radio("fxmode", "normal", "普通", findMode2, setFindMode2),
        radio("fxmode", "extended", "扩展", findMode2, setFindMode2),
        /* 正则表达式(G) 与 .匹配新行 同一行 */
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
          radio("fxmode", "regex", "正则表达式(G)", findMode2, setFindMode2),
          chk(". 匹配新行", op.findMatchNL || false, (v) => op.setFindMatchNL && op.setFindMatchNL(v), findMode2 !== "regex")))));
  // 右列：按钮（垂直堆叠）
  const findRight = React.createElement(React.Fragment, null,
    React.createElement("div", { style: { display: "flex", gap: 4, width: "100%" } },
      React.createElement("button", { onClick: () => { if (findQ) pushHist(findQHist, setFindQHist, findQ); op.findJump(findBack ? -1 : 1); }, style: Object.assign({}, BTN_ACC, { flex: 1 }), title: "查找下一个 (Enter)" }, "查找下一个"),
      React.createElement("button", { onClick: () => op.findJump(-1), style: Object.assign({}, BTN, { flex: "0 0 26px" }), title: "上一个 (Shift+Enter)" }, "▲"),
      React.createElement("button", { onClick: () => op.findJump(1), style: Object.assign({}, BTN, { flex: "0 0 26px" }), title: "下一个 (Enter)" }, "▼")),
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, width: "100%" } },
      chk("选取范围内", findInSel, setFindInSel),
      React.createElement("button", { onClick: () => { if (findQ) pushHist(findQHist, setFindQHist, findQ); op.doCount(); }, style: Object.assign({}, BTN, { flex: 1 }) }, "计数")),
    React.createElement("button", { onClick: () => { if (findQ) { pushHist(findQHist, setFindQHist, findQ); op.doFindAll(); } }, style: Object.assign({}, BTN, { width: "100%" }) }, "在当前文件中查找"),
    React.createElement("button", { onClick: () => { if (findQ) { pushHist(findQHist, setFindQHist, findQ); op.doFindAllInOpenFiles && op.doFindAllInOpenFiles(); } }, style: Object.assign({}, BTN, { width: "100%" }), title: "在所有已打开的文件中查找" }, "在所有打开的文件中查找"),
    React.createElement("button", { onClick: op.findClose, style: Object.assign({}, BTN, { width: "100%" }) }, "取消"),
    /* 透明度分组框：紧贴"取消"按钮下方（右下角） */
    React.createElement("div", { style: { marginTop: 4 } }, transparencyRow));
  /* 正则风险提示：computeMatches 会拒绝执行嵌套量词（防灾难性回溯卡死主线程），
     但拒绝是静默的 → 这里把它显式告诉用户，否则会出现"输入了正则但一个都不匹配"的困惑。 */
  const regexWarnEl = (findMode2 === "regex" && findQ && /\([^()]*[+*][^()]*\)\s*[+*]/.test(findQ))
    ? React.createElement("div", {
      style: { margin: "4px 8px 0", padding: "5px 8px", background: "rgba(209,154,102,.15)", border: "1px solid rgba(209,154,102,.45)", borderRadius: 4, color: "#d19a66", fontSize: 11, lineHeight: "16px" }
    }, "⚠ 该正则含嵌套量词（如 (a+)+），可能造成灾难性回溯，已跳过执行。请改写表达式。")
    : null;
  const bodyFind = React.createElement(React.Fragment, null, regexWarnEl, twoCol(findLeft, findRight));

  /* ============ 替换 Tab ============ */
  // 左列：查找目标 / 替换为+⇅ 保持不动；其余（空两行、勾选、查找模式分组框）与查找 Tab 布局一致
  const repLeft = React.createElement(React.Fragment, null,
    labeledInput("查找目标：", findWhatInput(op.findInputRef), 64),
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4 } },
      labeledInput("替换为：", replaceWithInput(op.repInputRef), 64),
      React.createElement("button", { onClick: op.swapFR, style: Object.assign({}, BTN, { width: "auto", flex: "0 0 34px", textAlign: "center" }), title: "交换查找/替换内容" }, "⇅")),
    React.createElement("div", { style: { height: 26 } }), // 与查找 Tab 一致：替换为与勾选之间空两行
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
      chk("反向查找", findBack, setFindBack),
      chk("全词匹配", findWhole, setFindWhole),
      chk("匹配大小写", findCS, setFindCS),
      chk("循环查找", findWrap, setFindWrap)),
    /* 查找模式分组框（与查找 Tab 一致，标题跨边框线） */
    React.createElement("fieldset", { style: { border: "1px solid #A8A9AA85", borderRadius: 3, padding: "4px 8px 5px", margin: "10px 0 0", width: "fit-content", minWidth: 168, color: "#9d9d9d", fontSize: 11 } },
      React.createElement("legend", { style: { color: "#9d9d9d", fontSize: 11, padding: "0 4px" } }, "查找模式"),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
        radio("fxmode", "normal", "普通", findMode2, setFindMode2),
        radio("fxmode", "extended", "扩展", findMode2, setFindMode2),
        /* 正则表达式(G) 与 .匹配新行 同一行 */
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
          radio("fxmode", "regex", "正则表达式(G)", findMode2, setFindMode2),
          chk(". 匹配新行", op.findMatchNL || false, (v) => op.setFindMatchNL && op.setFindMatchNL(v), findMode2 !== "regex")))));
  const repRight = React.createElement(React.Fragment, null,
    React.createElement("div", { style: { display: "flex", gap: 4, width: "100%" } },
      React.createElement("button", { onClick: () => { if (findQ) pushHist(findQHist, setFindQHist, findQ); op.findJump(findBack ? -1 : 1); }, style: Object.assign({}, BTN_ACC, { flex: 1 }), title: "查找下一个 (Enter)" }, "查找下一个"),
      React.createElement("button", { onClick: () => op.findJump(-1), style: Object.assign({}, BTN, { flex: "0 0 26px" }), title: "上一个 (Shift+Enter)" }, "▲"),
      React.createElement("button", { onClick: () => op.findJump(1), style: Object.assign({}, BTN, { flex: "0 0 26px" }), title: "下一个 (Enter)" }, "▼")),
    React.createElement("button", { onClick: () => { if (findRep) pushHist(findRepHist, setFindRepHist, findRep); op.findReplaceOnce(); }, style: Object.assign({}, BTN_ACC, { width: "100%" }) }, "替换"),
    React.createElement("button", { onClick: () => { if (findRep) pushHist(findRepHist, setFindRepHist, findRep); op.findReplaceAll(); }, style: Object.assign({}, BTN, { width: "100%" }) }, "全部替换"),
    React.createElement("button", { onClick: () => { if (findQ && findRep && !op.findBusy) { pushHist(findQHist, setFindQHist, findQ); pushHist(findRepHist, setFindRepHist, findRep); op.doReplaceAllOpenFiles && op.doReplaceAllOpenFiles(); } }, style: Object.assign({}, BTN, { width: "100%" }), title: "把所有已打开文件中的匹配替换为「替换为」的内容" }, op.findBusy ? "处理中…" : "替换所有打开文件"),
    React.createElement("button", { onClick: op.findClose, style: Object.assign({}, BTN, { width: "100%" }) }, "取消"),
    /* 透明度分组框：紧贴"取消"按钮下方，与查找 Tab 一致 */
    React.createElement("div", { style: { marginTop: 4 } }, transparencyRow));
  const bodyReplace = React.createElement(React.Fragment, null, regexWarnEl, twoCol(repLeft, repRight));

  /* ============ 文件查找 Tab ============ */
  const filesLeft = React.createElement(React.Fragment, null,
    labeledInput("查找目标：", React.createElement("input", { ref: op.findFixInputRef, value: findQ, list: "carddesk-find-hist", spellCheck: false, onKeyDown: onFixKey, onChange: (e) => { setFindQ(e.target.value); setFindIdx(0); }, style: Object.assign({ flex: 1, minWidth: 140 }, IN) }), 64),
    labeledInput("替换为：", React.createElement("input", { value: findRep, list: "carddesk-rep-hist", spellCheck: false, onKeyDown: onFixKey, onChange: (e) => setFindRep(e.target.value), style: Object.assign({ flex: 1, minWidth: 140 }, IN) }), 64),
    labeledInput("文件类型：", React.createElement("input", { value: op.findFilter != null ? op.findFilter : "*.*", spellCheck: false, onKeyDown: onFixKey, onChange: (e) => op.setFindFilter && op.setFindFilter(e.target.value), style: Object.assign({ flex: 1, minWidth: 140 }, IN) }), 64),
    /* 目录：勾选"当前文件夹"时显示当前文件夹路径（只读）；未勾选时可编辑 + 右侧"..."按钮弹资源管理器选择 */
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4 } },
      React.createElement("span", { style: Object.assign({}, LBL, { width: 64, textAlign: "right", flexShrink: 0 }) }, "目录："),
      React.createElement("input", {
        value: (op.findCurDir !== false) ? (op.findCurDirPath || "") : (op.findDir != null ? op.findDir : ""),
        readOnly: op.findCurDir !== false,
        spellCheck: false, onKeyDown: onFixKey,
        placeholder: (op.findCurDir !== false) ? "（当前文件夹）" : "点右侧 ... 选择文件夹",
        onChange: (e) => { if (op.findCurDir !== false) return; op.setFindDir && op.setFindDir(e.target.value); },
        style: Object.assign({}, IN, { flex: 1, minWidth: 140 }, (op.findCurDir !== false) ? { color: "#8a8a8a" } : null)
      }),
      (op.findCurDir !== false) ? null : React.createElement("button", {
        onClick: () => op.pickFindDir && op.pickFindDir(),
        style: Object.assign({}, BTN, { width: "auto", flex: "0 0 30px", textAlign: "center", padding: "3px 0" }),
        title: "浏览文件夹…"
      }, "...")),
    /* 全词匹配 / 匹配大小写 放在"目录"下面（与查找 Tab 的勾选风格一致） */
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
      chk("全词匹配", findWhole, setFindWhole),
      chk("匹配大小写", findCS, setFindCS)),
    /* 查找模式分组框（与查找/替换 Tab 一致） */
    React.createElement("fieldset", { style: { border: "1px solid #A8A9AA85", borderRadius: 3, padding: "4px 8px 5px", margin: "10px 0 0", width: "fit-content", minWidth: 168, color: "#9d9d9d", fontSize: 11 } },
      React.createElement("legend", { style: { color: "#9d9d9d", fontSize: 11, padding: "0 4px" } }, "查找模式"),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
        radio("fxmode", "normal", "普通", findMode2, setFindMode2),
        radio("fxmode", "extended", "扩展", findMode2, setFindMode2),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
          radio("fxmode", "regex", "正则表达式(G)", findMode2, setFindMode2),
          chk(". 匹配新行", op.findMatchNL || false, (v) => op.setFindMatchNL && op.setFindMatchNL(v), findMode2 !== "regex")))));
  const filesRight = React.createElement(React.Fragment, null,
    React.createElement("button", { onClick: () => { if (findQ && !op.findBusy) { pushHist(findQHist, setFindQHist, findQ); op.doFindAllInFiles(false); } }, style: Object.assign({}, BTN_ACC, { width: "100%" }) }, op.findBusy ? "查找中…" : "全部查找"),
    React.createElement("button", { onClick: () => { if (findQ && findRep && !op.findBusy) { pushHist(findQHist, setFindQHist, findQ); pushHist(findRepHist, setFindRepHist, findRep); op.doFindAllInFiles(true); } }, style: Object.assign({}, BTN, { width: "100%" }), title: "在「目录」范围内把所有匹配替换为「替换为」的内容（写盘）" }, op.findBusy ? "处理中…" : "在文件中替换"),
    cancelBtn,
    /* 当前文件夹 / 包含子目录 / 包含隐藏目录 放在"取消"按钮下面（均可勾选、真实生效） */
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3, marginTop: 4 } },
      chk("当前文件夹", op.findCurDir != null ? op.findCurDir : true, (v) => op.setFindCurDir && op.setFindCurDir(v)),
      chk("包含子目录", op.findRecurse != null ? op.findRecurse : true, (v) => op.setFindRecurse && op.setFindRecurse(v)),
      chk("包含隐藏目录", op.findHidden === true, (v) => op.setFindHidden && op.setFindHidden(v))),
    /* 透明度分组框（与查找/替换 Tab 一致，右下角） */
    React.createElement("div", { style: { marginTop: 4 } }, transparencyRow));
  const bodyFiles = twoCol(filesLeft, filesRight);

  /* ============ 在工程中查找 Tab（Notepad++ Find in Projects）============ */
  // 上半：查找目标 / 替换为 / 文件类型 /（空一行）/ 全词匹配 / 匹配大小写
  const projLeftTop = React.createElement(React.Fragment, null,
    labeledInput("查找目标：", React.createElement("input", { ref: op.findFixInputRef, value: findQ, list: "carddesk-find-hist", spellCheck: false, onKeyDown: onFixKey, onChange: (e) => { setFindQ(e.target.value); setFindIdx(0); }, style: Object.assign({ flex: 1, minWidth: 140 }, IN) }), 64),
    labeledInput("替换为：", React.createElement("input", { value: findRep, list: "carddesk-rep-hist", spellCheck: false, onKeyDown: onFixKey, onChange: (e) => setFindRep(e.target.value), style: Object.assign({ flex: 1, minWidth: 140 }, IN) }), 64),
    labeledInput("文件类型：", React.createElement("input", { value: op.findFilter != null ? op.findFilter : "*.*", spellCheck: false, onKeyDown: onFixKey, onChange: (e) => op.setFindFilter && op.setFindFilter(e.target.value), style: Object.assign({ flex: 1, minWidth: 140 }, IN) }), 64),
    React.createElement("div", { style: { height: 22 } }), // (a) 文件类型与全词匹配之间空一行
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
      chk("全词匹配", findWhole, setFindWhole),
      chk("匹配大小写", findCS, setFindCS)));
  // 下半：查找模式分组框（与右列透明度同处一行 → 顶边持平）
  const projLeftBottom = React.createElement("fieldset", { style: { border: "1px solid #A8A9AA85", borderRadius: 3, padding: "4px 8px 5px", margin: "0", width: "fit-content", minWidth: 168, height: "100%", color: "#9d9d9d", fontSize: 11, boxSizing: "border-box" } },
    React.createElement("legend", { style: { color: "#9d9d9d", fontSize: 11, padding: "0 4px" } }, "查找模式"),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
      radio("fxmode", "normal", "普通", findMode2, setFindMode2),
      radio("fxmode", "extended", "扩展", findMode2, setFindMode2),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
        radio("fxmode", "regex", "正则表达式(G)", findMode2, setFindMode2),
        chk(". 匹配新行", op.findMatchNL || false, (v) => op.setFindMatchNL && op.setFindMatchNL(v), findMode2 !== "regex"))));
  // 工程面板复选框：标签动态（工程面板N (文件夹名)），过长时省略号截断，悬停显示全名与路径
  const projPanelChk = (idx) => {
    const full = op.projPanelLabel ? op.projPanelLabel(idx) : ("工程面板" + (idx + 1));
    const f = (op.folders || [])[idx];
    const disabled = !f;
    const checked = [op.findPanel1, op.findPanel2, op.findPanel3][idx];
    const setter = [op.setFindPanel1, op.setFindPanel2, op.setFindPanel3][idx];
    return React.createElement("label", {
      style: { display: "flex", alignItems: "center", gap: 3, color: disabled ? "#858889" : "#9d9d9d", fontSize: 11, cursor: disabled ? "default" : "pointer", minWidth: 0 },
      title: f ? (full + "\n" + (f.path || "")) : (full + "（无对应工作区文件夹）")
    },
      React.createElement("input", { type: "checkbox", checked: checked, disabled: disabled, onChange: (e) => setter && setter(e.target.checked) }),
      React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 } }, full));
  };
  // 右列上半：按钮 + 取消 + 工程面板 1/2/3
  const projRightTop = React.createElement(React.Fragment, null,
    React.createElement("button", { onClick: () => { if (findQ && !op.findBusy) { pushHist(findQHist, setFindQHist, findQ); op.doFindInProjects && op.doFindInProjects(false); } }, style: Object.assign({}, BTN_ACC, { width: "100%" }) }, op.findBusy ? "处理中…" : "全部查找"),
    React.createElement("button", { onClick: () => { if (findQ && !op.findBusy) { pushHist(findQHist, setFindQHist, findQ); op.doFindInProjects && op.doFindInProjects(true); } }, style: Object.assign({}, BTN, { width: "100%" }), title: "在勾选的工程面板中替换全部匹配" }, "在工程中替换"),
    cancelBtn,
    /* 工程面板 1/2/3（多选复选框；映射=工作区第 1/2/3 个文件夹，标签动态显示真实文件夹名）——放在"取消"下面 */
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3, marginTop: 4 } },
      projPanelChk(0), projPanelChk(1), projPanelChk(2)));
  // 右列下半：透明度分组框（与左列查找模式同处一行 → 顶边持平）
  const projRightBottom = transparencyRow;
  const bodyProjects = twoColAligned(projLeftTop, projRightTop, projLeftBottom, projRightBottom);

  /* ============ 标记 Tab ============ */
  // 左列上半：查找目标 + 6 个复选框（顺序按 Notepad++ 中文版：标记所在行(M)/清除上次标记/反向查找/全词匹配(W)/匹配大小写(C)/循环查找(P)）
  const markLeftTop = React.createElement(React.Fragment, null,
    labeledInput("查找目标：", React.createElement("input", { ref: op.findFixInputRef, value: findQ, list: "carddesk-find-hist", spellCheck: false, onKeyDown: onFixKey, onChange: (e) => { setFindQ(e.target.value); setFindIdx(0); setCnt(null); }, style: Object.assign({ flex: 1, minWidth: 140 }, IN) }), 64),
    React.createElement("div", { style: { height: 22 } }), // 勾选区从"标记所在行"开始整体下移一行
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
      chk("标记所在行(M)", op.findMarkLine || false, (v) => op.setFindMarkLine && op.setFindMarkLine(v)),
      /* "清除上次标记"按豆包描述置于左列复选框：勾选即执行一次清除动作（动作语义，执行后立刻回到未勾选） */
      React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 3, color: "#9d9d9d", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }, title: "清除上一次的全部标记（勾选即执行）" },
        React.createElement("input", {
          type: "checkbox", checked: false,
          onChange: () => { op.doMarkClearLast && op.doMarkClearLast(); }
        }), "清除上次标记"),
      chk("反向查找", findBack, setFindBack),
      chk("全词匹配(W)", findWhole, setFindWhole),
      chk("匹配大小写(C)", findCS, setFindCS),
      chk("循环查找(P)", findWrap, setFindWrap)));
  // 左列下半：查找模式分组框（比勾选区再低一行；底部与右列透明度框底部持平）
  const markLeftBottom = React.createElement("div", { style: { marginTop: "auto", display: "flex", flexDirection: "column" } },
    React.createElement("div", { style: { height: 22 } }), // 查找模式框再下移一行
    React.createElement("fieldset", { style: { border: "1px solid #A8A9AA85", borderRadius: 3, padding: "4px 8px 5px", margin: "0", width: "fit-content", minWidth: 168, color: "#9d9d9d", fontSize: 11, boxSizing: "border-box" } },
      React.createElement("legend", { style: { color: "#9d9d9d", fontSize: 11, padding: "0 4px" } }, "查找模式"),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
        radio("fxmode", "normal", "普通", findMode2, setFindMode2),
        radio("fxmode", "extended", "扩展", findMode2, setFindMode2),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
          radio("fxmode", "regex", "正则表达式(G)", findMode2, setFindMode2),
          chk(". 匹配新行", op.findMatchNL || false, (v) => op.setFindMatchNL && op.setFindMatchNL(v), findMode2 !== "regex")))));
  // 右列上半：按钮（全部标记/清除/复制标记文本/取消）+ 选取范围内 + 计数
  const markRightTop = React.createElement(React.Fragment, null,
    React.createElement("button", { onClick: op.doMarkAll, style: Object.assign({}, BTN_ACC, { width: "100%" }) }, "全部标记"),
    React.createElement("button", { onClick: op.doMarkClear, style: Object.assign({}, BTN, { width: "100%" }) }, "清除"),
    React.createElement("button", { onClick: () => op.doMarkCopyText && op.doMarkCopyText(), style: Object.assign({}, BTN, { width: "100%" }), title: "复制标记文本" }, "复制标记文本"),
    cancelBtn,
    /* 选取范围内 + 计数（与"查找"Tab 一致，放在按钮下面） */
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, width: "100%", marginTop: 4 } },
      chk("选取范围内(I)", findInSel, setFindInSel),
      React.createElement("button", { onClick: () => { if (findQ) op.doCount(); }, style: Object.assign({}, BTN, { flex: 1 }) }, "计数")));
  // 右列下半：透明度分组框（贴底 → 与左列查找模式框底部持平）
  const markRightBottom = React.createElement("div", { style: { marginTop: "auto", display: "flex", flexDirection: "column" } }, transparencyRow);
  const bodyMark = twoColAligned(markLeftTop, markRightTop, markLeftBottom, markRightBottom);

  const body = findTab === "replace" ? bodyReplace : (findTab === "files") ? bodyFiles : (findTab === "projects") ? bodyProjects : findTab === "mark" ? bodyMark : bodyFind;
  const opVal = op.findOpacity != null ? op.findOpacity : 100;
  // 透明度生效逻辑：未启用 transOn → 不透明(1)；"始终" → 按透明度；"失去焦点后" → 聚焦不透明/失焦按透明度
  const effOpacity = (!transOn) ? 1 : (op.findLoseFocus ? (fdFocused ? 1 : (opVal / 100)) : (opVal / 100));
  // "失去焦点后"透明度：监听 document 点击，若点在本查找框外则视为失焦（避免用 tabIndex 抢编辑器焦点）
  React.useEffect(() => {
    const onDocDown = (e) => {
      const cont = fdBoxRef.current;
      if (cont && cont.contains(e.target)) { setFdFocused(true); }
      else setFdFocused(false);
    };
    document.addEventListener("mousedown", onDocDown, true);
    return () => document.removeEventListener("mousedown", onDocDown, true);
  }, []);
  return React.createElement("div", { ref: fdBoxRef, style: { position: "fixed", top: fdPos.y, left: fdPos.x, zIndex: 9999, background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,.5)", padding: 0, display: "flex", flexDirection: "column", fontSize: 12, width: 640, opacity: effOpacity, outline: "none" } },
    /* 拖动把手标题栏（按住拖动；⌖ 复位到居中；✕ 关闭） */
    React.createElement("div", { onMouseDown: onDragStart, style: { cursor: "move", display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", background: "#333", borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottom: "1px solid #2A2B2C", userSelect: "none" } },
      React.createElement("span", { style: { fontSize: 12, color: "#9d9d9d" } }, "⠿"),
      React.createElement("span", { style: { fontWeight: 600, color: "#BBBEBF", fontSize: 12 } }, (tabs.find((t) => t.id === findTab) || tabs[0]).label),
      React.createElement("button", { onClick: () => setFdPos({ x: Math.max(0, ((window.innerWidth || 1280) - 580) / 2), y: Math.max(0, ((window.innerHeight || 800) - 440) / 2) }), title: "复位到居中", style: { background: "transparent", color: "#858889", border: "none", cursor: "pointer", padding: "1px 4px", fontSize: 11, marginLeft: "auto" } }, "⌖"),
      closeBtn),
    /* Tab 行 */
    React.createElement("div", { style: { display: "flex", gap: 2, padding: "4px 8px 3px", borderBottom: "1px solid #2A2B2C", background: "#191A1B" } },
      tabs.map((t) => React.createElement("button", {
        key: t.id, onClick: () => goTab(t.id),
        style: { background: findTab === t.id ? "#3994BC" : "transparent", color: findTab === t.id ? "#fff" : "#9d9d9d", border: "none", borderRadius: 3, cursor: "pointer", padding: "3px 7px", fontSize: 11 }
      }, t.label))),
    React.createElement("div", { style: { padding: 8, display: "flex", flexDirection: "column", gap: 6 } },
      body,
      /* 底部一行：左=查找模式，右=透明度分组框（查找/替换/在文件中查找/在工程中查找/标记 都已在两列内各自有 → 此处不再显示） */
      null,
      /* 左下角计数行：始终占位（保持对话框高度）；计数结果优先显示，其次显示按目录/工程查找提示 */
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#3994BC", borderTop: "1px solid #333", paddingTop: 4, minHeight: 20 } },
        cnt != null ? React.createElement(React.Fragment, null,
          React.createElement("span", { style: { fontWeight: 600, color: "#9d9d9d" } }, "计数:"),
          React.createElement("span", null, cnt + " 个匹配")
        )
          : op.findMsg ? React.createElement("span", { style: { color: "#3994BC" } }, op.findMsg)
            : React.createElement("span", { style: { visibility: "hidden" } }, "\u00A0"))));
};

/* ---------- ⑨ 底部停靠 Search results 面板（绝对定位编辑区下方，可关闭/清空，双击跳转，高度可拖拽调整） ---------- */
const SearchResultsPanel = (props) => {
  const { results, findQ, op, findCS, findWhole, findMode2 } = props;
  const rows = results || [];
  const onDbl = (r) => { if (op.jumpToResult) op.jumpToResult(r); };
  /* 结果列表的"生成时选项"快照（由 CodePane 的 tagResults 挂在数组上）。
     目的：把"全词匹配到底生效没有"变成看得见的信息，而不是靠猜。 */
  const flagOf = (cs, whole, mode) => [cs ? "Aa" : null, whole ? "全词" : null,
    mode === "regex" ? "正则" : (mode === "extended" ? "扩展" : null)].filter(Boolean).join("·") || "普通";
  const resMeta = (rows && rows.__meta) ? rows.__meta : null;
  const resFlags = resMeta ? flagOf(resMeta.cs, resMeta.whole, resMeta.mode) : "";
  const curFlags = (findCS === undefined && findWhole === undefined && findMode2 === undefined)
    ? null : flagOf(findCS, findWhole, findMode2);
  const staleHint = !!(resMeta && curFlags !== null && resFlags !== curFlags);
  // 面板高度可上下拖拽调整
  const [h, setH] = React.useState(190);
  const onResizeStart = (e) => {
    const h0 = h;
    const y0 = e.clientY;
    const move = (ev) => {
      // 往上拖（ev.clientY 减小）→ 高度增大；下限 64，上限 600（防超出视口）
      const nh = Math.max(64, Math.min(600, h0 + (y0 - ev.clientY)));
      setH(nh);
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); window.removeEventListener("blur", up); };
    document.addEventListener("mousemove", move);
    window.addEventListener("blur", up);   // 鼠标在窗口外松开时浏览器不派发 mouseup，这里兜底清理
    document.addEventListener("mouseup", up);
    e.preventDefault(); e.stopPropagation();
  };
  return React.createElement("div", { style: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 30, background: "#202122", borderTop: "1px solid #2A2B2C", display: "flex", flexDirection: "column", minHeight: 0, height: h } },
    /* 顶部拖拽把手条（上下拖动调整面板高度） */
    React.createElement("div", { onMouseDown: onResizeStart, style: { height: 4, cursor: "row-resize", background: "transparent", flexShrink: 0, borderTop: "1px solid #2a2a2a" }, title: "拖动调整高度" }),
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "3px 8px", borderBottom: "1px solid #2A2B2C", background: "#191A1B", flexShrink: 0 } },
      React.createElement("span", { style: { color: "#9d9d9d", fontSize: 11, fontWeight: 600 } }, "找到 " + rows.length + " 个匹配"),
      /* 这份列表生成时实际生效的选项（全词/Aa/正则）——"勾了却没生效"这类疑问一眼可辨 */
      (resMeta && resFlags) ? React.createElement("span", {
        style: { fontSize: 10, color: "#4DAAFC", border: "1px solid #2d4a60", borderRadius: 3, padding: "0 4px", flexShrink: 0 },
        title: "生成这份结果时生效的查找选项"
      }, resFlags) : null,
      staleHint ? React.createElement("span", {
        style: { fontSize: 10, color: "#d19a66", flexShrink: 0 },
        title: "当前查找设置已与生成结果时不同；点「在当前文件中查找」/「在文件中查找」重跑即可"
      }, "设置已改") : null,
      React.createElement("span", { style: { fontSize: 11, color: "#858889", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, findQ ? ("\"" + findQ + "\"") : ""),
      React.createElement("button", { onClick: () => op.setResults && op.setResults([]), style: { background: "#2A2B2C", color: "#BBBEBF", border: "1px solid #3C3C3C", borderRadius: 3, cursor: "pointer", padding: "1px 6px", fontSize: 10 } }, "清空"),
      React.createElement("button", { onClick: () => op.setResOpen && op.setResOpen(false), style: { background: "transparent", color: "#9d9d9d", border: "none", cursor: "pointer", padding: "1px 6px", fontSize: 12 }, title: "关闭面板" }, "✕")),
    React.createElement("div", { style: { overflowY: "auto", flex: 1, userSelect: "text", padding: "2px 0" } },
      rows.length === 0
        ? React.createElement("div", { style: { padding: "6px 10px", color: "#858889", fontSize: 11 } }, "无匹配结果")
        : rows.map((r, i) => React.createElement("div", {
            key: i, onDoubleClick: () => onDbl(r), title: "双击跳转到此处",
            style: { display: "flex", gap: 6, padding: "1px 8px", cursor: "pointer", fontSize: 11, color: "#BBBEBF", alignItems: "baseline", borderBottom: "1px solid #2a2a2a" },
            onMouseEnter: (e) => { e.currentTarget.style.background = "#1E1F20"; },
            onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
          },
            /* 所属文件（跨文件查找时 r.path 已存在却从不显示，用户看不出结果属于哪个文件） */
            r.path ? React.createElement("span", {
              style: { color: "#8a8a8a", flexShrink: 0, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
              title: r.path
            }, String(r.path).split(/[\\/]/).pop()) : null,
            React.createElement("span", { style: { color: "#4DAAFC", flexShrink: 0, width: 62, textAlign: "right" } }, "行 " + r.line + ":"),
            React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "pre", tabSize: 4, fontFamily: "Consolas, 'Courier New', monospace", color: "#BBBEBF" } }, r._line || "")))));
};

    const CodePane = (props) => {
      const taRef = React.useRef(null);
      const preRef = React.useRef(null);
      const matchRef = React.useRef(null);
      const gutterRef = React.useRef(null);
      const mmRef = React.useRef(null); // minimap 底图
      const mmViewRef = React.useRef(null); // minimap 视口层
      const mmWrapRef = React.useRef(null);
      const sbRef = React.useRef(null); // 自绘滚动条 canvas（右侧，含匹配词黄色标记）
      const hbRef = React.useRef(null); // 自绘【横向】滚动条 canvas（底部；原生滚动条被全局 CSS 隐藏）
      const hxRef = React.useRef(0);     // 横向总偏移（含超出原生范围的余量）
      const hxNativeRef = React.useRef(-1); // 最近一次由代码设置的原生 scrollLeft（用于区分“自己滚的”与“用户滚的”）
      const hbDragRef = React.useRef(false);
      const sbDragRef = React.useRef(null); // 滚动条拖动状态
      // 受控 textarea 光标保护：程序改文本（Tab 缩进/替换）或受控更新后，浏览器可能把光标丢到文末 → 存下期望选区，渲染后恢复
      const saveSelRef = React.useRef(null);
      // 双击选词无闪烁：跟踪两次点击（时间+位移），第二次按下/抬起时拦截浏览器默认词选，由 onDoubleClick 手动精确选词
      const dblState = React.useRef({ t: 0, x: 0, y: 0 });
      // ㉙ 跳转后短暂高亮目标行（所有 jump 共用；3s 后自动淡出）
      const hlTimerRef = React.useRef(null);
      const [autoHl, setAutoHl] = React.useState(0);
      const text = String(props.text || "");
      const lines = text.split("\n").length;
      // 字号来自 props（Ctrl+滚轮可调）→ 同步模块级 LINE_H，供 minimap / 滚动条 / 跳转计算使用
      const fontSz = Math.max(8, Math.min(40, parseInt(props.font, 10) || EDITOR_FONT_DEFAULT));
      LINE_H = Math.max(10, Math.round(fontSz * 1.5));
      const mono = { fontFamily: "Consolas, monospace", fontSize: fontSz, lineHeight: LINE_H + "px" };
      // Ctrl+滚轮缩放编辑器字号（VSCode 的 editor.mouseWheelZoom 行为；需 passive:false 才能阻止浏览器缩放）
      const zoomRootRef = React.useRef(null);
      React.useEffect(() => {
        const el = zoomRootRef.current;
        if (!el || typeof props.onFontZoom !== "function") return;
        const onWheel = (ev) => {
          if (!ev.ctrlKey && !ev.metaKey) return;
          ev.preventDefault();
          ev.stopPropagation();
          props.onFontZoom(ev.deltaY > 0 ? -1 : 1);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
      }, [props.onFontZoom]);

      /* ---------- ⑨ 多 Tab 查找 / 替换 / 标记 + 底部结果面板 ---------- */
      // 对话框 Tab（Notepad++ Ctrl+F 语义）：find | replace | files | projects | mark
      const [findMode, setFindMode] = React.useState(null); // null = 对话框关闭 | 'find' | 'replace' | 'files' | 'projects' | 'mark'
      const [findTab, setFindTab] = React.useState("find");
      const [findQ, setFindQ] = React.useState("");
      const [findRep, setFindRep] = React.useState("");
      const [findIdx, setFindIdx] = React.useState(0);
      // 是否已通过 findJump 真正定位过一次（用于修复"首次 Find Next 跳过第一个匹配"：
      // findIdx 初始为 0，但语义上尚未定位，必须先落点到 arr[0] 再前进）
      const findJumpedRef = React.useRef(false);
      // 查找词一变，新一轮查找会话开始 → 复位"已定位"标记，让下次 Find Next 先落到第一个匹配
      React.useEffect(() => { findJumpedRef.current = false; }, [findQ]);
      const [findCS, setFindCS] = React.useState(false);   // Match case
      const [findWhole, setFindWhole] = React.useState(true); // Match whole word（默认勾选）
      const [findBack, setFindBack] = React.useState(false);   // Backward / 向上方向
      const [findWrap, setFindWrap] = React.useState(true);    // Wrap around
      const [findInSel, setFindInSel] = React.useState(false); // In selection
      const [findMode2, setFindMode2] = React.useState("normal"); // Search Mode: normal | extended | regex
      const [findQHist, setFindQHist] = React.useState([]);  // Find what 历史
      const [findRepHist, setFindRepHist] = React.useState([]); // Replace with 历史
      const [findMatchNL, setFindMatchNL] = React.useState(false); // 正则：. 匹配新行
      const [findOpacity, setFindOpacity] = React.useState(100); // 对话框透明度（0-100）
      const [findLoseFocus, setFindLoseFocus] = React.useState(true); // 失去焦点后透明（true=lose, false=always）默认勾上
      const [findDir, setFindDir] = React.useState("当前文件夹"); // 文件查找目录
      const [findFilter, setFindFilter] = React.useState("*.*"); // 文件类型过滤器
      const [findRecurse, setFindRecurse] = React.useState(true); // 包含子目录
      const [findProj, setFindProj] = React.useState("p1"); // 工程面板
      const [findMarkLine, setFindMarkLine] = React.useState(false); // 标记所在行
      const [findHidden, setFindHidden] = React.useState(false); // 包含隐藏目录（按目录查找用）
      const [findCurDir, setFindCurDir] = React.useState(true); // 当前文件夹（勾选=用当前文件所在目录，忽略"目录"输入）
      const [findBusy, setFindBusy] = React.useState(false); // 按目录查找进行中
      // 工程面板 1/2/3（可多选；映射=工作区里的第 1/2/3 个文件夹）——对应 Notepad++ Find in Projects
      const [findPanel1, setFindPanel1] = React.useState(true);
      const [findPanel2, setFindPanel2] = React.useState(false);
      const [findPanel3, setFindPanel3] = React.useState(false);
      // 是否在工程中查找时执行替换（"在工程中替换"按钮置为 true）
      const [projDoReplace, setProjDoReplace] = React.useState(false);
      const [findMsg, setFindMsg] = React.useState(""); // 按目录查找的提示信息（结果显示在对话框底部计数行）
      const [cnt, setCnt] = React.useState(null); // Count 结果（null=未统计）
      const [marked, setMarked] = React.useState([]); // Mark All 高亮位置（作用于编辑器高亮层）
      const [selRange, setSelRange] = React.useState(null); // 当前 textarea 选区 [start,end]（用于选区高亮显示，选区可跨查找框不消失）
      const [results, setResults] = React.useState([]); // 底部结果面板：{path,line,col,text}
      const [resOpen, setResOpen] = React.useState(false); // 结果面板开关
      const [resultsScope, setResultsScope] = React.useState(true); // 结果面板 scope：true=当前文档 | false=工作区已打开文件
      // 查找/替换输入引用：Find what 与 Replace with 各一，按 Tab 切换 focus
      const findInputRef = React.useRef(null);
      const repInputRef = React.useRef(null);
      const findFixInputRef = React.useRef(null); // 文件查找/工程查找/标记 共用顶层输入顶栏引用
      // Compact: 结果面板行高度（底部面板列表框格用）
      const findSelRangeRef = React.useRef(null);
      // 当前焦点输入类型（决定 Enter 走 Find Next 还是 Replace）
      const findFocusRef = React.useRef("find");
      // ⑬ Ctrl+D 选词：selW = 当前选词，selWStarts = 全文匹配位置
      const [selW, setSelW] = React.useState("");
      /* 列（矩形）选择状态：null = 未启用；a = 锚点、h = 活动端（行列均 0-based）。
         blkRef 供事件回调与键盘处理器读最新值（state 在同一拍里可能还没提交）。 */
      const [blk, setBlk] = React.useState(null);
      const blkRef = React.useRef(null);
      React.useEffect(() => { blkRef.current = blk; }, [blk]);
      /* 列模式（F8 开关）：打开后不必按 Alt，普通拖拽就是矩形选择。
         存在的理由：Electron 客户端的默认应用菜单由 Alt 激活，并会吃掉紧随其后的第一次点击与 Esc，
         于是 Alt 系手势在客户端里不可靠（用户实测两种 Alt 手势都被吃掉）。列模式全程不碰 Alt，
         从根上避开这个宿主冲突；键位仍是 Notepad++ 那套（Alt+拖拽 / Alt+Shift+方向键）。 */
      const [colMode, setColMode] = React.useState(false);
      const colModeRef = React.useRef(false);
      /* 工作台级 F8 → 只由「当前查找目标」这一份面板消费（与 undoKeyReq 同一套路由，避免分栏各切一次） */
      const lastColModeReqRef = React.useRef(0);
      React.useEffect(() => {
        const r = props.colModeReq;
        if (!r || !r.n || r.n === lastColModeReqRef.current) return;
        if (!props.isFindTarget) return;
        lastColModeReqRef.current = r.n;
        const nx = !colModeRef.current;
        colModeRef.current = nx;
        setColMode(nx);
        setBlk(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [props.colModeReq, props.isFindTarget]);
      // ⑮ minimap 选项：字符渲染（类 VSCode 呈现字符）/ 滑块(视口框)；右键菜单弹出位置
      const [mmChar, setMmChar] = React.useState(true);
      const [mmSlider, setMmSlider] = React.useState("hover"); // "hover" | "always"
      const [mmHover, setMmHover] = React.useState(false); // minimap 鼠标悬停（hover 模式显示滑块）
      const [mmMouseY, setMmMouseY] = React.useState(null); // minimap 内鼠标 y（悬停指示器）
      /* 缩略图开关持久化（分栏级，后开的面板以最后一次为准）：
         原始 setter 改名 + 同名包装 → 既有调用点一行都不用改。 */
      const MM_KEY = "card-desk.minimap";
      const [mmShow, setMmShowRaw] = React.useState(() => { try { const v = localStorage.getItem(MM_KEY); return v === null ? true : v === "1"; } catch (e) { return true; } });
      const setMmShow = React.useCallback((next) => setMmShowRaw((v) => {
        const nx = typeof next === "function" ? next(v) : next;
        try { localStorage.setItem(MM_KEY, nx ? "1" : "0"); } catch (e) { }
        return nx;
      }), []);
      const [mmSize, setMmSize] = React.useState("auto"); // 垂直大小: auto | 100 | 150 | 200
      const [mmSide, setMmSide] = React.useState("right"); // 侧边: right 左? VSCode 默认 right
      const [mmMenu, setMmMenu] = React.useState(null); // {x, y} | null
      const mmW = mmChar ? 64 : 30; // 字符模式需要更宽画布
      const lastReqNRef = React.useRef(0);
      const findFocusSilentRef = React.useRef(false); // 所有权转移（静默）时抑制自动聚焦编辑器
      // 关键字处理：整词/大小写/搜索模式/In selection / 正则 .匹配新行 统一的查找参数
      const findOpts = { cs: findCS, whole: findWhole, search: findMode2, dotall: findMatchNL };
      /* 给结果列表挂"生成时选项"快照：不改 state 结构、无副作用（数组本身可带属性），
         列表每次重建都会带上当时的选项，面板据此显示 全词/Aa/正则 是否生效。 */
      const tagResults = (rows) => {
        try { if (Array.isArray(rows)) rows.__meta = { q: findQ, cs: findCS, whole: findWhole, mode: findMode2 }; } catch (e) { }
        return rows;
      };
      // 当前 isel 选区（受 textarea 光标影响，按钮点击时即时取）
      const findSelection = () => {
        const ta = taRef.current;
        if (!ta) return null;
        const r = [ta.selectionStart, ta.selectionEnd];
        return (r[1] > r[0]) ? r : null; // 无选区返回 null
      };
      // 主查找匹配集：All matching in current scope（当前文档全部匹配，含 In selection 范围）
      const findMatches = React.useMemo(() => {
        if (!findQ || !text) return [];
        const range = findInSel ? findSelection() : null;
        if (findInSel && !range) return [];
        return computeMatches(text, findQ, findOpts, range);
      }, [text, findQ, findCS, findWhole, findMode2, findMatchNL, findInSel, selRange]); // eslint-disable-line react-hooks/exhaustive-deps
      // 正则错误提示（computeMatches 把原因挂在返回数组的 __error 上，此前无消费者 → 用户只见"0 个匹配"）
      React.useEffect(() => {
        if (Array.isArray(findMatches) && findMatches.__error) {
          setFindMsg(String(findMatches.__error));
        }
      }, [findMatches]);
      const effFindMatches = (findInSel && findSelection() == null) ? [] : findMatches;
      // 当前面板是否为“全局查找目标”（最后获得焦点/有选区的编辑器）。仅目标面板渲染查找框。
      const isFindTarget = props.isFindTarget === true;
      // 高亮层现在是三层独立叠加（标记 / 查找 / 选区），见下方 overlayHtml；
      // 不再需要"标记 与 查找"二选一的 hlMatches。
      // selW 匹配（Ctrl+D 选词）
      const selWStarts = React.useMemo(() => {
        const out = [];
        if (!selW || !text) return out;
        let i = text.indexOf(selW);
        while (i >= 0) { out.push(i); i = text.indexOf(selW, i + Math.max(1, selW.length)); }
        return out;
      }, [text, selW]);
      // 缓存代码高亮 HTML 与查找高亮层 HTML：避免每次渲染整文档全量重算（大文件下防主线程饱和）
      // ㉙ 跳转/转到定义后：给目标行加背景高亮（便于定位），随滚动自然跟随（pre 层内联渲染）
      const codeHtml = React.useMemo(() => {
        const html = hlVerilog(text, isSVPath(props.path) ? KW_SV : KW_V);
        const hl = (props.highlightLine | 0) || autoHl;
        if (!hl || hl < 1) return html;
        const parts = html.split("\n");
        if (hl > parts.length) return html;
        const idx = hl - 1;
        parts[idx] = '<span style="display:inline-block;width:100%;background:rgba(57,148,188,.28);box-shadow:inset 0 0 0 1px rgba(57,148,188,.45)">' + parts[idx] + "</span>";
        return parts.join("\n");
      }, [text, props.path, props.highlightLine, autoHl]);
      const selWArr = React.useMemo(() => ((selW && selWStarts.length) ? selWStarts.map((s) => ({ start: s, end: s + selW.length })) : []), [selW, selWStarts]);
      /* 静态检查（当前文件、随文本重算）。纯显示用途：异常一律吞掉，绝不允许检查器把编辑器打挂。
         行首偏移表一并算好 —— 高亮层比 charAtLine 声明更早，不能调它（会 TDZ）。 */
      const lintRes = React.useMemo(() => {
        const starts = [0];
        for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
        if (!lintOnRef.current) return { issues: [], starts };
        try {
          let list = lintVerilog(text);
          if (!lintStyleRef.current) list = list.filter((it) => !LINT_STYLE_RULES[it.rule]);
          return { issues: list, starts };
        } catch (e) { return { issues: [], starts }; }
        /* props.lintRev：开关变化要立刻重算（否则要等下次改文本才生效） */
      }, [text, props.lintRev]);
      const lintIssues = lintRes.issues;
      /* 悬停在某行时显示该行的问题。
         注意：不要用 textarea 的 title —— 鼠标移动中不断改 title 时浏览器根本不弹提示（用户实测"只是标红了"）。
         这里自绘一个浮动层（fixed 定位，挂在编辑器行容器里）。 */
      const [lintTip, setLintTip] = React.useState(null);   // {x,y,line,items}
      const lintHover = (e) => {
        try {
          const ta = taRef.current;
          if (!ta) return;
          if (!lintIssues.length) { if (lintTip) setLintTip(null); return; }
          const rect = ta.getBoundingClientRect();
          const y = e.clientY - rect.top + ta.scrollTop - 12;   // 编辑器上内边距 12px
          const ln = Math.floor(y / LINE_H) + 1;
          const hit = lintIssues.filter((it) => it.line === ln);
          if (!hit.length) { if (lintTip) setLintTip(null); return; }
          setLintTip({ x: Math.min(e.clientX + 14, (window.innerWidth || 1200) - 460), y: e.clientY + 16, line: ln, items: hit });
        } catch (err) { /* 提示失败不影响编辑 */ }
      };
      const lintTipEl = lintTip ? React.createElement("div", {
        style: { position: "fixed", left: lintTip.x, top: lintTip.y, zIndex: 100002, maxWidth: 440, background: "#1b1c1d", border: "1px solid #e5534b", borderRadius: 6, boxShadow: "0 10px 28px rgba(0,0,0,.6)", padding: "6px 10px", pointerEvents: "none", fontSize: 12, lineHeight: "18px", color: "#e8e8e8", whiteSpace: "pre-wrap" }
      },
        React.createElement("div", { style: { color: "#f48771", fontWeight: 600, marginBottom: 2 } }, "第 " + lintTip.line + " 行"),
        lintTip.items.map((it, i) => React.createElement("div", { key: i, style: { color: it.sev === "error" ? "#f48771" : (it.sev === "warn" ? "#d19a66" : "#4DAAFC") } }, "· " + it.msg))) : null;
      const overlayHtml = React.useMemo(() => {
        const arr = [];
        // 三层独立叠加（此前是"标记 与 查找"互斥，查找框里有词时标记被整体顶掉，
        // 界面上表现为「全部标记/清除」点了没反应）：
        //   ① Mark All 标记   ② 查找匹配 / Ctrl+D 选词   ③ 真实选区
        /* 查找匹配放最前：buildMatchHtml 对重叠区间"先画者优先"，
           这样当前匹配的暖色描边不会被 Mark/选词高亮盖掉（用户要求"查找下一个落点要一眼看出"）。 */
        /* 查找高亮只在查找框开着时画：关掉框（✕/Esc）后不该再留着匹配底色与「当前匹配」的暖色描边框。
           注意查询词本身要保留（下次 Ctrl+F 还是它），所以不能靠清空 findQ 来清高亮（用户实测：双击选词后
           Ctrl+F 会带上该词，关框后那个框去不掉）。 */
        if (findMode && findMatches.length) {
          for (let i = 0; i < findMatches.length; i++) {
            const isCur = (i === findIdx);
            arr.push({ start: findMatches[i].start, end: findMatches[i].end, bg: isCur ? HL_BG.findCur : HL_BG.find, outline: isCur ? HL_BG.findCurEdge : "" });
          }
        }
        if (marked.length) {
          for (const mh of marked) arr.push({ start: mh.start, end: mh.end, bg: HL_BG.mark });
        }
        // Ctrl+D 选词高亮独立叠加，不再被查找匹配压制（此前 else if 二选一）
        if (selWArr.length) {
          for (const sw of selWArr) arr.push({ start: sw.start, end: sw.end, bg: HL_BG.selWord });
        }
        /* 列选择激活时不画线性选区：Alt+拖拽不会改 textarea 的选区，残留的旧选区高亮会和矩形叠在一起，
           看起来就是"选中的区域不对"（用户实测）。 */
        if (!blk && selRange && selRange[1] > selRange[0]) arr.push({ start: selRange[0], end: selRange[1], bg: HL_BG.selection });
        /* 列（矩形）选择高亮：textarea 原生选区被 CSS 设成透明，不自己画就完全看不见。
           矩形按行拆成多个区间 → 与查找高亮同一套渲染（buildMatchHtml "先画者优先"）。
           零宽矩形（打字后的多光标位置）在每行画一个字符宽的小块当"虚拟光标"。 */
        /* 列（矩形）选择：画成【像素矩形】（blkRectsHtml），不再给文字加底色 span。
           旧做法两处硬伤：① 含中文的行被字形宽度顶出去 → 每行右边缘参差不齐（用户截图实测）；
           ② 行尾之后的"虚拟空格"靠给行 HTML 尾巴补空格实现，空行补不出来。 */
        const blkRects = [];
        if (blk) {
          const rectB = blkNorm(blk.a, blk.h);
          const stB = lintRes.starts;
          for (let ln = Math.max(0, rectB.l0); ln <= Math.min(rectB.l1, stB.length - 1); ln++) {
            blkRects.push({ ln: ln, c0: Math.max(0, rectB.c0), c1: Math.max(rectB.c0, rectB.c1) });
          }
        }
        /* 静态检查：在原地画框 —— 全角标点框住那个字符，块配对/声明问题框住关键字。
           bg 用 transparent（只描边不染色），配合"高亮层在下、文字层在上"不会遮住代码。 */
        for (const it of lintIssues) {
          const base = lintRes.starts[it.line - 1];
          if (base === undefined) continue;
          const st = base + (it.col - 1);
          if (st < 0 || st >= text.length) continue;
          arr.push({
            start: st, end: Math.min(text.length, st + (it.len || 1)), bg: "transparent",
            outline: it.sev === "error" ? "#e5534b" : (it.sev === "warn" ? "#d19a66" : "#4DAAFC")
          });
        }
        if (!arr.length && !blkRects.length) return "";
        arr.sort((a, b) => a.start - b.start);
        let out = arr.length ? buildMatchHtml(text, arr, -1) : escHtml(text);
        /* 矩形高亮的宽度只由列数与字宽决定（不读行内容）→ 与行内有多少中文无关，天然对齐。
           位置口径与 blkPosFromPoint 一致（都是 measureMonoW 量的字宽），右边缘正好落在鼠标处。 */
        if (blkRects.length) {
          const monoPx = measureMonoW(fontSz, preRef.current && preRef.current.parentNode) || 8;
          out += blkRectsHtml(blkRects, { pw: monoPx, rowH: LINE_H });
          /* 块光标画在矩形活动端（右下角）：这样"拖到右边空白"时落点看得见，
             而不是像原生光标那样被夹在最后一个字符上（用户实测）。零宽矩形不画（每行已有细竖条）。 */
          if (!blkEmpty(blk.a, blk.h)) out += blkCaretHtml(blk.h.line, blk.h.col, { pw: monoPx, rowH: LINE_H });
        }
        return out;
      }, [text, marked, findMatches, findIdx, selWArr, selRange, lintIssues, blk, fontSz]); // eslint-disable-line react-hooks/exhaustive-deps
      // 高亮层内容刷新后恢复滚动位置：避免选中/滚动后高亮层 scrollTop 被重置导致高亮错位/看不到
      /* 高亮层内容一变（dangerouslySetInnerHTML 换 innerHTML）它自己的滚动位置会被清零：
         原来只补 scrollTop 不补 scrollLeft —— 横向滚动过之后，整层高亮（含列选矩形、查找匹配）
         就整体横移，看起来正是"选中的不对、乱跑"（用户实测）。两个方向都要补，
         且都用原生量（超出原生范围的余量由 setExtraShift 的 translateX 承担）。 */
      React.useLayoutEffect(() => {
        const ta = taRef.current, m = matchRef.current;
        if (ta && m) { m.scrollTop = ta.scrollTop; m.scrollLeft = ta.scrollLeft; }
      }, [overlayHtml]);
      React.useEffect(() => {
        if (props.findReq && props.findReq.n && props.findReq.n !== lastReqNRef.current) {
          lastReqNRef.current = props.findReq.n;
          // 仅当本面板是当前查找目标时才响应（全局 Ctrl+F/H 路由到“最后获得焦点”的面板）
          if (!props.isFindTarget) return;
          // 支持 find / replace / files 三种入口（此前非 replace 一律降级为 find，导致"在文件中查找"无法通过快捷键打开）
          const mode = props.findReq.mode === "replace" ? "replace" : (props.findReq.mode === "files" ? "files" : "find");
          setFindMode(mode);
          setFindTab(mode);
          setFindIdx(0);
          setTimeout(() => { try { if (findInputRef.current) findInputRef.current.focus(); findInputRef.current.select(); } catch (e) { } }, 30);
        }
      }, [props.findReq, props.isFindTarget]);
      // 本面板成为"当前查找目标"时：从共享容器回读全局查找词/设置（保持"全局一个查找框"的手感），并静默打开
      React.useEffect(() => {
        if (!isFindTarget) return;
        if (findShared.open && !findMode) {
          // 打开但未在本次会话初始化过 → 回读共享状态并打开对话框（静默，不抢焦点）
          findFocusSilentRef.current = true;
          setFindMode(findShared.mode);
          setFindTab(findShared.tab);
          setFindQ(findShared.q);
          setFindRep(findShared.rep);
          setFindIdx(findShared.idx);
          setFindCS(findShared.cs);
          setFindWhole(findShared.whole);
          setFindBack(findShared.back);
          setFindWrap(findShared.wrap);
          setFindInSel(findShared.inSel);
          setFindMode2(findShared.mode2);
          setFindQHist(findShared.qHist);
          setFindRepHist(findShared.repHist);
          setFindMatchNL(findShared.matchNL);
          setFindOpacity(findShared.opacity);
          setFindLoseFocus(findShared.loseFocus);
          setFindDir(findShared.dir);
          setFindFilter(findShared.filter);
          setFindRecurse(findShared.recurse);
          setFindProj(findShared.proj);
          setFindMarkLine(findShared.markLine);
        }
      }, [isFindTarget]); // eslint-disable-line react-hooks/exhaustive-deps
      /* 从「全局共享查找框」容器 findShared 把上次的设置灌进本面板的 state。
         挂载时与切文件时都调用它 —— 切文件曾经是 setFindQ("") 直接清空，把持久化下来的词又抹掉了（用户实测）。 */
      const applyFindPrefs = () => {
        try {
          setFindQ(findShared.q || "");
          setFindRep(findShared.rep || "");
          setFindCS(!!findShared.cs);
          setFindWhole(!!findShared.whole);
          setFindBack(!!findShared.back);
          setFindWrap(!!findShared.wrap);
          setFindInSel(!!findShared.inSel);
          setFindMode2(findShared.mode2 || "normal");
          if (Array.isArray(findShared.qHist)) setFindQHist(findShared.qHist);
          if (Array.isArray(findShared.repHist)) setFindRepHist(findShared.repHist);
          setFindMatchNL(!!findShared.matchNL);
          setFindDir(findShared.dir || "当前文件夹");
          setFindFilter(findShared.filter || "*.*");
          setFindRecurse(!!findShared.recurse);
          setFindProj(findShared.proj || "p1");
          setFindMarkLine(!!findShared.markLine);
        } catch (e) { }
      };
      /* 面板挂载时灌一次（模块加载时已从 localStorage 恢复到 findShared）。
         只在查找框没开着时灌，免得抢走正在用的状态；挂载后用户一改就由下面的镜像 effect 落盘。 */
      React.useEffect(() => {
        if (findMode) return;
        applyFindPrefs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      // 本面板（目标）查找框打开期间：把查找词/设置镜像到共享容器，保证切到另一栏时状态随之转移
      React.useEffect(() => {
        if (!isFindTarget || !findMode) return;
        findShared.open = true;
        findShared.mode = findMode;
        findShared.tab = findTab;
        findShared.q = findQ;
        findShared.rep = findRep;
        findShared.idx = findIdx;
        findShared.cs = findCS;
        findShared.whole = findWhole;
        findShared.back = findBack;
        findShared.wrap = findWrap;
        findShared.inSel = findInSel;
        findShared.mode2 = findMode2;
        findShared.qHist = findQHist;
        findShared.repHist = findRepHist;
        findShared.matchNL = findMatchNL;
        findShared.opacity = findOpacity;
        findShared.loseFocus = findLoseFocus;
        findShared.dir = findDir;
        findShared.filter = findFilter;
        findShared.recurse = findRecurse;
        findShared.proj = findProj;
        findShared.markLine = findMarkLine;
        saveFindPrefs();   // 查找设置持久化（每次变更即落盘，体积很小）
      }, [isFindTarget, findMode, findTab, findQ, findRep, findIdx, findCS, findWhole, findBack, findWrap, findInSel, findMode2, findQHist, findRepHist, findMatchNL, findOpacity, findLoseFocus, findDir, findFilter, findRecurse, findProj, findMarkLine]); // eslint-disable-line react-hooks/exhaustive-deps
      // 本面板不再是查找目标：关闭自身对话框（查找框随之转移到新的目标面板）
      React.useEffect(() => {
        if (!isFindTarget && findMode) setFindMode(null);
      }, [isFindTarget]); // eslint-disable-line react-hooks/exhaustive-deps
      // 修复：本面板若是查找目标却被直接关闭（unmount，非点 ✕），清理 findShared.open，
      // 防止下次打开另一栏时残留上次查找词
      const isTargetRef = React.useRef(isFindTarget);
      React.useEffect(() => { isTargetRef.current = isFindTarget; }, [isFindTarget]);
      React.useEffect(() => () => { if (isTargetRef.current) findShared.open = false; }, []);
      React.useEffect(() => {
        if (findMode) {
          // 所有权转移（静默）时不抢编辑器焦点
          if (findFocusSilentRef.current) { findFocusSilentRef.current = false; return; }
          const t = setTimeout(() => { try {
            const el = findTab === "replace" ? repInputRef.current : (findTab === "files" || findTab === "projects" || findTab === "mark" ? findFixInputRef.current : findInputRef.current);
            if (el) el.focus();
          } catch (e) { } }, 30);
          return () => clearTimeout(t);
        }
      }, [findMode, findTab]);
      // 受控 textarea 光标恢复：useLayoutEffect 在 DOM 提交后、下一次按键前同步执行，
      // 避免浏览器把光标重置到文末后用户立刻按键（如 Tab）读到错误的光标位置
      React.useLayoutEffect(() => {
        const ta = taRef.current;
        const saved = saveSelRef.current;
        if (saved && ta && document.activeElement === ta) {
          const vlen = ta.value.length;
          ta.setSelectionRange(Math.min(saved[0], vlen), Math.min(saved[1], vlen));
        }
        saveSelRef.current = null;
      }, [props.text]);
      // 当前文档内的一次匹配跳转（复制到 ta 选区 + 滚动）
      const jumpToMatch = (m, keepWrap) => {
        if (!m) return;
        const ta = taRef.current;
        if (!ta) return;
        ta.focus();
        // 反向显示光标落点：相同 start 时选中尾部（Backward 场景更自然），但保持选中长度
        ta.setSelectionRange(m.start, m.end);
        // 滚动使当前匹配可见
        const top = Math.max(0, (m.line - 1) * LINE_H - 60);
        ta.scrollTop = top;
        syncScroll(top);
      };
      // 双向 Find Next：在 findMatches 基础上向前/向后移动当前索引并落点（findWrap 控制是否环绕）
      const findJump = (delta) => {
        const arr = effFindMatches;
        if (!arr.length) return;
        const m = arr.length;
        let idx = findIdx;
        if (idx < 0 || idx >= m) idx = 0;
        /* 首次 Find Next 的落点按【光标位置】决定：
             光标正落在某个匹配内（或就在它起点）→ 前进一个，否则画面根本不动，
             用户看到的就是"第一次点没反应、第二次才跳"（实测反馈）；
             光标不在任何匹配内 → 落到光标之后的第一个匹配（没有则回绕），与 VSCode/Notepad++ 一致。 */
        if (!findJumpedRef.current) {
          findJumpedRef.current = true;
          const ta0 = taRef.current;
          const caret = ta0 ? ta0.selectionStart : 0;
          let inside = -1;
          for (let i = 0; i < arr.length; i++) { if (caret >= arr[i].start && caret <= arr[i].end) { inside = i; break; } }
          let k0 = 0;
          if (inside >= 0) {
            k0 = (inside + delta + arr.length) % arr.length;
          } else {
            k0 = -1;
            for (let i = 0; i < arr.length; i++) {
              if (delta >= 0 ? arr[i].start >= caret : arr[i].end <= caret) { k0 = i; if (delta >= 0) break; }
            }
            if (k0 < 0) k0 = (delta >= 0) ? 0 : (arr.length - 1);
          }
          setFindIdx(k0);
          jumpToMatch(arr[k0]);
          return;
        }
        idx += delta;
        if (idx < 0) { if (!findWrap) idx = 0; else idx += m; }
        if (idx >= m) { if (!findWrap) idx = m - 1; else idx -= m; }
        setFindIdx(idx);
        jumpToMatch(arr[idx]);
      };
      // Count：显示匹配数（仅当前文档/选区范围）
      const doCount = () => { setFindMsg(""); setCnt(effFindMatches.length); };
      // Find All in Current Doc：把当前文档所有匹配填入底部结果面板
      const doFindAll = () => {
        const arr = effFindMatches;
        // 按行去重：一行里多个匹配只显示一条（Notepad++ 行为）
        const seen = new Set();
        const rows = [];
        for (const m of arr) {
          if (seen.has(m.line)) continue;
          seen.add(m.line);
          rows.push({ path: props.path || "", line: m.line, col: m.col, start: m.start, end: m.end, text: (findQ.length > 160 ? findQ.slice(0, 160) : findQ), _line: lineTextAt(text, m.line) });
        }
        setResults(tagResults(rows));
        setResultsScope(true);
        setResOpen(true);
      };
      // 当前文件所在目录（"当前文件夹"勾选时目录框显示它）
      const curFileDir = (() => {
        const p = props.path || "";
        const i = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
        return i >= 0 ? p.slice(0, i) : "";
      })();
      /* 弹出资源管理器选择文件夹（目录框右侧的"..."按钮）。
         注意：pickDirectory 在 uiWorkspace 服务上，workspaces（纯控制器）里没有它
         —— 旧写法 typeof workspacesService.pickDirectory 恒为 false，按钮一直提示"无目录选择服务"。 */
      const pickFindDir = async () => {
        const ws = (uiWorkspaceSvc && typeof uiWorkspaceSvc.pickDirectory === "function") ? uiWorkspaceSvc : workspacesService;
        if (!ws || typeof ws.pickDirectory !== "function") {
          setFindMsg("无目录选择服务，请手动输入路径");
          return;
        }
        try {
          const dir = await ws.pickDirectory();
          if (!dir) return; // 用户取消
          setFindDir(dir);
          setFindMsg("已选择目录: " + dir);
        } catch (e) {
          setFindMsg("选择目录失败: " + fmtErr(e));
        }
      };
      // 跨文件查找/替换（在文件中查找）：真·按目录扫描（host findInFiles / replaceInFiles）
      // doReplace=true 时执行真正的按目录替换（对应"在文件中替换"按钮）
      const doFindAllInFiles = async (doReplace) => {
        if (!findQ) return;
        /* 跨文件查找/替换的正则是在 host 侧同步执行的：病态表达式会占住 host 的单线程
           事件循环，把 GUI 和所有会话一起卡死（只能重启进程）。所以必须在下发之前，
           用与编辑器内查找同一套判据先拦一道。 */
        if (findMode2 === "regex") {
          const risk = regexRiskReason(findQ);
          if (risk) { setFindMsg(risk); return; }
        }
        // 目录来源：勾选"当前文件夹" → 用当前文件所在目录；否则用"目录"输入框
        const useCur = findCurDir !== false; // 默认勾选"当前文件夹"
        let dir = useCur ? curFileDir : (findDir != null ? String(findDir) : "").trim();
        if (dir === "(当前文件夹)" || dir === "当前文件夹") dir = curFileDir;
        if (!dir) { setFindMsg(useCur ? "当前没有打开文件，无法确定目录" : "请点「...」选择文件夹，或在「目录」中填写路径"); return; }
        if (doReplace && !findRep) { setFindMsg("请在「替换为」中填写替换内容"); return; }
        // 跨文件替换【直接覆盖写盘、无备份、无撤销】→ 必须先确认，避免误点造成大范围不可逆改动
        if (doReplace) {
          let n = 0;
          let preRes = null;
          try {
            const pre = await apiCall("findInFiles", Object.assign({ dir: dir, maxResults: 5000 }, { needle: findQ, filter: findFilter != null ? String(findFilter) : "*.*", recurse: findRecurse !== false, hidden: findHidden === true, cs: findCS, whole: findWhole, search: findMode2, dotall: findMatchNL }));
            n = (pre && pre.ok && Array.isArray(pre.results)) ? pre.results.length : 0;
            /* 未截断才敢做撤销快照：截断了就不知道还有哪些文件会被改到 */
            if (pre && pre.ok && !pre.truncated && Array.isArray(pre.results)) preRes = pre;
          } catch (e) { n = 0; }
          /* 收集本次会被改到的文件（去重） */
          const snapPaths = [];
          if (preRes) {
            const seenP = new Set();
            for (const x of preRes.results) {
              if (x && x.path && !seenP.has(x.path)) { seenP.add(x.path); snapPaths.push(x.path); }
              if (snapPaths.length > 60) break;
            }
          }
          /* 写盘前把每个受影响文件的原文读下来当作撤销快照。
             上限 60 个文件 / 4MB；超限或读取失败就退回「不可撤销」的老口径，如实告知、不假装能撤。 */
          let dirSnap = null;
          if (!!preRes && snapPaths.length > 0 && snapPaths.length <= 60) {
            try {
              const rs = await Promise.all(snapPaths.map((p) => apiCall("readFile", { path: p }).catch(() => null)));
              const ents = [];
              let bytes = 0;
              let bad = false;
              for (let i = 0; i < snapPaths.length; i++) {
                const d = rs[i];
                if (!d || d.ok === false || typeof d.content !== "string") { bad = true; break; }
                bytes += d.content.length;
                if (bytes > 4 * 1024 * 1024) { bad = true; break; }
                ents.push({ path: snapPaths[i], content: d.content, encoding: d.encoding || "utf8", bom: d.hasBom === true });
              }
              if (!bad && ents.length === snapPaths.length) dirSnap = ents;
            } catch (e) { dirSnap = null; }
          }
          const filesHint = n > 0 ? ("预计影响 " + n + " 处匹配") : "未预先统计到匹配（可能为 0 或统计失败）";
          const okGo = await deskConfirm(
            "即将在目录中【直接覆盖替换并写盘】\n\n" +
            "目录：" + dir + "\n" +
            "查找：" + findQ + "\n" +
            "替换为：" + findRep + "\n" +
            filesHint + "\n\n" +
            (dirSnap
              ? ("已备份 " + dirSnap.length + " 个文件的原文，写盘后可按 Ctrl+Z 撤销（一次全撤）。")
              : "此操作不可撤销、无自动备份（受影响文件过多或读取失败，未建立撤销点）。") + "\n确定继续吗？"
          );
          if (!okGo) { setFindMsg("已取消替换（文件未被修改）"); return; }
        }
        setFindBusy(true);
        setFindMsg(doReplace ? "正在替换…" : "正在查找…");
        try {
          const common = {
            needle: findQ,
            filter: findFilter != null ? String(findFilter) : "*.*",
            recurse: findRecurse !== false,
            hidden: findHidden === true,
            cs: findCS,
            whole: findWhole,
            search: findMode2,
            dotall: findMatchNL,
            maxResults: 5000
          };
          if (doReplace) {
            // 真·按目录替换（写盘；保持原编码）
            const r = await apiCall("replaceInFiles", Object.assign({ dirs: [dir], rep: findRep, maxResults: 20000 }, common));
            if (!r || !r.ok) { setFindBusy(false); setFindMsg("替换失败: " + (r && r.error ? r.error : "未知错误")); return; }
            const seenR = new Set();
            const rowsR = [];
            for (const x of (r.results || [])) {
              const key = x.path + "::" + x.line;
              if (seenR.has(key)) continue;
              seenR.add(key);
              rowsR.push({ path: x.path, line: x.line, col: x.col, text: (findQ.length > 160 ? findQ.slice(0, 160) : findQ), _line: x.text || "" });
            }
            setResults(tagResults(rowsR));
            setResultsScope(false);
            setResOpen(true);
            setFindBusy(false);
            setFindMsg("已替换 " + (r.replaced || 0) + " 处（" + (r.files || 0) + " 个文件" + (r.truncated ? "，结果已截断" : "") + (r.lossySkipped ? "，" + r.lossySkipped + " 个文件因含 GBK 表外字符被拒绝写入" : "") + (r.outsideSkipped ? "，" + r.outsideSkipped + " 个文件在工作区外被跳过" : "") + (r.failedSkipped ? "，" + r.failedSkipped + " 个文件写入失败" : "") + "）");
            // host 是直接写盘的，客户端没有 host→client 推送通道：必须让同目录下已打开的标签
            // 重新读盘。否则标签仍持替换前的旧文本且 dirty=false，用户随后一次 Ctrl+S
            // 就会把刚做的目录级替换静默写回、整批回滚。
            deskToast("目录替换完成：" + (r.replaced || 0) + " 处 / " + (r.files || 0) + " 个文件" + (r.lossySkipped ? "（" + r.lossySkipped + " 个文件因编码有损被跳过）" : "") + (r.outsideSkipped ? "（" + r.outsideSkipped + " 个在工作区外）" : "") + (r.failedSkipped ? "（" + r.failedSkipped + " 个写入失败）" : ""), !(r.lossySkipped || r.outsideSkipped || r.failedSkipped));
            if (r.crossLineNote) { setFindMsg((m) => m + "　※ " + r.crossLineNote); }
            if (typeof dirReplacedHandler === "function") { try { dirReplacedHandler(dir); } catch (e) { /* 重载失败不影响已完成的替换 */ } }
            /* 建立撤销点：编辑器文本栈空了之后再按 Ctrl+Z，由 revertLastCodeOp 取它整批写回原文。
               本次若没抓到快照就置 null —— 不能留着上一次的旧快照（那会把更早的内容写回来）。 */
            dirReplaceUndo = dirSnap ? { entries: dirSnap, dirs: [dir], at: Date.now() } : null;
            return;
          }
          const r = await apiCall("findInFiles", Object.assign({ dir: dir }, common));
          if (!r || !r.ok) { setFindBusy(false); setFindMsg("查找失败: " + (r && r.error ? r.error : "未知错误")); return; }
          // 按「文件+行」去重：同一行多个匹配只列一行
          const seen = new Set();
          const rows = [];
          for (const x of (r.results || [])) {
            const key = x.path + "::" + x.line;
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push({ path: x.path, line: x.line, col: x.col, text: (findQ.length > 160 ? findQ.slice(0, 160) : findQ), _line: x.text || "" });
          }
          setResults(tagResults(rows));
          setResultsScope(false);
          setResOpen(true);
          setFindBusy(false);
          setFindMsg("找到 " + rows.length + " 行（扫描 " + (r.scanned || 0) + " 个文件" + (r.truncated ? "，结果已截断" : "") + "）");
        } catch (e) {
          setFindBusy(false);
          setFindMsg("失败: " + fmtErr(e));
        }
      };
      // 工程面板标签：动态显示该面板对应的真实文件夹名（跟随工作区变化，不写死）
      // 例：工作区第 1 个文件夹路径为 ...\RFSOC_48DR_0814_vio → "工程面板1 (RFSOC_48DR_0814_vio)"
      const projPanelLabel = (idx) => {
        const base = "工程面板" + (idx + 1);
        const f = (props.folders || [])[idx];
        if (!f) return base; // 无对应文件夹 → 只显示编号（复选框同时会置灰）
        const nm = (f.name && String(f.name).trim()) || basename(f.path || "");
        return nm ? (base + " (" + nm + ")") : base;
      };
      // 在工程中查找/替换（Notepad++ Find in Projects）：工程面板 1/2/3 勾选 = 工作区第 1/2/3 个文件夹
      const doFindInProjects = async (doReplace) => {
        if (!findQ) return;
        if (doReplace && !findRep) { setFindMsg("请在「替换为」中填写替换内容"); return; }
        // 取勾选的工程面板对应的文件夹（工作区 folders 的第 1/2/3 个）
        const flds = (props.folders || []);
        const picked = [];
        if (findPanel1 && flds[0]) picked.push(flds[0].path);
        if (findPanel2 && flds[1]) picked.push(flds[1].path);
        if (findPanel3 && flds[2]) picked.push(flds[2].path);
        if (!picked.length) {
          setFindMsg(flds.length ? "请勾选至少一个工程面板" : "工作区没有文件夹（先在资源管理器打开工作区）");
          return;
        }
        setFindBusy(true);
        setFindMsg(doReplace ? "正在替换…" : "正在查找…");
        try {
          if (doReplace) {
            // 跨文件替换直接覆盖写盘、无备份、无撤销 → 先统计匹配数并让用户确认
            let n = 0;
            const prePaths = [];
            let preTrunc = false;
            for (const d of picked) {
              try {
                const pre = await apiCall("findInFiles", {
                  dir: d, needle: findQ,
                  filter: findFilter != null ? String(findFilter) : "*.*",
                  recurse: true, hidden: findHidden === true,
                  cs: findCS, whole: findWhole, search: findMode2, dotall: findMatchNL,
                  maxResults: 5000
                });
                if (pre && pre.ok && Array.isArray(pre.results)) {
                  n += pre.results.length;
                  if (pre.truncated) preTrunc = true;
                  if (prePaths.length <= 60) { for (const x of pre.results) { if (x && x.path && prePaths.indexOf(x.path) < 0) prePaths.push(x.path); } }
                }
              } catch (e) { }
            }
            /* 写盘前把每个受影响文件的原文读下来当作撤销快照。
               上限 60 个文件 / 4MB；超限或读取失败就退回「不可撤销」的老口径，如实告知、不假装能撤。 */
            let dirSnap = null;
            if (!preTrunc && prePaths.length > 0 && prePaths.length <= 60) {
              try {
                const rs = await Promise.all(prePaths.map((p) => apiCall("readFile", { path: p }).catch(() => null)));
                const ents = [];
                let bytes = 0;
                let bad = false;
                for (let i = 0; i < prePaths.length; i++) {
                  const d = rs[i];
                  if (!d || d.ok === false || typeof d.content !== "string") { bad = true; break; }
                  bytes += d.content.length;
                  if (bytes > 4 * 1024 * 1024) { bad = true; break; }
                  ents.push({ path: prePaths[i], content: d.content, encoding: d.encoding || "utf8", bom: d.hasBom === true });
                }
                if (!bad && ents.length === prePaths.length) dirSnap = ents;
              } catch (e) { dirSnap = null; }
            }
            const okGo = await deskConfirm(
              "即将在选中的工程面板中【直接覆盖替换并写盘】\n\n" +
              "目录：" + picked.join("\n      ") + "\n" +
              "查找：" + findQ + "\n" +
              "替换为：" + findRep + "\n" +
              "预计影响 " + n + " 处匹配\n\n" +
              (dirSnap
                ? ("已备份 " + dirSnap.length + " 个文件的原文，写盘后可按 Ctrl+Z 撤销（一次全撤）。")
                : "此操作不可撤销、无自动备份（受影响文件过多或读取失败，未建立撤销点）。") + "\n确定继续吗？"
            );
            if (!okGo) { setFindBusy(false); setFindMsg("已取消替换（文件未被修改）"); return; }
            const r = await apiCall("replaceInFiles", {
              dirs: picked,
              needle: findQ, rep: findRep,
              filter: findFilter != null ? String(findFilter) : "*.*",
              recurse: true, hidden: findHidden === true,
              cs: findCS, whole: findWhole, search: findMode2, dotall: findMatchNL,
              maxResults: 20000
            });
            if (!r || !r.ok) { setFindBusy(false); setFindMsg("替换失败: " + (r && r.error ? r.error : "未知错误")); return; }
            dirReplaceUndo = dirSnap ? { entries: dirSnap, dirs: picked.slice(), at: Date.now() } : null;
            /* 工程面板替换也要重载已打开标签：否则标签仍持替换前的文本且 dirty=false，
               用户随后一次 Ctrl+S 就把整批替换静默写回（与「在目录中替换」同一个坑，这里先前漏了） */
            if (typeof dirReplacedHandler === "function") { for (const d of picked) { try { dirReplacedHandler(d); } catch (e) { } } }
            const rows = (r.results || []).map((x) => ({ path: x.path, line: x.line, col: x.col, text: (findQ.length > 160 ? findQ.slice(0, 160) : findQ), _line: x.text || "" }));
            setResults(tagResults(rows)); setResultsScope(false); setResOpen(true);
            setFindBusy(false);
            setFindMsg("已替换 " + (r.replaced || 0) + " 处（" + (r.files || 0) + " 个文件" + (r.truncated ? "，已截断" : "") + "）");
          } else {
            const all = [];
            let scanned = 0, truncated = false;
            for (const d of picked) {
              const r = await apiCall("findInFiles", {
                dir: d, needle: findQ,
                filter: findFilter != null ? String(findFilter) : "*.*",
                recurse: true, hidden: findHidden === true,
                cs: findCS, whole: findWhole, search: findMode2, dotall: findMatchNL,
                maxResults: 5000
              });
              if (r && r.ok) { all.push.apply(all, (r.results || [])); scanned += (r.scanned || 0); if (r.truncated) truncated = true; }
            }
            // 按「文件+行」去重：同一行有多个匹配时只列一行（与"在当前文件中查找"一致）
            const seen = new Set();
            const rows = [];
            for (const x of all) {
              const key = x.path + "::" + x.line;
              if (seen.has(key)) continue;
              seen.add(key);
              rows.push({ path: x.path, line: x.line, col: x.col, text: (findQ.length > 160 ? findQ.slice(0, 160) : findQ), _line: x.text || "" });
            }
            setResults(tagResults(rows)); setResultsScope(false); setResOpen(true);
            setFindBusy(false);
            setFindMsg("在工程中找到 " + rows.length + " 行（" + picked.length + " 个面板，扫描 " + scanned + " 个文件" + (truncated ? "，结果已截断" : "") + "）");
          }
        } catch (e) {
          setFindBusy(false);
          setFindMsg("失败: " + fmtErr(e));
        }
      };
      // 替换 Find/Replace 内容（⇅）
      const swapFR = () => { setFindQ(findRep); setFindRep(findQ); };
      // 正则替换的捕获组：支持 $1…$99、${12} 与 $0（整体匹配）、$$（字面 $），
      // 旧实现只认 $1…$9，会把 $10 误当成"组 1 + 字面 0"。
      const expandRep = (rep, m) => {
        if (findMode2 !== "regex" || !m) return rep;
        return String(rep).replace(/\$\$|\$\{(\d{1,2})\}|\$(\d{1,2})/g, (g, braced, plain) => {
          if (g === "$$") return "$";
          const d = braced != null ? braced : plain;
          const v = m[Number(d)];
          return v != null ? v : "";
        });
      };
      const findReplaceOnce = () => {
        const arr = effFindMatches;
        if (!findQ || arr.length === 0 || findIdx >= arr.length) { setFindMsg("无可替换的匹配（可能已到末尾）"); return; }
        const m = arr[findIdx];
        const rep = expandRep(findRep, m.m);
        const next = text.slice(0, m.start) + rep + text.slice(m.end);
        commitProg(next, [m.start + rep.length, m.start + rep.length]);
        // 推进到下一个匹配（按长度差修正下标），避免替换文本自身含查找词时在同一处反复插入
        const nextArr = computeMatches(next, findQ, findOpts, findInSel ? findSelection() : null);
        let ni = 0;
        for (let q = 0; q < nextArr.length; q++) { if (nextArr[q].start >= m.start + rep.length) { ni = q; break; } ni = q + 1; }
        setFindIdx(Math.min(ni, Math.max(0, nextArr.length - 1)));
        setCnt(null);
        // onChange 后 text 更新，matches 重算
      };
      // 替换当前文档所有匹配（替换后再对整个文档重扫，处理“一换多/一换少”方案）
      const findReplaceAll = () => {
        if (!findQ || !effFindMatches.length) return;
        const arr = effFindMatches;
        const out = [];
        let pos = 0;
        for (const m of arr) {
          out.push(text.slice(pos, m.start), expandRep(findRep, m.m));
          pos = m.end;
        }
        out.push(text.slice(pos));
        commitProg(out.join(""), [0, 0]);
        setFindIdx(0);
        setCnt(null);
      };
      // 在所有已打开文件中查找（Notepad++「Find All in All Opened Documents」）：只搜 props.openFiles，不扫磁盘
      const doFindAllInOpenFiles = () => {
        if (!findQ) return;
        const map = props.openFiles || {};
        const paths = Object.keys(map);
        const seen = new Set();
        const rows = [];
        for (const p of paths) {
          const src = (map[p] && map[p].text) || "";
          if (!src) continue;
          const ms = computeMatches(src, findQ, findOpts, null);
          for (const m of ms) {
            const key = p + "::" + m.line; // 按 文件+行 去重
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push({ path: p, line: m.line, col: m.col, text: (findQ.length > 160 ? findQ.slice(0, 160) : findQ), _line: lineTextAt(src, m.line) });
          }
        }
        setResults(tagResults(rows));
        setResultsScope(false);
        setResOpen(true);
        setFindMsg("在所有打开的文件中找到 " + rows.length + " 行（" + paths.length + " 个文件）");
      };
      // 替换所有已打开文件中的匹配（Notepad++「Replace All in All Opened Documents」）
      // 当前文件走 onChange（保持编辑器与草稿同步）；其它已打开文件读出内容→替换→写盘
      const doReplaceAllOpenFiles = async () => {
        if (!findQ) return;
        const map = props.openFiles || {};
        const paths = Object.keys(map);
        if (!paths.length) { setFindMsg("没有已打开的文件"); return; }
        setFindBusy(true);
        setFindMsg("正在替换所有打开的文件…");
        const range = findInSel ? findSelection() : null; // 与当前文档一致的 In selection 语义（仅作用于当前文件）
        let totalRepl = 0, totalFiles = 0;
        const rows = [];
        try {
          for (const p of paths) {
            const meta = map[p] || {};
            const src = meta.text || "";
            if (!src) continue;
            const isCur = (p === (props.path || ""));
            const rng = isCur ? range : null;
            const ms = computeMatches(src, findQ, findOpts, rng);
            if (!ms.length) continue;
            const out = [];
            let pos = 0;
            for (const m of ms) { out.push(src.slice(pos, m.start), expandRep(findRep, m.m)); pos = m.end; }
            out.push(src.slice(pos));
            const next = out.join("");
            if (isCur) {
              commitProg(next); // 当前文档：交给编辑器（受控更新，可撤销）
            } else {
              // 写盘必须还原原编码与原行尾（否则 GBK→UTF-8、CRLF→LF，Verilog 文件会被 Vivado 读坏）
              const w = await apiCall("writeFile", { path: p, content: eolEncode(next, meta.eol), encoding: meta.encoding });
              if (!w || !w.ok) continue; // 单个文件失败不影响其它
              // 同步回标签页状态，避免该文件在另一分栏里仍显示替换前的旧文本
              if (typeof props.onExternalWrite === "function") props.onExternalWrite(p, next);
            }
            totalRepl += ms.length; totalFiles++;
            const seen = new Set();
            for (const m of ms) { if (seen.has(m.line)) continue; seen.add(m.line); rows.push({ path: p, line: m.line, col: m.col, text: (findQ.length > 160 ? findQ.slice(0, 160) : findQ), _line: lineTextAt(src, m.line) }); }
          }
          setResults(tagResults(rows));
          setResultsScope(false);
          setResOpen(true);
          setFindBusy(false);
          setFindMsg(totalRepl ? ("已替换 " + totalRepl + " 处（" + totalFiles + " 个文件）") : "没有找到匹配");
          setFindIdx(0); setCnt(null);
        } catch (e) {
          setFindBusy(false);
          setFindMsg("替换失败: " + fmtErr(e));
        }
      };
      // Mark All：把所有匹配写入 marked（编辑器高亮层 + minimap + 滚动条标记）
      // 「标记所在行(M)」勾选时标记整行范围；并把上一批压栈以支持「清除上次标记」。
      const markLsRef = React.useRef({ text: null, ls: null });
      const markRangeOf = (m) => {
        if (!findMarkLine) return m;
        // 性能：旧实现每个匹配都 split("\n") 全文再 slice+join 求行首偏移，被 doMarkAll
        // 逐匹配调用 → O(匹配数 × 行数)；大文件 + 全部标记会做几十 GB 字符拷贝、冻住主线程。
        // 改为复用 lineStartsOf，并按 text 缓存（同一批只扫描一次）。
        const text = String(props.text);
        if (markLsRef.current.text !== text || markLsRef.current.ls === null) {
          markLsRef.current = { text, ls: lineStartsOf(text) };
        }
        const ls = markLsRef.current.ls;
        const start = m.line <= 1 ? 0 : (ls[m.line - 1] !== void 0 ? ls[m.line - 1] : text.length);
        const lineEnd = m.line < ls.length ? ls[m.line] - 1 : text.length;
        return { start: start, end: Math.max(start + 1, lineEnd), line: m.line, col: 1 };
      };
      const markHistoryRef = React.useRef([]);
      const doMarkAll = () => {
        const batch = effFindMatches.map(markRangeOf);
        // 副作用移出 updater（StrictMode 下 updater 双调用会让历史重复压栈，导致"清除上次"要按两次）
        if (marked.length) {
          markHistoryRef.current.push(marked);
          if (markHistoryRef.current.length > 20) markHistoryRef.current.shift();
        }
        setMarked(batch);
        setCnt(batch.length);
      };
      const doMarkClear = () => { markHistoryRef.current = []; setMarked([]); setCnt(null); };
      // 复制标记文本：把当前所有标记行的文本复制到剪贴板（Notepad++「复制标记文本」）
      const doMarkCopyText = () => {
        if (!marked.length) return;
        const lines = [...new Set(marked.map((m) => m.line))].sort((a, b) => a - b);
        const txt = lines.map((ln) => lineTextAt(text, ln)).join("\n");
        if (txt) copyText(txt);
      };
      // 清除上次标记：回退到最后一批标记（此前与「清除」完全等价，语义未实现）
      const doMarkClearLast = () => {
        const h = markHistoryRef.current;
        if (h.length) { setMarked(h.pop()); }
        else { setMarked([]); }
        setCnt(null);
      };
      // 关闭对话框并清空查找态（保留 marked 高亮供查看，结果面板不关）
      /* 关闭查找框只清临时态（模式/索引/计数），保留查询与替换词：再按 Ctrl+F 应该还是上次的词（VSCode 习惯）。 */
      const findClose = () => { findJumpedRef.current = false; setFindMode(null); setFindTab(findMode === "replace" ? "replace" : "find"); setFindIdx(0); setCnt(null); findShared.open = false; };
      // 点击底部面板某行：跳到当前文档对应位置（或打开跨文件文件并定位行）
      const jumpToResult = (r) => {
        if (r && r.path && r.path === (props.path || "")) {
          // 当前文档：跳到精确匹配位置。优先用 start/end；没有时用 col 定位到匹配列，
          // 长度取查找词长度（旧的 r._qlen 全文件从未赋值过，导致双击只把光标塌陷到行首）。
          let s, e;
          // 匹配长度：优先用结果自带的 len（host 端实际匹配长度，正则/忽略大小写下正确），
          // 否则退回查找词长度（同文件内 doFindAll 的结果）。
          const qlen = (r.len && r.len > 0) ? r.len : (findQ ? findQ.length : 0);
          if (r.start != null) {
            s = r.start;
            e = (r.end != null) ? r.end : (s + qlen);
          } else {
            s = charAtLine(text, r.line) + (r.col ? r.col - 1 : 0);
            e = s + qlen;
          }
          const maxL = String(text).length;
          s = Math.max(0, Math.min(s, maxL));
          e = Math.max(s, Math.min(e, maxL));
          jumpToMatch({ start: s, end: e, line: r.line });
        } else if (r && r.path) {
          if (props.onOpenRequest) props.onOpenRequest(r.path, r.line, r.col || 0);
          else if (props.onOpenPath) props.onOpenPath(r.path);
        }
      };
      const lineTextAt = (txt, ln) => { const ls = String(txt).split("\n"); return (ln >= 1 && ln <= ls.length) ? ls[ln - 1] : ""; };
      const charAtLine = (txt, ln) => { let off = 0, ls = String(txt).split("\n"); for (let i = 0; i < ln - 1 && i < ls.length; i++) off += ls[i].length + 1; return off; };

      /* ---------- ⑩ 面包屑：路径段 + 点击目录列文件 ---------- */
      const [bcDlg, setBcDlg] = React.useState(null); // {dir, x, bottom, entries, hist} | null
      const bcRef = React.useRef(null);
      const loadBcDir = async (dir, anchor, pushHistory) => {
        const a = anchor || { left: 8, bottom: 24 };
        setBcDlg((prev) => {
          const hist = (pushHistory && prev && prev.hist ? prev.hist.concat([prev.dir]) : (prev && prev.hist ? prev.hist : []));
          return { dir, x: a.left, bottom: a.bottom, entries: null, hist };
        });
        const r = await apiCall("listDir", { path: dir });
        if (r && r.ok) setBcDlg((prev) => (prev && prev.dir === dir ? { dir, x: prev.x, bottom: prev.bottom, entries: r.entries || [], hist: prev.hist } : prev));
        // 读取失败必须落成可见状态：否则 entries 永远停在 null，弹层会永久显示「读取中…」且没有任何重试入口
        else setBcDlg((prev) => (prev && prev.dir === dir ? { dir, x: prev.x, bottom: prev.bottom, entries: [], err: (r && r.error) || "读取失败", hist: prev.hist } : prev));
      };
      React.useEffect(() => {
        if (!bcDlg) return;
        const onKey = (e) => { if (e.key === "Escape") setBcDlg(null); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
      }, [bcDlg]);
      const segs = [];
      if (props.path) {
        const parts = props.path.split(/[\\/]/).filter(Boolean);
        let acc = "";
        for (let i = 0; i < parts.length; i++) {
          acc = acc ? acc + "\\" + parts[i] : parts[i];
          segs.push({ label: parts[i], path: acc, last: i === parts.length - 1 });
        }
      }

      /* ---------- ⑮ minimap：右侧缩略导航 ---------- */
      const mmDraw = () => {
        const cvs = mmRef.current, wrap = mmWrapRef.current;
        if (!cvs || !wrap) return;
        const dpr = window.devicePixelRatio || 1;
        const W = cvs.clientWidth || 30, H = cvs.clientHeight || wrap.clientHeight || 120;
        cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
        const g = cvs.getContext("2d");
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        if (lines <= 1) return;
        const hPix = H / lines;
        const rowTone = (ln) => {
          const s = ln.trim();
          if (!s) return null;
          if (s.startsWith("//") || s.startsWith("*") || s.startsWith("/*")) return "#6a8f6a";
          if (s.startsWith("`") || /^(module|endmodule|always|initial|assign|wire|reg|parameter|localparam|input|output|function|endfunction|begin|end|if|else|for|while|case|endcase|generate|endgenerate)\b/.test(s)) return "#5a7fae";
          if (s.indexOf("\"") >= 0 || s.indexOf("'") >= 0) return "#a08a6a";
          return "#808080";
        };
        const lnArr = text.split("\n");
        const useChar = mmChar && lines <= 3000 && W >= 44; // 字符模式：大文件也尽量字符化（类 VSCode）
        if (!useChar) {
          // 色块模式：聚合到整数像素行（多行重叠画同一 y 时后画覆盖），视觉平滑不闪烁
          const pxH = Math.max(1, Math.round(H / lines));
          for (let i = 0; i < lnArr.length; i++) {
            const tone = rowTone(lnArr[i]);
            if (!tone) continue;
            g.fillStyle = tone;
            g.fillRect(0, Math.round(i * hPix), W, Math.max(1, Math.round(hPix)));
          }
          return;
        }
        // 字符模式（类 VSCode "呈现字符"）：把代码文本渲染成缩略字形
        if (hPix >= 1) {
          const fs = Math.max(1, Math.min(6, hPix * 0.9));
          const cw = fs * 0.62;
          const maxCol = Math.max(1, Math.floor((W - 3) / cw));
          g.font = fs + "px Consolas, monospace";
          g.textBaseline = "middle";
          for (let i = 0; i < lnArr.length; i++) {
            const line = lnArr[i];
            const tone = rowTone(line);
            if (!tone) continue;
            const clipped = line.length > maxCol ? line.slice(0, maxCol) : line;
            g.fillStyle = tone;
            g.fillText(clipped.replace(/\s+$/, ""), 2, i * hPix + hPix / 2);
          }
        } else {
          // 行高 <1px（大文件）：每个输出像素行取“覆盖范围中间行”渲染一个代表行，避免叠行糊团
          g.font = "1px Consolas, monospace";
          g.textBaseline = "middle";
          const pxRows = Math.max(1, Math.min(H | 0, lines));
          const maxCol = Math.max(1, Math.floor((W - 3) / 0.62));
          for (let py = 0; py < pxRows; py++) {
            const srcRow = Math.min(lnArr.length - 1, Math.floor(((py + 0.5) / pxRows) * lines));
            const line = lnArr[srcRow];
            const tone = rowTone(line);
            if (!tone) continue;
            const clipped = line.length > maxCol ? line.slice(0, maxCol) : line;
            g.fillStyle = tone;
            g.fillText(clipped.replace(/\s+$/, ""), 2, py + 0.5);
          }
        }
        // 词高亮层：选中的词（findQ 或 selW）在 minimap 中所有匹配行标黄（用 computeMatches 一次算，避免逐匹配 slice/split O(n·k)）
        const hlLines = new Set();
        const highlightWord = (word) => {
          if (!word) return;
          const ms = computeMatches(text, word, { cs: false, whole: false, search: "normal" }, null);
          for (const m of ms) hlLines.add(m.line - 1);
        };
        if (marked.length && !findQ) { for (const mh of marked) hlLines.add(mh.line - 1); }
        else if (findMode && findQ) highlightWord(findQ);
        else if (selW) highlightWord(selW);
        if (hlLines.size) {
          g.fillStyle = "rgba(39, 103, 130, 0.65)";
          for (const ln of hlLines) {
            const y = ln * hPix;
            if (hPix >= 1) g.fillRect(0, y, W, Math.max(1, hPix));
            else g.fillRect(0, Math.round(y), W, 1);
          }
        }
      };
      const mmSyncView = () => {
        const view = mmViewRef.current, wrap = mmWrapRef.current, ta = taRef.current;
        if (!view || !wrap || !ta) return;
        const dpr = window.devicePixelRatio || 1;
        const W = view.clientWidth || 30, H = view.clientHeight || wrap.clientHeight || 120;
        view.width = Math.round(W * dpr); view.height = Math.round(H * dpr);
        const g = view.getContext("2d");
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        const totalH = Math.max(1, lines * LINE_H);
        const cs = ta.selectionStart;
        const cursorLine = String(ta.value).slice(0, cs).split("\n").length;
        // 视口滑块框（半透明蓝框，指示当前可见区域）：滑块模式控制是否显示
        const showSlider = mmSlider === "always" || (mmSlider === "hover" && mmHover);
        if (showSlider) {
          const frac = totalH <= ta.clientHeight ? 0 : ta.scrollTop / totalH;
          const vh = Math.max(8, Math.min(H, ta.clientHeight / totalH * H));
          const vy = Math.min(H - vh, frac * H);
          g.fillStyle = "rgba(57,148,188,.22)";
          g.fillRect(0, vy, W, vh);
          g.strokeStyle = "rgba(57,148,188,.9)";
          g.lineWidth = 1;
          g.strokeRect(0.5, vy + 0.5, W - 1, vh - 1);
          // 光标行指示线（在视口滑块内）
          const ly = (cursorLine - 0.5) * LINE_H / totalH * H;
          if (ly >= vy - 2 && ly <= vy + vh + 2) {
            g.fillStyle = "rgba(255,255,255,.6)";
            g.fillRect(0, ly - 0.75, W, 1.5);
          }
        } else {
          // 未显示滑块框时，若光标行在屏幕内仍画光标线
          const ly = (cursorLine - 0.5) * LINE_H / totalH * H;
          if (ly >= 0 && ly <= H) {
            g.fillStyle = "rgba(255,255,255,.5)";
            g.fillRect(0, ly - 0.75, W, 1.5);
          }
        }
      };
      // 自绘滚动条：右侧细条，显示视口滑块 + 匹配词(查找/Ctrl+D)黄色标记
      /* 横向滚动条：与右侧纵向那条同款自绘（原生滚动条被全局 CSS 隐藏了）。
         内容不宽时整条隐藏，不占地方。 */
      const hbDraw = () => {
        const hb = hbRef.current; if (!hb) return;
        const ta = taRef.current; if (!ta) return;
        const clientW = ta.clientWidth || 50;
        /* 轨道宽就取 textarea 的客户宽：三层已 right:10，右侧那 10px 属于纵向滚动条，两条永不重叠。
           注意不要在这里再减 10（会把可见宽度算小、滑块与文字对不上）。 */
        const trackW = Math.max(40, clientW);
        const nativeMax = Math.max(0, (ta.scrollWidth || 0) - clientW);
        hb.style.display = nativeMax > 0 ? "block" : "none";   // 内容不超宽就不出现（余量不算“有内容”）
        if (nativeMax <= 0) return;
        if (hb.style.width !== trackW + "px") hb.style.width = trackW + "px";
        /* 轨道几何用「原生范围 + 余量」，滑块位置用当前总偏移 hxRef */
        const geom = hbarGeom(clientW, clientW + nativeMax + HB_MARGIN, hxRef.current, trackW);
        const dpr = window.devicePixelRatio || 1;
        const W = hb.clientWidth || clientW, H = hb.clientHeight || 10;
        hb.width = Math.round(W * dpr); hb.height = Math.round(H * dpr);
        const g = hb.getContext("2d");
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        g.fillStyle = "#202122";
        g.fillRect(0, 0, W, H);
        /* 这里曾想给超宽行在轨道上打点，但列号是字符列、轨道是像素宽，比例算出来必然贴在左边（已删）。
           横滑块本身已表达“右边还有内容”，超宽行在纵向滚动条上本来就有蓝/红刻度。 */
        g.fillStyle = "rgba(255,255,255,.15)";
        g.fillRect(geom.vx, 0, geom.vw, H);
        g.strokeStyle = "rgba(255,255,255,.35)";
        g.lineWidth = 1;
        g.strokeRect(geom.vx + 0.5, 0.5, Math.max(0, geom.vw - 1), H - 1);
      };
      /* 把横向总偏移落到画面上：原生部分用 scrollLeft，超出部分用三层一起 translateX。
         三层（高亮层 / 语法文字层 / textarea）必须同时平移，否则文字与高亮/光标错位。 */
      const setExtraShift = (extra) => {
        const tf = extra > 0 ? "translateX(" + (-extra) + "px)" : "";
        if (preRef.current) preRef.current.style.transform = tf;
        if (matchRef.current) matchRef.current.style.transform = tf;
        if (taRef.current) taRef.current.style.transform = tf;
      };
      const applyHScroll = () => {
        const ta = taRef.current; if (!ta) return;
        const clientW = ta.clientWidth || 0;
        const nativeMax = Math.max(0, (ta.scrollWidth || 0) - clientW);
        const hx = Math.max(0, Math.min(hxRef.current, nativeMax + HB_MARGIN));
        hxRef.current = hx;
        const native = Math.min(hx, nativeMax);
        const extra = hx - native;
        hxNativeRef.current = native;
        if (ta.scrollLeft !== native) ta.scrollLeft = native;
        syncScroll(ta.scrollTop, native);   // 层内滚动只给原生量，余量由 translateX 承担
        setExtraShift(extra);
      };
      /* 只在滑块矩形内按下才开始拖动（与缩略图滑块一致）；点在轨道上不跳转 —— 用户明确要求。
         拖动用相对位移：按下时记住鼠标相对滑块左端的偏移，移动时按「滑块左端 = 鼠标 - 偏移」反算，
         所以映射的分母是 (轨道宽 - 滑块宽)，不能复用「点击位置 = 滚动位置」那个 hbarScrollFromX。 */
      const hbMouseDown = (e) => {
        const hb = hbRef.current, ta = taRef.current;
        if (!hb || !ta) return;
        const rect = hb.getBoundingClientRect();
        const clientW = ta.clientWidth || 0;
        const nativeMax = Math.max(0, (ta.scrollWidth || 0) - clientW);
        const trackW = rect.width;
        const geom = hbarGeom(clientW, clientW + nativeMax + HB_MARGIN, hxRef.current, trackW);
        const x = e.clientX - rect.left;
        if (x < geom.vx || x > geom.vx + geom.vw) { e.preventDefault(); return; }   // 没点在滑块上：不跳转，但拦掉默认行为免得编辑器丢焦点
        e.preventDefault();
        e.stopPropagation();
        const grab = x - geom.vx;
        hbDragRef.current = true;
        const move = (ev) => {
          if (!hbDragRef.current) return;
          const mx = Math.max(0, Math.min(trackW, ev.clientX - rect.left)) - grab;
          hxRef.current = hbarScrollFromThumb(mx, trackW, geom.vw, clientW, clientW + nativeMax + HB_MARGIN);
          applyHScroll();
        };
        const up = () => {
          hbDragRef.current = false;
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
          window.removeEventListener("blur", up);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
        window.addEventListener("blur", up);
      };
      /* 横向滚动条的滚轮：显式 passive:false，避免页面同时滚动 */
      React.useEffect(() => {
        const el = hbRef.current;
        if (!el) return;
        const onWheel = (ev) => {
          const ta = taRef.current;
          if (!ta) return;
          ev.preventDefault();
          const d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
          hxRef.current += d;
          applyHScrollRef.current();
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
      }, []);
      const sbDraw = () => {
        const sb = sbRef.current; if (!sb) return;
        const ta = taRef.current; if (!ta) return;
        // 同步滚动条 canvas 高度 = textarea 视口高度（最可靠，不依赖 CSS 100%）
        const taH = ta.clientHeight || 50;
        if (sb.style.height !== taH + "px") sb.style.height = taH + "px";
        const dpr = window.devicePixelRatio || 1;
        const W = sb.clientWidth || 10, H = sb.clientHeight || 100;
        sb.width = Math.round(W * dpr); sb.height = Math.round(H * dpr);
        const g = sb.getContext("2d");
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        // 轨道
        g.fillStyle = "#202122";
        g.fillRect(0, 0, W, H);
        // 每个匹配位置（行）→ y 坐标
        const markLines = new Set();
        const addMarks = (word) => {
          if (!word) return;
          const ms = computeMatches(text, word, { cs: false, whole: false, search: "normal" }, null);
          for (const m of ms) markLines.add(m.line - 1);
        };
        if (marked.length && !findQ) { for (const mh of marked) markLines.add(mh.line - 1); }
        else if (findMode && findQ) addMarks(findQ);
        else if (selW) addMarks(selW);
        const totalH = Math.max(1, lines * LINE_H);
        const maxScroll = Math.max(0, totalH - ta.clientHeight);
        // 匹配标记（与编辑器高亮同色系，不用黄色）
        g.fillStyle = "rgba(39, 103, 130, 0.85)";
        for (const ln of markLines) {
          const y = (ln * LINE_H) / totalH * H;
          g.fillRect(0, y, W, Math.max(1.5, H / lines));
        }
        /* 静态检查：在滚动条对应行位置标红（错误）/橙（警告）/蓝（建议） */
        for (const it of lintIssues) {
          const y = ((it.line - 1) * LINE_H) / totalH * H;
          g.fillStyle = it.sev === "error" ? "rgba(229,83,75,.95)" : (it.sev === "warn" ? "rgba(209,154,102,.95)" : "rgba(77,170,252,.9)");
          g.fillRect(0, y, Math.max(3, W * 0.5), Math.max(1.5, H / Math.max(1, lines)));
        }
        // 视口滑块
        if (maxScroll > 0) {
          const frac = ta.scrollTop / maxScroll;
          const vh = Math.max(8, ta.clientHeight / totalH * H);
          const vy = Math.min(H - vh, frac * (H - vh));
          g.fillStyle = "rgba(255,255,255,.15)";
          g.fillRect(0, vy, W, vh);
          g.strokeStyle = "rgba(255,255,255,.35)";
          g.lineWidth = 1;
          g.strokeRect(0.5, vy + 0.5, W - 1, vh - 1);
        }
      };
      // 滚动条点击/拖动：根据 y 位置滚动到对应行
      const sbScrollToY = (clientY) => {
        const sb = sbRef.current, ta = taRef.current;
        if (!sb || !ta) return;
        const rect = sb.getBoundingClientRect();
        const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
        const frac = y / rect.height;
        const totalH = Math.max(1, lines * LINE_H);
        const maxScroll = Math.max(0, totalH - ta.clientHeight);
        const top = frac * maxScroll;
        ta.scrollTop = top;
        syncScroll(top);
      };
      // 自绘滚动条的滚轮：改为原生监听并显式声明 passive:false。
      // React 的事件系统可能把 wheel 注册为 passive，那样 preventDefault() 无效，
      // 滚轮在滚动条上会同时驱动 textarea 与祖先容器（双重滚动）。
      React.useEffect(() => {
        const el = sbRef.current;
        if (!el) return;
        const onWheel = (ev) => {
          const ta = taRef.current;
          if (!ta) return;
          ev.preventDefault();
          ta.scrollTop += ev.deltaY;
          syncScrollRef.current(ta.scrollTop);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
      }, []);
      const sbMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        sbScrollToY(e.clientY);
        sbDragRef.current = true;
        const move = (ev) => { if (sbDragRef.current) sbScrollToY(ev.clientY); };
        const up = () => {
          sbDragRef.current = false;
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
          window.removeEventListener("blur", up);
        };
        document.addEventListener("mousemove", move);
        window.addEventListener("blur", up);   // 鼠标在窗口外松开时浏览器不派发 mouseup，这里兜底清理
        document.addEventListener("mouseup", up);
      };
      // 统一滚动同步：textarea 之外的显示层（代码高亮 pre、行号 gutter、查找/Ctrl+D 高亮层 match、minimap 视口）都跟随同一 scrollTop
      const syncScroll = (top, left) => {
        if (preRef.current) preRef.current.scrollTop = top;
        if (gutterRef.current) gutterRef.current.style.transform = "translateY(" + (-top) + "px)";
        if (matchRef.current) matchRef.current.scrollTop = top;
        if (left != null) {
          if (preRef.current) preRef.current.scrollLeft = left;
          if (matchRef.current) matchRef.current.scrollLeft = left;
        }
        mmSyncView();
        sbDraw();
        hbDraw();
      };
      /* 静态检查结果变化后重画自绘滚动条（新增独立 effect，尽量不动原有依赖） */
      React.useEffect(() => { try { sbDraw(); } catch (e) { } }, [lintIssues]); // eslint-disable-line react-hooks/exhaustive-deps
      // 供空依赖的 effect（如自绘滚动条的 wheel 监听）取到**最新**的 syncScroll：
      // 它内部会画匹配标记，若捕获首次渲染的版本，滚轮滚动时标记会用旧状态绘制。
      const applyHScrollRef = React.useRef(applyHScroll);
      applyHScrollRef.current = applyHScroll;
      const syncScrollRef = React.useRef(syncScroll);
      syncScrollRef.current = syncScroll;
      const mmJump = (e) => {
        const wrap = mmWrapRef.current, ta = taRef.current;
        if (!wrap || !ta) return;
        const rect = wrap.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const frac = Math.max(0, Math.min(1, y / rect.height));
        const maxScroll = Math.max(0, lines * LINE_H - ta.clientHeight);
        const top = frac * maxScroll;
        ta.scrollTop = top;
        syncScroll(top);
      };
      React.useEffect(() => {
        mmDraw();
        mmSyncView();
        sbDraw();
        hbDraw();
        const onWin = () => { mmDraw(); mmSyncView(); sbDraw(); hbDraw(); };
        window.addEventListener("resize", onWin);
        return () => window.removeEventListener("resize", onWin);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        // props.font 必须进依赖：字号变化会改变 LINE_H，滑块框与匹配标记按 LINE_H 定位，
        // 不进依赖的话缩放后 minimap 滑块会一直停在旧位置，直到下一次滚动才自愈。
      }, [props.text, props.path, props.font, mmChar, mmSlider, findQ, findMode, selW, mmShow, mmHover, mmSize, marked]);
      /* 视图状态：同步记到 ref（便宜），落盘 = 250ms 防抖 + 1.5s 前沿写入（双保险）。
         ref 在滚动事件里就更新，所以即使马上退出（防抖没到点）也能在卸载时落盘；
         前沿写入则保证「进程/页面直接没了」的情况下也有一份足够新的快照。 */
      const lastViewRef = React.useRef({ path: null, top: 0, left: 0, sel: null });
      const viewTimerRef = React.useRef(null);
      const viewWroteAtRef = React.useRef(0);
      const pendingViewRef = React.useRef(null);   // 待恢复的视图（内容还没到位时留着重试）
      const viewApplyingRef = React.useRef(false);  // 正在应用恢复（这期间的 rememberView 不许清 pending）
      /* 结算重试只在"内容刚到位"时需要；正常打字期间绝不能重开窗口——否则每次按键都会
         再排 4 个定时器，并在组字期间调用 setSelectionRange（会打断输入法：拼音被留在正文、
         光标乱跳、编辑区像卡死）。 */
      const pendingNeedContentRef = React.useRef(false);
      /* 输入法组字中（拼音还没上屏）：所有会碰选区/文本的副作用都要让路。 */
      const composingRef = React.useRef(false);
      /* 组字开始前的文本：组字结束时用它压**一个**撤销单元，
         这样 Ctrl+Z 撤的是"整段中文输入"，绝不会停在拼音中间态上。 */
      const composeBaseRef = React.useRef(null);
      const flushView = () => {
        const ta = taRef.current;
        if (ta && props.path) lastViewRef.current = { path: props.path, top: ta.scrollTop || 0, left: ta.scrollLeft || 0, sel: curSelPair() };
        const v = lastViewRef.current;
        if (v && v.path) { viewStore.save(v.path, v); viewWroteAtRef.current = Date.now(); }
      };
      const rememberView = () => {
        const ta = taRef.current;
        if (!ta || !props.path) return;
        if (!viewApplyingRef.current) pendingViewRef.current = null;   // 用户自己在动 → 放弃待恢复项（恢复自身的调用不清）
        lastViewRef.current = { path: props.path, top: ta.scrollTop || 0, left: ta.scrollLeft || 0, sel: curSelPair() };
        if (Date.now() - viewWroteAtRef.current > 1500) flushView();   // 前沿写入
        if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
        viewTimerRef.current = setTimeout(() => { viewTimerRef.current = null; flushView(); }, 250);
      };
      /* 应用一份视图记录。内容还没到（value 为空）时返回 false，交给调用方稍后重试。 */
      const applyView = (vs) => {
        const ta = taRef.current;
        if (!ta || !vs) return false;
        /* 组字期间绝不 setSelectionRange：浏览器会因此结束输入法组字，拼音就留在正文里了 */
        if (composingRef.current) return false;
        const vlen = ta.value.length;
        if (vlen <= 0) return false;
        const sel = Array.isArray(vs.sel) ? [Math.min(vs.sel[0] | 0, vlen), Math.min(vs.sel[1] | 0, vlen)] : null;
        if (sel && sel[1] >= sel[0]) ta.setSelectionRange(sel[0], sel[1]);
        else ta.setSelectionRange(0, 0);
        viewApplyingRef.current = true;
        try {
          ta.scrollTop = Math.max(0, vs.top | 0);
          ta.scrollLeft = Math.max(0, vs.left | 0);
          hxRef.current = ta.scrollLeft; hxNativeRef.current = ta.scrollLeft; setExtraShift(0);
          syncScroll(ta.scrollTop, ta.scrollLeft);
          lastViewRef.current = { path: props.path, top: ta.scrollTop, left: ta.scrollLeft, sel: (sel && sel[1] >= sel[0]) ? sel : null };
          viewWroteAtRef.current = Date.now();
          /* 光标真的动了 → 必须上报：状态栏的 Ln/Col 读的是工作台的 cursor 状态，
             恢复走「内容后到」的重试路径时如果不报，界面会一直显示 Ln 1, Col 1（用户实测）。 */
          reportCursor();
        } finally { viewApplyingRef.current = false; }
        return true;
      };
      /* 恢复并确认（结算式）：value 更新、聚焦、布局变化都可能在本帧之后把滚动重置，
         所以在一个短窗口内（0/120/400/900ms）反复核对：位置对不上就再应用一次。
         用户一旦自己滚动（rememberView 清掉 pending）或窗口结束，就不再干预。 */
      const restoreView = (vs) => {
        if (!vs) return;
        const wantTop = Math.max(0, vs.top | 0);
        const wantLeft = Math.max(0, vs.left | 0);
        pendingViewRef.current = vs;
        pendingNeedContentRef.current = !(taRef.current && taRef.current.value.length > 0);
        const tick = () => {
          if (pendingViewRef.current !== vs) return;      // 用户自己滚过/切了文件 → 不抢
          if (composingRef.current) return;               // 正在用输入法打字 → 绝不碰选区
          const ta = taRef.current;
          if (!ta || ta.value.length <= 0) return;        // 内容还没到 → 交给 props.text 变化时的重试
          if (Math.abs(ta.scrollTop - wantTop) > 2 || Math.abs(ta.scrollLeft - wantLeft) > 2) applyView(vs);
        };
        tick();
        [0, 120, 400, 900].forEach((ms, i) => {
          setTimeout(() => {
            if (pendingViewRef.current !== vs) return;
            tick();
            if (i === 3) pendingViewRef.current = null;   // 结算窗口结束，控制权交还用户
          }, ms);
        });
      };
      /* 卸载（= 退出工作台）时把最后一次视图落盘：防抖可能还没到点 */
      React.useEffect(() => () => {
        if (viewTimerRef.current) { clearTimeout(viewTimerRef.current); viewTimerRef.current = null; }
        flushView();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      /* 页面被隐藏/即将关闭时也立刻落盘（关窗口、切走标签页这两条路径不走卸载清理） */
      React.useEffect(() => {
        const onHide = () => { try { if (document.visibilityState === "hidden") flushView(); } catch (e) { } };
        document.addEventListener("visibilitychange", onHide);
        return () => document.removeEventListener("visibilitychange", onHide);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      const onSc = (e) => {
        const sl = e.target.scrollLeft;
        /* 自己设置 scrollLeft 也会触发 scroll 事件（hxNativeRef 记录的就是它），
           这类事件不能把余量清零，否则刚拖出去的余量立刻被收回。 */
        if (Math.abs(sl - hxNativeRef.current) > 1) {
          hxRef.current = sl;
          setExtraShift(0);
        }
        syncScroll(e.target.scrollTop, sl);
        rememberView();
      };
      const lastPathRef = React.useRef(null);
      React.useEffect(() => {
        const ta = taRef.current;
        if (!ta) return;
        /* 首次进入该文件（含退出工作台后重建、整页刷新）或切到别的文件：都要恢复视图 */
        const prevPath = lastPathRef.current;
        const viewChanged = prevPath !== props.path;
        if (viewChanged && lastViewRef.current.path) viewStore.save(lastViewRef.current.path, lastViewRef.current);   // 离开前先把上一个文件的状态落盘
        lastPathRef.current = props.path;
        hxRef.current = 0; hxNativeRef.current = -1; setExtraShift(0);
        if (props.jump > 0) {
          pendingViewRef.current = null;   // 显式跳转优先，不恢复旧视图
          // 跳转到行：滚动 + 光标放到目标行行首；带 jumpCol 时再偏移到目标列
          const n = Math.max(1, props.jump | 0);
          let off = 0;
          for (let i = 1; i < n; i++) { const idx = text.indexOf("\n", off); if (idx < 0) break; off = idx + 1; }
          off = Math.min(off, text.length);
          // 列偏移（1-based → 绝对偏移），clamp 到本行范围
          let end = off;
          if (props.jumpCol && props.jumpCol > 1) {
            const lineEnd = text.indexOf("\n", off);
            const lineLen = (lineEnd < 0 ? text.length : lineEnd) - off;
            end = Math.min(text.length, off + Math.min(props.jumpCol - 1, lineLen));
          }
          ta.focus();
          ta.setSelectionRange(off, end);
          saveSelRef.current = null;
          ta.scrollTop = Math.max(0, (n - 1) * LINE_H - 40);
          syncScroll(ta.scrollTop);
          // ㉙ 高亮目标行（转到定义/跳转），便于在长文件里定位：1 秒
          setAutoHl(n);
          if (hlTimerRef.current) clearTimeout(hlTimerRef.current);
          hlTimerRef.current = setTimeout(() => setAutoHl(0), 1000);
          reportCursor();
          if (props.onJumpConsumed) props.onJumpConsumed();
        } else if (viewChanged) {
          // 换文件：清残留光标/选区/查找/选词状态，防止串到上一个文件
          saveSelRef.current = null;
          setSelW("");
          setBlk(null);   // 列选择属于「当前文件」，切文件必须清掉
          /* 撤销/重做栈是 CodePane 实例级的（切标签复用同一实例），所以必须"按文件存/取"：
             只清空不行（退出再进来就不能撤了，用户实测），不换更不行（Ctrl+Z 会把上一个文件的文本
             写进当前文件）。这里把上一个文件的历史存进 UNDO_MEM，再把当前文件的接回来。 */
          undoMemSave(prevPath, undoStackRef.current, redoStackRef.current);
          undoStackRef.current.length = 0;
          redoStackRef.current.length = 0;
          const recU = undoMemLoad(props.path);
          if (recU) {
            for (const x of recU.undo) undoStackRef.current.push(x);
            for (const x of recU.redo) redoStackRef.current.push(x);
          }
          typeUnitRef.current.active = false;
          if (typeUnitRef.current.timer) { clearTimeout(typeUnitRef.current.timer); typeUnitRef.current.timer = null; }
          // 光标/选区上报的去重键也要清：否则新文件若恰好与旧文件光标位置相同，会漏报一次
          cursorKeyRef.current = "";
          selInfoKeyRef.current = "";
          setFindMode(null); setFindIdx(0); applyFindPrefs();   // 保留查询/勾选（曾在这里 setFindQ("") 把持久化下来的词抹掉）
          /* 恢复上次的滚动位置与光标；没有记录过就归零（首次打开）。
             内容可能还没到位（挂载后异步读文件），所以 restoreView 失败时会挂到 pendingViewRef，
             等 props.text 变化再试；应用后还会在下一帧核对一次滚动是否被浏览器抹掉。 */
          const vs = viewStore.get(props.path);
          if (vs) {
            restoreView(vs);
          } else {
            pendingViewRef.current = null;
            ta.setSelectionRange(0, 0);
            ta.scrollTop = 0;
            ta.scrollLeft = 0;
            hxRef.current = 0; hxNativeRef.current = 0; setExtraShift(0);
            syncScroll(0, 0);
            lastViewRef.current = { path: props.path, top: 0, left: 0, sel: null };
          }
          reportCursor();
        }
      }, [props.path, props.jump]);
      /* 内容后到就补一次恢复：挂载时异步读文件/换 value 常见于「退出工作台再进来」这条路径。
         平时 pendingViewRef 为 null，这个 effect 等于空转。 */
      React.useEffect(() => {
        const vs = pendingViewRef.current;
        if (!vs) return;
        if (composingRef.current) return;              // 组字期间不干预
        if (!pendingNeedContentRef.current) return;    // 正常打字：不重开结算窗口（原来每次按键都会重开 4 个定时器）
        const ta0 = taRef.current;
        if (!ta0 || ta0.value.length <= 0) return;     // 内容还没到 → 继续等
        pendingNeedContentRef.current = false;
        restoreView(vs);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [props.text]);
      /* 文档被整体替换（还原文件 / 换编码预览）的那一次**渲染**里，DOM 里还是旧内容 ——
         在这里把当时的滚动位置抓下来。不能等 effect 再读：提交时 value 已被换掉，
         而给聚焦中的 textarea 赋 value 会把光标移到末尾、视图可能已经跟着滚走了。
         本次仍要按"停在原处"预览，所以必须拿替换前的值。（用户实测：点「以 UTF-8/GBK 打开」跳到文档末尾） */
      const preSwapRevRef = React.useRef(null);
      const preSwapScrollRef = React.useRef(null);
      if (props.docRev && preSwapRevRef.current !== props.docRev) {
        preSwapRevRef.current = props.docRev;
        const ta0 = taRef.current;
        preSwapScrollRef.current = ta0 ? { top: ta0.scrollTop || 0, left: ta0.scrollLeft || 0 } : null;
      }
      /* 文档被外部整体替换（还原文件 / 按编码重开）：把"属于旧内容"的瞬态状态一次清干净。
         不清的后果（用户实测）：列选矩形留在旧坐标上 → 列模式下原生光标是透明的 → "代码区没有光标"；
         顺带把光标收进新内容的有效范围、并重新上报一次给状态栏，免得 Ln/Col 停在旧位置。 */
      React.useEffect(() => {
        if (!props.docRev) return;
        setBlk(null);
        setSelRange(null);
        setSelW("");
        saveSelRef.current = null;
        pendingViewRef.current = null;
        pendingNeedContentRef.current = false;
        colDragRef.current = null;
        const ta = taRef.current;
        if (ta) {
          try {
            ta.focus();
            /* ★ 不要 Math.min(旧偏移, 新长度)：新解码更短时它把光标夹到**文档末尾**，
               浏览器随即把视图滚到末尾 —— 用户实测"用『以 UTF-8/GBK 打开』就跳到文档末尾，还得翻回去"。
               改成按**同一行同一列**折算新偏移（位置基本不变、视图不会跳），并把滚动位置原样放回。
               内容真的变短时浏览器会自己夹紧滚动，那是必然的，不该由我们再把光标推到末尾。 */
            const vlen = ta.value.length;
            const dv = props.docRev || {};
            /* 优先用"替换前"抓到的滚动位置（见上面渲染期的抓取）；拿不到才退回当前值 */
            const _pre = preSwapScrollRef.current;
            const prevTop = _pre ? _pre.top : ta.scrollTop;
            const prevLeft = _pre ? _pre.left : ta.scrollLeft;
            const wl = Math.max(1, (dv.line | 0) || 1);
            const wc = Math.max(1, (dv.col | 0) || 1);
            const STv = lineStartsOf(String(ta.value));
            const li = Math.min(wl, STv.length) - 1;
            const lineEnd = (li + 1 < STv.length) ? (STv[li + 1] - 1) : vlen;
            const off = Math.max(0, Math.min(STv[li] + (wc - 1), lineEnd, vlen));
            ta.setSelectionRange(off, off);
            ta.scrollTop = prevTop; ta.scrollLeft = prevLeft;
            hxRef.current = ta.scrollLeft; hxNativeRef.current = ta.scrollLeft; setExtraShift(0);
            syncScroll(ta.scrollTop, ta.scrollLeft);
          } catch (err) { }
          lastViewRef.current = { path: props.path, top: ta.scrollTop, left: ta.scrollLeft, sel: curSelPair() };
          reportCursor();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [props.docRev]);
      /* 矩形自愈：文档变短（整体替换、外部改动、切到更短的文件）后矩形可能指向不存在的行，
         直接清掉 —— 否则列模式下光标透明、块光标又画不出来，看起来就是"光标没了"。 */
      React.useEffect(() => {
        const cur = blkRef.current;
        if (!cur) return;
        const n = lintRes.starts.length;
        if (cur.a.line >= n || cur.h.line >= n) setBlk(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [text]);
      const numDivs = [];
      for (let n = 1; n <= lines; n++) {
        numDivs.push(React.createElement("div", { key: n, style: { height: LINE_H, lineHeight: LINE_H + "px", fontSize: fontSz } }, n));
      }
      // mousemove 上报去重用的键缓存（见 reportCursor 内说明）：避免每次鼠标移动都 setState
      const cursorKeyRef = React.useRef("");
      const selInfoKeyRef = React.useRef("");
      const reportCursor = () => {
        const ta = taRef.current;
        if (!ta) return;
        const sel = ta.selectionStart;
        // 记录/清除当前选区：有选区→记录（供选区高亮，查找框开放时点查找框仍保留）；无选区→清空（点未选中处高亮消失）
        // 函数式更新 + 引用相同则返回 prev，避免 mousemove 高频时反复重渲染
        const s0 = ta.selectionStart, e0 = ta.selectionEnd;
        if (e0 > s0) setSelRange((prev) => (prev && prev[0] === s0 && prev[1] === e0) ? prev : [s0, e0]);
        else setSelRange((prev) => (prev === null ? prev : null));
        rememberView();   // 光标/选区一起记：下次进来接着从这儿看
        // ⑬ 光标选区不再是 selW 词时清除残留高亮
        if (selW) {
          const cs0 = ta.selectionStart, ce0 = ta.selectionEnd;
          if (String(props.text).slice(cs0, ce0) !== selW) setSelW("");
        }
        if (typeof props.onCursor === "function") {
          const upTo = String(props.text).slice(0, sel);
          const lf = upTo.lastIndexOf("\n");
          const line = upTo.split("\n").length, col = sel - lf;
          const key = line + ":" + col;
          if (cursorKeyRef.current !== key) {
            cursorKeyRef.current = key;
            props.onCursor({ line, col });
          }
        }
        // ⑳ 上报选区行数（供对话面板显示 "X line selected"）
        // 去重：这两个回调挂在 onMouseMove 上，每次构造新对象都会让接收端 setState，
        // 单纯移动鼠标就能让整块工作台重渲染（大文件明显掉帧）。按内容键去重后再上报。
        if (typeof props.onSelection === "function") {
          const sA = ta.selectionStart, eA = ta.selectionEnd;
          if (eA > sA) {
            const selText = String(props.text).slice(sA, eA);
            const nLines = selText.split("\n").length;
            const key = "1|" + nLines + "|" + sA + "|" + eA;
            if (selInfoKeyRef.current !== key) {
              selInfoKeyRef.current = key;
              /* 带上起止行号（1-based）：对话里把附带的选中代码折成 `文件名#329-334` 引用时要显示它 */
              const _stSel = lineStartsOf(String(props.text));
              props.onSelection({ hasSelection: true, lines: nLines, text: selText, from: blkLineColAt(_stSel, sA).line + 1, to: blkLineColAt(_stSel, eA).line + 1 });
            }
          } else if (selInfoKeyRef.current !== "0") {
            selInfoKeyRef.current = "0";
            props.onSelection({ hasSelection: false, lines: 0, text: "" });
          }
        }
        mmSyncView();
      };
      /* ---------- 撤销 / 重做（自实现） ----------
         受控 textarea 一旦被程序化改写（Tab 缩进、替换、格式化应用），React 会把新值写回 DOM，
         浏览器原生 undo 栈随之失效。此前没有任何自实现栈，于是这些操作全都不可撤销。
         方案：统一走 commit*；连续键入按 600ms 窗口合并成一个撤销单元。 */
      const undoStackRef = React.useRef([]);
      const redoStackRef = React.useRef([]);
      /* 撤销历史按文件存：挂载（= 重新进入工作台/新开分栏）时接回来 */
      const undoPathRef = React.useRef(props.path);
      undoPathRef.current = props.path;
      React.useEffect(() => {
        const rec = undoMemLoad(props.path);
        if (!rec) return;
        const u = undoStackRef.current, r = redoStackRef.current;
        u.length = 0; r.length = 0;
        for (const x of rec.undo) u.push(x);
        for (const x of rec.redo) r.push(x);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      /* 卸载（= 退出工作台）时存起来：下次进来还能接着 Ctrl+Z */
      React.useEffect(() => () => {
        undoMemSave(undoPathRef.current, undoStackRef.current, redoStackRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      const typeUnitRef = React.useRef({ active: false, timer: null });
      const curSelPair = () => {
        const ta = taRef.current;
        return ta ? [ta.selectionStart, ta.selectionEnd] : [0, 0];
      };
      /* enc = 应用这个撤销单元时要一并恢复的"编码状态"（换编码预览用）；
         redoEnc = 反向操作要恢复的编码状态。普通文本编辑两者都是 null。 */
      const pushUndo = (text, sel, enc, redoEnc) => {
        const st = undoStackRef.current;
        st.push({ text: text, sel: sel, enc: enc || null, redoEnc: redoEnc || null });
        if (st.length > 200) st.shift();      // 限深，防大文件吃内存
        redoStackRef.current = [];
      };
      // 用户键入：按 600ms 窗口把连续输入合并成一个撤销单元
      const commitType = (next) => {
        const prev = String(props.text);
        if (next === prev) return;
        pendingViewRef.current = null;                 // 用户自己在打字 → 结算窗口让位
        pendingNeedContentRef.current = false;
        const u = typeUnitRef.current;
        /* ★ 输入法组字期间不压撤销单元：组字中间态就是拼音，压进去以后 Ctrl+Z 会停在拼音上
           （用户实测："撤回的时候我输入的中文变成了 d'sa'd'sa'da"）。
           整段组字在 compositionend 里作为一个单元压入。 */
        if (composingRef.current) {
          if (u.timer) { clearTimeout(u.timer); u.timer = null; }
          u.active = false;
          props.onChange(next);
          return;
        }
        if (!u.active) {
          pushUndo(prev, curSelPair());
          u.active = true;
        }
        if (u.timer) clearTimeout(u.timer);
        u.timer = setTimeout(() => { u.active = false; }, 600);
        props.onChange(next);
      };
      // 程序化编辑（缩进/替换/注释切换…）：每次都是一个独立撤销单元，并可指定编辑后的选区
      const commitProg = (next, sel) => {
        const prev = String(props.text);
        if (next === prev) return;
        pendingViewRef.current = null;                 // 同上：程序化编辑也不再抢视图
        pendingNeedContentRef.current = false;
        pushUndo(prev, curSelPair());
        typeUnitRef.current.active = false;
        if (sel) saveSelRef.current = sel;
        props.onChange(next);
      };
      /* 应用一步的编码状态（换编码预览的撤销/重做要连编码标签一起回到对应状态）。
         预览不写盘，所以这里只改编辑器状态，不动磁盘。 */
      const applyEnc = (e) => {
        if (e && e.enc && typeof props.onUndoEnc === "function") {
          try { props.onUndoEnc(props.path, e.enc); } catch (err) { }
        }
      };
      const doUndo = () => {
        const st = undoStackRef.current;
        if (!st.length) return false;
        const e = st.pop();
        redoStackRef.current.push({ text: String(props.text), sel: curSelPair(), enc: e.redoEnc || null, redoEnc: e.enc || null });
        typeUnitRef.current.active = false;
        saveSelRef.current = e.sel;
        props.onChange(e.text);
        applyEnc(e);
        return true;
      };
      const doRedo = () => {
        const st = redoStackRef.current;
        if (!st.length) return false;
        const e = st.pop();
        undoStackRef.current.push({ text: String(props.text), sel: curSelPair(), enc: e.redoEnc || null, redoEnc: e.enc || null });
        typeUnitRef.current.active = false;
        saveSelRef.current = e.sel;
        props.onChange(e.text);
        applyEnc(e);
        return true;
      };
      /* 工作台级 Ctrl+Z / Ctrl+Y 的路由出口（焦点在文件树/状态栏等编辑器之外时用）：
         只由「当前查找目标」这一份面板消费，避免左右/上下分栏各撤一次；
         编辑器内的 Ctrl+Z 走 taKeyDown，不经过这里。 */
      const lastUndoKeyRef = React.useRef(0);
      React.useEffect(() => {
        const r = props.undoKeyReq;
        if (!r || !r.n || r.dir === 0 || r.n === lastUndoKeyRef.current) return;
        if (!props.isFindTarget) return;
        lastUndoKeyRef.current = r.n;
        if (r.dir > 0) doRedo();
        else if (!doUndo() && typeof props.onUndoEmpty === "function") props.onUndoEmpty(props.path);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [props.undoKeyReq, props.isFindTarget]);
      /* 外部编辑的撤销单元：把外部改动前的文本压进本编辑器的撤销栈（见 CodeWorkbench 的 pushUndoUnit） */
      const lastUndoReqRef = React.useRef(0);
      React.useEffect(() => {
        const r = props.undoReq;
        if (!r || !r.n || r.n === lastUndoReqRef.current) return;
        if (r.path !== props.path) return;   // 只由正在显示该文件的编辑器处理，避免分栏重复压栈
        lastUndoReqRef.current = r.n;
        if (r.prev != null && r.prev !== String(props.text)) pushUndo(r.prev, null, r.enc, r.redoEnc);
        typeUnitRef.current.active = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [props.undoReq]);
      /* 列拖拽状态：null = 没在拖；{ a:{line,col}, h:{line,col} } 锚点 + 最新活动端（都存 ref，避免读到未提交的 state） */
      const colDragRef = React.useRef(null);
      /* 最近一次列块复制的内容：粘贴时据此判断"这是不是一个矩形块"，好按列对齐 */
      const blkClipRef = React.useRef(null);
      /* ---------- 列（矩形）选择的鼠标落点：像素 →（行，显示列） ----------
         为什么这里又用"自己算像素"：矩形必须能拖到**每行文字之后**（虚拟空格，Notepad++/Scintilla 同款），
         而浏览器给的选区端点被夹在真实字符里，永远到不了行尾之后（用户实测："只能拖到每行有字符的边界"）。
         与最早那版失败实现的区别在口径而不在方法：列一律是**显示列**（Tab 展开到 4），
         字宽在**真实文档里**量（DOM 探针，不用 canvas 手写 font 串），Tab 对齐与横向滚动都不会错位。 */
      const blkPosFromPoint = (clientX, clientY) => {
        const ta = taRef.current;
        if (!ta) return { line: 0, col: 0 };
        const st = lintRes.starts;
        const r = ta.getBoundingClientRect();
        const line = Math.max(0, Math.min(st.length - 1, Math.floor((clientY - r.top + (ta.scrollTop || 0) - ED_PAD_TOP) / LINE_H)));
        const adv = measureMonoW(fontSz, preRef.current && preRef.current.parentNode) || 1;
        const px = clientX - r.left + (ta.scrollLeft || 0) - ED_PAD_LEFT;
        /* 不夹到行尾：越过行尾就是虚拟空格（打字时逐行补空格对齐） */
        const col = Math.max(0, Math.floor(px / adv));
        return { line: line, col: col };
      };
      /* 拖拽结束：塌成一点就退出；否则把原生光标收到活动端、并收拢原生选区 */
      const colDragEnd = () => {
        const d = colDragRef.current;
        if (!d) return;
        colDragRef.current = null;
        const cur = d.h ? { a: d.a, h: d.h } : null;
        if (!cur || blkEmpty(cur.a, cur.h)) { setBlk(null); return; }
        setBlk(cur);
        const r = blkNorm(cur.a, cur.h);
        const off = blkCaretOff(lintRes.starts, text, { l0: r.l1, c0: r.c1 });
        const ta = taRef.current;
        if (ta) { try { ta.focus(); ta.setSelectionRange(off, off); } catch (err) { } }
      };
      /* 拖拽中：活动端跟着鼠标（锚点记在 ref 里，不依赖 state 是否已提交） */
      const colDragMove = (e) => {
        const d = colDragRef.current;
        if (!d) return;
        /* 鼠标在窗口外松开时 mouseup 收不到 → 用"没按任何键"兜底收尾（不会一直跟着鼠标跑） */
        if (e && e.buttons === 0) { colDragEnd(); return; }
        const h = blkPosFromPoint(e.clientX, e.clientY);
        d.h = h;
        setBlk((prev) => (prev && prev.h.line === h.line && prev.h.col === h.col) ? prev : { a: d.a, h: h });
      };
      /* 列块粘贴：只要剪贴板里"确实是我们刚复制出去的那个矩形块"（逐字符相同）或当前有列选，
         就按【矩形】粘：剪贴板的第 i 行落到第（起始行 + i）行的同一显示列上，该行原有内容整体右移 ——
         用户要的"把本行内容排到后面"就是这个。有列选时起始行列 = 矩形的左上角；
         没有列选时 = 光标所在的（行，显示列）。
         前两版的问题：① 浏览器默认粘贴把整段插在光标处，第一行在光标、后面几行掉到第 0 列；
         ② 只做"整段插在光标处"还不够 —— 列模式下光标被插件放在矩形右下角，整块会跑到最后一行末尾，
         本行内容（例如刚打的 1111）反而被甩到粘贴块最后一行之后（用户实测）。
         单行剪贴板、以及来自别处的普通多行粘贴，一律交回浏览器。 */
      const blkPaste = (e) => {
        const ta = taRef.current;
        const raw0 = (e && e.clipboardData) ? e.clipboardData.getData("text/plain") : "";
        /* 剪贴板在 Windows 上给的是 CRLF，而缓冲区一律是 LF —— 不归一就会往文件里塞 \r */
        const raw = String(raw0 == null ? "" : raw0).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        if (!ta || !raw || raw.indexOf("\n") < 0) return false;
        const fromBlock = !!(blkClipRef.current && blkClipRef.current === raw);
        if (!fromBlock && !blkRef.current) return false;          // 普通多行粘贴交回浏览器
        const st = lintRes.starts;
        let tgt = null;
        if (blkRef.current) {
          tgt = blkNorm(blkRef.current.a, blkRef.current.h);
        } else {
          const off = ta.selectionStart || 0;
          const lc = blkLineColAt(st, off);
          const s0 = st[lc.line];
          const e0 = (lc.line + 1 < st.length) ? st[lc.line + 1] - 1 : text.length;
          const col0 = visOfChar(text.slice(s0, e0), lc.col);
          tgt = { l0: lc.line, l1: lc.line, c0: col0, c1: col0 };
        }
        const out = blkPasteRect(text, st, tgt, raw.split("\n"));
        if (e && e.preventDefault) e.preventDefault();
        /* 统一走 blkCommit：进撤销栈（Ctrl+Z 可撤）+ 光标收到块的活动端 + 矩形盖住刚粘进去的内容 */
        blkCommit(out.text, out.rect, lineStartsOf(out.text));
        return true;
      };
      const blkMouseDown = (e) => {
        /* Alt+拖拽（Notepad++ 键位）或列模式下的普通拖拽；两者都不拦浏览器默认行为 */
        if (!(e.altKey || colModeRef.current) || e.button !== 0) return false;
        const ta = taRef.current;
        if (!ta) return false;
        e.stopPropagation();
        try { ta.focus(); } catch (err) { }
        saveSelRef.current = null;
        /* 进列模式换成矩形选择：旧的线性选区/选词高亮必须撤掉，否则两套高亮叠画（Notepad++ 同样如此） */
        setSelRange(null);
        setSelW("");
        const p = blkPosFromPoint(e.clientX, e.clientY);
        colDragRef.current = { a: p, h: p };
        setBlk({ a: p, h: p });
        return true;
      };
      /* 点到编辑器之外（别的面板/空白处）也要退出列模式：
         否则矩形高亮会一直留着 —— 用户反馈"点空白区域还高亮、取消不掉"。
         注意：这个 effect 只调用 setBlk（纯 setState），不引用任何会过期的闭包函数。 */
      React.useEffect(() => {
        const onDocDown = (ev) => {
          if (!blkRef.current) return;
          const root = zoomRootRef.current;
          if (root && ev.target && root.contains(ev.target)) return;   // 编辑器内部由 textarea 自己的处理器决定
          setBlk(null);
        };
        document.addEventListener("mousedown", onDocDown, true);
        return () => document.removeEventListener("mousedown", onDocDown, true);
      }, []);
      /* 写回：更新矩形状态 + 把线性光标放到矩形左下角（textarea 只有一段选择，多光标用矩形状态表达） */
      const blkCommit = (nextText, nextRect, st) => {
        const cur = blkRef.current;
        const base = nextRect || (cur ? blkNorm(cur.a, cur.h) : null);
        if (nextRect) setBlk({ a: { line: nextRect.l0, col: nextRect.c0 }, h: { line: nextRect.l1, col: nextRect.c1 } });
        else if (cur) setBlk(null);
        if (!base) return;
        /* 光标放在矩形的活动端（右下角），与「离开列模式光标停最后一个角」口径一致 */
        const off = blkCaretOff(st, nextText, { l0: base.l1, c0: base.c1 });
        if (nextText !== String(props.text)) commitProg(nextText, [off, off]);   // 进撤销栈：列编辑同样可 Ctrl+Z
        else { const ta = taRef.current; if (ta) { try { ta.focus(); ta.setSelectionRange(off, off); } catch (err) { } } }
      };
      /* 执行一条列模式动作（打字 / 退格 / 删除 / Tab / 复制 / 剪切 / 退出） */
      const blkRun = (act) => {
        const cur = blkRef.current;
        if (!cur || !act) return;
        if (act.op === "exit") {
          /* Notepad++：离开列模式时光标停在"最后一个角"（活动端），不是左上角 */
          const hd = cur.h;
          setBlk(null);
          const off1 = blkCaretOff(lintRes.starts, text, { l0: hd.line, c0: hd.col });
          const ta1 = taRef.current;
          if (ta1) { try { ta1.focus(); ta1.setSelectionRange(off1, off1); } catch (err) { } }
          reportCursor();
          return;
        }
        const st = lintRes.starts;
        const rect = blkNorm(cur.a, cur.h);
        if (act.op === "copy" || act.op === "cut") {
          /* 列块复制 = 每行取该列区间；行不够长的补空格补到矩形右边界（"选到右边空白"的那部分不能丢） */
          const payload = blkCopyRows(text, st, rect);
          if (payload) { copyText(payload); blkClipRef.current = payload; }
          if (act.op === "cut") {
            const out = blkApply(text, st, rect, "");
            blkCommit(out.text, out.rect, st);
          }
          return;
        }
        /* apply：矩形 → 逐行改写。零宽矩形上的退格/删除 = 每行删左/右一个字符 */
        let r2 = rect;
        if (act.del === "backspace" && rect.c1 <= rect.c0) r2 = { l0: rect.l0, l1: rect.l1, c0: Math.max(0, rect.c0 - 1), c1: rect.c0 };
        else if (act.del === "delete" && rect.c1 <= rect.c0) r2 = { l0: rect.l0, l1: rect.l1, c0: rect.c0, c1: rect.c0 + 1 };
        const out = blkApply(text, st, r2, act.ins || "");
        blkCommit(out.text, act.exit ? null : out.rect, st);
      };
      /* Alt+Shift+方向键：扩块（Scintilla 键位）。没有块时以当前光标为锚点新建 */
      const blkExtendByKey = (dir) => {
        const st = lintRes.starts;
        const cur = blkRef.current;
        let base = cur;
        if (!base) {
          const ta = taRef.current;
          const p = blkLineColAt(st, ta ? ta.selectionStart : 0);
          base = { a: p, h: p };
        }
        setBlk(blkExtend(base, dir[0], dir[1], text, st));
      };
      /* Ctrl+D：复制当前行（Notepad++ 的 Duplicate Current Line）。
         有矩形块 → 复制块覆盖到的整行；有线性选区 → 复制选区覆盖到的整行；否则当前光标行。
         复制体插在被复制行的下方，光标与矩形块都留在原来的行 → 可以连按多次叠出多份。 */
      const dupCurrentLines = () => {
        const st = lintRes.starts;
        const cur = blkRef.current;
        let l0, l1;
        if (cur) {
          const r = blkNorm(cur.a, cur.h);
          l0 = r.l0; l1 = r.l1;
        } else {
          const ta0 = taRef.current;
          const s0 = ta0 ? ta0.selectionStart : 0;
          const e0 = ta0 ? Math.max(s0, ta0.selectionEnd) : s0;
          l0 = blkLineColAt(st, s0).line;
          l1 = blkLineColAt(st, e0).line;
        }
        const out = dupLines(text, st, l0, l1);
        if (out.text === text) return;
        const ta1 = taRef.current;
        const off = ta1 ? Math.min(ta1.selectionStart, out.text.length) : 0;
        commitProg(out.text, [off, off]);          // 光标留在原行原列
      };
      /* 面包屑上的列选择提示：让用户知道当前处于列模式、怎么退出 */
      const blkChip = () => {
        if (!blk && !colMode) return null;
        const chipProps = {
          title: "列选择（Notepad++ 同款）：Alt+拖拽选块 / 列模式下直接拖拽选块 / Alt+Shift+方向键扩块；直接打字、退格逐行生效；Ctrl+C 复制整块、Ctrl+D 复制这些行；F8 开关列模式；Esc、点一下别处或普通方向键退出",
          style: { flexShrink: 0, marginLeft: 6, padding: "0 6px", fontSize: 11, color: "#d19a66", background: "rgba(209,154,102,.12)", border: "1px solid rgba(209,154,102,.35)", borderRadius: 3, whiteSpace: "nowrap" }
        };
        if (!blk) return React.createElement("span", chipProps, "列模式：拖拽即选列（F8 或 Esc 退出）· v21");
        const r = blkNorm(blk.a, blk.h);
        const rows = r.l1 - r.l0 + 1, cols = r.c1 - r.c0;
        return React.createElement("span", chipProps, (cols > 0 ? ("列选择 " + rows + " 行 × " + cols + " 列 · v21") : ("列选择 " + rows + " 行（多光标输入）· v21")));
      };
      const taKeyDown = (e) => {
        /* ★ 输入法组字期间（拼音还没上屏）绝对不能拦截按键：
           Enter / 空格 是 IME 用来选词上屏的，preventDefault + 程序化改写会把组字打断，
           结果是"拼音被当正文留在缓冲区"（用户实测：撤回后显示的是拼音、不是汉字）。
           e.isComposing 是标准判据，keyCode 229 是部分浏览器/旧版 IME 的兜底。 */
        if (e.isComposing || e.keyCode === 229) return;
        const k = (e.key || "").toLowerCase();
        const mod = e.ctrlKey || e.metaKey;
        /* ★ 列（矩形）选择（Notepad++ 键位）：Alt+Shift+方向键扩块；块存在时打字/退格/删除逐行同时生效；
           Esc 或普通方向键退出。放在 Ctrl+Z 之前不影响撤销：Ctrl 组合键一律返回 null 走原逻辑。 */
        if (e.altKey && e.shiftKey && BLK_DIR[k]) { e.preventDefault(); e.stopPropagation(); blkExtendByKey(BLK_DIR[k]); return; }
        if (blkRef.current) {
          const blkAct = blkKeyPlan(blkRef.current, k, e);
          if (blkAct) {
            if (blkAct.pd) { e.preventDefault(); e.stopPropagation(); }
            blkRun(blkAct);
            return;
          }
        }
        /* F8：列模式开关（打开后普通拖拽即矩形选择，不依赖 Alt —— Alt 会被客户端应用菜单抢）；
           块清空后再按 Esc 才退出列模式（逐级退出，与插件其它 Esc 行为一致）。 */
        if (k === "f8") {
          e.preventDefault(); e.stopPropagation();
          const nx = !colModeRef.current;
          colModeRef.current = nx;
          setColMode(nx);
          setBlk(null);
          return;
        }
        if (k === "escape" && colModeRef.current && !findMode) {
          e.preventDefault(); e.stopPropagation();
          colModeRef.current = false;
          setColMode(false);
          setBlk(null);
          return;
        }
        // Ctrl+Z 撤销 / Ctrl+Y 或 Ctrl+Shift+Z 重做
        if (mod && !e.altKey && k === "z" && !e.shiftKey) {
          e.preventDefault(); e.stopPropagation();
          /* 本编辑器撤销栈已空时交给工作台：转码保存 / 以指定编码重新打开这类操作不改文本，
             不会进文本撤销栈，由工作台的"最近一次代码区操作"记录来回退。 */
          if (!doUndo() && typeof props.onUndoEmpty === "function") props.onUndoEmpty(props.path);
          return;
        }
        if (mod && !e.altKey && ((k === "z" && e.shiftKey) || k === "y")) {
          e.preventDefault(); e.stopPropagation();
          doRedo();
          return;
        }
        // Ctrl+/ ：行注释切换（Verilog 用 //；已注释则去掉）。
        // 必须用 e.code 兼容不同键盘布局；浏览器对 Ctrl+/ 无默认行为，不拦会静默无反应。
        if (mod && !e.altKey && (k === "/" || e.code === "Slash")) {
          e.preventDefault(); e.stopPropagation();
          const ta = taRef.current;
          if (!ta) return;
          const v = String(props.text);
          const cs0 = ta.selectionStart, ce0 = ta.selectionEnd;
          const sLine = (cs0 <= 0 ? 0 : v.lastIndexOf("\n", cs0 - 1) + 1);
          let eLine = v.indexOf("\n", ce0);
          if (eLine < 0) eLine = v.length;
          const block = v.slice(sLine, eLine);
          const ls = block.split("\n");
          const allCommented = ls.every((ln) => ln.trim() === "" || /^\s*\/\//.test(ln));
          const outLines = ls.map((ln) => {
            if (ln.trim() === "") return ln;
            if (allCommented) return ln.replace(/^(\s*)\/\/\s?/, "$1");
            return ln.replace(/^(\s*)/, "$1// ");
          });
          const out = outLines.join("\n");
          commitProg(v.slice(0, sLine) + out + v.slice(eLine), [sLine, sLine + out.length]);
          return;
        }
        // Enter：继承当前行缩进（Verilog 里不继承缩进的话每行都要手敲空格）
        if (k === "enter" && !mod && !e.altKey && !e.shiftKey) {
          const ta = taRef.current;
          if (!ta) return;
          const v = String(props.text);
          const cs0 = ta.selectionStart, ce0 = ta.selectionEnd;
          const lineStart = (cs0 <= 0 ? 0 : v.lastIndexOf("\n", cs0 - 1) + 1);
          const indent = (/^[ \t]*/.exec(v.slice(lineStart, cs0)) || [""])[0];
          e.preventDefault(); e.stopPropagation();
          const ins = "\n" + indent;
          commitProg(v.slice(0, cs0) + ins + v.slice(ce0), [cs0 + ins.length, cs0 + ins.length]);
          return;
        }
        // Tab / Shift+Tab 缩进（textarea 原生 Tab 会移走焦点，必须拦截）：光标处插 4 空格 / 选区整行块缩进或反缩进
        if (k === "tab" && !mod && !e.altKey) {
          e.preventDefault(); e.stopPropagation();
          const ta = taRef.current;
          if (!ta) return;
          const v = String(props.text);
          const cs0 = ta.selectionStart, ce0 = ta.selectionEnd;
          const isSel = ce0 > cs0;
          if (!e.shiftKey) {
            if (!isSel) {
              commitProg(v.slice(0, cs0) + "    " + v.slice(cs0), [cs0 + 4, cs0 + 4]);
            } else {
              // 整行块缩进：选区首行行首 ~ 末行行尾，逐行前置 4 空格，保持选中整块
              const sLine = (cs0 <= 0 ? 0 : v.lastIndexOf("\n", cs0 - 1) + 1);
              let eLine = v.indexOf("\n", ce0);
              if (eLine < 0) eLine = v.length;
              const block = v.slice(sLine, eLine);
              const ind = block.split("\n").map((ln) => "    " + ln).join("\n");
              commitProg(v.slice(0, sLine) + ind + v.slice(eLine), [sLine, sLine + ind.length]);
            }
          } else {
            // Shift+Tab：每行去掉至多 4 个前导空格
            const sLine = (cs0 <= 0 ? 0 : v.lastIndexOf("\n", cs0 - 1) + 1);
            let eLine = v.indexOf("\n", ce0);
            if (eLine < 0) eLine = v.length;
            const block = v.slice(sLine, eLine);
            const un = block.split("\n").map((ln) => {
              const m = ln.match(/^ {1,4}/);
              if (m) return ln.slice(m[0].length);
              return ln;
            }).join("\n");
            const uni = v.slice(0, sLine) + un + v.slice(eLine);
            if (!isSel) {
              // 光标行：把光标保持在原行（减去已删空格量中光标前部分）
              const preSp = v.slice(sLine, cs0).match(/^ {1,4}/);
              const d = preSp ? preSp[0].length : 0;
              const nc = Math.max(sLine, cs0 - d);
              commitProg(uni, [nc, nc]);
            } else {
              commitProg(uni, [sLine, sLine + un.length]);
            }
          }
          return;
        }
        // Ctrl+F/H 打开时若有选区 → 预填到查找框（VSCode 行为）
        const openFindBar = (mode) => {
          const ta = taRef.current;
          if (ta && ta.selectionEnd > ta.selectionStart) {
            const w = String(props.text).slice(ta.selectionStart, ta.selectionEnd);
            if (w && w.length <= 200) setFindQ(w);
          }
          setFindMode(mode); setFindTab(mode); setFindIdx(0);
          const refEl = mode === "replace" ? repInputRef : findInputRef;
          setTimeout(() => { try { if (refEl.current) refEl.current.focus(); if (refEl.current) refEl.current.select(); } catch (err) { } }, 30);
        };
        // Ctrl+Shift+F：在文件中查找（跨文件）—— 必须排在 Ctrl+F 之前，否则会被 Ctrl+F 分支吞掉而永不生效
        if (mod && e.shiftKey && k === "f") { e.preventDefault(); e.stopPropagation(); openFindBar("files"); return; }
        if (mod && !e.shiftKey && k === "f") { e.preventDefault(); e.stopPropagation(); openFindBar("find"); return; }
        if (mod && k === "h") { e.preventDefault(); e.stopPropagation(); openFindBar("replace"); return; }
        /* Ctrl+D：复制当前行（Notepad++ 的 Duplicate Current Line，已核实官方手册）。
           原来的"选词/跳到下一个同词"（VSCode 习惯）挪到 Ctrl+Alt+D —— 浏览器里 Ctrl+Shift+D 是保留键，
           Ctrl+Alt 前缀是本插件对保留键的一贯做法（Ctrl+Alt+N / Ctrl+Alt+S 同理）。 */
        if (mod && !e.altKey && k === "d") { e.preventDefault(); e.stopPropagation(); dupCurrentLines(); return; }
        // ⑬ Ctrl+Alt+D：选中当前词（首次）→ 再次按下跳到下一个相同词；Ctrl+Alt+Shift+D 反向
        // （textarea 无真多光标 → "逐词选中+全部同词高亮"近似）
        if (mod && e.altKey && k === "d") {
          e.preventDefault(); e.stopPropagation();
          const dir = e.shiftKey ? -1 : 1;
          const ta = taRef.current;
          if (!ta) return;
          const txt = String(props.text);
          const cs = ta.selectionStart, ce = ta.selectionEnd;
          const selected = txt.slice(cs, ce);
          const takeWord = () => {
            const pre = txt.slice(0, cs).match(/([A-Za-z_][A-Za-z0-9_]*)$/);
            const post = txt.slice(ce).match(/^([A-Za-z0-9_]*)/);
            return (pre ? pre[1] : "") + (post ? post[1] : "");
          };
          // 已有手动选区（拖选 / Shift+方向键）且是合法标识符时，直接用它作词 ——
          // 旧写法只在 selected === selW 时才认，导致拖选整词后 Ctrl+D 取不到词、静默无反应。
          const word = (selected && /^[A-Za-z_][A-Za-z0-9_]*$/.test(selected)) ? selected
            : ((selected === selW && selW) ? selW : takeWord());
          if (!word) return;
          // 收集同名位置：优先整词边界，退而求其次才用子串匹配
          const collect = (wholeOnly) => {
            const res = [];
            let i = txt.indexOf(word);
            while (i >= 0) {
              const okL = (i === 0) || !/[A-Za-z0-9_]/.test(txt[i - 1]);
              const okR = (i + word.length >= txt.length) || !/[A-Za-z0-9_]/.test(txt[i + word.length]);
              if (!wholeOnly || (okL && okR)) res.push(i);
              i = txt.indexOf(word, i + Math.max(1, word.length));
            }
            return res;
          };
          let starts = collect(true);
          if (!starts.length) starts = collect(false);
          if (!starts.length) return;
          // 决定当前落在哪个匹配：优先选区起点所在匹配，否则光标左侧最近匹配
          let cur = 0;
          if (selected === word) {
            // 从选区起点找包含它的匹配
            let found = false;
            for (let q = 0; q < starts.length; q++) {
              if (cs >= starts[q] && cs <= starts[q] + word.length) { cur = q; found = true; break; }
            }
            if (!found) cur = 0;
          } else {
            for (let q = 0; q < starts.length; q++) {
              if (starts[q] <= cs) cur = q;
              else break;
            }
          }
          const n = starts.length;
          const target = (selected === word) ? ((cur + dir + n) % n) : cur;
          const s = starts[target];
          setSelW(word);
          ta.focus();
          ta.setSelectionRange(s, s + word.length);
          const lineNo = txt.slice(0, s).split("\n").length;
          const top = Math.max(0, (lineNo - 1) * LINE_H - 60);
          ta.scrollTop = top;
          syncScroll(top);
          return;
        }
        if (findMode && (findTab === "find" || findTab === "replace") && k === "enter") { e.preventDefault(); e.stopPropagation(); findJump(e.shiftKey ? -1 : 1); return; }
        if (findMode && k === "escape") { e.preventDefault(); e.stopPropagation(); findClose(); return; }
        if (!findMode && k === "escape" && selW) { e.preventDefault(); e.stopPropagation(); setSelW(""); return; }
        /* 查找框已关时再按 Esc：清掉 Mark All 的残留标记与计数（此前只能重开查找框去点「清除」，会觉得去不掉） */
        if (!findMode && k === "escape" && marked.length) { e.preventDefault(); e.stopPropagation(); setMarked([]); setCnt(null); return; }
      };
      /* ---------- 双击选词（无闪烁精确词选） ---------- */
      // 词字符除字母数字下划线外还要含 $ 与 ' ：Verilog 里 $display 的 $ 是词首、
      // 8'hFF / 'd0 的数字与单引号属于同一个记号，旧词集把它们切掉只选到 display / hFF。
      const isWordCh = (ch) => /[A-Za-z0-9_$']/.test(ch);
      const isBlankCh = (ch) => ch === " " || ch === "\t";
      const selectWordAt = (ta, caret) => {
        const v = String(props.text), len = v.length;
        const c = Math.max(0, Math.min(len, caret));
        let s = c; while (s > 0 && isWordCh(v[s - 1])) s--;
        let en = c; while (en < len && isWordCh(v[en])) en++;
        if (en > s) { ta.setSelectionRange(s, en); return true; }
        // 光标在空白上：选中这一整段连续空白（与 VSCode 一致），而不是跳到右边下一个词
        if (c < len && isBlankCh(v[c])) {
          let bs = c, be = c;
          while (bs > 0 && isBlankCh(v[bs - 1])) bs--;
          while (be < len && isBlankCh(v[be])) be++;
          if (be > bs) { ta.setSelectionRange(bs, be); return true; }
        }
        // 其它符号上：向右找最近词
        let j = c; while (j < len && !isWordCh(v[j])) j++;
        let s2 = j; while (s2 < len && isWordCh(v[s2])) s2++;
        if (s2 > j) { ta.setSelectionRange(j, s2); return true; }
        return false;
      };
      const onTMDown = (e) => {
        const now = Date.now(), dx = e.clientX - dblState.current.x, dy = e.clientY - dblState.current.y;
        const second = (now - dblState.current.t) < 500 && Math.abs(dx) < 6 && Math.abs(dy) < 6;
        dblState.current = { t: now, x: e.clientX, y: e.clientY };
        if (second) e.preventDefault(); // 阻止第二次点击默认“重新放光标/开始词选”，避免先全选后收缩的闪烁
      };
      const onTMUp = (e) => {
        const now = Date.now(), dx = e.clientX - dblState.current.x, dy = e.clientY - dblState.current.y;
        const second = (now - dblState.current.t) < 500 && Math.abs(dx) < 6 && Math.abs(dy) < 6;
        if (second) e.preventDefault(); // 阻止第二次 mouseup 的浏览器默认词选
      };
      const onTDbl = (e) => {
        e.preventDefault();
        const ta = e.currentTarget;
        if (!ta) return;
        // 第二次 mousedown 被拦截后，caret 停在第一次点击处（同词内）
        if (selectWordAt(ta, ta.selectionStart)) {
          // 设置 selW，让 minimap 高亮所有匹配词的行
          const v = String(props.text);
          const sel = v.slice(ta.selectionStart, ta.selectionEnd);
          if (sel && sel.length > 0 && isWordCh(sel[0])) {
            setSelW(sel);
          }
          reportCursor();
        }
      };
      return React.createElement("div", { ref: zoomRootRef, className: "carddesk-editor", style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0, position: "relative", background: C.editorBg } },
        /* 面包屑条（⑩）：路径段，点击目录弹该目录文件列表 */
        React.createElement("div", { ref: bcRef, style: { height: 22, flexShrink: 0, minWidth: 0, display: "flex", alignItems: "center", padding: "0 8px", borderBottom: "1px solid #2A2B2C", background: "#121314", fontSize: 11, color: "#8C8C8C", overflowX: "auto", whiteSpace: "nowrap", position: "relative", gap: 2, userSelect: "none" } },
          segs.map((sg, si) => React.createElement(React.Fragment, { key: si },
            React.createElement("span", { style: { color: "#5a5a5a" } }, si ? "›" : ""),
            React.createElement("span", {
              onClick: (e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                // 目录段→该目录列表；文件名段→其所在目录列表（VSCode 面包屑同款）
                const dir = sg.last ? (si > 0 ? segs[si - 1].path : sg.path) : sg.path;
                loadBcDir(dir, { left: r.left, bottom: r.bottom + 2 });
              },
              style: { cursor: "pointer", color: sg.last ? "#e8e8e8" : "#4DAAFC", padding: "1px 4px", borderRadius: 2 },
              onMouseEnter: (e) => { e.currentTarget.style.background = "rgba(57,148,188,.18)"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
            }, sg.label))),
          blkChip(),
          React.createElement("span", {
            onClick: (e) => { e.stopPropagation(); setMmShow(!mmShow); },
            title: mmShow ? "关闭缩略图" : "显示缩略图",
            style: { marginLeft: "auto", flexShrink: 0, cursor: "pointer", color: mmShow ? "#4DAAFC" : "#5a5a5a", padding: "0 4px", fontSize: 12 },
            onMouseEnter: (e) => { e.currentTarget.style.color = "#fff"; },
            onMouseLeave: (e) => { e.currentTarget.style.color = mmShow ? "#4DAAFC" : "#5a5a5a"; }
          }, mmShow ? "🗍" : "▤"),
          bcDlg ? React.createElement(React.Fragment, { key: "bcdlg" },
            React.createElement("div", {
              style: { position: "fixed", top: Math.min(bcDlg.bottom || 24, Math.max(4, (window.innerHeight || 800) - 344)), left: Math.max(4, Math.min((bcDlg.x || 8) - 120, (window.innerWidth || 1280) - 284)), zIndex: 60, width: 280, maxHeight: 340, overflowY: "auto", background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 4, boxShadow: "0 4px 14px rgba(0,0,0,.45)", padding: "4px 0", fontSize: 12 }
            },
              React.createElement("div", { style: { padding: "3px 10px", color: "#4DAAFC", wordBreak: "break-all", borderBottom: "1px solid #2A2B2C", cursor: "pointer" }, onClick: () => {
                const h = bcDlg.hist || [];
                // 第二形参是 anchor 对象 {left,bottom}，此前误传数字 bcDlg.x → 弹层跳到左上角默认位置
                if (h.length) loadBcDir(h[h.length - 1], { left: bcDlg.x, bottom: bcDlg.bottom }, false);
                else setBcDlg(null);
              } }, bcDlg.hist && bcDlg.hist.length ? "↑ 上级目录" : "…"),
              (bcDlg.err)
                ? React.createElement("div", { style: { padding: "8px 10px", color: "#d19a66", wordBreak: "break-all" } }, "读取失败：" + String(bcDlg.err))
                : (bcDlg.entries === null)
                ? React.createElement("div", { style: { padding: "8px 10px", color: "#9d9d9d" } }, "读取中…")
                : (bcDlg.entries.length === 0
                  ? React.createElement("div", { style: { padding: "8px 10px", color: "#858889" } }, "（空目录）")
                  : bcDlg.entries.map((en) => React.createElement("div", {
                    key: en.path,
                    onClick: () => {
                      if (en.type === "directory") loadBcDir(en.path, { left: bcDlg.x, bottom: bcDlg.bottom }, true);
                      else { if (props.onOpenPath) props.onOpenPath(en.path); setBcDlg(null); }
                    },
                    style: { padding: "3px 10px", cursor: "pointer", color: "#BBBEBF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                    onMouseEnter: (e) => { e.currentTarget.style.background = "#1E1F20"; },
                    onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
                  }, (en.type === "directory" ? "📁 " : "📄 ") + en.name)))),
            /* 关闭面包屑弹层（点击空白处）：遮罩为兄弟节点且 z55 < 弹层 z60，弹层列表可正常点击 */
            React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 55 }, onClick: () => setBcDlg(null) }))
          : null),
        /* 编辑器行：行号 + 代码 + minimap */
        React.createElement("div", { style: { display: "flex", flex: 1, minHeight: 0, minWidth: 0, position: "relative" } },
          lintTipEl,
          React.createElement("div", { style: { width: 52, overflow: "hidden", position: "relative", background: "#121314", userSelect: "none", flexShrink: 0, order: 1 } },
            React.createElement("div", { ref: gutterRef, style: Object.assign({ transform: "translateY(0)", paddingTop: 12, paddingRight: 6, textAlign: "right", color: "#858889", willChange: "transform" }, mono) }, numDivs)),
          React.createElement("div", { style: { flex: 1, position: "relative", minWidth: 0, background: C.editorBg, order: 2, overflow: "hidden" } },   // overflow:hidden 必须留着：行尾余量用 translateX 实现，不裁就会溢出到行号栏/左侧面板
            /* 层序（自下而上）：高亮背景层 → 语法文字层 → textarea 交互层。
               高亮背景必须画在文字【下方】，否则半透明高亮会把文字染色/盖住（VSCode 同为该分层）。 */
            /* 高亮背景层：⑨ 查找匹配（优先）或 ⑬ Ctrl+D 选词全部出现；Mark All 时用 marked 集 */
            /* 三层（高亮层 / 语法文字层 / textarea）坐标必须完全一致：right:10 把最右边 10px 让给自绘纵向滚动条，
               padding 统一为 12/96/22/16（右 96 = 行尾余量，可滚过最后一个字符；下 22 = 不被横向滚动条压住）。
               任何一层单独改 padding/right 都会让高亮与文字错位。 */
            (overlayHtml ? React.createElement("pre", { ref: matchRef, dangerouslySetInnerHTML: { __html: overlayHtml }, style: Object.assign({ position: "absolute", top: 0, left: 0, right: 10, bottom: 0, margin: 0, padding: "12px 96px 22px 16px", overflow: "hidden", whiteSpace: "pre", color: "transparent", pointerEvents: "none", tabSize: 4 }, mono) }) : null),
            React.createElement("pre", { ref: preRef, dangerouslySetInnerHTML: { __html: codeHtml }, style: Object.assign({ position: "absolute", top: 0, left: 0, right: 10, bottom: 0, margin: 0, padding: "12px 96px 22px 16px", overflow: "hidden", whiteSpace: "pre", color: C.text, tabSize: 4, pointerEvents: "none" }, mono) }),
            React.createElement("textarea", { ref: taRef, value: props.text, onChange: (e) => {
              const ta0 = e.currentTarget;
              if (ta0) saveSelRef.current = [ta0.selectionStart, ta0.selectionEnd];
              if (selW) setSelW("");
              commitType(e.target.value);   // 走撤销栈（连续键入按 600ms 合并为一个撤销单元）
            },
              /* 组字状态：组字期间的选区/滚动干预一律让路（否则输入法会被打断） */
              onCompositionStart: () => { composingRef.current = true; composeBaseRef.current = String(props.text); },
              onCompositionEnd: (e) => {
                composingRef.current = false;
                const base = composeBaseRef.current;
                composeBaseRef.current = null;
                const finalText = String(e.target.value);
                /* 整段组字算**一个**撤销单元：Ctrl+Z 一次回到组字之前（不会停在拼音中间态）。
                   这里直接压栈 + 直写，不再走 commitType（否则会把拼音中间态又压一次）。 */
                if (base != null && base !== finalText) pushUndo(base, curSelPair());
                const u0 = typeUnitRef.current;
                u0.active = false;
                if (u0.timer) { clearTimeout(u0.timer); u0.timer = null; }
                if (String(props.text) !== finalText) {
                  pendingViewRef.current = null;
                  pendingNeedContentRef.current = false;
                  props.onChange(finalText);
                }
              },
              onScroll: onSc, onClick: reportCursor, onKeyUp: reportCursor, onSelect: reportCursor,
              onMouseDown: (e) => { if (blkMouseDown(e)) return; if (blkRef.current) setBlk(null); onTMDown(e); }, onMouseUp: (e) => { colDragEnd(); onTMUp(e); }, onMouseMove: (e) => { if (colDragRef.current) colDragMove(e); reportCursor(e); lintHover(e); }, onMouseLeave: () => { if (lintTip) setLintTip(null); }, onDoubleClick: onTDbl,
              onFocus: () => { if (props.onEditorFocus) props.onEditorFocus(props.path); },
              onKeyDown: taKeyDown, onPaste: blkPaste, onCopy: () => { blkClipRef.current = null; }, spellCheck: false, wrap: "off", style: Object.assign({ position: "absolute", top: 0, left: 0, right: 10, bottom: 0, background: "transparent", border: "none", outline: "none", resize: "none", whiteSpace: "pre", overflow: "auto", color: "transparent", caretColor: (blk && blk.h.line < lines && blk.a.line < lines) ? "transparent" : "#aeafad", tabSize: 4, padding: "12px 96px 22px 16px" }, mono) }),
            /* 自绘滚动条（右侧，含匹配词黄色标记；textarea 原生滚动条已隐藏） */
            React.createElement("canvas", { ref: sbRef, style: { position: "absolute", top: 0, right: 0, width: 10, height: "100%", cursor: "pointer" }, onMouseDown: sbMouseDown }),
            /* 横向滚动条（底部，right 留 10px 避开纵向那条；不需要时 hbDraw 会把它 display:none） */
            React.createElement("canvas", { ref: hbRef, style: { position: "absolute", left: 0, right: 10, bottom: 0, height: 10, display: "none", cursor: "pointer" }, onMouseDown: hbMouseDown }),
            /* ⑨ Notepad++ 风格多 Tab 查找对话框（Portal 到 body，脱离分栏层叠，不被右栏盖；仅“当前查找目标”面板渲染，实现全局一个查找框） */
            (findMode && isFindTarget) ? React.createElement(React.Fragment, null, (createPortal ? createPortal(React.createElement(FindDialog, {
              findMode, setFindMode,
              findTab, setFindTab,
              findQ, setFindQ,
              findRep, setFindRep,
              findIdx, setFindIdx,
              findCS, setFindCS,
              findWhole, setFindWhole,
              findBack, setFindBack,
              findWrap, setFindWrap,
              findInSel, setFindInSel,
              findMode2, setFindMode2,
              findQHist, setFindQHist,
              findRepHist, setFindRepHist,
              cnt, setCnt,
              findMatches, effFindMatches,
              flex: props, // 供 onOpenPath/onChange 等：find mode 对话框需要的宿主上下文
              text, C,
              op: {
                findInputRef, repInputRef, findFixInputRef,
                findFocusRef, findSelRangeRef,
                findJump, doCount, doFindAll, swapFR,
                findReplaceOnce, findReplaceAll,
                doMarkAll, doMarkClear, findClose,
                doMarkCopyText, doMarkClearLast,
                jumpToResult, lineTextAt, charAtLine,
                doFindAllInFiles, doReplaceAllOpenFiles, doFindAllInOpenFiles,
                findMatchNL, setFindMatchNL, findOpacity, setFindOpacity,
                findLoseFocus, setFindLoseFocus, findDir, setFindDir,
                findFilter, setFindFilter, findRecurse, setFindRecurse,
                findHidden, setFindHidden, findCurDir, setFindCurDir, findBusy, findMsg,
                findCurDirPath: curFileDir, pickFindDir,
                doFindInProjects,
                findPanel1, setFindPanel1, findPanel2, setFindPanel2, findPanel3, setFindPanel3,
                folders: props.folders || [], projPanelLabel,
                findProj, setFindProj, findMarkLine, setFindMarkLine,
                marked, setMarked, results, setResults, resOpen, setResOpen, resultsScope, setResultsScope
              }
            }), document.body) : null)) : null),
            /* ⑩ 底部停靠 Search results 面板（编辑区下方；双击跳转） */
            (resOpen ? React.createElement(SearchResultsPanel, {
              results, findQ, C, findCS, findWhole, findMode2,
              op: { jumpToResult, setResults, setResOpen, resultsScope, setResultsScope }
            }) : null),
          /* ⑮ minimap（右键菜单：呈现字符/色块 · 滑块开关） */
          /* ⑮ minimap：可开关 + 词高亮 + 右键菜单 */
          !mmShow ? null : React.createElement("div", { ref: mmWrapRef, onMouseEnter: () => { setMmHover(true); }, onMouseLeave: () => { setMmHover(false); }, style: { width: mmW, flexShrink: 0, order: mmSide === "left" ? 0 : 3, position: "relative", background: "#202122", borderLeft: mmSide === "left" ? "none" : "1px solid #191A1B", borderRight: mmSide === "left" ? "1px solid #191A1B" : "none", overflow: "hidden", cursor: "pointer",
            /* 垂直大小：auto = 撑满整列；数字 = 只占编辑器高度的对应百分比（此前 setMmSize 只写不读，菜单点了没反应） */
            alignSelf: mmSize === "auto" ? "stretch" : "flex-start",
            height: mmSize === "auto" ? "100%" : (mmSize + "%") }, onClick: mmJump, onContextMenu: (e) => {
            e.preventDefault(); e.stopPropagation();
            // 原生 DOM 右键菜单：挂到 body，脱离 overflow 容器（backdrop-filter 会使 fixed 失效）
            const cx = e.clientX, cy = e.clientY;
            const old = document.getElementById("carddesk-mm-menu");
            if (old) old.remove();
            const menu = document.createElement("div");
            menu.id = "carddesk-mm-menu";
            menu.style.cssText = "position:fixed;z-index:99999;background:#191A1B;border:1px solid #3C3C3C;border-radius:4px;box-shadow:0 4px 14px rgba(0,0,0,.45);padding:4px 0;font-size:12px;min-width:180px;color:#e6e6e6;";
            const top = Math.min(cy, (window.innerHeight||800)-260);
            const left = Math.max(4, Math.min(cx, (window.innerWidth||1280)-190));
            menu.style.top = top+"px"; menu.style.left = left+"px";
            const mk = (txt, oncl) => { const d = document.createElement("div"); d.style.cssText = "padding:4px 12px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;"; d.onmouseenter = () => { d.style.background = "#3994BC"; }; d.onmouseleave = () => { d.style.background = "transparent"; }; d.onclick = () => { oncl(); menu.remove(); }; const s = document.createElement("span"); s.textContent = txt; d.appendChild(s); menu.appendChild(d); return d; };
            // 级联子菜单：hover 时在右侧弹出子菜单
            const mkSub = (label, items) => {
              const d = document.createElement("div");
              d.style.cssText = "padding:4px 12px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;";
              const s = document.createElement("span"); s.textContent = label; d.appendChild(s);
              const arrow = document.createElement("span"); arrow.textContent = "▸"; arrow.style.color = "#7a7a7a"; d.appendChild(arrow);
              menu.appendChild(d);
              let sub = null; let hideTimer = null;
              const removeSub = () => { if (sub && sub.parentNode) { sub.parentNode.removeChild(sub); sub = null; } };
              const scheduleHide = () => { if (hideTimer) clearTimeout(hideTimer); hideTimer = setTimeout(removeSub, 300); };
              const cancelHide = () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } };
              d.onmouseenter = () => { d.style.background = "#3994BC"; cancelHide(); removeSub(); const r = d.getBoundingClientRect(); sub = document.createElement("div"); sub.style.cssText = "position:fixed;z-index:100000;background:#191A1B;border:1px solid #3C3C3C;border-radius:4px;box-shadow:0 4px 14px rgba(0,0,0,.45);padding:4px 0;font-size:12px;min-width:120px;color:#e6e6e6;"; sub.style.top = r.top + "px"; sub.style.left = (r.right + 2) + "px"; items.forEach(it => { const id = document.createElement("div"); id.style.cssText = "padding:4px 12px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;"; id.onmouseenter = () => { cancelHide(); id.style.background = "#3994BC"; }; id.onmouseleave = () => { id.style.background = "transparent"; scheduleHide(); }; id.onclick = () => { it.fn(); removeSub(); menu.remove(); }; const is = document.createElement("span"); is.textContent = it.label; id.appendChild(is); if (it.checked) { const ck = document.createElement("span"); ck.textContent = "✓"; ck.style.color = "#3994BC"; id.appendChild(ck); } sub.appendChild(id); }); document.body.appendChild(sub); };
              d.onmouseleave = () => { d.style.background = "transparent"; scheduleHide(); };
              d.onclick = () => { d.style.background = "#3994BC"; };
              return d;
            };
            const mkSep = () => { const d = document.createElement("div"); d.style.cssText = "height:1px;background:#3C3C3C;margin:3px 0;"; menu.appendChild(d); };
            mk("缩略图 " + (mmShow ? "✓" : ""), () => setMmShow(!mmShow));
            mkSep();
            mk("呈现字符 " + (mmChar ? "✓" : ""), () => setMmChar(true));
            mk("色块", () => setMmChar(false));
            mkSep();
            mkSub("垂直大小", [
              { label: "自动", checked: mmSize === "auto", fn: () => setMmSize("auto") },
              { label: "100%", checked: mmSize === "100", fn: () => setMmSize("100") },
              { label: "150%", checked: mmSize === "150", fn: () => setMmSize("150") },
              { label: "200%", checked: mmSize === "200", fn: () => setMmSize("200") }
            ]);
            mkSub("滑块", [
              { label: "鼠标悬停", checked: mmSlider === "hover", fn: () => setMmSlider("hover") },
              { label: "始终", checked: mmSlider === "always", fn: () => setMmSlider("always") }
            ]);
            mkSub("侧边", [
              { label: "右侧", checked: mmSide === "right", fn: () => setMmSide("right") },
              { label: "左侧", checked: mmSide === "left", fn: () => setMmSide("left") }
            ]);
            document.body.appendChild(menu);
            const closer = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener("mousedown", closer, true); } };
            setTimeout(() => document.addEventListener("mousedown", closer, true), 0);
          }, title: "minimap：点击跳转 · 右键设置" },
            React.createElement("canvas", { ref: mmRef, style: { position: "absolute", top: 0, left: 0, width: mmW, height: "100%", pointerEvents: "none" } }),
            React.createElement("canvas", { ref: mmViewRef, style: { position: "absolute", top: 0, left: 0, width: mmW, height: "100%", pointerEvents: "none" } }))));
    };

    /* ================= FPGA 工具：格式化预览弹窗（左原文 / 右预览） ================= */
    // 只显示「有改动」的行附近上下文，左右严格同行对齐，便于逐行比对。
    const FmtPreviewDialog = (props) => {
      const pv = props.preview;
      const onClose = props.onClose;
      const onApply = props.onApply; // (alsoSave:boolean)=>void
      const Cc = props.C;
      /* hooks 必须在任何早退之前调用：pv 从 null 变成非 null 时若 hook 数量变化，
         React 会抛 "Rendered more hooks than during the previous render"。
         （当前只有 ref、且 0→N 时 React 走 mount 派发器侥幸不崩，但这是隐患。） */
      const leftScrRef = React.useRef(null);
      const rightScrRef = React.useRef(null);
      const syncLock = React.useRef(false);
      if (!pv) return null;

      /* 「同时修复注释乱码」的勾选值由父层持有（props.encFixOn）；此处只用普通常量，
         不引入新 hook —— 上面那句 if (!pv) return null 是提前返回，hook 必须全在它之前。 */
      const encOn = !!(pv.encFix && props.encFixOn !== false);
      /* 没有格式改动但需要转码时，按钮仍要可用（此时"改动"就是编码） */
      const canApply = !pv.noChange || encOn;
      /* 转码预览样例：挑第一条含非 ASCII 的行。编码只改字节，正文一字不变，
         所以"预览"能给的就是"哪些行会被转、长什么样"。 */
      const encMeta = pv.encFix || pv.encInfo || null;   // 有"行号列表"可展示的两种形态
      const encSample = (() => {
        if (!encMeta || !encMeta.lines.length) return "";
        const ln = pv.before.split("\n")[encMeta.lines[0] - 1];
        const raw = String(ln == null ? "" : ln).trim();
        return raw.length > 70 ? raw.slice(0, 70) + "…" : raw;
      })();

      /* 行对配对走 diff，但要【忽略空白】比较：
         格式化改的就是每一行的空白，精确比较会判定"没有一行相同"，
         整篇变成 del+add 交错 → 左右完全错开（这正是用户看到的"都错开行了"）。
         忽略空白后：只有空白变化的行判为 same（左右按行号对齐），
         真正拆行/改内容的行才判为 add/del，对齐与高亮同时正确。 */
      const beforeLines = pv.before.split("\n");
      const afterLines = pv.after.split("\n");
      /* 归一化只做一次（O(n+m)），再交给 diffLines 做纯字符串比较：
         把"忽略空白"的比较函数塞进 LCS 内层循环会退化成 n×m 次正则。 */
      const normWs = (l) => String(l).replace(/\s+/g, "");
      const d = diffLines(pv.before, pv.after, null, normWs);
      const drows = d.rows || null;
      const expand = (s) => String(s == null ? "" : s).replace(/\t/g, "    ");

      // 无 diff（超长降级）时退化为按行号并排
      const rawRows = drows || (() => {
        const n = Math.max(beforeLines.length, afterLines.length);
        const out = [];
        for (let i = 0; i < n; i++) out.push({ t: "same", l: i < beforeLines.length ? i : -1, r: i < afterLines.length ? i : -1 });
        return out;
      })();
      // 渲染用的对齐行：把 del/add 折叠成 chg 行对（原因见 foldDiff 的注释）
      const aligned = foldDiff(rawRows);

      /* 需要显示的对齐行 = 【内容真的变了】的行 ± 上下文。
         注意判据不能只看 diff 的 t：格式化只改空白时这些行被判为 same（对齐需要），
         若按 t 过滤，预览就只剩拆行附近几行，被重新对齐的行全部看不见。
         因此这里与高亮同用"精确比较"。 */
      const rowChanged = (r) => {
        if (r.t === "chg") return true;   // 折叠出的改动行对
        if (r.t !== "same") return true;
        return (r.l >= 0 && r.r >= 0) && (beforeLines[r.l] !== afterLines[r.r]);
      };
      /* 显示【整篇】行：改动行高亮，未改动的原样列出。
         早先只显示"改动行 ± 2 行上下文"，导致预览断断续续（到处是 ⋯ 缺口），
         看不出上下文的整体结构 —— 格式化预览的价值正在于"整篇对照"。 */
      const showIdx = aligned.map((_, i) => i);
      // 增删行数按【折叠前】的原始行对统计：折叠只改排版，不该改变"净增删几行"的口径
      const addCount = rawRows.filter((r) => r.t === "add").length;
      const delCount = rawRows.filter((r) => r.t === "del").length;
      const changeCount = aligned.filter(rowChanged).length;

      /* 左右同步滚动：整篇显示后两栏行数相同、高度一致，滚动必须联动，
         否则一边滚一边不动，同一屏看到的根本不是同一段代码。 */
      const onSideScroll = (from) => {
        if (syncLock.current) return;
        const a = from === "left" ? leftScrRef.current : rightScrRef.current;
        const b = from === "left" ? rightScrRef.current : leftScrRef.current;
        if (!a || !b) return;
        syncLock.current = true;
        b.scrollTop = a.scrollTop;
        b.scrollLeft = a.scrollLeft;
        requestAnimationFrame(() => { syncLock.current = false; });
      };

      // 渲染一侧（side: 'left' = 原文件 / 'right' = 格式化预览）
      const renderSide = (title, side) => {
        const isAfter = side === "right";
        const head = React.createElement("div", {
          style: { padding: "4px 10px", fontSize: 12, fontWeight: 600, color: isAfter ? "#8fd18f" : Cc.dim, background: "#202122", borderBottom: "1px solid " + Cc.border }
        }, title);

        /* 整篇逐行渲染：showIdx 已是连续全量索引，不再需要 ⋯ 缺口。
           行数较多时用 key 稳定复用，避免每次重渲染整体重建。 */
        const bodyRows = showIdx.map((idx) => {
          const r = aligned[idx];
          const li = r.l, ri = r.r;
          const lineNo = isAfter ? (ri >= 0 ? ri + 1 : null) : (li >= 0 ? li + 1 : null);
          const txt = isAfter ? (ri >= 0 ? afterLines[ri] : "") : (li >= 0 ? beforeLines[li] : "");
          const isAdd = (r.t === "add"), isDel = (r.t === "del");
          /* 高亮判据用【精确比较】，与对齐判据（忽略空白）分开：
             格式化改的就是空白，若沿用忽略空白的 same 判定，被重新对齐的行将不高亮，
             用户就看不到"这一行被改过"。两侧都存在且原文不同 → 记为改动行。 */
          const bothSides = (li >= 0 && ri >= 0);
          const textDiffers = bothSides && (beforeLines[li] !== afterLines[ri]);
          const isChg = isAfter ? (isAdd || textDiffers) : (isDel || textDiffers);
          const isPhantom = (lineNo === null);   // 另一侧没有这一行 → 留空占位，保持左右等高
          /* 占位行若"有内容的那一侧"本身是空行，画斜纹纯属噪声（会被读成"凭空多出空行"），
             只留极淡边框。实测 DDC_Top.v 格式化后右侧曾因此出现 5 条空行条纹。 */
          const otherTxt = isAfter ? (li >= 0 ? beforeLines[li] : "") : (ri >= 0 ? afterLines[ri] : "");
          const phantomBlank = isPhantom && !String(otherTxt).trim();
          /* 行号 + 增删标记：`+` 右侧新增、`−` 左侧独有；占位行行号列留空 */
          const mk = isAfter ? (isAdd ? "+" : " ") : (isDel ? "−" : " ");
          const gutter = React.createElement("span", {
            style: { width: 60, flexShrink: 0, textAlign: "right", paddingRight: 10, userSelect: "none", whiteSpace: "pre", color: isChg ? (isAfter ? "#8fd18f" : "#d19a66") : "#858889" }
          }, mk + (lineNo === null ? "" : String(lineNo)));
          const code = React.createElement("span", { style: { color: isPhantom ? "transparent" : Cc.text } }, isPhantom ? " " : (expand(txt) || " "));
          const rowLine = React.createElement("div", {
            style: {
              display: "flex", whiteSpace: "pre",
              background: isChg ? (isAfter ? "rgba(80,160,80,.18)" : "rgba(200,140,60,.15)") : "transparent",
              /* 占位行（对侧无内容）用极淡斜纹，一眼看出"这侧没有"，但不干扰阅读；
                 空行占位不画纹，否则"压缩空行"会显示成一片条纹噪声 */
              boxShadow: (isPhantom && !phantomBlank) ? "inset 0 0 0 1px rgba(255,255,255,.04)" : "none",
              backgroundImage: (isPhantom && !phantomBlank) ? "repeating-linear-gradient(45deg, rgba(255,255,255,.035) 0 4px, transparent 4px 8px)" : "none"
            }
          }, gutter, code);
          return React.createElement(React.Fragment, { key: "L" + idx + side }, rowLine);
        });

        const scroller = React.createElement("div", {
          ref: isAfter ? rightScrRef : leftScrRef,
          onScroll: () => onSideScroll(isAfter ? "right" : "left"),
          style: { flex: 1, overflow: "auto", background: Cc.editorBg, fontFamily: "Consolas, 'Courier New', monospace", fontSize: 12, lineHeight: "18px" }
        }, bodyRows);

        return React.createElement("div", {
          style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", border: "1px solid " + Cc.border, borderRadius: 4, overflow: "hidden" }
        }, head, scroller);
      };

      return (createPortal ? createPortal(React.createElement("div", {
        style: { position: "fixed", inset: 0, zIndex: 99998, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center" },
        onClick: onClose
      },
        React.createElement("div", {
          onClick: (e) => e.stopPropagation(),
          style: { width: "min(1500px, 96vw)", height: "min(860px, 92vh)", background: "#191A1B", border: "1px solid " + Cc.border, borderRadius: 6, boxShadow: "0 12px 40px rgba(0,0,0,.6)", display: "flex", flexDirection: "column", overflow: "hidden" }
        },
          // 标题栏
          React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid " + Cc.border, background: "#191A1B" } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#fff" } }, "格式化预览"),
              React.createElement("div", { style: { fontSize: 11, color: Cc.dim, marginTop: 2 } },
                pv.path + (pv.noChange ? (pv.encFix ? "　（已是规范格式；仅需修复注释编码）" : "　（已是规范格式）")
                : "　共 " + changeCount + " 行将被改动"
                + (addCount || delCount ? "，其中新增 " + addCount + " 行 / 删除 " + delCount + " 行" : "")
                + (addCount || delCount ? "　※ 两侧行号会因此差 " + (addCount - delCount) + " 行" : "")))),
            React.createElement("div", { style: { display: "flex", gap: 8 } },
              React.createElement("button", {
                onClick: () => onApply(true), disabled: !canApply,
                style: { background: canApply ? "#3994BC" : "#2A2B2C", color: canApply ? "#fff" : "#7a7a7a", border: "none", borderRadius: 4, padding: "5px 14px", cursor: canApply ? "pointer" : "default", fontSize: 12 }
              }, "应用并保存"),
              React.createElement("button", {
                onClick: () => onApply(false), disabled: !canApply,
                style: { background: "#2A2B2C", color: canApply ? Cc.text : "#7a7a7a", border: "1px solid " + Cc.border, borderRadius: 4, padding: "5px 14px", cursor: canApply ? "pointer" : "default", fontSize: 12 }
              }, "仅应用到编辑器"),
              React.createElement("button", {
                onClick: onClose,
                style: { background: "#2A2B2C", color: Cc.text, border: "1px solid " + Cc.border, borderRadius: 4, padding: "5px 14px", cursor: "pointer", fontSize: 12 }
              }, "取消"))),
          /* 编码行（三态，见 openFmtPreview 注释）：可转码 / 已是 GBK / 强制查看。
             勾选 = 本次应用一并转 GBK；取消勾选 = 纯格式化，与原行为一致。 */
          (pv.encFix || pv.encInfo || pv.encWarn) ? React.createElement("div", {
            style: { display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", borderBottom: "1px solid " + Cc.border, background: "#161718", flexShrink: 0, fontSize: 12, flexWrap: "wrap" }
          },
            pv.encFix ? React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: Cc.text } },
              React.createElement("input", {
                type: "checkbox",
                checked: encOn,
                onChange: (e) => { if (props.onEncFix) props.onEncFix(!!(e.target && e.target.checked)); }
              }),
              "同时修复注释乱码：UTF-8 → GBK（Vivado 用）") : null,
            pv.encWarn ? React.createElement("span", { style: { color: "#d19a66" } },
              "注意：当前是以 " + pv.encWarn.cur + " 强制查看的（文件真实编码未校验）—— 请先在状态栏「编码」里「重新自动检测」或「转为 … 并保存」，再来格式化") : null,
            pv.encInfo ? React.createElement("span", { style: { color: "#8fd18f" } },
              "编码已是 GBK（Vivado 可正确显示中文注释，无需转换）") : null,
            encMeta ? React.createElement("span", { style: { color: Cc.dim } },
              "非 ASCII 字符 " + encMeta.chars + " 个，分布在 " + encMeta.lines.length + " 行（行号 "
              + encMeta.lines.slice(0, 8).join("、") + (encMeta.lines.length > 8 ? " …" : "") + "）") : null,
            (encMeta && encSample) ? React.createElement("span", { style: { color: Cc.dim, fontFamily: "Consolas, 'Courier New', monospace" } }, "例：" + encSample) : null) : null,
          // 左右对比区
          React.createElement("div", { style: { flex: 1, display: "flex", gap: 10, padding: 10, minHeight: 0 } },
            renderSide("原文件", "left"),
            renderSide("格式化预览", "right")),
          // 底部说明
          React.createElement("div", { style: { padding: "6px 14px", borderTop: "1px solid " + Cc.border, fontSize: 11, color: Cc.dim } },
            "只对齐声明类行（端口 / reg / wire / parameter / assign）；位宽规范为 [47:0]；其余行一字不动。改动行以上下底色标出。"
            + (pv.encFix ? "勾选「同时修复注释乱码」后，写盘编码改为 GBK（Verilog 代码是 ASCII，只有注释与字符串受影响），Vivado 即可正确显示中文注释。"
              : (pv.encInfo ? "当前编码已是 GBK：Vivado 与编辑器读到的是同一份中文，不需要任何转码。" : ""))))),
        document.body) : null);
    };

    /* ================= FPGA 工具：检查结果面板 ================= */
    const CheckResultDialog = (props) => {
      /* 级别筛选状态放在父层（props.filter），不在这里 useState ——
         本组件在 cp 为空时走 `if (!cp) return null` 提前返回，
         若把 useState 放在它之后，面板开关一次就会触发
         "Rendered more hooks than during the previous render" 并崩溃。
         放在父层同时带来一个好处：跳转关闭面板后返回时，筛选状态还在。 */
      const lvFilter = props.filter || "all";
      const setLvFilter = props.onFilter || (() => { });
      const cp = props.panel;
      const Cc = props.C;
      if (!cp) return null;
      const items = cp.items || [];
      const colorOf = (lv) => (lv === "error" ? "#f48771" : (lv === "warn" ? "#d19a66" : Cc.dim));
      const labelOf = (lv) => (lv === "error" ? "错误" : (lv === "warn" ? "提示" : "信息"));
      const bold = true;

      const titleBlock = React.createElement("div", null,
        React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#fff" } }, cp.title),
        React.createElement("div", { style: { fontSize: 11, color: Cc.dim, marginTop: 2 } }, cp.summary));
      const closeBtn = React.createElement("button", {
        onClick: props.onClose,
        style: { background: "#2A2B2C", color: Cc.text, border: "1px solid " + Cc.border, borderRadius: 4, padding: "5px 14px", cursor: "pointer", fontSize: 12 }
      }, "关闭");
      const header = React.createElement("div", {
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid " + Cc.border, background: "#191A1B" }
      }, titleBlock, closeBtn);

      /* 级别筛选：未连接端口的"信息"条数往往是"错误/提示"的好几倍，
         不筛选时真问题会被淹掉。默认显示全部，可一键只看错误或只看提示。
         （状态本身在父层，这里只做统计与渲染） */
      const nErr = items.filter((x) => x.level === "error").length;
      const nWarn = items.filter((x) => x.level === "warn").length;
      const nInfo = items.filter((x) => x.level === "info").length;
      const lvBtn = (id, text, n, color) => React.createElement("button", {
        key: id,
        onClick: () => setLvFilter(id),
        style: {
          background: lvFilter === id ? "#3994BC" : "transparent",
          color: lvFilter === id ? "#fff" : (color || Cc.dim),
          border: "1px solid " + Cc.border, borderRadius: 4, padding: "2px 10px",
          cursor: "pointer", fontSize: 11, whiteSpace: "nowrap"
        }
      }, text + " " + n);
      const filterRow = React.createElement("div", {
        style: { display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderBottom: "1px solid " + Cc.border, background: "#161718", flexShrink: 0 }
      },
        React.createElement("span", { style: { fontSize: 11, color: Cc.dim, marginRight: 2 } }, "只看："),
        lvBtn("all", "全部", items.length, Cc.text),
        lvBtn("error", "错误", nErr, "#f48771"),
        lvBtn("warn", "提示", nWarn, "#d19a66"),
        lvBtn("info", "信息", nInfo, Cc.dim),
        React.createElement("span", { style: { fontSize: 11, color: "#6a6a6a", marginLeft: 8 } },
          "提示＝输入端口悬空等可能的真问题；信息＝输出端口悬空等通常有意的留空"));

      const shownItems = (lvFilter === "all") ? items : items.filter((x) => x.level === lvFilter);
      const emptyMsg = React.createElement("div", {
        style: { padding: 20, textAlign: "center", color: "#8fd18f", fontSize: 13 }
      }, items.length ? "（当前筛选下没有条目）" : "✓ 未发现问题");

      const rowOf = (it, i) => {
        const lvTag = React.createElement("span", {
          style: { flexShrink: 0, width: 38, color: colorOf(it.level), fontSize: 11, fontWeight: bold ? 600 : 400, paddingTop: 1 }
        }, labelOf(it.level));
        const fileTag = React.createElement("span", {
          style: { flexShrink: 0, width: 190, color: Cc.accent, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
        }, it.file || "-");
        const lineTag = React.createElement("span", {
          style: { flexShrink: 0, width: 52, color: Cc.dim, fontSize: 12, textAlign: "right", paddingRight: 6 }
        }, it.line ? "行 " + it.line : "");
        const msgTag = React.createElement("span", {
          style: { flex: 1, color: Cc.text, fontSize: 12, wordBreak: "break-all" }
        }, it.msg);
        /* 「→ 定义 文件:行」独立热区：点击跳到该端口的定义处（而不是实例处）。
           未连接的端口名在实例文件里搜不到，必须能一键跳到模块定义去核对。 */
        const defTag = (it.defFile && it.defLine)
          ? React.createElement("span", {
            onClick: (e) => {
              e.stopPropagation();
              if (props.onJump) props.onJump({ filePath: it.defPath, file: it.defFile, line: it.defLine });
            },
            title: "跳转到该端口的定义位置（模块 " + (it.defFile || "") + " 第 " + it.defLine + " 行）",
            style: { flexShrink: 0, marginLeft: 8, fontSize: 11, color: "#4DAAFC", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }
          }, "→ 定义 " + it.defFile + ":" + it.defLine)
          : null;
        const clickable = !!(it.filePath || (it.file && it.file !== "-"));
        return React.createElement("div", {
          key: "ci" + i,
          onClick: () => (props.onJump && clickable ? props.onJump(it) : null),
          title: clickable ? "点击跳转到该实例位置" + (defTag ? "；右端「→ 定义」跳转到端口定义处" : "") : "",
          style: { display: "flex", gap: 10, padding: "6px 10px", borderRadius: 4, cursor: clickable ? "pointer" : "default", alignItems: "flex-start" },
          onMouseEnter: (e) => { e.currentTarget.style.background = "#2a2d2e"; },
          onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
        }, lvTag, fileTag, lineTag, msgTag, defTag);
      };

      const listBody = React.createElement("div", { style: { flex: 1, overflow: "auto", padding: 6 } },
        shownItems.length === 0 ? emptyMsg : shownItems.map(rowOf));

      const panel = React.createElement("div", {
        onClick: (e) => e.stopPropagation(),
        style: { width: "min(1200px, 94vw)", height: "min(760px, 90vh)", background: "#191A1B", border: "1px solid " + Cc.border, borderRadius: 6, boxShadow: "0 12px 40px rgba(0,0,0,.6)", display: "flex", flexDirection: "column", overflow: "hidden" }
      }, header, filterRow, listBody);

      const overlay = React.createElement("div", {
        style: { position: "fixed", inset: 0, zIndex: 99998, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center" },
        onClick: props.onClose
      }, panel);

      return createPortal ? createPortal(overlay, document.body) : null;
    };

    /* ================= ㉓ Diff 对比视图（左右并排，行级差异） ================= */
    const hlLinesOf = (text, path) => {
      const st = { v: false };
      const kw = isSVPath(path) ? KW_SV : KW_V;
      return String(text == null ? "" : text).split("\n").map((l) => hlLine(l, st, kw));
    };
    const DiffView = (props) => {
      const { pair, onClose, C } = props;
      if (!pair) return null;
      const d = diffLines(pair.left.text, pair.right.text);
      const rows = d.rows || [];
      const hlL = hlLinesOf(pair.left.text, pair.left.path);
      const hlR = hlLinesOf(pair.right.text, pair.right.path);
      const bn = (p) => String(p || "").split(/[\\/]/).pop() || String(p || "");
      let adds = 0, dels = 0;
      for (const r of rows) { if (r.t === "add") adds++; else if (r.t === "del") dels++; }
      const cell = (no, html, kind) => {
        const bg = kind === "add" ? "rgba(46,160,67,.16)" : (kind === "del" ? "rgba(248,81,73,.16)" : "transparent");
        const sign = kind === "add" ? "+" : (kind === "del" ? "−" : " ");
        return React.createElement("div", { style: { display: "flex", background: bg, minHeight: 20, alignItems: "flex-start" } },
          React.createElement("span", { style: { width: 46, flexShrink: 0, textAlign: "right", paddingRight: 8, color: "#858889", userSelect: "none" } }, no > 0 ? String(no) : ""),
          React.createElement("span", { style: { width: 12, flexShrink: 0, color: kind === "add" ? "#3fb950" : (kind === "del" ? "#f85149" : "#858889") } }, sign),
          React.createElement("span", { style: { flex: 1, minWidth: 0, whiteSpace: "pre", overflow: "hidden", textOverflow: "ellipsis" }, dangerouslySetInnerHTML: { __html: html || "" } }));
      };
      return createPortal ? createPortal(React.createElement("div", {
        style: { position: "fixed", inset: 0, zIndex: 99997, background: "#202122", display: "flex", flexDirection: "column" }
      },
        /* 顶部栏 */
        React.createElement("div", {
          style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "#191A1B", borderBottom: "1px solid #2A2B2C", flexShrink: 0, fontSize: 12 }
        },
          React.createElement("span", { style: { fontWeight: 600, color: "#e8e8e8" } }, "Diff 对比"),
          React.createElement("span", { style: { color: "#9d9d9d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "30%" }, title: pair.left.path }, bn(pair.left.path)),
          React.createElement("span", { style: { color: "#858889" } }, "↔"),
          React.createElement("span", { style: { color: "#9d9d9d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "30%" }, title: pair.right.path }, bn(pair.right.path)),
          React.createElement("span", { style: { color: "#3fb950" } }, "+" + adds),
          React.createElement("span", { style: { color: "#f85149" } }, "−" + dels),
          d.tooBig ? React.createElement("span", { style: { color: "#d19a66" } }, "（文件过大，未做差异算法）") : null,
          React.createElement("button", {
            onClick: onClose,
            style: { marginLeft: "auto", background: "#2A2B2C", color: "#e6e6e6", border: "1px solid #3C3C3C", borderRadius: 4, padding: "3px 12px", cursor: "pointer", fontSize: 12 }
          }, "关闭")),
        /* 两栏标题 */
        React.createElement("div", { style: { display: "flex", borderBottom: "1px solid #2A2B2C", background: "#191A1B", flexShrink: 0, fontSize: 11, color: "#9d9d9d" } },
          React.createElement("div", { style: { flex: 1, minWidth: 0, padding: "3px 10px", borderRight: "1px solid #2A2B2C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, pair.left.path),
          React.createElement("div", { style: { flex: 1, minWidth: 0, padding: "3px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, pair.right.path)),
        /* 内容（左右同滚：同一滚动容器内两栏并排） */
        React.createElement("div", { style: { flex: 1, minHeight: 0, overflow: "auto", fontFamily: "Consolas, \"Courier New\", monospace", fontSize: 13, lineHeight: "20px" } },
          rows.length === 0
            ? React.createElement("div", { style: { padding: 16, color: "#858889" } }, "无内容")
            : rows.map((r, idx) => React.createElement("div", { key: idx, style: { display: "flex", alignItems: "stretch" } },
              React.createElement("div", { style: { flex: 1, minWidth: 0, borderRight: "1px solid #2A2B2C" } },
                r.l >= 0 ? cell(r.l + 1, hlL[r.l], r.t === "del" ? "del" : "same") : cell(0, "", "same")),
              React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                r.r >= 0 ? cell(r.r + 1, hlR[r.r], r.t === "add" ? "add" : "same") : cell(0, "", "same")))))), document.body) : null;
    };

    /* ================= ㉔ 集成终端面板（编辑器下方，非交互式） ================= */
    const TerminalPanel = (props) => {
      const { onClose, getCwd, C } = props;
      const [lines, setLines] = React.useState([]);
      const [cmd, setCmd] = React.useState("");
      const [busy, setBusy] = React.useState(false);
      const histRef = React.useRef([]);
      const [histIdx, setHistIdx] = React.useState(0);
      const outRef = React.useRef(null);
      const inputRef = React.useRef(null);
      React.useEffect(() => {
        const el = outRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [lines, busy]);
      const push = (items) => setLines((prev) => prev.concat(items));
      const run = async () => {
        const c = String(cmd || "").trim();
        if (!c || busy) return;
        histRef.current = histRef.current.concat([c]);
        setHistIdx(histRef.current.length);
        setCmd("");
        push([{ k: "cmd", t: c }]);
        setBusy(true);
        try {
          const res = await apiCall("runCommand", { cmd: c, cwd: getCwd ? getCwd() : undefined }, 330000);
          const add = [];
          if (res && res.stdout) add.push({ k: "out", t: res.stdout });
          if (res && res.stderr) add.push({ k: "err", t: res.stderr });
          if (res && res.note) add.push({ k: "info", t: res.note });
          if (!res || !res.ok) {
            const code = (res && res.exitCode != null) ? res.exitCode : "?";
            add.push({ k: "info", t: "（退出码 " + code + "）" + ((res && res.error) ? " " + res.error : "") });
          }
          if (!add.length) add.push({ k: "info", t: "（无输出）" });
          push(add);
        } catch (e) {
          push([{ k: "err", t: String((e && e.message) || e) }]);
        }
        setBusy(false);
      };
      const onKey = (e) => {
        e.stopPropagation();
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); return; }
        const h = histRef.current;
        if (!h.length) return;
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const i = Math.max(0, (histIdx <= 0 ? h.length : histIdx) - 1);
          setHistIdx(i); setCmd(h[i] || "");
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const i = Math.min(h.length, histIdx + 1);
          setHistIdx(i); setCmd(i >= h.length ? "" : (h[i] || ""));
        }
      };
      const colorOf = (k) => k === "cmd" ? "#3fb950" : (k === "err" ? "#f85149" : (k === "info" ? "#d19a66" : "#BBBEBF"));
      return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#191A1B" } },
        /* 标题栏 */
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "3px 10px", background: "#191A1B", borderBottom: "1px solid #2A2B2C", fontSize: 11, flexShrink: 0 } },
          React.createElement("span", { style: { color: "#cccccc", fontWeight: 600 } }, "终端"),
          React.createElement("span", { style: { color: "#7a7a7a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }, title: getCwd ? getCwd() : "" }, getCwd ? (getCwd() || "") : ""),
          React.createElement("span", { style: { marginLeft: "auto", color: busy ? "#d19a66" : "#858889", whiteSpace: "nowrap" } }, busy ? "运行中…" : ""),
          React.createElement("span", { onClick: () => setLines([]), title: "清屏", style: { cursor: "pointer", color: "#8a8a8a", padding: "0 4px" } }, "🗑"),
          React.createElement("span", { onClick: onClose, title: "关闭终端", style: { cursor: "pointer", color: "#8a8a8a", padding: "0 4px" } }, "✕")),
        /* 输出区 */
        React.createElement("div", { ref: outRef, style: { flex: 1, minHeight: 0, overflow: "auto", padding: "6px 10px", fontFamily: "Consolas, \"Courier New\", monospace", fontSize: 12, lineHeight: "18px", whiteSpace: "pre-wrap", wordBreak: "break-all" } },
          lines.length === 0
            ? React.createElement("div", { style: { color: "#858889" } }, "输入命令后回车执行（↑↓ 翻阅历史）。例：vivado -mode batch -source run.tcl")
            : null,
          lines.map((l, i) => React.createElement("div", { key: i, style: { color: colorOf(l.k) } }, l.k === "cmd" ? "> " + l.t : l.t))),
        /* 输入行 */
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderTop: "1px solid #2a2a2a", flexShrink: 0 } },
          React.createElement("span", { style: { color: "#3fb950", fontFamily: "Consolas, monospace", fontSize: 12, flexShrink: 0 } }, ">"),
          React.createElement("input", {
            ref: inputRef,
            value: cmd,
            onChange: (e) => setCmd(e.target.value),
            onKeyDown: onKey,
            spellCheck: false,
            placeholder: busy ? "运行中…" : "输入命令，回车执行",
            style: { flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "#e6e6e6", fontFamily: "Consolas, \"Courier New\", monospace", fontSize: 12 }
          })));
    };

    /* ================= 右侧 AI 对话面板（Claude Code 式） ================= */
    /* ---------- 「🔗 绑定工作区」按钮的文案（纯函数，便于离线断言） ----------
       三种状态必须一眼分清（用户实测：「绑定完还是显示的绑定工作区，我不好区分哪个是已经绑定上的」）：
         · 未绑定     → 🔗 绑定工作区
         · 手工绑过   → 🔗 已绑定：<平台工作区名>
         · 自动锚定   → 🔗 已锚定：<名>（按路径匹配来的，没手工绑过） */
    const bindChipOf = (anchorWs, manual, name) => {
      const id = String(anchorWs == null ? "" : anchorWs);
      if (!id) return { label: "🔗 绑定工作区", bound: false, manual: false, name: "" };
      const nm = String(name == null ? "" : name).trim() || id.slice(0, 8);
      return { label: "🔗 " + (manual === true ? "已绑定：" : "已锚定：") + nm, bound: true, manual: manual === true, name: nm };
    };
    const ChatPanel = (props) => {
      const { sessions, connection, remote, uiConversation, selInfo, activePath, folders, onClose, C, anchorWs, anchorManual } = props;
      const selLines = (selInfo && selInfo.hasSelection) ? selInfo.lines : 0;
      /* 选区的起止行（1-based）与文件名：对话里折成 `文件名#329-334` 这样的引用，与 VSCode 手感一致 */
      const selFrom = (selInfo && selInfo.hasSelection && selInfo.from) ? selInfo.from : 0;
      const selTo = (selInfo && selInfo.hasSelection && selInfo.to) ? selInfo.to : 0;
      const selName = activePath ? (String(activePath).split(/[\\/]/).pop() || "") : "";
      const selRefText = selFrom ? (selName + "#" + selFrom + "-" + selTo) : "";
      // ㉒ 选区被用户手动移除（点 × 后不再自动附带；选区变化时自动恢复）
      const [selMuted, setSelMuted] = React.useState(false);
      const selSig = (selInfo && selInfo.hasSelection) ? (selInfo.lines + ":" + String(selInfo.text || "").length) : "";
      React.useEffect(() => { setSelMuted(false); }, [selSig]);
      // 当前会话 id（订阅 sessions.list）
      const listSnap = React.useSyncExternalStore(
        (cb) => {
          if (!sessions || !sessions.list || typeof sessions.list.subscribe !== "function") return () => {};
          return sessions.list.subscribe(cb);
        },
        () => {
          try { return (sessions && sessions.list && sessions.list.getSnapshot()) || null; }
          catch (e) { return null; }
        }
      );
      /* ㊸ 锚定优先：pinSession 是工作台按【代码工作区】选出的会话 id。
         它在列表里就渲染它（主界面切工作区不会带走它）；不在/没锚定就回落成平台当前会话。
         点标题栏的「⇱」可手动解除锚定，解除了就恢复跟随主界面。 */
      const pinId = (props && props.pinSession) ? String(props.pinSession) : "";
      const pinInList = !!pinId && !!listSnap && Array.isArray(listSnap.ids) && listSnap.ids.indexOf(pinId) >= 0;
      const [pinOff, setPinOff] = React.useState(false);
      React.useEffect(() => { setPinOff(false); }, [pinId]);
      /* 宽限期：会话列表在切换工作区/重连时会短暂重拉（ids 里暂时没有锚点会话），
         这时不能立刻回落到主界面当前会话 —— 否则看起来就是「主界面一换，右边也跟着换」。
         给 1.8 秒：列表把锚点会话带回来就继续锚着，确实回不来才回落（并写 console）。 */
      const [pinGrace, setPinGrace] = React.useState(false);
      /* 「🔗 绑定工作区」下拉的开关（手动把本代码工作区绑到某个平台工作区） */
      const [bindOpen, setBindOpen] = React.useState(false);
      React.useEffect(() => {
        if (!pinId || pinOff || pinInList) { setPinGrace(false); return; }
        setPinGrace(true);
        const t = setTimeout(() => setPinGrace(false), 1800);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [pinId, pinInList, pinOff]);
      const pinActive = !!pinId && !pinOff && (pinInList || pinGrace);
      const sessionId = pinActive ? pinId : (listSnap && listSnap.current ? listSnap.current : undefined);
      /* ㊸ 关键：官方只给「当前会话」自动打开事件窗口（followCurrent → session.open()），
         锚定的会话不是当前会话时，它的历史事件一条都不会拉 → 面板「消息 0 条 / 原始事件 0」。
         这里自己把这个会话打开：binding(id).session.open() 是按会话、幂等的，
         【不会】改平台的当前会话，所以主界面依然不动。 */
      React.useEffect(() => {
        if (!pinActive || !sessions || typeof sessions.binding !== "function") return;
        try {
          const b = sessions.binding(pinId);
          const s = b && b.session;
          if (s && typeof s.open === "function") Promise.resolve(s.open()).catch(() => { });
        } catch (e) { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [pinActive, pinId]);
      /* 锚点存在但不可用（不在会话列表里）时留一条 console 线索，方便定位「为什么又跟随主界面了」 */
      React.useEffect(() => {
        if (pinId && !pinActive && !pinOff) {
          try { console.info("[card-desktop] 锚点不可用，已回落跟随主界面：pin=" + pinId + " 在列表里=" + pinInList + " 当前=" + String(listSnap && listSnap.current)); } catch (e) { }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [pinId, pinActive, pinInList, pinOff]);

      // ⑳ 选模型：用 connection.api.sessions.models / selectModel
      const [modelOpen, setModelOpen] = React.useState(false);
      const [modelPane, setModelPane] = React.useState("root");   // root | model | effort（对齐主界面两级导航）
      const [modelState, setModelState] = React.useState(null);   // { current, groups, failures, status, error }
      /* 模型/重命名优先走 typert 远端 API（ctx.remote.session）；旧路径 connection.api.sessions
         在现行 connection 契约里不存在（它只有 isLoopback/generation/state/rpc/…），仅作兜底。 */
      const apiSessions = remote || (connection && connection.api && connection.api.sessions) || null;
      /* 兼容两种信封：typert 远端 {ok,value[,error]} / 旧形态 {result:{ok,value[,error]}} */
      const unwrapEnv = (r) => {
        if (!r) return null;
        if (r.ok === true && r.value !== undefined) return r.value;
        if (r.result && r.result.ok === true) return r.result.value;
        return null;
      };
      const errOf = (r) => {
        if (!r) return "";
        if (r.error && (r.error.message || r.error.code)) return String(r.error.message || r.error.code);
        if (r.result && r.result.error) return String(r.result.error.message || r.result.error.code || "");
        return "";
      };
      // 只拉取目录（不改弹层开关）：供按钮初始就显示当前模型名
      const fetchModels = async () => {
        if (!apiSessions) return;   // modelCatalog 是全局目录，不需要 sessionId（旧代码等 sessionId，导致初始不显示模型）
        setModelState((s) => ({ ...(s || {}), status: "loading", error: null }));
        try {
          /* 正确端点叫 modelCatalog，且【不接受任何参数】（官方 modelCatalog() { return buildModelCatalog(this.ctx); }）。 */
          const fn = apiSessions.modelCatalog || apiSessions.models;
          if (typeof fn !== "function") {
            setModelState({ current: null, groups: [], failures: [], status: "error", error: "远端没有 modelCatalog 端点" });
            return;
          }
          const res = await fn.call(apiSessions);
          const val = unwrapEnv(res);
          // 目录里给的是 default（全局默认模型）；老代码当成 current，于是取不到值、初始什么都不显示。
        // 会话真正在用的模型在 session.projections.faceOf("modelSelection").next，下面 modelCurrent 合并两者。
        if (val) setModelState({ current: val.current || null, default: val.default || null, groups: val.groups || [], failures: val.failures || [], status: "ready", error: null });
          else setModelState((s) => ({ ...(s || {}), status: "error", error: errOf(res) || "加载失败" }));
        } catch (e) {
          setModelState((s) => ({ ...(s || {}), status: "error", error: (e && e.message) || String(e) }));
        }
      };
      // 面板打开 / 切换会话时自动加载一次当前模型（无需点按钮就能看到模型名）
      React.useEffect(() => {
        // 不再等 sessionId：初始就把当前模型显示出来（与主界面一致），不用用户先点一次
        fetchModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [sessionId]);
      const loadModels = async () => {
        setModelOpen(true);
        setModelPane("root");
        await fetchModels();
      };
      const selectModel = async (provider, model, reasoningEffort) => {
        if (!apiSessions || sessionId === undefined) return;
        setModelState((s) => ({ ...(s || {}), status: "selecting", error: null }));
        try {
          const req = { sessionId, provider, model };
          if (reasoningEffort !== undefined) req.reasoningEffort = reasoningEffort;
          const res = await apiSessions.selectModel(req);
          const val = unwrapEnv(res);
          if (val && val.selected) {
            setModelState((s) => ({ ...(s || {}), current: val.selected, status: "ready", error: null }));
            setModelOpen(false);
            setModelPane("root");
          } else {
            setModelState((s) => ({ ...(s || {}), status: "error", error: errOf(res) || "切换失败" }));
          }
        } catch (e) {
          setModelState((s) => ({ ...(s || {}), status: "error", error: (e && e.message) || String(e) }));
        }
      };
      // 触发按钮文字（模型名 · 思考程度）在下方由 modelChoices/curModelName 推导

      // ⑲ 历史会话列表（查工作区其他对话）：ids + byId，点击切换
      const [histOpen, setHistOpen] = React.useState(false);
      // ㉛ 会话搜索（按内容搜历史会话）+ 重命名
      const [histQ, setHistQ] = React.useState("");
      const [histResults, setHistResults] = React.useState(null);   // null=未搜索；[]=无结果
      const [histSearching, setHistSearching] = React.useState(false);
      const [renameId, setRenameId] = React.useState(null);
      const [histErr, setHistErr] = React.useState("");
      const [renameVal, setRenameVal] = React.useState("");
      const histTimerRef = React.useRef(null);
      // 历史搜索的竞态防护：请求序号 + AbortController（此前两者都没有，
      // 快速输入时先发的慢请求返回会覆盖后发的新结果）
      const histSeqRef = React.useRef(0);
      const histAbortRef = React.useRef(null);
      const onHistQ = (v) => {
        setHistQ(v);
        if (histTimerRef.current) clearTimeout(histTimerRef.current);
        histTimerRef.current = setTimeout(() => { doHistSearch(v); }, 350);
      };
      const doHistSearch = async (q) => {
        const s = String(q || "").trim();
        if (!s) { histSeqRef.current++; setHistResults(null); setHistSearching(false); return; }
        if (!sessions || typeof sessions.search !== "function") { setHistResults([]); return; }
        const mySeq = ++histSeqRef.current;
        if (histAbortRef.current) { try { histAbortRef.current.abort(); } catch (e) { } }
        const ac = new AbortController();
        histAbortRef.current = ac;
        setHistSearching(true);
        try {
          const res = await sessions.search(s, ac.signal);
          if (mySeq !== histSeqRef.current) return;            // 已被更新的请求取代 → 丢弃
          const val = (res && res.ok) ? res.value : null;
          setHistResults(val && Array.isArray(val.items) ? val.items : []);
        } catch (e) {
          if (mySeq !== histSeqRef.current) return;
          setHistResults([]);
        }
        if (mySeq === histSeqRef.current) setHistSearching(false);
      };
      // 卸载时清理待执行的防抖计时器与在途请求
      React.useEffect(() => () => {
        if (histTimerRef.current) clearTimeout(histTimerRef.current);
        if (histAbortRef.current) { try { histAbortRef.current.abort(); } catch (e) { } }
      }, []);
      // 重命名守卫：Enter 提交后 setRenameId(null) 会让输入框卸载并触发 blur，
      // 若不加守卫，blur 会再调一次 doRename（重复请求 + 重复提示）
      const renameDoneRef = React.useRef(false);
      const doRename = async (id, title) => {
        if (renameDoneRef.current) return;
        renameDoneRef.current = true;
        setRenameId(null);
        const t = String(title || "").trim();
        if (!t) return;
        // 注意：client 侧 sessions 服务没有 rename，必须走 host API connection.api.sessions.rename
        if (!apiSessions || typeof apiSessions.rename !== "function") return;
        try {
          const r = await apiSessions.rename({ sessionId: id, title: t });
          if (r && r.ok === false) {
            const em = r.error && (r.error.message || r.error.code);
            setHistErr("重命名失败：" + (em || "未知错误"));
          }
        } catch (e) {
          setHistErr("重命名失败：" + ((e && e.message) || "未知错误"));
        }
      };
      const startRename = (id, title) => { renameDoneRef.current = false; setRenameId(id); setRenameVal(title || ""); setHistErr(""); };
      /* sessions.list 快照的真实形状（dsh-api-session-controller 的 store 初值 @3061 + projectList() @3361）：
           { ids, byId, current, phase, subagentsByParent, jobsBySession, currentAddress }
         byId[id] = { id, displayTitle, title?, cwd?, running, completed?, blank, updatedAt, parentId?, origin? }。
         注意：不要错读成 SessionManager.getListSnapshot() 的 { items, … } —— 那是另一个接口，
         读错会把好好的列表变成空的（本轮实测踩过）。
         这里只取原始 id 列表；可见性（子代理/已归档/空会话/工作区归属）的派生写在 wsSnap 之后，
         因为那里才有工作区快照（写在前面会 TDZ）。 */
      const histAllIds = (listSnap && Array.isArray(listSnap.ids)) ? listSnap.ids : [];
      const histById = (listSnap && listSnap.byId) ? listSnap.byId : {};
      const isSubagent = (sum) => !!(sum && sum.origin === "subagent");
      /* 之前这里把异常整个吞掉：未知/未加载的会话 open 会 fail loud，
         表现就是「点历史没反应」而且一句提示都没有。现在成功才关面板，
         同步抛错 / 异步 reject / 1.2 秒后当前会话仍未变，都把原因显示在历史面板里。 */
      const openSession = (id) => {
        setHistErr("");
        /* ㊸ 锚定模式下：只把锚点换到这条会话上，不调用 sessions.open（那是平台级导航，会把主界面带走）。 */
        if (pinActive && props && typeof props.onPinSession === "function") {
          try { props.onPinSession(String(id)); setHistOpen(false); return; } catch (e) { }
        }
        if (!sessions || typeof sessions.open !== "function") { setHistErr("sessions 服务不可用，无法切换会话"); return; }
        const fail = (msg) => { setHistErr(msg); setHistOpen(true); };
        const verify = () => {
          try {
            const cur = (sessions.list && typeof sessions.list.getSnapshot === "function") ? sessions.list.getSnapshot().current : undefined;
            if (cur !== id) fail("已请求切换，但当前会话仍是 " + String(cur) + "（该会话可能不在当前工作区）");
          } catch (e) { /* 忽略 */ }
        };
        try {
          const r = sessions.open(id);
          setHistOpen(false);
          if (r && typeof r.then === "function") r.then(() => setTimeout(verify, 1200), (e) => fail("打开会话失败：" + ((e && e.message) || String(e))));
          else setTimeout(verify, 1200);
        } catch (e) {
          fail("打开会话失败：" + ((e && e.message) || String(e)));
        }
      };
      // 会话的工作区名：取 cwd 最后一段
      const wsNameOf = (sum) => {
        const cwd = (sum && sum.cwd) || "";
        const seg = cwd.split(/[\\/]/).filter(Boolean).pop();
        return seg || "";
      };
      const fmtTime = (ms) => {
        if (!ms) return "";
        const d = new Date(ms);
        const p = (n) => String(n).padStart(2, "0");
        return (d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()));
      };

      // 当前 Session 对象
      let session = null;
      try { session = sessionId !== undefined && sessions && typeof sessions.binding === "function" ? (sessions.binding(sessionId) || {}).session : null; }
      catch (e) { session = null; }
      /* 病因条：任一会话/模型依赖缺失时列出，正常时完全不显示。
         目的是把「看不到对话 / 点历史没反应 / 选模型一直加载」一次定位到具体缺哪一环。 */
      const chatDiag = [];
      if (!sessions) chatDiag.push("sessions 服务未注入");
      if (!remote) chatDiag.push("remote.session 未注入（模型/重命名不可用）");
      if (sessions && sessionId === undefined) chatDiag.push("未取到当前会话 id");
      if (sessions && sessionId !== undefined && !session) chatDiag.push("session.binding 无返回");
      if (remote && typeof (remote.modelCatalog || remote.models) !== "function") chatDiag.push("远端无 modelCatalog");
      if (!uiConversation) chatDiag.push("uiConversation 服务未注入");

      /* 0.1.5 起：消息来自官方 uiConversation 服务（老版本那个 session 快照的 nodes 字段已被移除 ——
         这就是「升级前正常、升级后对话区空白」的根因）。两个坑都在官方源码里核实过：
         ① binding(id).snapshot 只是 { views, activeTargets }，里面没有节点；
            真正的节点在 binding(id).target("chat").getSnapshot() → { nodes, partial, … }。
         ② 必须通过 target("chat").subscribe 订阅 —— 它顺带 activate(target)，
            不订阅这个目标，它的视图快照永远是 undefined。 */
      const conv = (() => {
        try { return (uiConversation && sessions && sessionId !== undefined && typeof uiConversation.binding === "function") ? uiConversation.binding(sessionId) : null; }
        catch (e) { return null; }
      })();
      const convTarget = (() => {
        try { return (conv && typeof conv.target === "function") ? conv.target("chat") : null; }
        catch (e) { return null; }
      })();
      const convSnap = React.useSyncExternalStore(
        (cb) => { try { return (convTarget && typeof convTarget.subscribe === "function") ? convTarget.subscribe(cb) : () => {}; } catch (e) { return () => {}; } },
        () => { try { return (convTarget && typeof convTarget.getSnapshot === "function") ? convTarget.getSnapshot() : null; } catch (e) { return null; } }
      );
      // 注意：这两句必须写在 conv/convTarget 声明【之后】。写在上面病因条那段会触发 TDZ
      // （const 声明前引用 → 渲染期抛 "Cannot access 'conv' before initialization"，整个工作台渲染出错）。
      if (uiConversation && sessions && sessionId !== undefined && !conv) chatDiag.push("uiConversation.binding 无返回");
      if (conv && !convTarget) chatDiag.push("uiConversation.target(chat) 无返回");

      // 订阅 session 快照
      const snap = React.useSyncExternalStore(
        (cb) => { if (!session || typeof session.subscribe !== "function") return () => {}; return session.subscribe(cb); },
        () => { try { return session && typeof session.getSnapshot === "function" ? session.getSnapshot() : null; } catch (e) { return null; } }
      );

      // ㉑ 权限 preset：从 session.projections 读当前权限；切换用 session.command("/permission <id>")
      const permFace = (session && session.projections && typeof session.projections.faceOf === "function") ? session.projections.faceOf("permissions") : null;
      const permValue = React.useSyncExternalStore(
        (cb) => { if (!permFace || typeof permFace.subscribe !== "function") return () => {}; return permFace.subscribe(cb); },
        () => { try { return (permFace && typeof permFace.getSnapshot === "function") ? permFace.getSnapshot() : undefined; } catch (e) { return undefined; } }
      );
      /* 模型：与主界面取同一份投影（官方 current = projected.next ?? catalog.value.default）。
         不订阅它，初始就只能显示空（必须先点一次模型才有名字）。 */
      const modelFace = (() => {
        try { return (session && session.projections && typeof session.projections.faceOf === "function") ? session.projections.faceOf("modelSelection") : null; }
        catch (e) { return null; }   // 投影未注册时不能把整个对话面板打挂
      })();
      const modelProj = React.useSyncExternalStore(
        (cb) => { if (!modelFace || typeof modelFace.subscribe !== "function") return () => {}; return modelFace.subscribe(cb); },
        () => { try { return (modelFace && typeof modelFace.getSnapshot === "function") ? modelFace.getSnapshot() : undefined; } catch (e) { return undefined; } }
      );
      const [permOpen, setPermOpen] = React.useState(false);
      // 对齐主界面当前版本：danger-full-access 必须先勾选风险确认才能启用
      const [permConfirm, setPermConfirm] = React.useState(false);
      const [permAck, setPermAck] = React.useState(false);
      // 权限选项（含三个盾牌 SVG path）
      const PERM_META = {
        "read-only": { label: "仅可查看", svg: (s) => React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", style: { flexShrink: 0 } },
          React.createElement("path", { d: "M8.20554 0.899994L14.7901 3.36857V7.01026C14.7901 12 11.0466 14.2103 8.20554 15.3C5.36446 14.2103 1.62012 12 1.62012 7.01026V3.36857L8.20554 0.899994Z", stroke: "currentColor", strokeWidth: "1.31831", strokeLinejoin: "round" }),
          React.createElement("path", { d: "M12.1654 5.7552L8.9447 9.41475C8.73044 9.65816 8.53628 9.8804 8.35774 10.0423C8.1713 10.2114 7.94235 10.3717 7.64016 10.4254C7.48207 10.4535 7.32 10.4552 7.16151 10.4294C6.85843 10.3801 6.62728 10.2223 6.43836 10.0559C6.25752 9.89653 6.06037 9.67732 5.84264 9.43705L4.72925 8.20897L5.63557 7.38707L6.74897 8.61594C6.98603 8.87755 7.12974 9.03533 7.24673 9.13839C7.31033 9.19443 7.34485 9.21476 7.35823 9.22122C7.38068 9.22484 7.40352 9.22515 7.42593 9.22122C7.40522 9.22502 7.42893 9.23294 7.53583 9.136C7.65132 9.03126 7.79316 8.87139 8.02643 8.60638L11.2479 4.94763L12.1654 5.7552Z", fill: "currentColor" })) },
        "workspace-write": { label: "工作区内修改", svg: (s) => React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", style: { flexShrink: 0 } },
          React.createElement("path", { d: "M8.08887 0.251709C8.20479 0.23085 8.32486 0.241168 8.43652 0.282959L15.0215 2.75171C15.2787 2.84819 15.4492 3.09414 15.4492 3.3689V7.0105C15.4492 7.10986 15.4441 7.2081 15.4414 7.30542C15.0285 7.07175 14.5905 6.87695 14.1309 6.73022V3.82495L8.20508 1.60327L2.2793 3.82495V7.0105C2.27936 9.7171 3.4745 11.5379 5.02734 12.7947C5.01025 12.9942 5 13.1962 5 13.4001C5.00001 13.7617 5.02722 14.1169 5.08008 14.4636C2.91555 13.0393 0.961014 10.752 0.960938 7.0105V3.3689C0.960938 3.09417 1.13146 2.84821 1.38867 2.75171L7.97461 0.282959L8.08887 0.251709Z", fill: "currentColor" }),
          React.createElement("path", { d: "M11.3525 5.64688V6.85688H5V5.64688H11.3525Z", fill: "currentColor" }),
          React.createElement("path", { d: "M9.5824 8.29376V9.50376H5V8.29376H9.5824Z", fill: "currentColor" }),
          React.createElement("path", { d: "M14.6647 15.6852H10.0338C10.3878 15.3751 10.7567 15.0517 11.0772 14.7706C11.2531 14.6164 11.4144 14.4746 11.5511 14.3547H14.6647V15.6852Z", fill: "currentColor" }),
          React.createElement("path", { d: "M8.14852 14.1308L7.33925 15.4976C7.22458 15.6912 7.42245 15.9194 7.63037 15.8333L9.09785 15.2254L15.0399 10.0719L14.0905 8.97733L8.14852 14.1308Z", fill: "currentColor" })) },
        "danger-full-access": { label: "完全权限", svg: (s) => React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", style: { flexShrink: 0 } },
          React.createElement("path", { d: "M8.20554 0.899994L14.7901 3.36857V7.01026C14.7901 12 11.0466 14.2103 8.20554 15.3C5.36446 14.2103 1.62012 12 1.62012 7.01026V3.36857L8.20554 0.899994Z", stroke: "currentColor", strokeWidth: "1.31831", strokeLinejoin: "round" }),
          React.createElement("path", { d: "M9.10094 4.5V8.75939H7.59888V4.5H9.10094Z", fill: "currentColor" }),
          React.createElement("path", { d: "M9.10094 9.8114V11.5H7.59888V9.8114H9.10094Z", fill: "currentColor" })) },
        // 自定义组合（宿主在 sandbox/approval 不匹配任何预设时返回 custom）
        "custom": { label: "自定义", svg: (s) => React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", style: { flexShrink: 0 } },
          React.createElement("circle", { cx: 8, cy: 8, r: 6.5, stroke: "currentColor", strokeWidth: 1.3, fill: "none" }),
          React.createElement("path", { d: "M8 5v6M5 8h6", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round" })) }
      };
      const permCur = (permValue && typeof permValue === "object") ? permValue.currentValue : undefined;
      const permOptions = (permValue && typeof permValue === "object" && Array.isArray(permValue.options)) ? permValue.options : [];
      const permCurMeta = PERM_META[permCur] || PERM_META.custom;
      const [permErr, setPermErr] = React.useState("");   // 切换权限失败提示（此前不读返回，宿主拒绝时无任何提示）
      const selectPerm = async (id) => {
        setPermErr("");
        /* 对齐主界面（dsh-client-ui-conversation 的 access.confirm.* 文案与行为）：
           切到完全权限必须先过风险确认闸，勾选 acknowledge 才放行。 */
        if (id === "danger-full-access" && permCur !== "danger-full-access") {
          setPermOpen(false);
          setPermAck(false);
          setPermConfirm(true);
          return;
        }
        const ok = await doSelectPerm(id);
        // 成功才关下拉：permErr 就渲染在下拉里，先关掉的话失败提示等于不存在（此前正是如此）
        setPermOpen(!ok);
      };
      const doSelectPerm = async (id) => {   // 返回是否成功，供调用方决定关不关面板
        if (!session || typeof session.command !== "function") { setPermErr("会话未就绪，无法切换权限"); return false; }
        try {
          const r = await session.command("/permission " + id);
          // 宿主对未知/不匹配的预设回 {kind:"error"} 或 {value:{matched:false}}，据此提示
          if (r && r.kind === "error") { setPermErr((r.message || r.error || "切换权限失败")); return false; }
          if (r && r.value && r.value.matched === false) { setPermErr((r.value.message || "该权限组合不可用")); return false; }
          return true;
        } catch (e) { setPermErr(String((e && e.message) || e)); return false; }
      };

      const [input, setInput] = React.useState("");
      const [busy, setBusy] = React.useState(false);
      const [sendErr, setSendErr] = React.useState("");   // 发送失败提示（此前失败被静默吞掉、输入凭空消失）
      const listRef = React.useRef(null);
      const msgRefs = React.useRef({});
      const inputRef = React.useRef(null);

      /* ---- ㉕ @-mentions：输入 @ 弹文件候选，选中插入 @相对路径 ---- */
      const [mentionOpen, setMentionOpen] = React.useState(false);
      const [mentionQ, setMentionQ] = React.useState("");
      const [mentionIdx, setMentionIdx] = React.useState(0);
      // 缓存带签名（folders 路径串）：工作区增删后签名变化 → 自动失效重拉；
      // 失败不写缓存（留 null），下次仍重试，避免"一次失败永久无匹配文件"。
      const filesRef = React.useRef(null);   // { signature, files } | null
      const [mentionFiles, setMentionFiles] = React.useState([]);
      const mentionSignature = (folders || []).map((f) => f.path).filter(Boolean).join("|");
      const loadMentionFiles = async () => {
        const cached = filesRef.current;
        if (cached && cached.signature === mentionSignature) return cached.files;
        const fl = (folders || []).map((f) => f.path).filter(Boolean);
        if (!fl.length) { filesRef.current = { signature: "", files: [] }; setMentionFiles([]); return []; }
        try {
          const res = await apiCall("listTree", { paths: fl });
          const list = (res && res.ok && Array.isArray(res.files)) ? res.files : [];
          filesRef.current = { signature: mentionSignature, files: list };
          setMentionFiles(list);
          return list;
        } catch (e) { /* 不写缓存，下次重试 */ setMentionFiles([]); return []; }
      };
      const relOf = (p) => {
        const s = String(p || "");
        for (const f of (folders || [])) {
          const base = String(f.path || "").replace(/[\\/]+$/, "");
          if (base && s.toLowerCase().startsWith(base.toLowerCase() + "\\")) return s.slice(base.length + 1);
          if (base && s.toLowerCase().startsWith(base.toLowerCase() + "/")) return s.slice(base.length + 1);
        }
        return s;
      };
      // 输入变化：检测光标前的 @token
      const onInputChange = (e) => {
        const v = e.target.value;
        setInput(v);
        const caret = e.target.selectionStart == null ? v.length : e.target.selectionStart;
        const m = /@([^\s@]*)$/.exec(v.slice(0, caret));
        if (m) {
          setMentionQ(m[1]);
          setMentionIdx(0);
          setMentionOpen(true);
          if (!filesRef.current) loadMentionFiles();
        } else if (mentionOpen) {
          setMentionOpen(false);
        }
      };
      // 候选过滤 + 排序（源码优先：v/sv/vh → xdc → tcl → 其他 → md/txt/log），最多 30 条
      const mentionCands = React.useMemo(() => {
        if (!mentionOpen) return [];
        const q = String(mentionQ || "").toLowerCase();
        const list = mentionFiles || [];
        const pri = (rel) => {
          const e = (String(rel).split(".").pop() || "").toLowerCase();
          if (e === "v" || e === "sv" || e === "svh" || e === "vh") return 0;
          if (e === "xdc") return 1;
          if (e === "tcl" || e === "do") return 2;
          if (e === "md") return 4;
          if (e === "txt" || e === "log") return 5;
          return 3;
        };
        const out = [];
        for (const p of list) {
          const rel = relOf(p);
          if (!q || rel.toLowerCase().includes(q)) out.push({ path: p, rel, pri: pri(rel) });
          if (out.length >= 2000) break;
        }
        out.sort((a, b) => (a.pri - b.pri) || a.rel.localeCompare(b.rel));
        return out.slice(0, 400);
      }, [mentionOpen, mentionQ, mentionFiles, folders]);
      // 键盘 ↑↓ 导航时，把选中项滚入可视区
      const mentionRefs = React.useRef([]);
      React.useEffect(() => {
        const el = mentionRefs.current[mentionIdx];
        if (el && typeof el.scrollIntoView === "function") { try { el.scrollIntoView({ block: "nearest" }); } catch (e) { } }
      }, [mentionIdx, mentionOpen]);
      // 插入 @相对路径（替换光标前的 @token）
      const applyMention = (rel) => {
        const ta = inputRef.current;
        const caret = ta && ta.selectionStart != null ? ta.selectionStart : input.length;
        const m = /@([^\s@]*)$/.exec(input.slice(0, caret));
        if (!m) { setMentionOpen(false); return; }
        const start = caret - m[0].length;
        const next = input.slice(0, start) + "@" + rel + " " + input.slice(caret);
        setInput(next);
        setMentionOpen(false);
        if (ta) setTimeout(() => { try { ta.focus(); const pos = start + rel.length + 2; ta.setSelectionRange(pos, pos); } catch (e) { } }, 0);
      };
      const [follow, setFollow] = React.useState(true);   // 是否自动跟随最新
      // ⑱ 按工作区新建会话
      const [wsOpen, setWsOpen] = React.useState(false);
      const wsSvc = workspacesService;   // 模块级（apply 时注入）
      const wsSnap = React.useSyncExternalStore(
        (cb) => { if (!wsSvc || !wsSvc.list || typeof wsSvc.list.subscribe !== "function") return () => {}; return wsSvc.list.subscribe(cb); },
        () => { try { return (wsSvc && wsSvc.list && wsSvc.list.getSnapshot()) || null; } catch (e) { return null; } }
      );
      const wsItems = (wsSnap && Array.isArray(wsSnap.items)) ? wsSnap.items : [];
      /* 当前绑定/锚定到的平台工作区：算出按钮文案，以及在列表里勾出这一行 */
      const bindWsNameOf = (w) => (w ? (w.title || String(w.path || "").split(/[\\/]/).filter(Boolean).pop() || String(w.workspaceId || "")) : "");
      const anchorId = String(anchorWs == null ? "" : anchorWs);
      const anchorItem = anchorId ? (wsItems.filter((w) => String(w && w.workspaceId) === anchorId)[0] || null) : null;
      const bindChip = bindChipOf(anchorId, anchorManual === true, anchorItem ? bindWsNameOf(anchorItem) : "");
      const [wsErr, setWsErr] = React.useState("");   // 新建对话失败提示（此前是静默无反应）
      /* 新建对话的正确 API 在 uiWorkspace 服务上：uiWorkspace.startSession(workspaceId?)
           —— 无参 = 当前会话所属工作区（没有则最近工作区）；有参 = 指定工作区。
         注意：workspaces（纯控制器）里【没有】startSession，旧代码调 wsSvc.startSession
         恒因 typeof 判空而跳过 —— 点「+」和「▾ 选工作区」都毫无反应且不报错。 */
      const startSessionVia = (wsId) => {
        /* ㊸ 解耦：在代码工作区（或指定工作区）新建会话走 sessions.create + 本地换锚点，
           不再用 uiWorkspace.startSession —— 那条路会把主界面的当前会话一起切走。
           优先用【代码工作区路径】建（host 支持 create({cwd})，不需要登记任何平台工作区），
           有已登记的同路径工作区时才用 workspaceId（这样在主界面也能归到这个工作区下）。
           两条都拿不到时仍走原来的官方路径。 */
        const wantWs = wsId || (props && props.anchorWs) || "";
        const wantPath = (props && props.anchorPath) || "";
        if ((wantWs || wantPath) && sessions && typeof sessions.create === "function" && props && typeof props.onPinSession === "function") {
          try {
            const made = sessions.create(wantWs ? { workspaceId: wantWs } : { cwd: wantPath });
            setWsErr("");
            Promise.resolve(made).then((sid) => {
              if (sid) { try { props.onPinSession(String(sid)); } catch (e) { } }
            }, (e) => { setWsErr("新建对话失败：" + ((e && e.message) || String(e))); });
            return true;
          } catch (e) { /* 落到下面官方的 startSession 路径 */ }
        }
        const svc = (uiWorkspaceSvc && typeof uiWorkspaceSvc.startSession === "function") ? uiWorkspaceSvc
          : ((wsSvc && typeof wsSvc.startSession === "function") ? wsSvc : null);
        if (!svc) { setWsErr("新建对话失败：uiWorkspace 服务不可用"); return false; }
        try { svc.startSession(wsId); setWsErr(""); return true; }
        catch (e) { setWsErr("新建对话失败：" + ((e && e.message) || String(e))); return false; }
      };
      const newSessionIn = (wsId) => { setWsOpen(false); startSessionVia(wsId); };
      // VSCode Claude 式：一键在当前工作区新建会话（无参 = 继承当前会话的工作区）
      const newSessionHere = () => { setWsOpen(false); startSessionVia(); };
      /* 添加工作区（等价主界面的「添加工作区」）：
           uiWorkspace.pickDirectory() 弹原生目录选择器（对话框里可直接新建文件夹）→
           workspaces.create({ path }) 注册（WorkspaceCreateRequest 只有 path）→
           uiWorkspace.startSession(新工作区) 直接在那里开会话。
         全程失败都写 wsErr（显示在病因条），不留静默。 */
      const addWorkspaceVia = async () => {
        setWsErr("");
        const picker = (uiWorkspaceSvc && typeof uiWorkspaceSvc.pickDirectory === "function") ? uiWorkspaceSvc
          : ((wsSvc && typeof wsSvc.pickDirectory === "function") ? wsSvc : null);
        if (!picker) { setWsErr("添加工作区失败：目录选择服务不可用"); return; }
        let dir = "";
        try { dir = await picker.pickDirectory(); }
        catch (e) { setWsErr("选择目录失败：" + ((e && e.message) || String(e))); return; }
        if (!dir) { setWsErr("已取消选择目录"); return; }
        const creator = (wsSvc && typeof wsSvc.create === "function") ? wsSvc : null;
        if (!creator) { setWsErr("添加工作区失败：workspaces.create 不可用"); return; }
        let wsId = "";
        try {
          const r = await creator.create({ path: dir });
          if (r && r.ok === false) {
            setWsErr("添加工作区失败：" + ((r.error && (r.error.message || r.error.code)) || "未知错误"));
            return;
          }
          const w = r && r.value && r.value.workspace;
          wsId = (w && w.workspaceId) || "";
        } catch (e) { setWsErr("添加工作区失败：" + ((e && e.message) || String(e))); return; }
        setWsErr("");
        if (wsId) startSessionVia(wsId);   // 直接在该工作区开新对话（下拉已由 startSessionVia 关闭）
        else { setWsOpen(false); setWsErr("已注册工作区，请在列表中点选"); }
      };
      // 按 seq 升序排序（快照 nodes 不保证顺序；升序才能让"最新在底部"）
      const nodesOf = (v) => {
        if (!v) return [];
        /* 0.1.5 的 chat 视图快照是 { order, nodes:<store>, locations, navigation, timeline, legacy }，
           nodes 是 Map 型 store（不是数组）；数组形式的老节点在 legacy.nodes 里
           （官方 EMPTY_CHAT_SNAPSHOT 与 ChatSnapshotBuilder.snapshot() 均如此）。 */
        if (v.legacy && Array.isArray(v.legacy.nodes)) return v.legacy.nodes;
        if (Array.isArray(v.nodes)) return v.nodes;
        if (v.nodes && typeof v.nodes.values === "function") { try { return Array.from(v.nodes.values()); } catch (e) { return []; } }
        if (typeof v.nodes === "function") { try { return v.nodes() || []; } catch (e) { return []; } }
        return [];
      };
      /* 官方 chat 视图节点形状（dsh-client-ui-chat 源码核实）：{ key, kind, anchorSeq, data }
           kind ∈ user | steering | assistant-step | tool-result | turn-process | context | command
           user            → data.content（字符串，或 [{type:"text",text}]）
           assistant-step  → data.blocks / data.status / data.finalNode
         block 形状与下面 asstParts 期望的完全一致：
           {kind:"text"|"reasoning", text} / {kind:"tool-call", callId, name, argsRaw}
         这里折算成下面渲染代码原本使用的老形状（{kind,seq,content} / {kind,seq,blocks}），
         于是渲染、轮次聚合、Fork 全都不用改。 */
      const normalizeNodes = (raw) => {
        const out = [];
        for (const nd of (Array.isArray(raw) ? raw : [])) {
          if (!nd || nd.visibility === "hidden") continue;
          const d = (nd.data && typeof nd.data === "object") ? nd.data : null;
          const seq = (typeof nd.seq === "number") ? nd.seq : nd.anchorSeq;
          /* 两种来源都要认：
             ① chat 视图的 legacy 切片 —— 节点本身就是老形状（content / blocks 在顶层）；
             ② chat 视图的 nodes 存储 —— 新形状，内容在 data 里。 */
          const content = (nd.content !== undefined) ? nd.content : (d ? d.content : undefined);
          const bl = Array.isArray(nd.blocks) ? nd.blocks
            : ((d && Array.isArray(d.blocks)) ? d.blocks
              : ((d && d.finalNode && Array.isArray(d.finalNode.blocks)) ? d.finalNode.blocks : []));
          /* 图片附件：user 的 content 里是 {type:"image",attachment}，assistant 的 blocks 里是 {kind:"image",attachment}。
             以前只取文字，图片被整条丢掉（用户反馈“对话不显示图片”）。 */
          const imgs = [];
          if (Array.isArray(content)) for (const b of content) if (b && b.type === "image" && b.attachment) imgs.push(b.attachment);
          for (const b of bl) if (b && b.kind === "image" && b.attachment) imgs.push(b.attachment);
          if (nd.kind === "user" || nd.kind === "steering") {
            out.push({ kind: nd.kind, seq: seq, content: content, images: imgs });
          } else if (nd.kind === "assistant" || nd.kind === "assistant-step") {
            out.push({ kind: "assistant", seq: seq, blocks: bl, images: imgs });
          }
          // 其它节点（tool-result / turn-process / context / command …）不单独渲染，避免碎片化
        }
        return out;
      };
      const convNodeCount = nodesOf(convSnap).length;
      const oldNodeCount = (snap && Array.isArray(snap.nodes)) ? snap.nodes.length : 0;
      const nodes = React.useMemo(() => {
        let list = normalizeNodes(nodesOf(convSnap));
        if (!list.length) list = normalizeNodes(nodesOf(snap));   // 旧路径兜底（0.1.5 上恒为空）
        return list.slice().sort((a, b) => ((a && a.seq) || 0) - ((b && b.seq) || 0));
      }, [convSnap, snap]);
      const running = snap && snap.running;

      // 自动滚到底部（仅当 follow 开启）
      React.useEffect(() => {
        if (follow && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, [nodes.length, running, follow]);

      // 用户手动滚动时，判断是否应该关闭"自动跟随"；滚到最上面则继续加载更早的历史
      const olderBusyRef = React.useRef(false);   // 防抖：一次 loadOlder 未完成前不重复发起
      const onScroll = () => {
        const el = listRef.current;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        setFollow(nearBottom);
        /* 滚到顶（48px 内）就加载更早的消息。以前缺这一步：平台里滚到顶就停住，
           必须回主界面滚一次、加载好了再回平台才能继续往上 —— 用户反馈的正是这个。 */
        if (el.scrollTop <= 48 && snap && snap.hasMore && !snap.loadingOlder && !olderBusyRef.current
            && session && typeof session.loadOlder === "function") {
          olderBusyRef.current = true;
          const before = el.scrollHeight;
          const done = () => {
            olderBusyRef.current = false;
            /* 视口锚定：新内容加在【上方】，把 scrollTop 下移同样的高度差，否则画面会跳到最顶 */
            const cur = listRef.current;
            if (cur) cur.scrollTop = Math.max(0, cur.scrollHeight - before + 48);
          };
          try {
            const r = session.loadOlder();
            if (r && typeof r.then === "function") r.then(done, done);
            else done();
          } catch (e) { done(); }
        }
      };

      const send = async () => {
        const text = (input || "").trim();
        if (!text || !session || typeof session.prompt !== "function") return;
        setBusy(true);
        setFollow(true);
        setSendErr("");
        // 注意：输入框只在【发送成功后】清空 —— 此前一进函数就 setInput("")，
        // 一旦 prompt 抛错或返回 ok:false，用户输入会凭空消失且无任何提示。
        try {
          const parts = [];
          // ㉒ 附带编辑器选中的代码（VSCode Claude：选中代码自动作为上下文可见）
          if (selLines > 0 && !selMuted) {
            const fname = activePath ? (String(activePath).split(/[\\/]/).pop() || activePath) : "选中代码";
            let code = String((selInfo && selInfo.text) || "");
            const MAX_SEL = 20000;
            const cut = code.length > MAX_SEL;
            if (cut) code = code.slice(0, MAX_SEL);
            parts.push({
              type: "text",
              text: "以下是我在编辑器中选中的代码（" + fname + (selFrom ? ("#" + selFrom + "-" + selTo) : "") + "，共 " + selLines + " 行" + (cut ? "，已截断" : "") + "）：\n```\n" + code + "\n```\n\n"
            });
          }
          parts.push({ type: "text", text });
          const r = await session.prompt(parts, "queue");
          // RpcResult 信封：{ok:false,error} 同样是失败，不能当成功处理
          if (r && r.ok === false) {
            const em = r.error && (r.error.message || r.error.code || String(r.error));
            throw new Error(em || "服务端拒绝了本次发送");
          }
          setInput("");
        } catch (e) {
          setSendErr("发送失败：" + ((e && (e.message || e)) || "未知错误") + "　（内容已保留，可直接重试）");
        }
        setBusy(false);
      };
      // 停止生成（生成中发送按钮变停止）
      const stopRun = async () => {
        if (!session || typeof session.cancel !== "function") return;
        try { await session.cancel(); } catch (e) { /* 忽略 */ }
      };
      // ㉘ 从某轮分支（Fork）：新会话继承到该轮为止的上下文，原会话保留
      const [hoverTurn, setHoverTurn] = React.useState(null);
      const forkFrom = async (seq) => {
        if (!sessions || typeof sessions.fork !== "function" || sessionId === undefined) return;
        try {
          const newId = await sessions.fork({ sessionId: sessionId, atSeq: seq });
          if (newId) { try { sessions.open(newId); } catch (e) { /* 忽略 */ } }
        } catch (e) { /* 忽略 */ }
      };

      // 提取 user 消息文本
      const userText = (n) => {
        if (!n || !n.content) return "";
        if (typeof n.content === "string") return n.content;
        if (Array.isArray(n.content)) {
          return n.content.map((b) => (b && typeof b === "object" && b.type === "text" ? b.text : "")).join("");
        }
        return "";
      };
      // assistant 消息：拆成 text / reasoning / tool-call 三部分
      const asstParts = (n) => {
        if (!n || !Array.isArray(n.blocks)) return { texts: [], reasoning: [], tools: [], images: [] };
        const texts = [], reasoning = [], tools = [], images = [];
        for (const b of n.blocks) {
          if (!b) continue;
          if (b.kind === "text" && b.text) texts.push(b.text);
          else if (b.kind === "reasoning" && b.text) reasoning.push(b.text);
          else if (b.kind === "image" && b.attachment) images.push(b.attachment);
          // ㉖ 工具调用：保留名称 + 参数（可展开查看），不只是名字
          else if (b.kind === "tool-call" && b.name) tools.push({ name: b.name, args: String(b.argsRaw || ""), callId: b.callId || "" });
        }
        return { texts, reasoning, tools, images };
      };

      // 流式进行中的步骤：DSH 在 status==="running" 时【不把该步放进 nodes】，
      // 只放在 snap.partial（{turn, step, blocks}）里。此前插件只读 nodes，
      // 于是整个生成过程面板一片空白，结束时整段突然出现。
      // 流式增量：0.1.5 的 chat 视图把它放在 legacy.partial（与老 snap.partial 同形状）；
      // 顶层 partial 与老路径的 snap.partial 都作兜底。
      const convPartial = (convSnap && convSnap.legacy && convSnap.legacy.partial) ? convSnap.legacy.partial
        : ((convSnap && convSnap.partial) ? convSnap.partial : null);
      const partial = (convPartial && Array.isArray(convPartial.blocks)) ? convPartial
        : ((snap && snap.running && snap.partial && Array.isArray(snap.partial.blocks)) ? snap.partial : null);

      // 按 turn 聚合：一次「提问 → 回答」是一轮；一轮内可能有多条 assistant/tool 节点，
      // 必须合并成一条「AI 回答」，否则一次回复被拆成碎片（AI/AI/AI 堆叠）。
      const turns = React.useMemo(() => {
        const out = [];   // [{ user, assistant: {texts, reasoning, tools}, seq, streaming }]
        let cur = null;
        for (const n of nodes) {
          if (!n) continue;
          if (n.kind === "user") {
            cur = { user: userText(n), userImgs: (n.images || []), seq: n.seq, assistant: { texts: [], reasoning: [], tools: [], images: [] } };
            out.push(cur);
          } else if (n.kind === "assistant") {
            if (!cur) { cur = { user: "", userImgs: [], seq: n.seq, assistant: { texts: [], reasoning: [], tools: [], images: [] } }; out.push(cur); }
            const p = asstParts(n);
            cur.assistant.texts.push(...p.texts);
            cur.assistant.reasoning.push(...p.reasoning);
            cur.assistant.tools.push(...p.tools);
            if (p.images && p.images.length) cur.assistant.images.push(...p.images);
          }
          // 其它节点（tool-result / command / steering / context …）不单独渲染，避免碎片化
        }
        // 合并"进行中"的那一步，让流式增量实时可见
        if (partial) {
          if (!cur) { cur = { user: "", userImgs: [], seq: 0, assistant: { texts: [], reasoning: [], tools: [], images: [] } }; out.push(cur); }
          const p = asstParts({ blocks: partial.blocks });
          cur.assistant.texts.push(...p.texts);
          cur.assistant.reasoning.push(...p.reasoning);
          cur.assistant.tools.push(...p.tools);
          if (p.images && p.images.length) cur.assistant.images.push(...p.images);
          cur.streaming = true;
        }
        return out;
      }, [nodes, partial]);

      // turn-rail：每轮一个标记（一个 user 提问一个）
      const userTurns = turns.filter((t) => t && t.user);
      /* 对话末尾的「⑂ 从此分支」常驻：悬停显隐会让末尾高度忽增忽减，鼠标在回复区与输入区之间移动时"跳一下" */
      const lastTurnSeq = userTurns.length ? userTurns[userTurns.length - 1].seq : null;
      // 一条消息都没渲染出来时，把两路节点数写进病因条 —— 一次刷新即可判定新 API 是否供上了数据
      /* 刚新建的空会话（摘要 blank=1、日志里只有一条 session 头记录）本来就没有消息，
         chat 节点 0 是正确的 —— 这时不能报依赖缺失（实测误报过一次，红字把用户吓到）。 */
      const curSum = histById[sessionId] || null;
      const blankSession = !!(curSum && curSum.blank);
      if (turns.length === 0 && !blankSession) {
        const shape = !convSnap ? String(convSnap)
          : (Object.keys(convSnap).join("+") + "，legacy.nodes=" + ((convSnap.legacy && Array.isArray(convSnap.legacy.nodes)) ? convSnap.legacy.nodes.length : "无"));
        chatDiag.push("消息 0 条（chat 节点 " + convNodeCount + " / 旧 snap.nodes " + oldNodeCount + " / 快照 " + shape + "）");
        /* 关键分叉：会话本身没有事件，还是事件有了但装配器没匹配上。 */
        try {
          const bnd = (sessions && sessionId !== undefined && typeof sessions.binding === "function") ? sessions.binding(sessionId) : null;
          const esSnap = (bnd && bnd.eventSource && typeof bnd.eventSource.getSnapshot === "function") ? bnd.eventSource.getSnapshot() : null;
          const sum = histById[sessionId] || null;
          chatDiag.push("会话 " + String(sessionId).slice(0, 10)
            + "｜摘要 " + (sum ? ("有(blank=" + (sum.blank ? 1 : 0) + " origin=" + (sum.origin || "-") + ")") : "不在列表")
            + "｜原始事件 " + ((esSnap && esSnap.entries) ? esSnap.entries.length : "?")
            + "｜change " + String((esSnap && esSnap.change && esSnap.change.kind) || "?") + "）");
        } catch (e) { chatDiag.push("会话/事件探针异常：" + ((e && e.message) || String(e))); }
      }

      // 选模型下拉内容：提前构建行数组（避免深层嵌套括号）
      // ---- 选模型辅助（对齐主界面 ModelSelect 的推导）----
      const modelChoices = [];
      if (modelState && Array.isArray(modelState.groups)) {
        for (const g of modelState.groups) {
          for (const m of (g.models || [])) modelChoices.push({ provider: g.id, model: m });
        }
      }
      /* 与主界面完全一致的当前模型（官方：current = projected.next ?? catalog.value.default）。
         会话没写过模型选择时 projected.next 为 undefined，就落到全局默认模型。 */
      const modelCurrent = (modelProj && modelProj.next) ? modelProj.next
        : ((modelState && modelState.default) ? modelState.default : null);
      const curChoice = modelCurrent
        ? modelChoices.find((c) => c.provider === modelCurrent.provider && c.model.id === modelCurrent.model)
        : undefined;
      const curReasoning = (curChoice && curChoice.model) ? curChoice.model.reasoning : undefined;
      const curEffortRaw = modelCurrent ? modelCurrent.reasoningEffort : undefined;
      const effectiveEffort = curEffortRaw !== undefined ? curEffortRaw : (curReasoning ? curReasoning.defaultEffort : undefined);
      const effortNameOf = (eff) => {
        if (eff === undefined) return "默认";
        if (curReasoning && Array.isArray(curReasoning.efforts)) {
          const hit = curReasoning.efforts.find((l) => l.id === eff);
          if (hit) return hit.name;
        }
        return eff;
      };
      const curModelName = (curChoice && curChoice.model) ? curChoice.model.name
        : ((modelCurrent && modelCurrent.model) || "选模型");
      const curEffortLabel = curReasoning ? effortNameOf(effectiveEffort) : undefined;
      const effortOptions = () => {
        if (!curReasoning) return [];
        const out = [];
        if (curReasoning.defaultEffort === undefined) out.push({ key: "provider-default", effort: undefined, label: "默认" });
        for (const e of (curReasoning.efforts || [])) out.push({ key: "effort:" + e.id, effort: e.id, label: e.name, description: e.description });
        return out;
      };
      const chooseEffort = (eff) => {
        if (!modelCurrent) return;
        if (eff === undefined) selectModel(modelCurrent.provider, modelCurrent.model, undefined);
        else selectModel(modelCurrent.provider, modelCurrent.model, eff);
      };
      // 单个可点行（右箭头 / 选中勾）
      const paneRow = (key, label, detail, selected, chevron, onClick) => React.createElement("div", {
        key: key,
        onClick: onClick,
        title: detail || label,
        style: { padding: "7px 10px", fontSize: 12, cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", gap: 8, color: selected ? "#fff" : "#BBBEBF", background: selected ? "rgba(57,148,188,.22)" : "transparent" },
        onMouseEnter: (e) => { if (!selected) e.currentTarget.style.background = "#1E1F20"; },
        onMouseLeave: (e) => { if (!selected) e.currentTarget.style.background = "transparent"; }
      },
        React.createElement("span", { style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, label),
        detail ? React.createElement("span", { style: { fontSize: 11, color: "#8a8a8a", flexShrink: 0, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, detail) : null,
        chevron ? React.createElement("span", { style: { color: "#8a8a8a", flexShrink: 0 } }, "▸") : null,
        selected && !chevron ? React.createElement("span", { style: { color: "#3994BC", flexShrink: 0 } }, "✓") : null);

      // 模型弹层内容（三级 pane：root 导航 / model 列表 / effort 列表）
      const renderModelRows = () => {
        if (!modelState || modelState.status === "loading") {
          return React.createElement("div", { style: { padding: "10px 12px", fontSize: 12, color: "#7a7a7a" } }, "加载模型…");
        }
        if (modelState.status === "error") {
          return React.createElement("div", { style: { padding: "10px 12px", fontSize: 12, color: "#d19a66" } }, "加载失败: " + (modelState.error || "未知"));
        }
        if (modelPane === "root") {
          const cells = [];
          cells.push(paneRow("cell-model", "模型", curModelName, false, true, () => setModelPane("model")));
          if (curReasoning) cells.push(paneRow("cell-effort", "思考程度", curEffortLabel, false, true, () => setModelPane("effort")));
          return cells;
        }
        if (modelPane === "model") {
          const rows = [];
          for (const g of (modelState.groups || [])) {
            rows.push(React.createElement("div", { key: "g:" + g.id, style: { padding: "4px 10px", fontSize: 11, color: "#7a7a7a", fontWeight: 600 } }, g.name));
            for (const m of (g.models || [])) {
              const isCur = modelState.current && modelState.current.provider === g.id && modelState.current.model === m.id;
              rows.push(paneRow(g.id + "/" + m.id, m.name, m.description, isCur, false,
                () => selectModel(g.id, m.id, m.reasoning && m.reasoning.defaultEffort)));
            }
          }
          return rows;
        }
        if (modelPane === "effort") {
          const opts = effortOptions();
          if (!opts.length) return React.createElement("div", { style: { padding: "10px 12px", fontSize: 12, color: "#7a7a7a" } }, "此模型无思考程度可选");
          return opts.map((l) => paneRow(l.key, l.label, l.description, effectiveEffort === l.effort, false, () => chooseEffort(l.effort)));
        }
        return null;
      };

      // 权限下拉行数组（避免深层嵌套括号）
      const renderPermRows = () => {
        const src = permOptions.length ? permOptions : Object.keys(PERM_META).map((k) => ({ value: k }));
        const rows = [];
        for (const o of src) {
          const meta = PERM_META[o.value] || PERM_META.custom;   // 未知值（含 custom）用兜底，不再丢弃整行
          if (!meta) continue;
          const isCur = permCur === o.value;
          /* 与主界面 displayPermissionPreset 同规则：宿主给的是内置英文名（或干脆就是 id）时
             用我们的本地化标签；只有宿主给了自定义名才用它的。 */
          const hostName = (o.name != null && o.name !== "") ? String(o.name) : "";
          const isBuiltinName = hostName === "" || hostName === o.value || ["Read Only", "Workspace Write", "Full access"].includes(hostName);
          const label = isBuiltinName ? meta.label : hostName;
          rows.push(React.createElement("div", {
            key: o.value,
            onClick: () => selectPerm(o.value),
            title: label,
            style: { padding: "6px 10px", fontSize: 12, cursor: "pointer", borderRadius: 4, color: isCur ? "#fff" : "#BBBEBF", background: isCur ? "rgba(57,148,188,.22)" : "transparent", display: "flex", alignItems: "center", gap: 6 },
            onMouseEnter: (e) => { if (!isCur) e.currentTarget.style.background = "#1E1F20"; },
            onMouseLeave: (e) => { if (!isCur) e.currentTarget.style.background = "transparent"; }
          }, meta.svg(), React.createElement("span", null, label)));
        }
        return rows;
      };

      /* 历史列表口径与主界面完全一致（dsh-client-ui-workspace 源码）：
           sessionVisible(s, current, archived) = s.origin !== "subagent"
                                                  && !archived.has(s.id)
                                                  && (!s.blank || s.id === current)
         外加按工作区分组：主界面一个工作区一组、成员取自 workspace.sessionIds（保持其存储顺序）；
         不属于任何工作区的会话在「未分组」桶里，不算本工作区的成员。
         缺了这三条就会把已归档、非当前空会话、其他工作区的会话都列出来（用户实测多出 5 条）。
         位置要求：必须在本行之后（wsSnap/wsItems 的声明处），写在前面会 TDZ。 */
      const archivedIds = (wsSnap && Array.isArray(wsSnap.archivedSessionIds)) ? wsSnap.archivedSessionIds : [];
      const curWs = (sessionId !== undefined)
        ? (wsItems.find((w) => w && Array.isArray(w.sessionIds) && w.sessionIds.includes(sessionId)) || null)
        : null;
      const sessionVisible = (sum, id) => !!sum
        && sum.origin !== "subagent"
        && archivedIds.indexOf(id) < 0
        && (!sum.blank || id === sessionId);
      const histSourceIds = curWs ? curWs.sessionIds : histAllIds;   // 找不到工作区时退回全部（仍按可见性过滤）
      const histIds = histSourceIds.filter((id) => sessionVisible(histById[id], id));

      // 历史会话下拉：提前构建行数组（避免深层嵌套括号）
      const renderHist = () => {
        const rows = [];
        if (histErr) {
          rows.push(React.createElement("div", {
            key: "h-err",
            style: { margin: "4px 6px", padding: "5px 8px", background: "rgba(248,81,73,.14)", border: "1px solid rgba(248,81,73,.4)", borderRadius: 5, color: "#f48771", fontSize: 11, lineHeight: "16px", wordBreak: "break-all", display: "flex", gap: 6 }
          },
            React.createElement("span", { style: { flex: 1 } }, histErr),
            React.createElement("span", { onClick: () => setHistErr(""), style: { cursor: "pointer", color: "#858889" } }, "✕")));
        }
        if (histResults !== null) {
          /* 搜索结果模式（按内容搜） */
          if (histSearching) {
            rows.push(React.createElement("div", { key: "s-load", style: { padding: "8px 12px", fontSize: 12, color: "#7a7a7a" } }, "搜索中…"));
          } else {
            /* SessionSearchItem 只有 {sessionId, snippet}，所以回表到 byId 判断子代理/已归档/空会话；
               摘要不在列表里（分页外）时保留该条，交给后端过滤。 */
            const visibleHits = histResults.filter((it) => {
              if (!it || !it.sessionId) return false;
              const sum = histById[it.sessionId];
              if (!sum) return true;
              return sum.origin !== "subagent" && archivedIds.indexOf(it.sessionId) < 0 && !sum.blank;
            });
            if (visibleHits.length === 0) {
              rows.push(React.createElement("div", { key: "s-none", style: { padding: "8px 12px", fontSize: 12, color: "#7a7a7a" } }, "无匹配会话"));
            }
            for (const it of visibleHits) {
              const sum = histById[it.sessionId] || {};
              const title = sum.displayTitle || sum.title || it.sessionId;
              rows.push(React.createElement("div", {
                key: "s-" + it.sessionId,
                onClick: () => openSession(it.sessionId),
                title: sum.cwd || it.sessionId,
                style: { padding: "7px 10px", cursor: "pointer", borderRadius: 4, background: "transparent" },
                onMouseEnter: (e) => { e.currentTarget.style.background = "#1E1F20"; },
                onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
              },
                React.createElement("div", { style: { fontSize: 12, color: "#BBBEBF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, title),
                React.createElement("div", { style: { fontSize: 11, color: "#8a8a8a", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, it.snippet || "")));
            }
          }
        } else {
          /* 会话列表模式（含重命名） */
          for (const id of histIds) {
            const sum = histById[id];
            if (!sum) continue;
            const title = sum.displayTitle || sum.title || id;
            const ws = wsNameOf(sum);
            const isCur = id === sessionId;
            if (renameId === id) {
              rows.push(React.createElement("div", { key: id, style: { padding: "4px 6px", display: "flex", gap: 4 } },
                React.createElement("input", {
                  autoFocus: true,
                  value: renameVal,
                  onChange: (e) => setRenameVal(e.target.value),
                  onKeyDown: (e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") { e.preventDefault(); doRename(id, renameVal); }
                    if (e.key === "Escape") { e.preventDefault(); setRenameId(null); }
                  },
                  onBlur: () => doRename(id, renameVal),
                  style: { flex: 1, background: "#2A2B2C", color: "#BBBEBF", border: "1px solid #3994BC", borderRadius: 4, padding: "3px 6px", fontSize: 12, outline: "none" }
                })));
              continue;
            }
            rows.push(React.createElement("div", {
              key: id,
              onClick: () => openSession(id),
              title: sum.cwd || id,
              style: { padding: "7px 10px", fontSize: 12, cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", gap: 6, background: isCur ? "rgba(57,148,188,.22)" : "transparent" },
              onMouseEnter: (e) => { if (!isCur) e.currentTarget.style.background = "#1E1F20"; },
              onMouseLeave: (e) => { if (!isCur) e.currentTarget.style.background = "transparent"; }
            },
              React.createElement("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isCur ? "#fff" : "#BBBEBF" } }, title),
              /* 行状态标签：DSH 的会话没有「已删除/已归档」状态，可判定的只有 blank/running/origin，
                 把可判定的标出来，避免用户对着一个空行猜它是什么。 */
              sum.blank ? React.createElement("span", { style: { fontSize: 10, color: "#7a7a7a", border: "1px solid #3C3C3C", borderRadius: 3, padding: "0 3px", flexShrink: 0 } }, "空会话") : null,
              sum.running ? React.createElement("span", { style: { fontSize: 10, color: "#3994BC", border: "1px solid #3994BC", borderRadius: 3, padding: "0 3px", flexShrink: 0 } }, "运行中") : null,
              ws ? React.createElement("span", { style: { fontSize: 10, color: "#7a7a7a", flexShrink: 0, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, ws) : null,
              React.createElement("span", { style: { fontSize: 10, color: "#858889", flexShrink: 0 } }, fmtTime(sum.updatedAt)),
              /* ㉛ 重命名 */
              React.createElement("span", {
                onClick: (e) => { e.stopPropagation(); startRename(id, title); },
                title: "重命名会话",
                style: { fontSize: 11, color: "#8a8a8a", flexShrink: 0, cursor: "pointer", padding: "0 2px" },
                onMouseEnter: (e) => { e.currentTarget.style.color = "#3994BC"; },
                onMouseLeave: (e) => { e.currentTarget.style.color = "#8a8a8a"; }
              }, "✎")));
          }
        }
        return React.createElement(React.Fragment, null,
          React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 50 }, onClick: () => setHistOpen(false) }),
          React.createElement("div", {
            style: { position: "absolute", top: 34, right: 4, background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, boxShadow: "0 6px 18px rgba(0,0,0,.5)", padding: 4, zIndex: 60, minWidth: 320, maxHeight: 420, display: "flex", flexDirection: "column" }
          },
            /* 搜索框 */
            React.createElement("div", { style: { padding: "2px 4px 5px", flexShrink: 0 } },
              React.createElement("input", {
                value: histQ,
                spellCheck: false,
                placeholder: "搜索会话内容…（清空返回列表）",
                onChange: (e) => onHistQ(e.target.value),
                onKeyDown: (e) => e.stopPropagation(),
                style: { width: "100%", boxSizing: "border-box", background: "#2A2B2C", color: "#BBBEBF", border: "1px solid #3C3C3C", borderRadius: 4, padding: "4px 8px", fontSize: 12, outline: "none" }
              })),
            React.createElement("div", { style: { overflowY: "auto", flex: 1, minHeight: 0 } },
              rows.length === 0
                ? React.createElement("div", { style: { padding: "10px 12px", fontSize: 12, color: "#7a7a7a" } }, histResults !== null ? "无匹配会话" : "暂无历史会话")
                : rows)));
      };

      const renderTurn = (t, i) => {
        const hasReason = t.assistant.reasoning.length > 0;
        const hasTool = t.assistant.tools.length > 0;
        const body = t.assistant.texts.join("\n");
        return React.createElement("div", {
          key: "t" + t.seq,
          ref: (el) => { msgRefs.current[t.seq] = el; },
          onMouseEnter: () => setHoverTurn(t.seq),
          onMouseLeave: () => setHoverTurn((h) => (h === t.seq ? null : h)),
          // 对齐主对话界面：轮次间 16px 间距，不用分隔线
          style: { padding: "10px 16px", display: "flex", flexDirection: "column", gap: 12, position: "relative" }
        },
          /* 提问（右，气泡）—— 主界面 .gdEzaW_bubble：16px/24px，圆角 22px，padding 10px 16px */
          (t.user || (t.userImgs && t.userImgs.length)) ? React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 } },
            /* 提问里的图片附件（此前只取文字块，图片被丢掉） */
            (t.userImgs && t.userImgs.length) ? React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: "88%" } },
              t.userImgs.map((a, i) => React.createElement(ChatImg, { key: "ui" + i, uiConversation: uiConversation, sessionId: sessionId, attachment: a }))) : null,
            t.user ? React.createElement("div", {
              style: { maxWidth: "88%", background: "#2b3a52", color: "#e8f0fa", borderRadius: 22, padding: "10px 16px", fontSize: 16, lineHeight: "24px", whiteSpace: "pre-wrap", wordBreak: "break-word", textAlign: "left" }
            }, (() => {
              /* 选中代码块折成引用芯片（见 splitSelCtx）：代码照发，只是不再显示在提问里 */
              const us = splitSelCtx(t.user);
              return React.createElement(React.Fragment, null,
                us.ref ? React.createElement("div", {
                  title: "这次提问附带的选中代码（已作为上下文发给模型）",
                  style: { fontFamily: "Consolas,Menlo,monospace", fontSize: 12, lineHeight: "18px", color: "#a8c6e8", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 4, padding: "1px 6px", marginBottom: 6, display: "inline-block", whiteSpace: "nowrap" }
                }, us.ref) : null,
                us.rest ? React.createElement("span", null, us.rest) : null);
            })()) : null) : null,
          /* 回答（左，无气泡）—— 对齐主界面 .Sxvs8a_root：16px/28px，无背景 */
          React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, width: "100%" } },
            hasReason ? React.createElement("div", {
              style: { fontSize: 14, lineHeight: "24px", color: "#9a9a9a", maxWidth: "100%", whiteSpace: "pre-wrap", wordBreak: "break-word", borderLeft: "2px solid #2A2B2C", paddingLeft: 10 }
            }, "💭 " + t.assistant.reasoning.join(" ").slice(0, 400)) : null,
            hasTool ? React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2, width: "100%" } },
              t.assistant.tools.map((tl, ti) => {
                const shortArgs = String(tl.args || "").replace(/\s+/g, " ").trim();
                // 从参数里挑一个"最有信息量"的字段做摘要（文件路径/命令/查询）
                let hint = "";
                try {
                  const o = JSON.parse(tl.args || "{}");
                  hint = String(o.file_path || o.path || o.pattern || o.query || o.command || o.cmd || o.glob || "");
                } catch (e) { hint = ""; }
                if (!hint) hint = shortArgs.slice(0, 80);
                return React.createElement("details", {
                  key: (tl.callId || "tc") + ti,
                  style: { maxWidth: "100%", width: "100%" }
                },
                  React.createElement("summary", {
                    style: { fontSize: 13, lineHeight: "20px", color: "#48A0C7", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", listStyle: "none" },
                    title: hint
                  }, "🔧 " + tl.name + (hint ? "  " + hint : "")),
                  React.createElement("pre", {
                    style: { margin: "4px 0 4px 4px", padding: "6px 10px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, color: "#c8c8c8", fontSize: 12, lineHeight: "18px", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 220, overflow: "auto" }
                  }, tl.args || "（无参数）"));
              })) : null,
            (t.assistant.images && t.assistant.images.length) ? React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, maxWidth: "100%" } },
              t.assistant.images.map((a, i) => React.createElement(ChatImg, { key: "ai" + i, uiConversation: uiConversation, sessionId: sessionId, attachment: a }))) : null,
            body ? React.createElement("div", {
              /* 正文颜色对齐 VSCode 的 Claude 扩展：它读 var(--vscode-foreground)，
                 本机主题 Dark 2026 的 foreground = #bfbfbf（editor.foreground = #BBBEBF）。
                 原来的 #e4e4e4 明显偏亮（用户实测"有点亮、刺眼"）。 */
              style: { maxWidth: "100%", width: "100%", color: "#bfbfbf", fontSize: 16, lineHeight: "28px", textAlign: "left", wordBreak: "break-word" }
            },
              MarkdownText
                ? React.createElement(MdSafe, { text: body },
                  React.createElement(MarkdownText, {
                    text: body,
                    streaming: !!t.streaming,
                    labels: MD_LABELS
                  }))
                : React.createElement("div", { style: { whiteSpace: "pre-wrap" } }, body)) : null,
            /* 流式进行中但本步还没有任何文字（例如正在思考/调工具）时给一个占位，避免整块空白 */
            (t.streaming && !body && !(t.assistant.tools || []).length)
              ? React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, color: "#858889", fontSize: 13 } },
                React.createElement("span", { className: "carddesk-blink", style: { fontSize: 16, lineHeight: "16px" } }, "●"),
                React.createElement("span", null, "正在生成…")) : null,
            /* ㉘ hover 显示：从该轮分支（Fork） */
            /* 用户要求：最后一轮**常驻**显示（不再只在悬停时冒出来）；更早的轮次保留悬停，免得每条回答后面都挂一个按钮 */
            ((t.seq === lastTurnSeq || hoverTurn === t.seq) && t.assistant.texts.length > 0)
              ? React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 2 } },
                React.createElement("button", {
                  onClick: () => forkFrom(t.seq),
                  title: "从这一轮分支出新对话（保留原对话，新对话继承到此为止的上下文）",
                  style: { background: "transparent", color: "#8a8a8a", border: "1px solid #3C3C3C", borderRadius: 4, padding: "1px 8px", cursor: "pointer", fontSize: 11 },
                  onMouseEnter: (e) => { e.currentTarget.style.color = "#3994BC"; e.currentTarget.style.borderColor = "#3994BC"; },
                  onMouseLeave: (e) => { e.currentTarget.style.color = "#8a8a8a"; e.currentTarget.style.borderColor = "#3C3C3C"; }
                }, "⑂ 从此分支"))
              : null));
      };

      // turn-rail 标记条（左侧竖排小横条，每轮一个）
      const rail = userTurns.length > 1 ? React.createElement("div", {
        style: { width: 14, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 6, gap: 3, borderRight: "1px solid #2a2a2a" }
      },
        userTurns.map((t) => React.createElement("div", {
          key: "rail" + t.seq,
          title: t.user.slice(0, 60) || "（无文本）",
          onClick: () => {
            const el = msgRefs.current[t.seq];
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          },
          style: { width: 8, height: 5, borderRadius: 2, background: "#5a6a80", cursor: "pointer", flexShrink: 0 },
          onMouseEnter: (e) => { e.currentTarget.style.background = "#1E1F20"; },
          onMouseLeave: (e) => { e.currentTarget.style.background = "#5a6a80"; }
        }))) : null;

      /* 头部常驻计数：判定图片问题到底是"没取到"还是"取到了没显示" ——
         图 0 = 当前已加载的消息里没有图片附件（窗口/取出问题）；图 >0 却看不到 = URL/渲染问题。 */
      const imgTotal = turns.reduce((acc, t) => acc + ((t.userImgs || []).length) + ((t.assistant && t.assistant.images) ? t.assistant.images.length : 0), 0);
      return React.createElement("div", {
        style: { display: "flex", flexDirection: "column", height: "100%", background: "#202122", borderLeft: "1px solid #2A2B2C", minWidth: 0 }
      },
        React.createElement("div", {
          style: { padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#e8e8e8", borderBottom: "1px solid #2A2B2C", background: "#191A1B", flexShrink: 0, display: "flex", alignItems: "center", gap: 6, position: "relative" }
        },
          React.createElement("span", null, "💬 AI 对话"),
          pinActive ? React.createElement("span", {
            title: "本对话锚定在代码工作区对应的平台工作区上（会话 " + pinId + "）：主界面切工作区不会影响它。点一下解除锚定、恢复跟随主界面。",
            onClick: () => setPinOff(true),
            style: { fontSize: 11, color: "#7fd1a0", border: "1px solid rgba(127,209,160,.5)", borderRadius: 3, padding: "0 4px", cursor: "pointer", fontWeight: 400 }
          }, "⇱ 锚定 " + String(pinId).slice(-6)) : null,
          (!pinActive && pinId) ? React.createElement("span", {
            title: "已解除锚定，当前显示的是主界面的当前会话。点一下重新锚定代码工作区的对话。",
            onClick: () => setPinOff(false),
            style: { fontSize: 11, color: "#d19a66", border: "1px solid rgba(209,154,102,.5)", borderRadius: 3, padding: "0 4px", cursor: "pointer", fontWeight: 400 }
          }, "⇲ 跟随主界面") : null,
          (!pinActive && !pinId && folders && folders.length) ? React.createElement("span", {
            title: ((props.pinWhy === "no-session")
              ? "这个代码工作区目录下还没有对话（会话的 cwd 都不在这个目录里）。用面板右上 ▾ 或 ＋ 新建一个对话，就会建在这个目录下并自动锚定。"
              : "还没跑过锚定（刷新或重开一次这个代码工作区即可）。")
              + " 当前仍在跟随主界面的当前会话。",
            style: { fontSize: 11, color: "#8a8a8a", border: "1px solid #3C3C3C", borderRadius: 3, padding: "0 4px", cursor: "default", fontWeight: 400 }
          }, (props.pinWhy === "no-session") ? "⚠ 未锚定·该目录还没有对话" : "⚠ 未锚定") : null,
          (folders && folders.length) ? React.createElement("span", {
            title: (bindChip.bound
              ? ((bindChip.manual ? "已手工绑定到平台工作区：" : "按路径自动锚定到平台工作区：") + bindChip.name
                + (anchorItem && anchorItem.path ? ("\n" + anchorItem.path) : "")
                + "\n（点开可以改绑到别的工作区）")
              : "把本代码工作区绑定到某个平台工作区：绑定后右侧对话就一直跟着它（主界面切工作区不受影响），并记住这条绑定。"),
            onClick: () => setBindOpen((v) => !v),
            style: { fontSize: 11, color: (bindChip.bound && bindChip.manual) ? "#7ec699" : "#8ab4f8", border: "1px solid " + ((bindChip.bound && bindChip.manual) ? "rgba(126,198,153,.55)" : "rgba(138,180,248,.5)"), borderRadius: 3, padding: "0 4px", cursor: "pointer", fontWeight: 400 }
          }, bindChip.label) : null,
          (bindOpen && folders && folders.length) ? React.createElement(React.Fragment, null,
            React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 70 }, onClick: () => setBindOpen(false) }),
            React.createElement("div", {
              style: { position: "absolute", top: 30, right: 8, zIndex: 80, background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, boxShadow: "0 6px 18px rgba(0,0,0,.5)", padding: 4, minWidth: 280, maxHeight: 320, overflowY: "auto" }
            },
              React.createElement("div", { style: { padding: "5px 8px", fontSize: 11, color: "#7a7a7a" } },
                bindChip.bound
                  ? ("把右侧对话绑定到哪个平台工作区？（当前" + (bindChip.manual ? "已绑定" : "自动锚定") + "：" + bindChip.name + "）")
                  : "把右侧对话绑定到哪个平台工作区？"),
              wsItems.length === 0 ? React.createElement("div", { style: { padding: "8px 10px", fontSize: 12, color: "#7a7a7a" } }, "暂无工作区：先用右上 ▾「添加工作区…」建一个") : null,
              wsItems.map((w) => {
                const isBound = !!anchorId && String(w && w.workspaceId) === anchorId;
                return React.createElement("div", {
                  key: "bind" + w.workspaceId,
                  title: isBound
                    ? ((w.path || "") + "　—　当前" + (bindChip.manual ? "已绑定" : "自动锚定") + "的平台工作区（点一下＝重新绑定它）")
                    : ((w.path || "") + "　—　点这里绑定"),
                  onClick: () => { setBindOpen(false); try { if (props.onBindWorkspace) props.onBindWorkspace(String(w.workspaceId)); } catch (e) { } },
                  style: { padding: "6px 10px", fontSize: 12, color: isBound ? "#7ec699" : "#BBBEBF", fontWeight: isBound ? 600 : 400, cursor: "pointer", borderRadius: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                  onMouseEnter: (e) => { e.currentTarget.style.background = "#1E1F20"; },
                  onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
                }, (isBound ? "✓ " : "") + (w.title || (w.path || "").split(/[\\/]/).filter(Boolean).pop() || w.workspaceId) + "  ·  " + (w.path || "") + (isBound ? ("  ·  " + (bindChip.manual ? "已绑定" : "自动锚定")) : ""));
              }))) : null,
          sessionId === undefined ? React.createElement("span", { style: { fontSize: 12, color: "#d19a66", fontWeight: 400 } }, "（未连接会话）") : null,
          React.createElement("span", { style: { fontSize: 11, color: "#7a7a7a", fontWeight: 400 }, title: "已加载的消息条数 / 其中的图片附件数" }, "消息 " + turns.length + " · 图 " + imgTotal),
          React.createElement("span", { style: { marginLeft: "auto", fontSize: 12, color: "#858889", fontWeight: 400 } }, running ? "⏳ 生成中…" : ""),
          /* 🗂 历史会话：查工作区其他对话，点击切换 */
          React.createElement("button", {
            onClick: () => setHistOpen((v) => !v),
            title: "历史会话（切换对话）",
            style: { background: "transparent", color: "#cccccc", border: "1px solid #3C3C3C", borderRadius: 4, padding: "2px 7px", cursor: "pointer", fontSize: 12, fontWeight: 400 }
          }, "🗂 历史"),
          histOpen ? renderHist() : null,
          /* ＋ 新会话：主按钮一键在当前工作区新建（VSCode Claude 式），▾ 展开工作区列表显式指定 */
          React.createElement("div", { style: { display: "flex", alignItems: "stretch", flexShrink: 0 } },
            React.createElement("button", {
              onClick: newSessionHere,
              title: "新会话",
              style: { background: "#3994BC", color: "#fff", border: "none", borderRadius: "4px 0 0 4px", padding: "2px 8px", cursor: "pointer", fontSize: 14, fontWeight: 600, lineHeight: "16px" }
            }, "＋"),
            React.createElement("button", {
              onClick: () => setWsOpen((v) => !v),
              title: "选择工作区新建",
              style: { background: "#3994BC", color: "#fff", border: "none", borderLeft: "1px solid rgba(255,255,255,.3)", borderRadius: "0 4px 4px 0", padding: "2px 5px", cursor: "pointer", fontSize: 12 }
            }, "▾")),
          wsOpen ? React.createElement(React.Fragment, null,
            React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 50 }, onClick: () => setWsOpen(false) }),
            React.createElement("div", {
              style: { position: "absolute", top: 34, right: 4, background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, boxShadow: "0 6px 18px rgba(0,0,0,.5)", padding: 4, zIndex: 60, minWidth: 260, maxHeight: 320, overflowY: "auto" }
            },
              React.createElement(React.Fragment, null,
              wsItems.length === 0
                ? React.createElement("div", { style: { padding: "10px 12px", fontSize: 12, color: "#7a7a7a" } }, "暂无工作区")
                : wsItems.map((w) => {
                  /* 标出当前会话所属工作区：无参「+」就落在这里，用户不必猜 */
                  const isCurWs = !!(curWs && w.workspaceId === curWs.workspaceId);
                  return React.createElement("div", {
                    key: w.workspaceId,
                    onClick: () => newSessionIn(w.workspaceId),
                    title: (w.path || "") + "　—　点击在此工作区新建对话",
                    style: { padding: "6px 10px", fontSize: 12, color: isCurWs ? "#fff" : "#BBBEBF", cursor: "pointer", borderRadius: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: isCurWs ? "rgba(57,148,188,.22)" : "transparent" },
                    onMouseEnter: (e) => { if (!isCurWs) e.currentTarget.style.background = "#1E1F20"; },
                    onMouseLeave: (e) => { if (!isCurWs) e.currentTarget.style.background = "transparent"; }
                  }, (w.title || (w.path || "").split(/[\\/]/).filter(Boolean).pop() || w.workspaceId) + (isCurWs ? "（当前）" : ""));
                }),
              /* 添加工作区：弹资源管理器选目录（对话框里可直接新建文件夹）→ 注册成宿主工作区 → 直接开会话 */
              React.createElement("div", { key: "wsep", style: { height: 1, background: "#2A2B2C", margin: "4px 2px" } }),
              React.createElement("div", {
                key: "wadd",
                onClick: () => { addWorkspaceVia(); },
                title: "弹出资源管理器选择文件夹（对话框里可直接「新建文件夹」），选中的目录会注册成新工作区并直接开会话",
                style: { padding: "6px 10px", fontSize: 12, color: "#3994BC", cursor: "pointer", borderRadius: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                onMouseEnter: (e) => { e.currentTarget.style.background = "#1E1F20"; },
                onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
              }, "＋ 添加工作区…（选择文件夹，可在对话框里新建）")))) : null,
          /* ✕ 关闭对话面板（对齐 VSCode：面板自身有关闭） */
          React.createElement("span", {
            onClick: onClose,
            title: "关闭对话面板",
            style: { cursor: "pointer", color: "#8a8a8a", fontSize: 14, padding: "0 2px", flexShrink: 0 },
            onMouseEnter: (e) => { e.currentTarget.style.color = "#fff"; },
            onMouseLeave: (e) => { e.currentTarget.style.color = "#8a8a8a"; }
          }, "✕")),
        /* 病因条：任一会话/模型依赖缺失、或新建对话失败时显示（正常时无此条） */
        (chatDiag.length || wsErr ? React.createElement("div", {
          style: { padding: "6px 10px", background: "rgba(248,81,73,.12)", borderBottom: "1px solid rgba(248,81,73,.35)", color: "#f48771", fontSize: 11, lineHeight: "16px", flexShrink: 0 }
        }, (wsErr ? wsErr : "") + (wsErr && chatDiag.length ? " · " : "") + (chatDiag.length ? "会话面板依赖缺失：" + chatDiag.join(" · ") : "")) : null),
        /* 中部：turn-rail + 消息列表 */
        React.createElement("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "row" } },
          rail,
          React.createElement("div", {
            ref: listRef,
            onScroll: onScroll,
            style: { flex: 1, minWidth: 0, overflowY: "auto", background: "#202122" }
          },
            /* 还有更早的历史时在顶部给一行提示/加载态（滚到顶会自动加载） */
            (snap && snap.hasMore) ? React.createElement("div", {
              style: { padding: "6px 16px", fontSize: 11, color: "#858889", textAlign: "center", borderBottom: "1px dashed #2A2B2C" }
            }, snap.loadingOlder ? "正在加载更早的消息…" : "↑ 已到顶：继续向上滚动可加载更早的消息") : null,
            turns.length === 0
              ? React.createElement("div", { style: { padding: 16, fontSize: 14, color: "#858889" } },
                blankSession ? "新会话：还没有消息，在下面输入框开始即可（子代理/工具调用会随后出现在这里）" : "暂无消息")
              : turns.map(renderTurn))),
        /* 输入框（在上）；@ 候选弹层浮在其上方 */
        React.createElement("div", { style: { display: "flex", gap: 8, padding: "8px 10px 4px", borderTop: "1px solid #2A2B2C", flexShrink: 0, background: "#191A1B", position: "relative" } },
          mentionOpen ? React.createElement("div", {
            style: { position: "absolute", bottom: "100%", left: 10, marginBottom: 4, background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, boxShadow: "0 6px 18px rgba(0,0,0,.5)", padding: 4, zIndex: 60, minWidth: 320, maxWidth: 520, maxHeight: "min(420px, 55vh)", overflowY: "auto", overscrollBehavior: "contain" }
          },
            mentionCands.length === 0
              ? React.createElement("div", { style: { padding: "8px 10px", fontSize: 12, color: "#7a7a7a" } }, filesRef.current ? "无匹配文件" : "加载文件列表…")
              : mentionCands.map((c, ci) => React.createElement("div", {
                key: c.path,
                ref: (el) => { mentionRefs.current[ci] = el; },
                onClick: () => applyMention(c.rel),
                title: c.path,
                style: { padding: "5px 10px", fontSize: 12, cursor: "pointer", borderRadius: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: ci === mentionIdx ? "#fff" : "#BBBEBF", background: ci === mentionIdx ? "#3994BC" : "transparent" },
                onMouseEnter: () => setMentionIdx(ci)
              }, c.rel))) : null,
          sendErr ? React.createElement("div", {
            style: { margin: "0 12px 4px", padding: "5px 9px", background: "rgba(248,81,73,.14)", border: "1px solid rgba(248,81,73,.4)", borderRadius: 6, color: "#f48771", fontSize: 11, lineHeight: "16px", display: "flex", alignItems: "flex-start", gap: 6, flexShrink: 0 }
          },
            React.createElement("span", { style: { flex: 1, wordBreak: "break-all" } }, sendErr),
            React.createElement("span", { onClick: () => setSendErr(""), title: "关闭", style: { cursor: "pointer", color: "#858889", flexShrink: 0 } }, "✕")) : null,
          React.createElement("textarea", {
            ref: inputRef,
            value: input,
            onChange: onInputChange,
            onKeyDown: (e) => {
              e.stopPropagation();
              if (mentionOpen) {
                if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx((mi) => Math.min(Math.max(0, mentionCands.length - 1), mi + 1)); return; }
                if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx((mi) => Math.max(0, mi - 1)); return; }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const c = mentionCands[mentionIdx];
                  if (c) applyMention(c.rel); else setMentionOpen(false);
                  return;
                }
                if (e.key === "Escape") { e.preventDefault(); setMentionOpen(false); return; }
              }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            },
            placeholder: "输入消息，Enter 发送 / Shift+Enter 换行 · 输入 @ 引用文件",
            rows: 2,
            style: { flex: 1, resize: "none", background: "#2A2B2C", color: "#BBBEBF", border: "1px solid #3C3C3C", borderRadius: 8, padding: "8px 10px", fontSize: 14, lineHeight: "20px", outline: "none", fontFamily: "inherit" }
          })),
        /* 按钮行（在下）：⚙ 选模型 → 选区提示 → 空白 → 权限 → ↑ 发送 */
        React.createElement("div", {
          style: { display: "flex", alignItems: "center", gap: 8, padding: "4px 12px 10px", fontSize: 11, color: "#858889", flexShrink: 0, position: "relative" }
        },
          /* ⑳ 选模型 */
          React.createElement("button", {
            onClick: loadModels,
            title: "选择模型",
            style: { background: "transparent", color: "#cccccc", border: "1px solid #3C3C3C", borderRadius: 4, padding: "1px 8px", cursor: "pointer", fontSize: 11, fontWeight: 400, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
          }, "⚙ " + curModelName + (curEffortLabel ? " · " + curEffortLabel : "")),
          modelOpen ? React.createElement(React.Fragment, null,
            React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 50 }, onClick: () => setModelOpen(false) }),
            React.createElement("div", {
              style: { position: "absolute", bottom: "100%", left: 0, marginBottom: 4, background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, boxShadow: "0 6px 18px rgba(0,0,0,.5)", padding: 4, zIndex: 60, minWidth: 280, maxWidth: 420, maxHeight: 300, overflowY: "auto" }
            }, renderModelRows())) : null,
          /* 选区提示（选模型右边）：附带选中代码，× 可不附带 */
          selLines > 0 ? React.createElement("span", {
            style: { color: selMuted ? "#858889" : "#BBBEBF", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 },
            title: selMuted ? "已忽略选中代码" : "发送时会附带这段选中代码"
          },
            selRefText ? (selRefText + "（" + selLines + " 行）") : (selLines + " line" + (selLines > 1 ? "s" : "") + " selected"),
            selMuted
              ? null
              : React.createElement("span", {
                onClick: () => setSelMuted(true),
                title: "不附带选中代码",
                style: { cursor: "pointer", color: "#7a7a7a", padding: "0 2px", fontSize: 12 }
              }, "×")) : null,
          /* 右侧：跟随指示 + 权限 + 发送 */
          React.createElement("span", {
            style: { marginLeft: "auto", cursor: "pointer", color: follow ? "#3994BC" : "#858889", whiteSpace: "nowrap" },
            onClick: () => { setFollow(true); if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; },
            title: follow ? "自动跟随最新" : "已暂停跟随（点我回到底部）"
          }, follow ? "●" : "○"),
          /* ㉑ 权限 preset：盾牌图标 + 当前权限名，点开切换 */
          React.createElement("div", { style: { position: "relative" } },
            React.createElement("button", {
              onClick: () => setPermOpen((v) => !v),
              title: "权限模式",
              style: { background: "transparent", color: "#cccccc", border: "1px solid #3C3C3C", borderRadius: 4, padding: "1px 8px", cursor: "pointer", fontSize: 11, fontWeight: 400, display: "flex", alignItems: "center", gap: 5 }
            },
              permCurMeta ? permCurMeta.svg() : null,
              React.createElement("span", null, permCurMeta ? permCurMeta.label : "权限")),
            permOpen ? React.createElement(React.Fragment, null,
              React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 50 }, onClick: () => setPermOpen(false) }),
              React.createElement("div", {
                style: { position: "absolute", bottom: "100%", right: 0, marginBottom: 4, background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, boxShadow: "0 6px 18px rgba(0,0,0,.5)", padding: 4, zIndex: 60, minWidth: 200 }
              },
                renderPermRows(),
                permErr ? React.createElement("div", { style: { margin: "4px 6px", padding: "5px 8px", background: "rgba(248,81,73,.14)", border: "1px solid rgba(248,81,73,.4)", borderRadius: 5, color: "#f48771", fontSize: 11, lineHeight: "15px", wordBreak: "break-all" } }, permErr) : null)) : null,
            /* 完全权限风险确认闸（对齐主界面 access.confirm.* 的文案与行为：
               必须勾选 acknowledge 才能点「启用完全权限」） */
            permConfirm ? React.createElement(React.Fragment, null,
              React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,.5)" }, onClick: () => { setPermConfirm(false); setPermAck(false); } }),
              React.createElement("div", {
                style: { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 71, width: "min(460px, 92vw)", background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 8, boxShadow: "0 12px 36px rgba(0,0,0,.6)", padding: "14px 16px", color: "#BBBEBF" }
              },
                React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 8 } }, "确认启用完全权限？"),
                React.createElement("div", { style: { fontSize: 12, lineHeight: "18px", marginBottom: 12 } }, "启用完全权限后，新会话将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任后续任务时使用。"),
                React.createElement("label", { style: { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, cursor: "pointer", marginBottom: 14 } },
                  React.createElement("input", { type: "checkbox", checked: permAck, onChange: (e) => setPermAck(!!(e.target && e.target.checked)), style: { marginTop: 2 } }),
                  React.createElement("span", null, "我已了解风险，并愿意继续")),
                React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
                  React.createElement("button", {
                    onClick: () => { setPermConfirm(false); setPermAck(false); },
                    style: { background: "#2A2B2C", color: "#BBBEBF", border: "1px solid #3C3C3C", borderRadius: 4, padding: "5px 12px", cursor: "pointer", fontSize: 12 }
                  }, "取消"),
                  React.createElement("button", {
                    disabled: !permAck,
                    onClick: async () => { setPermConfirm(false); setPermAck(false); await doSelectPerm("danger-full-access"); },
                    style: { background: permAck ? "#3994BC" : "#2A2B2C", color: permAck ? "#fff" : "#7a7a7a", border: "none", borderRadius: 4, padding: "5px 12px", cursor: permAck ? "pointer" : "default", fontSize: 12 }
                  }, "启用完全权限")))) : null),
          React.createElement("button", {
            onClick: running ? stopRun : send,
            disabled: running ? false : (busy || !(input || "").trim()),
            title: running ? "停止生成" : "发送",
            style: { width: 30, height: 30, background: running ? "#a1260d" : ((busy || !(input || "").trim()) ? "#555" : "#3994BC"), color: "#fff", border: "none", borderRadius: running ? 6 : 15, cursor: (running || ((input || "").trim() && !busy)) ? "pointer" : "default", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
          }, running ? "⏹" : "↑")));
    };
    /* ================= CodeWorkbench ================= */
    const CodeWorkbench = (props) => {
      // 工作台根节点引用：用于判断焦点是否在工作台内，全局拦截 Ctrl+N/O/S 等（防止浏览器默认行为）
      const workbenchRootRef = React.useRef(null);
      const [folders, setFolders] = React.useState([]);
      const [hierMap, setHierMap] = React.useState({});
      const [tree, setTree] = React.useState({});
      const [expandedFolders, setExpandedFolders] = React.useState({});
      const [expandedGroups, setExpandedGroups] = React.useState({});
      const [hierExp, setHierExp] = React.useState({});

      const [fsBusy, setFsBusy] = React.useState(false);
      const [fsStatus, setFsStatus] = React.useState("");
      const [fsStatusStyle, setFsStatusStyle] = React.useState({});
      const [showAll, setShowAll] = React.useState(false);
      const [leftTab, setLeftTab] = React.useState("explorer");
      const [hierLoading, setHierLoading] = React.useState(false);
      const [jumpLine, setJumpLine] = React.useState(0);
      const [jumpCol, setJumpCol] = React.useState(0);   // 跳转目标列（1-based；0=不定位列，仅跳行）
      const [pathInput, setPathInput] = React.useState("");

      /* ---- ⑯ 右侧 AI 对话面板（Claude Code 式）：开关 + 宽度 ---- */
      const [chatOpen, setChatOpen] = React.useState(false);
      const [chatW, setChatW] = React.useState(520);   // 面板宽度，可拖宽
      const chatDragRef = React.useRef(null);
      const chatSessions = props.sessionsService || null;   // sessions 服务（注入）
      /* ㊸ 锚定状态：工作台右侧对话绑在【代码工作区】对应的平台工作区上，与主界面的当前会话互不牵动。
         deskPin = 锚定的会话 id（"" = 未锚定，回落成「跟随主界面当前会话」的原有行为）。 */
      const [deskPlatformWs, setDeskPlatformWs] = React.useState("");
      const deskPlatformWsRef = React.useRef("");
      /* 当前代码工作区的根目录（原样大小写，用于按会话 cwd 绑定 / 新建会话） */
      const deskPathRef = React.useRef("");
      const [deskPin, setDeskPin] = React.useState("");
      /* 同上的 ref 版：给订阅回调读，避免闭包拿到旧值 */
      const deskPinRef = React.useRef("");
      /* 没锚定的原因（给标题栏徽标用）：""=没跑过 / no-session=这个目录下还没有对话 / ok=锚上了 */
      const [deskPinWhy, setDeskPinWhy] = React.useState("");
      const [deskPath, setDeskPath] = React.useState("");
      const chatConnection = props.connectionService || null;   // connection 服务（注入，拿 api.sessions）
      // 编辑器选区信息（供对话面板显示 "X line selected"）
      const [selInfo, setSelInfo] = React.useState({ hasSelection: false, lines: 0, text: "" });
      /* ---- ㉝ 编辑器字号（Ctrl+滚轮缩放，记忆到 localStorage）---- */
      const [editorFont, setEditorFont] = React.useState(() => loadEditorFont());
      const zoomFont = React.useCallback((d) => {
        setEditorFont((prev) => {
          const next = Math.max(8, Math.min(40, (parseInt(prev, 10) || EDITOR_FONT_DEFAULT) + d));
          try { localStorage.setItem(EDITOR_FONT_KEY, String(next)); } catch (e) { }
          return next;
        });
      }, []);

      /* ---- ㉓ Diff 对比：{ left:{path,text}, right:{path,text} } | null ---- */
      const [diffPair, setDiffPair] = React.useState(null);
      const [diffBase, setDiffBase] = React.useState(null);   // VSCode 式：先「选择以进行比较」，再「与已选进行比较」
      const openDiff = async (leftPath, rightPath) => {
        if (!leftPath || !rightPath || leftPath === rightPath) return;
        setCtxMenu(null);
        setDiffBase(null);   // 用完清除基准标记（对齐 VSCode）
        try {
          const [l, r] = await Promise.all([readFileContent(leftPath), readFileContent(rightPath)]);
          setDiffPair({
            left: { path: leftPath, text: (l && l.text) || "" },
            right: { path: rightPath, text: (r && r.text) || "" }
          });
        } catch (e) { /* 忽略 */ }
      };

      /* ---- ㉗ 转到定义：模块索引（从 scanRtl 的 tops 树递归收集）---- */
      const moduleIndex = React.useMemo(() => {
        const map = {};
        const walk = (node) => {
          if (!node) return;
          if (node.module && node.file && !map[node.module]) map[node.module] = { file: node.file, line: node.line || 0 };
          const kids = node.instances || [];
          for (const c of kids) walk(c);
        };
        const fl = (folders || []);
        for (const f of fl) {
          const scan = hierMap[f.path];
          if (scan && Array.isArray(scan.tops)) for (const t of scan.tops) walk(t);
        }
        return map;
      }, [hierMap, folders]);
      // 取光标处的标识符
      const wordAtCursor = () => {
        const lines = String(activeText || "").split("\n");
        const li = Math.max(0, (cursor && cursor.line ? cursor.line : 1) - 1);
        const line = lines[li] || "";
        const ci = Math.max(0, (cursor && cursor.col ? cursor.col : 1) - 1);
        const isW = (c) => /[A-Za-z0-9_$]/.test(c);
        let s = Math.min(ci, line.length);
        let e = s;
        while (s > 0 && isW(line[s - 1])) s--;
        while (e < line.length && isW(line[e])) e++;
        return line.slice(s, e);
      };
      const gotoDefinition = () => {
        const w = wordAtCursor();
        if (!w) { setFsStatus("光标处没有可跳转的标识符（把光标放到模块名/端口上再按 F12）"); setFsStatusStyle({ color: C.warn }); return; }
        // 先查跨文件模块索引
        const hit = moduleIndex[w];
        if (hit && hit.file) {
          setFsStatus("转到定义 → " + basename(hit.file) + ":" + hit.line + "（模块 " + w + "）");
          setFsStatusStyle({ color: C.green });
          openFile(hit.file, true, hit.line || 0);
          return;
        }
        // 回退：在当前文件里找 module/wire/reg/parameter/localparam/function/task 定义
        const lines = String(activeText || "").split("\n");
        const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pats = [
          new RegExp("^\\s*module\\s+" + esc + "\\b"),
          new RegExp("^\\s*(?:input|output|inout)\\b[^;]*\\b" + esc + "\\b"),
          new RegExp("^\\s*(?:wire|reg|logic|bit|integer|parameter|localparam)\\b[^;]*\\b" + esc + "\\b"),
          new RegExp("^\\s*(?:function|task)\\b[^;]*\\b" + esc + "\\b")
        ];
        for (let i = 0; i < lines.length; i++) {
          const clean = lines[i].replace(/\/\/.*$/, "");
          for (const p of pats) {
            if (p.test(clean)) {
              setFsStatus("转到定义 → 第 " + (i + 1) + " 行（" + w + "）");
              setFsStatusStyle({ color: C.green });
              setJumpLine(i + 1);
              return;
            }
          }
        }
        setFsStatus("未找到 " + w + " 的定义（仅索引模块定义与当前文件的声明；工作区需已扫描）");
        setFsStatusStyle({ color: C.warn });
      };

      /* ---- ㉔ 集成终端：开关 + 高度 + 工作目录 ---- */
      /* 终端面板开关持久化：它是工作区级面板，退出工作台再进来应该保持原样。
         原始 setter 改名 + 同名包装持久化 —— 既有调用点（4 处）一行都不用动。 */
      const TERM_KEY = "card-desk.terminal-open";
      const [termOpen, setTermOpenRaw] = React.useState(() => { try { return localStorage.getItem(TERM_KEY) === "1"; } catch (e) { return false; } });
      const setTermOpen = React.useCallback((next) => setTermOpenRaw((v) => {
        const nx = typeof next === "function" ? next(v) : next;
        try { localStorage.setItem(TERM_KEY, nx ? "1" : "0"); } catch (e) { }
        return nx;
      }), []);
      const [termH, setTermH] = React.useState(220);
      const termDragRef = React.useRef(null);
      const termCwd = () => {
        if (activePath) {
          const i = String(activePath).lastIndexOf("\\");
          if (i > 0) return String(activePath).slice(0, i);
        }
        const fl = foldersRef.current || [];
        return fl.length ? fl[0].path : undefined;
      };

      /* ---- FPGA 工具：格式化预览 / 检查结果面板 ---- */
      // 格式化预览：{ path, before, after, changedLines, eol, encoding, bom, noChange, encFix } | null
      const [fmtPreview, setFmtPreview] = React.useState(null);
      /* 预览里「同时修复注释乱码（UTF-8 → GBK）」的勾选状态。
         放在父层（不是对话框内部）：对话框在预览关闭时仍挂着，内部 state 会残留上次的选择；
         而且 applyFmtPreview 需要读到它。 */
      const [fmtEncFix, setFmtEncFix] = React.useState(true);
      // 检查结果面板：{ title, items:[{level,file,line,msg}], summary } | null
      const [checkPanel, setCheckPanel] = React.useState(null);
      // 跳转时面板会被关掉（它是全屏遮罩），把结果留一份供状态栏「← 返回检查结果」重开
      const [lastCheck, setLastCheck] = React.useState(null);
      // 检查结果的级别筛选（放在这里而非对话框内部：对话框会卸载，放内部会丢筛选状态）
      const [checkFilter, setCheckFilter] = React.useState("all");
      const [checkBusy, setCheckBusy] = React.useState(false);
      /* 换编码（重新打开）后第一处变化的行列：**不自动跳**（会自动跳会抢走用户正在看的位置，
         用户实测"预览时视图跳一下"），只在状态栏给一个按钮让用户按需过去。 */
      const [encJump, setEncJump] = React.useState(null);
      // 重入保护：端口检查 / XDC 检查会串行读几百个文件，重复点击会并发多份、结果互相覆盖
      const checkBusyRef = React.useRef(false);

      /* ---- 多标签页：tabs = [{path,pinned,dirty,encoding,text,error}]，activePath ---- */
      const [tabs, setTabs] = React.useState([]);
      const [activePath, setActivePath] = React.useState(null);
      /* 文档被"外部整体替换"的版本号（还原文件 / 按编码重开 …）。编辑器据此清掉属于旧内容的瞬态状态
         （列选矩形、线性选区高亮、待恢复视图、暂存选区）——不清的话，列模式下原生光标是透明的、
         矩形又指向已不存在的行，用户看到的就是「还原后代码区没有光标」（用户实测）。 */
      const [docRev, setDocRev] = React.useState(0);
      /* 光标镜像：文档被整体替换（还原文件 / 换编码预览）后要按**同一行同一列**折算新光标位置。
         不能拿旧偏移去 clamp —— 新解码更短时会夹到文档末尾，浏览器随即把视图滚到末尾（用户实测）。 */
      const cursorRef = React.useRef({ line: 1, col: 1 });
      // 跨文件查找（Find in Files/Projects）：当前已打开文件的 path→{text,eol,encoding} 映射
      // 必须带 eol/encoding：tab 内文本读入时已被归一化成 LF，写盘时若不还原会
      // 把 GBK+CRLF 的 Verilog 文件写成 UTF-8+LF（Vivado 会读成乱码）。
      const openFiles = React.useMemo(() => {
        const m = {};
        (tabs || []).forEach((t) => {
          if (t && t.path != null && t.text != null) m[t.path] = { text: t.text, eol: t.eol || "lf", encoding: t.encoding || "utf8" };
        });
        return m;
      }, [tabs]);
      // 跨文件替换写盘后回写标签页文本，避免该文件在另一分栏里仍显示替换前的旧内容
      const applyExternalWrite = React.useCallback((p, txt) => {
        setTabs((ts) => ts.map((x) => (x.path === p ? { ...x, text: txt, dirty: true } : x)));
      }, []);
      // 目录级替换（host 直接写盘）后，把该目录下已打开的标签重新读盘。
      // 不做这一步 → 标签保持旧文本且 dirty=false → 下一次 Ctrl+S 覆盖掉替换结果。
      const reloadTabsUnderDir = React.useCallback(async (dir) => {
        if (!dir) return;
        const norm = String(dir).replace(/[\\/]+$/, "").toLowerCase();
        if (!norm) return;
        const victims = tabsRef.current.filter((t) => {
          const p = String(t.path).toLowerCase();
          return p === norm || p.startsWith(norm + "\\") || p.startsWith(norm + "/");
        });
        // 有未保存修改的标签**不能**直接覆盖：磁盘确实已被替换，但用户手上的编辑
        // 不能凭空消失。保留其内容并提示，让用户自己决定保存还是舍弃。
        const dirtyHits = victims.filter((t) => t.dirty);
        if (dirtyHits.length) {
          setFsStatus("注意：" + dirtyHits.length + " 个未保存文件也在替换范围内，已保留你的编辑（保存会覆盖磁盘上的替换结果）");
          setFsStatusStyle({ color: C.warn });
          deskToast(dirtyHits.length + " 个未保存文件受替换影响，已保留你的编辑", false);
        }
        for (const t of victims.filter((x) => !x.dirty)) {
          try {
            const res = await apiCall("readFile", { path: t.path });
            if (!res || !res.ok) continue;
            const txt = String(res.content).replace(/\r\n/g, "\n");
            const meta = {
              text: txt,
              dirty: false,
              diskMtime: res.mtimeMs || 0,
              diskSize: res.size || 0,
              writable: res.writable !== false,
              bom: res.hasBom === true
            };
            setTabs((ts) => ts.map((x) => (x.path === t.path ? Object.assign({}, x, meta) : x)));
          } catch (e) { /* 单个失败不阻断其它标签 */ }
        }
      }, []);
      // 注册给 FindDialog：目录级替换（host 直接写盘）完成后重载受影响标签
      React.useEffect(() => {
        dirReplacedHandler = reloadTabsUnderDir;
        return () => { if (dirReplacedHandler === reloadTabsUnderDir) dirReplacedHandler = null; };
      }, [reloadTabsUnderDir]);
      const [ctxMenu, setCtxMenu] = React.useState(null); // {x,y,path}
      const [fileMenuOpen, setFileMenuOpen] = React.useState(false); // 顶部文件菜单下拉
      const [fpgaMenuOpen, setFpgaMenuOpen] = React.useState(false); // 顶部 FPGA 工具菜单下拉
      const [fpgaSubOpen, setFpgaSubOpen] = React.useState(false);   //   其「端口检查」右侧子菜单
      const [fpgaLintSub, setFpgaLintSub] = React.useState(false);   //   其「静态检查」右侧子菜单
      /* 静态检查开关的刷新计数：以前这里误用 shell 组件的 setCodeKey（本组件作用域里未声明 →
         点击抛 ReferenceError 被事件处理器吞掉），于是勾选后要等下次改文本才看到效果。 */
      const [lintRev, setLintRev] = React.useState(0);
      /* 外部程序化编辑（插入 nettype / 应用格式化）不经过编辑器的输入通道，不会自动进撤销栈。
         这里发一个「撤销单元」请求：由正在显示该文件的编辑器把改动前的文本压进自己的撤销栈，
         于是 Ctrl+Z 能撤回这一步。文本写入路径保持不变（风险最小）。 */
      const [undoReq, setUndoReq] = React.useState(null);
      const undoReqN = React.useRef(0);
      const pushUndoUnit = (path, prev, extra) => {
        undoReqN.current += 1;
        setUndoReq({
          n: undoReqN.current, path: path, prev: prev,
          enc: (extra && extra.enc) || null, redoEnc: (extra && extra.redoEnc) || null
        });
      };
      const [pathDlg, setPathDlg] = React.useState(null); // 路径输入弹窗 {title, placeholder, mode}
      const [pathDlgVal, setPathDlgVal] = React.useState("");
      const [pathDlgDir, setPathDlgDir] = React.useState("");         // 弹窗里正在浏览的目录
      const [pathDlgEntries, setPathDlgEntries] = React.useState([]); // 该目录的条目（目录排在文件前）
      // ⑦ 打开最近工作区：host 记录的 .code-workspace 路径列表 + 选择弹窗
      const [recents, setRecents] = React.useState([]);
      const [recentOpen, setRecentOpen] = React.useState(false);
      /* 最近条目归一化：新宿主返回对象（file/folders 两种），旧宿主返回字符串路径。
         客户端自己再归一一次，这样不必等宿主重启也能正确显示。 */
      const normRecentC = (x) => {
        if (typeof x === "string" && x) return { kind: "file", path: x, label: basename(x) || x };
        if (x && typeof x === "object") {
          const raw = Array.isArray(x.folders) ? x.folders : [];
          if (x.kind === "folders" || raw.length) {
            const flds = raw.filter((f) => f && f.path).map((f) => ({ name: f.name || basename(f.path), path: f.path }));
            if (flds.length) return { kind: "folders", folders: flds, label: String(x.label || "") || flds.map((f) => f.name).join(" + ") };
          }
          if (typeof x.path === "string" && x.path) return { kind: "file", path: x.path, label: String(x.label || "") || basename(x.path) || x.path };
        }
        return null;
      };
      /* 内部默认工作区文件对用户没有意义（列表里要显示文件夹名）——旧宿主不过滤，这里补上 */
      const isInternalWs = (e) => e.kind === "file" && /[\\/]workspace\.code-workspace$/i.test(e.path || "");
      /* 「最近工作区」的本地兜底。宿主旧版本没有 workspaceRecordFolders（路由 404），
         那时「关闭工作区」既记录不了、又把工作区文件写成空 —— 用户看到的就是「最近里什么都没有」。
         所以文件夹集合的快照在客户端也留一份，与宿主结果合并去重。 */
      const LOCAL_RECENTS_KEY = "card-desk.recent-workspaces";
      /* 最近工作区上限 + 「清空」用静音表：清空只写静音表（不动宿主文件），
         之后再打开/添加同一个工作区会自动解除静音，所以清空是可恢复的。 */
      const RECENTS_MAX = 8;
      const RECENT_MUTED_KEY = "card-desk.recent-muted";
      const readMutedRecents = () => {
        try {
          const a = JSON.parse(localStorage.getItem(RECENT_MUTED_KEY) || "[]");
          return Array.isArray(a) ? a.filter((x) => typeof x === "string") : [];
        } catch (e) { return []; }
      };
      const wsRecentKeyC = (e) => (e && e.kind === "folders"
        ? ("d:" + e.folders.map((f) => String(f.path).toLowerCase()).join("|"))
        : ("f:" + String((e && e.path) || "").toLowerCase()));
      const writeMutedRecents = (keys) => { try { localStorage.setItem(RECENT_MUTED_KEY, JSON.stringify([...new Set(keys)])); } catch (e) { } };
      const unmuteRecent = (key) => { const m = readMutedRecents(); if (m.includes(key)) writeMutedRecents(m.filter((k) => k !== key)); };
      const readLocalRecents = () => {
        try {
          const arr = JSON.parse(localStorage.getItem(LOCAL_RECENTS_KEY) || "[]");
          return (Array.isArray(arr) ? arr : []).map(normRecentC).filter((e) => e && e.kind === "folders");
        } catch (e) { return []; }
      };
      const pushLocalRecent = (flds) => {
        try {
          const list = (Array.isArray(flds) ? flds : []).filter((f) => f && f.path)
            .map((f) => ({ name: f.name || basename(f.path), path: f.path }));
          if (!list.length) return;
          const key = list.map((f) => String(f.path).toLowerCase()).join("|");
          const rest = readLocalRecents().filter((e) => e.folders.map((f) => String(f.path).toLowerCase()).join("|") !== key);
          const next = [{ kind: "folders", folders: list, label: list.map((f) => f.name).join(" + ") }].concat(rest).slice(0, RECENTS_MAX);
          localStorage.setItem(LOCAL_RECENTS_KEY, JSON.stringify(next));
          unmuteRecent(wsRecentKeyC(next[0]));
        } catch (e) { /* 存不了就算了，不影响主流程 */ }
      };
      const refreshRecents = async () => {
        let host = [];
        try {
          const r = await apiCall("workspaceRecents", {});
          if (r && r.ok) host = (r.recents || []).map(normRecentC).filter((e) => e && !isInternalWs(e));
        } catch (err) { /* 静默 */ }
        const keyOf = (e) => (e.kind === "folders"
          ? ("d:" + e.folders.map((f) => String(f.path).toLowerCase()).join("|"))
          : ("f:" + String(e.path || "").toLowerCase()));
        const seen = Object.create(null);
        const merged = [];
        /* 本地的（文件夹集合）排在前面：刚关掉的工作区最需要能一键找回 */
        const muted = readMutedRecents();
        for (const e of readLocalRecents().concat(host)) {
          const k = keyOf(e);
          if (seen[k] || muted.includes(k)) continue;
          seen[k] = 1;
          merged.push(e);
        }
        setRecents(merged.slice(0, RECENTS_MAX));
      };
      /* 清空最近工作区：静音当前列表 + 清掉本地那份（宿主文件不动，下次真正打开时会重新登记） */
      const clearRecents = () => {
        try {
          writeMutedRecents(readMutedRecents().concat((recents || []).map((e) => wsRecentKeyC(e))));
          localStorage.setItem(LOCAL_RECENTS_KEY, "[]");
        } catch (e) { }
        setRecents([]);
        setFsStatus("已清空最近工作区列表"); setFsStatusStyle({ color: C.dim });
      };
      React.useEffect(() => {
        if (!recentOpen) return;
        const onKey = (e) => { if (e.key === "Escape") setRecentOpen(false); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
      }, [recentOpen]);
      /* 自动保存：数据安全相关偏好，必须持久化（此前刷新就复位成关） */
      const AUTOSAVE_KEY = "card-desk.autosave";
      const [autoSave, setAutoSave] = React.useState(() => { try { return localStorage.getItem(AUTOSAVE_KEY) === "1"; } catch (e) { return false; } });
      const [cursor, setCursor] = React.useState({ line: 1, col: 1 }); // 状态栏 行/列
      // onCursor 去重：行列无变化时返回 prev，避免 onSelect→setCursor→re-render 形成循环
      const setCursorSafe = React.useCallback((c) => {
        try { if (c && c.line) cursorRef.current = { line: c.line, col: c.col || 1 }; } catch (e) { }
        setCursor((prev) => (prev && prev.line === c.line && prev.col === c.col) ? prev : c);
      }, []);
      // 跳转到行弹窗（点击状态栏 Ln/Col 打开，VSCode 语义）
      const [goToOpen, setGoToOpen] = React.useState(false);
      const [goToVal, setGoToVal] = React.useState("1");
      // 「文件编码」弹窗（点击状态栏编码标签打开）：重新按某编码打开 / 转码并保存
      const [encDlgOpen, setEncDlgOpen] = React.useState(false);
      const goToJump = () => {
        const n = parseInt(goToVal, 10);
        if (!isNaN(n) && n >= 1) setJumpLine(n);
        setGoToOpen(false);
      };
      // ⑨ 全局 Ctrl+F/H → 打开活动编辑器的查找/替换条（findReq.n 递增触发 CodePane）
      const findReqNRef = React.useRef(0);
      const [findReq, setFindReq] = React.useState({ n: 0, mode: "find" });
      // ⑨ 全局查找目标：跟随“最后获得焦点/有选区的编辑器”，决定查找框渲染在哪个栏、作用到哪个文档
      const [findTargetPath, setFindTargetPath] = React.useState(null); // 当前查找目标文档 path
      // 每栏编辑器焦点上报：把该栏设为当前查找目标（双击/选中/点击编辑器都会触发）
      const onEditorFocus = (path) => {
        if (path == null) return;
        setFindTargetPath((prev) => (prev === path ? prev : path));
      };
      /* 工作台级 Ctrl+Z / Ctrl+Y（焦点在编辑器之外时）：路由给「当前查找目标」那一份编辑器。
         编辑器内由 CodePane 自己处理并 stopPropagation，两条路径不会重复执行。 */
      const undoKeyNRef = React.useRef(0);
      const [undoKeyReq, setUndoKeyReq] = React.useState({ n: 0, dir: 0 });
      /* 列模式（F8）请求：焦点不在编辑器里时，由工作台派发、只让“当前查找目标”那份面板消费 */
      const colModeNRef = React.useRef(0);
      const [colModeReq, setColModeReq] = React.useState({ n: 0 });
      const fireColModeToggle = () => {
        if (findTargetPath == null && activePath != null) setFindTargetPath(activePath);
        colModeNRef.current += 1;
        setColModeReq({ n: colModeNRef.current });
      };
      const fireUndoKey = (dir) => {
        // 兜底同 fireFind：还没有任何编辑器报过焦点时，默认作用于当前活动文档
        if (findTargetPath == null && activePath != null) setFindTargetPath(activePath);
        undoKeyNRef.current += 1;
        setUndoKeyReq({ n: undoKeyNRef.current, dir: dir });
      };
      const fireFind = (mode) => {
        // 兜底：若还没有任何编辑器获得过焦点，则默认把“当前活动文档”设为查找目标
        if (findTargetPath == null && activePath != null) setFindTargetPath(activePath);
        findReqNRef.current += 1;
        setFindReq({ n: findReqNRef.current, mode: mode });
      };
      // 活动文件变化时同步查找目标：鼠标点标签只改 activePath，不会让编辑器 textarea 获焦，
      // 只靠 onEditorFocus 会让 findTargetPath 停留在上一个文件 → Ctrl+F/H 在该文档上静默无反应。
      // （聚焦右栏编辑器时 activePath 未变，不会覆盖右栏的查找目标。）
      React.useEffect(() => {
        if (activePath == null) return;
        setFindTargetPath((prev) => (prev === activePath ? prev : activePath));
      }, [activePath]);
      // ⑪ Ctrl+P 快速打开：工作区文件模糊列表
      const [qpOpen, setQpOpen] = React.useState(false);
      const [qpQ, setQpQ] = React.useState("");
      const [qpFiles, setQpFiles] = React.useState([]); // 全量文件缓存
      const [qpBusy, setQpBusy] = React.useState(false);
      const [qpSel, setQpSel] = React.useState(0);
      const qpCacheKeyRef = React.useRef("");
      const qpInputRef = React.useRef(null);
      const openQuickPick = async () => {
        setQpOpen(true); setQpQ(""); setQpSel(0);
        const flds = foldersRef.current || [];
        const key = flds.map((f) => f.path).join("|");
        if (qpCacheKeyRef.current !== key || !qpFiles.length) {
          qpCacheKeyRef.current = key;
          setQpBusy(true);
          const r = await apiCall("listTree", { paths: flds.map((f) => f.path) });
          setQpBusy(false);
          if (r && r.ok) setQpFiles(r.files || []);
        }
        setTimeout(() => { try { if (qpInputRef.current) qpInputRef.current.focus(); } catch (e) { } }, 30);
      };
      const closeQuickPick = () => setQpOpen(false);
      // 模糊匹配 + 简单评分（basename 前缀 > basename 含 > 完整路径含）
      const qpMatches = React.useMemo(() => {
        if (!qpOpen) return [];
        const q = qpQ.trim().toLowerCase();
        if (!q) return qpFiles.slice(0, 100).map((p, i) => ({ p, i }));
        const score = (p) => {
          const bs = basename(p).toLowerCase();
          let s = 0;
          if (bs.startsWith(q)) s += 100;
          else if (bs.includes(q)) s += 60;
          if (p.toLowerCase().includes(q)) s += 20;
          const segs = q.split(/[\s_\-./\\]+/).filter(Boolean);
          if (segs.length > 1 && segs.every((sg) => p.toLowerCase().includes(sg))) s += 30;
          return s;
        };
        const scored = [];
        for (let i = 0; i < qpFiles.length; i++) {
          const s = score(qpFiles[i]);
          if (s > 0) scored.push({ p: qpFiles[i], i, s });
        }
        scored.sort((a, b) => b.s - a.s || (a.i - b.i));
        return scored.slice(0, 100).map((x) => ({ p: x.p, i: x.i }));
      }, [qpOpen, qpQ, qpFiles]);
      const qpPick = (p) => {
        if (!p) return;
        closeQuickPick();
        openFile(p, true);
        setFsStatus("已打开: " + p);
      };
      const tabsRef = React.useRef(tabs);
      React.useEffect(() => { tabsRef.current = tabs; }, [tabs]);
      const activePathRef = React.useRef(activePath);
      /* ---- 源代码管理（本地 Git）：探测当前工作区是否已有仓库 ---- */
      React.useEffect(() => { activePathRef.current = activePath; }, [activePath]);
      /* 单个文件重新读盘（丢弃改动 / 回退到某提交之后必须做，否则标签仍持有旧文本，
         用户下一次 Ctrl+S 就会把刚回退的结果又写回去 —— 与目录替换同一个坑）。 */
      const reloadFileFromDisk = async (p) => {
        if (!p) return;
        const target = tabsRef.current.find((x) => x.path === p);
        if (!target) return;   // 该文件没打开就不用管
        if (target.dirty) {
          setFsStatus("注意：该文件有未保存改动，未重新载入（保存会覆盖磁盘上的回退结果）");
          setFsStatusStyle({ color: C.warn });
          return;
        }
        try {
          const res = await apiCall("readFile", { path: p });
          if (!res || !res.ok) return;
          const txt = String(res.content).replace(/\r\n/g, "\n");
          setTabs((ts) => ts.map((x) => (x.path === p ? Object.assign({}, x, {
            text: txt, dirty: false,
            diskMtime: res.mtimeMs || 0, diskSize: res.size || 0,
            writable: res.writable !== false, bom: res.hasBom === true
          }) : x)));
        } catch (e) { /* 单文件失败不影响其它流程 */ }
      };
      /* ---- 代码区「不改文本」的操作也要能 Ctrl+Z 撤销 ----
         转码保存（转为 GBK/UTF-8）和「以指定编码重新打开」只改编码与磁盘字节、不改文本，
         所以进不了编辑器的文本撤销栈；这里记下最近一次这类操作，
         等编辑器的撤销栈空了（用户一直按 Ctrl+Z 到没有别的可撤）由它来收尾。
         rec = { path, label, prevText, prevEncoding, prevBom, postText, wrote } */
      const encUndoRef = React.useRef(null);
      /* 撤销/重做「换编码预览」时恢复标签的编码状态（文本由编辑器的撤销单元负责）。
         预览本身不写盘，所以这里只改编辑器状态。 */
      const applyEncState = (path, st) => {
        if (!path || !st) return;
        setTabs((prev) => prev.map((x) => (x.path === path ? Object.assign({}, x, {
          encoding: st.encoding || "utf8",
          bom: st.bom === true,
          forceView: st.forceView || null,
          writable: st.writable !== false,
          dirty: false
        }) : x)));
      };
      const revertLastCodeOp = (fromPath) => {
        /* 目录级批量替换（FindDialog 写进模块级快照）：一次把整批文件按原文写回 */
        if (!encUndoRef.current && dirReplaceUndo) {
          const r0 = dirReplaceUndo;
          if (fromPath && !r0.entries.some((x) => x.path === fromPath)) return false;
          /* 安全闸：相关文件里只要还有未保存改动就不撤，绝不覆盖用户没存的东西 */
          const affected = new Set(r0.entries.map((x) => x.path));
          const dirtyNow = tabsRef.current.filter((x) => affected.has(x.path) && x.dirty === true);
          if (dirtyNow.length > 0) {
            setFsStatus("目录替换未撤销：有 " + dirtyNow.length + " 个相关文件存在未保存改动，先保存或关闭再撤");
            setFsStatusStyle({ color: C.warn });
            return true;
          }
          dirReplaceUndo = null;
          setFsStatus("正在撤销目录替换（" + r0.entries.length + " 个文件）…");
          setFsStatusStyle({ color: C.dim });
          Promise.all(r0.entries.map((x) => {
            let q = null;
            try { q = apiCall("writeFile", { path: x.path, content: x.content, encoding: x.encoding, bom: x.bom === true }); } catch (e) { q = null; }
            return Promise.resolve(q).catch(() => null);
          })).then((rs) => {
            const bad = rs.filter((x) => !x || x.ok === false).length;
            /* 已打开的标签必须重新读盘，否则仍持有替换后的文本，下一次 Ctrl+S 会把撤销写回 */
            if (typeof dirReplacedHandler === "function") { for (const d of (r0.dirs || [])) { try { dirReplacedHandler(d); } catch (e) { } } }
            if (bad) { setFsStatus("目录替换已撤销，但有 " + bad + " 个文件写回失败（可能在工作区外）"); setFsStatusStyle({ color: C.warn }); }
            else { setFsStatus("已撤销目录替换：" + r0.entries.length + " 个文件已按原文写回"); setFsStatusStyle({ color: C.green }); }
          }).catch(() => { });
          return true;
        }
        /* Git 回退类操作（丢弃改动 / 回退到某个提交）：整文件按原文写回。
           与目录替换的区别是只动一个文件，且要处理「操作前文件不存在」（未跟踪文件被删除）的情况。 */
        const g = gitOpUndoRef.current;
        /* 整树类操作（还原文件 / 重置分支）的撤回：再执行一次相反的整树操作。
           与单文件回退不同，这里没有「原文」可写回，只能靠 git 本身反向操作。 */
        if (g && (g.kind === "restoreTree" || g.kind === "resetBranch")) {
          const back = g.back;
          if (!back) return false;
          gitOpUndoRef.current = null;
          const isReset = g.kind === "resetBranch";
          setFsStatus((isReset ? "正在撤回分支重置（分支指回 " + back + "）…" : "正在撤回还原（文件回到 " + back + "）…"));
          setFsStatusStyle({ color: C.dim });
          Promise.resolve(apiCall(isReset ? "gitResetToCommit" : "gitRestoreCommit", { path: g.root, hash: back }, 120000)).then((res) => {
            if (res && res.ok) {
              setFsStatus(isReset ? ("已撤回分支重置：分支已指回 " + back) : ("已撤回还原：文件已回到 " + back + " 的样子"));
              setFsStatusStyle({ color: C.green });
              for (const rel of (res.changed || [])) {
                try { reloadFileFromDisk(gitAbsPath(res.root || g.root, rel)); } catch (e) { }
              }
            } else {
              setFsStatus((isReset ? "撤回分支重置失败：" : "撤回还原失败：") + ((res && res.error) || "未知错误"));
              setFsStatusStyle({ color: C.warn });
            }
          }).catch(() => { }).then(() => { if (typeof gitPanelRefresh === "function") { try { gitPanelRefresh(); } catch (e) { } } });
          return true;
        }
        if (g) {
          if (fromPath && fromPath !== g.file) return false;
          const gt = tabsRef.current.find((x) => x.path === g.file);
          if (gt && gt.dirty === true) {
            setFsStatus("版本回退未撤销：该文件有未保存改动，先保存或关闭再撤");
            setFsStatusStyle({ color: C.warn });
            return true;
          }
          gitOpUndoRef.current = null;
          const gFile = g.file;
          const afterRestore = () => {
            if (typeof gitPanelRefresh === "function") { try { gitPanelRefresh(); } catch (e) { } }
            reloadFileFromDisk(gFile);
          };
          if (!g.existed) {
            /* 操作前文件不存在（它是未跟踪文件，已被删除）→ 撤销 = 让这个文件重新消失。
               没有删除文件的接口，用「匹配字面量替换成空」把内容清空（不新增字符，也就
               不存在还原正则 $1 展开出错的风险）。Verilog 源文件必含 module/endmodule，
               拿不到锚点时如实报错，不做半吊子清理。 */
            const s0 = String(g.prev == null ? "" : g.prev);
            const anchor = /\bendmodule\b/.test(s0) ? "endmodule" : (/\bmodule\b/.test(s0) ? "module" : "");
            if (!anchor) {
              setFsStatus("撤销未完成：该文件原本不存在，但内容里找不到可清空的锚点，请手动删除 " + gFile);
              setFsStatusStyle({ color: C.warn });
              return true;
            }
            setFsStatus("正在撤销版本操作（" + gFile + "）…");
            setFsStatusStyle({ color: C.dim });
            const parts = gFile.split(/[\\/]/);
            const fName = parts[parts.length - 1];
            const fDir = parts.slice(0, -1).join("\\");
            let rq = null;
            try { rq = apiCall("replaceInFiles", { dir: fDir, needle: anchor, replacement: "", filter: fName, recurse: false }, 60000); } catch (e) { rq = null; }
            Promise.resolve(rq).then((res) => {
              if (res && res.ok) { setFsStatus("已撤销版本操作：" + gFile + " 的内容已清空（该文件原本不存在，可手动删除）"); setFsStatusStyle({ color: C.green }); }
              else { setFsStatus("撤销未完成：" + ((res && res.error) || "清空失败") + "，请手动删除 " + gFile); setFsStatusStyle({ color: C.warn }); }
            }).catch(() => { setFsStatus("撤销未完成：清空失败，请手动删除 " + gFile); setFsStatusStyle({ color: C.warn }); })
              .then(afterRestore);
            return true;
          }
          setFsStatus("正在撤销版本操作（" + gFile + "）…");
          setFsStatusStyle({ color: C.dim });
          let gq = null;
          try { gq = apiCall("writeFile", { path: gFile, content: g.prev, encoding: g.encoding || "utf8" }); } catch (e) { gq = null; }
          Promise.resolve(gq).then((res) => {
            if (res && res.ok) { setFsStatus("已撤销版本操作：" + gFile + " 已按操作前的内容写回"); setFsStatusStyle({ color: C.green }); }
            else { setFsStatus("撤销版本操作失败：" + ((res && res.error) || "未知错误")); setFsStatusStyle({ color: C.warn }); }
          }).catch(() => { setFsStatus("撤销版本操作失败：写回异常"); setFsStatusStyle({ color: C.warn }); }).then(afterRestore);
          return true;
        }
        const rec = encUndoRef.current;
        if (!rec) return false;
        // 在别的文件里按 Ctrl+Z 不该改到另一个文件
        if (fromPath && fromPath !== rec.path) return false;
        encUndoRef.current = null;
        const t = tabsRef.current.find((x) => x.path === rec.path);
        if (!t) { setFsStatus("已撤销「" + rec.label + "」（该文件已关闭，未写盘）"); setFsStatusStyle({ color: C.dim }); return true; }
        const cur = String(t.text);
        /* 转码之后用户又改过内容：只把编码改回去、按当前内容写盘，绝不丢他的编辑 */
        const edited = rec.postText != null && cur !== rec.postText;
        const text = edited ? cur : rec.prevText;
        setTabs((prev) => prev.map((x) => (x.path === rec.path ? Object.assign({}, x, {
          text: text, encoding: rec.prevEncoding, bom: rec.prevBom === true, dirty: false
        }) : x)));
        if (!rec.wrote) {
          setFsStatus("已撤销「" + rec.label + "」：编辑器恢复原编码，文件未被修改");
          setFsStatusStyle({ color: C.green });
          return true;
        }
        let req = null;
        try { req = apiCall("writeFile", { path: rec.path, content: eolEncode(text, t.eol), encoding: rec.prevEncoding, bom: rec.prevBom === true }); } catch (e) { req = null; }
        Promise.resolve(req).then((res) => {
          if (res && res.ok) {
            setFsStatus("已撤销「" + rec.label + "」：文件已写回 " + encLabel(rec.prevEncoding) + (edited ? "（用的是你当前的内容）" : ""));
            setFsStatusStyle({ color: C.green });
            apiCall("stat", { path: rec.path }).then((st) => {
              if (st && st.ok) setTabs((prev) => prev.map((x) => (x.path === rec.path ? { ...x, diskMtime: st.mtimeMs || 0, diskSize: st.size || 0 } : x)));
            }).catch(() => { });
          } else {
            setFsStatus("撤销写回失败：" + ((res && res.error) || "未知错误")); setFsStatusStyle({ color: C.warn });
          }
        }).catch(() => { });
        return true;
      };
      const pendingReadRef = React.useRef({});
      const kChordRef = React.useRef(false);
      const kChordTimerRef = React.useRef(null);
      const clearKChord = () => { kChordRef.current = false; if (kChordTimerRef.current) { clearTimeout(kChordTimerRef.current); kChordTimerRef.current = null; } };
      // 拆分视图：第二组显示的文件 path（数据源与 tabs 同记录，编辑同步）
      const [rightPaths, setRightPaths] = React.useState([]);
      const [rightActivePath, setRightActivePath] = React.useState(null); // 右栏当前激活标签
      // 副组内部二级拆分（B 方案第一步：仅副组内再拆一次）
      const [subPaths, setSubPaths] = React.useState([]); // 副组内的"另一侧"文件列表
      const [subActive, setSubActive] = React.useState(null); // 副组内另一侧激活
      const [subDir, setSubDir] = React.useState("down"); // 副组内部方向 right/down
      const rightSubARef = React.useRef(null);
      /* 用户在面板里手动选过目标文件夹就记住（按工作区文件夹清单持久，换工作区各记一份） */
      const scmPickKey = React.useMemo(() => {
        const list = Array.isArray(folders) ? folders : [];
        return list.map((f) => normPath(f && f.path)).sort().join("|");
      }, [folders]);
      const [scmManual, setScmManual] = React.useState("");
      React.useEffect(() => {
        if (!scmPickKey) { setScmManual(""); return; }
        try { setScmManual(localStorage.getItem("card-desk.scm-folder." + scmPickKey) || ""); }
        catch (e) { setScmManual(""); }
      }, [scmPickKey]);
      const rememberScmFolder = (p) => {
        setScmManual(p || "");
        try {
          if (!scmPickKey) return;
          if (p) localStorage.setItem("card-desk.scm-folder." + scmPickKey, p);
          else localStorage.removeItem("card-desk.scm-folder." + scmPickKey);
        } catch (e) { /* localStorage 不可用时只保留内存态 */ }
      };
      /* 目标文件夹：优先按"当前打开/编辑的文件"归属到大文件夹；其次副组文件；再看已打开标签；
         之后才用用户手动选的值；都没有则兜底第一个（界面会标低置信度请用户确认）。 */
      const scmPick = pickScmFolder(folders, {
        activePath: activePath, rightActivePath: rightActivePath, tabs: tabs,
        rightPaths: rightPaths, manual: scmManual
      });
      const gitRootPath = scmPick.path;
      const [scmOpen, setScmOpen] = React.useState(false);
      const [scmW, setScmW] = React.useState(360);
      const [scmStat, setScmStat] = React.useState(null);
      /* 刷新计数：GitPanel 内部变更后由工作台自增，触发重新探测（也用于可见性判断） */
      const [gitRev, setGitRev] = React.useState(0);
      React.useEffect(() => {
        let dead = false;
        if (!gitRootPath) { setScmStat(null); return; }
        apiCall("gitStatus", { path: gitRootPath }).then((r) => {
          if (dead) return;
          setScmStat(r && r.ok === true ? r : null);
        }).catch(() => { if (!dead) setScmStat(null); });
        return () => { dead = true; };
      }, [gitRootPath, gitRev]);
      /* 钩子：git 面板的回退流程结束后，由 revertLastCodeOp 调它刷新面板列表 */
      const gitPanelRefresh = () => { setGitRev((n) => n + 1); };
      /* 面板可见性：工作区里已有仓库就显示；尚未启用时只有用户主动点开才显示 */
      const scmVisible = !!(scmStat && scmStat.isRepo === true) || (scmOpen && !!(gitRootPath));
      const rightSubBRef = React.useRef(null);
      const [subRatio, setSubRatio] = React.useState(0.5); // 副组内部比例
      // 副组内分隔条拖动：调整副组两格比例
      const subDividerDragDown = (e) => {
        e.preventDefault(); e.stopPropagation();
        const host = rightPaneRef.current;
        const rect0 = host ? host.getBoundingClientRect() : null;
        if (!rect0) return;
        const startP = subDir === "right" ? e.clientX : e.clientY;
        const span = subDir === "right" ? rect0.width : rect0.height;
        const startRatio = subRatio;
        const move = (ev) => {
          const cur = subDir === "right" ? ev.clientX : ev.clientY;
          setSubRatio(Math.max(0.2, Math.min(0.8, startRatio + (cur - startP) / span)));
        };
        const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); window.removeEventListener("blur", up); };
        document.addEventListener("mousemove", move);
        window.addEventListener("blur", up);   // 鼠标在窗口外松开时浏览器不派发 mouseup，这里兜底清理
        document.addEventListener("mouseup", up);
      };
      // 副组 B/C 互换：副组主格(B=rightActive) 与 副组第二格(C=subActive) 交换
      const swapSubB = () => {
        if (!rightActivePath || !subActive) return;
        const a = rightActivePath, b = subActive;
        setRightActivePath(b);         // C 变主格
        setSubActive(a);               // B 变副格
        setSubPaths([a]);
        setRightPaths((ps) => ps.map((p) => (p === a ? b : p)));
      };
      // 副组 C 收起：把 C 放回右栏标签条并激活，副组变回单格 B
      const undockSub = () => {
        if (!subActive) return;
        const c = subActive;
        setRightPaths((ps) => (ps.includes(c) ? ps : [...ps, c]));
        setRightActivePath(c);
        setSubPaths([]);
        setSubActive(null);
      };
      // 副组内 C 标签拖放：识别落点（B区域=互换 / 副组顶标签=收起）
      const subTabDragRef = React.useRef(null);
      const subTabMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        // B 格内标签条 rect（合并目标）：B 格(rightSubARef) 顶部 35px
        const bPaneRect = rightSubARef.current ? rightSubARef.current.getBoundingClientRect() : null;
        const stripRect = bPaneRect ? { left: bPaneRect.left, right: bPaneRect.right, top: bPaneRect.top, bottom: bPaneRect.top + 35 } : null;
        subTabDragRef.current = { cx: e.clientX, dragging: false, stripRect };
        const move = (ev) => {
          if (!subTabDragRef.current) return;
          const d = subTabDragRef.current;
          if (!d.dragging) { if (Math.abs(ev.clientX - d.cx) < 5) return; d.dragging = true; }
          ev.preventDefault();
          // 落点判断：副组顶标签条(B标题栏) vs B编辑器区
          const stripRectB = d.stripRect; // B标签条 rect（副组顶部标签条）
          const bRect = rightSubARef.current ? rightSubARef.current.getBoundingClientRect() : null;
          if (bRect) {
            const inB = ev.clientX >= bRect.left && ev.clientX <= bRect.right && ev.clientY >= bRect.top && ev.clientY <= bRect.bottom;
            setDragOverEdge(inB ? "subSwap" : (stripRectB && ev.clientY <= stripRectB.bottom ? "subUndock" : null));
          }
        };
        const up = (ev) => {
          if (subTabDragRef.current && subTabDragRef.current.dragging) {
            const bRect = rightSubARef.current ? rightSubARef.current.getBoundingClientRect() : null;
            const stripRectB = subTabDragRef.current.stripRect;
            const inB = bRect && ev.clientX >= bRect.left && ev.clientX <= bRect.right && ev.clientY >= bRect.top && ev.clientY <= bRect.bottom;
            const inStrip = stripRectB && ev.clientX >= stripRectB.left && ev.clientX <= stripRectB.right && ev.clientY >= stripRectB.top && ev.clientY <= stripRectB.bottom;
            if (inStrip) undockSub();
            else if (inB) swapSubB();
          }
          subTabDragRef.current = null;
          setDragOverEdge(null);
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
          window.removeEventListener("blur", up);
        };
        document.addEventListener("mousemove", move);
        window.addEventListener("blur", up);   // 鼠标在窗口外松开时浏览器不派发 mouseup，这里兜底清理
        document.addEventListener("mouseup", up);
      };
      // ⑯ 拆分方向：'right' = 左右并排（默认）；'down' = 上下堆叠（Ctrl+Shift+\）
      const [splitDir, setSplitDir] = React.useState("right");
      // ⑰ 拆分分隔条比例（左组占比 0.25–0.75），拖动分隔条实时调整
      const [splitRatio, setSplitRatio] = React.useState(0.5);
      const [splitContainerSize, setSplitContainerSize] = React.useState(null); // 拆分容器实际宽度/高度（px）
      const splitDragRef = React.useRef(null); // {startX, startRatio}
      const splitContainerRef = React.useRef(null); // 拆分容器 DOM ref
      // 两栏 DOM 引用（拖放判断等使用）
      const rightPaneRef = React.useRef(null);
      const leftPaneRef = React.useRef(null);
      // 侧栏宽度（可拖）与标签拖拽状态
      const [sideW, setSideW] = React.useState(300);
      const [dragOverEdge, setDragOverEdge] = React.useState(null); // 'right' = 拖到右缘欲拆分
      const dragPathRef = React.useRef(null);
      const sideDragRef = React.useRef(null);

      const activeTab = tabs.find((t) => t.path === activePath) || null;
      /* 纯 ASCII 文件：编码标签对它们没有信息量（0x00-0x7F 在 UTF-8 与 GBK 里逐字节相同），
         显示成 ASCII 而不是 UTF-8，免得用户以为"检测错了"。
         用 useMemo 按文本引用缓存，避免每次光标移动都全量扫描大文件。 */
      const activeIsAscii = React.useMemo(() => !/[^\x00-\x7F]/.test(String(activeTab ? activeTab.text : "")), [activeTab ? activeTab.text : ""]);
      /* 「含中文、但按 UTF-8 存」的 Verilog 文件：Vivado 按 GBK 读会显示乱码（用户实测的困惑点）。
         状态栏要给醒目标记，否则用户只能靠"预览发现不对"来察觉。 */
      const activeNeedsGbk = !!activeTab && !activeIsAscii && !activeTab.forceView
        && /\.(v|sv|vh|svh)$/i.test(String(activeTab.path || ""))
        && String(activeTab.encoding || "utf8").toLowerCase() !== "gbk";
      const activeText = activeTab ? activeTab.text : "";
      const rightTab = rightActivePath ? (tabs.find((t) => t.path === rightActivePath) || null) : null;
      const rightText = rightTab ? rightTab.text : "";
      // 右栏指向的文件若已不在 tabs（预览被替换/关闭等），自动从右栏移除
      React.useEffect(() => {
        const validPaths = rightPaths.filter(p => tabs.some(t => t.path === p));
        if (validPaths.length !== rightPaths.length) {
          setRightPaths(validPaths);
          // 如果激活标签被移除，切换到第一个
          if (rightActivePath && !validPaths.includes(rightActivePath)) {
            setRightActivePath(validPaths[0] || null);
          }
        }
      }, [rightPaths, tabs, rightActivePath]);

      /* ---- 工作区持久化（纯函数外保存，避免 updater 副作用） ---- */
      const persistWorkspace = async (flds) => {
        try { localStorage.setItem(WS_KEY, JSON.stringify({ folders: flds })); } catch (e) { }
        await apiCall("workspaceSave", { folders: flds });
      };
      // ⑥ 打开的标签会话恢复：存 路径+pinned+active+right（不含正文，重启后重读磁盘）
      const SESS_KEY = "card-desktop-session-v1";
      const restoredRef = React.useRef(false); // 恢复完成前禁写，避免空 tabs 覆盖旧会话
      /* 当前未保存集合 = 现在 dirty 的标签 ∪ 不在打开列表里的旧记录（孤儿）。
         本地 dirtyStore 与宿主 session.json 的 dirtyTexts 都用这一份，避免两处判断不一致。 */
      const buildDirtyPayload = React.useCallback(() => {
        const open = Object.create(null);
        for (const t of (tabs || [])) if (t && t.path) open[dirtyStore.keyOf(t.path)] = true;
        const out = Object.create(null);
        const prev = dirtyStore.all();
        for (const k of Object.keys(prev)) if (!open[k]) out[k] = prev[k];   // 孤儿：保留，绝不误删用户没保存的内容
        for (const t of (tabs || [])) {
          if (!t || !t.path || !t.dirty || typeof t.text !== "string" || t.error) continue;
          out[dirtyStore.keyOf(t.path)] = { text: t.text, eol: t.eol || "lf", encoding: t.encoding || "utf8", bom: t.bom === true, diskMtime: t.diskMtime || 0, diskSize: t.diskSize || 0, at: Date.now() };
        }
        return out;
      }, [tabs]);
      const saveSession = () => {
        if (!restoredRef.current) return;
        const payload = {
          paths: tabs.map((t) => ({ path: t.path, pinned: !!t.pinned })),
          active: activePath,
          rightPaths: rightPaths,
          rightActive: rightActivePath,
          // 左栏视图模式（explorer/hierarchy 等）
          leftTab: leftTab,
          // 右栏副组二级拆分
          subPaths: subPaths,
          subActive: subActive,
          subDir: subDir,
          subRatio: subRatio,
          splitDir: splitDir,
          splitRatio: splitRatio,
          // 右侧对话面板的开关与宽度（此前不持久化：退出前打开，重开就没了）
          chatOpen: !!chatOpen,
          chatW: chatW,
          // 源代码管理面板同理（用户要求「退出前后保持一致」；此前一处都没存）
          scmOpen: !!scmOpen,
          scmW: scmW
        };
        try { localStorage.setItem(SESS_KEY, JSON.stringify(payload)); } catch (e) { }
        // 宿主侧同一份（防抖 600ms）：换浏览器（QQ浏览器 ↔ DSH.exe）打开时才能看到同一状态。
        // 未保存正文不在这里发（几 MB 的序列化+写盘不能挂在每次改动的防抖上），
        // 只在退出/隐藏时由 flushSessionToHost({dirtyTexts}) 写一次。
        saveSessionToHost(payload);
        // 同步刷新当前工作区的布局记录（切走时才能精确还原；同一份不重复写盘）
        stashWsLayout(foldersRef.current);
      };
      React.useEffect(() => {
        // 恢复工作区后，异步恢复上次打开的标签会话（⑥）
        restoreSession().finally(() => { restoredRef.current = true; });
      }, []);
      const restoreSession = async () => {
        let data = null;
        // 先读宿主侧那份（跨浏览器共享）；宿主没写过或不可用，再回退 localStorage
        try {
          const hostRes = await apiCall("sessionLoad", {});
          if (hostRes && hostRes.ok !== false && hostRes.session && typeof hostRes.session === "object") data = hostRes.session;
        } catch (e) { data = null; }
        if (!data || !Array.isArray(data.paths) || !data.paths.length) {
          let local = null;
          try { local = JSON.parse(localStorage.getItem(SESS_KEY) || "null"); } catch (e) { local = null; }
          if (local && Array.isArray(local.paths) && local.paths.length) {
            data = local;
            // 老数据自动迁移：宿主那份还空着，把 localStorage 这份推上去
            saveSessionToHost(local);
          }
        }
        if (!data || !Array.isArray(data.paths) || !data.paths.length) return;
        const opened = [];
        for (const it of data.paths) {
          if (!it || typeof it.path !== "string") continue;
          // 逐路径重读（读失败也占位，保持标签形态）
          // 单路径失败不能中断整批恢复：apiCall 抛错或宿主返回形态异常都按「读取失败」处理
          let res = null;
          try { res = await apiCall("readFile", { path: it.path }); } catch (e) { res = null; }
          const okRead = !!(res && res.ok && typeof res.content === "string");
          const raw = okRead ? res.content : ((res && res.error) || "读取失败");
          // 显示层统一 \n：textarea value API 会把 \r\n 归一成 \n，若不提前归一，CRLF 文件所有选区索引会逐行错位
          /* 热退出：有未保存副本就用它，并标 dirty（否则磁盘内容会盖掉用户没存下的改动） */
          /* 热退出副本可能来自两处：本浏览器的 dirtyStore（随卸载立即落盘）与宿主 session.json 的
             dirtyTexts（跨入口共享）。取 at 更新的那个 —— 两边都能兜住，不会因为换入口就丢未保存内容。 */
          const ldt = dirtyStore.get(it.path);
          const hdt = (data && data.dirtyTexts && data.dirtyTexts[dirtyStore.keyOf(it.path)]) || null;
          const dt = (ldt && hdt) ? (((ldt.at || 0) >= (hdt.at || 0)) ? ldt : hdt) : (ldt || hdt);
          const text = dt ? dt.text : (okRead ? raw.replace(/\r\n/g, "\n") : raw);
          opened.push({
            path: it.path, pinned: !!it.pinned,
            dirty: !!dt,
            encoding: (dt && dt.encoding) || (res && res.encoding) || "utf8",
            eol: (dt && dt.eol) || (/\r\n/.test(raw) ? "crlf" : "lf"),
            bom: !!(dt && dt.bom),
            diskMtime: (dt && dt.diskMtime) || (res && res.mtimeMs) || 0,
            diskSize: (dt && dt.diskSize) || (res && res.size) || 0,
            text,
            error: okRead ? null : (dt ? null : raw)
          });
        }
        if (!opened.length) return;
        setTabs(opened);
        const restoredDirty = opened.filter((t) => t.dirty).length;
        if (restoredDirty) {
          setFsStatus("已恢复 " + restoredDirty + " 个未保存的改动（Ctrl+S 保存；保存时会检查磁盘是否被外部改过）");
          setFsStatusStyle({ color: C.accent });
        }
        if (data.active && opened.some((t) => t.path === data.active)) setActivePath(data.active);
        else setActivePath(opened[opened.length - 1].path);
        // 恢复右栏多标签（旧数据用 data.right 单路径兼容）
        const rp = Array.isArray(data.rightPaths) ? data.rightPaths.filter(p => opened.some(t => t.path === p)) : (data.right ? [data.right] : []);
        if (rp.length) {
          setRightPaths(rp);
          setRightActivePath(data.rightActive && rp.includes(data.rightActive) ? data.rightActive : rp[0]);
        }
        // 左栏视图模式
        if (data.leftTab && ["explorer", "hierarchy", "outline"].includes(data.leftTab)) setLeftTab(data.leftTab);
        // 右栏副组二级拆分
        if (Array.isArray(data.subPaths) && data.subPaths.length && data.subActive && opened.some((t) => t.path === data.subActive)) {
          setSubPaths(data.subPaths.filter((p) => opened.some((t) => t.path === p)));
          setSubActive(data.subActive);
          if (data.subDir === "right" || data.subDir === "down") setSubDir(data.subDir);
        }
        // 拆分方向/比例
        if (data.splitDir === "right" || data.splitDir === "down") setSplitDir(data.splitDir);
        if (typeof data.splitRatio === "number") setSplitRatio(data.splitRatio);
        if (typeof data.subRatio === "number") setSubRatio(data.subRatio);
        // 右侧对话面板：上次退出时开着，重开就还是开着（宽度一并恢复）
        if (data.chatOpen === true) setChatOpen(true);
        if (typeof data.chatW === "number" && data.chatW >= 320 && data.chatW <= 1400) setChatW(data.chatW);
        // 源代码管理面板：同样恢复开关与宽度（范围与拖拽一致 240..720）
        if (data.scmOpen === true) setScmOpen(true);
        if (typeof data.scmW === "number" && data.scmW >= 240 && data.scmW <= 720) setScmW(data.scmW);
      };
      /* ---- ⑧ 每个工作区各自记住代码区布局 ----
         用户要求：A 切到 B 时，代码区换成 B 上次打开的那些文件；切回 A 再换回 A 上次的。
         工作区身份 = 全部文件夹路径拼起来（顺序无关紧要，这里按原顺序小写拼接）。
         正文不进这份 map：文件正文一律从磁盘重读，未保存改动仍由热退出 dirtyStore 兜底。
         上限 WS_LAYOUT_MAX 份，超出按最近使用时间淘汰。 */
      const WS_LAYOUT_KEY = "card-desktop-ws-layout-v1";
      const WS_LAYOUT_MAX = 20;
      const wsKeyOf = (flds) => (Array.isArray(flds) ? flds : [])
        .map((f) => String((f && f.path) || "").toLowerCase()).filter(Boolean).sort().join("|");
      const readWsLayouts = () => {
        try {
          const d = JSON.parse(localStorage.getItem(WS_LAYOUT_KEY) || "{}");
          return (d && typeof d === "object" && !Array.isArray(d)) ? d : {};
        } catch (e) { return {}; }
      };
      const lastWsLayoutJson = React.useRef({});   // 键 → 上次写入的 JSON：同一份不重复写盘
      const stashWsLayout = (flds) => {
        try {
          const key = wsKeyOf(Array.isArray(flds) ? flds : foldersRef.current);
          if (!key) return;
          const payload = {
            paths: tabsRef.current.map((t) => ({ path: t.path, pinned: !!t.pinned })),
            active: activePathRef.current,
            rightPaths: rightPaths, rightActive: rightActivePath,
            leftTab: leftTab, subPaths: subPaths, subActive: subActive, subDir: subDir,
            subRatio: subRatio, splitDir: splitDir, splitRatio: splitRatio,
            chatOpen: !!chatOpen, chatW: chatW,
            scmOpen: !!scmOpen, scmW: scmW
          };
          /* 去重判据用「不含时间戳」的内容：内容没变就完全不写盘（saveSession 会被频繁调用，
             每次都写一份 map 是浪费）；at 只在内容真变了时才更新，仍能表达 LRU。 */
          const json = JSON.stringify(payload);
          if (lastWsLayoutJson.current[key] === json) return;
          payload.at = Date.now();
          const map = readWsLayouts();
          map[key] = payload;
          const keys = Object.keys(map).sort((a, b) => ((map[b] && map[b].at) || 0) - ((map[a] && map[a].at) || 0));
          for (const k of keys.slice(WS_LAYOUT_MAX)) delete map[k];
          localStorage.setItem(WS_LAYOUT_KEY, JSON.stringify(map));
          const keep = {};
          for (const k of Object.keys(lastWsLayoutJson.current)) if (map[k]) keep[k] = lastWsLayoutJson.current[k];
          keep[key] = json;
          lastWsLayoutJson.current = keep;
        } catch (e) { /* 存不下就算了，不影响主流程 */ }
      };
      /* 性能诊断探针：整页采样 10 秒，抓 LoAF（long animation frame，能给出责任脚本与函数名）
         + longtask + rAF 帧间隔，最后写进 localStorage['card-desk.perf-probe']。
         用途：定位「客户端空闲却烧 CPU」到底是哪个插件/组件的代码在跑（不需要 devtools、不需要第二个实例）。
         开销：一个 rAF 循环 + 两个 PerformanceObserver，10 秒后自行断开。 */
      const PERF_PROBE_KEY = "card-desk.perf-probe";
      /* WebSocket 观测（只加一个旁听 listener，不拦截、不改协议）：
         客户端烧 CPU 的热点是 api-gateway 的 received（每条消息同步处理 ~40ms），
         所以要看清「谁在推、推了多少条、消息多大、消息长什么样」。 */
      const perfWsStats = { n: 0, bytes: 0, samples: Object.create(null), installed: false };
      /* 「谁在持续要帧 / 谁在起定时器」的来源统计：rAF 与定时器都只做旁听（原样透传），
         用注册时的调用栈定位到具体文件行 —— 这能直接指名把 CPU 烧掉的那段代码。 */
      const perfOrigins = { installed: false, raf: Object.create(null), timer: Object.create(null), rafN: 0, timerN: 0 };
      const originOf = (cb) => {
        try {
          const st = String((new Error()).stack || "").split("\n");
          for (let i = 1; i < Math.min(st.length, 12); i++) {
            const line = st[i].trim();
            const m = /(?:\(|at\s+)([^()\s]+\.js(?::\d+)?(?::\d+)?)\)?/.exec(line);
            if (!m) continue;
            const u = m[1];
            if (u.indexOf("card-desktop") >= 0) continue;   // 跳过探针自己
            return u.replace(/^https?:\/\/[^\/]+/, "").slice(0, 120);
          }
        } catch (e) { }
        try { return "cb:" + String(cb).slice(0, 60).replace(/\s+/g, " "); } catch (e) { }
        return "(unknown)";
      };
      const ensureOriginTap = () => {
        if (perfOrigins.installed) return;
        perfOrigins.installed = true;
        try {
          const origRaf = window.requestAnimationFrame;
          if (typeof origRaf === "function") {
            window.requestAnimationFrame = function (cb) {
              try {
                if (typeof cb === "function" && cb.__dshProbeOwn !== true) {
                  perfOrigins.rafN += 1;
                  const k = originOf(cb);
                  perfOrigins.raf[k] = (perfOrigins.raf[k] || 0) + 1;
                }
              } catch (e) { }
              return origRaf.apply(this, arguments);
            };
          }
        } catch (e) { }
        try {
          const origSetT = window.setTimeout, origSetI = window.setInterval;
          const tap = (orig) => function (fn, ms) {
            try {
              if (typeof fn === "function" && fn.__dshProbeOwn !== true) {
                perfOrigins.timerN += 1;
                const k = originOf(fn) + "  [" + String(ms) + "ms]";
                perfOrigins.timer[k] = (perfOrigins.timer[k] || 0) + 1;
              }
            } catch (e) { }
            return orig.apply(this, arguments);
          };
          window.setTimeout = tap(origSetT);
          window.setInterval = tap(origSetI);
        } catch (e) { }
      };
      const topOf = (map, n) => Object.keys(map).sort((a, b) => map[b] - map[a]).slice(0, n).map((k) => ({ n: map[k], k: k }));
      /* 【性能探针】Worker / SharedWorker / AudioContext 旁听：
         它们的开销不体现在主线程的 rAF 与定时器统计里（Worker 有自己的线程，音频有音频线程），
         而本次实测「0 CSS 动画 / 0 WS / 20 次 rAF / 0 长任务」却仍烧 0.7~0.9 核 —— 需要排除这一类。 */
      const perfEnv = { workers: Object.create(null), audio: 0, installed: false };
      const ensureEnvTap = () => {
        if (perfEnv.installed) return;
        perfEnv.installed = true;
        try {
          const W = window.Worker;
          if (typeof W === "function") {
            window.Worker = function (url, opts) {
              try { perfEnv.workers[String(url).slice(0, 140)] = (perfEnv.workers[String(url).slice(0, 140)] || 0) + 1; } catch (e) { }
              return new W(url, opts);
            };
            window.Worker.prototype = W.prototype;
          }
        } catch (e) { }
        try {
          const SW = window.SharedWorker;
          if (typeof SW === "function") {
            window.SharedWorker = function (url, opts) {
              try { perfEnv.workers["shared:" + String(url).slice(0, 130)] = (perfEnv.workers["shared:" + String(url).slice(0, 130)] || 0) + 1; } catch (e) { }
              return new SW(url, opts);
            };
            window.SharedWorker.prototype = SW.prototype;
          }
        } catch (e) { }
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (typeof AC === "function") {
            const Wrapped = function () {
              try { perfEnv.audio += 1; } catch (e) { }
              return new AC(...arguments);
            };
            Wrapped.prototype = AC.prototype;
            if (window.AudioContext) window.AudioContext = Wrapped;
            if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
          }
        } catch (e) { }
      };
      const ensureWsTap = () => {
        if (perfWsStats.installed) return;
        perfWsStats.installed = true;
        try { ensureEnvTap(); } catch (e) { }
        try {
          const proto = window.WebSocket && window.WebSocket.prototype;
          if (!proto || typeof proto.addEventListener !== "function" || proto.__dshWsTapped) return;
          Object.defineProperty(proto, "__dshWsTapped", { value: true, configurable: true });
          const orig = proto.addEventListener;
          proto.addEventListener = function (type, fn, opts) {
            try {
              if (type === "message" && typeof fn === "function" && !fn.__dshWsTapFn) {
                const wrapped = function (ev) {
                  try {
                    const d = ev && ev.data;
                    const str = typeof d === "string" ? d : "[binary]";
                    perfWsStats.n += 1;
                    perfWsStats.bytes += str.length;
                    const head = str.slice(0, 110);
                    perfWsStats.samples[head] = (perfWsStats.samples[head] || 0) + 1;
                  } catch (e) { }
                  return fn.apply(this, arguments);
                };
                wrapped.__dshWsTapFn = true;
                return orig.call(this, type, wrapped, opts);
              }
            } catch (e) { }
            return orig.call(this, type, fn, opts);
          };
        } catch (e) { }
      };
      const runPerfProbe = (loud) => {
        ensureWsTap();
        ensureOriginTap();
        const ws0 = { n: perfWsStats.n, bytes: perfWsStats.bytes };
        const o0 = { rafN: perfOrigins.rafN, timerN: perfOrigins.timerN };
        perfOrigins.raf = Object.create(null);      // 只统计本次窗口
        perfOrigins.timer = Object.create(null);
        const probeT0 = performance.now();
        const out = {
          startedAt: Date.now(), url: location.pathname + location.hash,
          domNodes: document.querySelectorAll('*').length,
          loaf: [], longTasks: [], frames: 0, frameMs: [], listeners: 0
        };
        try { out.heapMB = Math.round(((performance.memory && performance.memory.usedJSHeapSize) || 0) / 1048576); } catch (e) { }
        /* 没有 rAF 申请、没有长任务、没有 WS 消息，却仍在烧 CPU —— 那只剩「合成器/样式重绘」：
           CSS 动画与过渡不注册 rAF。getAnimations() 能把正在跑的动画连同目标元素一起列出来。 */
        try {
          const anims = (typeof document.getAnimations === "function") ? document.getAnimations() : [];
          out.animCount = anims.length;
          out.animTop = anims.slice(0, 6).map((a) => {
            let target = "";
            try {
              const t = a.effect && a.effect.target;
              if (t) target = t.tagName + (t.className ? "." + String(t.className).slice(0, 70) : "");
            } catch (e) { }
            let dur = 0, iter = "";
            try { const tm = a.effect.getTiming(); dur = Math.round(tm.duration || 0); iter = String(tm.iterations); } catch (e) { }
            return { name: String(a.animationName || ""), prop: String(a.transitionProperty || ""), target: target, state: String(a.playState || ""), dur: dur, iter: iter };
          });
        } catch (e) { out.animErr = String((e && e.message) || e); }
        let raf = 0;
        let last = performance.now();
        const tick = () => { const now = performance.now(); out.frames += 1; if (out.frameMs.length < 3000) out.frameMs.push(Math.round(now - last)); last = now; raf = requestAnimationFrame(tick); };
        tick.__dshProbeOwn = true;   // 探针自己的循环不计入来源统计（否则 Top1 永远是自己）
        try { raf = requestAnimationFrame(tick); } catch (e) { }
        let poLoaf = null, poLong = null;
        try {
          poLoaf = new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              if (out.loaf.length >= 200) continue;
              out.loaf.push({
                d: Math.round(e.duration || 0),
                invoker: String(e.invoker || "").slice(0, 60),
                scripts: (e.scripts || []).slice(0, 5).map((sc) => ({
                  u: String(sc.sourceURL || "").replace(/^https?:\/\/[^\/]+/, "").slice(-90),
                  f: String(sc.sourceFunctionName || ""),
                  d: Math.round(sc.duration || 0)
                }))
              });
            }
          });
          poLoaf.observe({ type: "long-animation-frame" });   // 不要 buffered：否则会把观察器创建前的历史也算进来
        } catch (e) { out.loafErr = String((e && e.message) || e); }
        try {
          poLong = new PerformanceObserver((list) => { for (const e of list.getEntries()) if (out.longTasks.length < 200) out.longTasks.push(Math.round(e.duration || 0)); });
          poLong.observe({ type: "longtask" });   // 同上：只要本次窗口
        } catch (e) { out.longTaskErr = String((e && e.message) || e); }
        setTimeout(() => {
          try { if (raf) cancelAnimationFrame(raf); } catch (e) { }
          try { poLoaf && poLoaf.disconnect(); } catch (e) { }
          try { poLong && poLong.disconnect(); } catch (e) { }
          const ms = out.frameMs;
          /* 注意：这里量的是「两帧之间的间隔」（≈ 屏幕刷新周期），不是每帧的 CPU 工作时间 */
          out.avgFrameMs = ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0;
          out.maxFrameMs = ms.length ? Math.max.apply(null, ms) : 0;
          out.fps = out.avgFrameMs ? Math.round(1000 / out.avgFrameMs) : 0;
          out.endedAt = Date.now();
          /* WebSocket 消息统计（10 秒窗口内的增量） */
          out.wsMessages = perfWsStats.n - ws0.n;
          out.wsBytes = perfWsStats.bytes - ws0.bytes;
          out.rafCalls = perfOrigins.rafN - o0.rafN;
          out.timerCalls = perfOrigins.timerN - o0.timerN;
          out.rafTop = topOf(perfOrigins.raf, 12);
          out.timerTop = topOf(perfOrigins.timer, 12);
          out.windowMs = Math.round(performance.now() - probeT0);
          out.wsTop = Object.keys(perfWsStats.samples)
            .sort((a, b) => perfWsStats.samples[b] - perfWsStats.samples[a])
            .slice(0, 8)
            .map((k) => ({ n: perfWsStats.samples[k], head: k }));
          perfWsStats.samples = Object.create(null);   // 下个窗口重新统计
          try { localStorage.setItem(PERF_PROBE_KEY, JSON.stringify(out)); } catch (e) { }
          /* 状态栏一行装不下全部细节（尤其 CSS 动画那段容易被截断），
             所以另落一份精简 JSON 到宿主允许的可写根（默认是主目录），便于助手直接读。 */
          try {
            const compact = {
              at: Date.now(), url: out.url, domNodes: out.domNodes, heapMB: out.heapMB,
              frames: out.frames, avgFrameMs: out.avgFrameMs, maxFrameMs: out.maxFrameMs,
              loafCount: (out.loaf || []).length, longTaskCount: (out.longTasks || []).length,
              wsMessages: out.wsMessages, wsBytes: out.wsBytes, wsTop: out.wsTop,
              rafCalls: out.rafCalls, rafTop: out.rafTop,
              timerCalls: out.timerCalls, timerTop: out.timerTop,
              animCount: out.animCount, animTop: out.animTop,
              workers: Object.keys(perfEnv.workers).map((k) => ({ url: k, n: perfEnv.workers[k] })),
              audioContexts: perfEnv.audio
            };
            apiCall("writeRoots", {}).then((r) => {
              try {
                const roots = (r && Array.isArray(r.roots)) ? r.roots : [];
                const home = roots.filter((x) => /^[a-z]:\\users\\[^\\]+$/i.test(String(x)))[0] || roots[0];
                if (!home) return;
                const sep = String(home).indexOf("\\") >= 0 ? "\\" : "/";
                return apiCall("writeFile", { path: String(home) + sep + "dsh-perf-probe.json", content: JSON.stringify(compact, null, 2), encoding: "utf8" });
              } catch (e) { }
            }).catch(() => { });
          } catch (e) { }
          if (loud) {
            const a = (out.animTop || [])[0];
            const animTxt = (out.animCount === undefined ? "?" : out.animCount) + " 个"
              + (a ? ("（首个：" + (a.name || a.prop || "?") + " @ " + String(a.target).slice(0, 46) + " " + a.dur + "ms x" + a.iter + "）") : "");
            setFsStatus("性能诊断：CSS 动画 " + animTxt
              + " ｜ rAF " + out.rafCalls + " 次 / 定时器 " + out.timerCalls + " 次 / WS " + out.wsMessages + " 条"
              + " ｜ 长帧 " + out.loaf.length + "、长任务 " + out.longTasks.length
              + " ｜ Worker " + Object.keys(perfEnv.workers).length + " 个 / AudioContext " + perfEnv.audio + " 个"
              + " ｜ 结果已写入主目录 dsh-perf-probe.json");
            setFsStatusStyle({ color: C.accent });
          }
        }, 10000);
      };
      /* 【2026-09-18】不再自动采样：探针自己的 rAF 循环会把页面按屏幕刷新率（本机 144Hz）
         强行拽着跑，既污染 CPU 读数、又让"帧数/帧间隔"看起来像负载（实测 1439 帧/10 秒、均 7ms）。
         现在只在用户从文件菜单点「性能诊断（10 秒采样）」时才采一次。 */

      /* 把一份工作区布局应用到代码区（正文从磁盘重读；有热退出副本就用副本并标 dirty） */
      const applyWsLayout = async (payload) => {
        const paths = (payload && Array.isArray(payload.paths))
          ? payload.paths.filter((x) => x && typeof x.path === "string") : [];
        if (!paths.length) return 0;
        const opened = [];
        for (const it of paths) {
          let res = null;
          try { res = await apiCall("readFile", { path: it.path }); } catch (e) { res = null; }
          const okRead = !!(res && res.ok && typeof res.content === "string");
          const raw = okRead ? res.content : ((res && res.error) || "读取失败");
          const dt = dirtyStore.get(it.path);
          const text = dt ? dt.text : (okRead ? raw.replace(/\r\n/g, "\n") : raw);
          opened.push({
            path: it.path, pinned: !!it.pinned,
            dirty: !!dt,
            encoding: (dt && dt.encoding) || (res && res.encoding) || "utf8",
            eol: (dt && dt.eol) || (/\r\n/.test(raw) ? "crlf" : "lf"),
            bom: !!(dt && dt.bom),
            diskMtime: (dt && dt.diskMtime) || (res && res.mtimeMs) || 0,
            diskSize: (dt && dt.diskSize) || (res && res.size) || 0,
            text,
            error: okRead ? null : (dt ? null : raw)
          });
        }
        if (!opened.length) return 0;
        setTabs(opened);
        if (payload.active && opened.some((t) => t.path === payload.active)) setActivePath(payload.active);
        else setActivePath(opened[opened.length - 1].path);
        const rp = Array.isArray(payload.rightPaths) ? payload.rightPaths.filter((p) => opened.some((t) => t.path === p)) : [];
        setRightPaths(rp);
        setRightActivePath(rp.length ? (rp.includes(payload.rightActive) ? payload.rightActive : rp[0]) : null);
        if (payload.leftTab && ["explorer", "hierarchy", "outline"].includes(payload.leftTab)) setLeftTab(payload.leftTab);
        if (Array.isArray(payload.subPaths) && payload.subActive && opened.some((t) => t.path === payload.subActive)) {
          setSubPaths(payload.subPaths.filter((p) => opened.some((t) => t.path === p)));
          setSubActive(payload.subActive);
          if (payload.subDir === "right" || payload.subDir === "down") setSubDir(payload.subDir);
        } else { setSubPaths([]); setSubActive(null); }
        if (payload.splitDir === "right" || payload.splitDir === "down") setSplitDir(payload.splitDir);
        if (typeof payload.splitRatio === "number") setSplitRatio(payload.splitRatio);
        if (typeof payload.subRatio === "number") setSubRatio(payload.subRatio);
        if (payload.chatOpen === true) setChatOpen(true);
        if (typeof payload.chatW === "number" && payload.chatW >= 320 && payload.chatW <= 1400) setChatW(payload.chatW);
        if (payload.scmOpen === true) setScmOpen(true);
        if (typeof payload.scmW === "number" && payload.scmW >= 240 && payload.scmW <= 720) setScmW(payload.scmW);
        return opened.length;
      };
      /* ㊸ 代码工作区 ↔ 平台工作区 锚定（一个代码工作区 = 一个平台工作区）。
         身份键 = 全部根路径归一化后排序拼接：多根工作区也只算【一个】工作区。
         只在【已有】工作区里找（顺序：映射表 → 第一个根 → 任意根）；找不到就返回空串，
         【绝不自动 create】—— 工作区由用户自己分类建立。
         找到之后只做一件本地事：挑该工作区里最近的一个可见会话当锚点（deskPin），
         不调用任何平台级导航，所以主界面不会被带走。 */
      const PLAT_WS_MAP_KEY = "card-desktop-ws-platform-v1";
      const platWsReadMap = () => {
        try {
          const d = JSON.parse(localStorage.getItem(PLAT_WS_MAP_KEY) || "{}");
          return (d && typeof d === "object" && !Array.isArray(d)) ? d : {};
        } catch (e) { return {}; }
      };
      const platWsWriteMap = (m) => {
        try { localStorage.setItem(PLAT_WS_MAP_KEY, JSON.stringify(m || {})); } catch (e) { }
      };
      /* 归一化：去尾部分隔符 → 正斜杠统一成反斜杠 → 小写（Windows 路径比较用） */
      const platWsNormPath = (p) => String(p || "").replace(/[\\/]+$/, "").replace(/\//g, "\\").toLowerCase();
      const platWsKeyOf = (list) => (Array.isArray(list) ? list : [])
        .map((f) => platWsNormPath(f && f.path)).filter(Boolean).sort().join("|");
      /* 这条绑定是「手工绑过」还是「按路径自动锚定」？映射表里有记录=手工绑过（只有自动匹配来的才两者不同）。
         面板上的 🔗 按钮要靠它区分「已绑定 / 已锚定」（用户报：绑完还是显示『绑定工作区』）。 */
      const anchorManual = React.useMemo(() => {
        try {
          const list = (folders || []).filter((f) => f && f.path);
          if (!list.length) return false;
          const map = platWsReadMap();
          const key = platWsKeyOf(list);
          let legacyKey = "";
          try { legacyKey = wsKeyOf(list); } catch (e) { legacyKey = ""; }
          return !!(map[key] || (legacyKey && map[legacyKey]));
        } catch (e) { return false; }
        // folders 或绑定结果变化都要重算
      }, [folders, deskPlatformWs]);
      const platWsEnsure = (flds) => {
        const list = (Array.isArray(flds) ? flds : []).filter((f) => f && f.path);
        if (!list.length) return "";
        const key = platWsKeyOf(list);
        const legacyKey = wsKeyOf(list);   // 兼容更早一版写下的映射键（未归一化）
        const svc = (workspacesService && workspacesService.list) ? workspacesService : null;
        let items = [];
        try { const snap = svc && svc.list.getSnapshot(); items = (snap && Array.isArray(snap.items)) ? snap.items : []; } catch (e) { items = []; }
        const map = platWsReadMap();
        const wanted = map[key] || map[legacyKey];
        let hit = wanted ? items.find((w) => w && String(w.workspaceId || "") === String(wanted)) : null;
        if (!hit) {
          const first = platWsNormPath(list[0].path);
          const roots = list.map((f) => platWsNormPath(f.path));
          hit = items.find((w) => w && platWsNormPath(w.path) === first)
            || items.find((w) => w && roots.indexOf(platWsNormPath(w.path)) >= 0);
        }
        const id = hit ? String(hit.workspaceId || "") : "";
        if (id && map[key] !== id) {
          map[key] = id;
          if (legacyKey !== key) delete map[legacyKey];
          platWsWriteMap(map);
        }
        return id;
      };
      /* 从该平台工作区已有的会话里挑一个当锚点：
         排除子代理 / 已归档，优先「聊过的」（非空）会话，一个都没有就退回最新的空会话；
         挑不到返回 ""。 */
      const platWsPickSession = (wsId) => {
        try {
          if (!wsId) return "";
          const wsnap = (workspacesService && workspacesService.list) ? workspacesService.list.getSnapshot() : null;
          const ws = wsnap && Array.isArray(wsnap.items) ? wsnap.items.find((w) => w && String(w.workspaceId) === String(wsId)) : null;
          const ssvc = (props && props.sessionsService) ? props.sessionsService : null;
          const list = (ssvc && ssvc.list) ? ssvc.list.getSnapshot() : null;
          if (!ws || !list || !list.byId) return "";
          const archived = (wsnap && Array.isArray(wsnap.archivedSessionIds)) ? wsnap.archivedSessionIds : [];
          const pickFrom = (pred) => {
            const ids = (ws.sessionIds || []).filter((id) => {
              const s = list.byId[id];
              return !!s && s.origin !== "subagent" && archived.indexOf(id) < 0 && pred(s);
            });
            if (!ids.length) return "";
            ids.sort((a, b) => (((list.byId[b] || {}).updatedAt) || 0) - (((list.byId[a] || {}).updatedAt) || 0));
            return String(ids[0]);
          };
          /* 优先「聊过的」会话；一个都没有时退回该工作区里最新的空会话
             （空会话也是这个工作区的对话，比干脆不锚定更符合「对话跟代码工作区走」）。 */
          return pickFrom((s) => !s.blank) || pickFrom(() => true);
        } catch (e) { return ""; }
      };
      /* 代码工作区的根目录（第一个根，去掉尾部斜杠，保留原大小写） */
      const platWsRootPath = (list) => {
        const f = (Array.isArray(list) ? list : []).find((x) => x && x.path);
        return f ? String(f.path).replace(/[\\/]+$/, "") : "";
      };
      /* 按【会话自己的 cwd】找这个代码工作区的对话 —— 不依赖平台工作区登记，
         就是「我在这条路径下开过的对话」。分档：cwd 正好等于根目录（聊过的 3 / 空的 2）
         > cwd 在根目录之下（聊过的 1 / 空的 0）；已归档、子代理不参与。
         同档里优先聊过的，再按 updatedAt 取最新。 */
      const platWsSessionsByPath = (rootPath, roots) => {
        try {
          const ssvc = (props && props.sessionsService) ? props.sessionsService : null;
          const list = (ssvc && ssvc.list) ? ssvc.list.getSnapshot() : null;
          if (!list || !list.byId || !Array.isArray(list.ids)) return "";
          const wsnap = (workspacesService && workspacesService.list) ? workspacesService.list.getSnapshot() : null;
          const archived = (wsnap && Array.isArray(wsnap.archivedSessionIds)) ? wsnap.archivedSessionIds : [];
          const rootN = platWsNormPath(rootPath);
          const rankOf = (s) => {
            const cwdN = platWsNormPath(s.cwd);
            if (!cwdN) return -1;
            if (cwdN === rootN) return s.blank ? 2 : 3;
            if ((roots || []).some((r) => cwdN.indexOf(r + "\\") === 0)) return s.blank ? 0 : 1;
            return -1;
          };
          const cand = [];
          for (const id of list.ids) {
            const s = list.byId[id];
            if (!s || s.origin === "subagent" || archived.indexOf(id) >= 0) continue;
            const r = rankOf(s);
            if (r > 0) cand.push({ id: String(id), r, at: s.updatedAt || 0 });
          }
          if (!cand.length) return "";
          cand.sort((a, b) => (b.r - a.r) || (b.at - a.at));
          return cand[0].id;
        } catch (e) { return ""; }
      };
      /* 打开/切换代码工作区时：把右侧对话锚到该工作区的对话上（纯本地，不导航主界面）。
         锚点来源：① 已登记同路径工作区里的会话（有就用）② 会话 cwd 落在本代码工作区目录里的对话。
         两条都没有 → 不锚定（回落成跟随主界面）并写一行 console。 */
      const platWsFollow = (flds) => {
        const list = (Array.isArray(flds) ? flds : []).filter((f) => f && f.path);
        if (!list.length) return;
        const rootPath = platWsRootPath(list);
        const roots = list.map((f) => platWsNormPath(f.path)).filter(Boolean);
        const id = platWsEnsure(list);
        deskPlatformWsRef.current = id || "";
        deskPathRef.current = rootPath;
        setDeskPlatformWs(id || "");
        setDeskPath(rootPath);
        const pin = (id ? platWsPickSession(id) : "") || platWsSessionsByPath(rootPath, roots);
        if (pin) { setDeskPin(pin); deskPinRef.current = pin; setDeskPinWhy("ok"); }
        else {
          setDeskPin("");
          deskPinRef.current = "";
          setDeskPinWhy("no-session");
          try { console.info("[card-desktop] 这个代码工作区目录下还没有对话，右侧对话暂不锚定：" + rootPath); } catch (e) { }
        }
      };
      /* ㊸ 手动绑定（标题栏「🔗 绑定工作区」按钮）：用户选了哪个平台工作区，就把它写进映射表
         —— 以后打开同一个代码工作区直接用这条绑定，不再靠路径猜；并立刻把右侧对话锚过去。 */
      const platWsBind = (wsId) => {
        try {
          const list = (folders || []).filter((f) => f && f.path);
          if (!list.length || !wsId) return "";
          const key = platWsKeyOf(list);
          const map = platWsReadMap();
          map[key] = String(wsId);
          try { const legacy = wsKeyOf(list); if (legacy !== key) delete map[legacy]; } catch (e) { }
          platWsWriteMap(map);
          const rootPath = platWsRootPath(list);
          const roots = list.map((f) => platWsNormPath(f.path)).filter(Boolean);
          deskPlatformWsRef.current = String(wsId);
          deskPathRef.current = rootPath;
          setDeskPlatformWs(String(wsId));
          setDeskPath(rootPath);
          const pin = platWsPickSession(wsId) || platWsSessionsByPath(rootPath, roots);
          if (pin) { setDeskPin(pin); deskPinRef.current = pin; setDeskPinWhy("ok"); }
          else {
            setDeskPin("");
            deskPinRef.current = "";
            setDeskPinWhy("no-session");
            try { console.info("[card-desktop] 已绑定工作区，但该工作区还没有对话：点面板右上 ＋ 新建一个即可锚定"); } catch (e) { }
          }
          return pin;
        } catch (e) { return ""; }
      };
      /* ㊸ 快照就绪后再试一次：首次挂载时工作区/会话快照可能还没 ready，一次没锚上就再也不锚了。
         订阅两个快照，只要还没锚上就重试；锚上了（deskPinRef 有值）就彻底不动它。 */
      React.useEffect(() => {
        const flds = (folders || []).filter((f) => f && f.path);
        if (!flds.length || deskPinRef.current) return;
        const s = (props && props.sessionsService) || null;
        const subs = [];
        const poke = () => { if (deskPinRef.current) return; try { platWsFollow(flds); } catch (e) { } };
        try { if (workspacesService && workspacesService.list && typeof workspacesService.list.subscribe === "function") subs.push(workspacesService.list.subscribe(poke)); } catch (e) { }
        try { if (s && s.list && typeof s.list.subscribe === "function") subs.push(s.list.subscribe(poke)); } catch (e) { }
        return () => { for (const f of subs) { try { f(); } catch (e) { } } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [folders]);
      /* ㊸ 刷新页面恢复工作区后也要锚上（纯本地换锚点，不会动主界面）——
         否则「刷新一次锚点就没了」，右侧对话又变回跟随主界面。 */
      React.useEffect(() => {
        const flds = (folders || []).filter((f) => f && f.path);
        if (!flds.length) return;
        try { platWsFollow(flds); } catch (e) { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [folders]);
      /* 切换工作区：先存当前工作区的布局，再用目标工作区上次的布局替换代码区。
         目标工作区没有记录时**保留当前标签**（绝不因为"没记录"就关掉用户打开的文件）。 */
      const switchToWorkspace = async (nextFolders, label) => {
        const next = (Array.isArray(nextFolders) ? nextFolders : []).filter((f) => f && f.path);
        if (!next.length) return false;
        stashWsLayout(foldersRef.current);
        try { flushDirty(); } catch (e) { }
        const target = readWsLayouts()[wsKeyOf(next)];
        foldersRef.current = next;
        setFolders(next);
        pushLocalRecent(next);
        persistWorkspace(next);
        setHierMap({}); setExpandedFolders({}); setExpandedGroups({}); setHierExp({});
        next.forEach((f) => { ensureDir(f.path); });
        scanFoldersSequentially(next);
        const name = label || next.map((f) => f.name || basename(f.path)).join(" + ");
        if (target && Array.isArray(target.paths) && target.paths.length) {
          const n = await applyWsLayout(target);
          setFsStatus("已打开工作区：" + name + "（恢复 " + n + " 个文件）");
        } else {
          /* 目标工作区没有记录 → 代码区必须清空（用户明确要求：不能把上一个工作区的标签遗留过来，
             否则还得自己一个个关）。未保存改动已在上面 flushDirty() 里按路径存进热退出，
             切回原工作区时会带 dirty 标记一起恢复，所以清空不会丢内容。 */
          const dirtyN = (tabsRef.current || []).filter((t) => t && t.dirty).length;
          setTabs([]);
          setActivePath(null);
          setJumpLine(0);
          setRightPaths([]); setRightActivePath(null);
          setSubPaths([]); setSubActive(null);
          setFsStatus("已打开工作区：" + name + "（该工作区暂无记录，代码区已清空"
            + (dirtyN ? "；" + dirtyN + " 个未保存改动已存入热退出，切回原工作区会自动恢复" : "") + "）");
        }
        setFsStatusStyle({ color: C.green });
        /* ㊸ 对话侧锚定到代码工作区（纯本地换锚点，不动主界面）：不 await、不抛错，绝不影响代码区。
           刷新恢复工作区不走这里，所以不会平白改掉锚点。 */
        try { platWsFollow(next); } catch (e) { }
        return true;
      };
      // ⑥ 会话写盘：tabs/激活/右组变化时保存（restoredRef 门禁防止空标签覆盖旧会话）
      React.useEffect(() => { saveSession(); }, [tabs, activePath, rightPaths, rightActivePath, leftTab, subPaths, subActive, subDir, splitDir, splitRatio, subRatio, chatOpen, chatW, scmOpen, scmW]);
      /* ⑭ 热退出：把 dirty 标签的正文存一份（防抖 800ms → 连续敲键不会反复写 2MB）。
         保存成功（dirty 变 false）/关闭文件后，整体替换会把该条自动去掉，不会留陈旧副本。 */
      const flushDirty = React.useCallback(() => {
        if (!restoredRef.current) return;
        try {
          dirtyStore.replaceAll(buildDirtyPayload(), (tabs || []).map((t) => dirtyStore.keyOf(t.path)));   // 传打开列表：孤儿记录保留，已保存的自动消失
        } catch (e) { }
      }, [tabs, buildDirtyPayload]);
      const dirtyFlushRef = React.useRef(flushDirty);
      dirtyFlushRef.current = flushDirty;
      React.useEffect(() => {
        if (!restoredRef.current) return;
        const tm = setTimeout(() => { dirtyFlushRef.current(); }, 800);
        return () => clearTimeout(tm);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [tabs]);
      React.useEffect(() => {
        const onHide = () => {
          try {
            if (document.visibilityState === "hidden") { dirtyFlushRef.current(); flushSessionToHost({ dirtyTexts: buildDirtyPayload() }); }
          } catch (e) { }
        };
        document.addEventListener("visibilitychange", onHide);
        return () => {
          document.removeEventListener("visibilitychange", onHide);
          dirtyFlushRef.current();      // 退出工作台（卸载）时立刻落本地
          flushSessionToHost({ dirtyTexts: buildDirtyPayload() });   // 宿主那份也别等 600ms 防抖（跨入口就靠它），并带上未保存正文
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      /* ---- ⑬ Hierarchy 展开/折叠状态持久化（按工作区分别记）----
         存两部分：expandedGroups（Design Sources 等 4 组）+ hierExp（模块实例节点） */
      const hierExpKeyOf = (flds) => "dsh-card-desktop.hier-exp." + String((flds || []).map((f) => f.path).join("|"));
      const hierExpRef = React.useRef({});
      const hierGroupsRef = React.useRef({});
      const saveHierExp = () => {
        if (!restoredRef.current) return;
        try {
          localStorage.setItem(hierExpKeyOf(foldersRef.current),
            JSON.stringify({ groups: hierGroupsRef.current, nodes: hierExpRef.current }));
        } catch (e) { }
      };
      React.useEffect(() => { hierExpRef.current = hierExp; saveHierExp(); }, [hierExp]);
      React.useEffect(() => { hierGroupsRef.current = expandedGroups; saveHierExp(); }, [expandedGroups]);
      // 恢复：工作区载入后读取该工作区的折叠状态（见 load() 内调用）

      React.useEffect(() => {
        const local = (() => { try { const d = JSON.parse(localStorage.getItem(WS_KEY) || "null"); return d && Array.isArray(d.folders) ? d.folders : null; } catch (e) { return null; } })();
        const load = (flds) => {
          setFolders(flds);
          const exp = {};
          flds.forEach((f) => { exp[f.path] = true; });
          setExpandedFolders(exp);
          // 恢复该工作区的 Hierarchy 折叠状态（⑬：分组 + 模块节点）
          try {
            const k = hierExpKeyOf(flds);
            const saved = JSON.parse(localStorage.getItem(k) || "null");
            if (saved && typeof saved === "object") {
              if (saved.nodes && typeof saved.nodes === "object") { hierExpRef.current = saved.nodes; setHierExp(saved.nodes); }
              if (saved.groups && typeof saved.groups === "object") { hierGroupsRef.current = saved.groups; setExpandedGroups(saved.groups); }
            }
          } catch (e) { }
          // 恢复后自动加载各 folder 的根目录树（Explorer）并扫描工程（Hierarchy）
          const timer = setTimeout(() => {
            flds.forEach((f) => { ensureDir(f.path); });
            scanFoldersSequentially(flds);
          }, 300);
          return () => clearTimeout(timer);
        };
        /* 宿主是权威来源：localStorage 只是「宿主读不到时」的兜底。
           反过来（local 优先）会让宿主里的清单永远看不到，还会被旧 local 反手覆盖 ——
           实测：宿主里两个文件夹，刷新后工作区仍只有一个。 */
        const keyOfFlds = (f) => (Array.isArray(f) ? f : []).map((x) => String((x && x.path) || "").toLowerCase()).join("|");
        apiCall("workspaceLoad", {}).then((res) => {
          const hostFolders = (res && res.ok && Array.isArray(res.folders)) ? res.folders.filter((f) => f && f.path) : [];
          if (hostFolders.length) {
            /* 两边不一致时：以宿主为准，但把本地那份旧清单记进「最近」，
               用户点一下就能回去 —— 绝不静默丢弃任何一份清单。 */
            if (local && local.length && keyOfFlds(local) !== keyOfFlds(hostFolders)) pushLocalRecent(local);
            try { localStorage.setItem(WS_KEY, JSON.stringify({ folders: hostFolders })); } catch (e) { }
            load(hostFolders);
            /* 当前工作区登记到「最近」：不去登记的话，从没另存过工作区的用户
               在「打开最近工作区」里永远看不到自己的工程。 */
            try { apiCall("workspaceRecordFolders", { folders: hostFolders, label: hostFolders.map((f) => f.name || basename(f.path)).join(" + ") }); } catch (e) { }
            pushLocalRecent(hostFolders);
            return;
          }
          /* 宿主里没有清单：用 localStorage 兜底（首次使用、或宿主读失败），
             并把它推回宿主，避免两边长期不一致。 */
          if (local && local.length) {
            load(local);
            pushLocalRecent(local);
            try { apiCall("workspaceSave", { folders: local }); } catch (e) { }
            return;
          }
          /* 两边都空 = 用户上次关掉了工作区 → 什么都不做（尊重关闭）。 */
        });
      }, []);

      /* ---- 添加/移除文件夹（数据与持久化分离） ---- */
      const foldersRef = React.useRef(folders);
      React.useEffect(() => { foldersRef.current = folders; }, [folders]);
      // 当前活动标签的实时引用（供事件回调读取最新值，避免闭包过期）
      const activeTabRef = React.useRef(null);
      React.useEffect(() => {
        activeTabRef.current = (tabs || []).find((t) => t.path === activePath) || null;
      }, [tabs, activePath]);
      const addFolder = async (path, name) => {
        const p = (path || "").replace(/[\\/]$/, "");
        if (!p) return;
        if (foldersRef.current.some((f) => f.path === p)) {
          setFsStatus("该文件夹已在工作区");
          setFsStatusStyle({ color: C.warn });
          return;
        }
        const next = [...foldersRef.current, { name: name || basename(p), path: p }];
        foldersRef.current = next;
        setFolders(next);
        persistWorkspace(next);
        setExpandedFolders((prev) => ({ ...prev, [p]: true }));
        // 立即加载该文件夹的根目录树，避免「展开但永远加载中」
        await ensureDir(p);
        setFsStatus("已加入工作区: " + basename(p));
        setFsStatusStyle({ color: C.green });
        scanOne(p);
      };
      const removeFolder = async (path) => {
        const lowerP = path.toLowerCase();
        // 移除文件夹会连带关闭其下所有已打开文件 —— 先对未保存的文件做一次确认，
        // 否则直接丢弃改动（不弹窗、无法撤销）。
        const won = (tabsRef.current || []).filter((t) => t.dirty && t.path.toLowerCase().startsWith(lowerP + "\\"));
        if (won.length) {
          const names = won.slice(0, 5).map((t) => t.path.split(/[\\/]/).pop()).join("、");
          const more = won.length > 5 ? (" 等 " + won.length + " 个") : "";
          if (!await deskConfirm("该文件夹下有 " + won.length + " 个文件未保存：" + names + more + "\n移除文件夹会关闭它们并丢弃改动，确定继续？")) return;
        }
        const next = foldersRef.current.filter((f) => f.path !== path);
        foldersRef.current = next;
        setFolders(next);
        persistWorkspace(next);
        setHierMap((prev) => { const n = { ...prev }; delete n[path]; return n; });
        setExpandedFolders((prev) => { const n = { ...prev }; delete n[path]; return n; });
        // 关闭属于该文件夹的所有打开文件
        setTabs((prev) => prev.filter((t) => !t.path.toLowerCase().startsWith(lowerP + "\\")));
        setActivePath((p) => (p && p.toLowerCase().startsWith(lowerP + "\\")) ? null : p);
        // 清除右栏中该文件夹下的所有文件
        setRightPaths((rps) => rps.filter(rp => !rp.toLowerCase().startsWith(lowerP + "\\")));
        setRightActivePath((ra) => (ra && ra.toLowerCase().startsWith(lowerP + "\\")) ? null : ra);
        setSubPaths((ps) => ps.filter((p) => !p.toLowerCase().startsWith(lowerP + "\\")));
        setSubActive((a) => (a && a.toLowerCase().startsWith(lowerP + "\\")) ? null : a);
      };

      // 监听拆分容器尺寸变化，实时计算像素宽度（值相同不更新，避免无限循环）
      React.useEffect(() => {
        const el = splitContainerRef.current;
        if (!el) return;
        let lastSize = null;
        const updateSize = () => {
          const rect = el.getBoundingClientRect();
          const size = splitDir === "down" ? rect.height : rect.width;
          if (size !== lastSize) {
            lastSize = size;
            setSplitContainerSize(size);
          }
        };
        updateSize();
        const ro = new ResizeObserver(updateSize);
        ro.observe(el);
        return () => ro.disconnect();
      }, [splitDir, rightPaths.length]); // rightPaths.length 变化时重新测量（拆分开启/关闭）


      const listDir = async (path) => {
        const res = await apiCall("listDir", { path });
        if (!res || !res.ok) return [];
        return sortEntries(res.entries || []);
      };
      const loadPathInput = async () => {
        const p = (pathInput || "").trim();
        if (!p) { setFsStatus("请先输入路径"); setFsStatusStyle({ color: C.warn }); return; }
        setPathInput("");
        await addFolder(p, basename(p));
      };
      const pickWorkspace = async () => {
        // 同 pickFindDir：pickDirectory 属于 uiWorkspace，不是 workspaces 控制器
        const ws = (uiWorkspaceSvc && typeof uiWorkspaceSvc.pickDirectory === "function") ? uiWorkspaceSvc : workspacesService;
        if (!ws || typeof ws.pickDirectory !== "function") {
          setFsStatus("无目录选择服务，请用路径输入框");
          setFsStatusStyle({ color: C.warn });
          return;
        }
        setFsStatus("打开目录选择器…");
        setFsStatusStyle({ color: C.dim });
        try {
          const dir = await ws.pickDirectory();
          if (!dir) { setFsStatus("已取消选择"); setFsStatusStyle({ color: C.dim }); return; }
          await addFolder(dir, basename(dir));
        } catch (e) {
          setFsStatus("选择失败: " + fmtErr(e));
          setFsStatusStyle({ color: C.warn });
        }
      };

      /* ---- 扫描 ---- */
      const scannedRef = React.useRef({});
      /* 扫描结果缓存：同一工程在 TTL 内不再重复扫描。
         以前每次切换工作区都对每个文件夹重新 scanRtl（宿主要把该工程所有 RTL 读一遍，
         大工程能把磁盘与 CPU 打满 —— 用户报"切完特别卡、鼠标都卡"的直接来源）。 */
      const scanCacheRef = React.useRef({});
      const SCAN_TTL_MS = 5 * 60 * 1000;
      const scanOne = async (path, opts) => {
        const force = !!(opts && opts.force);
        const hit = scanCacheRef.current[path];
        if (!force && hit && (Date.now() - hit.at) < SCAN_TTL_MS) {
          setHierMap((prev) => (prev[path] === hit.res ? prev : ({ ...prev, [path]: hit.res })));
          return hit.res;
        }
        setHierLoading(true);
        setFsStatus("扫描 " + basename(path) + " …");
        setFsStatusStyle({ color: C.dim });
        let res = null;
        try { res = await apiCall("scanRtl", { path: path, allowLarge: !!(opts && opts.allowLarge) }); } catch (e) { res = null; }
        setHierLoading(false);
        if (!res || !res.ok) {
          setFsStatus("扫描失败(" + basename(path) + "): " + ((res && res.error) || "未知"));
          setFsStatusStyle({ color: C.warn });
          return null;
        }
        scanCacheRef.current[path] = { at: Date.now(), res };
        scannedRef.current[path] = true;
        setHierMap((prev) => ({ ...prev, [path]: res }));
        // 分组（Design Sources 等）默认【折叠】，不再自动展开全部 4 组
        if (res.noXprTruncated) {
          /* 目录里没有 Vivado 工程文件，只能逐个读 RTL：默认只解析前一段，避免把机器卡死 */
          setFsStatus("该目录没有 Vivado 工程文件：只扫描了 " + (res.fileCount || 0) + " / " + (res.noXprTotal || 0)
            + " 个 RTL 文件（全量很慢；文件菜单「全量扫描工作区工程（慢，慎用）」可强制）");
          setFsStatusStyle({ color: C.warn });
        } else {
          setFsStatus(res.xprFound
            ? ("已解析 " + basename(res.xprPath) + " · Top=" + res.topModule + " · " + res.moduleCount + " 模块")
            : ("已扫描 " + (res.fileCount || 0) + " 文件 · " + (res.moduleCount || 0) + " 模块"));
          setFsStatusStyle({ color: C.dim });
        }
        return res;
      };
      /* 工作区内的工程**串行**扫描：并行扫描会同时读几十上百个文件，把 host 和磁盘一起打满。
         已有新鲜缓存的不再重复扫描（force 才重扫）。 */
      const scanFoldersSequentially = async (flds, opts) => {
        for (const f of (Array.isArray(flds) ? flds : [])) {
          if (!f || !f.path) continue;
          try { await scanOne(f.path, opts); } catch (e) { /* 单个失败不影响其它工程 */ }
        }
      };
      const importVivado = async () => {
        const res = await apiCall("vivadoProjects", {});
        if (!res || !res.ok || !res.projects || !res.projects.length) {
          setFsStatus("未检测到运行中的 Vivado 工程");
          setFsStatusStyle({ color: C.warn });
          return;
        }
        const added = [];
        const existing = new Set(foldersRef.current.map((f) => f.path));
        for (const proj of res.projects) {
          const dir = proj.path.replace(/[\\/][^\\/]+$/, "");
          if (!existing.has(dir)) { added.push({ name: proj.name, path: dir }); existing.add(dir); }
        }
        if (!added.length) {
          setFsStatus("这些工程已在工作区");
          setFsStatusStyle({ color: C.dim });
          return;
        }
        const next = [...foldersRef.current, ...added];
        stashWsLayout(foldersRef.current);   // 先记下旧清单的布局（清单变了就是另一个工作区身份）
        foldersRef.current = next;
        setFolders(next);
        pushLocalRecent(next);
        persistWorkspace(next);
        setExpandedFolders((prev) => { const n = { ...prev }; added.forEach((a) => { n[a.path] = true; }); return n; });
        setFsStatus("已导入 " + added.length + " 个 Vivado 工程");
        setFsStatusStyle({ color: C.green });
        added.forEach((a) => { ensureDir(a.path); });
        scanFoldersSequentially(added);
      };

      /* ---- 文件树 ---- */
      const ensureDir = async (path) => {
        const node = tree[path];
        if (node && node.loaded) return;
        const entries = await listDir(path);
        const children = entries.map((e) => e.path);
        const nodeMap = {};
        entries.forEach((e) => {
          nodeMap[e.path] = { name: e.name, type: e.type, expanded: false, loaded: false, children: [] };
        });
        setTree((prev) => ({ ...prev, [path]: { name: basename(path) || path, type: "directory", expanded: true, loaded: true, children }, ...nodeMap }));
      };
      // 目录行点击：未加载 → 加载并展开；已加载 → 翻转（避免「点一下收起再展开才出内容」）
      const toggleDir = async (path) => {
        const node = tree[path];
        if (!node) return;
        if (!node.loaded) {
          await ensureDir(path);
          setTree((prev) => ({ ...prev, [path]: { ...prev[path], expanded: true } }));
        } else {
          setTree((prev) => ({ ...prev, [path]: { ...prev[path], expanded: !prev[path].expanded } }));
        }
      };
      const toggleFolderRoot = async (path) => {
        const rootNode = tree[path];
        const nowOpen = !!expandedFolders[path];
        if (!rootNode || !rootNode.loaded) {
          await ensureDir(path);
          setExpandedFolders((prev) => ({ ...prev, [path]: true }));
        } else {
          setExpandedFolders((prev) => ({ ...prev, [path]: !nowOpen }));
        }
      };

      /* ---- ⑭ 在左栏 Explorer 树中定位文件（VSCode「在资源管理器中显示」）----
         点标签时：自动展开父目录链，把该文件滚动/高亮到可视位置。 */
      const revealInTree = async (path) => {
        if (!path) return;
        // 定位所属工作区文件夹（最长前缀匹配）
        const fl = (foldersRef.current || []).slice().sort((a, b) => b.path.length - a.path.length)
          .find((f) => {
            const fp = (f.path || "").replace(/[\\/]+$/, "").toLowerCase();
            return path.toLowerCase() === fp || path.toLowerCase().startsWith(fp + "\\") || path.toLowerCase().startsWith(fp + "/");
          });
        if (!fl) return;
        const root = fl.path.replace(/[\\/]+$/, "");
        // 展开文件夹根
        setExpandedFolders((prev) => ({ ...prev, [root]: true }));
        // 计算从根到文件父目录的各级目录路径
        const rel = path.slice(root.length).replace(/^[\\/]+/, "");
        const parts = rel.split(/[\\/]/);
        const fileIdx = parts.length - 1; // 最后一段是文件名
        const dirParts = parts.slice(0, fileIdx); // 中间的目录段
        let cur = root;
        for (let i = 0; i < dirParts.length; i++) {
          cur = cur.replace(/[\\/]+$/, "") + "\\" + dirParts[i];
          // 逐级加载并展开
          const node = tree[cur];
          if (!node || !node.loaded) { await ensureDir(cur); }
          setTree((prev) => ({ ...prev, [cur]: { ...prev[cur], expanded: true } }));
        }
        // 切到 Explorer（若当前不在，也一并切过去，方便看到定位结果）
        setLeftTab("explorer");
      };

      /* ---- 打开/关闭/保存（VSCode 语义） ---- */
      const readFileContent = async (path) => {
        setFsBusy(true);
        const res = await apiCall("readFile", { path });
        setFsBusy(false);
        if (!res || !res.ok) {
          const friendly = res && res.code ? friendlyError(res.code) : null;
          // 安全边界：读失败绝不伪造可编辑内容。占位文本一旦进入标签页，
          // 一次 Ctrl+S 就会把原文件（二进制/超大文件）覆盖成这两行注释，
          // 且错误对象没有 mtimeMs/size，saveFile 的「外部修改」确认也会被跳过。
          // 返回空 text → openFile 走「只提示、不建标签」分支。
          return {
            ok: false,
            error: friendly || ((res && res.error) || "读取失败"),
            text: "",
            encoding: "utf8"
          };
        }
        // 契约校验：宿主返回 ok:true 但 content 不是字符串时（后端契约变更/异常响应），
        // openFile 会在 content.text.replace 处抛异常，表现为"点文件没反应"且无任何提示。
        if (typeof res.content !== "string") {
          return { ok: false, error: "读取结果异常（宿主未返回文本内容）", text: "", encoding: res.encoding || "utf8" };
        }
        /* writable / hasBom 必须带回去：宿主做过「按判断出的编码往返校验」，
           旧代码把这两个字段丢了 —— 后果是 saveFile 的「编码无法无损回写」确认永不触发
           （GB18030 四字节字符/latin1 兜底的文件会被直接覆盖），且带 BOM 的文件保存后丢掉 BOM。 */
        return {
          ok: true, text: res.content, encoding: res.encoding || "utf8",
          mtimeMs: res.mtimeMs || 0, size: res.size || 0,
          writable: res.writable !== false, hasBom: res.hasBom === true, forced: res.forced === true
        };
      };

      const openFile = async (path, fixed, jump, col) => {
        if (!path) return;
        setJumpLine(jump || 0);
        setJumpCol(col || 0);
        // 已打开：仅激活（同步路径，不重读）
        if (tabsRef.current.some((t) => t.path === path)) {
          if (fixed) setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, pinned: true } : t)));
          setActivePath(path);
          return;
        }
        // 读取去重：双击两个 click 共享一次读
        if (!pendingReadRef.current[path]) {
          pendingReadRef.current[path] = readFileContent(path).finally(() => { delete pendingReadRef.current[path]; });
        }
        let content;
        try {
          content = await pendingReadRef.current[path];
        } catch (e) {
          // 调用点是 onClick: () => openFile(...)（没有 catch），异常会变成未处理的
          // Promise 拒绝，表现为"点文件没反应"且状态栏毫无提示。
          setFsStatus("读取失败: " + path + "　" + fmtErr(e));
          setFsStatusStyle({ color: C.warn });
          return;
        }
        const rec = {
          path, pinned: !!fixed, dirty: false,
          encoding: content.encoding,
          // 显示层统一 \n（CRLF 归一），否则 textarea 归一化后选区索引逐行错位
          eol: /\r\n/.test(content.text) ? "crlf" : "lf",
          text: content.text.replace(/\r\n/g, "\n"),
          // 磁盘基线：保存前对比，外部（Vivado 等）改过文件时提示，避免覆盖外部改动
          diskMtime: content.mtimeMs || 0, diskSize: content.size || 0,
          // host 侧往返校验结果：false 表示按当前编码回写会有损（表外字符/编码不确定）
          writable: content.writable !== false,
          bom: content.hasBom === true,
          error: content.ok ? null : content.error
        };
        if (!content.ok && !content.text) {
          setFsStatus(content.error || "读取失败: " + path);
          setFsStatusStyle({ color: C.warn });
          return;
        }
        setTabs((prev) => {
          if (prev.some((t) => t.path === path)) {
            if (fixed) return prev.map((t) => (t.path === path ? { ...t, pinned: true } : t));
            return prev;
          }
          if (!fixed) {
            const pi = prev.findIndex((t) => !t.pinned && !t.dirty);
            if (pi >= 0) { const n = prev.slice(); n[pi] = rec; return n; }
          }
          return [...prev, rec];
        });
        setActivePath(path);
        if (!content.ok) {
          setFsStatus(content.error || "打开失败");
          setFsStatusStyle({ color: C.warn });
        }
      };

      /* ---- 拆分（第二编辑器组）：dir='right' 左右并排 / 'down' 上下堆叠 ---- */
      const splitTo = async (path, dir) => {
        if (!path) return;
        // 比例失衡保护：换方向/新建拆分时若上一方向把比例拖到极端，自动回到接近对半，
        // 避免 down 布局下第二组只剩几行高度（用户反馈“下面没显示完”）
        const clampRatioFor = (d) => {
          if (d === "down") setSplitRatio((r) => (r > 0.62 ? 0.55 : r));
          else setSplitRatio((r) => (r < 0.38 ? 0.45 : r));
        };
        // 若第二组已在显示该文件 → toggle 关闭该文件；不同方向 → 换方向
        if (rightPaths.includes(path)) {
          if (splitDir === dir) {
            // 从右栏移除该文件；若移除的正是右栏激活标签，必须重设，
            // 否则右栏会继续渲染一个已不在右组内的文件（标签条无激活项、同一文件两边都出现）
            const remain = rightPaths.filter((p) => p !== path);
            setRightPaths(remain);
            setRightActivePath((ra) => (ra === path ? (remain[0] || null) : ra));
            if (subPaths.includes(path)) {
              setSubPaths((ps) => ps.filter((p) => p !== path));
              setSubActive((a) => (a === path ? null : a));
            }
            return;
          }
          setSplitDir(dir);
          clampRatioFor(dir);
          setFsStatus("拆分方向已切换: " + (dir === "down" ? "上下堆叠" : "左右并排"));
          setFsStatusStyle({ color: C.dim });
          return;
        }
        const leftKeep = activePath && activePath !== path ? activePath : null;
        // 保证文件在 tabs 中
        if (!tabsRef.current.some((t) => t.path === path)) {
          await openFile(path, true);
        }
        // 追加到右栏（多标签支持）
        setRightPaths([...rightPaths, path]);
        setRightActivePath(path); // 新拆分的标签成为激活标签
        setSplitDir(dir);
        clampRatioFor(dir);
        // 左组切回拆分前的文件
        if (leftKeep) { setActivePath(leftKeep); setJumpLine(0); }
        setFsStatus("已拆分: " + basename(path) + " 添加到" + (dir === "right" ? "右侧" : "下方"));
        setFsStatusStyle({ color: C.dim });
      };
      const splitToRight = (path) => splitTo(path, "right");
      const splitToDown = (path) => splitTo(path, "down");
      // 拖动标签到右侧/下方 = 移动语义：从左侧 tabs 移除该标签，成为右栏（左边只剩未拖的标签）
      const dragToRight = async (path, dir) => {
        if (!path) return;
        const clampRatioFor = (d) => {
          if (d === "down") setSplitRatio((r) => (r > 0.62 ? 0.55 : r));
          else setSplitRatio((r) => (r < 0.38 ? 0.45 : r));
        };
        if (!rightPaths.includes(path)) {
          setRightPaths([...rightPaths, path]);
        }
        setRightActivePath(path);
        setSplitDir(dir);
        clampRatioFor(dir);
        // 移动语义：从左侧标签条移除 = 将该标签加入右栏即可（tabs 保留，左栏标签条会过滤掉右栏标签）
        // 左侧激活：若被拖走的是当前激活，切到左侧剩余的第一个
        setActivePath((cur) => {
          if (cur !== path) return cur;
          const leftTabs = tabs.filter((t) => t.path !== path && !rightPaths.includes(t.path));
          return leftTabs.length ? leftTabs[leftTabs.length - 1].path : null;
        });
        setFsStatus((dir === "down" ? "向下移动 → " : "向右移动 → ") + path.split(/[\\/]/).pop()); setFsStatusStyle({ color: C.dim });
      };
      const closeSplit = () => {
        setRightPaths([]);
        setSplitDir("right");
        // 必须一并清掉副组状态：残留的 subPaths 会让这些文件在左右两侧标签条上都被过滤掉
        // （既不能激活也不能关闭，标签凭空消失）
        setRightActivePath(null);
        setSubPaths([]);
        setSubActive(null);
      };
      // 右组 CodePane 面包屑点文件 → 替换当前右栏激活标签（保持拆分）
      const openIntoRight = async (p) => {
        if (!p) return;
        if (!tabsRef.current.some((t) => t.path === p)) await openFile(p, true);
        // 追加到右栏（如果不存在），并激活
        if (!rightPaths.includes(p)) {
          setRightPaths([...rightPaths, p]);
        }
        setRightActivePath(p);
      };
      // 左右互换：把当前左侧文件换到右栏，右栏激活文件变为左侧激活
      const swapSides = () => {
        if (!activePath || !rightActivePath) return;
        const r = rightActivePath;
        // 左侧文件追加到右栏并激活
        if (!rightPaths.includes(activePath)) {
          setRightPaths([...rightPaths, activePath]);
        }
        setRightActivePath(activePath);
        setActivePath(r);
      };

      const closeTab = async (path, force) => {
        if (!force) {
          const tt = tabs.find((x) => x.path === path);
          if (tt && tt.dirty && !await deskConfirm("文件未保存，仍要关闭？")) return;
        }
        // 联动副作用全部放在 setTabs 的 updater 之外：
        // updater 必须是纯函数（StrictMode 会双调用、并发下可能重放），
        // 之前把 setRightPaths/setActivePath 写在里面，会重复执行且读到过期闭包值。
        const prev = (tabsRef.current && tabsRef.current.length ? tabsRef.current : tabs) || [];
        const idx = prev.findIndex((t) => t.path === path);
        if (idx < 0) return;
        const next = prev.filter((t) => t.path !== path);
        if (rightPaths.includes(path)) {
          const newPaths = rightPaths.filter((p) => p !== path);
          setRightPaths(newPaths);
          if (path === rightActivePath) setRightActivePath(newPaths[0] || null);
        }
        // 副组同步移除，避免标签"留在副组名单里但 tab 已不存在"
        if (subPaths.includes(path)) {
          setSubPaths((ps) => ps.filter((p) => p !== path));
          setSubActive((a) => (a === path ? null : a));
        }
        if (activePath === path) setActivePath(next.length ? next[Math.min(idx, next.length - 1)].path : null);
        setJumpLine(0);
        setTabs(next);
      };
      const closeOthers = async (path) => {
        const victims = tabs.filter((t) => t.path !== path);
        if (victims.some((t) => t.dirty) && !await deskConfirm("有 " + victims.filter((t) => t.dirty).length + " 个文件未保存，仍关闭其他标签？")) return;
        setTabs((prev) => prev.filter((t) => t.path === path));
        setActivePath(path);
        setJumpLine(0);
        // 右栏只保留 path（如果右栏有它）
        setRightPaths((rps) => rps.includes(path) ? [path] : []);
        setRightActivePath((ra) => (ra === path) ? path : null);
        // 副组（二级拆分）状态同步收敛：残留的 subPaths 会让文件在两侧标签条上双双被过滤掉
        setSubPaths((sps) => sps.filter((sp) => sp === path));
        setSubActive((sa) => (sa === path) ? path : null);
      };
      const closeRight = async (path) => {
        const prev = (tabsRef.current && tabsRef.current.length ? tabsRef.current : tabs) || [];
        const idx = prev.findIndex((t) => t.path === path);
        if (idx < 0) return;
        const victims = prev.slice(idx + 1);
        if (!victims.length) return;
        if (victims.some((t) => t.dirty) && !await deskConfirm("有未保存文件在右侧标签中，仍关闭？")) return;
        // 副作用全部在 updater 之外（与 closeTab 同纪律：updater 必须纯函数）
        const victimPaths = victims.map((t) => t.path);
        const next = prev.slice(0, idx + 1);
        setRightPaths((rps) => rps.filter((rp) => !victimPaths.includes(rp)));
        setRightActivePath((ra) => (ra && victimPaths.includes(ra)) ? (rightPaths.filter((rp) => !victimPaths.includes(rp))[0] || null) : ra);
        // 副组状态同步收敛（与 closeSplit 同纪律），否则被关文件会从两侧标签条上消失且无法恢复
        setSubPaths((sps) => sps.filter((sp) => !victimPaths.includes(sp)));
        setSubActive((sa) => (sa && victimPaths.includes(sa)) ? (subPaths.filter((sp) => !victimPaths.includes(sp))[0] || null) : sa);
        if (!next.some((t) => t.path === activePathRef.current)) {
          setActivePath(path);
          setJumpLine(0);
        }
        setTabs(next);
      };
      const closeSaved = () => {
        const prev = (tabsRef.current && tabsRef.current.length ? tabsRef.current : tabs) || [];
        const next = prev.filter((t) => t.dirty);
        // 副作用全部在 updater 之外（与 closeTab 同纪律：updater 必须纯函数）
        const nextPaths = next.map((t) => t.path);
        if (!next.some((t) => t.path === activePathRef.current)) {
          setActivePath(next.length ? next[next.length - 1].path : null);
          setJumpLine(0);
        }
        setRightPaths((rps) => rps.filter((rp) => nextPaths.includes(rp)));
        // 右栏激活项以过滤后的 rightPaths 为准：nextPaths[0] 可能落在左侧脏标签上，
        // 会造成「右栏渲染一个标签条上不存在的文件、同一文件左右同时显示」
        setRightActivePath((ra) => {
          const remain = rightPaths.filter((rp) => nextPaths.includes(rp));
          return (ra && remain.includes(ra)) ? ra : (remain[0] || null);
        });
        // 副组状态同步收敛
        setSubPaths((sps) => sps.filter((sp) => nextPaths.includes(sp)));
        setSubActive((sa) => (sa && nextPaths.includes(sa)) ? sa : null);
        setTabs(next);
      };
      const closeAll = async () => {
        if (tabs.some((t) => t.dirty) && !await deskConfirm("有 " + tabs.filter((t) => t.dirty).length + " 个文件未保存，仍全部关闭？")) return;
        setTabs([]);
        setActivePath(null);
        setJumpLine(0);
        setRightPaths([]);
        setRightActivePath(null);
        // 副组状态必须一并清空（closeSplit 里有同样的纪律），否则这些文件在后续
        // 重新打开时会被 subPaths 过滤出标签条，且没有任何 UI 能恢复
        setSubPaths([]);
        setSubActive(null);
      };
      const saveFile = async (path) => {
        /* ★ 必须读 tabsRef：这个函数会被 document 级 Ctrl+S 监听调用，而那个监听的闭包
           停留在"注册那一刻"（依赖数组只有 activePath，打字不会让它重跑）。
           读渲染闭包的 tabs 会写出**打开文件时**的旧内容 —— 用户实测："加了汉字按 Ctrl+S，
           再自动检测/以 GBK 预览，汉字没了"。 */
        const t = tabsRef.current.find((x) => x.path === path);
        if (!t) return;
        // 双重保险：未成功读取的标签禁止写盘（与 readFileContent 的错误分支配套）
        if (t.error) {
          setFsStatus("该文件未能成功读取，已阻止保存：" + t.error);
          setFsStatusStyle({ color: C.warn });
          return;
        }
        /* ★ 预览态（点过「以 UTF-8 / 以 GBK 打开」）下，屏幕上的文本是按该编码强行解读的结果，
           不是文件的真实内容。此时保存 = 把乱码按该编码写回（二次编码，不可逆）——
           没有改动时更是纯粹的破坏：本来没有要保存的东西，却把文件改坏。
           宿主对「解不回去」的强制解码已标 writable=false，这就是「屏幕 ≠ 真实」的硬证据 → 一律不写盘。
           用户实测过：「加了汉字按 Ctrl+S，再自动检测/以 GBK 预览，汉字没了」。 */
        if (t.forceView && t.writable === false) {
          const fv = String(t.forceView).toUpperCase();
          setFsBusy(false);
          setFsStatus("已阻止保存：当前是「以 " + fv + " 预览」，屏幕上是按 " + fv + " 强行解读的文本（不是文件真实内容）；"
            + (t.dirty ? "你有未保存的修改 —— 请先用「编码」弹窗里的「自动检测」回到真实解读（会提示是否丢弃预览态下的修改），再改再存" : "而且文件也没有未保存的修改")
            + "。要把文件真正转成 " + fv + "，用「编码」弹窗里的「转为 " + fv + " 并保存」。");
          setFsStatusStyle({ color: C.warn });
          if (typeof deskToast === "function") deskToast("预览态不写盘：先「自动检测」回到真实解读，或用「转为 " + fv + " 并保存」", false);
          return;
        }
        setFsBusy(true);
        /* ★ 写盘前的所有需要用户点头的事，**合并成一次确认**：
           原生 confirm 会阻塞整个浏览器窗口（点不了、没光标、连主界面都输入不了 —— 用户实测的"卡死"）。
           以前这里最多会连弹 3 个（外部修改 / 编码有损 / 强制查看），现在合成一个。 */
        let outside = false;
        try {
          const st = await apiCall("stat", { path: t.path });
          outside = !!(st && st.ok && (st.mtimeMs !== t.diskMtime || st.size !== t.diskSize));
        } catch (e) { /* stat 失败不阻断保存 */ }
        const fffdN = (String(t.text).match(/\uFFFD/g) || []).length;
        const risky = (t.writable === false || t.forceView);
        if (outside || risky) {
          const why = [];
          if (outside) why.push("• 文件已被外部修改（时间戳或大小变化）");
          if (t.forceView) why.push("• 当前是以「" + String(t.forceView).toUpperCase() + "」强制查看的（未做无损校验），保存会把磁盘内容按该编码重写");
          else if (fffdN) why.push("• 含 " + fffdN + " 处无法解码的字节（显示为 �，原文已被别的工具毁掉），保存会把它们规范化成替换字符");
          else if (risky) why.push("• 编码可能无法无损回写（含表外字符或编码判断不确定）");
          const keepAll = await deskConfirm("保存前请确认：\n\n" + basename(path) + "\n\n" + why.join("\n")
            + "\n\n（建议先「另存为」留一份原文）仍要保存吗？");
          if (!keepAll) { setFsBusy(false); setFsStatus("已取消保存"); setFsStatusStyle({ color: C.warn }); return; }
        }
        // 写盘时还原原行尾（CRLF 文件保存后仍是 CRLF）与 UTF-8 BOM
        let res = await apiCall("writeFile", { path: t.path, content: eolEncode(t.text, t.eol), encoding: t.encoding, bom: t.bom === true });
        // host 的写白名单拦下「工作区外写入」时，问一次是否授权该目录，授权后重试本次保存
        if (res && !res.ok && res.code === "FS_OUTSIDE_WRITE_ROOT") {
          const dir = String(t.path).replace(/[\\/][^\\/]*$/, "");
          if (await deskConfirm("该目录不在可写范围内：\n" + dir + "\n\n是否允许写入该目录？（授权后该目录下的文件都能保存）")) {
            const allow = await apiCall("allowWriteRoot", { path: dir });
            if (allow && allow.ok) {
              res = await apiCall("writeFile", { path: t.path, content: eolEncode(t.text, t.eol), encoding: t.encoding, bom: t.bom === true });
            }
          }
        }
        setFsBusy(false);
        if (!res || !res.ok) {
          setFsStatus("保存失败: " + ((res && res.error) || "未知"));
          setFsStatusStyle({ color: C.warn });
          deskToast("保存失败: " + ((res && res.error) || "未知"), false);
          return;
        }
        setTabs((prev) => prev.map((x) => (x.path === path ? { ...x, dirty: false } : x)));
        setFsStatus("已保存 " + basename(path));
        setFsStatusStyle({ color: C.green });
        deskToast("已保存 " + basename(path), true);
        /* 首次把中文写进一个按 UTF-8 存的 Verilog 文件时提醒一次：
           Vivado 按 GBK 读会显示乱码。只提示一次、且**不自动改编码**（改不改由用户决定）。 */
        if (t.encHintAt == null && String(t.encoding || "utf8").toLowerCase() !== "gbk"
          && /\.(v|sv|vh|svh)$/i.test(String(t.path || "")) && /[^\x00-\x7F]/.test(String(t.text))) {
          setTabs((prev) => prev.map((x) => (x.path === path ? Object.assign({}, x, { encHintAt: Date.now() }) : x)));
          setFsStatus("已保存为 UTF-8（含中文）：Vivado 按 GBK 读会显示乱码 —— 用状态栏「编码 → 转为 GBK 并保存」即可");
          setFsStatusStyle({ color: C.warn });
          deskToast("该文件含中文但按 UTF-8 存；Vivado 需要 GBK，可用状态栏「编码」转换", false);
        }
        // 刷新磁盘基线，避免下次保存误报"外部修改"
        apiCall("stat", { path: t.path }).then((st) => {
          if (st && st.ok) setTabs((prev) => prev.map((x) => (x.path === path ? { ...x, diskMtime: st.mtimeMs || 0, diskSize: st.size || 0 } : x)));
        }).catch(() => { });
      };
      const saveAll = () => { tabsRef.current.filter((t) => t.dirty).forEach((t) => saveFile(t.path)); };
      // ⑦ 另存为…：优先弹系统“另存为”对话框（File System Access API，Chromium 安全上下文）；
      // 不可用或 GBK（浏览器无法按 GBK 编码写文件）时回退路径输入弹窗
      const saveAsWithDialog = async () => {
        if (!activeTab) return;
        const canPicker = typeof window !== "undefined" && typeof window.showSaveFilePicker === "function" && activeTab.encoding !== "gbk";
        if (canPicker) {
          try {
            const bn = basename(activeTab.path) || "untitled.txt";
            const h = await window.showSaveFilePicker({
              suggestedName: bn,
              types: [{ description: "文本文件", accept: { "text/plain": [".txt", ".v", ".sv", ".vh", ".xdc", ".tcl", ".md", ".json", ".csv", ".log"] } }]
            });
            const w = await h.createWritable();
            await w.write(new TextEncoder().encode(eolEncode(activeTab.text, activeTab.eol)));
            await w.close();
            setFsStatus("已另存到所选位置（UTF-8；当前仍编辑原文件 " + bn + "）");
            setFsStatusStyle({ color: C.green });
            return;
          } catch (err) {
            if (err && (err.name === "AbortError" || err.name === "SecurityError")) return; // 取消/权限受限 → 静默或回退
            // 其余错误 → 落到路径输入弹窗
          }
        }
        openPathDlg("saveAs");
      };
      const togglePin = (path) => {
        setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, pinned: !t.pinned } : t)));
      };
      const revealInExplorer = async (path) => {
        if (!path) { setFsStatus("没有可定位的当前文件"); setFsStatusStyle({ color: C.warn }); return; }
        setFsStatus("正在资源管理器中定位: " + basename(path) + " …");
        setFsStatusStyle({ color: C.dim });
        const res = await apiCall("revealPath", { path });
        if (!res || !res.ok) {
          setFsStatus("定位失败: " + ((res && res.error) || "未知"));
          setFsStatusStyle({ color: C.warn });
        } else {
          setFsStatus("已定位: " + path);
          setFsStatusStyle({ color: C.dim });
        }
      };
      const onTabChange = (path, v) => {
        setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, text: v, dirty: true, pinned: true } : t)));
      };
      const openContext = (e, path, kind) => {
        e.preventDefault();
        e.stopPropagation();
        setCtxMenu({ x: Math.min(e.clientX, window.innerWidth - 260), y: Math.min(e.clientY, window.innerHeight - 360), path, kind: kind || "file" });
      };
      const copyPath = (path) => { if (copyText(path)) { setFsStatus("已复制路径: " + path); setFsStatusStyle({ color: C.green }); } };
      const copyRelPath = (path) => {
        const rel = relPathOf(path, folders);
        const shown = rel || basename(path);
        if (copyText(shown)) { setFsStatus("已复制相对路径: " + shown); setFsStatusStyle({ color: C.green }); }
      };

      const menuItem = (label, fn, disabled, kbd) => React.createElement("div", {
        onClick: disabled ? null : () => { fn(); setCtxMenu(null); },
        style: { padding: "4px 12px", fontSize: 12, cursor: disabled ? "default" : "pointer", color: disabled ? "#858889" : "#e6e6e6", whiteSpace: "nowrap", display: "flex", justifyContent: "space-between", gap: 24, background: "transparent" },
        onMouseEnter: (e) => { if (!disabled) e.currentTarget.style.background = "#1E1F20"; },
        onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
      },
        React.createElement("span", null, label),
        kbd ? React.createElement("span", { style: { color: "#7a7a7a", fontSize: 11 } }, kbd) : null);

      const ctxMenuIsDir = ctxMenu && ctxMenu.kind === "dir";
      const ctxMenuEl = ctxMenu ? React.createElement(React.Fragment, null,
        React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 30 }, onClick: () => setCtxMenu(null), onContextMenu: (e) => { e.preventDefault(); setCtxMenu(null); } }),
        React.createElement("div", {
          style: { position: "fixed", left: ctxMenu.x, top: ctxMenu.y, zIndex: 31, background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,.4)", padding: "4px 0", minWidth: 240 }
        },
          ctxMenuIsDir
            ? React.createElement(React.Fragment, null,
              menuItem("复制路径", () => copyPath(ctxMenu.path), false, "Shift+Alt+C"),
              menuItem("复制相对路径", () => copyRelPath(ctxMenu.path), false, "Ctrl+K Ctrl+Shift+C"),
              menuItem("在文件资源管理器中显示", () => revealInExplorer(ctxMenu.path), false, "Shift+Alt+R"))
            : React.createElement(React.Fragment, null,
              menuItem("关闭", () => closeTab(ctxMenu.path), false, "Ctrl+W"),
              menuItem("关闭其他", () => closeOthers(ctxMenu.path)),
              menuItem("关闭右侧", () => closeRight(ctxMenu.path)),
              menuItem("关闭已保存", closeSaved, false, "Ctrl+K U"),
              menuItem("全部关闭", closeAll, false, "Ctrl+K W"),
              React.createElement("div", { style: { height: 1, background: "#3C3C3C", margin: "3px 0" } }),
              menuItem((tabs.find((t) => t.path === ctxMenu.path) || {}).pinned ? "取消固定（改为预览）" : "保持打开（固定标签）",
                () => togglePin(ctxMenu.path), false, "Ctrl+K Enter"),
              React.createElement("div", { style: { height: 1, background: "#3C3C3C", margin: "3px 0" } }),
              menuItem("复制路径", () => copyPath(ctxMenu.path), false, "Shift+Alt+C"),
              menuItem("复制相对路径", () => copyRelPath(ctxMenu.path), false, "Ctrl+K Ctrl+Shift+C"),
              menuItem("在文件资源管理器中显示", () => revealInExplorer(ctxMenu.path), false, "Shift+Alt+R"),
              React.createElement("div", { style: { height: 1, background: "#3C3C3C", margin: "3px 0" } }),
              /* Diff：VSCode 语义（选择基准 → 与已选比较），另保留「与当前文件比较」快捷方式 */
              menuItem(diffBase === ctxMenu.path ? "取消选择比较基准" : "选择以进行比较",
                () => {
                  const p = ctxMenu.path;
                  setCtxMenu(null);
                  if (diffBase === p) { setDiffBase(null); setFsStatus("已取消比较基准"); setFsStatusStyle({ color: C.dim }); }
                  else { setDiffBase(p); setFsStatus("已选择比较基准: " + basename(p) + "（右键另一个文件选「与已选文件比较」）"); setFsStatusStyle({ color: C.accent }); }
                }),
              (diffBase && diffBase !== ctxMenu.path)
                ? menuItem("与已选文件比较", () => openDiff(diffBase, ctxMenu.path))
                : null,
              menuItem("与当前文件比较", () => openDiff(activePath, ctxMenu.path), !activePath || activePath === ctxMenu.path),
              React.createElement("div", { style: { height: 1, background: "#3C3C3C", margin: "3px 0" } }),
              menuItem("向右拆分", () => splitToRight(ctxMenu.path), false, "Ctrl+\\"),
              menuItem("向下拆分", () => splitToDown(ctxMenu.path), false, "Ctrl+Shift+\\"),
              menuItem("全部保存", saveAll, !tabs.some((t) => t.dirty), "Ctrl+K S")))) : null;

      /* ---- ⑦ 顶部「文件」菜单动作（VSCode 语义；浏览器受限项如实降级为路径输入弹窗） ---- */
      /* 在弹窗里浏览目录：宿主 listDir 返回 {entries:[{name,type,path}]}，目录排在文件前。
         VSCode 的「打开文件」是系统对话框；浏览器里拿不到绝对路径（FSA 的 handle 不暴露路径），
         所以这里用「系统目录选择器 + 目录内文件列表」组合，效果等价且各环境一致。 */
      const loadPathDlgDir = async (dir) => {
        setPathDlgDir(dir || "");
        if (!dir) { setPathDlgEntries([]); return; }
        try {
          const r = await apiCall("listDir", { path: dir });
          const list = (r && r.ok && Array.isArray(r.entries)) ? r.entries.slice() : [];
          list.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : (a.type === "directory" ? -1 : 1)));
          setPathDlgEntries(list);
          try { localStorage.setItem("card-desk.last-dir", dir); } catch (e) { }
        } catch (e) { setPathDlgEntries([]); }
      };
      const browsePathDlg = async () => {
        const ws = (uiWorkspaceSvc && typeof uiWorkspaceSvc.pickDirectory === "function") ? uiWorkspaceSvc : workspacesService;
        if (!ws || typeof ws.pickDirectory !== "function") {
          setFsStatus("没有目录选择服务，请在列表或输入框里选"); setFsStatusStyle({ color: C.warn }); return;
        }
        try {
          const dir = await ws.pickDirectory();
          if (dir) await loadPathDlgDir(dir);
        } catch (e) { setFsStatus("选择目录失败: " + fmtErr(e)); setFsStatusStyle({ color: C.warn }); }
      };
      const pathDlgGoUp = () => {
        const d = pathDlgDir || "";
        const idx = Math.max(d.lastIndexOf("\\"), d.lastIndexOf("/"));
        if (idx > 0) loadPathDlgDir(d.slice(0, idx));
      };
      const pathDlgPickEntry = (en) => {
        if (!en) return;
        if (en.type === "directory") { loadPathDlgDir(en.path); return; }
        setPathDlgVal(en.path);
        const mode = pathDlg && pathDlg.mode;
        /* 新建模式点文件只是「填进输入框」，绝不能提交（提交会创建文件） */
        if (mode === "openFile" || mode === "wsOpen") void submitPathDlg(en.path);
      };
      const openPathDlg = (mode, presetVal) => {
        setFileMenuOpen(false);
        /* 默认目录：当前文件所在目录 → 上次用过的目录 → 工作区第一个文件夹 */
        let dir = "";
        if (activePath) {
          const idx = Math.max(activePath.lastIndexOf("\\"), activePath.lastIndexOf("/"));
          dir = idx > 0 ? activePath.slice(0, idx) : "";
        }
        if (!dir) { try { dir = localStorage.getItem("card-desk.last-dir") || ""; } catch (e) { } }
        if (!dir && foldersRef.current && foldersRef.current.length) dir = foldersRef.current[0].path;
        /* 另存类给一个合理默认文件名（VSCode 也会带默认名），省得从零打路径 */
        let val = "";
        if (mode === "wsSaveAs") {
          const base = (foldersRef.current && foldersRef.current[0] && foldersRef.current[0].name) || "workspace";
          val = (dir ? (dir + "\\") : "") + base + ".code-workspace";
        } else if (mode === "saveAs" && activeTab) {
          val = (dir ? (dir + "\\") : "") + basename(activeTab.path);
        }
        if (typeof presetVal === "string" && presetVal) val = presetVal;
        setPathDlgVal(val);
        setPathDlg({ mode });
        setPathDlgDir(dir);
        setPathDlgEntries([]);
        if (dir) loadPathDlgDir(dir);
      };
      // 新建文本文件：在当前打开文件所在目录建 untitled.v（自动递增），无需输入路径
      const newFileInDir = async () => {
        // 确定目标目录：当前打开文件的目录，否则第一个工作区文件夹
        let dir = "";
        if (activePath) {
          const idx = Math.max(activePath.lastIndexOf("\\"), activePath.lastIndexOf("/"));
          dir = idx > 0 ? activePath.slice(0, idx) : "";
        } else if (foldersRef.current && foldersRef.current.length) {
          dir = foldersRef.current[0].path;
        }
        if (!dir) { setFsStatus("请先打开一个文件或工作区，再新建"); setFsStatusStyle({ color: C.warn }); return; }
        // 生成不重名的默认文件名
        let name = "untitled.v";
        const exists = async (p) => { const r = await apiCall("stat", { path: p }); return r && r.ok; };
        let n = 1;
        while (await exists(dir + "\\" + name)) { name = "untitled" + n + ".v"; n++; }
        const full = dir + "\\" + name;
        let res = await apiCall("createFile", { path: full });
        res = await deskWriteRetry(res, full, () => apiCall("createFile", { path: full }));
        if (!res || !res.ok) { setFsStatus((res && res.error) || "新建失败"); setFsStatusStyle({ color: C.warn }); return; }
        await openFile(full, true);
        setFsStatus("已新建: " + name + "（" + dir + "）"); setFsStatusStyle({ color: C.green });
      };

      /* ================= FPGA 工具：格式化 ================= */
      /* 打开格式化预览（只针对「鼠标最后点的那个文件」=当前活动标签）。
         预览里一并给出「修复注释乱码（UTF-8 → GBK）」的可选项：Verilog 代码是 ASCII，
         转码影响的基本只有注释与字符串，与格式化同属"一批文本改动"，合并到同一次预览、
         同一次写盘最省事（不必为了转码再单独跑一遍菜单）。
         只有当前文件确实是 UTF-8 且含非 ASCII 时才生成该选项 —— GBK 文件与纯 ASCII
         文件完全看不到它，格式化行为一字不改。 */
      const openFmtPreview = () => {
        const t = activeTabRef.current;
        if (!t) { setFsStatus("请先打开一个文件，再格式化"); setFsStatusStyle({ color: C.warn }); return; }
        const fn = formatVerilog;
        if (typeof fn !== "function") { setFsStatus("格式化引擎不可用"); setFsStatusStyle({ color: C.warn }); return; }
        /* 编码信息随预览一起给出，三种形态（避免"什么都没看到"这种无法判断的状态）：
           ① encFix：当前是 UTF-8 且含非 ASCII → 勾选框（默认勾选）；
           ② encInfo：已是 GBK 且含非 ASCII → 只读信息行，说明 Vivado 能正确显示；
           ③ encWarn：当前是"强制查看"的视图 → 警告行（视图编码 ≠ 文件真实编码，别在这儿做判断）；
           纯 ASCII 文件三者都为 null（没有任何可告知的编码信息）。 */
        const stNA = countNonAscii(t.text);
        const curEnc = String(t.encoding || "utf8").toLowerCase();
        const encFix = (!t.forceView && curEnc !== "gbk" && stNA.chars) ? { target: "gbk", chars: stNA.chars, lines: stNA.lines } : null;
        const encInfo = (!t.forceView && curEnc === "gbk" && stNA.chars) ? { cur: "gbk", chars: stNA.chars, lines: stNA.lines } : null;
        const encWarn = t.forceView ? { cur: String(t.forceView).toUpperCase(), chars: stNA.chars, lines: stNA.lines } : null;
        setFmtEncFix(true);   // 每次打开预览都回到默认勾选
        let r;
        try { r = fn(t.text); } catch (e) { setFsStatus("格式化失败: " + fmtErr(e)); setFsStatusStyle({ color: C.warn }); return; }
        if (!r || r.totalChanges === 0) {
          setFsStatus(encFix ? "已是规范格式，仅需修复注释编码" : "已是规范格式，无需改动"); setFsStatusStyle({ color: C.green });
          setFmtPreview({ path: t.path, before: t.text, after: t.text, changedLines: [], eol: t.eol, encoding: t.encoding, bom: t.bom, noChange: true, encFix, encInfo, encWarn });
          return;
        }
        setFmtPreview({ path: t.path, before: t.text, after: r.formatted, changedLines: r.changedLines, eol: t.eol, encoding: t.encoding, bom: t.bom, noChange: false, encFix, encInfo, encWarn });
      };

      /* 写盘被宿主以 ENCODE_LOSSY 拒绝时的**纯函数**处理：把"GBK 表示不了"的字符替换成 ?。
         ★ 这里绝不弹原生对话框：原生 modal 会阻塞整个浏览器窗口（点不了、没光标、连主界面都输入不了，
         用户实测"卡死"就是这么来的）。替换的"同意"由调用方的那个确认框一次性拿到；
         且只在**全部是 U+FFFD** 时才替换（那种字符的替换已在确认框里说明过），
         其它表外字符（emoji 等）一律返回 null，交给用户去「编码」菜单里自己决定。 */
      const lossySanitize = (res, text) => {
        const list = Array.from(new Set(Array.from(String((res && res.unencodable) || ""))));
        if (!list.length) return null;
        if (!list.every((c) => c === "\uFFFD")) return null;
        let out = String(text);
        for (const ch of list) out = out.split(ch).join("?");
        return out;
      };

      /* 应用格式化结果（写回标签内容，标记为未保存；由用户 Ctrl+S 或自动保存落盘）。
         勾了「同时修复注释乱码」时：写盘改用目标编码（GBK）并去掉 BOM，写完回读校验，
         同时把标签编码一并改掉 —— 否则下一次 Ctrl+S 又按旧编码写回去，等于白转。
         没勾 / 本来不需要转码时，写入参数与改动前逐字相同（连 bom 字段都不传）。 */
      const applyFmtPreview = async (alsoSave) => {
        const pv = fmtPreview;
        if (!pv) return;
        /* ★ 强制预览态（且真编码对不上）下，pv 里的文本是**按该编码强行解读**的乱码 ——
           应用/保存就等于把它按该编码写回（二次编码，不可逆）。与「转为 X 并保存」「Ctrl+S」同一把闸门。 */
        if (activeTab && activeTab.forceView && activeTab.writable === false) {
          const fv = String(activeTab.forceView).toUpperCase();
          setFmtPreview(null);
          setFsStatus("已阻止应用：当前是「以 " + fv + " 预览」，格式化的是按 " + fv + " 强行解读的文本（不是文件真实内容）——先「自动检测」回到真实解读，再来格式化");
          setFsStatusStyle({ color: C.warn });
          if (typeof deskToast === "function") deskToast("预览态不写盘：先「自动检测」回到真实解读再格式化", false);
          return;
        }
        const enc = (pv.encFix && fmtEncFix) ? pv.encFix : null;
        const textChanged = !pv.noChange;
        const encChanged = !!enc && String(pv.encoding || "utf8").toLowerCase() !== enc.target;
        setFmtPreview(null);
        if (textChanged) {
          pushUndoUnit(pv.path, pv.before);   // 格式化同样要能 Ctrl+Z 撤回
        }
        if (textChanged || encChanged) {
          setTabs((ts) => ts.map((x) => (x.path === pv.path
            ? Object.assign({}, x, textChanged ? { text: pv.after } : null, encChanged ? { encoding: enc.target, bom: false, forceView: null } : null, { dirty: true })
            : x)));
        }
        if (!textChanged && !encChanged) {
          setFsStatus("没有需要应用的改动"); setFsStatusStyle({ color: C.dim });
          return;
        }
        const nLines = pv.changedLines ? pv.changedLines.length : 0;
        if (alsoSave) {
          const wargs = { path: pv.path, content: eolEncode(pv.after, pv.eol), encoding: enc ? enc.target : pv.encoding };
          if (enc) wargs.bom = false;
          let res = await apiCall("writeFile", wargs);
          let appliedText = pv.after;
          /* 勾了转码却被宿主拒绝（GBK 表外字符）时，问一次能否把这些字符替换成 ? 再写 */
          /* ★ 表外字符导致写盘被拒时**不弹原生对话框**（会阻塞整个窗口）。
             这条路径没有"用户已确认替换"的前提，所以只如实报告，让用户走
             「编码 → 转为 … 并保存」（那条路径有一次带说明的确认）。 */
          if (enc && res && !res.ok && res.code === "ENCODE_LOSSY") {
            deskToast("有 " + ((res && res.lost) || 0) + " 个字符 GBK 表示不了，未写盘；请用「编码 → 转为 GBK 并保存」处理", false);
          }
          if (res && res.ok) {
            setTabs((ts) => ts.map((x) => (x.path === pv.path
              ? Object.assign({}, x, { dirty: false }, appliedText !== pv.after ? { text: appliedText } : null)
              : x)));
            /* 刷新磁盘基线：不刷新的话，改完再按一次 Ctrl+S 会误报「文件已被外部修改」 */
            apiCall("stat", { path: pv.path }).then((st) => {
              if (st && st.ok) setTabs((prev) => prev.map((x) => (x.path === pv.path ? { ...x, diskMtime: st.mtimeMs || 0, diskSize: st.size || 0 } : x)));
            }).catch(() => { });
            let verify = "";
            if (enc) {
              try {
                const r2 = await apiCall("readFile", { path: pv.path });
                const enc2 = String((r2 && r2.encoding) || "").toLowerCase();
                verify = "　回读编码 " + (enc2 === enc.target
                  ? (enc.target === "gbk" ? "GBK ✓" : "UTF-8 ✓")
                  : ((enc2 ? enc2.toUpperCase() : "?") + "（与目标不一致，请检查）"));
              } catch (e) { }
            }
            setFsStatus((textChanged ? "已格式化并保存: " + nLines + " 行" : "已保存")
              + (encChanged ? "　编码已转为 GBK" : "")
              + (appliedText !== pv.after ? "　（已把 GBK 表示不了的字符替换为 ?，可搜索 ? 逐处补回）" : "")
              + verify);
            setFsStatusStyle({ color: C.green });
          } else {
            /* 写盘失败（GBK 表外字符会被宿主拒绝、磁盘内容原封不动）：
               把标签编码回退，避免编辑器状态与磁盘不一致；用户改掉那几个字符后可再次保存。 */
            if (encChanged) {
              setTabs((ts) => ts.map((x) => (x.path === pv.path
                ? Object.assign({}, x, { encoding: pv.encoding, bom: pv.bom === true, dirty: textChanged })
                : x)));
            }
            const msg = (res && res.error) || "未知错误";
            setFsStatus((textChanged ? "格式化已应用，但保存失败: " : "编码修复未生效: ") + msg);
            setFsStatusStyle({ color: C.warn });
            if (res && res.code === "ENCODE_LOSSY") deskToast(msg + "（文件没有被改动）", false);
          }
        } else {
          setFsStatus("已应用格式化（未保存）: " + nLines + " 行"
            + (encChanged ? "　※ 编码已标记为 GBK，Ctrl+S 保存后生效" : ""));
          setFsStatusStyle({ color: C.green });
        }
      };

      /* ================= FPGA 工具：端口一致性检查 ================= */
      // 解析一个 Verilog 文件里的模块定义：{ name: { ports:[{dir,name,range}] } }
      const parseModuleDefs = (text) => {
        const defs = {};
        if (!text) return defs;
        const src = String(text).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
        const modRe = /\bmodule\s+([A-Za-z_][A-Za-z0-9_$]*)\s*(?:#\s*\([\s\S]*?\)\s*)?\(([\s\S]*?)\)\s*;/g;
        let m;
        while ((m = modRe.exec(src)) !== null) {
          const name = m[1];
          // 端口表里的行尾注释含逗号/括号，切分前必须先剥离（否则端口名会被吞掉）
          const body = stripVerilogComments(m[2]);
          // body 在原文里的起始偏移：strip 是等长替换，所以偏移可直接回溯出行号
          const bodyStart = src.indexOf(m[2], m.index);
          const srcLineAt = (off) => src.slice(0, Math.max(0, Math.min(off, src.length))).split("\n").length;
          const ports = [];
          // 按逗号切分端口（避开位宽里的逗号）；同时记录每段的起始偏移
          let depth = 0, partStart = 0;
          const parts = [];
          for (let i = 0; i < body.length; i++) {
            const ch = body[i];
            if (ch === "[" || ch === "(") depth++;
            else if (ch === "]" || ch === ")") depth--;
            else if (ch === "," && depth === 0) { parts.push({ off: partStart, text: body.slice(partStart, i) }); partStart = i + 1; }
          }
          if (body.slice(partStart).trim()) parts.push({ off: partStart, text: body.slice(partStart) });
          for (const part of parts) {
            // 段起始往往落在前一段逗号后的空白/空行上，必须用"第一个非空白字符"定位，
            // 否则空行会让行号整体偏前（实测 DDC_Top 会差 1~2 行）。
            const lead = part.text.length - part.text.replace(/^\s+/, "").length;
            const s = part.text.trim();
            if (!s) continue;
            const line = (bodyStart >= 0) ? srcLineAt(bodyStart + part.off + lead) : 0;
            // 类型/修饰词必须整体吃掉（可多个、空格分隔）：`input wire signed [15:0] data` ——
            // 旧正则只认一个 reg|wire|logic，于是把 `signed` 当成端口名，真实端口全部丢失。
            const dm = /^(input|output|inout)\b\s*((?:(?:reg|wire|logic|signed|unsigned|var|bit|integer|real|realtime|time|byte|shortint|longint|struct|enum|packed)\s+)*)(\[[^\]]*\])?\s*([A-Za-z_][A-Za-z0-9_$]*)/.exec(s);
            if (dm) {
              ports.push({ dir: dm[1], kind: (dm[2] || "").trim(), range: dm[3] ? dm[3].replace(/\s+/g, "") : "", name: dm[4], line });
            } else {
              // ANSI 之外的写法（如 `input [7:0] a, b`）已在上面覆盖；这里兜底记录未识别项，便于统计
              const fb = /^([A-Za-z_][A-Za-z0-9_$]*)\s*(?:\[[^\]]*\])?\s*$/.exec(s);
              if (fb) ports.push({ dir: "", kind: "", range: "", name: fb[1], line });
            }
          }
          if (!defs[name]) defs[name] = { name, ports, file: "" };
        }
        return defs;
      };

      /* 解析一个文件里的模块例化：[{ module, inst, conns:[{port,expr}], line }]
         要点（旧实现两条都错，导致端口检查恒为空 → 虚假"通过"）：
         ① 支持 #(参数) 跨行：工程里普遍是"类型 #( / 参数 / ) / 实例名 (" 三行式；
         ② 括号收集必须真正配平：旧的循环把 '(' 丢弃、')' 却写进 body，
            深度计数变负 → 逗号永不切分 → .port(expr) 正则永不匹配 → 永远 0 结果。 */
      const parseInstances = (text) => {
        const out = [];
        if (!text) return out;
        const lines = String(text).split(/\r?\n/);
        const instRe = /^([A-Za-z_][A-Za-z0-9_$]*)\s*(?:#\s*\([\s\S]*?\)\s*)?([A-Za-z_][A-Za-z0-9_$]*)\s*\(/;
        for (let i = 0; i < lines.length; i++) {
          const head = lines[i].replace(/\/\/.*$/, "").replace(/^\s+/, "");
          if (!head) continue;
          const c0 = head.charAt(0);
          // 注释/宏/系统任务/端口连接/预处理/延时/续行括号 都不是例化起始行
          if (c0 === "." || c0 === "`" || c0 === "$" || c0 === "/" || c0 === "#" || c0 === "*" || c0 === "(" || c0 === ")") continue;
          // 赋值语句排除：只看第一个 '(' 之前的 '='，避免误杀 .a(a == b) 这类连接表达式。
          // 注意不能用 ';' 排除 —— 单行完整例化 `leaf u0 (.a(x));` 本身就带分号。
          const pIdx = head.indexOf("(");
          const eqIdx = head.indexOf("=");
          if (eqIdx >= 0 && (pIdx < 0 || eqIdx < pIdx)) continue;
          const tnm = /^([A-Za-z_][A-Za-z0-9_$]*)/.exec(head);
          if (!tnm) continue;
          if (KW_SV[tnm[1]]) continue;                       // 行首为关键字：module/always/if/wire/reg…
          const frag = (head + "\n" + lines.slice(i + 1, i + 200).join("\n")).slice(0, 8000);
          const mm = instRe.exec(frag);
          if (!mm) continue;
          const modName = mm[1], instName = mm[2];
          if (modName !== tnm[1] || KW_SV[modName] || modName === instName) continue;
          // mm[0] 的最后一个字符就是实例名后的 '(' —— 从它开始配平扫描，只丢弃最外层这一对括号
          let pos = mm[0].length - 1, depth = 0, body = "";
          for (; pos < frag.length; pos++) {
            const ch = frag[pos];
            if (ch === "(") { depth++; if (depth === 1) continue; }
            else if (ch === ")") { depth--; if (depth === 0) break; }
            if (depth >= 1) body += ch;
          }
          // 连接列表里的行尾注释同样含逗号/括号 —— 切分前先剥离，否则后面的 .port 会被吞掉
          const bodyClean = stripVerilogComments(body);
          // 按顶层逗号切分连接
          let d2 = 0, buf = "", parts = [];
          for (const ch of bodyClean) {
            if (ch === "[" || ch === "(" || ch === "{") d2++;
            else if (ch === "]" || ch === ")" || ch === "}") d2--;
            if (ch === "," && d2 === 0) { parts.push(buf); buf = ""; }
            else buf += ch;
          }
          if (buf.trim()) parts.push(buf);
          const conns = [];
          for (const p of parts) {
            const s = p.replace(/\/\/.*$/, "").trim();
            if (!s) continue;
            // 贪婪匹配到最后一个 ')'：嵌套调用 .a(f(x)) 才能取到完整表达式
            const nm = /^\.([A-Za-z_][A-Za-z0-9_$]*)\s*\(([\s\S]*)\)$/.exec(s);
            if (nm) conns.push({ port: nm[1], expr: nm[2].trim() });
          }
          out.push({ module: modName, inst: instName, conns, line: i + 1 });
        }
        return out;
      };

      /* 端口一致性检查。
         scope = "project"（默认）扫工作区全部 RTL；"file" 只查当前打开的文件。
         注意：即使只查当前文件，模块定义表也必须来自整个工程 ——
         当前文件例化的子模块，定义通常在别的文件里，只按当前文件建表会导致全部"未知模块"。 */
      const runPortCheck = async (scope) => {
        if (checkBusyRef.current) { setFsStatus("检查已在进行中，请稍候…"); setFsStatusStyle({ color: C.warn }); return; }
        checkBusyRef.current = true;
        const onlyFile = (scope === "file");
        setCheckBusy(true);
        setFsStatus(onlyFile ? "正在检查当前文件…" : "正在扫描工程 RTL…"); setFsStatusStyle({ color: C.accent });
        try {
          const items = [];
          const roots = (foldersRef.current || []).map((f) => f.path).filter(Boolean);
          if (!roots.length) { setFsStatus("请先打开一个工作区文件夹"); setFsStatusStyle({ color: C.warn }); setCheckBusy(false); return; }
          if (onlyFile && !activePath) { setFsStatus("没有打开的文件，无法做单文件检查"); setFsStatusStyle({ color: C.warn }); setCheckBusy(false); return; }
          if (onlyFile && !/\.(v|sv|vh|svh)$/i.test(String(activePath))) { setFsStatus("当前文件不是 RTL 文件（.v/.sv/.vh/.svh），无法做端口检查"); setFsStatusStyle({ color: C.warn }); setCheckBusy(false); return; }
          // 收集所有 RTL 文件（限制数量，避免卡死）
          const allFiles = [];
          for (const root of roots) {
            const r = await apiCall("listTree", { path: root });
            const list = (r && r.ok && Array.isArray(r.files)) ? r.files : [];
            for (const p of list) {
              if (/\.(v|sv|vh|svh)$/i.test(p) && !/_sim_netlist|\.gen\\|ip_user_files/i.test(p)) allFiles.push(p);
              if (allFiles.length > 600) break;
            }
            if (allFiles.length > 600) break;
          }
          // 单文件模式：只对当前文件比例化（定义表仍读全工程）
          const checkFiles = onlyFile ? allFiles.filter((p) => p === activePath) : allFiles;
          if (onlyFile && !checkFiles.length) {
            setFsStatus("当前文件不在工程 RTL 列表中（可能未加入工作区，或位于被跳过的目录）");
            setFsStatusStyle({ color: C.warn }); setCheckBusy(false); return;
          }
          // 读取并建立模块定义表
          const defs = {};
          const fileText = {};
          for (const p of allFiles) {
            const r = await apiCall("readFile", { path: p });
            if (!r || !r.ok) continue;
            fileText[p] = r.content;
            const d = parseModuleDefs(r.content);
            for (const k of Object.keys(d)) if (!defs[k]) { d[k].file = p.split("\\").pop(); d[k].path = p; defs[k] = d[k]; }
          }
          // 逐文件比例化
          let instTotal = 0, instChecked = 0, skipPos = 0, skipNoPorts = 0, skipUnknown = 0;
          for (const p of checkFiles) {
            const insts = parseInstances(fileText[p] || "");
            instTotal += insts.length;
            const short = p.split("\\").pop();
            for (const ins of insts) {
              const def = defs[ins.module];
              if (!def) { skipUnknown++; continue; }   // 非本工程模块（IP/Vivado 库），跳过
              // 端口表解析不全（非 ANSI / Verilog-1995 端口表）时不宜判定，否则会成片误报
              if (!def.ports.length) { skipNoPorts++; continue; }
              // 按位置连接（无 .port(...)）无法做名字比对
              if (!ins.conns.length) { skipPos++; continue; }
              instChecked++;
              const defMap = {};
              def.ports.forEach((x) => { defMap[x.name] = x; });
              const used = {};
              for (const c of ins.conns) {
                used[c.port] = true;
                const dp = defMap[c.port];
                if (!dp) {
                  items.push({ level: "error", file: short, line: ins.line, msg: "端口名不存在于模块 " + ins.module + "：「." + c.port + "」" });
                }
              }
              /* 未连接端口：每个端口一条（不合并）—— 逐条更清爽，且每条都能点击：
                 点行 = 跳到实例位置（该补连接项的地方）；点行尾「→ 定义 文件:行」= 跳到该端口的定义处。
                 文案说明「端口名取自模块定义」：例化里没写连接项时本文件里搜不到这个名字，
                 不点明的话用户会以为工具在报一个不存在的信号。 */
              for (const dp of def.ports) {
                if (used[dp.name]) continue;
                const isInput = (dp.dir === "input" || dp.dir === "inout");
                const defAt = def.file ? ("，" + def.file + (dp.line ? ":" + dp.line : "")) : "";
                items.push({
                  level: isInput ? "warn" : "info",
                  file: short, line: ins.line, filePath: p,
                  defFile: def.file || "", defLine: dp.line || 0, defPath: def.path || "",
                  msg: (isInput ? "输入端口「" : "输出端口「") + dp.name + "」未连接（实例 " + ins.inst + "，模块 " + ins.module + defAt + "）"
                });
              }
            }
          }
          const errs = items.filter((x) => x.level === "error").length;
          const warns = items.filter((x) => x.level === "warn").length;
          const infos = items.filter((x) => x.level === "info").length;
          const skipped = skipPos + skipNoPorts + skipUnknown;
          setCheckPanel({
            title: "端口一致性检查" + (onlyFile ? "（当前文件）" : "（整个工程）"),
            summary: (onlyFile ? "当前文件 " + (activePath ? activePath.split(/[\\/]/).pop() : "") + "：" : "扫描 " + allFiles.length + " 个 RTL 文件：")
              + "识别 " + instTotal + " 个例化（比对 " + instChecked + " 个），"
              + errs + " 个错误 / " + warns + " 个提示 / " + infos + " 个信息"
              + (skipped ? "；已跳过 " + skipped + " 个（位置连接 " + skipPos + " / 端口表不全 " + skipNoPorts + " / 非本工程模块 " + skipUnknown + "）" : "")
              + (onlyFile ? "　※ 模块定义表取自整个工程" : ""),
            items
          });
          if (!instTotal) {
            setFsStatus("端口检查完成：未识别到任何例化，结论不可信，请检查工程目录是否选对");
            setFsStatusStyle({ color: C.warn });
          } else {
            setFsStatus("端口检查完成：" + errs + " 个错误 / " + warns + " 个提示");
            setFsStatusStyle({ color: (errs || warns) ? C.warn : C.green });
          }
        } catch (e) {
          setFsStatus("端口检查失败: " + fmtErr(e)); setFsStatusStyle({ color: C.warn });
        } finally { setCheckBusy(false); checkBusyRef.current = false; }
      };

      /* 整个工程的 Verilog 静态检查（批次 C）。
         以前「整个工程」只扫【已打开的文件】，看起来像全工程检查其实严重漏检；
         这里复用端口检查的目录遍历（listTree 递归）与同一个结果窗口，
         于是统计行、只看 全部/错误/提示/信息 的筛选、点击跳转全部与端口检查一致。 */
      const runLintCheck = async (scope) => {
        if (checkBusyRef.current) { setFsStatus("检查已在进行中，请稍候…"); setFsStatusStyle({ color: C.warn }); return; }
        checkBusyRef.current = true;
        const onlyFile = (scope === "file");
        setCheckBusy(true);
        setFsStatus(onlyFile ? "正在检查当前文件…" : "正在递归扫描工程 RTL 并逐文件静态检查…");
        setFsStatusStyle({ color: C.accent });
        try {
          const items = [];
          const byRule = Object.create(null);
          const roots = (foldersRef.current || []).map((f) => f.path).filter(Boolean);
          if (!roots.length) { setFsStatus("请先打开一个工作区文件夹"); setFsStatusStyle({ color: C.warn }); return; }
          if (onlyFile && !activePath) { setFsStatus("没有打开的文件，无法做单文件检查"); setFsStatusStyle({ color: C.warn }); return; }
          const allFiles = [];
          for (const root of roots) {
            const r = await apiCall("listTree", { path: root });
            const list = (r && r.ok && Array.isArray(r.files)) ? r.files : [];
            for (const p of list) {
              if (/\.(v|sv|vh|svh)$/i.test(p) && !/_sim_netlist|\.gen\\|ip_user_files/i.test(p)) allFiles.push(p);
            }
          }
          const files = onlyFile ? allFiles.filter((p) => p === activePath) : allFiles;
          if (onlyFile && !files.length) {
            setFsStatus("当前文件不在工程 RTL 列表中（可能未加入工作区，或位于被跳过的目录）");
            setFsStatusStyle({ color: C.warn }); return;
          }
          if (!files.length) {
            setCheckPanel({ title: "Verilog 静态检查", summary: "工程目录里没有找到 .v / .sv / .vh / .svh 文件", items: [{ level: "warn", file: "-", line: 0, msg: "请确认左侧已打开正确的工程文件夹" }] });
            setFsStatus("未找到 RTL 文件"); setFsStatusStyle({ color: C.warn }); return;
          }
          let scanned = 0, skippedRead = 0;
          for (let i = 0; i < files.length; i++) {
            const p = files[i];
            const r = await apiCall("readFile", { path: p });
            if (!r || !r.ok) { skippedRead++; continue; }
            scanned++;
            let list = [];
            try { list = lintVerilog(r.content); } catch (e) { list = []; }
            if (!lintStyleRef.current) list = list.filter((it) => !LINT_STYLE_RULES[it.rule]);
            const short = p.split(/[\\/]/).pop();
            for (const it of list) {
              byRule[it.rule] = (byRule[it.rule] || 0) + 1;
              items.push({
                level: it.sev === "error" ? "error" : (it.sev === "warn" ? "warn" : "info"),
                file: short, line: it.line, filePath: p,
                msg: "[" + it.rule + "] " + it.msg
              });
            }
            if (i % 15 === 14) await new Promise((res) => setTimeout(res, 0));   // 让出主线程
          }
          const errs = items.filter((x) => x.level === "error").length;
          const warns = items.filter((x) => x.level === "warn").length;
          const infos = items.filter((x) => x.level === "info").length;
          const topN = Object.keys(byRule).sort((a, b) => byRule[b] - byRule[a]).slice(0, 6).map((k) => k + " " + byRule[k]).join(" / ");
          /* 排序：错误 → 提示 → 信息（同级别按文件+行）。
             大工程一次能出 1500+ 条，不排序时 info 会把真问题淹掉（实测 98 个文件 1485 条 info）。 */
          const lvRank = { error: 0, warn: 1, info: 2 };
          items.sort((x, y) => (lvRank[x.level] - lvRank[y.level]) || (String(x.file) < String(y.file) ? -1 : (String(x.file) > String(y.file) ? 1 : (x.line - y.line))));
          setCheckPanel({
            title: "Verilog 静态检查" + (onlyFile ? "（当前文件）" : "（整个工程）"),
            summary: (onlyFile ? "当前文件 " + (activePath ? activePath.split(/[\\/]/).pop() : "") + "：" : "递归扫描 " + scanned + " 个 RTL 文件：")
              + errs + " 个错误 / " + warns + " 个提示 / " + infos + " 个信息"
              + (skippedRead ? "；" + skippedRead + " 个文件读取失败" : "")
              + (lintStyleRef.current ? "" : "；风格提示（timescale / default_nettype / 行宽）已隐藏，可在 FPGA 菜单里打开")
              + (topN ? "　（" + topN + "）" : ""),
            items
          });
          setFsStatus("静态检查完成：" + errs + " 个错误 / " + warns + " 个提示 / " + infos + " 个信息");
          setFsStatusStyle({ color: errs ? C.warn : (warns ? C.accent : C.green) });
        } catch (e) {
          setFsStatus("静态检查失败: " + fmtErr(e)); setFsStatusStyle({ color: C.warn });
        } finally { setCheckBusy(false); checkBusyRef.current = false; }
      };

      /* 一键插入 `default_nettype none / wire（用户要求）。
         位置：`none 插在开头（若有 `timescale 则紧随其后），`wire 追加到文件末尾；
         走的是和手动输入同一条通道（onTabChange → 标脏 + 置顶），所以能在编辑器里 Ctrl+Z 撤销，且不会自动写盘。
         已有 `default_nettype none 时只补缺的那一行，避免重复插入。 */
      const insertNettypeGuard = () => {
        try {
          if (!activeTab) { setFsStatus("请先打开一个 Verilog 文件"); setFsStatusStyle({ color: C.warn }); return; }
          /* 换行符在函数内自备：不要引用外部常量（曾经引用了并不存在的 NL，异常被 catch 吞掉 = 点了没反应） */
          const LF = String.fromCharCode(10);
          const text0 = activeTab.text || "";
          /* 注意：activeTab.eol 是标签（"crlf" / "lf"），不是换行符！
             它只在保存时给 eolEncode 用来决定是否把 \n 还原成 \r\n。
             缓冲区内部一律 LF（打开文件时就 raw.replace(/\r\n/g, "\n") 归一过），
             所以这里 join 必须用 NL —— 曾经写成 join(activeTab.eol || NL)，
             结果 join("lf") 把整个文件粘成了一行。 */
          const hasNone = /^[ \t]*`default_nettype[ \t]+none\b/m.test(text0);
          const hasWire = /^[ \t]*`default_nettype[ \t]+wire\b/m.test(text0);
          if (hasNone && hasWire) { setFsStatus("该文件已经有 `default_nettype none / wire，未重复插入"); setFsStatusStyle({ color: C.green }); return; }
          const lines = text0.split(/\r?\n/);
          const out = lines.slice();
          if (!hasNone) {
            let top = 0;
            for (let i = 0; i < Math.min(out.length, 3); i++) if (/^[ \t]*`timescale\b/.test(out[i])) top = i + 1;
            out.splice(top, 0, "`default_nettype none");
          }
          if (!hasWire) {
            while (out.length && !out[out.length - 1].trim()) out.pop();   // 去掉尾部空行再追加，避免指令被空行隔开
            out.push("`default_nettype wire");
            out.push("");   // 文件以换行结尾
          }
          onTabChange(activeTab.path, out.join(LF));
          pushUndoUnit(activeTab.path, text0);   // 让这一步能 Ctrl+Z 撤回（外部编辑不会自动进编辑器的撤销栈）
          setFsStatus("已插入 " + (hasNone ? "" : "`default_nettype none") + (hasNone ? "`default_nettype wire" : " / `default_nettype wire") + "（记得 Ctrl+S 保存）");
          setFsStatusStyle({ color: C.green });
        } catch (e) { setFsStatus("插入失败: " + fmtErr(e)); setFsStatusStyle({ color: C.warn }); }
      };

      /* ================= FPGA 工具：XDC 约束检查 ================= */
      const runXdcCheck = async () => {
        if (checkBusyRef.current) { setFsStatus("检查已在进行中，请稍候…"); setFsStatusStyle({ color: C.warn }); return; }
        checkBusyRef.current = true;
        setCheckBusy(true);
        setFsStatus("正在检查 XDC 约束…"); setFsStatusStyle({ color: C.accent });
        try {
          const items = [];
          const roots = (foldersRef.current || []).map((f) => f.path).filter(Boolean);
          if (!roots.length) { setFsStatus("请先打开一个工作区文件夹"); setFsStatusStyle({ color: C.warn }); setCheckBusy(false); return; }
          const xdcs = [];
          for (const root of roots) {
            const r = await apiCall("listTree", { path: root });
            const list = (r && r.ok && Array.isArray(r.files)) ? r.files : [];
            for (const p of list) if (/\.xdc$/i.test(p)) xdcs.push(p);
          }
          if (!xdcs.length) {
            setCheckPanel({ title: "XDC 约束检查", summary: "未找到任何 .xdc 文件", items: [{ level: "warn", file: "-", line: 0, msg: "当前工作区没有 .xdc 约束文件" }] });
            setFsStatus("未找到 .xdc 文件"); setFsStatusStyle({ color: C.warn }); setCheckBusy(false); return;
          }
          /* 逻辑行拼接：Xilinx 约束经常用行尾 `\` 续行写，
             逐行正则会把多行 set_clock_groups / set_false_path / create_clock 误判为"缺参数"。 */
          const joinCont = (lines) => {
            const out = [];
            let buf = null;
            for (let i = 0; i < lines.length; i++) {
              const noComment = String(lines[i]).replace(/#.*$/, "");
              const cont = /\\\s*$/.test(noComment);
              const body = noComment.replace(/\\\s*$/, "");
              if (buf === null) buf = { text: body, line: i + 1 };
              else buf.text += " " + body;
              if (!cont) { out.push(buf); buf = null; }
            }
            if (buf) out.push(buf);
            return out;
          };
          /* 从 `[get_ports ...]` 抽端口名：必须逐字符配对 {} 与 []，
             旧正则用 [^\]\}]+ 会在总线位选 MGTY130_RXP[0] 的第一个 ] 处截断，产出脏 token。 */
          const extractGetPorts = (seg) => {
            const outPorts = [];
            let i = 0;
            while ((i = seg.indexOf("[get_ports", i)) >= 0) {
              let j = i + "[get_ports".length, depthBrace = 0, depthBrack = 0, buf = "";
              for (; j < seg.length; j++) {
                const ch = seg[j];
                if (ch === "{") { depthBrace++; continue; }
                if (ch === "}") { depthBrace--; continue; }
                // 端口名自带的总线位选 [15:0] / [0] 要保留，不能把它的 ']' 当成 get_ports 的结束
                if (ch === "[") { depthBrack++; buf += ch; continue; }
                if (ch === "]") {
                  if (depthBrack > 0) { depthBrack--; buf += ch; continue; }
                  if (depthBrace <= 0) break;
                  buf += ch; continue;
                }
                buf += ch;
              }
              for (const tok of buf.split(/\s+/)) { const s2 = tok.trim(); if (s2) outPorts.push(s2); }
              i = j + 1;
            }
            return outPorts;
          };
          const clockCreates = [];   // create_clock
          const genClocks = [];      // create_generated_clock（不能用 -period 规则衡量）
          const pinPorts = new Set();
          const iostdPorts = new Set();
          const iostdFileOf = new Map();   // 端口 → 定义它的 xdc 绝对路径（供结果行点击跳转）
          for (const p of xdcs) {
            const r = await apiCall("readFile", { path: p });
            if (!r || !r.ok) continue;
            const short = p.split("\\").pop();
            const txt = String(r.content);
            // ① 端口属性：set_property <ATTR> <值> [get_ports ...]（分几行写也要能认全）
            const spRe = /set_property\s+(PACKAGE_PIN|IOSTANDARD)\b/g;
            let sm;
            while ((sm = spRe.exec(txt)) !== null) {
              const seg = txt.slice(sm.index, Math.min(txt.length, sm.index + 800));
              const names = extractGetPorts(seg);
              const target = sm[1] === "PACKAGE_PIN" ? pinPorts : iostdPorts;
              for (const nm2 of names) {
                target.add(nm2);
                if (sm[1] === "IOSTANDARD" && !iostdFileOf.has(nm2)) iostdFileOf.set(nm2, p);
              }
            }
            // ② 逐逻辑行做规则检查
            const logic = joinCont(txt.split(/\r?\n/));
            for (const lg of logic) {
              const t = lg.text.replace(/^\s+/, "");
              if (!t) continue;
              if (/create_generated_clock\b/.test(t)) {
                genClocks.push({ file: short, filePath: p, line: lg.line, text: t.slice(0, 120) });
                if (!/-source\b/.test(t)) items.push({ level: "warn", file: short, filePath: p, line: lg.line, msg: "create_generated_clock 未指定 -source（生成时钟的源）" });
                else if (!/-divide_by|-multiply_by|-edges|-combinational/.test(t)) items.push({ level: "warn", file: short, filePath: p, line: lg.line, msg: "create_generated_clock 未指定 -divide_by / -multiply_by / -edges，无法确定倍频分频关系" });
                continue;
              }
              if (/create_clock\b/.test(t)) { clockCreates.push({ file: short, filePath: p, line: lg.line, text: t }); continue; }
              if (/set_clock_groups\b/.test(t) && !/-asynchronous|-exclusive|-physically_exclusive/.test(t)) {
                items.push({ level: "error", file: short, filePath: p, line: lg.line, msg: "set_clock_groups 缺少 -asynchronous / -exclusive 等分组方式，该约束不会生效" });
              }
              if (/set_false_path\b/.test(t) && !/-from|-through|-to/.test(t)) {
                items.push({ level: "error", file: short, filePath: p, line: lg.line, msg: "set_false_path 未指定 -from/-to/-through，约束无效" });
              }
            }
          }
          // 顶层端口约束检查：有 IOSTANDARD 但缺 PACKAGE_PIN → 管脚未绑定
          const unconstrained = [...iostdPorts].filter((x) => !pinPorts.has(x));
          for (const u of unconstrained) {
            items.push({ level: "warn", file: iostdFileOf.get(u) ? iostdFileOf.get(u).split(/[\\/]/).pop() : "(约束文件)", filePath: iostdFileOf.get(u) || "", line: 0, msg: "端口「" + u + "」有 IOSTANDARD 但缺 PACKAGE_PIN（管脚未绑定）" });
          }
          // create_clock 的周期校验
          for (const c of clockCreates) {
            const pm = /-period\s+([0-9.]+)/.exec(c.text);
            if (!pm) { items.push({ level: "warn", file: c.file, filePath: c.filePath, line: c.line, msg: "create_clock 未指定 -period" }); continue; }
            const ns = parseFloat(pm[1]);
            if (!(ns > 0)) items.push({ level: "error", file: c.file, filePath: c.filePath, line: c.line, msg: "create_clock 的 -period 不是正数：" + pm[1] });
            else if (ns > 100) items.push({ level: "warn", file: c.file, filePath: c.filePath, line: c.line, msg: "create_clock 周期 " + ns + "ns（约 " + (1000 / ns).toFixed(2) + "MHz），请确认是否符合预期" });
          }
          const errs = items.filter((x) => x.level === "error").length;
          setCheckPanel({
            title: "XDC 约束检查",
            summary: "扫描 " + xdcs.length + " 个 XDC 文件 / " + clockCreates.length + " 条 create_clock + " + genClocks.length + " 条生成时钟；"
              + "提取 " + pinPorts.size + " 个 PACKAGE_PIN 端口 / " + iostdPorts.size + " 个 IOSTANDARD 端口，发现 " + errs + " 个错误 / " + (items.length - errs) + " 个提示",
            items
          });
          if (!clockCreates.length && !genClocks.length && !pinPorts.size && !iostdPorts.size) {
            setFsStatus("约束检查完成：未提取到任何约束，结论不可信，请确认 .xdc 内容或目录");
            setFsStatusStyle({ color: C.warn });
          } else {
            setFsStatus("约束检查完成：" + errs + " 个错误"); setFsStatusStyle({ color: errs ? C.warn : C.green });
          }
        } catch (e) {
          setFsStatus("约束检查失败: " + fmtErr(e)); setFsStatusStyle({ color: C.warn });
        } finally { setCheckBusy(false); checkBusyRef.current = false; }
      };

      /* ⑮ 修复注释乱码：把当前文件按目标编码重写一遍（utf-8 ↔ gbk）。
         场景：文件被（AI / 其它工具）写成 UTF-8，Vivado 按 GBK 读 → 中文注释乱码；转 GBK 写回即可。
         安全链：① 先统计非 ASCII 并让用户确认；② 宿主对 GBK 表外字符会**拒绝写入**（ENCODE_LOSSY，绝不写坏）；
                 ③ 写回后回读校验磁盘编码；④ 把标签编码改成目标编码 —— 否则下次 Ctrl+S 又按原编码写回去。 */
      const fixCommentEncoding = async (target) => {
        const t = activeTab;
        if (!t || !t.path) { setFsStatus("请先打开一个文件"); setFsStatusStyle({ color: C.warn }); return; }
        let text = String(t.text || "");
        let cur = String(t.encoding || "utf8").toLowerCase();
        /* 记下「这次转码忽略了以 X 预览」：拼进最终状态文案，否则那条提示会被下一秒的写盘结果覆盖，用户看不到 */
        let previewIgnored = null;
        /* ★ 强制预览态（点过「以 UTF-8 / 以 GBK 打开」）下，屏幕上的文本是**按该编码强行解读**的结果，
           不是文件的真实内容 —— 拿它转码就是把乱码再编码一次（宿主也拦不住：GBK 乱码字符都是合法 UTF-8）。
           用户实测：「有的转换不对 还是会乱码」。所以转码前必须把基准拉回真实解读。 */
        if (t.forceView) {
          const fvName = String(t.forceView).toUpperCase();
          if (t.dirty) {
            /* 预览态下又改过内容：不能拿真实解读当基准（会丢用户的编辑），也不能拿预览文本（会二次编码）→ 拒绝并说清楚 */
            setFsStatus("当前是「以 " + fvName + " 预览」且有未保存的修改：先点「自动检测」回到真实解读，再转码");
            setFsStatusStyle({ color: C.warn });
            if (typeof deskToast === "function") deskToast("强制预览态下改过内容：先「自动检测」再转码（否则会把乱码二次编码写进文件）", false);
            return;
          }
          let r0 = null;
          try { r0 = await apiCall("readFile", { path: t.path }); } catch (e) { r0 = null; }
          if (!r0 || r0.ok !== true || typeof r0.content !== "string") {
            setFsStatus("无法回到真实解读：" + ((r0 && r0.error) || "读取失败")); setFsStatusStyle({ color: C.warn }); return;
          }
          /* 同步标签：内容/编码/BOM/行尾/可写标记全部换成真实解读的那一份，并退出强制预览态 */
          previewIgnored = fvName;
          text = String(r0.content).replace(/\r\n/g, "\n");
          cur = String(r0.encoding || "utf8").toLowerCase();
          const realT = { text: text, encoding: cur, forceView: null, dirty: false, writable: r0.writable !== false, bom: r0.hasBom === true, eol: /\r\n/.test(String(r0.content)) ? "crlf" : "lf", diskMtime: r0.mtimeMs || 0, diskSize: r0.size || 0 };
          setTabs((prev) => prev.map((x) => (x.path === t.path ? Object.assign({}, x, realT) : x)));
          setFsStatus("已忽略「以 " + fvName + " 预览」，按文件真实解读（" + cur.toUpperCase() + "）转码");
          setFsStatusStyle({ color: C.dim });
        }
        const dstName = target === "gbk" ? "GBK" : "UTF-8";
        if (cur === target) { setFsStatus("当前已经是 " + dstName + "，无需转换"); setFsStatusStyle({ color: C.green }); return; }
        const st = countNonAscii(text);
        if (!st.chars) { setFsStatus("该文件没有非 ASCII 字符（纯 ASCII），不需要转码"); setFsStatusStyle({ color: C.green }); return; }
        const note = target === "gbk"
          ? "转成 GBK 后 Vivado 才能正确显示中文注释（代码是 ASCII，只有注释/字符串受影响）。"
          : "转成 UTF-8 后 VS Code / 浏览器类工具正常，但 Vivado 可能显示乱码。";
        const head = st.lines.slice(0, 8).join("、") + (st.lines.length > 8 ? " …" : "");
        /* 损坏字符（U+FFFD）在 GBK 里没有对应字符：这件事**在这一次确认里就说明白**，
           避免写完再弹第二个对话框（原生 modal 会阻塞整个窗口）。 */
        const badCnt = (text.match(/\uFFFD/g) || []).length;
        const note2 = (target === "gbk" && badCnt)
          ? "\n\n注意：" + badCnt + " 个字符是已经损坏的替换字符（显示为 �，原文已丢失），GBK 里没有对应字符 —— 继续会把这 " + badCnt + " 处替换成 ?。"
          : "";
        const okGo = await deskConfirm("修复注释编码\n\n文件：" + basename(t.path) + "\n当前编码：" + cur.toUpperCase() + " → " + dstName
          + "\n非 ASCII 字符：" + st.chars + " 个（分布在 " + st.lines.length + " 行；行号 " + head + "）\n\n" + note + note2 + "\n\n确定写回吗？");
        if (!okGo) { setFsStatus("已取消转码"); return; }
        setFsStatus("正在按 " + dstName + " 写回…"); setFsStatusStyle({ color: C.accent });
        let finalText = text;
        let res = null;
        try { res = await apiCall("writeFile", { path: t.path, content: eolEncode(text, t.eol), encoding: target, bom: false }); } catch (e) { res = null; }
        if (!res || res.ok !== true) {
          let retried = false;
          if (res && res.code === "ENCODE_LOSSY") {
            /* 损坏字符的替换已经在上面的确认框里说明过 → 直接替换重写，**不再弹第二个对话框** */
            const retry = lossySanitize(res, text);
            if (retry != null) {
              retried = true;
              let res2 = null;
              try { res2 = await apiCall("writeFile", { path: t.path, content: eolEncode(retry, t.eol), encoding: target, bom: false }); } catch (e) { res2 = null; }
              if (res2 && res2.ok) { res = res2; finalText = retry; }
            }
          }
          if (!res || res.ok !== true) {
            const msg = (res && res.error) || "写入失败";
            setFsStatus("转码失败：" + msg); setFsStatusStyle({ color: C.warn });
            /* ★ 不用原生 alert 弹出：原生 modal 会阻塞整个窗口（用户实测"点不了、输入不了"）。
               失败信息落在状态栏 + toast 上，不阻塞界面。 */
            if (res && res.code === "ENCODE_LOSSY" && !retried) {
              setFsStatus("转码失败：有 " + ((res && res.lost) || 0) + " 个字符 GBK 表示不了（emoji、ⓐ、损坏字符等），文件**没有被改动**");
              deskToast("有 " + ((res && res.lost) || 0) + " 个字符 GBK 表示不了，未写盘；请先把它们改成中文/ASCII 或用「另存为」保留原文", false);
            }
            return;
          }
        }
        /* 标签编码必须跟着改，否则下一次 Ctrl+S 又会按旧编码写回去（等于白转）；
           若做过 ? 替换，标签文本也要一起换 —— 否则下次 Ctrl+S 又会被拒。 */
        setTabs((prev) => prev.map((x) => (x.path === t.path
          ? Object.assign({}, x, { text: finalText, encoding: target, bom: false, dirty: false, forceView: null })
          : x)));
        /* 记下回退点：Ctrl+Z（撤销栈空后）会把编码与磁盘字节一起改回原样 */
        encUndoRef.current = {
          path: t.path, label: "转为 " + dstName + " 并保存",
          prevText: text, prevEncoding: cur, prevBom: t.bom === true,
          postText: finalText, wrote: true
        };
        /* 回读校验：确认磁盘上真的是目标编码 */
        let verify = "（未回读校验）";
        try {
          const r2 = await apiCall("readFile", { path: t.path });
          if (r2 && r2.ok && String(r2.encoding || "").toLowerCase() === target) verify = "回读编码 " + dstName + " ✓";
          else verify = "回读编码 " + String((r2 && r2.encoding) || "?").toUpperCase() + "（与目标不一致，请检查）";
        } catch (e) { }
        try {
          const stat2 = await apiCall("stat", { path: t.path });
          if (stat2 && stat2.ok) setTabs((prev) => prev.map((x) => (x.path === t.path ? Object.assign({}, x, { diskMtime: stat2.mtimeMs || 0, diskSize: stat2.size || 0 }) : x)));
        } catch (e) { }
        setFsStatus("已按 " + dstName + " 写回（" + st.chars + " 个非 ASCII 字符）　" + verify
          + (previewIgnored ? ("　（已忽略「以 " + previewIgnored + " 预览」，按文件真实解读转码）") : ""));
        setFsStatusStyle({ color: C.green });
        deskToast && deskToast("注释编码已修复为 " + dstName + "：" + basename(t.path));
      };
      /* 以指定编码重新打开：只改变"本编辑器怎么解读这些字节"，磁盘文件不动。
         target: "utf8" | "gbk" | ""（空 = 回到宿主自动检测）。
         用途：确认"乱码到底是不是 UTF-8 造成的" —— 把一份 UTF-8 文件用 GBK 重新打开，
         看到的就是 Vivado 里的样子。 */
      const reopenWithEncoding = async (target) => {
        setEncDlgOpen(false);
        const t = activeTab;
        if (!t || !t.path) { setFsStatus("请先打开一个文件"); setFsStatusStyle({ color: C.warn }); return; }
        if (t.dirty && !await deskConfirm("以其它编码重新打开会丢弃该文件未保存的修改：\n" + basename(t.path) + "\n\n继续吗？")) {
          setFsStatus("已取消重新打开"); setFsStatusStyle({ color: C.dim });
          return;
        }
        const wantName = target ? target.toUpperCase() : "自动检测";
        setFsStatus("正在以 " + wantName + " 重新读取…"); setFsStatusStyle({ color: C.accent });
        let res = null;
        try { res = await apiCall("readFile", target ? { path: t.path, encoding: target } : { path: t.path }); } catch (e) { res = null; }
        if (!res || !res.ok || typeof res.content !== "string") {
          setFsStatus("重新打开失败：" + ((res && res.error) || "宿主未返回内容")); setFsStatusStyle({ color: C.warn });
          return;
        }
        /* 宿主到底有没有按指定编码解码？旧宿主会静默忽略该参数（返回 forced 缺失），
           必须如实说出来 —— 否则用户点了菜单"看着没反应"，会误以为编码本来就没错。 */
        const enc = String(res.encoding || "utf8").toLowerCase();
        const applied = !target || res.forced === true;
        const raw = String(res.content);
        /* 换一种解读方式后内容必然变了：算出一处**最先变化**的行/列，稍后把视图跳过去。
           用户实测："加了汉字再以 GBK 预览，加的汉字不显示" —— 变化处在很长的行尾，
           视图没跟过去，看上去就像丢了（内容其实在）。 */
        const _oldL = String(t.text).split("\n");
        const _newL = String(raw.replace(/\r\n/g, "\n")).split("\n");
        let dLine = 0, dCol = 1;
        for (let i = 0; i < Math.max(_oldL.length, _newL.length); i++) {
          const a = _oldL[i] === void 0 ? "" : _oldL[i];
          const b = _newL[i] === void 0 ? "" : _newL[i];
          if (a !== b) {
            dLine = i + 1;
            let k = 0;
            while (k < a.length && k < b.length && a[k] === b[k]) k++;
            dCol = k + 1;
            break;
          }
        }
        setTabs((prev) => prev.map((x) => (x.path === t.path ? Object.assign({}, x, {
          text: raw.replace(/\r\n/g, "\n"),
          eol: /\r\n/.test(raw) ? "crlf" : "lf",
          encoding: enc,
          dirty: false,
          writable: res.writable !== false,
          bom: res.hasBom === true,
          /* 强制查看标记：状态栏显示 GBK*，保存时给出"这会把文件按该编码重写"的确认 */
          forceView: (target && applied) ? enc : null,
          diskMtime: res.mtimeMs || 0, diskSize: res.size || 0
        }) : x)));
        setDocRev((n) => ({ n: ((n && n.n) || 0) + 1, line: cursorRef.current.line, col: cursorRef.current.col }));   // 同上：正文被整体换掉了（带上替换前的光标行/列）
        /* ★ 把「换编码预览」本身做成历史里的一步：
           Ctrl+Z → 回到预览前的文本与编码；Ctrl+Y → 再前进回这个预览状态。
           预览不写盘，所以只需恢复编辑器状态（文本走撤销栈，编码走 onUndoEnc）。 */
        pushUndoUnit(t.path, String(t.text), {
          enc: { encoding: String(t.encoding || "utf8").toLowerCase(), bom: t.bom === true, forceView: t.forceView || null, writable: t.writable !== false },
          redoEnc: { encoding: enc, bom: res.hasBom === true, forceView: (target && applied) ? enc : null, writable: res.writable !== false }
        });
        /* 只记录变化位置，**不主动滚动**：视图跳动会打断正在阅读的位置（用户实测反馈）。
           想看变化处时点状态栏的「跳到变化处」按钮即可。 */
        setEncJump((applied && dLine > 0) ? { path: t.path, line: dLine, col: dCol } : null);
        setFsStatus(applied
          ? ("已按 " + (target ? wantName : "自动检测") + " 重新打开（编码 " + enc.toUpperCase() + "）"
            + (target ? "　文件未被修改（按**磁盘原始字节**重新解码，与上一次预览无关）" : "")
            + (dLine > 0 ? "　第 " + dLine + " 行第 " + dCol + " 列起按新编码显示（视图未移动，可点右侧按钮过去）" : ""))
          : ("宿主未支持指定编码（本次仍是 " + enc.toUpperCase() + "）：需要重启 dsh 后再试"));
        setFsStatusStyle({ color: applied ? C.green : C.warn });
      };
      const encBtn = (label, fn) => React.createElement("button", {
        onClick: fn,
        style: { background: "#2A2B2C", color: C.text, border: "1px solid " + C.border, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12 }
      }, label);

      const submitPathDlg = async (valOverride) => {
        const mode = pathDlg && pathDlg.mode;
        const val = String(valOverride != null ? valOverride : (pathDlgVal || "")).trim();
        setPathDlg(null);
        if (!val) { setFsStatus("未输入路径，已取消"); setFsStatusStyle({ color: C.warn }); return; }
        if (mode === "newFile") {
          // 新建文本文件：host 创建空文件后打开（目录不存在自动建）
          let res = await apiCall("createFile", { path: val });
          res = await deskWriteRetry(res, val, () => apiCall("createFile", { path: val }));
          if (!res || !res.ok) { setFsStatus((res && res.error) || "新建失败"); setFsStatusStyle({ color: C.warn }); return; }
          await openFile(val, true);
          setFsStatus("已新建: " + val); setFsStatusStyle({ color: C.green });
        } else if (mode === "openFile") {
          await openFile(val, true);
        } else if (mode === "saveAs") {
          // 另存为…：把当前活动文件内容写到新路径
          if (!activeTab) { setFsStatus("没有可另存的文件"); setFsStatusStyle({ color: C.warn }); return; }
          /* ★ 预览态下另存为会把**乱码**写成一份新文件（用户以为「留了一份原文」，其实留的是一份乱码）→ 先回真实解读 */
          if (activeTab.forceView && activeTab.writable === false) {
            const fv = String(activeTab.forceView).toUpperCase();
            setFsStatus("已阻止另存：当前是「以 " + fv + " 预览」，另存的会是按 " + fv + " 强行解读的乱码 ——先「自动检测」回到真实解读，再另存");
            setFsStatusStyle({ color: C.warn });
            if (typeof deskToast === "function") deskToast("预览态不另存：先「自动检测」回到真实解读", false);
            return;
          }
          const res = await apiCall("writeFile", { path: val, content: eolEncode(activeTab.text, activeTab.eol), encoding: activeTab.encoding });
          if (!res || !res.ok) { setFsStatus("另存失败: " + ((res && res.error) || "未知")); setFsStatusStyle({ color: C.warn }); return; }
          await openFile(val, true);
          setFsStatus("已另存为: " + val); setFsStatusStyle({ color: C.green });
        } else if (mode === "wsSaveAs") {
          // 将工作区另存为…（写任意 .code-workspace 目标）
          let res = await apiCall("workspaceSaveAs", { path: val, folders: foldersRef.current });
          // 白名单拦下工作区外写入时，问一次是否授权该目录再重试
          res = await deskWriteRetry(res, val, () => apiCall("workspaceSaveAs", { path: val, folders: foldersRef.current }));
          if (!res || !res.ok) { setFsStatus("工作区另存失败: " + ((res && res.error) || "未知")); setFsStatusStyle({ color: C.warn }); return; }
          setFsStatus("工作区已另存: " + val); setFsStatusStyle({ color: C.green });
          try { localStorage.setItem("card-desktop-ws-file", val); } catch (e) { }
        } else if (mode === "wsOpen") {
          // 从文件打开工作区…
          const ok = await openWsFromPath(val);
          if (!ok) return;
        }
      };
      // ⑦ 打开最近工作区共用逻辑：载入 .code-workspace → 替换 folders
      const openWsFromPath = async (val) => {
        const res = await apiCall("workspaceOpenFrom", { path: val });
        if (!res || !res.ok) { setFsStatus((res && res.error) || "打开工作区失败"); setFsStatusStyle({ color: C.warn }); return false; }
        const flds = res.folders || [];
        await switchToWorkspace(flds, val + "（" + flds.length + " 个文件夹）");
        return true;
      };
      /* 重新打开一份「文件夹集合」快照（最近列表里的 📁 条目） */
      const openWsFromFolders = async (flds, label) => {
        const list = (Array.isArray(flds) ? flds : []).filter((f) => f && f.path);
        if (!list.length) { setFsStatus("该记录里没有文件夹"); setFsStatusStyle({ color: C.warn }); return false; }
        let out = list;
        try {
          const res = await apiCall("workspaceOpenFolders", { folders: list, label: label || "" });
          if (res && res.ok && Array.isArray(res.folders) && res.folders.length) out = res.folders;
        } catch (e) { /* 旧宿主没有这个方法：界面照常恢复，写盘时再按需授权 */ }
        await switchToWorkspace(out, label);
        return true;
      };
      const closeWorkspace = async () => {
        if (!folders.length && !tabs.length) return;
        if ((tabs.some((t) => t.dirty)) && !await deskConfirm("有未保存文件，关闭工作区将丢弃修改？")) return;
        /* 关之前先把当前工作区登记进「最近」：这样「刚关掉的工作区」还能找回。
           注意只登记，不删磁盘上的工作区内容（宿主用 lastFolders 兜底）。 */
        const was = foldersRef.current.slice();
        stashWsLayout(was);   // 关掉之前先记下布局：再打开这个工作区时能把代码区恢复回来
        if (was.length) {
          pushLocalRecent(was);
          try { apiCall("workspaceRecordFolders", { folders: was, label: was.map((f) => f.name || basename(f.path)).join(" + ") }); } catch (e) { }
        }
        foldersRef.current = [];
        setFolders([]);
        persistWorkspace([]);
        setHierMap({}); setExpandedFolders({}); setExpandedGroups({}); setHierLoading(false); setShowAll(false); setHierExp({});
        closeAll();
        setFsStatus("已关闭工作区"); setFsStatusStyle({ color: C.dim });
      };
      /* 还原文件（VSCode 的 Revert File）：丢弃未保存的修改，把内容回到磁盘上的版本。
         只改内存里的文本与编码元数据，不写盘 —— 所以它是纯恢复动作，不会污染文件。 */
      const revertActiveFile = async () => {
        const t = tabsRef.current.find((x) => x.path === activePathRef.current);
        if (!t) return;
        if (!t.dirty) { setFsStatus("文件没有未保存的修改，已经是磁盘上的版本"); setFsStatusStyle({ color: C.dim }); return; }
        if (!await deskConfirm("还原文件会丢弃未保存的修改，回到磁盘上的版本：\n" + basename(t.path) + "\n\n确定还原吗？")) return;
        const c = await readFileContent(t.path);
        if (!c.ok) { setFsStatus("还原失败: " + c.error); setFsStatusStyle({ color: C.warn }); return; }
        setTabs((prev) => prev.map((x) => (x.path === t.path ? Object.assign({}, x, {
          dirty: false,
          encoding: c.encoding,
          eol: /\r\n/.test(c.text) ? "crlf" : "lf",
          text: c.text.replace(/\r\n/g, "\n"),
          diskMtime: c.mtimeMs || 0, diskSize: c.size || 0,
          writable: c.writable !== false,
          bom: c.hasBom === true,
          forceView: null,
          error: c.ok ? null : c.error
        }) : x)));
        setDocRev((n) => ({ n: ((n && n.n) || 0) + 1, line: cursorRef.current.line, col: cursorRef.current.col }));   // 告诉编辑器：文档被整体替换了（带替换前光标，清列选/选区/待恢复视图）
        setFsStatus("已还原: " + basename(t.path) + "（内容回到磁盘版本）");
        setFsStatusStyle({ color: C.green });
      };
      /* 打开文件夹…（VSCode 语义：用它**替换**当前工作区，而不是追加） */
      const openFolderAsWorkspace = async () => {
        const ws = (uiWorkspaceSvc && typeof uiWorkspaceSvc.pickDirectory === "function") ? uiWorkspaceSvc : workspacesService;
        if (!ws || typeof ws.pickDirectory !== "function") { setFsStatus("没有目录选择服务"); setFsStatusStyle({ color: C.warn }); return; }
        let dir = "";
        try { dir = await ws.pickDirectory(); } catch (e) { setFsStatus("选择失败: " + fmtErr(e)); setFsStatusStyle({ color: C.warn }); return; }
        if (!dir) { setFsStatus("已取消"); setFsStatusStyle({ color: C.dim }); return; }
        const p = String(dir).replace(/[\\/]$/, "");
        const won = tabsRef.current.filter((t) => t.dirty);
        if (won.length && !await deskConfirm("有 " + won.length + " 个文件未保存。打开文件夹会替换当前工作区（已打开的标签保留），继续？")) return;
        const next = [{ name: basename(p), path: p }];
        try { await apiCall("workspaceOpenFolders", { folders: next, label: basename(p) }); } catch (e) { }
        await switchToWorkspace(next, basename(p));
      };
      /* 复制工作区（VSCode：把当前工作区另存成一个新的工作区文件） */
      const duplicateWorkspace = () => {
        const f0 = foldersRef.current && foldersRef.current[0];
        if (!f0) { setFsStatus("当前没有工作区可复制"); setFsStatusStyle({ color: C.warn }); return; }
        openPathDlg("wsSaveAs", f0.path + "\\" + (f0.name || basename(f0.path)) + "-副本.code-workspace");
      };
      // 自动保存：有脏标签时延迟 1s 静默保存（用 ref 读最新 tabs）
      const autoSaveRef = React.useRef(null);
      React.useEffect(() => {
        if (!autoSave) return;
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        autoSaveRef.current = setTimeout(() => {
          tabsRef.current.filter((t) => t.dirty).forEach((t) => saveFile(t.path));
        }, 1000);
        return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
      }, [tabs, autoSave]);

      /* 文件菜单（顶部条下拉）条目：label/动作/快捷键/是否可用 */
      const fileMenu = [
        { l: "新建文本文件", f: () => newFileInDir(), k: "Ctrl+Alt+N" },
        { l: "打开文件…", f: () => openPathDlg("openFile"), k: "Ctrl+O" },
        { l: "打开文件夹…", f: openFolderAsWorkspace, k: "" },
        { l: "重新扫描工作区工程", f: () => scanFoldersSequentially(foldersRef.current, { force: true }), dis: !folders.length },
        { l: "性能诊断（10 秒采样）", f: () => runPerfProbe(true), k: "" },
        {
          l: "全量扫描工作区工程（慢，慎用）",
          f: async () => {
            if (!await deskConfirm("全量扫描会把「没有 Vivado 工程文件」的目录里所有 RTL 逐个读取解析，\n大目录（上万文件）可能卡几分钟。\n\n确定继续吗？")) return;
            scanFoldersSequentially(foldersRef.current, { force: true, allowLarge: true });
          },
          dis: !folders.length
        },
        { l: "从文件打开工作区…", f: () => openPathDlg("wsOpen") },
        { l: "打开最近工作区…", f: () => { setRecentOpen(true); refreshRecents(); }, k: "", dis: false },
        { l: "清空最近工作区", f: clearRecents, dis: !recents.length },
        { sep: true },
        { l: "将文件夹添加到工作区…", f: pickWorkspace, k: "Ctrl+K Ctrl+O" },
        { l: "将工作区另存为…", f: () => openPathDlg("wsSaveAs") },
        { l: "复制工作区", f: duplicateWorkspace, dis: !folders.length },
        { sep: true },
        { l: "保存", f: () => saveFile(activePath), k: "Ctrl+S", dis: !activeTab },
        { l: "另存为…", f: saveAsWithDialog, k: "Ctrl+Alt+S", dis: !activeTab },
        { l: "全部保存", f: saveAll, k: "Ctrl+K S", dis: !tabs.some((t) => t.dirty) },
        { l: autoSave ? "✓ 自动保存" : "自动保存", f: () => setAutoSave((v) => { const nx = !v; try { localStorage.setItem(AUTOSAVE_KEY, nx ? "1" : "0"); } catch (e) { } return nx; }) },
        { l: "还原文件", f: revertActiveFile, dis: !activeTab || !activeTab.dirty },
        { sep: true },
        { l: "关闭编辑器", f: () => closeTab(activePath), k: "Ctrl+W", dis: !activeTab },
        { l: "关闭工作区", f: closeWorkspace, k: "Ctrl+K F" }
      ];
      const renderNode = (p, depth) => {
        const node = tree[p];
        if (!node) return null;
        const isDir = node.type === "directory";
        const indent = { paddingLeft: 8 + depth * 14 };
        const isActive = activePath === p;
        const row = React.createElement("div", {
          key: p,
          onClick: () => (isDir ? toggleDir(p) : openFile(p, false)),
          onDoubleClick: () => { if (!isDir) openFile(p, true); },
          onContextMenu: (e) => openContext(e, p, isDir ? "dir" : "file"),
          style: Object.assign({
            display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 3,
            cursor: "pointer", color: isActive ? "#fff" : "#cccccc", fontSize: 13,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            background: isActive ? "rgba(57,148,188,.22)" : "transparent"
          }, indent),
          onMouseEnter: (e) => { if (!isActive) e.currentTarget.style.background = "#2a2d2e"; },
          onMouseLeave: (e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }
        },
          matIcon(node.name, isDir, !!node.expanded),
          React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis" } }, node.name));
        if (!node.expanded) return row;
        const kids = (node.children || [])
          .filter((c) => showAll || !shouldHide(tree[c] && tree[c].name || ""))
          .map((c) => renderNode(c, depth + 1))
          .filter(Boolean);
        return [row, ...kids];
      };

      /* ---- 渲染：Hierarchy 模块实例树 ---- */
      const renderHierNode = (node, depth, chainKey, isRoot) => {
        if (!node) return null;
        const indent = { paddingLeft: 8 + depth * 14 };
        const kidsArr = node.instances || [];
        const hasKids = kidsArr.length > 0;
        const isLeaf = !hasKids;
        const myKey = chainKey + "/" + (isRoot ? "#" + node.module : node.name + "@" + (node.line || 0));
        const open = hierExp[myKey] === true; // 默认【折叠】，用户点 ▸ 展开后才记录展开状态
        const label = isRoot ? node.module : (node.name + " : " + node.module);
        const row = React.createElement("div", {
          key: myKey,
          // Vivado 语义（按你的要求）：单击行本身不展开、不打开、不高亮——只有点击箭头 ▸/▾ 才展开收起；双击模块行打开源码
          onClick: null,
          onDoubleClick: () => { if (node.file) openFile(node.file, true, node.line || 0); },
          onContextMenu: (e) => { if (node.file) openContext(e, node.file, "file"); },
          title: hasKids ? (open ? "双击打开源码 · 点 ▾ 收起" : "双击打开源码 · 点 ▸ 展开") : "双击打开源码文件",
          style: Object.assign({
            display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 3,
            cursor: "pointer", color: isLeaf ? "#cccccc" : "#e8e8e8", fontSize: 13,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: "transparent"
          }, indent),
          onMouseEnter: (e) => { e.currentTarget.style.background = "#2a2d2e"; },
          onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
        },
          React.createElement("span", {
            onClick: (e) => { if (hasKids) { e.stopPropagation(); setHierExp((prev) => ({ ...prev, [myKey]: !open })); } },
            style: { width: 14, flexShrink: 0, color: hasKids ? "#8a8a8a" : "transparent", fontSize: 10, cursor: hasKids ? "pointer" : "default", textAlign: "center" }
          }, hasKids ? (open ? "▾" : "▸") : "·"),
          React.createElement("span", null, isRoot ? "🏛" : (isLeaf ? "🔹" : "📦")),
          React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis" } }, label),
          node.line ? React.createElement("span", {
            onClick: (e) => { e.stopPropagation(); if (node.file) openFile(node.file, true, node.line); },
            style: { fontSize: 10, color: "#3994BC", flexShrink: 0, cursor: "pointer", padding: "0 2px", borderRadius: 2 },
            title: "跳转到 " + basename(node.file || "") + ":" + node.line
          }, "L" + node.line) : null);
        if (!open) return row;
        const kids = kidsArr.map((c) => renderHierNode(c, depth + 1, myKey, false)).filter(Boolean);
        return [row, ...kids];
      };

      const fileRow = (path, depth) => React.createElement("div", {
        key: path,
        onClick: () => openFile(path, false),
        onDoubleClick: () => openFile(path, true),
        onContextMenu: (e) => openContext(e, path),
        style: Object.assign({
          display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 3,
          cursor: "pointer", color: activePath === path ? "#fff" : "#cccccc", fontSize: 12,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          background: activePath === path ? "rgba(57,148,188,.22)" : "transparent"
        }, { paddingLeft: 8 + depth * 14 })
      },
        matIcon(basename(path), false, false),
        React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis" } }, basename(path)));

      /* ---- 渲染：Vivado 4 类分组 ---- */
      const GROUP_META = {
        design: { icon: "🧩", label: "Design Sources" },
        constraints: { icon: "📏", label: "Constraints" },
        simulation: { icon: "🔬", label: "Simulation Sources" },
        utility: { icon: "🛠", label: "Utility Sources" }
      };
      const renderGroup = (folderPath, fsItem, depth) => {
        const key = folderPath + "::" + fsItem.kind;
        const open = expandedGroups[key];
        const meta = GROUP_META[fsItem.kind] || GROUP_META.design;
        const scan = hierMap[folderPath];
        const hasDesign = fsItem.kind === "design" && scan && scan.tops && scan.tops.length > 0;
        const fileCount = (fsItem.files || []).length;
        const rows = [];
        const head = React.createElement("div", {
          key: key,
          onClick: () => setExpandedGroups((prev) => ({ ...prev, [key]: !open })),
          style: { display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", cursor: "pointer", color: "#e8e8e8", fontWeight: 600, fontSize: 12, background: "#191A1B", borderRadius: 3, marginTop: 2, marginLeft: depth * 12 }
        },
          React.createElement("span", null, open ? "▾" : "▸"),
          React.createElement("span", null, meta.icon + " " + meta.label),
          React.createElement("span", { style: { marginLeft: "auto", fontSize: 10, color: "#808080" } }, hasDesign ? "RTL" : fileCount));
        rows.push(head);
        if (open) {
          if (hasDesign) {
            (scan.tops || []).forEach((t) => rows.push(renderHierNode(t, depth + 1, key + "/#", true)));
          } else {
            (fsItem.files || []).forEach((f) => rows.push(fileRow(f, depth + 1)));
          }
        }
        return rows;
      };

      const renderFolderHead = (f, tab) => {
        const fOpen = expandedFolders[f.path];
        const isExplorer = tab === "explorer";
        return React.createElement("div", {
          key: "folder:" + f.path,
          onClick: () => (isExplorer ? toggleFolderRoot(f.path) : setExpandedFolders((prev) => ({ ...prev, [f.path]: !prev[f.path] }))),
          style: { display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", cursor: "pointer", color: "#e8e8e8", fontWeight: 700, fontSize: 13, background: "transparent", borderRadius: 3, marginTop: 2 }
        },
          React.createElement("span", null, fOpen ? "▾" : "▸"),
          matIcon(f.name, true, !!fOpen),
          React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", flex: 1 } }, f.name),
          React.createElement("button", {
            onClick: (e) => { e.stopPropagation(); removeFolder(f.path); },
            style: { background: "transparent", color: "#808080", border: "none", cursor: "pointer", fontSize: 12, padding: "0 4px" },
            title: "从工作区移除"
          }, "✕"));
      };

      const renderExplorerWorkspace = () => {
        if (!folders.length) {
          return React.createElement("div", { style: { fontSize: 12, color: "#858585", padding: 8 } },
            "工作区为空 —— 点「添加文件夹」或「导入 Vivado 工程」");
        }
        const rows = [];
        folders.forEach((f) => {
          rows.push(renderFolderHead(f, "explorer"));
          if (expandedFolders[f.path]) {
            const rootNode = tree[f.path];
            if (rootNode && rootNode.loaded) {
              const kids = (rootNode.children || [])
                .filter((c) => showAll || !shouldHide(tree[c] && tree[c].name || ""))
                .map((c) => renderNode(c, 1))
                .filter(Boolean);
              rows.push(...kids);
            } else {
              rows.push(React.createElement("div", { key: "loading:" + f.path, style: { fontSize: 12, color: "#858585", padding: "4px 8px 4px 30px" } }, "加载中…"));
            }
          }
        });
        return rows;
      };

      const renderHierarchyWorkspace = () => {
        if (!folders.length) {
          return React.createElement("div", { style: { fontSize: 12, color: "#858585", padding: 8 } },
            "工作区为空 —— 点「添加文件夹」或「导入 Vivado 工程」");
        }
        const rows = [];
        folders.forEach((f) => {
          rows.push(renderFolderHead(f, "hierarchy"));
          if (expandedFolders[f.path]) {
            const scan = hierMap[f.path];
            if (!scan) {
              rows.push(React.createElement("div", {
                key: "noscan:" + f.path,
                onClick: () => scanOne(f.path),
                style: { fontSize: 12, color: C.accent, padding: "4px 8px 4px 30px", cursor: "pointer" }
              }, "▶ 扫描此工程"));
            } else if (!scan.ok) {
              rows.push(React.createElement("div", { key: "err:" + f.path, style: { fontSize: 12, color: C.warn, padding: "4px 8px 4px 30px" } }, "扫描失败: " + (scan.error || "未知")));
            } else if (!scan.xprFound) {
              rows.push(React.createElement("div", { key: "noxpr:" + f.path, style: { fontSize: 12, color: "#858585", padding: "4px 8px 4px 30px" } },
                "未发现 .xpr（" + (scan.fileCount || 0) + " 个 RTL 文件）"));
            } else {
              (scan.fileSets || []).forEach((fs) => {
                rows.push(...renderGroup(f.path, fs, 1));
              });
            }
          }
        });
        return rows;
      };

      /* ---- 编辑器组标签条（VSCode 模型：每个 editor group 自带标签条） ----
         拖放：容器级判定。拖动中根据指针 x 计算插入位显示竖线；drop 到本组 = 排序，
         drop 到右组 = 移到右栏（拆分视图），drop 到编辑器右侧缘 = 新建拆分。 */
      const dragEnd = () => { dragPathRef.current = null; setDropIdx(null); setDragOverEdge(null); };
      const [dropIdx, setDropIdx] = React.useState(null); // {strip:'l'|'r', index} 插入位
      const tabDragRef = React.useRef(null); // 标签指针拖放状态 {path,strip,dragging,...}
      const tabGhostRef = React.useRef(null); // 拖动半透明影子元素
      // 创建/移动/隐藏拖动半透明影子（克隆 tab 元素跟随鼠标）
      const tabGhostShow = (d, ev) => {
        const ta = d.stripEl && d.stripEl.querySelector("[data-tab='1']");
        if (!ta) return;
        const rect = ta.getBoundingClientRect();
        const g = document.createElement("div");
        g.style.cssText = "position:fixed;pointer-events:none;z-index:99999;opacity:0.55;background:#191A1B;border:1px solid #3994BC;border-radius:4px;padding:4px 10px;font-size:12px;color:#fff;white-space:nowrap;font-weight:600;";
        g.textContent = d.path ? (d.path.split(/[\\/]/).pop() || d.path) : "";
        document.body.appendChild(g);
        tabGhostRef.current = g;
        tabGhostMove(ev);
      };
      const tabGhostMove = (ev) => {
        const g = tabGhostRef.current;
        if (!g) return;
        g.style.left = (ev.clientX + 8) + "px";
        g.style.top = (ev.clientY + 8) + "px";
      };
      const tabGhostHide = () => { if (tabGhostRef.current) { tabGhostRef.current.remove(); tabGhostRef.current = null; } };
      // 计算指示线 left（相对 strip 容器）靠 tab 元素或末尾
      const computeDropLeft = (e, tabsEl, stripEl) => {
        if (!stripEl) return 0;
        const srect = stripEl.getBoundingClientRect();
        const x = e.clientX;
        for (let i = 0; i < tabsEl.length; i++) {
          const r = tabsEl[i].getBoundingClientRect();
          if (x < r.left + r.width / 2) return Math.max(0, r.left - srect.left - 1);
        }
        const last = tabsEl.length ? tabsEl[tabsEl.length - 1].getBoundingClientRect() : null;
        return last ? (last.right - srect.left + 1) : 0;
      };
      const tabDragMove = (ev) => {
        const d = tabDragRef.current;
        if (!d) return;
        if (!d.dragging) { if (Math.abs(ev.clientX - d.startX) < 5) return; d.dragging = true; tabGhostShow(d, ev); }
        ev.preventDefault();
        tabGhostMove(ev);
        // 判断鼠标在标签栏内还是编辑器区
        const stripRect = d.stripEl ? d.stripEl.getBoundingClientRect() : null;
        const rootRect = workbenchRootRef.current ? workbenchRootRef.current.getBoundingClientRect() : null;
        let zone = "sort"; // 默认排序
        if (stripRect && ev.clientY > stripRect.bottom && rootRect) {
          const subRect = rightPaneRef.current ? rightPaneRef.current.getBoundingClientRect() : null;
          const inSub = subRect && ev.clientX >= subRect.left && ev.clientX <= subRect.right && ev.clientY >= subRect.top && ev.clientY <= subRect.bottom;
          if (inSub) {
            // 落点在右栏内：按落点相对右栏位置分区
            const dx = (ev.clientX - subRect.left) / subRect.width;
            const dy = (ev.clientY - subRect.top) / subRect.height;
            if (dx > 0.6) {
              // 右栏右二分之一 → 右栏左右分栏
              zone = d.isRight ? "subRight" : "subRight";
            } else if (dy > 0.5) {
              // 右栏下半部分 → 右栏上下分栏
              zone = "subDown";
            } else {
              // 右栏标签条/上部 → 移动进右栏（追加标签）；源是右栏则排序
              zone = d.isRight ? "insideSub" : "moveToRight";
            }
          } else if (d.isRight) {
            // 源是右栏标签，落到左栏编辑器区（非右栏）→ 拖回左栏
            zone = "backLeft";
          } else {
            const distRight = rootRect.right - ev.clientX;
            const distBottom = rootRect.bottom - ev.clientY;
            // 无右栏：拖出标签条到编辑器区 → 建右栏（移动）
            if (rightPaths.length === 0) {
              zone = "splitRight";
            } else if (distRight < rootRect.width * 0.35) zone = "splitRight";
            else if (distBottom < rootRect.height * 0.35) zone = "splitDown";
            else zone = "sort";
          }
        }
        d.zone = zone;
        setDragOverEdge(zone === "sort" || zone === "backLeft" ? null : (zone === "splitRight" || zone === "subRight" || zone === "moveToRight" ? "right" : "bottom"));
        if (zone === "sort" && stripRect) {
          const tabsEl = Array.from(stripElQuery(d));
          const idx = computeDropIndex(ev, tabsEl);
          d.dropIdx = idx;
          setDropIdx({ strip: d.strip, left: computeDropLeft(ev, tabsEl, d.stripEl) });
        } else {
          setDropIdx(null);
        }
      };
      const stripElQuery = (d) => (d.stripEl ? Array.from(d.stripEl.querySelectorAll("[data-tab='1']")) : []);
      const tabDragUp = (ev) => {
        const d = tabDragRef.current;
        tabGhostHide();
        if (d && d.dragging) {
          ev.preventDefault();
          const zone = d.zone || "sort";
          if (zone === "backLeft") {
            // 右栏标签拖回左栏：移除右栏、激活到左栏；右栏剩余标签自动激活
            setRightPaths((ps) => ps.filter((p) => p !== d.path));
            setRightActivePath((ra) => {
              if (ra !== d.path) return ra;
              const remain = rightPaths.filter((p) => p !== d.path);
              return remain.length ? remain[0] : null;
            });
            setActivePath(d.path);
            setFsStatus("已移回左栏: " + d.path.split(/[\\/]/).pop()); setFsStatusStyle({ color: C.dim });
          } else if (zone === "moveToRight") {
            // 左栏源拖到右栏上部/标签条 → 移动进右栏
            if (!rightPaths.includes(d.path)) dragToRight(d.path, "right");
          } else if (zone === "splitRight") {
            if (!rightPaths.includes(d.path)) dragToRight(d.path, "right");
          } else if (zone === "splitDown") {
            if (!rightPaths.includes(d.path)) dragToRight(d.path, "down");
          } else if (zone === "subRight" || zone === "subDown" || zone === "insideSub") {
            // 拖到副组内：把右栏标签分化成两格。拖的标签 = 下/右格；剩余标签 = 上/左格
            const dir = zone === "subRight" ? "right" : "down";
            if (zone !== "insideSub") setSubDir(dir);
            const dragPath = d.path;
            const pool = rightPaths.filter((p) => p !== dragPath);
            // 副格 = 拖的标签
            setSubPaths([dragPath]);
            setSubActive(dragPath);
            // 主格 = 剩余标签；若剩余为空，则主格也放拖的标签（防御：不分空格）
            if (pool.length) {
              setRightPaths(pool);
              // 主格激活 = 若当前激活被拖走则取 pool[0]，否则保持
              setRightActivePath((ra) => (ra === dragPath ? pool[0] : ra));
            } else {
              // 无剩余：退化为单格（不拆），只把拖的标签设为右栏激活
              setSubPaths([]);
              setSubActive(null);
              setRightActivePath(dragPath);
            }
          } else if (zone === "sort") {
            const idx = d.dropIdx != null ? d.dropIdx : -1;
            if (!d.isRight) {
              const from = tabs.findIndex((x) => x.path === d.path);
              if (from >= 0 && idx >= 0) {
                const dest = Math.max(0, Math.min(tabs.length - 1, idx > from ? idx - 1 : idx));
                if (dest !== from) {
                  setTabs((prev) => { const next = prev.slice(); const [m] = next.splice(from, 1); next.splice(dest, 0, m); return next; });
                  setFsStatus("已调整标签顺序"); setFsStatusStyle({ color: C.dim });
                }
              }
            } else if (idx >= 0 && d.isRight) {
              // 右栏标签排序：重排 rightPaths
              const from = rightPaths.indexOf(d.path);
              if (from >= 0) {
                const dest = Math.max(0, Math.min(rightPaths.length - 1, idx > from ? idx - 1 : idx));
                if (dest !== from) {
                  setRightPaths((prev) => { const next = prev.slice(); const [m] = next.splice(from, 1); next.splice(dest, 0, m); return next; });
                  setFsStatus("已调整右栏标签顺序"); setFsStatusStyle({ color: C.dim });
                }
              }
            }
          }
          setDropIdx(null);
        }
        tabDragRef.current = null;
        document.removeEventListener("mousemove", tabDragMove);
        document.removeEventListener("mouseup", tabDragUp);
        window.removeEventListener("blur", tabDragUp);
      };
      const tabMouseDown = (e, t, tabList, stripEl, stripKey, isRight) => {
        if (e.button === 1) { e.preventDefault(); if (isRight) closeSplit(); else closeTab(t.path); return; }
        if (e.button !== 0) return;
        tabDragRef.current = { path: t.path, strip: stripKey, startX: e.clientX, dragging: false, stripEl, isRight };
        document.addEventListener("mousemove", tabDragMove);
        document.addEventListener("mouseup", tabDragUp);
        window.addEventListener("blur", tabDragUp);   // 兜底清理
      };
      // 计算指针落在 tab 列表中的插入下标（元素级，兼容 scroll）
      const computeDropIndex = (e, els) => {
        const x = e.clientX;
        for (let i = 0; i < els.length; i++) {
          const r = els[i].getBoundingClientRect();
          if (x < r.left + r.width / 2) return i;
        }
        return els.length;
      };
      /* 活动标签必须始终可见：标签多到溢出时把它滚进视野（VSCode 同款行为）。
         不用 scrollIntoView —— 它会连带滚动祖先容器（全屏 overlay 里会把整页顶走），
         而且不会给右端固定的工具组留出位置。这里自己做夹紧计算。
         只动标签条的 scrollLeft，绝不动代码视图/光标。 */
      const tabStripRefs = React.useRef({});
      const scrollTabIntoView = (strip, path) => {
        if (!strip || !path || typeof strip.children === "undefined") return;
        let el = null, tools = null;
        for (let i = 0; i < strip.children.length; i++) {
          const k = strip.children[i];
          if (!k || typeof k.getAttribute !== "function") continue;
          if (!el && k.getAttribute("data-path") === path) el = k;
          if (!tools && k.getAttribute("data-tools") === "1") tools = k;
        }
        if (!el) return;
        const reserve = tools ? (tools.offsetWidth || 0) : 0;
        const width = strip.clientWidth || 0;
        if (width <= 0) return;
        const left = el.offsetLeft || 0;
        const right = left + (el.offsetWidth || 0);
        const viewL = strip.scrollLeft || 0;
        const viewR = viewL + width - reserve;
        if (left < viewL) strip.scrollLeft = Math.max(0, left - 4);
        else if (right > viewR) {
          /* 标签比可视区还宽（超长文件名，或左侧栏拉得很宽）：露出名字开头，别把开头滚掉 */
          strip.scrollLeft = (el.offsetWidth > width - reserve)
            ? Math.max(0, left - 4)
            : (right - width + reserve + 4);
        }
      };
      const renderTabStrip = (tabList, active, rightMode, stripKey, onTabClick) => {
        const children = [];
        const isRight = rightMode;
        tabList.forEach((t) => {
          const isActive = t.path === active;
          children.push(React.createElement("div", {
            key: "tab:" + t.path + (isRight ? ":r" : ""),
            // 指针事件拖放（绕过 HTML5 DnD，后者在本环境 drop 丢失）
            onMouseDown: (e) => tabMouseDown(e, t, tabList, e.currentTarget.parentElement, stripKey, isRight),
            onClick: () => { 
              if (!isRight) { 
                setActivePath(t.path); 
                setJumpLine(0); 
                // ⑭ 点标签 → 仅当左栏在 Explorer 时，才自动定位到该文件所在目录
                if (leftTab === "explorer") revealInTree(t.path);
              } else if (onTabClick) { 
                onTabClick(t.path); 
              }
            },
            onContextMenu: (e) => openContext(e, t.path),
            "data-tab": "1",
            "data-path": t.path,
            style: {
              display: "flex", alignItems: "center", gap: 6, padding: "0 8px 0 12px", height: 35, cursor: "pointer",
              background: isActive ? "#202122" : "transparent",
              color: isActive ? "#fff" : "#b5b5b5",
              borderTop: "2px solid " + (isActive ? "#3994BC" : "transparent"),
              borderRight: "1px solid #3C3C3C",
              fontSize: 12, whiteSpace: "nowrap", flexShrink: 0,
              fontStyle: t.pinned ? "normal" : "italic",
              userSelect: "none"
            }
          },
            React.createElement("span", { style: { fontSize: 10, flexShrink: 0, color: t.dirty ? "#d19a66" : "#4e8e4e" } }, t.dirty ? "●" : "🟩"),
            React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis" } }, basename(t.path)),
            t.encoding === "gbk" ? React.createElement("span", { style: { fontSize: 9, color: "#6a9a5a", border: "1px solid #4a6a40", borderRadius: 3, padding: "0 3px", flexShrink: 0 } }, "GBK") : null,
            React.createElement("span", {
              onClick: (e) => {
                e.stopPropagation();
                if (isRight) {
                  // 右栏 ✕：直接关闭文件（closeTab 会同时从 tabs 和右栏移除）
                  closeTab(t.path);
                } else {
                  closeTab(t.path);
                }
              },
              onMouseEnter: (e) => { e.currentTarget.style.background = "#3C3C3C"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
              style: { fontSize: 11, color: "#9a9a9a", cursor: "pointer", padding: "1px 5px", borderRadius: 3, flexShrink: 0 },
              title: "关闭 (Ctrl+W)"
            }, "✕")));
        });
        if (isRight) {
          // 右侧组工具：⇄ 互换 / 关闭拆分
          children.push(React.createElement("div", {
            key: "tools-r",
            "data-tools": "1",
            style: { display: "flex", alignItems: "center", padding: "0 6px", marginLeft: "auto", gap: 2, flexShrink: 0, position: "sticky", right: 0, zIndex: 3, background: "#191A1B" }
          },
            React.createElement("span", {
              onClick: () => { if (rightPaths.length > 0) { setSplitDir((d) => (d === "down" ? "right" : "down")); setFsStatus(splitDir === "down" ? "已切换为左右并排" : "已切换为上下堆叠"); setFsStatusStyle({ color: C.dim }); } },
              title: splitDir === "down" ? "当前为上下堆叠，点击切换为左右并排" : "当前为左右并排，点击切换为上下堆叠",
              style: { fontSize: 12, color: "#8a8a8a", cursor: "pointer", padding: "2px 5px", borderRadius: 3 },
              onMouseEnter: (e) => { e.currentTarget.style.background = "#3C3C3C"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
            }, splitDir === "down" ? "⇕ 上下" : "⇔ 左右"),
            React.createElement("span", {
              onClick: swapSides,
              title: "两组文件互换",
              style: { fontSize: 12, color: "#8a8a8a", cursor: "pointer", padding: "2px 5px", borderRadius: 3 },
              onMouseEnter: (e) => { e.currentTarget.style.background = "#3C3C3C"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
            }, "⇄"),
            React.createElement("span", {
              onClick: closeSplit,
              title: "关闭拆分 (Ctrl+\\)",
              style: { fontSize: 12, color: "#8a8a8a", cursor: "pointer", padding: "2px 5px", borderRadius: 3 },
              onMouseEnter: (e) => { e.currentTarget.style.background = "#3C3C3C"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
            }, "✕")));
        } else {
          /* 标签栏末尾工具组（对齐 VSCode Editor Toolbar）：💾 全部保存（有标签时）+ ✨ 打开对话（始终显示） */
          const tools = [];
          if (tabs.length) {
            tools.push(React.createElement("span", {
              key: "save-all",
              onClick: saveAll,
              title: "全部保存",
              style: { display: "flex", alignItems: "center", padding: "2px 6px", cursor: "pointer", color: "#8a8a8a", fontSize: 14, borderRadius: 3 },
              onMouseEnter: (e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "#3C3C3C"; },
              onMouseLeave: (e) => { e.currentTarget.style.color = "#8a8a8a"; e.currentTarget.style.background = "transparent"; }
            }, "💾"));
          }
          tools.push(React.createElement("span", {
            key: "open-chat",
            // ✨ = 打开对话面板（对齐 VSCode：Spark 图标点击即打开 Claude 面板，关闭由面板自己的 ✕ 负责）
            onClick: () => setChatOpen(true),
            title: "打开对话",
            style: { display: "flex", alignItems: "center", padding: "2px 6px", cursor: "pointer", color: chatOpen ? "#3994BC" : "#8a8a8a", fontSize: 13, borderRadius: 3 },
            onMouseEnter: (e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "#3C3C3C"; },
            onMouseLeave: (e) => { e.currentTarget.style.color = chatOpen ? "#3994BC" : "#8a8a8a"; e.currentTarget.style.background = "transparent"; }
          }, "✨"));
          /* 源代码管理（本地 Git）：与 💾/✨ 同一组，图标 🌿。此前只有 scmOpen 状态而没有任何
             调用点，用户看不到面板（2026-09-22 补入口）。 */
          tools.push(React.createElement("span", {
            key: "scm-toggle",
            onClick: () => setScmOpen(!scmOpen),
            title: scmOpen && scmVisible ? "关闭源代码管理面板" : "打开源代码管理面板（本地 Git 版本回退）",
            style: { display: "flex", alignItems: "center", padding: "2px 6px", cursor: "pointer", color: (scmOpen && scmVisible) ? "#3994BC" : "#8a8a8a", fontSize: 14, borderRadius: 3 },
            onMouseEnter: (e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "#3C3C3C"; },
            onMouseLeave: (e) => { e.currentTarget.style.color = (scmOpen && scmVisible) ? "#3994BC" : "#8a8a8a"; e.currentTarget.style.background = "transparent"; }
          }, "🌿"));
          children.push(React.createElement("div", {
            key: "tools-l",
            "data-tools": "1",
            style: { display: "flex", alignItems: "center", gap: 2, padding: "0 8px", marginLeft: "auto", flexShrink: 0, position: "sticky", right: 0, zIndex: 3, background: "#191A1B" }
          }, ...tools));
        }
        // 插入位竖线：用 absolute overlay（不插入 tabs children —— 避免拖拽进行中插入/移动 DOM 节点把 drag 打断导致 drop 不触发）
        if (dropIdx && dropIdx.strip === stripKey && dropIdx.left != null) {
          children.push(React.createElement("div", {
            key: "dropline:" + stripKey,
            style: { position: "absolute", left: dropIdx.left, top: 0, bottom: 0, width: 2, background: "#3994BC", pointerEvents: "none", zIndex: 4 }
          }));
        }
        return React.createElement("div", {
          className: "carddesk-tabstrip",
          ref: (el) => { tabStripRefs.current[stripKey] = el; },
          style: { display: "flex", flexDirection: "row", alignItems: "stretch", background: "#191A1B", borderBottom: "1px solid #2A2B2C", overflowX: "auto", minHeight: 35, scrollbarWidth: "thin", flexShrink: 0, minWidth: 0, position: "relative" },
          onDragOver: (e) => {
            e.preventDefault();
            e.stopPropagation();
            try { e.dataTransfer.dropEffect = "move"; } catch (err) { }
            const src = dragPathRef.current;
            if (!src) return;
            // 注意：不调用 setDropIdx（避免 React 重渲染打断 HTML5 拖放导致 drop 不触发）
            if (isRight && !rightPaths.includes(src)) setDragOverEdge("right");
          },
          onDragLeave: (e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              if (dropIdx && dropIdx.strip === stripKey) setDropIdx(null);
            }
          },
          onDrop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            const src = dragPathRef.current;
            if (!src) return;
            if (isRight) {
              // drop 到第二组标签条 → 追加到右栏并激活
              if (!rightPaths.includes(src)) openIntoRight(src);
            } else {
              const kids = Array.from(e.currentTarget.children).filter((k) => k.getAttribute && k.getAttribute("draggable") === "true");
              const idx = computeDropIndex(e, kids);
              const from = tabs.findIndex((t) => t.path === src);
              if (from < 0) { dragEnd(); return; }
              // dest = 移动后的目标下标（idx 是“插到该 tab 前”的语义）
              const dest = Math.max(0, Math.min(tabs.length - 1, idx > from ? idx - 1 : idx));
              if (dest === from) {
                dragEnd();
                setFsStatus("标签已在目标位置，无需移动"); setFsStatusStyle({ color: C.dim });
                return;
              }
              setTabs((prev) => {
                const next = prev.slice();
                const [m] = next.splice(from, 1);
                next.splice(dest, 0, m);
                return next;
              });
              setFsStatus("已调整标签顺序"); setFsStatusStyle({ color: C.dim });
            }
            dragEnd();
          },
          onDragEnd: dragEnd
        }, children);
      };
      /* 打开/切换/关闭标签后，把活动标签滚进视野。只动标签条，不动代码视图与光标。
         标签宽度由文件名长度决定，首帧可能还没量准，所以 rAF 之后再补一次。 */
      React.useEffect(() => {
        const run = () => {
          try {
            scrollTabIntoView(tabStripRefs.current["l"], activePathRef.current);
            scrollTabIntoView(tabStripRefs.current["r"], rightActivePath);
          } catch (e) { }
        };
        let raf = null;
        try { raf = requestAnimationFrame(run); } catch (e) { raf = setTimeout(run, 16); }
        const t2 = setTimeout(run, 60);
        return () => {
          try { if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf); else clearTimeout(raf); } catch (e) { }
          clearTimeout(t2);
        };
      }, [activePath, tabs.length, rightActivePath, rightPaths.length]);

      /* ---- 顶栏与左栏 ---- */
      const leftHead = React.createElement("div", { style: { padding: "8px 10px", borderBottom: "1px solid #2A2B2C", display: "flex", flexDirection: "column", gap: 6, background: C.sideBg } },
        React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: "#e8e8e8", display: "flex", alignItems: "center", gap: 6 } },
          React.createElement("span", null, "🗂 工作区"),
          React.createElement("span", { style: { marginLeft: "auto", fontSize: 10, color: "#808080" } }, folders.length + " 个工程")),
        React.createElement("div", { style: { display: "flex", gap: 4 } },
          React.createElement("button", {
            onClick: pickWorkspace,
            style: { flex: 1, background: "#3994BC", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12, textAlign: "center" },
            onMouseEnter: (e) => { e.currentTarget.style.background = "#2F7E9F"; },
            onMouseLeave: (e) => { e.currentTarget.style.background = "#3994BC"; }
          }, "📂 添加文件夹"),
          React.createElement("button", {
            onClick: importVivado,
            style: { background: "#2A2B2C", color: C.text, border: "1px solid #3C3C3C", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap", flexShrink: 0 }
          }, "导入 Vivado")),
        React.createElement("div", { style: { display: "flex", gap: 4 } },
          React.createElement("input", {
            value: pathInput,
            onChange: (e) => setPathInput(e.target.value),
            onKeyDown: (e) => { if (e.key === "Enter") loadPathInput(); },
            placeholder: "输入目录路径（加入工作区）",
            spellCheck: false,
            style: {
              flex: 1, minWidth: 0, background: "#2A2B2C", color: C.text,
              border: "1px solid #2A2B2C", borderRadius: 4, padding: "3px 6px",
              fontSize: 11, outline: "none"
            }
          }),
          React.createElement("button", {
            onClick: loadPathInput,
            style: { background: "#2A2B2C", color: C.text, border: "1px solid #3C3C3C", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11, flexShrink: 0 }
          }, "加入")));

      const LEFT_TAB_TITLE = {
        explorer: "工作区文件树（按工作目录浏览、新建/重命名/删除文件）",
        hierarchy: "工程级模块层次：跨文件扫描整个工作区，画出顶层模块与例化关系",
        outline: "大纲：只看【当前打开的这个文件】—— 结构树（可折叠代码块）+ 模块/实例列表"
      };
      const leftTabs = React.createElement("div", { style: { display: "flex", background: C.sideBg, borderBottom: "1px solid " + C.border } },
        (["explorer", "hierarchy", "outline"]).map((k) => React.createElement("button", {
          key: k,
          onClick: () => setLeftTab(k),
          title: LEFT_TAB_TITLE[k],
          style: {
            flex: 1, background: "transparent", border: "none", cursor: "pointer", padding: "8px 4px",
            color: leftTab === k ? "#fff" : "#9d9d9d", fontSize: 12, fontWeight: leftTab === k ? 600 : 400,
            borderBottom: leftTab === k ? "2px solid #3994BC" : "2px solid transparent",
            textTransform: "uppercase", letterSpacing: 0.5
          }
        }, k === "explorer" ? "📁 Explorer" : (k === "hierarchy" ? "🏛 Hierarchy" : "📑 大纲"))));

      const explorerPane = React.createElement("div", { style: { flex: 1, overflow: "auto", padding: 4, minHeight: 0, background: C.sideBg } },
        renderExplorerWorkspace(),
        fsBusy ? React.createElement("div", { style: { fontSize: 12, color: C.accent, padding: 8 } }, "⏳ 读取中…") : null);
      const hierPane = React.createElement("div", { style: { flex: 1, overflow: "auto", padding: 4, minHeight: 0, background: C.sideBg } },
        hierLoading ? React.createElement("div", { style: { fontSize: 12, color: C.accent, padding: 8 } }, "⏳ 扫描中…") : null,
        renderHierarchyWorkspace());
      // ⑫ 大纲：当前活动文件的 module/instance 列表，点击跳行
      const outlineItems = React.useMemo(() => parseOutline(activeText), [activeText]);
      /* ㉜ 结构树（代码折叠的等价物）：嵌套层级可折叠 + 点击跳转 */
      const structItems = React.useMemo(() => parseStructure(activeText), [activeText]);
      const [outlineMode, setOutlineMode] = React.useState("struct");   // struct | modules
      /* 折叠状态采用【显式展开】语义：未记录且有子节点的节点 = 默认折叠。
         因此打开文件时结构树初始为"全折叠"（只露顶层），逐层点箭头展开，避免一屏铺开太乱。 */
      const [structOpen, setStructOpen] = React.useState({}); // { 起始行: true } = 已展开
      // 切换文件 → 折叠状态清零（新文件回到"全折叠"初始态）
      React.useEffect(() => { setStructOpen({}); }, [activePath]);
      // 每个节点是否有子节点（下一个节点更深且落在本节点范围内）
      const structHasChild = React.useMemo(() => {
        const m = {};
        for (let i = 0; i < structItems.length; i++) {
          const cur = structItems[i];
          const nxt = structItems[i + 1];
          if (nxt && nxt.depth > cur.depth && (!cur.endLine || nxt.line <= cur.endLine)) m[cur.line] = true;
        }
        return m;
      }, [structItems]);
      // 可折叠的行（有子节点的节点），供"全部折叠/展开"使用
      const structFoldable = React.useMemo(
        () => structItems.filter((it) => structHasChild[it.line]).map((it) => it.line),
        [structItems, structHasChild]);
      const KIND_ICON = { module: "ƒ", macromodule: "ƒ", program: "ƒ", interface: "⬡", package: "⬡", class: "C", function: "ƒ", task: "T", generate: "⚙", begin: "▸", case: "❓", casex: "❓", casez: "❓", fork: "⑂", property: "P", sequence: "S", covergroup: "G", clocking: "⏱", checker: "✓", specify: "≡", table: "▦", primitive: "▣", always: "⚡", always_ff: "⚡", always_comb: "⚡", always_latch: "⚡", initial: "▶", final: "■", if: "?", else: "?", for: "↻", while: "↻", foreach: "↻", repeat: "↻" };
      // 从行内容推导更准确的类型（begin 块按所属语句显示，如 always / if / else）
      const kindOf = (it) => {
        const m = /^(always_ff|always_comb|always_latch|always|initial|final|if|else|for|while|foreach|repeat|case|casex|casez|function|task|generate|module|interface|package|class|fork|begin)\b/.exec(String(it.label || "").trim());
        return m ? m[1] : it.kind;
      };
      const renderStructRows = () => {
        const rows = [];
        const folded = [];   // 生效中的折叠节点栈
        for (let i = 0; i < structItems.length; i++) {
          const it = structItems[i];
          // 越过折叠区范围 → 出栈（endLine 为 0 = 未闭合，视为延伸到文件末尾，否则折叠会立刻失效）
          while (folded.length && it.line > (folded[folded.length - 1].endLine || Infinity)) folded.pop();
          // 落在折叠区内 → 隐藏（不渲染）
          if (folded.length && it.depth > folded[folded.length - 1].depth) continue;
          const hasChild = !!structHasChild[it.line];
          // 默认折叠：只有被显式展开过的节点才展开
          const isFolded = hasChild && !structOpen[it.line];
          const pad = 4 + (it.depth - 1) * 12;
          rows.push(React.createElement("div", {
            key: "st" + it.line + "-" + i,
            onClick: () => { if (activePath) setJumpLine(it.line); },
            title: "第 " + it.line + (it.endLine ? "–" + it.endLine : "") + " 行：点击跳转" + (hasChild ? "，点左侧箭头展开/折叠" : ""),
            style: { display: "flex", alignItems: "center", gap: 4, paddingTop: 2, paddingBottom: 2, paddingRight: 6, paddingLeft: pad, cursor: "pointer", fontSize: 12, borderRadius: 3, whiteSpace: "nowrap", overflow: "hidden", color: "#BBBEBF" },
            onMouseEnter: (e) => { e.currentTarget.style.background = "rgba(57,148,188,.16)"; },
            onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
          },
            React.createElement("span", {
              onClick: (e) => {
                e.stopPropagation();
                if (!hasChild) return;
                setStructOpen((prev) => { const n = { ...prev }; if (n[it.line]) delete n[it.line]; else n[it.line] = true; return n; });
              },
              style: { width: 12, flexShrink: 0, textAlign: "center", color: hasChild ? "#8a8a8a" : "transparent", cursor: hasChild ? "pointer" : "default", fontSize: 10 }
            }, hasChild ? (isFolded ? "▸" : "▾") : "·"),
            React.createElement("span", { style: { flexShrink: 0, fontSize: 10, color: "#858889" } }, (KIND_ICON[kindOf(it)] || "•") + " "),
            React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 } }, it.label || it.kind),
            React.createElement("span", { style: { flexShrink: 0, fontSize: 10, color: "#858889" } }, it.endLine && it.endLine !== it.line ? (it.line + "–" + it.endLine) : it.line)));
          // 本节点被折叠 → 压栈，使其后落在本范围内的更深节点被隐藏
          if (isFolded) folded.push(it);
        }
        return rows;
      };
      const outlinePane = React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: C.sideBg } },
        /* 作用范围提示：本面板只反映【当前活动文件】，与 Hierarchy（跨文件工程层次）不同 */
        React.createElement("div", {
          style: { padding: "4px 8px", fontSize: 11, color: "#858889", borderBottom: "1px solid #2A2B2C", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
          title: "大纲 = 当前打开的这个文件内部的结构与模块，点击任意行可跳转"
        }, "当前文件：" + (activePath ? basename(activePath) : "（未打开）")),
        /* 视图切换 + 全部折叠/展开 */
        React.createElement("div", { style: { display: "flex", gap: 2, padding: "4px 6px", borderBottom: "1px solid #2A2B2C", flexShrink: 0 } },
          React.createElement("button", {
            onClick: () => setOutlineMode("struct"),
            title: "结构树：本文件内可折叠的代码块（module / always / begin / case / function …），点行跳转、点箭头展开",
            style: { flex: 1, background: outlineMode === "struct" ? "#3994BC" : "transparent", color: outlineMode === "struct" ? "#fff" : "#9d9d9d", border: "1px solid #3C3C3C", borderRadius: 3, padding: "2px 6px", cursor: "pointer", fontSize: 11 }
          }, "结构树"),
          React.createElement("button", {
            onClick: () => setOutlineMode("modules"),
            title: "模块/实例：本文件定义的 module 与它例化的子模块，点行跳转",
            style: { flex: 1, background: outlineMode === "modules" ? "#3994BC" : "transparent", color: outlineMode === "modules" ? "#fff" : "#9d9d9d", border: "1px solid #3C3C3C", borderRadius: 3, padding: "2px 6px", cursor: "pointer", fontSize: 11 }
          }, "模块/实例"),
          /* 全部折叠 / 全部展开（仅结构树视图有意义） */
          React.createElement("button", {
            onClick: () => setStructOpen({}),
            disabled: outlineMode !== "struct",
            title: "全部折叠",
            style: { flexShrink: 0, width: 24, background: "transparent", color: outlineMode === "struct" ? "#9d9d9d" : "#5a5a5a", border: "1px solid #3C3C3C", borderRadius: 3, padding: "2px 0", cursor: outlineMode === "struct" ? "pointer" : "default", fontSize: 11, lineHeight: "14px" }
          }, "⊟"),
          React.createElement("button", {
            onClick: () => { const n = {}; for (const ln of structFoldable) n[ln] = true; setStructOpen(n); },
            disabled: outlineMode !== "struct",
            title: "全部展开",
            style: { flexShrink: 0, width: 24, background: "transparent", color: outlineMode === "struct" ? "#9d9d9d" : "#5a5a5a", border: "1px solid #3C3C3C", borderRadius: 3, padding: "2px 0", cursor: outlineMode === "struct" ? "pointer" : "default", fontSize: 11, lineHeight: "14px" }
          }, "⊞")),
        React.createElement("div", { style: { flex: 1, overflow: "auto", padding: 4, minHeight: 0 } },
          !activeTab
            ? React.createElement("div", { style: { fontSize: 12, color: "#858889", padding: 8, lineHeight: "17px" } },
              "打开文件后显示：", React.createElement("br"), "· 结构树：可折叠的代码块", React.createElement("br"), "· 模块/实例：本文件模块与例化")
            : outlineMode === "struct"
              ? (structItems.length === 0
                ? React.createElement("div", { style: { fontSize: 12, color: "#858889", padding: 8 } }, "未检测到可折叠结构（module / begin / case / function …）")
                : renderStructRows())
              : (outlineItems.length === 0
                ? React.createElement("div", { style: { fontSize: 12, color: "#858889", padding: 8, lineHeight: "17px" } },
                  "未检测到 module / 例化。", React.createElement("br"), "（若本文件只是纯逻辑文件、不含模块定义与例化，这里是空的）")
                : React.createElement("div", null,
                  /* 统计：一眼看出本文件定义了几个模块、例化了几个子模块 */
                  React.createElement("div", { style: { fontSize: 10, color: "#858889", padding: "2px 6px 4px" } },
                    outlineItems.filter((x) => x.kind === "module").length + " 个模块定义 · " +
                    outlineItems.filter((x) => x.kind === "instance").length + " 个例化"),
                  outlineItems.map((oi, oiIdx) => {
                    const isMod = oi.kind === "module";
                    const isExt = !isMod && oi.ext;
                    const col = isMod ? "#BBBEBF" : (isExt ? "#9d9d9d" : "#BBBEBF");
                    return React.createElement("div", {
                      key: oiIdx,
                      onClick: () => { if (activePath) setJumpLine(oi.line); },
                      title: isMod
                        ? "本文件定义的模块 " + oi.name + "，跳转到第 " + oi.line + " 行"
                        : "例化 " + oi.name + "（类型 " + (oi.extra || "?") + (isExt ? "，定义在其他文件" : "，本文件内定义") + "），跳转到第 " + oi.line + " 行",
                      style: { display: "flex", alignItems: "center", gap: 6, padding: "3px 6px", cursor: "pointer", fontSize: 12, color: col, borderRadius: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingLeft: isMod ? 6 : 18 },
                      onMouseEnter: (e) => { e.currentTarget.style.background = "rgba(57,148,188,.16)"; },
                      onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
                    },
                      React.createElement("span", { style: { fontSize: 11, color: col, flexShrink: 0 } }, (isMod ? "ƒ " : "◇ ") + oi.name),
                      oi.extra ? React.createElement("span", { style: { fontSize: 10, color: "#858889", overflow: "hidden", textOverflow: "ellipsis" } }, ": " + oi.extra) : null,
                      React.createElement("span", { style: { marginLeft: "auto", fontSize: 10, color: "#858889", flexShrink: 0 } }, oi.line));
                  })))));

      const onKeyDown = (e) => {
        const k = (e.key || "").toLowerCase();
        // 命令面板：F1 / Ctrl+Alt+P / Ctrl+Shift+P
        // 说明：Ctrl+Shift+P 是浏览器保留快捷键（新建无痕窗口），网页收不到 —— 在浏览器里请用 F1 或 Ctrl+Alt+P；
        // DSH 的 Electron 客户端（DSH.exe）没有浏览器 UI，Ctrl+Shift+P 可正常使用。
        if (e.key === "F1" || ((e.ctrlKey || e.metaKey) && e.altKey && k === "p")) {
          e.preventDefault();
          e.stopPropagation();
          openCmdPalette();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && k === "p") {
          e.preventDefault();
          e.stopPropagation();
          openCmdPalette();
          return;
        }
        // F12 转到定义（Verilog 模块 / 声明）
        if (e.key === "F12") {
          e.preventDefault();
          e.stopPropagation();
          gotoDefinition();
          return;
        }
        /* F8：列（矩形）选择模式开关。放在工作台层是为了不依赖“焦点在编辑器 textarea 里”：
           焦点在文件树/状态栏/分栏空白处时也能开。编辑器内按 F8 由 CodePane 自己处理并
           stopPropagation，不会走到这里重复切换。 */
        if (e.key === "F8") {
          e.preventDefault();
          e.stopPropagation();
          fireColModeToggle();
          return;
        }
        // Ctrl+` 打开/关闭集成终端（VSCode 习惯）
        if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "`" || e.key === "~" || k === "`")) {
          e.preventDefault();
          e.stopPropagation();
          setTermOpen((v) => !v);
          return;
        }
        // Ctrl+K 前缀组合（VSCode chord）：Ctrl+K 后 2s 内按第二键
        if ((e.ctrlKey || e.metaKey) && !e.altKey && k === "k") {
          e.preventDefault();
          e.stopPropagation();
          clearKChord();
          kChordRef.current = true;
          kChordTimerRef.current = setTimeout(clearKChord, 2000);
          return;
        }
        if (kChordRef.current) {
          const chord = (e.ctrlKey || e.metaKey) ? true : false;
          if (e.key === "Enter") {
            e.preventDefault(); e.stopPropagation(); clearKChord();
            if (activePath) togglePin(activePath);
            return;
          }
          if (chord) {
            if (k === "w") { e.preventDefault(); e.stopPropagation(); clearKChord(); closeAll(); return; }
            if (k === "s") { e.preventDefault(); e.stopPropagation(); clearKChord(); saveAll(); return; }
            if (k === "u") { e.preventDefault(); e.stopPropagation(); clearKChord(); closeSaved(); return; }
            if (e.shiftKey && k === "c") { e.preventDefault(); e.stopPropagation(); clearKChord(); if (activePath) copyRelPath(activePath); return; }
            // Ctrl+K Ctrl+O 添加文件夹到工作区 / Ctrl+K Ctrl+F 关闭工作区（命令面板已列出，此前漏接）
            if (k === "o") { e.preventDefault(); e.stopPropagation(); clearKChord(); pickWorkspace(); return; }
            if (k === "f") { e.preventDefault(); e.stopPropagation(); clearKChord(); closeWorkspace(); return; }
            if (k === "enter" || (e.keyCode === 13)) { e.preventDefault(); e.stopPropagation(); clearKChord(); if (activePath) togglePin(activePath); return; }
            /* Ctrl+K 已武装但第二键未绑定：必须吞掉这一次，否则会穿透到下面的普通快捷键
               （实测 Ctrl+K → Ctrl+P 会照常打开快速打开文件），且 kChord 会残留到 2s 超时。 */
            e.preventDefault(); e.stopPropagation(); clearKChord(); return;
          }
        }
        if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && k === "w") {
          e.preventDefault();
          e.stopPropagation();
          if (activePath) closeTab(activePath);
        }
        // Ctrl+Alt+S：另存为（必须放在 Ctrl+S 之前，且 Ctrl+S 需排除 altKey，否则会被普通保存吞掉）
        if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && k === "s") {
          e.preventDefault();
          e.stopPropagation();
          if (activeTab) saveAsWithDialog();
        }
        if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && k === "s") {
          e.preventDefault();
          e.stopPropagation();
          saveFile(activePath);
        }
        // Ctrl+Alt+N：在当前目录新建文本文件（Ctrl+N 被浏览器保留为"打开新窗口"，无法拦截，改用此组合）
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.altKey && k === "n") {
          e.preventDefault();
          e.stopPropagation();
          newFileInDir();
        }
        if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && k === "o") {
          e.preventDefault();
          e.stopPropagation();
          openPathDlg("openFile");
        }
        // ⑪ Ctrl+P 快速打开
        if ((e.ctrlKey || e.metaKey) && !e.altKey && k === "p") {
          e.preventDefault();
          e.stopPropagation();
          openQuickPick();
        }
        if (qpOpen && k === "escape") {
          e.preventDefault(); e.stopPropagation();
          closeQuickPick();
        }
        if (qpOpen && k === "arrowdown") {
          e.preventDefault(); e.stopPropagation();
          if (qpMatches.length) setQpSel((v) => Math.min(v + 1, qpMatches.length - 1));
        }
        if (qpOpen && k === "arrowup") {
          e.preventDefault(); e.stopPropagation();
          setQpSel((v) => Math.max(v - 1, 0));
        }
        if (qpOpen && k === "enter") {
          e.preventDefault(); e.stopPropagation();
          const it = qpMatches[qpSel];
          if (it) qpPick(it.p);
        }
        /* Ctrl+Z 撤销 / Ctrl+Y（或 Ctrl+Shift+Z）重做：焦点不在编辑器里（刚点过文件树/状态栏）时的兜底。
           编辑器内这两个键已在 CodePane 的 taKeyDown 里 stopPropagation，不会走到这里重复执行。 */
        if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && k === "z") {
          e.preventDefault(); e.stopPropagation(); fireUndoKey(-1); return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.altKey && ((k === "z" && e.shiftKey) || k === "y")) {
          e.preventDefault(); e.stopPropagation(); fireUndoKey(1); return;
        }
        // ⑨ Ctrl+F 查找 / Ctrl+H 替换 / Ctrl+Shift+F 在文件中查找
        //（textarea 内已在 CodePane 自行处理并 stopPropagation，这里兜底：焦点在编辑器外时作用于活动文件）
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && k === "f") {
          e.preventDefault();
          e.stopPropagation();
          fireFind("files");
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && k === "f") {
          e.preventDefault();
          e.stopPropagation();
          fireFind("find");
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && k === "h") {
          e.preventDefault();
          e.stopPropagation();
          fireFind("replace");
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === "Backslash") {
          e.preventDefault();
          e.stopPropagation();
          if (activePath) splitToRight(activePath);
        }
        // ⑯ Ctrl+Shift+\ 上下堆叠拆分（第二组在下方）；用 e.code 兼容不同键盘布局
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "Backslash") {
          e.preventDefault();
          e.stopPropagation();
          if (activePath) splitToDown(activePath);
        }
        // Shift+Alt+R：在文件资源管理器中显示当前文件
        if (e.shiftKey && e.altKey && k === "r") {
          e.preventDefault();
          e.stopPropagation();
          if (activePath) revealInExplorer(activePath);
        }
        // Shift+Alt+C：复制当前文件路径
        if (e.shiftKey && e.altKey && k === "c") {
          e.preventDefault();
          e.stopPropagation();
          if (activePath) copyPath(activePath);
        }
      };

      // 全局 keydown 兜底：当焦点在工作台内时，拦截 Ctrl+N/O/S/P 等，防止浏览器默认行为（如 Ctrl+N 新建页面）
      React.useEffect(() => {
        const onGlobalKey = (e) => {
          // 只在焦点位于工作台根节点内时拦截（B 方案：不干扰工作台外部/聊天框）
          const root = workbenchRootRef.current;
          const inRoot = root ? root.contains(document.activeElement) : false;
          if (!inRoot) return;
          /* 捕获阶段先于 React 的冒泡 onKeyDown 执行，故分支必须与主处理器同样严格：
             原来未排除 altKey，导致 Ctrl+Alt+S（另存为）先被这里当成普通保存执行一次。 */
          if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
            const k = (e.key || "").toLowerCase();
            if (e.altKey && k === "n") { e.preventDefault(); e.stopPropagation(); newFileInDir(); }
            else if (k === "o") { e.preventDefault(); e.stopPropagation(); openPathDlg("openFile"); }
            else if (k === "s") { e.preventDefault(); e.stopPropagation(); saveFile(activePath); }
          }
        };
        document.addEventListener("keydown", onGlobalKey, true);
        return () => document.removeEventListener("keydown", onGlobalKey, true);
      }, [activePath]);

      /* ---- 布局 ---- */
      /* ㉚ 命令面板（Ctrl+Shift+P）：列出工作台所有命令，输入过滤，Enter 执行 */
      const [cmdOpen, setCmdOpen] = React.useState(false);
      const [cmdQ, setCmdQ] = React.useState("");
      const [cmdSel, setCmdSel] = React.useState(0);
      const cmdInputRef = React.useRef(null);
      const openCmdPalette = () => {
        setCmdOpen(true); setCmdQ(""); setCmdSel(0);
        setTimeout(() => { try { if (cmdInputRef.current) cmdInputRef.current.focus(); } catch (e) { } }, 30);
      };
      const closeCmdPalette = () => setCmdOpen(false);
      // Esc 兜底：挂在 document 捕获阶段。原来只挂在输入框的 onKeyDown 上，
      // 点一下列表空白处让输入框失焦后，Esc 就再也关不掉面板、输入也不再过滤。
      React.useEffect(() => {
        if (!cmdOpen) return;
        const onKey = (e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          e.stopPropagation();
          setCmdOpen(false);
        };
        document.addEventListener("keydown", onKey, true);
        return () => document.removeEventListener("keydown", onKey, true);
      }, [cmdOpen]);
      const runCmd = (it) => {
        if (!it) return;
        closeCmdPalette();
        setTimeout(() => { try { it.run(); } catch (e) { /* 忽略 */ } }, 0);
      };
      // 命令清单：全部映射到工作台已有动作（函数在此处调用时已全部初始化）
      const cmdList = () => {
        const list = [
          { label: "保存", kb: "Ctrl+S", run: () => saveFile(activePath), dis: !activeTab },
          { label: "全部保存", kb: "Ctrl+K S", run: saveAll, dis: !tabs.some((t) => t.dirty) },
          { label: "新建文本文件", kb: "Ctrl+Alt+N", run: () => newFileInDir() },
          { label: "打开文件…", kb: "Ctrl+O", run: () => openPathDlg("openFile") },
          { label: "打开文件夹…", kb: "", run: openFolderAsWorkspace },
          { label: "另存为…", kb: "Ctrl+Alt+S", run: saveAsWithDialog, dis: !activeTab },
          { label: "还原文件（丢弃未保存的修改）", kb: "", run: revertActiveFile, dis: !activeTab || !activeTab.dirty },
          { label: "列模式（矩形选择：拖拽即选列）", kb: "F8", run: fireColModeToggle },
        { label: "修复注释乱码：UTF-8 → GBK（Vivado 用）", kb: "", run: () => fixCommentEncoding("gbk"), dis: !activeTab },
        { label: "转为 UTF-8（VS Code / 本工具用）", kb: "", run: () => fixCommentEncoding("utf8"), dis: !activeTab },
          { sep: true },
          { label: "快速打开文件", kb: "Ctrl+P", run: () => { openQuickPick(); } },
          { label: "格式化当前文件（FPGA）", kb: "", run: () => openFmtPreview(), dis: !activeTab },
          { label: "端口一致性检查：整个工程（FPGA）", kb: "", run: () => runPortCheck("project") },
          { label: "端口一致性检查：当前文件（FPGA）", kb: "", run: () => runPortCheck("file"), dis: !activeTab },
          { label: "XDC 约束检查（FPGA）", kb: "", run: () => runXdcCheck() },
          { label: "转到定义", kb: "F12", run: gotoDefinition, dis: !activeTab },
          { label: "与当前文件比较（Diff）", kb: "", run: () => openDiff(activePath, (ctxMenu && ctxMenu.path) || ""), dis: !activeTab },
          { sep: true },
          { label: "切换集成终端", kb: "Ctrl+`", run: () => setTermOpen((v) => !v) },
          { label: "显示 Explorer", kb: "", run: () => setLeftTab("explorer") },
          { label: "显示 Hierarchy", kb: "", run: () => setLeftTab("hierarchy") },
          { label: "显示大纲", kb: "", run: () => setLeftTab("outline") },
          { label: (showAll ? "隐藏被过滤的文件" : "显示全部文件"), kb: "", run: () => setShowAll(!showAll) },
          { sep: true },
          { label: "拆分编辑器：向右", kb: "Ctrl+\\", run: () => splitToRight(activePath), dis: !activeTab },
          { label: "拆分编辑器：向下", kb: "Ctrl+Shift+\\", run: () => splitToDown(activePath), dis: !activeTab },
          { label: "切换拆分方向（左右 ⇄ 上下）", kb: "", run: () => setSplitDir((d) => (d === "down" ? "right" : "down")), dis: rightPaths.length === 0 },
          { label: "两组文件互换", kb: "", run: swapSides, dis: rightPaths.length === 0 },
          { label: "关闭拆分", kb: "", run: closeSplit, dis: rightPaths.length === 0 },
          { sep: true },
          { label: "关闭编辑器", kb: "Ctrl+W", run: () => closeTab(activePath), dis: !activeTab },
          { label: "关闭其他编辑器", kb: "", run: () => closeOthers(activePath), dis: !activeTab },
          { label: "关闭右侧编辑器", kb: "", run: () => closeRight(activePath), dis: !activeTab },
          { label: "关闭已保存的编辑器", kb: "Ctrl+K U", run: closeSaved },
          { label: "全部关闭", kb: "Ctrl+K W", run: closeAll },
          { label: "固定/取消固定当前标签", kb: "Ctrl+K Enter", run: () => togglePin(activePath), dis: !activeTab },
          { sep: true },
          { label: "打开对话面板", kb: "", run: () => setChatOpen(true) },
          { label: "新建对话（当前工作区）", kb: "", run: () => { setChatOpen(true); if (workspacesService && typeof workspacesService.startSession === "function") { try { workspacesService.startSession(); } catch (e) { } } } },
          { label: "关闭对话面板", kb: "", run: () => setChatOpen(false) },
          { sep: true },
          { label: "将文件夹添加到工作区…", kb: "Ctrl+K Ctrl+O", run: pickWorkspace },
          { label: "导入运行中的 Vivado 工程", kb: "", run: () => importVivado() },
          { label: "打开最近工作区…", kb: "", run: () => { setRecentOpen(true); refreshRecents(); } },
          { label: "将工作区另存为…", kb: "", run: () => openPathDlg("wsSaveAs") },
          { label: "复制工作区", kb: "", run: duplicateWorkspace, dis: !folders.length },
          { label: "关闭工作区", kb: "Ctrl+K F", run: closeWorkspace }
        ];
        return list;
      };
      const cmdFiltered = React.useMemo(() => {
        if (!cmdOpen) return [];
        const all = cmdList();
        const q = String(cmdQ || "").trim().toLowerCase();
        const out = [];
        for (const it of all) {
          if (it.sep) { out.push(it); continue; }
          if (!q || it.label.toLowerCase().includes(q) || String(it.kb || "").toLowerCase().includes(q)) out.push(it);
        }
        // 去掉首尾与连续分隔符
        const cleaned = [];
        for (const it of out) {
          if (it.sep) { if (cleaned.length && !cleaned[cleaned.length - 1].sep) cleaned.push(it); }
          else cleaned.push(it);
        }
        while (cleaned.length && cleaned[cleaned.length - 1].sep) cleaned.pop();
        return cleaned;
      }, [cmdOpen, cmdQ, showAll, activePath, activeTab, tabs, rightPaths, ctxMenu]);
      const cmdRows = cmdFiltered.filter((x) => !x.sep);
      const cmdOverlay = cmdOpen ? React.createElement("div", {
        style: { position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.35)", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "12vh" },
        onClick: () => closeCmdPalette()
      },
        React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { width: 640, maxWidth: "90vw", background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, boxShadow: "0 10px 30px rgba(0,0,0,.5)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "60vh" } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #2A2B2C", gap: 8 } },
            React.createElement("span", { style: { color: "#4DAAFC", fontSize: 14 } }, "›_"),
            React.createElement("input", {
              ref: cmdInputRef, value: cmdQ, spellCheck: false,
              placeholder: "输入命令…（Enter 执行 / Esc 关闭）",
              onChange: (e) => { setCmdQ(e.target.value); setCmdSel(0); },
              onKeyDown: (e) => {
                e.stopPropagation();
                if (e.key === "Escape") { e.preventDefault(); closeCmdPalette(); }
                else if (e.key === "ArrowDown") { e.preventDefault(); if (cmdRows.length) setCmdSel((v) => Math.min(v + 1, cmdRows.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setCmdSel((v) => Math.max(v - 1, 0)); }
                else if (e.key === "Enter") { e.preventDefault(); runCmd(cmdRows[cmdSel]); }
              },
              style: { flex: 1, background: "#2A2B2C", border: "1px solid #3C3C3C", color: C.text, borderRadius: 4, padding: "6px 10px", fontSize: 13, outline: "none" }
            })),
          React.createElement("div", { style: { overflowY: "auto", padding: 4 } },
            cmdRows.length === 0
              ? React.createElement("div", { style: { padding: "10px 12px", color: "#7a7a7a", fontSize: 12 } }, "无匹配命令")
              : cmdFiltered.map((it, i) => {
                if (it.sep) return React.createElement("div", { key: "csep" + i, style: { height: 1, background: "#2A2B2C", margin: "4px 6px" } });
                const ri = cmdRows.indexOf(it);
                const sel = ri === cmdSel;
                return React.createElement("div", {
                  key: "cmd" + i,
                  onClick: () => { if (!it.dis) runCmd(it); },
                  onMouseEnter: () => { if (!it.dis) setCmdSel(ri); },
                  style: { display: "flex", alignItems: "center", gap: 10, padding: "5px 10px", fontSize: 13, borderRadius: 4, cursor: it.dis ? "default" : "pointer", color: it.dis ? "#858889" : (sel ? "#fff" : "#BBBEBF"), background: sel && !it.dis ? "#3994BC" : "transparent" }
                },
                  React.createElement("span", { style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, it.label),
                  it.dis ? React.createElement("span", { style: { fontSize: 10, color: "#858889", flexShrink: 0 } }, "不可用") : null,
                  it.kb ? React.createElement("span", { style: { fontSize: 11, color: "#7a7a7a", flexShrink: 0 } }, it.kb) : null);
              })))) : null;

      // ⑪ 快速打开浮层（Ctrl+P）：顶部输入 + 匹配列表
      const qpOverlay = qpOpen ? React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.35)", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "12vh" }, onClick: () => closeQuickPick() },
        React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { width: 640, maxWidth: "90vw", background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, boxShadow: "0 10px 30px rgba(0,0,0,.5)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "60vh" } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #2A2B2C", gap: 8 } },
            React.createElement("span", { style: { color: "#4DAAFC", fontSize: 14 } }, "🔎"),
            React.createElement("input", {
              ref: qpInputRef, value: qpQ, spellCheck: false,
              placeholder: "输入文件名快速打开…（Enter 打开 / Esc 关闭）",
              onChange: (e) => { setQpQ(e.target.value); setQpSel(0); },
              onKeyDown: (e) => {
                e.stopPropagation();
                if (e.key === "Escape") { e.preventDefault(); closeQuickPick(); }
                else if (e.key === "ArrowDown") { e.preventDefault(); if (qpMatches.length) setQpSel((v) => Math.min(v + 1, qpMatches.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setQpSel((v) => Math.max(v - 1, 0)); }
                else if (e.key === "Enter") { e.preventDefault(); const it = qpMatches[qpSel]; if (it) qpPick(it.p); }
              },
              style: { flex: 1, background: "#2A2B2C", border: "1px solid #3C3C3C", color: C.text, borderRadius: 4, padding: "6px 10px", fontSize: 13, outline: "none" }
            }),
            React.createElement("span", { style: { color: "#858889", fontSize: 11, whiteSpace: "nowrap" } }, qpBusy ? "⏳" : (qpFiles.length + " 文件"))),
          React.createElement("div", { style: { overflowY: "auto", minHeight: 60, flexShrink: 1 } },
            qpBusy && !qpMatches.length
              ? React.createElement("div", { style: { padding: 14, color: "#9d9d9d", fontSize: 12 } }, "扫描工作区文件…")
              : (qpMatches.length === 0
                ? React.createElement("div", { style: { padding: 14, color: "#858889", fontSize: 12 } }, qpQ ? "无匹配" : "输入关键字开始搜索")
                : qpMatches.map((it, mi) => {
                  const rel = it.p.split(/[\\/]/);
                  const nm = rel[rel.length - 1];
                  const dir = rel.slice(0, -1).join("\\");
                  return React.createElement("div", {
                    key: it.p,
                    onClick: () => qpPick(it.p),
                    onMouseEnter: () => setQpSel(mi),
                    style: { display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", cursor: "pointer", background: mi === qpSel ? "#3994BC" : "transparent" }
                  },
                    React.createElement("span", { style: { fontSize: 12, color: "#BBBEBF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0, maxWidth: "45%" } }, nm),
                    React.createElement("span", { style: { fontSize: 11, color: "#7a7a7a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, dir),
                    React.createElement("span", { style: { marginLeft: "auto", fontSize: 10, color: mi === qpSel ? "#3994BC" : "#858889", flexShrink: 0 } }, (it.i + 1)));
                }))))) : null;
      return React.createElement("div", {
        ref: workbenchRootRef,
        style: { display: "flex", flex: 1, minHeight: 0, background: C.editorBg, position: "relative" },
        onKeyDown,
        tabIndex: -1,
        // 点击非输入类区域时把键盘焦点留在 root（保证其后 Ctrl+* 快捷键仍被 onKeyDown 接收）
        onMouseDown: (e) => {
          const t = e.target;
          if (t && t.tagName && /^(INPUT|TEXTAREA|BUTTON|SELECT)$/i.test(t.tagName)) return;
          const r = e.currentTarget;
          const ac = document.activeElement;
          if (ac !== r && (!ac || !r.contains(ac))) { try { r.focus({ preventScroll: true }); } catch (err) { } }
        }
      },
        ctxMenuEl,
        qpOverlay,
        cmdOverlay,
        /* ㉓ Diff 对比视图 */
        React.createElement(DiffView, { pair: diffPair, onClose: () => setDiffPair(null), C: C }),
        /* FPGA 工具：格式化预览（左原文 / 右预览） */
        React.createElement(FmtPreviewDialog, {
          preview: fmtPreview,
          C,
          onClose: () => setFmtPreview(null),
          encFixOn: fmtEncFix,
          onEncFix: setFmtEncFix,
          onApply: (alsoSave) => { void applyFmtPreview(alsoSave); }
        }),
        /* FPGA 工具：检查结果面板（端口一致性 / XDC 约束） */
        React.createElement(CheckResultDialog, {
          panel: checkPanel,
          C,
          filter: checkFilter,
          onFilter: setCheckFilter,
          onClose: () => setCheckPanel(null),
          onJump: async (it) => {
            /* 点击结果行跳转。要点：
               ① 用【绝对路径】匹配（此前用 basename，同名文件会跳错）；
               ② 目标文件未打开时【自动打开并定位】（此前静默无反应）；
               ③ 【先关面板再跳转】—— 面板是 fixed inset:0 的全屏模态遮罩，
                  不关掉的话编辑器完全被挡住，用户根本看不出跳没跳；
                  关掉前把结果存进 lastCheck，状态栏会出现「← 返回检查结果」按钮。 */
            if (!it) return;
            const p = it.filePath || it.file;
            if (!p) return;
            const line = it.line || 0;
            setLastCheck(checkPanel);
            setCheckPanel(null);
            const opened = (tabsRef.current || []).find((x) => x.path === p || (x.path && x.path.split(/[\\/]/).pop() === p));
            if (opened) {
              setActivePath(opened.path);
              setJumpLine(line);
            } else {
              await openFile(p, true, line);
            }
            setFsStatus("已跳转到 " + String(p).split(/[\\/]/).pop() + (line ? (" 第 " + line + " 行") : "") + "　（状态栏右侧可返回检查结果）");
            setFsStatusStyle({ color: C.dim });
          }
        }),
        /* 左栏 */
        React.createElement("div", { style: { width: sideW, borderRight: "1px solid #2A2B2C", background: C.sideBg, display: "flex", flexDirection: "column", minWidth: 0, flexShrink: 0 } },
          leftHead,
          React.createElement("div", { style: { fontSize: 10, color: "#808080", padding: "3px 10px", borderBottom: "1px solid #2A2B2C", display: "flex", alignItems: "center", gap: 6, background: C.sideBg } },
            React.createElement("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, fsStatus || "就绪"),
            React.createElement("button", {
              onClick: () => setShowAll(!showAll),
              style: { background: "transparent", border: "1px solid " + (showAll ? C.accent : "#3C3C3C"), color: showAll ? C.accent : "#808080", borderRadius: 3, padding: "1px 6px", cursor: "pointer", fontSize: 10, whiteSpace: "nowrap", flexShrink: 0 }
            }, showAll ? "隐藏过滤" : "显示全部")),
          leftTabs,
          React.createElement("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } },
            leftTab === "explorer" ? explorerPane : (leftTab === "hierarchy" ? hierPane : outlinePane))),
        /* 侧栏拖宽把手 */
        React.createElement("div", {
          style: { width: 4, cursor: "col-resize", flexShrink: 0, background: sideDragRef.current ? "#3994BC" : "transparent", zIndex: 10 },
          onMouseDown: (e) => {
            e.preventDefault();
            sideDragRef.current = { startX: e.clientX, startW: sideW };
            const move = (ev) => {
              if (!sideDragRef.current) return;
              setSideW(Math.min(640, Math.max(180, sideDragRef.current.startW + (ev.clientX - sideDragRef.current.startX))));
            };
            const up = () => { sideDragRef.current = null; document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); window.removeEventListener("blur", up); };
            document.addEventListener("mousemove", move);
            window.addEventListener("blur", up);   // 鼠标在窗口外松开时浏览器不派发 mouseup，这里兜底清理
            document.addEventListener("mouseup", up);
          },
          onDoubleClick: () => setSideW(300),
          title: "拖动调整侧栏宽度（双击复位 300px）"
        }),

        /* 中栏编辑器 */
        React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: C.editorBg, position: "relative" } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", height: 28, background: "#191A1B", borderBottom: "1px solid #2A2B2C", fontSize: 12, color: "#cccccc", flexShrink: 0, position: "relative", zIndex: 20 } },
            React.createElement("div", {
              onClick: () => { setFileMenuOpen((v) => { if (!v) refreshRecents(); return !v; }); },
              onMouseEnter: (e) => { e.currentTarget.style.background = fileMenuOpen ? "#3994BC" : "#1E1F20"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = fileMenuOpen ? "#3994BC" : "transparent"; },
              style: { padding: "0 12px", height: 28, display: "flex", alignItems: "center", cursor: "pointer", background: fileMenuOpen ? "#3994BC" : "transparent", userSelect: "none" }
            }, "文件 ▾"),
            React.createElement("div", {
              onClick: () => newFileInDir(),
              onMouseEnter: (e) => { e.currentTarget.style.background = "#1E1F20"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
              style: { padding: "0 10px", height: 28, display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none", color: "#cccccc" },
              title: "新建文本文件"
            }, "➕ 新建"),
            /* ==== FPGA 工具下拉菜单：端口检查（悬停出子菜单）/ 约束检查 / 格式化 ====
               合并成一个「🔧 FPGA ▾」，与左侧「文件 ▾」同款；三项原来各占一个按钮，太挤。 */
            (() => {
              const itemSty = { padding: "4px 14px", fontSize: 12, color: "#e6e6e6", whiteSpace: "nowrap", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, cursor: "pointer", background: "transparent" };
              const menuSty = { position: "absolute", top: 28, background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,.45)", padding: "4px 0", zIndex: 31 };
              /* keepOpen=true 用于「勾选类」条目：点一下只切换状态，菜单/子菜单都不收起，
                 鼠标移开才收起（用户实测：原来点一下就整棵收起，得重新悬停才能再点）。 */
              const mkItem = (key, label, hint, fn, dis, keepOpen) => React.createElement("div", {
                key,
                onClick: dis ? null : () => { if (!keepOpen) { setFpgaMenuOpen(false); setFpgaSubOpen(false); } fn(); },
                style: Object.assign({}, itemSty, { cursor: dis ? "default" : "pointer", color: dis ? "#858889" : "#e6e6e6" }),
                onMouseEnter: (e) => { if (!dis) e.currentTarget.style.background = "#1E1F20"; },
                onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
                title: hint
              },
                React.createElement("span", null, label),
                dis ? React.createElement("span", { style: { color: "#7a7a7a", fontSize: 11 } }, "需先打开文件") : null);
              return React.createElement("div", { style: { position: "relative", display: "flex", alignItems: "center" } },
                React.createElement("div", {
                  onClick: () => { setFpgaMenuOpen((v) => !v); setFpgaSubOpen(false); },
                  onMouseEnter: (e) => { e.currentTarget.style.background = fpgaMenuOpen ? "#3994BC" : "#1E1F20"; },
                  onMouseLeave: (e) => { e.currentTarget.style.background = fpgaMenuOpen ? "#3994BC" : "transparent"; },
                  style: { padding: "0 12px", height: 28, display: "flex", alignItems: "center", cursor: "pointer", background: fpgaMenuOpen ? "#3994BC" : "transparent", userSelect: "none", color: "#cccccc" },
                  title: "FPGA 工具：端口检查 / 约束检查 / 格式化"
                }, "🔧 FPGA ▾"),
                fpgaMenuOpen ? React.createElement("div", { style: Object.assign({}, menuSty, { left: 0, minWidth: 200 }) },
                  /* 端口检查：鼠标悬停时在【右侧】弹出子菜单（工程 / 当前文件） */
                  React.createElement("div", {
                    onMouseEnter: () => setFpgaSubOpen(true),
                    onMouseLeave: () => setFpgaSubOpen(false),
                    style: { position: "relative" }
                  },
                    React.createElement("div", {
                      style: Object.assign({}, itemSty, { background: fpgaSubOpen ? "#1E1F20" : "transparent" }),
                      title: "端口一致性检查：比对模块定义与例化的端口名 / 位宽 / 方向"
                    },
                      React.createElement("span", null, "🔍 端口检查"),
                      React.createElement("span", { style: { color: "#7a7a7a", fontSize: 11 } }, "▸")),
                    fpgaSubOpen ? React.createElement("div", { style: Object.assign({}, menuSty, { left: "100%", top: -4, minWidth: 260 }) },
                      mkItem("pc1", "整个工程", "扫描工作区所有 RTL，逐文件比对（上板前全工程把关）", () => runPortCheck("project")),
                      mkItem("pc2", "当前文件", "只检查当前打开文件里的例化；模块定义表仍取自整个工程", () => runPortCheck("file"))) : null),
                  React.createElement("div", { key: "fsep", style: { height: 1, background: "#3C3C3C", margin: "3px 0" } }),
                  /* 静态检查：当前文件 = 可勾选的常开开关；整个工程 = 扫所有已打开文件并把结果填进底部结果面板 */
                  React.createElement("div", {
                    onMouseEnter: () => setFpgaLintSub(true),
                    onMouseLeave: () => setFpgaLintSub(false),
                    style: { position: "relative" }
                  },
                    React.createElement("div", {
                      style: Object.assign({}, itemSty, { background: fpgaLintSub ? "#1E1F20" : "transparent" }),
                      title: "Verilog 静态检查：块关键字配对 / wire-reg 误用 / 全角标点 / 括号配对 / 端口缺逗号 等"
                    },
                      React.createElement("span", null, "🧪 静态检查"),
                      React.createElement("span", { style: { color: "#7a7a7a", fontSize: 11 } }, "▸")),
                    fpgaLintSub ? React.createElement("div", { style: Object.assign({}, menuSty, { left: "100%", top: -4, minWidth: 280 }) },
                      mkItem("lint1", (lintOnRef.current ? "✓ " : "　") + "当前文件（自动，可取消）", "勾选后：编辑时自动检查当前文件（行内框 + 滚动条标红 + 悬停提示）", () => { lintOnRef.current = !lintOnRef.current; setLintRev((k) => k + 1); }, null, true),
                      mkItem("lint0", (lintStyleRef.current ? "✓ " : "　") + "风格提示（timescale / default_nettype / 行宽）", "默认不显示：这三条是文件级风格提示，不是错误。你工程没有 `default_nettype none 的习惯时它会每文件刷一条，勾选后才显示", () => { lintStyleRef.current = !lintStyleRef.current; setLintRev((k) => k + 1); }, null, true),
                      mkItem("lint2", "整个工程（递归扫描目录）", "按工程目录递归扫描全部 RTL，结果进结果窗口：统计行 + 只看 错误/提示/信息 + 点击跳转", () => {
                        runLintCheck("project");
                        setFpgaMenuOpen(false);
                      })) : null),
                  mkItem("nettype", "📌 插入 `default_nettype none / wire",
                    "在当前文件开头插入 `default_nettype none、末尾插入 `default_nettype wire（已在文件里的不重复插；可 Ctrl+Z 撤销，需自己 Ctrl+S 保存）",
                    () => insertNettypeGuard(), !activeTab),
                  mkItem("xdc", "📐 约束检查", "XDC 约束检查：时钟约束缺失 / 端口未绑定管脚 / 续行与生成时钟", () => runXdcCheck()),
                  mkItem("fmt", "✨ 格式化", "格式化当前文件（声明对齐）：先预览，确认后才写入", () => openFmtPreview(), !activeTab),
                  React.createElement("div", { key: "fsep2", style: { height: 1, background: "#3C3C3C", margin: "3px 0" } }),
                  /* 编码相关改动与 FPGA 工具链绑定（Vivado 要 GBK、现代工具要 UTF-8），
                     所以放 FPGA 菜单；从「文件」下拉移出，避免和保存/还原那组混在一起。 */
                  mkItem("encgbk", "🔤 修复注释乱码：UTF-8 → GBK（Vivado 用）", "把当前文件按 GBK 写回（Vivado 才能正确显示中文注释）；先确认再写盘，可 Ctrl+Z 撤销", () => fixCommentEncoding("gbk"), !activeTab),
                  mkItem("encutf8", "🔤 转为 UTF-8（VS Code / 本工具用）", "把当前文件按 UTF-8 写回（现代工具链用）；先确认再写盘，可 Ctrl+Z 撤销", () => fixCommentEncoding("utf8"), !activeTab)) : null);
            })(),
            /* ㉔ 集成终端开关 */
            React.createElement("div", {
              onClick: () => setTermOpen((v) => !v),
              onMouseEnter: (e) => { e.currentTarget.style.background = "#1E1F20"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
              style: { padding: "0 10px", height: 28, display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none", color: termOpen ? "#3994BC" : "#cccccc", fontWeight: termOpen ? 600 : 400 },
              title: "集成终端（Ctrl+`）"
            }, "⌨ 终端"),
            /* ㉗ 转到定义 */
            React.createElement("div", {
              onClick: gotoDefinition,
              onMouseEnter: (e) => { e.currentTarget.style.background = "#1E1F20"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
              style: { padding: "0 10px", height: 28, display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none", color: "#cccccc" },
              title: "转到定义（F12）：光标放在模块名上跳转到其定义"
            }, "⇱ 转到定义"),
            /* ㉚ 命令面板入口（可见按钮：浏览器里 Ctrl+Shift+P 会被浏览器占用，此处保证有入口） */
            React.createElement("div", {
              onClick: openCmdPalette,
              onMouseEnter: (e) => { e.currentTarget.style.background = "#1E1F20"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
              style: { padding: "0 10px", height: 28, display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none", color: "#cccccc" },
              title: "命令面板（F1 / Ctrl+Shift+P）"
            }, "›_ 命令"),
            /* 对话面板入口统一在编辑器标签栏末尾的 ✨（对齐 VSCode），此处不再重复 */
            React.createElement("span", { style: { color: "#7a7a7a", padding: "0 6px", cursor: "default" } }, "🧑‍💻"),
            activeTab
              ? React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, direction: "rtl", textAlign: "left", color: "#9d9d9d", fontSize: 11 } }, activeTab.path)
              : React.createElement("span", { style: { flex: 1, fontSize: 11, color: "#858889" } }, folders.length ? folders.map((f) => f.name).join(" · ") : "未打开工作区"),
            autoSave ? React.createElement("span", { style: { color: "#6a9a5a", fontSize: 10, padding: "0 8px", whiteSpace: "nowrap" } }, "自动保存已开") : null,
            fileMenuOpen ? React.createElement("div", {
              style: { position: "absolute", left: 0, top: 28, background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,.4)", padding: "4px 0", minWidth: 250, zIndex: 30 }
            },
              fileMenu.map((it, mi) => it.sep
                ? React.createElement("div", { key: "sep" + mi, style: { height: 1, background: "#3C3C3C", margin: "3px 0" } })
                : React.createElement("div", {
                  key: "mi" + mi,
                  onClick: it.dis ? null : () => { setFileMenuOpen(false); it.f(); },
                  style: { padding: "4px 14px", fontSize: 12, cursor: it.dis ? "default" : "pointer", color: it.dis ? "#858889" : "#e6e6e6", whiteSpace: "nowrap", display: "flex", justifyContent: "space-between", gap: 24, background: "transparent" },
                  onMouseEnter: (e) => { if (!it.dis) e.currentTarget.style.background = "#1E1F20"; },
                  onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; }
                },
                  React.createElement("span", null, it.l),
                  it.k ? React.createElement("span", { style: { color: "#7a7a7a", fontSize: 11 } }, it.k) : null))) : null,
          recentOpen ? React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" }, onClick: () => setRecentOpen(false) },
            React.createElement("div", { style: { background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, padding: 12, width: 620, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,.5)" }, onClick: (e) => e.stopPropagation() },
              React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "#e8e8e8", marginBottom: 8 } }, "打开最近工作区"),
              recents.length === 0
                ? React.createElement("div", { style: { color: "#7a7a7a", fontSize: 12, padding: "10px 4px" } }, "（暂无记录 — 打开或添加过文件夹，以及打开/另存过 .code-workspace，都会自动记录）")
                : recents.map((e, ri) => {
                  const isFolders = e.kind === "folders";
                  const sub = isFolders ? e.folders.map((f) => f.path).join("　") : e.path;
                  return React.createElement("div", {
                    key: (e.path || e.label || "r") + ri,
                    onClick: () => {
                      setRecentOpen(false); setFileMenuOpen(false);
                      if (isFolders) openWsFromFolders(e.folders, e.label); else openWsFromPath(e.path);
                    },
                    style: { display: "flex", flexDirection: "column", gap: 2, padding: "6px 8px", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "#BBBEBF" },
                    onMouseEnter: (e2) => { e2.currentTarget.style.background = "#1E1F20"; },
                    onMouseLeave: (e2) => { e2.currentTarget.style.background = "transparent"; }
                  },
                    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                      React.createElement("span", { style: { fontSize: 13 } }, isFolders ? "📁" : "🗂"),
                      React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, e.label || e.path)),
                    sub ? React.createElement("div", { style: { marginLeft: 21, color: "#7a7a7a", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, sub) : null);
                }),
              React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 } },
                React.createElement("button", { onClick: clearRecents, style: { background: "transparent", color: "#BBBEBF", border: "1px solid #3C3C3C", borderRadius: 4, padding: "5px 14px", cursor: "pointer", fontSize: 12 } }, "清空列表"),
                React.createElement("button", { onClick: () => setRecentOpen(false), style: { background: "#2A2B2C", color: C.text, border: "1px solid #3C3C3C", borderRadius: 4, padding: "5px 14px", cursor: "pointer", fontSize: 12 } }, "关闭")))) : null,
          pathDlg ? React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" } },
            React.createElement("div", { style: { background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, padding: 14, width: 560, boxShadow: "0 8px 24px rgba(0,0,0,.5)" } },
              React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "#e8e8e8", marginBottom: 6 } },
                pathDlg.mode === "newFile" ? "新建文本文件" :
                  pathDlg.mode === "openFile" ? "打开文件" :
                    pathDlg.mode === "saveAs" ? "另存为" :
                      pathDlg.mode === "wsSaveAs" ? "将工作区另存为…" : "从文件打开工作区…"),
              React.createElement("div", { style: { color: "#7a7a7a", fontSize: 11, marginBottom: 8, lineHeight: 1.5 } },
                pathDlg.mode === "wsSaveAs"
                  ? "写入 VSCode 格式的 .code-workspace：内容 = 当前工作区的文件夹列表（VSCode 能直接打开同一份文件）。"
                  : (pathDlg.mode === "wsOpen"
                    ? "选一个 .code-workspace 文件；打开后它的文件夹会替换当前工作区。"
                    : (pathDlg.mode === "saveAs"
                      ? "把当前文件的内容写到新位置（不改动原文件）；GBK 文件请用下面的「浏览…」选目录后手填文件名。"
                      : "点「浏览…」选文件夹，再从列表里点文件；也可以直接输入完整路径。"))),
              React.createElement("input", {
                autoFocus: true,
                value: pathDlgVal,
                onChange: (e) => setPathDlgVal(e.target.value),
                onKeyDown: (e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") submitPathDlg();
                  if (e.key === "Escape") setPathDlg(null);
                },
                placeholder: "E:\\…\\example.code-workspace 或 .v 文件",
                spellCheck: false,
                style: { width: "100%", boxSizing: "border-box", background: "#2A2B2C", color: C.text, border: "1px solid #3C3C3C", borderRadius: 4, padding: "6px 8px", fontSize: 12, outline: "none", marginBottom: 10 }
              }),
              (function () {
                const m = pathDlg.mode;
                if (m !== "openFile" && m !== "wsOpen" && m !== "newFile") return null;
                const wsOnly = m === "wsOpen";
                const shown = pathDlgEntries.filter((en) => en.type === "directory" || !wsOnly || /\.code-workspace$/i.test(en.name || ""));
                const mini = { background: "#2A2B2C", color: C.text, border: "1px solid #3C3C3C", borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontSize: 12 };
                return React.createElement("div", { style: { marginBottom: 10 } },
                  React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 } },
                    React.createElement("button", { onClick: browsePathDlg, style: mini, title: "打开系统目录选择器（资源管理器）" }, "浏览…"),
                    React.createElement("button", { onClick: pathDlgGoUp, style: mini, title: "上一层目录" }, "↑ 上级"),
                    React.createElement("span", { style: { flex: 1, color: "#7a7a7a", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: pathDlgDir || "" }, pathDlgDir || "（未选择目录）")),
                  React.createElement("div", { style: { maxHeight: 240, overflowY: "auto", border: "1px solid #3C3C3C", borderRadius: 4, background: "#202122" } },
                    shown.length === 0
                      ? React.createElement("div", { style: { color: "#7a7a7a", fontSize: 11, padding: "8px 10px" } }, pathDlgDir ? (wsOnly ? "（该目录里没有 .code-workspace 文件）" : "（该目录里没有可显示的文件）") : "点「浏览…」选一个文件夹，或直接在上方输入完整路径")
                      : shown.map((en) => React.createElement("div", {
                        key: en.path,
                        onClick: () => pathDlgPickEntry(en),
                        title: en.path,
                        style: { display: "flex", alignItems: "center", gap: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: en.type === "directory" ? "#BBBEBF" : "#e6e6e6" },
                        onMouseEnter: (e2) => { e2.currentTarget.style.background = "#1E1F20"; },
                        onMouseLeave: (e2) => { e2.currentTarget.style.background = "transparent"; }
                      },
                        React.createElement("span", null, en.type === "directory" ? "📁" : "📄"),
                        React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, en.name)))));
              })(),
              React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
                React.createElement("button", { onClick: () => setPathDlg(null), style: { background: "#2A2B2C", color: C.text, border: "1px solid #3C3C3C", borderRadius: 4, padding: "5px 16px", cursor: "pointer", fontSize: 12 } }, "取消"),
                React.createElement("button", { onClick: submitPathDlg, style: { background: "#3994BC", color: "#fff", border: "none", borderRadius: 4, padding: "5px 16px", cursor: "pointer", fontSize: 12 } }, "确定")))) : null,
          (fileMenuOpen || fpgaMenuOpen) ? React.createElement("div", {
            style: { position: "fixed", inset: 0, zIndex: 25 },
            onClick: () => { setFileMenuOpen(false); setFpgaMenuOpen(false); setFpgaSubOpen(false); }
          }) : null),
          /* ---- 编辑器组区 + 右侧 AI 对话面板（flex row） ---- */
          React.createElement("div", { style: { flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "row", background: C.editorBg } },
            React.createElement("div", { style: { flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" } },
          /* ---- 编辑器组区（VSCode 模型：拆分 = 两个 editor group 并排/堆叠，各带等高标签条） ---- */
          (rightPaths.length > 0 && rightTab
            ? (() => {
              // 像素值方案：使用顶层 splitContainerSize 状态
              const isDown = splitDir === "down";
              let leftStyle, rightStyle;
              
              if (splitContainerSize) {
                const leftPx = Math.floor(splitRatio * splitContainerSize);
                // 绝对定位方案：不依赖 flex，直接用 left/top + 像素宽高
                leftStyle = isDown 
                  ? { position: "absolute", left: 0, right: 0, top: 0, height: leftPx + "px", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 2 }
                  : { position: "absolute", left: 0, top: 0, bottom: 0, width: leftPx + "px", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 2 };
                rightStyle = isDown
                  ? { position: "absolute", left: 0, right: 0, top: leftPx + "px", bottom: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderTop: "1px solid #2A2B2C", background: C.editorBg, zIndex: 5 }
                  : { position: "absolute", left: leftPx + "px", top: 0, bottom: 0, right: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid #2A2B2C", background: C.editorBg, zIndex: 5 };
              } else {
                // 初始渲染：容器尺寸未知，先用百分比占位
                leftStyle = { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 2 };
                rightStyle = { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderTop: isDown ? "1px solid #2A2B2C" : "none", borderLeft: isDown ? "none" : "1px solid #2A2B2C", background: C.editorBg, zIndex: 5 };
              }
              
              return React.createElement("div", {
                ref: splitContainerRef,
              // 布局：绝对定位容器（position relative + 左右栏 absolute）
              style: splitDir === "down" 
                ? { flex: 1, minHeight: 0, position: "relative", background: C.editorBg, overflow: "hidden" }
                : { flex: 1, minHeight: 0, position: "relative", background: C.editorBg, overflow: "hidden" },
              onDragOver: (e) => {
                e.preventDefault();
                try { e.dataTransfer.dropEffect = "copy"; } catch (err) { }
                const src = dragPathRef.current;
                if (!src) return;
                const rect = e.currentTarget.getBoundingClientRect();
                if (splitDir === "down") {
                  setDragOverEdge((e.clientY - rect.top) > rect.height * 0.55 ? "right" : "left");
                } else {
                  setDragOverEdge((e.clientX - rect.left) > rect.width * 0.55 ? "right" : "left");
                }
              },
              onDrop: (e) => {
                e.preventDefault();
                const src = dragPathRef.current;
                dragEnd();
                if (!src) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const rightSide = splitDir === "down"
                  ? (e.clientY - rect.top) > rect.height * 0.5
                  : (e.clientX - rect.left) > rect.width * 0.5;
                if (rightSide) splitToRight(src);
                else if (rightPaths.includes(src)) {
                  // 拖回左区域：从右栏移除该文件并激活到左栏
                  setRightPaths(rightPaths.filter(p => p !== src));
                  if (rightActivePath === src) setRightActivePath(rightPaths.filter(p => p !== src)[0] || null);
                  setActivePath(src);
                }
              },
              onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverEdge(null); }
            },
              // 第一组：标签条 + 内容（flex 按比例占宽）
              React.createElement("div", { ref: leftPaneRef, style: leftStyle },
                renderTabStrip(tabs.filter((t) => !rightPaths.includes(t.path) && !subPaths.includes(t.path)), activePath, false, "l"),
                (activeTab && activeTab.error && activeTab.text === ""
                  ? React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.warn, fontSize: 13, background: C.editorBg } }, activeTab.error)
                  : (activeTab ? React.createElement("div", { style: { flex: 1, minHeight: 0, display: "flex" } },
                    React.createElement(CodePane, {
                docRev: docRev,
                      text: activeText || "",
                      lintRev: lintRev,
                      undoReq: undoReq,
                      onUndoEmpty: revertLastCodeOp,
                      onUndoEnc: applyEncState,
                      path: activePath || "",
                      jump: jumpLine,
                      jumpCol: jumpCol,
                      onChange: (v) => onTabChange(activePath, v),
                      onJumpConsumed: () => { setJumpLine(0); setJumpCol(0); },
                      onCursor: setCursorSafe,
                      onOpenPath: (p) => openFile(p, true),
                      onOpenRequest: (p, line, col) => openFile(p, true, line || 0, col || 0),
                      findReq: findReq,
                      undoKeyReq: undoKeyReq,
                      colModeReq: colModeReq,
                      isFindTarget: activePath != null && findTargetPath === activePath,
                      onEditorFocus: onEditorFocus,
                      onSelection: setSelInfo,
                      onExternalWrite: applyExternalWrite,
                      font: editorFont,
                      onFontZoom: zoomFont,
                      openFiles,
                      folders
                    })) : null))),
              // ⑰ 可拖分隔条：调整两组的宽(right)/高(down)（绝对定位在中线）
              React.createElement("div", {
                style: splitDir === "down"
                  ? { position: "absolute", left: 0, right: 0, top: "calc(" + (splitRatio * 100) + "% - 3px)", height: 6, cursor: "row-resize", background: splitDragRef.current ? "#3994BC" : "transparent", zIndex: 20 }
                  : { position: "absolute", top: 0, bottom: 0, left: "calc(" + (splitRatio * 100) + "% - 3px)", width: 6, cursor: "col-resize", background: splitDragRef.current ? "#3994BC" : "transparent", zIndex: 20 },
                title: splitDir === "down" ? "拖动调整上下高度（双击复位 50/50）" : "拖动调整左右宽度（双击复位 50/50）",
                onMouseDown: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const host = e.currentTarget.parentElement; // 拆分容器
                  const rect0 = host ? host.getBoundingClientRect() : null;
                  splitDragRef.current = { startP: splitDir === "down" ? e.clientY : e.clientX, startRatio: splitRatio, rect0, down: splitDir === "down" };
                  const move = (ev) => {
                    const d = splitDragRef.current;
                    if (!d) return;
                    if (!d.rect0) { up(); return; }
                    const span = d.down ? d.rect0.height : d.rect0.width;
                    if (!span) return;
                    const cur = d.down ? ev.clientY : ev.clientX;
                    const r = Math.max(0.2, Math.min(0.8, d.startRatio + (cur - d.startP) / span));
                    d.lastR = r;
                    setSplitRatio(r);
                  };
                  const up = () => {
                    const d = splitDragRef.current;
                    splitDragRef.current = null;
                    document.removeEventListener("mousemove", move);
                    document.removeEventListener("mouseup", up);
                    window.removeEventListener("blur", up);
                    if (d && d.lastR != null) {
                      setFsStatus("分隔条比例: " + (Math.round(d.lastR * 100) / 100) + "（左栏占比）");
                      setFsStatusStyle({ color: C.dim });
                    }
                  };
                  document.addEventListener("mousemove", move);
                  document.addEventListener("mouseup", up);
                  window.addEventListener("blur", up);   // 兜底清理（窗口外松开不派发 mouseup）
                },
                onDoubleClick: () => setSplitRatio(0.5)
              }),
              // 第二组：自带等高标签条（⇄/✕ 工具）+ 内容（zIndex 1，背景不透明——若它与左栏重叠会直接可见）
              React.createElement("div", { ref: rightPaneRef, style: Object.assign({ position: "relative" }, rightStyle),
                // 副组接收拖放：拖到副组右缘→副组左右拆；拖到副组下缘→副组上下拆
                onDragOver: (e) => {
                  if (dragPathRef.current) { e.preventDefault(); try { e.dataTransfer.dropEffect = "copy"; } catch (err) { } }
                },
                onDrop: (e) => {
                  e.preventDefault();
                  const src = dragPathRef.current;
                  dragEnd();
                  if (!src) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const dx = e.clientX - rect.left, dy = e.clientY - rect.top;
                  const toRight = dx > rect.width * 0.75;
                  const toBottom = dy > rect.height * 0.75;
                  if (toRight || toBottom) {
                    // 副组内部再拆：把 src 作为副组另一侧
                    if (src !== rightActivePath) {
                      setSubDir(toRight ? "right" : "down");
                      if (!subPaths.includes(src)) setSubPaths([src]);
                      setSubActive(src);
                    }
                  }
                } },
                rightTab && rightTab.error && rightTab.text === ""
                  ? React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.warn, fontSize: 13, background: C.editorBg } }, rightTab.error)
                  : React.createElement("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: subDir === "right" ? "row" : "column" } },
                    React.createElement("div", { style: { flex: (subPaths.length > 0 && subActive ? subRatio : 1) + " 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }, ref: rightSubARef },
                      renderTabStrip(rightPaths.map(p => tabs.find(t => t.path === p)).filter(Boolean), rightActivePath, true, "r", setRightActivePath),
                      rightTab ? React.createElement(CodePane, {
                docRev: docRev,
                        text: rightText,
                      lintRev: lintRev,
                      undoReq: undoReq,
                      onUndoEmpty: revertLastCodeOp,
                      onUndoEnc: applyEncState,
                        path: rightActivePath,
                        jump: 0,
                        onChange: (v) => onTabChange(rightActivePath, v),
                        onCursor: setCursorSafe,
                        onOpenPath: (p) => openIntoRight(p),
                        onOpenRequest: (p, line, col) => openFile(p, true, line || 0, col || 0),
                        findReq: findReq,
                        undoKeyReq: undoKeyReq,
                        colModeReq: colModeReq,
                        isFindTarget: rightActivePath != null && findTargetPath === rightActivePath,
                        onEditorFocus: onEditorFocus,
                        onSelection: setSelInfo,
                        onExternalWrite: applyExternalWrite,
                        font: editorFont,
                        onFontZoom: zoomFont,
                        openFiles,
                        folders
                      }) : null),
                    subPaths.length > 0 && subActive
                      ? React.createElement(React.Fragment, null,
                          React.createElement("div", { style: subDir === "right" ? { width: 6, cursor: "col-resize", flexShrink: 0 } : { height: 6, cursor: "row-resize", flexShrink: 0 }, onMouseDown: subDividerDragDown, title: "拖动调整副组内比例" }),
                          React.createElement("div", { style: { flex: (1 - subRatio) + " 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }, ref: rightSubBRef },
                            React.createElement("div", { style: { display: "flex", alignItems: "stretch", background: "#191A1B", borderBottom: "1px solid #2A2B2C", overflowX: "auto", minHeight: 35, flexShrink: 0 } },
                              React.createElement("div", { key: "sub-tab", onMouseDown: subTabMouseDown, style: { display: "flex", alignItems: "center", gap: 6, padding: "0 8px 0 12px", height: 35, cursor: "pointer", background: "#202122", color: "#fff", borderTop: "2px solid #3994BC", borderRight: "1px solid #3C3C3C", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0, userSelect: "none" } },
                                React.createElement("span", { style: { fontSize: 10, flexShrink: 0, color: "#4e8e4e" } }, "🟩"),
                                React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis" } }, basename(subActive || "")),
                                React.createElement("span", {
                                  onClick: (e) => {
              e.stopPropagation();
              const sp = subActive;
              setSubPaths([]);
              setSubActive(null);
              // 不再传 force：副组 ✕ 也要走未保存确认，否则会静默丢弃改动
              if (sp) closeTab(sp);
            },
                                  style: { fontSize: 11, color: "#9a9a9a", cursor: "pointer", padding: "1px 5px", borderRadius: 3, flexShrink: 0 },
                                  onMouseEnter: (e) => { e.currentTarget.style.background = "#3C3C3C"; },
                                  onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
                                  title: "关闭副组第二格"
                                }, "✕"))),
                            (tabs.find(t => t.path === subActive) || { error: null }) && tabs.find(t => t.path === subActive) && tabs.find(t => t.path === subActive).text !== ""
                              ? React.createElement(CodePane, {
                docRev: docRev,
                                  text: (tabs.find(t => t.path === subActive) || {}).text || "",
                                  lintRev: lintRev,
                                  undoReq: undoReq,
                      onUndoEmpty: revertLastCodeOp,
                      onUndoEnc: applyEncState,
                                  path: subActive,
                                  jump: 0,
                                  onChange: (v) => onTabChange(subActive, v),
                                  onCursor: setCursorSafe,
                                  onOpenPath: (p) => openIntoRight(p),
                                  onOpenRequest: (p, line, col) => openFile(p, true, line || 0, col || 0),
                                  findReq: findReq,
                                  undoKeyReq: undoKeyReq,
                                  colModeReq: colModeReq,
                                  isFindTarget: subActive != null && findTargetPath === subActive,
                                  onEditorFocus: onEditorFocus,
                                  onSelection: setSelInfo,
                                  onExternalWrite: applyExternalWrite,
                                  font: editorFont,
                                  onFontZoom: zoomFont,
                                  openFiles,
                                  folders
                                })
                              : null))
                      : null)),
              dragOverEdge === "right"
                ? React.createElement("div", { style: splitDir === "down"
                  ? { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "#3994BC", zIndex: 5 }
                  : { position: "absolute", top: 0, bottom: 0, right: 0, width: 3, background: "#3994BC", zIndex: 5 } }) : null,
              dragOverEdge === "left"
                ? React.createElement("div", { style: splitDir === "down"
                  ? { position: "absolute", left: 0, right: 0, top: 0, height: 3, background: "#3994BC", zIndex: 5 }
                  : { position: "absolute", top: 0, bottom: 0, left: 0, width: 3, background: "#3994BC", zIndex: 5 } }) : null);
            })()
            : React.createElement(React.Fragment, null,
              renderTabStrip(tabs.filter((t) => !rightPaths.includes(t.path) && !subPaths.includes(t.path)), activePath, false, "l"),
              (activeTab
                ? React.createElement("div", {
                  style: { flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "row", background: C.editorBg, position: "relative" },
                  onDragOver: (e) => {
                    e.preventDefault();
                    try { e.dataTransfer.dropEffect = "copy"; } catch (err) { }
                    const src = dragPathRef.current;
                    if (!src) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (e.clientX > rect.left + rect.width * 0.6) setDragOverEdge("right");
                  },
                  onDrop: (e) => {
                    e.preventDefault();
                    const src = dragPathRef.current;
                    dragEnd();
                    if (!src) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (e.clientX > rect.left + rect.width * 0.6) splitToRight(src);
                  },
                  onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverEdge(null); }
                },
                  (activeTab.error && activeTab.text === ""
                    ? React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.warn, fontSize: 13, background: C.editorBg } }, activeTab.error)
                    : React.createElement("div", { style: { flex: 1, minHeight: 0, display: "flex" } },
                      React.createElement(CodePane, {
                docRev: docRev,
                        text: activeText,
                      lintRev: lintRev,
                      undoReq: undoReq,
                      onUndoEmpty: revertLastCodeOp,
                      onUndoEnc: applyEncState,
                        path: activePath,
                        jump: jumpLine,
                        jumpCol: jumpCol,
                        onChange: (v) => onTabChange(activePath, v),
                        onJumpConsumed: () => { setJumpLine(0); setJumpCol(0); },
                        onCursor: setCursorSafe,
                        onOpenPath: (p) => openFile(p, true),
                        onOpenRequest: (p, line, col) => openFile(p, true, line || 0, col || 0),
                        findReq: findReq,
                        undoKeyReq: undoKeyReq,
                        colModeReq: colModeReq,
                        isFindTarget: activePath != null && findTargetPath === activePath,
                        onEditorFocus: onEditorFocus,
                        onSelection: setSelInfo,
                        onExternalWrite: applyExternalWrite,
                        font: editorFont,
                        onFontZoom: zoomFont,
                        openFiles,
                        folders
                      }))),
                  dragOverEdge === "right"
                    ? React.createElement("div", { style: { position: "absolute", top: 0, bottom: 0, right: 0, width: 3, background: "#3994BC", zIndex: 5 } }) : null,
                  dragOverEdge === "bottom"
                    ? React.createElement("div", { style: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "#3994BC", zIndex: 5 } }) : null)
                : React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#858889", fontSize: 13, background: C.editorBg, flexDirection: "column", gap: 8 } },
                  React.createElement("div", { style: { fontSize: 40, opacity: 0.5 } }, "🧑‍💻"),
                  React.createElement("div", null, "在左侧选择一个文件开始编辑"),
                  React.createElement("div", { style: { fontSize: 11, color: "#555" } }, "单击 = 预览 · 双击 = 固定 · 右键 = 菜单 · 拖标签到右缘 = 左右拆分 · Ctrl+\\ 左右 / Ctrl+Shift+\\ 上下 · Ctrl+W 关闭 · Ctrl+S 保存"))))),
            ),
            /* 源代码管理面板（本地 Git）：非模态，停靠在代码区右侧，默认不占空间 */
            (scmOpen && scmVisible) ? React.createElement(React.Fragment, null,
              React.createElement("div", {
                key: "scm-resize",
                style: { width: 4, cursor: "col-resize", flexShrink: 0, background: "transparent", zIndex: 10 },
                onMouseDown: (e) => {
                  e.preventDefault();
                  const startX = e.clientX, startW = scmW;
                  const move = (ev) => setScmW(Math.min(720, Math.max(240, startW - (ev.clientX - startX))));
                  const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); window.removeEventListener("blur", up); };
                  document.addEventListener("mousemove", move);
                  window.addEventListener("blur", up);
                  document.addEventListener("mouseup", up);
                },
                onDoubleClick: () => setScmW(360),
                title: "拖动调整源代码管理面板宽度（双击复位 360px）"
              }),
              React.createElement("div", {
                key: "scm-panel",
                style: { width: scmW, flexShrink: 0, borderLeft: "1px solid " + C.border, background: C.sideBg, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", zIndex: 2 }
              }, React.createElement(ErrorBoundary, {
                key: "ebscm",
                title: "⚠ 源代码管理面板渲染出错"
              }, React.createElement(GitPanel, {
                key: "scm-git",
                root: gitRootPath,
                folders: folders,
                pick: scmPick,
                hint: scmFolderHint(scmPick, folders),
                onPickFolder: rememberScmFolder,
                onStatus: (m) => { setFsStatus(m); setFsStatusStyle({ color: C.green }); },
                onOpenFile: (p) => openFile(p, true),
                onReloadFile: reloadFileFromDisk,
                /* 点 diff 左侧行号 → 跳到编辑器对应行（复用既有的 jumpLine/jumpCol 机制） */
                onGotoLine: (ln) => {
                  if (!ln || ln < 1) return;
                  setJumpLine(ln); setJumpCol(0);
                },
                onCodeOp: (op) => { gitOpUndoRef.current = op; }
              })))
            ) : null,
            /* 右侧对话面板（可开关 + 可拖宽） */
            chatOpen ? React.createElement(React.Fragment, null,
              React.createElement("div", {
                style: { width: 4, cursor: "col-resize", flexShrink: 0, background: chatDragRef.current ? "#3994BC" : "transparent", zIndex: 10 },
                onMouseDown: (e) => {
                  e.preventDefault();
                  chatDragRef.current = { startX: e.clientX, startW: chatW };
                  const move = (ev) => { if (!chatDragRef.current) return; setChatW(Math.min(1200, Math.max(260, chatDragRef.current.startW + (chatDragRef.current.startX - ev.clientX)))); };
                  const up = () => { chatDragRef.current = null; document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); window.removeEventListener("blur", up); };
                  document.addEventListener("mousemove", move);
                  window.addEventListener("blur", up);   // 鼠标在窗口外松开时浏览器不派发 mouseup，这里兜底清理
                  document.addEventListener("mouseup", up);
                },
                onDoubleClick: () => setChatW(520),
                title: "拖动调整对话面板宽度（双击复位 520px）"
              }),
              React.createElement("div", { style: { width: chatW, flexShrink: 0, minWidth: 0, display: "flex", flexDirection: "column", position: "relative", zIndex: 2 } },
                /* 对话面板单独包边界：某个消息节点渲染出错时只坏右侧对话区，编辑器仍可用 */
                React.createElement(ErrorBoundary, { key: "ebchat", title: "⚠ 对话面板渲染出错" },
                  React.createElement(ChatPanel, { sessions: chatSessions, connection: chatConnection, remote: props.remoteSession || null, uiConversation: props.uiConversation || null, selInfo: selInfo, activePath: activePath, folders: folders, onClose: () => setChatOpen(false), pinSession: deskPin, onPinSession: setDeskPin, anchorWs: deskPlatformWs, anchorManual: anchorManual, anchorPath: deskPath, pinWhy: deskPinWhy, onBindWorkspace: platWsBind, C: C }))
              )
            ) : null
          ),
          /* ㉔ 集成终端（编辑器下方、状态栏上方；可拖高/关闭） */
          termOpen ? React.createElement(React.Fragment, null,
            React.createElement("div", {
              style: { height: 4, flexShrink: 0, cursor: "row-resize", background: termDragRef.current ? "#3994BC" : "transparent", borderTop: "1px solid #2A2B2C" },
              onMouseDown: (e) => {
                e.preventDefault();
                termDragRef.current = { startY: e.clientY, startH: termH };
                const move = (ev) => {
                  if (!termDragRef.current) return;
                  setTermH(Math.min(700, Math.max(80, termDragRef.current.startH + (termDragRef.current.startY - ev.clientY))));
                };
                const up = () => { termDragRef.current = null; document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); window.removeEventListener("blur", up); };
                document.addEventListener("mousemove", move);
                window.addEventListener("blur", up);   // 鼠标在窗口外松开时浏览器不派发 mouseup，这里兜底清理
                document.addEventListener("mouseup", up);
              },
              onDoubleClick: () => setTermH(220),
              title: "拖动调整终端高度（双击复位 220px）"
            }),
            React.createElement("div", { style: { height: termH, flexShrink: 0, minHeight: 0, display: "flex", flexDirection: "column" } },
              React.createElement(TerminalPanel, { onClose: () => setTermOpen(false), getCwd: termCwd, C: C }))
          ) : null,
          /* ⑧ 底部状态栏（VSCode：左=分支/错误，中=状态，右=行号/语言/编码/缩进/行尾） */
          React.createElement("div", { style: { padding: "0 8px", borderTop: "1px solid #2A2B2C", background: "#191A1B", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, height: 22, fontSize: 11, color: "#fff" } },
            React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" } }, "🧑‍💻", React.createElement("span", { style: { fontWeight: 600 } }, "卡片桌面")),
            React.createElement("button", {
              onClick: () => saveFile(activePath),
              disabled: !activeTab,
              title: "保存 (Ctrl+S)",
              style: { background: "transparent", color: "#fff", border: "none", cursor: activeTab ? "pointer" : "default", fontSize: 11, opacity: activeTab ? 1 : 0.5, padding: "0 4px" }
            }, "保存"),
            React.createElement("button", {
              onClick: saveAll,
              disabled: !tabs.some((t) => t.dirty),
              title: "全部保存 (Ctrl+K S)",
              style: { background: "transparent", color: "#fff", border: "none", cursor: tabs.some((t) => t.dirty) ? "pointer" : "default", fontSize: 11, opacity: tabs.some((t) => t.dirty) ? 1 : 0.5, padding: "0 4px" }
            }, "全部保存"),
            React.createElement("span", {
              style: { fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, color: "#fff" },
              onClick: () => { if (activeTab && activeTab.error) openFile(activePath, true); }
            }, fsStatus || (activeTab && activeTab.dirty ? "未保存的更改" : "就绪")),
            /* 「返回检查结果」：结果面板是覆盖整个界面的模态遮罩，跳转时必须关掉才看得见编辑器；
               关掉前把结果留着，这里给一个入口，方便接着逐条核对（点击即重新打开，筛选状态也在）。 */
            lastCheck ? React.createElement("button", {
              onClick: () => { setCheckPanel(lastCheck); setLastCheck(null); },
              title: "重新打开上次的检查结果（" + (lastCheck.title || "") + "）",
              style: { background: "#3994BC", color: "#fff", border: "none", borderRadius: 3, padding: "1px 8px", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap", flexShrink: 0, marginRight: 8 }
            }, "← 返回检查结果") : null,
            /* 换编码后"第一处变化"的入口：不自动跳，用户想看再点 */
            (encJump && encJump.path === activePath) ? React.createElement("button", {
              onClick: () => { setJumpLine(encJump.line); setJumpCol(encJump.col); setEncJump(null); },
              title: "跳到本次换编码后第一处变化的行列（不会自动跳，避免打断你正在看的位置）",
              style: { background: "#2A2B2C", color: "#e2b341", border: "1px solid #4a4a4a", borderRadius: 3, padding: "1px 8px", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap", flexShrink: 0, marginRight: 8 }
            }, "跳到变化处（第 " + encJump.line + " 行）") : null,
            activeTab ? React.createElement("span", { style: { whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 10 } },
              React.createElement("span", {
                title: "行/列（点击跳转到行）",
                style: { cursor: "pointer" },
                onClick: () => { setGoToVal(String(cursor.line)); setGoToOpen(true); }
              }, "Ln " + cursor.line + ", Col " + cursor.col),
              React.createElement("span", { title: "语言模式" }, langOf(activeTab.path)),
              React.createElement("span", {
                title: activeNeedsGbk
                  ? "本文件按 UTF-8 保存且含中文：Vivado 按 GBK 读会显示乱码。点这里 →「转为 GBK 并保存」即可"
                  : (activeIsAscii
                    ? "纯 ASCII 文件：UTF-8 与 GBK 对这段字节完全相同，不存在编码问题（点击可查看/转换）"
                    : "编码（点击：按其它编码重新打开 / 转为指定编码保存）"),
                onClick: () => setEncDlgOpen(true),
                style: {
                  cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 2,
                  color: activeNeedsGbk ? "#e2b341" : undefined
                }
              }, (activeIsAscii && !activeTab.forceView ? "ASCII" : (activeTab.encoding || "utf8").toUpperCase())
                + (activeTab.forceView ? "*" : "")
                + (activeNeedsGbk ? "（Vivado 需转 GBK）" : "")),
              React.createElement("span", { title: "缩进（按文件探测）" }, indentLabelOf(activeTab.text)),
              React.createElement("span", {
                title: "编辑器字号（Ctrl+滚轮缩放，点击复位 " + EDITOR_FONT_DEFAULT + "）",
                onClick: () => { setEditorFont(EDITOR_FONT_DEFAULT); try { localStorage.setItem(EDITOR_FONT_KEY, String(EDITOR_FONT_DEFAULT)); } catch (e) { } },
                style: { cursor: "pointer" }
              }, "字号: " + editorFont),
              React.createElement("span", {
                title: "行尾序列（点击切换 LF ⇄ CRLF，保存时生效）",
                onClick: () => {
                  if (!activeTab) return;
                  const cur = (activeTab.eol || "lf") === "crlf" ? "CRLF" : "LF";
                  const nextEol = cur === "CRLF" ? "lf" : "crlf";
                  // 显示层文本恒为 \n，切换只改行尾标记，保存时按标记还原写出
                  setTabs((prev) => prev.map((t) => (t.path === activePath ? { ...t, eol: nextEol, dirty: true } : t)));
                  setFsStatus("行尾已切换: " + cur + " → " + (cur === "CRLF" ? "LF" : "CRLF") + "（保存生效）");
                  setFsStatusStyle({ color: C.dim });
                },
                style: { cursor: "pointer" }
              }, (activeTab.eol || "lf") === "crlf" ? "CRLF" : "LF"),
              React.createElement("span", { style: { opacity: 0.85 } }, activeTab.dirty ? "●" : "○")) : null)),
          goToOpen ? React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.35)" }, onClick: () => setGoToOpen(false) },
            React.createElement("div", { style: { background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, padding: 12, width: 300, boxShadow: "0 8px 24px rgba(0,0,0,.5)" }, onClick: (e) => e.stopPropagation() },
              React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "#e8e8e8", marginBottom: 8 } }, "跳转到行"),
              React.createElement("input", {
                autoFocus: true,
                value: goToVal,
                onChange: (e) => setGoToVal(e.target.value.replace(/[^0-9]/g, "")),
                onKeyDown: (e) => { e.stopPropagation(); if (e.key === "Enter") goToJump(); if (e.key === "Escape") setGoToOpen(false); },
                placeholder: "输入行号…",
                spellCheck: false,
                style: { width: "100%", boxSizing: "border-box", background: "#2A2B2C", color: C.text, border: "1px solid #3C3C3C", borderRadius: 4, padding: "6px 8px", fontSize: 12, outline: "none", marginBottom: 10 }
              }),
              React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
                React.createElement("button", { onClick: () => setGoToOpen(false), style: { background: "#2A2B2C", color: C.text, border: "1px solid #3C3C3C", borderRadius: 4, padding: "4px 14px", cursor: "pointer", fontSize: 12 } }, "取消"),
                React.createElement("button", { onClick: goToJump, style: { background: "#3994BC", color: "#fff", border: "none", borderRadius: 4, padding: "4px 14px", cursor: "pointer", fontSize: 12 } }, "跳转")))) : null,
          /* 文件编码弹窗：重新按某编码打开（只看，不改磁盘）+ 转码保存（写盘） */
          encDlgOpen ? React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 251, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.35)" }, onClick: () => setEncDlgOpen(false) },
            React.createElement("div", { style: { background: "#191A1B", border: "1px solid #3C3C3C", borderRadius: 6, padding: 14, width: 460, boxShadow: "0 8px 24px rgba(0,0,0,.5)" }, onClick: (e) => e.stopPropagation() },
              React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "#e8e8e8", marginBottom: 6 } }, "文件编码"),
              React.createElement("div", { style: { fontSize: 11, color: C.dim, marginBottom: 10, lineHeight: "17px" } },
                activeTab
                  ? (basename(activeTab.path) + "　当前：" + String(activeTab.encoding || "utf8").toUpperCase()
                    + (activeTab.forceView ? "（强制查看，文件未改）" : "（自动检测）")
                    + (countNonAscii(activeTab.text).chars ? "　非 ASCII 字符 " + countNonAscii(activeTab.text).chars + " 个" : "　纯 ASCII")
                    + (activeTab.writable === false ? "　※ 该文件无法无损回写" : ""))
                  : "未打开文件"),
              React.createElement("div", { style: { fontSize: 11, color: C.dim, marginBottom: 6 } }, "重新打开（只改变本编辑器的解读方式，磁盘文件不动）："),
              React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" } },
                encBtn("自动检测", () => reopenWithEncoding("")),
                encBtn("以 UTF-8 打开", () => reopenWithEncoding("utf8")),
                encBtn("以 GBK 打开（看 Vivado 效果）", () => reopenWithEncoding("gbk"))),
              React.createElement("div", { style: { fontSize: 11, color: C.dim, marginBottom: 6 } }, "转换并保存（写盘；Vivado 需要 GBK）："),
              (activeTab && activeTab.forceView)
                ? React.createElement("div", { style: { fontSize: 11, color: "#e2b341", marginBottom: 6, lineHeight: "17px" } },
                  "当前是「以 " + String(activeTab.forceView).toUpperCase() + " 预览」：屏幕上显示的是按该编码强行解读的结果，不是文件的真实内容。转码会优先回到文件真实解读再转换（避免把乱码二次编码写进文件）；若你在预览态下改过内容，会先请你点「自动检测」。")
                : null,
              React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                encBtn("转为 GBK 并保存", () => { setEncDlgOpen(false); fixCommentEncoding("gbk"); }),
                encBtn("转为 UTF-8 并保存", () => { setEncDlgOpen(false); fixCommentEncoding("utf8"); })),
              React.createElement("div", { style: { fontSize: 11, color: C.dim, marginTop: 12, lineHeight: "17px" } },
                "判断乱码来源：把这份文件用「以 GBK 打开」看一遍 —— 如果显示成乱码，说明 Vivado 那边也会乱码，用「转为 GBK 并保存」修好；如果显示正常，说明文件本来就是 GBK，问题不在这儿。"),
              React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: 10 } },
                React.createElement("button", { onClick: () => setEncDlgOpen(false), style: { background: "#2A2B2C", color: C.text, border: "1px solid #3C3C3C", borderRadius: 4, padding: "4px 14px", cursor: "pointer", fontSize: 12 } }, "关闭")))) : null);
    };

    /* ---------------- 插件体 ---------------- */
    /* 渲染错误边界：CodeWorkbench 子树一旦抛错，显示错误文本 + 重试，而不是整块白屏消失 */
    class ErrorBoundary extends React.Component {
      constructor(props) { super(props); this.state = { err: null, cstack: "" }; }
      static getDerivedStateFromError(err) { return { err }; }
      componentDidCatch(err, info) {
        try { console.error("[card-desktop]", err, info && info.componentStack); } catch (e2) { }
        // 出错时只显示 message 定位不了问题：把组件栈也存下来一起显示
        try { this.setState({ cstack: String((info && info.componentStack) || "") }); } catch (e2) { }
      }
      render() {
        if (this.state.err) {
          const msg = (this.state.err && (this.state.err.message || String(this.state.err))) || "未知错误";
          // 只挑与本插件源码相关的帧（bundle 未压缩，行号直接可读）
          const stAll = String((this.state.err && this.state.err.stack) || "").split("\n").filter((l) => l.trim());
          const stOwn = stAll.filter((l) => l.indexOf("client.js") >= 0).slice(0, 5);
          // 优先本插件帧（行号直接可读）；报错抛在官方代码里时退回原始栈前 6 行，否则什么都看不到
          const stFrames = (stOwn.length ? stOwn : stAll.slice(0, 6)).join("\n");
          const csFrames = String(this.state.cstack || "")
            .split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6).join("\n");
          return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, alignItems: "center", justifyContent: "center", height: "100%", background: "#202122", color: "#d19a66", fontSize: 13, padding: 24, fontFamily: "Consolas, monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" } },
            React.createElement("div", { style: { fontSize: 16, fontWeight: 700 } }, String(this.props.title || "⚠ 代码工作台渲染出错")),
            React.createElement("div", null, msg),
            (stFrames || csFrames) ? React.createElement("div", {
              style: { fontSize: 11, color: "#8a8f98", maxWidth: "92%", maxHeight: "46vh", overflow: "auto", textAlign: "left", background: "#17181a", border: "1px solid #3C3C3C", borderRadius: 4, padding: "8px 10px", whiteSpace: "pre-wrap" }
            },
              (stFrames ? "—— 出错位置" + (stOwn.length ? "（client.js 帧）" : "（非本插件代码，原始栈）") + "——" + "\n" + stFrames : ""),
              (csFrames ? "\n—— 组件栈 ——" + "\n" + csFrames : "")
            ) : null,
            React.createElement("button", {
              onClick: () => this.setState({ err: null }),
              style: { background: "#3994BC", color: "#fff", border: "none", borderRadius: 4, padding: "6px 18px", cursor: "pointer", fontSize: 13 }
            }, "重试"));
        }
        return this.props.children;
      }
    }
    // 目录级替换后「重载同目录下已打开标签」的回调：由 CodeWorkbench 注册、FindDialog 调用。
    // 用模块级单点注册而不是实例 prop 透传，是因为 FindDialog 与 CodeWorkbench 之间隔着
    // CodePane，走 prop 要同时改 4 个 CodePane 渲染点，容易漏。
/* ---------- i18n：注册本插件词典，取词失败一律回退中文硬编码 ---------- */
    let l10n = (zh) => zh;
    const makeL10n = (ctx) => {
      const svc = (typeof ctx.get === "function" ? ctx.get("locale") : null) || null;
      if (!svc || typeof svc.register !== "function") return (zh) => zh;
      try {
        ctx.effect(() => svc.register("card-desktop", {
          zh: { entry: "卡片桌面", desktop: "卡片桌面", chat: "对话", code: "代码工作台", music: "音乐", exit: "退出", backToDesktop: "← 桌面" },
          en: { entry: "Card Desktop", desktop: "Card Desktop", chat: "Chat", code: "Code Workbench", music: "Music", exit: "Exit", backToDesktop: "← Desktop" }
        }), "card-desktop: locale dictionaries");
      } catch (e) { return (zh) => zh; }
      let tr = null;
      try { tr = svc.bind("card-desktop"); } catch (e) { tr = null; }
      if (typeof tr !== "function") return (zh) => zh;
      return (zh, key) => {
        try {
          const v = key ? tr(key) : null;
          return (v === undefined || v === null || v === "") ? zh : v;
        } catch (e) { return zh; }
      };
    };
/* ---------- 全局 Toast：卡片桌面顶层提示（工作台各处可调用） ---------- */
    let deskToastHandler = null;
    const deskToast = (text, ok) => {
      try { if (typeof deskToastHandler === "function") deskToastHandler(String(text || ""), ok !== false); } catch (e) { }
    };

    /* ---------- 音乐视图：直接对接已装 dsh-music-player 的同源 HTTP 路由 ----------
       dsh-music-player 的 host 半边注册了 /dsh-music/*（manifest / tracks / prefs / intent），
       但它没有对外提供 Cordis Service，所以卡片桌面只能用 HTTP 读它，而不是调用它的面板组件。 */
    const DeskMusicView = () => {
      const [man, setMan] = React.useState(null);
      const [err, setErr] = React.useState(null);
      const [idx, setIdx] = React.useState(-1);
      const [playing, setPlaying] = React.useState(false);
      const audioRef = React.useRef(null);

      React.useEffect(() => {
        let alive = true;
        fetch("/dsh-music/manifest", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
          .then((d) => { if (alive) setMan(d || {}); })
          .catch((e) => { if (alive) setErr((e && e.message) || String(e)); });
        return () => { alive = false; };
      }, []);

      const tracks = (man && man.tracks) || [];
      const cur = idx >= 0 && idx < tracks.length ? tracks[idx] : null;
      // dsh-music-player 的曲目对象实际是 { id, name, path, size, ext, url, quality }，
      // 并没有 title / artist 字段（实测 manifest 与插件源码确认）：
      // 名字取 name 并去掉扩展名，副标题用 quality / ext。
      const trackNameOf = (tr, i) => String((tr && (tr.name || tr.title)) || ("曲目 " + (i + 1))).replace(/\.[A-Za-z0-9]{1,6}$/, "");
      const mbtn = (label, extra, onClick) => React.createElement("button", {
        onClick,
        style: Object.assign({ background: "#2A2B2C", color: C.text, border: "1px solid #3C3C3C", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 13 }, extra || {})
      }, label);
      const pick = (i) => {
        setIdx(i);
        const a = audioRef.current;
        const t = tracks[i];
        if (a && t && t.url) {
          a.src = t.url;
          const p = a.play();
          if (p && p.catch) p.catch(() => setPlaying(false));
        }
      };
      const toggle = () => {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) { const p = a.play(); if (p && p.catch) p.catch(() => { }); } else a.pause();
      };
      const step = (d) => { if (tracks.length) pick((idx + d + tracks.length) % tracks.length); };

      const note = (txt) => React.createElement("div", { style: { color: "#d2dae6", fontSize: 13, padding: "6px 0", textAlign: "center" } }, txt);
      let body;
      if (err) body = note("无法连接音乐插件（/dsh-music/manifest 返回 " + err + "）。请确认 dsh-music-player 已加载。");
      else if (man === null) body = note("正在读取音乐库…");
      else if (!tracks.length) body = note("音乐插件已就绪，但曲库为空（可先在音乐面板里设置曲库目录）。");
      else body = React.createElement("div", { style: { flex: 1, minHeight: 0, overflow: "auto", width: "100%", maxWidth: 720 } },
        tracks.map((t, i) => React.createElement("div", {
          key: t.url || String(i),
          onClick: () => pick(i),
          style: {
            display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 10px", borderRadius: 6, cursor: "pointer",
            background: i === idx ? "rgba(57,148,188,.25)" : "transparent", color: "#eef1f6", fontSize: 13
          }
        },
          React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, trackNameOf(t, i)),
          React.createElement("span", { style: { color: "#9aa4b2", flexShrink: 0 } }, [t.quality, t.ext].filter(Boolean).join(" · ")))));

      const flags = [];
      if (man) {
        if (man.qqLoggedIn) flags.push("QQ音乐已登录");
        if (man.kgLoggedIn) flags.push("酷狗已登录");
        if (man.ncLoggedIn) flags.push("网易云已登录");
        if (man.ttsConfigured) flags.push("AI讲书就绪");
        if (typeof man.count === "number") flags.push("曲目 " + man.count);
      }
      return React.createElement("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 18px", gap: 10 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" } },
          mbtn("⏮", { fontSize: 16, padding: "6px 14px" }, () => step(-1)),
          mbtn(playing ? "⏸" : "▶", { fontSize: 16, padding: "6px 18px" }, toggle),
          mbtn("⏭", { fontSize: 16, padding: "6px 14px" }, () => step(1)),
          React.createElement("span", { style: { color: "#eef1f6", fontSize: 14, marginLeft: 6 } }, cur ? trackNameOf(cur, idx) : "未选择曲目")),
        React.createElement("audio", {
          ref: audioRef, controls: true, style: { width: "100%", maxWidth: 720 },
          onPlay: () => setPlaying(true), onPause: () => setPlaying(false)
        }),
        flags.length ? React.createElement("div", { style: { color: "#9aa4b2", fontSize: 12 } }, flags.join(" · ")) : null,
        body);
    };

    /* ==================== 源代码管理（本地 Git） ====================
       设计口径（与 VSCode 一致）：
       ① 只做「本地仓库」的事：看变更、看 diff、写提交、丢弃单个文件的改动、回退到某个提交。
          远程（push/pull/克隆）不在本面板内 —— 那涉及凭据与网络，另议。
       ② 「丢弃改动」和「回退到某提交」都会写盘，属于用户明确要求可撤销的操作：
          调宿主拿到 { prev } 原文，压进编辑器撤销栈对应的兜底通道（gitOpUndoRef），
          这样 Ctrl+Z（编辑器栈空时）能整批撤回。
       ③ 提交信息由用户自己写，绝不自动生成 —— 历史是给人看的。
       ================================================================ */

    /* 状态码 → 中文/取色。xy 两位分别是「暂存区状态」和「工作区状态」。 */
    const GIT_STATUS_LABEL = {
      "M": { t: "修改", c: "#D19A66" },
      "A": { t: "新增", c: "#2EA043" },
      "D": { t: "删除", c: "#E06C75" },
      "R": { t: "重命名", c: "#3994BC" },
      "C": { t: "复制", c: "#3994BC" },
      "U": { t: "冲突", c: "#E06C75" },
      "?": { t: "未跟踪", c: "#2EA043" },
      "!": { t: "已忽略", c: "#808080" }
    };
    const gitCodeOf = (f) => {
      if (!f) return { code: "?", label: "未跟踪", color: "#2EA043" };
      if (f.x === "?" && f.y === "?") return { code: "?", label: "未跟踪", color: "#2EA043" };
      const raw = (f.y && f.y !== " ") ? f.y : (f.x && f.x !== " " ? f.x : "M");
      const m = GIT_STATUS_LABEL[raw] || { t: "修改", c: "#D19A66" };
      return { code: raw, label: m.t, color: m.c };
    };
    /* 仓库内相对路径 → 编辑器标签用的绝对路径 */
    const gitAbsPath = (root, rel) => {
      if (!root || !rel) return "";
      const sep = root.endsWith("\\") ? "" : "\\";
      return root + sep + String(rel).replace(/\//g, "\\");
    };
    /* 统一 diff → 逐行带标记的数组，供自绘渲染。
       刻意不用 dangerouslySetInnerHTML：diff 内容来自文件原文，含 HTML 风险。 */
    const parseUnifiedDiff = (text) => {
      const out = [];
      let oldLn = 0, newLn = 0;   /* 由 hunk 头设定初值，随后逐行前进 */
      for (const line of String(text || "").split("\n")) {
        if (line.startsWith("diff --git") || line.startsWith("index ") ||
          line.startsWith("--- ") || line.startsWith("+++ ") ||
          line.startsWith("new file") || line.startsWith("deleted file") ||
          line.startsWith("similarity index") || line.startsWith("rename ")) {
          continue;   // 头部元信息不展示，只留 hunk 与内容行
        }
        if (line.startsWith("@@")) {
          /* 解析 hunk 头：@@ -旧起点,旧行数 +新起点,新行数 @@ 上下文 */
          const hm = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(line);
          oldLn = hm ? Number(hm[1]) : 0;
          newLn = hm ? Number(hm[3]) : 0;
          out.push({
            k: "hunk", text: line,
            oldStart: oldLn, newStart: newLn,
            ctxText: hm ? (hm[5] || "").trim() : ""
          });
          continue;
        }
        if (line.startsWith("\\")) continue;   // "\ No newline at end of file"
        /* 逐行带出真实行号：新增行给新文件行号，删除行给旧文件行号，
           上下文行两者同时前进（显示新文件行号）。 */
        if (line.startsWith("+")) { out.push({ k: "add", text: line.slice(1), ln: newLn, oldLn: null }); newLn++; continue; }
        if (line.startsWith("-")) { out.push({ k: "del", text: line.slice(1), ln: oldLn, oldLn: oldLn }); oldLn++; continue; }
        if (line.startsWith(" ")) { out.push({ k: "ctx", text: line.slice(1), ln: newLn, oldLn: oldLn }); newLn++; oldLn++; continue; }
        if (line === "") continue;             // 结尾换行产生的空串不是内容行
        out.push({ k: "ctx", text: line, ln: newLn, oldLn: oldLn }); newLn++; oldLn++;
      }
      return out;
    };
    const GIT_DIFF_COLOR = { add: "#2EA043", del: "#E06C75", ctx: "#8C8C8C", hunk: "#3994BC" };
    /* 模块级共享：让工作台（菜单/快捷键）能触发面板刷新 */
    const gitPanelRef = { current: null };
    /* 让源代码管理面板立刻重读状态（写盘类操作后调用）。
       ★ 别和 gitPanelRefresh() 搞混：那个只 +gitRev 重探工作台自己的 scmStat（管可见性），
         刷新「改动列表」必须调面板自己的 refresh()。
       注：这里在 apiCall 之前声明位置之后被引用 —— 模块级 const 在加载时初始化，
         而调用发生在用户操作时，运行期不存在 TDZ 问题。 */
    const refreshScmPanelNow = () => {
      try {
        const gpr = gitPanelRef.current;
        if (gpr && typeof gpr.refresh === "function") gpr.refresh();
      } catch (e) { /* 面板未挂载 / 刷新抛错都不该影响写盘结果 */ }
    };

    /* 单个文件重新读盘（丢弃改动 / 回退到某提交之后必须做，否则标签仍持有旧文本，
       用户下一次 Ctrl+S 就会把刚回退的结果又写回去 —— 与目录替换同一个坑）。 */
    const reloadFileFromDisk = async (p, env) => {
      if (!p) return;
      const tabsNow = env.tabsRef.current || [];
      const target = tabsNow.find((x) => x.path === p);
      if (!target) return;   // 该文件没打开就不用管
      if (target.dirty) {
        env.setFsStatus("注意：该文件有未保存改动，未重新载入（保存会覆盖磁盘上的回退结果）");
        env.setFsStatusStyle({ color: env.C.warn });
        return;
      }
      try {
        const res = await apiCall("readFile", { path: p });
        if (!res || !res.ok) return;
        const txt = String(res.content).replace(/\r\n/g, "\n");
        env.setTabs((ts) => ts.map((x) => (x.path === p ? Object.assign({}, x, {
          text: txt, dirty: false,
          diskMtime: res.mtimeMs || 0, diskSize: res.size || 0,
          writable: res.writable !== false, bom: res.hasBom === true
        }) : x)));
      } catch (e) { /* 单个失败不影响其它流程 */ }
    };

    /* ---- 工作区文件夹归属（多文件夹工作区：决定在哪个大文件夹里做版本控制） ----
       用户的诉求：工作区有多个"大文件夹"（如 RFSOC_48DR_0813 / RFSOC_48DR_lk_1 / wuwei - VIO），
       要能在**指定的那个大文件夹**里建仓库，而不是打开文件所在的子文件夹里。

       核心规则（与 VSCode 一致）：归属按**工作区文件夹**判定，不按打开的文件所在子目录。
       例如打开 E:\...\RFSOC_48DR_0814_vio\src\a.v 时，目标文件夹是
       E:\...\RFSOC_48DR_0814_vio（工作区条目），不是 ...\RFSOC_48DR_0814_vio\src。 */

    /* 归一化：统一分隔符、去末尾斜杠、小写（Windows 路径大小写不敏感） */
    const normPath = (p) => String(p || "").replace(/[\\/]+/g, "/").replace(/\/+$/, "").toLowerCase();

    /* 判断 child 是否在 parent 之下（含相等）。按"路径段"比较，避免 RFSOC_a 误配 RFSOC_ab */
    const isUnderDir = (parent, child) => {
      const a = normPath(parent), b = normPath(child);
      if (!a || !b) return false;
      if (a === b) return true;
      return b.indexOf(a + "/") === 0;
    };

    /* 给定一个文件路径，找出它属于哪个**工作区文件夹**。
       多个匹配时取**最长**的那个（嵌套工作区文件夹时以更具体的为准）。
       找不到归属时返回空串（调用方决定兜底）。 */
    const folderOfFile = (filePath, folders) => {
      const list = Array.isArray(folders) ? folders : [];
      if (!filePath || !list.length) return "";
      let best = "", bestLen = -1;
      for (const f of list) {
        const p = (f && f.path) || "";
        if (!p) continue;
        if (isUnderDir(p, filePath)) {
          const len = normPath(p).length;
          if (len > bestLen) { bestLen = len; best = p; }
        }
      }
      return best;
    };

    /* 推断"当前应该对哪个文件夹做版本控制"：
       ① 优先用当前活动文件（用户正在看/编辑的那个）所属的工作区文件夹；
       ② 其次用另一侧（副组）活动的文件；
       ③ 都没有就用已打开的标签里第一个有归属的；
       ④ 再没有就用用户手动选过的（manual）；
       ⑤ 最后兜底一个文件夹（列表第一个），但**标记为 low 置信度**，
          由界面提示"未找到打开的文件，请确认目标文件夹"。 */
    const pickScmFolder = (folders, ctx) => {
      const list = Array.isArray(folders) ? folders : [];
      if (!list.length) return { path: "", from: "none" };
      const c = ctx || {};
      const manual = (c.manual && list.some((f) => f.path === c.manual)) ? c.manual : "";

      const tryFile = (p, from) => {
        const hit = folderOfFile(p, list);
        return hit ? { path: hit, from: from, file: p } : null;
      };

      const r1 = tryFile(c.activePath, "active");        /* 当前文件 */
      if (r1) return r1;
      const r2 = tryFile(c.rightActivePath, "right");    /* 副组当前文件 */
      if (r2) return r2;

      /* 已打开的标签（主组优先，再副组）——取第一个能定位到工作区文件夹的 */
      for (const p of (c.tabs || [])) {
        const r = tryFile(p, "openTab");
        if (r) return r;
      }
      for (const p of (c.rightPaths || [])) {
        const r = tryFile(p, "openTab");
        if (r) return r;
      }

      if (manual) return { path: manual, from: "manual" };
      return { path: list[0].path, from: "fallback" };
    };

    /* 该文件夹状态下的界面文案与按钮可用性（纯函数，便于离线断言） */
    const scmFolderHint = (pick, folders) => {
      const p = (pick && pick.path) || "";
      const pct = p ? p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() : "";
      const n = (Array.isArray(folders) ? folders : []).length;
      if (!p) return { name: "", text: "请先打开一个工作区文件夹。", low: true };
      if (pick.from === "active" || pick.from === "right")
        return { name: pct, text: "按当前打开的文件判断，目标文件夹：", low: false };
      if (pick.from === "openTab")
        return { name: pct, text: "按已打开的标签判断，目标文件夹：", low: false };
      if (pick.from === "manual")
        return { name: pct, text: "按你的选择，目标文件夹：", low: false };
      return { name: pct, text: n > 1 ? "未找到已打开的文件，请确认要在哪个文件夹中启用：" : "目标文件夹：", low: true };
    };

    const GitPanel = (props) => {
      const root = props.root || "";
      const [st, setSt] = React.useState(null);        // gitStatus 返回值
      const [loading, setLoading] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [err, setErr] = React.useState("");
      const [msg, setMsg] = React.useState("");
      const [sel, setSel] = React.useState(null);      // 选中的文件（绝对路径）
      const [diff, setDiff] = React.useState(null);
      const [diffLoading, setDiffLoading] = React.useState(false);
      const [log, setLog] = React.useState(null);      // 提交历史
      const [showLog, setShowLog] = React.useState(false);
      /* 展开查看的提交（点提交行）与其数据；此前提交行完全不可点，用户以为坏了 */
      const [openCommit, setOpenCommit] = React.useState(null);   // 提交号
      const [commitInfo, setCommitInfo] = React.useState(null);   // gitShowCommit 返回
      const [commitBusy, setCommitBusy] = React.useState(false);
      const [commitErr, setCommitErr] = React.useState("");
      const [commitFile, setCommitFile] = React.useState(null);   // 展开里选中的文件
      const [initBusy, setInitBusy] = React.useState(false);

      const refresh = React.useCallback(async (keepSel) => {
        if (!root) { setSt(null); return; }
        setLoading(true); setErr("");
        const r = await apiCall("gitStatus", { path: root });
        setLoading(false);
        if (!r || r.ok !== true) { setErr((r && r.error) || "读取版本状态失败"); setSt(null); return; }
        setSt(r);
        if (keepSel && sel) return;
        const fs0 = (r.status && r.status.files) || [];
        setSel(fs0.length ? gitAbsPath(r.root, fs0[0].path) : null);
      }, [root, sel]);

      /* 切工作区 / 首次挂载都要刷新 */
      React.useEffect(() => { setSel(null); setDiff(null); setShowLog(false); setOpenCommit(null); setCommitInfo(null); setCommitFile(null); setCommitErr(""); refresh(false); }, [root]);
      /* 暴露刷新入口给工作台（提交 / 回退后） */
      React.useEffect(() => {
        gitPanelRef.current = { refresh: () => refresh(true), root };
        return () => { if (gitPanelRef.current && gitPanelRef.current.root === root) gitPanelRef.current = null; };
      }, [refresh, root]);

      /* 选中文件变化 → 取 diff */
      React.useEffect(() => {
        let dead = false;
        if (!sel || !st || st.isRepo !== true) { setDiff(null); return; }
        setDiffLoading(true);
        apiCall("gitDiff", { path: root, file: sel }).then((r) => {
          if (dead) return;
          setDiffLoading(false);
          if (r && r.ok) setDiff({ text: r.diff || "", truncated: r.truncated === true });
          else setDiff({ text: "", error: (r && r.error) || "读取差异失败" });
        }).catch(() => { if (!dead) { setDiffLoading(false); setDiff({ text: "", error: "读取差异失败" }); } });
        return () => { dead = true; };
      }, [sel, root, st]);

      const doInit = async () => {
        setInitBusy(true); setErr("");
        const r = await apiCall("gitInit", { path: root });
        setInitBusy(false);
        if (!r || r.ok !== true) { setErr((r && r.error) || "启用失败"); return; }
        props.onStatus("已启用版本控制：" + root + "（已生成 .gitignore，首次提交请自行填写说明）");
        refresh(false);
      };

      /* 读提交历史（limit 50）。放在 doCommit 之前：提交 / 重置分支 / 点刷新 都要用它。
         2026-09-23 修：此前只在点「历史」开关时读一次，导致刚提交的内容不刷新。 */
      const loadLog = async () => {
        const r = await apiCall("gitLog", { path: root, limit: 50 });
        setLog(r && r.ok ? r.commits : []);
      };
      const doCommit = async () => {
        const m = String(msg || "").trim();
        if (!m) { setErr("请填写提交说明"); return; }
        setBusy(true); setErr("");
        const r = await apiCall("gitCommit", { path: root, message: m }, 120000);
        setBusy(false);
        if (!r || r.ok !== true) { setErr((r && r.error) || "提交失败"); return; }
        setMsg("");
        props.onStatus("已提交 " + (r.hash || "") + "：" + m);
        refresh(false);
        /* 历史面板开着就直接重载，否则用户会以为"提交了但列表里没有" */
        if (showLog) loadLog();
      };

      /* 点提交行：展开看这次提交改了什么（再点一次收起）。
         取数走宿主新接口 gitShowCommit（原来没有，所以点了没反应）。 */
      const openCommitRow = async (hash) => {
        if (!hash) return;
        if (openCommit === hash) {
          setOpenCommit(null); setCommitInfo(null); setCommitFile(null); setCommitErr("");
          return;
        }
        setOpenCommit(hash); setCommitInfo(null); setCommitFile(null); setCommitErr("");
        setCommitBusy(true);
        const r = await apiCall("gitShowCommit", { path: root, hash: hash });
        setCommitBusy(false);
        if (!r || r.ok !== true) { setCommitErr((r && r.error) || "读取提交内容失败"); return; }
        setCommitInfo(r);
        /* 只有一个文件时直接选中它，省一次点击 */
        const fs1 = r.files || [];
        if (fs1.length === 1) {
          setCommitFile(fs1[0].path);
          const d1 = await apiCall("gitShowCommit", { path: root, hash: hash, file: fs1[0].path });
          if (d1 && d1.ok === true) setCommitInfo(Object.assign({}, r, { fileDiff: d1.diff || "", filePath: fs1[0].path }));
        }
      };
      /* 展开里点某个文件 → 取该文件在这次提交里的 diff */
      const openCommitFile = async (p) => {
        if (!openCommit || !p) return;
        setCommitFile(p);
        const d = await apiCall("gitShowCommit", { path: root, hash: openCommit, file: p });
        if (d && d.ok === true) setCommitInfo((prev) => Object.assign({}, prev || {}, { fileDiff: d.diff || "", filePath: p }));
      };
      const doDiscard = async (abs) => {
        const ok = await deskConfirm("丢弃这个文件的未提交改动？\n\n" + abs + "\n\n（会从最近一次提交恢复；未跟踪的新文件将被删除）");
        if (!ok) return;
        setBusy(true); setErr("");
        const r = await apiCall("gitDiscard", { path: root, file: abs }, 120000);
        setBusy(false);
        if (!r || r.ok !== true) { setErr((r && r.error) || "丢弃失败"); return; }
        props.onCodeOp({
          kind: r.action === "deleted-untracked" ? "git-delete" : "git-discard",
          file: abs,
          prev: r.prev && r.prev.content,
          encoding: r.prev && r.prev.encoding,
          existed: !!(r.prev && r.prev.existed)
        });
        props.onStatus("已丢弃改动：" + abs + "（Ctrl+Z 可撤回）");
        props.onReloadFile(abs);
        refresh(true);
      };

      const doRestore = async (abs, rev, label) => {
        const ok = await deskConfirm("把这个文件回退到 " + label + "？\n\n" + abs + "\n\n（当前内容会被覆盖，Ctrl+Z 可撤回）");
        if (!ok) return;
        setBusy(true); setErr("");
        const r = await apiCall("gitRestoreFile", { path: root, file: abs, rev: rev }, 120000);
        setBusy(false);
        if (!r || r.ok !== true) { setErr((r && r.error) || "回退失败"); return; }
        props.onCodeOp({
          kind: "git-restore", file: abs,
          prev: r.prev && r.prev.content, encoding: r.prev && r.prev.encoding,
          existed: !!(r.prev && r.prev.existed)
        });
        props.onStatus("已回退到 " + label + "：" + abs + "（Ctrl+Z 可撤回）");
        props.onReloadFile(abs);
        refresh(true);
      };

      const panelErr = err ? React.createElement("div", {
        style: { color: "#E06C75", fontSize: 11, padding: "4px 8px", borderBottom: "1px solid " + C.border }
      }, err) : null;

      /* ---- 未打开工作区 ---- */
      if (!root) {
        return React.createElement("div", { style: { padding: 12, color: "#808080", fontSize: 12 } }, "请先打开一个工作区文件夹。");
      }
      /* ---- 读取中 ---- */
      if (loading && !st) {
        return React.createElement("div", { style: { padding: 12, color: C.accent, fontSize: 12 } }, "读取版本状态…");
      }
      /* 目标文件夹选择器（多文件夹工作区）：未启用时用它确认/切换在哪个大文件夹里建仓库，
         已启用时也能切到另一个文件夹看它各自的状态。 */
      const folderPick = ((props.folders && props.folders.length > 1) || (props.pick && props.pick.from !== "active"))
        ? React.createElement("div", {
          style: { padding: "6px 8px", borderBottom: "1px solid " + C.border, flexShrink: 0, fontSize: 11 }
        },
          React.createElement("div", { style: { color: C.dim, marginBottom: 4 } },
            (props.hint && props.hint.text) || "目标文件夹："),
          React.createElement("select", {
            value: (props.pick && props.pick.path) || "",
            onChange: (e) => props.onPickFolder(e.target.value),
            title: "选择在哪个工作区文件夹中做版本控制",
            style: {
              width: "100%", boxSizing: "border-box", background: "#121314", color: C.text,
              border: "1px solid " + C.controlBorder, borderRadius: 3, padding: "3px 4px",
              fontSize: 11, fontFamily: "inherit", outline: "none"
            }
          }, ...(props.folders || []).map((f, i) => {
            const nm = (f && (f.name || f.path)) || ("文件夹 " + (i + 1));
            const here = (props.pick && props.pick.path) === (f && f.path);
            return React.createElement("option", { key: (f && f.path) || i, value: (f && f.path) || "" },
              nm + " — " + ((f && f.path) || "") + (here ? "　（当前）" : ""));
          })))
        : null;

      /* ---- 未启用版本控制 ---- */
      if (st && st.isRepo === false) {
        return React.createElement("div", {
          style: { padding: 12, fontSize: 12, color: C.text, display: "flex", flexDirection: "column", gap: 8 }
        },
          React.createElement("div", { style: { color: "#D19A66", fontWeight: 600 } }, "当前工作区尚未启用版本控制"),
          React.createElement("div", { style: { color: C.dim, lineHeight: 1.7 } },
            "启用后会在这个工程目录里创建一个本地仓库（.git），并自动生成 .gitignore，把 Vivado 生成物（.cache/.gen/.runs/.bit 等）排除在外。" +
            "这一步很重要：生成物一旦进了历史就极难清理。"),
          folderPick,
          React.createElement("div", {
            style: {
              color: (props.hint && props.hint.low) ? C.warn : C.text,
              wordBreak: "break-all", fontFamily: "Consolas, monospace", fontSize: 11
            }
          }, "将在此文件夹中建立仓库：" + root),
          (props.hint && props.hint.low)
            ? React.createElement("div", { style: { color: C.warn } },
              "没有找到已打开的文件可判断归属，请用上面的下拉框确认要在哪个文件夹中启用。")
            : null,
          err ? React.createElement("div", { style: { color: "#E06C75" } }, err) : null,
          React.createElement("button", {
            onClick: doInit, disabled: initBusy,
            style: {
              alignSelf: "flex-start", background: C.buttonBg, color: "#fff", border: "none",
              borderRadius: 4, padding: "6px 14px", cursor: initBusy ? "default" : "pointer",
              fontSize: 12, opacity: initBusy ? 0.6 : 1
            }
          }, initBusy ? "启用中…" : "启用版本控制"));
      }
      /* ---- 其它失败 ---- */
      if (!st) {
        return React.createElement("div", { style: { padding: 12, color: "#E06C75", fontSize: 12 } }, err || "无法读取版本状态");
      }

      const files = (st.status && st.status.files) || [];
      const br = (st.status && st.status.branch) || "";
      const ahead = (st.status && st.status.ahead) || 0;
      const behind = (st.status && st.status.behind) || 0;

      const commitBox = React.createElement("div", {
        style: { padding: 6, borderBottom: "1px solid " + C.border, flexShrink: 0 }
      },
        React.createElement("textarea", {
          value: msg, onChange: (e) => setMsg(e.target.value),
          placeholder: "提交说明（例如：修正 DDC 频偏计算）",
          rows: 2,
          style: {
            width: "100%", boxSizing: "border-box", background: "#121314", color: C.text,
            border: "1px solid " + C.controlBorder, borderRadius: 3, padding: "4px 6px",
            fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none"
          }
        }),
        React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", marginTop: 5 } },
          React.createElement("button", {
            onClick: doCommit, disabled: busy || files.length === 0,
            title: files.length === 0 ? "没有可提交的变更" : "提交全部变更",
            style: {
              background: (busy || files.length === 0) ? "#2A2B2C" : C.buttonBg, color: "#fff",
              border: "none", borderRadius: 3, padding: "4px 12px",
              cursor: (busy || files.length === 0) ? "default" : "pointer", fontSize: 12
            }
          }, busy ? "处理中…" : ("提交全部（" + files.length + "）")),
          React.createElement("span", { style: { color: "#808080", fontSize: 10 } },
            st.hasHead ? "仅本地，不推送远程" : "首次提交")));

      /* ---- 变更列表 ---- */
      const fileRows = files.map((f) => {
        const abs = gitAbsPath(st.root, f.path);
        const code = gitCodeOf(f);
        const on = sel === abs;
        const parts = f.path.replace(/\\/g, "/").split("/");
        const nm = parts[parts.length - 1];
        const dir = parts.slice(0, -1).join("/");
        return React.createElement("div", {
          key: f.path,
          onClick: () => setSel(abs),
          title: f.path,
          style: {
            display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", cursor: "pointer",
            background: on ? "rgba(57,148,188,.25)" : "transparent", fontSize: 12
          }
        },
          React.createElement("span", { style: { color: code.color, fontWeight: 700, width: 12, flexShrink: 0, textAlign: "center" } }, code.code),
          React.createElement("span", {
            style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: on ? "#fff" : C.text }
          }, nm),
          dir ? React.createElement("span", {
            style: { color: "#6b6b6b", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }
          }, dir) : null,
          React.createElement("button", {
            onClick: (e) => { e.stopPropagation(); doDiscard(abs); },
            title: "丢弃这个文件的未提交改动（回到最近一次提交）",
            style: { background: "transparent", border: "none", color: "#808080", cursor: "pointer", fontSize: 12, padding: "0 3px", flexShrink: 0 }
          }, "↶"));
      });
      const fileList = files.length === 0
        ? React.createElement("div", { style: { padding: "8px 10px", color: "#808080", fontSize: 11 } }, "没有未提交的变更")
        : fileRows;

      /* ---- 提交历史（可折叠） ---- */
      /* 提交里文件状态字母的配色（M 改 / A 增 / D 删 / R 改名 …） */
      const gitCommitStatusColor = (s) => {
        const k = String(s || "").slice(0, 1).toUpperCase();
        if (k === "A") return "#2EA043";
        if (k === "D") return "#E06C75";
        if (k === "R" || k === "C") return "#3994BC";
        return "#D19A66";
      };
      /* 整树回退到某提交：危险操作，二次确认；成功后刷新状态 */
      const doRestoreCommit = (hash, short) => {
        (async () => {
          const okGo = await deskConfirm("把工作区文件还原到提交 " + short + " ？\n\n" +
            "只改磁盘上的文件内容，**不移动分支**（历史不会被改写，随时能再回退回去）。\n" +
            "所以还原后这些差异会显示成一批「待提交的改动」—— 那是正常的，提交它们就等于把这次还原存成一次新提交。\n\n" +
            "注意：未提交的改动会丢失（无法从历史找回）；那次提交之后新增的文件会保留，不会被删除。");
          if (!okGo) return;
          setBusy(true);
          const r = await apiCall("gitRestoreCommit", { path: root, hash: hash }, 120000);
          setBusy(false);
          if (!r || r.ok !== true) { setErr((r && r.error) || "整树回退失败"); return; }
          setErr("");
          /* 必须给可见反馈：工作区本就与该提交一致时（点最新提交就是这种情况）界面
             不会有任何变化，此前因此被当成「点了没反应」。 */
          const nChg = Number(r.changedCount || 0);
          const nRem = Number(r.remainingCount || 0);
          /* 分支没动 —— 这句话是关键：用户看到「还提示提交全部」时会以为出错了 */
          const headTxt = r.headShort ? ("分支仍指向 " + r.headShort) : "分支未移动";
          if (!nChg) {
            if (props.onStatus) props.onStatus("工作区已经与提交 " + short + " 一致，无需回退" +
              (r.headShort ? ("（" + headTxt + "）") : ""));
          } else {
            if (props.onStatus) props.onStatus("已把工作区文件还原到提交 " + short + "：" +
              (r.restoredCount != null ? r.restoredCount : nChg) + " 个文件已还原；" + headTxt +
              "，所以这些差异现在显示为待提交改动（提交即存成一次新提交）" +
              (nRem > 0 ? ("；另有 " + nRem + " 个文件仍与该提交不同（多为该提交之后新增，未删除）") : ""));
            /* 磁盘内容变了：重载该仓库内已打开的标签。
               不重载的话标签留着旧文本且 dirty=false，用户下一次 Ctrl+S 会把回退结果覆盖掉。 */
            try {
              for (const rel of (r.changed || [])) {
                const abs2 = gitAbsPath(r.root || root, rel);
                if (abs2 && props.onReloadFile) props.onReloadFile(abs2);
              }
            } catch (e) { }
          }
          /* 登记反向整树操作：Ctrl+Z 时再执行一次相反的还原（回到分支当前提交的样子） */
          try { if (props.onCodeOp) props.onCodeOp({ kind: "restoreTree", root: r.root || root, back: r.headShort || "", file: "" }); } catch (e) { }
          await refresh(true);
        })();
      };
      /* 这次提交之后还有多少个提交（用于重置分支前的警告）——按已加载的历史顺序数 */
      const commitIndexInLog = (hash) => {
        const arr = log || [];
        const i0 = arr.findIndex((x) => x.hash === hash);
        return i0 < 0 ? 0 : i0;
      };
      /* 重置分支到此提交（破坏性）：分支指针移过去，之后的提交从分支上消失。
         与「还原文件到此版本」的区别：那个只改文件、历史不动；这个改写历史。 */
      const doResetBranch = (hash, short, newerCount) => {
        (async () => {
          const n = Number(newerCount || 0);
          const okGo = await deskConfirm("把分支重置到提交 " + short + " ？\n\n" +
            "这会：\n" +
            "· 把当前分支的指针移到这次提交（历史被改写）\n" +
            (n > 0 ? ("· 丢弃它之后的 " + n + " 个提交：从分支上消失，提交列表里不再显示\n") : "") +
            "· 同时丢弃未提交的改动\n\n" +
            "这些提交仍可用 git reflog 在一段时间内找回；重置后按 Ctrl+Z 也能撤回。\n" +
            "确定要继续吗？");
          if (!okGo) return;
          setBusy(true);
          const r = await apiCall("gitResetToCommit", { path: root, hash: hash }, 120000);
          setBusy(false);
          if (!r || r.ok !== true) { setErr((r && r.error) || "重置分支失败"); return; }
          setErr("");
          if (props.onStatus) props.onStatus("已把分支重置到提交 " + short +
            (Number(r.droppedCount || 0) > 0 ? ("（丢弃了 " + r.droppedCount + " 个提交）") : "") +
            (r.beforeShort ? ("；原指向 " + r.beforeShort + "，按 Ctrl+Z 可撤回") : ""));
          /* 工作区整体变了：重载该仓库内受影响的已打开标签 */
          try {
            for (const rel of (r.changed || [])) {
              const abs2 = gitAbsPath(r.root || root, rel);
              if (abs2 && props.onReloadFile) props.onReloadFile(abs2);
            }
          } catch (e) { }
          try { if (props.onCodeOp) props.onCodeOp({ kind: "resetBranch", root: r.root || root, back: r.beforeShort || "", file: "" }); } catch (e) { }
          await refresh(true);
          /* 分支被改写：被丢弃的提交必须从列表里消失，否则列表与仓库不一致 */
          if (showLog) loadLog();
        })();
      };
      const commitRows = (log || []).map((c) => {
        /* 单文件还原已归位到展开区的文件清单里（每行一个 ↶）。
           原先这里放的是「回退此文件」，但它作用在上方变更列表选中的文件上，
           位置与目标分离、还依赖"先有未提交改动"，容易被误当成整树操作 —— 见用户反馈。 */
        const isOpen = openCommit === c.hash;
        /* 第一行：箭头 + 短提交号 + 说明（整行可点 → 展开/收起这次提交改了什么） */
        const rowHead = React.createElement("div", {
          onClick: () => openCommitRow(c.hash),
          title: isOpen ? "收起这次提交" : "展开查看这次提交改了什么",
          style: { display: "flex", gap: 6, alignItems: "baseline", cursor: "pointer" }
        },
          React.createElement("span", { style: { color: C.accent, flexShrink: 0 } }, isOpen ? "▾" : "▸"),
          React.createElement("span", { style: { color: C.accent, fontFamily: "Consolas, monospace" } }, c.short),
          React.createElement("span", {
            style: { color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
            title: c.subject
          }, c.subject));
        /* 第二行：作者 + 时间 + 回退此文件 */
        const rowMeta = React.createElement("div", {
          style: { color: "#808080", fontSize: 10, marginTop: 2, display: "flex", gap: 8, alignItems: "center" }
        },
          React.createElement("span", null, c.author),
          React.createElement("span", null, String(c.date || "").replace("T", " ").slice(0, 19)),
          React.createElement("span", { style: { marginLeft: "auto", color: "#6b6b6b", fontSize: 10 } }, "点这行展开：看改动 / 还原文件"));
        /* 展开区：这次提交改了哪些文件（点文件看该文件的 diff）+ 整树回退 */
        const expandEl = !isOpen ? null : React.createElement("div", {
          style: { marginTop: 5, borderTop: "1px dashed " + C.border, paddingTop: 5 }
        },
          commitBusy
            ? React.createElement("div", { style: { color: C.accent, fontSize: 11 } }, "读取提交内容…")
            : (commitErr
              ? React.createElement("div", { style: { color: "#E06C75", fontSize: 11 } }, commitErr)
              : React.createElement(React.Fragment, null,
                React.createElement("div", {
                  style: { color: C.dim, fontSize: 10, marginBottom: 4, display: "flex", gap: 8, alignItems: "center" }
                },
                  React.createElement("span", null, (commitInfo && commitInfo.files ? commitInfo.files.length : 0) + " 个文件"),
                  React.createElement("span", { style: { marginLeft: "auto" } }),
                  React.createElement("button", {
                    onClick: () => doRestoreCommit(c.hash, c.short),
                    title: "把所有文件还原成这次提交的样子（只改文件，不移动分支；未提交改动会丢失）",
                    style: {
                      background: "transparent", border: "1px solid " + C.controlBorder, color: "#D19A66",
                      borderRadius: 3, padding: "0 6px", cursor: "pointer", fontSize: 10, flexShrink: 0
                    }
                  }, busy ? "处理中…" : "所有文件还原到此版本"),
                React.createElement("button", {
                  onClick: () => doResetBranch(c.hash, c.short, commitIndexInLog(c.hash)),
                  disabled: busy,
                  title: "危险：把分支指针移到现在这次提交，之后的提交将从分支上消失（可用 Ctrl+Z 或 git reflog 找回）",
                  style: {
                    background: "transparent", border: "1px solid #7d3b3b", color: "#E06C75",
                    borderRadius: 3, padding: "0 6px", cursor: busy ? "default" : "pointer", fontSize: 10, flexShrink: 0
                  }
                }, busy ? "处理中…" : "重置分支到此版本")),
                (commitInfo && commitInfo.files ? commitInfo.files : []).map((f) => React.createElement("div", {
                  key: f.path,
                  onClick: () => openCommitFile(f.path),
                  title: f.path,
                  style: {
                    display: "flex", gap: 6, alignItems: "center", padding: "2px 4px", cursor: "pointer",
                    borderRadius: 3, fontSize: 11,
                    background: commitFile === f.path ? "rgba(57,148,188,.25)" : "transparent"
                  }
                },
                  React.createElement("span", {
                    style: { color: gitCommitStatusColor(f.status), fontWeight: 700, width: 12, flexShrink: 0, textAlign: "center" }
                  }, String(f.status || "?").slice(0, 1)),
                  React.createElement("span", {
                    style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: commitFile === f.path ? "#fff" : C.text }
                  }, String(f.path || "").replace(/\\/g, "/").split("/").pop()),
                  React.createElement("span", {
                    style: { color: "#6b6b6b", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }
                  }, String(f.path || "").replace(/\\/g, "/").split("/").slice(0, -1).join("/")),
                  React.createElement("button", {
                    onClick: (e) => { e.stopPropagation(); doRestore(gitAbsPath((commitInfo && commitInfo.root) || root, f.path), c.hash, "提交 " + c.short); },
                    title: "把这个文件还原到这次提交（只改这一个文件，Ctrl+Z 可撤回）",
                    style: { background: "transparent", border: "none", color: "#808080", cursor: "pointer", fontSize: 12, padding: "0 3px", flexShrink: 0 }
                  }, "↶"))))));
        return React.createElement("div", {
          key: c.hash,
          style: {
            padding: "4px 8px", borderBottom: "1px solid " + C.border, fontSize: 11,
            background: isOpen ? "rgba(57,148,188,.14)" : "transparent"
          }
        }, rowHead, rowMeta, expandEl);
      });
      const logPane = !showLog ? null
        : React.createElement("div", {
          style: {
            maxHeight: 200, overflow: "auto", borderBottom: "1px solid " + C.border,
            flexShrink: 0, background: "#1a1b1c"
          }
        },
          log === null
            ? React.createElement("div", { style: { padding: 8, color: C.accent, fontSize: 12 } }, "读取历史…")
            : (commitRows.length === 0
              ? React.createElement("div", { style: { padding: 8, color: "#808080", fontSize: 12 } }, "（还没有提交）")
              : commitRows));

      /* ---- 差异区 ---- */
      /* 看某次提交的某文件时，差异区显示那次提交的 diff（而不是工作区 diff）。
         此前只把数据取回来、没接到这里，表现为「点文件没反应」。 */
      const commitDiffOn = !!(openCommit && commitFile && commitInfo &&
        commitInfo.filePath === commitFile && typeof commitInfo.fileDiff === "string");
      const commitShort = (() => {
        const c0 = (log || []).filter((x) => x.hash === openCommit)[0];
        return c0 ? c0.short : String(openCommit || "").slice(0, 7);
      })();
      const commitBanner = !commitDiffOn ? null : React.createElement("div", {
        style: {
          color: C.accent, fontSize: 11, padding: "4px 8px",
          borderBottom: "1px solid " + C.border, display: "flex", gap: 6, alignItems: "center"
        }
      },
        React.createElement("span", null, "提交 " + commitShort + " 里的改动"),
        React.createElement("span", { style: { flex: 1 } }),
        React.createElement("button", {
          onClick: () => { setOpenCommit(null); setCommitInfo(null); setCommitFile(null); },
          title: "回到工作区差异",
          style: {
            background: "transparent", border: "1px solid " + C.controlBorder, color: C.dim,
            borderRadius: 3, padding: "0 6px", cursor: "pointer", fontSize: 10
          }
        }, "退出提交视图"));
      const parsed = commitDiffOn ? parseUnifiedDiff(commitInfo.fileDiff)
        : (diff && !diff.error ? parseUnifiedDiff(diff.text) : null);
      const diffBody = (!sel && !commitDiffOn)
        ? React.createElement("div", { style: { padding: 10, color: "#808080", fontSize: 11 } }, "在上方选中一个文件查看差异")
        : (diffLoading && !commitDiffOn
          ? React.createElement("div", { style: { padding: 10, color: C.accent, fontSize: 11 } }, "读取差异…")
          : (diff && diff.error && !commitDiffOn
            ? React.createElement("div", { style: { color: "#E06C75", padding: 8, fontSize: 12 } }, diff.error)
            : (parsed && parsed.length
              ? React.createElement(React.Fragment, null, commitBanner,
                React.createElement("div", {
                  style: { fontSize: 12, fontFamily: "Consolas, monospace", lineHeight: 1.55, whiteSpace: "pre", padding: "4px 0" }
                }, parsed.map((d, i) => {
                /* hunk 头：渲染成一条中文化分隔条，写明"从第几行开始" */
                if (d.k === "hunk") {
                  return React.createElement("div", {
                    key: i,
                    style: {
                      color: GIT_DIFF_COLOR.hunk, background: "rgba(57,148,188,.10)",
                      padding: "2px 8px", margin: "3px 0", borderTop: "1px solid rgba(57,148,188,.25)",
                      borderBottom: "1px solid rgba(57,148,188,.25)", fontSize: 11
                    }
                  }, "第 " + d.newStart + " 行起" + (d.ctxText ? ("　·　" + d.ctxText) : ""));
                }
                /* 内容行：行号 + 标记 + 正文，**全部走行内文本流**。
                   2026-09-22 修正：这里原先用 display:flex 做三列，结果整块 diff 内容的
                   渲染位置跑到了面板盒子左边（用户报「穿模」，像素取证：行号出现在
                   x≈386..392，而面板实际是 x=470..928）。改成行内流后与原实现（纯文本
                   拼接 + padding）同构，不再引入 flex 带来的宽度/裁剪不确定性。
                   行号用 padStart 补足 5 字符宽，等宽字体下自然对齐成列。 */
                const mark = d.k === "add" ? "+" : (d.k === "del" ? "-" : " ");
                const numTxt = (d.ln == null ? "" : String(d.ln));
                return React.createElement("div", {
                  key: i,
                  style: {
                    color: GIT_DIFF_COLOR[d.k] || C.text,
                    background: d.k === "add" ? "rgba(46,160,67,.12)" : (d.k === "del" ? "rgba(224,108,117,.12)" : "transparent"),
                    padding: "0 8px"
                  }
                },
                  React.createElement("span", {
                    title: "该行在文件中的行号（点行号可跳到编辑器对应行）",
                    onClick: () => { try { props.onGotoLine(d.ln); } catch (e) { } },
                    style: {
                      color: d.k === "add" ? "#3fb950" : (d.k === "del" ? "#d98a92" : "#6e7681"),
                      cursor: "pointer", userSelect: "none"
                    }
                  }, numTxt.padStart(5, " ")),
                  React.createElement("span", { style: { userSelect: "none" } }, " " + mark + " "),
                    React.createElement("span", null, d.text)
                  );
                })))
              : React.createElement("div", { style: { color: "#808080", padding: 8, fontSize: 12 } }, "（没有差异）"))));

      const diffHead = React.createElement("div", {
        style: {
          padding: "4px 8px", borderBottom: "1px solid " + C.border, fontSize: 11, color: C.dim,
          display: "flex", alignItems: "center", gap: 6
        }
      },
        React.createElement("span", {
          style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
          title: sel
        }, String(sel).replace(st.root + "\\", "")),
        React.createElement("button", {
          onClick: () => props.onOpenFile(sel),
          style: {
            background: "transparent", border: "1px solid " + C.controlBorder, color: C.dim,
            borderRadius: 3, padding: "0 6px", cursor: "pointer", fontSize: 10, flexShrink: 0
          }
        }, "打开"),
        React.createElement("button", {
          onClick: () => doDiscard(sel),
          style: {
            background: "transparent", border: "1px solid " + C.controlBorder, color: "#D19A66",
            borderRadius: 3, padding: "0 6px", cursor: "pointer", fontSize: 10, flexShrink: 0
          }
        }, "丢弃改动"));

      const diffPane = React.createElement("div", {
        style: { flex: 1, minHeight: 0, overflow: "auto", background: "#121314" }
      },
        !sel ? diffBody : React.createElement("div", null,
          diffHead,
          (diff && diff.truncated) ? React.createElement("div", {
            style: { color: "#D19A66", fontSize: 10, padding: "3px 8px" }
          }, "差异过大，已截断显示") : null,
          diffBody));

      const headBar = React.createElement("div", {
        style: {
          display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
          borderBottom: "1px solid " + C.border, fontSize: 11, flexShrink: 0
        }
      },
        React.createElement("span", { style: { color: C.accent } }, "分支 " + (br || "（无）")),
        ahead ? React.createElement("span", { style: { color: "#2EA043" } }, "↑" + ahead) : null,
        behind ? React.createElement("span", { style: { color: "#D19A66" } }, "↓" + behind) : null,
        React.createElement("span", { style: { flex: 1 } }),
        React.createElement("button", {
          onClick: () => { const next = !showLog; setShowLog(next); if (next) loadLog(); },
          style: {
            background: "transparent", border: "1px solid " + (showLog ? C.accent : C.controlBorder),
            color: showLog ? C.accent : C.dim, borderRadius: 3, padding: "1px 6px", cursor: "pointer", fontSize: 10
          }
        }, "历史"),
        React.createElement("button", {
          onClick: () => { refresh(true); if (showLog) loadLog(); }, title: "刷新（含提交历史）",
          style: {
            background: "transparent", border: "1px solid " + C.controlBorder, color: C.dim,
            borderRadius: 3, padding: "1px 6px", cursor: "pointer", fontSize: 10
          }
        }, loading ? "…" : "刷新"));

      return React.createElement("div", {
        style: { display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }
      }, headBar, panelErr, commitBox,
      React.createElement("div", {
        style: { maxHeight: 200, overflow: "auto", borderBottom: "1px solid " + C.border, flexShrink: 0 }
      }, fileList),
      logPane, diffPane);
    };

    let dirReplacedHandler = null;
    /* 目录级批量替换的撤销快照（FindDialog 写、CodeWorkbench 读）。
       entries[i] = { path, content, encoding, bom }；content 是从磁盘读回的**原文**
       （含原行尾），撤销时原样写回、不做任何行尾或编码再加工。null = 无可用撤销点。 */
    let dirReplaceUndo = null;
    /* 版本回退类操作（丢弃改动 / 回退到某提交）的撤销点：GitPanel 写、CodeWorkbench 读。
       = { kind, file, prev, encoding, existed }；同一时刻只保留一个（与目录替换同语义）。
       之所以放在模块级：写它的面板与读它的工作台不在同一作用域。 */
    let gitOpUndoRef = { current: null };
    /* inject 里放「本插件真正依赖」的服务。locale 这类纯可选服务写进去会让整个插件停在
       等待态、apply 不执行、两个插槽一起消失（实测：入口按钮与全屏层同时不见）。
       workspaces / sessions / connection 不属于这一类：右侧对话面板、会话历史、模型选择器
       全靠它们，而 inject 正是「保证 apply 在这些服务就绪之后才跑」的机制。
       2026-09-16 实测教训：把它们移出 inject 改走 ctx.get 后，apply 跑得比服务就绪更早，
       三者全为 null —— 表现为「看不到对话 / 点历史没反应 / 选模型一直加载」。
       现已放回 inject；下面的容错 bindOptional 仍保留作兜底（即便某个缺失也不会抛错）。 */
    /* remote / remote.session 也必须在 inject 里：它们是「必须 inject 才能读」的服务
       （官方 dsh-client-ui-model-selection 的 inject 就是 [..., "remote", "remote.session"]）。
       直接读 ctx.remote 会抛 cannot get property "remote" without inject，
       被 try 吞掉后模型目录/重命名就永远拿不到 —— 实测面板红字「remote.session 未注入」即此因。 */
    const inject = ["slots", "workspaces", "sessions", "connection", "remote", "remote.session", "uiConversation"];
    let workspacesService = null;
    let sessionsService = null;
    let connectionService = null;
    /* 模型/会话重命名走 typert 远端 API：ctx.remote.session.*（官方 dsh-client-ui-model-selection
       就是 this.ctx.remote.session.modelCatalog()）。connection 服务的契约里没有 api 字段，
       旧写法 connection.api.sessions 恒为 null。这里读 ctx.remote 仍包 try（未声明属性直读会抛）。 */
    let remoteSessionApi = null;
    /* 0.1.5 起消息不再挂在 session 快照上（老版本的 snap.nodes 已移除），
       改由官方 uiConversation 服务的 binding(id).snapshot 提供装配好的节点。 */
    let uiConversationSvc = null;
    /* 新建对话的 API 在 uiWorkspace 服务上（不是 workspaces 纯控制器）。走 ctx.get 取，不进 inject。 */
    let uiWorkspaceSvc = null;
    function apply(ctx) {
      /* 只覆盖非空值：先绑当前可用的，等服务就绪的回调再补上，避免被后来的 null 冲掉。 */
      const bindOptional = (c) => {
        if (!c) return;
        /* 可选服务一律 ctx.get 优先：直接读 c[name] 会触发 Cordis 的
           "cannot get property X without inject" 并从 apply 抛出，把整个插件的插槽
           注册一起打掉（2026-09-16 实测）。这里 get 拿不到再兜一次直接读，两层都不许抛。 */
        const pick = (name) => {
          try {
            const viaGet = typeof c.get === "function" ? c.get(name) : null;
            if (viaGet) return viaGet;
          } catch (e) { }
          try { return c[name] || null; } catch (e) { return null; }
        };
        const w = pick("workspaces"), sSvc = pick("sessions"), n = pick("connection");
        if (w) workspacesService = w;
        if (sSvc) sessionsService = sSvc;
        const uw = pick("uiWorkspace");
        if (uw) uiWorkspaceSvc = uw;
        if (n) connectionService = n;
      };
      try { bindOptional(ctx); } catch (e) { /* 缺可选服务绝不能让 apply 抛错：抛了插槽会整体消失 */ }
      /* remote 取法：一律 ctx.get 优先（与可选服务同规矩），完全不直接读属性。
         remote.session 是独立的 inject 面，先单独取；取不到再退回 remote.session 字段。 */
      try {
        const g = (nm) => { try { return (typeof ctx.get === "function") ? ctx.get(nm) : null; } catch (e) { return null; } };
        let rs = g("remote.session");
        if (!rs) { const r = g("remote"); if (r && r.session) rs = r.session; }
        remoteSessionApi = rs || null;
        uiConversationSvc = g("uiConversation") || null;
      } catch (e) { remoteSessionApi = null; }
      /* typeof ctx.inject 同样必须包 try：真实 Cordis ctx 对「未 inject 的属性直读」会抛
         'cannot get property "inject" without inject'，而这一行在 apply 顶层 —— 抛了就会
         整个插件加载失败（现象：Failed to load plugins、入口按钮与全屏层一起消失）。
         2026-09-16 由回归用例 ⑧（会抛错的 ctx）抓出，此前只修了 pick 里的那处直读。 */
      let canInject = false;
      try { canInject = typeof ctx.inject === "function"; } catch (e) { canInject = false; }
      if (canInject) {
        try { ctx.inject(["workspaces", "sessions", "connection"], bindOptional); }
        catch (e) { /* 该运行时没有部分注入：保持上面已绑定的结果 */ }
      }
      l10n = makeL10n(ctx);
      let desktopOpen = false;
      const listeners = new Set();
      const setDesktopOpen = (v) => {
        desktopOpen = v;
        // 单个订阅者抛错不应阻断其它订阅者，否则入口按钮与 overlay 的开合状态会不同步
        listeners.forEach((fn) => { try { fn(v); } catch (e) { try { console.error("[card-desktop] desktop listener", e); } catch (e2) { } } });
      };
      const subscribeDesktop = (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

      // /desk 斜杠命令：客户端自有命令，UI 行为完全在客户端。
      // commandUi 属可选服务 → 用 ctx.get 取，绝不写进 inject（未就绪的服务会把插件挂起）。
      const cmdUi = typeof ctx.get === "function" ? ctx.get("commandUi") : (ctx.commandUi || null);
      if (cmdUi && typeof cmdUi.register === "function") {
        try {
          ctx.effect(() => cmdUi.register({
            name: "desk",
            description: () => "打开卡片桌面（代码工作台 / 音乐）",
            available: () => true,
            ui: { kind: "action", run: () => { setDesktopOpen(true); } }
          }), "card-desktop: /desk command");
        } catch (e) { /* 名称冲突或契约变化时静默降级，绝不影响插槽注册 */ }
      }

      const slots = ctx.slots;
      if (!slots) return;

      /* 入口按钮：头部与输入行左侧两个占用者共用这一份组件，
         避免样式/文案在两处各写一遍后分叉。 */
      const CardDesktopEntry = () => {
        const [open, setOpen] = React.useState(desktopOpen);
        React.useEffect(() => subscribeDesktop(setOpen), []);
        return React.createElement("button", {
          type: "button",
          onClick: (e) => {
            if (e && typeof e.stopPropagation === "function") e.stopPropagation();
            setDesktopOpen(!desktopOpen);
          },
          style: {
            display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
            background: "#2A2B2C", color: C.text, border: "1px solid #3C3C3C",
            borderRadius: 6, padding: "4px 10px", fontSize: 13
          },
          onMouseEnter: (e) => { e.currentTarget.style.borderColor = C.accent; },
          onMouseLeave: (e) => { e.currentTarget.style.borderColor = "#3C3C3C"; }
        },
          React.createElement("span", null, "📁"),
          React.createElement("span", null, l10n("卡片桌面", "entry")));
      };

      /* 顶部入口按钮（会话开始后：左上角标题/模式右边） */
      slots.inject("conversation.session.header.actions", () => slots.register(
        {
          name: "conversation.session.header.actions",
          id: "card-desktop-entry",
          order: 10
        },
        CardDesktopEntry
      ));

      /* 刚开会话（空白会话）时官方把整个头部隐藏 —— dsh-client-ui-conversation 的
         ConversationSessionHeader: hideChrome = session.blank && conversationPhase(...) === "blank"，
         CSS .headerHidden{display:none}。头部一藏，上面的入口就跟着消失，现象即
         「新会话没有卡片桌面入口，发第一条消息后才有」。这里在输入行左侧
         （composer 工具行、模式选择右边）再挂一个占用者，只在「头部隐藏」时显示，
         判据与官方 hideChrome 同式，保证任一时刻恰好只有一个入口。 */
      slots.inject("conversation.input.left", () => slots.register(
        {
          name: "conversation.input.left",
          id: "card-desktop-entry",
          order: 5
        },
        (props) => {
          /* useSession / useConversation 由宿主标准套件提供（该槽位契约里就有这两项）；
             取不到时按「头部隐藏」处理：宁可多显示一个入口，也不要静默地没有入口。 */
          const p = props || {};
          const useSession = typeof p.useSession === "function" ? p.useSession : null;
          const useConversation = typeof p.useConversation === "function" ? p.useConversation : null;
          const blank = useSession === null ? true : useSession((s) => s.blank) === true;
          const running = useSession === null ? false : useSession((s) => s.running) === true;
          const attempted = useSession === null ? false : useSession((s) => s.promptAttempted) === true;
          const targets = useConversation === null ? 0 : (useConversation((c) => (c && c.activeTargets ? c.activeTargets.size : 0)) || 0);
          const headerHidden = blank && targets === 0 && !running && !attempted;
          return headerHidden ? React.createElement(CardDesktopEntry) : null;
        }
      ));

      /* 全屏桌面 */
      slots.inject("shell.overlay", () => slots.register(
        {
          name: "shell.overlay",
          id: "card-desktop",
          // 显式声明层级：同层还有 dsh-market-toast(0)、music-player-panel(20)、
          // music-player-lyric-panel(21)、agent-teams-activity(80)。
          // 取 30 → 排在音乐面板之后、活动面板之前，避免依赖隐式默认值 0。
          order: 30
        },
        () => {
          const [open, setOpen] = React.useState(desktopOpen);
          React.useEffect(() => subscribeDesktop(setOpen), []);
          const [view, setView] = React.useState("desktop");
          const [codeKey, setCodeKey] = React.useState(0);
          // 全局 Toast：把工作台的零散状态提示（保存/替换/格式化/端口检查）汇到桌面顶层
          const [toast, setToast] = React.useState(null);
          React.useEffect(() => {
            deskToastHandler = (text, ok) => setToast({ text, ok, id: Date.now() });
            return () => { if (deskToastHandler) deskToastHandler = null; };
          }, []);
          React.useEffect(() => {
            if (!toast) return;
            const id = setTimeout(() => setToast(null), 4200);
            return () => clearTimeout(id);
          }, [toast]);

          // ⑮ 桌面/工作台打开时，隐藏第三方 dsh-turn-rail 的右缘轮次导航（
          //    避免它盖住代码区右缘的缩略图滑块/滚动条）。做法：注入一条
          //    display:none 规则，不修改 turn-rail 源码；关闭时移除恢复。
          React.useEffect(() => {
            if (!open) return;
            const id = "card-desktop-hide-turnrail";
            if (!document.getElementById(id)) {
              const st = document.createElement("style");
              st.id = id;
              st.textContent = ".tr_rail,.tr_tip,.tr_search{display:none !important;pointer-events:none !important}";
              document.head.appendChild(st);
            }
            return () => {
              const st = document.getElementById(id);
              if (st) st.remove();
            };
          }, [open]);

          // 卡片桌面主界面的 Esc 退出：只在 desktop 视图接管。
          // 进入代码工作台后 Esc 仍归编辑器/查找框（不抢它们的键位）。
          React.useEffect(() => {
            if (!open || view !== "desktop") return;
            const onKey = (e) => {
              if (e.key !== "Escape") return;
              if (deskConfirmStack.length) return;
              e.preventDefault();
              e.stopPropagation();
              setDesktopOpen(false);
            };
            document.addEventListener("keydown", onKey, true);
            return () => document.removeEventListener("keydown", onKey, true);
          }, [open, view]);

          /* 逃生口：连按两次 Esc 无条件退出桌面（并清掉 body 上的残留）。
             单次 Esc 的语义保持原样：桌面视图退出由下面那个 effect 管，工作台里归编辑器/查找框。 */
          const lastEscAtRef = React.useRef(0);
          React.useEffect(() => {
            const onKey = (e) => {
              if (e.key !== "Escape") return;
              if (deskConfirmStack.length) return;
              const now = Date.now();
              if (isDoubleEsc(lastEscAtRef.current, now)) {
                lastEscAtRef.current = 0;
                deskCleanupTransient();
                setDesktopOpen(false);
                return;
              }
              lastEscAtRef.current = now;
            };
            document.addEventListener("keydown", onKey, true);
            return () => document.removeEventListener("keydown", onKey, true);
          }, []);
          /* 桌面卸载（退出桌面 / 关页面）时也清一遍 body 残留，绝不给主界面留任何遮挡物 */
          React.useEffect(() => () => deskCleanupTransient(), []);

          if (!open) return null;

          const btn = (label, extra, onClick) => React.createElement("button", {
            onClick,
            style: Object.assign({ background: S.bg, color: S.text, border: "1px solid " + S.ctrlBorder, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 13 }, extra || {})
          }, label);
          const closeDesktop = () => setDesktopOpen(false);
          /* 皮肤可能把主题 token 定义成带 alpha 的颜色（blue-fantasy 的 bg-layer-2 就是
             rgba(32,42,68, calc(1 - var(--dsw-skin-scrim,0)*.4))，scrim 开时 alpha=.6）——
             直接写 background: S.bg 会让整个代码工作台 40% 透明、顶栏透出主界面。
             这里给不透明底色，再把主题色当渐变叠上去：主题色不透明时观感不变。 */
          const opaqueOn = (themeColor, base) => ({ backgroundColor: base, backgroundImage: "linear-gradient(" + themeColor + ", " + themeColor + ")" });
          const topBar = (title, sub, extraBtns, dark) => React.createElement("div", {
            style: Object.assign(
              { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid " + (dark ? S.border : "rgba(147,168,197,.18)") },
              /* dark（代码工作台）用不透明底；非 dark（桌面/音乐）保留半透明+模糊，那是给皮肤背景画留的 */
              dark ? opaqueOn(S.panel, "#191A1B") : { background: "rgba(24,24,24,.92)", backdropFilter: "blur(10px)" })
          },
            React.createElement("div", null,
              React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: "#fff" } }, title),
              sub ? React.createElement("div", { style: { fontSize: 11, color: "#b0b0b0" } }, sub) : null),
            React.createElement("div", { style: { display: "flex", gap: 8 } },
              btn("← 桌面", null, () => setView("desktop")),
              ...(extraBtns || []),
              btn(l10n("退出", "exit"), { background: S.danger, border: "none", color: "#fff" }, closeDesktop)));

          const background = React.createElement("div", { style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 } },
            React.createElement("div", { style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: BG, backgroundSize: "cover", backgroundPosition: "center" } }),
            React.createElement("div", { style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(rgba(10,6,6,.55) 0%, rgba(10,6,6,.4) 60%, rgba(9,5,5,.6) 100%)" } }));

          const frame = (dark, ...children) => React.createElement("div", {
            style: Object.assign(
              { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999, overflow: "hidden", display: "flex", flexDirection: "column" },
              dark ? opaqueOn(S.bg, "#202122") : { background: "transparent" })
          },
            dark ? null : background,
            React.createElement("div", { style: { position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } }, ...children));

          const cards = [
            { id: "chat", title: "对话", desc: "回到聊天界面", color: "#4f8cff", icon: "💬", action: () => { setDesktopOpen(false); } },
            { id: "code", title: "代码工作台", desc: "Explorer / Hierarchy / 多标签", color: "#22c55e", icon: "🧑‍💻", action: () => setView("code") },
            { id: "music", title: "音乐", desc: "播放器", color: "#e879f9", icon: "🎵", action: () => setView("music") }
          ];

          let out = null;
          if (view === "desktop") {
            out = frame(false,
              React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                  React.createElement("span", { style: { fontSize: 20 } }, "📁"),
                  React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: S.title } }, l10n("卡片桌面", "desktop")),
                    React.createElement("div", { style: { fontSize: 12, color: S.sub } }, "选择应用进入 · 退出返回对话"))),
                btn("退出", { background: "#a1260d", border: "none", color: "#fff" }, closeDesktop)),
              React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 24, overflow: "auto" } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 28, flexWrap: "wrap" } },
                  cards.map((card) => React.createElement("div", {
                    key: card.id,
                    onClick: card.action,
                    style: {
                      width: 220, height: 150, borderRadius: 14, cursor: "pointer", background: "color-mix(in srgb, " + S.panel + " 88%, transparent)",
                      border: "1px solid " + S.border, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
                      transition: "all .18s ease", boxShadow: "0 4px 20px rgba(0,0,0,.3)"
                    },
                    onMouseEnter: (e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "#c8a24a"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,.45)"; },
                    onMouseLeave: (e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "#93a8c52e"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.3)"; }
                  },
                    React.createElement("div", { style: { fontSize: 40 } }, card.icon),
                    React.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: S.title } }, card.title),
                    React.createElement("div", { style: { fontSize: 12, color: S.sub } }, card.desc))))));
          } else if (view === "code") {
            out = frame(true,
              topBar("代码工作台", "VSCode 风格 · 多标签 · 工作区", [
                btn("刷新", null, () => setCodeKey((k) => k + 1)),
                btn("音乐", null, () => setView("music"))
              ], true),
              React.createElement(ErrorBoundary, { key: "eb" + codeKey },
                React.createElement(CodeWorkbench, { key: codeKey, sessionsService: sessionsService, connectionService: connectionService, remoteSession: remoteSessionApi, uiConversation: uiConversationSvc })));
          } else if (view === "music") {
            out = frame(false,
              topBar(l10n("音乐", "music"), "直接对接 dsh-music-player（同源 /dsh-music）"),
              React.createElement(DeskMusicView, null));
          }
          const toastEl = toast ? React.createElement("div", {
            style: {
              position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 28, zIndex: 100000,
              background: toast.ok ? "rgba(47,158,110,.95)" : "rgba(229,83,75,.95)", color: "#fff",
              padding: "9px 18px", borderRadius: 8, fontSize: 13, boxShadow: "0 6px 20px rgba(0,0,0,.45)",
              pointerEvents: "none", maxWidth: "70vw", textAlign: "center"
            }
          }, toast.text) : null;
          return React.createElement(React.Fragment, null, out, toastEl);
        }
      ));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});


