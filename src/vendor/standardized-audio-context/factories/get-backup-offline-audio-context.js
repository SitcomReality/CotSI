export const createGetBackupOfflineAudioContext = (backupOfflineAudioContextStore) => {
    return (nativeContext) => {
        return backupOfflineAudioContextStore.get(nativeContext);
    };
};
