# dsh-card-desktop

DeepSeek Harness（DSH）的**卡片桌面**插件：在里面开一个全屏代码工作台，用卡片式界面看工程、编辑 Verilog、跑静态检查。

不是独立软件，是 DSH 的插件。装之前得先有 DSH。

---

## 前置要求

装法分两条路，**先确认你用的是哪一个**：

| 你在用 | 需要准备 |
|---|---|
| **DSH 桌面客户端**（`DeepSeek Harness.exe`） | **什么都不用装**。客户端自带 Node 和 pnpm |
| **浏览器版 / 命令行**（`dsh web`） | Node 18+、DSH **0.2.1-rc.2 或更高**、pnpm |

> **注意版本：** npm 上 `latest` 标签目前指向 `0.2.0-rc.2`，比本插件要求的版本低。必须显式装 `next` 标签或指定版本，否则插件装上后入口不出现：
>
> ```bash
> npm i -g @deepseek-ai/dsh@next
> ```
>
> 或者钉死版本：`npm i -g @deepseek-ai/dsh@0.2.1-rc.2`

检查版本（仅浏览器版需要）：

```bash
dsh --version     # 必须是 0.2.1-rc.2 或更高
pnpm --version
```

---

## 安装

### 第一步：把插件放到本地

**方式 A —— 用 git**

```bash
git clone https://github.com/gqf1/dsh-card-desktop.git D:\dsh-card-desktop
```

**方式 B —— 下载 zip**

在仓库页面点 `Code` → `Download ZIP`（或在 `Releases` 里下 `dsh-card-desktop-v*.zip`），解压到任意目录，例如 `D:\dsh-card-desktop`。

> 记住这个目录的**完整路径**，下一步要用。

### 第二步：装进 DSH —— 按你用哪个客户端选一条

#### 路线 1：桌面客户端（推荐，最简单）

命令行**装不了**桌面客户端的插件——DSH 会把 `desktop` 这个 profile 锁给客户端自己管。你从命令行跑会看到：

```
error: profile "desktop" is managed exclusively by the Electron application
```

正确做法是用应用内的**插件管理器**：

1. 打开 DSH 桌面客户端
2. 进「设置」→「插件管理器」（Plugin Manager）
3. 点 **Add plugin**（添加插件）
4. 在输入框里填**插件目录的完整绝对路径**，例如：

   ```
   D:\dsh-card-desktop
   ```

   > Add plugin 支持四种写法：npm 包名、Git 地址、压缩包、**本地绝对路径**。本地目录用最后一种。

5. 提交，等它装完

#### 路线 2：浏览器版 / 命令行

```bash
dsh plugin --profile web add D:\dsh-card-desktop
```

**三个必须注意的点：**

1. **`--profile web` 不能省。** 省了会直接报错（该参数是必填项）。
2. **路径必须是绝对路径。** 不要用 `dsh plugin add .` —— 相对路径会按你当前所在目录解析，可能把 profile 自己 link 进去，把环境搞坏。
3. **把你自己的实际路径替换进去。** 上面写的是 `D:\dsh-card-desktop`，你解压到哪就写哪。

### 第三步：重启 DSH

**装完必须重启，不重启不生效。**

### 第四步：打开它

重启后打开任意一个会话，**在会话头部的按钮区**找卡片桌面的入口，点进去。

> 空白的新会话里，入口会出现在输入框上方那一行工具按钮里（DSH 的机制：空白会话会隐藏头部按钮）。

---

## 桌面端可选：让快捷键给工作台

**只在用桌面客户端时需要。** 浏览器版跳过这一节。

桌面客户端的外壳会先拦下一批快捷键，导致工作台里按 `Ctrl+K`、`Ctrl+O` 等没反应。仓库里 `extras/keybindings.json` 是一份已经调好的「让位配置」，把 9 个快捷键从外壳让给了工作台。

**安装方法：**

1. 先备份你现有的那份（如果存在）：

   ```
   %APPDATA%\@deepseek-ai\dsh-desktop\keybindings.json
   ```

2. 把仓库里的 `extras/keybindings.json` 复制到这个位置（同名覆盖）
3. 刷新页面生效

**让位后工作台可用的键：**

| 键 | 原来的作用 | 让位后 |
|---|---|---|
| `Ctrl+/` | 打开会话 | 工作台内使用 |
| `Ctrl+K` | 搜索会话 | 工作台内使用 |
| `Ctrl+O` | 添加工作区 | 工作台内使用 |
| `Ctrl+W` | 关闭页面 | 工作台内使用 |
| `Ctrl+\` | 分栏 | 工作台内使用 |
| `` Ctrl+` `` | 新终端 | 工作台内使用 |
| `Ctrl+N` | 新建会话 | 工作台内使用 |

这些功能在桌面客户端里改成了 `Ctrl+Alt+` 组合（如 `Ctrl+Alt+K` 仍然是搜索会话），所以原有功能不会丢。

> 想自定义：直接编辑那份 JSON，`profiles."desktop:windows"` 下面每一条就是一个快捷键绑定。

---

## 能做什么

- **全屏代码工作台**：标签页、分栏、文件树、搜索替换，外观对齐 VSCode
- **Verilog 编辑**：语法高亮、格式化（对齐 lowRISC 编码风格）、矩形/列选择（Alt+拖拽）
- **静态检查**：漏复位、latch、位宽截断、多驱动、CDC 等 20+ 条规则
- **Vivado RTL 层次浏览**：读 `.xpr` 工程，按层次看模块
- **编码转换**：UTF-8 ⇄ GBK 互转（给 Vivado 用），写前有可编码性校验，拒绝写出半坏文件
- **Git 面板**：状态、历史、diff、还原

---

## 常见问题

### 装完了，但界面上找不到入口

按顺序排查：

1. **重启了吗？** 这是最常见的原因。
2. **装对 profile 了吗？** 桌面客户端用的是 `desktop` profile（由客户端自己管），浏览器版用的是 `web` profile。装错地方插件不会出现。
3. **版本差太远？** 插件按 DSH **0.2.1-rc.2** 开发。0.2.1 改过客户端 API（`sessions.open` 已删除、会话列表结构有变），低于 0.2.1 会出问题。跑 `dsh --version` 看，太旧就升级。
4. **行 id 冲突？** 如果你之前装过另一个也叫 `card-desktop` 的插件，`cordis.patch.yml` 的行 id 会重复，**重复会导致整棵插件树加载失败**（现象是整个插件面板全部消失，不只是这一个插件）。先卸载旧的再装（见下方「卸载」）。

### 打开后一片全黑 / 空白

客户端 API 不匹配。插件按 DSH 0.2.1-rc.2 适配，确认客户端 / DSH 版本不低于 0.2.1。

### 桌面背景图不显示，只有纯色

**这是正常的。** 背景图引用的是一张 `dragon-heir` 皮肤资源，需要另装皮肤插件（`@linxin666/dsh-web-all` 里的 `web-ui-skin-center`）才会出现。没装就退化成纯色背景——**不影响任何功能**。

### 桌面客户端里某些快捷键没反应

按上面「桌面端可选：让快捷键给工作台」装一下 `extras/keybindings.json`。

### `dsh plugin add` 报 EPERM / 权限错误

Windows 上写 `C:\Users\<你>\.dsh\profiles\` 需要权限。用**管理员身份**开 PowerShell 再跑一次。

---

## 更新

插件不会自动更新。因为是按本地目录安装的，更新就是拉最新代码再重启：

```bash
cd D:\dsh-card-desktop
git pull
```

然后**重启 DSH**。

---

## 卸载

**桌面客户端**：进「设置」→「插件管理器」，找到 `dsh-card-desktop` → 卸载。

**浏览器版**：

```bash
dsh plugin --profile web remove dsh-card-desktop
```

重启后生效。删掉本地那个 `D:\dsh-card-desktop` 目录即可。

---

## 版本

### v0.3.1

- 修正安装说明：npm 的 `latest` 仍指向 `0.2.0-rc.2`，必须显式装 `@deepseek-ai/dsh@next`（= 0.2.1-rc.2），否则插件装上后入口不出现

### v0.3.0

- **适配 DSH 0.2.1-rc.2**：客户端升级后 `sessions.open` 已删除、会话列表结构有变（`current` 字段移除），本次重写了会话导航与相关读取路径
- 新增对 `uiWorkspace` 服务的兼容（惰性取用，缺失时降级并提示，不会崩）
- 适配 0.2.1 的计划审批（plan-review）与权限切换返回格式
- 补充**桌面客户端**安装说明（应用内插件管理器；命令行装不了桌面 profile）
- 新增 `extras/keybindings.json`：桌面端快捷键让位配置
- 版本基线更新为 **0.2.1-rc.2**

### v0.2.1

- 源码注释脱敏：去掉一处本机绝对路径示例（不影响功能）

### v0.2.0

- **源代码管理（SCM）面板**：暂存区、提交日志、每个工作区各自独立
- **diff 视图**：并排对比、独立窗口、外观重做
- **撤销 / 重做**：补齐重做（含目录级批量替换的重做）
- **Explorer**：子目录展开、展开状态记忆、缺失文件提示
- **新建文件 / 目录**：修掉点「确定」会建出名为 `[object Object]` 的文件的 bug
- **保存**：无改动时真不写盘（避免改 mtime 让 Vivado 判工程过时）
- **界面**：进一步对齐 VSCode、分栏宽度修复、状态栏保存提示
- **minimap**：短文件显示、行高上限

### v0.1.0

首个版本：全屏代码工作台、Verilog 编辑与格式化、静态检查、Vivado RTL 层次浏览、编码转换、Git 面板。

---

## 说明

- 本插件**零 npm 运行时依赖**，只用 Node 内建模块和 DSH 宿主注入的虚拟模块。所以 clone 下来就能装，不需要 `npm install`。
- `lib/client.js` 约 1.4 MB，是因为格式化引擎、语法高亮、全部界面都内联在这一个文件里。属正常体积。
- 仓库有 `extras/` 目录放的是**非插件本体**的辅助文件（快捷键配置），不装也不影响插件运行。

---

## 目录结构

```
dsh-card-desktop/
├── package.json          插件清单
├── cordis.patch.yml      插件加载行
├── lib/
│   ├── index.js          宿主半边（文件读写 + /desk/api 路由）
│   └── client.js         界面半边（工作台全部界面与编辑逻辑）
├── extras/
│   └── keybindings.json  桌面端快捷键让位配置（可选）
├── README.md
└── LICENSE
```

---

## 许可

MIT
