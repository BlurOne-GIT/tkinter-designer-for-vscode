import { authentication, AuthenticationProvider, AuthenticationProviderAuthenticationSessionsChangeEvent, AuthenticationSession, Disposable, Event, EventEmitter, ExtensionContext, window, Uri, env, ProgressLocation, UriHandler } from "vscode";
import { v4 as uuid } from "uuid";
import { PromiseAdapter, promiseFromEvent } from "./util";
import fetch from "node-fetch";

export const AUTH_TYPE = `Figma`;
const AUTH_NAME = `Figma`;
const CLIENT_ID = `3K4ECYxfzWBIEx3yzo5Yyz`;
const FIGMA_DOMAIN = `www.figma.com`;
const SESSIONS_SECRET_KEY = `${AUTH_TYPE}.sessions`;

class UriEventHandler extends EventEmitter<Uri> implements UriHandler {
  	public handleUri(uri: Uri) {
    	this.fire(uri);
  	}
}


export class FigmaAuthenticationProvider implements AuthenticationProvider, Disposable
{
    private _sessionChangeEmitter = new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
    private _disposable: Disposable;
	private _pendingStates: string[] = [];
  	private _codeExchangePromises = new Map<string, { promise: Promise<string>; cancel: EventEmitter<void> }>();
  	private _uriHandler = new UriEventHandler();

    constructor(private readonly context: ExtensionContext) {
        this._disposable = Disposable.from(
            authentication.registerAuthenticationProvider(AUTH_TYPE, AUTH_NAME, this, { supportsMultipleAccounts: false }),
            window.registerUriHandler(this._uriHandler)
        );
    }

    /**
     * Handle the redirect to VS Code (after sign in from Auth0)
     * @param scopes 
     * @returns 
     */
  	private handleUri: (scopes: readonly string[]) => PromiseAdapter<Uri, string> = 
  	(scopes) => async (uri: any, resolve: any, reject: any) => {
    	const query = new URLSearchParams(uri.fragment);
    	const accessToken = query.get('access_token');
    	const state = query.get('state');

		if (!accessToken) {
		reject(new Error('No token'));
		return;
		}
		if (!state) {
		reject(new Error('No state'));
		return;
		}

		// Check if it is a valid auth request started by the extension
		if (!this._pendingStates.some(n => n === state)) {
		reject(new Error('State not found'));
		return;
		}

		resolve(accessToken);
	};

	get redirectUri() {
		const publisher = this.context.extension.packageJSON.publisher;
		const name = this.context.extension.packageJSON.name;
		return `${env.uriScheme}://${publisher}.${name}`;
	}

    onDidChangeSessions: Event<AuthenticationProviderAuthenticationSessionsChangeEvent> = this._sessionChangeEmitter.event;
    
    /**
     * Get the existing sessions
     * @param scopes 
     * @returns 
     */
    public async getSessions(scopes?: readonly string[] | undefined): Promise<readonly AuthenticationSession[]> {
      const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY);

      if (allSessions) {
        return JSON.parse(allSessions) as AuthenticationSession[];
      }
  
      return [];
  
    }

    /**
     * Create a new auth session
     * @param scopes 
     * @returns 
     */
    public async createSession(scopes: string[]): Promise<AuthenticationSession> {
        try {
            const token = await this.login(scopes);
            if (!token) {
              throw new Error(`Figma login failure`);
            }
      
            const userinfo: { name: string, email: string } = await this.getUserInfo(token) as { name: string, email: string };
      
            const session: AuthenticationSession = {
              id: uuid(),
              accessToken: token,
              account: {
                label: userinfo.name,
                id: userinfo.email
              },
              scopes: []
            };
      
            await this.context.secrets.store(SESSIONS_SECRET_KEY, JSON.stringify([session]));
      
            this._sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] });
      
            return session;
          } catch (e) {
            window.showErrorMessage(`Sign in failed: ${e}`);
            throw e;
          }
      
    }

    /**
     * Remove an existing session
     * @param sessionId 
     */
    public async removeSession(sessionId: string): Promise<void> {
      const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY);
      if (allSessions) {
        let sessions = JSON.parse(allSessions) as AuthenticationSession[];
        const sessionIdx = sessions.findIndex(s => s.id === sessionId);
        const session = sessions[sessionIdx];
        sessions.splice(sessionIdx, 1);
  
        await this.context.secrets.store(SESSIONS_SECRET_KEY, JSON.stringify(sessions));
  
        if (session) {
          this._sessionChangeEmitter.fire({ added: [], removed: [session], changed: [] });
        }      
      }
  
    }
    
    /**
     * Dispose the registered services
     */
    dispose() {
        this._disposable.dispose();
    }

    private async login(scopes: string[] = []) {
      return await window.withProgress<string>({
        location: ProgressLocation.Notification,
        title: "Signing in to Figma...",
        cancellable: true
      }, async (_, token) => {
        const stateId = uuid();
  
        this._pendingStates.push(stateId);
  
        if (!scopes.includes('openid')) {
          scopes.push('openid');
        }
        if (!scopes.includes('profile')) {
          scopes.push('profile');
        }
        if (!scopes.includes('email')) {
          scopes.push('email');
        }
  
        const scopeString = scopes.join(' ');
  
        const searchParams = new URLSearchParams([
          ['client_id', CLIENT_ID],
          ['redirect_uri', this.redirectUri],
          ['scope', 'file_read'],
          ['state', stateId],
          ['response_type', 'code']
        ]);
        const uri = Uri.parse(`https://${FIGMA_DOMAIN}/oauth?${searchParams.toString()}`);
        await env.openExternal(uri);
  
        let codeExchangePromise = this._codeExchangePromises.get(scopeString);
        if (!codeExchangePromise) {
          codeExchangePromise = promiseFromEvent(this._uriHandler.event, this.handleUri(scopes));
          this._codeExchangePromises.set(scopeString, codeExchangePromise);
        }
  
        try {
          return await Promise.race([
            codeExchangePromise.promise,
            new Promise<string>((_, reject) => setTimeout(() => reject('Cancelled'), 60000)),
            promiseFromEvent<any, any>(token.onCancellationRequested, (_, __, reject) => { reject('User Cancelled'); }).promise
          ]);
        } finally {
          this._pendingStates = this._pendingStates.filter(n => n !== stateId);
          codeExchangePromise?.cancel.fire();
          this._codeExchangePromises.delete(scopeString);
        }
      });
    }

	/**
   	 * Get the user info from Auth0
   	 * @param token 
   	 * @returns 
   	 */
	private async getUserInfo(token: string) {
		const response = await fetch(`https://api.figma.com/v1/me`, {
		  headers: {
			Authorization: `Bearer ${token}`
		  }
		});
		return await response.json();
	  }
}