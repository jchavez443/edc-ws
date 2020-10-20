export const EventSchema = {
    title: 'Event',
    description: 'The basic JSON Event Object in EDC',
    type: 'object',
    properties: {
        edc: { type: 'string' },
        type: { type: 'string' },
        id: { type: 'string' },
        trigger: { type: 'string' },
        acknowledge: { type: 'boolean' },
        details: { type: 'object' },
        shared: { type: 'object' }
    },
    required: ['edc', 'type', 'id']
}

export const ErrorEventSchema = {
    title: 'ErrorEvent',
    description: 'The basic JSON ErrorEvent Object in EDC',
    type: 'object',
    properties: {
        edc: { type: 'string' },
        type: { type: 'string' },
        id: { type: 'string' },
        trigger: { type: 'string' },
        acknowledge: { type: 'boolean' },
        details: {
            type: 'object',
            properties: {
                code: { type: 'number' },
                cn: { type: 'string' },
                message: { type: 'string' },
                failed: { type: 'string' },
                data: { oneOf: [{ type: 'object' }, { type: 'null' }] }
            },
            required: ['code', 'cn', 'message', 'failed']
        },
        shared: { type: 'object' }
    },
    required: ['edc', 'type', 'id']
}
