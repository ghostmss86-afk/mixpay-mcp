# MixPay 白名单 / KYC 开通 Runbook（照抄即用）

> 适用场景：新注册的 MixPay 账户调用支付 API 报 `"This payee is not allow to receive payment"`、静态收款页报 `"payment information is invalid"`。
> 这是官方新商户激活门槛，不是 bug。诊断方法：用 MixPay 官方示例 payeeId `8e69e534-d0c4-3e04-8b61-37a73cd9e7d7` 发同样请求——若成功，证明集成正确、纯账户门槛。

## 一、开通 = 邮件申请（官方唯一路径，无自助入口）

**收件人**：bd@mixpay.me
**渠道**：智能体邮箱（agent 可全程接管收发）或用户自有邮箱（法律主体文件建议此渠道）
**实测响应**：13 分钟回复（2026-09-03 实测）；官方口径审核 ≤48 小时

## 二、需要提交的 6 项 KYC 材料

| # | 项目 | 说明 |
|---|---|---|
| 1 | Company name | 公司名（英文或拼音） |
| 2 | Registration No. 或 Tax No. | 注册号/统一社会信用代码/税号 |
| 3 | Operation country | 运营范围：global 或具体国家 |
| 4 | Registration country | 注册国家 |
| 5 | Company Types | 公司类型（Limited Company / LLC / 个体工商户等） |
| 6 | Certificate of Incorporation | 公司注册证书扫描件（附件） |

提交后 MixPay 验证 → 加白名单 → 提供完整集成指南。

## 三、合规决策（提交前用户必须自答，agent 必须主动提示）

| 你的主体 | 风险等级 | 建议 |
|---|---|---|
| 境外主体（香港/海外公司） | 低 | 直接提交，最优路径 |
| 中国大陆公司/个体户 | 中高 | 「大陆注册 + 加密收单」有被拒风险（924 政策后大陆禁止加密业务），且提交的是真实法律信息——是否进入加密平台 KYC 系统，由用户自行判断和承担 |
| 无公司主体 | 走不通 | 备选：BTCPay Server 自托管（零 KYC，需自建服务器）；或暂缓支付功能 |

## 四、邮件模板（英文，替换 [方括号] 内容）

**Subject**: `API access activation request — payeeId [your-uuid] ([your-site-name])`

```
Hi MixPay team,

I'm integrating MixPay into my online store ([site name — 一句话业务描述,
site URL]) so buyers can pay with any cryptocurrency.

My account:
- payeeId: [your-uuid]
- Mixin ID: [your-mixin-id] (account name: [name])

Current status:
- The MixPay API returns: "This payee is not allow to receive payment."
- The static checkout page shows: "Sorry, the payment information is invalid!"
- The same request with your demo payeeId (8e69e534-d0c4-3e04-8b61-37a73cd9e7d7)
  works fine, so the integration itself is verified correct.

Per your KYC requirements, here is our information:
- Company name: [company-name]
- Registration No.: [registration-or-tax-number]
- Operation country: [operation-country]
- Registration country: [registration-country]
- Company type: [company-type]
- Certificate of Incorporation: attached

Intended use: selling [products] to overseas customers, settling in USDT,
via the one_time_payment API on our Next.js store.

If you need any additional information or verification, just reply to
this email.

Thanks!
[your-name]
```

附件：Certificate of Incorporation 扫描件（PDF/图片）。

## 五、法律主体确认关卡（agent 必须遵守）

KYC 邮件包含用户真实法律信息——**发出前必须把完整邮件（含附件文件名）展示给用户过目，得到明确确认后才能发送**。这是唯一的强制人工确认点。用户确认后，agent 可通过智能体邮箱发送并全程接管后续沟通。

## 六、实测时间线（2026-09-03 案例）

- 23:45 发送申请邮件（智能体邮箱 xknk1714@agent.qq.com）
- 23:58 MixPay 回复（13 分钟），要求上述 6 项 KYC 材料
- [等待：用户提交材料后 → 验证 → 白名单 → 集成指南]

## 七、并行备选（白名单等待/被拒时）

| 方案 | 特点 |
|---|---|
| Mixin 直连收款（mixin-direct 后端） | 绕过 MixPay：自有 Mixin bot 收 USDT 转账（memo=orderId），免费秒到、匿名、无需任何审核。依赖 Mixin 开发者 keystore。V1 只收 USDT，放弃做市兑换层 |
| BTCPay Server 自托管 | 完全开源（MIT）、零 KYC、零第三方；部署重（全节点），主攻 BTC/Lightning |

两条路线与 MixPay 后端共存于协议抽象层（`backend: mixpay | mixin-direct | btcpay`）。
