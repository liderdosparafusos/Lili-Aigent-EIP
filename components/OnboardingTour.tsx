
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';

export interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  content: string;
  position?: 'center' | 'target'; // Simplificado: ou foca no elemento ou centraliza
}

interface OnboardingTourProps {
  steps: TourStep[];
  onComplete: () => void;
  isOpen: boolean;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, onComplete, isOpen }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const step = steps[currentStep];
      if (step.position === 'center') {
        setCoords(null);
        return;
      }

      const element = document.querySelector(`[data-tour="${step.target}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        // Adiciona padding visual ao destaque
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
        
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Fallback se elemento não visível
        setCoords(null);
      }
    };

    // Pequeno delay para garantir renderização do DOM
    const timer = setTimeout(updatePosition, 300);
    window.addEventListener('resize', updatePosition);
    
    return () => {
        window.removeEventListener('resize', updatePosition);
        clearTimeout(timer);
    };
  }, [currentStep, isOpen, steps]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Background Dimmed with Spotlight Effect via SVG Mask would be ideal, 
          but simplified div approach is robust for '30s intro' */}
      <div className="absolute inset-0 bg-black/80 transition-opacity duration-500" />

      {/* Spotlight Box (Highlighter) */}
      {coords && (
         <div 
            className="absolute border-2 border-cyan-500 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] transition-all duration-500 ease-in-out pointer-events-none"
            style={{
                top: coords.top - 8,
                left: coords.left - 8,
                width: coords.width + 16,
                height: coords.height + 16,
            }}
         />
      )}

      {/* Card Content */}
      <div 
        className="absolute transition-all duration-500 ease-out w-[340px] z-[101]"
        style={{
            top: coords ? coords.top + coords.height + 24 : '50%',
            left: coords ? Math.min(window.innerWidth - 360, Math.max(20, coords.left)) : '50%',
            transform: coords ? 'none' : 'translate(-50%, -50%)',
        }}
      >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative animate-[fadeIn_0.3s_ease-out]">
              <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                      <span className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                          PASSO {currentStep + 1}/{steps.length}
                      </span>
                  </div>
                  <button onClick={onComplete} className="text-slate-500 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                  </button>
              </div>
              
              <h3 className="text-white font-bold font-orbitron text-lg mb-2">{step.title}</h3>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                  {step.content}
              </p>

              <div className="flex justify-between items-center">
                  <div className="flex gap-1">
                      {steps.map((_, idx) => (
                          <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentStep ? 'bg-cyan-500' : 'bg-slate-700'}`} />
                      ))}
                  </div>
                  <div className="flex gap-3">
                      <button 
                        onClick={onComplete}
                        className="text-xs font-bold text-slate-500 hover:text-white px-3 py-2 transition-colors"
                      >
                          Pular
                      </button>
                      <button 
                        onClick={handleNext}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold px-5 py-2 rounded-lg shadow-lg shadow-cyan-900/20 flex items-center gap-2 transition-all hover:translate-x-1"
                      >
                          {isLast ? 'Vamos lá!' : 'Próximo'}
                          {isLast ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
