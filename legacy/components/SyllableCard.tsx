import React from 'react';

interface SyllableCardProps {
  text: string;
}

const SyllableCard: React.FC<SyllableCardProps> = ({ text }) => {
  return (
    <div className="
      bg-[#FFF8E7] 
      border-2 border-[#E6DFC0]
      rounded-[2.5rem]
      px-12 py-10
      min-w-[180px] 
      flex items-center justify-center 
      shadow-2xl
      border-b-[12px]
      relative
      transform hover:-translate-y-2 transition-transform duration-500
    ">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 pointer-events-none rounded-[2.5rem]"></div>
      <span className="text-8xl md:text-9xl font-black text-stone-900 font-serif tracking-tighter leading-none relative z-10">
        {text}
      </span>
    </div>
  );
};

export default SyllableCard;