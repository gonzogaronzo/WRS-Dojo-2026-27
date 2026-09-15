import React from 'react';
import TeachConceptsLegacy from './TeachConceptsLegacy';
import Part7SpellingRunner, { part7SpellingItemsFromData } from './Part7SpellingRunner';

type TeachConceptsProps = React.ComponentProps<typeof TeachConceptsLegacy>;

const TeachConcepts: React.FC<TeachConceptsProps> = (props) => {
  if (props.isSpelling) {
    const part7Data = props.lesson.runtimePlan?.parts.find(part => part.part === 7)?.data;
    const spellingItems = part7SpellingItemsFromData(part7Data);
    if (spellingItems) {
      return (
        <Part7SpellingRunner
          items={spellingItems}
          activeIndex={props.activeCipherIdx}
          onUpdateActiveIndex={props.onUpdateCipherIdx}
          revealedItems={props.cipherResults as Record<number, unknown> | undefined}
          onUpdateRevealedItems={items => props.onUpdateCipherResults?.(items as any)}
          readOnly={props.readOnly}
        />
      );
    }
  }

  return <TeachConceptsLegacy {...props} />;
};

export default TeachConcepts;
