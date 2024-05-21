import type { JsPlugin, PluginResolveHookResult } from '@farmfe/core';
import { CLI_NAME, logger } from '../config/constant';

export function autoExternal(): JsPlugin {
    return {
        priority: Number.NEGATIVE_INFINITY,
        name: `${CLI_NAME}:AutoExternal`,
        resolve: {
            filters: {
                sources: ['.*'],
                importers: ['.*'],
            },
            async executor(param): Promise<PluginResolveHookResult> {
                logger.debug(`${param.source} not found, it to be set external`);
                return {
                    resolvedPath: param.source,
                    external: true,
                };
            },
        },
    };
}
