"use strict";
// Sansekai MovieBox API Types// Based on documented API responses// ============================================// Common Types
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectType = void 0;
var SubjectType;
(function (SubjectType) {
    SubjectType[SubjectType["Movie"] = 1] = "Movie";
    SubjectType[SubjectType["Series"] = 2] = "Series";
    SubjectType[SubjectType["Education"] = 5] = "Education";
    SubjectType[SubjectType["Music"] = 6] = "Music";
    SubjectType[SubjectType["Short"] = 7] = "Short";
})(SubjectType || (exports.SubjectType = SubjectType = {}));
