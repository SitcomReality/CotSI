export const createExtendedLinearRampToValueAutomationEvent = (value, endTime, insertTime) => {
    return { endTime, insertTime, type: 'linearRampToValue', value };
};
