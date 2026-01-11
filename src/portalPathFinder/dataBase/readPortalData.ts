import { Portal } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { SERVER_SHARDS } from "utils/constants/shard";
import { readFile } from "utils/FileUtils";
import { getPortalDataFileName, MMOPortalTypeList, SingleShardStoredPortalData } from "./getPortalData";

export interface StoredPortalData {
    [name: string]: {
        shard: string;
        portalData: SingleShardStoredPortalData;
        portals: Portal[];
    };
}

export async function readPortalData(): Promise<StoredPortalData | null> {
    const result: StoredPortalData = {};
    for (const shard of SERVER_SHARDS.official) {
        result[shard] = {
            shard,
            portalData: { innerShard: [], interShard: [] },
            portals: []
        };
        for (const portalType of MMOPortalTypeList) {
            console.log(`reading ${shard} ${portalType} portal data...`);
            const data = await readFile(getPortalDataFileName(shard, portalType));
            if (!data) return null;
            console.log(`parsing ${shard} ${portalType} portal data...`);
            const portalData = JSON.parse(data) as SingleShardStoredPortalData;

            result[shard].portalData.innerShard.push(...portalData.innerShard);
            result[shard].portalData.interShard.push(...portalData.interShard);
            result[shard].portals.push(...portalData.innerShard, ...portalData.interShard);
            console.log(`${shard} ${portalType} portal data loaded`);
        }
    }
    return result;
}
