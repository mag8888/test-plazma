'use client';

import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

// Placeholder images - User will replace these
const SLIDES = [
    '/slides/slide1.jpg',
    '/slides/slide2.jpg',
    '/slides/slide3.jpg',
];

interface PresentationModalProps {
    onClose: () => void;
}

export default function PresentationModal({ onClose }: PresentationModalProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50"
            >
                <X className="text-white" size={24} />
            </button>

            {/* Slider Container */}
            <div className="relative w-full max-w-4xl aspect-[16/9] mx-4 bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-white/10">

                {/* Image Placeholder - Logic to handle missing images gracefully */}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="text-center p-8">
                        <h3 className="text-2xl font-bold text-white mb-2">Слайд {currentSlide + 1}</h3>
                        <p className="text-slate-400 text-sm">Здесь будет изображение презентации</p>
                        <div className="mt-4 p-2 bg-slate-800 rounded font-mono text-xs text-slate-500">
                            {SLIDES[currentSlide]}
                        </div>
                    </div>
                </div>

                {/* Navigation Arrows */}
                <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all active:scale-95"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all active:scale-95"
                >
                    <ChevronRight size={24} />
                </button>

                {/* Dots Indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {SLIDES.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-all ${currentSlide === idx ? 'bg-white w-4' : 'bg-white/30'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
