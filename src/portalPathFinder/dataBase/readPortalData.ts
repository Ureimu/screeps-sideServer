import { Portal } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { SERVER_SHARDS } from "utils/constants/shard";
import { readFile } from "utils/FileUtils";
import { SingleShardStoredPortalData } from "./getPortalData";

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
        console.log(`reading ${shard} portal data...`);
        const data = await readFile(`db/portals/${shard}/portals.txt`);
        if (!data) return null;
        console.log(`parsing ${shard} portal data...`);
        const portalData = JSON.parse(data) as SingleShardStoredPortalData;
        result[shard] = {
            shard,
            portalData,
            portals: [...portalData.innerShard, ...portalData.interShard]
        };
        console.log(`${shard} portal data loaded`);
    }
    return result;
}
