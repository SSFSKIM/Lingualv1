from __future__ import annotations

from datetime import UTC, datetime

from flask import Blueprint, jsonify, request

from backend.route_deps import RouteDeps
from backend.routes.schools import build_class_summary, build_setup_checklist, list_accessible_teacher_classes
from backend.services.compliance import (
    create_consent_event,
    normalize_consent_status,
    resolve_student_compliance_record,
    serialize_student_compliance_record,
    upsert_student_compliance_record,
)
from backend.services.membership_context import SchoolContextPermissionError

TEACHER_ALLOWED_ROLES = {"teacher", "school_admin"}


def _normalize_string(value):
    if not isinstance(value, str):
        return ""
    return value.strip()


def _require_teacher_context(deps: RouteDeps):
    context = deps.get_school_request_context()
    context.require_any_role(TEACHER_ALLOWED_ROLES)
    if not context.active_organization_id:
        raise SchoolContextPermissionError("No active organization selected.")
    return context


def _require_teacher_class_context(deps: RouteDeps, class_id: str):
    context = _require_teacher_context(deps)
    class_record = deps.db.get_class(class_id)
    if not class_record:
        raise SchoolContextPermissionError("Class not found.")
    if class_record.get("org_id") != context.active_organization_id:
        raise SchoolContextPermissionError("Class is outside the active organization.")

    teacher_membership_ids = class_record.get("teacher_membership_ids") or []
    if context.has_role("school_admin") or context.active_membership_id in teacher_membership_ids:
        return context, class_record

    raise SchoolContextPermissionError("Teacher membership does not have access to this class.")


def build_teacher_dashboard_payload(deps: RouteDeps, context) -> dict:
    class_summaries = list_accessible_teacher_classes(deps, context)
    student_count = sum(int(class_summary.get("studentCount") or 0) for class_summary in class_summaries)
    assignment_count = sum(int(class_summary.get("assignmentCount") or 0) for class_summary in class_summaries)
    organization_name = ""
    if context.active_membership:
        organization_name = context.active_membership.get("orgName", "")

    alerts = []
    if not class_summaries:
        alerts.append("Create your first class to start assignment delivery and reporting.")
    elif student_count == 0:
        alerts.append("Add students to unlock assignment launch and teacher analytics.")

    return {
        "organizationName": organization_name,
        "summary": {
            "classCount": len(class_summaries),
            "studentCount": student_count,
            "speakingMinutes": 0,
            "assignmentCount": assignment_count,
        },
        "classes": class_summaries,
        "setupChecklist": build_setup_checklist(context, class_summaries),
        "alerts": alerts,
    }


def create_teacher_blueprint(deps: RouteDeps) -> Blueprint:
    bp = Blueprint("teacher_routes", __name__)

    @bp.route("/api/teacher/dashboard")
    @deps.login_required
    def api_teacher_dashboard():
        try:
            context = _require_teacher_context(deps)
            return jsonify({
                "success": True,
                "dashboard": build_teacher_dashboard_payload(deps, context),
            })
        except SchoolContextPermissionError as exc:
            return jsonify({"success": False, "error": str(exc)}), 403
        except Exception as exc:
            print(f"Teacher dashboard error: {exc}")
            return jsonify({"success": False, "error": str(exc)}), 500

    @bp.route("/api/teacher/classes")
    @deps.login_required
    def api_teacher_classes():
        try:
            context = _require_teacher_context(deps)
            return jsonify({
                "success": True,
                "classes": list_accessible_teacher_classes(deps, context),
            })
        except SchoolContextPermissionError as exc:
            return jsonify({"success": False, "error": str(exc)}), 403
        except Exception as exc:
            print(f"Teacher classes error: {exc}")
            return jsonify({"success": False, "error": str(exc)}), 500

    @bp.route("/api/teacher/classes", methods=["POST"])
    @deps.login_required
    def api_create_teacher_class():
        try:
            context = _require_teacher_context(deps)
            data = request.get_json() or {}

            class_name = _normalize_string(data.get("name"))
            term = _normalize_string(data.get("term"))
            subject = _normalize_string(data.get("subject"))
            grade_band = _normalize_string(data.get("gradeBand"))
            learning_locale = _normalize_string(data.get("learningLocale")) or "ko-KR"

            if not class_name:
                return jsonify({"success": False, "error": "Class name is required."}), 400
            if learning_locale not in deps.allowed_learning_locales:
                return jsonify({"success": False, "error": "Invalid learning locale."}), 400

            teacher_membership_ids = [context.active_membership_id] if context.active_membership_id else []
            class_id = deps.db.create_class(
                org_id=context.active_organization_id,
                name=class_name,
                learning_locale=learning_locale,
                term=term,
                subject=subject,
                teacher_membership_ids=teacher_membership_ids,
                grade_band=grade_band,
            )
            if context.active_membership_id:
                deps.db.add_primary_class_to_membership(context.active_membership_id, class_id)

            return jsonify({
                "success": True,
                "class": build_class_summary(deps, deps.db.get_class(class_id)),
            }), 201
        except SchoolContextPermissionError as exc:
            return jsonify({"success": False, "error": str(exc)}), 403
        except Exception as exc:
            print(f"Teacher class creation error: {exc}")
            return jsonify({"success": False, "error": str(exc)}), 500

    @bp.route("/api/teacher/classes/<class_id>/students/<student_uid>/compliance")
    @deps.login_required
    def api_get_student_compliance(class_id, student_uid):
        try:
            context, class_record = _require_teacher_class_context(deps, class_id)
            enrollment = deps.db.get_student_class_enrollment(class_id, student_uid)
            if not enrollment or enrollment.get("status") != "active":
                return jsonify({"success": False, "error": "Student is not actively enrolled in this class."}), 404

            compliance_record = resolve_student_compliance_record(
                deps,
                org_id=class_record.get("org_id", ""),
                student_uid=student_uid,
            )
            create_consent_event(
                deps,
                org_id=class_record.get("org_id", ""),
                student_uid=student_uid,
                event_type="consent.reviewed",
                actor_type="teacher" if context.has_role("teacher") else "school_admin",
                actor_id=context.uid,
                payload={"classId": class_id},
            )
            return jsonify({
                "success": True,
                "compliance": serialize_student_compliance_record(compliance_record),
            })
        except SchoolContextPermissionError as exc:
            return jsonify({"success": False, "error": str(exc)}), 403
        except Exception as exc:
            print(f"Student compliance lookup error: {exc}")
            return jsonify({"success": False, "error": str(exc)}), 500

    @bp.route("/api/teacher/classes/<class_id>/students/<student_uid>/compliance", methods=["PUT"])
    @deps.login_required
    def api_update_student_compliance(class_id, student_uid):
        try:
            context, class_record = _require_teacher_class_context(deps, class_id)
            enrollment = deps.db.get_student_class_enrollment(class_id, student_uid)
            if not enrollment or enrollment.get("status") != "active":
                return jsonify({"success": False, "error": "Student is not actively enrolled in this class."}), 404

            data = request.get_json(silent=True) or {}
            updates = {}
            if "isMinor" in data:
                updates["is_minor"] = bool(data.get("isMinor"))
            if "guardianConsentStatus" in data:
                updates["guardian_consent_status"] = normalize_consent_status(data.get("guardianConsentStatus"))
            if "voiceConsentStatus" in data:
                updates["voice_consent_status"] = normalize_consent_status(
                    data.get("voiceConsentStatus"),
                    allow_not_required=False,
                )
            if "textAllowed" in data:
                updates["text_allowed"] = bool(data.get("textAllowed"))
            if "retentionPolicyId" in data:
                updates["retention_policy_id"] = _normalize_string(data.get("retentionPolicyId"))
            if "schoolAgreementVersion" in data:
                updates["school_agreement_version"] = _normalize_string(data.get("schoolAgreementVersion"))
            updates["last_verified_at"] = datetime.now(UTC)

            updated_record = upsert_student_compliance_record(
                deps,
                org_id=class_record.get("org_id", ""),
                student_uid=student_uid,
                updates=updates,
            )
            create_consent_event(
                deps,
                org_id=class_record.get("org_id", ""),
                student_uid=student_uid,
                event_type="consent.updated",
                actor_type="teacher" if context.has_role("teacher") else "school_admin",
                actor_id=context.uid,
                payload={"classId": class_id, "updates": serialize_student_compliance_record(updated_record)},
            )
            return jsonify({
                "success": True,
                "compliance": serialize_student_compliance_record(updated_record),
            })
        except SchoolContextPermissionError as exc:
            return jsonify({"success": False, "error": str(exc)}), 403
        except Exception as exc:
            print(f"Student compliance update error: {exc}")
            return jsonify({"success": False, "error": str(exc)}), 500

    return bp
