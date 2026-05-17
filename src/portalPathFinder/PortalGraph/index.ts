import { Bar, MultiBar, Presets } from "cli-progress";
import { Portal } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { StoredPortalData } from "portalPathFinder/dataBase/readPortalData";
import { Graph } from "utils/Graph";
import { getRoomDistanceN1 } from "utils/roomNameUtils";

export type ShardPosition = {
    shard: string;
    room: string;
    x: number;
    y: number;
    type: "portal" | "dest" | "room";
    _rawStr?: string;
};

export interface StoredDestData {
    [name: string]: {
        shard: string;
        destList: (ShardPosition & { type: "dest" })[];
    };
}

export class PortalGraph extends Graph<ShardPosition> {
    constructor(public portalData: StoredPortalData) {
        super(true, () => 0);
        this.loadPortalData(this.portalData);
    }

    public portalDestData: StoredDestData = {};

    /** shard → room → roomNodeId，用于 addCreepPathDestNodePair 快速连接 */
    public shardRoomNodes: Map<string, Map<string, string>> = new Map();

    public static toShardPosStr(sPos: ShardPosition) {
        if (!sPos._rawStr) {
            sPos._rawStr = `t${sPos.type}r${sPos.room}x${sPos.x}y${sPos.y}s${sPos.shard}`;
        }
        return sPos._rawStr;
    }

    public static fromShardPosStr(sPosStr: string): ShardPosition {
        // 正则表达式匹配格式：${shard}r${room}x${x}y${y}
        // 例如: "shard1rE1N1x10y20"
        const match = sPosStr.match(/^t(dest|portal|room)r([^x]+)x(\d{1,2})y(\d{1,2})s(.+)$/);

        if (!match) {
            throw new Error(`fromShardPosStr got invalid input: ${sPosStr}`);
        }

        const [, type, room, xStr, yStr, shard] = match;
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);

        if (type !== "dest" && type !== "portal" && type !== "room") {
            throw new Error(`${sPosStr} matched invalid type: ${type}`);
        }

        // type 字段在字符串中没有编码，需要根据实际情况设置默认值
        // 这里设置为 "portal" 作为默认，但您可能需要根据业务逻辑调整
        return {
            shard,
            room,
            x,
            y,
            type
        };
    }

    public addCreepPathDestNodePair(pair: [from: string, to: string]): boolean {
        const posPair = pair.map(i => PortalGraph.fromShardPosStr(i));
        // 如果起点和终点是同shard，添加边。
        if (posPair[0].shard === posPair[1].shard) {
            const distance = (getRoomDistanceN1(posPair[0].room, posPair[1].room) + 1) * 50;
            this.addEdge(PortalGraph.toShardPosStr(posPair[0]), PortalGraph.toShardPosStr(posPair[1]), distance);
        }
        posPair.forEach((shardPos, index) => {
            const type = index === 0 ? "origin" : "dest";

            const destShardPosObject = shardPos;
            // console.log(destShardPosObject);
            this.addNode(PortalGraph.toShardPosStr(destShardPosObject), destShardPosObject);

            if (type === "origin") {
                // origin → 同 shard 所有 room 节点
                const shardRoomMap = this.shardRoomNodes.get(destShardPosObject.shard);
                if (shardRoomMap) {
                    shardRoomMap.forEach((roomStr, room) => {
                        const distance = (getRoomDistanceN1(destShardPosObject.room, room) + 1) * 50;
                        this.addEdge(PortalGraph.toShardPosStr(destShardPosObject), roomStr, distance);
                    });
                }
            } else if (type === "dest") {
                // 同 shard 所有 room 节点 → userDest
                const shardRoomMap = this.shardRoomNodes.get(destShardPosObject.shard);
                if (shardRoomMap) {
                    shardRoomMap.forEach((roomStr, room) => {
                        const distance = (getRoomDistanceN1(room, destShardPosObject.room) + 1) * 50;
                        this.addEdge(roomStr, PortalGraph.toShardPosStr(destShardPosObject), distance);
                    });
                }
            }
        });
        return true;
    }

    public removeCreepPathDestNodePair(pair: [from: string, to: string]): boolean {
        pair.forEach((sPosStr, index) => {
            this.removeNode(sPosStr);
        });
        return true;
    }

    public loadPortalData(data: StoredPortalData) {
        const bar = new Bar(
            {
                clearOnComplete: false,
                hideCursor: true,
                format: "{taskInfo} |" + "{bar}" + "| {percentage}% | {value}/{total} | ETA: {eta}s"
            },
            Presets.shades_grey
        );

        // 计算各任务的数量
        const nodeSumNum = _.reduce(
            data,
            (sum, sData) => {
                console.log(`${sData.shard}: ${sData.portals.length}`);
                sum += sData.portals.length;
                return sum;
            },
            0
        );
        // 预计算每个 shard 的房间集合（含 interShard / innerShard 目的地）
        const allRoomsPerShard = new Map<string, Set<string>>();
        _.forEach(data, ({ shard, portals, portalData }) => {
            const roomSet = new Set(portals.map(p => p.room));
            portalData.innerShard.forEach(p => roomSet.add(p.destination.room));
            allRoomsPerShard.set(shard, roomSet);
        });
        _.forEach(data, ({ portalData: { interShard } }) => {
            interShard.forEach(p => {
                const destShard = p.destination.shard;
                if (!allRoomsPerShard.has(destShard)) allRoomsPerShard.set(destShard, new Set());
                allRoomsPerShard.get(destShard)!.add(p.destination.room);
            });
        });

        const roomCountPerShard: { [shard: string]: number } = {};
        allRoomsPerShard.forEach((roomSet, shard) => {
            roomCountPerShard[shard] = roomSet.size;
        });
        const roomNodeSumNum = _.sum(Object.values(roomCountPerShard));
        const roomEdgeSumNum = _.sum(_.map(roomCountPerShard, R => R * R));
        const portalRoomEdgeSumNum = nodeSumNum * 2;

        // inter/inner dest→room 边：每个 portal 的 dest 节点只需一条边连到对应 room
        const interShardDestEdgeSum = _.reduce(data, (sum, sData) => sum + sData.portalData.interShard.length, 0);
        const innerShardDestEdgeSum = _.reduce(data, (sum, sData) => sum + sData.portalData.innerShard.length, 0);
        bar.setTotal(
            nodeSumNum +
                roomNodeSumNum +
                roomEdgeSumNum +
                portalRoomEdgeSumNum +
                interShardDestEdgeSum +
                innerShardDestEdgeSum
        );

        // 添加Portal顶点。
        const nodeBar = bar;
        bar.update({ taskInfo: "1. portal nodes" });
        _.forEach(data, ({ shard, portals }) => {
            portals.forEach(portal => {
                const shardPosObject = { shard, ...portal };
                this.addNode(PortalGraph.toShardPosStr(shardPosObject), shardPosObject);
                nodeBar.increment();
                nodeBar.render();
            });
        });

        // 构建 room 节点，添加 portal↔room 边（权重 25），以及 room↔room 完全图边。
        const edgeBar = bar;
        bar.update({ taskInfo: "2. room nodes & edges" });
        _.forEach(data, ({ shard, portals }) => {
            // 从预计算结果初始化房间列表（含 interShard / innerShard 目的地）
            const roomPortalMap = new Map<string, Portal[]>();
            (allRoomsPerShard.get(shard) || new Set()).forEach(room => roomPortalMap.set(room, []));
            portals.forEach(p => {
                roomPortalMap.get(p.room)!.push(p);
            });

            // 初始化 shardRoomNodes
            this.shardRoomNodes.set(shard, new Map());
            const shardRoomMap = this.shardRoomNodes.get(shard)!;

            // 创建 room 节点，添加 portal↔room 边
            const roomNodes: ShardPosition[] = [];
            roomPortalMap.forEach((roomPortals, room) => {
                const roomNode: ShardPosition = { shard, room, x: 0, y: 0, type: "room" };
                const roomStr = PortalGraph.toShardPosStr(roomNode);
                this.addNode(roomStr, roomNode);
                roomNodes.push(roomNode);
                shardRoomMap.set(room, roomStr);

                roomPortals.forEach(p => {
                    const portalStr = PortalGraph.toShardPosStr({ shard, ...p, type: "portal" });
                    this.addEdge(portalStr, roomStr, 25);
                    this.addEdge(roomStr, portalStr, 25);
                    edgeBar.increment(2);
                    edgeBar.render();
                });
                edgeBar.increment(); // room node
                edgeBar.render();
            });

            // room↔room 完全图
            roomNodes.forEach(a => {
                roomNodes.forEach(b => {
                    const distance = (getRoomDistanceN1(a.room, b.room) + 1) * 50;
                    this.addEdge(PortalGraph.toShardPosStr(a), PortalGraph.toShardPosStr(b), distance);
                });
                edgeBar.increment(roomNodes.length);
                edgeBar.render();
            });
        });

        // 为仅在 interShard 中作为目的地的 shard 补建 room 节点
        allRoomsPerShard.forEach((roomSet, shard) => {
            if (this.shardRoomNodes.has(shard)) return;
            // 该 shard 无 portal 数据，仅作为 interShard 目的地
            this.shardRoomNodes.set(shard, new Map());
            const shardRoomMap = this.shardRoomNodes.get(shard)!;
            const roomNodes: ShardPosition[] = [];
            roomSet.forEach(room => {
                const roomNode: ShardPosition = { shard, room, x: 0, y: 0, type: "room" };
                const roomStr = PortalGraph.toShardPosStr(roomNode);
                this.addNode(roomStr, roomNode);
                roomNodes.push(roomNode);
                shardRoomMap.set(room, roomStr);
                edgeBar.increment();
                edgeBar.render();
            });
            // room↔room 完全图
            roomNodes.forEach(a => {
                roomNodes.forEach(b => {
                    const distance = (getRoomDistanceN1(a.room, b.room) + 1) * 50;
                    this.addEdge(PortalGraph.toShardPosStr(a), PortalGraph.toShardPosStr(b), distance);
                });
                edgeBar.increment(roomNodes.length);
                edgeBar.render();
            });
        });

        // 初始化dest数据（所有 shard，含纯 interShard 目的地 shard）
        allRoomsPerShard.forEach((_, shard) => {
            if (!this.portalDestData[shard]) {
                this.portalDestData[shard] = { destList: [], shard: shard };
            }
        });

        // 为InterShardPortal添加Portal的终点顶点，并为portal添加与终点顶点的连线，还有添加终点顶点与终点所在room节点的连线。
        const interShardDestEdgeBar = bar;
        bar.update({ taskInfo: "3. inter shard portal dest & edges" });
        _.forEach(data, ({ shard, portalData: { interShard: portals } }) => {
            portals.forEach(portal => {
                const shardPosObject = { shard, ...portal };
                const destShardPosObject = {
                    shard: portal.destination.shard,
                    room: portal.destination.room,
                    x: portal.x,
                    y: portal.y,
                    type: "dest" as const
                };
                this.portalDestData[portal.destination.shard].destList.push(destShardPosObject);
                const destStr = PortalGraph.toShardPosStr(destShardPosObject);
                this.addNode(destStr, destShardPosObject);
                this.addEdge(PortalGraph.toShardPosStr(shardPosObject), destStr, 1);
                // dest 节点 → 终点所在 room 节点（权重 0）
                const roomStr = PortalGraph.toShardPosStr({
                    shard: portal.destination.shard,
                    room: portal.destination.room,
                    x: 0,
                    y: 0,
                    type: "room"
                });
                this.addEdge(destStr, roomStr, 0);
                interShardDestEdgeBar.increment(1);
                interShardDestEdgeBar.render();
            });
        });

        // 为InnerShardPortal添加Portal的终点顶点，并为portal添加与终点顶点的连线，还有添加终点顶点与终点所在room节点的连线。
        const innerShardDestEdgeBar = bar;
        bar.update({
            taskInfo: "4. inner shard portal dest & edges"
        });
        _.forEach(data, ({ shard, portalData: { innerShard: portals } }) => {
            portals.forEach(portal => {
                const shardPosObject = { shard, ...portal };
                const destShardPosObject = {
                    shard: shard,
                    room: portal.destination.room,
                    x: portal.x,
                    y: portal.y,
                    type: "dest" as const
                };
                this.portalDestData[shard].destList.push(destShardPosObject);
                const destStr = PortalGraph.toShardPosStr(destShardPosObject);
                this.addNode(destStr, destShardPosObject);
                this.addEdge(PortalGraph.toShardPosStr(shardPosObject), destStr, 1);
                // dest 节点 → 终点所在 room 节点（权重 0）
                const roomStr = PortalGraph.toShardPosStr({
                    shard,
                    room: portal.destination.room,
                    x: 0,
                    y: 0,
                    type: "room"
                });
                this.addEdge(destStr, roomStr, 0);
                innerShardDestEdgeBar.increment(1);
                innerShardDestEdgeBar.render();
            });
        });
    }

    /**
     * portal寻路算法。使用前需要使用addCreepPathDestNodePair添加起点与终点的节点，然后使用该函数，传入起点与终点节点名称即可寻路。返回的路径包含起点和终点，但是除这两点外所有节点都为portal类型节点。
     *
     */
    public findPath(startId: string, goalId: string) {
        const result = super.findPath(startId, goalId);
        if (result.path.length > 0) {
            const startPoint = result.path[0];
            const endPoint = result.path[result.path.length - 1];
            const filteredPath = [
                startPoint,
                ...result.path.filter(i => PortalGraph.fromShardPosStr(i as string).type === "portal"),
                endPoint
            ];
            result.path = filteredPath;
        }
        return result;
    }
}
