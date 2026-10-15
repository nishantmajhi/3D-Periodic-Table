'use client';
import { useToastStore } from '@/store/toastStore';

export default function Toast() {
  const { message, visible } = useToastStore();
  return (
    <div id="toast" className={visible ? 'show' : ''} role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
