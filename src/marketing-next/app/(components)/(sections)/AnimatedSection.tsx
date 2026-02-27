'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Direction = 'up' | 'left' | 'right';

interface Props {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
}

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 40 },
  left: { x: -40, y: 0 },
  right: { x: 40, y: 0 },
};

export default function AnimatedSection({ children, direction = 'up', delay = 0, className }: Props) {
  const { x, y } = offsets[direction];
  return (
    <motion.div
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
