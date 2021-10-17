import { existsSync, readFileSync, writeFileSync } from "fs";
import { ScreepsApi } from "node-ts-screeps-api";
import { AnyRoomObjects } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { checkPath } from "utils/pathCheck";
import { apiConfig } from "../../authInfo";
interface LayoutData {
    terrain: string;
    roomObject: AnyRoomObjects[];
    roomName: string;
    shardName?: string;
}
export async function getLayoutData(
    state: string,
    requireRoomList: { roomName: string; shardName?: string }[],
    screepsApi?: ScreepsApi<"signinByPassword">
): Promise<{ [name: string]: LayoutData }> {
    let api: ScreepsApi<"signinByPassword">;
    if (!screepsApi) {
        api = new ScreepsApi(apiConfig(state));
        await api.auth();
    } else {
        api = screepsApi;
    }

    const fun = async (roomName: string, shardName?: string) => {
        const filePath = `cache/${apiConfig(state).hostInfo.hostname}/${roomName}-${shardName ?? "defaultShard"}.json`;
        if (!existsSync(filePath)) {
            console.log(`getLayoutDataCache: ${roomName}`);
            const basePostData = { room: roomName, shard: shardName };
            const terrainData = (await api.rawApi.getEncodedRoomTerrain(basePostData)).terrain[0].terrain;
            const roomObjectData = (await api.rawApi.getRoomObjects(basePostData)).objects.filter(val =>
                ["source", "mineral", "controller"].some(type => type === val.type)
            );

            checkPath([`cache/${apiConfig(state).hostInfo.hostname}`]);
            writeFileSync(
                filePath,
                JSON.stringify({
                    terrain: terrainData,
                    roomObject: roomObjectData,
                    roomName,
                    shardName
                } as LayoutData)
            );
            const data: LayoutData = { terrain: terrainData, roomObject: roomObjectData, roomName, shardName };
            return data;
            // console.log(map.grid);
        } else {
            const data = JSON.parse(readFileSync(filePath).toString()) as LayoutData;
            return data;
        }
    };
    const roomDataList = await Promise.all(
        requireRoomList.map(({ roomName, shardName }) => {
            return fun(roomName, shardName);
        })
    );
    const fullData: { [name: string]: LayoutData } = {};
    roomDataList.forEach(data => {
        fullData[data.roomName] = data;
    });
    return fullData;
}
