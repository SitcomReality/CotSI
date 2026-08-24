export const createIsAnyOfflineAudioContext = (contextStore, isNativeOfflineAudioContext) => {
    return (anything) => {
        const nativeContext = contextStore.get(anything);
        return isNativeOfflineAudioContext(nativeContext) || isNativeOfflineAudioContext(anything);
    };
};
