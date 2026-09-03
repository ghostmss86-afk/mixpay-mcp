# MixPay MCP / CLI — 各 AI 编程工具接入配置
# 以下 JSON 片段均为模板，把 <你的PAYEE_UUID> 换成 MixPay Dashboard 里的收款 UUID。
# 工具配置格式随版本可能变化，以各工具当前官方文档为准。

## 1. Claude Code
文件: 项目根 .mcp.json（项目级）或 claude mcp add 命令：
  claude mcp add mixpay -e MIXPAY_PAYEE_ID=<你的PAYEE_UUID> -- npx -y mixpay-mcp

.mcp.json:
{
  "mcpServers": {
    "mixpay": {
      "command": "npx",
      "args": ["-y", "mixpay-mcp"],
      "env": { "MIXPAY_PAYEE_ID": "<你的PAYEE_UUID>" }
    }
  }
}

## 2. Cursor
文件: .cursor/mcp.json（项目级）或 ~/.cursor/mcp.json（全局）：
{
  "mcpServers": {
    "mixpay": {
      "command": "npx",
      "args": ["-y", "mixpay-mcp"],
      "env": { "MIXPAY_PAYEE_ID": "<你的PAYEE_UUID>" }
    }
  }
}

## 3. OpenCode
文件: opencode.json：
{
  "mcp": {
    "mixpay": {
      "type": "local",
      "command": ["npx", "-y", "mixpay-mcp"],
      "environment": { "MIXPAY_PAYEE_ID": "<你的PAYEE_UUID>" },
      "enabled": true
    }
  }
}

## 4. OpenClaw
OpenClaw 走 MCP 通道，把上面的 mcpServers 片段加进其 MCP 配置（具体路径以其文档为准）。

## 5. Codex CLI
文件: ~/.codex/config.toml：
[mcp_servers.mixpay]
command = "npx"
args = ["-y", "mixpay-mcp"]
env = { "MIXPAY_PAYEE_ID" = "<你的PAYEE_UUID>" }

## 6. WorkBuddy
文件: ~/.workbuddy/mcp.json（注意不是 .mcp.json）：
{
  "mcpServers": {
    "mixpay": {
      "command": "npx",
      "args": ["-y", "mixpay-mcp"],
      "env": { "MIXPAY_PAYEE_ID": "<你的PAYEE_UUID>" }
    }
  }
}
写入后不会自动生效：到「连接器管理」页面右上角自定义连接器入口，点击信任 mixpay-mcp 后启用。

## 7. 豆包（通用 CLI 兜底）
豆包桌面端对第三方 MCP server 的支持状态未经验证，最稳的接入方式是 CLI 兜底：
只要 agent 能执行 shell 命令，直接让它运行：
  npx -y -p mixpay-mcp mixpay init --payee-id <你的PAYEE_UUID>
  npx -y -p mixpay-mcp mixpay pay --amount 10 --currency usd --settle usdt --order-id order-001
  npx -y -p mixpay-mcp mixpay wait --trace-id <上一步返回的traceId>
把这三行写进给豆包的系统提示/项目说明即可。
⚠️ 注意 `-p mixpay-mcp` 不能省：裸 `npx mixpay` 会执行 npm 上别人的同名包。
若后续确认豆包支持 MCP，直接复用第 1 条的 mcpServers 配置。
