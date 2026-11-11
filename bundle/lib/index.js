/**
 * dsh-desk-all — 卡片桌面全家桶的宿主半区。
 *
 * 本包只是**聚合壳**：它自己不带任何功能代码，职责只有两件：
 *   1) 作为 bundle（package.json 的 dsh.bundle.patch）向 profile 插入
 *      card-desktop 与 music-hub 两条插件行；
 *   2) 提供这个空的宿主入口，让 loader 能正常加载本包（缺了 main 会导致 bundle 装载失败）。
 *
 * 真正的宿主逻辑分别在：
 *   - dsh-card-desktop/lib/index.js   （/desk/api 路由、文件树、Git、RTL 扫描、工作区上下文注入）
 *   - dsh-music-hub/lib/index.js      （/dsh-music/api 路由、曲库扫描、音频流、在线音源）
 *
 * 刻意不做的事：
 *   - 不 inject 任何服务，不申请任何能力 —— 空注入意味着本包在任何环境下都能加载，
 *     不会因为某个服务缺失而把整条插件链卡在等待态。
 *   - 不在这里转调子插件的 API —— 转调会让两边的生命周期耦合，
 *     关掉其中一个时另一个也跟着失效，破坏"可各自独立开关"的承诺。
 */

/** Stable Cordis plugin name（loader 用它在插件树里定位本行）。 */
export const name = "dsh-desk-all";

/** 不依赖任何服务：空数组是刻意的，见文件头说明。 */
export const inject = [];

/**
 * 挂载本聚合包。
 *
 * 这里只打一行启动日志：排查「装了全家桶但某个插件没出现」时，
 * 先看这行在不在 —— 在，说明聚合壳本身加载成功，问题在子插件那一行；
 * 不在，说明是本包没装进 profile。
 *
 * @param ctx - Cordis 上下文（本包不使用，保留签名以便将来扩展）。
 */
export function apply(ctx) {
  void ctx;
  // 前缀与其它子插件日志保持一致的 dsh-* 形式，便于在宿主日志里 grep。
  console.log("[dsh-desk-all] 聚合包已加载（卡片桌面 + 音乐），子插件行见 cordis.patch.yml");
}

export default { name, inject, apply };
