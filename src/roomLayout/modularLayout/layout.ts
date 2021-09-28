import { GridMap } from "utils/RoomGridMap";

export function moduleLayout(map: GridMap, moduleList: ((map: GridMap) => void)[]): void {
    moduleList.forEach(fun => fun(map));
}
