import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { gridLayout } from "./customLayout/gridLayout/layout";
import { getLayoutData } from "./getData";
import { apiConfig } from "../../authInfo";
import { saveFile } from "utils/FileUtils";

export async function devTest(): Promise<void> {
    const state = "ureium";
    const requireRoomNameList: string[] = ["W1N8", "W1N9"]; //
    const shardName = "shard2";
    // const state = "private";
    // const requireRoomNameList: string[] = ["W1N1"];
    // const shardName = "e4d6ef922e98";
    const config = apiConfig(state);
    const objectData = await getLayoutData(
        state,
        requireRoomNameList.map(roomNameHere => {
            return { roomName: roomNameHere, shardName };
        })
    );
    const fun = async (roomName: string) => {
        console.log(`fun: ${roomName}`);
        const basePostData = { room: roomName };
        const { roomObject, terrain } = objectData[roomName];
        if (roomObject.length === 0) return;
        const map = new RoomGridMap(terrain, roomObject, basePostData.room, basePostData.room);
        if (gridLayout(map)) {
            const data = JSON.stringify(map.generateLayoutData());
            await saveFile(data, `out/${config.hostInfo.hostname}/${shardName}/${roomName}.txt`);
            await map.drawMap(`out/${config.hostInfo.hostname}/${shardName}/${roomName}.png`);
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
