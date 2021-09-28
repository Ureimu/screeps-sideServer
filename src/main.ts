import { ScreepsApi } from "node-ts-screeps-api";
import { correspond } from "roomLayout/correspond";
import { a11x11 } from "roomLayout/fixedLayout/11x11/layout";
import { concurrency } from "sharp";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { apiConfig } from "../authInfo";
import _ from "lodash";
global._ = _;

const stateHere = process.argv[2];
export const mainFunction = async (state: string): Promise<void> => {
    const api: ScreepsApi<"signinByPassword"> = new ScreepsApi(apiConfig(state));
    concurrency(4);
    console.log(state);
    if (state === "private") {
        await correspond(api);
    } else if (state === "dev") {
        await api.auth();
        const requireRoomNameList: string[] = ["E34S21", "E31S18", "W29N5", "W37S26", "W34N21"];
        const fun = async (roomName: string) => {
            console.log(`fun: ${roomName}`);
            const basePostData = { room: roomName, shard: "shard3" };
            const terrainData = (await api.rawApi.getEncodedRoomTerrain(basePostData)).terrain[0].terrain;
            const roomObjectData = (await api.rawApi.getRoomObjects(basePostData)).objects.filter(val =>
                ["source", "mineral", "controller"].some(type => type === val.type)
            );
            if (roomObjectData.length === 0) return;
            const map = new RoomGridMap(terrainData, roomObjectData, basePostData.room, basePostData.room);
            a11x11(map);
            await map.drawMap(`out/${roomName}.png`);
            // console.log(map.grid);
        };
        await Promise.all(
            requireRoomNameList.map(roomName => {
                return fun(roomName);
            })
        );
    }
};
// console.log(process.env.NODE_ENV, process.argv);
if (stateHere === "dev" || stateHere === "private") {
    mainFunction(stateHere)
        .then(() => {
            console.log("finish");
        })
        .catch(e => {
            throw e;
        });
}

if (process.env.NODE_ENV === "production") {
    mainFunction(stateHere).catch(e => {
        throw e;
    });
}
