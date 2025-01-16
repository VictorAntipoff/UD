"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnect = disconnect;
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = global.prisma ||
    new client_1.PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    });
if (process.env.NODE_ENV === 'development') {
    global.prisma = prisma;
}
exports.default = prisma;
async function disconnect() {
    await prisma.$disconnect();
}
process.on('beforeExit', async () => {
    await disconnect();
});
//# sourceMappingURL=prisma.js.map