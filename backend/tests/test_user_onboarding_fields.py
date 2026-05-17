import pytest

import database


def test_intended_role_constants_are_exposed():
    assert database.INTENDED_ROLE_STUDENT == 'student'
    assert database.INTENDED_ROLE_TEACHER == 'teacher'
    assert database.INTENDED_ROLE_ADMIN == 'admin'
    assert database.ALLOWED_INTENDED_ROLES == frozenset({'student', 'teacher', 'admin'})


def test_onboarding_state_constants_are_exposed():
    expected = frozenset({
        'role_selected',
        'student_setup',
        'teacher_pending',
        'org_creation_pending',
        'awaiting_lingual',
        'complete',
    })
    assert database.ALLOWED_ONBOARDING_STATES == expected
