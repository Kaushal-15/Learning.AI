/**
 * Extraction Verification Script
 * Tests extraction on:
 * 1. Sample PDF
 * 2. Sample DOCX
 * 3. Sample TXT
 * 4. Empty TXT
 * 5. Corrupt file
 * Also verifies calculateDifficulty with empty text (no divide-by-zero).
 */

const fs = require('fs');
const path = require('path');
const { extractTextFromBuffer, calculateDifficulty } = require('../services/fileProcessingService');

function createSamplePdf(text = 'Hello World from test PDF extraction.') {
  const content = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
  const streamLen = Buffer.byteLength(content);
  
  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
  const obj4 = `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${content}\nendstream\nendobj\n`;
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  
  const o1 = Buffer.byteLength(header);
  const o2 = o1 + Buffer.byteLength(obj1);
  const o3 = o2 + Buffer.byteLength(obj2);
  const o4 = o3 + Buffer.byteLength(obj3);
  const o5 = o4 + Buffer.byteLength(obj4);
  const startxref = o5 + Buffer.byteLength(obj5);
  
  const pad = (n) => String(n).padStart(10, '0');
  const xref = `xref\n0 6\n0000000000 65535 f \n${pad(o1)} 00000 n \n${pad(o2)} 00000 n \n${pad(o3)} 00000 n \n${pad(o4)} 00000 n \n${pad(o5)} 00000 n \n`;
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  
  return Buffer.from(header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer);
}

async function runTests() {
  console.log('--- Starting Extraction Tests ---');
  let passed = 0;
  let failed = 0;

  // 1. Sample PDF
  try {
    const pdfBuf = createSamplePdf('Learning.AI PDF Extraction Test Content');
    const pdfText = await extractTextFromBuffer(pdfBuf, 'application/pdf', 'sample.pdf');
    if (pdfText && pdfText.includes('Learning.AI PDF Extraction Test Content')) {
      console.log('✔ Sample PDF extraction passed');
      passed++;
    } else {
      console.error('✘ Sample PDF extraction failed: unexpected output', pdfText);
      failed++;
    }
  } catch (err) {
    console.error('✘ Sample PDF extraction threw error:', err.message);
    failed++;
  }

  // 2. Sample DOCX
  try {
    const fixturePath = path.join(__dirname, '../node_modules/mammoth/test/test-data/single-paragraph.docx');
    let docxBuf;
    if (fs.existsSync(fixturePath)) {
      docxBuf = fs.readFileSync(fixturePath);
    } else {
      // Fallback: minimal docx mock if mammoth test-data not present
      docxBuf = Buffer.from('PK\x03\x04test');
    }
    const docxText = await extractTextFromBuffer(
      docxBuf,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'sample.docx'
    );
    if (docxText && docxText.length > 0) {
      console.log('✔ Sample DOCX extraction passed');
      passed++;
    } else {
      console.error('✘ Sample DOCX extraction returned empty');
      failed++;
    }
  } catch (err) {
    console.error('✘ Sample DOCX extraction threw error:', err.message);
    failed++;
  }

  // 3. Sample TXT
  try {
    const txtBuf = Buffer.from('This is a test plain text document for dynamic learning quizzes.');
    const txtText = await extractTextFromBuffer(txtBuf, 'text/plain', 'sample.txt');
    if (txtText && txtText.includes('test plain text document')) {
      console.log('✔ Sample TXT extraction passed');
      passed++;
    } else {
      console.error('✘ Sample TXT extraction failed:', txtText);
      failed++;
    }
  } catch (err) {
    console.error('✘ Sample TXT extraction threw error:', err.message);
    failed++;
  }

  // 4. Empty TXT
  try {
    const emptyBuf = Buffer.from('');
    const emptyText = await extractTextFromBuffer(emptyBuf, 'text/plain', 'empty.txt');
    if (emptyText === '') {
      console.log('✔ Empty TXT extraction passed (returns empty string)');
      passed++;
    } else {
      console.error('✘ Empty TXT extraction failed: expected empty string but got', emptyText);
      failed++;
    }
  } catch (err) {
    console.error('✘ Empty TXT extraction threw error:', err.message);
    failed++;
  }

  // 5. Corrupt file
  try {
    const corruptBuf = Buffer.from('%PDF-1.4 Corrupted binary content garbage not a valid stream');
    let caught = false;
    try {
      const res = await extractTextFromBuffer(corruptBuf, 'application/pdf', 'corrupt.pdf');
      // If it parsed without text
      if (!res || res.trim() === '') {
        caught = true;
      }
    } catch {
      caught = true;
    }
    if (caught) {
      console.log('✔ Corrupt PDF file handled safely (threw error or yielded no text)');
      passed++;
    } else {
      console.error('✘ Corrupt file handling failed');
      failed++;
    }
  } catch (err) {
    console.error('✘ Corrupt file unexpected error:', err.message);
    failed++;
  }

  // 6. calculateDifficulty empty text check
  try {
    const diff1 = calculateDifficulty('');
    const diff2 = calculateDifficulty('   \n\t  ');
    const diff3 = calculateDifficulty(null);
    if (diff1 === 'basic' && diff2 === 'basic' && diff3 === 'basic') {
      console.log('✔ calculateDifficulty on empty/whitespace text passed without divide-by-zero');
      passed++;
    } else {
      console.error('✘ calculateDifficulty returned unexpected value for empty text:', { diff1, diff2, diff3 });
      failed++;
    }
  } catch (err) {
    console.error('✘ calculateDifficulty threw error on empty text:', err.message);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
