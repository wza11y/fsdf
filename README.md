# AI cooking

下班想吃点好的、又懒得想的时候，用一个念头换来 8–10 道能直接下手的健康家常菜，再用转盘替你选一道。

## 功能

- 输入主题（如「清淡点、高蛋白、二十分钟能做好」），可选耗时、人数、口味
- 一次生成 8–10 道菜，每道包含菜名、风格标签、心动值、推荐理由、配料、步骤、不翻车关键点、健康说明
- 转盘随机选一道，支持「再转一次」
- 单道复制、收藏、历史记录（localStorage，保留最近 30 次）
- 全部中文；无 API Key、Key 错误、超时、限流都有明确提示

## 快速开始

需要 Node.js 20+。

```bash
npm install
```

编辑项目根目录的 `.env.local`，至少填两项：

```bash
DEEPSEEK_API_KEY=sk-你的key      # https://platform.deepseek.com 申请
ACCESS_CODE=你自定义的访问口令
```

然后启动：

```bash
npm run dev
```

打开 http://localhost:3000 ，输入访问口令即可使用。

`DEEPSEEK_MODEL` 默认 `deepseek-chat`。如果你用的是别的模型名（例如某个网关提供的 `deepseek-flash`），改成实际可用的值，否则调用会返回上游错误。

## 防护

这是本地私用工具，不是公开服务：

- 访问口令会换成一个 HttpOnly、30 天有效的签名 cookie，页面和 API 都校验
- `ACCESS_CODE` 没配置时默认拒绝一切访问（fail closed）
- 只接受 `localhost` / `127.0.0.1` 的 Origin 和 Host
- 同一 IP 每分钟最多 3 次生成，全局每天最多 50 次
- API Key 和口令只在服务端环境变量里，不会进入浏览器

不要把 `npm run dev` 改成监听 `0.0.0.0`，也不要用内网穿透临时暴露端口。

## 命令

```bash
npm run dev      # 开发
npm test         # vitest（一次运行）
npm run lint     # eslint
npm run build    # 生产构建
```

## 数据

不登录、不用数据库。历史和收藏都在浏览器 localStorage 里，清空站点数据就会丢失。
