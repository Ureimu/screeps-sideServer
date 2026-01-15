import { Bar, MultiBar, Presets } from "cli-progress";
import { StoredPortalData } from "portalPathFinder/dataBase/readPortalData";
import { Graph } from "utils/Graph";
import { getRoomDistanceN1 } from "utils/roomNameUtils";

export type ShardPosition = {
    shard: string;
    room: string;
    x: number;
    y: number;
    type: "portal" | "dest";
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

    public static toShardPosStr(sPos: ShardPosition) {
        if (!sPos._rawStr) {
            sPos._rawStr = `t${sPos.type}r${sPos.room}x${sPos.x}y${sPos.y}s${sPos.shard}`;
        }
        return sPos._rawStr;
    }

    public static fromShardPosStr(sPosStr: string): ShardPosition {
        // 正则表达式匹配格式：${shard}r${room}x${x}y${y}
        // 例如: "shard1rE1N1x10y20"
        const match = sPosStr.match(/^t(dest|portal)r([^x]+)x(\d{1,2})y(\d{1,2})s(.+)$/);

        if (!match) {
            throw new Error(`fromShardPosStr got invalid input: ${sPosStr}`);
        }

        const [, type, room, xStr, yStr, shard] = match;
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);

        if (type !== "dest" && type !== "portal") {
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
                this.portalData[destShardPosObject.shard].portals.forEach(b => {
                    const sb = { shard: destShardPosObject.shard, ...b };
                    const distance = (getRoomDistanceN1(destShardPosObject.room, sb.room) + 1) * 50;

                    this.addEdge(
                        PortalGraph.toShardPosStr(destShardPosObject),
                        PortalGraph.toShardPosStr(sb),
                        distance
                    );
                });
            } else if (type === "dest") {
                this.portalDestData[destShardPosObject.shard].destList.forEach(b => {
                    const sb = { ...b };
                    const distance = (getRoomDistanceN1(destShardPosObject.room, sb.room) + 1) * 50;
                    this.addEdge(
                        PortalGraph.toShardPosStr(sb),
                        PortalGraph.toShardPosStr(destShardPosObject),
                        distance
                    );
                });
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
        const edgeSumNum = _.reduce(data, (sum, sData) => (sum += sData.portals.length ** 2), 0);

        const interShardDestSumPerShard: { [name: string]: number } = {};
        _.forEach(data, ({ shard, portalData: { interShard: portals } }) => {
            interShardDestSumPerShard[shard] = 0;
        });
        _.forEach(data, ({ shard, portalData: { interShard: portals } }) => {
            _.forEach(portals, sData => interShardDestSumPerShard[sData.destination.shard]++);
        });
        const interShardDestEdgeSum = _.sum(
            _.map(interShardDestSumPerShard, (shardSum, shard) => {
                if (!shard) return 0;
                return shardSum * data[shard].portals.length;
            })
        );
        const innerShardDestSumPerShard: { [name: string]: number } = {};
        _.forEach(data, ({ shard, portalData: { innerShard: portals } }) => {
            innerShardDestSumPerShard[shard] = portals.length;
        });
        const innerShardDestEdgeSum = _.sum(
            _.map(innerShardDestSumPerShard, (shardSum, shard) => {
                if (!shard) return 0;
                return shardSum * data[shard].portals.length;
            })
        );
        bar.setTotal(nodeSumNum + edgeSumNum + interShardDestEdgeSum + innerShardDestEdgeSum);

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

        // 为同shard的portal添加边，使用一般的距离函数。
        const edgeBar = bar;
        bar.update({ taskInfo: "2. edges for portal in same shard" });
        _.forEach(data, ({ shard, portals }) => {
            portals.forEach(a => {
                portals.forEach(b => {
                    const sa = { shard, ...a };
                    const sb = { shard, ...b };
                    const distance = (getRoomDistanceN1(sa.room, sb.room) + 1) * 50;
                    this.addEdge(PortalGraph.toShardPosStr(sa), PortalGraph.toShardPosStr(sb), distance);
                });
                edgeBar.increment(portals.length);
                edgeBar.render();
                // console.log(`${(counter += portals.length)}/${edgeSumNum}`);
            });
        });

        // 初始化dest数据
        _.forEach(data, ({ shard }) => {
            this.portalDestData[shard] = { destList: [], shard: shard };
        });

        // 为InterShardPortal添加Portal的终点顶点，并为portal添加与终点顶点的连线，还有添加终点顶点与其他所有终点shard portal的连线。
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
                this.addNode(PortalGraph.toShardPosStr(destShardPosObject), destShardPosObject);
                this.addEdge(
                    PortalGraph.toShardPosStr(shardPosObject),
                    PortalGraph.toShardPosStr(destShardPosObject),
                    1
                );
                data[portal.destination.shard].portals.forEach(b => {
                    const sb = { ...b, shard: portal.destination.shard };
                    const distance = (getRoomDistanceN1(destShardPosObject.room, sb.room) + 1) * 50;
                    this.addEdge(
                        PortalGraph.toShardPosStr(destShardPosObject),
                        PortalGraph.toShardPosStr(sb),
                        distance
                    );
                });
                interShardDestEdgeBar.increment(data[portal.destination.shard].portals.length);
                interShardDestEdgeBar.render();
            });
        });

        // 为InnerShardPortal添加Portal的终点顶点，并为portal添加与终点顶点的连线，还有添加终点顶点与其他所有终点shard portal的连线。
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
                this.addNode(PortalGraph.toShardPosStr(destShardPosObject), destShardPosObject);
                this.addEdge(
                    PortalGraph.toShardPosStr(shardPosObject),
                    PortalGraph.toShardPosStr(destShardPosObject),
                    1
                );
                data[shard].portals.forEach(b => {
                    const sb = { ...b, shard };
                    const distance = (getRoomDistanceN1(destShardPosObject.room, sb.room) + 1) * 50;
                    this.addEdge(
                        PortalGraph.toShardPosStr(destShardPosObject),
                        PortalGraph.toShardPosStr(sb),
                        distance
                    );
                });
                innerShardDestEdgeBar.increment(data[shard].portals.length);
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
