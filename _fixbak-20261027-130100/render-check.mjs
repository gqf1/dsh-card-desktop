// 用假 React 离线渲染 CardDesktopSidePanel，验证：
//   ① 生成两张大卡片（code / music），没有「对话」；
//   ② 外层容器撑满内容区、中段是居中布局（不是左上角小按钮）；
//   ③ 点卡片会以正确 id 调用 openCardDesktop；
//   ④ 窄屏/侧栏收起用的兜底入口仍走 openCardDesktop("code")。
// 用法：node "render-check.mjs"   退出码 0 = 全过
import fs from 'fs';

const FILE = 'F:\\DSH\\card-desktop-plugin\\lib\\client.js';
const src = fs.readFileSync(FILE, 'utf8');

let fail = 0;
const ok = (n, c, d) => { if (c) console.log('PASS  ' + n); else { console.log('FAIL  ' + n + (d ? ' :: ' + d : '')); fail++; } };

/* ---- 假 React：只记录元素树 ---- */
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter((c) => c != null) }),
  Fragment: 'Fragment',
  useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
  useEffect: () => {},
  useRef: (v) => ({ current: v }),
  useMemo: (f) => f(),
  useCallback: (f) => f()
};

/* ---- 从源码里切出面板组件 + SIDE_APPS，注入调色板与开关 ---- */
const cut = (start, endMarker) => {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('anchor not found: ' + start);
  const j = src.indexOf(endMarker, i);
  if (j < 0) throw new Error('end not found for: ' + start);
  return src.slice(i, j);
};
const appsSrc = cut('const SIDE_APPS = [', '];') + '];';
const panelSrc = cut('const CardDesktopSidePanel = () => {', '      /* 侧栏那一行的图标');

let opened = [];
const sandbox = new Function(
  'React', 'S', 'openCardDesktop',
  `${appsSrc}
   ${panelSrc}
   return { CardDesktopSidePanel, SIDE_APPS };`
);
const { CardDesktopSidePanel, SIDE_APPS } = sandbox(
  React,
  { bg: '#202122', panel: '#191A1B', border: '#2A2B2C', text: '#BBBEBF', title: '#fff', sub: '#d2dae6', accent: '#3994BC', danger: '#a1260d' },
  (v) => opened.push(v)
);

/* ---- 渲染：组件是普通函数，直接执行即为元素树（本项目不用类组件） ---- */
const tree = CardDesktopSidePanel();

const walk = (n, out = []) => {
  if (!n || typeof n !== 'object') return out;
  out.push(n);
  (n.children || []).forEach((c) => walk(c, out));
  return out;
};
const all = walk(tree);

/* ① 两张卡片 */
ok('SIDE_APPS 恰两项（code / music）', SIDE_APPS.length === 2 && SIDE_APPS.map((a) => a.id).join(',') === 'code,music', JSON.stringify(SIDE_APPS.map((a) => a.id)));
const clickables = all.filter((n) => n.props && n.props.role === 'button');
ok('渲染出 2 个可点击卡片', clickables.length === 2, 'found=' + clickables.length);
ok('卡片文案含 代码工作台 与 音乐', JSON.stringify(all.map((n) => n.children.filter((c) => typeof c === 'string').join(''))).includes('代码工作台') && JSON.stringify(all.map((n) => n.children.filter((c) => typeof c === 'string').join(''))).includes('音乐'));
ok('不存在「对话」入口', !JSON.stringify(all).includes('对话'));

/* ② 布局：外层撑满 + 中段居中 */
const root = tree;
ok('外层宽度 100% 且高度撑满内容区', root.props.style.width === '100%' && root.props.style.height === '100%' && root.props.style.minHeight === '100%', JSON.stringify(root.props.style));
const mid = all.find((n) => n.props && n.props.style && n.props.style.flex === 1 && n.props.style.justifyContent === 'center');
ok('中段是 flex:1 且水平垂直居中', !!mid, mid ? JSON.stringify(mid.props.style) : 'not found');
ok('中段最小高度 >= 260（不再压成左上角一条）', !!mid && mid.props.style.minHeight >= 260, mid ? String(mid.props.style.minHeight) : '-');

/* ③ 点击行为 */
clickables.forEach((c) => c.props.onClick());
ok('点两张卡片分别打开 code 与 music', opened.join(',') === 'code,music', opened.join(','));

/* ④ 键盘可达 */
opened = [];
clickables.forEach((c) => c.props.onKeyDown({ key: 'Enter', preventDefault() {} }));
ok('回车键也能打开对应应用', opened.join(',') === 'code,music', opened.join(','));

/* ⑤ 兜底入口（窄屏/侧栏收起）仍走 openCardDesktop("code") */
ok('兜底入口调用 openCardDesktop("code")', /else openCardDesktop\("code"\);/.test(src));

console.log('----');
if (fail === 0) { console.log('RENDER: ALL PASS'); process.exit(0); }
console.log('RENDER: ' + fail + ' FAILED'); process.exit(1);
