import { apiConfig } from "../../../authInfo";
import { SERVER_SHARDS } from "utils/constants/shard";
import { ScreepsApi } from "node-ts-screeps-api";
import { Portal } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { fileExists, readFile, saveFile } from "utils/FileUtils";
import { checkCenterRoomName, getRoomsInRectangle } from "utils/roomNameUtils";
import { MultiBar, Presets } from "cli-progress";

function highwayCrossFilter(roomName: string): boolean {
    // 只包含路口
    return /.*0[NnSs]\d*0$/.test(roomName);
}

function closedSectorHighwayFilter(roomName: string): boolean {
    // 包含各十字方向拓展的2格，是为了获取被封闭的区块周围的portals。
    // 如果只拿一格的，那个房间被占的概率很大，会导致大概率获取不到。
    return /^[WwEe]\d*0[NnSs]\d*[8912]$|^[WwEe]\d*[8912][NnSs]\d*0$/.test(roomName);
}

function centerRoomFilter(roomName: string): boolean {
    return checkCenterRoomName.test(roomName);
}

export type MMOPortalType = "highwayCross" | "closedSectorHighway" | "centerRoom";
export const MMOPortalTypeList = ["highwayCross", "closedSectorHighway", "centerRoom"] as const;
const portalFiltersWithoutClosedSectorHighway: {
    [key in Exclude<MMOPortalType, "closedSectorHighway">]: (roomName: string) => boolean;
} = {
    highwayCross: highwayCrossFilter,
    centerRoom: centerRoomFilter
};
const portalFilters: { [key in MMOPortalType]: (roomName: string) => boolean } = {
    ...portalFiltersWithoutClosedSectorHighway,
    closedSectorHighway: closedSectorHighwayFilter
};
const mergedPortalFilter = (roomName: string) => _.some(portalFilters, myFilter => myFilter(roomName));
const mergedPortalFilterExceptClosedSectorHighway = (roomName: string) =>
    _.some(portalFiltersWithoutClosedSectorHighway, myFilter => myFilter(roomName));

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

export type PortalUpdateIntervalControl = { [key in MMOPortalType]: number };

export const getPortalTimeFileName: (shard: string, portalType: MMOPortalType) => string = (
    shard: string,
    portalType: MMOPortalType
) => `db/portals/${shard}/${portalType}PortalsCreateTime.txt`;
export const getPortalDataFileName: (shard: string, portalType: MMOPortalType) => string = (
    shard: string,
    portalType: MMOPortalType
) => `db/portals/${shard}/${portalType}Portals.txt`;

export async function getPortalData(state: string, updateInterval: PortalUpdateIntervalControl) {
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

        const portalTypesToUpdate: MMOPortalType[] = [];
        for (const portalType of MMOPortalTypeList) {
            const createdTimeFileName = getPortalTimeFileName(shard, portalType);
            const isExist = await fileExists(createdTimeFileName);
            const isOutdated =
                Date.now() - parseInt((await readFile(createdTimeFileName)) ?? "0") > updateInterval[portalType];
            if (!isExist || isOutdated) {
                console.log(`${shard} ${portalType} portal data expired, updating portal data`);
                portalTypesToUpdate.push(portalType);
            }
        }

        const typedPortals: { [name in MMOPortalType]: SingleShardStoredPortalData } = {
            highwayCross: { innerShard: [], interShard: [] },
            centerRoom: { innerShard: [], interShard: [] },
            closedSectorHighway: { innerShard: [], interShard: [] }
        };

        const chosenFilter = shard === "shard0" ? mergedPortalFilter : mergedPortalFilterExceptClosedSectorHighway;
        const fullRoomList = getRoomsInRectangle(
            `W${Math.ceil(worldSize.width / 2)}N${Math.ceil(worldSize.height / 2)}`,
            `E${Math.ceil(worldSize.width / 2)}S${Math.ceil(worldSize.height / 2)}`
        );
        // const fullRoomList = getRoomsInRectangle(
        //     `W${Math.ceil(5)}N${Math.ceil(5)}`,
        //     `E${Math.ceil(5)}S${Math.ceil(5)}`
        // );
        // const fullRoomList = getRoomsInRectangle(`W40N30`, `W30N20`);
        const requireRoomNameList: string[] = fullRoomList.filter(i => chosenFilter(i));
        const progressBar = multiBar.create(requireRoomNameList.length, 0);
        const objectGetArgs = requireRoomNameList.map(room => {
            return { room, shard };
        });

        for (const args of objectGetArgs) {
            const data = await api.rawApi.getRoomObjects(args);
            if (!data.objects) {
                progressBar.increment();
                continue;
            }

            // 根据数据更新周期过滤快要过期的portal，避免寻路到已过期portal。
            // 进行去重，每个room中，只保留一个目的地房间和shard不同的portal。
            const portalMap = new Map<string, Portal>();
            const portalList = data.objects.filter((j): j is Portal => j.type === "portal");

            portalList
                .filter(i => !i.decayTime)
                .filter(
                    // 由于只有centerRoom的portal会过期，这里假设存在unstableDate的j为centerRoom portal。
                    j => !j.unstableDate || (j.unstableDate && j.unstableDate - timeNow > updateInterval.centerRoom)
                )
                .forEach(i => portalMap.set(`${i.destination.shard ?? ""}${i.destination.room}`, i));
            const roomPortals = Array.from(portalMap.values());

            portalTypesToUpdate.forEach(portalType => {
                if (!portalFilters[portalType](args.room)) {
                    return;
                }
                typedPortals[portalType].interShard.push(
                    ...(roomPortals.filter(
                        i => i.destination.shard && i.destination.shard !== shard
                    ) as InterShardPortal[])
                );
                typedPortals[portalType].innerShard.push(
                    ...(roomPortals.filter(
                        i => !i.destination.shard || i.destination.shard === shard
                    ) as InterShardPortal[])
                );
            });
            progressBar.increment();
            // await sleep(50);
        }

        for (const portalType of portalTypesToUpdate) {
            const data = JSON.stringify(typedPortals[portalType]);
            await saveFile(data, getPortalDataFileName(shard, portalType));
            await saveFile(`${Date.now()}`, getPortalTimeFileName(shard, portalType));
        }
    }
}
