'use client';

import React from 'react';
import { Toaster } from 'react-hot-toast';

export const ToastProvider = () => {
  return <Toaster position="bottom-center" reverseOrder={false} toastOptions={{
    className: 'font-sans text-xl px-3 py-4 border-2 border-musgo w-fit'
  }} />;
};
