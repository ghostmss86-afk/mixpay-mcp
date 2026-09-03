# 配置引导向导（agent 必读）

> 执行本 skill 涉及账号/keystore 配置时，**agent 必须主动引导用户走完本向导，不要等用户来问**。
> 原则：用户只做必须由人完成的事（手机上注册、扫码、抄助记词），其余全部由 agent 代办或代办到只剩粘贴。

## 阶段 0 — 现状检查（agent 执行，10 秒）

```bash
cat .env 2>/dev/null || echo "NO_ENV"; ls keystore.json 2>/dev/null || echo "NO_KEYSTORE"
```

- `.env` 已有 `MIXPAY_PAYEE_ID` 且 `keystore.json` 存在 → 跳到阶段 4 自检。
- 只有其一 → 从缺的阶段补。
- 都没有 → 从阶段 1 开始，先给用户发这句话定预期：

> 配置只需要你亲手做两件事：手机上创建账号（约 5 分钟）+ 浏览器扫码建一个开发者 App（约 3 分钟）。其余我来。全程匿名，不需要手机号和实名。

## 阶段 1 — 前置：拿到 payeeId（两条路，先走快的）

**路径 ① 邮箱直注（最快，官方支持）**：打开 https://dashboard.mixpay.me → 邮箱 + 验证码注册登录 → Settings → 复制 payeeId UUID。无需 Mixin 账号。
注意：邮箱账户的资金结算在 MixPay 账户钱包内（提现走 Dashboard 出金流程）；自托管需求更强的用户后续可升级 Mixin 账户（路径 ②）。若 API 对新账户有白名单要求（报错即知），回落路径 ② 或联系 bd@mixpay.me。

**路径 ② Mixin 账户（自托管，见阶段 2）**：手机装 Mixin → 助记词匿名注册 → developers.mixin.one 建 App → keystore。适合要用 provision 创建专用收款账号的场景。

## 阶段 2 — Mixin 路径（仅路径 ② 需要：手机 5 分钟 + 电脑 3 分钟）

**手机操作清单（原样发送给用户）**：

1. 从官方渠道下载 **Mixin Messenger**（mixin.one，认准官方，应用商店有仿冒品）；
2. 打开 → **Create Account → Mnemonic Phrase（助记词）→ Create**；
3. **抄写助记词到纸上，存两个不同地点**（这是账号唯一恢复方式，丢了=永久丢失；不要截图、不要存网盘）；
4. 设置 6 位 PIN。

安全提示同步给用户：助记词账号完全匿名（无手机号无邮箱）；但代价是无法设置恢复联系人，助记词是唯一救命稻草。

**电脑操作清单（拿到 keystore）**：

1. 浏览器打开 `developers.mixin.one` → 用 Mixin Messenger 扫码登录；
2. **Create App**（名字随意，如 `my-pay`）；
3. 进入 App → **Secret / Keystore** → 复制整段 JSON（包含 client_id、session_id、private_key、pin_token）。

## 阶段 2.5 — 确定 payeeId（两条路径，默认走 A，用户零额外操作）

**路径 A（推荐）**：keystore 里的 `client_id` 本身就是一个 Mixin 机器人 UUID——MixPay 官方支持「机器人」作为收款账户，所以 **payeeId = client_id，无需任何额外注册**。
⚠️ 该路径待端到端实测确认；若 `pay` 报错，回落路径 B。

**路径 B（官方兜底）**：浏览器打开 `mixpay.me` → 用 Mixin 扫码登录 Dashboard → Settings → 复制 payeeId UUID。

确定后由 agent 写入 `.env`（用户无需动手，除非选了「自己填」路径）。

## 阶段 3 — 交付配置（两条路径，让用户挑省事的）

**路径 A（推荐，用户步骤最少）**：用户把 keystore JSON 直接粘贴到对话里 → agent 写入本地安全位置并立即提示完成。写入后回复：

> 已保存到本地（不会进 git、不会上传）。建议你现在把它另抄一份到离线存储。

**路径 B（用户不想粘贴敏感内容时）**：agent 执行 `open -e .env`（macOS）直接打开编辑器，告诉用户「把 keystore/UUID 粘贴到指定行，保存后告诉我」。

写盘规则：
- keystore 保存为 `keystore.json`（后续 provision/sweep 模块的输入），并 `chmod 600`；
- `.env` 只放 `MIXPAY_PAYEE_ID`（公开信息）和 `MIXPAY_CALLBACK_URL`；
- 确认 `.gitignore` 覆盖 `.env`、`keystore.json`。

## 阶段 4 — 端到端自检（agent 执行 + 用户扫一次码）

1. 先安装（当前从 GitHub 直装，npm 包发布后可用 npx）：

```bash
npm install -g github:ghostmss86-afk/mixpay-mcp
```

2. agent 生成测试单：

```bash
mixpay pay --amount 0.01 --currency usd --settle usdt --remark smoke-test
```

⚠️ 全局安装后直接用 `mixpay` 命令；**永远不要 `npx mixpay`**——npm 上的 `mixpay` 是别人的包，属于供应链投毒风险。

3. agent 执行 `open <支付链接>`（macOS）直接在用户浏览器打开付款页——用户零复制，扫码或选择钱包付款即可；
4. 付款完成后 agent 执行 `mixpay wait` → `verify_payment`（金额/币种硬校验）；
5. 向用户报告：链路是否全通、每一步结果。

**用户在这一整条链里的动作只有：装 App、抄助记词、扫两次码（登录 + 付款）、点一次保存。** 其余全部 agent 代办。

## 常见卡点

| 卡点 | 处理 |
|---|---|
| 应用商店搜不到 Mixin | 用官网 mixin.one 下载；国内 App Store 的「密信」是仿冒品 |
| 助记词无法导入 MetaMask | 正常，Mixin 助记词只在 Mixin 生态内有效 |
| developers.mixin.one 打不开 | 检查网络；该站点在部分地区需代理 |
| payeeId 校验报 User does not exist | UUID 抄错或少位，让用户回 Dashboard 重新复制 |
