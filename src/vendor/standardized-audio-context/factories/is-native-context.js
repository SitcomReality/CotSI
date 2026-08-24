export const createIsNativeContext = (isNativeAudioContext, isNativeOfflineAudioContext) => {
    return (anything) => {
        return isNativeAudioContext(anything) || isNativeOfflineAudioContext(anything);
    };
};
