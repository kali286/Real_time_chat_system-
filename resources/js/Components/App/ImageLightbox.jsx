import { useEffect } from 'react';

export default function ImageLightbox({ src = null, onClose = () => {} }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!src) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
      <button aria-label="Close" onClick={onClose} className="absolute top-4 right-4 text-white p-2 rounded-md hover:bg-white/10">✕</button>
      <img src={src} alt="attachment" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain" />
    </div>
  );
}
