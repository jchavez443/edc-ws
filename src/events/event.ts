import { v4 as uuidv4 } from 'uuid'
import { EventProps, IEvent } from '../interface'

export default class Event<T> implements IEvent<T> {
    type: string

    readonly edc: '1.0' = '1.0'

    readonly id: string

    acknowledge?: boolean

    trigger?: string

    details?: T

    shared: { [key: string]: any } = {}

    constructor(...args: [type: string] | [event: IEvent<T>] | [type: string, props: EventProps<T>]) {
        if (typeof args[0] === 'string') {
            ;[this.type] = args
            this.id = uuidv4()
            if (args[1] !== undefined) {
                this.acknowledge = args[1].acknowledge
                this.details = args[1].details
                if (args[1].shared) this.shared = args[1].shared
                this.trigger = args[1].trigger
            }
        } else {
            const event = args[0]

            this.type = event.type
            this.id = event.id
            this.acknowledge = event.acknowledge
            this.trigger = event.trigger
            this.details = event.details

            if (event.shared) this.shared = event.shared
        }
    }

    inherit(cause: IEvent<T>) {
        this.trigger = cause.id
        if (cause.shared) this.shared = cause.shared
        return this
    }

    static isEvent(event: any): boolean {
        if (typeof event.type !== 'string') return false

        if (typeof event.id !== 'string') return false

        if (typeof event.edc !== 'string') return false

        if (event.trigger !== undefined && typeof event.trigger !== 'string') return false

        if (event.acknowledge !== undefined && typeof event.acknowledge !== 'boolean') return false

        if (event.details !== undefined && typeof event.details !== 'object') return false

        if (event.shared !== undefined && typeof event.shared !== 'object') return false

        if (event.failed !== undefined && typeof event.failed !== 'object') return false

        return true
    }
}
