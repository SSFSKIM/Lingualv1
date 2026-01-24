"""
Database module for Lingual app using Firestore.

Schema:
- users/{uid}
    - email: str
    - name: str
    - created_at: timestamp
    - updated_at: timestamp
    - profile:
        - display_name: str (user's preferred name)
        - age: int
        - gender: str ('male', 'female', 'other', 'prefer_not_to_say')
        - rigor: str ('light', 'casual', 'moderate', 'serious', 'intense')
        - frequency: int (how many times)
        - frequency_unit: str ('day', 'week', 'month')
        - level_objective: str (user's goal description)
        - ui_language: str ('en' or 'ko')
    - assessment:
        - responses: dict (item_id -> response)
        - current_item_index: int
        - completed: bool
        - completed_at: timestamp (optional)
    - results:
        - global_stage: int (0-5)
        - domain_bands: dict (domain -> band)
        - domain_raw_scores: dict (domain -> score)
        - item_scores: dict (item_id -> score)
    - selected_categories: list[str]
    - chat_history: list[dict] (role, content) [DEPRECATED - kept for migration]

- users/{uid}/chats/{chat_id}
    - title: str (auto-generated from first message or default)
    - created_at: timestamp
    - updated_at: timestamp
    - messages: list[dict]
        - role: str ('user' or 'assistant')
        - content: str
        - timestamp: str (ISO format)
"""

from firebase_admin import firestore
from datetime import datetime


def get_db():
    """Get Firestore client."""
    return firestore.client()


def get_user_ref(uid):
    """Get reference to user document."""
    db = get_db()
    return db.collection('users').document(uid)


def create_user(uid, email, name):
    """Create a new user document."""
    user_ref = get_user_ref(uid)
    user_data = {
        'email': email,
        'name': name,
        'created_at': firestore.SERVER_TIMESTAMP,
        'updated_at': firestore.SERVER_TIMESTAMP,
        'profile': {
            'display_name': '',
            'age': None,
            'gender': None,
            'rigor': None,
            'frequency': None,
            'frequency_unit': None,
            'level_objective': '',
            'ui_language': 'en'
        },
        'assessment': {
            'responses': {},
            'current_item_index': 0,
            'completed': False
        },
        'results': None,
        'selected_categories': [],
        'chat_history': []
    }
    user_ref.set(user_data)
    return user_data


def get_user(uid):
    """Get user document, create if doesn't exist."""
    user_ref = get_user_ref(uid)
    doc = user_ref.get()

    if doc.exists:
        return doc.to_dict()
    return None


def get_or_create_user(uid, email, name):
    """Get existing user or create new one."""
    user = get_user(uid)
    if user is None:
        user = create_user(uid, email, name)
    return user


def update_user_profile(uid, display_name=None, age=None, gender=None,
                        rigor=None, frequency=None, frequency_unit=None,
                        level_objective=None, ui_language=None):
    """Update user profile fields."""
    user_ref = get_user_ref(uid)
    updates = {'updated_at': firestore.SERVER_TIMESTAMP}

    if display_name is not None:
        updates['profile.display_name'] = display_name
    if age is not None:
        updates['profile.age'] = age
    if gender is not None:
        updates['profile.gender'] = gender
    if rigor is not None:
        updates['profile.rigor'] = rigor
    if frequency is not None:
        updates['profile.frequency'] = frequency
    if frequency_unit is not None:
        updates['profile.frequency_unit'] = frequency_unit
    if level_objective is not None:
        updates['profile.level_objective'] = level_objective
    if ui_language is not None:
        updates['profile.ui_language'] = ui_language

    user_ref.update(updates)


def update_assessment_response(uid, item_id, response, current_index):
    """Update a single assessment response."""
    user_ref = get_user_ref(uid)
    user_ref.update({
        f'assessment.responses.{item_id}': response,
        'assessment.current_item_index': current_index,
        'updated_at': firestore.SERVER_TIMESTAMP
    })


def get_assessment_state(uid):
    """Get current assessment state for user."""
    user = get_user(uid)
    if user:
        return user.get('assessment', {
            'responses': {},
            'current_item_index': 0,
            'completed': False
        })
    return None


def reset_assessment(uid):
    """Reset user's assessment progress."""
    user_ref = get_user_ref(uid)
    user_ref.update({
        'assessment': {
            'responses': {},
            'current_item_index': 0,
            'completed': False
        },
        'results': None,
        'updated_at': firestore.SERVER_TIMESTAMP
    })


def save_assessment_results(uid, results):
    """Save assessment results after completion."""
    user_ref = get_user_ref(uid)
    user_ref.update({
        'assessment.completed': True,
        'assessment.completed_at': firestore.SERVER_TIMESTAMP,
        'results': results,
        'updated_at': firestore.SERVER_TIMESTAMP
    })


def get_assessment_results(uid):
    """Get user's assessment results."""
    user = get_user(uid)
    if user:
        return user.get('results')
    return None


def update_selected_categories(uid, categories):
    """Update user's selected practice categories."""
    user_ref = get_user_ref(uid)
    user_ref.update({
        'selected_categories': categories,
        'updated_at': firestore.SERVER_TIMESTAMP
    })


def get_chat_history(uid, limit=20):
    """Get user's recent chat history."""
    user = get_user(uid)
    if user:
        history = user.get('chat_history', [])
        return history[-limit:] if len(history) > limit else history
    return []


def append_chat_message(uid, role, content):
    """Append a message to chat history."""
    user_ref = get_user_ref(uid)
    user_ref.update({
        'chat_history': firestore.ArrayUnion([{
            'role': role,
            'content': content,
            'timestamp': datetime.utcnow().isoformat()
        }]),
        'updated_at': firestore.SERVER_TIMESTAMP
    })


def save_chat_history(uid, messages):
    """Save full chat history (for bulk updates)."""
    user_ref = get_user_ref(uid)
    # Add timestamps to messages if not present
    timestamped_messages = []
    for msg in messages:
        if 'timestamp' not in msg:
            msg_copy = msg.copy()
            msg_copy['timestamp'] = datetime.utcnow().isoformat()
            timestamped_messages.append(msg_copy)
        else:
            timestamped_messages.append(msg)

    user_ref.update({
        'chat_history': timestamped_messages,
        'updated_at': firestore.SERVER_TIMESTAMP
    })


def clear_chat_history(uid):
    """Clear user's chat history."""
    user_ref = get_user_ref(uid)
    user_ref.update({
        'chat_history': [],
        'updated_at': firestore.SERVER_TIMESTAMP
    })


def get_user_profile_context(uid):
    """Get user profile data for AI context."""
    user = get_user(uid)
    if user:
        profile = user.get('profile', {})
        return {
            'display_name': profile.get('display_name', ''),
            'age': profile.get('age'),
            'gender': profile.get('gender'),
            'rigor': profile.get('rigor'),
            'frequency': profile.get('frequency'),
            'frequency_unit': profile.get('frequency_unit'),
            'level_objective': profile.get('level_objective', ''),
            'results': user.get('results'),
            'selected_categories': user.get('selected_categories', [])
        }
    return None


# ============================================
# CHAT SESSION FUNCTIONS
# ============================================

def get_chats_collection(uid):
    """Get reference to user's chats subcollection."""
    return get_user_ref(uid).collection('chats')


def create_chat_session(uid, title=None):
    """Create a new chat session for user."""
    chats_ref = get_chats_collection(uid)
    chat_data = {
        'title': title or 'New Chat',
        'created_at': firestore.SERVER_TIMESTAMP,
        'updated_at': firestore.SERVER_TIMESTAMP,
        'messages': []
    }
    doc_ref = chats_ref.add(chat_data)
    return doc_ref[1].id  # Returns the document ID


def _timestamp_to_iso(ts):
    """Convert Firestore timestamp to ISO string."""
    if ts is None:
        return None
    if hasattr(ts, 'isoformat'):
        return ts.isoformat()
    if hasattr(ts, 'seconds'):
        # Firestore Timestamp object
        return datetime.utcfromtimestamp(ts.seconds).isoformat()
    return str(ts)


def get_chat_sessions(uid, limit=50):
    """Get all chat sessions for user, ordered by most recent."""
    chats_ref = get_chats_collection(uid)
    docs = chats_ref.order_by('updated_at', direction=firestore.Query.DESCENDING).limit(limit).stream()

    sessions = []
    for doc in docs:
        data = doc.to_dict()
        # Get preview from last message
        messages = data.get('messages', [])
        last_message = messages[-1] if messages else None

        sessions.append({
            'id': doc.id,
            'title': data.get('title', 'New Chat'),
            'created_at': _timestamp_to_iso(data.get('created_at')),
            'updated_at': _timestamp_to_iso(data.get('updated_at')),
            'message_count': len(messages),
            'last_message': last_message.get('content', '')[:50] if last_message else None
        })
    return sessions


def get_chat_session(uid, chat_id):
    """Get a specific chat session with all messages."""
    chat_ref = get_chats_collection(uid).document(chat_id)
    doc = chat_ref.get()

    if doc.exists:
        data = doc.to_dict()
        return {
            'id': doc.id,
            'title': data.get('title', 'New Chat'),
            'created_at': _timestamp_to_iso(data.get('created_at')),
            'updated_at': _timestamp_to_iso(data.get('updated_at')),
            'messages': data.get('messages', [])
        }
    return None


def add_message_to_chat(uid, chat_id, role, content):
    """Add a message to a chat session."""
    chat_ref = get_chats_collection(uid).document(chat_id)
    message = {
        'role': role,
        'content': content,
        'timestamp': datetime.utcnow().isoformat()
    }

    chat_ref.update({
        'messages': firestore.ArrayUnion([message]),
        'updated_at': firestore.SERVER_TIMESTAMP
    })
    return message


def update_chat_title(uid, chat_id, title):
    """Update the title of a chat session."""
    chat_ref = get_chats_collection(uid).document(chat_id)
    chat_ref.update({
        'title': title,
        'updated_at': firestore.SERVER_TIMESTAMP
    })


def delete_chat_session(uid, chat_id):
    """Delete a chat session."""
    chat_ref = get_chats_collection(uid).document(chat_id)
    chat_ref.delete()


def get_chat_messages_for_context(uid, chat_id, limit=20):
    """Get recent messages from a chat for AI context."""
    session = get_chat_session(uid, chat_id)
    if session:
        messages = session.get('messages', [])
        return messages[-limit:] if len(messages) > limit else messages
    return []
