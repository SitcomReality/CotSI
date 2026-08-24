export const getLinearRampValueAtTime = (time, startTime, valueAtStartTime, { endTime, value }) => {
    return valueAtStartTime + ((time - startTime) / (endTime - startTime)) * (value - valueAtStartTime);
};
