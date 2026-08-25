export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do this") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// Used for both "doesn't exist" and "exists but isn't yours" — collapsing
// the two into a 404-shaped error means a probing request can't tell an
// estate/record apart from one that never existed at all.
export class NotFoundError extends Error {
  constructor(entity: string) {
    super(`${entity} not found`);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do this") {
    super(message);
    this.name = "ForbiddenError";
  }
}
