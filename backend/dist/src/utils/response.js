export const success = (data, meta) => {
    return {
        success: true,
        data,
        meta,
    };
};
export const error = (message, code, details) => {
    return {
        success: false,
        error: {
            message,
            code,
            details,
        },
    };
};
export const paginated = (paginatedData) => {
    return {
        success: true,
        data: paginatedData.data,
        meta: paginatedData.meta,
    };
};
