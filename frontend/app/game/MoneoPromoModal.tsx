import React from 'react';

interface MoneoPromoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MoneoPromoModal: React.FC<MoneoPromoModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 p-4">
            <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-end">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="mb-2 mr-2 md:mr-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                {/* Content Container */}
                <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20 border border-white/10 bg-[#1a1b1e]">

                    {/* Desktop Image (Hidden on mobile) */}
                    <img
                        src="https://res.cloudinary.com/drqtmkfka/image/upload/v1768087568/moneo_uploads/u7bljg5swihbgj7yabi4.jpg"
                        alt="MONEO Promo Desktop"
                        className="hidden md:block w-full h-auto object-contain max-h-[80vh]"
                    />

                    {/* Mobile Image (Hidden on desktop) */}
                    <img
                        src="https://res.cloudinary.com/drqtmkfka/image/upload/v1768087317/moneo_uploads/ut594txdghvhwalbt6tv.jpg"
                        alt="MONEO Promo Mobile"
                        className="block md:hidden w-full h-auto object-contain max-h-[80vh]"
                    />

                    {/* Button Overlay (Mobile optimized) */}
                    <div className="absolute bottom-6 left-0 right-0 p-4 flex justify-center md:hidden">
                        <button
                            onClick={onClose}
                            className="w-full bg-white text-black font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-transform uppercase tracking-wider"
                        >
                            Закрыть
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
