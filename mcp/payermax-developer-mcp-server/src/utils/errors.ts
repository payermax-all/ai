export class McpUpdateRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpUpdateRequiredError';
  }
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Not authenticated. Please run the authenticate tool first.');
    this.name = 'AuthenticationRequiredError';
  }
}
