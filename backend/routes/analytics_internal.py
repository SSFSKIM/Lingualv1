"""Internal analytics operations — machine-to-machine, NOT a user-facing surface.

`POST /internal/analytics/sweep-orphaned-sessions`
  Reconciler for the no-server-owned-close gap (ANALYTICS_MIGRATION §5b.2 #5):
  `session.ended` is client-fired, so a browser-close can leave a PG
  practice_session permanently `status='active'`. This route marks sessions
  stuck active past the idle window as `abandoned`. Invoked by ONE Cloud
  Scheduler HTTP job (~hourly); the work itself is idempotent.

Auth: a shared secret in the `X-Internal-Secret` header must match the
`INTERNAL_SCHEDULER_SECRET` env var (constant-time compare). If the env var is
unset the route is SEALED (403) — fail-closed, never open. This is NOT in
`functions/` (Firestore-only, can't reach Cloud SQL) and NOT public.

Gating: dormant until `DUAL_WRITE_ANALYTICS_SESSIONS=1` (no sessions in PG to
sweep before then) — returns 200 `flag_off` so Cloud Scheduler does not retry.
"""

from __future__ import annotations

import hmac
import logging
import os

from flask import Blueprint, jsonify, request

from backend.route_deps import RouteDeps

_log = logging.getLogger(__name__)


def create_analytics_internal_blueprint(deps: RouteDeps) -> Blueprint:
    bp = Blueprint('analytics_internal', __name__)

    @bp.route('/internal/analytics/sweep-orphaned-sessions', methods=['POST'])
    def sweep_orphaned_sessions():
        expected = os.environ.get('INTERNAL_SCHEDULER_SECRET', '')
        provided = request.headers.get('X-Internal-Secret', '')
        # Fail-closed: an unset secret seals the route; constant-time compare
        # otherwise (avoids leaking the secret length/prefix via timing).
        if not expected or not hmac.compare_digest(provided, expected):
            _log.warning('sweep-orphaned-sessions: unauthorized request')
            return jsonify({'error': 'unauthorized'}), 403

        from backend.db import dual_write_analytics as _da

        # sweep_orphaned_sessions is itself flag-gated and fail-open; it returns
        # {'status': 'flag_off'} when DUAL_WRITE_ANALYTICS_SESSIONS != '1'.
        result = _da.sweep_orphaned_sessions(deps.sql_engine)
        _log.info('sweep-orphaned-sessions: %s', result)
        return jsonify({'status': 'ok', **result}), 200

    return bp
