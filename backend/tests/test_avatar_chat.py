import unittest

from backend.avatar_chat import (
    build_hit_reaction,
    chunk_reply_text,
    extract_first_json_object,
    parse_avatar_turn,
    serialize_chat_history,
    split_speech_for_tts,
    split_audio_bytes,
)


class AvatarChatHelpersTestCase(unittest.TestCase):
    def test_extract_first_json_object_handles_wrapped_text(self):
        raw = 'preface {"speech":"Hello","gaze":{"x":0.1,"y":-0.1}} suffix'
        self.assertEqual(
            extract_first_json_object(raw),
            '{"speech":"Hello","gaze":{"x":0.1,"y":-0.1}}',
        )

    def test_parse_avatar_turn_normalizes_affect_and_motion(self):
        turn = parse_avatar_turn(
            "{\"speech\":\"Let's try that again.\",\"affect\":\"Corrective\",\"motionIntent\":\"question\",\"gaze\":{\"x\":2,\"y\":-2},\"bodySway\":2}"
        )
        self.assertEqual(turn['speech'], "Let's try that again.")
        self.assertEqual(turn['affect'], 'corrective')
        self.assertEqual(turn['motionGroup'], 'question')
        self.assertEqual(turn['gaze'], {'x': 1.0, 'y': -1.0})
        self.assertEqual(turn['bodySway'], 1.0)

    def test_chunk_reply_text_preserves_progressive_word_chunks(self):
        self.assertEqual(
            chunk_reply_text('하나 둘 셋 넷 다섯', words_per_chunk=2),
            ['하나 둘', ' 셋 넷', ' 다섯'],
        )

    def test_split_audio_bytes_respects_chunk_size(self):
        chunks = split_audio_bytes(b'abcdefghi', chunk_size=4)
        self.assertEqual(chunks, [b'abcd', b'efgh', b'i'])

    def test_split_speech_for_tts_breaks_long_sentences_into_natural_segments(self):
        segments = split_speech_for_tts(
            '첫 문장입니다. 두 번째 문장은 조금 더 길어서, 쉼표 기준으로도 적절히 나눠져야 합니다. 마지막 문장입니다.',
            max_chars=24,
        )
        self.assertEqual(
            segments,
            [
                '첫 문장입니다.',
                '두 번째 문장은 조금 더 길어서,',
                '쉼표 기준으로도 적절히 나눠져야 합니다.',
                '마지막 문장입니다.',
            ],
        )

    def test_build_hit_reaction_maps_face_and_body(self):
        face_reaction = build_hit_reaction('face')
        body_reaction = build_hit_reaction('body')
        self.assertEqual(face_reaction['motionGroup'], 'react_face')
        self.assertEqual(body_reaction['motionGroup'], 'react_body')
        self.assertEqual(body_reaction['affect'], 'affirming')

    def test_serialize_chat_history_filters_invalid_messages(self):
        history = serialize_chat_history({
            'messages': [
                {'role': 'user', 'content': '안녕'},
                {'role': 'assistant', 'content': '반가워요'},
                {'role': 'system', 'content': 'ignored'},
                {'role': 'assistant', 'content': '   '},
            ]
        })
        self.assertEqual(
            history,
            [
                {'role': 'user', 'content': '안녕'},
                {'role': 'assistant', 'content': '반가워요'},
            ],
        )


if __name__ == '__main__':
    unittest.main()
