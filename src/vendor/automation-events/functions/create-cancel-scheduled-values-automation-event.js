export const createCancelScheduledValuesAutomationEvent = (cancelTime) => {
    return { cancelTime, type: 'cancelScheduledValues' };
};
