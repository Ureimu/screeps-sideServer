import { existsSync, mkdirSync } from "fs";
const createDirIfNotExist = (dir: string) => {
    if (!existsSync(dir)) {
        mkdirSync(dir);
    }
};
export function checkPath(pathList: string[]): void {
    pathList.forEach(createDirIfNotExist);
}
