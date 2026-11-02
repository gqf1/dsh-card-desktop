/**
 * B1 回归门禁（2026-10-19 建立；2026-10-26 修订：删除 B2 相关检查，脚本名沿用历史名）
 *
 * 背景：工作台聊天栏是自绘的，斜杠命令原先会被当普通文本发出。B1 改动让
 * send() 里以 / 开头的文本走 session.command，输出渲染成 cmdOut 气泡。
 *
 * ── 2026-10-26 修订说明（P1-3：门禁恒 FAIL）────────────────────────────
 * 删除的检查（共 8 条断言，全部属于已下线的 B2 功能）：
 *   1. 锚点 `let deskAiRef = { current: null };`
 *   2. 锚点 `const aiOnChanges = async (kind) => {`
 *   3. 锚点 `deskAiRef.current = aiOnChanges;`
 *   4. 锚点 `fn("review")`
 *   5. 锚点 `fn("simplify")`
 *   6. 锚点 `const aiDirOf = (p) => {`
 *   7. 锚点 `const aiLooksLikeFile = (p) =>`
 *   8. 改动标记断言 `2026-10-19 B2`
 *   9. 作用域自检 `deskAiRef 必须在 ChatPanel 之后声明`
 *
 * 为什么删：B2（Git 面板「AI 审查 / AI 简化」按钮）已于 2026-10-20 从
 * client.js 整体移除。证据：git 历史 e1d030e 之前的 lib/client.bak-20261020-before-remove-ai-buttons.js（该 .bak 已于 2026-11-02 删除，改动已进 git）
 * 里上述 7 个锚点各命中 1 次、`2026-10-19 B2` 标记存在；当前 client.js 全部
 * 命中 0 次。门禁没跟着改，所以永远红 → 被当噪声忽略 → 真回归抓不住。
 *
 * 保留的检查（B1 与仍然有效的项，一条没删）：
 *   A. node --check 语法门禁（唯一权威语法判据）
 *   B. B1 的 6 个关键锚点，各必须命中 1 次
 *   C. 改动来源标记 `2026-10-19 B1` 必须存在
 *   D. 作用域自检：cmdOut 状态必须在 ChatPanel 之后声明（即在其函数体内），
 *      跨作用域引用会变成未声明标识符，只在发送时才抛错且被吞掉
 *
 * 反向验证（2026-10-26 实测，证明本门禁不是空转）：
 *   ① 把 client.js 复制到 %TEMP%\gate-rev\client.js，把仍在检查的锚点
 *      `let fallback = false;` 改成 `let fallback = false ;`（语法仍合法）
 *      → node tools/gate-b1b2.mjs --file <副本> 报
 *        「锚点命中 0 次（期望 1）：let fallback = false;」，exit=1
 *   ② 再复制一份，删掉一个 `}` 制造语法错误
 *      → 报「node --check 失败」，exit=1
 *   ③ 原文件 → exit=0。三次跑完删掉临时副本。
 *
 * 只做静态断言，不依赖浏览器。用法：
 *   node F:\DSH\card-desktop-plugin\tools\gate-b1b2.mjs
 *   node ... --file <另一个 client.js>    # 反向验证用（文件后缀须为 .js）
 *
 * 为什么不做"裸括号计数"：文件里有大量正则与中文注释，裸计数会把
 * `\(` 与注释里的括号算进去，原始文件就"不平衡"（实测 +16），属假红。
 * 语法正确性以 node --check 为准，那是唯一权威判据。
 * （全量括号平衡检查的旧实现 tools/_audit/verify-all.ps1 已于 2026-11-02 删除，未入库；那边是先剔除字符串与
 *   注释再统计的严格口径，两者分工不同。）
 */
import { readFileSync, copyFileSync, unlinkSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const fileArg = argv.indexOf('--file')
const FILE = fileArg >= 0 ? argv[fileArg + 1] : 'F:/DSH/card-desktop-plugin/lib/client.js'
const src = readFileSync(FILE, 'utf8')
const fail = []

// A. 语法门禁：node --check 需要 .js/.mjs 后缀，非标准后缀先拷成临时 .js 再查
let checkPath = FILE
let tmpDir = null
if (!/\.(js|mjs|cjs)$/i.test(FILE)) {
  tmpDir = mkdtempSync(join(tmpdir(), 'gate-'))
  checkPath = join(tmpDir, 'client.js')
  copyFileSync(FILE, checkPath)
}
try {
  execFileSync(process.execPath, ['--check', checkPath], { stdio: 'pipe' })
} catch (e) {
  fail.push('node --check 失败：' + String(e.stderr || e.message).slice(0, 300))
} finally {
  if (tmpDir) { try { unlinkSync(checkPath) } catch (e) { } }
}

// B. B1 关键锚点（命中数必须等于期望值，防止被后续改动静默删掉）
//    2026-10-26：原第 6~12 项与 `2026-10-19 B2` 标记已随 B2 功能下线删除，见头部说明。
const anchors = [
  // 斜杠命令的输出累积状态
  ['const [cmdOut, setCmdOut] = React.useState([]);', 1],
  // send() 里识别 / 开头并改走 session.command
  ['if (text.charAt(0) === "/") {', 1],
  ['let fallback = false;', 1],
  ['setCmdOut((prev) => prev.concat(', 1],
  // 命令输出的渲染分支
  ['cmdOut.map((c) => React.createElement("div", {', 1],
  // 文件模式优先用编辑器缓冲区（含未保存改动）
  ['activeText: activeText', 1],
]
for (const [needle, want] of anchors) {
  const got = src.split(needle).length - 1
  if (got !== want) fail.push(`锚点命中 ${got} 次（期望 ${want}）：${needle}`)
}

// C. 改动来源标记（便于日后追溯：这处是本插件自有改动，不是上游代码）
for (const marker of ['2026-10-19 B1']) {
  if (!src.includes(marker)) fail.push('缺少改动标记：' + marker)
}

// D. 作用域自检：cmdOut 状态必须在 ChatPanel 之后声明（= 在 ChatPanel 函数体内）
//    （跨作用域引用会变成未声明标识符，只在发送时才抛错且被吞掉）
const cmdOutIdx = src.indexOf('const [cmdOut, setCmdOut] = React.useState([]);')
const chatIdx = src.indexOf('const ChatPanel = (props) => {')
if (cmdOutIdx < 0 || chatIdx < 0) fail.push('找不到 cmdOut 声明或 ChatPanel')
else if (cmdOutIdx < chatIdx) fail.push('cmdOut 声明早于 ChatPanel：请确认它仍在 ChatPanel 体内')

if (fail.length) {
  console.error('B1 门禁 FAIL')
  for (const f of fail) console.error(' - ' + f)
  process.exit(1)
}
console.log('B1 门禁 PASS（语法 / B1 锚点 6 条 / 标记 / 作用域 4 项）')
