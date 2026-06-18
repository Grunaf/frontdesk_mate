const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(
  __dirname,
  `..${process.env.LOCALISATION_FILES_SRC || '/src/shared/i18n'}`
);
const EN_PATH = path.join(MESSAGES_DIR, 'en.json');
const RU_PATH = path.join(MESSAGES_DIR, 'ru.json');

/** Legacy HostelInfo.* → domains.hostel.* / pages.* */
const LEGACY_PREFIX_MAP = [
  ['HostelInfo.meta', 'domains.hostel.meta'],
  ['HostelInfo.timing', 'domains.hostel.timing'],
  ['HostelInfo.payment', 'domains.hostel.payment'],
  ['HostelInfo.rules', 'domains.hostel.rules'],
  ['HostelInfo.inside', 'domains.hostel.inside'],
  ['HostelInfo.tabs', 'pages.arrivalJourney.tabs'],
  ['Navigation', 'pages.navigation'],
];

const LEGACY_KEY_MAP = {
  'domains.hostel.inside.private.wifiCopyButton': 'HostelInfo.inside.private.wifiCopyBtn',
  'domains.hostel.inside.private.wifiCopiedButton': 'HostelInfo.inside.private.wifiCopiedBtn',
};

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

function remapLegacyFlat(flat) {
  const remapped = {};

  Object.entries(flat).forEach(([key, value]) => {
    let newKey = key;

    for (const [legacyPrefix, newPrefix] of LEGACY_PREFIX_MAP) {
      if (key === legacyPrefix || key.startsWith(`${legacyPrefix}.`)) {
        newKey = key.replace(legacyPrefix, newPrefix);
        break;
      }
    }

    remapped[newKey] = value;
  });

  Object.entries(LEGACY_KEY_MAP).forEach(([newKey, legacyKey]) => {
    if (legacyKey in flat && !(newKey in remapped)) {
      remapped[newKey] = flat[legacyKey];
    }
  });

  return remapped;
}

function setByPath(obj, pathKeys, value) {
  let current = obj;
  for (let i = 0; i < pathKeys.length - 1; i++) {
    const key = pathKeys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[pathKeys[pathKeys.length - 1]] = value;
}

function buildFromTemplate(template, translations) {
  const result = JSON.parse(JSON.stringify(template));

  Object.entries(translations).forEach(([flatKey, value]) => {
    if (typeof value === 'string' && value.trim()) {
      setByPath(result, flatKey.split('.'), value);
    }
  });

  return result;
}

try {
  const enMessages = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const enFlat = parseMessages(enMessages);

  let legacyFlat = {};
  if (fs.existsSync(RU_PATH)) {
    const existingRu = JSON.parse(fs.readFileSync(RU_PATH, 'utf8'));
    legacyFlat = parseMessages(existingRu);
  }

  const remapped = remapLegacyFlat(legacyFlat);
  const translations = {};

  Object.keys(enFlat).forEach((key) => {
    translations[key] = remapped[key] || enFlat[key];
  });

  const ruMessages = buildFromTemplate(enMessages, translations);

  fs.writeFileSync(RU_PATH, `${JSON.stringify(ruMessages, null, 2)}\n`, 'utf8');

  const translated = Object.keys(enFlat).filter(
    (key) => remapped[key] && remapped[key] !== enFlat[key]
  ).length;

  console.log(
    `\x1b[32m[sync-i18n] ru.json rebuilt from en.json (${translated} keys kept from legacy ru)\x1b[0m`
  );
} catch (err) {
  console.error('Ошибка при синхронизации локализации:', err);
  process.exit(1);
}
