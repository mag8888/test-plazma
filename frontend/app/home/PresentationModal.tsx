'use client';

import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

// Image provided by user
const SLIDES = [
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029872/1_Igra-Moneo-Revolyuciya-v-Finansovom-Obrazovanii_xs4rhf.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029855/2_Finansovaya-gramotnost-cherez-igru_erwrlw.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029860/3_Bolshe-chem-prosto-igra_zmyqnl.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029873/4_Preimushestva-veb-versii-MONEO_eaufgq.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029853/5_Kak-rabotaet-Moneo_t5b5ko.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029855/6_Poigrajte-uzhe-sejchas_kod9ll.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029880/7_Franshiza-MONEO_wgkwmn.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029876/8_Usloviya_rg2jl7.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029878/9_Franshiza-dlya-vashej-strany_rixsxl.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029873/10_Bystraya-okupaemost-investicij_gkwzpf.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029873/11_Bolshe-chem-prosto-dohod_kfnlv4.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029866/12_Komu-podojdet-franshiza-Moneo_icpix8.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029863/13_Kak-nachat-sotrudnichestvo_omxbeu.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029873/14_Prisoedinyajtes-k-revolyucii-v-finansovom-obrazovanii_qt0vwu.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029855/15_Zarabatyvajte-Igraya-i-Obuchaya_etkwex.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029878/16_Ceny-i-Usloviya_r69eca.png',
    'https://res.cloudinary.com/drqtmkfka/image/upload/v1766029874/17_Passivnaya-strategiya_xkdew6.png'
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

                {/* Image Display */}
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                    <img
                        src={SLIDES[currentSlide]}
                        alt={`Slide ${currentSlide + 1}`}
                        className="w-full h-full object-contain"
                    />
                </div>

                {/* Navigation Arrows */}
                {SLIDES.length > 1 && (
                    <>
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
                    </>
                )}
            </div>
        </div>
    );
}
