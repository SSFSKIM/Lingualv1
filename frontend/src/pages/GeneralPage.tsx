import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { Button, Slider, AnimatedCard, Alert, AlertDescription } from '@/components/ui';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { updateProfile } from '../api/user';

const GOAL_OPTIONS = [
  { id: 'business', labelKey: 'general.business' },
  { id: 'leisure', labelKey: 'general.leisure' },
  { id: 'academics', labelKey: 'general.academics' },
  { id: 'native', labelKey: 'general.native' },
];

export function GeneralPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [duration, setDuration] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId]
    );
  };

  const getDurationLabel = (value: number): string => {
    if (value === 0) return t('general.notAtAll');
    if (value === 10) return `10+ ${t('general.years')}`;
    return `${value} ${t('general.years')}`;
  };

  const handleSubmit = async () => {
    if (selectedGoals.length === 0) {
      setError('Please select at least one goal');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateProfile(selectedGoals, duration);
      navigate('/assessment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedPage className="min-h-screen flex items-center justify-center p-4">
      <AnimatedCard className="p-8 max-w-lg w-full">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-center text-accent mb-8"
        >
          {t('general.title')}
        </motion.h1>

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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <p className="text-foreground font-medium mb-4">{t('general.goalsQuestion')}</p>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-wrap gap-3"
          >
            {GOAL_OPTIONS.map(({ id, labelKey }) => (
              <motion.div key={id} variants={staggerItem}>
                <Button
                  variant="option"
                  selected={selectedGoals.includes(id)}
                  onClick={() => toggleGoal(id)}
                >
                  {t(labelKey)}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <p className="text-foreground font-medium mb-4">{t('general.durationQuestion')}</p>
          <Slider
            min={0}
            max={10}
            value={[duration]}
            onValueChange={(values) => setDuration(values[0])}
            displayValue={getDurationLabel(duration)}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={selectedGoals.length === 0}
            className="w-full"
          >
            {t('general.continue')}
          </Button>
        </motion.div>
      </AnimatedCard>
    </AnimatedPage>
  );
}
