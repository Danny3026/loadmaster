export var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["DISPATCHER"] = "DISPATCHER";
    Role["DRIVER"] = "DRIVER";
})(Role || (Role = {}));
export var LoadStatus;
(function (LoadStatus) {
    LoadStatus["PENDING"] = "pending";
    LoadStatus["DISPATCHED"] = "dispatched";
    LoadStatus["IN_TRANSIT"] = "in_transit";
    LoadStatus["DELIVERED"] = "delivered";
})(LoadStatus || (LoadStatus = {}));
export var DocumentType;
(function (DocumentType) {
    DocumentType["RATE_CONFIRMATION"] = "RATE_CONFIRMATION";
    DocumentType["BOL"] = "BOL";
    DocumentType["POD"] = "POD";
    DocumentType["LUMPER_RECEIPT"] = "LUMPER_RECEIPT";
    DocumentType["DELIVERY_RECEIPT"] = "DELIVERY_RECEIPT";
    DocumentType["OTHER"] = "OTHER";
})(DocumentType || (DocumentType = {}));
export const VALID_STATUS_TRANSITIONS = {
    [LoadStatus.PENDING]: [LoadStatus.DISPATCHED],
    [LoadStatus.DISPATCHED]: [LoadStatus.IN_TRANSIT],
    [LoadStatus.IN_TRANSIT]: [LoadStatus.DELIVERED],
    [LoadStatus.DELIVERED]: [],
};
export const LOAD_STATUSES = Object.values(LoadStatus);
