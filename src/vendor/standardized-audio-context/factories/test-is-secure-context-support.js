export const createTestIsSecureContextSupport = (window) => {
    return () => window !== null && window.hasOwnProperty('isSecureContext');
};
