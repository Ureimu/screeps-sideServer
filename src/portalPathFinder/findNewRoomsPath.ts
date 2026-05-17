import { getPortalData, PortalUpdateIntervalControl } from "./dataBase/getPortalData";
import { IfUsingPortalType } from "./dataBase/readPortalData";
import { apiConfig } from "../../authInfo";
import { ScreepsApi } from "node-ts-screeps-api";
import { PortalPathDetail } from "./inGameType";
import { searchMultipleRoom, RoomShardPair } from "./searchMultipleRoom";
import { validDataPeriod } from "portalPathFinder";

/**
 * 获取用户所有房间到目标房间的 portal 路径。
 *
 * 流程：
 * 1. 登录 Screeps API
 * 2. 更新 portal 数据到本地磁盘
 * 3. 通过 getUserRooms 获取用户拥有的所有房间
 * 4. 使用 searchMultipleRoom 计算用户房间（起点） × 目标房间（终点）的笛卡尔积路径
 *
 * @param targetRooms 目标房间列表（作为路径终点）
 * @param state 账号标识，对应 authInfo 中的 key，默认为 "ureium"
 * @returns 路径详情列表，顺序为用户房间 × 目标房间的笛卡尔积
 */
export async function findNewRoomsPath(
    targetRooms: RoomShardPair[],
    state: string = "ureium"
): Promise<PortalPathDetail[]> {
    // 登录 API
    const config = apiConfig(state);
    const api = new ScreepsApi(config);
    await api.auth();

    // 使用的 portal 类型
    const ifUsingPortalType: IfUsingPortalType = {
        centerRoom: false,
        closedSectorHighway: true,
        highwayCross: true
    };

    // 获取 portal 数据
    console.log(`getting portal data...`);
    await getPortalData(api, validDataPeriod);

    // 获取用户所有房间
    console.log(`getting user rooms...`);
    const userInfo = await api.me();
    const userRoomsRes = await api.rawApi.getUserRooms({ id: userInfo._id });

    // 将 { shards: { [shardName]: string[] } } 展平为 RoomShardPair[]
    const userRooms: RoomShardPair[] = [];
    const shardsData = userRoomsRes.shards || {};
    for (const [shard, rooms] of Object.entries(shardsData)) {
        for (const room of rooms) {
            userRooms.push({ room, shard });
        }
    }

    console.log(`found ${userRooms.length} user rooms across ${Object.keys(shardsData).length} shards`);
    console.log(
        `total path pairs: ${userRooms.length} × ${targetRooms.length} = ${userRooms.length * targetRooms.length}`
    );

    // 计算并返回路径
    return searchMultipleRoom(userRooms, targetRooms, ifUsingPortalType);
}
