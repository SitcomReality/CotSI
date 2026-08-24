export const createLinearRampToValueAutomationEvent = (value, endTime) => {
    return { endTime, type: 'linearRampToValue', value };
};
