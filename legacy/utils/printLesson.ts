
import { Lesson, GroupProfile } from '../types';

export const printLessonToNewWindow = (lesson: Lesson, group?: GroupProfile) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the lesson scroll.');
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>WRS Lesson Scroll - Step ${lesson.step}.${lesson.substep}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:ital,wght@0,900;1,900&display=swap');
    
    @page {
      size: letter portrait;
      margin: 0.5in;
    }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: black;
      background: white;
      margin: 0;
      padding: 0;
      line-height: 1.4;
    }

    .scroll-container {
      width: 100%;
      max-width: 7.5in;
      margin: 0 auto;
    }

    header {
      border-bottom: 6px solid black;
      padding-bottom: 20px;
      margin-bottom: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .header-title h1 {
      font-family: 'Playfair Display', serif;
      font-size: 42px;
      font-weight: 900;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: -1px;
    }

    .header-meta {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 5px;
    }

    .squad-box {
      text-align: right;
    }

    .squad-name {
      font-size: 24px;
      font-weight: 900;
      border-bottom: 3px solid black;
      padding-bottom: 2px;
      margin-bottom: 2px;
      min-width: 200px;
      display: inline-block;
    }

    .squad-label {
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 3px;
      color: #666;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }

    section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    h3 {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      border-bottom: 1px solid black;
      padding-bottom: 5px;
      margin-bottom: 15px;
    }

    .drill-box {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .drill-item {
      font-weight: 900;
      border: 1px solid #ddd;
      padding: 4px 8px;
      border-radius: 4px;
      background: #f9f9f9;
    }

    .notes-box {
      font-size: 13px;
      font-style: italic;
      background: #fcfcfc;
      border: 1px dashed #ccc;
      padding: 15px;
      border-radius: 8px;
      min-height: 80px;
    }

    .word-list {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .sentence-list {
      padding-left: 20px;
      font-size: 14px;
      font-weight: 500;
    }

    .sentence-list li {
      margin-bottom: 12px;
    }

    .hfw-list {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      font-weight: 900;
      color: #991b1b;
    }

    .dictation-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 20px;
    }

    .dictation-item {
      border-bottom: 1px solid #eee;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
    }

    .dictation-label {
      font-size: 9px;
      font-weight: 900;
      color: #ccc;
      text-transform: uppercase;
    }

    .checkbox {
      width: 18px;
      height: 18px;
      border: 2px solid black;
      border-radius: 3px;
    }

    .sound-boxes {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
    }

    .sound-box {
      border: 2px solid black;
      height: 80px;
      background: #fcfcfc;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 10px;
    }

    .page-break {
      page-break-before: always;
      margin-top: 40px;
    }

    footer {
      margin-top: 60px;
      border-top: 2px solid black;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .verification {
      font-size: 9px;
      font-weight: 900;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .signature-line {
      width: 200px;
      border-bottom: 1px solid #ccc;
      margin-bottom: 5px;
    }

    .kanji {
      font-size: 48px;
      opacity: 0.1;
      font-family: serif;
    }

    @media print {
      .print-hidden {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="scroll-container">
    <div class="print-hidden" style="padding: 20px; background: #f0f0f0; border-bottom: 1px solid #ccc; margin-bottom: 20px; display: flex; justify-content: center; gap: 20px;">
      <button onclick="window.print()" style="padding: 10px 20px; background: #b91c1c; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 900; text-transform: uppercase;">Print This Scroll</button>
      <button onclick="window.close()" style="padding: 10px 20px; background: #333; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 900; text-transform: uppercase;">Close Window</button>
    </div>
    <header>
      <div class="header-title">
        <h1>LESSON SCROLL</h1>
        <div class="header-meta">
          STEP ${lesson.step}.${lesson.substep} &bull; MISSION PROTOCOL &bull; DATE: ________
        </div>
      </div>
      <div class="squad-box">
        <div class="squad-name">${group?.name || '________________'}</div>
        <div class="squad-label">GROUP</div>
      </div>
    </header>

    <div class="grid">
      <div class="left-col">
        <section>
          <h3>1 & 6. Sound Drills</h3>
          <div class="drill-box">
            ${lesson.quickDrill.map(s => `<div class="drill-item">${s}</div>`).join('')}
          </div>
        </section>

        <section>
          <h3>2. Teach Concepts</h3>
          <div class="notes-box">
            ${lesson.conceptNotes || 'Instructor notes...'}
          </div>
        </section>

        <section>
          <h3>3. Word Cards</h3>
          <div class="word-list">
            ${lesson.wordCards.map(c => `<span>${c.text}${c.type === 'nonsense' ? '*' : ''}</span>`).join(', ')}
          </div>
        </section>
      </div>

      <div class="right-col">
        <section>
          <h3>5. Sentence Reading</h3>
          <ol class="sentence-list">
            ${lesson.sentences.map(s => `<li>${s}</li>`).join('')}
          </ol>
        </section>

        <section>
          <h3>7. Spelling Concept</h3>
          <div class="notes-box">
            ${lesson.conceptNotes7 || 'Spelling logic...'}
          </div>
        </section>

        <section>
          <h3>Sight Words (HFW)</h3>
          <div class="hfw-list">
            ${lesson.hfwList.map(w => `<span>${w}</span>`).join('')}
          </div>
        </section>
      </div>
    </div>

    <div class="page-break"></div>

    <section style="margin-top: 40px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <div>
          <h2 style="font-size: 32px; font-weight: 900; margin: 0; text-transform: uppercase;">PART 8: WRITTEN WORK</h2>
          <p style="font-size: 9px; font-weight: 900; color: #999; letter-spacing: 3px; margin: 5px 0 0 0;">OFFICIAL MASTERY RECORD</p>
        </div>
      </div>

      <div class="dictation-grid">
        <div class="dictation-col">
          <section>
            <h3>1. Sounds</h3>
            <div class="sound-boxes">
              <div class="sound-box"></div>
              <div class="sound-box"></div>
              <div class="sound-box"></div>
              <div class="sound-box"></div>
              <div class="sound-box"></div>
            </div>
          </section>

          <section>
            <h3>3 & 4. Elements / Nonsense</h3>
            ${[1, 2, 3, 4, 5].map(i => `
              <div class="dictation-item">
                <span class="dictation-label">Entry ${i}</span>
                <div class="checkbox"></div>
              </div>
            `).join('')}
          </section>
        </div>

        <div class="dictation-col">
          <section>
            <h3>2. Real Words</h3>
            ${[1, 2, 3, 4, 5].map(i => `
              <div class="dictation-item">
                <span class="dictation-label">Entry ${i}</span>
                <div style="display: flex; gap: 10px;">
                  <div class="checkbox"></div>
                  <div class="checkbox"></div>
                </div>
              </div>
            `).join('')}
          </section>

          <section>
            <h3>5 & 6. Sentences</h3>
            <div style="margin-top: 20px;">
              <div style="border-bottom: 1px solid #eee; height: 40px; margin-bottom: 20px;"></div>
              <div style="border-bottom: 1px solid #eee; height: 40px; margin-bottom: 20px;"></div>
            </div>
          </section>
        </div>
      </div>
    </section>

    <footer>
      <div class="verification">
        <div class="signature-line"></div>
        INSTRUCTOR VERIFICATION &bull; WRS DOJO PROTOCOL
      </div>
      <div class="kanji">道</div>
    </footer>
  </div>

  <script>
    window.onload = () => {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
