import { concurrency } from "sharp";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";

import _ from "lodash";
global._ = _;
import { gridLayout } from "roomLayout/customLayout/gridLayout/layout";
import { checkPath } from "utils/pathCheck";
import { getLayoutData } from "roomLayout/getData";
import { correspond } from "roomLayout";
const stateHere = process.argv[2];
console.log(stateHere, process.argv);
process.on("unhandledRejection", error => {
    console.log("unhandledRejection: ", error);
});
export const mainFunction = async (state: string): Promise<void> => {
    console.profile();
    checkPath(["out", "cache"]);
    concurrency(4);
    console.log(state);
    if (state === "private") {
        await correspond(state);
    } else if (state === "dev") {
        const requireRoomNameList: string[] = ["E34S21", "E31S18", "W29N5", "W37S26", "W34N21"]; //
        const objectData = await getLayoutData(
            state,
            requireRoomNameList.map(roomNameHere => {
                return { roomName: roomNameHere, shardName: "shard3" };
            })
        );
        const fun = async (roomName: string) => {
            console.log(`fun: ${roomName}`);
            const basePostData = { room: roomName, shard: "shard3" };
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
    }
    console.profileEnd();
};
// console.log(process.env.NODE_ENV, process.argv);
if (stateHere === "dev" || stateHere === "private") {
    mainFunction(stateHere)
        .then(() => {
            // console.log("finish");
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
