import { ScreepsApi } from "node-ts-screeps-api";
import { apiConfig } from "../authInfo";
import { CallLayoutData } from "type";
import { correspond } from "./roomLayout/correspond";

export interface WsConsoleConfig {
    state: string;
    triggerPattern?: RegExp;
    reconnectDelay?: number;
}

/**
 * WebSocket console 监听触发器
 * 通过监听游戏 console 输出实时触发计算任务
 */
export class WsConsoleTrigger {
    private api: ScreepsApi<"signinByPassword" | "signinByToken">;
    private config: WsConsoleConfig;
    private ws: any = null;
    private isRunning: boolean = false;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isStopped: boolean = false; // [P2] 停止标志，防止 stop 后重连

    constructor(config: WsConsoleConfig) {
        this.config = {
            triggerPattern: /sideServer:run/i,
            reconnectDelay: 5000,
            ...config
        };
        this.api = new ScreepsApi(apiConfig(config.state));
    }

    /**
     * 启动 WebSocket 监听
     */
    async start(): Promise<void> {
        console.log(`[WsConsole] Starting WebSocket listener for config: ${this.config.state}`);
        await this.api.auth();
        await this.connect();
    }

    /**
     * 建立 WebSocket 连接
     */
    private async connect(): Promise<void> {
        // [P2] 检查是否已停止
        if (this.isStopped) {
            console.log("[WsConsole] Stopped, skipping connection...");
            return;
        }

        try {
            // 获取 WebSocket URL
            const wsUrl = await this.api.rawApi.getWebSocketUrl();
            console.log(`[WsConsole] Connecting to WebSocket: ${wsUrl}`);

            // 建立 WebSocket 连接
            const { default: WebSocket } = await import("ws");
            this.ws = new WebSocket(wsUrl);

            this.ws.on("open", () => {
                console.log("[WsConsole] WebSocket connected");
                
                // [P1] 订阅 console 事件 - 使用正确的 Screeps WebSocket API 协议
                // Screeps 控制台订阅格式: subscribe channel:<shard>/console
                this.ws.send(
                    JSON.stringify({
                        msg: "subscribe",
                        channel: `console`
                    })
                );
            });

            this.ws.on("message", (data: Buffer) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                } catch (e) {
                    // 忽略解析错误
                }
            });

            this.ws.on("close", () => {
                // [P2] 只有未停止时才重连
                if (!this.isStopped) {
                    console.log("[WsConsole] WebSocket disconnected, reconnecting...");
                    this.scheduleReconnect();
                } else {
                    console.log("[WsConsole] WebSocket stopped gracefully");
                }
            });

            this.ws.on("error", (err: Error) => {
                console.error("[WsConsole] WebSocket error:", err.message);
            });

        } catch (error) {
            console.error("[WsConsole] Connection failed:", error);
            // [P2] 只有未停止时才重连
            if (!this.isStopped) {
                this.scheduleReconnect();
            }
        }
    }

    /**
     * 处理 WebSocket 消息
     */
    private handleMessage(message: any): void {
        // [P1] 检查消息格式 - Screeps WebSocket console 消息结构
        // 格式: { channel: "console", data: [ { message: "..." } ] }
        if (message && message.channel === "console" && Array.isArray(message.data)) {
            const consoleText = message.data.map((msg: any) => msg.message || "").join(" ");
            
            // 检查是否匹配触发模式
            if (this.config.triggerPattern && this.config.triggerPattern.test(consoleText)) {
                console.log(`[WsConsole] Triggered by console: ${consoleText}`);
                this.handleTrigger(consoleText);
            }
        }
    }

    /**
     * 处理触发信号
     */
    private async handleTrigger(consoleText: string): Promise<void> {
        if (this.isRunning) {
            console.log("[WsConsole] Already running, skipping...");
            return;
        }

        this.isRunning = true;
        try {
            console.log("[WsConsole] Running layout computation...");
            await correspond(this.config.state);
            console.log("[WsConsole] Computation completed");
        } catch (error) {
            console.error("[WsConsole] Computation failed:", error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 安排重连
     */
    private scheduleReconnect(): void {
        // [P2] 检查是否已停止
        if (this.isStopped) {
            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, this.config.reconnectDelay);
    }

    /**
     * 停止监听
     */
    stop(): void {
        this.isStopped = true; // [P2] 设置停止标志
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

/**
 * 便捷启动函数
 */
export async function startWsConsole(state: string, pattern?: string): Promise<void> {
    const trigger = new WsConsoleTrigger({
        state,
        triggerPattern: pattern ? new RegExp(pattern) : undefined
    });

    // 优雅退出
    const shutdown = () => {
        console.log("[WsConsole] Shutting down...");
        trigger.stop();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    await trigger.start();

    // 保持进程运行
    return new Promise(() => {});
}
