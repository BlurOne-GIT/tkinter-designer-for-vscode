import { authentication, AuthenticationProvider, AuthenticationProviderAuthenticationSessionsChangeEvent, AuthenticationSession, Disposable, Event, EventEmitter, ExtensionContext } from "vscode";

export const AUTH_TYPE = `Figma`;
const AUTH_NAME = `Figma`;

export class FigmaAuthenticationProvider implements AuthenticationProvider, Disposable
{
    private _sessionChangeEmitter = new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
    private _disposable: Disposable;

    dispose() {
        this._disposable.dispose();
    }
    onDidChangeSessions: Event<AuthenticationProviderAuthenticationSessionsChangeEvent> = this._sessionChangeEmitter.event;
    
    /**
    * Get the existing sessions
    * @param scopes 
    * @returns 
    */
    getSessions(scopes?: readonly string[] | undefined): Thenable<readonly AuthenticationSession[]> {
        throw new Error("Method not implemented.");
    }

    /**
    * Create a new auth session
    * @param scopes 
    * @returns 
    */
    createSession(scopes: readonly string[]): Thenable<AuthenticationSession> {
        throw new Error("Method not implemented.");
    }

    /**
    * Remove an existing session
    * @param sessionId 
    */
    removeSession(sessionId: string): Thenable<void> {
        throw new Error("Method not implemented.");
    }
    
}