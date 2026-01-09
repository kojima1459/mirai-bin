// Type declarations for bundled server module
declare module "./server/index.js" {
    import { Express } from "express";
    export const app: Express;
}
