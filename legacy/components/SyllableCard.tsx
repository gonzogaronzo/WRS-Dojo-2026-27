import React from 'react';
import { WRS_NEUTRAL_CARD_VISUALS } from '../wrsVisualTokens';

interface SyllableCardProps {
  text: string;
}

const SyllableCard: React.FC<SyllableCardProps> = ({ text }) => {
  return (
    <div
      data-wrs-visual="syllable-card"
      className="h-[112px] min-w-[210px] px-10 flex items-center justify-center shrink-0 select-none"
      style={{
        background: WRS_NEUTRAL_CARD_VISUALS.white,
        color: WRS_NEUTRAL_CARD_VISUALS.text,
        border: `2px solid ${WRS_NEUTRAL_CARD_VISUALS.border}`,
        borderRadius: WRS_NEUTRAL_CARD_VISUALS.radius,
        boxShadow: WRS_NEUTRAL_CARD_VISUALS.shadow,
        fontFamily: 'Arial, Helvetica, sans-serif'
      }}
    >
      <span className="text-[56px] font-semibold leading-none whitespace-nowrap">{text}</span>
    </div>
  );
};

export default SyllableCard;
