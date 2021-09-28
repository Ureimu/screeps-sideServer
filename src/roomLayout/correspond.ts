import { ScreepsApi } from "node-ts-screeps-api";
import { CallLayoutData } from "type";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { a11x11 } from "./fixedLayout/11x11/layout";

export async function correspond(api: ScreepsApi<"signinByPassword">): Promise<void> {
    await api.auth();

    const callDataH = await api.rawApi.getSegment({ segment: 30 });
    console.log(callDataH);
    const callData = JSON.parse(callDataH.data) as CallLayoutData;
    const requireRoomNameList: string[] = [];
    Object.values(callData.roomData).forEach(({ cacheId, roomName, hasGotData }) => {
        if (!hasGotData) {
            requireRoomNameList.push(roomName);
        }
    });

    const fun = async (roomName: string) => {
        const basePostData = { room: roomName };
        const terrainData = (await api.rawApi.getEncodedRoomTerrain(basePostData)).terrain[0].terrain;
        const roomObjectData = (await api.rawApi.getRoomObjects(basePostData)).objects.filter(val =>
            ["source", "mineral", "controller"].some(type => type === val.type)
        );
        if (roomObjectData.length === 0) return;
        const map = new RoomGridMap(terrainData, roomObjectData, basePostData.room, basePostData.room);
        a11x11(map);
        await map.drawMap(`out/${roomName}.png`);
        await api.rawApi.postSegment({
            segment: callData.roomData[roomName].cacheId,
            data: JSON.stringify(map.generateLayoutData())
        });
        console.log(await api.rawApi.getSegment({ segment: callData.roomData[roomName].cacheId }));
        // console.log(map.grid);
    };
    await Promise.all(
        requireRoomNameList.map(roomName => {
            return fun(roomName);
        })
    );
}
