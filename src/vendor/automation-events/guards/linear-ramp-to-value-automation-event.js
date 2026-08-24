export const isLinearRampToValueAutomationEvent = (automationEvent) => {
    return automationEvent.type === 'linearRampToValue';
};
