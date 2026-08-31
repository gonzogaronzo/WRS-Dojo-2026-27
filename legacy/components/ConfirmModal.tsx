import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-[#fdf6e3] w-full max-w-md rounded-[2.5rem] border-4 border-stone-800 shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ${
                  variant === 'danger' ? 'bg-red-100 text-red-800' : 
                  variant === 'warning' ? 'bg-amber-100 text-amber-800' : 
                  'bg-blue-100 text-blue-800'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <h3 className="text-2xl font-black font-serif text-stone-900 mb-2">{title}</h3>
              <p className="text-stone-600 font-medium leading-relaxed mb-8">{message}</p>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 ${
                    variant === 'danger' ? 'bg-red-800 text-white hover:bg-red-700 shadow-red-900/20' :
                    variant === 'warning' ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-amber-900/20' :
                    'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-900/20'
                  }`}
                >
                  {confirmLabel}
                </button>
                <button 
                  onClick={onClose}
                  className="px-8 py-4 border-2 border-stone-200 text-stone-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-stone-50 transition-all"
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
