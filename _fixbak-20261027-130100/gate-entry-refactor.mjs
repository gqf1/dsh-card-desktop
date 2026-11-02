// 静态门禁：卡片桌面入口改造（2026-10-27）的源码级断言
// 用法：node "F:\DSH\card-desktop-plugin\_fixbak-20261027-130100\gate-entry-refactor.mjs"
// 退出码 0 = 全过；非 0 = 有用例失败（会逐条打印哪一条）
import fs from 'fs';
import path from 'path';

const FILE = 'F:\\DSH\\card-desktop-plugin\\lib\\client.js';
const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n');

let fail = 0;
const ok = (name, cond, detail) => {
  if (cond) console.log(`PASS  ${name}`);
  else { console.log(`FAIL  ${name}${detail ? ' :: ' + detail : ''}`); fail++; }
};
const count = (re) => (src.match(re) || []).length;

/* 1. 必须存在的定义（各恰 1 处） */
ok('openCardDesktop 定义恰 1 处', count(/const openCardDesktop = \(view\) => \{/g) === 1, String(count(/const openCardDesktop = \(view\) => \{/g)));
ok('desktopViewInit 声明恰 1 处', count(/let desktopViewInit = "code";/g) === 1);
ok('CardDesktopSidePanel 定义恰 1 处', count(/const CardDesktopSidePanel = \(\) => \{/g) === 1);

/* 2. 必须消失的东西 */
ok('无 desktop 视图分支', count(/view === "desktop"/g) === 0);
ok('无 setView("desktop")', count(/setView\("desktop"\)/g) === 0);
ok('代码工作台顶栏无「← 桌面」按钮（源码中的 btn 调用）', count(/btn\("← 桌面", null/g) === 0);
ok('面板不再挂载即开全屏', count(/挂载 = 用户刚点了侧栏那一行/g) === 0);
ok('cards 数组已删（无 id: "chat"）', count(/id: "chat"/g) === 0);
ok('选择页文案「选择应用进入 · 退出返回对话」已删', count(/选择应用进入 · 退出返回对话/g) === 0);

/* 3. 入口路径必须走 openCardDesktop */
const openCalls = count(/openCardDesktop\((app\.id|"code"|"music")\)/g);
ok('openCardDesktop 调用点 >= 3（卡片渲染 1 + /desk 1 + 兜底入口 1）', openCalls >= 3, 'calls=' + openCalls);
/* 卡片入口必须真的来自清单、且清单里恰好 code/music 两项（防止漏一个入口而门禁不报） */
const appsBlock = (src.match(/const SIDE_APPS = \[([\s\S]*?)\];/) || [])[1] || '';
ok('SIDE_APPS 恰含 code 与 music 两项', /id: "code"/.test(appsBlock) && /id: "music"/.test(appsBlock) && (appsBlock.match(/id: "/g) || []).length === 2,
  'ids=' + (appsBlock.match(/id: "(\w+)"/g) || []).join(','));
ok('SIDE_APPS 不再含 chat（对话已删）', !/id: "chat"/.test(appsBlock));
/* 反向验证：把清单改成三项时，上面的「恰两项」判定必须失败 */
const appsThree = appsBlock + '\n{ id: "extra" }';
ok('反向验证：清单变三项时该项判定确实为假（门禁非空转）',
  !(/id: "code"/.test(appsThree) && /id: "music"/.test(appsThree) && (appsThree.match(/id: "/g) || []).length === 2));
/* 2026-10-27 第二轮（用户：入口丑、挤在左上角）→ 面板改成居中大卡片，
   断言随之改成「按 SIDE_APPS 渲染卡片 + 两处 onClick 走 openCardDesktop」。 */
ok('面板用 SIDE_APPS 清单渲染卡片', /const SIDE_APPS = \[/.test(src) && /SIDE_APPS\.map\(/.test(src));
ok('卡片区居中（中段 flex 居中且占满剩余高度）', /flex: 1, minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center"/.test(src));
ok('卡片不再是左上角两个小按钮（已无旧按钮文案）', count(/> *"🧑‍💻 代码工作台"|}, "🧑‍💻 代码工作台"\)/g) === 0);
ok('面板高度撑满内容区（不再只有左上角一截）', /width: "100%", minHeight: "100%", height: "100%"/.test(src));
ok('卡片有悬停反馈与键盘可达（role/tabIndex/onKeyDown）', /role: "button"/.test(src) && /tabIndex: 0/.test(src) && /onKeyDown: \(e\) => \{/.test(src));
ok('面板不再出现 open 状态文案（已打开/置前）', count(/卡片桌面已打开（点此置前）/g) === 0);

/* 4. view 重置必须存在且只在 open 时生效 */
ok('open 时按 desktopViewInit 重置 view', count(/if \(open\) setView\(desktopViewInit === "music" \? "music" : "code"\);/g) === 1);
ok('view 初值取自 desktopViewInit', count(/React\.useState\(desktopViewInit\)/g) === 1);

/* 5. TDZ：openCardDesktop 的声明位置必须早于所有使用点
   注意必须先剥离注释再做位置比较 —— 注释里提到同名标识符会造成假失败
   （2026-10-27 实测：把 desktopViewInit 三个字写进注释就误报了一次）。 */
const stripComments = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))  // 块注释换成等长空格，保住行号与偏移
  .replace(/(^|[^:\\])\/\/[^\n]*/g, (m, p1) => p1 + m.slice(p1.length).replace(/[^\n]/g, ' '));

const code = stripComments(src);

const declIdx = code.indexOf('const openCardDesktop = (view) => {');
const useIdxs = [...code.matchAll(/openCardDesktop\("(code|music)"\)/g)].map((m) => m.index);
ok('openCardDesktop 声明早于全部调用点', declIdx >= 0 && useIdxs.length > 0 && useIdxs.every((i) => i > declIdx), `decl=${declIdx} first=${Math.min(...useIdxs)}`);

const dvIdx = code.indexOf('let desktopViewInit = "code";');
const dvUses = [...code.matchAll(/desktopViewInit/g)].map((m) => m.index).filter((i) => i !== dvIdx);
ok('desktopViewInit 声明早于全部代码引用（已剥离注释）', dvIdx >= 0 && dvUses.every((i) => i > dvIdx), `decl=${dvIdx} first=${Math.min(...dvUses)}`);

/* 5b. 反向验证：注释剥离器本身必须有效 —— 把注释里的同名标识符也算进来的话，
       上面那条应当失败。这里直接断言「未剥离版会看到声明之前的引用」，证明门禁不是空转。 */
const rawDvUses = [...src.matchAll(/desktopViewInit/g)].map((m) => m.index);
ok('反向验证：未剥离注释时确实存在声明前的同名文本（证明剥离步骤非空转）',
  rawDvUses.some((i) => i < src.indexOf('let desktopViewInit = "code";')));

/* 6. 组件体完整性：CardDesktopSidePanel 体内不得引用已删的 open/setOpen 本地状态 */
const panelStart = src.indexOf('const CardDesktopSidePanel = () => {');
const panelEnd = src.indexOf('/* 侧栏那一行的图标', panelStart);
ok('面板块可定位', panelStart > 0 && panelEnd > panelStart);
const panelBody = src.slice(panelStart, panelEnd);
ok('面板体不再用 const [open, setOpen]', !/const \[open, setOpen\]/.test(panelBody));
ok('面板体不再调用 setDesktopOpen 直接开（只经 openCardDesktop）', !/setDesktopOpen\(true\)/.test(panelBody));

/* 7. 语法层：node --check 已单独跑，这里只兜大括号平衡 */
const braces = (t) => [ (t.match(/\{/g) || []).length, (t.match(/\}/g) || []).length ];
const [ob, cb] = braces(src);
ok('大括号差值与改动前一致（+1，来自既有模板字符串）', ob - cb === 1, `{=${ob} }=${cb}`);

/* 8. 行数基线：本轮把面板从两个小按钮换成居中大卡片，净增约 19 行占位是预期的。
      只防"结构被大改却没察觉"，不追求精确值。 */
ok('行数在 21890~21910（卡片化后基线）', lines.length - 1 >= 21890 && lines.length - 1 <= 21910, 'lines=' + (lines.length - 1));

console.log('----');
if (fail === 0) { console.log('GATE: ALL PASS'); process.exit(0); }
console.log(`GATE: ${fail} FAILED`); process.exit(1);
