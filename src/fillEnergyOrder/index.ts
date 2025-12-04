import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { CacheLayoutData } from "utils/RoomGridMap/type";

export function calcFillEnergyOrder(map: RoomGridMap): string[] {
    const structuresToFill = map.layoutStructures.filter(i => i.type === "spawn" || i.type === "extension");
    const storage = map.layoutStructures.filter(i => i.type === "storage")?.[0];
    if (!storage) {
        console.log("no storage, stop find fill energy order");
        return [];
    }

    return [];
}
