export interface CallLayoutData {
    cacheIdList: number[];
    cacheIdRange: { start: number; end: number };
    roomData: {
        [roomName: string]: {
            cacheId: number;
            roomName: string;
            hasGotData: boolean;
            inUse: boolean;
        };
    };
}
