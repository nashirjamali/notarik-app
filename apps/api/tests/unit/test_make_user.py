def test_make_user_returns_distinct_users(make_user):
    first = make_user()
    second = make_user()
    assert first != second
