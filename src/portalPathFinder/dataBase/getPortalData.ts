import { getLayoutData } from "roomLayout/getData";
import { apiConfig } from "../../../authInfo";
import { SERVER_SHARDS } from "utils/constants/shard";
import { ScreepsApi } from "node-ts-screeps-api";
import { Portal } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { saveFile } from "utils/FileUtils";
import { checkCenterRoomName, getRoomsInRectangle } from "utils/roomNameUtils";
import { Bar, MultiBar, Presets } from "cli-progress";
import { sleep } from "utils/asyncTools";

function s123filter(roomName: string): boolean {
    // 只包含路口
    return /.*0[NnSs]\d*0$/.test(roomName);
}

function s0filter(roomName: string): boolean {
    // 包含路口及各十字方向拓展的2格，是为了获取被封闭的区块周围的portals。
    // 如果只拿一格的，那个房间被占的概率很大，会导致大概率获取不到。
    return /^[WwEe]\d*0[NnSs]\d*[89012]$|^[WwEe]\d*[89012][NnSs]\d*0$/.test(roomName);
}

export type SingleShardStoredPortalData = {
    innerShard: InnerShardPortal[];
    interShard: InterShardPortal[];
};

export type InterShardPortal = Portal & {
    destination: {
        room: string;
        shard: string;
    };
};

export type InnerShardPortal = Portal & {
    destination: {
        room: string;
    };
};

export async function getPortalData(state: string, updateInterval: number) {
    const timeNow = Date.now();
    const config = apiConfig(state);
    const api = new ScreepsApi(config);
    await api.auth();

    const multiBar = new MultiBar(
        {
            clearOnComplete: false,
            hideCursor: true
        },
        Presets.shades_grey
    );
    for (const shard of SERVER_SHARDS.official) {
        const worldSize = await api.rawApi.getWorldSize({ shard });

        const myFilter = shard === "shard0" ? s0filter : s123filter;
        const fullRoomList = getRoomsInRectangle(
            `W${Math.ceil(worldSize.width / 2)}N${Math.ceil(worldSize.height / 2)}`,
            `E${Math.ceil(worldSize.width / 2)}S${Math.ceil(worldSize.height / 2)}`
        );
        // const fullRoomList = getRoomsInRectangle(
        //     `W${Math.ceil(5)}N${Math.ceil(5)}`,
        //     `E${Math.ceil(5)}S${Math.ceil(5)}`
        // );
        const requireRoomNameList: string[] = fullRoomList.filter(i => myFilter(i) || checkCenterRoomName.test(i));
        const progressBar = multiBar.create(requireRoomNameList.length, 0);
        const objectGetArgs = requireRoomNameList.map(room => {
            return { room, shard };
        });

        const portalData: Portal[] = [];

        for (const args of objectGetArgs) {
            const data = await api.rawApi.getRoomObjects(args);
            if (!data.objects) {
                progressBar.increment();
                continue;
            }

            // 根据数据更新周期过滤快要过期的portal，避免寻路到已过期portal。
            // 进行去重，每个room中，只保留一个目的地房间和shard不同的portal。
            const portalMap = new Map<string, Portal>();
            data.objects
                .filter((j): j is Portal => j.type === "portal")
                .filter(i => !i.decayTime)
                .filter(j => !j.unstableDate || (j.unstableDate && j.unstableDate - timeNow > updateInterval))
                .forEach(i => portalMap.set(`${i.destination.shard ?? ""}${i.destination.room}`, i));
            portalData.push(...Array.from(portalMap.values()));
            progressBar.increment();
            // await sleep(50);
        }

        // 跨shard的portal数据
        const interShardPortalData: InterShardPortal[] = portalData.filter(
            i => i.destination.shard && i.destination.shard !== shard
        ) as InterShardPortal[];
        // 不跨shard的portal数据
        const innerShardPortalData: InnerShardPortal[] = portalData.filter(
            i => !i.destination.shard || i.destination.shard === shard
        ) as InnerShardPortal[];

        const fullData: SingleShardStoredPortalData = {
            interShard: interShardPortalData,
            innerShard: innerShardPortalData
        };

        const data = JSON.stringify(fullData);
        await saveFile(data, `db/portals/${shard}/portals.txt`);
    }
    await saveFile(`${Date.now()}`, `db/portals/createdTime.txt`);
}
