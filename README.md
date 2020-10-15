# Event Driven Communications (EDC) w/ WebSockets

## EDC-WS Server/Clients
Is a server-clinet pakage that uses websockets to enable EDC.

* [Examples](https://www.example.com)
* [Server Init](#server-init)
* [Client Init](#server-init)

## What is The Event Driven Communications (EDC) Protocol?
Is a JSON based communications protocol that allows for the communication of events while enabling the sharing of common data between a chain of events.

The concept that one event is the cause of a new event is a first class citizen in the EDC protocol.  This allows for the logical grouping of events based on the cause-effect chain by tie together UUIDs.  In additions, a chain of events logically share data that is common to each event in the chain.  This allows the detail of the events to live seperate from the shared chain data.

* [See Event Driven Communications](#event-driven-communications-edc-components)

```
              Event Chain
|-----------------------------------------|
|             shared data                 |
|    |event-1|-->|event-2|-->|event-3|    |
|        |                                |
|        |-->|event-N|                    |
|-----------------------------------------|
```

## Examples

Server initialization
```ts
import Edc, { Event } from 'edc-ws'

const server = new Edc.Server(port, {
    onEvent: async (cause, info, reply, send) => {

        const event = new Event('reaction').inherit(cause)

        reply(event) // Replies to the connection that sent the "cause" Event
        
        send(getSomeConnection(), event)
    },
    onAck: async (cause, info, reply, send) => {
        // Handle events.type = "acknowledgement"
    },
    onError: async (cause, info, reply, send) => {
        // Handle events.type = "error"
    }
})
```

Send an Event (Server)
```ts
const cause = new Event('event-type', {
    acknowledge: true,
    details: {
        test: 'prop',
        count: 23
    },
    shared: {
        id: 'shared id',
        step: 3
    }
})

try {
    const event = await server.sendEvent(connection, cause)
} catch (e) {
    const err = e as AckedErrorEvent
    console.log(err.message)
}
```
> **Note:** if the `cause` Event was set to `"acknowledge": false` then no `AckedErrorEvent` could be thrown.  An `AckedErrorEvent` is only thrown on synchronous `"acknowledge": true` `sendEvents()` that return an event `"type": "error"`.  This is done because the expectation for a synchronous acknowledgement should be another event or ack and not an error.

Client initilization
```ts
import Edc, { Event } from 'edc-ws'

const client = new Edc.Client('ws://websocket.server.com', {
    onEvent: async (cause, reply) => {
        const event = new Event('event-type').inherit(cause)

        reply(event)
    },
    onAck: async (cause, reply) => {
        // Handle events.type = "acknowledgement"
    },
    onError: async (cause, reply) => {
        // Handle events.type = "error"
    }
})
```

Send an Event (Client)
```ts
const cause = new Event('event-type', {
    acknowledge: true,
    details: {
        test: 'prop',
        count: 23
    },
    shared: {
        id: 'shared id',
        step: 3
    }
})

try {
    const event = await client.sendEvent(cause)
} catch (e) {
    const err = e as AckedErrorEvent
    console.log(err.message)
}
```
> **Note:** if the `cause` Event was set to `"acknowledge": false` then no `AckedErrorEvent` could be thrown.  An `AckedErrorEvent` is only thrown on synchronous `"acknowledge": true` `sendEvents()` that return an event `"type": "error"`.  This is done because the expectation for a synchronous acknowledgement should be another event/ack and not an error.

Create a `new Event()` from a `cause: Event`
```ts
const cause = new Event('event-type', {
    acknowledge: true,
    details: {
        test: 'prop',
        count: 23
    },
    shared: {
        id: 'shared id',
        step: 3
    }
})

const event = new Event('event-type-2').inherit(cause)

// event.trigger === cause.id
// event.shared === cause.shared

```

## Table of Contents

<!-- TOC -->

- [Event Driven Communications (EDC) w/ WebSockets](#event-driven-communications-edc-w-websockets)
    - [EDC-WS Server/Clients](#edc-ws-serverclients)
    - [What is The Event Driven Communications (EDC) Protocol?](#what-is-the-event-driven-communications-edc-protocol)
    - [Examples](#examples)
    - [Table of Contents](#table-of-contents)
    - [Event Driven Communications (EDC) Components](#event-driven-communications-edc-components)
        - [Event](#event)
        - [Acknowledgement Event](#acknowledgement-event)
        - [Error Event](#error-event)
            - [Error Event Details](#error-event-details)
        - [Fields](#fields)
            - [type](#type)
            - [id](#id)
            - [trigger](#trigger)
            - [acknowledge](#acknowledge)
                - [Request](#request)
                - [Responses](#responses)
            - [details](#details)
            - [shared](#shared)
            - [failed](#failed)
    - [Server Connection Manager](#server-connection-manager)

<!-- /TOC -->

## Event Driven Communications (EDC) Components

### Event
An Event is a JSON object defined as

> **Note:** `"type": ` `"error"` and `"acknowledgement"` are reserved for [Error Event](#error-event) and [Acknowledgement Event](#acknowledgement-event) respectivley

```ts
{
    "type": string,                // Event type 
    "id": string,                  // UUID for the event,
    "trigger":? string,            // UUID of the event triggering this event
    "acknowledge":? boolean,       // A reply is expected (syncronous) if true
    "details":? {},                // Details of this event
    "shared":? {},                 // Shared information from the chain of events, (modifiable),
    "failed":? Event               // The event that caused the error
}
```

### Acknowledgement Event

```json
{
    "type": "acknowledgement",
    "id": "71e92430-77b6-48ad-899c-7a5fc769f328",
    "trigger": "af0f0d3e-5c48-4265-9f3e-e37a21ff84c1"
}
```

### Error Event

```ts
{
    "type": "error",
    "id": "71e92430-77b6-48ad-899c-7a5fc769f328",
    "trigger": "af0f0d3e-5c48-4265-9f3e-e37a21ff84c1",
    "details": { 
        "code": 4083, 
        "cn": "common-error",
        "message": "Simple message about error",
        "data": {}
    },
    "shared": { shared data from erroring event },
    "failed": { erroring event }
}
```

#### Error Event Details

The `"details"` of the error event MUST include
* `"cn"` the common name of the error
* `"code"` the number for the error
* `"message"` the message to help understand the error

* `"data"` this field is allowed for any additional information about the error.

```ts
details: { 
    code: number; 
    cn: string; 
    message: string;
    data: {} | null 
}
```


### Fields

#### type
The type field represent the event type.  It can be any string except `"error"` and `"acknowldegement"` which are reserved.

Examples:
```json
    "type": "mouse-moved"
```
```json
    "type": "transcripted"
```
```json
    "type": "request-action"
```
```json
    "type": "initiate-action"
```

#### id
The id field is a UUID and MUST be unique for **all** events

#### trigger
The trigger is set to the event that triggered the new event.  `new event.trigger = cause.id`

The concept is meant to build a chain of events with `events` becoming the `cuase` of `new events`.  An `event` is not limited to causing only a linear chain.  It is possible for one `cause` to trigger multiple `events`.  `cause --> event1 & event2`

#### acknowledge
If an event is sent with the `"acknowledge": true` flag then the recieving system MUST reply with an `event`, `error`, or `acknowledgement` with the `trigger` field set to the `id` of the sent event.

Example:

##### Request
```json
A --> B
{
    "type": "initiate",
    "id": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
    "acknowledge": true,
}
```
##### Responses
```json
B --> A

Ack Event
{
    "type": "acknowledgement",
    "id": "71e92430-77b6-48ad-899c-7a5fc769f328",
    "trigger": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530"
}
```
-- Or --
```json
Error Event 
{
    "type": "error",
    "id": "93de2206-9669-4e07-948d-329f4b722ee2",
    "trigger": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
    "details": {
        "cn": "common-error",
        "code": 10983,
        "message": "Common error caused my silly mistake",
        "data": {}
     },
    "failed": {
        "type": "initiate",
        "id": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
        "acknowledge": true,
    }
}
```
-- Or --
```json
Responding Event
{
    "type": "next-event",
    "id": "a201b948-4282-49e8-ae92-1c146ddd538b",
    "trigger":  "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530"
}
```

#### details
The details is any JSON object and would hold the details for the OCCURING event.  It is not inteded to be used for `shared` properties that relate to the chain of events.

#### shared
The shared property is any JSON object.  It is inteded to be used as a property that a `chain of events` share in common.

When an event is `triggered` by a `cause` then it SHOULD set the `trigger` to the `cause.id` and copy the `cause.shared` data to the `new event.shared`.  The shared data is not immutable and can evolve.  

Examples would include a connection-Id that events share incommon, a call-Id for a phone call, a survey-Id, or a start time for a `chain of events`.

```json
A --> B
{
    "type": "survey-question",
    "id": "e680a8a0-ad3e-4f9e-991b-fa0fe752b8d1",
    "details": {
        "question": "what is your favorite programming language?"
    },
    "shared": {
        "survey": "programming-favorites",
        "step": 0
    }
}
```
```json
B --> A
// Note the shared data is copied
{
    "type": "survey-answer",
    "id": "09d0bc49-29be-4e2e-a347-aee23f9a815b",
    "trigger": "e680a8a0-ad3e-4f9e-991b-fa0fe752b8d1",
    "details": {
        "answer": "I love them all!"
    },
    "shared": {
        "survey": "programming-favorites",
        "step": 0
    }
}
```
```json
A --> B
// Note that the shared.step was increased
{
    "type": "survey-question",
    "id": "9d37afee-9b68-4d8f-ae63-2bc8f9b2d7a7",
    "trigger": "09d0bc49-29be-4e2e-a347-aee23f9a815b",
    "details": {
        "question": "Who is your favorite computer scientist?"
    },
    "shared": {
        "survey": "programming-favorites",
        "step": 1
    }
}
```

#### failed
Is only used with the `"type": "error"` event.  It MUST be a copy of the event that triggered the error

```json
{
    "type": "error",
    "id": "93de2206-9669-4e07-948d-329f4b722ee2",
    "trigger": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
    "details": {
        "cn": "common-error",
        "code": 10983,
        "message": "Common error caused my silly mistake",
        "data": {}
     },
    "failed": {
        "type": "initiate",
        "id": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
        "acknowledge": true,
    }
}
```

## Server Connection Manager

It is possible to extend the abstract class `ConnectionManager` to implement you own connection manager for the Server.  The `ConnectionManager` organizes the server WebSocket connections.  This allows the Server to `push` events to a client.  The Server instance will automatically add connections to the connection manager if it properly extends the `ConnectionManager` class.  Calling the `server.sendEvent()` will send the event to the connection supplied.

> **Note:** Connections are automatically added & removed form the Server's Connection Manager

```ts
const connectionManager: ConnectionManager = new ConnectionManagerTest()

const server = Edc.Server(port, serverHandlers, connectionManager)

const connection: ConnectionInfo = connectionManager.getConnection('connection-id')

server.sendEvent(connection, event)
```