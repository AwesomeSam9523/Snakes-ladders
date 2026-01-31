
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const prisma = require('../src/config/db');

async function main() {
  const fileName = process.argv[2] || 'QUESTIONS.xlsx';
  const filePath = path.resolve(__dirname, fileName);
  if (!fs.existsSync(filePath)) {   
    console.error('Excel file not found:', filePath);
    process.exit(1);
  }


  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length > 0) {
    console.log('Detected columns in first row:', Object.keys(rows[0]));
  } else {
    console.log('No rows found in the Excel file.');
    process.exit(1);
  }

  let imported = 0, skipped = 0;
  for (const row of rows) {
    // Trim all keys for robust matching
    const keys = Object.keys(row).reduce((acc, k) => {
      acc[k.trim().toLowerCase()] = k;
      return acc;
    }, {});

    const qNo = row[keys['question number']];
    const type = (row[keys['question type ']] || '').toUpperCase().trim();
    const text = row[keys['question']];
    const answer = row[keys['answer']];
    // Option columns
    const optionA = row[keys['option a']];
    const optionB = row[keys['option b']];
    const optionC = row[keys['option c']];
    const optionD = row[keys['option d']];

    if (!text || !type) {
      skipped++;
      console.log('Skipped row:', {text, type, row});
      continue;
    }

    // Prepare MCQ options as array if present
    let optionsArr = [];
    if (type === 'MCQ') {
      optionsArr = [optionA, optionB, optionC, optionD].filter(Boolean);
    }

    await prisma.question.create({
      data: {
        questionNumber: qNo ? String(qNo) : undefined,
        type,
        text,
        options: optionsArr.length ? optionsArr : undefined,
        correctAnswer: answer ? String(answer) : undefined,
      },
    });
    imported++;
  }

  console.log(`Imported: ${imported}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
