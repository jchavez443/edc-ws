import { Auth } from './interfaces'

export default class TokenAuth implements Auth {
    token: string

    authenticated: boolean

    constructor(token: string) {
        this.token = token

        this.authenticated = false
    }
}
