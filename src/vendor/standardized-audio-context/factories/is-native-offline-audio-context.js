export const createIsNativeOfflineAudioContext = (nativeOfflineAudioContextConstructor) => {
    return (anything) => {
        return nativeOfflineAudioContextConstructor !== null && anything instanceof nativeOfflineAudioContextConstructor;
    };
};
