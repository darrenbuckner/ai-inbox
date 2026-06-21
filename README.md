# AI Inbox

**A curated email channel for AI-powered daily briefs.**

Instead of giving AI full access to your inbox and hoping it figures out what matters, you forward only the emails you want processed. Your AI watches a dedicated inbox, spots patterns, and sends you a daily brief.

**Curation is the feature, not the bug.**

---

## How It Works

```
Your Primary Inbox              AI Inbox (dedicated Gmail)
┌─────────────────┐            ┌──────────────────────┐
│                  │            │                      │
│  Auto-forward    │──────────→│  Unread emails        │
│  rules           │            │        │             │
│                  │            │        ▼             │
│  Manual "→ AI"   │──────────→│  Apps Script (timed)  │
│  label           │            │        │             │
│                  │            │        ▼             │
│  BCC outbound    │──────────→│  Claude API           │
│                  │            │        │             │
└─────────────────┘            └────────┼─────────────┘
                                        │
                          ┌─────────────┼──────────────┐
                          ▼             ▼              ▼
                    Daily Brief    Urgent Alerts   Context Log
                    (email)        (email/Slack)   (Google Sheet)
```

You get a daily brief like this:

> **🔴 NEEDS ATTENTION**  
> Client X replied to your proposal — they mentioned budget concerns for the second time. Might want to address this directly.
>
> **📊 PATTERNS & INSIGHTS**  
> 3 of your 5 recent leads have gone quiet after initial interest. Consider a follow-up batch.
>
> **📬 SUMMARY**  
> - 4 school emails (2 newsletters, 1 schedule change for Thursday, 1 fundraiser)  
> - 3 client communications (proposal reply, invoice confirmed, meeting rescheduled)  
> - 2 newsletters (nothing actionable)
>
> **💡 SUGGESTION**  
> You've forwarded 6 competitor/market emails this week. Want me to start tracking a competitive landscape?

---

## Quick Start (15 minutes)

### Step 1: Create Your AI Inbox

Create a new Gmail account. This is your AI's dedicated inbox. Something like:

- `yourname.ai@gmail.com`
- `ai@yourdomain.com` (if you have Google Workspace)

### Step 2: Install the Script

1. Log into the **AI inbox** Gmail account
2. Go to [script.google.com](https://script.google.com)
3. Click **New Project**
4. Delete any default code
5. Paste the entire contents of [`Code.gs`](./Code.gs)
6. Save the project (name it "AI Inbox")

### Step 3: Run Setup

1. In the Apps Script editor, select `setup` from the function dropdown
2. Click **Run**
3. When prompted, **authorize** the script (it needs access to Gmail and Sheets in this account)
4. Follow the setup wizard — it will ask for:
   - Your Anthropic API key ([get one here](https://console.anthropic.com/settings/keys))
   - Your primary email address (where briefs go)
   - Your priorities and focus areas
   - Your preferred brief style

The wizard creates everything else automatically.

### Step 4: Test It

1. Forward 2-3 emails from your primary inbox to the AI inbox
2. In Apps Script, select `testRun` and click **Run**
3. Check the **Execution Log** (View > Execution log) to see your first brief
4. Run `sendTestEmail` to verify email delivery works

### Step 5: Set Up Forwarding Rules

In your **primary Gmail** (not the AI inbox):

**Auto-forwarding (set and forget):**

1. Go to Settings > Filters and Blocked Addresses > Create a new filter
2. Set criteria (e.g., `from:@importantclient.com`)
3. Choose "Forward it to" → your AI inbox address
4. Check "Also apply to matching conversations" to backfill

**Manual forwarding (curate as you go):**

1. Create a label called `→ AI`
2. Create a filter: When label `→ AI` is applied → Forward to AI inbox
3. Now you can label any email with `→ AI` to send it over — one click on mobile, one keystroke on desktop

**BCC pattern (track your outbound too):**

When sending an important email, BCC your AI inbox. Now the AI has context on both sides of the conversation.

---

## Configuration

All settings are stored in Script Properties (secure, within your Google account). You can modify them anytime:

| Function | What It Does |
|---|---|
| `setup()` | Full setup wizard |
| `updatePriorities()` | Change your priorities without re-running full setup |
| `configureSlack()` | Add Slack webhook for urgent alerts |
| `viewSettings()` | See current configuration |
| `resetAll()` | Clear everything and start over |

### Adjusting the Schedule

Default triggers:
- **Daily brief**: Every day at 6:00 AM
- **Urgent check**: Every hour

To change: Click the clock icon (Triggers) in the Apps Script sidebar and edit.

### Brief Styles

Set during setup or change in Script Properties:

- `concise` — Bullet points, minimal prose, just the signal
- `detailed` — Full summaries with context and email quotes
- `executive` — High-level overview, decisions needed, action items only
- Or write your own preference as a sentence

---

## The Memory Layer

Every time the daily brief runs, key patterns are logged to a Google Sheet. This context gets fed back into future briefs, enabling insights like:

- "This is the third time this client has mentioned timeline concerns"
- "Your response time to [sender] has been increasing"  
- "You've been forwarding more competitor intel this week than usual"

The memory gets better over time. The first brief is useful. The 30th brief is powerful.

---

## Privacy & Security

This approach is intentionally more private than "connect your inbox" AI products:

- **Your emails never leave your Google account.** The script runs inside Google's infrastructure.
- **You control exactly what the AI sees.** Only forwarded emails are processed.
- **Your API key stays in Script Properties.** It's not exposed in the code.
- **The AI inbox is separate from your real inbox.** No OAuth permissions to your primary account.
- **Email content is sent to Claude for processing** — review [Anthropic's data policy](https://www.anthropic.com/policies) for API usage.

---

## Extending It

### AI Shared Folder

Create a Google Drive folder. Set up a Drive watch trigger in Apps Script. Anything you drop in the folder (PDFs, screenshots, docs) gets processed through the same pipeline with the same context.

### Two-Way Communication

Email the AI inbox directly with instructions: "Summarize everything from Acme Corp this week." The script can be extended to detect instruction emails and respond accordingly.

### Direct Send

Give the AI inbox address to specific services — newsletter signups, notification emails, automated reports. Skip your primary inbox entirely for things only the AI needs to process.

---

## Troubleshooting

**"Not configured" error:** Run `setup()` first.

**No emails found:** Make sure emails in the AI inbox are **unread**. The script only processes unread messages.

**API errors:** Check your Anthropic API key is valid and has credits. View errors in Execution Log (View > Execution log).

**Brief not arriving:** Run `sendTestEmail()` to test delivery. Check spam folder. Make sure `BRIEF_RECIPIENT` is correct (run `viewSettings()` to check).

**Want to reprocess emails:** Mark emails as unread in the AI inbox, then run `testRun()`.

---

## Cost

- **Google Apps Script:** Free
- **Gmail account:** Free  
- **Claude API:** ~$0.01-0.05 per daily brief (depending on email volume)
- **Total:** Essentially free for personal use

---

## Credits

Built by [Darren Buckner](https://www.linkedin.com/in/darrenbuckner/) / [Capability Lab](https://capabilitylab.ai)

---

## License

MIT — Use it, modify it, share it. If you build something cool with it, [let me know](https://www.linkedin.com/in/darrenbuckner/).
