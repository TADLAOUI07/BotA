/**
 * Logger.js — Module de logging et monitoring
 * Journal d'activité, statistiques, alertes.
 */

/**
 * Enregistre un événement dans le log.
 * @param {string} type - Type d'événement (SCAN, SENT, ERROR, etc.)
 * @param {string} message - Description
 */
function logEvent(type, message) {
  var timestamp = new Date().toISOString();
  var safeMessage = redactLogMessage_(message);
  var logEntry = {
    timestamp: timestamp,
    type: type,
    message: safeMessage
  };

  // Log dans la console Apps Script
  console.log('[' + type + '] ' + safeMessage);

  // Stocker dans les propriétés (journal rotatif)
  appendToLog_(logEntry);
}

function isSupportDebugEnabled_() {
  return PropertiesService.getScriptProperties().getProperty('DEBUG_SUPPORT') === 'true';
}

function supportDebug_(message) {
  logEvent('SUPPORT_DEBUG', message);

  if (!isSupportDebugEnabled_()) return;

  try {
    sendTelegramMessage('🧪 <b>DEBUG SUPPORT</b>\n' + escapeHtml(String(message)));
  } catch (e) {
    console.log('[SUPPORT_DEBUG_TELEGRAM_ERROR] ' + e.message);
  }
}

function enableSupportDebug() {
  PropertiesService.getScriptProperties().setProperty('DEBUG_SUPPORT', 'true');
  sendTelegramMessage('🧪 Debug support activé. Clique Draft sur un nouvel email, les étapes seront envoyées ici.');
}

function disableSupportDebug() {
  var store = PropertiesService.getScriptProperties();
  var wasEnabled = store.getProperty('DEBUG_SUPPORT') === 'true';
  store.deleteProperty('DEBUG_SUPPORT');

  // Avoid Telegram spam when /debug_off is retried or sent multiple times.
  if (wasEnabled) {
    sendTelegramMessage('🧪 Debug support désactivé.');
  }
}

/**
 * Récupère les statistiques du jour.
 * @returns {Object} Stats
 */
function getTodayStats() {
  var today = new Date().toISOString().split('T')[0];
  var statsKey = 'stats_' + today;
  var raw = PropertiesService.getScriptProperties().getProperty(statsKey);

  if (raw) {
    return JSON.parse(raw);
  }

  return {
    date: today,
    processed: 0,
    approved: 0,
    drafted: 0,
    ignored: 0,
    errors: 0,
    campaignsSent: 0
  };
}

/**
 * Incrémente un compteur dans les stats du jour.
 * @param {string} field - Nom du champ (processed, approved, etc.)
 * @param {number} [amount] - Quantité (défaut: 1)
 */
function incrementStat(field, amount) {
  var stats = getTodayStats();
  stats[field] = (stats[field] || 0) + (amount || 1);

  var today = new Date().toISOString().split('T')[0];
  PropertiesService.getScriptProperties().setProperty(
    'stats_' + today,
    JSON.stringify(stats)
  );
}

/**
 * Récupère les logs récents.
 * @param {number} [limit] - Nombre d'entrées (défaut: 50)
 * @returns {Object[]} Entrées de log
 */
function getRecentLogs(limit) {
  limit = limit || 50;
  var raw = PropertiesService.getScriptProperties().getProperty('activity_log');
  if (!raw) return [];

  var logs = JSON.parse(raw);
  return logs.slice(-limit);
}

/**
 * Nettoie les logs anciens (plus de 7 jours).
 * À exécuter via trigger quotidien.
 */
function cleanupOldLogs() {
  var raw = PropertiesService.getScriptProperties().getProperty('activity_log');
  if (!raw) return;

  var logs = JSON.parse(raw);
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  var cutoffStr = cutoff.toISOString();

  var filtered = logs.filter(function (entry) {
    return entry.timestamp >= cutoffStr;
  });

  PropertiesService.getScriptProperties().setProperty(
    'activity_log',
    JSON.stringify(filtered)
  );

  // Nettoyer aussi les anciennes stats
  cleanupOldStats_();

  logEvent('CLEANUP', 'Removed ' + (logs.length - filtered.length) + ' old log entries');
}

// --- Internals ---

function redactLogMessage_(message) {
  if (message === null || message === undefined) return '';

  var safe = String(message);
  var secretValues = [];

  if (typeof CONFIG !== 'undefined') {
    [
      'TG_TOKEN',
      'WEBHOOK_KEY',
      'SHOPIFY_TOKEN',
      'SENDGRID_API_KEY'
    ].forEach(function (key) {
      if (CONFIG[key]) secretValues.push(CONFIG[key]);
    });
  }

  secretValues.forEach(function (secret) {
    safe = safe.split(secret).join('[REDACTED_SECRET]');
  });

  safe = safe.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
  safe = safe.replace(/(key|token|api_key|password|secret)=([^&\s]+)/gi, '$1=[REDACTED_SECRET]');
  safe = safe.replace(/(Bearer\s+)[A-Za-z0-9._~+\/=-]+/gi, '$1[REDACTED_SECRET]');

  return safe;
}

function appendToLog_(entry) {
  var raw = PropertiesService.getScriptProperties().getProperty('activity_log');
  var logs = raw ? JSON.parse(raw) : [];

  logs.push(entry);

  // Garder les 500 dernières entrées max (limite taille Script Properties)
  if (logs.length > 500) {
    logs = logs.slice(-500);
  }

  PropertiesService.getScriptProperties().setProperty(
    'activity_log',
    JSON.stringify(logs)
  );
}

function cleanupOldStats_() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  Object.keys(props).forEach(function (key) {
    if (key.indexOf('stats_') === 0) {
      var dateStr = key.replace('stats_', '');
      if (dateStr < cutoff.toISOString().split('T')[0]) {
        PropertiesService.getScriptProperties().deleteProperty(key);
      }
    }
  });
}
