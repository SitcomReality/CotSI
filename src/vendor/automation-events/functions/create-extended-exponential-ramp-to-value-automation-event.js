export const createExtendedExponentialRampToValueAutomationEvent = (value, endTime, insertTime) => {
    return { endTime, insertTime, type: 'exponentialRampToValue', value };
};
