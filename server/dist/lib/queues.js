// Stub slashQueue for dev (no-op)
export const slashQueue = {
    add: async (_jobName, _data) => {
        // No-op stub
        return Promise.resolve();
    }
};
