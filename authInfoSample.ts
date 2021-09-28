// authInfo模板文件，在使用test的时候会用到
import { ApiConfig } from "node-ts-screeps-api/dist/src/type";

const data: { [name: string]: ApiConfig<"signinByPassword"> } = {
    dev: {
        authInfo: {
            type: "signinByPassword",
            email: "notMyEmail@abc.com",
            password: "notMyPassword"
        },
        hostInfo: {
            protocol: "https",
            port: 443,
            path: "/",
            hostname: "screeps.com"
        }
    },
    private: {
        authInfo: {
            type: "signinByPassword",
            email: "notMyEmail@abc.com",
            password: "notMyPassword"
        },
        hostInfo: {
            protocol: "localhost",
            port: 21025,
            path: "/",
            hostname: "127.0.0.1"
        }
    }
};
export const apiConfig = (dataType: string): ApiConfig<"signinByPassword"> => data[dataType];
