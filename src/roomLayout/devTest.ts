import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { gridLayout } from "./customLayout/gridLayout/layout";
import { getLayoutData } from "./getData";

export async function devTest(state: string): Promise<void> {
    const requireRoomNameList: string[] = ["E31S18"]; //
    const shardName = "shard3";
    const objectData = await getLayoutData(
        state,
        requireRoomNameList.map(roomNameHere => {
            return { roomName: roomNameHere, shardName };
        })
    );
    const fun = async (roomName: string) => {
        console.log(`fun: ${roomName}`);
        const basePostData = { room: roomName, shard: shardName };
        const { roomObject, terrain } = objectData[roomName];
        if (roomObject.length === 0) return;
        const map = new RoomGridMap(terrain, roomObject, basePostData.room, basePostData.room);
        if (gridLayout(map)) {
            await map.drawMap(`out/${roomName}.png`);
        }

        // console.log(map.grid);
    };
    await Promise.all(
        requireRoomNameList.map(roomName => {
            return fun(roomName);
        })
    );
    console.log("devTest finish");
}
