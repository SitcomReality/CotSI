export const createSetValueCurveAutomationEvent = (values, startTime, duration) => {
    return { duration, startTime, type: 'setValueCurve', values };
};
