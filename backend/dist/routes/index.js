"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const projects_1 = __importDefault(require("./projects"));
const jobs_1 = __importDefault(require("./jobs"));
const settings_1 = __importDefault(require("./settings"));
const auth_2 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use('/auth', auth_1.default);
router.use('/projects', auth_2.authenticateToken, projects_1.default);
router.use('/jobs', auth_2.authenticateToken, jobs_1.default);
router.use('/settings', auth_2.authenticateToken, settings_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map