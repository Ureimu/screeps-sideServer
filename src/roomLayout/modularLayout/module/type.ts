import { Range } from "utils/common/type";
import { StructureStrMap } from "../../../utils/LayoutStr/class";

export interface ModuleLayoutData {
    layout: string;
    mapChar: StructureStrMap;
}

interface typedRequireData {
    [structureType: string]: [x: number, y: number][];
}
