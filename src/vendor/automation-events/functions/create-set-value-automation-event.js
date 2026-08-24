export const createSetValueAutomationEvent = (value, startTime) => {
    return { startTime, type: 'setValue', value };
};
