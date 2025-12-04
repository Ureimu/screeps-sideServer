import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { gridLayout } from "./customLayout/gridLayout/layout";
import { getLayoutData } from "./getData";
import { apiConfig } from "../../authInfo";
import { calcFillEnergyOrder } from "fillEnergyOrder";
import { saveDataFile } from "utils/saveDataFile";

export async function devTest(state: string): Promise<void> {
    const requireRoomNameList: string[] = ["W9N11", "W15N11", "W19N13", "W19N15", "W25N11"]; //
    const shardName = "shard3";
    const config = apiConfig(state);
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
            const data = JSON.stringify(map.generateLayoutData());
            await saveDataFile(data, `out/${config.hostInfo.hostname}/${shardName}/${roomName}.txt`);
            await map.drawMap(`out/${config.hostInfo.hostname}/${shardName}/${roomName}.png`);
            calcFillEnergyOrder(map);
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
