from fastapi.routing import APIRoute

from app.dependencies import user_connection, write_connection
from app.routers import auth, chat, me, receipts, recap, transactions


def _dependants(dependant):
    for child in dependant.dependencies:
        yield child
        yield from _dependants(child)


def test_database_dependencies_commit_before_the_response_is_sent():
    """A dependency with `yield` ends after the response is sent unless its scope is "function".

    The transaction commits when the dependency ends, so with the default scope a client that reads
    right after a write can still see the old data. Every route must use the function scope.
    """
    checked = 0
    routes = [route for module in (auth, chat, me, receipts, recap, transactions) for route in module.router.routes]
    for route in routes:
        if not isinstance(route, APIRoute):
            continue
        for child in _dependants(route.dependant):
            if child.call in (user_connection, write_connection):
                checked += 1
                assert child.scope == "function", f"{route.path} keeps its transaction open past the response"
    assert checked > 20
