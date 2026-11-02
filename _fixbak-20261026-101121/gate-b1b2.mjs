/**
 * B1+B2 回归门禁（2026-10-19）
 *
 * 背景：工作台聊天栏是自绘的，斜杠命令原先会被当普通文本发出；
 * Git 面板也没有把 diff 交给当前会话的入口。本次改动加了：
 *   B1 斜杠命令透传（send() 里 / 开头走 session.command，输出渲染成 cmdOut 气泡）
 *   B2 Git 面板「AI 审查 / AI 简化」按钮（模块级 deskAiRef → ChatPanel.aiOnChanges）
 *
 * 只做静态断言，不依赖浏览器。用法：
 *   node F:\DSH\card-desktop-plugin\tools\gate-b1b2.mjs
 *   node ... --file <另一个 client.js>    # 反向验证用（文件后缀须为 .js）
 *
 * 为什么不做"裸括号计数"：文件里有大量正则与中文注释，裸计数会把
 * `\(` 与注释里的括号算进去，原始文件就"不平衡"（实测 +16），属假红。
 * 语法正确性以 node --check 为准，那是唯一权威判据。
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

// 1. 语法门禁：node --check 需要 .js/.mjs 后缀，非标准后缀先拷成临时 .js 再查
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

// 2. 关键锚点（命中数必须等于期望值，防止被后续改动静默删掉）
const anchors = [
  ['const [cmdOut, setCmdOut] = React.useState([]);', 1],
  ['if (text.charAt(0) === "/") {', 1],
  ['let fallback = false;', 1],
  ['setCmdOut((prev) => prev.concat(', 1],
  ['cmdOut.map((c) => React.createElement("div", {', 1],
  ['let deskAiRef = { current: null };', 1],
  ['const aiOnChanges = async (kind) => {', 1],
  ['deskAiRef.current = aiOnChanges;', 1],
  ['fn("review")', 1],
  ['fn("simplify")', 1],
  // 2026-10-19 修：base 必须先归一化成目录（文件路径会让 git -C 失败 → 误报"不在仓库内"）
  ['const aiDirOf = (p) => {', 1],
  ['const aiLooksLikeFile = (p) =>', 1],
  // 文件模式优先用编辑器缓冲区（含未保存改动）
  ['activeText: activeText', 1],
]
for (const [needle, want] of anchors) {
  const got = src.split(needle).length - 1
  if (got !== want) fail.push(`锚点命中 ${got} 次（期望 ${want}）：${needle}`)
}

// 3. 改动来源标记（便于日后追溯：这两处是本插件自有改动，不是上游代码）
for (const marker of ['2026-10-19 B1', '2026-10-19 B2']) {
  if (!src.includes(marker)) fail.push('缺少改动标记：' + marker)
}

// 4. 作用域自检：deskAiRef 必须在 ChatPanel 之后、同一模块函数内声明
//    （跨作用域引用会变成未声明标识符，只在点击时抛错且被吞掉）
const declIdx = src.indexOf('let deskAiRef = { current: null };')
const chatIdx = src.indexOf('const ChatPanel = (props) => {')
if (declIdx < 0 || chatIdx < 0) fail.push('找不到 deskAiRef 声明或 ChatPanel')
else if (declIdx < chatIdx) fail.push('deskAiRef 声明早于 ChatPanel：请确认它仍在模块级作用域')

if (fail.length) {
  console.error('B1+B2 门禁 FAIL')
  for (const f of fail) console.error(' - ' + f)
  process.exit(1)
}
console.log('B1+B2 门禁 PASS（语法 / 锚点 / 标记 / 作用域 4 项）')
