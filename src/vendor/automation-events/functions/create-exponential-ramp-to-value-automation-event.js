export const createExponentialRampToValueAutomationEvent = (value, endTime) => {
    return { endTime, type: 'exponentialRampToValue', value };
};
