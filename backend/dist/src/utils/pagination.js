export const parsePaginationParams = (query) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const sortBy = query.sortBy;
    const sortOrder = (query.sortOrder === 'desc' ? 'desc' : 'asc');
    return { page, limit, sortBy, sortOrder };
};
export const buildPaginatedResponse = (data, total, params) => {
    return {
        data,
        meta: {
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(total / params.limit),
        },
    };
};
