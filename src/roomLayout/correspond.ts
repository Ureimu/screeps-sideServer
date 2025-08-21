import { ScreepsApi } from "node-ts-screeps-api";
import { CallLayoutData } from "type";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { apiConfig } from "../../authInfo";
import { gridLayout } from "./customLayout/gridLayout/layout";
import { a11x11 } from "./fixedLayout/11x11/layout";
import { getLayoutData } from "./getData";

export async function correspond(state: string): Promise<void> {
    const api = new ScreepsApi(apiConfig(state));
    await api.auth();
    const shardName = "shard3";
    const callDataH = await api.rawApi.getSegment({ segment: 30, shard: shardName });
    console.log(callDataH);
    const callData = JSON.parse(callDataH.data) as CallLayoutData;
    const requireRoomNameList: string[] = [];
    Object.values(callData.roomData).forEach(({ cacheId, roomName, hasGotData }) => {
        if (!hasGotData) {
            requireRoomNameList.push(roomName);
        }
    });
    const objectData = await getLayoutData(
        state,
        requireRoomNameList.map(roomNameHere => {
            return { roomName: roomNameHere, shardName };
        }),
        api
    );

    const fun = async (roomName: string) => {
        const basePostData = { room: roomName };
        const { terrain: terrainData, roomObject: roomObjectData } = objectData[roomName];
        if (roomObjectData.length === 0) return;
        const map = new RoomGridMap(terrainData, roomObjectData, basePostData.room, basePostData.room);
        if (gridLayout(map)) {
            await map.drawMap(`out/${roomName}.png`);
            await api.rawApi.postSegment({
                shard: shardName,
                segment: callData.roomData[roomName].cacheId,
                data: JSON.stringify(map.generateLayoutData())
            });
            console.log(
                await api.rawApi.getSegment({ shard: shardName, segment: callData.roomData[roomName].cacheId })
            );
            // console.log(map.grid);
        }
    };
    await Promise.all(
        requireRoomNameList.map(roomName => {
            return fun(roomName);
        })
    );
}
