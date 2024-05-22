export const trimEndLF = (str: string) => {
    if (str.endsWith('\n')) {
        return str.slice(0, -1);
    }

    return str;
};
