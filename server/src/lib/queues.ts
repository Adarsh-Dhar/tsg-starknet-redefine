
// Stub slashQueue for dev (no-op)
export const slashQueue = {
  add: async (_jobName: string, _data: any) => {
    // No-op stub
    return Promise.resolve();
  }
};
