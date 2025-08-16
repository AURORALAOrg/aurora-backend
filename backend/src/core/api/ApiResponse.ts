import { Response } from "express";

enum ResponseStatus {
  SUCCESS = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_ERROR = 500,
  CONFLICT = 409,
}

abstract class ApiResponse {
  constructor(
    protected success: boolean,
    protected status: ResponseStatus,
    protected message: string
  ) {}

  private static sanitize<T extends ApiResponse>(response: T): T {
    const clone: T = {} as T;
    Object.assign(clone, response);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete clone.status;
    for (const i in clone) if (typeof clone[i] === "undefined") delete clone[i];
    return clone;
  }

  public send(res: Response): Response {
    return this.prepare<ApiResponse>(res, this);
  }

  protected prepare<T extends ApiResponse>(
    res: Response,
    response: T
  ): Response {
    return res.status(this.status).json(ApiResponse.sanitize(response));
  }
}

export class UnauthorizedErrorResponse extends ApiResponse {
  constructor(message = "Authentication Failure") {
    super(false, ResponseStatus.UNAUTHORIZED, message);
  }
}

export class NotFoundResponse extends ApiResponse {
  constructor(message = "Not Found") {
    super(false, ResponseStatus.NOT_FOUND, message);
  }
}

export class ForbiddenResponse extends ApiResponse {
  constructor(message = "Forbidden") {
    super(false, ResponseStatus.FORBIDDEN, message);
  }
}

export class BadRequestResponse extends ApiResponse {
  constructor(message = "Bad Parameters") {
    super(false, ResponseStatus.BAD_REQUEST, message);
  }
}

export class BadRequestDataResponse<T> extends ApiResponse {
  constructor(
    message = "Bad Parameters",
    private data: T
  ) {
    super(false, ResponseStatus.BAD_REQUEST, message);
  }

  send(res: Response): Response {
    return super.prepare<BadRequestDataResponse<T>>(res, this);
  }
}

export class InternalErrorResponse extends ApiResponse {
  constructor(message = "Internal Error") {
    super(false, ResponseStatus.INTERNAL_ERROR, message);
  }
}

export class SuccessMsgResponse extends ApiResponse {
  constructor(message: string) {
    super(true, ResponseStatus.SUCCESS, message);
  }
}

export class FailureMsgResponse extends ApiResponse {
  constructor(message: string) {
    super(false, ResponseStatus.SUCCESS, message);
  }
}

export class SuccessResponse<T> extends ApiResponse {
  constructor(
    message: string,
    private data: T
  ) {
    super(true, ResponseStatus.SUCCESS, message);
  }

  send(res: Response): Response {
    return super.prepare<SuccessResponse<T>>(res, this);
  }
}

export class CreatedResponse<T> extends ApiResponse {
  constructor(
    message: string,
    private data: T
  ) {
    super(true, ResponseStatus.CREATED, message);
  }

  send(res: Response): Response {
    return super.prepare<CreatedResponse<T>>(res, this);
  }
}

export class ConflictResponse<T> extends ApiResponse {
  constructor(message: string) {
    super(false, ResponseStatus.CONFLICT, message);
  }
}

export class PaginatedResponse<T> extends ApiResponse {
  constructor(
    message: string,
    private data: T[],
    private pagination: {
      page: number;
      limit: number;
      count: number;
      total: number;
      totalPages: number;
    }
  ) {
    super(true, ResponseStatus.SUCCESS, message);
  }

  send(res: Response): Response {
    return super.prepare<PaginatedResponse<T>>(res, this);
  }
}
