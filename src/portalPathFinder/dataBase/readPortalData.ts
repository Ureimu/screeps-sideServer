import { Portal } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { SERVER_SHARDS } from "utils/constants/shard";
import { readFile } from "utils/FileUtils";
import { getPortalDataFileName, MMOPortalType, MMOPortalTypeList, SingleShardStoredPortalData } from "./getPortalData";

export interface StoredPortalData {
    [name: string]: {
        shard: string;
        portalData: SingleShardStoredPortalData;
        portals: Portal[];
    };
}

export type IfUsingPortalType = { [name in MMOPortalType]: boolean };

export async function readPortalData(portalTypeToUse: IfUsingPortalType): Promise<StoredPortalData | null> {
    const result: StoredPortalData = {};
    for (const shard of SERVER_SHARDS.official) {
        result[shard] = {
            shard,
            portalData: { innerShard: [], interShard: [] },
            portals: []
        };
        for (const portalType in portalTypeToUse) {
            const exactPortalType = portalType as MMOPortalType;
            if (!portalTypeToUse[exactPortalType]) {
                continue;
            }
            console.log(`reading ${shard} ${exactPortalType} portal data...`);
            const data = await readFile(getPortalDataFileName(shard, exactPortalType));
            if (!data) return null;
            console.log(`parsing ${shard} ${exactPortalType} portal data...`);
            const portalData = JSON.parse(data) as SingleShardStoredPortalData;

            result[shard].portalData.innerShard.push(...portalData.innerShard);
            result[shard].portalData.interShard.push(...portalData.interShard);
            result[shard].portals.push(...portalData.innerShard, ...portalData.interShard);
            console.log(`${shard} ${exactPortalType} portal data loaded`);
        }
    }
    return result;
}
