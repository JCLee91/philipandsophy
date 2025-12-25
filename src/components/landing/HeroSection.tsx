'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
// @ts-ignore
import { decomposeHangul, composeHangul } from 'hangul-typing-animation';

interface HeroSectionProps {
    bgImage1?: string;
    bgImage2?: string;
}

const CONSTANTS = {
    TYPING_SPEED: 100, // ms per char (or jamo)
    DELETING_SPEED: 50,
    PAUSE_TIME: 2000,
    WORD_PAUSE: 500,
};

export default function HeroSection({
    bgImage1 = '/image/landing/hero_bg_1.webp?v=20251225',
    bgImage2 = '/image/landing/hero_bg_2.png',
}: HeroSectionProps) {
    const [displayString, setDisplayString] = useState('');

    // Words to cycle through
    const words = [
        '전시회를',
        '독서를',
        '영화를',
        '뮤지컬을',
        '와인파티를',
        '콘서트를',
        '보드게임을'
    ];

    useEffect(() => {
        let isCancelled = false;

        const runTypingLoop = async () => {
            let wordIndex = 0;

            while (!isCancelled) {
                const currentWord = words[wordIndex % words.length];

                // 1. Decompose the word into Jamos
                // decomposeHangul returns array of Jamos: ['ㅈ', 'ㅓ', 'ㄴ', ...]
                const jamos = decomposeHangul(currentWord);

                // 2. Typing Phase (Append Jamos)
                // We want to simulate typing: 'ㅈ' -> '저' -> '전'
                // Logic: incrementally build jamo array
                for (let i = 1; i <= jamos.length; i++) {
                    if (isCancelled) return;
                    const currentBuffer = jamos.slice(0, i);
                    setDisplayString(composeHangul(currentBuffer));
                    await new Promise(r => setTimeout(r, CONSTANTS.TYPING_SPEED));
                }

                // 3. Pause
                if (isCancelled) return;
                await new Promise(r => setTimeout(r, CONSTANTS.PAUSE_TIME));

                // 4. Deleting Phase (Remove Jamos)
                // We remove one by one (or strictly char by char? Jamo by jamo looks cooler)
                for (let i = jamos.length - 1; i >= 0; i--) {
                    if (isCancelled) return;
                    const currentBuffer = jamos.slice(0, i);
                    setDisplayString(composeHangul(currentBuffer));
                    await new Promise(r => setTimeout(r, CONSTANTS.DELETING_SPEED));
                }

                // 5. Next Word
                if (isCancelled) return;
                wordIndex++;
                await new Promise(r => setTimeout(r, CONSTANTS.WORD_PAUSE));
            }
        };

        runTypingLoop();

        return () => { isCancelled = true; };
    }, []);

    return (
        <div className="relative w-full overflow-hidden bg-black select-none">
            {/* Background Image Container */}
            {/* Mobile: use hero_bg_1 (portrait). Desktop: maybe scale it or use responsive images? 
           For now, using hero_bg_1 as simple cover as per request. */}
            <div className="relative w-full aspect-[1170/2400] md:min-h-[90vh] md:max-h-[1000px] md:aspect-auto">
                <Image
                    src={bgImage1}
                    alt="Hero Background"
                    fill
                    priority
                    className="object-cover object-top"
                    quality={100}
                />

                {/* Gradient Overlay Removed */}\r
            </div>

            {/* Text Content Overlay */}
            {/* Text Content Overlay */}
            {/* Text Content Overlay */}
            <div className="absolute top-[28%] md:top-[30%] left-8 md:left-12 w-full z-10">
                {/* Script Header Removed (Present in Image) */}

                {/* Content Container - Left Aligned */}
                <div className="text-left">
                    {/* Main Title */}
                    <h1 className="text-[40px] md:text-6xl lg:text-7xl text-white leading-[1.35] animate-fade-in-up drop-shadow-lg paperlogy-font"
                        style={{ animationDelay: '0.4s', animationFillMode: 'both', wordBreak: 'keep-all', marginBottom: '24px' }}>
                        서로를 읽으면서<br />
                        시작되는 인연
                    </h1>

                    {/* Subtitle with Typing Effect */}
                    <div className="text-[17px] md:text-2xl text-white/95 font-light leading-relaxed animate-fade-in-up scoredream-font"
                        style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
                        <p className="mb-2 tracking-wide font-normal">2주 동안 나를 기록하고</p>
                        <div className="flex items-center justify-start gap-1.5 md:gap-2">
                            <span className="font-normal">함께</span>
                            <span className="font-semibold text-white relative inline-flex items-center">
                                {displayString}
                                <span className="ml-[2px] w-[2px] h-[1.2em] bg-white animate-blink"></span>
                            </span>
                            <span className="font-normal">즐겨요</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
          /* Animations */
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
             animation: fade-in-up 1s ease-out;
          }
          
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          .animate-blink {
            animation: blink 1s step-end infinite;
          }
          
          .font-karina {
            font-family: 'Karina', cursive;
          }
          
          .paperlogy-font {
            font-family: 'Paperlogy-4Regular', sans-serif !important;
          }
          
          .scoredream-font,
          .scoredream-font * {
            font-family: 'S-CoreDream-3Light', sans-serif !important;
          }
        `}</style>
        </div>
    );
}
