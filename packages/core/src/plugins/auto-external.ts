import type { JsPlugin } from '@farmfe/core';
import { CLI_NAME } from '../config/constant';

export default function autoExternal(): JsPlugin {
    return {
        priority: Number.NEGATIVE_INFINITY,
        name: `${CLI_NAME}:AutoExternal`,
        config() {
            return {
                compilation: {
                    resolve: {
                        autoExternalFailedResolve: true,
                    },
                },
            };
        },
    };
}
