import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { Button, AnimatedCard, Alert, AlertDescription } from '@/components/ui';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { updateCategories } from '../api/assessment';

const CATEGORY_OPTIONS = [
  { id: 'grammar', labelKey: 'categories.grammar' },
  { id: 'vocabulary', labelKey: 'categories.vocabulary' },
  { id: 'cultural', labelKey: 'categories.cultural' },
  { id: 'pronunciation', labelKey: 'categories.pronunciation' },
];

export function CategoriesPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one category');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateCategories(selectedCategories);
      navigate('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save categories');
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
          {t('categories.title')}
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
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-wrap gap-3 mb-8"
        >
          {CATEGORY_OPTIONS.map(({ id, labelKey }) => (
            <motion.div key={id} variants={staggerItem}>
              <Button
                variant="option"
                selected={selectedCategories.includes(id)}
                onClick={() => toggleCategory(id)}
              >
                {t(labelKey)}
              </Button>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={selectedCategories.length === 0}
            className="w-full"
          >
            {t('categories.continue')}
          </Button>
        </motion.div>
      </AnimatedCard>
    </AnimatedPage>
  );
}
