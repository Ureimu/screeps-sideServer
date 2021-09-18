import { ScreepsApi } from "node-ts-screeps-api";
import { ApiConfig } from "node-ts-screeps-api/dist/src/type";
import { ecoLayout } from "roomLayout/customLayout/ecoLayout/layout";
import { a11x11 } from "roomLayout/fixedLayout/11x11/layout";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { userData } from "../authInfo";
export const apiConfig: ApiConfig<"signinByPassword"> = {
    authInfo: {
        type: "signinByPassword",
        email: userData.email,
        password: userData.password
    },
    hostInfo: {
        protocol: "https",
        port: 443,
        path: "/",
        hostname: "screeps.com"
    }
};

const api: ScreepsApi<"signinByPassword"> = new ScreepsApi(apiConfig);

export const mainFunction = async (): Promise<void> => {
    await api.auth();
    const requireRoomNameList = ["E31S18", "E34S21", "W29N5", "W34N21", "W37N26"];
    const fun = async (roomName: string) => {
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
};
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV !== "production") {
    console.log("test");
} else {
    mainFunction().catch(e => {
        throw e;
    });
}
