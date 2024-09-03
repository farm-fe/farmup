export interface ResourceData {
    name: string;
    entry: string;
    root: string;
    outputDir: string;
    resources: Record<string, string>;
}

export interface InitializeHookContext {
    number: number;
    port: MessagePort;
    resources: ResourceData
}

export enum MessageType {
    Resource = 1,
    Confirm = 2,
}

export interface ResourceMessage {
    type: MessageType.Resource;
    resource: ResourceData;
    id: number;
}

export interface ConfirmMessage {
    type: MessageType.Confirm;
    id: number;
}


export type Message = ResourceMessage | ConfirmMessage;