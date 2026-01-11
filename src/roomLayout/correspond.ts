import { ScreepsApi } from "node-ts-screeps-api";
import { CallLayoutData } from "type";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { apiConfig } from "../../authInfo";
import { gridLayout } from "./customLayout/gridLayout/layout";
import { a11x11 } from "./fixedLayout/11x11/layout";
import { getLayoutData } from "./getData";
import { saveFile } from "utils/FileUtils";

export async function correspond(state: string): Promise<void> {
    const config = apiConfig(state);
    const api = new ScreepsApi(config);
    await api.auth();

    const userInfo = await api.rawApi.me();
    console.log(userInfo);
    if (userInfo.cpuShard) {
        // 官服
        Object.entries(userInfo.cpuShard).forEach(async ([shardName, cpuMax]) => {
            if (cpuMax <= 0) return;
            console.log(`running layout for ${shardName}`);
            runLayoutForShard(state, api, shardName);
        });
    } else {
        // 私服
        runLayoutForShard(state, api);
    }
}

async function runLayoutForShard(
    state: string,
    api: ScreepsApi<"signinByPassword" | "signinByToken">,
    shardName?: string
) {
    const config = apiConfig(state);
    const callDataH = await api.rawApi.getSegment({ segment: 30, shard: shardName });
    console.log(callDataH);
    if (!callDataH.data) {
        console.log("no data");
        return;
    }
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
            const data = JSON.stringify(map.generateLayoutData());
            await saveFile(data, `out/${config.hostInfo.hostname}/${shardName}/${roomName}.txt`);
            await map.drawMap(`out/${config.hostInfo.hostname}/${shardName}/${roomName}.png`);
            await api.rawApi.postSegment({
                shard: shardName,
                segment: callData.roomData[roomName].cacheId,
                data: data
            });
            console.log(
                await api.rawApi.getSegment({
                    shard: shardName,
                    segment: callData.roomData[roomName].cacheId
                })
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
