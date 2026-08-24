export const createConvertNumberToUnsignedLong = (unit32Array) => {
    return (value) => {
        unit32Array[0] = value;
        return unit32Array[0];
    };
};
