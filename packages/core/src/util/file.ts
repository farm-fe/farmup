import { stat } from 'fs-extra';

export const isExists = async (filename: string) => {
    try {
        await stat(filename);
        return true;
    } catch {
        return false;
    }
};
