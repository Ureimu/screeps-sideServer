import { Range } from "utils/common/type";

export interface ModuleLayoutData {
    layout: typedRequireData;
}

interface typedRequireData {
    [structureType: string]: [x: number, y: number][];
}
