package com.interview.graphql;

import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import java.util.Map;
import org.springframework.graphql.data.method.annotation.GraphQlExceptionHandler;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@ControllerAdvice
public class GraphQlGlobalExceptionHandler {

    @GraphQlExceptionHandler(ResponseStatusException.class)
    public graphql.GraphQLError handleResponseStatus(
            ResponseStatusException ex, DataFetchingEnvironment env) {
        HttpStatusCode status = ex.getStatusCode();
        String message = ex.getReason() != null ? ex.getReason() : status.toString();
        return GraphqlErrorBuilder.newError()
                .errorType(mapErrorType(status))
                .message(message)
                .path(env.getExecutionStepInfo().getPath())
                .extensions(Map.of(
                        "code", status.value(),
                        "status", status.value(),
                        "classification", "DataFetchingException"))
                .build();
    }

    @GraphQlExceptionHandler(IllegalArgumentException.class)
    public graphql.GraphQLError handleIllegalArgument(
            IllegalArgumentException ex, DataFetchingEnvironment env) {
        return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.BAD_REQUEST)
                .message(ex.getMessage())
                .path(env.getExecutionStepInfo().getPath())
                .extensions(Map.of(
                        "code", 400,
                        "status", 400,
                        "classification", "ValidationError"))
                .build();
    }

    @GraphQlExceptionHandler(Exception.class)
    public graphql.GraphQLError handleGeneric(Exception ex, DataFetchingEnvironment env) {
        return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.INTERNAL_ERROR)
                .message("Internal server error")
                .path(env.getExecutionStepInfo().getPath())
                .extensions(Map.of(
                        "code", 500,
                        "status", 500,
                        "classification", "InternalError"))
                .build();
    }

    private static ErrorType mapErrorType(HttpStatusCode status) {
        int code = status.value();
        if (code == 401) {
            return ErrorType.UNAUTHORIZED;
        }
        if (code == 403) {
            return ErrorType.FORBIDDEN;
        }
        if (code == 404) {
            return ErrorType.NOT_FOUND;
        }
        if (code >= 400 && code < 500) {
            return ErrorType.BAD_REQUEST;
        }
        return ErrorType.INTERNAL_ERROR;
    }
}
