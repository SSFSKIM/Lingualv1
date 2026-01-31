// FLASHCARDFLIP

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';

interface Flashcard {
  korean: string;
  english: string;
}

interface FlashcardFlipProps {
  flashcards: Flashcard[];
  onClose: () => void;
}

export function FlashcardFlip({ flashcards, onClose }: FlashcardFlipProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentCard = flashcards[currentIndex];

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isCorrect = answer.toLowerCase().trim() === currentCard.english.toLowerCase().trim();
    
    if (isCorrect) {
      setScore(score + 1);
      setShowResult('correct');
    } else {
      setShowResult('wrong');
    }

    setTimeout(() => {
      setShowResult(null);
      setAnswer('');
      
      if (currentIndex + 1 >= flashcards.length) {
        setGameOver(true);
      } else {
        setCurrentIndex(currentIndex + 1);
      }
    }, 1000);
  };

  if (gameOver) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-3xl font-bold text-blue-600 mb-4">Game Over!</h2>
          <p className="text-xl mb-6">
            Score: <span className="font-bold text-blue-600">{score}</span> / {flashcards.length}
          </p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-medium text-gray-600">
            Card {currentIndex + 1} / {flashcards.length}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-lg font-bold text-blue-600">
              Score: {score}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Flashcard */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className={`
              rounded-xl p-8 mb-6 text-center
              ${showResult === 'correct' ? 'bg-green-100' : ''}
              ${showResult === 'wrong' ? 'bg-red-100' : ''}
              ${!showResult ? 'bg-blue-50' : ''}
            `}
          >
            <p className="text-4xl font-bold text-gray-800 mb-4">
              {currentCard.korean}
            </p>
            {showResult === 'wrong' && (
              <p className="text-lg text-red-600">
                Correct: {currentCard.english}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Input */}
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type the English translation..."
            disabled={showResult !== null}
            className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
          />
          <Button
            type="submit"
            disabled={!answer.trim() || showResult !== null}
            className="w-full mt-4"
          >
            Submit
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// FLASHCARDFLIP
