export const createCancelAndHoldAutomationEvent = (cancelTime) => {
    return { cancelTime, type: 'cancelAndHold' };
};
