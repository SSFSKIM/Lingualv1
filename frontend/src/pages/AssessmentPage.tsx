import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button, Progress, Badge, AnimatedCard, Alert, AlertDescription } from '@/components/ui';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { LanguageToggle } from '../components/common';
import { MCQQuestion, TextQuestion, AudioQuestion } from '../components/assessment';
import {
  getAssessmentItems,
  submitAssessmentResponse,
  skipAssessmentQuestion,
} from '../api/assessment';
import type { AssessmentItem } from '../types';

export function AssessmentPage() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Response state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [audioTranscript, setAudioTranscript] = useState('');

  useEffect(() => {
    loadAssessment();
  }, []);

  const loadAssessment = async () => {
    try {
      const data = await getAssessmentItems();
      setItems(data.items);
      setCurrentIndex(data.currentIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const currentItem = items[currentIndex];

  const getResponse = (): string => {
    if (!currentItem) return '';

    switch (currentItem.item_type) {
      case 'mcq_single':
        return selectedOption || '';
      case 'text_short':
        return textAnswer;
      case 'audio_read':
        return audioTranscript;
      default:
        return '';
    }
  };

  const resetResponse = () => {
    setSelectedOption(null);
    setTextAnswer('');
    setAudioTranscript('');
  };

  const handleSubmit = async () => {
    if (!currentItem) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitAssessmentResponse(currentItem.id, getResponse());

      if (result.isComplete) {
        navigate('/categories');
      } else {
        setCurrentIndex(result.nextIndex);
        resetResponse();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!currentItem) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await skipAssessmentQuestion(currentItem.id);

      if (result.isComplete) {
        navigate('/categories');
      } else {
        setCurrentIndex(result.nextIndex);
        resetResponse();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip question');
    } finally {
      setSubmitting(false);
    }
  };

  const getPrompt = (): string => {
    if (!currentItem) return '';
    return lang === 'ko' ? currentItem.ui.prompt_ko : currentItem.ui.prompt_en;
  };

  const getInstructions = (): string | undefined => {
    if (!currentItem) return undefined;
    return lang === 'ko' ? currentItem.ui.instructions_ko : currentItem.ui.instructions_en;
  };

  const canSubmit = (): boolean => {
    if (!currentItem) return false;

    switch (currentItem.item_type) {
      case 'mcq_single':
        return selectedOption !== null;
      case 'text_short':
        return textAnswer.trim().length > 0;
      case 'audio_read':
        return audioTranscript.length > 0;
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-12 w-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <AnimatedPage className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-4">No assessment items found</p>
          <Button onClick={() => navigate('/general')}>Go Back</Button>
        </div>
      </AnimatedPage>
    );
  }

  const progressValue = ((currentIndex + 1) / items.length) * 100;

  return (
    <AnimatedPage className="min-h-screen flex items-center justify-center p-4">
      <AnimatedCard className="p-8 max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-between items-center mb-6"
        >
          <span className="text-muted-foreground">
            {t('assessment.progress')} {currentIndex + 1} {t('assessment.of')} {items.length}
          </span>
          <LanguageToggle />
        </motion.div>

        <Progress value={progressValue} className="mb-6" />

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-2"
        >
          <Badge variant="accent">{currentItem.section}</Badge>
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <p className="text-xl text-foreground mb-2">{getPrompt()}</p>
            {getInstructions() && (
              <p className="text-muted-foreground text-sm italic">{getInstructions()}</p>
            )}
            {currentItem.ui.context && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <pre className="text-foreground whitespace-pre-wrap font-sans">
                  {currentItem.ui.context}
                </pre>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={`answer-${currentIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-8"
          >
            {currentItem.item_type === 'mcq_single' && currentItem.content.options && (
              <MCQQuestion
                options={currentItem.content.options}
                selectedId={selectedOption}
                onChange={setSelectedOption}
              />
            )}

            {currentItem.item_type === 'text_short' && (
              <TextQuestion value={textAnswer} onChange={setTextAnswer} />
            )}

            {currentItem.item_type === 'audio_read' && (
              <AudioQuestion
                wordList={currentItem.content.word_list}
                sentences={currentItem.content.sentences}
                onTranscriptChange={setAudioTranscript}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4"
        >
          <Button variant="secondary" onClick={handleSkip} disabled={submitting} className="flex-1">
            {t('assessment.skip')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit() || submitting}
            loading={submitting}
            className="flex-1"
          >
            {t('assessment.next')}
          </Button>
        </motion.div>
      </AnimatedCard>
    </AnimatedPage>
  );
}
