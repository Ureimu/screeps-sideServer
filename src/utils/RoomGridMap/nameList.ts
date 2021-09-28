import { StructureConstant } from "utils/common/type";
import { SpecifiedStructureNameList, StructureTypeFromSpecifiedStructureName } from "./type";
export function getStructureTypeBySpecifiedName<T extends SpecifiedStructureNameList<StructureConstant>>(
    name: T
): StructureTypeFromSpecifiedStructureName<T>;
export function getStructureTypeBySpecifiedName(name: string): string;
export function getStructureTypeBySpecifiedName<T extends SpecifiedStructureNameList<StructureConstant>>(
    name: T
): StructureTypeFromSpecifiedStructureName<T> {
    if (["sourceContainer", "controllerContainer", "mineralContainer"].includes(name))
        return "container" as StructureTypeFromSpecifiedStructureName<T>;
    if (["sourceLink", "controllerLink", "centerLink"].includes(name)) {
        return "link" as StructureTypeFromSpecifiedStructureName<T>;
    }
    if (
        [
            "baseRoad",
            "sourceAndControllerRoad",
            "mineralRoad",
            "aroundSpawnRoad",
            "outwardsSourceRoad",
            "passerbyRoad",
            "outwardsMineralRoad"
        ].includes(name)
    )
        return "road" as StructureTypeFromSpecifiedStructureName<T>;
    return name as StructureTypeFromSpecifiedStructureName<T>;
}
