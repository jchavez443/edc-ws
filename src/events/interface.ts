interface IEventRoot {
    edc: '1.0'
    type: string
    id: string
    trigger?: string
}

type ObjMap = { [key: string]: any }

export interface IEvent<T> extends IEventRoot {
    acknowledge?: boolean
    details?: T
    shared?: ObjMap
}

export interface IAckEvent extends IEventRoot {
    type: 'acknowledgement'
    trigger: string
}

export interface IErrorEvent extends IEventRoot {
    type: 'error'
    trigger: string
    details: {
        code: number
        cn: string
        message: string
        data: any | null
    }
    failed: IEvent<any>
    shared?: ObjMap
}

export interface EventProps<T> {
    trigger?: string
    acknowledge?: boolean
    details?: T
    shared?: ObjMap
}

export type IEvents = IErrorEvent | IAckEvent | IEvent<any>
