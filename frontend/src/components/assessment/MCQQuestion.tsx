import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';

interface Option {
  id: string;
  text: string;
}

interface MCQQuestionProps {
  options: Option[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function MCQQuestion({ options, selectedId, onChange }: MCQQuestionProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-3"
    >
      {options.map((option) => (
        <motion.button
          key={option.id}
          variants={staggerItem}
          onClick={() => onChange(option.id)}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border-2 transition-all',
            selectedId === option.id
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-card border-gray-200 hover:border-primary/50 text-foreground'
          )}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {option.text}
        </motion.button>
      ))}
    </motion.div>
  );
}
