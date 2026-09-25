# dsh-card-desktop

DeepSeek Harness（DSH）的**卡片桌面**插件：在里面开一个全屏代码工作台，用卡片式界面看工程、编辑 Verilog、跑静态检查。

不是独立软件，是 DSH 的插件。装之前得先有 DSH。

---

## 前置要求

| 需要什么 | 说明 |
|---|---|
| **DSH** | `npm i -g @deepseek-ai/dsh`，版本建议 **0.1.5-rc.1 附近**（差太远插件入口可能不出现） |
| **pnpm** | `npm i -g pnpm`。`dsh plugin` 命令底层转发给 pnpm，没有它会失败 |
| **Node.js** | 18 以上 |

检查版本：

```bash
dsh --version
pnpm --version
```

---

## 安装

### 第一步：把插件放到本地

**方式 A —— 用 git（推荐）**

```bash
git clone https://github.com/gqf1/dsh-card-desktop.git D:\dsh-card-desktop
```

**方式 B —— 下载 zip**

在仓库页面点 `Code` → `Download ZIP`，解压到任意目录，例如 `D:\dsh-card-desktop`。

> 记住这个目录的**完整路径**，下一步要用。

### 第二步：安装到 DSH

```bash
dsh plugin --profile web add D:\dsh-card-desktop
```

**三个必须注意的点：**

1. **`--profile web` 不能省。** 省了会装错地方。
2. **路径必须是绝对路径。** 不要用 `dsh plugin add .` —— 相对路径会按你当前所在目录解析，可能把 profile 自己 link 进去，把环境搞坏。
3. **把你自己的实际路径替换进去。** 上面写的是 `D:\dsh-card-desktop`，你解压到哪就写哪。

### 第三步：重启 DSH

**装完必须重启，不重启不生效。**

### 第四步：打开它

重启后打开任意一个会话，**在会话头部的按钮区**找卡片桌面的入口，点进去。

> 空白的新会话里，入口会出现在输入框上方那一行工具按钮里（DSH 的机制：空白会话会隐藏头部按钮）。

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
2. **版本差太远？** 插件用 DSH 0.1.5 的客户端 API。跑 `dsh --version` 看，太旧就升 DSH。
3. **行 id 冲突？** 如果你之前装过另一个也叫 `card-desktop` 的插件，`cordis.patch.yml` 的行 id 会重复，**重复会导致整棵插件树加载失败**（现象是整个插件面板全部消失，不只是这一个插件）。先卸载旧的：

   ```bash
   dsh plugin --profile web remove dsh-card-desktop
   ```

   然后再装。

### 打开后一片全黑 / 空白

客户端 API 不匹配。确认 DSH 版本是 0.1.5-rc.1 或接近的版本。

### 深度主题下桌面背景图不显示

背景图引用的是 `dragon-heir` 皮肤的资源。没装这个皮肤就取不到图，会退化成纯色背景——**不影响功能**。

### `dsh plugin add` 报 EPERM / 权限错误

Windows 上写 `C:\Users\<你>\.dsh\profiles\web` 需要权限。用**管理员身份**开 PowerShell 再跑一次。

---

## 更新

插件不会自动更新。要更新就：

```bash
cd D:\dsh-card-desktop
git pull
```

然后**重启 DSH**。

---

## 卸载

```bash
dsh plugin --profile web remove dsh-card-desktop
```

重启后生效。删掉本地那个 `D:\dsh-card-desktop` 目录即可。

---

## 说明

- 本插件**零 npm 运行时依赖**，只用 Node 内建模块和 DSH 宿主注入的虚拟模块。所以 clone 下来就能装，不需要 `npm install`。
- `lib/client.js` 约 950 KB，是因为格式化引擎、语法高亮、全部界面都内联在这一个文件里。属正常体积。

---

## 许可

MIT
