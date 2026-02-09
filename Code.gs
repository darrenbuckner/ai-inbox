/**
 * ============================================================
 * AI INBOX v1
 * A curated email channel for AI-powered daily briefs
 * ============================================================
 * 
 * Instead of giving AI full access to your inbox, you forward
 * only the emails you want processed to a dedicated AI inbox.
 * This script watches that inbox, processes emails through
 * Claude, and sends you daily briefs with insights and patterns.
 * 
 * QUICK START:
 * 1. Create a new Gmail account for your AI inbox
 * 2. Open script.google.com in that account
 * 3. Create a new project, paste this entire file
 * 4. Run the setup() function
 * 5. Follow the prompts to configure everything
 * 6. Start forwarding emails!
 * 
 * Full guide: https://github.com/darrenbuckner/ai-inbox
 * 
 * Created by Darren Buckner / Capability Lab
 * https://capabilitylab.com
 * ============================================================
 */

// ============================================================
// SETUP WIZARD — Run this first!
// ============================================================

/**
 * Interactive setup wizard. Run this once to configure everything.
 * Go to Run > setup in the Apps Script editor.
 */
function setup() {
  const ui = SpreadsheetApp.getUi ? SpreadsheetApp.getUi() : null;
  const props = PropertiesService.getScriptProperties();
  
  // Step 1: Welcome
  showPrompt_(
    '🤖 AI Inbox Setup (Step 1 of 6)',
    'Welcome! This wizard will configure your AI Inbox.\n\n' +
    'You\'ll need:\n' +
    '• An Anthropic API key (from console.anthropic.com)\n' +
    '• Your primary email address (where briefs will be sent)\n\n' +
    'Press OK to continue.',
    true // OK only
  );
  
  // Step 2: API Key
  const apiKey = showPrompt_(
    '🔑 API Key (Step 2 of 6)',
    'Enter your Anthropic API key.\n\n' +
    'Get one at: https://console.anthropic.com/settings/keys\n\n' +
    'Your key is stored securely in this project\'s Script Properties ' +
    'and never leaves your Google account.'
  );
  if (!apiKey) return abortSetup_();
  props.setProperty('CLAUDE_API_KEY', apiKey.trim());
  
  // Step 3: Recipient email
  const recipientEmail = showPrompt_(
    '📧 Your Email (Step 3 of 6)',
    'Enter your PRIMARY email address.\n\n' +
    'This is where your daily briefs and urgent alerts will be sent.\n' +
    '(Not the AI inbox address — your real email.)'
  );
  if (!recipientEmail) return abortSetup_();
  props.setProperty('BRIEF_RECIPIENT', recipientEmail.trim());
  
  // Step 4: Create context log sheet
  showPrompt_(
    '📊 Context Log (Step 4 of 6)',
    'The AI Inbox keeps a running log of patterns and insights.\n' +
    'A new Google Sheet will be created automatically for this.\n\n' +
    'Press OK to create it.',
    true
  );
  
  const sheet = SpreadsheetApp.create('AI Inbox — Context Log');
  const sheetId = sheet.getId();
  props.setProperty('CONTEXT_SHEET_ID', sheetId);
  
  // Initialize the sheet with headers
  const activeSheet = sheet.getActiveSheet();
  activeSheet.appendRow(['Date', 'Email Count', 'Key Takeaways', 'Senders', 'Topics']);
  activeSheet.setFrozenRows(1);
  activeSheet.setColumnWidth(3, 400);
  activeSheet.setColumnWidth(4, 200);
  activeSheet.setColumnWidth(5, 200);
  
  Logger.log(`Context log sheet created: ${sheetId}`);
  
  // Step 5: Personalization
  const priorities = showPrompt_(
    '🎯 Your Priorities (Step 5 of 6)',
    'What should your AI watch for? List your current priorities,\n' +
    'projects, or focus areas — one per line.\n\n' +
    'Examples:\n' +
    '• Client project for Acme Corp\n' +
    '• Job search in product management\n' +
    '• Kids\' school logistics\n' +
    '• Side project launch\n' +
    '• Investment portfolio monitoring\n\n' +
    'These help the AI connect dots across your emails.'
  );
  if (!priorities) return abortSetup_();
  props.setProperty('USER_PRIORITIES', priorities.trim());
  
  // Step 5b: Communication style
  const briefStyle = showPrompt_(
    '✍️ Brief Style (Step 5b of 6)',
    'How do you want your daily briefs?\n\n' +
    'Options (type one):\n' +
    '• concise — Just the essentials, bullet-style\n' +
    '• detailed — Full summaries with context\n' +
    '• executive — High-level with action items only\n\n' +
    'Or describe your own preference in a sentence.'
  );
  props.setProperty('BRIEF_STYLE', (briefStyle || 'concise').trim());
  
  // Step 6: Set up triggers
  showPrompt_(
    '⏰ Schedule (Step 6 of 6)',
    'Setting up your schedule:\n\n' +
    '• Daily brief: Every morning at 6:00 AM\n' +
    '• Urgent check: Every hour\n\n' +
    'You can adjust these later in Triggers (clock icon in sidebar).\n\n' +
    'Press OK to activate.',
    true
  );
  
  setupTriggers();
  
  // Done!
  showPrompt_(
    '✅ Setup Complete!',
    'Your AI Inbox is ready!\n\n' +
    'Context log: ' + sheet.getUrl() + '\n\n' +
    'NEXT STEPS:\n' +
    '1. Forward a few test emails to this Gmail account\n' +
    '2. Run testRun() to see your first brief\n' +
    '3. Set up auto-forwarding rules in your primary inbox\n' +
    '   (see the README for instructions)\n\n' +
    'To re-run setup: Run > setup\n' +
    'To test: Run > testRun\n' +
    'To view settings: Run > viewSettings',
    true
  );
}

/**
 * Display current settings (for debugging / verification).
 */
function viewSettings() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const safe = Object.entries(props).map(([k, v]) => {
    if (k === 'CLAUDE_API_KEY') return `${k}: ${v.substring(0, 10)}...${v.slice(-4)}`;
    return `${k}: ${v}`;
  }).join('\n');
  
  Logger.log('=== Current Settings ===\n' + safe);
  
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert('AI Inbox Settings', safe, ui.ButtonSet.OK);
  } catch (e) {
    // Running headless, log only
  }
}

/**
 * Reset all settings and triggers.
 */
function resetAll() {
  const props = PropertiesService.getScriptProperties();
  props.deleteAllProperties();
  
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  
  Logger.log('All settings and triggers cleared. Run setup() to reconfigure.');
}

// ============================================================
// SETUP HELPERS
// ============================================================

function showPrompt_(title, message, okOnly) {
  try {
    const ui = SpreadsheetApp.getUi();
    if (okOnly) {
      ui.alert(title, message, ui.ButtonSet.OK);
      return true;
    }
    const result = ui.prompt(title, message, ui.ButtonSet.OK_CANCEL);
    if (result.getSelectedButton() === ui.Button.CANCEL) return null;
    return result.getResponseText();
  } catch (e) {
    // Fallback for running without UI (e.g., from script editor directly)
    Logger.log(`${title}\n${message}`);
    return null;
  }
}

function abortSetup_() {
  Logger.log('Setup cancelled.');
  try {
    SpreadsheetApp.getUi().alert('Setup cancelled. Run setup() again when ready.');
  } catch (e) {}
}

// ============================================================
// CONFIGURATION LOADER
// ============================================================

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  const config = {
    CLAUDE_API_KEY: props.getProperty('CLAUDE_API_KEY'),
    BRIEF_RECIPIENT: props.getProperty('BRIEF_RECIPIENT'),
    CONTEXT_SHEET_ID: props.getProperty('CONTEXT_SHEET_ID'),
    USER_PRIORITIES: props.getProperty('USER_PRIORITIES') || '',
    BRIEF_STYLE: props.getProperty('BRIEF_STYLE') || 'concise',
    SLACK_WEBHOOK_URL: props.getProperty('SLACK_WEBHOOK_URL') || '',
    MODEL: 'claude-sonnet-4-5-20250929',
    CONTEXT_WINDOW: 20,
    MAX_EMAILS_PER_RUN: 30,
  };
  
  if (!config.CLAUDE_API_KEY || !config.BRIEF_RECIPIENT) {
    throw new Error('AI Inbox not configured. Run setup() first.');
  }
  
  return config;
}

// ============================================================
// SYSTEM PROMPT BUILDER
// ============================================================

function buildSystemPrompt_(config) {
  const prioritiesBlock = config.USER_PRIORITIES
    ? `\nThe user's current priorities and focus areas:\n${config.USER_PRIORITIES}\n\nConnect emails to these priorities when relevant.`
    : '';
  
  const styleBlock = {
    'concise': 'Be extremely concise. Bullet points, minimal prose. Just the signal.',
    'detailed': 'Provide full summaries with relevant context and quotes from emails.',
    'executive': 'High-level overview only. Focus on decisions needed and action items.',
  }[config.BRIEF_STYLE] || `User preference: ${config.BRIEF_STYLE}`;
  
  return `You are an AI email analyst. You process emails from a curated inbox — every email here was intentionally shared with you by the user, so treat everything as relevant.

Your job:
1. Flag anything time-sensitive or requiring action within 48 hours
2. Summarize everything else concisely
3. Track patterns across emails (reference the context log provided)
4. Note connections between emails and the user's known priorities
5. When you spot a cross-email pattern or insight, call it out
6. If an email looks like it needs a reply and hasn't gotten one, flag it
${prioritiesBlock}

Format your response as a morning brief using this structure:

🔴 NEEDS ATTENTION (time-sensitive, requires action)
📊 PATTERNS & INSIGHTS (cross-email observations, only if you have real ones)
📬 SUMMARY (categorized overview of all emails)
💡 SUGGESTIONS (optional — only if genuinely useful)

Style: ${styleBlock}

If there's nothing urgent, say so — don't manufacture urgency. If there are no real patterns yet, skip that section. Be useful, not performative.`;
}

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Main function: Process new emails and generate a daily brief.
 * Runs on a daily trigger (default: 6:00 AM).
 */
function generateDailyBrief() {
  const config = getConfig_();
  const emails = getUnreadEmails_(config);
  
  if (emails.length === 0) {
    Logger.log('No new emails to process.');
    return;
  }
  
  const context = getRecentContext_(config);
  const systemPrompt = buildSystemPrompt_(config);
  const briefContent = callClaude_(emails, context, systemPrompt, config);
  
  if (briefContent) {
    sendBriefEmail_(briefContent, emails.length, config);
    markEmailsAsRead_(emails);
    logContext_(briefContent, emails, config);
  }
}

/**
 * Urgent check: Quick scan for time-sensitive items.
 * Runs on an hourly trigger.
 */
function checkUrgent() {
  const config = getConfig_();
  const emails = getUnreadEmails_(config);
  
  if (emails.length === 0) return;
  
  const urgentPrompt = `Quickly scan these emails. ONLY respond if something is genuinely urgent 
(needs action in the next few hours, or is a time-sensitive opportunity that would be missed).
If nothing is urgent, respond with exactly: "NONE"
If something IS urgent, respond with a brief 1-2 sentence alert explaining what and why.`;
  
  const response = callClaude_(emails, '', urgentPrompt, config);
  
  if (response && response.trim() !== 'NONE') {
    sendUrgentAlert_(response, config);
    // Don't mark as read — the daily brief should still pick them up
  }
}

// ============================================================
// EMAIL FUNCTIONS
// ============================================================

function getUnreadEmails_(config) {
  const threads = GmailApp.search('is:unread', 0, config.MAX_EMAILS_PER_RUN);
  const emails = [];
  
  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(msg => {
      if (msg.isUnread()) {
        emails.push({
          id: msg.getId(),
          threadId: thread.getId(),
          from: msg.getFrom(),
          to: msg.getTo(),
          cc: msg.getCc() || '',
          subject: msg.getSubject(),
          date: msg.getDate().toISOString(),
          body: extractBody_(msg.getPlainBody() || msg.getBody()),
          labels: thread.getLabels().map(l => l.getName()),
        });
      }
    });
  });
  
  Logger.log(`Found ${emails.length} unread emails.`);
  return emails;
}

function extractBody_(body) {
  if (!body) return '[empty body]';
  
  // Strip HTML if plain text wasn't available
  let clean = body.replace(/<[^>]*>/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim();
  
  // Remove common email footers/signatures (basic heuristic)
  const sigMarkers = ['--\n', '\n___', 'Sent from my iPhone', 'Sent from my Android'];
  for (const marker of sigMarkers) {
    const idx = clean.indexOf(marker);
    if (idx > 100) { // Only trim if there's substantial content before the marker
      clean = clean.substring(0, idx) + '\n[signature removed]';
      break;
    }
  }
  
  // Truncate long emails
  const MAX_CHARS = 2000;
  if (clean.length > MAX_CHARS) {
    clean = clean.substring(0, MAX_CHARS) + '\n[... truncated]';
  }
  
  return clean;
}

function markEmailsAsRead_(emails) {
  const threadIds = [...new Set(emails.map(e => e.threadId))];
  threadIds.forEach(id => {
    try {
      const thread = GmailApp.getThreadById(id);
      if (thread) thread.markRead();
    } catch (e) {
      Logger.log(`Could not mark thread ${id} as read: ${e.message}`);
    }
  });
}

// ============================================================
// CLAUDE API
// ============================================================

function callClaude_(emails, context, systemPrompt, config) {
  const emailBlock = emails.map((e, i) => {
    return `--- Email ${i + 1} ---
From: ${e.from}
To: ${e.to}${e.cc ? '\nCC: ' + e.cc : ''}
Subject: ${e.subject}
Date: ${e.date}
Labels: ${e.labels.join(', ') || 'none'}
Body:
${e.body}`;
  }).join('\n\n');
  
  let userMessage = `Here are ${emails.length} new emails from my curated AI inbox:\n\n${emailBlock}`;
  
  if (context) {
    userMessage += `\n\n--- Recent Context Log (patterns from previous briefs) ---\n${context}`;
  }
  
  const payload = {
    model: config.MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage }
    ],
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    
    const data = JSON.parse(response.getContentText());
    
    if (data.error) {
      Logger.log(`Claude API error: ${JSON.stringify(data.error)}`);
      return null;
    }
    
    const text = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');
    
    return text;
    
  } catch (err) {
    Logger.log(`API call failed: ${err.message}`);
    return null;
  }
}

// ============================================================
// OUTPUT FUNCTIONS
// ============================================================

function sendBriefEmail_(content, emailCount, config) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  
  const subject = `AI Brief — ${today} (${emailCount} emails)`;
  
  GmailApp.sendEmail(
    config.BRIEF_RECIPIENT,
    subject,
    content,
    {
      name: 'AI Inbox',
      htmlBody: formatAsHtml_(content),
    }
  );
  
  Logger.log(`Brief sent: ${subject}`);
}

function sendUrgentAlert_(content, config) {
  GmailApp.sendEmail(
    config.BRIEF_RECIPIENT,
    '🔴 AI Inbox — Urgent Flag',
    content,
    { name: 'AI Inbox' }
  );
  
  if (config.SLACK_WEBHOOK_URL) {
    try {
      UrlFetchApp.fetch(config.SLACK_WEBHOOK_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ text: `🔴 *AI Inbox Urgent*\n${content}` }),
      });
    } catch (err) {
      Logger.log(`Slack alert failed: ${err.message}`);
    }
  }
  
  Logger.log('Urgent alert sent.');
}

function formatAsHtml_(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  
  // Bold section headers
  html = html.replace(/(🔴[^<]*)/g, '<strong>$1</strong>');
  html = html.replace(/(📊[^<]*)/g, '<strong>$1</strong>');
  html = html.replace(/(📬[^<]*)/g, '<strong>$1</strong>');
  html = html.replace(/(💡[^<]*)/g, '<strong>$1</strong>');
  
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                       font-size: 14px; line-height: 1.7; color: #333; max-width: 640px; padding: 16px;">
    ${html}
    <br><br>
    <div style="font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px;">
      Generated by <a href="https://github.com/darrenbuckner/ai-inbox" style="color: #999;">AI Inbox</a> 
      • Powered by Claude
    </div>
  </div>`;
}

// ============================================================
// CONTEXT LOG (Memory Layer)
// ============================================================

function logContext_(briefContent, emails, config) {
  if (!config.CONTEXT_SHEET_ID) return;
  
  try {
    const sheet = SpreadsheetApp.openById(config.CONTEXT_SHEET_ID).getActiveSheet();
    
    // Extract structured data for the log
    const senders = [...new Set(emails.map(e => {
      const match = e.from.match(/<(.+?)>/);
      return match ? match[1] : e.from;
    }))].join(', ');
    
    const topics = [...new Set(emails.map(e => e.subject))].join(' | ');
    
    // Condensed brief for the log
    const condensed = briefContent.substring(0, 1500);
    
    sheet.appendRow([
      new Date().toISOString(),
      emails.length,
      condensed,
      senders,
      topics,
    ]);
    
    Logger.log('Context logged.');
  } catch (err) {
    Logger.log(`Context logging failed: ${err.message}`);
  }
}

function getRecentContext_(config) {
  if (!config.CONTEXT_SHEET_ID) return '';
  
  try {
    const sheet = SpreadsheetApp.openById(config.CONTEXT_SHEET_ID).getActiveSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) return ''; // Only headers or empty
    
    const startRow = Math.max(2, lastRow - config.CONTEXT_WINDOW + 1);
    const numRows = lastRow - startRow + 1;
    const data = sheet.getRange(startRow, 1, numRows, 5).getValues();
    
    return data.map(row => {
      return `[${row[0]}] (${row[1]} emails) Senders: ${row[3]}\nTopics: ${row[4]}\nBrief: ${row[2]}`;
    }).join('\n---\n');
    
  } catch (err) {
    Logger.log(`Context retrieval failed: ${err.message}`);
    return '';
  }
}

// ============================================================
// TRIGGERS
// ============================================================

function setupTriggers() {
  // Clear existing triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  
  // Daily brief at 6:00 AM
  ScriptApp.newTrigger('generateDailyBrief')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  
  // Urgent check every hour
  ScriptApp.newTrigger('checkUrgent')
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log('Triggers created: daily brief at 6 AM, urgent check every hour.');
}

// ============================================================
// TESTING & UTILITIES
// ============================================================

/**
 * Manual test: process current inbox and log the brief (doesn't send email).
 */
function testRun() {
  const config = getConfig_();
  const emails = getUnreadEmails_(config);
  
  if (emails.length === 0) {
    Logger.log('No unread emails to test with. Forward a few emails to this inbox first!');
    return;
  }
  
  Logger.log(`Testing with ${emails.length} emails...`);
  
  const context = getRecentContext_(config);
  const systemPrompt = buildSystemPrompt_(config);
  const brief = callClaude_(emails, context, systemPrompt, config);
  
  if (brief) {
    Logger.log('=== TEST BRIEF ===');
    Logger.log(brief);
    Logger.log('=== END BRIEF ===');
    Logger.log('\nLooks good? Your daily brief will be emailed to ' + config.BRIEF_RECIPIENT);
  }
}

/**
 * Send a test brief email to verify email delivery works.
 */
function sendTestEmail() {
  const config = getConfig_();
  sendBriefEmail_(
    '🔴 NEEDS ATTENTION\nThis is a test brief from your AI Inbox. If you\'re reading this, email delivery works!\n\n📬 SUMMARY\nNo real emails processed — this is just a test.\n\n💡 SUGGESTION\nForward a few emails to this inbox and run testRun() to see a real brief.',
    0,
    config
  );
  Logger.log('Test email sent to ' + config.BRIEF_RECIPIENT);
}

/**
 * Update your priorities without re-running full setup.
 */
function updatePriorities() {
  const priorities = showPrompt_(
    '🎯 Update Priorities',
    'Enter your updated priorities and focus areas (one per line).\n\n' +
    'Current priorities:\n' +
    (PropertiesService.getScriptProperties().getProperty('USER_PRIORITIES') || '(none set)')
  );
  
  if (priorities) {
    PropertiesService.getScriptProperties().setProperty('USER_PRIORITIES', priorities.trim());
    Logger.log('Priorities updated.');
  }
}

/**
 * Add Slack notifications (optional, run anytime).
 */
function configureSlack() {
  const url = showPrompt_(
    '💬 Slack Integration',
    'Enter a Slack Incoming Webhook URL to receive urgent alerts in Slack.\n\n' +
    'Create one at: https://api.slack.com/messaging/webhooks\n\n' +
    'Leave blank to disable Slack notifications.'
  );
  
  PropertiesService.getScriptProperties().setProperty(
    'SLACK_WEBHOOK_URL', 
    (url || '').trim()
  );
  Logger.log('Slack webhook ' + (url ? 'configured.' : 'cleared.'));
}
