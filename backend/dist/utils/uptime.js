"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStartTime = getStartTime;
exports.calculateUptime = calculateUptime;
const app_1 = require("../app");
const UPTIME_KEY = 'server_start_time';
async function getStartTime() {
    try {
        const setting = await app_1.prisma.setting.findUnique({
            where: { key: UPTIME_KEY }
        });
        if (!setting) {
            const now = Date.now();
            await app_1.prisma.setting.create({
                data: {
                    key: UPTIME_KEY,
                    value: now.toString()
                }
            });
            return now;
        }
        return parseInt(setting.value);
    }
    catch (error) {
        console.error('Error getting start time:', error);
        return Date.now();
    }
}
async function calculateUptime() {
    try {
        const setting = await app_1.prisma.setting.findUnique({
            where: { key: UPTIME_KEY }
        });
        let startTime;
        if (!setting) {
            startTime = Date.now();
            await app_1.prisma.setting.create({
                data: {
                    key: UPTIME_KEY,
                    value: startTime.toString()
                }
            });
        }
        else {
            startTime = parseInt(setting.value);
        }
        const uptimeMs = Date.now() - startTime;
        const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
        return {
            days,
            hours,
            minutes,
            total_ms: uptimeMs
        };
    }
    catch (error) {
        console.error('Error calculating uptime:', error);
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            total_ms: 0
        };
    }
}
//# sourceMappingURL=uptime.js.map