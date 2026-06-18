const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(
  __dirname,
  `..${process.env.LOCALISATION_FILES_SRC || '/src/shared/i18n'}`
);
const EN_PATH = path.join(MESSAGES_DIR, 'en.json');

const isStrict =
  process.argv.includes('--strict') ||
  process.env.I18N_VALIDATE_STRICT === '1' ||
  process.env.I18N_VALIDATE_STRICT === 'true';

function parseMessages(obj, prefix = '', res = {}) {
  Object.keys(obj).forEach((key) => {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      parseMessages(obj[key], currentKey, res);
    } else {
      res[currentKey] = obj[key];
    }
  });
  return res;
}

try {
  const enMessages = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const enParsed = parseMessages(enMessages);
  const referenceKeys = Object.keys(enParsed);

  const files = fs.readdirSync(MESSAGES_DIR).filter((f) => f !== 'en.json' && f.endsWith('.json'));

  let hasErrors = false;
  let hasWarnings = false;

  files.forEach((file) => {
    const currentMessages = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, file), 'utf8'));
    const currentParsed = parseMessages(currentMessages);

    const missingKeys = referenceKeys.filter((key) => !(key in currentParsed));
    const emptyKeys = referenceKeys.filter(
      (key) => key in currentParsed && String(currentParsed[key]).trim() === ''
    );

    if (missingKeys.length > 0 || emptyKeys.length > 0) {
      const label = isStrict ? 'Error' : 'Warning';
      const color = isStrict ? '\x1b[31m' : '\x1b[33m';
      console.error(`${color}\n[i18n ${label}] ${file}\x1b[0m`);

      missingKeys.forEach((k) => console.error(`  [MISSING] Отсутствует ключ: "${k}"`));
      emptyKeys.forEach((k) => console.error(`  [EMPTY] Пустое значение в ключе: "${k}"`));

      if (missingKeys.length > 0) hasWarnings = true;
      if (emptyKeys.length > 0) hasErrors = true;
    }
  });

  if (hasErrors || (isStrict && hasWarnings)) {
    const mode = isStrict ? 'strict' : 'warn+empty';
    console.error(
      `\x1b[31m\n[CRITICAL] i18n validation failed (${mode}). Run: npm run sync-i18n\x1b[0m`
    );
    process.exit(1);
  }

  if (hasWarnings) {
    console.warn(
      `\x1b[33m[i18n Warn] Missing keys detected (dev mode). Build continues. Run: npm run sync-i18n\x1b[0m`
    );
  } else {
    console.log('\x1b[32m[i18n Success] Все файлы локализации валидны и синхронизированы.\x1b[0m');
  }
} catch (err) {
  console.error('Ошибка при валидации локализации:', err);
  process.exit(1);
}
