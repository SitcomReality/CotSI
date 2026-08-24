export const createIsNativeAudioNode = (window) => {
    return (anything) => {
        return window !== null && typeof window.AudioNode === 'function' && anything instanceof window.AudioNode;
    };
};
