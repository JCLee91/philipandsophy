'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { getImageUrl } from '@/constants/landing';

const images = [
    'PnS_1-1.webp',
    'PnS_1-2.webp',
    'PnS_1-3.webp',
    'PnS_1-4.webp',
    'PnS_1-5.webp',
];

export default function HeroImageSlider() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 4000); // Change image every 4 seconds

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-full aspect-[1170/2080] max-w-[1170px] mx-auto bg-black">
            <AnimatePresence mode="popLayout">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full"
                >
                    <Image
                        src={getImageUrl(`/image/landing/${images[currentIndex]}?v=1765966010154`)}
                        alt={`필립앤소피 메인 ${currentIndex + 1}`}
                        fill
                        className="object-cover"
                        priority={true} // Priority true for all to ensure early loading, or at least for the first few
                        sizes="(max-width: 500px) 100vw, 500px"
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
