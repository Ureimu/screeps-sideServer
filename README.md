# screeps-sideServer

这是一个运行在本地或服务器上的自动化脚本生成布局数据并传输到对应SegmentMemory的解决方案。

## 安装依赖

```bash
npm install
```

## 构建

```bash
npm run build
# 或
rollup -c
```

## 运行

```bash
node -r source-map-support/register dist/main.js YOUR_INFO_NAME
```

或使用 `rollup -c && node -r source-map-support/register dist/main.js YOUR_INFO_NAME` 来运行自动化脚本生成布局数据并传输到对应SegmentMemory。

YOUR_INFO_NAME为你authInfo里写的配置项名字。

## WebSocket 实时触发模式 (推荐)

通过 WebSocket 监听游戏 console 输出，实时触发计算任务，无需轮询。

### 启动

```bash
rollup -c && node -r source-map-support/register dist/main.js YOUR_INFO_NAME --ws
```

### 游戏内触发

在游戏代码中添加：

```javascript
// 触发布局计算
console.log("sideServer:run");

// 带参数的触发 (可匹配自定义模式)
// console.log("sideServer:run:custom");
```

### 自定义触发模式

```bash
# 使用正则匹配自定义触发词 (建议加引号避免 shell 解释)
node -r source-map-support/register dist/main.js YOUR_INFO_NAME --ws --pattern="sideServer:run:(\w+)"
```

### 优势

- **实时性**: WebSocket 推送，毫秒级延迟
- **省资源**: 建立一次连接，持续监听
- **简单**: 游戏内只需 `console.log()` 即可触发

### 工作流程

```
游戏内 console.log("sideServer:run")
        ↓
    WebSocket 推送
        ↓
    立即触发本地计算
        ↓
    结果写回 SegmentMemory
```
