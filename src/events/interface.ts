interface IEventRoot {
    edc: '1.0'
    type: string
    id: string
    trigger?: string
}

export interface IEvent<T, K> extends IEventRoot {
    acknowledge?: boolean
    details?: T
    shared?: K
}

export interface IAckEvent extends IEventRoot {
    type: 'acknowledgement'
    trigger: string
}

export interface IErrorDetails<T> {
    code: number
    cn: string
    message: string
    failed: string
    data?: T
}

export interface IErrorEvent<T> extends IEventRoot {
    type: 'error'
    details: IErrorDetails<T>
}

export interface EventProps<T, K> {
    trigger?: string
    acknowledge?: boolean
    details?: T
    shared?: K
}

export type IEvents = IErrorEvent<any> | IAckEvent | IEvent<any, any>
