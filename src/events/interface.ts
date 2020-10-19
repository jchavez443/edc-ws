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

export interface IErrorDetails {
    code: number
    cn: string
    message: string
    failed: string
    data?: any | null
}

export interface IErrorEvent extends IEventRoot {
    type: 'error'
    details: IErrorDetails
}

export interface EventProps<T, K> {
    trigger?: string
    acknowledge?: boolean
    details?: T
    shared?: K
}

export type IEvents = IErrorEvent | IAckEvent | IEvent<any, any>
