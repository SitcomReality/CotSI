export const createIsNativeAudioParam = (window) => {
    return (anything) => {
        return window !== null && typeof window.AudioParam === 'function' && anything instanceof window.AudioParam;
    };
};
