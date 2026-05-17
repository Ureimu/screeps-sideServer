import { PortalGraph } from "./PortalGraph";
import { readPortalData, IfUsingPortalType } from "./dataBase/readPortalData";
import { PortalPathDetail } from "./inGameType";

export interface RoomShardPair {
    room: string;
    shard: string;
}

/**
 * 使用已有的 PortalGraph 计算笛卡尔积路径。
 * 适用于需要在多次调用间复用同一个 graph 的场景。
 *
 * @param graph 已加载好 portal 数据的图
 * @param origins 起点列表
 * @param destinations 终点列表
 * @returns 路径详情列表，顺序为 origins × destinations 的笛卡尔积顺序（先遍历 origins，再遍历 destinations）
 */
export function computeCartesianPaths(
    graph: PortalGraph,
    origins: RoomShardPair[],
    destinations: RoomShardPair[]
): PortalPathDetail[] {
    const results: PortalPathDetail[] = [];
    let index = 0;

    for (const origin of origins) {
        for (const dest of destinations) {
            const fromStr = PortalGraph.toShardPosStr({
                shard: origin.shard,
                room: origin.room,
                x: 25,
                y: 25,
                type: "dest"
            });
            const toStr = PortalGraph.toShardPosStr({
                shard: dest.shard,
                room: dest.room,
                x: 25,
                y: 25,
                type: "dest"
            });

            const pair: [string, string] = [fromStr, toStr];
            graph.addCreepPathDestNodePair(pair);
            const result = graph.findPath(...pair);
            graph.removeCreepPathDestNodePair(pair);

            results.push({
                name: `${fromStr}To${toStr}`,
                from: fromStr,
                to: toStr,
                fromShard: origin.shard,
                exist: !result.incomplete,
                cost: result.cost,
                path: result.path.join(",")
            });
            index++;
        }
    }

    return results;
}

/**
 * 搜索多对房间之间的 portal 路径。
 * 给定起点列表和终点列表，计算它们的笛卡尔积中每一对的路径。
 *
 * @param origins 起点列表
 * @param destinations 终点列表
 * @param portalTypeConfig portal 类型配置，指定使用哪些类型的 portal
 * @returns 路径详情列表，顺序为 origins × destinations 的笛卡尔积顺序
 */
export async function searchMultipleRoom(
    origins: RoomShardPair[],
    destinations: RoomShardPair[],
    portalTypeConfig: IfUsingPortalType
): Promise<PortalPathDetail[]> {
    console.log(`loading portal data from disk...`);
    const portalData = await readPortalData(portalTypeConfig);
    if (!portalData) {
        console.log("no portalData");
        return [];
    }

    console.log(`loading portal data to graph...`);
    const graph = new PortalGraph(portalData);

    console.log(
        `computing cartesian paths (${origins.length} × ${destinations.length} = ${
            origins.length * destinations.length
        })...`
    );
    return computeCartesianPaths(graph, origins, destinations);
}
