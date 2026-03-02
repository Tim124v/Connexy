'use client';

import type React from 'react';
import { ThemeProvider } from '../components/theme-provider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
