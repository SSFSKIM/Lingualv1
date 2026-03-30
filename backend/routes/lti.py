"""
LTI 1.3 blueprint — OIDC login, JWT callback, JWKS, platform management.

Public endpoints (Canvas calls these):
    GET  /lti/jwks       – Serve Lingual's JWKS (RSA public key).
    POST /lti/login      – OIDC login initiation.
    POST /lti/callback   – Main LTI launch handler (JWT validation + routing).

Authenticated API endpoints (school_admin):
    POST   /api/schools/lti-platform – Register Canvas instance as LTI platform.
    GET    /api/schools/lti-platform – Return current LTI platform config.
    DELETE /api/schools/lti-platform – Remove the LTI platform registration.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, redirect, request, session, url_for

from backend.route_deps import RouteDeps
from backend.services.lti.config import FirestoreToolConf
from backend.services.lti.identity import auto_enroll_student, match_lti_user
from backend.services.lti.keys import get_jwks
from backend.services.membership_context import SchoolContextPermissionError

SCHOOL_ADMIN_ROLES = {'school_admin'}


def create_lti_blueprint(deps: RouteDeps) -> Blueprint:
    bp = Blueprint('lti', __name__)

    def _require_school_admin():
        """Return the school request context after verifying school_admin role."""
        ctx = deps.get_school_request_context()
        ctx.require_any_role(SCHOOL_ADMIN_ROLES)
        return ctx

    # ── helpers ───────────────────────────────────────────────────────

    def _is_instructor(roles):
        """Return True if any LTI role string indicates an instructor."""
        roles_list = roles if isinstance(roles, list) else [roles] if roles else []
        return any('Instructor' in str(r) for r in roles_list)

    def _extract_issuer(launch_data):
        """Extract the issuer from launch_data, trying common locations."""
        return launch_data.get('iss', '')

    def _extract_email(launch_data):
        return launch_data.get('email', '')

    def _extract_canvas_user_id(launch_data):
        return launch_data.get('sub', '')

    def _extract_roles(launch_data):
        return launch_data.get(
            'https://purl.imsglobal.org/spec/lti/claim/roles', []
        )

    def _extract_context(launch_data):
        return launch_data.get(
            'https://purl.imsglobal.org/spec/lti/claim/context', {}
        )

    def _extract_custom(launch_data):
        return launch_data.get(
            'https://purl.imsglobal.org/spec/lti/claim/custom', {}
        )

    def _extract_message_type(launch_data):
        return launch_data.get(
            'https://purl.imsglobal.org/spec/lti/claim/message_type', ''
        )

    # ══════════════════════════════════════════════════════════════════
    # 1. GET /lti/jwks — Public JWKS endpoint
    # ══════════════════════════════════════════════════════════════════

    @bp.route('/lti/jwks')
    def lti_jwks():
        try:
            return jsonify(get_jwks())
        except Exception as exc:
            print(f'LTI JWKS error: {exc}')
            return jsonify({'error': str(exc)}), 500

    # ══════════════════════════════════════════════════════════════════
    # 2. POST /lti/login — OIDC login initiation (Canvas calls this)
    # ══════════════════════════════════════════════════════════════════

    @bp.route('/lti/login', methods=['GET', 'POST'])
    def lti_login():
        try:
            from pylti1p3.contrib.flask import FlaskOIDCLogin, FlaskRequest

            tool_conf = FirestoreToolConf(deps.db)
            flask_request = FlaskRequest()
            oidc_login = FlaskOIDCLogin(flask_request, tool_conf)
            target_link_uri = request.form.get(
                'target_link_uri',
                request.args.get(
                    'target_link_uri',
                    url_for('lti.lti_callback', _external=True),
                ),
            )
            return oidc_login.enable_check_cookies().redirect(target_link_uri)
        except Exception as exc:
            print(f'LTI login error: {exc}')
            return jsonify({'error': f'LTI login failed: {exc}'}), 500

    # ══════════════════════════════════════════════════════════════════
    # 3. POST /lti/callback — Main LTI launch handler
    # ══════════════════════════════════════════════════════════════════

    @bp.route('/lti/callback', methods=['POST'])
    def lti_callback():
        try:
            from pylti1p3.contrib.flask import FlaskMessageLaunch, FlaskRequest

            tool_conf = FirestoreToolConf(deps.db)
            flask_request = FlaskRequest()
            message_launch = FlaskMessageLaunch(flask_request, tool_conf)
            message_launch.validate()

            launch_data = message_launch.get_launch_data()

            # Extract claims
            issuer = _extract_issuer(launch_data)
            email = _extract_email(launch_data)
            canvas_user_id = _extract_canvas_user_id(launch_data)
            roles = _extract_roles(launch_data)
            context = _extract_context(launch_data)
            custom = _extract_custom(launch_data)
            message_type = _extract_message_type(launch_data)

            canvas_course_id = context.get('id', '')
            canvas_course_title = context.get('title', '')
            is_instructor = _is_instructor(roles)

            # ── Deep Linking request ─────────────────────────────────
            if message_type == 'LtiDeepLinkingRequest':
                session['lti_deep_link'] = {
                    'launch_id': message_launch.get_launch_id(),
                    'issuer': issuer,
                    'email': email,
                    'canvas_user_id': canvas_user_id,
                    'roles': roles,
                    'canvas_course_id': canvas_course_id,
                    'canvas_course_title': canvas_course_title,
                }
                return redirect('/lti/assignment-picker')

            # ── Identity matching ────────────────────────────────────
            matched_user = match_lti_user(
                deps.db,
                issuer=issuer,
                email=email,
                canvas_user_id=canvas_user_id,
                roles=roles,
            )

            if not matched_user:
                # Store pending link info so the link-account page can use it
                session['lti_pending_link'] = {
                    'issuer': issuer,
                    'email': email,
                    'canvas_user_id': canvas_user_id,
                    'roles': roles,
                    'canvas_course_id': canvas_course_id,
                    'canvas_course_title': canvas_course_title,
                }
                return redirect('/lti/link-account')

            uid = matched_user['uid']
            org_id = matched_user['org_id']
            membership_id = matched_user['membership_id']
            platform_id = matched_user['platform_id']

            # ── Create LTI session record ────────────────────────────
            deps.db.create_lti_session(
                user_uid=uid,
                platform_id=platform_id,
                canvas_user_id=canvas_user_id,
                canvas_course_id=canvas_course_id,
                roles=roles,
            )

            # ── Set Flask session (same pattern as test_harness) ─────
            user = deps.db.get_user(uid)
            session['user'] = {
                'uid': uid,
                'email': user.get('email', '') if user else email,
                'name': user.get('name', '') if user else '',
                'active_membership_id': membership_id,
            }
            deps.db.set_user_last_active_membership(uid, membership_id)

            # ── Auto-create class + canvas_connection for instructors ─
            if is_instructor and canvas_course_id:
                # Check if a class already exists for this course in the org
                existing_classes = deps.db.list_org_classes(org_id)
                course_class = None
                for cls in existing_classes:
                    if cls.get('canvas_course_id') == str(canvas_course_id):
                        course_class = cls
                        break

                if not course_class:
                    # Create a new class linked to this Canvas course
                    class_id = deps.db.create_class(
                        org_id=org_id,
                        name=canvas_course_title or f'Canvas Course {canvas_course_id}',
                        teacher_membership_ids=[membership_id],
                        canvas_course_id=str(canvas_course_id),
                    )
                    deps.db.add_primary_class_to_membership(membership_id, class_id)

                    # Create canvas_connection with LTI auth
                    platform = deps.db.get_lti_platform_by_issuer(issuer)
                    canvas_instance_url = ''
                    deployment_id_val = ''
                    if platform:
                        # Derive instance URL from issuer (e.g. https://canvas.school.edu)
                        canvas_instance_url = platform.get('issuer', '')
                        deployment_id_val = platform.get('deployment_id', '')

                    deps.db.create_canvas_connection(
                        membership_id=membership_id,
                        org_id=org_id,
                        class_id=class_id,
                        canvas_instance_url=canvas_instance_url,
                        canvas_course_id=str(canvas_course_id),
                        canvas_course_name=canvas_course_title,
                        auth_method='lti',
                        lti_deployment_id=deployment_id_val,
                        lti_context_id=str(canvas_course_id),
                    )

            # ── Auto-enroll students ─────────────────────────────────
            if not is_instructor and canvas_course_id:
                # Find the class for this canvas course
                existing_classes = deps.db.list_org_classes(org_id)
                for cls in existing_classes:
                    if cls.get('canvas_course_id') == str(canvas_course_id):
                        auto_enroll_student(
                            deps.db,
                            uid=uid,
                            org_id=org_id,
                            class_id=cls['id'],
                            membership_id=membership_id,
                        )
                        break

            # ── Check for deep-linked assignment in custom claims ────
            assignment_id = custom.get('assignment_id', '') or custom.get('assignmentId', '')
            if assignment_id:
                return redirect(f'/app/assignments/{assignment_id}')

            # ── Default redirect ─────────────────────────────────────
            if is_instructor:
                return redirect('/app/teacher')
            return redirect('/app/learn')

        except Exception as exc:
            print(f'LTI callback error: {exc}')
            return jsonify({'error': f'LTI launch failed: {exc}'}), 500

    # ══════════════════════════════════════════════════════════════════
    # 4. POST /api/schools/lti-platform — Register Canvas as LTI platform
    # ══════════════════════════════════════════════════════════════════

    @bp.route('/api/schools/lti-platform', methods=['POST'])
    @deps.login_required
    def api_register_lti_platform():
        try:
            ctx = _require_school_admin()
            org_id = ctx.active_organization_id
            if not org_id:
                return jsonify({'success': False, 'error': 'No active organization.'}), 400

            data = request.get_json() or {}
            issuer = (data.get('issuer') or '').strip()
            client_id = (data.get('clientId') or '').strip()
            deployment_id = (data.get('deploymentId') or '').strip()
            auth_login_url = (data.get('authLoginUrl') or '').strip()
            auth_token_url = (data.get('authTokenUrl') or '').strip()
            key_set_url = (data.get('keySetUrl') or '').strip()

            if not all([issuer, client_id, deployment_id, auth_login_url, auth_token_url, key_set_url]):
                return jsonify({
                    'success': False,
                    'error': 'All fields are required: issuer, clientId, deploymentId, authLoginUrl, authTokenUrl, keySetUrl.',
                }), 400

            # Delete existing platform for this org (only one per org)
            existing = deps.db.get_lti_platform_by_org(org_id)
            if existing:
                deps.db.delete_lti_platform(existing['id'])

            platform_id = deps.db.create_lti_platform(
                org_id=org_id,
                issuer=issuer,
                client_id=client_id,
                deployment_id=deployment_id,
                auth_login_url=auth_login_url,
                auth_token_url=auth_token_url,
                key_set_url=key_set_url,
            )

            return jsonify({
                'success': True,
                'platformId': platform_id,
            }), 201

        except SchoolContextPermissionError as exc:
            return jsonify({'success': False, 'error': str(exc)}), 403
        except Exception as exc:
            print(f'LTI platform registration error: {exc}')
            return jsonify({'success': False, 'error': str(exc)}), 500

    # ══════════════════════════════════════════════════════════════════
    # 5. GET /api/schools/lti-platform — Current LTI platform config
    # ══════════════════════════════════════════════════════════════════

    @bp.route('/api/schools/lti-platform')
    @deps.login_required
    def api_get_lti_platform():
        try:
            ctx = _require_school_admin()
            org_id = ctx.active_organization_id
            if not org_id:
                return jsonify({'success': False, 'error': 'No active organization.'}), 400

            platform = deps.db.get_lti_platform_by_org(org_id)
            if not platform:
                return jsonify({'success': True, 'platform': None})

            return jsonify({
                'success': True,
                'platform': {
                    'id': platform.get('id'),
                    'orgId': platform.get('org_id'),
                    'issuer': platform.get('issuer', ''),
                    'clientId': platform.get('client_id', ''),
                    'deploymentId': platform.get('deployment_id', ''),
                    'authLoginUrl': platform.get('auth_login_url', ''),
                    'authTokenUrl': platform.get('auth_token_url', ''),
                    'keySetUrl': platform.get('key_set_url', ''),
                },
            })

        except SchoolContextPermissionError as exc:
            return jsonify({'success': False, 'error': str(exc)}), 403
        except Exception as exc:
            print(f'LTI platform lookup error: {exc}')
            return jsonify({'success': False, 'error': str(exc)}), 500

    # ══════════════════════════════════════════════════════════════════
    # 6. DELETE /api/schools/lti-platform — Remove LTI platform
    # ══════════════════════════════════════════════════════════════════

    @bp.route('/api/schools/lti-platform', methods=['DELETE'])
    @deps.login_required
    def api_delete_lti_platform():
        try:
            ctx = _require_school_admin()
            org_id = ctx.active_organization_id
            if not org_id:
                return jsonify({'success': False, 'error': 'No active organization.'}), 400

            platform = deps.db.get_lti_platform_by_org(org_id)
            if not platform:
                return jsonify({'success': False, 'error': 'No LTI platform registered for this organization.'}), 404

            deps.db.delete_lti_platform(platform['id'])
            return jsonify({'success': True})

        except SchoolContextPermissionError as exc:
            return jsonify({'success': False, 'error': str(exc)}), 403
        except Exception as exc:
            print(f'LTI platform deletion error: {exc}')
            return jsonify({'success': False, 'error': str(exc)}), 500

    return bp
